import { fail, redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { Actions, PageServerLoad } from './$types';
import { renewalDue, renewalBasis, hasAccess, regionsOf, intervalOf, startRenewalCheckout, stripeConfigured, type DueSub } from '$lib/server/renewal';
import { REGION_NAMES } from '$lib/server/stripe';
import { DISPLAY_PRICES } from '$lib/server/stripe';

export const prerender = false;

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(303, '/login/?next=%2Frenew%2F');
	const email = locals.user.email;
	if (!(await renewalDue(email)) && (await hasAccess(email))) redirect(303, '/account/');
	const basis = await basisFor(email);
	const regions = regionsOf(basis);
	const interval = intervalOf(basis);
	return {
		user: locals.user,
		due: { ...basis, current_period_end: basis.current_period_end.toISOString() },
		kind: (await renewalDue(email)) ? 'renewal' : 'resubscribe',
		regions, interval,
		price: DISPLAY_PRICES[regions.length]?.[interval] ?? null,
		configured: stripeConfigured()
	};
};

export const actions: Actions = {
	default: async ({ locals, url }) => {
		if (!locals.user) redirect(303, '/login/?next=%2Frenew%2F');
		const email = locals.user.email;
		if (!(await renewalDue(email)) && (await hasAccess(email))) redirect(303, '/account/');
		try {
			const checkoutUrl = await startRenewalCheckout(locals.user, await basisFor(email), env.PUBLIC_ORIGIN || url.origin);
			redirect(303, checkoutUrl);
		} catch (e) {
			if ((e as { status?: number }).status === 303) throw e;
			console.error('[renew]', e);
			return fail(502, { error: 'Could not start checkout. Please try again or email info@urbanprospects.com.au.' });
		}
	}
};

// A member with no subscription history at all gets a sensible default to edit on Stripe's page.
async function basisFor(email: string): Promise<DueSub> {
	return (await renewalBasis(email)) ?? {
		id: 0, plan: '1 region', billing_cycle: 'Yearly', user_region: REGION_NAMES[0], payment_price: null,
		current_period_end: new Date(), overdue: true, wp_subscription_id: null
	};
}
