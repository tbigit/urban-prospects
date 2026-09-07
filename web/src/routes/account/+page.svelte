<script lang="ts">
	import { enhance } from '$app/forms';
	import { base } from '$app/paths';
	import { onMount } from 'svelte';
	let { data, form } = $props();
	const u = $derived(data.user);

	type Section = 'overview' | 'keys' | 'billing' | 'template' | 'password';
	const SECTIONS: { key: Section; label: string; hash: string; title: string }[] = [
		{ key: 'overview', label: 'Overview', hash: 'overview', title: 'Overview' },
		{ key: 'keys', label: 'API keys', hash: 'api-keys', title: 'API keys' },
		{ key: 'billing', label: 'Billing', hash: 'billing', title: 'Billing' },
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
		if (form?.billingError || form?.cardSaved) open = 'billing';
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
				<div class="acct-tiles three">
					<div class="acct-tile"><p class="spec">Plan</p><p class="v">{sub?.plan ?? u.plan ?? 'None'}</p><p class="n">{sub?.subscription_status ?? 'no subscription'}</p></div>
					<div class="acct-tile"><p class="spec">Billing cycle</p><p class="v">{cycle ?? '—'}</p><p class="n">{money(sub?.payment_price ?? null) ? `${money(sub?.payment_price ?? null)} per ${cycle === 'Monthly' ? 'month' : 'year'}` : 'price on file'}</p></div>
					<div class="acct-tile"><p class="spec">Next payment</p><p class="v">{sub?.current_period_end ? fmtDay(sub.current_period_end) : '—'}</p><p class="n">{sub?.cancel_at_period_end ? 'cancels at period end' : sub?.current_period_end ? 'end of current period' : 'nothing scheduled'}</p></div>
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
						<p class="acct-value">Card on file with our previous billing provider.<small>To change the card, move your subscription to Stripe: you'll enter the new card once and it renews there from then on.</small></p>
						<a href="{base}/renew/" class="acct-btn" style="margin-top:1rem">Update card and continue</a>
					{:else}
						<p class="acct-value">No payment method on file.<small>Start a subscription to add one.</small></p>
						<a href="{base}/renew/" class="acct-btn" style="margin-top:1rem">Subscribe</a>
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
