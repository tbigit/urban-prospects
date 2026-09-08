<script lang="ts">
	// Rebuild of the WordPress /privacy-policy page (indexed before the
	// 2026-09-08 cutover). The legal text is carried over verbatim from that
	// page — only the WordPress page-builder markup was dropped, and the
	// headings the old theme ran together with body copy are separated out.
	// Last reviewed by the client 1 August 2024; anything that needs to change
	// is a legal decision, not a rebuild decision, so nothing was reworded.
	import PageHeader from '$lib/components/PageHeader.svelte';
	import Reveal from '$lib/components/Reveal.svelte';

	type Section = { h: string; p?: string[]; list?: string[]; after?: string[] };

	const sections: Section[] = [
		{
			h: 'What personal information we collect and store',
			p: [
				'Urban Prospects collects personal information from our clients, customers of our clients, our suppliers, employees, contractors and job applicants. The types of personal information we may collect include:'
			],
			list: [
				'Contact information, such as name, address, email address and telephone number.',
				'Business related information: personal information about the employees of our clients, suppliers, business associates and prospective business associates, including contact details, roles and responsibilities.',
				'Payment information, such as credit card or bank details.',
				'Service request information: personal information collected directly from you or from our clients that is required to provide our services to them or you — for example, information required to fulfil a request for our products and services, including but not limited to property searches and certificates.',
				'Product and services data: information from third party suppliers in connection with the services we provide you or our clients, including information such as property ownership and other property related information.',
				'Meta data: information about your usage of our products and services that may include IP addresses and contact details from automatic logging services.'
			]
		},
		{
			h: 'The purposes for which we collect, hold, use and disclose personal information',
			p: [
				'All personal information collected by Urban Prospects is solely used for our business functions and activities. It may be used for the purposes of:'
			],
			list: [
				'Responding to your requests, enquiries and/or complaints.',
				'Billing.',
				'Maintaining your account details.',
				'Providing you with our products or services that you have requested.',
				'Improving our business, products and services.',
				'Providing personal information to third parties as set out in this privacy policy.',
				'Providing you with any communications in which we think you might be interested, or which you have requested.',
				'Letting you know about developments in our procedures, products, services, activities and programs that might be useful to you.',
				'Collecting feedback and information from third parties relating to our employees, contractors and suppliers’ performance of services for or on behalf of Urban Prospects.',
				'Emergencies.'
			],
			after: [
				'Urban Prospects will take reasonable steps to ensure personal information that it keeps is accurate, up-to-date and relevant to the purposes for which it is to be used.',
				'Urban Prospects must only use or disclose your personal information to the extent necessary to comply with laws, perform Urban Prospects’ functions or exercise its rights.'
			]
		},
		{
			h: 'How we collect and securely store personal information',
			p: [
				'Personal information may be collected by Urban Prospects by way of provision of personal information by individuals via the phone, online contact forms, user-generated content, market research, emails, and during face-to-face meetings and interviews.',
				'In some circumstances, you may provide to us, and we may collect from you, personal information about a third party. Where you provide the personal information of a third party, you must ensure that the third party is aware of this privacy policy, understands it and agrees to accept it.',
				'Urban Prospects takes all reasonable steps to protect your personal information from loss, misuse or unauthorised disclosure, modification or destruction. Urban Prospects’ code of conduct and information security policies prohibit employees from looking at, recording or disclosing personal information about you except in the course of performance of their duties. Security measures include:'
			],
			list: [
				'Implementing security measures such as encryption, firewalls and secure server environments.',
				'Restricting access to personal information to authorised personnel only.',
				'Regularly reviewing and updating our security practices.'
			]
		},
		{
			h: 'How you may access and correct your personal information',
			p: [
				'Under the APPs, you may be able to obtain a copy of the personal information that we hold about you. The APPs provide some exceptions to your rights in this regard. To make a request to access this information, please contact us in writing at one of the contact addresses below. We will require you to verify your identity and specify what information you require. We may charge a fee to cover the cost of verifying the application and locating, retrieving, reviewing and copying any material requested.',
				'We endeavour to ensure that the personal information we hold about you is accurate, complete and up-to-date. Please contact Urban Prospects if you believe that the information we hold about you requires correction or is out-of-date.',
				'We will endeavour to respond to written requests within 30 business days after a request is received by us.'
			]
		},
		{
			h: 'Direct marketing',
			p: [
				'Urban Prospects will only engage in direct marketing practices in accordance with the law. You may contact support@urbanprospects.com.au at any time to request that you no longer receive any marketing information from us.'
			]
		},
		{
			h: 'Disclosure and retention of personal information',
			p: [
				'As part of providing our services, Urban Prospects may disclose your personal information to its related bodies corporate, third party partners, suppliers and contractors, banks or other financial institutions, customers, our professional advisers and our external service providers that provide services to us. In these cases, Urban Prospects expects these organisations to protect the privacy of that personal information.',
				'We may disclose your personal information if it is required or authorised by law, where disclosure is necessary to prevent a threat to life, health or safety, for Work, Health and Safety investigations, or where we are otherwise permitted by the PIPP Act, Privacy Act or other relevant legislation, or authorised by you.',
				'If you are using our products or services in the course of your employment, we may disclose your personal information or information about your usage of our products and services to your employer.',
				'Urban Prospects takes all reasonable steps to ensure that it deals with reputable entities for the purposes of securely storing personal information.',
				'Urban Prospects only retains personal information for periods required by law and/or our business operations.'
			]
		},
		{
			h: 'Website browsing and links to other websites',
			p: [
				'Accessing Urban Prospects’ websites will result in some information being logged, including the time of access, IP address and the pages that have been viewed or accessed.',
				'Our website may contain links to third party websites. We do not operate these websites and therefore are not responsible for the collection or handling of personal information by the operators of these websites.'
			]
		},
		{
			h: 'Cookies',
			p: [
				'Cookies are files with a small amount of data that are commonly used as anonymous unique identifiers. These are sent to your browser from the websites that you visit and are stored on your device’s internal memory.',
				'Our website does not use these “cookies” explicitly. However, the website may use third party code and libraries that use “cookies” to collect information and improve their services. You have the option to either accept or refuse these cookies and know when a cookie is being sent to your device. If you choose to refuse our cookies, you may not be able to use some portions of this service.'
			]
		},
		{
			h: 'Notifiable data breaches',
			p: [
				'Urban Prospects complies with the amendments to the Privacy Act, effective from 22 February 2018, in relation to notifiable data breaches, and has an updated plan to ensure compliance with those requirements, including notification of the Australian Information Commissioner and affected individuals of certain types of data breaches, and is able to promptly respond to any suspected data breaches.'
			]
		},
		{
			h: 'European Union and UK residents',
			p: [
				'If you are a resident of the European Union or the UK, then you may have rights under data protection laws in relation to the personal information we hold about you, depending on which laws are applicable (such as the European General Data Protection Regulation (GDPR) or the UK Data Protection Act 2018 (DPA)). If you are a resident of the European Union or the UK then, for the purposes of the GDPR and DPA, in addition to what is set out above, the following applies to you:'
			],
			list: [
				'Urban Prospects is a data controller and processor for the purposes of the GDPR and DPA, and by consenting to this Privacy Policy, Urban Prospects is able to process your personal information in accordance with this Privacy Policy.',
				'For personal information that we process on behalf of our clients, we do so on the instructions of the client as a controller.',
				'In providing services to you, Urban Prospects may make use of a number of automated processes using your personal information and your activity on our site as tracked by us, in order to provide more tailored and relevant services to you.'
			]
		},
		{
			h: 'Making a complaint',
			p: [
				'If you believe that Urban Prospects has breached one or more of its privacy obligations, your complaint (including a summary of the privacy concern or alleged breach and copies of any relevant documentation) shall be addressed to one of the contacts provided in the contact details below. Urban Prospects will investigate the complaint and will endeavour to respond to you within 30 business days. Urban Prospects will take immediate steps to redress proven privacy concerns or breaches.'
			]
		},
		{
			h: 'Lodging a complaint with the Australian Information Commissioner',
			p: [
				'If you do not receive a response from Urban Prospects after 30 days, or if you are not satisfied with the response, you can then lodge a complaint with the OAIC (telephone 1300 363 992, or at www.oaic.gov.au).'
			]
		},
		{
			h: 'Access to this policy',
			p: [
				'This policy can be viewed at our website at www.urbanprospects.com.au. Alternatively, you can request a copy of this policy using our contact details below.'
			]
		},
		{
			h: 'Updates',
			p: [
				'We may periodically update this policy without prior notice to you to reflect changes in our information practices or relevant laws. We will post the updated policy on this website and indicate at the top of this policy when it was last updated.'
			]
		}
	];
</script>

<svelte:head>
	<title>Privacy Policy | Urban Prospects</title>
	<meta
		name="description"
		content="How Urban Prospects collects, holds, uses and discloses personal information under the Australian Privacy Principles in the Privacy Act 1988 (Cth)."
	/>
	<link rel="canonical" href="https://www.urbanprospects.com.au/privacy-policy/" />
</svelte:head>

<PageHeader
	eyebrow="Legal"
	title="Privacy Policy"
	lede="Urban Perspectives Environmental Solutions Pty Ltd (trading as Urban Prospects), ABN 13 095 904 224."
/>

<section class="border-b border-[var(--color-line)]">
	<div class="mx-auto max-w-[820px] px-5 py-14 sm:py-20">
		<Reveal>
			<p class="text-[15px] leading-relaxed text-[var(--color-neutral-300)]">
				Urban Prospects complies with the Australian Privacy Principles (APPs) contained in the
				Privacy Act 1988 (Cth) (Privacy Act). This Privacy Policy sets out Urban Perspectives
				Environmental Solutions Pty Ltd’s privacy obligations to you and explains the types of
				personal information that we may collect, hold and use, and with whom the information is
				shared. It also sets out how you can contact us if you have any queries or concerns about
				this information.
			</p>
		</Reveal>

		{#each sections as s (s.h)}
			<Reveal>
				<h2
					class="mt-12 text-[20px] leading-snug font-semibold tracking-tight text-[var(--fg)] sm:text-[22px]"
				>
					{s.h}
				</h2>
				{#each s.p ?? [] as p (p)}
					<p class="mt-4 text-[15px] leading-relaxed text-[var(--color-neutral-300)]">{p}</p>
				{/each}
				{#if s.list}
					<ul class="mt-4 space-y-2.5">
						{#each s.list as li (li)}
							<li class="flex gap-3 text-[15px] leading-relaxed text-[var(--color-neutral-300)]">
								<span
									class="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-[var(--color-brand-teal)]"
									aria-hidden="true"
								></span>
								<span>{li}</span>
							</li>
						{/each}
					</ul>
				{/if}
				{#each s.after ?? [] as p (p)}
					<p class="mt-4 text-[15px] leading-relaxed text-[var(--color-neutral-300)]">{p}</p>
				{/each}
			</Reveal>
		{/each}

		<Reveal>
			<h2
				class="mt-12 text-[20px] leading-snug font-semibold tracking-tight text-[var(--fg)] sm:text-[22px]"
			>
				Contact us
			</h2>
			<p class="mt-4 text-[15px] leading-relaxed text-[var(--color-neutral-300)]">
				If you have any questions or concerns about this Privacy Policy or our privacy practices,
				please contact us at:
			</p>
			<ul class="mt-4 space-y-1.5 text-[15px] leading-relaxed text-[var(--color-neutral-300)]">
				<li>
					Email: <a
						href="mailto:support@urbanprospects.com.au"
						class="text-[var(--accent-teal-text)] hover:underline">support@urbanprospects.com.au</a
					>
				</li>
				<li>
					Phone: <a href="tel:+61280714591" class="text-[var(--accent-teal-text)] hover:underline"
						>02 8071 4591</a
					>
				</li>
				<li>Address: 603/88 Foveaux Street, Surry Hills NSW 2010, Australia</li>
			</ul>
			<p class="spec mt-10 text-[var(--color-neutral-500)]">
				This Privacy Policy was last updated on 1 August 2024.
			</p>
		</Reveal>
	</div>
</section>
