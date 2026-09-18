# Contributing (content edits)

Everything below runs on your own machine. You do **not** need the database, Stripe, Postmark
or any server access to edit copy, articles or pricing.

## One-time setup

```sh
git clone https://github.com/tbigit/urban-prospects.git
cd urban-prospects/web
npm install
```

Node 20+ is required. There is no `.env` in the repo and you don't need one — the marketing
pages build and run without it. (`web/.env.example` documents what the *server* uses; ignore it.)

## Day to day

```sh
cd web
npm run dev      # http://localhost:5173, hot reloads on save
npm run build    # full production build — must pass before you push
npm run check    # type/svelte check
```

`npm run build` prerenders every marketing route, so it catches broken links and bad
imports that dev mode lets through. Run it before every push.

## Where things live

| What | File |
| --- | --- |
| Homepage (all sections, top to bottom) | `web/src/routes/+page.svelte` |
| Shared copy: stat cards, capabilities, case studies, API checklist, "who uses" | `web/src/lib/content/site.ts` |
| Articles / blog posts (title, lede, body, cover, date, slug) | `web/src/lib/content/index.ts` |
| Article index page | `web/src/routes/insights/+page.svelte` |
| Pricing table (`PRICES`, per-region per-user, monthly/yearly) | `web/src/routes/pricing/+page.svelte` |
| Services page, standalone pages | `web/src/routes/<name>/+page.svelte` |
| Images | `web/static/` (referenced as `/filename.jpg`) |

### Adding an article

Add an entry to the `posts` array in `web/src/lib/content/index.ts`. The `slug` becomes the URL
(`/your-slug/`), the route and the sitemap pick it up automatically — no other file to touch.
Put the cover image in `web/static/`.

### Changing pricing

`PRICES` in `web/src/routes/pricing/+page.svelte` drives what's *displayed only*. The amounts
actually charged live in Stripe (`STRIPE_PRICE_REGION_*` on the server). **Changing the page does
not change what customers are billed** — flag any price change so Stripe is updated to match.

## Ground rules

- Never commit a `.env`, credentials, or anything under `web/static/media/` (large video, deployed
  separately).
- Don't touch `web/src/routes/app/**`, `web/src/lib/app/**`, `web/src/lib/server/**`,
  `web/src/routes/admin/**` or `web/deploy/**` without asking — that's the logged-in product,
  auth and deploy config.
- `/terms-of-use/` and `/privacy-policy/` are the client's legal copy, verbatim (typos included).
  Do not reword them.
- Work on a branch and open a pull request; don't push to `main`.
