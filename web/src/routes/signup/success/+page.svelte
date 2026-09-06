<script lang="ts">
	import Button from '$lib/components/ui/button.svelte';
	import { base } from '$app/paths';
</script>

<svelte:head>
	<title>Your trial has started | Urban Prospects</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<section class="mx-auto flex min-h-[70vh] max-w-[640px] flex-col justify-center px-5 py-32 text-center">
	<div class="spec text-[var(--accent-teal-text)]">Platform Subscription</div>
	<h1 class="mt-3 text-[32px] leading-tight font-semibold tracking-tight text-[var(--fg)] sm:text-[38px]">
		Your 7-day trial has started.
	</h1>
	<p class="mx-auto mt-5 max-w-md text-[15px] leading-relaxed text-[var(--color-neutral-400)]">
		Stripe has emailed your receipt. Your account details follow shortly from
		info@urbanprospects.com.au, and you can log in as soon as they arrive.
	</p>
	<div class="mt-8 flex flex-wrap items-center justify-center gap-3">
		<Button href="{base}/login/" size="lg" variant="teal">Log In</Button>
		<Button href="{base}/" size="lg" variant="outline">Back to Home</Button>
	</div>
</section>
