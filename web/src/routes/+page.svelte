<script lang="ts">
	import Button from '$lib/components/ui/button.svelte';
	import Reveal from '$lib/components/Reveal.svelte';
	import MapboxHero from '$lib/components/MapboxHero.svelte';
	import MagnetLines from '$lib/components/MagnetLines.svelte';
	import VimeoEmbed from '$lib/components/VimeoEmbed.svelte';
	import TrialCta from '$lib/components/TrialCta.svelte';
	import { posts } from '$lib/content';
	import { base } from '$app/paths';

	// The three most recent articles, teased in the Insights section.
	const latest = posts.slice(0, 3);

	const heroStats = [
		{ n: '4.9 mil', l: 'Viable Sites' },
		{ n: '1 min', l: 'To Shortlist' },
		{ n: '34+', l: 'Filters Applied' }
	];

	const advantageStats = [
		{
			n: '4.5 million',
			l: 'properties analysed across NSW, so every opportunity in the state is in front of you'
		},
		{
			n: '100% visibility',
			l: 'of on-market and off-market sites, so you can negotiate before competitors know a site exists'
		},
		{
			n: '34 data sources',
			l: 'twice as many as any other platform, giving you feasibility decisions you can rely on'
		},
		{
			n: 'Permissible uses',
			l: 'one of the only platforms that identifies sites by permissible use: fewer dead ends, faster shortlists'
		},
		{
			n: '17 Pattern Book designs',
			l: 'find sites suitable for every NSW Pattern Book design and unlock faster approval pathways'
		},
		{
			n: 'Weekly updates',
			l: 'planning data refreshed weekly for every NSW property, so you act on rule changes before the market'
		}
	];

	// Lucide icon inner-markup (paths only — the wrapping <svg> below supplies
	// viewBox/stroke), chosen per card from its own copy: Search → literal
	// search, Radar → scanning for off-market signals, TrendingUp → yield,
	// Box → 3D, Calculator → RLV, Handshake → negotiate, Bookmark → shortlist,
	// FileText → reports.
	const capabilities = [
		{
			t: 'Search any site in NSW',
			d: 'Property and planning data for every site, searchable with 34+ planning filters: zoning, SEPPs, CDC eligibility, Pattern Book suitability and more.',
			icon: '<path d="m21 21-4.34-4.34" /><circle cx="11" cy="11" r="8" />'
		},
		{
			t: 'Find off-market opportunities',
			d: 'Filter on-market and off-market sites, and use our propensity model to find the owners most likely to sell.',
			icon: '<path d="M19.07 4.93A10 10 0 0 0 6.99 3.34" /><path d="M4 6h.01" /><path d="M2.29 9.62A10 10 0 1 0 21.31 8.35" /><path d="M16.24 7.76A6 6 0 1 0 8.23 16.67" /><path d="M12 18h.01" /><path d="M17.99 11.66A6 6 0 0 1 15.77 16.67" /><circle cx="12" cy="12" r="2" /><path d="m13.41 10.59 5.66-5.66" />'
		},
		{
			t: 'Run automatic yield analysis',
			d: 'Instant yield analysis for subdivisions, apartments, dual occupancies and multi-dwelling housing.',
			icon: '<path d="M16 7h6v6" /><path d="m22 7-8.5 8.5-5-5L2 17" />'
		},
		{
			t: 'Test designs in 3D',
			d: 'Drop in your own 3D models or use NSW Pattern Book models to test what fits on any site.',
			icon: '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /><path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" />'
		},
		{
			t: 'Calculate residual land value',
			d: 'Compare returns across sites and know exactly what you should pay before you negotiate.',
			icon: '<rect width="16" height="20" x="4" y="2" rx="2" /><line x1="8" x2="16" y1="6" y2="6" /><line x1="16" x2="16" y1="14" y2="18" /><path d="M16 10h.01" /><path d="M12 10h.01" /><path d="M8 10h.01" /><path d="M12 14h.01" /><path d="M8 14h.01" /><path d="M12 18h.01" /><path d="M8 18h.01" />'
		},
		{
			t: 'Negotiate directly with owners',
			d: 'Purchase title deeds through the platform and go straight to the owner, often with zero competition.',
			icon: '<path d="m11 17 2 2a1 1 0 1 0 3-3" /><path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4" /><path d="m21 3 1 11h-2" /><path d="M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3" /><path d="M3 4h8" />'
		},
		{
			t: 'Shortlist and track sites',
			d: 'Save your favourite sites, build a pipeline and get alerts the moment circumstances change.',
			icon: '<path d="M17 3a2 2 0 0 1 2 2v15a1 1 0 0 1-1.496.868l-4.512-2.578a2 2 0 0 0-1.984 0l-4.512 2.578A1 1 0 0 1 5 20V5a2 2 0 0 1 2-2z" />'
		},
		{
			t: 'Generate professional reports',
			d: 'Client-ready and investor-ready reports, generated straight from the platform.',
			icon: '<path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z" /><path d="M14 2v5a1 1 0 0 0 1 1h5" /><path d="M10 9H8" /><path d="M16 13H8" /><path d="M16 17H8" />'
		}
	];

	const caseStudies = [
		{
			i: 'S',
			name: 'Sarah',
			role: 'Real Estate Agent',
			h: 'Won the listing advantage',
			d: 'Confirmed dual occupancy permissibility, assessed feasibility and found 20 comparable sites nearby. Her data-backed campaign delivered a premium sale price for her client.',
			tag: 'Premium sale price'
		},
		{
			i: 'A',
			name: 'Alex',
			role: 'Property Developer',
			h: 'Secured a site with zero competition',
			d: 'Located off-market townhouse sites within a 20-minute radius, ran automated yield and residual land value analysis, and went straight to the owner.',
			tag: '12 viable sites in under 10 minutes'
		},
		{
			i: 'M',
			name: 'Maya',
			role: 'Architect',
			h: 'Cut early-stage design time by 70%',
			d: 'Tested Pattern Book designs across multiple sites with 3D models and instant feasibility checks, delivering faster, more accurate advice on every engagement.',
			tag: '70% faster early-stage design'
		}
	];

	const apiChecklist = [
		'Updated weekly for every property in NSW',
		'Sourced from multiple government datasets',
		'Permissibility data covers zoning, SEPPs and Schedule 1 additional uses',
		'CDC and Pattern Book filters exclude Environmentally Sensitive Areas across all NSW LEPs',
		'Minimum lot sizes, FSR, height controls and development-type exceptions',
		'Unique datasets: zoning history, walkability scores, propensity to sell'
	];

	const whoUses = [
		'Developers',
		"Real estate agents",
		"Buyers’ agents",
		'Architects',
		'Town planners',
		'Business owners',
		'Renewable energy companies'
	];
</script>

<svelte:head>
	<title>Urban Prospects — Find better sites, faster. Secure them with confidence.</title>
	<meta
		name="description"
		content="Complete planning intelligence for every property in NSW. Instantly identify development opportunities, assess feasibility and make confident decisions, on or off market, while your competitors are still searching."
	/>
</svelte:head>

<!-- HERO -->
<section class="hero relative isolate overflow-hidden">
	<MapboxHero />
	<div class="mx-auto max-w-[1400px] px-5 pt-40 pb-24 sm:pt-48">
		<Reveal>
			<div
				class="spec inline-flex items-center gap-2.5 rounded-full border border-[var(--color-line)] bg-[var(--color-subtle)]/80 px-3.5 py-1.5 text-[var(--color-neutral-400)] backdrop-blur-sm"
			>
				<span class="relative flex h-1.5 w-1.5">
					<span
						class="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-brand-teal)] opacity-60"
					></span>
					<span class="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--color-brand-teal)]"
					></span>
				</span>
				Planning Intelligence for NSW
			</div>
		</Reveal>

		<Reveal delay={80}>
			<h1
				class="mt-6 max-w-3xl text-[44px] leading-[1.03] font-semibold tracking-[-0.03em] text-[var(--fg)] sm:text-[64px]"
			>
				Find better sites, faster.<br />Secure them with
				<span class="text-[var(--accent-teal-text)]">confidence</span>.
			</h1>
		</Reveal>

		<Reveal delay={160}>
			<p class="mt-7 max-w-xl text-[17px] leading-relaxed text-[var(--color-neutral-300)]">
				Complete planning intelligence for every property in NSW. Instantly identify development
				opportunities, assess feasibility and make confident decisions, on or off market, while
				your competitors are still searching.
			</p>
		</Reveal>

		<Reveal delay={220}>
			<div class="mt-8 flex flex-wrap items-center gap-3">
				<Button href="{base}/signup/" size="lg">Search for a Site Now</Button>
				<Button href="#demo" size="lg" variant="outline" class="glass">
					<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" stroke="none" aria-hidden="true"
						><polygon points="6 3 20 12 6 21 6 3" /></svg
					>
					Watch How It Works
				</Button>
			</div>
		</Reveal>

		<Reveal delay={280}>
			<p class="spec mt-6 text-[var(--accent-teal-text)]">Search. Save. Succeed.</p>
		</Reveal>

		<Reveal delay={340}>
			<div class="mt-14 grid max-w-xl grid-cols-3 gap-3">
				{#each heroStats as s (s.l)}
					<div class="glass rounded-xl p-4 sm:p-5">
						<div class="text-[22px] font-semibold tracking-tight text-[var(--fg)] sm:text-[26px]">
							{s.n}
						</div>
						<div class="spec mt-1 text-[var(--color-neutral-500)]">{s.l}</div>
					</div>
				{/each}
			</div>
		</Reveal>
	</div>
</section>

<!-- EVERY ADVANTAGE, MEASURED -->
<section class="border-t border-[var(--color-line)] bg-[var(--color-subtle)]">
	<div class="mx-auto max-w-[1400px] px-5 py-20">
		<Reveal>
			<div class="spec text-[var(--color-neutral-500)]">01 / Every Advantage Measured</div>
			<h2
				class="mt-3 max-w-2xl text-[26px] leading-tight font-semibold tracking-tight text-[var(--fg)]"
			>
				Every advantage, measured.
			</h2>
		</Reveal>
		<div class="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each advantageStats as s, i (s.n)}
				<Reveal delay={i * 60}>
					<div class="h-full rounded-xl border border-[var(--color-line)] bg-[var(--bg)] p-7">
						<div class="text-[24px] font-semibold tracking-tight text-[var(--accent-teal-text)]">
							{s.n}
						</div>
						<p class="mt-2.5 text-[14px] leading-relaxed text-[var(--color-neutral-400)]">{s.l}</p>
					</div>
				</Reveal>
			{/each}
		</div>
	</div>
</section>

<!-- FROM SITE SEARCH TO FEASIBILITY IN MINUTES -->
<section id="demo" class="border-t border-[var(--color-line)] scroll-mt-28">
	<div class="mx-auto max-w-[1400px] px-5 py-20 text-center">
		<Reveal>
			<h2 class="mx-auto max-w-2xl text-[30px] leading-tight font-semibold tracking-tight text-[var(--fg)] sm:text-[38px]">
				From site search to feasibility in minutes
			</h2>
		</Reveal>
		<Reveal delay={80}>
			<p class="mt-4 text-[16px] text-[var(--color-neutral-400)]">Watch how Urban Prospects works.</p>
		</Reveal>
		<Reveal delay={140}>
			<button
				type="button"
				aria-label="Play product demo video"
				class="group relative mt-10 flex aspect-video w-full items-center justify-center overflow-hidden rounded-2xl border border-[var(--color-line)]"
				style="background: linear-gradient(135deg, var(--color-brand-purple-700), var(--color-brand-purple));"
			>
				<span
					class="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-[var(--color-brand-teal)] text-[#0a0710] transition-transform group-hover:scale-105"
				>
					<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" stroke="none" aria-hidden="true"
						><polygon points="6 3 20 12 6 21 6 3" /></svg
					>
				</span>
			</button>
		</Reveal>
	</div>
</section>

<!-- WHAT YOU CAN DO -->
<section id="platform" class="scroll-mt-28 border-t border-[var(--color-line)] bg-[var(--color-subtle)]">
	<div class="mx-auto max-w-[1400px] px-5 py-20">
		<Reveal>
			<div class="spec text-[var(--color-neutral-500)]">02 / What You Can Do</div>
			<h2 class="mt-3 max-w-2xl text-[26px] leading-tight font-semibold tracking-tight text-[var(--fg)]">
				One platform, from first search to secured site.
			</h2>
			<p class="mt-4 max-w-2xl text-[15px] leading-relaxed text-[var(--color-neutral-400)]">
				Everything you need to find, assess and secure development sites in NSW, without piecing
				together fragmented government data.
			</p>
		</Reveal>

		<div class="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
			{#each capabilities as c, i (c.t)}
				<Reveal delay={i * 50}>
					<div class="h-full rounded-xl border border-[var(--color-line)] bg-[var(--bg)] p-6">
						<div
							class="grid h-9 w-9 place-items-center rounded-lg"
							style="background: color-mix(in srgb, var(--color-brand-teal) 4%, transparent);"
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
						<div class="mt-4 text-[15px] font-semibold text-[var(--fg)]">{c.t}</div>
						<p class="mt-2 text-[13.5px] leading-relaxed text-[var(--color-neutral-400)]">{c.d}</p>
					</div>
				</Reveal>
			{/each}
		</div>
	</div>
</section>

<!-- CASE STUDIES -->
<section class="border-t border-[var(--color-line)]">
	<div class="mx-auto max-w-[1400px] px-5 py-20">
		<Reveal>
			<div class="spec text-[var(--color-neutral-500)]">03 / Case Studies</div>
			<h2 class="mt-3 max-w-2xl text-[26px] leading-tight font-semibold tracking-tight text-[var(--fg)]">
				Real outcomes, achieved by professionals like you.
			</h2>
		</Reveal>

		<div class="mt-10 grid gap-5 md:grid-cols-3">
			{#each caseStudies as c, i (c.name)}
				<Reveal delay={i * 90}>
					<div class="h-full rounded-xl border border-[var(--color-line)] bg-[var(--color-subtle)] p-7">
						<div class="flex items-center gap-3">
							<span
								class="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--color-brand-purple)] text-[14px] font-semibold text-[var(--color-brand-teal)]"
								>{c.i}</span
							>
							<div>
								<div class="text-[14px] font-semibold text-[var(--fg)]">{c.name}</div>
								<div class="text-[12.5px] text-[var(--color-neutral-500)]">{c.role}</div>
							</div>
						</div>
						<div class="mt-5 text-[17px] font-semibold text-[var(--accent-teal-text)]">
							{c.h}
						</div>
						<p class="mt-3 text-[13.5px] leading-relaxed text-[var(--color-neutral-400)]">{c.d}</p>
						<div
							class="mt-5 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-medium text-[#0a0710]"
							style="background: var(--color-brand-teal);"
						>
							<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8" /></svg>
							{c.tag}
						</div>
					</div>
				</Reveal>
			{/each}
		</div>
	</div>
</section>

<!-- BUILT BY PLANNERS, NOT JUST DATA PEOPLE (teaser) -->
<section id="insights" class="scroll-mt-28 border-t border-[var(--color-line)] bg-[var(--color-subtle)]">
	<div class="mx-auto max-w-[1400px] px-5 py-20">
		<div class="grid items-center gap-10 md:grid-cols-2">
			<Reveal>
				<div
					class="flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-2xl border border-[var(--color-line)] bg-[var(--bg)]"
				>
					<MagnetLines
						rows={10}
						columns={13}
						containerSize="100%"
						lineColor="var(--color-brand-teal)"
						lineWidth="2px"
						lineHeight="18px"
						baseAngle={15}
					/>
				</div>
			</Reveal>
			<Reveal delay={100}>
				<div class="spec text-[var(--accent-teal-text)]">Built by Planners, Not Just Data People</div>
				<h2 class="mt-3 text-[24px] leading-tight font-semibold tracking-tight text-[var(--fg)]">
					High-grade judgement, built into every search result.
				</h2>
				<p class="mt-5 text-[15px] leading-relaxed text-[var(--color-neutral-300)]">
					Urban Prospects was created by Stuart Wilmot, a planning and development specialist with
					deep experience in NSW planning systems, development approvals and data-driven site
					identification. Supported by the Urban Perspectives team, Stuart built Urban Prospects to
					give the industry a faster, smarter and more accurate way to find development
					opportunities.
				</p>
				<p class="mt-4 text-[15px] leading-relaxed text-[var(--color-neutral-300)]">
					The platform captures the nuances generic property tools miss, from Schedule 1
					additional uses to environmentally sensitive area exclusions, because it was designed by
					people who interpret the NSW planning system for a living.
				</p>
				<Button href="{base}/insights/" variant="teal" size="lg" class="mt-7">Read Our Planning Insights</Button>
			</Reveal>
		</div>

		<!-- Latest three articles, pulled from the same source /insights lists. -->
		<div class="mt-16 border-t border-[var(--color-line)] pt-12">
			<Reveal>
				<div class="flex flex-wrap items-baseline justify-between gap-3">
					<div class="spec text-[var(--color-neutral-500)]">Latest from the Insights Desk</div>
					<a
						href="{base}/insights/"
						class="text-[13px] font-medium text-[var(--accent-teal-text)] hover:underline"
						>All {posts.length} articles</a
					>
				</div>
			</Reveal>
			<div class="mt-8 grid gap-5 md:grid-cols-3">
				{#each latest as p, i (p.slug)}
					<Reveal delay={i * 90}>
						<a
							href="{base}/{p.slug}/"
							class="group flex h-full flex-col rounded-xl border border-[var(--color-line)] bg-[var(--bg)] p-5 transition-colors duration-200 hover:border-[var(--color-neutral-600)]"
						>
							<div
								class="aspect-[16/10] w-full overflow-hidden rounded-lg border border-[var(--color-line)]"
							>
								<img
									src="{base}{p.hero}"
									alt=""
									loading="lazy"
									decoding="async"
									class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
								/>
							</div>
							<div class="mt-5 px-2 pb-2">
								<div class="spec text-[var(--accent-teal-text)]">{p.eyebrow}</div>
								<div class="mt-2.5 text-[15.5px] leading-snug font-semibold text-[var(--fg)]">
									{p.title}
								</div>
							</div>
						</a>
					</Reveal>
				{/each}
			</div>
		</div>
	</div>
</section>

<!-- OUR SERVICES -->
<section id="services" class="scroll-mt-28 border-t border-[var(--color-line)]">
	<div class="mx-auto max-w-[1400px] px-5 py-20">
		<Reveal>
			<div class="spec text-[var(--color-neutral-500)]">04 / Our Services</div>
			<h2 class="mt-3 max-w-2xl text-[26px] leading-tight font-semibold tracking-tight text-[var(--fg)]">
				Two ways to get high-grade intelligence.
			</h2>
		</Reveal>

		<div class="mt-10 grid gap-5 md:grid-cols-2">
			<Reveal delay={80}>
				<div class="h-full rounded-2xl border border-[var(--color-line)] bg-[var(--color-subtle)] p-8">
					<div class="spec text-[var(--color-neutral-500)]">Planning Intelligence Report</div>
					<div class="mt-4 flex items-baseline gap-2">
						<span class="text-[40px] font-bold tracking-tight text-[var(--fg)]">$55</span>
						<span class="text-[15px] text-[var(--color-neutral-400)]">one-off</span>
					</div>
					<p class="mt-5 text-[15px] leading-relaxed text-[var(--color-neutral-300)]">
						Already have a site in mind? Get property-specific and planning-specific intelligence
						in one place: a clear, defensible view of a site's potential before you commit.
					</p>
					<p class="mt-4 text-[13.5px] font-medium text-[var(--color-neutral-400)]">
						Ideal for real estate agents, home buyers and buyers' agents.
					</p>
					<Button href="{base}/report/" size="lg" class="mt-7">Buy a One-Off Report</Button>
				</div>
			</Reveal>
			<Reveal delay={160}>
				<div
					class="h-full rounded-2xl p-8 text-[#f6f4fa]"
					style="background: linear-gradient(160deg, var(--color-brand-purple), var(--color-brand-purple-700));"
				>
					<div class="spec text-[var(--color-brand-teal)]">Platform Subscription</div>
					<div class="mt-4 flex items-baseline gap-2">
						<span class="text-[40px] font-bold tracking-tight">7-day</span>
						<span class="text-[15px] text-[#f6f4fa]/70">free trial</span>
					</div>
					<p class="mt-5 text-[15px] leading-relaxed text-[#f6f4fa]/80">
						Search for sites, run yield analysis, test Pattern Book designs, calculate residual
						land values, generate reports and manage your pipeline, all in one platform.
					</p>
					<p class="mt-4 text-[13.5px] font-medium text-[#f6f4fa]/70">
						Ideal for developers, buyers' agents, architects and property consultants.
					</p>
					<Button href="{base}/signup/" variant="teal" size="lg" class="mt-7">Start Your Free Trial</Button>
				</div>
			</Reveal>
		</div>

		<Reveal delay={220}>
			<div class="mt-14">
				<div class="spec text-[var(--color-neutral-500)]">Who Uses Urban Prospects</div>
				<div class="mt-4 flex flex-wrap gap-2.5">
					{#each whoUses as w (w)}
						<span
							class="rounded-full border border-[var(--color-line)] px-4 py-1.5 text-[13px] text-[var(--color-neutral-300)]"
							>{w}</span
						>
					{/each}
				</div>
			</div>
		</Reveal>
	</div>
</section>

<!-- PLANNING DATA APIs -->
<section id="data-apis" class="scroll-mt-28 border-t border-[var(--color-line)] bg-[var(--color-subtle)]">
	<div class="mx-auto max-w-[1400px] px-5 py-20">
		<div class="grid gap-10 lg:grid-cols-2">
			<Reveal>
				<div class="spec text-[var(--accent-teal-text)]">Planning Data APIs</div>
				<h2 class="mt-3 text-[26px] leading-tight font-semibold tracking-tight text-[var(--fg)]">
					Put high-grade NSW data inside your own products.
				</h2>
				<p class="mt-5 max-w-lg text-[15px] leading-relaxed text-[var(--color-neutral-300)]">
					Access our accurate, weekly-updated NSW planning data directly through our APIs and
					integrate it into your own systems. Built for proptech companies, data brokers,
					researchers and developers with bespoke platforms.
				</p>
				<Button href="{base}/developers/" size="lg" class="mt-7">Explore the Data APIs</Button>
			</Reveal>
			<Reveal delay={100}>
				<ul class="space-y-4">
					{#each apiChecklist as item (item)}
						<li class="flex items-start gap-3">
							<span
								class="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full"
								style="background: var(--color-brand-teal);"
							>
								<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#0a0710" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 13l4 4L19 7" /></svg>
							</span>
							<span class="text-[14.5px] leading-relaxed text-[var(--color-neutral-300)]">{item}</span>
						</li>
					{/each}
				</ul>
			</Reveal>
		</div>
	</div>
</section>

<!-- FINAL CTA — the same block every article closes on (see TrialCta.svelte). -->
<TrialCta />

<!-- FOUNDER'S STORY -->
<section id="about" class="scroll-mt-28 border-t border-[var(--color-line)]">
	<div class="mx-auto max-w-[1400px] px-5 py-20">
		<div class="grid items-start gap-12 lg:grid-cols-2">
			<Reveal>
				<h2 class="spec mb-5 text-[var(--accent-teal-text)]">Founder's Story</h2>
				<VimeoEmbed
					videoId="1022699488"
					title="Stuart Wilmot — Urban Prospects founder story"
					label="Play: Stuart tells the story behind Urban Prospects"
					poster="{base}/founder-story-poster.jpg"
				/>
				<p class="mt-4 text-[14px] text-[var(--color-neutral-400)]">
					Watch Stuart tell the story behind Urban Prospects
				</p>
				<div class="mt-4 flex items-center gap-3">
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
			<Reveal delay={100}>
				<p class="text-[15px] leading-relaxed font-medium text-[var(--fg)]">
					Urban Prospects was created by Stuart Wilmot, a planning and development specialist with
					deep experience in NSW planning systems, development approvals and data-driven site
					identification. Supported by the Urban Perspectives team, Stuart built Urban Prospects to
					give the industry a faster, smarter and more accurate way to find development
					opportunities.
				</p>
				<p class="mt-5 text-[15px] leading-relaxed text-[var(--color-neutral-300)]">
					That high-grade judgement is built into every search result. The platform captures
					the nuances that generic property tools miss, from Schedule 1 additional uses to
					environmentally sensitive area exclusions, because it was designed by people who
					interpret the NSW planning system for a living.
				</p>
				<p class="mt-5 text-[15px] leading-relaxed text-[var(--color-neutral-300)]">
					Stuart and the team also share regular insights on NSW planning changes, Pattern Book
					opportunities and site identification strategy. Follow Urban Prospects to stay ahead of
					the policy shifts that shape where, and what, you can build.
				</p>
				<Button
					href="https://www.linkedin.com"
					target="_blank"
					rel="noopener"
					size="lg"
					class="mt-7">Follow Urban Prospects</Button
				>
			</Reveal>
		</div>
	</div>
</section>
