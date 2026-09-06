import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { login } from '$lib/server/auth';
import { createSession } from '$lib/server/session';
import { safeNext } from '$lib/server/redirect';
import { query } from '$lib/server/db';
import { renewalDue } from '$lib/server/renewal';

export const prerender = false;

export const load: PageServerLoad = ({ locals, url }) => {
	if (locals.user) redirect(303, safeNext(url.searchParams.get('next'), locals.user.role === 'administrator' ? '/admin/' : '/app/'));
	return { next: url.searchParams.get('next') ?? '' };
};

export const actions: Actions = {
	default: async ({ request, cookies, getClientAddress }) => {
		const form = await request.formData();
		const identifier = String(form.get('identifier') ?? '').trim();
		const password = String(form.get('password') ?? '');
		const next = safeNext(String(form.get('next') ?? ''), '/app/');
		if (!identifier || !password) {
			return fail(400, { identifier, error: 'Enter your email and password.' });
		}
		const result = await login(identifier, password);
		if (!result.ok) {
			return fail(400, {
				identifier,
				error:
					result.reason === 'locked'
						? 'This account is locked. Email info@urbanprospects.com.au to restore access.'
						: 'That email or password is not right.'
			});
		}
		let ip: string | null = null;
		try { ip = getClientAddress(); } catch { /* not available behind some proxies */ }
		await createSession(cookies, result.userId, ip, request.headers.get('user-agent'));
		// Administrators land on the console unless they were sent to log in from somewhere specific.
		const [u] = await query<{ role: string; email: string }>(`SELECT role, email FROM users WHERE id = $1`, [result.userId]);
		if (u?.role === 'administrator') redirect(303, String(form.get('next') ?? '') ? next : '/admin/');
		// Imported members whose plan ends within a week, or already has, go to the Stripe renewal step first.
		if (u && (await renewalDue(u.email))) redirect(303, '/renew/');
		redirect(303, next);
	}
};
