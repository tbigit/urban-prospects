import { error, redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

// Every /admin route is dynamic (DB-backed) and gated to administrators.
export const prerender = false;

export const load: LayoutServerLoad = ({ locals, url }) => {
	if (!locals.user) redirect(303, `/login/?next=${encodeURIComponent(url.pathname)}`);
	if (locals.user.role !== 'administrator') error(403, 'Administrators only.');
	return { user: locals.user };
};
