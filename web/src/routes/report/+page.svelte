<script lang="ts">
	// One-off Property Intelligence Report: address in, Stripe Checkout out
	// (POST /api/checkout/report, guest checkout, $250 per site).
	import PageHeader from '$lib/components/PageHeader.svelte';
	import Reveal from '$lib/components/Reveal.svelte';
	import Button from '$lib/components/ui/button.svelte';
	import { base } from '$app/paths';

	const PRICE = 250;
	const includes = [
		'Zoning, permissible uses and Schedule 1 additional uses',
		'Height, FSR and minimum lot size controls',
		'Overlays: flood, bushfire, heritage and environmentally sensitive land',
		'CDC eligibility and Pattern Book suitability',
		'Indicative yield for the development types the zone allows',
		'Delivered as a PDF to your email'
	];

	let address = $state('');
	let email = $state('');
	let busy = $state(false);
	let err = $state('');

	async function checkout(e: SubmitEvent) {
		e.preventDefault();
		busy = true;
		err = '';
		try {
			const res = await fetch(`${base}/api/checkout/report`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ address, email: email || undefined })
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok || !data.url) throw new Error(data.message || 'Could not start checkout.');
			window.location.href = data.url;
		} catch (ex) {
			err = ex instanceof Error ? ex.message : 'Could not start checkout.';
			busy = false;
		}
	}
</script>

<svelte:head>
	<title>Property Intelligence Report | $250 per site | Urban Prospects</title>
	<meta
		name="description"
		content="A one-off Property Intelligence Report for any NSW address: zoning, controls, overlays, CDC and Pattern Book eligibility and indicative yield, for $250."
	/>
	<link rel="canonical" href="https://www.urbanprospects.com.au/report/" />
</svelte:head>

<PageHeader
	eyebrow="Property Intelligence Report"
	title="Know what a site can do before you commit."
	lede="Property-specific, planning-specific intelligence for one NSW address, prepared by planners. $250 per site."
/>

<section class="border-b border-[var(--color-line)]">
	<div class="mx-auto max-w-[1400px] px-5 py-14 sm:py-20">
		<div class="grid gap-12 lg:grid-cols-12 lg:gap-16">
			<div class="lg:col-span-6">
				<Reveal>
					<h2 class="text-[24px] leading-tight font-semibold tracking-tight text-[var(--fg)]">What the report covers</h2>
					<ul class="mt-6 space-y-3">
						{#each includes as item (item)}
							<li class="flex items-start gap-3 text-[15px] leading-relaxed text-[var(--color-neutral-300)]">
								<span class="mt-[0.6em] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-brand-teal)]"></span>
								{item}
							</li>
						{/each}
					</ul>
					<p class="mt-8 max-w-[52ch] text-[14.5px] leading-relaxed text-[var(--color-neutral-400)]">
						Ideal for real estate agents, home buyers and buyers' agents. Assessing several sites, or
						searching for one? The <a href="{base}/pricing/" class="text-[var(--fg)] underline underline-offset-4">platform subscription</a> covers every property in your regions.
					</p>
				</Reveal>
			</div>

			<div class="lg:col-span-6">
				<Reveal delay={80}>
					<form
						onsubmit={checkout}
						class="rounded-2xl border border-[var(--color-line)] bg-[var(--color-subtle)] p-7 sm:p-8"
					>
						<h2 class="text-[18px] font-semibold text-[var(--fg)]">Order a report</h2>
						<label class="mt-6 flex flex-col gap-2 text-[13px] font-medium text-[var(--color-neutral-400)]">
							Site address
							<input
								type="text"
								bind:value={address}
								required
								minlength="6"
								autocomplete="street-address"
								placeholder="7 Onslow Avenue, Elizabeth Bay NSW 2011"
								class="h-11 rounded-md border border-[var(--color-line)] bg-[var(--bg)] px-3 text-[15px] text-[var(--fg)] placeholder:text-[var(--color-neutral-600)]"
							/>
						</label>
						<label class="mt-4 flex flex-col gap-2 text-[13px] font-medium text-[var(--color-neutral-400)]">
							Email for delivery
							<input
								type="email"
								bind:value={email}
								autocomplete="email"
								placeholder="you@company.com.au"
								class="h-11 rounded-md border border-[var(--color-line)] bg-[var(--bg)] px-3 text-[15px] text-[var(--fg)] placeholder:text-[var(--color-neutral-600)]"
							/>
							<span class="font-normal text-[var(--color-neutral-500)]">Optional here. Stripe confirms it at checkout.</span>
						</label>
						<div class="mt-6 flex items-baseline gap-2 border-t border-[var(--color-line)] pt-6">
							<span class="text-[36px] leading-none font-semibold tracking-tight text-[var(--fg)]">${PRICE}</span>
							<span class="text-[15px] text-[var(--color-neutral-400)]">per site, AUD, one-off</span>
						</div>
						<Button type="submit" disabled={busy} variant="teal" size="lg" class="mt-6 w-full">
							{busy ? 'Opening checkout' : 'Continue to Payment'}
						</Button>
						{#if err}
							<p class="mt-3 text-[13.5px] text-red-400" role="alert">{err}</p>
						{/if}
						<p class="mt-4 text-[12.5px] leading-relaxed text-[var(--color-neutral-500)]">
							No account needed. Your report is emailed as a PDF once the planners have run the site.
						</p>
					</form>
				</Reveal>
			</div>
		</div>
	</div>
</section>
