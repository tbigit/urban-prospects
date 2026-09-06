<script lang="ts">
	import { base } from '$app/paths';
	import { fmtDate, fmtDateTime, fmtMoney, daysUntil, statusClass } from '$lib/admin-format';
	let { data } = $props();
	const s = $derived(data.stats);
	const tiles = $derived([
		{ label: 'Paying members', value: s.paying_subs, note: `${s.customers} customer accounts` },
		{ label: 'Active subscriptions', value: s.active_subs, note: `${s.monthly} monthly · ${s.yearly} yearly` },
		{ label: 'Annualised revenue', value: fmtMoney(s.arr), note: 'active, non-test, list price' },
		{ label: 'Ending in 30 days', value: s.ending_30d, note: 'renew or expire' },
		{ label: 'Trialing', value: s.trialing, note: `${s.on_stripe} rows carry a Stripe customer` },
		{ label: 'Users', value: s.users, note: `${s.test_users} flagged test · ${s.live_sessions} live sessions` }
	]);
</script>

<main class="adm-main">
	<header class="mb-6">
		<p class="spec text-[var(--accent-teal-text)]">Platform</p>
		<h1 class="adm-h1">Dashboard</h1>
	</header>

	<div class="grid grid-cols-2 gap-3 lg:grid-cols-3">
		{#each tiles as t (t.label)}
			<div class="adm-panel adm-tile">
				<p class="spec text-[9px] text-[var(--color-neutral-400)]">{t.label}</p>
				<p class="v">{t.value}</p>
				<p class="n">{t.note}</p>
			</div>
		{/each}
	</div>

	{#if data.woo.length}
		<section class="adm-panel mt-6 overflow-x-auto border-[color-mix(in_srgb,#e5484d_45%,transparent)]">
			<div class="px-4 pt-4 pb-2">
				<h2 class="spec text-[#e5484d]">Action needed · cancel in WooCommerce</h2>
				<p class="mt-1 text-[11px] adm-muted">These members have re-subscribed on Stripe (or been cancelled here). Their WooCommerce subscription is still live, so Pin Payments will bill them again unless it is cancelled in WP admin.</p>
			</div>
			<table class="adm-table">
				<thead><tr><th>Member</th><th>Woo subscription</th><th>Product</th><th>Stripe sub</th><th>Since</th><th></th></tr></thead>
				<tbody>
					{#each data.woo as w (w.wp_subscription_id)}
						<tr>
							<td>{#if w.users_id}<a class="hover:underline" href="{base}/admin/users/{w.users_id}/">{w.user_email}</a>{:else}{w.user_email}{/if}</td>
							<td>#{w.wp_subscription_id}</td><td>{w.product_name}</td>
							<td class="adm-muted">{w.stripe_subscription_id ?? '—'}</td>
							<td class="adm-muted">{fmtDate(w.woo_cancel_due_at)}</td>
							<td>{#if w.user_subscriptions_id}<a class="adm-chip" href="{base}/admin/subscriptions/{w.user_subscriptions_id}/">Open →</a>{/if}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</section>
	{/if}

	<div class="mt-6 grid gap-4 lg:grid-cols-[3fr_2fr]">
		<section class="adm-panel overflow-x-auto">
			<div class="flex items-end justify-between px-4 pt-4 pb-2">
				<div>
					<h2 class="spec text-[var(--color-neutral-400)]">Next 60 days</h2>
					<p class="mt-1 text-[11px] adm-muted">Subscriptions reaching their period end. Imported Woo plans mostly end outright; Stripe plans renew.</p>
				</div>
				<a class="text-[12px] adm-muted hover:text-[var(--fg)]" href="{base}/admin/subscriptions/">All →</a>
			</div>
			<table class="adm-table">
				<thead><tr><th>Member</th><th>Plan</th><th>Cycle</th><th>Period end</th><th class="num">Days</th><th>Status</th></tr></thead>
				<tbody>
					{#each data.upcoming as r (r.id)}
						{@const d = daysUntil(r.current_period_end)}
						<tr>
							<td><a class="hover:underline" href="{base}/admin/subscriptions/{r.id}/">{r.user_email}</a>{#if r.is_test}<span class="adm-chip test ml-2">test</span>{/if}</td>
							<td>{r.plan}</td>
							<td class="adm-muted">{r.billing_cycle}</td>
							<td>{fmtDate(r.current_period_end)}</td>
							<td class="num {d !== null && d < 14 ? 'text-[#f5a524]' : ''}">{d ?? '—'}</td>
							<td><span class="adm-chip {statusClass(r.subscription_status)}">{r.subscription_status}</span></td>
						</tr>
					{:else}
						<tr><td colspan="6" class="adm-muted">Nothing ends in the next 60 days.</td></tr>
					{/each}
				</tbody>
			</table>
		</section>

		<section class="adm-panel overflow-x-auto">
			<div class="px-4 pt-4 pb-2">
				<h2 class="spec text-[var(--color-neutral-400)]">Recent logins</h2>
				<p class="mt-1 text-[11px] adm-muted">Members who have signed in to the new site. WordPress logins are not counted.</p>
			</div>
			<table class="adm-table">
				<thead><tr><th>Member</th><th>Last login</th></tr></thead>
				<tbody>
					{#each data.logins as u (u.id)}
						<tr>
							<td><a class="hover:underline" href="{base}/admin/users/{u.id}/">{u.display_name ?? u.email}</a>{#if u.is_test}<span class="adm-chip test ml-2">test</span>{/if}</td>
							<td class="adm-muted">{fmtDateTime(u.last_login_at)}</td>
						</tr>
					{:else}
						<tr><td colspan="2" class="adm-muted">No one has logged in to the new site yet.</td></tr>
					{/each}
				</tbody>
			</table>
		</section>
	</div>
</main>
