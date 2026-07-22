<script lang="ts">
	// Real brand lockup (no SVG source exists yet — embedding the PNG pair
	// directly). Two pre-rendered variants swapped by a pure CSS display
	// toggle keyed off data-theme: works before hydration since the pre-paint
	// script in app.html sets data-theme before first paint.
	import { base } from '$app/paths';
	let { height = 30 }: { height?: number } = $props();
</script>

<img
	src="{base}/urban-propspects-logo-white.png"
	alt="Urban Prospects"
	style="height:{height}px"
	class="logo-mark logo-white"
/>
<img
	src="{base}/urban-propspects-logo-black.png"
	alt="Urban Prospects"
	style="height:{height}px"
	class="logo-mark logo-black"
/>

<style>
	.logo-mark {
		display: block;
		width: auto;
	}
	.logo-black {
		display: none;
	}
	:global(:root[data-theme='light']) .logo-white {
		display: none;
	}
	:global(:root[data-theme='light']) .logo-black {
		display: block;
	}
</style>
