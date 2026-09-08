<script lang="ts">
	// Rebuild of the WordPress /faq page (indexed before the 2026-09-08 cutover).
	// The 16 questions and answers are carried over from that page — the source
	// was an Elementor accordion, so only the copy survives, lightly corrected
	// for typos and for the email address the old theme had obfuscated away.
	// Rendered as native <details> so the answers are in the HTML for crawlers
	// and work with JS off; the FAQPage JSON-LD below mirrors the same array.
	import PageHeader from '$lib/components/PageHeader.svelte';
	import Reveal from '$lib/components/Reveal.svelte';
	import TrialCta from '$lib/components/TrialCta.svelte';

	type Faq = { q: string; a: string[] };

	const faqs: Faq[] = [
		{
			q: 'What is Urban Prospects designed for?',
			a: [
				'Urban Prospects is ideal for property developers, town planners, real estate professionals and buyers’ agents who want a strategic edge in site acquisition and planning.'
			]
		},
		{
			q: 'How does Urban Prospects offer a competitive edge?',
			a: [
				'By giving users access to 100% of NSW properties, developers can directly approach property owners for off-market acquisitions, reducing acquisition costs and avoiding bidding wars.'
			]
		},
		{
			q: 'How easy is it to use Urban Prospects?',
			a: [
				'Our platform is designed to be user-friendly, requiring only a basic understanding of property to navigate effectively.'
			]
		},
		{
			q: 'How does Urban Prospects save me time?',
			a: [
				'Our comprehensive search engine and sophisticated filtering rules streamline the process of finding suitable sites for land development, saving you valuable time.'
			]
		},
		{
			q: 'Is Urban Prospects cost-effective?',
			a: [
				'Yes. We offer a cost-effective solution without unnecessary features for finding the right sites, ensuring you only pay for what you need.'
			]
		},
		{
			q: 'Has Urban Prospects been tested?',
			a: [
				'Yes. It has been trialled extensively with clients of Urban Perspectives, uncovering hidden development opportunities and streamlining decision-making.'
			]
		},
		{
			q: 'Do I need to create an account?',
			a: [
				'To set up your account you will require an email address and credit card. We will also ask for your name, address and phone number in case we need to contact you about your account. You will be asked to create a password for the account.'
			]
		},
		{
			q: 'Once I have created an account, are properties from past searches automatically updated if the planning controls for that site change?',
			a: [
				'The data is continually updated in a cycle. It takes approximately 3 months to complete the data update and then the process repeats itself. If property information from one of our sources changes shortly after our update cycle is completed, then that change will not be in the Urban Prospects data bank for 3 months.'
			]
		},
		{
			q: 'Can I receive alerts for new property listings?',
			a: [
				'Yes. You can bookmark properties of interest and you will automatically be notified when they become available for sale.'
			]
		},
		{
			q: 'What area of land can I search?',
			a: ['Urban Prospects includes all registered land titles within New South Wales, Australia.']
		},
		{
			q: 'Does Urban Prospects identify sites suitable for Complying Development Certificates (CDC)?',
			a: [
				'Yes. Urban Prospects can currently identify sites suitable for obtaining a CDC for dual occupancies, effectively bypassing council and fast-tracking development. We will expand this to include sites suitable for other CDC types.'
			]
		},
		{
			q: 'Where is the data sourced from?',
			a: [
				'Planning data is primarily sourced from the NSW Department of Planning ePlanning services. Property data is sourced from NSW Land and Property Information Services. Urban Prospects acts as a reseller of Title Deeds and Dealings for Hazlett, a registered broker with NSW Land Registry Services. Sales and construction data is provided by various private providers, and Urban Prospects collects some data itself.'
			]
		},
		{
			q: 'What happens if I purchase a title search or survey plan while NSW Land Registry Services (LRS) is not operating?',
			a: [
				'Maintenance is scheduled to occur outside normal business hours in NSW, and Urban Prospects will notify you when maintenance is scheduled.',
				'Hazlett are our broker for title searches and survey plans. When you purchase title searches or survey plans you should receive them almost immediately. However, if Hazlett’s or LRS’ services are not operating when you purchase, Hazlett will queue your request and send it to you once the service is operating again.',
				'If you have not received your purchase by the next business day, please email support@urbanprospects.com.au or call 02 8071 4591.'
			]
		},
		{
			q: 'How is Urban Prospects evolving with user feedback?',
			a: [
				'Urban Prospects actively incorporates user feedback through presentations, demos and consultations, and through an Industry Reference Group that guides ongoing improvements.'
			]
		},
		{
			q: 'What additional features could be provided in the future?',
			a: [
				'We work to continually improve Urban Prospects, and we encourage you to sign up to our newsletter to keep up to date. Current enhancements include: enhancing the map features to incorporate mapped planning layers; gradually rolling out the ability to identify sites suitable for complying development for each different development type; adding the ability to search for only corner lots, adjoining lots with the same owner, and lots within a radius of a dropped pin; and continuing to incorporate as many of the planning exceptions created by the various environmental planning instruments in NSW as possible.'
			]
		},
		{
			q: 'What is the technology and commercial roadmap for Urban Prospects?',
			a: [
				'Key initiatives include white-label reporting, new search filters for complying developments, pre-populated residual value calculators, a suburb insights and trends rollout, historic development application data integration, and predictive sales indicators based on land registry data.'
			]
		}
	];

	const faqSchema = {
		'@context': 'https://schema.org',
		'@type': 'FAQPage',
		mainEntity: faqs.map((f) => ({
			'@type': 'Question',
			name: f.q,
			acceptedAnswer: { '@type': 'Answer', text: f.a.join(' ') }
		}))
	};
</script>

<svelte:head>
	<title>FAQ | Urban Prospects</title>
	<meta
		name="description"
		content="Answers to common questions about Urban Prospects — what it searches, where the planning and property data comes from, how often it updates, CDC eligibility, accounts and title searches."
	/>
	<link rel="canonical" href="https://www.urbanprospects.com.au/faq/" />
	{@html `<script type="application/ld+json">${JSON.stringify(faqSchema)}</` + `script>`}
</svelte:head>

<PageHeader
	eyebrow="FAQ"
	title="Questions, answered."
	lede="What the platform covers, where the data comes from, and how often it changes."
/>

<section class="border-b border-[var(--color-line)]">
	<div class="mx-auto max-w-[820px] px-5 py-14 sm:py-20">
		{#each faqs as f, i (f.q)}
			<Reveal delay={Math.min(i, 6) * 40}>
				<details
					class="group border-b border-[var(--color-line)] py-5 [&_summary::-webkit-details-marker]:hidden"
				>
					<summary
						class="flex cursor-pointer list-none items-start justify-between gap-6 text-[16.5px] leading-snug font-semibold tracking-tight text-[var(--fg)] transition-colors hover:text-[var(--accent-teal-text)]"
					>
						{f.q}
						<svg
							viewBox="0 0 24 24"
							width="18"
							height="18"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							aria-hidden="true"
							class="mt-0.5 shrink-0 transition-transform duration-200 group-open:rotate-45"
						>
							<path d="M12 5v14M5 12h14" />
						</svg>
					</summary>
					{#each f.a as p (p)}
						<p class="mt-4 text-[15px] leading-relaxed text-[var(--color-neutral-300)]">{p}</p>
					{/each}
				</details>
			</Reveal>
		{/each}

		<Reveal>
			<p class="mt-10 text-[15px] leading-relaxed text-[var(--color-neutral-400)]">
				Still stuck? Email <a
					href="mailto:info@urbanprospects.com.au"
					class="text-[var(--accent-teal-text)] hover:underline">info@urbanprospects.com.au</a
				>
				or call
				<a href="tel:+61280714591" class="text-[var(--accent-teal-text)] hover:underline"
					>02 8071 4591</a
				>.
			</p>
		</Reveal>
	</div>
</section>

<TrialCta />
