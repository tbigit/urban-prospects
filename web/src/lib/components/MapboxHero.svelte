<script lang="ts">
	// Full-bleed Mapbox hero, replacing blip's three.js dot-cloud. Centres on
	// Elizabeth Bay House and slowly orbits (bearing spin, no user interaction)
	// at a steady 60fps via a single requestAnimationFrame loop that calls
	// map.jumpTo() once per frame — the same low-level-camera-setter pattern
	// blip's DotCloudZoom uses for its telephoto scroll-zoom, just driving
	// Mapbox's camera instead of a three.js uniform. Scrolling through the
	// hero eases the camera in (zoom + pitch) then fades the whole map out
	// before the content sections below begin, so nothing bleeds through.
	// mapbox-gl JS is imported dynamically inside onMount (its CSS statically,
	// per MarketMap.svelte's convention) so the adapter-static prerender pass
	// never touches it.
	import { onMount } from 'svelte';
	import 'mapbox-gl/dist/mapbox-gl.css';

	// Public token, URL-restricted by design (see upapp's map view).
	const MAPBOX_TOKEN =
		'pk.eyJ1IjoiZGFubnlsIiwiYSI6ImNseGJta3lhMzA3ZHEya3ExY3huOXdvaHUifQ.tWLLIKUxBJ_JBKH5o2XHTQ';

	// Elizabeth Bay House, 7 Onslow Ave, Elizabeth Bay NSW 2011.
	const CENTER: [number, number] = [151.2265, -33.8701];

	let {
		baseZoom = 14.4,
		maxZoom = 16.6,
		basePitch = 56,
		maxPitch = 66,
		spinDegPerSec = 2.6,
		// fraction of a viewport-height of scroll over which the zoom-in completes
		zoomVh = 0.8,
		// fade window as a fraction of the HERO's own height
		fadeStart = 0.35,
		fadeEnd = 0.75
	}: {
		baseZoom?: number;
		maxZoom?: number;
		basePitch?: number;
		maxPitch?: number;
		spinDegPerSec?: number;
		zoomVh?: number;
		fadeStart?: number;
		fadeEnd?: number;
	} = $props();

	let host: HTMLDivElement;
	let mapEl: HTMLDivElement;
	let failed = $state(false);

	onMount(() => {
		let disposed = false;
		let raf = 0;
		let cleanup: (() => void) | undefined;

		const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

		(async () => {
			const mapboxgl = (await import('mapbox-gl')).default;
			if (disposed) return;
			mapboxgl.accessToken = MAPBOX_TOKEN;

			const currentTheme = () =>
				document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
			const styleFor = (t: string) =>
				t === 'light' ? 'mapbox://styles/mapbox/light-v11' : 'mapbox://styles/mapbox/dark-v11';

			let map: any;
			try {
				map = new mapboxgl.Map({
					container: mapEl,
					style: styleFor(currentTheme()),
					center: CENTER,
					zoom: baseZoom,
					pitch: basePitch,
					bearing: 0,
					interactive: false,
					antialias: false,
					attributionControl: false
				});
			} catch {
				failed = true;
				return;
			}
			// Separate try: a compact-attribution-control failure shouldn't strand
			// (and never remove) an otherwise-working map. Deliberately no ongoing
			// `map.on('error', ...)` handler here — Mapbox fires 'error' for plenty
			// of non-fatal issues (a single tile/sprite/glyph fetch failing), and
			// latching `failed` permanently on any of those would swap a working
			// map to the static fallback over a transient blip. `failed` is only
			// ever set from this initial construction try/catch, matching the
			// reference project's MarketMap.svelte.
			try {
				map.addControl(new mapboxgl.AttributionControl({ compact: true }));
			} catch {
				/* non-fatal — the map still works without it */
			}

			// Theme swap: setStyle preserves the camera pose automatically —
			// no sources/layers of our own to re-add, so nothing else to do.
			const mo = new MutationObserver(() => map.setStyle(styleFor(currentTheme())));
			mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

			// --- scroll → zoom/pitch/fade progress, sampled every frame from the
			// hero's own bounding rect (some layouts scroll a container, not
			// window, so a plain 'scroll' listener can't be relied on). ---
			const smooth = (t: number) => t * t * (3 - 2 * t);
			const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
			let zoomP = 0,
				tZoomP = 0;
			let fade = 1;
			const zone = host.parentElement ?? host;
			const readProgress = () => {
				const r = zone.getBoundingClientRect();
				const scrolled = -r.top;
				const p = Math.min(1, Math.max(0, scrolled / Math.max(1, innerHeight * zoomVh)));
				tZoomP = smooth(p);
				const h = Math.max(1, r.height);
				const f = (scrolled / h - fadeStart) / Math.max(0.0001, fadeEnd - fadeStart);
				fade = 1 - smooth(Math.min(1, Math.max(0, f)));
			};

			// Skip the expensive per-frame camera update (and its WebGL render
			// cost) once the hero is fully out of view — a cheap rAF keeps
			// polling so it resumes the instant it's back. (Browsers already
			// throttle rAF itself on a backgrounded tab, so there's no need to
			// duplicate that with a document.hidden check here.)
			let active = true;
			const io = new IntersectionObserver(([e]) => (active = e.isIntersecting), {
				rootMargin: '200px 0px'
			});
			io.observe(zone);

			if (reduced) {
				// No autoplay motion (camera stays put, no spin) — but the fade is a
				// functional requirement, not decorative (it's what keeps the map from
				// bleeding into the sections below), so it still has to track scroll.
				// A plain scroll listener does that without a continuous rAF loop.
				const applyFade = () => {
					readProgress();
					host.style.opacity = String(fade);
					host.style.visibility = fade <= 0.001 ? 'hidden' : 'visible';
				};
				applyFade();
				window.addEventListener('scroll', applyFade, { passive: true });
				cleanup = () => {
					window.removeEventListener('scroll', applyFade);
					io.disconnect();
					mo.disconnect();
					try {
						map.remove();
					} catch {
						/* map may already be in a broken state; nothing more to do */
					}
				};
				return;
			}

			let bearing = 0;
			let last = performance.now();
			const frame = (now?: number) => {
				const t = now ?? performance.now();
				const dt = Math.min(0.05, (t - last) / 1000);
				last = t;

				if (active) {
					readProgress();
					zoomP += (tZoomP - zoomP) * 0.08;
					bearing = (bearing + spinDegPerSec * dt) % 360;
					const zoom = lerp(baseZoom, maxZoom, zoomP);
					const pitch = lerp(basePitch, maxPitch, zoomP);
					map.jumpTo({ center: CENTER, zoom, bearing, pitch });
					host.style.opacity = String(fade);
					host.style.visibility = fade <= 0.001 ? 'hidden' : 'visible';
				}

				raf = requestAnimationFrame(frame);
			};
			frame();

			cleanup = () => {
				cancelAnimationFrame(raf);
				io.disconnect();
				mo.disconnect();
				try {
					map.remove();
				} catch {
					/* map may already be in a broken state; nothing more to do */
				}
			};
		})();

		return () => {
			disposed = true;
			cleanup?.();
		};
	});
</script>

<div bind:this={host} class="maphero pointer-events-none fixed inset-0 -z-10" aria-hidden="true">
	<!-- Mapbox mounts here, not on `host`: it forces position:relative onto
	     whatever element it's given (mapboxgl-map in its own stylesheet),
	     which would stomp our fixed/inset-0 positioning above. -->
	<div bind:this={mapEl} class="h-full w-full"></div>
	{#if failed}
		<div class="maphero-fallback absolute inset-0"></div>
	{/if}
</div>

<style>
	.maphero {
		background: var(--bg);
	}
	:root[data-theme='light'] .maphero {
		background: rgb(114, 100, 133);
	}
	.maphero :global(.mapboxgl-canvas) {
		outline: none;
	}
	/* Mapbox's ToS requires the logo + attribution to stay visible/legible
	   (removing or hiding them needs an Enterprise agreement) — shrunk and
	   dimmed as far as that allows, not hidden. */
	.maphero :global(.mapboxgl-ctrl-attrib) {
		background: transparent;
		opacity: 0.35;
		font-size: 9px;
		transform: scale(0.85);
		transform-origin: bottom right;
	}
	.maphero :global(.mapboxgl-ctrl-logo) {
		opacity: 0.35;
		transform: scale(0.75);
		transform-origin: bottom left;
	}
	.maphero-fallback {
		background: radial-gradient(
			circle at 30% 20%,
			var(--color-brand-purple-600),
			var(--bg) 70%
		);
	}
	/* Soften the map's hard viewport edges into the page background and keep
	   the hero copy legible over busy tiles. */
	.maphero::after {
		content: '';
		position: absolute;
		inset: 0;
		background:
			linear-gradient(105deg, var(--bg) 6%, rgba(0, 0, 0, 0) 52%),
			linear-gradient(to bottom, var(--bg), transparent 22%, transparent 66%, var(--bg)),
			radial-gradient(ellipse at center, transparent 45%, var(--bg) 98%);
	}
	:root[data-theme='light'] .maphero::after {
		background:
			linear-gradient(105deg, var(--bg) 6%, rgba(255, 255, 255, 0) 52%),
			linear-gradient(to bottom, var(--bg), transparent 22%, transparent 66%, var(--bg)),
			radial-gradient(ellipse at center, transparent 45%, var(--bg) 98%);
	}
</style>
