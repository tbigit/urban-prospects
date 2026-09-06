<script lang="ts">
	import { page } from '$app/state';
	import { base } from '$app/paths';
	import { fmtDate, fmtMoney, daysUntil, statusClass } from '$lib/admin-format';
	let { data } = $props();
	const withParam = (key: string, value: string | null) => {
		const p = new URLSearchParams(page.url.searchParams);
		if (value) p.set(key, value); else p.delete(key);
		if (key !== 'page') p.delete('page');
		return `?${p.toString()}`;
	};
	const filtered = $derived(!!(data.f.q || data.f.status || data.f.cycle || data.f.plan || data.f.test));
</script>

<main class="adm-main">
	<header class="mb-5 flex flex-wrap items-end justify-between gap-3">
		<div>
			<p class="spec text-[var(--accent-teal-text)]">Billing</p>
			<h1 class="adm-h1">Subscriptions</h1>
			<p class="mt-1 max-w-xl text-[11px] adm-muted">One row per plan a member holds. Stripe rows carry a customer id; WordPress imports carry none until re-carded. To add one, open the user.</p>
		</div>
		<p class="text-[12px] adm-muted">{data.total} subscriptions</p>
	</header>

	<form method="GET" class="mb-4 flex flex-wrap items-center gap-2">
		<input class="adm-input inline" name="q" placeholder="Search email or Stripe id" value={data.f.q} />
		<select class="adm-select inline" name="status" onchange={(e) => e.currentTarget.form?.requestSubmit()}>
			<option value="">Any status</option>
			{#each ['Active', 'Trialing', 'Past_due', 'Canceled', 'Unpaid', 'Pending', 'Expired'] as s (s)}<option value={s} selected={data.f.status === s}>{s}</option>{/each}
		</select>
		<select class="adm-select inline" name="cycle" onchange={(e) => e.currentTarget.form?.requestSubmit()}>
			<option value="">Any cycle</option>
			{#each ['Monthly', 'Yearly'] as c (c)}<option value={c} selected={data.f.cycle === c}>{c}</option>{/each}
		</select>
		<select class="adm-select inline" name="plan" onchange={(e) => e.currentTarget.form?.requestSubmit()}>
			<option value="">Any plan</option>
			{#each data.plans as p (p)}<option value={p} selected={data.f.plan === p}>{p}</option>{/each}
		</select>
		<select class="adm-select inline" name="test" onchange={(e) => e.currentTarget.form?.requestSubmit()}>
			<option value="">Real + test</option>
			<option value="real" selected={data.f.test === 'real'}>Real only</option>
			<option value="test" selected={data.f.test === 'test'}>Test only</option>
		</select>
		<button class="adm-btn" type="submit">Filter</button>
		{#if filtered}<a href="{base}/admin/subscriptions/" class="px-1 text-[12px] adm-muted hover:text-[var(--fg)]">Clear</a>{/if}
	</form>

	<div class="adm-panel overflow-x-auto">
		<table class="adm-table">
			<thead><tr><th>#</th><th>Member</th><th>Plan</th><th>Status</th><th>Cycle</th><th class="num">Price</th><th>Regions</th><th>Period end</th><th class="num">Days</th><th>Stripe</th></tr></thead>
			<tbody>
				{#each data.rows as s (s.id)}
					{@const d = daysUntil(s.current_period_end)}
					<tr>
						<td><a class="hover:underline" href="{base}/admin/subscriptions/{s.id}/">{s.id}</a></td>
						<td>
							{#if s.users_id}<a class="hover:underline" href="{base}/admin/users/{s.users_id}/">{s.user_email}</a>{:else}{s.user_email}<span class="adm-chip warn ml-2" title="No matching row in users">no user</span>{/if}
							{#if s.is_test}<span class="adm-chip test ml-2">test</span>{/if}
						</td>
						<td>{s.plan}</td>
						<td><span class="adm-chip {statusClass(s.subscription_status)}">{s.subscription_status}</span>{#if s.cancel_at_period_end && s.subscription_status !== 'Canceled'}<span class="adm-chip warn ml-1">ends</span>{/if}</td>
						<td class="adm-muted">{s.billing_cycle ?? '—'}</td>
						<td class="num">{fmtMoney(s.payment_price)}</td>
						<td class="adm-muted">{s.user_region?.split(',').join(', ') || '—'}</td>
						<td>{fmtDate(s.current_period_end)}</td>
						<td class="num {d !== null && d < 14 ? 'text-[#f5a524]' : ''}">{d ?? '—'}</td>
						<td class="adm-muted">{s.payment_customer_id ?? '—'}</td>
					</tr>
				{:else}
					<tr><td colspan="10" class="adm-muted">No subscriptions match.</td></tr>
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
