<script lang="ts">
	import { onMount } from 'svelte';

	type Pref = 'system' | 'light' | 'dark';
	let pref = $state<Pref>('system');
	let mq: MediaQueryList | undefined;

	function resolve(p: Pref) {
		const dark = p === 'dark' || (p === 'system' && !!mq?.matches);
		document.documentElement.dataset.theme = dark ? 'dark' : 'light';
	}
	function set(p: Pref) {
		pref = p;
		try {
			localStorage.setItem('theme', p);
		} catch {}
		resolve(p);
	}

	onMount(() => {
		mq = window.matchMedia('(prefers-color-scheme: dark)');
		try {
			pref = (localStorage.getItem('theme') as Pref) || 'system';
		} catch {}
		const onChange = () => pref === 'system' && resolve('system');
		mq.addEventListener('change', onChange);
		return () => mq?.removeEventListener('change', onChange);
	});

	const opts: { p: Pref; label: string }[] = [
		{ p: 'system', label: 'System theme' },
		{ p: 'light', label: 'Light theme' },
		{ p: 'dark', label: 'Dark theme' }
	];
</script>

<div
	class="inline-flex items-center gap-0.5 rounded-full border border-[var(--color-line)] p-0.5"
	role="group"
	aria-label="Theme"
>
	{#each opts as o}
		<button
			onclick={() => set(o.p)}
			title={o.label}
			aria-label={o.label}
			aria-pressed={pref === o.p}
			class="grid h-6 w-6 place-items-center rounded-full transition-colors {pref === o.p
				? 'bg-[var(--fg)]/10 text-[var(--fg)]'
				: 'text-[var(--color-neutral-500)] hover:text-[var(--fg)]'}"
		>
			{#if o.p === 'system'}
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-3.5 w-3.5" aria-hidden="true">
					<rect x="2" y="3" width="20" height="14" rx="2" />
					<path d="M8 21h8M12 17v4" />
				</svg>
			{:else if o.p === 'light'}
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-3.5 w-3.5" aria-hidden="true">
					<circle cx="12" cy="12" r="4" />
					<path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
				</svg>
			{:else}
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-3.5 w-3.5" aria-hidden="true">
					<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
				</svg>
			{/if}
		</button>
	{/each}
</div>
