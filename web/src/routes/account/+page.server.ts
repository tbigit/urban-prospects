import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { changePassword, passwordProblem } from '$lib/server/auth';

export const prerender = false;

export const load: PageServerLoad = ({ locals, url }) => {
	if (!locals.user) redirect(303, `/login/?next=${encodeURIComponent(url.pathname)}`);
	return { user: locals.user };
};

export const actions: Actions = {
	password: async ({ request, locals }) => {
		if (!locals.user) redirect(303, '/login/');
		const form = await request.formData();
		const current = String(form.get('current') ?? '');
		const next = String(form.get('next') ?? '');
		const confirm = String(form.get('confirm') ?? '');
		const problem = passwordProblem(next);
		if (problem) return fail(400, { error: problem });
		if (next !== confirm) return fail(400, { error: 'The two new passwords do not match.' });
		if (!(await changePassword(locals.user.id, current, next))) {
			return fail(400, { error: 'Your current password is not right.' });
		}
		return { changed: true };
	}
};
