import { error, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { cancelSub, deleteSub, getSub, markWooCancelled, subPatchFrom, updateSub, wooForSub } from '$lib/server/admin';
import { fail } from '@sveltejs/kit';

const idOf = (s: string) => { const n = Number(s); if (!Number.isInteger(n) || n <= 0) error(404); return n; };

export const load: PageServerLoad = async ({ params }) => {
	const sub = await getSub(idOf(params.id));
	if (!sub) error(404, 'No such subscription.');
	return { sub, woo: await wooForSub(sub.id) };
};

export const actions: Actions = {
	save: async ({ params, request }) => {
		await updateSub(idOf(params.id), subPatchFrom(await request.formData()));
		return { saved: true };
	},
	cancel: async ({ params, request }) => {
		const form = await request.formData();
		const mode = form.get('mode') === 'now' ? 'now' : 'period_end';
		try {
			const r = await cancelSub(idOf(params.id), mode);
			return { cancelled: mode, stripe: r.stripe, stripeStatus: r.stripeStatus };
		} catch (e) {
			console.error('[admin cancel]', e);
			return fail(502, { cancelError: `Stripe refused the cancellation: ${(e as Error).message}. Nothing was changed here.` });
		}
	},
	woodone: async ({ request }) => {
		const form = await request.formData();
		await markWooCancelled(Number(form.get('wp_subscription_id')));
		return { wooDone: true };
	},
	delete: async ({ params }) => {
		const sub = await getSub(idOf(params.id));
		if (!sub) error(404);
		await deleteSub(sub.id);
		redirect(303, sub.users_id ? `/admin/users/${sub.users_id}/` : '/admin/subscriptions/');
	}
};
