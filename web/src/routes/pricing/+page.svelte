<script lang="ts">
	// Subscription configurator: regions x billing interval x users, then a
	// Stripe Checkout Session with a 7-day trial (POST /api/checkout). The page
	// itself is prerendered; only the checkout call touches the server.
	import PageHeader from '$lib/components/PageHeader.svelte';
	import Reveal from '$lib/components/Reveal.svelte';
	import Button from '$lib/components/ui/button.svelte';
	import { base } from '$app/paths';

	const REGIONS = ['Sydney', 'Central and Hunter', 'Northern', 'Southern', 'Western'];
	// Per-user list prices. Stripe holds the same figures; these drive display.
	const PRICES: Record<number, { month: number; year: number }> = {
		1: { month: 50, year: 550 },
		2: { month: 60, year: 600 },
		3: { month: 70, year: 650 },
		4: { month: 80, year: 700 },
		5: { month: 90, year: 750 }
	};
	const MULTI_USER_DISCOUNT = 0.1;

	let regions = $state<string[]>(['Sydney']);
	let interval = $state<'month' | 'year'>('year');
	let users = $state(1);
	let email = $state('');
	let busy = $state(false);
	let err = $state('');

	const perUser = $derived(PRICES[regions.length][interval]);
	const listTotal = $derived(perUser * users);
	const total = $derived(users > 1 ? Math.floor(listTotal * (1 - MULTI_USER_DISCOUNT)) : listTotal);
	const monthlyEquivalent = $derived(PRICES[regions.length].month * users * 12);
	const annualSaving = $derived(
		interval === 'year' ? Math.max(0, monthlyEquivalent - PRICES[regions.length].year * users) : 0
	);

	function toggle(r: string) {
		if (regions.includes(r)) {
			if (regions.length > 1) regions = regions.filter((x) => x !== r);
		} else {
			regions = [...regions, r];
		}
	}

	async function checkout() {
		busy = true;
		err = '';
		try {
			const res = await fetch(`${base}/api/checkout`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ regions, interval, users, email: email || undefined })
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok || !data.url) throw new Error(data.message || 'Could not start checkout.');
			window.location.href = data.url;
		} catch (e) {
			err = e instanceof Error ? e.message : 'Could not start checkout.';
			busy = false;
		}
	}
</script>

<svelte:head>
	<title>Pricing | Platform subscription with a 7-day free trial | Urban Prospects</title>
	<meta
		name="description"
		content="Choose your NSW regions and number of users. Every plan starts with a 7-day free trial, monthly or annual billing, and 10% off each additional user."
	/>
	<link rel="canonical" href="https://www.urbanprospects.com.au/pricing/" />
</svelte:head>

<PageHeader
	eyebrow="Pricing"
	title="Pick your regions. Start your 7-day free trial."
	lede="Pay only for the parts of NSW you work in. Add users at 10% off each, and save further by paying annually."
/>

<section class="border-b border-[var(--color-line)]">
	<div class="mx-auto max-w-[1400px] px-5 py-14 sm:py-20">
		<div class="grid gap-12 lg:grid-cols-12 lg:gap-16">
			<!-- CONFIGURATOR -->
			<div class="lg:col-span-7">
				<Reveal>
					<h2 class="text-[22px] font-semibold tracking-tight text-[var(--fg)]">Regions</h2>
					<p class="mt-1.5 text-[14.5px] text-[var(--color-neutral-400)]">
						Pick up to all five regions across NSW.
					</p>
					<div class="mt-5 flex flex-wrap gap-2.5" role="group" aria-label="Regions">
						{#each REGIONS as r (r)}
							{@const on = regions.includes(r)}
							<button
								type="button"
								aria-pressed={on}
								onclick={() => toggle(r)}
								class="rounded-full border px-4 py-2 text-[14px] font-medium transition-colors {on
									? 'border-[var(--color-brand-teal)] bg-[var(--color-brand-teal)] text-[#0a0710]'
									: 'border-[var(--color-line)] text-[var(--color-neutral-300)] hover:border-[var(--color-neutral-500)]'}"
							>
								{r}
							</button>
						{/each}
					</div>
				</Reveal>

				<Reveal delay={60}>
					<div class="mt-12">
						<h2 class="text-[22px] font-semibold tracking-tight text-[var(--fg)]">Billing</h2>
						<div class="mt-5 inline-flex rounded-full border border-[var(--color-line)] p-1" role="group" aria-label="Billing interval">
							{#each [['year', 'Annual'], ['month', 'Monthly']] as [v, label] (v)}
								<button
									type="button"
									aria-pressed={interval === v}
									onclick={() => (interval = v as 'month' | 'year')}
									class="rounded-full px-5 py-2 text-[14px] font-medium transition-colors {interval === v
										? 'bg-[var(--fg)] text-[var(--bg)]'
										: 'text-[var(--color-neutral-400)] hover:text-[var(--fg)]'}"
								>
									{label}
								</button>
							{/each}
						</div>
					</div>
				</Reveal>

				<Reveal delay={120}>
					<div class="mt-12">
						<h2 class="text-[22px] font-semibold tracking-tight text-[var(--fg)]">Users</h2>
						<p class="mt-1.5 text-[14.5px] text-[var(--color-neutral-400)]">
							10% off every user when you add more than one.
						</p>
						<div class="mt-5 flex flex-wrap items-center gap-4">
							<label class="flex flex-col gap-2 text-[13px] font-medium text-[var(--color-neutral-400)]">
								Number of users
								<select
									bind:value={users}
									class="h-11 rounded-md border border-[var(--color-line)] bg-[var(--color-subtle)] px-3 text-[15px] text-[var(--fg)]"
								>
									{#each Array.from({ length: 10 }, (_, i) => i + 1) as n (n)}
										<option value={n}>{n}</option>
									{/each}
								</select>
							</label>
							<p class="text-[13.5px] text-[var(--color-neutral-500)]">
								Need more than ten? <a href="{base}/demo/" class="text-[var(--fg)] underline underline-offset-4">Book a demo</a> for volume pricing.
							</p>
						</div>
					</div>
				</Reveal>

				<Reveal delay={180}>
					<div class="mt-12">
						<label class="flex max-w-sm flex-col gap-2 text-[13px] font-medium text-[var(--color-neutral-400)]">
							Work email
							<input
								type="email"
								bind:value={email}
								autocomplete="email"
								placeholder="you@company.com.au"
								class="h-11 rounded-md border border-[var(--color-line)] bg-[var(--color-subtle)] px-3 text-[15px] text-[var(--fg)] placeholder:text-[var(--color-neutral-600)]"
							/>
							<span class="font-normal text-[var(--color-neutral-500)]">Optional here. Stripe asks for it at checkout either way.</span>
						</label>
					</div>
				</Reveal>
			</div>

			<!-- SUMMARY -->
			<div class="lg:col-span-5">
				<Reveal delay={100}>
					<div class="rounded-2xl border border-[var(--color-line)] bg-[var(--color-subtle)] p-7 sm:p-8 lg:sticky lg:top-28">
						<h2 class="text-[18px] font-semibold text-[var(--fg)]">Your plan</h2>
						<dl class="mt-5 space-y-3 text-[14.5px]">
							<div class="flex justify-between gap-4">
								<dt class="text-[var(--color-neutral-400)]">Regions</dt>
								<dd class="text-right text-[var(--fg)]">{regions.length} of 5</dd>
							</div>
							<div class="flex justify-between gap-4">
								<dt class="text-[var(--color-neutral-400)]">Users</dt>
								<dd class="text-[var(--fg)]">{users}</dd>
							</div>
							<div class="flex justify-between gap-4">
								<dt class="text-[var(--color-neutral-400)]">Per user</dt>
								<dd class="text-[var(--fg)]">${perUser} / {interval}</dd>
							</div>
							{#if users > 1}
								<div class="flex justify-between gap-4">
									<dt class="text-[var(--color-neutral-400)]">Multi-user discount</dt>
									<dd class="text-[var(--accent-teal-text)]">10% off</dd>
								</div>
							{/if}
						</dl>
						<div class="mt-6 border-t border-[var(--color-line)] pt-6">
							<div class="flex items-baseline gap-2">
								<span class="text-[40px] leading-none font-semibold tracking-tight text-[var(--fg)]">${total}</span>
								<span class="text-[15px] text-[var(--color-neutral-400)]">per {interval}, AUD</span>
							</div>
							{#if annualSaving > 0}
								<p class="mt-2 text-[13.5px] text-[var(--accent-teal-text)]">
									Save ${annualSaving} a year against monthly billing.
								</p>
							{:else if interval === 'month'}
								<p class="mt-2 text-[13.5px] text-[var(--color-neutral-500)]">
									${PRICES[regions.length].year * users} a year if paid annually.
								</p>
							{/if}
						</div>
						<Button onclick={checkout} disabled={busy} variant="teal" size="lg" class="mt-6 w-full">
							{busy ? 'Opening checkout' : 'Start 7-Day Free Trial'}
						</Button>
						{#if err}
							<p class="mt-3 text-[13.5px] text-red-400" role="alert">{err}</p>
						{/if}
						<p class="mt-4 text-[12.5px] leading-relaxed text-[var(--color-neutral-500)]">
							Card details are taken at checkout and nothing is charged for 7 days. Cancel before the
							trial ends and you pay nothing.
						</p>
					</div>
				</Reveal>
			</div>
		</div>
	</div>
</section>

<section class="border-b border-[var(--color-line)] bg-[var(--color-subtle)]">
	<div class="mx-auto max-w-[1400px] px-5 py-14 sm:py-20">
		<div class="grid gap-12 lg:grid-cols-2 lg:gap-20">
			<Reveal>
				<h2 class="text-[24px] leading-tight font-semibold tracking-tight text-[var(--fg)]">
					Only need one site?
				</h2>
				<p class="mt-3 max-w-[48ch] text-[15px] leading-relaxed text-[var(--color-neutral-400)]">
					A one-off Property Intelligence Report covers zoning, controls, overlays and indicative yield for a single address.
				</p>
				<Button href="{base}/report/" size="lg" variant="outline" class="mt-6">Property Intelligence Report</Button>
			</Reveal>
			<Reveal delay={80}>
				<h2 class="text-[24px] leading-tight font-semibold tracking-tight text-[var(--fg)]">
					Building your own product?
				</h2>
				<p class="mt-3 max-w-[48ch] text-[15px] leading-relaxed text-[var(--color-neutral-400)]">
					The same NSW planning data is available through our APIs, priced per integration.
				</p>
				<Button href="{base}/data-apis/" size="lg" variant="outline" class="mt-6">Planning Data APIs</Button>
			</Reveal>
		</div>
	</div>
</section>
