<script lang="ts">
	import PostHero from '$lib/components/PostHero.svelte';
	import Prose from '$lib/components/Prose.svelte';
	import Reveal from '$lib/components/Reveal.svelte';
	import Button from '$lib/components/ui/button.svelte';
		import { posts, regions } from '$lib/content';
	import { base } from '$app/paths';
	import { page } from '$app/state';

	let { data } = $props();
	const entry = $derived(data.entry);
	const isPost = $derived(data.kind === 'post');

	// Four more from the same collection, skipping the one being read.
	const more = $derived(
		(isPost ? posts : regions).filter((e) => e.slug !== entry.slug).slice(0, 4)
	);

	const canonical = $derived(`https://www.urbanprospects.com.au/${entry.slug}/`);
	const ogImage = $derived(`https://www.urbanprospects.com.au${entry.hero}`);

	const articleLd = $derived(
		JSON.stringify({
			'@context': 'https://schema.org',
			'@type': isPost ? 'BlogPosting' : 'WebPage',
			headline: entry.title,
			description: entry.description,
			image: ogImage,
			...(entry.date ? { datePublished: entry.date } : {}),
			mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
			publisher: {
				'@type': 'Organization',
				name: 'Urban Prospects',
				logo: {
					'@type': 'ImageObject',
					url: 'https://www.urbanprospects.com.au/favicon-512.png'
				}
			}
		})
	);
</script>

<svelte:head>
	<title>{entry.seoTitle} | Urban Prospects</title>
	<meta name="description" content={entry.description} />
	<meta property="og:title" content={entry.seoTitle} />
	<meta property="og:description" content={entry.description} />
	<meta property="og:image" content={ogImage} />
	<meta property="og:type" content={isPost ? 'article' : 'website'} />
	{#if isPost && entry.date}
		<meta property="article:published_time" content={entry.date} />
	{/if}
	{@html `<script type="application/ld+json">${articleLd}<\/script>`}
</svelte:head>

<!-- Keyed on the path so the whole page, header included, is torn down and
     rebuilt when navigating between two of these pages. Without it Svelte
     reuses the reveal state from the previous page, and the new one arrives
     already-revealed. -->
{#key page.url.pathname}
	<article>
		<PostHero
			eyebrow={isPost ? entry.eyebrow : 'NSW Region'}
			title={entry.title}
			intro={entry.intro}
			read={isPost ? entry.read : 0}
		/>

		{#if entry.hero}
			<!-- Cover photo, spanning the page container. -->
			<div class="mx-auto max-w-[1400px] px-5">
				<Reveal delay={200}>
					<img
						src="{base}{entry.hero}"
						alt=""
						loading="eager"
						fetchpriority="high"
						decoding="async"
						class="aspect-[21/9] w-full rounded-2xl object-cover"
					/>
				</Reveal>
			</div>
		{/if}

		<div class="mx-auto max-w-[1400px] px-5 py-14 sm:py-20">
			<div class="grid gap-14 lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-20">
				<div class="min-w-0 max-w-[720px]">
					<Prose body={entry.body} />
				</div>

				<!-- Related reading. Sticky so the short list travels with the long
				     read instead of leaving a column of dead space beneath it. -->
				{#if more.length}
					<aside class="lg:sticky lg:top-28 lg:self-start lg:pt-1">
						<h2 class="text-[15px] font-semibold text-[var(--fg)]">
							{isPost ? 'Related articles' : 'Other NSW regions'}
						</h2>
						<ul class="mt-4 divide-y divide-[var(--color-line)] border-t border-[var(--color-line)]">
							{#each more as m (m.slug)}
								<li>
									<a href="{base}/{m.slug}/" class="group flex items-stretch gap-4 py-4">
										<!-- The wrapper stretches to the text's height; the image fills
										     it absolutely so a portrait photo can't set the row height. -->
										<div class="relative w-24 shrink-0 self-stretch overflow-hidden rounded-lg">
											<img
												src="{base}{m.hero}"
												alt=""
												loading="lazy"
												decoding="async"
												class="absolute inset-0 h-full w-full object-cover"
											/>
										</div>
										<div class="min-w-0">
											{#if m.eyebrow}
												<div
													class="font-mono text-[11px] tracking-[0.06em] text-[var(--color-neutral-500)] uppercase"
												>
													{m.eyebrow}
												</div>
											{/if}
											<div
												class="mt-1 text-[14px] leading-snug font-medium text-[var(--fg)] transition-colors group-hover:text-[var(--accent-teal-text)]"
											>
												{m.title}
											</div>
										</div>
									</a>
								</li>
							{/each}
						</ul>
						<a
							href="{base}{isPost ? '/insights/' : '/nsw-regions/'}"
							class="mt-5 inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--accent-teal-text)] hover:underline"
						>
							{isPost ? 'All insights' : 'All NSW regions'}
							<svg
								viewBox="0 0 24 24"
								width="13"
								height="13"
								fill="none"
								stroke="currentColor"
								stroke-width="2.5"
								stroke-linecap="round"
								stroke-linejoin="round"
								aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg
							>
						</a>
					</aside>
				{/if}
			</div>

			<!-- CTA row: the conversion path sits once, at the end of the read,
			     rather than floating beside it. -->
			<Reveal>
				<div
					class="mt-16 flex flex-col gap-6 rounded-2xl border border-[var(--color-line)] bg-[var(--color-subtle)] p-7 sm:mt-20 sm:p-9 lg:flex-row lg:items-center lg:justify-between"
				>
					<div class="max-w-[52ch]">
						<h2 class="text-[22px] leading-tight font-semibold tracking-tight text-[var(--fg)]">
							{isPost ? 'Your next site is already in the platform.' : 'Search this region now.'}
						</h2>
						<p class="mt-2 text-[15px] leading-relaxed text-[var(--color-neutral-400)]">
							{isPost
								? 'Search every property in NSW against 34+ planning filters and shortlist viable sites in minutes.'
								: 'Filter every property in this region by zoning, permissible use and yield, on market and off.'}
						</p>
					</div>
					<div class="flex flex-wrap gap-3">
						<Button href="{base}/signup/" variant="teal" size="lg">Start Free Trial</Button>
						<Button href="{base}/report/" size="lg" variant="outline">Property Intelligence Report</Button>
					</div>
				</div>
			</Reveal>
		</div>
	</article>
{/key}
