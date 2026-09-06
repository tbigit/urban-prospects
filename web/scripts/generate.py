"""Emit the SvelteKit content module from the extracted live content."""
import json, re, os

ex = json.load(open('extracted.json'))
WEB = '/Users/dannyliang/Downloads/wwwurbanprosects/web'

POST_ORDER = [
 'understanding-nsw-zoning-overlays-and-their-impact-on-development-potential',
 'how-to-identify-high-potential-infill-sites-in-nsw',
 'how-interest-rate-movements-are-reshaping-buyer-behaviour-in-2026',
 'how-to-analyse-a-site-for-feasibility-in-10-minutes',
 'transit-oriented-development-nsws-next-growth-corridors',
 'nsw-planning-in-2026-what-developers-need-to-know',
 'mastering-off-market-site-acquisition-strategies-that-work-in-nsw',
 'the-role-of-local-demographics-in-choosing-the-right-site-for-development',
 'minimising-risk-how-smart-site-selection-tools-are-shaping-the-future-of-development',
 'climate-resilience-in-urban-planning-preparing-for-the-future',
 'the-hidden-costs-of-property-development-what-to-watch-out-for',
 'the-influence-of-cultural-heritage-on-urban-development-projects',
 'emerging-trends-in-urban-design-for-sustainable-living',
 'the-role-of-public-transport-in-shaping-property-values',
 'the-future-of-urban-development-trends-to-watch-in-2025',
 'navigating-local-government-regulations-for-property-development-in-australia',
 'using-data-to-unlock-hidden-opportunities-in-site-selection',
 'the-benefits-of-early-site-assessment-in-development-projects',
 'sustainable-development-balancing-growth-and-environmental-responsibility',
 'the-role-of-technology-in-modern-urban-planning',
 'the-impact-of-infrastructure-on-property-development',
 'maximising-roi-tips-for-choosing-the-right-development-site-in-new-south-wales',
]
REGION_ORDER = [
 'residential-development-sites-for-sale-in-sydney',
 'land-for-sale-in-the-central-coast',
 'development-land-for-sale-northern-nsw',
 'development-land-for-sale-southern-nsw',
 'land-for-sale-western-nsw',
]

MONTHNUM = {m: i + 1 for i, m in enumerate(
    ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'])}

def plain(html):
    return re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', html)).strip()

def clamp(s, n=158):
    s = plain(s)
    if len(s) <= n:
        return s
    cut = s[:n].rsplit(' ', 1)[0]
    return cut.rstrip(' ,;:.') + '…'

def description(v):
    """Yoast is empty or auto-stuffed on a few pages — fall back to the intro."""
    d = (v['seo']['description'] or '').strip()
    t = (v['title'] or '')
    junk = (
        not d
        or d.upper().startswith('URBAN PROSPECTS BLOG')
        or (t and d.startswith(t[:40]))
        or re.search(r'[a-z][A-Z]{4}', d)          # run-together block text
    )
    return clamp(v['intro'] or '') if junk else clamp(d, 175)

def doc_title(v):
    t = (v['seo']['doc_title'] or v['title'] or '').strip()
    t = re.sub(r'\s*[-|–]\s*Urban Prospects\s*$', '', t).strip()
    return t or v['title']

def iso_date(v):
    pub = v['seo'].get('published')
    if pub:
        return pub[:10]
    m = re.match(r'([A-Z]{3}) (\d{4})', v['eyebrow'] or '')
    return f'{m.group(2)}-{MONTHNUM[m.group(1)]:02d}-01' if m else None

def js(s):
    if s is None:
        return 'null'
    return "'" + s.replace('\\', '\\\\').replace("'", "\\'").replace('\n', ' ') + "'"

def blocks_ts(body):
    out = []
    for b in body:
        if b['t'] == 'img':
            out.append(f"\t\t\t{{ t: 'img', src: {js(b['src'])}, alt: {js(b.get('alt') or '')} }}")
        else:
            out.append(f"\t\t\t{{ t: 'html', html: {js(b['html'])} }}")
    return ',\n'.join(out)

def entry_ts(slug, v, indent='\t'):
    return f"""{indent}{{
{indent}\tslug: {js(slug)},
{indent}\teyebrow: {js(v['eyebrow'])},
{indent}\ttitle: {js(v['title'])},
{indent}\tintro: {js(v['intro'])},
{indent}\thero: {js(v['hero'])},
{indent}\tdate: {js(iso_date(v))},
{indent}\tread: {v['read']},
{indent}\tseoTitle: {js(doc_title(v))},
{indent}\tdescription: {js(description(v))},
{indent}\tbody: [
{blocks_ts(v['body'])}
{indent}\t]
{indent}}}"""

posts = ',\n'.join(entry_ts(s, ex[s]) for s in POST_ORDER)
regions = ',\n'.join(entry_ts(s, ex[s]) for s in REGION_ORDER)

hub = ex['nsw-regions']
cards = ',\n'.join(
    f"\t{{ href: {js(c['href'])}, label: {js(c['label'])}, image: {js(c['img'])} }}"
    for c in hub['cards'])

src = f"""// GENERATED — do not hand-edit. Produced by scripts/migrate-wordpress.py from the
// live urbanprospects.com.au pages (the WordPress REST API is stale for every
// Thrive-built page, so the rendered HTML is the only source of truth).
//
// Slugs are the live URL paths verbatim: these routes must resolve at the same
// addresses they do today, with no redirects.

export type Block = {{ t: 'html'; html: string }} | {{ t: 'img'; src: string; alt: string }};

export type Entry = {{
	slug: string;
	eyebrow: string | null;
	title: string;
	intro: string;
	hero: string;
	date: string | null;
	read: number;
	seoTitle: string;
	description: string;
	body: Block[];
}};

/** Insights articles, newest first — the order /blog lists them in. */
export const posts: Entry[] = [
{posts}
];

/** The five NSW region landing pages, in the order the hub lists them. */
export const regions: Entry[] = [
{regions}
];

/** Cards on the /nsw-regions hub. */
export const regionCards = [
{cards}
];

export const regionHub = {{
	title: {js(hub['title'])},
	seoTitle: {js(doc_title(hub))},
	description: {js(description(hub) or 'Explore development land and residential development sites for sale across every region of New South Wales.')}
}};

const bySlug = new Map<string, Entry>(
	[...posts, ...regions].map((e) => [e.slug, e])
);

export const getEntry = (slug: string) => bySlug.get(slug);
export const isPost = (slug: string) => posts.some((p) => p.slug === slug);
export const allSlugs = () => [...posts, ...regions].map((e) => e.slug);
"""

os.makedirs(f'{WEB}/src/lib/content', exist_ok=True)
open(f'{WEB}/src/lib/content/index.ts', 'w').write(src)
print('wrote src/lib/content/index.ts', len(src), 'bytes')
print('posts:', len(POST_ORDER), 'regions:', len(REGION_ORDER), 'cards:', len(hub['cards']))
for s in POST_ORDER[:3] + REGION_ORDER[:2]:
    print(f'  {s[:50]:52} {iso_date(ex[s])}  {description(ex[s])[:70]}')
