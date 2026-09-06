import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

// PORT is assigned by the Claude Code preview harness (autoPort); defaults keep
// plain `npm run dev` / `npm run preview` on their usual ports.
export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	server: {
		port: Number(process.env.PORT) || 5173,
		// `npm run build` writes build/ (and .svelte-kit/output) while the dev server
		// runs; without this, every build triggers dozens of full page reloads.
		watch: { ignored: ['**/build/**', '**/.svelte-kit/output/**'] },
		// The app calls its Express API at same-origin /q; nginx proxies that in
		// production (deploy/nginx-site.conf). Do the same for `npm run dev`.
		//
		// The upstream is still WordPress-fronted, so every /q response carries a
		// `set-cookie: PHPSESSID=...`. If the browser stores that for the dev origin it
		// sends it back on every /q call, and PHP's session-file lock then serialises
		// them: one slow query (a region-filtered /q/zone/search can take 15–65s
		// uncached) stalls every other API call from that tab, and the /app/ page sat
		// blank for a minute waiting on /q/fav, /q/usersearch, /q/template. Nothing in
		// the API needs that session, so strip the cookie in both directions.
		proxy: {
			'/q': {
				target: 'https://www.urbanprospects.com.au',
				changeOrigin: true,
				secure: true,
				configure(proxy) {
					proxy.on('proxyReq', (proxyReq) => proxyReq.removeHeader('cookie'));
					proxy.on('proxyRes', (proxyRes) => {
						delete proxyRes.headers['set-cookie'];
					});
				}
			}
		}
	},
	preview: { port: Number(process.env.PORT) || 4173 }
});
