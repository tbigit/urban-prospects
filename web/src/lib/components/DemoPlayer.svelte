<script lang="ts">
	// The product demo on the homepage. A port of address-agent's FilmPlayer (xyref.com/video):
	// vidstack ELEMENTS with a bar composed from the primitives, hls.js for the ladder, and a
	// skin in this site's tokens rather than vidstack's dark default. Two behaviours differ
	// from xyref by request:
	//   - it AUTOPLAYS, muted, in a LOOP, from frame 0, as soon as it is on screen and buffered;
	//   - pressing play restarts it with sound (still looping).
	// Off screen the loop pauses, so the homepage is not decoding 4K into the void.
	import { onMount } from 'svelte';
	import 'vidstack/player/styles/base.css';
	import { HLS_SRC, MP4_1080, POSTER, openingBandwidthEstimate, saveDataOn } from '$lib/video';

	let stage = $state<HTMLDivElement | null>(null);
	let player = $state<any>(null);

	// `started` is the visitor's commitment (sound on). Until then any playback is the muted loop.
	let started = $state(false);
	let looping = $state(false);
	let paused = $state(true);
	let buffering = $state(false);
	let canPlay = $state(false);
	let onScreen = $state(false);
	let canAirPlay = $state(false);

	let qualities = $state<any[]>([]);
	let autoQuality = $state(true);
	let currentHeight = $state(0);
	let menuOpen = $state(false);

	// Bar visibility: shown while paused or before commit, otherwise hidden after 3s idle.
	let barVisible = $state(true);
	let idleTimer: ReturnType<typeof setTimeout> | undefined;
	function wakeBar() {
		barVisible = true;
		clearTimeout(idleTimer);
		if (started && !paused) idleTimer = setTimeout(() => (barVisible = false), 3000);
	}
	$effect(() => {
		if (!started || paused) {
			clearTimeout(idleTimer);
			barVisible = true;
		} else wakeBar();
	});

	function qualityLabel(q: { height: number }): string {
		if (q.height >= 2160) return '4K';
		if (q.height >= 1440) return '1440p';
		if (q.height >= 1080) return '1080p';
		return `${q.height}p`;
	}
	const qualityButtonLabel = $derived(
		qualities.length === 0
			? 'Quality'
			: autoQuality
				? currentHeight
					? `Auto ${qualityLabel({ height: currentHeight })}`
					: 'Auto'
				: qualityLabel({ height: currentHeight })
	);

	const loopAllowed = () =>
		!matchMedia('(prefers-reduced-motion: reduce)').matches && !saveDataOn();

	onMount(() => {
		let unsubscribe: (() => void) | undefined;
		let cancelled = false;
		const io = new IntersectionObserver(([e]) => (onScreen = e.isIntersecting), { threshold: 0.35 });
		if (stage) io.observe(stage);

		(async () => {
			await import('vidstack/player');
			await import('vidstack/player/ui');
			const HLS = (await import('hls.js')).default;
			if (cancelled || !player) return;

			const canHlsJs = HLS.isSupported();
			const nativeHls =
				!canHlsJs &&
				document.createElement('video').canPlayType('application/vnd.apple.mpegurl') !== '';
			player.src =
				canHlsJs || nativeHls
					? [
							{ src: HLS_SRC, type: 'application/vnd.apple.mpegurl' },
							{ src: MP4_1080, type: 'video/mp4' }
						]
					: [{ src: MP4_1080, type: 'video/mp4' }];

			let configured = false;
			player.addEventListener('provider-change', (event: any) => {
				const provider = event.detail;
				if (provider?.type !== 'hls' || configured) return;
				configured = true;
				provider.library = HLS;
				provider.config = {
					maxBufferLength: 40,
					maxMaxBufferLength: 90,
					maxBufferSize: 60 * 1000 * 1000,
					backBufferLength: 30,
					abrEwmaDefaultEstimate: openingBandwidthEstimate(),
					startLevel: -1,
					capLevelToPlayerSize: true
				};
			});

			unsubscribe = player.subscribe((state: any) => {
				paused = state.paused;
				buffering = state.waiting || (!state.canPlay && !state.paused);
				canPlay = state.canPlay;
				canAirPlay = state.canAirPlay;
				autoQuality = state.autoQuality;
				currentHeight = state.quality?.height ?? 0;
				qualities = [...(state.qualities ?? [])].sort((a, b) => b.height - a.height);
			});

			// vidstack honours `loop` itself; this is the guard for the providers that
			// surface `ended` anyway (native HLS on Safari does), so the loop never stalls
			// on the last frame.
			player.addEventListener('ended', () => {
				player.currentTime = 0;
				player.play().catch(() => {});
			});

			player.startLoading();
			player.startLoadingPoster();
		})();

		return () => {
			cancelled = true;
			io.disconnect();
			clearTimeout(idleTimer);
			unsubscribe?.();
		};
	});

	// The muted loop: runs while the player is on screen and the visitor has not committed.
	$effect(() => {
		if (!player || !canPlay || started) return;
		if (onScreen && loopAllowed()) {
			if (!looping) {
				looping = true;
				player.muted = true;
				player.play().catch(() => (looping = false));
			}
		} else if (looping) {
			looping = false;
			player.pause();
		}
	});

	function commit() {
		started = true;
		looping = false;
		player.muted = false;
		player.currentTime = 0;
		player.play();
	}
	function togglePlay() {
		if (!started) return commit();
		if (player.paused) player.play();
		else player.pause();
	}
	function pickAuto() {
		player?.qualities?.autoSelect();
		menuOpen = false;
	}
	function pick(q: any) {
		q.selected = true;
		menuOpen = false;
	}
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && menuOpen && (menuOpen = false)} />

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div bind:this={stage} class="stage" onpointermove={wakeBar}>
	<media-player
		bind:this={player}
		class="player"
		poster={POSTER}
		load="custom"
		poster-load="eager"
		preload="auto"
		view-type="video"
		playsinline
		muted
		loop
		storage="up-demo"
		title="Urban Prospects product demo"
	>
		<media-provider>
			<media-poster class="poster" class:on={!started && !looping} src={POSTER} alt=""></media-poster>
		</media-provider>

		<button
			class="hit"
			onclick={togglePlay}
			aria-label={started ? (paused ? 'Play' : 'Pause') : 'Play the demo with sound'}
		></button>

		{#if buffering}
			<div class="spinner" aria-hidden="true"><span></span></div>
		{/if}

		<!-- The badge fades rather than unmounts: removing it between mousedown and mouseup
		     lands the click on the layer beneath and pauses the film it just started. -->
		<button
			class="badge"
			class:gone={started}
			disabled={started}
			onclick={commit}
			aria-label="Play product demo video"
		>
			<svg viewBox="0 0 24 24" aria-hidden="true">
				<path d="M8.67 5.6 L18.67 12 L8.67 18.4 Z" fill="currentColor" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" />
			</svg>
		</button>

		<media-controls class="controls" class:show={barVisible}>
			<media-controls-group class="bar">
				<media-time-slider class="scrub">
					<div class="scrub-track">
						<div class="scrub-buffer"></div>
						<div class="scrub-fill"></div>
					</div>
					<div class="scrub-thumb"></div>
					<media-slider-preview class="scrub-preview" no-clamp>
						<media-slider-value></media-slider-value>
					</media-slider-preview>
				</media-time-slider>
				<div class="row">
					<button class="btn" onclick={togglePlay} aria-label={started ? (paused ? 'Play' : 'Pause') : 'Play the demo with sound'}>
						{#if started && !paused}
							<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3.2v14H7zM13.8 5H17v14h-3.2z" /></svg>
						{:else}
							<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.67 5.6 L18.67 12 L8.67 18.4 Z" fill="currentColor" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round" /></svg>
						{/if}
					</button>
					<div class="volume" class:mute-hidden={!started}>
						<media-mute-button class="btn" aria-label="Mute">
							<svg class="i-on" viewBox="0 0 24 24" aria-hidden="true">
								<path d="M4 9.5h3.2L11.5 6v12L7.2 14.5H4z" />
								<path d="M15.2 9.2a4 4 0 0 1 0 5.6M17.8 6.6a7.6 7.6 0 0 1 0 10.8" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
							</svg>
							<svg class="i-off" viewBox="0 0 24 24" aria-hidden="true">
								<path d="M4 9.5h3.2L11.5 6v12L7.2 14.5H4z" />
								<path d="M15.5 9.5l5 5M20.5 9.5l-5 5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
							</svg>
						</media-mute-button>
						<media-volume-slider class="vol">
							<div class="vol-rail">
								<div class="vol-track"><div class="vol-fill"></div></div>
								<div class="vol-thumb"></div>
							</div>
						</media-volume-slider>
					</div>
					<div class="time">
						<media-time type="current"></media-time>
						<span class="sep">/</span>
						<media-time type="duration"></media-time>
					</div>
					<div class="grow"></div>
					{#if qualities.length > 1}
						<div class="menu">
							<button class="btn quality" aria-haspopup="true" aria-expanded={menuOpen} onclick={() => (menuOpen = !menuOpen)}>
								{qualityButtonLabel}
							</button>
							{#if menuOpen}
								<div class="menu-items" role="menu">
									<button role="menuitemradio" aria-checked={autoQuality} class="menu-item" class:on={autoQuality} onclick={pickAuto}>Auto</button>
									{#each qualities as q (q.height)}
										<button role="menuitemradio" aria-checked={!autoQuality && q.height === currentHeight} class="menu-item" class:on={!autoQuality && q.height === currentHeight} onclick={() => pick(q)}>{qualityLabel(q)}</button>
									{/each}
								</div>
							{/if}
						</div>
					{/if}
					{#if canAirPlay}
						<media-airplay-button class="btn" aria-label="AirPlay">
							<svg viewBox="0 0 24 24" aria-hidden="true">
								<path d="M4 17h2.5M17.5 17H20a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
								<path d="M12 13.5l4.5 6h-9z" />
							</svg>
						</media-airplay-button>
					{/if}
					<media-pip-button class="btn" aria-label="Mini player">
						<svg viewBox="0 0 24 24" aria-hidden="true">
							<rect x="3" y="5" width="18" height="14" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.7" />
							<rect x="11.5" y="11" width="8" height="6.2" rx="1" />
						</svg>
					</media-pip-button>
					<media-fullscreen-button class="btn" aria-label="Full screen">
						<svg class="i-on" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4H4v5M15 4h5v5M15 20h5v-5M9 20H4v-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" /></svg>
						<svg class="i-off" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h5V4M20 9h-5V4M20 15h-5v5M4 15h5v5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" /></svg>
					</media-fullscreen-button>
				</div>
			</media-controls-group>
		</media-controls>
	</media-player>
</div>

<style>
	/* Skin in the site's tokens: ink is --fg, the scrim is --bg, so it reads correctly in both
	   themes. The badge is the same teal chip the rest of the site uses for play. */
	.stage {
		width: 100%;
	}
	.player {
		display: block;
		position: relative;
		width: 100%;
		aspect-ratio: 16 / 9;
		overflow: hidden;
		border-radius: 16px;
		border: 1px solid var(--color-line);
		background: var(--color-subtle);
		--media-brand: var(--fg);
		--media-focus-ring: 0 0 0 3px color-mix(in srgb, var(--color-brand-teal) 45%, transparent);
	}
	.player :global([data-media-provider]) {
		height: 100%;
	}
	.player :global(video) {
		width: 100%;
		height: 100%;
		object-fit: cover;
		background: var(--color-subtle);
	}
	.poster {
		position: absolute;
		inset: 0;
		z-index: 1;
		width: 100%;
		height: 100%;
		opacity: 0;
		pointer-events: none;
		transition: opacity 0.2s ease-out;
	}
	.poster.on {
		opacity: 1;
	}
	.player :global(media-poster img) {
		width: 100%;
		height: 100%;
		border: 0;
		object-fit: cover;
	}
	/* Stacking, bottom to top: picture, poster (1), click layer (3), spinner (4), bar (5), badge (6). */
	.hit {
		position: absolute;
		inset: 0;
		z-index: 3;
		cursor: pointer;
		background: transparent;
		border: 0;
	}
	.badge {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		z-index: 6;
		display: grid;
		place-items: center;
		width: 84px;
		height: 84px;
		border: 0;
		border-radius: 9999px;
		cursor: pointer;
		background: var(--color-brand-teal);
		color: #0a0710;
		box-shadow: 0 16px 40px -14px color-mix(in srgb, var(--color-brand-teal) 60%, transparent);
		transition:
			transform 0.25s cubic-bezier(0.19, 1, 0.22, 1),
			opacity 0.25s ease,
			background-color 0.2s ease;
	}
	.badge:hover:not(.gone) {
		background: var(--color-brand-teal-600);
		transform: translate(-50%, -50%) scale(1.06);
	}
	.badge.gone {
		opacity: 0;
		pointer-events: none;
		transform: translate(-50%, -50%) scale(0.86);
	}
	.badge svg {
		width: 52px;
		height: 52px;
		fill: currentColor;
	}
	.spinner {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		z-index: 4;
		pointer-events: none;
	}
	.spinner span {
		display: block;
		width: 42px;
		height: 42px;
		border-radius: 9999px;
		border: 2.5px solid color-mix(in srgb, var(--fg) 18%, transparent);
		border-top-color: var(--fg);
		animation: spin 0.8s linear infinite;
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* ---- the bar ---- */
	.controls {
		position: absolute;
		inset: auto 0 0 0;
		z-index: 5;
		opacity: 0;
		transition: opacity 0.24s ease;
		pointer-events: none;
	}
	.controls.show {
		opacity: 1;
		pointer-events: auto;
	}
	.bar {
		display: block;
		padding: 34px 18px 14px;
		background: linear-gradient(to top, color-mix(in srgb, var(--bg) 96%, transparent), transparent);
		color: var(--fg);
	}
	.scrub {
		position: relative;
		display: block;
		width: 100%;
		height: 20px;
		cursor: pointer;
		touch-action: none;
		user-select: none;
	}
	.scrub-track {
		position: absolute;
		top: 50%;
		left: 0;
		width: 100%;
		height: 3px;
		transform: translateY(-50%);
		border-radius: 999px;
		background: color-mix(in srgb, var(--fg) 18%, transparent);
		overflow: hidden;
		transition: height 0.15s ease;
	}
	.scrub:global([data-active]) .scrub-track {
		height: 5px;
	}
	.scrub-buffer {
		position: absolute;
		inset: 0 auto 0 0;
		width: var(--slider-progress, 0%);
		background: color-mix(in srgb, var(--fg) 30%, transparent);
	}
	.scrub-fill {
		position: absolute;
		inset: 0 auto 0 0;
		width: var(--slider-fill, 0%);
		background: var(--color-brand-teal);
	}
	.scrub-thumb {
		position: absolute;
		top: 50%;
		left: var(--slider-fill, 0%);
		width: 13px;
		height: 13px;
		border-radius: 999px;
		background: var(--color-brand-teal);
		transform: translate(-50%, -50%) scale(0);
		transition: transform 0.15s ease;
	}
	.scrub:global([data-active]) .scrub-thumb {
		transform: translate(-50%, -50%) scale(1);
	}
	.scrub-preview {
		opacity: 0;
		transition: opacity 0.15s ease;
		pointer-events: none;
		font-family: var(--font-mono);
		font-size: 11px;
		font-variant-numeric: tabular-nums;
		background: var(--fg);
		color: var(--bg);
		padding: 3px 7px;
		border-radius: 6px;
	}
	.scrub-preview:global([data-visible]) {
		opacity: 1;
	}
	.row {
		display: flex;
		align-items: center;
		gap: 4px;
		margin-top: 2px;
	}
	.grow {
		flex: 1;
	}
	.btn {
		display: inline-grid;
		place-items: center;
		width: 38px;
		height: 38px;
		flex: 0 0 auto;
		border: 0;
		border-radius: 9999px;
		background: transparent;
		color: var(--fg);
		cursor: pointer;
		opacity: 0.72;
		transition:
			opacity 0.16s ease,
			background-color 0.16s ease;
	}
	.btn:hover,
	.btn:focus-visible {
		opacity: 1;
		background: color-mix(in srgb, var(--fg) 8%, transparent);
	}
	.btn :global(svg) {
		width: 21px;
		height: 21px;
		fill: currentColor;
	}
	.player :global(media-mute-button[data-muted] .i-on),
	.player :global(media-mute-button:not([data-muted]) .i-off),
	.player :global(media-fullscreen-button[data-active] .i-on),
	.player :global(media-fullscreen-button:not([data-active]) .i-off) {
		display: none;
	}
	.volume {
		display: flex;
		align-items: center;
	}
	.volume.mute-hidden {
		display: none;
	}
	.vol {
		position: relative;
		display: block;
		width: 0;
		height: 30px;
		cursor: pointer;
		touch-action: none;
		opacity: 0;
		overflow: hidden;
		transition:
			width 0.22s cubic-bezier(0.19, 1, 0.22, 1),
			opacity 0.22s ease;
	}
	.volume:hover .vol,
	.volume:focus-within .vol {
		width: 74px;
		opacity: 1;
	}
	.vol-rail {
		position: absolute;
		top: 50%;
		left: 6px;
		right: 6px;
		transform: translateY(-50%);
	}
	.vol-track {
		position: relative;
		height: 3px;
		border-radius: 999px;
		background: color-mix(in srgb, var(--fg) 20%, transparent);
		overflow: hidden;
	}
	.vol-fill {
		position: absolute;
		inset: 0 auto 0 0;
		width: var(--slider-fill, 0%);
		background: var(--fg);
	}
	.vol-thumb {
		position: absolute;
		top: 50%;
		left: var(--slider-fill, 0%);
		width: 11px;
		height: 11px;
		border-radius: 999px;
		background: var(--fg);
		transform: translate(-50%, -50%);
	}
	.time {
		display: flex;
		align-items: center;
		gap: 5px;
		margin-left: 8px;
		font-family: var(--font-mono);
		font-size: 12px;
		font-variant-numeric: tabular-nums;
		color: var(--fg);
		opacity: 0.75;
		white-space: nowrap;
	}
	.time .sep {
		opacity: 0.45;
	}
	.menu {
		position: relative;
	}
	.quality {
		width: auto;
		padding: 0 12px;
		font-family: var(--font-mono);
		font-size: 11px;
		font-weight: 500;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		white-space: nowrap;
	}
	.menu-items {
		position: absolute;
		right: 0;
		bottom: calc(100% + 8px);
		min-width: 132px;
		padding: 5px;
		border-radius: 12px;
		background: var(--fg);
		box-shadow: 0 18px 40px -16px rgba(0, 0, 0, 0.5);
		display: flex;
		flex-direction: column;
	}
	.menu-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		padding: 7px 10px;
		border: 0;
		border-radius: 8px;
		background: transparent;
		color: color-mix(in srgb, var(--bg) 72%, transparent);
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		text-align: left;
		cursor: pointer;
	}
	.menu-item:hover,
	.menu-item:focus-visible {
		background: color-mix(in srgb, var(--bg) 12%, transparent);
		color: var(--bg);
	}
	.menu-item.on {
		color: var(--bg);
	}
	.menu-item.on::after {
		content: '';
		width: 5px;
		height: 5px;
		border-radius: 999px;
		background: currentColor;
	}
	@media (max-width: 640px) {
		.volume {
			display: none;
		}
		.bar {
			padding: 30px 10px 10px;
		}
		.badge {
			width: 64px;
			height: 64px;
		}
		.badge svg {
			width: 40px;
			height: 40px;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.badge,
		.scrub-track,
		.scrub-thumb,
		.vol {
			transition: none;
		}
	}
</style>
