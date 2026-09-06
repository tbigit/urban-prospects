<script lang="ts">
	// Standard header for the standalone marketing pages (/platform, /services,
	// /data-apis, /about): the same rhythm as the Insights and Regions indexes.
	import Reveal from './Reveal.svelte';
	import type { Snippet } from 'svelte';

	let {
		eyebrow,
		title,
		lede,
		children
	}: { eyebrow: string; title: string; lede: string; children?: Snippet } = $props();
</script>

<section class="border-b border-[var(--color-line)]">
	<div class="mx-auto max-w-[1400px] px-5 pt-36 pb-14 sm:pt-44 sm:pb-16">
		<Reveal>
			<div class="spec text-[var(--color-neutral-500)]">{eyebrow}</div>
			<h1
				class="mt-3 max-w-3xl text-[36px] leading-[1.05] font-semibold tracking-[-0.03em] text-[var(--fg)] sm:text-[52px]"
			>
				{title}
			</h1>
			<p class="mt-5 max-w-xl text-[16px] leading-relaxed text-[var(--color-neutral-400)]">
				{lede}
			</p>
			{#if children}
				<div class="mt-8 flex flex-wrap gap-3">{@render children()}</div>
			{/if}
		</Reveal>
	</div>
</section>
