// DB-backed sessions (deploy/sql/002_sessions.sql). The cookie carries a random
// 256-bit id; only its sha256 is stored, so a DB read never yields a usable token.
import { createHash, randomBytes } from 'node:crypto';
import type { Cookies } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { query } from './db';

export const SESSION_COOKIE = 'up_session';
const SESSION_DAYS = 30;

export interface SessionUser {
	id: number;
	/** wp_users.ID for members migrated from WordPress; the app's per-user tables are keyed by it. */
	wp_user_id: number | null;
	email: string;
	user_login: string;
	display_name: string | null;
	first_name: string | null;
	last_name: string | null;
	role: string;
	status: string;
	plan: string | null;
	user_regions: string[];
	stripe_customer_id: string | null;
}

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

function cookieOpts(expires: Date) {
	return {
		path: '/',
		httpOnly: true,
		sameSite: 'lax' as const,
		secure: env.COOKIE_SECURE !== '0',
		expires
	};
}

export async function createSession(cookies: Cookies, userId: number, ip: string | null, userAgent: string | null) {
	const token = randomBytes(32).toString('base64url');
	const expires = new Date(Date.now() + SESSION_DAYS * 86400_000);
	await query(
		`INSERT INTO sessions (id_hash, user_id, expires_at, ip, user_agent) VALUES ($1, $2, $3, $4, $5)`,
		[sha256(token), userId, expires, ip, userAgent?.slice(0, 500) ?? null]
	);
	cookies.set(SESSION_COOKIE, token, cookieOpts(expires));
}

export async function destroySession(cookies: Cookies) {
	const token = cookies.get(SESSION_COOKIE);
	if (token) await query(`DELETE FROM sessions WHERE id_hash = $1`, [sha256(token)]);
	cookies.delete(SESSION_COOKIE, { path: '/' });
}

export async function destroyAllSessions(userId: number) {
	await query(`DELETE FROM sessions WHERE user_id = $1`, [userId]);
}

// Resolves the cookie to a user; also refreshes last_seen_at at most once a minute
// and slides the expiry so active members are not logged out mid-month.
export async function loadSession(cookies: Cookies): Promise<{ user: SessionUser; sessionId: string } | null> {
	const token = cookies.get(SESSION_COOKIE);
	if (!token) return null;
	const idHash = sha256(token);
	const rows = await query<SessionUser & { last_seen_at: Date }>(
		`SELECT u.id, u.wp_user_id, u.email, u.user_login, u.display_name, u.first_name, u.last_name, u.role, u.status,
		        u.stripe_customer_id, s.last_seen_at,
		        us.plan, string_to_array(NULLIF(us.user_region, ''), ',') AS user_regions
		   FROM sessions s
		   JOIN users u ON u.id = s.user_id
		   LEFT JOIN user_subscriptions us ON lower(us.user_id) = lower(u.email)
		  WHERE s.id_hash = $1 AND s.expires_at > now() AND u.status = 'active'
		  LIMIT 1`,
		[idHash]
	);
	const row = rows[0];
	if (!row) {
		cookies.delete(SESSION_COOKIE, { path: '/' });
		return null;
	}
	if (Date.now() - new Date(row.last_seen_at).getTime() > 60_000) {
		const expires = new Date(Date.now() + SESSION_DAYS * 86400_000);
		await query(`UPDATE sessions SET last_seen_at = now(), expires_at = $2 WHERE id_hash = $1`, [idHash, expires]);
		cookies.set(SESSION_COOKIE, token, cookieOpts(expires));
	}
	const { last_seen_at: _drop, ...user } = row;
	return {
		user: { ...user, user_regions: (user.user_regions ?? []).map((r) => r.trim()).filter(Boolean) },
		sessionId: idHash
	};
}
