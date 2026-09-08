<script lang="ts">
	// Rebuild of the WordPress /terms-of-use page (linked from the old footer,
	// indexed before the 2026-09-08 cutover). The text is carried over verbatim
	// from that page — only the WordPress block markup was dropped. Like the
	// privacy policy this is the client's legal copy (last updated 8 July 2024,
	// including its own typos, e.g. "Polices", "cancelled of suspended", and the
	// clause cross-references that don't line up after the numbering shifted),
	// so nothing has been reworded. Changing any of it is a legal decision.
	import { base } from '$app/paths';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import Reveal from '$lib/components/Reveal.svelte';

	type Block = { t: 'p'; text: string } | { t: 'ul'; items: string[] };
	type Section = { h: string; blocks: Block[] };

	const sections: Section[] = [
		{
			h: '',
			blocks: [
				{ t: 'p', text: 'These Terms of Use apply to the use of Urban Prospects (“Platform”). By using the Platform, you agree to be bound by these Terms of Use and all policies published by us on the Platform from time to time (“Policies”). If you do not accept these Terms of Use or any of our Policies, you must refrain from using the Platform.' },
				{ t: 'p', text: 'In these Terms of Use, the expressions “we”, “us” and “our” are a reference to URBAN PERSPECTIVES ENVIRONMENTAL SOLUTIONS PTY LTD, ABN 13 095 904 224.' },
			]
		},
		{
			h: '1. Amendments to Terms of Use',
			blocks: [
				{ t: 'p', text: 'We reserve the right to amend these Terms of Use and our Polices from time to time. We may post the amended Terms of Use or Policies on the Platform or email them to your nominated email address. Any amendment that results in the imposition of or increase in charges, your increased responsibility, or reduced service available to you will be notified in writing within thirty (30) days prior to the effective date. However, notice is not required when the amendment is necessary for legal, security or other substantive reasons, or to assist the proper delivery of the service. Our Services incorporate services provided by third party providers and such third-party services might be subject to different notice periods and other terms. Your continued use of the Platform following such notification will represent an agreement by you to be bound by the Terms of Use and Policies as amended.' },
			]
		},
		{
			h: '2. Services and Fees',
			blocks: [
				{ t: 'p', text: 'We will provide you with the services described on the Platform in accordance with these Terms of Use (“Services”). Services include information and data published on or generated or delivered through the Platform (Data).' },
				{ t: 'p', text: 'You shall pay us for the Services the fees at the rate and in the manner specified on the Platform (“Fees”) when they are due. We may change the Fees from time to time by posing updated Fees on the Platform, provided that any changes to the Fees will not apply to already pre-paid Fees during the period(s) such Fees cover.' },
				{ t: 'p', text: 'Unless otherwise described on the Platform, the Fees will be direct debited from your nominated account in advance of the billing period (for example, for annual subscriptions, the annual Fee will be charged in full at the beginning of the term). We use Pin Payments as a payment services provider. Pin Payments’ Terms of Service and Privacy Policy can be viewed on Pin Payments’ website: https://pinpayments.com.' },
				{ t: 'p', text: 'If you don’t pay the Fees when they are due for payment, without prejudice to any other right or remedy we may be entitled to under these Terms of Use or by law, we may limit your ability to use the Platform. If your payment method fails or your account is past due, we may collect fees owed using other collection mechanisms.' },
				{ t: 'p', text: 'The Fees are in Australian Dollars unless otherwise specified on the Platform or otherwise agreed by us in writing and are exclusive of GST and all taxes, duties and charges imposed or levied in in any country in connection with the supply of the Services.' },
				{ t: 'p', text: 'Our Platform and some services are provided subject to third party service providers’ terms:' },
				{ t: 'ul', items: [
					'@ Pty Ltd, ACN 104 470 340 t/as Hazlett Information Services (“Hazlett”). Hazlett’s Privacy policy and Terms of Use are located at https://secure.hazlett.com.au/Hazletts/privacy.asp',
					'Google Maps. Your use of Google Maps is subject to the Google Maps Terms of Service and Google Privacy Policy.',
					'WordPress and Woo Commerce Terms of Use are located at https://wordpress.com/tos/',
					'Data.NSW data policy is located at https://data.nsw.gov.au/data-policy',
				] },
			]
		},
		{
			h: '3. Term, subscription and restricted use',
			blocks: [
				{ t: 'p', text: 'Subject to your compliance with these Terms of Use, we grant you for the term agreed by us in writing or via Platform a right to use the subscription service purchased by you (“Term”) a limited, non-exclusive, non-sublicensable, revocable, non-transferrable right to access and use the Platform and Services, in each case, unless otherwise agreed by us in writing, solely for the personal purposes or internal purposes of your business and for strictly non-commercial use. Any rights not expressly granted herein are reserved by us and our licensors.' },
				{ t: 'p', text: 'For the avoidance of the doubt, the subscription granted under this agreement is limited to one user.' },
				{ t: 'p', text: 'Unless otherwise agreed by us in writing, at the end of the Term (or any renewal term) your subscription will for a further term(s) of the same duration as the preceding term, unless cancelled by you at any time prior to renewal date or by us in accordance with clause 12 (Termination). Such automatic renewals will be subject to our then current fees.' },
				{ t: 'p', text: 'Without limiting the foregoing, you may not without our written permission on-sell, commercialise or make available to any third parties the Data or Services (whether in its original or altered form), or provide access to the Platform.' },
			]
		},
		{
			h: '4. Accessing the Platform and User obligations',
			blocks: [
				{ t: 'p', text: 'To access and use the Platform, you must create an account. You may only create one account on the Platform.' },
				{ t: 'p', text: 'As a user of this platform you agree that you:' },
				{ t: 'ul', items: [
					'are responsible for protecting the confidentiality of your password and other login details and not sharing the same with any other persons;',
					'agree to provide current, accurate and up-to-date information about yourself (for companies this includes, without limitation, full company name, ACN and ABN);',
					'must ensure that your access to and use of the Platform, Services or Data is not illegal or prohibited by laws which apply to you and must otherwise comply with all relevant laws and regulations;',
					'will not bypass measures used to prevent or restrict access to the Platform.',
				] },
				{ t: 'p', text: 'You must notify us immediately of any unauthorised use of your account or password, or any other breach of security. You may be held liable for losses incurred by us or any other user of, or visitor to, the Platform attributable to using your password or account as a result of your failing to keep your account information secure and confidential. You must not use anyone else’s password or account at any time without our express, prior, written permission. We will not be liable for any loss or damage arising from your failure to comply with these obligations. We reserve the right to refuse any user access to the Platform if the user violates these Terms of Use or Policies, where permitted by law, or for any other reason permitted by law.' },
				{ t: 'p', text: 'Without limiting other provisions of these Terms of Use, you must not:' },
				{ t: 'ul', items: [
					'use any “deep-link”, “page-scrape”, “robot”, “spider” or other automatic device, program, algorithm or methodology, or any similar or equivalent manual process, to access, acquire, copy or monitor any portion of the Platform or any content;',
					'in any way reproduce or circumvent the navigational structure or presentation of the Platform or any of its content, to obtain or attempt to obtain any materials, documents or information through any means not purposely made available by us;',
					'attempt to gain unauthorised access to any portion or feature of the Platform, or to any of the services offered on or through it, by hacking, password “mining” or any other illegitimate means;',
					'probe, scan or test the vulnerability of the Platform or any connected network, nor breach any security or authentication measures;',
					'reverse look-up, trace or seek to trace any information on any other user of or visitor to the Platform or any other customer of us, including any account not owned by you, to its source;',
					'exploit the Platform or any service or information made available or offered by or through the Platform in any way where the purpose is to reveal any information, including but not limited to personal information, through any means not purposely made available by us, other than your own personal information, as provided for by the Platform;',
					'take any action that imposes an unreasonable or disproportionately large load on the infrastructure of the Platform;',
					'use any device, software or routine to interfere or attempt to interfere with the proper functioning of the Platform or any transaction being conducted on, or any other person’s use of, the Platform;',
					'forge headers or otherwise manipulate identifiers in order to disguise the origin of any message or communication you send to or through the Platform or any service offered on or through it;',
					'pretend that you are, or that you represent, someone else, or impersonate any other individual or entity; or',
					'resell the Platform, Services or Data;',
					'reverse engineer any of the Platform to determine any design structure, concepts or methodology behind any of them or to incorporate any of them in any other software or product or for any other purpose;',
					'interfere with or disrupt the Platform, including by transmitting any viruses, spyware, malware or any other code of a destructive or disruptive nature;',
					'create accounts with us through unauthorised means, including by using an automated device, script, bot or other similar means.',
				] },
			]
		},
		{
			h: '5. Intellectual Property Rights',
			blocks: [
				{ t: 'p', text: 'We retain at all times all title, ownership, and intellectual property rights in and to the Platform, Services and Data and any modifications thereto. You acknowledge and agree that you are given a limited, personal right (own personal or business purposes only) to use the Platform, Services and Data only for the Term and subject to your compliance with these Terms of Use.' },
				{ t: 'p', text: 'Copyright in the Platform, Services and Data (including text, graphics, logos, icons, sound recordings and software) is owned or licensed by us.' },
				{ t: 'p', text: 'If you use any of our trademarks in reference to our activities, products or services, you must include a statement attributing that trademark to us. You must not use any of our trademarks:' },
				{ t: 'ul', items: [
					'in or as the whole or part of your own trademarks;',
					'in connection with activities, products or services which are not ours;',
					'in a manner which may be confusing, misleading or deceptive;',
					'in a manner that disparages us or our information, products or services (including the Platform).',
				] },
				{ t: 'p', text: 'You must not and must not allow any third parties to:' },
				{ t: 'ul', items: [
					'duplicate, reproduce, decompile, disassemble, reverse engineer, reverse assemble, reverse compile, or otherwise attempt to derive the Platform’s source code from the object code;',
					'make your account on the Platform available by sharing password and other login details or otherwise in any form to any person;',
					'remove any copyright, trade mark or other proprietary notices from any portion of the Platform, Data or Services;',
					'modify, enhance, adapt, reproduce, store, distribute, print, display, perform, publish or create derivative works from any part of the Platform, Data or Services;',
					'make available to third parties or commercialise the Data or any information, products or services obtained from any part of the Platform or Services,',
				] },
				{ t: 'p', text: 'without our prior written permission.' },
				{ t: 'p', text: 'If you provide us with any feedback or suggestions in relation to the Platform or Services (“Feedback”), all intellectual rights in the Feedback will vest into us immediately upon receipt. You waive all moral rights you have in your content provided to us and Feedback to the fullest extent permitted by law.' },
			]
		},
		{
			h: '6. Data',
			blocks: [
				{ t: 'p', text: 'With the exception of information about you and Personal Information or Personal Data (as defined in the applicable privacy legislation) entered into the Platform by you (Your Data), the Data and any other data generated by the Platform shall remain our property. Your Data remains your property. You grant us a worldwide, limited term license to access, use, process, copy, distribute, perform, export, and display Your Data to the extent necessary to provide the Services to you.' },
				{ t: 'p', text: 'Notwithstanding the foregoing or any other provision of these Terms of Use or Policies, you acknowledge and agree that:' },
				{ t: 'ul', items: [
					'upon termination of this agreement for any reason, we may retain Your Data as required by law; and',
					'subject to our compliance with applicable privacy laws, both during the Term and following the expiry or termination of our agreement with you, we may use de-identified, anonymised or aggregated data for any purpose.',
				] },
				{ t: 'p', text: 'You represent and warrant that:' },
				{ t: 'ul', items: [
					'you have obtained all necessary consents, rights, releases and permissions to submit all Your Data to the Platform and to grant the rights granted to us in these Terms of Use; and',
					'Your Data and its submission and use pursuant to these Terms of Use will not violate any applicable laws, any third-party intellectual property, privacy, publicity or other rights, or any of your or third-party policies or terms governing Your Data.',
				] },
				{ t: 'p', text: 'You indemnify us and our related bodies corporate (and our respective officers, directors, agents, subsidiaries, joint venturers and employees) from and against any and all claims, costs, damage, loss, liability, and expense arising from any breach of this warranty.' },
			]
		},
		{
			h: '7. Privacy',
			blocks: [
				{ t: 'p', text: 'Both you and us must comply with our respective obligations under applicable data protection laws.' },
				{ t: 'p', text: 'If in the course of you using the Platform, you provide us with or we otherwise collect on your behalf or due to your use of the Platform or Servies, any personal information, you agree to the collection, transfer, storage and processing of such personal information in accordance with our Privacy Policy.' },
			]
		},
		{
			h: '8. Disclaimer',
			blocks: [
				{ t: 'p', text: 'You agree and acknowledge that:' },
				{ t: 'ul', items: [
					'All information displayed on the Platform originates from or is based on information provided by third parties, and, as such, the accuracy, completeness, quality, reliability, suitability, availability and timeliness of all data and information are dependent upon the sources of such data and information, which are outside of our control. Such information may contain nonconformities, defects, errors, or omissions and may be subject to change.',
					'The Platform, Services and information contained therein are not intended to replace professional advice (for example, financial, legal or property advice).',
					'While we take reasonable steps to ensure that the Platform and Services remain available, Platform and Services are offered on an “as is” and “as available” basis and we cannot guarantee continuous, error-free or secure access to our services or that defects in the service will be corrected. To the extent permitted by law, we expressly disclaim all warranties, representations and conditions, express or implied, including those of quality, merchantability, merchantable quality, durability, fitness for a particular purpose and those arising by statute.',
					'We do not accept liability for any losses arising directly or indirectly (from a failure to provide the Platform or Services, corruption to or loss of data, errors or interruptions, or any suspension or discontinuance of the Platform or Services. We do not accept responsibility for loss suffered as a result of reliance by you upon the accuracy, currency completeness or availability of information contained on the Platform. The entire risk arising out of your use of the Platform, Services and Data remains solely with you, to the maximum extent permitted under applicable law, including the Australian Consumer Law (under the Competition and Consumer Act 2010 (Cth)) (ACL).',
					'We will take all reasonable steps to implement, maintain and enforce security procedures and safeguards to protect the security, confidentiality and integrity of the Platform from unauthorised access or use by a third party or misuse, damage or destruction by any person. However, given the nature of the internet, we do not guarantee and cannot ensure the security of the Platform and we expressly exclude liability for any loss, however caused. By using the Platform, you acknowledge that Internet communications are never completely private or secure. You understand that any message or information you send to the Platform or that the Platform sends to you may be read or intercepted by others, even if there is a special notice that a particular communication is encrypted. You must take your own precautions to ensure that the process which you employ for accessing the Platform does not expose you to the risk of viruses, malicious computer code or other forms of interference which may damage your own computer system.',
				] },
			]
		},
		{
			h: '9. Indemnity',
			blocks: [
				{ t: 'p', text: 'A party (Indemnifying Party) will indemnify and keep indemnified the other party from and against all and any claims (including third party claims), demands, losses, liabilities, expenses and damages (including reasonable attorneys’ fees) reasonably incurred or suffered by the other party arising directly from:' },
				{ t: 'ul', items: [
					'any infringement or misappropriation by the Indemnifying Party upon any person’s intellectual property rights, misuse of any person’s confidential information in connection with this agreement or breach of clause 6 (Intellectual Property Rights);',
					'any criminal or fraudulent act or omission of the Indemnifying Party.',
				] },
			]
		},
		{
			h: '10. Limitation of Liability',
			blocks: [
				{ t: 'p', text: 'Nothing in these Terms of Use excludes, restricts or modifies any condition, warranty, right or liability implied in these Terms of Use or protected by law to the extent that such exclusion, restriction or modification would render these Terms of Use or any provision of these Terms of Use void, illegal or unenforceable. Subject to that, we are not liable (whether for breach of contract, under indemnity, negligence or on any other legal or equitable basis) to you or any third party for any loss of use, profit, revenue, business, data, reputation, contract, goodwill or anticipated benefit or saving, or for any delay, financing costs or increase in operating costs or for any special, indirect or consequential loss or damage arising out of or in connection with your use of, or inability to use the Platform, even if you advise us or we could reasonably foresee the possibility of any such damage occurring. Otherwise, our maximum aggregate liability (whether for breach of contract, under indemnity, negligence or on any other legal or equitable basis) to you or any third party is limited to the Fees paid by you for the Services that gave rise to a claim during the twelve (12) months period immediately preceding the first event giving rise to a claim.' },
				{ t: 'p', text: 'To the extent that the ACL or other consumer law applicable in your jurisdiction applies, our liability for breach of a guarantee conferred by the ACL or such other consumer law applicable in your jurisdiction is limited to any one of the following (as determined by us):' },
				{ t: 'ul', items: [
					'the supplying of the Services again; or',
					'refund of the Fees (or part thereof) paid by you for the affected Services.',
				] },
			]
		},
		{
			h: '11. Termination',
			blocks: [
				{ t: 'ul', items: [
					'You may cancel your subscription at any time through the functionality provided on the Platform, provided that the Fees applicable to then current subscription period will not be refunded to you. You will continue to have access to the Platform for the reminder of the pre-paid subscription term.',
					'Without limiting other remedies available to us at law, in equity or under these Terms of Use, we may, without notice to you and in our sole discretion (which shall be exercised reasonably, having regard to the circumstances) restrict your activities through the Platform, temporarily suspend, indefinitely suspend or terminate your membership and refuse to provide the Platform, Services or Data to you, or require you to pay additional Fees if:',
					'you have, or we believe that you have, breached or likely to breach these Terms of Use (which includes any of our Policies) or any applicable laws;',
					'you have failed to pay applicable Fees when due;',
					'you are insolvent or enter into external administration;',
					'we believe that your actions may cause loss or damage to or otherwise unlawfully harm you, other Platform users, third parties or us, our related bodies corporate or affiliates, our directors, employees or agents; or',
					'if we reasonably believe that any of your information (which includes an item listed on the site) is inappropriate or of an offensive nature.We may terminate these Terms of Use or any Services, or suspend, discontinue or amend any Services:',
					'immediately upon notice to you due to any legitimate business, legal or regulatory reasons;',
					'for convenience upon 30 days’ notice to you. If we will terminate or discontinue the Services for convenience, we will refund you the Fees (or part thereof – as the case may be) on a pro-rata basis.',
				] },
			]
		},
		{
			h: '12. Consequences of termination',
			blocks: [
				{ t: 'p', text: 'If your access to the Platform is cancelled of suspended pursuant to clause 12.2 or if you have deleted or cancelled your account yourself, you will not be entitled to any refund in relation to any pre-paid Fees.' },
				{ t: 'p', text: 'If your access to the Platform is cancelled of suspended pursuant to clause 12.3 and not due to your fault we will issue with a refund of the pre-paid Fees on a pro-rata basis.' },
				{ t: 'p', text: 'On termination you must immediately cease all use of the Platform, Services and Data and remove or destroy any copy of all or part of the Data in your possession or control.' },
				{ t: 'p', text: 'Sections 6 (Intellectual Property Rights), 7 (Data), 8 (Privacy), 9 (Disclaimer), 10 (Release and Indemnity), 11 (Limitation of liability), 13 (Consequences of termination), 14 (Confidentiality), 15 (Links to third party websites), 18 (Dispute resolution) and 19 (General), as well as provision of Annexure A capable of survival, will survive any such termination.' },
			]
		},
		{
			h: '13. Confidentiality',
			blocks: [
				{ t: 'p', text: 'A party shall not, without the prior written approval of the other party, unless it is legally compelled otherwise, disclose the other party’s Confidential Information and can only use such Confidential Information to the extent permitted by these Terms of Use.' },
				{ t: 'p', text: 'In these Terms of Use, “Confidential Information” means:' },
				{ t: 'ul', items: [
					'the design, specification and content of the Platform and Services;',
					'the Data;',
					'information of a party which due to its nature can be reasonably considered to be confidential.',
				] },
			]
		},
		{
			h: '14. Third Party Content and links to third party websites',
			blocks: [
				{ t: 'p', text: 'The Platform may contain links to other websites or content provided by third parties (Third Party Content). Third Party Content is provided for convenience only and may not remain current or be maintained. We are not responsible for the content or privacy practices associated with Third Party Content. You will need to make your own independent assessment of any Third Party Content. We are not responsible for, do not endorse and make no representations either expressly or impliedly concerning Third Party Content. Your reliance on Third Party Content is completely at your own risk.' },
			]
		},
		{
			h: '15. Copyright',
			blocks: [
				{ t: 'p', text: 'Our Platform, Services and all information therein are protected by copyright. Apart from fair dealing permitted by the Copyright Act 1968. Any use of the Platform, Services or any information contained therein outside of the scope of these Terms of Use are subject to our prior written permission.' },
			]
		},
		{
			h: '16. Updates',
			blocks: [
				{ t: 'p', text: 'We reserve the right, but are not required, to provide updates to the Platform to alter, improve or add to the functionality of the Platform or to overcome defects in the Platform. If we choose to provide an update and such update is a “Major Update“, that is, an update that will or is likely to materially affect your ability to access and use the Platform, then we will provide you with reasonable notice of the upcoming update. The notice will identify the nature of the update and its anticipated effect on your ability to access and use the Platform. For the avoidance of doubt: (a) we may provide notice of a Major Update via email; and (b) we are not required to provide you with notice of an update that is not a Major Update. We may make minor updates to the Platform and these may be implemented without notice to you. We will not exercise its rights under this clause 17 in a manner which would materially decrease the utility of the Platform to you.' },
			]
		},
		{
			h: '17. Dispute resolution',
			blocks: [
				{ t: 'p', text: 'The parties must use their reasonable endeavours to resolve through negotiation all disputes, conflicts (including, without limitation, conflicts of interest) differences or questions between them arising out of or in connection with these Terms of Use. If within 10 business days (that is, days that are not weekends or public holidays in Sydney, Australia), the dispute cannot be resolved following negotiation between the parties, either party may refer the dispute for arbitration. The parties agree to negotiate in good faith to agree on the appointment of a single arbitrator, or failing agreement as appointed by the President of the New South Wales Law Society (if all the parties are situated in Australia) or (where one or more of the disputing parties is not situated in Australia) to an arbitrator appointed by the Australian Centre for International Commercial Arbitration Court (ACICA). The arbitration will be conducted in Australia in accordance with the ACICA Rules operating at the time the dispute is referred to ACICA (the Rules). The terms of the Rules are deemed incorporated into these Terms of Use. If a party fails to adhere to the terms of this clause 15 and proceedings are subsequently issued by the defaulting party, these Terms of Use can be used as a bar to any proceedings so issued. However, if you are a consumer and resident of any other European country you will benefit from, and if you are a consumer and resident of any country in APAC or the UAE you may benefit from, any mandatory provisions of, and legal rights available to you under, the laws of that country. Nothing in these Terms of Use affects your rights as a consumer to rely on any such local law mandatory provisions and legal rights. You can contact us at support@urbanprospects.com.au if you have any complaints or disputes about the Services.' },
			]
		},
		{
			h: '18. General',
			blocks: [
				{ t: 'p', text: 'These Terms of Use and Policies constitute the entire agreement between us and you, superseding any prior agreements. No agency, partnership, joint venture, employee-employer or franchiser-franchisee relationship is intended or created by these Terms of Use.' },
				{ t: 'p', text: 'These Terms of Use shall be governed and construed in all respects by the laws of New South Wales, Australia. You agree that any claim or dispute you may have against us must be resolved by the courts of New South Wales, Australia. You and us both agree to submit to the non-exclusive jurisdiction of Courts of New South Wales, Australia.' },
				{ t: 'p', text: 'No right under these Terms of Use shall be deemed to be waived except by our notice in writing.' },
				{ t: 'p', text: 'If any provision of these Terms of Use is held invalid, unenforceable or illegal for any reason, these Terms of Use shall remain otherwise in full force apart from such provision which shall be deemed deleted.' },
				{ t: 'p', text: 'We may assign or novate this agreement in our sole discretion upon notice to your nominated email address or by posting such notice on the Platform.' },
			]
		},
		{
			h: 'ANNEXURE A',
			blocks: [
				{ t: 'p', text: 'These additional terms apply to your use of services supplied by @ Pty Ltd t/as Hazlett Information Services (ABN 20 104 470 340) (Hazlett), including services provided by the Australian Registry Investments Trust trading as NSW Land Registry Services (ABN 23 519 493 925) (NSW LRS). In the event of any inconsistency between the terms of the Urban Prospects Terms of use and the terms set out in this Annexure A, the latter will prevail to the extent of such inconsistency.' },
			]
		},
		{
			h: '1. Delivery of Property Information to Customers and Reseller Customers',
			blocks: [
				{ t: 'p', text: 'You must not:' },
				{ t: 'ul', items: [
					'use the “Property Information” other than for their own personal or business purposes;',
					'on-sell and/or sub-license Property Information to any other person (whether in its original or altered form);',
					'alter the format, meaning or substance of the Property Information supplied;',
					'make copies of the Property Information other than as is reasonably required for your personal or business purposes or for back up purposes; or',
					'perform, or represent that you perform, the services of an information broker or a commercial reseller of Property Information.',
				] },
			]
		},
		{
			h: '2. Compliance Inspections',
			blocks: [
				{ t: 'ul', items: [
					'For the purpose of ensuring compliance with this Agreement, you acknowledge and agree that during the term of this agreement and for a period of two (2) years after it expires or is terminated:',
					'you must keep accurate and complete accounting and technical records in connection you’re your obligations under this agreement. At a minimum, you must keep records demonstrating its compliance with the requirement that you have not used or disclosed any Property Information on more than one (1) occasion without paying the relevant Fees; and',
					'NSW LRS may, from time to time, monitor, audit, inspect and supervise your access to the NSW LRS System, its use of Property Information and its record keeping in relation to this Agreement.Without limiting the generality of clause 2.1, you agree that NSW LRS may request, inspect and where applicable, make copies of, your',
					'place of business and facilities (including having reasonable access to your personnel) during Business Hours;',
					'records, books of account, hardware and software; and',
					'the records referred to in clause',
				] },
				{ t: 'p', text: 'to the extent relevant to your compliance with this Agreement, use of the NSW LRS System and Property Information.' },
				{ t: 'ul', items: [
					'NSW LRS will provide you with at least ten (10) Business Days’ notice before conducting the inspection referred to in clause 2.2.',
					'Without limiting the generality of clauses 2.1 and 2.2, you agree that NSW LRS may request any additional information and documents reasonably required in order to ascertain your compliance with this Agreement, use of the NSW LRS System and Property Information.',
					'For the purposes of clause 2.4, NSW LRS will give you a written request which specifies the type of information or documents to be provided to NSW LRS, and you must provide the requested information or documents within ten (10) Business Days’ of the date of the request (or such longer period as stated in the request).',
					'NSW LRS reserves the right to report any breach of this Agreement or any other matter, whether or not discovered in the course of a compliance inspection, to relevant authorities including New South Wales Police.',
				] },
			]
		},
		{
			h: '3. Fees',
			blocks: [
				{ t: 'ul', items: [
					'Hazlett reserves the right to review the Fees and to increase the Fees from time to time, including to take into account any increases in charges imposed by its service providers (including NSW LRS). Hazlett will provide no less than 15 business days’ notice prior to any Fee increase coming into effect.',
				] },
			]
		},
		{
			h: '4. TERMINATION',
			blocks: [
				{ t: 'ul', items: [
					'If, for whatever reason, Hazlett’s agreement with a particular Data Provider (including NSW LRS) is terminated, Hazlett may terminate the supply of its Hazlett Products in respect of that Data Provider under this Agreement by providing 5 business days’ notice. This Agreement will continue in respect of all other Hazlett products.',
				] },
			]
		},
		{
			h: '5. LIABILITY',
			blocks: [
				{ t: 'ul', items: [
					'To the maximum extent permitted by law, all implied statutory warranties are hereby excluded.',
					'Hazlett does not warrant or represent that the Hazlett products or services will meet the requirements any customer or that the operation of the Hazlett products or services will be uninterrupted or error-free. Hazlett is not liable for any loss, damage or claim arising from your access to the Internet being unavailable or services not being available. Hazlett shall not in any circumstances be liable for any delay, error, unavailability or inaccuracy in any information provided by a Data Provider (including NSW LRS).',
				] },
			]
		},
	];
</script>

<svelte:head>
	<title>Terms of Use | Urban Prospects</title>
	<meta
		name="description"
		content="The terms on which Urban Perspectives Environmental Solutions Pty Ltd provides the Urban Prospects platform, services and data."
	/>
	<link rel="canonical" href="https://www.urbanprospects.com.au/terms-of-use/" />
</svelte:head>

<PageHeader
	eyebrow="Legal"
	title="Terms of Use"
	lede="Urban Perspectives Environmental Solutions Pty Ltd (trading as Urban Prospects), ABN 13 095 904 224."
/>

<section class="border-b border-[var(--color-line)]">
	<div class="mx-auto max-w-[820px] px-5 py-14 sm:py-20">
		{#each sections as s, i (s.h + i)}
			<Reveal>
				{#if s.h}
					<h2
						class="mt-12 text-[20px] leading-snug font-semibold tracking-tight text-[var(--fg)] first:mt-0 sm:text-[22px]"
					>
						{s.h}
					</h2>
				{/if}
				{#each s.blocks as b, j (j)}
					{#if b.t === 'p'}
						<p class="mt-4 text-[15px] leading-relaxed text-[var(--color-neutral-300)]">{b.text}</p>
					{:else}
						<ul class="mt-4 space-y-2.5">
							{#each b.items as li (li)}
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
				If you have any questions about these Terms of Use, please contact us at:
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
			<p class="mt-4 text-[15px] leading-relaxed text-[var(--color-neutral-300)]">
				See also our <a href="{base}/privacy-policy/" class="text-[var(--accent-teal-text)] hover:underline"
					>Privacy Policy</a
				>.
			</p>
			<p class="spec mt-10 text-[var(--color-neutral-500)]">
				These Terms of Use were last updated on 8 July 2024.
			</p>
		</Reveal>
	</div>
</section>
