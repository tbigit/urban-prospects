import { redirect } from '@sveltejs/kit';
import { base } from '$app/paths';

// "Start Free Trial" links point here from the header, CTAs and the old site.
// The trial is now taken on /pricing/ (regions, users, Stripe Checkout).
export const prerender = true;

export function load() {
	redirect(301, `${base}/pricing/`);
}
