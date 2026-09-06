<script lang="ts">
	// Article and region page header: one mono meta line, the title, the
	// lede, with the cover photo rendered by the page directly beneath.
	import Reveal from './Reveal.svelte';

	let {
		eyebrow,
		title,
		intro,
		read = 0
	}: {
		eyebrow: string | null;
		title: string;
		intro: string;
		read?: number;
	} = $props();
</script>

<header>
	<div class="mx-auto max-w-[1400px] px-5 pt-36 pb-10 sm:pt-44 sm:pb-12">
		<div class="max-w-[820px]">
			{#if eyebrow || read}
				<Reveal>
					<div
						class="font-mono text-[12px] tracking-[0.06em] text-[var(--color-neutral-500)] uppercase"
					>
						{#if eyebrow}<span class="text-[var(--accent-teal-text)]">{eyebrow}</span>{/if}
						{#if eyebrow && read}<span class="mx-2" aria-hidden="true">·</span>{/if}
						{#if read}{read} min read{/if}
					</div>
				</Reveal>
			{/if}

			<Reveal delay={60}>
				<h1
					class="mt-4 text-[32px] leading-[1.08] font-semibold tracking-[-0.03em] text-[var(--fg)] sm:text-[46px] sm:leading-[1.05]"
				>
					{title}
				</h1>
			</Reveal>

			<Reveal delay={140}>
				<!-- The lede is the article's own opening paragraph, so it arrives as
				     markup (it can carry links and emphasis) rather than plain text. -->
				<div class="lede mt-6 max-w-[62ch] text-[18px] leading-relaxed text-[var(--color-neutral-300)]">
					{@html intro}
				</div>
			</Reveal>
		</div>
	</div>
</header>

<style>
	.lede :global(p) {
		margin: 0;
	}
	.lede :global(p + p) {
		margin-top: 1em;
	}
	.lede :global(a) {
		color: var(--fg);
		text-decoration: underline;
		text-underline-offset: 3px;
	}
</style>
