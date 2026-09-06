<script lang="ts">
	// The "Your next site is already in the platform" closer. Lifted out of the
	// homepage so the homepage and every article render the same block from one
	// source rather than two copies that drift apart.
	import Button from './ui/button.svelte';
	import Reveal from './Reveal.svelte';
	import DotField from './DotField.svelte';
	import { onMount } from 'svelte';
	import { base } from '$app/paths';

	// DotField's gradientFrom/gradientTo/glowColor are read fresh every
	// animation frame (Svelte 5 $props() destructuring compiles to live
	// getters), so tracking the theme here and passing different values in
	// is enough to re-colour it live — no changes needed inside DotField.
	let theme = $state<'dark' | 'light'>('dark');
	onMount(() => {
		const read = () =>
			(theme = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');
		read();
		const mo = new MutationObserver(read);
		mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
		return () => mo.disconnect();
	});
	const dotFieldColors = $derived(
		theme === 'light'
			? {
					from: 'rgba(92, 38, 135, 0.1)',
					to: 'rgba(92, 38, 135, 0.04)',
					glow: 'rgba(92, 38, 135, 0.16)'
				}
			: {
					from: 'rgba(168, 85, 247, 0.35)',
					to: 'rgba(180, 151, 207, 0.25)',
					glow: '#120F17'
				}
	);
</script>

<section class="relative isolate overflow-hidden border-t border-[var(--color-line)]">
	<!-- Wrapped rather than passed via DotField's own `class` prop: its root
	     div hardcodes "relative" before the class prop, and since it's plain
	     string concatenation (not tailwind-merge) upstream, Tailwind's own
	     utility generation order — not HTML class order — decides which of
	     "relative"/"absolute" wins, and it wasn't the one this needs. -->
	<div class="pointer-events-none absolute inset-0 -z-10">
		<DotField
			dotRadius={1.5}
			dotSpacing={14}
			cursorRadius={400}
			cursorForce={0.34}
			bulgeOnly={true}
			bulgeStrength={68}
			glowRadius={160}
			sparkle={false}
			waveAmplitude={0}
			gradientFrom={dotFieldColors.from}
			gradientTo={dotFieldColors.to}
			glowColor={dotFieldColors.glow}
		/>
	</div>
	<div class="mx-auto max-w-[1400px] px-5 py-24 text-center">
		<Reveal>
			<h2
				class="mx-auto max-w-2xl text-[32px] leading-tight font-semibold tracking-tight text-[var(--fg)] sm:text-[42px]"
			>
				Your next site is already in the platform.
			</h2>
		</Reveal>
		<Reveal delay={100}>
			<p class="mx-auto mt-5 max-w-xl text-[16px] leading-relaxed text-[var(--color-neutral-400)]">
				Start your 7-day free trial of NSW's most powerful planning intelligence platform. We'll
				notify you before your trial ends, with an extra 3 days free or the option to opt out.
			</p>
		</Reveal>
		<Reveal delay={160}>
			<div class="mt-8 flex flex-wrap items-center justify-center gap-3">
				<Button href="{base}/signup/" variant="teal" size="lg">Start Your 7-Day Free Trial</Button>
				<Button href="{base}/demo/" size="lg" variant="outline" class="glass"
					>Team of 10+? Book a Demo</Button
				>
			</div>
		</Reveal>
		<Reveal delay={200}>
			<p class="mt-5 text-[13px] text-[var(--color-neutral-500)]">
				Prefer a one-off report? <a
					href="{base}/report/"
					class="underline underline-offset-2 hover:text-[var(--fg)]"
					>Get a Due Diligence Report for $55.</a
				>
			</p>
		</Reveal>
	</div>
</section>
