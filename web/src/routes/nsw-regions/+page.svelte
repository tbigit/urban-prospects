<script lang="ts">
	// /nsw-regions — the hub. Same URL as the live WordPress page, and each card
	// still points at that region's own existing path.
	import Reveal from '$lib/components/Reveal.svelte';
	import TrialCta from '$lib/components/TrialCta.svelte';
	import { regionCards, regionHub, regions } from '$lib/content';
	import { base } from '$app/paths';

	// The hub's card copy comes from the live page; the blurb under each title
	// is the region page's own meta description, so the two never disagree.
	const bySlug = new Map(regions.map((r) => [`/${r.slug}`, r]));
	const cards = regionCards.map((c) => ({ ...c, entry: bySlug.get(c.href) }));
	const [featured, ...rest] = cards;
</script>

<svelte:head>
	<title>{regionHub.seoTitle} | Urban Prospects</title>
	<meta name="description" content={regionHub.description} />
</svelte:head>

<!-- HEADER -->
<section class="border-b border-[var(--color-line)]">
	<div class="mx-auto max-w-[1400px] px-5 pt-36 pb-14 sm:pt-44 sm:pb-16">
		<Reveal>
			<div class="spec text-[var(--color-neutral-500)]">NSW Regions</div>
			<h1
				class="mt-3 max-w-3xl text-[36px] leading-[1.05] font-semibold tracking-[-0.03em] text-[var(--fg)] sm:text-[52px]"
			>
				Every region of New South Wales, searchable.
			</h1>
			<p class="mt-5 max-w-xl text-[16px] leading-relaxed text-[var(--color-neutral-400)]">
				Development land, residential sites and off-market opportunities across the state. Pick a
				region to see what Urban Prospects covers there.
			</p>
		</Reveal>
	</div>
</section>

<!-- FEATURED: the first region (Sydney) gets the page's one large image. -->
{#if featured}
	<section class="border-b border-[var(--color-line)]">
		<div class="mx-auto max-w-[1400px] px-5 py-14 sm:py-20">
			<Reveal>
				<a
					href="{base}{featured.href}/"
					class="group grid gap-8 lg:grid-cols-12 lg:items-center lg:gap-14"
				>
					<div class="overflow-hidden rounded-2xl lg:col-span-7">
						<img
							src="{base}{featured.image}"
							alt=""
							loading="eager"
							fetchpriority="high"
							decoding="async"
							class="aspect-[16/10] w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
						/>
					</div>
					<div class="lg:col-span-5">
						<h2
							class="text-[28px] leading-[1.12] font-semibold tracking-[-0.025em] text-[var(--fg)] sm:text-[36px]"
						>
							{featured.label}
						</h2>
						{#if featured.entry}
							<p class="mt-5 max-w-[52ch] text-[16px] leading-relaxed text-[var(--color-neutral-400)]">
								{featured.entry.description}
							</p>
						{/if}
						<div
							class="mt-7 inline-flex items-center gap-1.5 text-[14px] font-medium text-[var(--accent-teal-text)]"
						>
							Explore this region
							<svg
								viewBox="0 0 24 24"
								width="14"
								height="14"
								fill="none"
								stroke="currentColor"
								stroke-width="2.5"
								stroke-linecap="round"
								stroke-linejoin="round"
								aria-hidden="true"
								class="transition-transform duration-200 group-hover:translate-x-0.5"
								><path d="M5 12h14M13 6l6 6-6 6" /></svg
							>
						</div>
					</div>
				</a>
			</Reveal>
		</div>
	</section>
{/if}

<!-- THE REST: two-up, no card chrome. -->
<section>
	<div class="mx-auto max-w-[1400px] px-5 py-14 sm:py-20">
		<div class="grid gap-x-8 gap-y-12 sm:grid-cols-2">
			{#each rest as c, i (c.href)}
				<Reveal delay={(i % 2) * 70}>
					<a href="{base}{c.href}/" class="group block">
						<div class="overflow-hidden rounded-xl">
							<img
								src="{base}{c.image}"
								alt=""
								loading="lazy"
								decoding="async"
								class="aspect-[3/2] w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
							/>
						</div>
						<h3
							class="mt-4 text-[20px] leading-[1.25] font-semibold tracking-tight text-[var(--fg)] transition-colors group-hover:text-[var(--accent-teal-text)]"
						>
							{c.label}
						</h3>
						{#if c.entry}
							<p class="mt-2 max-w-[56ch] text-[15px] leading-relaxed text-[var(--color-neutral-400)]">
								{c.entry.description}
							</p>
						{/if}
					</a>
				</Reveal>
			{/each}
		</div>
	</div>
</section>

<TrialCta />
