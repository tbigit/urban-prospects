import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { completeRenewal } from '$lib/server/renewal';

export const prerender = false;

export const load: PageServerLoad = async ({ locals, url }) => {
	const sessionId = url.searchParams.get('session_id') ?? '';
	if (!locals.user) redirect(303, `/login/?next=${encodeURIComponent(url.pathname + url.search)}`);
	if (!sessionId) redirect(303, '/account/');
	try {
		const r = await completeRenewal(locals.user, sessionId);
		return { ...r, periodEnd: 'periodEnd' in r && r.periodEnd ? r.periodEnd.toISOString() : null };
	} catch (e) {
		console.error('[renew/success]', e);
		error(502, 'We could not confirm your payment with Stripe just now. If you were charged, your access will be restored shortly; otherwise email info@urbanprospects.com.au.');
	}
};
