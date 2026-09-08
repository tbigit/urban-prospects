<script lang="ts">
	// Rebuild of the WordPress /contact page (indexed before the 2026-09-08
	// cutover). Details come from that page and the site footer, which agree:
	// Surry Hills office, 02 8071 4591. There is no contact form — the rest of
	// the site is mailto-based too, and a form with no backend behind it would
	// be worse than an address that works.
	import PageHeader from '$lib/components/PageHeader.svelte';
	import Reveal from '$lib/components/Reveal.svelte';
	import TrialCta from '$lib/components/TrialCta.svelte';
	import Button from '$lib/components/ui/button.svelte';
	import { base } from '$app/paths';

	const channels = [
		{
			// mail
			icon: '<rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />',
			label: 'General enquiries',
			value: 'info@urbanprospects.com.au',
			href: 'mailto:info@urbanprospects.com.au',
			note: 'Sales, partnerships, data licensing, and anything about the platform.'
		},
		{
			// life-buoy
			icon: '<circle cx="12" cy="12" r="10" /><path d="m4.93 4.93 4.24 4.24" /><path d="m14.83 9.17 4.24-4.24" /><path d="m14.83 14.83 4.24 4.24" /><path d="m9.17 14.83-4.24 4.24" /><circle cx="12" cy="12" r="4" />',
			label: 'Accounts and billing',
			value: 'support@urbanprospects.com.au',
			href: 'mailto:support@urbanprospects.com.au',
			note: 'Subscriptions, invoices, title search and report orders, and privacy requests.'
		},
		{
			// phone
			icon: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92Z" />',
			label: 'Phone',
			value: '02 8071 4591',
			href: 'tel:+61280714591',
			note: 'Business hours, Sydney (AEST/AEDT).'
		},
		{
			// map-pin
			icon: '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" /><circle cx="12" cy="10" r="3" />',
			label: 'Office',
			value: '603/88 Foveaux Street, Surry Hills NSW 2010',
			href: null,
			note: 'Urban Perspectives Environmental Solutions Pty Ltd, ABN 13 095 904 224.'
		}
	];
</script>

<svelte:head>
	<title>Contact | Urban Prospects</title>
	<meta
		name="description"
		content="Talk to the Urban Prospects team about the platform, a subscription, planning data APIs or a property intelligence report. Surry Hills, Sydney — 02 8071 4591."
	/>
	<link rel="canonical" href="https://www.urbanprospects.com.au/contact/" />
</svelte:head>

<PageHeader
	eyebrow="Contact"
	title="Talk to the team."
	lede="Planners, not a call centre. Tell us what you are trying to find and we will point you at the fastest way to find it."
/>

<section class="border-b border-[var(--color-line)]">
	<div class="mx-auto max-w-[1400px] px-5 py-14 sm:py-20">
		<div class="grid gap-4 sm:grid-cols-2">
			{#each channels as c, i (c.label)}
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
						<div class="spec mt-4 text-[var(--color-neutral-500)]">{c.label}</div>
						{#if c.href}
							<a
								href={c.href}
								class="mt-2 block text-[17px] leading-snug font-semibold tracking-tight text-[var(--fg)] transition-colors hover:text-[var(--accent-teal-text)]"
								>{c.value}</a
							>
						{:else}
							<div
								class="mt-2 text-[17px] leading-snug font-semibold tracking-tight text-[var(--fg)]"
							>
								{c.value}
							</div>
						{/if}
						<p class="mt-2 text-[13.5px] leading-relaxed text-[var(--color-neutral-400)]">{c.note}</p>
					</div>
				</Reveal>
			{/each}
		</div>

		<Reveal delay={250}>
			<div class="mt-10 flex flex-wrap gap-3">
				<Button href="{base}/demo/" variant="teal">Book a Demo</Button>
				<Button href="{base}/faq/" variant="outline">Read the FAQ</Button>
			</div>
		</Reveal>
	</div>
</section>

<TrialCta />
