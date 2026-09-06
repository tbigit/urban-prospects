<script lang="ts">
	// Renders a migrated article body. The content arrives as a flat list of
	// pre-sanitised blocks (see src/lib/content/index.ts) rather than one HTML
	// blob so images can be given the site's own frame instead of inheriting
	// whatever the page builder wrapped them in.
	import type { Block } from '$lib/content';
	import { base } from '$app/paths';

	let { body }: { body: Block[] } = $props();

	// A "Glossary" h2 and everything up to the next h2 collapse into a
	// <details>, so the term list doesn't add a screen of height to the read.
	type Group = { t: 'block'; b: Block } | { t: 'glossary'; title: string; blocks: Block[] };
	const isH2 = (b: Block) => b.t === 'html' && /^\s*<h2[\s>]/i.test(b.html);
	const h2Text = (b: Block) =>
		b.t === 'html' ? b.html.replace(/<[^>]+>/g, '').trim() : '';

	const groups = $derived.by(() => {
		const out: Group[] = [];
		let i = 0;
		while (i < body.length) {
			const b = body[i];
			if (isH2(b) && /^glossary$/i.test(h2Text(b))) {
				const blocks: Block[] = [];
				let j = i + 1;
				while (j < body.length && !isH2(body[j])) blocks.push(body[j++]);
				out.push({ t: 'glossary', title: h2Text(b), blocks });
				i = j;
			} else {
				out.push({ t: 'block', b });
				i++;
			}
		}
		return out;
	});
</script>

{#snippet block(b: Block)}
	{#if b.t === 'img'}
		<figure>
			<img src="{base}{b.src}" alt={b.alt} loading="lazy" decoding="async" />
			{#if b.caption}<figcaption>{b.caption}</figcaption>{/if}
		</figure>
	{:else}
		{@html b.html}
	{/if}
{/snippet}

<div class="prose">
	{#each groups as g, i (i)}
		{#if g.t === 'glossary'}
			<details class="glossary">
				<summary>
					<span>{g.title}</span>
					<svg
						viewBox="0 0 24 24"
						width="16"
						height="16"
						fill="none"
						stroke="currentColor"
						stroke-width="2.25"
						stroke-linecap="round"
						stroke-linejoin="round"
						aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg
					>
				</summary>
				<div class="glossary-body">
					{#each g.blocks as b, k (k)}
						{@render block(b)}
					{/each}
				</div>
			</details>
		{:else}
			{@render block(g.b)}
		{/if}
	{/each}
</div>

<style>
	/* Article typography. Scoped-global because the body is injected with
	   {@html}, so Svelte's scoping attribute never lands on those elements. */
	.prose {
		font-size: 16.5px;
		line-height: 1.75;
		color: var(--color-neutral-300);
	}
	.prose :global(p) {
		margin: 0 0 1.25em;
	}
	.prose :global(h2) {
		margin: 2.6em 0 0.7em;
		font-size: 23px;
		line-height: 1.25;
		font-weight: 600;
		letter-spacing: -0.02em;
		color: var(--fg);
	}
	.prose :global(h3) {
		margin: 2.1em 0 0.6em;
		font-size: 18px;
		line-height: 1.35;
		font-weight: 600;
		letter-spacing: -0.01em;
		color: var(--fg);
	}
	.prose :global(:is(h2, h3):first-child) {
		margin-top: 0;
	}
	.prose :global(ul),
	.prose :global(ol) {
		margin: 0 0 1.35em;
		padding-left: 1.35em;
	}
	.prose :global(ul) {
		list-style: none;
		padding-left: 0;
	}
	.prose :global(ol) {
		list-style: decimal;
	}
	.prose :global(li) {
		margin: 0 0 0.6em;
	}
	.prose :global(ul > li) {
		position: relative;
		padding-left: 1.5em;
	}
	/* Teal marker rather than a disc — the same accent the checklists and stat
	   numbers use elsewhere on the site. */
	.prose :global(ul > li::before) {
		content: '';
		position: absolute;
		top: 0.62em;
		left: 0.25em;
		width: 5px;
		height: 5px;
		border-radius: 999px;
		background: var(--color-brand-teal);
	}
	.prose :global(strong) {
		font-weight: 600;
		color: var(--fg);
	}
	.prose :global(a) {
		color: var(--fg);
		text-decoration: underline;
		text-underline-offset: 3px;
		text-decoration-color: color-mix(in srgb, var(--color-brand-teal) 60%, transparent);
		transition: text-decoration-color 0.15s ease;
	}
	.prose :global(a:hover) {
		text-decoration-color: var(--color-brand-teal);
	}
	.prose :global(blockquote) {
		margin: 1.8em 0;
		padding: 0.2em 0 0.2em 1.4em;
		border-left: 2px solid var(--color-brand-teal);
		color: var(--fg);
	}
	.prose :global(figure) {
		margin: 2.2em 0;
	}
	.prose :global(img) {
		display: block;
		width: 100%;
		height: auto;
		border-radius: 12px;
		border: 1px solid var(--color-line);
	}
	/* Collapsible glossary. The summary is styled as the h2 it replaces so
	   the article's heading rhythm holds whether it's open or closed. */
	.glossary {
		margin: 2.6em 0 1.6em;
		border-top: 1px solid var(--color-line);
		border-bottom: 1px solid var(--color-line);
	}
	.glossary summary {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1em;
		padding: 1em 0;
		cursor: pointer;
		list-style: none;
		font-size: 23px;
		line-height: 1.25;
		font-weight: 600;
		letter-spacing: -0.02em;
		color: var(--fg);
	}
	.glossary summary::-webkit-details-marker {
		display: none;
	}
	.glossary summary svg {
		flex: none;
		color: var(--color-neutral-500);
		transition: transform 0.2s ease;
	}
	.glossary[open] summary svg {
		transform: rotate(180deg);
	}
	.glossary-body {
		padding-bottom: 0.4em;
	}
	.prose :global(figcaption) {
		margin-top: 0.8em;
		font-size: 13.5px;
		line-height: 1.55;
		color: var(--color-neutral-500);
	}
	.prose :global(table) {
		width: 100%;
		margin: 1.8em 0;
		border-collapse: collapse;
		font-size: 15px;
	}
	.prose :global(:is(td, th)) {
		padding: 0.7em 0.9em;
		border: 1px solid var(--color-line);
		text-align: left;
	}
	.prose :global(th) {
		font-weight: 600;
		color: var(--fg);
		background: var(--color-subtle);
	}
</style>
