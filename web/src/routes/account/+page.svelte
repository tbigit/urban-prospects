<script lang="ts">
	import { enhance } from '$app/forms';
	import { base } from '$app/paths';
	import AuthCard from '$lib/components/AuthCard.svelte';
	import Button from '$lib/components/ui/button.svelte';
	let { data, form } = $props();
	const u = $derived(data.user);
</script>

<AuthCard eyebrow="Account" title={u.first_name ? `Hi ${u.first_name}` : 'Your account'} lede={u.email}>
	<dl class="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-[14px]">
		<dt class="text-[var(--color-neutral-400)]">Plan</dt><dd class="text-[var(--fg)]">{u.plan ?? 'None'}</dd>
		<dt class="text-[var(--color-neutral-400)]">Regions</dt><dd class="text-[var(--fg)]">{u.user_regions.length ? u.user_regions.join(', ') : '—'}</dd>
	</dl>
	<div class="mt-5 flex gap-3">
		<Button href="{base}/app/" variant="teal" class="flex-1">Open the app</Button>
		<form method="POST" action="{base}/logout/" class="flex-1"><Button type="submit" variant="outline" class="w-full">Log out</Button></form>
	</div>

	<h2 class="mt-8 text-[15px] font-semibold text-[var(--fg)]">Change password</h2>
	<form method="POST" action="?/password" use:enhance class="mt-3 space-y-3">
		{#if form?.error}<div class="auth-error" role="alert">{form.error}</div>{/if}
		{#if form?.changed}<div class="auth-ok">Password updated.</div>{/if}
		<div><label class="auth-label" for="current">Current password</label><input class="auth-field" id="current" name="current" type="password" autocomplete="current-password" required /></div>
		<div><label class="auth-label" for="next">New password</label><input class="auth-field" id="next" name="next" type="password" autocomplete="new-password" minlength="10" required /></div>
		<div><label class="auth-label" for="confirm">Confirm new password</label><input class="auth-field" id="confirm" name="confirm" type="password" autocomplete="new-password" minlength="10" required /></div>
		<Button type="submit" variant="outline" class="w-full">Update password</Button>
	</form>
</AuthCard>
