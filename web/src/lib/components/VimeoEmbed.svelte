<script lang="ts">
	// Click-to-play Vimeo facade: until played, shows the video's poster frame
	// desaturated under a --bg-tinted veil (black-and-white in dark mode, white
	// lighten in light mode) so the block sits inside the theme instead of
	// shouting Vimeo's colour grade. Clicking the play chip swaps in the real
	// iframe with autoplay — nothing from player.vimeo.com loads before that.
	// The poster is a static asset, not fetched from Vimeo's oEmbed API at
	// runtime: this video is privacy-restricted (oEmbed answers without a
	// thumbnail_url, domain_status_code 403), so the frame was grabbed once
	// from the player config and shipped with the site.
	let {
		videoId,
		title,
		label = 'Play video',
		poster = ''
	}: {
		videoId: string;
		title: string;
		label?: string;
		poster?: string;
	} = $props();

	let playing = $state(false);
</script>

<div
	class="relative aspect-video w-full overflow-hidden rounded-2xl border border-[var(--color-line)]"
>
	{#if playing}
		<iframe
			src="https://player.vimeo.com/video/{videoId}?badge=0&autopause=0&player_id=0&app_id=58479&autoplay=1"
			class="absolute inset-0 h-full w-full"
			allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share"
			referrerpolicy="strict-origin-when-cross-origin"
			{title}
		></iframe>
	{:else}
		<button
			type="button"
			aria-label={label}
			onclick={() => (playing = true)}
			class="group absolute inset-0 flex h-full w-full items-center justify-center"
			style="background: linear-gradient(160deg, var(--color-brand-purple-700), var(--color-brand-purple));"
		>
			{#if poster}
				<img
					src={poster}
					alt=""
					aria-hidden="true"
					loading="lazy"
					class="absolute inset-0 h-full w-full object-cover grayscale"
				/>
			{/if}
			<span
				aria-hidden="true"
				class="absolute inset-0 transition-opacity duration-300 group-hover:opacity-80"
				style="background: linear-gradient(180deg, color-mix(in srgb, var(--bg) 72%, transparent), color-mix(in srgb, var(--bg) 55%, transparent) 45%, color-mix(in srgb, var(--bg) 76%, transparent));"
			></span>
			<span
				class="relative grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[var(--color-brand-teal)] text-[#0a0710] transition-transform group-hover:scale-105"
			>
				<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" stroke="none" aria-hidden="true"
					><polygon points="6 3 20 12 6 21 6 3" /></svg
				>
			</span>
		</button>
	{/if}
</div>
