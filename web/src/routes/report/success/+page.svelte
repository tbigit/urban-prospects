<script lang="ts">
	import Button from '$lib/components/ui/button.svelte';
	import { base } from '$app/paths';
</script>

<svelte:head>
	<title>Report ordered | Urban Prospects</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<section class="mx-auto flex min-h-[70vh] max-w-[640px] flex-col justify-center px-5 py-32 text-center">
	<div class="spec text-[var(--accent-teal-text)]">Property Intelligence Report</div>
	<h1 class="mt-3 text-[32px] leading-tight font-semibold tracking-tight text-[var(--fg)] sm:text-[38px]">
		Thanks, your report is on its way.
	</h1>
	<p class="mx-auto mt-5 max-w-md text-[15px] leading-relaxed text-[var(--color-neutral-400)]">
		Stripe has emailed your receipt. The report PDF follows from info@urbanprospects.com.au
		once the planners have run the site.
	</p>
	<div class="mt-8 flex flex-wrap items-center justify-center gap-3">
		<Button href="{base}/pricing/" size="lg" variant="teal">See Platform Pricing</Button>
		<Button href="{base}/" size="lg" variant="outline">Back to Home</Button>
	</div>
</section>
