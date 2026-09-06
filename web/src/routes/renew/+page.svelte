<script lang="ts">
	import { enhance } from '$app/forms';
	import { base } from '$app/paths';
	import AuthCard from '$lib/components/AuthCard.svelte';
	import Button from '$lib/components/ui/button.svelte';
	let { data, form } = $props();
	let busy = $state(false);
	const end = $derived(new Date(data.due.current_period_end).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Australia/Sydney' }));
	const overdue = $derived(data.due.overdue);
	const resub = $derived(data.kind === 'resubscribe');
	const title = $derived(resub ? 'Subscribe to see property details' : overdue ? 'Your subscription has ended' : 'Your subscription is due for renewal');
	const lede = $derived(resub
		? 'You can search without a subscription. Property details, planning controls and feasibility need an active plan.'
		: overdue ? `Your ${data.due.plan} plan ended on ${end}. Continue it below to keep using the platform.`
		: `Your ${data.due.plan} plan runs until ${end}. Continue it now so your access carries on without a break.`);
</script>

<AuthCard eyebrow="Your subscription" {title} {lede}>
	<dl class="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-[14px]">
		<dt class="text-[var(--color-neutral-400)]">Plan</dt><dd class="text-[var(--fg)]">{data.regions.length} region{data.regions.length === 1 ? '' : 's'}, billed {data.interval === 'month' ? 'monthly' : 'yearly'}</dd>
		<dt class="text-[var(--color-neutral-400)]">Regions</dt><dd class="text-[var(--fg)]">{data.regions.join(', ')}</dd>
		{#if data.price != null}<dt class="text-[var(--color-neutral-400)]">Price</dt><dd class="text-[var(--fg)]">${data.price} AUD per {data.interval}, incl. GST</dd>{/if}
		<dt class="text-[var(--color-neutral-400)]">Account</dt><dd class="text-[var(--fg)]">{data.user.email}</dd>
	</dl>
	<form method="POST" use:enhance={() => { busy = true; return async ({ update }) => { busy = false; await update(); }; }} class="mt-6 space-y-3">
		{#if form?.error}<div class="auth-error" role="alert">{form.error}</div>{/if}
		{#if !data.configured}<div class="auth-error">Online renewal is not switched on yet. Email info@urbanprospects.com.au and we will sort it out.</div>{/if}
		<Button type="submit" size="lg" variant="teal" class="w-full" disabled={busy || !data.configured}>{busy ? 'Opening secure checkout…' : resub ? 'Subscribe' : 'Continue subscription'}</Button>
		<p class="text-center text-[12px] text-[var(--color-neutral-400)]">Payment is handled by Stripe. Your card details never touch our servers.</p>
	</form>
	<p class="mt-5 text-center text-[13px] text-[var(--color-neutral-400)]">
		{#if !overdue}<a class="underline-offset-4 hover:underline" href="{base}/account/">Not now</a><span class="mx-2">·</span>{/if}
		<a class="underline-offset-4 hover:underline" href="mailto:info@urbanprospects.com.au">Need to change your plan?</a>
	</p>
</AuthCard>
