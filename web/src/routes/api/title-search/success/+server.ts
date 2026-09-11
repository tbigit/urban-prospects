import { redirect } from '@sveltejs/kit';
import { fulfilSession } from '$lib/server/title-orders';
import type { RequestHandler } from './$types';

// Stripe Checkout success URL for title / plan / dealing purchases. Confirms the
// session is paid, sends the orders to Hazlett (titles collected inline), then
// lands the member on their Documents list. Idempotent; the collector's reconcile
// covers a closed tab.
export const prerender = false;

export const GET: RequestHandler = async ({ url, locals }) => {
	const sessionId = url.searchParams.get('session_id') ?? '';
	if (!locals.user) redirect(303, `/login/?next=${encodeURIComponent(url.pathname + url.search)}`);
	if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) redirect(303, '/account/#documents');
	try {
		const r = await fulfilSession(sessionId, 20_000);
		redirect(303, `/account/?purchase=${r.paid ? 'paid' : 'unpaid'}#documents`);
	} catch (e) {
		if ((e as { status?: number }).status === 303) throw e;
		console.error('[title-search/success]', e);
		redirect(303, '/account/?purchase=error#documents');
	}
};
