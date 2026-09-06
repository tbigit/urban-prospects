import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createUser, listUsers, ROLES, pick } from '$lib/server/admin';
import { passwordProblem } from '$lib/server/auth';

export const load: PageServerLoad = async ({ url }) => {
	const q = url.searchParams;
	const f = { q: q.get('q') ?? '', role: q.get('role') ?? '', status: q.get('status') ?? '', test: q.get('test') ?? '', page: Number(q.get('page')) || 1 };
	return { ...(await listUsers(f)), f };
};

export const actions: Actions = {
	create: async ({ request }) => {
		const form = await request.formData();
		const email = String(form.get('email') ?? '').trim().toLowerCase();
		const password = String(form.get('password') ?? '');
		if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail(400, { createError: 'Enter a valid email address.' });
		const problem = passwordProblem(password);
		if (problem) return fail(400, { createError: problem });
		try {
			const id = await createUser({
				email, password,
				first_name: String(form.get('first_name') ?? '').trim(),
				last_name: String(form.get('last_name') ?? '').trim(),
				role: pick(form, 'role', ROLES, 'subscriber'),
				is_test: form.get('is_test') === 'on'
			});
			redirect(303, `/admin/users/${id}/`);
		} catch (e: unknown) {
			if ((e as { code?: string }).code === '23505') return fail(400, { createError: 'A user with that email already exists.' });
			throw e;
		}
	}
};
