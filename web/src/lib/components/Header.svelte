<script lang="ts">
	// Floating frosted-glass pill nav — one continuous rounded capsule (logo,
	// links, auth actions all inside it), not a full-width bar. Reuses the
	// .glass liquid-glass utility from app.css so it picks up the same
	// backdrop-frost + rim-light treatment as the rest of the site.
	import Button from './ui/button.svelte';
	import Logo from './Logo.svelte';

	let mobileOpen = $state(false);
	let toggleBtn: HTMLButtonElement;

	// Absolute (/#id, not bare #id) so these resolve correctly when rendered
	// via the shared layout on other routes (e.g. /demo), not just on "/".
	const nav = [
		{ href: '/#platform', label: 'Platform' },
		{ href: '/#services', label: 'Services' },
		{ href: '/#data-apis', label: 'Data APIs' },
		{ href: '/#about', label: 'About' },
		{ href: '/#insights', label: 'Insights' }
	];

	function closeMobile() {
		mobileOpen = false;
	}
	// Escape is the conventional way to dismiss an open disclosure/menu —
	// unlike a link click (which hands focus off to wherever navigation goes),
	// dismissing without navigating should return focus to a predictable spot.
	function onKeydown(e: KeyboardEvent) {
		if (mobileOpen && e.key === 'Escape') {
			mobileOpen = false;
			toggleBtn?.focus();
		}
	}
</script>

<svelte:window onkeydown={onKeydown} />

<header class="fixed inset-x-0 top-4 z-50 flex flex-col items-center px-4 sm:top-5">
	<div
		class="glass flex w-full max-w-[900px] items-center justify-between gap-1 rounded-full py-2 pr-2 pl-4 sm:pl-5"
	>
		<a href="/" class="flex shrink-0 items-center" onclick={closeMobile}>
			<Logo height={26} />
		</a>

		<nav class="hidden items-center gap-0.5 text-[13px] md:flex" aria-label="Primary">
			{#each nav as n (n.href)}
				<a
					href={n.href}
					class="rounded-full px-3 py-1.5 text-[var(--color-neutral-400)] transition-colors hover:text-[var(--fg)]"
				>
					{n.label}
				</a>
			{/each}
		</nav>

		<div class="hidden items-center gap-1 sm:flex">
			<a
				href="/login"
				class="rounded-full px-3 py-1.5 text-[13px] text-[var(--color-neutral-400)] transition-colors hover:text-[var(--fg)]"
			>
				Log In
			</a>
			<Button href="/signup" variant="teal" size="sm" class="rounded-full">Start Free Trial</Button>
		</div>

		<button
			bind:this={toggleBtn}
			type="button"
			class="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[var(--fg)] transition-colors hover:bg-[var(--fg)]/[0.08] md:hidden"
			onclick={() => (mobileOpen = !mobileOpen)}
			aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
			aria-expanded={mobileOpen}
		>
			{#if mobileOpen}
				<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
			{:else}
				<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
			{/if}
		</button>
	</div>

	{#if mobileOpen}
		<div class="glass mt-2 w-full max-w-[900px] rounded-3xl p-3 md:hidden">
			<nav class="flex flex-col" aria-label="Primary">
				{#each nav as n (n.href)}
					<a
						href={n.href}
						onclick={closeMobile}
						class="rounded-xl px-3 py-2.5 text-[14px] text-[var(--color-neutral-300)] transition-colors hover:bg-[var(--fg)]/[0.06] hover:text-[var(--fg)]"
					>
						{n.label}
					</a>
				{/each}
			</nav>
			<div class="mt-2 flex items-center gap-2 border-t border-[var(--color-line)] pt-3">
				<Button href="/login" size="sm" class="flex-1 rounded-full" onclick={closeMobile}
					>Log In</Button
				>
				<Button href="/signup" variant="teal" size="sm" class="flex-1 rounded-full" onclick={closeMobile}
					>Start Free Trial</Button
				>
			</div>
		</div>
	{/if}
</header>
