// The product demo film on the homepage, and the one place that knows where its bytes live.
//
// HOSTING: the HLS ladder is built by ~/.claude/skills/film-ladder into web/static/media/demo/
// and is git-ignored (a quarter gigabyte of segments has no place in the repo). It is deployed
// to the webroot on its own by web/deploy/deploy-media.sh, outside the site build.
//
// THE DIRECTORY IS THE VERSION. Segments are served immutable, so a re-cut must go in a new
// directory (demo-v2/) and this constant moves with it; otherwise a visitor holding old segments
// plays a splice of two films.
export const MEDIA_BASE = '/media/demo';

export const HLS_SRC = `${MEDIA_BASE}/master.m3u8`;
export const MP4_1080 = `${MEDIA_BASE}/mp4/demo-1080.mp4`;
export const POSTER = `${MEDIA_BASE}/poster-open.jpg`;

/**
 * Opening bandwidth estimate for the ABR ladder, in bits per second. hls.js otherwise starts
 * from a fixed guess and only learns the real figure after a fragment or two, which is exactly
 * the window a first-time visitor is watching. The Network Information API already knows
 * roughly what the link can do; Safari and Firefox don't expose it and fall through to 5 Mbps,
 * the 1080p rung.
 */
export function openingBandwidthEstimate(): number {
	const c = (navigator as any).connection;
	if (!c) return 5_000_000;
	if (c.saveData) return 800_000;
	const byType: Record<string, number> = { 'slow-2g': 250_000, '2g': 450_000, '3g': 1_600_000 };
	const floor = byType[c.effectiveType as string];
	if (floor) return floor;
	const downlink = typeof c.downlink === 'number' && c.downlink > 0 ? c.downlink : 5;
	return Math.round(downlink * 1_000_000 * 0.7);
}

/** Whether the visitor has asked, at the OS level, not to be sent large downloads. */
export function saveDataOn(): boolean {
	return !!(navigator as any).connection?.saveData;
}
