<script lang="ts">
	import { page } from '$app/state';
	import { base } from '$app/paths';
	import Logo from '$lib/components/Logo.svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import '$lib/console.css';
	let { data, children } = $props();

	const NAV = [
		{ href: '/admin/', label: 'Dashboard' },
		{ href: '/admin/users/', label: 'Users' },
		{ href: '/admin/subscriptions/', label: 'Subscriptions' }
	];
	const current = (href: string) =>
		href === '/admin/' ? page.url.pathname === href : page.url.pathname.startsWith(href);
</script>

<svelte:head>
	<title>Admin — Urban Prospects</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="adm-shell">
	<nav class="adm-rail" aria-label="Admin">
		<a href="{base}/admin/" class="flex items-center gap-2 px-2"><span class="inline-block h-6 w-auto [&_img]:h-6 [&_img]:w-auto [&_svg]:h-6 [&_svg]:w-auto"><Logo /></span><span class="spec text-[9px] text-[var(--color-neutral-400)]">Admin</span></a>
		<ul class="mt-6 space-y-0.5">
			{#each NAV as item (item.href)}
				<li><a href="{base}{item.href}" aria-current={current(item.href) ? 'page' : undefined} class="adm-navlink">{item.label}</a></li>
			{/each}
		</ul>
		<p class="mt-6 border-t border-[var(--color-line)] px-2 pt-3 text-[11px] leading-snug text-[var(--color-neutral-400)]">
			<span class="spec block text-[9px] text-[var(--accent-teal-text)]">Source of truth</span>
			Stripe owns billing state. Edits here change what the app grants, not what Stripe charges.
		</p>
		<div class="mt-auto space-y-3 px-2 pt-4">
			<div class="border-t border-[var(--color-line)] pt-3">
				<p class="truncate text-[12px] text-[var(--fg)]">{data.user.display_name ?? data.user.email}</p>
				<p class="truncate text-[11px] text-[var(--color-neutral-400)]">{data.user.email}</p>
			</div>
			<div class="flex items-center justify-between gap-3">
				<ThemeToggle />
				<form method="POST" action="{base}/logout/"><button type="submit" class="adm-navlink">Log out</button></form>
			</div>
		</div>
	</nav>
	<div class="min-w-0 flex-1">
		<nav class="adm-topbar">
			{#each NAV as item (item.href)}
				<a href="{base}{item.href}" aria-current={current(item.href) ? 'page' : undefined} class="adm-navlink text-[12px]">{item.label}</a>
			{/each}
		</nav>
		{@render children()}
	</div>
</div>
