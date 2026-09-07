<script lang="ts">
	import PageHeader from '$lib/components/PageHeader.svelte';
	import Reveal from '$lib/components/Reveal.svelte';
	import TrialCta from '$lib/components/TrialCta.svelte';
	import Button from '$lib/components/ui/button.svelte';
	import { advantageStats, capabilities, caseStudies } from '$lib/content/site';
	import PlatformLoop from '$lib/components/PlatformLoop.svelte';
	import { base } from '$app/paths';
</script>

<svelte:head>
	<title>Platform | Search, assess and secure NSW development sites | Urban Prospects</title>
	<meta
		name="description"
		content="Search every property in NSW with 34+ planning filters, run yield and residual land value analysis, test Pattern Book designs in 3D and go straight to the owner."
	/>
	<link rel="canonical" href="https://www.urbanprospects.com.au/platform/" />
</svelte:head>

<PageHeader
	eyebrow="Platform"
	title="One platform, from first search to secured site."
	lede="Find, assess and secure development sites in NSW without piecing together fragmented government data."
>
	<Button href="{base}/signup/" variant="teal" size="lg">Start Free Trial</Button>
	<Button href="{base}/demo/" size="lg" variant="outline">Book a Demo</Button>
</PageHeader>

<!-- The page's one large visual is the platform itself: a silent looping screen
     recording (web/static/media/platform/, built with the film-ladder skill from a
     screenproof take; git-ignored and deployed by deploy/deploy-media.sh platform). -->
<section class="border-b border-[var(--color-line)]">
	<div class="mx-auto max-w-[1400px] px-5 py-14 sm:py-20">
		<Reveal>
			<PlatformLoop class="aspect-[16/10] w-full rounded-2xl bg-[var(--color-subtle)] object-cover" />
			<p class="mt-4 text-[13.5px] text-[var(--color-neutral-500)]">
				A saved site in Castle Hill opened from My Favourites, with the Land Zoning and
				Development Applications by Type layers switched on. Two of 34 planning layers behind
				every search result.
			</p>
		</Reveal>
	</div>
</section>

<!-- CAPABILITIES: two-column rows, no card chrome. -->
<section class="border-b border-[var(--color-line)]">
	<div class="mx-auto max-w-[1400px] px-5 py-14 sm:py-20">
		<Reveal>
			<h2 class="max-w-2xl text-[28px] leading-tight font-semibold tracking-tight text-[var(--fg)]">
				What you can do
			</h2>
		</Reveal>
		<div class="mt-10 grid gap-x-14 gap-y-10 md:grid-cols-2">
			{#each capabilities as c, i (c.t)}
				<Reveal delay={(i % 2) * 60}>
					<div class="flex gap-5">
						<div
							class="grid h-10 w-10 shrink-0 place-items-center rounded-lg"
							style="background: color-mix(in srgb, var(--color-brand-teal) 6%, transparent);"
						>
							<svg
								viewBox="0 0 24 24"
								width="18"
								height="18"
								fill="none"
								stroke="var(--color-brand-purple)"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								aria-hidden="true"
							>
								{@html c.icon}
							</svg>
						</div>
						<div>
							<h3 class="text-[17px] font-semibold text-[var(--fg)]">{c.t}</h3>
							<p class="mt-2 max-w-[48ch] text-[15px] leading-relaxed text-[var(--color-neutral-400)]">
								{c.d}
							</p>
						</div>
					</div>
				</Reveal>
			{/each}
		</div>
	</div>
</section>

<!-- STATS: plain three-up, the number carries the weight. -->
<section class="border-b border-[var(--color-line)] bg-[var(--color-subtle)]">
	<div class="mx-auto max-w-[1400px] px-5 py-14 sm:py-20">
		<Reveal>
			<h2 class="max-w-2xl text-[28px] leading-tight font-semibold tracking-tight text-[var(--fg)]">
				Every advantage, measured.
			</h2>
		</Reveal>
		<div class="mt-10 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
			{#each advantageStats as s, i (s.n)}
				<Reveal delay={i * 50}>
					<div class="border-t border-[var(--color-line)] pt-5">
						<div class="text-[26px] font-semibold tracking-tight text-[var(--accent-teal-text)]">
							{s.n}
						</div>
						<p class="mt-2 text-[14.5px] leading-relaxed text-[var(--color-neutral-400)]">{s.l}</p>
					</div>
				</Reveal>
			{/each}
		</div>
	</div>
</section>

<!-- OUTCOMES: one quote-style row per case, stacked. -->
<section class="border-b border-[var(--color-line)]">
	<div class="mx-auto max-w-[1400px] px-5 py-14 sm:py-20">
		<Reveal>
			<h2 class="max-w-2xl text-[28px] leading-tight font-semibold tracking-tight text-[var(--fg)]">
				Real outcomes, achieved by professionals like you.
			</h2>
		</Reveal>
		<div class="mt-8 divide-y divide-[var(--color-line)] border-t border-[var(--color-line)]">
			{#each caseStudies as c, i (c.name)}
				<Reveal delay={i * 70}>
					<div class="grid gap-4 py-8 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-12">
						<div>
							<div class="text-[15px] font-semibold text-[var(--fg)]">{c.name}</div>
							<div class="text-[13px] text-[var(--color-neutral-500)]">{c.role}</div>
							<div class="mt-3 text-[13px] font-medium text-[var(--accent-teal-text)]">{c.tag}</div>
						</div>
						<div>
							<div class="text-[19px] leading-snug font-semibold text-[var(--fg)]">{c.h}</div>
							<p class="mt-2 max-w-[60ch] text-[15px] leading-relaxed text-[var(--color-neutral-400)]">
								{c.d}
							</p>
						</div>
					</div>
				</Reveal>
			{/each}
		</div>
	</div>
</section>

<TrialCta />
