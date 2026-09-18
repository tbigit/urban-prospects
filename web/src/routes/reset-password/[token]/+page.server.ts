import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { completePasswordReset, passwordProblem, validateResetToken } from '$lib/server/auth';
import { createSession } from '$lib/server/session';

export const prerender = false;

export const load: PageServerLoad = async ({ params }) => {
	return { valid: (await validateResetToken(params.token)) !== null };
};

export const actions: Actions = {
	default: async ({ request, params, url, cookies, getClientAddress }) => {
		const form = await request.formData();
		const password = String(form.get('password') ?? '');
		const confirm = String(form.get('confirm') ?? '');
		const problem = passwordProblem(password);
		if (problem) return fail(400, { error: problem });
		if (password !== confirm) return fail(400, { error: 'The two passwords do not match.' });
		const userId = await validateResetToken(params.token);
		if (!userId || !(await completePasswordReset(params.token, password))) {
			return fail(400, { error: 'This reset link has expired. Request a new one.' });
		}
		// A new trial member arrives here straight from checkout: sign them in.
		if (url.searchParams.get('welcome') === '1') {
			await createSession(cookies, userId, getClientAddress(), request.headers.get('user-agent'));
			redirect(303, '/app/');
		}
		redirect(303, '/login/?reset=1');
	}
};
