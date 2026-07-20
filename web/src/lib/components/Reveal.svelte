<script lang="ts">
	// Fade + blur + rise as the block scrolls into view.
	import type { Snippet } from 'svelte';

	let {
		children,
		delay = 0,
		y = 22,
		blur = 8,
		once = true,
		class: className = ''
	}: {
		children?: Snippet;
		delay?: number;
		y?: number;
		blur?: number;
		once?: boolean;
		class?: string;
	} = $props();

	let el: HTMLElement;
	let shown = $state(false);

	$effect(() => {
		if (typeof IntersectionObserver === 'undefined') {
			shown = true;
			return;
		}
		const io = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) {
					shown = true;
					if (once) io.disconnect();
				} else if (!once) {
					shown = false;
				}
			},
			{ threshold: 0.15, rootMargin: '0px 0px -8% 0px' }
		);
		io.observe(el);
		return () => io.disconnect();
	});
</script>

<div
	bind:this={el}
	class="reveal {className}"
	class:shown
	style="--d:{delay}ms; --y:{y}px; --blur:{blur}px"
>
	{@render children?.()}
</div>

<style>
	.reveal {
		opacity: 0;
		transform: translateY(var(--y));
		filter: blur(var(--blur));
		transition:
			opacity 0.7s ease var(--d),
			transform 0.8s cubic-bezier(0.16, 1, 0.3, 1) var(--d),
			filter 0.7s ease var(--d);
		will-change: opacity, transform, filter;
	}
	.reveal.shown {
		opacity: 1;
		transform: none;
		filter: none;
		will-change: auto;
	}
	/* Blocks that contain liquid glass render visible immediately — a fading
	   .reveal is a CSS backdrop root, which blinds descendant .glass
	   backdrop-filter and makes the frost snap on when the fade ends. */
	.reveal:has(:global(.glass)) {
		opacity: 1;
		transform: none;
		filter: none;
		will-change: auto;
		transition: none;
	}
	@media (prefers-reduced-motion: reduce) {
		.reveal {
			opacity: 1;
			transform: none;
			filter: none;
			transition: none;
		}
	}
</style>
