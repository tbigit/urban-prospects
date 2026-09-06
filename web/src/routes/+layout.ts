export const prerender = true;
export const ssr = true;

// The migrated WordPress pages are indexed at "/slug/", with the trailing
// slash. 'always' makes adapter-static emit build/slug/index.html so those
// URLs resolve exactly as they do today — no redirect, no lost link equity —
// and keeps every other route on the same convention.
export const trailingSlash = 'always';
