<script lang="ts">
	import { enhance } from '$app/forms';
	import { base } from '$app/paths';
	import AuthCard from '$lib/components/AuthCard.svelte';
	import Button from '$lib/components/ui/button.svelte';
	let { data, form } = $props();
	let busy = $state(false);
</script>

<AuthCard eyebrow="Account" title="Log in" lede="Use the email and password from your existing Urban Prospects membership.">
	<form method="POST" use:enhance={() => { busy = true; return async ({ update }) => { busy = false; await update(); }; }} class="space-y-4">
		<input type="hidden" name="next" value={data.next} />
		{#if form?.error}<div class="auth-error" role="alert">{form.error}</div>{/if}
		<div>
			<label class="auth-label" for="identifier">Email</label>
			<input class="auth-field" id="identifier" name="identifier" type="text" autocomplete="username" required value={form?.identifier ?? ''} />
		</div>
		<div>
			<label class="auth-label" for="password">Password</label>
			<input class="auth-field" id="password" name="password" type="password" autocomplete="current-password" required />
		</div>
		<Button type="submit" size="lg" class="w-full" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</Button>
		<p class="text-center text-[13px] text-[var(--color-neutral-400)]">
			<a class="underline-offset-4 hover:underline" href="{base}/forgot-password/">Forgot your password?</a>
			<span class="mx-2">·</span>
			<a class="underline-offset-4 hover:underline" href="{base}/signup/">Start a free trial</a>
		</p>
	</form>
</AuthCard>
