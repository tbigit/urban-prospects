<script lang="ts">
	import PageHeader from '$lib/components/PageHeader.svelte';
	import Reveal from '$lib/components/Reveal.svelte';
	import TrialCta from '$lib/components/TrialCta.svelte';
	import Button from '$lib/components/ui/button.svelte';
	import PlatformLoop from '$lib/components/PlatformLoop.svelte';
	import { apiChecklist } from '$lib/content/site';
	import { base } from '$app/paths';

	const datasets = [
		{
			h: 'Planning controls',
			items: ['Land zoning and permissible uses', 'Height, FSR and minimum lot size', 'Schedule 1 additional uses', 'Land reservation and acquisition']
		},
		{
			h: 'Constraints and hazards',
			items: ['Flood planning and bushfire prone land', 'Heritage items and conservation areas', 'Environmentally sensitive land', 'Acid sulfate soils and landslide risk']
		},
		{
			h: 'Pathways and signals',
			items: ['CDC eligibility per lot', 'Pattern Book suitability', 'Zoning history', 'Walkability and propensity to sell']
		}
	];
	const audiences = ['Proptech companies', 'Data brokers', 'Researchers', 'Developers with bespoke platforms'];
</script>

<svelte:head>
	<title>Planning Data APIs | NSW planning data for your own products | Urban Prospects</title>
	<meta
		name="description"
		content="Weekly-updated NSW planning data through an API: zoning, permissible uses, overlays, CDC and Pattern Book eligibility, and unique signals like zoning history and propensity to sell."
	/>
	<link rel="canonical" href="https://www.urbanprospects.com.au/data-apis/" />
</svelte:head>

<PageHeader
	eyebrow="Planning Data APIs"
	title="Put high-grade NSW data inside your own products."
	lede="Weekly-updated planning data for every property in NSW, delivered through an API and ready to integrate into your own systems."
>
	<Button href="{base}/developers/" size="lg">Talk to Us About Access</Button>
</PageHeader>

<!-- WHAT YOU GET: image left, checklist right. -->
<section class="border-b border-[var(--color-line)]">
	<div class="mx-auto max-w-[1400px] px-5 py-14 sm:py-20">
		<div class="grid gap-10 lg:grid-cols-12 lg:items-center lg:gap-14">
			<Reveal class="lg:col-span-7">
				<!-- The same data seen through the app: a silent looping screen recording (web/static/media/
				     data-apis/, film-ladder from a screenproof take; git-ignored, deployed by
				     deploy/deploy-media.sh data-apis). -->
				<PlatformLoop
					class="aspect-[16/10] w-full rounded-2xl bg-[var(--color-subtle)] object-cover"
					base="/media/data-apis"
					mp4="data-apis-900.mp4"
					label="Walkthrough of the Urban Prospects platform: opening a favourite in Alexandria and reading its 18 metre height of building control"
				/>
				<p class="mt-4 text-[13.5px] text-[var(--color-neutral-500)]">
					A saved site in Alexandria opened from My Favourites: frontage, depth, permissible height,
					FSR, lot size and zoning, read off the same weekly-refreshed dataset the API serves per lot.
				</p>
			</Reveal>
			<Reveal delay={80} class="lg:col-span-5">
				<h2 class="text-[28px] leading-tight font-semibold tracking-tight text-[var(--fg)]">
					Built by planners, checked every week
				</h2>
				<ul class="mt-6 space-y-4">
					{#each apiChecklist as item (item)}
						<li class="flex items-start gap-3">
							<span
								class="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full"
								style="background: var(--color-brand-teal);"
							>
								<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#0a0710" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 13l4 4L19 7" /></svg>
							</span>
							<span class="text-[15px] leading-relaxed text-[var(--color-neutral-300)]">{item}</span>
						</li>
					{/each}
				</ul>
			</Reveal>
		</div>
	</div>
</section>

<!-- DATASETS: three grouped columns. -->
<section class="border-b border-[var(--color-line)] bg-[var(--color-subtle)]">
	<div class="mx-auto max-w-[1400px] px-5 py-14 sm:py-20">
		<Reveal>
			<h2 class="max-w-2xl text-[28px] leading-tight font-semibold tracking-tight text-[var(--fg)]">
				What is in the data
			</h2>
		</Reveal>
		<div class="mt-10 grid gap-10 md:grid-cols-3">
			{#each datasets as d, i (d.h)}
				<Reveal delay={i * 60}>
					<div class="border-t border-[var(--color-line)] pt-5">
						<h3 class="text-[17px] font-semibold text-[var(--fg)]">{d.h}</h3>
						<ul class="mt-4 space-y-2">
							{#each d.items as it (it)}
								<li class="text-[14.5px] leading-relaxed text-[var(--color-neutral-400)]">{it}</li>
							{/each}
						</ul>
					</div>
				</Reveal>
			{/each}
		</div>
	</div>
</section>

<!-- WHO IT IS FOR + ACCESS -->
<section class="border-b border-[var(--color-line)]">
	<div class="mx-auto max-w-[1400px] px-5 py-14 sm:py-20">
		<div class="grid gap-12 lg:grid-cols-2 lg:gap-20">
			<Reveal>
				<h2 class="text-[28px] leading-tight font-semibold tracking-tight text-[var(--fg)]">
					Built for
				</h2>
				<div class="mt-5 flex flex-wrap gap-2.5">
					{#each audiences as a (a)}
						<span class="rounded-full border border-[var(--color-line)] px-4 py-1.5 text-[13.5px] text-[var(--color-neutral-300)]">{a}</span>
					{/each}
				</div>
			</Reveal>
			<Reveal delay={80}>
				<h2 class="text-[28px] leading-tight font-semibold tracking-tight text-[var(--fg)]">
					Getting access
				</h2>
				<p class="mt-4 max-w-[52ch] text-[15px] leading-relaxed text-[var(--color-neutral-400)]">
					API access is arranged per integration. Tell us which datasets and coverage you need
					and we will come back with documentation, pricing and a sandbox key.
				</p>
				<Button href="{base}/developers/" size="lg" variant="outline" class="mt-7">Talk to Us About Access</Button>
			</Reveal>
		</div>
	</div>
</section>

<TrialCta />
