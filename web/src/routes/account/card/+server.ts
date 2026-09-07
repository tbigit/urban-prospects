import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { query } from '$lib/server/db';
import { createSetupIntent, stripeConfigured } from '$lib/server/stripe';

export const prerender = false;

/** Mint a SetupIntent for the signed-in member's Stripe customer. The card
 *  element on /account/ confirms it; the ?/card action then makes the new
 *  payment method the default. Card data never touches this server. */
export const POST: RequestHandler = async ({ locals }) => {
	if (!locals.user) error(401);
	if (!stripeConfigured()) error(400, 'Stripe is not switched on');
	const [sub] = await query<{ payment_customer_id: string | null }>(
		`SELECT payment_customer_id FROM user_subscriptions WHERE lower(user_email) = lower($1) AND payment_customer_id IS NOT NULL ORDER BY id DESC LIMIT 1`, [locals.user.email]);
	const customer = sub?.payment_customer_id ?? locals.user.stripe_customer_id;
	if (!customer) error(400, 'No Stripe customer on this account');
	try { return json({ client_secret: await createSetupIntent(customer) }); }
	catch (e) { error(502, (e as Error).message); }
};
