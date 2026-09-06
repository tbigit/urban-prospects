import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { completePasswordReset, passwordProblem, validateResetToken } from '$lib/server/auth';

export const prerender = false;

export const load: PageServerLoad = async ({ params }) => {
	return { valid: (await validateResetToken(params.token)) !== null };
};

export const actions: Actions = {
	default: async ({ request, params }) => {
		const form = await request.formData();
		const password = String(form.get('password') ?? '');
		const confirm = String(form.get('confirm') ?? '');
		const problem = passwordProblem(password);
		if (problem) return fail(400, { error: problem });
		if (password !== confirm) return fail(400, { error: 'The two passwords do not match.' });
		if (!(await completePasswordReset(params.token, password))) {
			return fail(400, { error: 'This reset link has expired. Request a new one.' });
		}
		redirect(303, '/login/?reset=1');
	}
};
