import { redirect } from '@sveltejs/kit';
import { base } from '$app/paths';

// /blog was the index's original (and indexed) address. The index now lives
// at /insights to match its nav label; prerendering this redirect emits a
// static build/blog/index.html that forwards, so old links keep resolving.
export const prerender = true;

export function load() {
	redirect(301, `${base}/insights/`);
}
