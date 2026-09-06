<script lang="ts">
	import { enhance } from '$app/forms';
	import { base } from '$app/paths';
	import AuthCard from '$lib/components/AuthCard.svelte';
	import Button from '$lib/components/ui/button.svelte';
	let { form } = $props();
</script>

<AuthCard eyebrow="Account" title="Reset your password" lede="We'll email you a link that lets you choose a new one.">
	{#if form?.sent}
		<div class="auth-ok">If an account exists for <strong>{form.email}</strong>, a reset link is on its way. It's valid for one hour.</div>
		<p class="mt-4 text-center text-[13px]"><a class="underline-offset-4 hover:underline" href="{base}/login/">Back to log in</a></p>
	{:else}
		<form method="POST" use:enhance class="space-y-4">
			{#if form?.error}<div class="auth-error" role="alert">{form.error}</div>{/if}
			<div>
				<label class="auth-label" for="email">Email</label>
				<input class="auth-field" id="email" name="email" type="email" autocomplete="email" required value={form?.email ?? ''} />
			</div>
			<Button type="submit" size="lg" class="w-full">Send reset link</Button>
			<p class="text-center text-[13px]"><a class="underline-offset-4 hover:underline" href="{base}/login/">Back to log in</a></p>
		</form>
	{/if}
</AuthCard>
