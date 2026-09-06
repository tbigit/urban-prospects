# WordPress migration

One-shot pipeline that lifted the 22 Insights articles and the 6 NSW region
pages off the live WordPress site into `src/lib/content/index.ts`.

You should not need to run this again — the output is committed. It is kept so
the migration is reproducible and auditable.

## Why it scrapes the rendered HTML

The obvious route, `wp-json/wp/v2/posts`, does not work here. Every page is
built with Thrive Architect, which stores its layout separately: `content.rendered`
still returns the pre-rebuild draft. Nine of the 22 posts came back with the
wrong article body entirely, including three that returned a completely
different article. The rendered page is the only source of truth.

## Steps

```bash
python3 -m venv venv && ./venv/bin/pip install beautifulsoup4 lxml pillow pillow-avif-plugin
bash scripts/fetch.sh          # live HTML -> live/
./venv/bin/python scripts/extract.py    # live/ -> extracted.json (clean semantic HTML)
./venv/bin/python scripts/images.py     # download + resize -> media/
./venv/bin/python scripts/generate.py   # -> src/lib/content/index.ts
cp media/*.jpg static/media/
```

## What `extract.py` normalises

- Drops the site-wide FAQ symbol appended to the bottom of 18 of the pages
  (it starts at "What area of land can I search?") — that is chrome, not article.
- Promotes Thrive's fake headings — a `<p>` its generated CSS renders bold and
  short — to real `<h2>`, so the articles have a heading outline.
- Merges the standalone `<h2>1.</h2>` numbering blocks into the heading below
  them, and rejoins the runs of single-`<li>` `<ul>`s Thrive emits per bullet.
- Strips every presentational attribute, `<span>`, and nested `<strong>`.
- Title-cases the one headline stored in all caps.
- Reads the date for the hero eyebrow off the live `URBAN PROSPECTS BLOG - …`
  label, not the WordPress post date (the two disagree on several posts, and
  the label is what readers see today).

## Known upstream data issues

These are faults in the live WordPress content, carried across as-is rather
than silently "fixed" — each needs an editorial decision:

| URL | Issue |
| --- | --- |
| `/the-influence-of-cultural-heritage-on-urban-development-projects/` | Body is a duplicate of the Climate Resilience article. Title tag and slug describe cultural heritage; the article does not. |
| `/how-interest-rate-movements-are-reshaping-buyer-behaviour-in-2026/` | Body is the "How to Read a Section 10.7 Zoning Certificate" article. |
| `/nsw-planning-in-2026-what-developers-need-to-know/` | Headline reads "Planning Reforms 2026: What Developers Need to Know" — differs from the slug. |
| `/transit-oriented-development-nsws-next-growth-corridors/` | Headline reads "…Where the Next Growth Corridors Will Be" — differs from the slug. |
| `/development-land-for-sale-southern-nsw/` | Three images point at `urbanportal.com.au`, which no longer resolves (NXDOMAIN). They are broken on the live site today; dropped here, and the hero falls back to the lighthouse photo the hub card already used for this region. |
| `/land-for-sale-western-nsw/` | Headline still says "Use the Urban **Portal**" — the retired brand. |
