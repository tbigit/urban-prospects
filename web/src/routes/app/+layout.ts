// The property app is a browser-only SPA (mapbox, canvas, window at module
// scope) — no SSR, no prerender. Auth is the site session cookie, enforced in
// +layout.server.ts.
export const prerender = false;
export const ssr = false;
export const csr = true;
