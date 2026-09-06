"""Lift the live-rendered article content out of the Thrive Architect markup
and reduce it to clean semantic HTML.

The WordPress REST API is not usable here: content.rendered is stale for every
Thrive-built page (it still holds the pre-rebuild draft). The rendered page is
the only source of truth, so we parse that."""
import glob, json, os, re
from bs4 import BeautifulSoup, Tag

DROP_WHOLE = {'script', 'style', 'noscript', 'svg', 'iframe', 'form', 'button',
              'input', 'select', 'textarea'}
MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
# Every post carries the same site-wide FAQ symbol appended after the article.
# It is chrome, not content — cut from here down.
FAQ_MARKER = 'What area of land can I search'

POSTS = [
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
REGIONS = [
 'nsw-regions',
 'residential-development-sites-for-sale-in-sydney',
 'land-for-sale-in-the-central-coast',
 'development-land-for-sale-northern-nsw',
 'development-land-for-sale-southern-nsw',
 'land-for-sale-western-nsw',
]

def txt(el):
    return re.sub(r'\s+', ' ', el.get_text(' ', strip=True)).strip()

def bold_rules(soup):
    """Thrive styles headings as bold <p> with a generated data-css class, so
    the tag name alone can't tell a heading from body copy. Collect the classes
    whose rule sets a bold weight."""
    bold = set()
    for st in soup.find_all('style'):
        css = st.string or ''
        for cls, decls in re.findall(r'tve-u-([0-9a-f]+)"\]\{([^}]*)\}', css):
            w = re.search(r'font-weight:\s*([^;!]+)', decls)
            if w:
                v = w.group(1).strip()
                if 'bold' in v or (v.isdigit() and int(v) >= 600):
                    bold.add(cls)
    return bold

def strip_chrome(root):
    for sel in ['#thrive-header', '.thrv_header', '.thrv_footer', 'nav', 'header', 'footer',
                '.thrv_widget_menu', '.tcb-menu-overlay', '.thrv_lead_generation',
                '.thrv_social_follow', '.thrv_social_share', '.tcb-post-list']:
        for el in root.select(sel):
            el.decompose()
    for t in root.find_all(list(DROP_WHOLE)):
        t.decompose()
    return root

def flatten(el, out):
    BLOCK = ('h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'ul', 'ol', 'blockquote', 'table')
    for child in el.children:
        if not isinstance(child, Tag):
            continue
        if child.name in BLOCK or child.name == 'img':
            out.append(child)
        else:
            flatten(child, out)
    return out

def clean_inline(tag):
    for t in tag.find_all(['span', 'font', 'div']):
        t.unwrap()
    for t in tag.find_all('b'):
        t.name = 'strong'
    for t in tag.find_all('i'):
        t.name = 'em'
    # <strong><strong>x</strong></strong> — Thrive nests these freely.
    for t in tag.find_all('strong'):
        if t.parent and t.parent.name == 'strong':
            t.unwrap()
    for t in tag.find_all(True):
        keep = {}
        if t.name == 'a' and t.get('href'):
            keep['href'] = t['href']
        if t.name == 'img':
            for k in ('src', 'alt'):
                if t.get(k):
                    keep[k] = t[k]
        t.attrs = keep
    tag.attrs = {k: v for k, v in tag.attrs.items() if k in ('href', 'src', 'alt')}
    return tag

def serialise(tag):
    clean_inline(tag)
    s = re.sub(r'\s+', ' ', tag.decode())
    for empty in ('<strong></strong>', '<em></em>', '<strong> </strong>'):
        s = s.replace(empty, '')
    s = s.replace('\xa0', ' ').replace('&nbsp;', ' ')
    s = re.sub(r'\s+([,.;:!?])', r'\1', s)
    return re.sub(r'\s+', ' ', s).strip()

def is_heading_p(tag, bold):
    """A <p> Thrive renders bold-and-short is a section heading in disguise."""
    if tag.name != 'p':
        return False
    t = txt(tag)
    if not t or len(t) > 110 or t.endswith(('.', ',', ';', ':')):
        return False
    cls = tag.get('data-css', '')
    m = re.search(r'tve-u-([0-9a-f]+)', cls)
    if m and m.group(1) in bold:
        return True
    if 'font-weight: bold' in (tag.get('style') or ''):
        return True
    # Whole paragraph wrapped in <strong> — the other way Thrive fakes a heading.
    kids = [c for c in tag.children if not (isinstance(c, str) and not c.strip())]
    return len(kids) == 1 and isinstance(kids[0], Tag) and kids[0].name in ('strong', 'b')

def titlecase(s):
    """Only touch SHOUTED titles; leave anything already mixed-case alone."""
    letters = [c for c in s if c.isalpha()]
    if not letters or sum(c.isupper() for c in letters) / len(letters) < 0.85:
        return s
    small = {'a','an','and','the','for','in','of','on','to','at','by','or','vs','with','from','into'}
    words = s.split(' ')
    out = []
    for i, w in enumerate(words):
        lw = w.lower()
        core = lw.strip(':,.')
        if i and core in small and not words[i-1].endswith(':'):
            out.append(lw)
        elif core in ('roi', 'nsw', 'cdc', 'da', 'lep', 'dcp', 'fsr', 'ai', 'gis'):
            out.append(lw.upper())
        else:
            out.append(lw[:1].upper() + lw[1:])
    return ' '.join(out)

def parse(path, kind):
    slug = os.path.basename(path)[:-5]
    soup = BeautifulSoup(open(path, encoding='utf-8', errors='replace').read(), 'lxml')

    def meta(name=None, prop=None):
        el = soup.find('meta', attrs={'name': name} if name else {'property': prop})
        return el['content'].strip() if el and el.get('content') else None

    seo = {
        'doc_title': (soup.title.string or '').strip() if soup.title else None,
        'description': meta(name='description') or meta(prop='og:description'),
        'og_image': meta(prop='og:image'),
        'published': meta(prop='article:published_time'),
        'modified': meta(prop='article:modified_time'),
    }
    bold = bold_rules(soup)

    root = strip_chrome(soup.select_one('section.tcb-post-content') or soup.select_one('#tve_editor'))

    cards = []
    if slug == 'nsw-regions':
        for img in root.find_all('img'):
            a = img.find_parent('a')
            if not a or not a.get('href'):
                continue
            node, label = img, ''
            for _ in range(8):
                if node.parent is None:
                    break
                node = node.parent
                t = txt(node)
                if t and 'Click to learn' in t and len(t) < 140:
                    label = t.replace('Click to learn more about this region.', '').strip()
                    break
            cards.append({
                'href': re.sub(r'^https?://[^/]+', '', a['href']).rstrip('/') or '/',
                'label': label,
                'image': img.get('src', ''),
            })

    blocks = flatten(root, [])
    eyebrow = title = intro = None
    body = []
    for b in blocks:
        t = txt(b)
        if b.name != 'img' and not t:
            continue
        if FAQ_MARKER in t:
            break
        if eyebrow is None and b.name == 'h6' and 'URBAN PROSPECTS BLOG' in t.upper():
            m = re.search(r'\b(' + '|'.join(MONTHS) + r')\w*\s+(\d{4})', t.upper())
            eyebrow = f'{m.group(1)} {m.group(2)}' if m else t.split('-')[-1].strip()
            continue
        if title is None and b.name in ('h1', 'h2', 'h3'):
            title = titlecase(t)
            continue
        if intro is None and b.name == 'p' and not is_heading_p(b, bold):
            intro = serialise(b)
            continue
        body.append(b)

    out = []
    for b in body:
        if b.name == 'img':
            src = b.get('src', '')
            if src and not src.startswith('data:'):
                out.append({'t': 'img', 'src': src, 'alt': b.get('alt', '')})
            continue
        if is_heading_p(b, bold):
            b.name = 'h2'
            for s in b.find_all('strong'):
                s.unwrap()
        elif b.name in ('h1', 'h2', 'h3'):
            b.name = 'h2'
        elif b.name in ('h4', 'h5', 'h6'):
            b.name = 'h3'
        if b.name in ('h2', 'h3'):
            for br in b.find_all('br'):
                br.replace_with(' ')
        s = serialise(b)
        if s and not re.fullmatch(r'<(\w+)\s*>[\s.]*</\1>', s):
            out.append({'t': 'html', 'html': s})

    # --- tidy passes over the flat block list ---
    merged = []
    for blk in out:
        h = blk.get('html', '')
        # "1." on its own line, then the real heading → one heading.
        if merged and merged[-1].get('t') == 'html':
            prev = merged[-1]['html']
            pm = re.fullmatch(r'<h([23])>\s*(\d+)\.?\s*</h\1>', prev)
            if pm and h.startswith(f'<h{pm.group(1)}>'):
                merged[-1]['html'] = re.sub(r'^<h(\d)>', f'<h\\1>{pm.group(2)}. ', h)
                continue
            # Thrive emits each bullet as its own single-item <ul>; rejoin them.
            if prev.startswith('<ul>') and h.startswith('<ul>'):
                merged[-1]['html'] = prev[:-5] + h[4:]
                continue
            if prev.startswith('<ol>') and h.startswith('<ol>'):
                merged[-1]['html'] = prev[:-5] + h[4:]
                continue
        merged.append(blk)

    words = sum(len(re.sub(r'<[^>]+>', ' ', b['html']).split())
                for b in merged if b['t'] == 'html')
    words += len(re.sub(r'<[^>]+>', ' ', intro or '').split())

    return {'slug': slug, 'kind': kind, 'eyebrow': eyebrow, 'title': title,
            'intro': intro, 'body': merged, 'seo': seo, 'cards': cards,
            'words': words, 'read': max(1, round(words / 220))}

res = {}
for s in POSTS:
    res[s] = parse(f'live/{s}.html', 'post')
for s in REGIONS:
    res[s] = parse(f'live/{s}.html', 'region')

json.dump(res, open('extracted.json', 'w'), indent=1, ensure_ascii=False)
print(f"{'slug':58} {'kind':7} {'date':9} {'blk':>4} {'h2':>3} {'img':>4} {'words':>6}  title")
for k, v in res.items():
    nimg = sum(1 for b in v['body'] if b['t'] == 'img')
    nh = sum(1 for b in v['body'] if b['t'] == 'html' and b['html'].startswith('<h'))
    print(f"{k[:56]:58} {v['kind']:7} {str(v['eyebrow'] or '-'):9} {len(v['body']):4} {nh:3} {nimg:4} {v['words']:6}  {str(v['title'])[:44]}")
    if not v['title'] or not v['intro']:
        print('   !! MISSING', 'title' if not v['title'] else '', 'intro' if not v['intro'] else '')
