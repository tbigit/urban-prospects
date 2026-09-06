import type { RequestHandler } from './$types';

export const prerender = false;

// nginx `auth_request /auth/check;` target guarding /app/. Body is ignored by
// nginx; only the status matters. Headers let the location pass identity on.
// Cancelled/expired members still pass: they may log in and search. Property
// details are gated inside the app using has_access from /auth/me.
export const GET: RequestHandler = ({ locals }) => {
	if (!locals.user) return new Response(null, { status: 401 });
	return new Response(null, {
		status: 200,
		headers: { 'X-Auth-User': locals.user.email, 'X-Auth-Plan': locals.user.plan ?? '' }
	});
};
