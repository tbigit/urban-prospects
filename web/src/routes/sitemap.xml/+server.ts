import { posts, regions } from '$lib/content';

export const prerender = true;

const SITE = 'https://www.urbanprospects.com.au';

// The URL list is derived from the route tree at build time rather than
// hand-maintained: import.meta.glob is resolved by Vite, so adding a marketing
// route automatically adds it here and a deleted one disappears. Only the
// priorities and the exclusions below are edited by hand.
const pageFiles = import.meta.glob('/src/routes/**/+page.svelte', { eager: false });

// Routes that must never be indexed: authenticated areas, the app, redirects,
// and anything behind a login. Matched as a path prefix.
const EXCLUDE = [
	'/account',
	'/admin',
	'/api',
	'/app',
	'/auth',
	'/blog', // 301 to /insights/
	'/forgot-password',
	'/login',
	'/logout',
	'/renew',
	'/report/success', // post-checkout confirmation
	'/reset-password',
	'/signup'
];

// Anything not listed falls back to 0.5. Longest matching key wins.
const PRIORITY: Record<string, string> = {
	'/': '1.0',
	'/platform/': '0.9',
	'/services/': '0.9',
	'/pricing/': '0.9',
	'/insights/': '0.9',
	'/data-apis/': '0.8',
	'/about/': '0.8',
	'/nsw-regions/': '0.8',
	'/faq/': '0.6',
	'/contact/': '0.6',
	'/report/': '0.5',
	'/developers/': '0.5',
	'/demo/': '0.4',
	'/privacy-policy/': '0.3',
	'/terms-of-use/': '0.3'
};

const url = (path: string, lastmod?: string | null) =>
	[
		'\t<url>',
		`\t\t<loc>${SITE}${path}</loc>`,
		lastmod ? `\t\t<lastmod>${lastmod}</lastmod>` : null,
		`\t\t<priority>${PRIORITY[path] ?? '0.5'}</priority>`,
		'\t</url>'
	]
		.filter(Boolean)
		.join('\n');

// '/src/routes/faq/+page.svelte' -> '/faq/'; the root page -> '/'.
// Trailing slash on every URL, matching how the pages are served (see
// trailingSlash in +layout.ts) — a sitemap entry that redirects is a wasted
// crawl.
function routePath(file: string): string | null {
	const path = file.replace('/src/routes', '').replace('/+page.svelte', '');
	// Drop layout groups: /(marketing)/foo -> /foo
	const clean = path.replace(/\/\([^)]*\)/g, '');
	if (clean === '') return '/';
	// Dynamic routes are expanded from the content arrays instead.
	if (clean.includes('[')) return null;
	return `${clean}/`;
}

export function GET() {
	const staticPaths = Object.keys(pageFiles)
		.map(routePath)
		.filter((p): p is string => p !== null)
		.filter((p) => !EXCLUDE.some((e) => p === `${e}/` || p.startsWith(`${e}/`)));

	// /[slug]/ covers both the articles and the region pages.
	const dynamic = [
		...regions.map((r) => ({ path: `/${r.slug}/`, lastmod: null as string | null })),
		...posts.map((p) => ({ path: `/${p.slug}/`, lastmod: p.date }))
	];

	const entries = [
		...staticPaths.map((p) => ({ path: p, lastmod: null as string | null })),
		...dynamic
	]
		// A dynamic slug that also exists as a real route would otherwise appear twice.
		.filter((e, i, all) => all.findIndex((o) => o.path === e.path) === i)
		.sort(
			(a, b) =>
				Number(PRIORITY[b.path] ?? '0.5') - Number(PRIORITY[a.path] ?? '0.5') ||
				a.path.localeCompare(b.path)
		);

	const body = [
		'<?xml version="1.0" encoding="UTF-8" ?>',
		'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
		...entries.map((e) => url(e.path, e.lastmod)),
		'</urlset>'
	].join('\n');

	return new Response(body, {
		headers: { 'Content-Type': 'application/xml' }
	});
}
