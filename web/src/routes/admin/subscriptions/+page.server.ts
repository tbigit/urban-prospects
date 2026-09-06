import type { PageServerLoad } from './$types';
import { listSubs } from '$lib/server/admin';

export const load: PageServerLoad = async ({ url }) => {
	const q = url.searchParams;
	const f = { q: q.get('q') ?? '', status: q.get('status') ?? '', cycle: q.get('cycle') ?? '', plan: q.get('plan') ?? '', test: q.get('test') ?? '', page: Number(q.get('page')) || 1 };
	return { ...(await listSubs(f)), f };
};
