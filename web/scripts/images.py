import json, os, re
import pillow_avif  # noqa: F401 — registers the AVIF decoder
from PIL import Image, ImageOps

ex = json.load(open('extracted.json'))
raw = json.load(open('rawnames.json'))
posts = {p['slug']: p for p in json.load(open('posts.json'))}

DEAD = 'urbanportal.com.au'   # NXDOMAIN — these assets are broken on the live site too
FALLBACK = 'https://www.urbanprospects.com.au/wp-content/uploads/2024/09/christian-holzinger-CUY_YHhCFl4-unsplash-scaled.jpg'
SOUTHERN = 'https://www.urbanprospects.com.au/wp-content/uploads/2024/04/white-lighthouse-under-blue-sky-and-white-clouds-during-daytime-scaled.jpg'
OUT = 'media'
os.makedirs(OUT, exist_ok=True)

def rest_featured(slug):
    p = posts.get(slug)
    emb = (p or {}).get('_embedded', {}).get('wp:featuredmedia') or []
    return emb[0].get('source_url') if emb and isinstance(emb[0], dict) else None

def process(url, maxw=1400, q=80):
    src = raw.get(url)
    if not src or not os.path.exists(src):
        return None
    stem = os.path.splitext(os.path.basename(src))[0]
    dst = f'{OUT}/{stem}.jpg'
    if not os.path.exists(dst):
        im = ImageOps.exif_transpose(Image.open(src)).convert('RGB')
        if im.width > maxw:
            im = im.resize((maxw, round(im.height * maxw / im.width)), Image.LANCZOS)
        im.save(dst, 'JPEG', quality=q, optimize=True, progressive=True)
    return '/media/' + os.path.basename(dst)

dropped = []
for slug, v in ex.items():
    hero = v['seo']['og_image'] or rest_featured(slug) or FALLBACK
    if DEAD in hero:
        dropped.append((slug, 'hero', hero))
        hero = SOUTHERN
    v['hero'] = process(hero)

    body = []
    for b in v['body']:
        if b['t'] != 'img':
            body.append(b)
            continue
        if DEAD in b['src']:
            dropped.append((slug, 'body', b['src']))
            continue
        p = process(b['src'], maxw=1200)
        if p:
            body.append({'t': 'img', 'src': p, 'alt': b.get('alt', '')})
    v['body'] = body

    for c in v['cards']:
        c['img'] = process(c['image'], maxw=900)

json.dump(ex, open('extracted.json', 'w'), indent=1, ensure_ascii=False)
print('DROPPED (dead urbanportal.com.au domain — already broken on the live site):')
for d in dropped:
    print('  ', d[0], d[1], d[2].split('/')[-1])
print('MISSING HERO:', [s for s, v in ex.items() if not v.get('hero')] or 'none')
print('MISSING CARD IMG:', [c['label'] for v in ex.values() for c in v['cards'] if not c.get('img')] or 'none')
