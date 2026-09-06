<script lang="ts">
	import { base } from '$app/paths';
	import AuthCard from '$lib/components/AuthCard.svelte';
	import Button from '$lib/components/ui/button.svelte';
	let { data } = $props();
	const end = $derived(data.periodEnd ? new Date(data.periodEnd).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Australia/Sydney' }) : null);
</script>

{#if data.pending}
	<AuthCard eyebrow="Your subscription" title="Almost there" lede="Stripe is still confirming your payment. Refresh this page in a moment.">
		<Button href="{base}/renew/success/{typeof location !== 'undefined' ? location.search : ''}" variant="outline" class="w-full">Refresh</Button>
	</AuthCard>
{:else}
	<AuthCard eyebrow="Your subscription" title="You're all set" lede={end ? `Your ${data.plan} plan is active until ${end}. Stripe has emailed your receipt.` : `Your ${data.plan} plan is active. Stripe has emailed your receipt.`}>
		<div class="flex gap-3">
			<Button href="{base}/app/" variant="teal" class="flex-1">Open the app</Button>
			<Button href="{base}/account/" variant="outline" class="flex-1">Account</Button>
		</div>
	</AuthCard>
{/if}
