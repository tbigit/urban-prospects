<script lang="ts">
	import { enhance } from '$app/forms';
	import { base } from '$app/paths';
	import { onMount } from 'svelte';
	let { data, form } = $props();
	const u = $derived(data.user);

	type Section = 'overview' | 'keys' | 'billing' | 'users' | 'template' | 'password';
	const SECTIONS: { key: Section; label: string; hash: string; title: string }[] = [
		{ key: 'overview', label: 'Overview', hash: 'overview', title: 'Overview' },
		{ key: 'keys', label: 'API keys', hash: 'api-keys', title: 'API keys' },
		{ key: 'billing', label: 'Billing', hash: 'billing', title: 'Billing' },
		...(data.parent ? [] : [{ key: 'users' as Section, label: 'Users', hash: 'users', title: 'Additional users' }]),
		{ key: 'template', label: 'Email template', hash: 'email-template', title: 'Email template' },
		{ key: 'password', label: 'Password', hash: 'password', title: 'Change password' }
	];
	let open = $state<Section>('overview');
	function show(s: Section) {
		open = s;
		history.replaceState(history.state, '', `#${SECTIONS.find((x) => x.key === s)!.hash}`);
	}
	onMount(() => {
		const hit = SECTIONS.find((s) => `#${s.hash}` === location.hash);
		if (hit) open = hit.key;
	});
	// A form result lands on the section it belongs to (matters for the
	// no-JS fallback submit, which reloads the page without a hash).
	$effect(() => {
		if (form?.keyCreated || form?.keyDeleted || form?.keyError) open = 'keys';
		if (form?.changed || form?.error) open = 'password';
		if (form?.billingError || form?.cardSaved || form?.cancelled || form?.resumed || form?.planChanged) open = 'billing';
		if (form?.childError || form?.childAdded || form?.childRemoved || form?.inviteSent) open = 'users';
		if (form?.templateSaved || form?.templateError) open = 'template';
	});

	// ---- Email template: tiptap editor over the HTML the app merges with Handlebars.
	let editorEl = $state<HTMLDivElement | null>(null);
	let editor = $state<import('@tiptap/core').Editor | null>(null);
	let templateHtml = $state(data.template.template ?? '');
	let tick = $state(0); // bumped on every transaction so the toolbar's isActive() re-reads
	$effect(() => {
		if (open !== 'template' || !editorEl) return;
		let ed: import('@tiptap/core').Editor | undefined;
		let gone = false;
		(async () => {
			const [{ Editor }, { default: StarterKit }, { TextAlign }] = await Promise.all([
				import('@tiptap/core'), import('@tiptap/starter-kit'), import('@tiptap/extension-text-align')
			]);
			if (gone || !editorEl) return;
			ed = new Editor({
				element: editorEl,
				extensions: [StarterKit, TextAlign.configure({ types: ['heading', 'paragraph'] })],
				content: templateHtml,
				onTransaction: () => { tick++; },
				onUpdate: ({ editor: e }) => { templateHtml = e.getHTML(); }
			});
			editor = ed;
		})();
		return () => { gone = true; ed?.destroy(); editor = null; };
	});
	const TOOLS = [
		{ label: 'Heading', act: (e: import('@tiptap/core').Editor) => e.chain().focus().toggleHeading({ level: 5 }).run(), on: (e: import('@tiptap/core').Editor) => e.isActive('heading', { level: 5 }), glyph: 'H' },
		{ label: 'Bold', act: (e: import('@tiptap/core').Editor) => e.chain().focus().toggleBold().run(), on: (e: import('@tiptap/core').Editor) => e.isActive('bold'), glyph: 'B' },
		{ label: 'Italic', act: (e: import('@tiptap/core').Editor) => e.chain().focus().toggleItalic().run(), on: (e: import('@tiptap/core').Editor) => e.isActive('italic'), glyph: 'I' },
		{ label: 'Bullet list', act: (e: import('@tiptap/core').Editor) => e.chain().focus().toggleBulletList().run(), on: (e: import('@tiptap/core').Editor) => e.isActive('bulletList'), glyph: '•' },
		{ label: 'Numbered list', act: (e: import('@tiptap/core').Editor) => e.chain().focus().toggleOrderedList().run(), on: (e: import('@tiptap/core').Editor) => e.isActive('orderedList'), glyph: '1.' }
	];
	const PLACEHOLDERS = ['{{user.first_name}}', '{{user.last_name}}', '{{user.email}}', '{{property.address}}', '{{property.postcode}}'];
	function insertPlaceholder(t: string) { editor?.chain().focus().insertContent(t).run(); }
	const STATES = ['NSW', 'ACT', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT'];

	// ---- Billing: new card through a Stripe card element + SetupIntent (card data
	// stays inside Stripe's iframe; we only ever see the pm_ id).
	let cardOpen = $state(false);
	let cardEl = $state<HTMLDivElement | null>(null);
	let cardError = $state('');
	let cardBusy = $state(false);
	let cardForm = $state<HTMLFormElement | null>(null);
	let pmId = $state('');
	let stripe: any = null;
	let cardElement: any = null;
	function loadStripeJs(): Promise<any> {
		return new Promise((res, rej) => {
			const w = window as any;
			if (w.Stripe) return res(w.Stripe);
			let sc = document.querySelector<HTMLScriptElement>('script[src="https://js.stripe.com/v3/"]');
			if (!sc) { sc = document.createElement('script'); sc.src = 'https://js.stripe.com/v3/'; sc.async = true; document.head.appendChild(sc); }
			sc.addEventListener('load', () => (w.Stripe ? res(w.Stripe) : rej(new Error('Stripe.js did not load'))));
			sc.addEventListener('error', () => rej(new Error('Stripe.js did not load')));
		});
	}
	$effect(() => {
		if (!cardOpen || !cardEl || !data.billing.publishableKey) return;
		let gone = false;
		(async () => {
			try {
				const Stripe = await loadStripeJs();
				if (gone) return;
				stripe = Stripe(data.billing.publishableKey);
				const dark = document.documentElement.dataset.theme === 'dark';
				cardElement = stripe.elements().create('card', {
					hidePostalCode: true,
					style: { base: { fontFamily: "'Geist Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: '13px', color: dark ? '#f4f1f8' : '#1a1523', '::placeholder': { color: dark ? '#7d7788' : '#9a94a6' } }, invalid: { color: '#e5484d' } }
				});
				cardElement.mount(cardEl);
				cardElement.on('change', (e: any) => { cardError = e.error ? e.error.message : ''; });
			} catch (e) { cardError = (e as Error).message; }
		})();
		return () => { gone = true; cardElement?.destroy?.(); cardElement = null; };
	});
	async function saveCard(e: Event) {
		e.preventDefault();
		if (!stripe || !cardElement || cardBusy) return;
		cardBusy = true; cardError = '';
		try {
			const r = await fetch(`${base}/account/card`, { method: 'POST' });
			if (!r.ok) throw new Error((await r.text()) || 'Could not start the card update.');
			const { client_secret } = await r.json();
			const result = await stripe.confirmCardSetup(client_secret, { payment_method: { card: cardElement } });
			if (result.error) throw new Error(result.error.message);
			pmId = result.setupIntent.payment_method;
			await Promise.resolve();
			cardForm?.requestSubmit();
		} catch (err) { cardError = (err as Error).message; cardBusy = false; }
	}

	// API keys are redacted until the eye is opened; copy always takes the full key.
	let revealed = $state<Record<string, boolean>>({});
	const redact = (k: string) => k.slice(0, 7) + '•'.repeat(Math.max(8, k.length - 7));
	let copied = $state('');
	async function copyKey(key: string) {
		try {
			await navigator.clipboard.writeText(key);
			copied = key;
			setTimeout(() => (copied = ''), 2500);
		} catch { /* clipboard unavailable; reveal and select instead */ revealed[key] = true; }
	}
	const extensions = $derived(
		(data.apiKeys[0]?.api_options ?? '').split(',').map((t) => t.trim()).filter(Boolean)
	);
	const fmtDay = (iso: string, month: 'short' | 'long' = 'short') =>
		new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month, year: 'numeric', timeZone: 'Australia/Sydney' });
	const money = (p: string | null) => {
		const n = Number(p);
		return p && Number.isFinite(n) ? `$${n.toLocaleString('en-AU')}` : null;
	};
	const sub = $derived(data.sub);
	const cycle = $derived(sub?.billing_cycle ?? null);
	const planTile = $derived({ label: 'Plan', value: u.plan ?? 'None', note: u.plan ? (cycle ? `billed ${cycle.toLowerCase()}` : 'active subscription') : 'no subscription on this account' });
	const endsTile = $derived({ label: 'Plan ends', value: data.renewalDue ? fmtDay(data.renewalDue) : sub?.current_period_end ? fmtDay(sub.current_period_end) : '—', note: data.renewalDue ? 'renew to keep access' : sub?.cancel_at_period_end ? 'cancels at period end' : sub?.current_period_end ? 'renews automatically' : 'nothing due' });
	const tiles = $derived([
		{ label: 'Regions', value: String(u.user_regions.length), note: u.user_regions.length ? u.user_regions.join(', ') : 'no regions' },
		{ label: 'Bookmarked', value: String(data.favCount), note: data.favCount === 1 ? 'property in My Fav' : 'properties in My Fav' },
		{ label: 'API keys', value: String(data.apiKeys.length), note: extensions.length ? `${extensions.length} extensions` : 'Planning Data APIs' }
	]);
	const current = $derived(SECTIONS.find((s) => s.key === open)!);

	// ---- Billing: plan editor (regions × cycle × seats). Prices are per user; the
	// server re-derives everything from the form, this only drives the preview.
	let planOpen = $state(false);
	let pickRegions = $state<string[]>([]);
	let pickInterval = $state<'month' | 'year'>('year');
	let pickSeats = $state(1);
	function openPlan() {
		pickRegions = data.plan.current.length ? [...data.plan.current] : [data.plan.regions[0]];
		pickInterval = data.plan.interval;
		pickSeats = Math.max(data.plan.seats, data.plan.seatsUsed);
		planOpen = true;
	}
	function toggleRegion(r: string) {
		pickRegions = pickRegions.includes(r) ? pickRegions.filter((x) => x !== r) : [...pickRegions, r];
	}
	const unit = $derived(data.plan.prices[pickRegions.length]?.[pickInterval] ?? null);
	const total = $derived(unit != null ? unit * pickSeats : null);
	const currentUnit = $derived(data.plan.prices[data.plan.current.length]?.[data.plan.interval] ?? null);
	const perMonth = (p: number | null, i: 'month' | 'year') => (p == null ? null : i === 'month' ? p : p / 12);
	const dearer = $derived(
		total != null && currentUnit != null && perMonth(total, pickInterval)! > perMonth(currentUnit * data.plan.seats, data.plan.interval)!
	);
	const samePlan = $derived(
		pickInterval === data.plan.interval && pickSeats === data.plan.seats &&
		pickRegions.length === data.plan.current.length && data.plan.current.every((r) => pickRegions.includes(r))
	);
	const planSummary = $derived(
		data.plan.current.length ? `${data.plan.current.length} region${data.plan.current.length === 1 ? '' : 's'}${data.plan.seats > 1 ? ` · ${data.plan.seats} users` : ''}` : (sub?.plan ?? 'No plan')
	);
	let cancelOpen = $state(false);
	let childBusy = $state(false);
</script>

<div class="acct-stage">
	<section class="acct-panel acct-menu" aria-label="My account">
		<div class="acct-row" style="align-items:flex-start">
			<h1 class="acct-title">My Account</h1>
			<a class="acct-x" aria-label="Open the app" href="{base}/app/">
				<svg viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
			</a>
		</div>
		<div class="acct-links">
			{#if u.role === 'administrator'}
				<a class="acct-link" href="{base}/admin/"><svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> Admin console</a>
			{/if}
		</div>

		<div class="acct-who">
			<p class="name">{[u.first_name, u.last_name].filter(Boolean).join(' ') || u.email}</p>
			<p class="mail">{u.email}</p>
		</div>

		{#if data.renewalDue}
			<a href="{base}/renew/" class="acct-note bad" style="display:block;margin-top:1rem">Your plan ends {fmtDay(data.renewalDue, 'long')}. Continue your subscription →</a>
		{/if}

		<nav class="acct-nav" aria-label="Account sections">
			{#each SECTIONS as s (s.key)}
				<button type="button" class="acct-navrow" class:active={open === s.key} aria-current={open === s.key ? 'page' : undefined} onclick={() => show(s.key)}>
					<span class="lbl">{s.label}</span>
					<span class="val">
						{#if s.key === 'overview'}{u.plan ?? 'No plan'}
						{:else if s.key === 'keys'}{data.apiKeys.length}
						{:else if s.key === 'billing'}{cycle ?? '—'}
						{:else if s.key === 'users'}{data.children.length}
						{:else if s.key === 'template'}{data.template.from_company_name || 'Prospect email'}
						{:else}••••••{/if}
					</span>
					<svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>
				</button>
			{/each}
		</nav>

		<div class="acct-foot">
			<form method="POST" action="{base}/logout/"><button type="submit" class="acct-link"><svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg> Log out</button></form>
			<p class="acct-tag">Urban Prospects · Planning intelligence for NSW</p>
		</div>
	</section>

	<section class="acct-panel acct-detail" aria-label={current.title}>
		<div class="acct-row" style="align-items:flex-start">
			<div>
				<p class="spec" style="color:var(--color-neutral-400)">My Account</p>
				<h2 class="acct-title">{current.title}</h2>
			</div>
			{#if open === 'keys'}
				<form method="POST" action="?/createKey" use:enhance><button type="submit" class="acct-mini">{data.apiKeys.length ? 'New key' : 'Create key'}</button></form>
			{/if}
		</div>

		<div class="acct-body">
			{#if open === 'overview'}
				<div class="acct-tiles plan">
					<div class="acct-tile wide"><p class="spec">{planTile.label}</p><p class="v">{planTile.value}</p><p class="n">{planTile.note}</p></div>
					<div class="acct-tile"><p class="spec">{endsTile.label}</p><p class="v">{endsTile.value}</p><p class="n">{endsTile.note}</p></div>
				</div>
				<div class="acct-tiles three">
					{#each tiles as t (t.label)}
						<div class="acct-tile">
							<p class="spec">{t.label}</p>
							<p class="v">{t.value}</p>
							<p class="n">{t.note}</p>
						</div>
					{/each}
				</div>
				{#if data.renewalDue}
					<div class="acct-actions"><a href="{base}/renew/" class="acct-btn">Continue subscription</a></div>
				{/if}

			{:else if open === 'keys'}
				{#if form?.keyError}<div class="acct-note bad" role="alert">{form.keyError}</div>{/if}
				{#if form?.keyCreated}<div class="acct-note ok">New API key created.</div>{/if}
				{#if form?.keyDeleted}<div class="acct-note ok">API key deleted.</div>{/if}
				<p class="acct-value" style="margin-bottom:.8rem"><small>Keys for the Planning Data APIs. Keep them secret: they are hidden until you open the eye.</small></p>
				{#if extensions.length}
					<div class="acct-field" style="margin-bottom:1rem"><span class="acct-label">Extensions</span>
						<div class="acct-chips">{#each extensions as tag}<span class="acct-chip ok">{tag}</span>{/each}</div>
					</div>
				{/if}
				{#if data.apiKeys.length}
					<table class="acct-table">
						<thead><tr><th>Key</th><th>Status</th><th>Created</th><th></th></tr></thead>
						<tbody>
							{#each data.apiKeys as k (k.api_key)}
								<tr>
									<td>
										<span class="keycell">
											<button type="button" class="acct-eye" aria-label={revealed[k.api_key] ? 'Hide key' : 'Show key'} aria-pressed={!!revealed[k.api_key]} onclick={() => (revealed[k.api_key] = !revealed[k.api_key])}>
												{#if revealed[k.api_key]}
													<svg viewBox="0 0 24 24"><path d="M17.9 17.9A10 10 0 0 1 12 20C5 20 1 12 1 12a18 18 0 0 1 5.1-6M9.9 4.2A9.4 9.4 0 0 1 12 4c7 0 11 8 11 8a18 18 0 0 1-2.2 3.2M14.1 14.1a3 3 0 1 1-4.2-4.2M1 1l22 22"/></svg>
												{:else}
													<svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>
												{/if}
											</button>
											<code>{revealed[k.api_key] ? k.api_key : redact(k.api_key)}</code>
										</span>
									</td>
									<td><span class="acct-chip {k.api_status.toLowerCase() === 'active' ? 'ok' : 'bad'}" style="font-size:11px;padding:.05rem .5rem">{k.api_status}</span></td>
									<td class="muted">{fmtDay(k.created_on)}</td>
									<td class="acts">
										<button type="button" class="acct-mini" onclick={() => copyKey(k.api_key)}>{copied === k.api_key ? 'Copied' : 'Copy'}</button>
										<form method="POST" action="?/deleteKey" use:enhance onsubmit={(e) => { if (!confirm(`Delete API key ${k.api_key.slice(0, 7)}…?`)) e.preventDefault(); }}>
											<input type="hidden" name="key" value={k.api_key} />
											<button type="submit" class="acct-mini bad">Delete</button>
										</form>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				{:else}
					<p class="acct-value"><small>You have no API keys yet.</small></p>
				{/if}

			{:else if open === 'billing'}
				{#if form?.billingError}<div class="acct-note bad" role="alert">{form.billingError}</div>{/if}
				{#if form?.cardSaved}<div class="acct-note ok">Card updated. Your next renewal will charge the new card.</div>{/if}
				{#if form?.cancelled}<div class="acct-note ok">Your subscription will not renew. You keep full access until {sub?.current_period_end ? fmtDay(sub.current_period_end, 'long') : 'the end of the current period'}.</div>{/if}
				{#if form?.resumed}<div class="acct-note ok">Your subscription renews again as normal.</div>{/if}
				{#if form?.planChanged}<div class="acct-note ok">Plan updated. Stripe has prorated the change against your current period.</div>{/if}
				{#if data.parent}
					<div class="acct-tiles three">
						<div class="acct-tile"><p class="spec">Plan</p><p class="v">{u.plan ?? 'None'}</p><p class="n">{sub?.subscription_status ?? 'no subscription'}</p></div>
						<div class="acct-tile"><p class="spec">Regions</p><p class="v">{u.user_regions.length}</p><p class="n">{u.user_regions.join(', ') || 'none'}</p></div>
						<div class="acct-tile"><p class="spec">Plan ends</p><p class="v">{sub?.current_period_end ? fmtDay(sub.current_period_end) : '—'}</p><p class="n">{sub?.cancel_at_period_end ? 'does not renew' : 'renews automatically'}</p></div>
					</div>
					<div class="acct-field" style="margin-top:1.25rem">
						<span class="acct-label">Account holder</span>
						<p class="acct-value">{[data.parent.first_name, data.parent.last_name].filter(Boolean).join(' ') || data.parent.email}<small>Your access is part of {data.parent.email}'s subscription. Billing, regions and cancellation are managed from that account.</small></p>
					</div>
				{:else}
				<div class="acct-tiles three">
					<div class="acct-tile"><p class="spec">Plan</p><p class="v">{planSummary}</p><p class="n">{sub?.subscription_status ?? 'no subscription'}{sub?.cancel_at_period_end ? ' · ends at period end' : ''}</p></div>
					<div class="acct-tile"><p class="spec">Billing cycle</p><p class="v">{cycle ?? '—'}</p><p class="n">{money(sub?.payment_price ?? null) ? `${money(sub?.payment_price ?? null)}${data.plan.seats > 1 ? ' per user' : ''} per ${cycle === 'Monthly' ? 'month' : 'year'}` : 'price on file'}</p></div>
					<div class="acct-tile"><p class="spec">{sub?.cancel_at_period_end ? 'Access until' : 'Next payment'}</p><p class="v">{sub?.current_period_end ? fmtDay(sub.current_period_end) : '—'}</p><p class="n">{sub?.cancel_at_period_end ? 'cancels at period end' : sub?.current_period_end ? 'end of current period' : 'nothing scheduled'}</p></div>
				</div>

				<div class="acct-field" style="margin-top:1.25rem">
					<span class="acct-label">Plan</span>
					{#if data.plan.current.length}
						<div class="acct-chips" style="margin-bottom:.5rem">{#each data.plan.regions as r (r)}<span class="acct-chip" class:on={data.plan.current.includes(r)}>{r}</span>{/each}</div>
					{/if}
					{#if planOpen}
						<form method="POST" action="?/changePlan" class="acct-plan" use:enhance={() => { return async ({ update }) => { planOpen = false; await update(); }; }}>
							<span class="acct-label">Regions</span>
							<div class="acct-chips" role="group" aria-label="Regions">
								{#each data.plan.regions as r (r)}
									<label class="acct-chip pick" class:on={pickRegions.includes(r)}>
										<input type="checkbox" name="regions" value={r} checked={pickRegions.includes(r)} onchange={() => toggleRegion(r)} /> {r}
									</label>
								{/each}
							</div>
							<div class="acct-grid" style="margin-top:.9rem">
								<div>
									<span class="acct-label">Billing cycle</span>
									<div class="acct-seg" role="radiogroup" aria-label="Billing cycle">
										<label class:on={pickInterval === 'year'}><input type="radio" name="interval" value="year" bind:group={pickInterval} /> Yearly</label>
										<label class:on={pickInterval === 'month'}><input type="radio" name="interval" value="month" bind:group={pickInterval} /> Monthly</label>
									</div>
								</div>
								<div>
									<label class="acct-label" for="seats">Users (you + additional)</label>
									<input id="seats" class="acct-input" type="number" name="seats" min={data.plan.seatsUsed} max={data.plan.maxSeats} bind:value={pickSeats} />
								</div>
							</div>
							<p class="acct-value" style="margin-top:.9rem">
								{#if total != null}
									<strong>${total.toLocaleString('en-AU')}</strong> per {pickInterval} · {pickRegions.length} region{pickRegions.length === 1 ? '' : 's'}{pickSeats > 1 ? ` × ${pickSeats} users at $${unit!.toLocaleString('en-AU')}` : ''}
									<small>{#if !sub?.stripe || !sub?.live}You'll confirm the card on Stripe's checkout page; the new plan starts today.{:else if samePlan}This is your current plan.{:else if dearer}Charged today for the rest of the current period, then {pickInterval === 'month' ? 'monthly' : 'yearly'} at the new price.{:else}Applies now; the unused part of what you've paid is credited against your next invoice.{/if}</small>
								{:else}
									<small>Pick at least one region.</small>
								{/if}
							</p>
							<div class="acct-actions" style="margin-top:1rem">
								<button type="submit" class="acct-btn" disabled={!data.billing.stripe || total == null || samePlan}>{sub?.stripe && sub?.live ? 'Update plan' : 'Continue to checkout'}</button>
								<button type="button" class="acct-btn alt" onclick={() => (planOpen = false)}>Cancel</button>
							</div>
						</form>
					{:else}
						<div class="acct-actions" style="margin-top:.5rem">
							<button type="button" class="acct-btn" disabled={!data.billing.stripe} title={data.billing.stripe ? undefined : 'Stripe is not switched on yet'} onclick={openPlan}>{sub?.live ? 'Change regions or plan' : 'Subscribe'}</button>
						</div>
					{/if}
					{#if !data.billing.stripe}<p class="acct-value" style="margin-top:.5rem"><small>Stripe billing is not switched on for this site yet. Email <a href="mailto:info@urbanprospects.com.au" style="text-decoration:underline">info@urbanprospects.com.au</a> to change your plan.</small></p>{/if}
				</div>

				<div class="acct-field" style="margin-top:1.25rem">
					<span class="acct-label">Payment method</span>
					{#if data.billing.onStripe}
						<p class="acct-value">Card on file with Stripe.<small>Enter a new card below to use it for every renewal from now on. Card details go straight to Stripe and never pass through this site.</small></p>
						{#if cardOpen}
							<form method="POST" action="?/card" class="acct-card" bind:this={cardForm} use:enhance={() => { return async ({ update }) => { cardBusy = false; cardOpen = false; await update(); }; }} onsubmit={(e) => { if (!pmId) saveCard(e); }}>
								<input type="hidden" name="payment_method" value={pmId} />
								<div class="acct-cardbox" bind:this={cardEl}></div>
								{#if cardError}<p class="acct-value" style="margin-top:.5rem;color:#e5484d"><small style="color:inherit">{cardError}</small></p>{/if}
								<div class="acct-actions" style="margin-top:1rem">
									<button type="submit" class="acct-btn" disabled={cardBusy}>{cardBusy ? 'Saving…' : 'Save card'}</button>
									<button type="button" class="acct-btn alt" onclick={() => { cardOpen = false; cardError = ''; }}>Cancel</button>
								</div>
							</form>
						{:else}
							<div class="acct-actions" style="margin-top:1rem">
								<button type="button" class="acct-btn" disabled={!data.billing.stripe || !data.billing.publishableKey} title={data.billing.stripe && data.billing.publishableKey ? undefined : 'Stripe is not switched on yet'} onclick={() => { pmId = ''; cardOpen = true; }}>Update card</button>
								<form method="POST" action="?/billing"><button type="submit" class="acct-btn alt" disabled={!data.billing.stripe}>Invoices and billing details</button></form>
							</div>
						{/if}
						{#if !data.billing.stripe || !data.billing.publishableKey}<p class="acct-value" style="margin-top:.5rem"><small>Stripe billing is not switched on for this site yet. Email <a href="mailto:info@urbanprospects.com.au" style="text-decoration:underline">info@urbanprospects.com.au</a> to change your card.</small></p>{/if}
					{:else if sub}
						<p class="acct-value">Card on file with our previous billing provider.<small>Changing the card, regions, plan or users moves your subscription to Stripe: use "Change regions or plan" above, enter the card once, and it renews there from then on.</small></p>
					{:else}
						<p class="acct-value">No payment method on file.<small>Subscribe above to add one.</small></p>
					{/if}
				</div>

				{#if sub?.live && sub.stripe}
					<div class="acct-field" style="margin-top:1.5rem">
						<span class="acct-label">Cancel subscription</span>
						{#if sub.cancel_at_period_end}
							<p class="acct-value">Your subscription is set to end on {sub.current_period_end ? fmtDay(sub.current_period_end, 'long') : 'the period end'}.<small>Nothing more will be charged. Change your mind any time before then.</small></p>
							<form method="POST" action="?/resume" use:enhance><button type="submit" class="acct-btn alt" style="margin-top:.75rem">Keep my subscription</button></form>
						{:else if cancelOpen}
							<p class="acct-value">End your subscription at the end of the current period?<small>You keep full access until {sub.current_period_end ? fmtDay(sub.current_period_end, 'long') : 'the period end'}. After that, searching still works but property details, favourites and reports are locked until you subscribe again.{#if data.children.length} Your {data.children.length} additional user{data.children.length === 1 ? '' : 's'} lose access at the same time.{/if}</small></p>
							<div class="acct-actions" style="margin-top:.75rem">
								<form method="POST" action="?/cancel" use:enhance={() => { return async ({ update }) => { cancelOpen = false; await update(); }; }}><button type="submit" class="acct-btn danger">Yes, cancel at period end</button></form>
								<button type="button" class="acct-btn alt" onclick={() => (cancelOpen = false)}>Keep it</button>
							</div>
						{:else}
							<p class="acct-value"><small>Stops the next renewal. Access continues until the end of what you've already paid for.</small></p>
							<button type="button" class="acct-mini bad" style="margin-top:.5rem" onclick={() => (cancelOpen = true)}>Cancel subscription…</button>
						{/if}
					</div>
				{/if}
				{/if}

			{:else if open === 'users'}
				{#if form?.childError}<div class="acct-note bad" role="alert">{form.childError}</div>{/if}
				{#if form?.childAdded}<div class="acct-note ok">{form.childAdded} has been added. They'll get an email with a link to choose their password.</div>{/if}
				{#if form?.childRemoved}<div class="acct-note ok">User removed. Their access ended and your seat count has been updated.</div>{/if}
				{#if form?.inviteSent}<div class="acct-note ok">Invitation sent again.</div>{/if}
				<div class="acct-tiles three">
					<div class="acct-tile"><p class="spec">Users</p><p class="v">{data.children.length + 1}</p><p class="n">you + {data.children.length} additional</p></div>
					<div class="acct-tile"><p class="spec">Per user</p><p class="v">{currentUnit != null ? `$${currentUnit.toLocaleString('en-AU')}` : '—'}</p><p class="n">{currentUnit != null ? `per ${data.plan.interval} · ${data.plan.current.length} region${data.plan.current.length === 1 ? '' : 's'}` : 'no plan'}</p></div>
					<div class="acct-tile"><p class="spec">Total</p><p class="v">{currentUnit != null ? `$${(currentUnit * (data.children.length + 1)).toLocaleString('en-AU')}` : '—'}</p><p class="n">{currentUnit != null ? `per ${data.plan.interval}` : 'no plan'}</p></div>
				</div>
				<p class="acct-value" style="margin-top:1rem"><small>Additional users log in with their own email and password and share your regions and plan. Each one is a seat on your subscription at the same per-user price, prorated from the day they're added.</small></p>

				{#if data.children.length}
					<table class="acct-table" style="margin-top:1rem">
						<thead><tr><th>User</th><th>Status</th><th>Last login</th><th></th></tr></thead>
						<tbody>
							{#each data.children as c (c.id)}
								<tr>
									<td><span class="acct-value">{[c.first_name, c.last_name].filter(Boolean).join(' ') || c.email}<small>{c.email}</small></span></td>
									<td class="muted">{c.last_login_at ? 'active' : 'invited'}</td>
									<td class="muted">{c.last_login_at ? fmtDay(c.last_login_at) : `added ${fmtDay(c.created_at)}`}</td>
									<td class="acts">
										{#if !c.last_login_at}<form method="POST" action="?/resendInvite" use:enhance><input type="hidden" name="id" value={c.id} /><button type="submit" class="acct-mini muted">Resend invite</button></form>{/if}
										<form method="POST" action="?/removeChild" use:enhance={({ cancel }) => { if (!confirm(`Remove ${c.email}? Their access ends immediately.`)) cancel(); return async ({ update }) => update(); }}><input type="hidden" name="id" value={c.id} /><button type="submit" class="acct-mini bad">Remove</button></form>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				{/if}

				<div class="acct-field" style="margin-top:1.5rem">
					<span class="acct-label">Add a user</span>
					{#if !sub?.live}
						<p class="acct-value"><small>Start or renew your subscription under Billing before adding users.</small></p>
					{:else if !sub.stripe}
						<p class="acct-value"><small>Additional users are billed through Stripe. Move your subscription to Stripe under Billing (Change regions or plan) first.</small></p>
					{:else if data.children.length + 1 >= data.plan.maxSeats}
						<p class="acct-value"><small>An account can have at most {data.plan.maxSeats} users. Email info@urbanprospects.com.au for more.</small></p>
					{:else}
						<form method="POST" action="?/addChild" class="acct-form wide" use:enhance={() => { childBusy = true; return async ({ update }) => { childBusy = false; await update(); }; }}>
							<div class="acct-grid three">
								<div><label class="acct-label" for="c-first">First name</label><input id="c-first" class="acct-input" name="first_name" maxlength="100" /></div>
								<div><label class="acct-label" for="c-last">Last name</label><input id="c-last" class="acct-input" name="last_name" maxlength="100" /></div>
								<div><label class="acct-label" for="c-email">Email</label><input id="c-email" class="acct-input" type="email" name="email" required /></div>
							</div>
							<p class="acct-value" style="margin-top:.75rem"><small>{currentUnit != null ? `Adds $${currentUnit.toLocaleString('en-AU')} per ${data.plan.interval} to your subscription, prorated for the current period and charged to your card now.` : ''}</small></p>
							<div class="acct-actions" style="margin-top:.75rem"><button type="submit" class="acct-btn" disabled={childBusy || !data.billing.stripe}>{childBusy ? 'Adding…' : 'Add user'}</button></div>
						</form>
					{/if}
				</div>

			{:else if open === 'template'}
				<form method="POST" action="?/template" use:enhance class="acct-form wide">
					{#if form?.templateError}<div class="acct-note bad" role="alert">{form.templateError}</div>{/if}
					{#if form?.templateSaved}<div class="acct-note ok">Email template saved.</div>{/if}
					<p class="acct-value" style="margin-bottom:1rem"><small>The email the app drafts when you contact a property owner from a search result or My Fav. Placeholders are filled in per property.</small></p>
					<div class="acct-field"><span class="acct-label">From</span>
						<div class="acct-grid">
							<input class="acct-input" name="from_first_name" placeholder="First name" value={data.template.from_first_name} />
							<input class="acct-input" name="from_last_name" placeholder="Last name" value={data.template.from_last_name} />
						</div>
					</div>
					<div class="acct-field"><input class="acct-input" name="from_company_name" placeholder="Company name" value={data.template.from_company_name} /></div>
					<div class="acct-field">
						<div class="acct-grid">
							<input class="acct-input" name="from_address_1" placeholder="Address 1" value={data.template.from_address_1} />
							<input class="acct-input" name="from_address_2" placeholder="Address 2" value={data.template.from_address_2} />
						</div>
					</div>
					<div class="acct-field">
						<div class="acct-grid three">
							<input class="acct-input" name="from_city" placeholder="City" value={data.template.from_city} />
							<select class="acct-input" name="from_state">{#each STATES as st (st)}<option value={st} selected={st === data.template.from_state}>{st}</option>{/each}</select>
							<input class="acct-input" name="from_postcode" placeholder="Postcode" value={data.template.from_postcode} inputmode="numeric" />
						</div>
					</div>
					<div class="acct-field" style="margin-top:1.25rem"><span class="acct-label">Message</span>
						<div class="acct-editor">
							<div class="acct-toolbar">
								{#each TOOLS as t (t.label)}
									<button type="button" class="acct-tool" class:on={tick >= 0 && !!editor && t.on(editor)} title={t.label} aria-label={t.label} disabled={!editor} onclick={() => editor && t.act(editor)}>{t.glyph}</button>
								{/each}
								<span class="sp"></span>
								{#each PLACEHOLDERS as ph (ph)}
									<button type="button" class="acct-tool ph" title="Insert {ph}" disabled={!editor} onclick={() => insertPlaceholder(ph)}>{ph.replace(/[{}]/g, '').split('.')[1].replace('_', ' ')}</button>
								{/each}
							</div>
							<div class="acct-editor-body" bind:this={editorEl}></div>
						</div>
					</div>
					<input type="hidden" name="template" value={templateHtml} />
					<button type="submit" class="acct-btn" style="margin-top:1.25rem" disabled={!editor}>Save template</button>
				</form>

			{:else if open === 'password'}
				<form method="POST" action="?/password" use:enhance class="acct-form">
					{#if form?.error}<div class="acct-note bad" role="alert">{form.error}</div>{/if}
					{#if form?.changed}<div class="acct-note ok">Password updated.</div>{/if}
					<div class="acct-field"><label class="acct-label" for="current">Current password</label><input class="acct-input" id="current" name="current" type="password" autocomplete="current-password" required /></div>
					<div class="acct-field"><label class="acct-label" for="next">New password</label><input class="acct-input" id="next" name="next" type="password" autocomplete="new-password" minlength="10" required placeholder="At least 10 characters" /></div>
					<div class="acct-field"><label class="acct-label" for="confirm">Confirm new password</label><input class="acct-input" id="confirm" name="confirm" type="password" autocomplete="new-password" minlength="10" required /></div>
					<button type="submit" class="acct-btn" style="margin-top:1.25rem">Update password</button>
				</form>
			{/if}
		</div>
	</section>
</div>
