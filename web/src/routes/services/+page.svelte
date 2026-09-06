<script lang="ts">
	import PageHeader from '$lib/components/PageHeader.svelte';
	import Reveal from '$lib/components/Reveal.svelte';
	import Button from '$lib/components/ui/button.svelte';
	import { whoUses } from '$lib/content/site';
	import { base } from '$app/paths';

	const reportIncludes = [
		'Zoning, permissible uses and Schedule 1 additional uses',
		'Height, FSR and minimum lot size controls',
		'Overlays: flood, bushfire, heritage and environmentally sensitive land',
		'CDC eligibility and Pattern Book suitability',
		'Indicative yield for the development types the zone allows'
	];
	const platformIncludes = [
		'Search every property in NSW with 34+ planning filters',
		'On-market and off-market sites, with a propensity-to-sell model',
		'Automatic yield and residual land value analysis',
		'3D testing with your own models or NSW Pattern Book designs',
		'Title purchase and direct owner contact',
		'Client-ready reports and a tracked pipeline'
	];
</script>

<svelte:head>
	<title>Services | Property Intelligence Reports and platform subscription | Urban Prospects</title>
	<meta
		name="description"
		content="Two ways to get NSW planning intelligence: a one-off Property Intelligence Report for a site you already have in mind, or a platform subscription to find and assess sites at scale."
	/>
	<link rel="canonical" href="https://www.urbanprospects.com.au/services/" />
</svelte:head>

<PageHeader
	eyebrow="Services"
	title="Two ways to get high-grade intelligence."
	lede="A one-off report for a site you already have in mind, or the full platform for finding and assessing sites at scale."
/>

<!-- Two offers, side by side. Cards are justified here: they are the two
     things being compared. -->
<section class="border-b border-[var(--color-line)]">
	<div class="mx-auto max-w-[1400px] px-5 py-14 sm:py-20">
		<div class="grid gap-5 lg:grid-cols-2">
			<Reveal>
				<div class="flex h-full flex-col rounded-2xl border border-[var(--color-line)] bg-[var(--color-subtle)] p-8 sm:p-10">
					<h2 class="text-[24px] leading-tight font-semibold tracking-tight text-[var(--fg)]">
						Property Intelligence Report
					</h2>
					<p class="mt-2 text-[14px] text-[var(--color-neutral-500)]">$250 per site, one-off</p>
					<p class="mt-5 text-[15px] leading-relaxed text-[var(--color-neutral-300)]">
						Already have a site in mind? Get property-specific and planning-specific intelligence
						in one place: a clear, defensible view of a site's potential before you commit.
					</p>
					<ul class="mt-6 space-y-2.5">
						{#each reportIncludes as item (item)}
							<li class="flex items-start gap-3 text-[14.5px] leading-relaxed text-[var(--color-neutral-300)]">
								<span class="mt-[0.55em] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-brand-teal)]"></span>
								{item}
							</li>
						{/each}
					</ul>
					<p class="mt-6 text-[13.5px] font-medium text-[var(--color-neutral-400)]">
						Ideal for real estate agents, home buyers and buyers' agents.
					</p>
					<div class="mt-auto pt-7">
						<Button href="{base}/report/" size="lg">Order a Report</Button>
					</div>
				</div>
			</Reveal>
			<Reveal delay={90}>
				<div
					class="flex h-full flex-col rounded-2xl p-8 text-[#f6f4fa] sm:p-10"
					style="background: linear-gradient(160deg, var(--color-brand-purple), var(--color-brand-purple-700));"
				>
					<h2 class="text-[24px] leading-tight font-semibold tracking-tight">Platform Subscription</h2>
					<p class="mt-2 text-[14px] text-[#f6f4fa]/70">7-day free trial, then monthly</p>
					<p class="mt-5 text-[15px] leading-relaxed text-[#f6f4fa]/85">
						Search for sites, run yield analysis, test Pattern Book designs, calculate residual
						land values, generate reports and manage your pipeline, all in one platform.
					</p>
					<ul class="mt-6 space-y-2.5">
						{#each platformIncludes as item (item)}
							<li class="flex items-start gap-3 text-[14.5px] leading-relaxed text-[#f6f4fa]/85">
								<span class="mt-[0.55em] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-brand-teal)]"></span>
								{item}
							</li>
						{/each}
					</ul>
					<p class="mt-6 text-[13.5px] font-medium text-[#f6f4fa]/70">
						Ideal for developers, buyers' agents, architects and property consultants.
					</p>
					<div class="mt-auto pt-7">
						<Button href="{base}/signup/" variant="teal" size="lg">Start Free Trial</Button>
					</div>
				</div>
			</Reveal>
		</div>
	</div>
</section>

<!-- TEAMS + WHO USES IT -->
<section class="border-b border-[var(--color-line)] bg-[var(--color-subtle)]">
	<div class="mx-auto max-w-[1400px] px-5 py-14 sm:py-20">
		<div class="grid gap-12 lg:grid-cols-2 lg:gap-20">
			<Reveal>
				<h2 class="text-[28px] leading-tight font-semibold tracking-tight text-[var(--fg)]">
					Teams of ten or more
				</h2>
				<p class="mt-4 max-w-[52ch] text-[15px] leading-relaxed text-[var(--color-neutral-400)]">
					Shared pipelines, seat management and onboarding for your whole team. Book a demo and we
					will walk through the platform on the sites you are already looking at.
				</p>
				<Button href="{base}/demo/" size="lg" variant="outline" class="mt-7">Book a Demo</Button>
			</Reveal>
			<Reveal delay={80}>
				<h2 class="text-[28px] leading-tight font-semibold tracking-tight text-[var(--fg)]">
					Who uses Urban Prospects
				</h2>
				<div class="mt-5 flex flex-wrap gap-2.5">
					{#each whoUses as w (w)}
						<span
							class="rounded-full border border-[var(--color-line)] px-4 py-1.5 text-[13.5px] text-[var(--color-neutral-300)]"
							>{w}</span
						>
					{/each}
				</div>
				<p class="mt-6 max-w-[48ch] text-[15px] leading-relaxed text-[var(--color-neutral-400)]">
					Building your own product on NSW planning data? The same datasets are available through
					<a href="{base}/data-apis/" class="text-[var(--fg)] underline underline-offset-4">our Planning Data APIs</a>.
				</p>
			</Reveal>
		</div>
	</div>
</section>

