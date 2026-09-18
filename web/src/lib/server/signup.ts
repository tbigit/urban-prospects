// Trial sign-up from /pricing/: Stripe Checkout (mode=subscription, 7-day trial)
// returns to /signup/success/, which creates the site account for the checkout
// email, mirrors the subscription, and — for a brand-new account with no
// password yet — hands back a set-password token so the member is not left
// waiting for an email. An existing account is never given a token here.
import { query } from './db';
import { issueResetToken } from './auth';
import { getCheckoutSession } from './stripe';
import { recordCheckoutSubscription } from './renewal';

export async function completeSignup(sessionId: string) {
	const s = await getCheckoutSession(sessionId);
	if (s.mode !== 'subscription' || s.status !== 'complete' || !s.subscription) return { pending: true as const };
	const email = (s.customer_details?.email ?? '').trim();
	if (!email) throw new Error(`checkout ${s.id} has no customer email`);

	await query(
		`INSERT INTO users (user_login, email, password_algo, display_name)
		 VALUES ($1, $1, 'argon2id', $2) ON CONFLICT ((lower(email::text))) DO NOTHING`,
		[email, s.customer_details?.name ?? null]
	);
	const [user] = await query<{ id: number; email: string; password_hash: string | null }>(
		`SELECT id, email, password_hash FROM users WHERE lower(email) = lower($1)`, [email]);
	const r = await recordCheckoutSubscription(user, s);
	// Only a still-passwordless account created by a sign-up checkout gets a token, and
	// only for a session completed in the last day, so an old success URL grants nothing.
	const fresh = Date.now() / 1000 - (s.created ?? 0) < 86400;
	const token = !user.password_hash && fresh ? await issueResetToken(user.id, 60 * 24) : null;
	return { pending: false as const, email: user.email, token, ...r };
}
