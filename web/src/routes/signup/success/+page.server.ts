import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { completeSignup } from '$lib/server/signup';

export const prerender = false;

export const load: PageServerLoad = async ({ url }) => {
	const sessionId = url.searchParams.get('session_id') ?? '';
	if (!sessionId) redirect(303, '/pricing/');
	let r;
	try {
		r = await completeSignup(sessionId);
	} catch (e) {
		console.error('[signup/success]', e);
		error(502, 'We could not confirm your checkout with Stripe just now. Refresh this page in a minute, or email info@urbanprospects.com.au.');
	}
	if (!r.pending && r.token) redirect(303, `/reset-password/${r.token}/?welcome=1`);
	return { pending: r.pending, email: r.pending ? null : r.email };
};
