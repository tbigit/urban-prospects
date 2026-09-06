import type { Handle } from '@sveltejs/kit';
import { loadSession } from '$lib/server/session';

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
	return resolve(event);
};
