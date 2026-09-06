// Queries behind /admin. Everything here assumes the caller has already been
// gated to role = 'administrator' by src/routes/admin/+layout.server.ts.
import { query } from './db';
import { hashPassword } from './password';
import { destroyAllSessions } from './session';

export const REGIONS = ['Sydney', 'Northern', 'Southern', 'Western', 'Central and Hunter'] as const;
export const ROLES = ['subscriber', 'customer', 'administrator'] as const;
export const USER_STATUSES = ['active', 'inactive', 'locked'] as const;
// Stripe statuses as upapp/api.js capitalises them, plus the legacy 'Pending' default.
export const SUB_STATUSES = ['Active', 'Trialing', 'Past_due', 'Canceled', 'Unpaid', 'Pending', 'Expired'] as const;
export const CYCLES = ['Monthly', 'Yearly'] as const;
export const PAGE_SIZE = 50;

export interface UserRow {
	id: number; wp_user_id: number | null; user_login: string; email: string; display_name: string | null;
	first_name: string | null; last_name: string | null; role: string; status: string; is_test: boolean;
	stripe_customer_id: string | null; password_algo: string; last_login_at: Date | null; created_at: Date;
	wp_registered_at: Date | null; migrated_at: Date | null;
}
export interface SubRow {
	id: number; subscription_status: string | null; user_id: string | null; user_email: string | null;
	payment_subscription_id: string | null; payment_price_id: string | null; payment_customer_id: string | null;
	payment_price: string | null; billing_cycle: string | null; user_region: string | null; plan: string | null;
	additional_lookups: number | null; current_period_end: Date | null; created_at: Date; updated_at: Date | null;
	admin_note: string | null; default_payment_method: string | null; cancel_at_period_end: boolean; canceled_at: Date | null;
}

export async function stats() {
	const [s] = await query<Record<string, number>>(`
		SELECT (SELECT count(*)::int FROM users) AS users,
		       (SELECT count(*)::int FROM users WHERE NOT is_test) AS customers,
		       (SELECT count(*)::int FROM users WHERE is_test) AS test_users,
		       (SELECT count(*)::int FROM user_subscriptions WHERE subscription_status='Active') AS active_subs,
		       (SELECT count(*)::int FROM user_subscriptions s LEFT JOIN users u ON lower(u.email)=lower(s.user_email)
		          WHERE s.subscription_status='Active' AND COALESCE(u.is_test,false)=false) AS paying_subs,
		       (SELECT count(*)::int FROM user_subscriptions WHERE subscription_status='Active' AND billing_cycle='Monthly') AS monthly,
		       (SELECT count(*)::int FROM user_subscriptions WHERE subscription_status='Active' AND billing_cycle='Yearly') AS yearly,
		       (SELECT count(*)::int FROM user_subscriptions WHERE subscription_status='Trialing') AS trialing,
		       (SELECT count(*)::int FROM user_subscriptions WHERE subscription_status='Active'
		          AND current_period_end BETWEEN now() AND now() + interval '30 days') AS ending_30d,
		       (SELECT count(*)::int FROM user_subscriptions WHERE payment_customer_id IS NOT NULL) AS on_stripe,
		       (SELECT count(*)::int FROM sessions WHERE expires_at > now()) AS live_sessions,
		       (SELECT coalesce(sum(CASE billing_cycle WHEN 'Monthly' THEN payment_price*12 ELSE payment_price END),0)::int
		          FROM user_subscriptions s LEFT JOIN users u ON lower(u.email)=lower(s.user_email)
		         WHERE s.subscription_status='Active' AND COALESCE(u.is_test,false)=false) AS arr`);
	return s;
}

export async function upcoming(days = 60) {
	return query<SubRow & { is_test: boolean; display_name: string | null }>(`
		SELECT s.*, COALESCE(u.is_test,false) AS is_test, u.display_name
		  FROM user_subscriptions s LEFT JOIN users u ON lower(u.email)=lower(s.user_email)
		 WHERE s.subscription_status IN ('Active','Trialing') AND s.current_period_end < now() + ($1 || ' days')::interval
		 ORDER BY s.current_period_end NULLS LAST LIMIT 50`, [String(days)]);
}

export async function recentLogins() {
	return query<Pick<UserRow, 'id' | 'email' | 'display_name' | 'last_login_at' | 'is_test'>>(
		`SELECT id, email, display_name, last_login_at, is_test FROM users WHERE last_login_at IS NOT NULL ORDER BY last_login_at DESC LIMIT 10`);
}

export interface UserFilters { q?: string; role?: string; status?: string; test?: string; page?: number }
export async function listUsers(f: UserFilters) {
	const where: string[] = []; const params: unknown[] = [];
	const p = (v: unknown) => { params.push(v); return `$${params.length}`; };
	if (f.q) where.push(`(u.email ILIKE ${p('%' + f.q + '%')} OR u.display_name ILIKE ${p('%' + f.q + '%')} OR u.user_login ILIKE ${p('%' + f.q + '%')})`);
	if (f.role) where.push(`u.role = ${p(f.role)}`);
	if (f.status) where.push(`u.status = ${p(f.status)}`);
	if (f.test === 'real') where.push(`NOT u.is_test`);
	if (f.test === 'test') where.push(`u.is_test`);
	const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
	const page = Math.max(1, f.page ?? 1);
	const rows = await query<UserRow & { plan: string | null; sub_status: string | null; sub_count: number }>(`
		SELECT u.*, ls.plan, ls.subscription_status AS sub_status,
		       (SELECT count(*)::int FROM user_subscriptions x WHERE lower(x.user_email)=lower(u.email)) AS sub_count
		  FROM users u
		  LEFT JOIN LATERAL (SELECT plan, subscription_status FROM user_subscriptions s
		                      WHERE lower(s.user_email)=lower(u.email)
		                      ORDER BY (subscription_status='Active') DESC, id DESC LIMIT 1) ls ON true
		  ${w} ORDER BY u.is_test, u.created_at DESC LIMIT ${PAGE_SIZE} OFFSET ${(page - 1) * PAGE_SIZE}`, params);
	const [{ n }] = await query<{ n: number }>(`SELECT count(*)::int AS n FROM users u ${w}`, params);
	return { rows, total: n, page, pages: Math.max(1, Math.ceil(n / PAGE_SIZE)) };
}

export async function getUser(id: number) {
	const [u] = await query<UserRow>(`SELECT * FROM users WHERE id = $1`, [id]);
	if (!u) return null;
	const subs = await query<SubRow>(`SELECT * FROM user_subscriptions WHERE lower(user_email)=lower($1) ORDER BY id DESC`, [u.email]);
	const sessions = await query<{ n: number; last: Date | null }>(`SELECT count(*)::int AS n, max(last_seen_at) AS last FROM sessions WHERE user_id=$1 AND expires_at>now()`, [id]);
	const wp = await query<{ wp_subscription_id: number; product_name: string; pin_customer_token: string | null; regions: string | null; order_total: string | null; end_at: Date | null; next_payment_at: Date | null }>(
		`SELECT wp_subscription_id, product_name, pin_customer_token, regions, order_total, end_at, next_payment_at FROM wp_import_subscriptions WHERE users_id=$1 ORDER BY wp_subscription_id`, [id]);
	return { user: u, subs, sessions: sessions[0], wp };
}

export interface UserPatch { email: string; user_login: string; first_name: string; last_name: string; display_name: string; role: string; status: string; is_test: boolean; stripe_customer_id: string }
export async function updateUser(id: number, u: UserPatch) {
	const old = await query<{ email: string }>(`SELECT email FROM users WHERE id=$1`, [id]);
	await query(`UPDATE users SET email=$2, user_login=$3, first_name=NULLIF($4,''), last_name=NULLIF($5,''), display_name=NULLIF($6,''),
	                role=$7, status=$8, is_test=$9, stripe_customer_id=NULLIF($10,'') WHERE id=$1`,
		[id, u.email, u.user_login, u.first_name, u.last_name, u.display_name, u.role, u.status, u.is_test, u.stripe_customer_id]);
	// user_subscriptions (and the other app tables) key on email; keep them attached.
	if (old[0] && old[0].email.toLowerCase() !== u.email.toLowerCase()) {
		await query(`UPDATE user_subscriptions SET user_email=$2, user_id=CASE WHEN lower(user_id)=lower($1) THEN $2 ELSE user_id END WHERE lower(user_email)=lower($1)`, [old[0].email, u.email]);
	}
	if (u.status !== 'active') await destroyAllSessions(id);
}

export async function setPassword(id: number, password: string) {
	const { hash, algo } = await hashPassword(password);
	await query(`UPDATE users SET password_hash=$2, password_algo=$3 WHERE id=$1`, [id, hash, algo]);
	await destroyAllSessions(id);
}

export async function createUser(u: { email: string; first_name: string; last_name: string; role: string; is_test: boolean; password: string }) {
	const { hash, algo } = await hashPassword(u.password);
	const login = u.email.toLowerCase();
	const [row] = await query<{ id: number }>(`
		INSERT INTO users (user_login,email,password_hash,password_algo,display_name,first_name,last_name,role,status,is_test)
		VALUES ($1,$2,$3,$4,NULLIF(trim($5||' '||$6),''),NULLIF($5,''),NULLIF($6,''),$7,'active',$8) RETURNING id`,
		[login, u.email, hash, algo, u.first_name, u.last_name, u.role, u.is_test]);
	return row.id;
}

export interface SubFilters { q?: string; status?: string; cycle?: string; plan?: string; test?: string; page?: number }
export async function listSubs(f: SubFilters) {
	const where: string[] = []; const params: unknown[] = [];
	const p = (v: unknown) => { params.push(v); return `$${params.length}`; };
	if (f.q) where.push(`(s.user_email ILIKE ${p('%' + f.q + '%')} OR s.payment_customer_id ILIKE ${p('%' + f.q + '%')} OR s.payment_subscription_id ILIKE ${p('%' + f.q + '%')})`);
	if (f.status) where.push(`s.subscription_status = ${p(f.status)}`);
	if (f.cycle) where.push(`s.billing_cycle = ${p(f.cycle)}`);
	if (f.plan) where.push(`s.plan = ${p(f.plan)}`);
	if (f.test === 'real') where.push(`COALESCE(u.is_test,false)=false`);
	if (f.test === 'test') where.push(`u.is_test`);
	const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
	const page = Math.max(1, f.page ?? 1);
	const from = `FROM user_subscriptions s LEFT JOIN users u ON lower(u.email)=lower(s.user_email)`;
	const rows = await query<SubRow & { users_id: number | null; is_test: boolean; display_name: string | null }>(`
		SELECT s.*, u.id AS users_id, COALESCE(u.is_test,false) AS is_test, u.display_name ${from} ${w}
		 ORDER BY (s.subscription_status='Active') DESC, s.current_period_end NULLS LAST, s.id DESC
		 LIMIT ${PAGE_SIZE} OFFSET ${(page - 1) * PAGE_SIZE}`, params);
	const [{ n }] = await query<{ n: number }>(`SELECT count(*)::int AS n ${from} ${w}`, params);
	const plans = await query<{ plan: string }>(`SELECT DISTINCT plan FROM user_subscriptions WHERE plan IS NOT NULL ORDER BY plan`);
	return { rows, total: n, page, pages: Math.max(1, Math.ceil(n / PAGE_SIZE)), plans: plans.map((x) => x.plan) };
}

export async function getSub(id: number) {
	const [s] = await query<SubRow & { users_id: number | null; is_test: boolean; display_name: string | null }>(`
		SELECT s.*, u.id AS users_id, COALESCE(u.is_test,false) AS is_test, u.display_name
		  FROM user_subscriptions s LEFT JOIN users u ON lower(u.email)=lower(s.user_email) WHERE s.id=$1`, [id]);
	return s ?? null;
}

export interface SubPatch { subscription_status: string; plan: string; billing_cycle: string; regions: string[]; payment_price: string; current_period_end: string; additional_lookups: number; admin_note: string }
export async function updateSub(id: number, s: SubPatch) {
	await query(`UPDATE user_subscriptions SET subscription_status=$2, plan=$3, billing_cycle=$4, user_region=$5,
	                payment_price=NULLIF($6,'')::numeric, current_period_end=NULLIF($7,'')::timestamptz, additional_lookups=$8, admin_note=NULLIF($9,'')
	              WHERE id=$1`,
		[id, s.subscription_status, s.plan, s.billing_cycle, s.regions.join(','), s.payment_price, s.current_period_end, s.additional_lookups, s.admin_note]);
}

export async function createSub(email: string, s: SubPatch) {
	const [row] = await query<{ id: number }>(`
		INSERT INTO user_subscriptions (subscription_status,user_id,user_email,billing_cycle,user_region,plan,payment_price,current_period_end,additional_lookups,admin_note)
		VALUES ($1,$2,$2,$3,$4,$5,NULLIF($6,'')::numeric,NULLIF($7,'')::timestamptz,$8,NULLIF($9,'')) RETURNING id`,
		[s.subscription_status, email, s.billing_cycle, s.regions.join(','), s.plan, s.payment_price, s.current_period_end, s.additional_lookups, s.admin_note]);
	return row.id;
}

export async function deleteSub(id: number) {
	await query(`UPDATE wp_import_subscriptions SET user_subscriptions_id=NULL WHERE user_subscriptions_id=$1`, [id]);
	await query(`DELETE FROM user_subscriptions WHERE id=$1`, [id]);
}

// Form helpers shared by the admin actions.
export function subPatchFrom(form: FormData): SubPatch {
	const regions = form.getAll('regions').map(String).filter((r) => (REGIONS as readonly string[]).includes(r));
	return {
		subscription_status: pick(form, 'subscription_status', SUB_STATUSES, 'Active'),
		plan: String(form.get('plan') ?? '').trim() || 'Demo',
		billing_cycle: pick(form, 'billing_cycle', CYCLES, 'Yearly'),
		regions,
		payment_price: String(form.get('payment_price') ?? '').trim(),
		current_period_end: String(form.get('current_period_end') ?? '').trim(),
		additional_lookups: Math.max(0, parseInt(String(form.get('additional_lookups') ?? '0'), 10) || 0),
		admin_note: String(form.get('admin_note') ?? '').trim()
	};
}
export function pick<T extends readonly string[]>(form: FormData, key: string, allowed: T, fallback: T[number]): T[number] {
	const v = String(form.get(key) ?? '');
	return (allowed as readonly string[]).includes(v) ? (v as T[number]) : fallback;
}

// ---- Cancellation (Stripe first, then our row) and the Woo cancel queue ----
import { cancelSubscription } from './stripe';

export async function cancelSub(id: number, mode: 'period_end' | 'now') {
	const s = await getSub(id);
	if (!s) throw new Error('No such subscription');
	if (s.payment_subscription_id) {
		const r = await cancelSubscription(s.payment_subscription_id, mode === 'period_end');
		const endUnix = r.items?.data?.[0]?.current_period_end ?? r.current_period_end;
		if (mode === 'period_end') {
			await query(`UPDATE user_subscriptions SET cancel_at_period_end=true, current_period_end=COALESCE($2::timestamptz,current_period_end),
			                admin_note=concat_ws(' · ', admin_note, 'Cancel at period end requested ' || to_char(now(),'YYYY-MM-DD')) WHERE id=$1`,
				[id, endUnix ? new Date(endUnix * 1000) : null]);
		} else {
			await query(`UPDATE user_subscriptions SET subscription_status='Canceled', canceled_at=now(), cancel_at_period_end=false,
			                admin_note=concat_ws(' · ', admin_note, 'Cancelled on Stripe ' || to_char(now(),'YYYY-MM-DD')) WHERE id=$1`, [id]);
		}
		return { stripe: true, stripeStatus: r.status };
	}
	// Imported (Pin/Woo) row: nothing to call. Mark it and queue the Woo cancellation.
	if (mode === 'period_end') {
		await query(`UPDATE user_subscriptions SET cancel_at_period_end=true, admin_note=concat_ws(' · ', admin_note, 'Do not renew (set ' || to_char(now(),'YYYY-MM-DD') || ')') WHERE id=$1`, [id]);
	} else {
		await query(`UPDATE user_subscriptions SET subscription_status='Canceled', canceled_at=now(), admin_note=concat_ws(' · ', admin_note, 'Cancelled ' || to_char(now(),'YYYY-MM-DD')) WHERE id=$1`, [id]);
	}
	await query(`UPDATE wp_import_subscriptions SET woo_cancel_due_at=COALESCE(woo_cancel_due_at, now()) WHERE user_subscriptions_id=$1 AND woo_cancelled_at IS NULL`, [id]);
	return { stripe: false, stripeStatus: null };
}

export async function wooCancelQueue() {
	return query<{ wp_subscription_id: number; user_email: string; product_name: string; woo_cancel_due_at: Date; stripe_subscription_id: string | null; users_id: number | null; user_subscriptions_id: number | null }>(
		`SELECT wp_subscription_id, user_email, product_name, woo_cancel_due_at, stripe_subscription_id, users_id, user_subscriptions_id
		   FROM wp_import_subscriptions WHERE woo_cancel_due_at IS NOT NULL AND woo_cancelled_at IS NULL ORDER BY woo_cancel_due_at`);
}
export async function wooForSub(userSubId: number) {
	const r = await query<{ wp_subscription_id: number; woo_cancel_due_at: Date | null; woo_cancelled_at: Date | null }>(
		`SELECT wp_subscription_id, woo_cancel_due_at, woo_cancelled_at FROM wp_import_subscriptions WHERE user_subscriptions_id=$1`, [userSubId]);
	return r[0] ?? null;
}
export async function markWooCancelled(wpSubId: number) {
	await query(`UPDATE wp_import_subscriptions SET woo_cancelled_at=now() WHERE wp_subscription_id=$1`, [wpSubId]);
}
