import { error } from '@sveltejs/kit';
import { getEntry, isPost, allSlugs } from '$lib/content';
import type { EntryGenerator, PageLoad } from './$types';

// Root-level dynamic route: every migrated article and region page keeps the
// exact path it has on the live WordPress site (/understanding-nsw-zoning-…,
// /land-for-sale-western-nsw, …), so none of them needs a redirect. Static
// routes (/blog, /demo, /signup, …) still win over this one in SvelteKit's
// route ranking, so they are unaffected.
export const prerender = true;

// adapter-static can't crawl to a page nothing links to, so name every slug.
export const entries: EntryGenerator = () => allSlugs().map((slug) => ({ slug }));

export const load: PageLoad = ({ params }) => {
	const entry = getEntry(params.slug);
	if (!entry) error(404, 'Not found');
	return { entry, kind: isPost(params.slug) ? ('post' as const) : ('region' as const) };
};
