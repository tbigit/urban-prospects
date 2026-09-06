import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { changePassword, passwordProblem } from '$lib/server/auth';
import { renewalDue } from '$lib/server/renewal';
import { createApiKey, deleteApiKey, listApiKeys } from '$lib/server/api-keys';

export const prerender = false;

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) redirect(303, `/login/?next=${encodeURIComponent(url.pathname)}`);
	const due = await renewalDue(locals.user.email);
	if (due?.overdue) redirect(303, '/renew/');
	const keys = await listApiKeys(locals.user.email);
	return {
		user: locals.user,
		renewalDue: due ? due.current_period_end.toISOString() : null,
		apiKeys: keys.map((k) => ({ ...k, created_on: k.created_on.toISOString() }))
	};
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
	},
	createKey: async ({ locals }) => {
		if (!locals.user) redirect(303, '/login/');
		try {
			const row = await createApiKey(locals.user.id, locals.user.email);
			return { keyCreated: row.api_key };
		} catch {
			return fail(500, { keyError: 'Could not create an API key. Please try again.' });
		}
	},
	deleteKey: async ({ request, locals }) => {
		if (!locals.user) redirect(303, '/login/');
		const form = await request.formData();
		const key = String(form.get('key') ?? '');
		if (!key || !(await deleteApiKey(locals.user.email, key))) {
			return fail(404, { keyError: 'That API key was not found.' });
		}
		return { keyDeleted: true };
	}
};
