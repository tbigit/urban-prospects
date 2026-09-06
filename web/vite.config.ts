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
		proxy: {
			'/q': {
				target: 'https://www.urbanprospects.com.au',
				changeOrigin: true,
				secure: true,
				configure(proxy) {
					const t = () => new Date().toISOString().slice(11, 23);
					proxy.on('proxyReq', (proxyReq, req) => {
						console.log(`[qproxy ${t()}] -> ${req.url} ua=${(req.headers['user-agent'] || '').slice(0, 20)} ae=${req.headers['accept-encoding']} conn=${req.headers.connection} out-conn=${proxyReq.getHeader('connection')}`);
						proxyReq.on('socket', (s) => console.log(`[qproxy ${t()}] socket ${req.url} reused=${!s.connecting}`));
					});
					proxy.on('proxyRes', (proxyRes, req, res) => {
						console.log(`[qproxy ${t()}] <- ${req.url} ${proxyRes.statusCode} te=${proxyRes.headers['transfer-encoding']} ce=${proxyRes.headers['content-encoding']} conn=${proxyRes.headers.connection}`);
						proxyRes.on('end', () => console.log(`[qproxy ${t()}] upstream end ${req.url}`));
						res.on('finish', () => console.log(`[qproxy ${t()}] res finish ${req.url}`));
					});
					proxy.on('error', (e, req) => console.log(`[qproxy ${t()}] error ${req?.url} ${e.message}`));
				}
			}
		}
	},
	preview: { port: Number(process.env.PORT) || 4173 }
});
