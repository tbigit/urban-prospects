// Shared marketing content: the homepage sections and the standalone
// /platform, /services, /data-apis and /about pages read from one source so
// the copy cannot drift between them.

export const advantageStats = [
	{
		n: '4.5 million',
		l: 'properties analysed across NSW, so every opportunity in the state is in front of you'
	},
	{
		n: '100% visibility',
		l: 'of on-market and off-market sites, so you can negotiate before competitors know a site exists'
	},
	{
		n: '34 data sources',
		l: 'twice as many as any other platform, giving you feasibility decisions you can rely on'
	},
	{
		n: 'Permissible uses',
		l: 'one of the only platforms that identifies sites by permissible use: fewer dead ends, faster shortlists'
	},
	{
		n: '17 Pattern Book designs',
		l: 'find sites suitable for every NSW Pattern Book design and unlock faster approval pathways'
	},
	{
		n: 'Weekly updates',
		l: 'planning data refreshed weekly for every NSW property, so you act on rule changes before the market'
	}
];

// Lucide icon inner-markup (paths only — the wrapping <svg> below supplies
// viewBox/stroke), chosen per card from its own copy: Search → literal
// search, Radar → scanning for off-market signals, TrendingUp → yield,
// Box → 3D, Calculator → RLV, Handshake → negotiate, Bookmark → shortlist,
// FileText → reports.
export const capabilities = [
	{
		t: 'Search any site in NSW',
		d: 'Property and planning data for every site, searchable with 34+ planning filters: zoning, SEPPs, CDC eligibility, Pattern Book suitability and more.',
		icon: '<path d="m21 21-4.34-4.34" /><circle cx="11" cy="11" r="8" />'
	},
	{
		t: 'Find off-market opportunities',
		d: 'Filter on-market and off-market sites, and use our propensity model to find the owners most likely to sell.',
		icon: '<path d="M19.07 4.93A10 10 0 0 0 6.99 3.34" /><path d="M4 6h.01" /><path d="M2.29 9.62A10 10 0 1 0 21.31 8.35" /><path d="M16.24 7.76A6 6 0 1 0 8.23 16.67" /><path d="M12 18h.01" /><path d="M17.99 11.66A6 6 0 0 1 15.77 16.67" /><circle cx="12" cy="12" r="2" /><path d="m13.41 10.59 5.66-5.66" />'
	},
	{
		t: 'Run automatic yield analysis',
		d: 'Instant yield analysis for subdivisions, apartments, dual occupancies and multi-dwelling housing.',
		icon: '<path d="M16 7h6v6" /><path d="m22 7-8.5 8.5-5-5L2 17" />'
	},
	{
		t: 'Test designs in 3D',
		d: 'Drop in your own 3D models or use NSW Pattern Book models to test what fits on any site.',
		icon: '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /><path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" />'
	},
	{
		t: 'Calculate residual land value',
		d: 'Compare returns across sites and know exactly what you should pay before you negotiate.',
		icon: '<rect width="16" height="20" x="4" y="2" rx="2" /><line x1="8" x2="16" y1="6" y2="6" /><line x1="16" x2="16" y1="14" y2="18" /><path d="M16 10h.01" /><path d="M12 10h.01" /><path d="M8 10h.01" /><path d="M12 14h.01" /><path d="M8 14h.01" /><path d="M12 18h.01" /><path d="M8 18h.01" />'
	},
	{
		t: 'Negotiate directly with owners',
		d: 'Purchase title deeds through the platform and go straight to the owner, often with zero competition.',
		icon: '<path d="m11 17 2 2a1 1 0 1 0 3-3" /><path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4" /><path d="m21 3 1 11h-2" /><path d="M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3" /><path d="M3 4h8" />'
	},
	{
		t: 'Shortlist and track sites',
		d: 'Save your favourite sites, build a pipeline and get alerts the moment circumstances change.',
		icon: '<path d="M17 3a2 2 0 0 1 2 2v15a1 1 0 0 1-1.496.868l-4.512-2.578a2 2 0 0 0-1.984 0l-4.512 2.578A1 1 0 0 1 5 20V5a2 2 0 0 1 2-2z" />'
	},
	{
		t: 'Generate professional reports',
		d: 'Client-ready and investor-ready reports, generated straight from the platform.',
		icon: '<path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z" /><path d="M14 2v5a1 1 0 0 0 1 1h5" /><path d="M10 9H8" /><path d="M16 13H8" /><path d="M16 17H8" />'
	}
];

export const caseStudies = [
	{
		i: 'S',
		name: 'Sarah',
		photo: '/testimonials/sarah.jpg',
		role: 'Real Estate Agent',
		h: 'Won the listing advantage',
		d: 'Confirmed dual occupancy permissibility, assessed feasibility and found 20 comparable sites nearby. Her data-backed campaign delivered a premium sale price for her client.',
		tag: 'Premium sale price'
	},
	{
		i: 'A',
		name: 'Alex',
		photo: '/testimonials/alex.jpg',
		role: 'Property Developer',
		h: 'Secured a site with zero competition',
		d: 'Located off-market townhouse sites within a 20-minute radius, ran automated yield and residual land value analysis, and went straight to the owner.',
		tag: '12 viable sites in under 10 minutes'
	},
	{
		i: 'M',
		name: 'Maya',
		photo: '/testimonials/maya.jpg',
		role: 'Architect',
		h: 'Cut early-stage design time by 70%',
		d: 'Tested Pattern Book designs across multiple sites with 3D models and instant feasibility checks, delivering faster, more accurate advice on every engagement.',
		tag: '70% faster early-stage design'
	}
];

export const apiChecklist = [
	'Updated weekly for every property in NSW',
	'Sourced from multiple government datasets',
	'Permissibility data covers zoning, SEPPs and Schedule 1 additional uses',
	'CDC and Pattern Book filters exclude Environmentally Sensitive Areas across all NSW LEPs',
	'Minimum lot sizes, FSR, height controls and development-type exceptions',
	'Unique datasets: zoning history, walkability scores, propensity to sell'
];

export const whoUses = [
	'Developers',
	"Real estate agents",
	"Buyers’ agents",
	'Architects',
	'Town planners',
	'Business owners',
	'Renewable energy companies'
];
