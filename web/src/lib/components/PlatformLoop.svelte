<script lang="ts">
	// A silent, looping screen recording of the app in place of a static map: /platform/ (My Fav
	// -> Castle Hill -> Land Zoning + DA-by-Type layers) and /data-apis/ (My Fav -> an Alexandria
	// lot and its 18 m height control). No chrome, no sound: it reads as a moving illustration,
	// not a film. `base` is a film-ladder directory under /media/ (master.m3u8, mp4/, poster). hls.js drives the ladder
	// where MSE exists, Safari plays the m3u8 natively, and a progressive mp4 covers the rest.
	// The loop pauses off screen and never starts under reduced-motion or Save-Data; the
	// poster (the opening frame) stands in.
	import { onMount } from 'svelte';
	import { saveDataOn } from '$lib/video';

	let {
		class: className = '',
		base = '/media/platform',
		mp4 = 'platform-900.mp4',
		label = 'Walkthrough of the Urban Prospects platform: opening a favourite in Castle Hill and turning on the Land Zoning and Development Applications layers'
	}: { class?: string; base?: string; mp4?: string; label?: string } = $props();
	const HLS_SRC = `${base}/master.m3u8`;
	const MP4_SRC = `${base}/mp4/${mp4}`;
	const POSTER = `${base}/poster-open.jpg`;
	let video = $state<HTMLVideoElement | null>(null);

	onMount(() => {
		if (!video) return;
		const el = video;
		const still = matchMedia('(prefers-reduced-motion: reduce)').matches || saveDataOn();
		if (still) return;

		let hls: any;
		let io: IntersectionObserver | undefined;
		let cancelled = false;
		(async () => {
			const HLS = (await import('hls.js')).default;
			if (cancelled) return;
			if (HLS.isSupported()) {
				hls = new HLS({ capLevelToPlayerSize: true, startLevel: -1, backBufferLength: 10 });
				hls.loadSource(HLS_SRC);
				hls.attachMedia(el);
			} else if (el.canPlayType('application/vnd.apple.mpegurl')) {
				el.src = HLS_SRC;
			} else {
				el.src = MP4_SRC;
			}
			io = new IntersectionObserver(
				([e]) => {
					if (e.isIntersecting) el.play().catch(() => {});
					else el.pause();
				},
				{ threshold: 0.25 }
			);
			io.observe(el);
		})();
		return () => {
			cancelled = true;
			io?.disconnect();
			hls?.destroy();
		};
	});
</script>

<video
	bind:this={video}
	class={className}
	poster={POSTER}
	muted
	loop
	playsinline
	preload="metadata"
	aria-label={label}
></video>
