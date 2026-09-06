// Only same-origin absolute paths are honoured as a post-login destination.
export function safeNext(raw: string | null | undefined, fallback = '/account/'): string {
	if (!raw) return fallback;
	if (!raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\')) return fallback;
	return raw;
}
