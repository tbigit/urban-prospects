<script lang="ts">
	// /insights, the article index. The old /blog address 301s here (see
	// src/routes/blog/+page.ts and web/deploy/redirects.conf); every article
	// keeps its own indexed /<slug>/ path.
	import Reveal from '$lib/components/Reveal.svelte';
	import TrialCta from '$lib/components/TrialCta.svelte';
	import { posts } from '$lib/content';
	import { base } from '$app/paths';

	const [featured, ...rest] = posts;

	// The eyebrow ("MAY 2026") is the date the reader sees, so the archive
	// groups by its year rather than the ISO date, which disagrees for a few
	// migrated posts. Newest year first, order within a year preserved.
	const yearOf = (p: (typeof posts)[number]) =>
		p.eyebrow?.split(' ').at(-1) ?? p.date?.slice(0, 4) ?? '';
	const monthOf = (p: (typeof posts)[number]) => p.eyebrow?.split(' ')[0] ?? '';

	const years = [...new Set(rest.map(yearOf))].map((year) => ({
		year,
		items: rest.filter((p) => yearOf(p) === year)
	}));
</script>

<svelte:head>
	<title>Insights | NSW planning and development analysis | Urban Prospects</title>
	<meta
		name="description"
		content="Analysis of NSW planning reform, zoning, feasibility and site selection from the team that builds Urban Prospects. Written by planners, for developers."
	/>
	<link rel="canonical" href="https://www.urbanprospects.com.au/insights/" />
</svelte:head>

<!-- HEADER -->
<section class="border-b border-[var(--color-line)]">
	<div class="mx-auto max-w-[1400px] px-5 pt-36 pb-14 sm:pt-44 sm:pb-16">
		<Reveal>
			<div class="spec text-[var(--color-neutral-500)]">Insights</div>
			<h1
				class="mt-3 max-w-3xl text-[36px] leading-[1.05] font-semibold tracking-[-0.03em] text-[var(--fg)] sm:text-[52px]"
			>
				Planning intelligence, written down.
			</h1>
			<p class="mt-5 max-w-xl text-[16px] leading-relaxed text-[var(--color-neutral-400)]">
				NSW planning reform, zoning, feasibility and site selection, from the people who interpret
				the planning system for a living.
			</p>
		</Reveal>
	</div>
</section>

<!-- FEATURED: the newest article gets the page's one large image. -->
<section class="border-b border-[var(--color-line)]">
	<div class="mx-auto max-w-[1400px] px-5 py-14 sm:py-20">
		<Reveal>
			<a
				href="{base}/{featured.slug}/"
				class="group grid gap-8 lg:grid-cols-12 lg:items-center lg:gap-14"
			>
				<div class="overflow-hidden rounded-2xl lg:col-span-7">
					<img
						src="{base}{featured.hero}"
						alt=""
						loading="eager"
						fetchpriority="high"
						decoding="async"
						class="aspect-[16/10] w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
					/>
				</div>

				<div class="lg:col-span-5">
					<div class="font-mono text-[12px] tracking-[0.06em] text-[var(--color-neutral-500)] uppercase">
						<span class="text-[var(--accent-teal-text)]">Latest</span>
						<span class="mx-2" aria-hidden="true">·</span>
						{featured.eyebrow}
					</div>
					<h2
						class="mt-4 text-[28px] leading-[1.12] font-semibold tracking-[-0.025em] text-[var(--fg)] sm:text-[36px]"
					>
						{featured.title}
					</h2>
					<p class="mt-5 max-w-[52ch] text-[16px] leading-relaxed text-[var(--color-neutral-400)]">
						{featured.description}
					</p>
					<div
						class="mt-7 inline-flex items-center gap-1.5 text-[14px] font-medium text-[var(--accent-teal-text)]"
					>
						Read the article
						<span class="text-[var(--color-neutral-500)]">({featured.read} min)</span>
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

<!-- ARCHIVE: grouped by year, no card chrome. The year sits in its own left
     column so the eye can scan down the page by date. -->
<section>
	<div class="mx-auto max-w-[1400px] px-5 py-6 sm:py-10">
		{#each years as { year, items } (year)}
			<div
				class="grid gap-6 border-b border-[var(--color-line)] py-12 last:border-b-0 sm:py-16 lg:grid-cols-[140px_minmax(0,1fr)] lg:gap-10"
			>
				<Reveal>
					<div class="lg:sticky lg:top-28">
						<div class="text-[28px] leading-none font-semibold tracking-tight text-[var(--fg)] tabular-nums">
							{year}
						</div>
						<div class="mt-2 text-[13px] text-[var(--color-neutral-500)]">
							{items.length}
							{items.length === 1 ? 'article' : 'articles'}
						</div>
					</div>
				</Reveal>

				<div class="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
					{#each items as p, i (p.slug)}
						<Reveal delay={(i % 3) * 70}>
							<a href="{base}/{p.slug}/" class="group block">
								<div class="overflow-hidden rounded-xl">
									<img
										src="{base}{p.hero}"
										alt=""
										loading="lazy"
										decoding="async"
										class="aspect-[3/2] w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
									/>
								</div>
								<div
									class="mt-4 font-mono text-[11.5px] tracking-[0.06em] text-[var(--color-neutral-500)] uppercase"
								>
									{monthOf(p)}
									<span class="mx-1.5" aria-hidden="true">·</span>
									{p.read} min read
								</div>
								<h3
									class="mt-2 text-[17px] leading-[1.3] font-semibold tracking-tight text-[var(--fg)] transition-colors group-hover:text-[var(--accent-teal-text)]"
								>
									{p.title}
								</h3>
							</a>
						</Reveal>
					{/each}
				</div>
			</div>
		{/each}
	</div>
</section>

<TrialCta />
