// Login, password reset and rehash logic on top of users + sessions.
import { createHash, randomBytes } from 'node:crypto';
import { env } from '$env/dynamic/private';
import { query } from './db';
import { detectAlgo, hashPassword, verifyPassword } from './password';
import { sendMail } from './mail';
import { destroyAllSessions } from './session';

interface UserRow {
	id: number;
	email: string;
	password_hash: string | null;
	password_algo: string;
	status: string;
}

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');
const RESET_MINUTES = 60;

export type LoginResult = { ok: true; userId: number } | { ok: false; reason: 'invalid' | 'locked' };

// `identifier` may be the email or the WordPress user_login — both were valid on WP.
export async function login(identifier: string, password: string): Promise<LoginResult> {
	const rows = await query<UserRow>(
		`SELECT id, email, password_hash, password_algo, status FROM users
		  WHERE lower(email) = lower($1) OR lower(user_login) = lower($1) LIMIT 1`,
		[identifier.trim()]
	);
	const user = rows[0];
	// Burn comparable time when the user does not exist so timing does not leak existence.
	if (!user) {
		await verifyPassword(password, '$argon2id$v=19$m=19456,t=2,p=1$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA');
		return { ok: false, reason: 'invalid' };
	}
	if (user.status !== 'active') return { ok: false, reason: 'locked' };
	if (!(await verifyPassword(password, user.password_hash))) return { ok: false, reason: 'invalid' };

	// Opportunistic rehash: anything that is not already argon2id moves to it now
	// that we have the plaintext. WP hashes are never needed again after this.
	if (detectAlgo(user.password_hash ?? '') !== 'argon2id') {
		const { hash, algo } = await hashPassword(password);
		await query(`UPDATE users SET password_hash = $2, password_algo = $3 WHERE id = $1`, [user.id, hash, algo]);
	}
	await query(`UPDATE users SET last_login_at = now() WHERE id = $1`, [user.id]);
	return { ok: true, userId: user.id };
}

// Always resolves without revealing whether the address exists.
/** Mint a reset token for a user id; the caller sends the email. */
export async function issueResetToken(userId: number, minutes = RESET_MINUTES) {
	const token = randomBytes(32).toString('base64url');
	await query(`INSERT INTO password_reset_tokens (token_hash, user_id, expires_at) VALUES ($1, $2, now() + ($3 || ' minutes')::interval)`,
		[sha256(token), userId, String(minutes)]);
	return token;
}

export async function requestPasswordReset(email: string) {
	const rows = await query<{ id: number; email: string }>(
		`SELECT id, email FROM users WHERE lower(email) = lower($1) AND status = 'active' LIMIT 1`,
		[email.trim()]
	);
	const user = rows[0];
	if (!user) return;
	const token = randomBytes(32).toString('base64url');
	await query(
		`INSERT INTO password_reset_tokens (token_hash, user_id, expires_at)
		 VALUES ($1, $2, now() + ($3 || ' minutes')::interval)`,
		[sha256(token), user.id, String(RESET_MINUTES)]
	);
	const origin = env.PUBLIC_ORIGIN || 'https://www.urbanprospects.com.au';
	await sendMail(
		user.email,
		'Reset your Urban Prospects password',
		`Someone asked to reset the password for this Urban Prospects account.\n\n` +
			`Set a new password here (link valid for ${RESET_MINUTES} minutes):\n${origin}/reset-password/${token}/\n\n` +
			`If that was not you, ignore this email and your password stays the same.`
	);
}

export async function validateResetToken(token: string): Promise<number | null> {
	const rows = await query<{ user_id: number }>(
		`SELECT user_id FROM password_reset_tokens
		  WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now() LIMIT 1`,
		[sha256(token)]
	);
	return rows[0]?.user_id ?? null;
}

export async function completePasswordReset(token: string, newPassword: string): Promise<boolean> {
	const userId = await validateResetToken(token);
	if (!userId) return false;
	const { hash, algo } = await hashPassword(newPassword);
	await query(`UPDATE users SET password_hash = $2, password_algo = $3 WHERE id = $1`, [userId, hash, algo]);
	await query(`UPDATE password_reset_tokens SET used_at = now() WHERE token_hash = $1`, [sha256(token)]);
	await destroyAllSessions(userId); // any existing session is invalidated by a reset
	return true;
}

export async function changePassword(userId: number, current: string, next: string): Promise<boolean> {
	const rows = await query<{ password_hash: string | null }>(`SELECT password_hash FROM users WHERE id = $1`, [userId]);
	if (!rows[0] || !(await verifyPassword(current, rows[0].password_hash))) return false;
	const { hash, algo } = await hashPassword(next);
	await query(`UPDATE users SET password_hash = $2, password_algo = $3 WHERE id = $1`, [userId, hash, algo]);
	return true;
}

export function passwordProblem(pw: string): string | null {
	if (pw.length < 10) return 'Use at least 10 characters.';
	if (pw.length > 200) return 'That password is too long.';
	return null;
}
