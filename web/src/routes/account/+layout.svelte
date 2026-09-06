<script lang="ts">
	import { base } from '$app/paths';
	import Logo from '$lib/components/Logo.svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import '$lib/console.css';
	let { data, children } = $props();
	const u = $derived(data.user);

	const NAV = $derived([
		{ href: '/account/', label: 'My account', current: true },
		{ href: '/app/', label: 'Open the app', current: false },
		...(u.role === 'administrator' ? [{ href: '/admin/', label: 'Admin console', current: false }] : [])
	]);
</script>

<svelte:head>
	<title>Account — Urban Prospects</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="adm-shell">
	<nav class="adm-rail" aria-label="Account">
		<a href="{base}/" class="flex items-center gap-2 px-2"><span class="inline-block h-6 w-auto [&_img]:h-6 [&_img]:w-auto [&_svg]:h-6 [&_svg]:w-auto"><Logo /></span><span class="spec text-[9px] text-[var(--color-neutral-400)]">Account</span></a>
		<ul class="mt-6 space-y-0.5">
			{#each NAV as item (item.href)}
				<li><a href="{base}{item.href}" aria-current={item.current ? 'page' : undefined} class="adm-navlink">{item.label}</a></li>
			{/each}
		</ul>
		<div class="mt-auto space-y-3 px-2 pt-4">
			<div class="border-t border-[var(--color-line)] pt-3">
				<p class="truncate text-[12px] text-[var(--fg)]">{[u.first_name, u.last_name].filter(Boolean).join(' ') || u.email}</p>
				<p class="truncate text-[11px] text-[var(--color-neutral-400)]">{u.email}</p>
			</div>
			<div class="flex items-center justify-between gap-3">
				<ThemeToggle />
				<form method="POST" action="{base}/logout/"><button type="submit" class="spec text-[9px] text-[var(--color-neutral-400)] hover:text-[var(--fg)]">Log out</button></form>
			</div>
		</div>
	</nav>
	<div class="min-w-0 flex-1">
		<nav class="adm-topbar">
			{#each NAV as item (item.href)}
				<a href="{base}{item.href}" aria-current={item.current ? 'page' : undefined} class="adm-navlink text-[12px]">{item.label}</a>
			{/each}
			<form method="POST" action="{base}/logout/" class="ml-auto"><button type="submit" class="adm-navlink text-[12px]">Log out</button></form>
		</nav>
		{@render children()}
	</div>
</div>
