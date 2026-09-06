import type { PageServerLoad } from './$types';
import { stats, upcoming, recentLogins, wooCancelQueue } from '$lib/server/admin';

export const load: PageServerLoad = async () => {
	const [s, up, logins, woo] = await Promise.all([stats(), upcoming(60), recentLogins(), wooCancelQueue()]);
	return { stats: s, upcoming: up, logins, woo };
};
