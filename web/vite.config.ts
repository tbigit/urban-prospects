import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

// PORT is assigned by the Claude Code preview harness (autoPort); defaults keep
// plain `npm run dev` / `npm run preview` on their usual ports.
export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	server: {
		port: Number(process.env.PORT) || 5173,
		// The app calls its Express API at same-origin /q; nginx proxies that in
		// production (deploy/nginx-site.conf). Do the same for `npm run dev`.
		proxy: { '/q': { target: 'https://www.urbanprospects.com.au', changeOrigin: true, secure: true } }
	},
	preview: { port: Number(process.env.PORT) || 4173 }
});
