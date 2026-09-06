import { posts, regions } from '$lib/content';

export const prerender = true;

const SITE = 'https://www.urbanprospects.com.au';

// Trailing slash on every URL, matching how the pages are served (see
// trailingSlash in +layout.ts) — a sitemap entry that redirects is a wasted
// crawl.
const url = (path: string, opts: { lastmod?: string | null; priority: string }) =>
	[
		'\t<url>',
		`\t\t<loc>${SITE}${path}</loc>`,
		opts.lastmod ? `\t\t<lastmod>${opts.lastmod}</lastmod>` : null,
		`\t\t<priority>${opts.priority}</priority>`,
		'\t</url>'
	]
		.filter(Boolean)
		.join('\n');

export function GET() {
	const body = [
		'<?xml version="1.0" encoding="UTF-8" ?>',
		'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
		url('/', { priority: '1.0' }),
		url('/insights/', { priority: '0.9' }),
		url('/nsw-regions/', { priority: '0.8' }),
		...regions.map((r) => url(`/${r.slug}/`, { priority: '0.7' })),
		...posts.map((p) => url(`/${p.slug}/`, { lastmod: p.date, priority: '0.6' })),
		url('/report/', { priority: '0.5' }),
		url('/developers/', { priority: '0.5' }),
		url('/demo/', { priority: '0.4' }),
		url('/signup/', { priority: '0.4' }),
		'</urlset>'
	].join('\n');

	return new Response(body, {
		headers: { 'Content-Type': 'application/xml' }
	});
}
