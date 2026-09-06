import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { hasAccess } from '$lib/server/renewal';

// Every /app route needs a logged-in member. Cancelled/expired members still get
// in (search is free); has_access gates the property details panel client-side.
export const load: LayoutServerLoad = async ({ locals, url }) => {
	if (!locals.user) redirect(303, `/login/?next=${encodeURIComponent(url.pathname + url.search)}`);
	const u = locals.user;
	return {
		user: u,
		has_access: u.role === 'administrator' ? true : await hasAccess(u.email),
		renew_url: '/renew/'
	};
};
