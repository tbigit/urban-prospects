import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { destroySession } from '$lib/server/session';

export const prerender = false;
// +layout.ts's trailingSlash applies to pages only; without this the endpoint
// answers POST /logout/ with a 308 to /logout before doing anything.
export const trailingSlash = 'always';

export const POST: RequestHandler = async ({ cookies }) => {
	await destroySession(cookies);
	redirect(303, '/');
};
