import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const prerender = false;

// Profile for the app at /app. Mirrors the query-string contract the WordPress
// embed used (id, email, plan, first_name, last_name, regions) so upapp needs
// one fetch, not a rewrite. The app's own tables are keyed by email, so `id`
// is the email too — that is what WP passed.
export const GET: RequestHandler = ({ locals }) => {
	const u = locals.user;
	if (!u) return json({ logged_in: false }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
	return json(
		{
			logged_in: true,
			id: u.email,
			email: u.email,
			plan: u.plan ?? '',
			first_name: u.first_name ?? '',
			last_name: u.last_name ?? '',
			regions: u.user_regions
		},
		{ headers: { 'Cache-Control': 'no-store' } }
	);
};
