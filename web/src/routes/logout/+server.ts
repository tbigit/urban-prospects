import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { destroySession } from '$lib/server/session';

export const prerender = false;

export const POST: RequestHandler = async ({ cookies }) => {
	await destroySession(cookies);
	redirect(303, '/');
};
