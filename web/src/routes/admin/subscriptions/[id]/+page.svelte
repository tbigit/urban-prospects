<script lang="ts">
	import { base } from '$app/paths';
	import { enhance } from '$app/forms';
	import { dateInput, fmtDateTime, statusClass } from '$lib/admin-format';
	const REGIONS = ['Sydney', 'Northern', 'Southern', 'Western', 'Central and Hunter'];
	const STATUSES = ['Active', 'Trialing', 'Past_due', 'Canceled', 'Unpaid', 'Pending', 'Expired'];
	let { data, form } = $props();
	const s = $derived(data.sub);
	const regions = $derived((s.user_region ?? '').split(',').map((r) => r.trim()).filter(Boolean));
</script>

<main class="adm-main">
	<a href="{base}/admin/subscriptions/" class="text-[12px] adm-muted hover:text-[var(--fg)]">← Subscriptions</a>
	<header class="mt-2 mb-5 flex flex-wrap items-end justify-between gap-3">
		<div>
			<p class="spec text-[var(--accent-teal-text)]">Subscription #{s.id}</p>
			<h1 class="adm-h1">{s.plan} <span class="adm-chip {statusClass(s.subscription_status)} align-middle text-[12px]">{s.subscription_status}</span></h1>
			<p class="mt-1 text-[12px] adm-muted">
				{#if s.users_id}<a class="hover:underline" href="{base}/admin/users/{s.users_id}/">{s.display_name ?? s.user_email}</a> · {s.user_email}{:else}{s.user_email} <span class="adm-chip warn">no matching user</span>{/if}
				{#if s.is_test}<span class="adm-chip test">test</span>{/if}
			</p>
		</div>
		<div class="text-right text-[11px] adm-muted">
			<div>Created {fmtDateTime(s.created_at)}</div>
			<div>Updated {fmtDateTime(s.updated_at)}</div>
		</div>
	</header>

	<div class="grid gap-4 lg:grid-cols-[3fr_2fr]">
		<form method="POST" action="?/save" use:enhance class="adm-panel grid gap-3 p-4 sm:grid-cols-2">
			<h2 class="spec text-[var(--color-neutral-400)] sm:col-span-2">Entitlement</h2>
			{#if form?.saved}<div class="adm-ok sm:col-span-2">Saved. The app picks this up on the member's next request.</div>{/if}
			<div><label class="adm-label" for="plan">Plan</label><input class="adm-input" id="plan" name="plan" list="plans" value={s.plan ?? ''} required /></div>
			<div><label class="adm-label" for="status">Status</label>
				<select class="adm-select" id="status" name="subscription_status">{#each STATUSES as st (st)}<option value={st} selected={s.subscription_status === st}>{st}</option>{/each}</select></div>
			<div><label class="adm-label" for="cycle">Billing cycle</label>
				<select class="adm-select" id="cycle" name="billing_cycle">{#each ['Yearly', 'Monthly'] as c (c)}<option value={c} selected={s.billing_cycle === c}>{c}</option>{/each}</select></div>
			<div><label class="adm-label" for="price">Price (AUD)</label><input class="adm-input" id="price" name="payment_price" type="number" step="0.01" min="0" value={s.payment_price ?? ''} /></div>
			<div><label class="adm-label" for="end">Period end</label><input class="adm-input" id="end" name="current_period_end" type="date" value={dateInput(s.current_period_end)} /></div>
			<div><label class="adm-label" for="lookups">Additional lookups</label><input class="adm-input" id="lookups" name="additional_lookups" type="number" min="0" value={s.additional_lookups ?? 0} /></div>
			<fieldset class="sm:col-span-2"><legend class="adm-label">Regions the member can search</legend>
				<div class="flex flex-wrap gap-x-4 gap-y-1 text-[13px]">{#each REGIONS as r (r)}<label class="flex items-center gap-1.5"><input type="checkbox" name="regions" value={r} checked={regions.includes(r)} /> {r}</label>{/each}</div></fieldset>
			<div class="sm:col-span-2"><label class="adm-label" for="note">Admin note</label><textarea class="adm-input h-auto py-2" id="note" name="admin_note" rows="2">{s.admin_note ?? ''}</textarea></div>
			<div class="flex justify-end sm:col-span-2"><button class="adm-btn primary" type="submit">Save</button></div>
		</form>

		<div class="space-y-4">
			<section class="adm-panel p-4 text-[12.5px]">
				<h2 class="spec text-[var(--color-neutral-400)]">Stripe</h2>
				<dl class="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
					<dt class="adm-muted">Customer</dt><dd class="break-all">{s.payment_customer_id ?? '—'}</dd>
					<dt class="adm-muted">Subscription</dt><dd class="break-all">{s.payment_subscription_id ?? '—'}</dd>
					<dt class="adm-muted">Price</dt><dd class="break-all">{s.payment_price_id ?? '—'}</dd>
					<dt class="adm-muted">Payment method</dt><dd class="break-all">{s.default_payment_method ?? '—'}</dd>
				</dl>
				<p class="mt-3 text-[11px] adm-muted">{#if s.payment_subscription_id}Stripe webhooks overwrite status and price here. Change billing in the Stripe dashboard, not this form.{:else}Not on Stripe. This row was imported from WordPress or created by hand; nothing bills it.{/if}</p>
			</section>
			<section class="adm-panel p-4">
				<h2 class="spec text-[var(--color-neutral-400)]">Cancel</h2>
				{#if form?.cancelError}<div class="adm-err mt-2">{form.cancelError}</div>{/if}
				{#if form?.cancelled}<div class="adm-ok mt-2">{form.stripe ? `Stripe confirmed (status ${form.stripeStatus}).` : 'Marked here.'} {form.cancelled === 'now' ? 'Access ends now.' : 'Access continues until the period end, then stops.'}</div>{/if}
				{#if s.subscription_status === 'Canceled'}
					<p class="mt-2 text-[12px] adm-muted">Cancelled{s.canceled_at ? ` on ${fmtDateTime(s.canceled_at)}` : ''}.</p>
				{:else}
					{#if s.cancel_at_period_end}<p class="mt-2 text-[12px]"><span class="adm-chip warn">Will not renew</span> <span class="adm-muted">Ends at the period end.</span></p>{/if}
					<p class="mt-2 text-[12px] adm-muted">{#if s.payment_subscription_id}Calls Stripe first; this row only changes once Stripe confirms.{:else}Not on Stripe: this marks the row and queues the WooCommerce subscription for cancellation so Pin stops billing.{/if}</p>
					<div class="mt-3 flex flex-wrap gap-2">
						{#if !s.cancel_at_period_end}
						<form method="POST" action="?/cancel" use:enhance={({ cancel }) => { if (!confirm('Cancel at period end? The member keeps access until then and is not charged again.')) cancel(); }}>
							<input type="hidden" name="mode" value="period_end" /><button class="adm-btn" type="submit">Cancel at period end</button>
						</form>
						{/if}
						<form method="POST" action="?/cancel" use:enhance={({ cancel }) => { if (!confirm('Cancel immediately? Access stops now. Stripe does not refund automatically.')) cancel(); }}>
							<input type="hidden" name="mode" value="now" /><button class="adm-btn danger" type="submit">Cancel now</button>
						</form>
					</div>
				{/if}
			</section>
			{#if data.woo}
			<section class="adm-panel p-4">
				<h2 class="spec text-[var(--color-neutral-400)]">WooCommerce #{data.woo.wp_subscription_id}</h2>
				{#if form?.wooDone || data.woo.woo_cancelled_at}
					<p class="mt-2 text-[12px] adm-muted">Cancelled in WooCommerce{data.woo.woo_cancelled_at ? ` on ${fmtDateTime(data.woo.woo_cancelled_at)}` : ''}. Pin will not bill again.</p>
				{:else if data.woo.woo_cancel_due_at}
					<p class="mt-2 text-[12px]"><span class="adm-chip bad">Cancel in Woo</span> <span class="adm-muted">Since {fmtDateTime(data.woo.woo_cancel_due_at)}. Pin keeps billing until this is done.</span></p>
					<form method="POST" action="?/woodone" use:enhance class="mt-3"><input type="hidden" name="wp_subscription_id" value={data.woo.wp_subscription_id} /><button class="adm-btn" type="submit">Mark cancelled in WooCommerce</button></form>
				{:else}
					<p class="mt-2 text-[12px] adm-muted">Still billing on Pin via WooCommerce. Leave it until the member renews on Stripe.</p>
				{/if}
			</section>
			{/if}
			<form method="POST" action="?/delete" use:enhance={({ cancel }) => { if (!confirm('Delete this subscription row? The member loses this entitlement immediately.')) cancel(); }} class="adm-panel flex items-center justify-between gap-3 p-4">
				<div><h2 class="spec text-[var(--color-neutral-400)]">Remove</h2><p class="mt-1 text-[12px] adm-muted">Prefer setting status to Canceled or Expired. Deleting is for duplicates.</p></div>
				<button class="adm-btn danger" type="submit">Delete</button>
			</form>
		</div>
	</div>
	<datalist id="plans">{#each ['Enterprise 5 regions', 'Business 4 regions', '3 regions', 'Starter 2 regions', '1 region', 'Enterprise 5 regions monthly', 'Business 4 regions monthly', '3 regions monthly', 'Starter 2 regions monthly', '1 region monthly', 'Demo'] as p (p)}<option value={p}></option>{/each}</datalist>
</main>
