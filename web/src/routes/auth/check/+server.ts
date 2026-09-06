import type { RequestHandler } from './$types';

export const prerender = false;

// nginx `auth_request /auth/check;` target guarding /app/. Body is ignored by
// nginx; only the status matters. Headers let the location pass identity on.
export const GET: RequestHandler = ({ locals }) => {
	if (!locals.user) return new Response(null, { status: 401 });
	return new Response(null, {
		status: 200,
		headers: { 'X-Auth-User': locals.user.email, 'X-Auth-Plan': locals.user.plan ?? '' }
	});
};
