import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, type Plugin } from 'vite';
import postcss from 'postcss';

// The property app's legacy stylesheets (src/lib/app/css/*, ex-upapp) are written
// against :root / body / bare element selectors. They are imported from the app
// layout so Vite bundles and hot-reloads them, but Vite-imported CSS stays in the
// document after a client-side navigation (link tags in <svelte:head> used to be
// removed on leaving the route), so /account etc. picked up the app's mono font.
// This plugin rewrites every selector in those files to live under .up-app, the
// app layout's wrapper, so the rules cannot reach the rest of the site.
function scopeAppCss(): Plugin {
	const SCOPE = '.up-app';
	const isTarget = (id: string) => /\/src\/lib\/app\/css\/(?!skin\.css)[^/]+\.css(\?|$)/.test(id);
	const scopeSelector = (sel: string) => {
		const t = sel.trim();
		if (!t || t.includes(SCOPE)) return t;
		if (/^(:root|html|body)$/.test(t)) return SCOPE;
		// :root[data-theme=dark] X / :root:not(...) X -> keep the root qualifier, scope the rest
		const m = t.match(/^(:root|html)([:\[][^\s]*)\s*(.*)$/);
		if (m) return `:root${m[2]} ${SCOPE}${m[3] ? ' ' + m[3] : ''}`;
		return t.replace(/^(:root|html|body)\s+/, SCOPE + ' ').replace(/^(?!\.up-app)/, SCOPE + ' ');
	};
	return {
		name: 'scope-app-css',
		enforce: 'pre',
		transform(code, id) {
			if (!isTarget(id)) return null;
			const root = postcss.parse(code, { from: id });
			root.walkRules((rule) => {
				const parent = rule.parent as postcss.AtRule | undefined;
				if (parent && parent.type === 'atrule' && /keyframes|font-face/i.test(parent.name)) return;
				rule.selectors = rule.selectors.map(scopeSelector);
			});
			return { code: root.toString(), map: null };
		}
	};
}

// PORT is assigned by the Claude Code preview harness (autoPort); defaults keep
// plain `npm run dev` / `npm run preview` on their usual ports.
export default defineConfig({
	plugins: [scopeAppCss(), tailwindcss(), sveltekit()],
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
			// v2 is session-authenticated: go straight to the API host with the cookie kept.
			// Local dev sessions live in the same Postgres the API checks, so they verify.
			'/q/v2': {
				target: 'https://upapi.imtg.com.au',
				changeOrigin: true,
				secure: true,
				rewrite: (path) => path.replace(/^\/q\/v2/, '/v2'),
				configure(proxy) {
					proxy.on('proxyRes', (proxyRes) => { delete proxyRes.headers['set-cookie']; });
				}
			},
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
