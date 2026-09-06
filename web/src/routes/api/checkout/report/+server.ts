import { json, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { createCheckoutSession } from '$lib/server/stripe';
import type { RequestHandler } from './$types';

// One-off Property Intelligence Report ($250 per site). Guest checkout: no
// account needed (UP-015). The site address travels in metadata so the
// fulfilment webhook (UP-016: Stripe -> n8n -> PDF -> email) knows what to run.
export const prerender = false;

export const POST: RequestHandler = async ({ request, url }) => {
	let body: { address?: unknown; email?: unknown };
	try {
		body = await request.json();
	} catch {
		error(400, 'Invalid JSON');
	}

	const address = typeof body.address === 'string' ? body.address.trim().slice(0, 200) : '';
	if (address.length < 6) error(400, 'Enter the full site address');

	const email = typeof body.email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email) ? body.email : undefined;

	const priceId = env.STRIPE_PRICE_REPORT;
	if (!priceId) error(503, 'Report checkout is not configured yet');

	const origin = env.PUBLIC_ORIGIN || url.origin;
	try {
		const session = await createCheckoutSession({
			mode: 'payment',
			customer_email: email,
			customer_creation: 'always',
			line_items: [{ price: priceId, quantity: 1 }],
			allow_promotion_codes: true,
			metadata: { product: 'property_intelligence_report', address },
			payment_intent_data: { metadata: { product: 'property_intelligence_report', address } },
			success_url: `${origin}/report/success/?session_id={CHECKOUT_SESSION_ID}`,
			cancel_url: `${origin}/report/`
		});
		return json({ url: session.url });
	} catch (e) {
		console.error('[checkout/report]', e);
		error(502, 'Could not start checkout. Please try again or email info@urbanprospects.com.au.');
	}
};
