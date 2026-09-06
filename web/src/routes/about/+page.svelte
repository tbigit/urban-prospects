<script lang="ts">
	import PageHeader from '$lib/components/PageHeader.svelte';
	import Reveal from '$lib/components/Reveal.svelte';
	import TrialCta from '$lib/components/TrialCta.svelte';
	import VimeoEmbed from '$lib/components/VimeoEmbed.svelte';
	import Button from '$lib/components/ui/button.svelte';
	import { posts } from '$lib/content';
	import { base } from '$app/paths';

	const latest = posts.slice(0, 3);
</script>

<svelte:head>
	<title>About | Built by planners, not just data people | Urban Prospects</title>
	<meta
		name="description"
		content="Urban Prospects was built by Stuart Wilmot and the Urban Perspectives team, planners who interpret the NSW planning system for a living, to give the industry a faster and more accurate way to find development sites."
	/>
	<link rel="canonical" href="https://www.urbanprospects.com.au/about/" />
</svelte:head>

<PageHeader
	eyebrow="About"
	title="Built by planners, not just data people."
	lede="High-grade planning judgement, built into every search result."
/>

<!-- FOUNDER: video left, story right. -->
<section class="border-b border-[var(--color-line)]">
	<div class="mx-auto max-w-[1400px] px-5 py-14 sm:py-20">
		<div class="grid items-start gap-12 lg:grid-cols-12 lg:gap-16">
			<Reveal class="lg:col-span-7">
				<VimeoEmbed
					videoId="1022699488"
					title="Stuart Wilmot, Urban Prospects founder story"
					label="Play: Stuart tells the story behind Urban Prospects"
					poster="{base}/founder-story-poster.jpg"
				/>
				<div class="mt-5 flex items-center gap-3">
					<span
						class="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--color-brand-purple)] text-[14px] font-semibold text-[var(--color-brand-teal)]"
						>S</span
					>
					<div>
						<div class="text-[14px] font-semibold text-[var(--fg)]">Stuart Wilmot</div>
						<div class="text-[12.5px] text-[var(--color-neutral-500)]">Founder, Urban Prospects</div>
					</div>
				</div>
			</Reveal>
			<Reveal delay={100} class="lg:col-span-5">
				<h2 class="text-[28px] leading-tight font-semibold tracking-tight text-[var(--fg)]">
					The founder's story
				</h2>
				<p class="mt-5 text-[16px] leading-relaxed text-[var(--color-neutral-300)]">
					Urban Prospects was created by Stuart Wilmot, a planning and development specialist with
					deep experience in NSW planning systems, development approvals and data-driven site
					identification. Supported by the Urban Perspectives team, Stuart built Urban Prospects to
					give the industry a faster, smarter and more accurate way to find development
					opportunities.
				</p>
				<p class="mt-5 text-[16px] leading-relaxed text-[var(--color-neutral-300)]">
					That judgement is built into every search result. The platform captures the nuances
					generic property tools miss, from Schedule 1 additional uses to environmentally
					sensitive area exclusions, because it was designed by people who interpret the NSW
					planning system for a living.
				</p>
			</Reveal>
		</div>
	</div>
</section>

<!-- LATEST WRITING: three-up, no cards. -->
<section class="border-b border-[var(--color-line)] bg-[var(--color-subtle)]">
	<div class="mx-auto max-w-[1400px] px-5 py-14 sm:py-20">
		<Reveal>
			<div class="flex flex-wrap items-end justify-between gap-4">
				<h2 class="text-[28px] leading-tight font-semibold tracking-tight text-[var(--fg)]">
					Latest from the team
				</h2>
				<a href="{base}/insights/" class="text-[14px] font-medium text-[var(--accent-teal-text)] hover:underline">
					All insights
				</a>
			</div>
		</Reveal>
		<div class="mt-8 grid gap-x-8 gap-y-10 sm:grid-cols-3">
			{#each latest as p, i (p.slug)}
				<Reveal delay={i * 70}>
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
						<div class="mt-4 font-mono text-[11.5px] tracking-[0.06em] text-[var(--color-neutral-500)] uppercase">
							{p.eyebrow}
						</div>
						<h3 class="mt-2 text-[17px] leading-[1.3] font-semibold tracking-tight text-[var(--fg)] transition-colors group-hover:text-[var(--accent-teal-text)]">
							{p.title}
						</h3>
					</a>
				</Reveal>
			{/each}
		</div>
	</div>
</section>

<!-- CONTACT -->
<section class="border-b border-[var(--color-line)]">
	<div class="mx-auto max-w-[1400px] px-5 py-14 sm:py-20">
		<Reveal>
			<h2 class="text-[28px] leading-tight font-semibold tracking-tight text-[var(--fg)]">Get in touch</h2>
			<p class="mt-4 max-w-[52ch] text-[15px] leading-relaxed text-[var(--color-neutral-400)]">
				Questions about the platform, a site, or the data behind it? Email us and a planner will
				reply.
			</p>
			<div class="mt-7 flex flex-wrap gap-3">
				<Button href="mailto:info@urbanprospects.com.au" size="lg">Email Us</Button>
				<Button href="https://www.linkedin.com" target="_blank" rel="noopener" size="lg" variant="outline">Follow on LinkedIn</Button>
			</div>
		</Reveal>
	</div>
</section>

<TrialCta />
