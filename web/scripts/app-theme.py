#!/usr/bin/env python3
"""Tokenise the property app's hard-coded colours and emit a light + dark palette.

The app (src/routes/app, src/lib/app, static/app/css) was written with ~1,500 colour
literals and no theme. Rather than hand-edit them, this replaces every literal that
appears in a CSS context — .css files, <style> blocks, and style="" attributes — with
`var(--up-c-<key>)` and writes static/app/css/theme.css defining each variable twice:
the original value for light, and a derived value for dark:

  * low-saturation colours (greys, whites, blacks): lightness inverted, tinted
    faintly toward the site's dark background hue so panels sit on --bg;
  * saturated but very light tints (e.g. #FAFAFF panel backgrounds): become dark,
    slightly desaturated surfaces;
  * saturated mid/dark colours (brand purple, reds, greens): lifted so they read
    on a dark surface; alpha is preserved for rgba().

Colours inside JavaScript (Chart.js, Mapbox paint) are deliberately left alone.
Idempotent: re-running only touches literals that are not already variables.
"""
import re, glob, colorsys, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
# balloon.min.css (tooltips) is deliberately left untouched — its dark tooltip reads well on both themes.
CSS_FILES = [ROOT / 'static/app/css' / f for f in ('incremental.css', 'custom.css')]
SVELTE_FILES = [pathlib.Path(p) for p in glob.glob(str(ROOT / 'src/routes/app/**/*.svelte'), recursive=True)] + \
               [pathlib.Path(p) for p in glob.glob(str(ROOT / 'src/lib/app/*.svelte'))]
THEME = ROOT / 'static/app/css/theme.css'

HEX = r'#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b'
RGB = r'rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(?:,\s*(?:0?\.\d+|1|0|\d{1,3}%)\s*)?\)'
COLOUR = re.compile(f'(?<![\\w-])({HEX}|{RGB})')

palette = {}  # key -> (r,g,b,a) 0..1

def parse(lit):
    lit = lit.strip()
    if lit.startswith('#'):
        h = lit[1:]
        if len(h) in (3, 4): h = ''.join(c * 2 for c in h)
        r, g, b = (int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))
        a = int(h[6:8], 16) / 255 if len(h) == 8 else 1.0
        return r, g, b, a
    nums = re.findall(r'[\d.]+%?', lit)
    r, g, b = (int(n) / 255 for n in nums[:3])
    a = 1.0
    if len(nums) > 3:
        a = float(nums[3][:-1]) / 100 if nums[3].endswith('%') else float(nums[3])
    return r, g, b, a

def key_of(rgba):
    r, g, b, a = rgba
    k = '%02x%02x%02x' % (round(r * 255), round(g * 255), round(b * 255))
    if a < 1: k += '-a%02d' % round(a * 100)
    return k

def css(rgba):
    r, g, b, a = rgba
    if a >= 1: return '#%02x%02x%02x' % (round(r * 255), round(g * 255), round(b * 255))
    return 'rgba(%d, %d, %d, %s)' % (round(r * 255), round(g * 255), round(b * 255), ('%.2f' % a).rstrip('0').rstrip('.'))

# Site dark background is #0a0710 — hue ~265°, a faint purple cast.
BG_H, BG_S = 265 / 360, 0.30

def darken(rgba):
    r, g, b, a = rgba
    h, l, s = colorsys.rgb_to_hls(r, g, b)
    if s < 0.22 or (l > 0.93 and s < 0.6):
        # greys / whites / blacks / near-white tints -> invert lightness, tint toward bg
        nl = 1 - l
        nl = 0.04 + nl * 0.92
        tint_s = BG_S * (1 - abs(nl - 0.5) * 2) * 0.6 if nl < 0.5 else 0.05
        nh = BG_H if s < 0.22 else h
        ns = max(s * 0.5, tint_s) if nl < 0.5 else min(s, 0.08)
        r2, g2, b2 = colorsys.hls_to_rgb(nh, nl, ns)
    elif l > 0.80:
        # saturated pastel surfaces -> dark tinted surface
        r2, g2, b2 = colorsys.hls_to_rgb(h, 0.16, min(s, 0.35))
    elif l < 0.55:
        # saturated darks (brand purple, deep headings) -> lift to a readable
        # tint on a near-black surface; the deeper the source, the bigger the lift
        r2, g2, b2 = colorsys.hls_to_rgb(h, min(0.78, max(0.66, l + 0.30)), min(1, s * 1.05))
    else:
        r2, g2, b2 = colorsys.hls_to_rgb(h, min(0.85, l + 0.10), s)
    return r2, g2, b2, a

def tokenise(text):
    def repl(m):
        rgba = parse(m.group(1)); k = key_of(rgba)
        palette.setdefault(k, rgba)
        return f'var(--up-c-{k})'
    return COLOUR.sub(repl, text)

def process_css(text):
    return tokenise(text)

STYLE_BLOCK = re.compile(r'(<style[^>]*>)(.*?)(</style>)', re.S)
STYLE_ATTR = re.compile(r'(\bstyle="[^"{]*")')  # literal style attrs only (no {expr})

def process_svelte(text):
    text = STYLE_BLOCK.sub(lambda m: m.group(1) + tokenise(m.group(2)) + m.group(3), text)
    text = STYLE_ATTR.sub(lambda m: tokenise(m.group(1)), text)
    return text

changed = 0
for f in CSS_FILES:
    if not f.exists(): continue
    s = f.read_text(); t = process_css(s)
    if t != s: f.write_text(t); changed += 1
for f in SVELTE_FILES:
    s = f.read_text(); t = process_svelte(s)
    if t != s: f.write_text(t); changed += 1

# Merge with any keys already present in theme.css from a previous run (they are
# no longer literals in the sources, so they would not be re-collected).
if THEME.exists():
    for m in re.finditer(r'--up-c-([0-9a-f]{6}(?:-a\d\d)?):\s*([^;]+);', THEME.read_text().split('/* dark */')[0]):
        palette.setdefault(m.group(1), parse(m.group(2)))

light = '\n'.join(f'  --up-c-{k}: {css(v)};' for k, v in sorted(palette.items()))
dark = '\n'.join(f'  --up-c-{k}: {css(darken(v))};' for k, v in sorted(palette.items()))
THEME.write_text(f"""/* Generated by web/scripts/app-theme.py — do not edit by hand.
   {len(palette)} colour tokens lifted from the property app's stylesheets.
   Light = the original values. Dark = derived (see the script). The site's
   theme switch (data-theme on <html>, else prefers-color-scheme) selects. */
.up-app {{
  --up-bg: #ffffff;
  --up-fg: #111111;
  color-scheme: light;
{light}
}}
/* dark */
:root[data-theme="dark"] .up-app {{
  --up-bg: #0a0710;
  --up-fg: #f2eef7;
  color-scheme: dark;
{dark}
}}
@media (prefers-color-scheme: dark) {{
  :root:not([data-theme="light"]) .up-app {{
    --up-bg: #0a0710;
    --up-fg: #f2eef7;
    color-scheme: dark;
{dark.replace(chr(10), chr(10) + '  ')}
  }}
}}
""")
print(f'files changed: {changed}; tokens: {len(palette)}')
