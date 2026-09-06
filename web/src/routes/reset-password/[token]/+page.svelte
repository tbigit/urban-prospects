<script lang="ts">
	import { enhance } from '$app/forms';
	import { base } from '$app/paths';
	import AuthCard from '$lib/components/AuthCard.svelte';
	import Button from '$lib/components/ui/button.svelte';
	let { data, form } = $props();
</script>

<AuthCard eyebrow="Account" title="Choose a new password">
	{#if !data.valid}
		<div class="auth-error">This reset link has expired or was already used.</div>
		<p class="mt-4 text-center text-[13px]"><a class="underline-offset-4 hover:underline" href="{base}/forgot-password/">Request a new link</a></p>
	{:else}
		<form method="POST" use:enhance class="space-y-4">
			{#if form?.error}<div class="auth-error" role="alert">{form.error}</div>{/if}
			<div>
				<label class="auth-label" for="password">New password</label>
				<input class="auth-field" id="password" name="password" type="password" autocomplete="new-password" minlength="10" required />
			</div>
			<div>
				<label class="auth-label" for="confirm">Confirm new password</label>
				<input class="auth-field" id="confirm" name="confirm" type="password" autocomplete="new-password" minlength="10" required />
			</div>
			<Button type="submit" size="lg" class="w-full">Set password</Button>
		</form>
	{/if}
</AuthCard>
