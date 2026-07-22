<script lang="ts">
	import Button from './ui/button.svelte';
	import { base } from '$app/paths';

	let {
		eyebrow,
		title,
		body,
		mailSubject
	}: {
		eyebrow: string;
		title: string;
		body: string;
		mailSubject: string;
	} = $props();

	const mailto = $derived(
		`mailto:info@urbanprospects.com.au?subject=${encodeURIComponent(mailSubject)}`
	);
</script>

<svelte:head>
	<title>{title} — Urban Prospects</title>
</svelte:head>

<section class="mx-auto flex min-h-[70vh] max-w-[640px] flex-col justify-center px-5 py-32 text-center">
	<div class="spec text-[var(--accent-teal-text)]">{eyebrow}</div>
	<h1 class="mt-3 text-[32px] leading-tight font-semibold tracking-tight text-[var(--fg)] sm:text-[38px]">
		{title}
	</h1>
	<p class="mx-auto mt-5 max-w-md text-[15px] leading-relaxed text-[var(--color-neutral-400)]">
		{body}
	</p>
	<div class="mt-8 flex flex-wrap items-center justify-center gap-3">
		<Button href={mailto} size="lg">Email Us</Button>
		<Button href={base || '/'} size="lg" variant="outline" class="glass">Back to Home</Button>
	</div>
</section>
