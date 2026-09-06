import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		// adapter-node: the marketing pages stay prerendered (src/routes/+layout.ts),
		// the auth routes (/login, /logout, /forgot-password, /reset-password,
		// /account, /auth/*) opt out and run on the Node server so a session
		// cookie can be set and checked. See deploy/README-auth.md.
		adapter: adapter({ out: 'build' }),
		paths: {
			// Set by the GitHub Pages Actions workflow to '/<repo-name>' since
			// project sites serve from a subpath, not the domain root. Empty
			// (root) for local dev/preview and for any host that serves from
			// root (Vercel/Netlify/Cloudflare Pages/a custom domain).
			base: process.env.BASE_PATH ?? '',
			// Absolute asset/base URLs, not SvelteKit's default relative ones.
			// The migrated WordPress URLs are served WITH a trailing slash (see
			// trailingSlash below), and under "/some-article/" a relative
			// "./media/x.jpg" resolves to "/some-article/media/x.jpg" — every
			// image on every article 404s. `base` is set explicitly above, so
			// nothing here depends on relative paths to find the site root.
			relative: false
		},
		// WordPress serves these pages at "/slug/", and that trailing-slash form
		// is what is indexed and linked. Emitting build/slug/index.html means the
		// existing URLs resolve byte-identically, with no redirect hop.
		prerender: {
			origin: 'https://www.urbanprospects.com.au'
		}
	}
};

export default config;
