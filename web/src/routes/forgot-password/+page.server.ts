import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';
import { requestPasswordReset } from '$lib/server/auth';

export const prerender = false;

export const actions: Actions = {
	default: async ({ request }) => {
		const email = String((await request.formData()).get('email') ?? '').trim();
		if (!email.includes('@')) return fail(400, { email, error: 'Enter the email on your account.' });
		await requestPasswordReset(email);
		return { sent: true, email };
	}
};
