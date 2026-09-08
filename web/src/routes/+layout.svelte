<script lang="ts">
	import '../app.css';
	// Hashed URLs for the three faces that carry first paint, so they can be
	// preloaded in <head> — the browser would otherwise only discover them
	// after parsing the CSS, which is what made text flash in the fallback
	// font on a fresh (uncached) load. See the font-display: block block in
	// app.css.
	import geistSans400 from '@fontsource/geist-sans/files/geist-sans-latin-400-normal.woff2?url';
	import geistSans600 from '@fontsource/geist-sans/files/geist-sans-latin-600-normal.woff2?url';
	import geistMono400 from '@fontsource/geist-mono/files/geist-mono-latin-400-normal.woff2?url';
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import { page } from '$app/state';
	import { getEntry } from '$lib/content';
	import { onMount } from 'svelte';
	import { afterNavigate } from '$app/navigation';
	let { children } = $props();

	// Explicit 'instant' so the global `scroll-behavior: smooth` (for anchor
	// links like "Watch How It Works" → #demo) doesn't also animate this
	// page-navigation reset — that should snap, not visibly scroll-to-top.
	// Skipped when the URL carries a hash (e.g. nav links to /#platform from
	// another route) so it doesn't fight SvelteKit's own hash-scroll-into-view.
	const resetScroll = () => {
		if (!page.url.hash) window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
	};
	onMount(resetScroll);
	afterNavigate(resetScroll);

	// Trailing slash included — that is the form these URLs are served and
	// indexed at (see trailingSlash in +layout.ts), so the canonical has to
	// match it exactly rather than point at a URL that redirects.
	const canonical = $derived(
		`https://www.urbanprospects.com.au${page.url.pathname.replace(/\/?$/, '/')}`
	);
	// Migrated articles and region pages declare og:type "article" themselves;
	// emitting the site default here too would leave two og:type tags on those
	// pages, so the layout only supplies it for everything else.
	const isEntry = $derived(Boolean(getEntry(page.url.pathname.replace(/^\/|\/$/g, ''))));
	// The admin console and the member account page bring their own shell (left rail); no marketing chrome there.
	const isAdmin = $derived(page.url.pathname.startsWith('/admin') || page.url.pathname.startsWith('/app') || page.url.pathname.startsWith('/account'));
	const orgLd = JSON.stringify({
		'@context': 'https://schema.org',
		'@type': 'Organization',
		name: 'Urban Prospects',
		url: 'https://www.urbanprospects.com.au',
		logo: 'https://www.urbanprospects.com.au/favicon-512.png',
		email: 'info@urbanprospects.com.au',
		telephone: '+61280714591',
		address: {
			'@type': 'PostalAddress',
			streetAddress: '88 Foveaux St',
			addressLocality: 'Surry Hills',
			addressRegion: 'NSW',
			postalCode: '2000',
			addressCountry: 'AU'
		},
		description:
			'Urban Prospects is a planning intelligence platform for NSW: search every property in New South Wales, assess development feasibility and secure sites on or off market.',
		areaServed: {
			'@type': 'State',
			name: 'New South Wales',
			containedInPlace: { '@type': 'Country', name: 'Australia' }
		}
	});
</script>

<svelte:head>
	<link rel="preload" as="font" type="font/woff2" href={geistSans400} crossorigin="anonymous" />
	<link rel="preload" as="font" type="font/woff2" href={geistSans600} crossorigin="anonymous" />
	<link rel="preload" as="font" type="font/woff2" href={geistMono400} crossorigin="anonymous" />
	<link rel="canonical" href={canonical} />
	<meta property="og:site_name" content="Urban Prospects" />
	{#if !isEntry}<meta property="og:type" content="website" />{/if}
	<meta property="og:url" content={canonical} />
	<meta name="twitter:card" content="summary_large_image" />
	{@html `<script type="application/ld+json">${orgLd}<\/script>`}
</svelte:head>

<!-- Displacement map for the .glass liquid-glass refraction (Chromium picks it
     up via backdrop-filter: url(#liquid-glass-warp); other engines keep the
     plain frost). Zero-size so it never affects layout. -->
<svg width="0" height="0" aria-hidden="true" focusable="false" style="position:absolute">
	<filter id="liquid-glass-warp" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB">
		<feTurbulence type="fractalNoise" baseFrequency="0.007 0.007" numOctaves="2" seed="92" result="noise" />
		<feGaussianBlur in="noise" stdDeviation="2" result="soft" />
		<feDisplacementMap in="SourceGraphic" in2="soft" scale="44" xChannelSelector="R" yChannelSelector="G" />
	</filter>
</svg>

<a href="#main" class="glass skip-link rounded-full px-4 py-2 text-[13px] font-medium text-[var(--fg)]"
	>Skip to main content</a
>

<div class="flex min-h-screen flex-col">
	{#if !isAdmin}<Header />{/if}
	<main id="main" class="flex-1">
		{@render children?.()}
	</main>
	{#if !isAdmin}<Footer />{/if}
</div>

<style>
	/* Off-screen via `top`, not transform/translate — the most broadly
	   compatible skip-link pattern (avoids any ambiguity with the modern
	   standalone CSS translate property Tailwind's transform utilities emit). */
	.skip-link {
		position: fixed;
		top: -100px;
		left: 1rem;
		z-index: 60;
		transition: top 0.2s ease;
	}
	.skip-link:focus-visible {
		top: 1rem;
	}
</style>
