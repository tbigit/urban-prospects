<script lang="ts">
	// /account/ dresses like the property app's map view: one frosted "search
	// panel" on the left holding the account sections and a detail panel on the
	// right (the app's property panel), on the plain page ground. No marketing
	// header/footer, no admin rail; the theme toggle sits in the bottom-right
	// corner exactly where the app keeps it.
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import '$lib/account.css';
	let { children } = $props();
</script>

<svelte:head>
	<title>Account — Urban Prospects</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="acct">
	{@render children()}
	<div class="acct-corner"><ThemeToggle /></div>
</div>
