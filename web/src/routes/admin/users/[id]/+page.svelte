<script lang="ts">
	import { base } from '$app/paths';
	import { enhance } from '$app/forms';
	import { fmtDate, fmtDateTime, fmtMoney, statusClass } from '$lib/admin-format';
	const REGIONS = ['Sydney', 'Northern', 'Southern', 'Western', 'Central and Hunter'];
	let { data, form } = $props();
	const u = $derived(data.user);
	let showAdd = $state(false);
</script>

<main class="adm-main">
	<a href="{base}/admin/users/" class="text-[12px] adm-muted hover:text-[var(--fg)]">← Users</a>
	<header class="mt-2 mb-5 flex flex-wrap items-end justify-between gap-3">
		<div>
			<p class="spec text-[var(--accent-teal-text)]">User #{u.id}{#if u.wp_user_id} · WP #{u.wp_user_id}{/if}</p>
			<h1 class="adm-h1">{u.display_name ?? u.email}</h1>
			<p class="mt-1 text-[12px] adm-muted">{u.email} · <span class="adm-chip {statusClass(u.status)}">{u.status}</span> {#if u.is_test}<span class="adm-chip test">test</span>{/if}</p>
		</div>
		<div class="text-right text-[11px] adm-muted">
			<div>Password: {u.password_algo.replace('wp_', 'WordPress ')}{#if u.password_algo.startsWith('wp_')} (rehashes on first login){/if}</div>
			<div>Last login {fmtDateTime(u.last_login_at)} · {data.sessions.n} live session{data.sessions.n === 1 ? '' : 's'}</div>
			<div>Registered {fmtDate(u.wp_registered_at ?? u.created_at)}{#if u.migrated_at} · imported {fmtDate(u.migrated_at)}{/if}</div>
		</div>
	</header>

	<div class="grid gap-4 lg:grid-cols-[3fr_2fr]">
		<form method="POST" action="?/save" use:enhance class="adm-panel grid gap-3 p-4 sm:grid-cols-2">
			<h2 class="spec text-[var(--color-neutral-400)] sm:col-span-2">Details</h2>
			{#if form?.error}<div class="adm-err sm:col-span-2">{form.error}</div>{/if}
			{#if form?.saved}<div class="adm-ok sm:col-span-2">Saved.</div>{/if}
			<div><label class="adm-label" for="email">Email</label><input class="adm-input" id="email" name="email" type="email" value={u.email} required /></div>
			<div><label class="adm-label" for="user_login">Login name</label><input class="adm-input" id="user_login" name="user_login" value={u.user_login} /></div>
			<div><label class="adm-label" for="first_name">First name</label><input class="adm-input" id="first_name" name="first_name" value={u.first_name ?? ''} /></div>
			<div><label class="adm-label" for="last_name">Last name</label><input class="adm-input" id="last_name" name="last_name" value={u.last_name ?? ''} /></div>
			<div><label class="adm-label" for="display_name">Display name</label><input class="adm-input" id="display_name" name="display_name" value={u.display_name ?? ''} /></div>
			<div><label class="adm-label" for="stripe_customer_id">Stripe customer id</label><input class="adm-input" id="stripe_customer_id" name="stripe_customer_id" value={u.stripe_customer_id ?? ''} placeholder="cus_…" /></div>
			<div><label class="adm-label" for="role">Role</label>
				<select class="adm-select" id="role" name="role">{#each ['subscriber', 'customer', 'administrator'] as r (r)}<option value={r} selected={u.role === r}>{r}</option>{/each}</select></div>
			<div><label class="adm-label" for="status">Status</label>
				<select class="adm-select" id="status" name="status">{#each ['active', 'inactive', 'locked'] as s (s)}<option value={s} selected={u.status === s}>{s}</option>{/each}</select>
				<p class="mt-1 text-[11px] adm-muted">Anything but active blocks login and ends live sessions.</p></div>
			<label class="flex items-center gap-2 text-[13px]"><input type="checkbox" name="is_test" checked={u.is_test} /> Test / internal account (excluded from customer counts)</label>
			<div class="flex justify-end"><button class="adm-btn primary" type="submit">Save</button></div>
		</form>

		<div class="space-y-4">
			<form method="POST" action="?/password" use:enhance class="adm-panel space-y-3 p-4">
				<h2 class="spec text-[var(--color-neutral-400)]">Set a temporary password</h2>
				{#if form?.pwError}<div class="adm-err">{form.pwError}</div>{/if}
				{#if form?.pwSaved}<div class="adm-ok">Password set. Existing sessions were ended.</div>{/if}
				<input class="adm-input" name="password" type="text" minlength="10" placeholder="At least 10 characters" required autocomplete="off" />
				<div class="flex justify-end"><button class="adm-btn" type="submit">Set password</button></div>
			</form>
			<form method="POST" action="?/signout" use:enhance class="adm-panel flex items-center justify-between gap-3 p-4">
				<div><h2 class="spec text-[var(--color-neutral-400)]">Sessions</h2><p class="mt-1 text-[12px] adm-muted">{data.sessions.n} active · last seen {fmtDateTime(data.sessions.last)}</p></div>
				<button class="adm-btn" type="submit" disabled={data.sessions.n === 0}>Log out everywhere</button>
			</form>
		</div>
	</div>

	<section class="adm-panel mt-6 overflow-x-auto">
		<div class="flex items-end justify-between px-4 pt-4 pb-2">
			<div><h2 class="spec text-[var(--color-neutral-400)]">Subscriptions</h2><p class="mt-1 text-[11px] adm-muted">Matched on email, the key the app uses.</p></div>
			<button class="adm-btn" onclick={() => (showAdd = !showAdd)}>{showAdd ? 'Close' : 'Add subscription'}</button>
		</div>
		{#if showAdd}
			<form method="POST" action="?/addsub" use:enhance class="grid gap-3 border-t border-[var(--color-line)] p-4 sm:grid-cols-2 lg:grid-cols-4">
				<div><label class="adm-label" for="a-plan">Plan</label><input class="adm-input" id="a-plan" name="plan" list="plans" value="Enterprise 5 regions" required /></div>
				<div><label class="adm-label" for="a-status">Status</label><select class="adm-select" id="a-status" name="subscription_status">{#each ['Active', 'Trialing', 'Pending', 'Canceled', 'Expired'] as s (s)}<option>{s}</option>{/each}</select></div>
				<div><label class="adm-label" for="a-cycle">Billing cycle</label><select class="adm-select" id="a-cycle" name="billing_cycle"><option>Yearly</option><option>Monthly</option></select></div>
				<div><label class="adm-label" for="a-price">Price (AUD)</label><input class="adm-input" id="a-price" name="payment_price" type="number" step="0.01" min="0" /></div>
				<div><label class="adm-label" for="a-end">Period end</label><input class="adm-input" id="a-end" name="current_period_end" type="date" /></div>
				<fieldset class="lg:col-span-2"><legend class="adm-label">Regions</legend><div class="flex flex-wrap gap-x-4 gap-y-1 text-[13px]">{#each REGIONS as r (r)}<label class="flex items-center gap-1.5"><input type="checkbox" name="regions" value={r} checked /> {r}</label>{/each}</div></fieldset>
				<div class="flex items-end justify-end"><button class="adm-btn primary" type="submit">Create</button></div>
			</form>
		{/if}
		<table class="adm-table">
			<thead><tr><th>#</th><th>Plan</th><th>Status</th><th>Cycle</th><th class="num">Price</th><th>Regions</th><th>Period end</th><th>Stripe</th></tr></thead>
			<tbody>
				{#each data.subs as s (s.id)}
					<tr>
						<td><a class="hover:underline" href="{base}/admin/subscriptions/{s.id}/">{s.id}</a></td>
						<td>{s.plan}</td>
						<td><span class="adm-chip {statusClass(s.subscription_status)}">{s.subscription_status}</span></td>
						<td class="adm-muted">{s.billing_cycle ?? '—'}</td>
						<td class="num">{fmtMoney(s.payment_price)}</td>
						<td class="adm-muted">{s.user_region?.split(',').join(', ') || '—'}</td>
						<td>{fmtDate(s.current_period_end)}</td>
						<td class="adm-muted">{s.payment_customer_id ?? '—'}</td>
					</tr>
				{:else}
					<tr><td colspan="8" class="adm-muted">No subscriptions on this email.</td></tr>
				{/each}
			</tbody>
		</table>
	</section>

	{#if data.wp.length}
		<section class="adm-panel mt-4 overflow-x-auto">
			<div class="px-4 pt-4 pb-2"><h2 class="spec text-[var(--color-neutral-400)]">WordPress import record</h2><p class="mt-1 text-[11px] adm-muted">What WooCommerce held when this account was migrated. Read-only.</p></div>
			<table class="adm-table">
				<thead><tr><th>Woo sub</th><th>Product</th><th>Regions</th><th class="num">Total</th><th>Scheduled end</th><th>Next payment</th><th>Pin customer</th></tr></thead>
				<tbody>
					{#each data.wp as w (w.wp_subscription_id)}
						<tr><td>{w.wp_subscription_id}</td><td>{w.product_name}</td><td class="adm-muted">{w.regions ?? '—'}</td><td class="num">{fmtMoney(w.order_total)}</td><td>{fmtDate(w.end_at)}</td><td>{fmtDate(w.next_payment_at)}</td><td class="adm-muted">{w.pin_customer_token ?? '—'}</td></tr>
					{/each}
				</tbody>
			</table>
		</section>
	{/if}
	<datalist id="plans">{#each ['Enterprise 5 regions', 'Business 4 regions', '3 regions', 'Starter 2 regions', '1 region', 'Enterprise 5 regions monthly', 'Business 4 regions monthly', '3 regions monthly', 'Starter 2 regions monthly', '1 region monthly', 'Demo'] as p (p)}<option value={p}></option>{/each}</datalist>
</main>
