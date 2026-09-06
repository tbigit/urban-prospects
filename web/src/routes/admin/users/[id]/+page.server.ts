import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createSub, getUser, ROLES, USER_STATUSES, setPassword, subPatchFrom, updateUser, pick } from '$lib/server/admin';
import { passwordProblem } from '$lib/server/auth';
import { destroyAllSessions } from '$lib/server/session';

const idOf = (s: string) => { const n = Number(s); if (!Number.isInteger(n) || n <= 0) error(404); return n; };

export const load: PageServerLoad = async ({ params }) => {
	const r = await getUser(idOf(params.id));
	if (!r) error(404, 'No such user.');
	return r;
};

export const actions: Actions = {
	save: async ({ params, request, locals }) => {
		const id = idOf(params.id);
		const form = await request.formData();
		const email = String(form.get('email') ?? '').trim();
		if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail(400, { error: 'Enter a valid email address.' });
		const role = pick(form, 'role', ROLES, 'subscriber');
		const status = pick(form, 'status', USER_STATUSES, 'active');
		if (locals.user!.id === id && (role !== 'administrator' || status !== 'active')) {
			return fail(400, { error: 'You cannot remove your own admin access or lock yourself out.' });
		}
		try {
			await updateUser(id, {
				email, role, status,
				user_login: String(form.get('user_login') ?? '').trim() || email,
				first_name: String(form.get('first_name') ?? '').trim(),
				last_name: String(form.get('last_name') ?? '').trim(),
				display_name: String(form.get('display_name') ?? '').trim(),
				is_test: form.get('is_test') === 'on',
				stripe_customer_id: String(form.get('stripe_customer_id') ?? '').trim()
			});
		} catch (e: unknown) {
			if ((e as { code?: string }).code === '23505') return fail(400, { error: 'Another user already has that email, login or Stripe customer id.' });
			throw e;
		}
		return { saved: true };
	},
	password: async ({ params, request }) => {
		const id = idOf(params.id);
		const form = await request.formData();
		const pw = String(form.get('password') ?? '');
		const problem = passwordProblem(pw);
		if (problem) return fail(400, { pwError: problem });
		await setPassword(id, pw);
		return { pwSaved: true };
	},
	signout: async ({ params }) => {
		await destroyAllSessions(idOf(params.id));
		return { signedOut: true };
	},
	addsub: async ({ params, request }) => {
		const id = idOf(params.id);
		const r = await getUser(id);
		if (!r) error(404);
		const form = await request.formData();
		const subId = await createSub(r.user.email, subPatchFrom(form));
		redirect(303, `/admin/subscriptions/${subId}/`);
	}
};
