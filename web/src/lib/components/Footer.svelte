<script lang="ts">
	import Logo from './Logo.svelte';
	import ThemeToggle from './ThemeToggle.svelte';
	import { base } from '$app/paths';

	// Absolute (/#id, not bare #id) so these resolve correctly when rendered
	// via the shared layout on other routes (e.g. /demo), not just on "/".
	// Prefixed with `base` since GitHub Pages project sites serve from a
	// subpath, not the domain root (empty string for any root-served host).
	const platform = [
		{ href: `${base}/#platform`, label: 'Site Search' },
		{ href: `${base}/#platform`, label: 'Yield Analysis' },
		{ href: `${base}/#platform`, label: 'Pattern Book Designs' },
		{ href: `${base}/#platform`, label: 'Residual Land Value' },
		{ href: `${base}/#platform`, label: 'Reports' }
	];
	const services = [
		{ href: `${base}/report/`, label: 'Due Diligence Reports' },
		{ href: `${base}/signup/`, label: 'Platform Subscription' },
		{ href: `${base}/#data-apis`, label: 'Planning Data APIs' },
		{ href: `${base}/demo/`, label: 'Book a Demo' }
	];
	// Region paths are the live WordPress ones, unchanged — these are indexed.
	const explore = [
		{ href: `${base}/insights/`, label: 'Insights' },
		{ href: `${base}/nsw-regions/`, label: 'NSW Regions' },
		{ href: `${base}/residential-development-sites-for-sale-in-sydney/`, label: 'Sydney' },
		{ href: `${base}/land-for-sale-in-the-central-coast/`, label: 'Central Coast & Hunter' },
		{ href: `${base}/development-land-for-sale-northern-nsw/`, label: 'Northern NSW' },
		{ href: `${base}/development-land-for-sale-southern-nsw/`, label: 'Southern NSW' },
		{ href: `${base}/land-for-sale-western-nsw/`, label: 'Western NSW' }
	];
</script>

<footer class="border-t border-[var(--color-line)] bg-[var(--color-subtle)]">
	<div class="mx-auto max-w-[1400px] px-5 py-14">
		<div class="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1fr_1fr]">
			<div>
				<div>
					<Logo height={24} />
				</div>
				<p class="mt-3 max-w-xs text-[13px] leading-relaxed text-[var(--color-neutral-400)]">
					Complete planning intelligence for every property in NSW. Search planning databases to
					find the site that suits your development.
				</p>
				<p class="mt-3 text-[13px] font-semibold text-[var(--accent-teal-text)]">
					Search. Save. Succeed.
				</p>
			</div>

			<div>
				<div class="spec text-[var(--accent-teal-text)]">Platform</div>
				<ul class="mt-3 space-y-2">
					{#each platform as l (l.label)}
						<li>
							<a
								href={l.href}
								class="text-[13px] text-[var(--color-neutral-400)] transition-colors hover:text-[var(--fg)]"
								>{l.label}</a
							>
						</li>
					{/each}
				</ul>
			</div>

			<div>
				<div class="spec text-[var(--accent-teal-text)]">Services</div>
				<ul class="mt-3 space-y-2">
					{#each services as l (l.label)}
						<li>
							<a
								href={l.href}
								class="text-[13px] text-[var(--color-neutral-400)] transition-colors hover:text-[var(--fg)]"
								>{l.label}</a
							>
						</li>
					{/each}
				</ul>
			</div>

			<div>
				<div class="spec text-[var(--accent-teal-text)]">Explore</div>
				<ul class="mt-3 space-y-2">
					{#each explore as l (l.label)}
						<li>
							<a
								href={l.href}
								class="text-[13px] text-[var(--color-neutral-400)] transition-colors hover:text-[var(--fg)]"
								>{l.label}</a
							>
						</li>
					{/each}
				</ul>
			</div>

			<div>
				<div class="spec text-[var(--accent-teal-text)]">Contact</div>
				<ul class="mt-3 space-y-2 text-[13px] text-[var(--color-neutral-400)]">
					<li>88 Foveaux St, Surry Hills NSW 2000</li>
					<li><a href="mailto:info@urbanprospects.com.au" class="transition-colors hover:text-[var(--fg)]">info@urbanprospects.com.au</a></li>
					<li><a href="tel:+61280714591" class="transition-colors hover:text-[var(--fg)]">02 8071 4591</a></li>
					<li><a href="https://www.linkedin.com" target="_blank" rel="noopener" class="transition-colors hover:text-[var(--fg)]">LinkedIn</a></li>
				</ul>
			</div>
		</div>

		<div
			class="mt-10 flex flex-col-reverse items-center justify-between gap-4 border-t border-[var(--color-line)] pt-6 sm:flex-row"
		>
			<span class="text-[12px] text-[var(--color-neutral-500)]"
				>&copy; {new Date().getFullYear()} Urban Prospects. All rights reserved.</span
			>
			<ThemeToggle />
		</div>
	</div>
</footer>
