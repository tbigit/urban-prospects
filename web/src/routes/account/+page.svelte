<script lang="ts">
	import { enhance } from '$app/forms';
	import { base } from '$app/paths';
	let { data, form } = $props();
	const u = $derived(data.user);
	let copied = $state('');
	async function copyKey(key: string) {
		try {
			await navigator.clipboard.writeText(key);
			copied = key;
			setTimeout(() => (copied = ''), 2500);
		} catch { /* clipboard unavailable; the key is selectable text */ }
	}
	const extensions = $derived(
		(data.apiKeys[0]?.api_options ?? '').split(',').map((t) => t.trim()).filter(Boolean)
	);
	const fmtDay = (iso: string, month: 'short' | 'long' = 'short') =>
		new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month, year: 'numeric', timeZone: 'Australia/Sydney' });
	const tiles = $derived([
		{ label: 'Plan', value: u.plan ?? 'None', note: u.plan ? 'active subscription' : 'no subscription on this account' },
		{ label: 'Regions', value: u.user_regions.length, note: u.user_regions.length ? u.user_regions.join(', ') : 'no regions' },
		{ label: 'Plan ends', value: data.renewalDue ? fmtDay(data.renewalDue) : '—', note: data.renewalDue ? 'renew to keep access' : 'nothing due' },
		{ label: 'API keys', value: data.apiKeys.length, note: extensions.length ? `${extensions.length} extensions` : 'Planning Data APIs' }
	]);
</script>

<main class="adm-main">
	<header class="mb-6 flex flex-wrap items-end justify-between gap-3">
		<div>
			<p class="spec text-[var(--accent-teal-text)]">Account</p>
			<h1 class="adm-h1">{u.first_name ? `Hi ${u.first_name}` : 'Your account'}</h1>
			<p class="mt-1 text-[12px] adm-muted">{u.email}</p>
		</div>
		<a href="{base}/app/" class="adm-btn primary">Open the app →</a>
	</header>

	{#if data.renewalDue}
		<a href="{base}/renew/" class="adm-err mb-4 block hover:underline">Your plan ends {fmtDay(data.renewalDue, 'long')}. Continue your subscription →</a>
	{/if}

	<div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
		{#each tiles as t (t.label)}
			<div class="adm-panel adm-tile">
				<p class="spec text-[9px] text-[var(--color-neutral-400)]">{t.label}</p>
				<p class="v truncate" title={String(t.value)}>{t.value}</p>
				<p class="n truncate" title={t.note}>{t.note}</p>
			</div>
		{/each}
	</div>

	<div class="mt-6 grid gap-4 lg:grid-cols-[3fr_2fr]">
		<section class="adm-panel overflow-x-auto">
			<div class="flex items-end justify-between gap-3 px-4 pt-4 pb-2">
				<div>
					<h2 class="spec text-[var(--color-neutral-400)]">API keys</h2>
					<p class="mt-1 text-[11px] adm-muted">Keys for the Planning Data APIs. Keep them secret.</p>
				</div>
				<form method="POST" action="?/createKey" use:enhance>
					<button type="submit" class="adm-btn">{data.apiKeys.length ? 'Add new key' : 'Create your first key'}</button>
				</form>
			</div>
			<div class="space-y-2 px-4 pb-3">
				{#if form?.keyError}<div class="adm-err" role="alert">{form.keyError}</div>{/if}
				{#if form?.keyCreated}<div class="adm-ok">New API key created.</div>{/if}
				{#if form?.keyDeleted}<div class="adm-ok">API key deleted.</div>{/if}
				{#if extensions.length}
					<div class="flex flex-wrap gap-1.5">
						{#each extensions as tag}<span class="adm-chip ok">{tag}</span>{/each}
					</div>
				{/if}
			</div>
			{#if data.apiKeys.length}
				<table class="adm-table">
					<thead><tr><th>Key</th><th>Status</th><th>Created</th><th></th></tr></thead>
					<tbody>
						{#each data.apiKeys as k (k.api_key)}
							<tr>
								<td><code class="font-mono text-[12.5px] text-[var(--accent-teal-text)]">{k.api_key}</code></td>
								<td><span class="adm-chip {k.api_status.toLowerCase() === 'active' ? 'ok' : 'bad'}">{k.api_status}</span></td>
								<td class="adm-muted whitespace-nowrap">{fmtDay(k.created_on)}</td>
								<td class="whitespace-nowrap text-right">
									<button type="button" class="adm-chip hover:text-[var(--fg)]" onclick={() => copyKey(k.api_key)}>{copied === k.api_key ? 'Copied' : 'Copy'}</button>
									<form method="POST" action="?/deleteKey" use:enhance class="inline" onsubmit={(e) => { if (!confirm(`Delete API key ${k.api_key.slice(0, 8)}…?`)) e.preventDefault(); }}>
										<input type="hidden" name="key" value={k.api_key} />
										<button type="submit" class="adm-chip bad">Delete</button>
									</form>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{:else}
				<p class="px-4 pb-4 text-[12.5px] adm-muted">You have no API keys yet.</p>
			{/if}
		</section>

		<section class="adm-panel">
			<div class="px-4 pt-4 pb-2">
				<h2 class="spec text-[var(--color-neutral-400)]">Change password</h2>
				<p class="mt-1 text-[11px] adm-muted">At least 10 characters.</p>
			</div>
			<form method="POST" action="?/password" use:enhance class="space-y-3 px-4 pb-4">
				{#if form?.error}<div class="adm-err" role="alert">{form.error}</div>{/if}
				{#if form?.changed}<div class="adm-ok">Password updated.</div>{/if}
				<div><label class="adm-label" for="current">Current password</label><input class="adm-input" id="current" name="current" type="password" autocomplete="current-password" required /></div>
				<div><label class="adm-label" for="next">New password</label><input class="adm-input" id="next" name="next" type="password" autocomplete="new-password" minlength="10" required /></div>
				<div><label class="adm-label" for="confirm">Confirm new password</label><input class="adm-input" id="confirm" name="confirm" type="password" autocomplete="new-password" minlength="10" required /></div>
				<button type="submit" class="adm-btn w-full">Update password</button>
			</form>
		</section>
	</div>
</main>
