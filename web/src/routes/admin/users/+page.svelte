<script lang="ts">
	import { page } from '$app/state';
	import { base } from '$app/paths';
	import { enhance } from '$app/forms';
	import { fmtDate, fmtDateTime, statusClass } from '$lib/admin-format';
	let { data, form } = $props();
	let showCreate = $state(false);
	const withParam = (key: string, value: string | null) => {
		const p = new URLSearchParams(page.url.searchParams);
		if (value) p.set(key, value); else p.delete(key);
		if (key !== 'page') p.delete('page');
		return `?${p.toString()}`;
	};
	const filtered = $derived(!!(data.f.q || data.f.role || data.f.status || data.f.test));
</script>

<main class="adm-main">
	<header class="mb-5 flex flex-wrap items-end justify-between gap-3">
		<div>
			<p class="spec text-[var(--accent-teal-text)]">Members</p>
			<h1 class="adm-h1">Users</h1>
			<p class="mt-1 max-w-xl text-[11px] adm-muted">Every account that can log in to the new site. Rows keep their WordPress password until first login, when it is rehashed.</p>
		</div>
		<div class="flex items-center gap-3">
			<p class="text-[12px] adm-muted">{data.total} users</p>
			<button class="adm-btn primary" onclick={() => (showCreate = !showCreate)}>{showCreate ? 'Close' : 'New user'}</button>
		</div>
	</header>

	{#if showCreate || form?.createError}
		<form method="POST" action="?/create" use:enhance class="adm-panel mb-5 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-6">
			{#if form?.createError}<div class="adm-err sm:col-span-2 lg:col-span-6">{form.createError}</div>{/if}
			<div class="lg:col-span-2"><label class="adm-label" for="c-email">Email</label><input class="adm-input" id="c-email" name="email" type="email" required /></div>
			<div><label class="adm-label" for="c-fn">First name</label><input class="adm-input" id="c-fn" name="first_name" /></div>
			<div><label class="adm-label" for="c-ln">Last name</label><input class="adm-input" id="c-ln" name="last_name" /></div>
			<div><label class="adm-label" for="c-role">Role</label><select class="adm-select" id="c-role" name="role"><option>subscriber</option><option>customer</option><option>administrator</option></select></div>
			<div><label class="adm-label" for="c-pw">Temporary password</label><input class="adm-input" id="c-pw" name="password" type="text" minlength="10" required /></div>
			<label class="flex items-center gap-2 text-[13px] lg:col-span-4"><input type="checkbox" name="is_test" /> Test / internal account</label>
			<div class="flex justify-end lg:col-span-2"><button class="adm-btn primary" type="submit">Create user</button></div>
		</form>
	{/if}

	<form method="GET" class="mb-4 flex flex-wrap items-center gap-2">
		<input class="adm-input inline" name="q" placeholder="Search email or name" value={data.f.q} />
		<select class="adm-select inline" name="role" onchange={(e) => e.currentTarget.form?.requestSubmit()}>
			<option value="">Any role</option>
			{#each ['subscriber', 'customer', 'administrator'] as r (r)}<option value={r} selected={data.f.role === r}>{r}</option>{/each}
		</select>
		<select class="adm-select inline" name="status" onchange={(e) => e.currentTarget.form?.requestSubmit()}>
			<option value="">Any status</option>
			{#each ['active', 'inactive', 'locked'] as s (s)}<option value={s} selected={data.f.status === s}>{s}</option>{/each}
		</select>
		<select class="adm-select inline" name="test" onchange={(e) => e.currentTarget.form?.requestSubmit()}>
			<option value="">Real + test</option>
			<option value="real" selected={data.f.test === 'real'}>Real only</option>
			<option value="test" selected={data.f.test === 'test'}>Test only</option>
		</select>
		<button class="adm-btn" type="submit">Filter</button>
		{#if filtered}<a href="{base}/admin/users/" class="px-1 text-[12px] adm-muted hover:text-[var(--fg)]">Clear</a>{/if}
	</form>

	<div class="adm-panel overflow-x-auto">
		<table class="adm-table">
			<thead><tr><th>Email</th><th>Name</th><th>Role</th><th>Status</th><th>Plan</th><th>Password</th><th>Last login</th><th>Created</th></tr></thead>
			<tbody>
				{#each data.rows as u (u.id)}
					<tr>
						<td><a class="hover:underline" href="{base}/admin/users/{u.id}/">{u.email}</a>{#if u.is_test}<span class="adm-chip test ml-2">test</span>{/if}</td>
						<td>{u.display_name ?? ([u.first_name, u.last_name].filter(Boolean).join(' ') || '—')}</td>
						<td class="adm-muted">{u.role}</td>
						<td><span class="adm-chip {statusClass(u.status)}">{u.status}</span></td>
						<td>{#if u.plan}{u.plan} <span class="adm-muted">· {u.sub_status}</span>{#if u.sub_count > 1}<span class="adm-muted"> +{u.sub_count - 1}</span>{/if}{:else}<span class="adm-muted">—</span>{/if}</td>
						<td class="adm-muted">{u.password_algo.replace('wp_', 'WP ')}</td>
						<td class="adm-muted">{fmtDateTime(u.last_login_at)}</td>
						<td class="adm-muted">{fmtDate(u.wp_registered_at ?? u.created_at)}</td>
					</tr>
				{:else}
					<tr><td colspan="8" class="adm-muted">No users match.</td></tr>
				{/each}
			</tbody>
		</table>
	</div>

	{#if data.pages > 1}
		<nav class="mt-4 flex items-center justify-between text-[12px]" aria-label="Pages">
			<a href={withParam('page', String(data.page - 1))} class="adm-muted hover:text-[var(--fg)] {data.page <= 1 ? 'pointer-events-none opacity-40' : ''}">← Previous</a>
			<span class="adm-muted">Page {data.page} of {data.pages}</span>
			<a href={withParam('page', String(data.page + 1))} class="adm-muted hover:text-[var(--fg)] {data.page >= data.pages ? 'pointer-events-none opacity-40' : ''}">Next →</a>
		</nav>
	{/if}
</main>
