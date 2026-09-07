import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { hasAccess } from '$lib/server/renewal';

export const prerender = false;

// Profile for the app at /app. Mirrors the query-string contract the WordPress
// embed used (id, email, plan, first_name, last_name, regions) so upapp needs
// one fetch, not a rewrite. The app's tables user_fav, user_search and
// user_template are keyed by the WordPress numeric user id (WP passed
// wp_users.ID as `id`), so members keep their favourites, saved searches and
// mail templates only if we send the same number. Accounts that never existed
// in WordPress have no wp_user_id; they get their email, which cannot collide
// with a WordPress number. (user_subscriptions is keyed by email; unrelated.)
export const GET: RequestHandler = async ({ locals }) => {
	const u = locals.user;
	if (!u) return json({ logged_in: false }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
	return json(
		{
			logged_in: true,
			id: u.wp_user_id != null ? String(u.wp_user_id) : u.email,
			email: u.email,
			plan: u.plan ?? '',
			first_name: u.first_name ?? '',
			last_name: u.last_name ?? '',
			regions: u.user_regions,
			// Entitlement for the property details panel. false => show the
			// subscribe page (renew_url) in the panel; search stays available.
			has_access: u.role === 'administrator' ? true : await hasAccess(u.billing_email),
			renew_url: '/renew/'
		},
		{ headers: { 'Cache-Control': 'no-store' } }
	);
};
