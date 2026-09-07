// Member self-service on /account/ (billing + child accounts). Everything here
// is scoped to the logged-in member's own subscription; the admin equivalents
// live in admin.ts. Stripe is called first and the row changes only on success.
import { randomBytes } from 'node:crypto';
import { query } from './db';
import { hashPassword } from './password';
import { destroyAllSessions } from './session';
import { issueResetToken } from './auth';
import { sendMail } from './mail';
import { env } from '$env/dynamic/private';
import { startRenewalCheckout, type DueSub } from './renewal';
import { REGION_NAMES, DISPLAY_PRICES, priceIdFor, cancelSubscription, resumeSubscription, updateSubscriptionPlan, stripeConfigured, type Interval, type Region } from './stripe';

export const MAX_SEATS = 20;

export interface MemberSub {
	id: number; plan: string | null; billing_cycle: string | null; payment_price: string | null; current_period_end: Date | null;
	subscription_status: string | null; payment_customer_id: string | null; payment_subscription_id: string | null;
	cancel_at_period_end: boolean | null; user_region: string | null; seats: number; wp_subscription_id: number | null;
}

/** The member's current row: a live one first, else the most recent. */
export async function memberSub(email: string): Promise<MemberSub | null> {
	const [s] = await query<MemberSub>(`
		SELECT s.id, s.plan, s.billing_cycle, s.payment_price, s.current_period_end, s.subscription_status, s.payment_customer_id,
		       s.payment_subscription_id, s.cancel_at_period_end, s.user_region, COALESCE(s.seats,1) AS seats, w.wp_subscription_id
		  FROM user_subscriptions s LEFT JOIN wp_import_subscriptions w ON w.user_subscriptions_id = s.id
		 WHERE lower(s.user_email) = lower($1)
		 ORDER BY (s.subscription_status IN ('Active','Trialing')) DESC, s.id DESC LIMIT 1`, [email]);
	return s ?? null;
}
export const isLive = (s: MemberSub | null): s is MemberSub =>
	!!s && ['Active', 'Trialing', 'Past_due'].includes(s.subscription_status ?? '') && (!!s.payment_subscription_id || !s.current_period_end || s.current_period_end >= new Date());
export const onStripe = (s: MemberSub | null) => !!s?.payment_subscription_id;

export function regionsOfSub(s: MemberSub | null): Region[] {
	const wanted = (s?.user_region ?? '').split(',').map((r) => r.trim());
	return REGION_NAMES.filter((r) => wanted.includes(r)) as Region[];
}
export const intervalOfSub = (s: MemberSub | null): Interval => (s?.billing_cycle === 'Monthly' ? 'month' : 'year');
export const planLabel = (n: number, interval: Interval) => `${n} region${n === 1 ? '' : 's'}${interval === 'month' ? ' monthly' : ''}`;

export function parsePlanForm(form: FormData): { regions: Region[]; interval: Interval; seats: number } | string {
	const regions = REGION_NAMES.filter((r) => form.getAll('regions').includes(r)) as Region[];
	if (!regions.length) return 'Pick at least one region.';
	const interval: Interval = form.get('interval') === 'month' ? 'month' : 'year';
	const seats = Math.floor(Number(form.get('seats') ?? 1));
	if (!Number.isFinite(seats) || seats < 1 || seats > MAX_SEATS) return `Seats must be between 1 and ${MAX_SEATS}.`;
	return { regions, interval, seats };
}

/** Member asks to stop renewing. Access runs until the paid period ends.
 *  Stripe subscriptions only: imported (Pin) rows are not self-managed — any
 *  change to them goes through Checkout and lands on Stripe. */
export async function cancelMemberSub(email: string) {
	const s = await memberSub(email);
	if (!isLive(s) || !s.payment_subscription_id) throw new Error('There is no Stripe subscription to cancel. Email info@urbanprospects.com.au.');
	if (!stripeConfigured()) throw new Error('Stripe billing is not switched on yet.');
	if (s.cancel_at_period_end) return s;
	const r = await cancelSubscription(s.payment_subscription_id, true);
	const endUnix = r.items?.data?.[0]?.current_period_end ?? r.current_period_end;
	await query(`UPDATE user_subscriptions SET cancel_at_period_end=true, current_period_end=COALESCE($2::timestamptz,current_period_end),
	                admin_note=concat_ws(' · ', admin_note, 'Member cancelled at period end ' || to_char(now(),'YYYY-MM-DD')) WHERE id=$1`,
		[s.id, endUnix ? new Date(endUnix * 1000) : null]);
	return s;
}

/** Undo a pending cancellation. */
export async function resumeMemberSub(email: string) {
	const s = await memberSub(email);
	if (!isLive(s) || !s.payment_subscription_id || !s.cancel_at_period_end) throw new Error('Nothing to resume.');
	if (!stripeConfigured()) throw new Error('Stripe billing is not switched on yet.');
	await resumeSubscription(s.payment_subscription_id);
	await query(`UPDATE user_subscriptions SET cancel_at_period_end=false, admin_note=concat_ws(' · ', admin_note, 'Member resumed ' || to_char(now(),'YYYY-MM-DD')) WHERE id=$1`, [s.id]);
}

/** Change regions, cycle or seats.
 *  - Live Stripe subscription: swap the line item in place. A dearer plan is
 *    invoiced for the prorated difference now; a cheaper one books a credit.
 *  - Anything else (imported/Pin, cancelled, none): returns a Checkout URL —
 *    the success page writes the Stripe row and retires the imported one. */
export async function changeMemberPlan(user: { id: number; email: string }, plan: { regions: Region[]; interval: Interval; seats: number }, origin: string)
	: Promise<{ kind: 'updated' } | { kind: 'checkout'; url: string }> {
	if (!stripeConfigured()) throw new Error('Stripe billing is not switched on yet.');
	const priceId = priceIdFor(plan.regions.length, plan.interval);
	if (!priceId) throw new Error('That plan is not available for checkout yet.');
	const s = await memberSub(user.email);
	const regionList = plan.regions.join(',');
	const label = planLabel(plan.regions.length, plan.interval);

	if (isLive(s) && s.payment_subscription_id) {
		const before = DISPLAY_PRICES[regionsOfSub(s).length]?.[intervalOfSub(s)] ?? 0;
		const after = DISPLAY_PRICES[plan.regions.length]?.[plan.interval] ?? 0;
		const monthly = (p: number, i: Interval) => (i === 'month' ? p : p / 12);
		const dearer = monthly(after, plan.interval) * plan.seats > monthly(before, intervalOfSub(s)) * s.seats;
		const r = await updateSubscriptionPlan(s.payment_subscription_id, {
			priceId, quantity: plan.seats, proration: dearer ? 'always_invoice' : 'create_prorations',
			metadata: { regions: plan.regions.join(', '), users: plan.seats, interval: plan.interval, user_id: user.id }
		});
		const item = r.items?.data?.[0];
		const endUnix = item?.current_period_end ?? r.current_period_end;
		await query(`UPDATE user_subscriptions SET user_region=$2, billing_cycle=$3, plan=$4, payment_price_id=$5, payment_price=$6, seats=$7,
		                current_period_end=COALESCE($8::timestamptz,current_period_end), cancel_at_period_end=$9,
		                admin_note=concat_ws(' · ', admin_note, 'Member changed plan to ' || $4 || ' x' || $7 || ' on ' || to_char(now(),'YYYY-MM-DD'))
		              WHERE id=$1`,
			[s.id, regionList, plan.interval === 'month' ? 'Monthly' : 'Yearly', label, item?.price.id ?? priceId,
			 item?.price.unit_amount != null ? (item.price.unit_amount / 100).toFixed(2) : null, plan.seats,
			 endUnix ? new Date(endUnix * 1000) : null, !!r.cancel_at_period_end]);
		return { kind: 'updated' };
	}

	const basis: DueSub = {
		id: s?.id ?? 0, plan: label, billing_cycle: plan.interval === 'month' ? 'Monthly' : 'Yearly', user_region: regionList,
		payment_price: null, current_period_end: s?.current_period_end ?? new Date(), overdue: true, wp_subscription_id: s?.wp_subscription_id ?? null
	};
	// Only a still-active imported row is "renewed" (retired on success); anything else is a fresh subscription.
	if (!(isLive(s) && !s.payment_subscription_id)) basis.wp_subscription_id = null;
	return { kind: 'checkout', url: await startRenewalCheckout(user, basis, origin, plan.seats) };
}

// ---- child accounts ---------------------------------------------------------------

export interface ChildRow { id: number; email: string; first_name: string | null; last_name: string | null; status: string; last_login_at: Date | null; created_at: Date; has_password: boolean }

export async function listChildren(parentId: number) {
	return query<ChildRow>(`SELECT id, email, first_name, last_name, status, last_login_at, created_at, password_hash IS NOT NULL AS has_password
	                          FROM users WHERE parent_user_id=$1 AND status <> 'inactive' ORDER BY created_at`, [parentId]);
}

/** Create the child user (no usable password) and send them the set-password
 *  link. Seats are then synced to Stripe by the caller. */
export async function addChild(parent: { id: number; email: string }, c: { email: string; first_name: string; last_name: string }) {
	const email = c.email.trim().toLowerCase();
	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('That email address does not look right.');
	if (email === parent.email.toLowerCase()) throw new Error('That is your own address.');
	const [dup] = await query<{ id: number }>(`SELECT id FROM users WHERE lower(email)=$1 OR lower(user_login)=$1`, [email]);
	if (dup) throw new Error('An account with that email already exists. Email info@urbanprospects.com.au to move it under yours.');
	const { hash, algo } = await hashPassword(randomBytes(24).toString('base64url'));
	const [row] = await query<{ id: number }>(`
		INSERT INTO users (user_login, email, password_hash, password_algo, display_name, first_name, last_name, role, status, parent_user_id)
		VALUES ($1,$1,$2,$3,$4,$5,$6,'subscriber','active',$7) RETURNING id`,
		[email, hash, algo, [c.first_name, c.last_name].filter(Boolean).join(' ') || email, c.first_name || null, c.last_name || null, parent.id]);
	await sendInvite(row.id, email, parent);
	return row.id;
}

const INVITE_DAYS = 7;
async function sendInvite(childId: number, email: string, parent: { email: string }) {
	const token = await issueResetToken(childId, INVITE_DAYS * 24 * 60);
	const origin = env.PUBLIC_ORIGIN || 'https://www.urbanprospects.com.au';
	await sendMail(email, 'You have been added to an Urban Prospects account',
		`${parent.email} has added you to their Urban Prospects subscription.\n\n` +
		`Choose a password to start using the platform (link valid for ${INVITE_DAYS} days):\n${origin}/reset-password/${token}/\n\n` +
		`You log in with this email address at ${origin}/login/`);
}

export async function resendChildInvite(parent: { id: number; email: string }, childId: number) {
	const [c] = await query<{ email: string }>(`SELECT email FROM users WHERE id=$1 AND parent_user_id=$2 AND status='active'`, [childId, parent.id]);
	if (!c) throw new Error('That user is not on your account.');
	await sendInvite(childId, c.email, parent);
}

/** Detach and deactivate; their sessions end now. Seats are synced by the caller. */
export async function removeChild(parentId: number, childId: number) {
	const [c] = await query<{ id: number }>(`UPDATE users SET status='inactive', parent_user_id=NULL WHERE id=$1 AND parent_user_id=$2 RETURNING id`, [childId, parentId]);
	if (!c) throw new Error('That user is not on your account.');
	await destroyAllSessions(childId);
}

/** How many seats the member's row must carry: themselves + active children. */
export async function seatsNeeded(parentId: number) {
	const [r] = await query<{ n: number }>(`SELECT 1 + count(*)::int AS n FROM users WHERE parent_user_id=$1 AND status='active'`, [parentId]);
	return r?.n ?? 1;
}

/** Push the seat count to Stripe (quantity) and the row. Live Stripe rows only;
 *  imported rows just record the count for the admin. */
export async function syncSeats(user: { id: number; email: string }) {
	const seats = await seatsNeeded(user.id);
	const s = await memberSub(user.email);
	if (!s) return seats;
	if (isLive(s) && s.payment_subscription_id && stripeConfigured() && s.seats !== seats) {
		const regions = regionsOfSub(s);
		const interval = intervalOfSub(s);
		const priceId = priceIdFor(regions.length || 1, interval);
		if (!priceId) throw new Error('That plan is not available for checkout yet.');
		await updateSubscriptionPlan(s.payment_subscription_id, {
			priceId, quantity: seats, proration: seats > s.seats ? 'always_invoice' : 'create_prorations',
			metadata: { regions: regions.join(', '), users: seats, interval, user_id: user.id }
		});
	}
	await query(`UPDATE user_subscriptions SET seats=$2 WHERE id=$1`, [s.id, seats]);
	return seats;
}
