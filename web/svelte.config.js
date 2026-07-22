import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		// static build; every route is prerendered
		adapter: adapter(),
		paths: {
			// Set by the GitHub Pages Actions workflow to '/<repo-name>' since
			// project sites serve from a subpath, not the domain root. Empty
			// (root) for local dev/preview and for any host that serves from
			// root (Vercel/Netlify/Cloudflare Pages/a custom domain).
			base: process.env.BASE_PATH ?? ''
		}
	}
};

export default config;
