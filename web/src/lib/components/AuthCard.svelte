<script lang="ts">
	import type { Snippet } from 'svelte';
	let { eyebrow, title, lede = '', children }: { eyebrow: string; title: string; lede?: string; children?: Snippet } = $props();
</script>

<svelte:head>
	<title>{title} — Urban Prospects</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<section class="mx-auto flex min-h-[70vh] w-full max-w-[440px] flex-col justify-center px-5 py-28">
	<div class="spec text-[var(--accent-teal-text)]">{eyebrow}</div>
	<h1 class="mt-3 text-[30px] leading-tight font-semibold tracking-tight text-[var(--fg)]">{title}</h1>
	{#if lede}<p class="mt-3 text-[15px] leading-relaxed text-[var(--color-neutral-400)]">{lede}</p>{/if}
	<div class="glass mt-8 rounded-2xl p-6">
		{@render children?.()}
	</div>
</section>

<style>
	:global(.auth-field) {
		display: block;
		width: 100%;
		height: 2.75rem;
		border-radius: 0.5rem;
		border: 1px solid var(--color-line);
		background: color-mix(in srgb, var(--bg) 60%, transparent);
		color: var(--fg);
		padding: 0 0.85rem;
		font-size: 15px;
	}
	:global(.auth-field:focus) {
		outline: none;
		border-color: var(--color-brand-purple);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-brand-purple) 30%, transparent);
	}
	:global(.auth-label) {
		display: block;
		margin-bottom: 0.4rem;
		font-size: 13px;
		color: var(--color-neutral-300);
	}
	:global(.auth-error) {
		border-radius: 0.5rem;
		border: 1px solid color-mix(in srgb, #e5484d 40%, transparent);
		background: color-mix(in srgb, #e5484d 12%, transparent);
		color: var(--fg);
		padding: 0.6rem 0.85rem;
		font-size: 14px;
	}
	:global(.auth-ok) {
		border-radius: 0.5rem;
		border: 1px solid color-mix(in srgb, var(--color-brand-teal) 40%, transparent);
		background: color-mix(in srgb, var(--color-brand-teal) 12%, transparent);
		color: var(--fg);
		padding: 0.6rem 0.85rem;
		font-size: 14px;
	}
</style>
