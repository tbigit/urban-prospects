// Renewal of subscriptions imported from WordPress (billed on Pin Payments there).
// Nothing reaches out to members: when they log in with a renewal due within
// RENEW_WINDOW_DAYS, or already past, they are sent to /renew/, which starts a
// Stripe Checkout with no trial. The success page writes the Stripe row, retires
// the imported row, and queues the WooCommerce subscription for cancellation so
// Pin stops billing them.
import { env } from '$env/dynamic/private';
import { query } from './db';
import { REGION_NAMES, priceIdFor, createCheckoutSession, getCheckoutSession, type Interval, type Region } from './stripe';

export const RENEW_WINDOW_DAYS = 7;

export interface DueSub {
	id: number; plan: string | null; billing_cycle: string | null; user_region: string | null;
	payment_price: string | null; current_period_end: Date; overdue: boolean; wp_subscription_id: number | null;
}

/** The imported (non-Stripe) subscription that is due, or null when the member
 *  already has a live Stripe subscription or nothing is within the window. */
export async function renewalDue(email: string): Promise<DueSub | null> {
	const rows = await query<DueSub>(`
		SELECT s.id, s.plan, s.billing_cycle, s.user_region, s.payment_price, s.current_period_end,
		       s.current_period_end < now() AS overdue, w.wp_subscription_id
		  FROM user_subscriptions s
		  LEFT JOIN wp_import_subscriptions w ON w.user_subscriptions_id = s.id
		 WHERE lower(s.user_email) = lower($1)
		   AND s.subscription_status = 'Active'
		   AND s.payment_subscription_id IS NULL
		   AND s.current_period_end IS NOT NULL
		   AND s.current_period_end < now() + ($2 || ' days')::interval
		   AND NOT EXISTS (SELECT 1 FROM user_subscriptions x
		                    WHERE lower(x.user_email) = lower($1)
		                      AND x.payment_subscription_id IS NOT NULL
		                      AND x.subscription_status IN ('Active','Trialing'))
		 ORDER BY s.current_period_end LIMIT 1`, [email, String(RENEW_WINDOW_DAYS)]);
	return rows[0] ?? null;
}

/** Past the period end with no Stripe subscription. */
export async function renewalOverdue(email: string): Promise<boolean> {
	const d = await renewalDue(email);
	return !!d && d.overdue;
}

/** Does this member currently have a plan that grants property access?
 *  Stripe rows count while Active/Trialing (Stripe flips them on cancel);
 *  imported rows count while Active and not past their period end.
 *  Cancelled members still log in and search — only the property panel is gated. */
export async function hasAccess(email: string): Promise<boolean> {
	const r = await query<{ ok: boolean }>(`
		SELECT EXISTS (
		  SELECT 1 FROM user_subscriptions
		   WHERE lower(user_email) = lower($1)
		     AND subscription_status IN ('Active','Trialing')
		     AND (payment_subscription_id IS NOT NULL OR current_period_end IS NULL OR current_period_end >= now())
		) AS ok`, [email]);
	return r[0]?.ok ?? false;
}

/** What /renew/ should offer: the due imported row, else the most recent row of
 *  any status (so a cancelled member re-subscribes to what they had), else null
 *  (page falls back to a default plan). */
export async function renewalBasis(email: string): Promise<DueSub | null> {
	const due = await renewalDue(email);
	if (due) return due;
	const rows = await query<DueSub>(`
		SELECT s.id, s.plan, s.billing_cycle, s.user_region, s.payment_price,
		       COALESCE(s.current_period_end, s.created_at) AS current_period_end,
		       true AS overdue, w.wp_subscription_id
		  FROM user_subscriptions s LEFT JOIN wp_import_subscriptions w ON w.user_subscriptions_id = s.id
		 WHERE lower(s.user_email) = lower($1) ORDER BY s.id DESC LIMIT 1`, [email]);
	return rows[0] ?? null;
}

export function regionsOf(sub: DueSub): Region[] {
	const wanted = (sub.user_region ?? '').split(',').map((r) => r.trim());
	const regions = REGION_NAMES.filter((r) => wanted.includes(r));
	return regions.length ? [...regions] : [...REGION_NAMES];
}
export function intervalOf(sub: DueSub): Interval {
	return sub.billing_cycle === 'Monthly' ? 'month' : 'year';
}

export async function startRenewalCheckout(user: { id: number; email: string }, sub: DueSub, origin: string, seats = 1) {
	const regions = regionsOf(sub);
	seats = Math.max(1, Math.min(50, Math.floor(seats)));
	const interval = intervalOf(sub);
	const priceId = priceIdFor(regions.length, interval);
	if (!priceId) throw new Error('Subscription checkout is not configured for this plan yet');
	const regionList = regions.join(', ');
	const renewalOf = sub.id > 0 && sub.wp_subscription_id ? sub.id : '';
	const session = await createCheckoutSession({
		mode: 'subscription',
		customer_email: user.email,
		line_items: [{ price: priceId, quantity: seats }],
		subscription_data: { metadata: { regions: regionList, users: seats, interval, renewal_of: renewalOf, user_id: user.id } },
		payment_method_collection: 'always',
		metadata: { price_id: priceId, regions: regionList, users: seats, interval, renewal_of: renewalOf, user_id: user.id },
		success_url: `${origin}/renew/success/?session_id={CHECKOUT_SESSION_ID}`,
		cancel_url: `${origin}/renew/`
	});
	return session.url;
}

/** Called from /renew/success/. Idempotent: keyed on the Stripe subscription id,
 *  so a refresh or the upapp webhook landing first does no harm. */
export async function completeRenewal(user: { id: number; email: string }, sessionId: string) {
	const s = await getCheckoutSession(sessionId);
	if (String(s.metadata?.user_id ?? '') !== String(user.id)) throw new Error('This checkout belongs to a different account.');
	if (s.status !== 'complete' || !s.subscription) return { pending: true as const };
	const sub = s.subscription;
	const item = sub.items.data[0];
	const periodEndUnix = item?.current_period_end ?? sub.current_period_end ?? null;
	const periodEnd = periodEndUnix ? new Date(periodEndUnix * 1000) : null;
	const status = sub.status.charAt(0).toUpperCase() + sub.status.slice(1); // matches upapp/api.js
	const regions = String(s.metadata?.regions ?? '').split(',').map((r) => r.trim()).filter(Boolean).join(',');
	const interval = s.metadata?.interval === 'month' ? 'Monthly' : 'Yearly';
	const price = item?.price.unit_amount != null ? (item.price.unit_amount / 100).toFixed(2) : null;
	const plan = `${regions.split(',').length} region${regions.split(',').length === 1 ? '' : 's'}${interval === 'Monthly' ? ' monthly' : ''}`;
	const renewalOf = Number(s.metadata?.renewal_of) || null;

	await query(`
		INSERT INTO user_subscriptions (subscription_status,user_id,user_email,payment_subscription_id,payment_price_id,payment_customer_id,
		                                payment_price,billing_cycle,user_region,default_payment_method,plan,current_period_end,admin_note,seats)
		VALUES ($1,$2,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
		ON CONFLICT (payment_subscription_id) DO UPDATE
		   SET subscription_status=EXCLUDED.subscription_status, payment_price_id=EXCLUDED.payment_price_id,
		       payment_customer_id=EXCLUDED.payment_customer_id, payment_price=EXCLUDED.payment_price,
		       billing_cycle=EXCLUDED.billing_cycle, user_region=EXCLUDED.user_region, plan=EXCLUDED.plan,
		       current_period_end=EXCLUDED.current_period_end, seats=EXCLUDED.seats,
		       admin_note=COALESCE(user_subscriptions.admin_note, EXCLUDED.admin_note)`,
		[status, user.email, sub.id, item?.price.id ?? null, sub.customer, price, interval, regions,
		 typeof sub.default_payment_method === 'string' ? sub.default_payment_method : null, plan, periodEnd,
		 renewalOf ? `Renewal of imported subscription #${renewalOf}` : null, Math.max(1, item?.quantity ?? 1)]);
	await query(`UPDATE users SET stripe_customer_id = COALESCE(stripe_customer_id, $2) WHERE id = $1`, [user.id, sub.customer]);
	if (renewalOf) {
		await query(`UPDATE user_subscriptions SET subscription_status='Expired',
		                admin_note = concat_ws(' · ', admin_note, 'Superseded by Stripe ' || $2 || ' on ' || to_char(now(),'YYYY-MM-DD'))
		              WHERE id=$1 AND lower(user_email)=lower($3) AND payment_subscription_id IS NULL`, [renewalOf, sub.id, user.email]);
		// Queue the WooCommerce subscription for manual cancellation so Pin stops billing.
		await query(`UPDATE wp_import_subscriptions SET woo_cancel_due_at = now(), stripe_subscription_id = $2
		              WHERE user_subscriptions_id = $1 AND woo_cancelled_at IS NULL`, [renewalOf, sub.id]);
	}
	return { pending: false as const, status, periodEnd, plan, regions: regions.split(','), interval };
}

export const stripeConfigured = () => !!env.STRIPE_SECRET_KEY;
