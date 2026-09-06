import { json, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { REGION_NAMES, priceIdFor, createCheckoutSession, type Region } from '$lib/server/stripe';
import type { RequestHandler } from './$types';

// Runs on the Node server: creates a Stripe Checkout Session for a platform
// subscription with a 7-day trial. The page at /pricing/ posts here and then
// follows the returned URL. Stripe Billing is the source of truth for the
// subscription afterwards (webhooks: UP-019).
export const prerender = false;

const MAX_USERS = 10;

export const POST: RequestHandler = async ({ request, url }) => {
	let body: { regions?: unknown; interval?: unknown; users?: unknown; email?: unknown };
	try {
		body = await request.json();
	} catch {
		error(400, 'Invalid JSON');
	}

	const regions = Array.isArray(body.regions)
		? [...new Set(body.regions.filter((r): r is Region => REGION_NAMES.includes(r as Region)))]
		: [];
	if (regions.length < 1 || regions.length > REGION_NAMES.length) error(400, 'Pick 1 to 5 regions');

	const interval = body.interval === 'year' ? 'year' : body.interval === 'month' ? 'month' : null;
	if (!interval) error(400, 'interval must be month or year');

	const users = Number(body.users);
	if (!Number.isInteger(users) || users < 1 || users > MAX_USERS) error(400, `users must be 1 to ${MAX_USERS}`);

	const email = typeof body.email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email) ? body.email : undefined;

	const priceId = priceIdFor(regions.length, interval);
	if (!priceId) error(503, 'Subscription checkout is not configured for this plan yet');

	const origin = env.PUBLIC_ORIGIN || url.origin;
	// Ordered as REGION_NAMES so the value is stable regardless of click order.
	const regionList = REGION_NAMES.filter((r) => regions.includes(r)).join(', ');

	const params: Record<string, unknown> = {
		mode: 'subscription',
		customer_email: email,
		line_items: [{ price: priceId, quantity: users }],
		subscription_data: {
			trial_period_days: 7,
			metadata: { regions: regionList, users, interval }
		},
		payment_method_collection: 'always',
		allow_promotion_codes: true,
		metadata: { price_id: priceId, regions: regionList, users, interval },
		success_url: `${origin}/signup/success/?session_id={CHECKOUT_SESSION_ID}`,
		cancel_url: `${origin}/pricing/`
	};
	// The 10% multi-user discount is a Stripe coupon applied server-side, so the
	// price the customer sees on the page is the price Stripe charges.
	if (users > 1 && env.STRIPE_COUPON_MULTI_USER) {
		params.discounts = [{ coupon: env.STRIPE_COUPON_MULTI_USER }];
		delete params.allow_promotion_codes; // Stripe forbids both at once
	}

	try {
		const session = await createCheckoutSession(params);
		return json({ url: session.url });
	} catch (e) {
		console.error('[checkout]', e);
		error(502, 'Could not start checkout. Please try again or email info@urbanprospects.com.au.');
	}
};
