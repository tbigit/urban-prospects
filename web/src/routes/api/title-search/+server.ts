import { json, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { hazlettMode, hazlettConfigured, orderPayload, normaliseFolios } from '$lib/server/hazlett';
import { place, collect, kick, recipientFor, isFree, paymentsConfigured, startCheckout } from '$lib/server/title-orders';
import type { RequestHandler } from './$types';

// Title search / plan (image) search purchase from the property panel.
// Replaces the WooCommerce cart (items 920 / 5057) + n8n → Hazlett flow.
// Protocol, timings and history: docs/hazlett-api.md. Queue: lib/server/title-orders.ts.
//
// Payment (2026-09-11): $25 per title / plan / dealing through Stripe Checkout
// (mode=payment). Rows are inserted as `awaiting_payment` and only ordered from
// Hazlett once Stripe reports the session paid (success URL, or the collector's
// reconcile). Accounts in TITLE_SEARCH_FREE_EMAILS (Stuart) skip Checkout and order
// straight away. Mail goes to the buyer, bcc TITLE_SEARCH_BCC for now.
export const prerender = false;

const MAX_IDENTIFIERS = 10;
// Titles are ready in ~2 s; wait this long inline so the buyer sees "emailed" straight away.
// Images take hours and are left to the collector.
const INLINE_WAIT_MS: Record<'title' | 'image', number> = { title: 20_000, image: 0 };

export const POST: RequestHandler = async ({ request, locals, url }) => {
	const user = locals.user;
	if (!user) error(401, 'Log in to purchase a title search');

	let body: { product?: unknown; identifiers?: unknown; address?: unknown; propid?: unknown };
	try {
		body = await request.json();
	} catch {
		error(400, 'Invalid JSON');
	}

	const product = body.product === 'image' ? 'image' : body.product === 'title' ? 'title' : null;
	if (!product) error(400, 'product must be "title" or "image"');

	const rawIds = Array.isArray(body.identifiers) ? body.identifiers.map((s) => String(s ?? '').trim()).filter((s) => s && s.length <= 60) : [];
	// One Hazlett order per folio: upapp's folio strings can hold two titles ("3/524962 16/629969").
	const identifiers = [...new Set(product === 'title' ? rawIds.flatMap((s) => (normaliseFolios(s).length ? normaliseFolios(s) : [s])) : rawIds)];
	if (!identifiers.length) error(400, product === 'title' ? 'No folio identifier on this property' : 'Enter at least one dealing or plan number');
	if (identifiers.length > MAX_IDENTIFIERS) error(400, `At most ${MAX_IDENTIFIERS} per order`);
	const unusable = identifiers.filter((i) => !orderPayload(product, i, 'X'));
	if (unusable.length) error(400, `Not a valid ${product === 'title' ? 'folio' : 'plan or dealing number'}: ${unusable.join(', ')}`);

	const address = typeof body.address === 'string' ? body.address.trim().slice(0, 200) || null : null;
	const propid = body.propid != null ? String(body.propid).slice(0, 40) : null;

	if (!hazlettConfigured()) error(503, 'Title searches are not switched on yet');

	const free = isFree(user.email);
	if (!free) {
		if (!paymentsConfigured()) error(503, 'Card payments are not switched on yet');
		const origin = env.PUBLIC_ORIGIN || url.origin;
		try {
			const { url: checkout_url, rows } = await startCheckout(identifiers.map((identifier) => ({ user, product, identifier, address, propid })), origin);
			return json({ ok: true, checkout_url, order_ids: rows.map((r) => r.id), amount_aud: rows.reduce((n, r) => n + Number(r.price_aud), 0) });
		} catch (e) {
			console.error('[title-search] checkout', e);
			error(502, 'Could not start the card payment. Please try again or email info@urbanprospects.com.au.');
		}
	}

	const results = [];
	for (const identifier of identifiers) {
		let row = await place({ user, product, identifier, address, propid });
		if (row.hazlett_status === 'pending') row = await collect(row.id, INLINE_WAIT_MS[product]);
		results.push({
			id: row.id,
			identifier,
			orderId: row.hazlett_order_id,
			status: row.hazlett_status, // ready | pending | error
			emailed_to: row.emailed_to,
			error: row.error,
			download: row.hazlett_status === 'ready' ? `/account/documents/${row.id}/` : null
		});
	}
	// Anything still pending is now the collector's job; run a pass soon rather than waiting for the tick.
	if (results.some((r) => r.status === 'pending')) kick(25_000);

	if (results.every((r) => r.status === 'error')) error(502, `Hazlett order failed: ${results[0]?.error ?? 'unknown error'}`);

	return json({
		ok: true,
		mode: hazlettMode(),
		recipient: recipientFor(user.email),
		free: true,
		results
	});
};
