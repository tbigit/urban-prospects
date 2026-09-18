import type { Handle } from '@sveltejs/kit';
import { loadSession } from '$lib/server/session';
import { startCollector } from '$lib/server/title-orders';

// Title / image search PDFs are collected from Hazlett by an in-process queue
// (lib/server/title-orders.ts). Start it once per server process.
startCollector();

// /app/ renders client-side only (ssr = false), so anything its <svelte:head>
// links is appended after the app has already painted. On a cold cache that
// showed the map, its controls and the icon rail unstyled until Mapbox's CSS
// and the Lucide font arrived. Put those in the server-sent <head> instead so
// they load with the shell, before the first render. The scripts are deferred:
// they still execute in order, ahead of SvelteKit's own (module, so deferred)
// entry script, which is what the app's `mapboxgl` / `turf` globals rely on.
const APP_HEAD = [
	'<link rel="preconnect" href="https://api.mapbox.com" crossorigin />',
	'<link rel="preload" href="/app/css/lucide/lucide.woff2" as="font" type="font/woff2" crossorigin />',
	'<link rel="stylesheet" href="/app/css/lucide/lucide.css" />',
	'<link rel="stylesheet" href="https://api.mapbox.com/mapbox-gl-js/v3.20.0/mapbox-gl.css" />',
	'<link rel="stylesheet" href="https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-draw/v1.5.0/mapbox-gl-draw.css" />',
	'<script defer src="https://api.mapbox.com/mapbox-gl-js/v3.20.0/mapbox-gl.js"></script>',
	'<script defer src="https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-draw/v1.5.0/mapbox-gl-draw.js"></script>',
	'<script defer src="https://unpkg.com/@turf/turf@7.2.0/turf.min.js"></script>',
	'<script defer src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/pdf.min.js"></script>',
	'<script defer src="https://maps.googleapis.com/maps/api/js?key=AIzaSyC5I6s5Rym9KnniWrQX9pOhH6LaCi3sW9Q&libraries=visualization"></script>'
].join('\n\t\t');

// Resolve the session cookie once per request. Prerendered pages never reach
// here at runtime (adapter-node serves them as static files), so this only
// costs a query on the auth routes and /auth/* checks.
export const handle: Handle = async ({ event, resolve }) => {
	event.locals.user = null;
	event.locals.sessionId = null;
	if (event.cookies.get('up_session')) {
		try {
			const s = await loadSession(event.cookies);
			if (s) {
				event.locals.user = s.user;
				event.locals.sessionId = s.sessionId;
			}
		} catch (e) {
			console.error('session lookup failed', e);
		}
	}
	if (event.url.pathname === '/app' || event.url.pathname.startsWith('/app/')) {
		return resolve(event, {
			transformPageChunk: ({ html }) => html.replace('</head>', APP_HEAD + '\n\t</head>')
		});
	}
	return resolve(event);
};
