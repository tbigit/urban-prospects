<script lang="ts" module>
	import { tv, type VariantProps } from 'tailwind-variants';

	export const buttonVariants = tv({
		base: 'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-purple)]/40 disabled:pointer-events-none disabled:opacity-50',
		variants: {
			variant: {
				// text-[#f6f4fa], not Tailwind's theme-reactive text-white: the brand-purple
				// fill is constant across themes, but --color-white inverts to near-black ink
				// in light mode (app.css's anchor-swap trick), which would make this text
				// nearly invisible on the still-dark purple background in light mode.
				default:
					'bg-[var(--color-brand-purple)] text-[#f6f4fa] hover:bg-[var(--color-brand-purple-600)]',
				teal: 'bg-[var(--color-brand-teal)] text-[#0a0710] font-semibold hover:bg-[var(--color-brand-teal-600)]',
				outline:
					'border border-[var(--color-line)] bg-transparent text-[var(--fg)] hover:bg-[var(--fg)]/[0.06] hover:border-[var(--color-neutral-500)]',
				ghost: 'text-[var(--fg)] hover:bg-[var(--fg)]/[0.06]',
				link: 'text-[var(--fg)] underline-offset-4 hover:underline'
			},
			size: {
				sm: 'h-8 rounded-md px-3 text-[13px]',
				default: 'h-9 px-4 py-2',
				lg: 'h-11 rounded-md px-6 text-[15px]'
			}
		},
		defaultVariants: { variant: 'default', size: 'default' }
	});

	export type ButtonVariant = VariantProps<typeof buttonVariants>['variant'];
	export type ButtonSize = VariantProps<typeof buttonVariants>['size'];
</script>

<script lang="ts">
	import { cn } from '$lib/utils';
	import type { Snippet } from 'svelte';

	let {
		variant = 'default',
		size = 'default',
		href = undefined,
		class: className = '',
		children,
		...rest
	}: {
		variant?: ButtonVariant;
		size?: ButtonSize;
		href?: string;
		class?: string;
		children?: Snippet;
		[key: string]: unknown;
	} = $props();
</script>

{#if href}
	<a {href} class={cn(buttonVariants({ variant, size }), className)} {...rest}>
		{@render children?.()}
	</a>
{:else}
	<button class={cn(buttonVariants({ variant, size }), className)} {...rest}>
		{@render children?.()}
	</button>
{/if}
