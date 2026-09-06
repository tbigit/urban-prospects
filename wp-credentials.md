# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

**Urban Prospects** (`urbanprospects.com.au`) is a planning-intelligence marketing site for a NSW
(Australia) property/development SaaS: search every property in NSW, filter by 34+ planning
attributes (zoning, SEPPs, CDC eligibility, Pattern Book suitability), run yield and residual-land-value
analysis, test Pattern Book designs in 3D, and negotiate with owners — on-market or off-market —
before competitors know a site exists.

This repo is the **homepage rebuild**: SvelteKit 5 + Tailwind v4, `adapter-static`, token-swap
dark/light theme, liquid-glass panels, scroll-reveal, a full-bleed animated hero. Content and section
order come from the Figma file *"Urban Prospects — Homepage Redesign"* — **content/order only**; none
of Figma's visual styling (cream backgrounds, flat card treatment, solid-purple full-bleed bands) was
carried over. The visual language is a dark "spec label" aesthetic (monospaced eyebrow labels, liquid
glass, film grain), re-themed to Urban Prospects' brand colours.

## Content source

Figma access required login this session couldn't obtain; the actual homepage content was extracted
from a client-exported PDF (`~/Downloads/Homepage/Desktop 1440.pdf`, 1440×7065pt, one continuous
scrolling frame) rendered to PNG via `pdftoppm` and read in slices. Section order, as built in
`web/src/routes/+page.svelte`:

1. **Hero** — pill "Planning Intelligence for NSW" · H1 "Find better sites, faster. Secure them with
   confidence." · body · CTAs (Search for a Site Now / Watch How It Works) · "Search. Save. Succeed."
   · 3-stat strip (viable sites / minutes to shortlist / filters applied — pulled off the Figma's
   inline dashboard mockup, which the Mapbox hero replaces).
2. **Every advantage, measured** — 6 stat cards (4.5 million properties / 100% visibility / 34 data
   sources / Permissible uses / 17 Pattern Book designs / Weekly updates).
3. **From site search to feasibility in minutes** — demo video placeholder (no real video asset yet).
4. **What you can do** (`#platform`) — 8 capability cards (search, off-market, yield, 3D, RLV,
   negotiate, shortlist, reports), each with its own Lucide icon.
5. **Case studies** — 3 testimonials (Sarah/agent, Alex/developer, Maya/architect) with outcome tags.
6. **Built by planners, not just data people** (`#insights`) — founder teaser + "Follow Our Planning
   Insights" CTA.
7. **Our services** (`#services`) — two pricing cards ($55 one-off report vs 7-day platform trial) +
   "Who uses Urban Prospects" pill list.
8. **Planning Data APIs** (`#data-apis`) — API pitch + 6-item checklist.
9. **Final CTA** — "Your next site is already in the platform." (interactive `DotField` background.)
10. **Founder's story** (`#about`) — fuller Stuart Wilmot bio + the real founder video
    (`VimeoEmbed.svelte` click-to-play facade, see below).
11. **Footer** — Platform / Services / Contact columns, tagline, theme toggle.

Figma also duplicates the founder content (a short teaser mid-page, a fuller story near the footer) —
preserved as-is rather than de-duplicated, since that's a deliberate teaser→payoff pattern.

`Platform`/`Services`/`Data APIs`/`About`/`Insights` are same-page anchors (`#platform` etc.), not
separate routes — Figma only covers the homepage. `Login`/`Start Free Trial`/`Book a Demo`/`Buy a
Report`/`Explore the Data APIs` route to small stub pages (`web/src/routes/{login,signup,demo,report,developers}`)
that `mailto:info@urbanprospects.com.au` rather than pretending a working signup/auth backend exists.

## Design system

- **Theme**: token-swap dark/light via `data-theme` on `<html>` (system/light/dark, `ThemeToggle.svelte`,
  pre-paint script in `app.html` avoids FOUC).
  - **Dark** (default): `--bg:#0a0710` — a near-black tuned faintly toward the brand purple, not a
    neutral black (sampled from the Figma's own dark section, `#140d1f`, used as the raised-panel tone).
  - **Light**: `--bg:#ffffff` — pure white, deliberately **no** cream/beige undertone (Figma's actual
    light sections were beige `#f2ede5`; overridden per instruction).
- **Brand colours** — extracted from the Figma PDF by sampling pixels (`web/src/app.css`
  `--color-brand-purple:#5c2687`, `--color-brand-teal:#5ee8ad`) and used **only as highlights**: CTA
  fills, stat numbers, icon chips, active states, checkmarks — never as a page-filling background (the
  Figma's solid-purple stat band and CTA band were re-themed to the standard `--bg`/`--color-subtle`
  alternation instead). `--accent-teal-text` swaps the raw mint (dark mode) for a brand-purple-tinted
  glow/text value in light mode so it doesn't read as raw saturated mint on white.
- **Fonts** — Geist Sans / Geist Mono, self-hosted via `@fontsource/geist-sans` + `@fontsource/geist-mono`
  (imported in `app.css`).
- **Dark "spec label" aesthetic**: `.spec` monospaced uppercase eyebrow labels (Figma's own eyebrows —
  "Planning Intelligence for NSW", "Case Studies", "Founder's Story" — map onto this directly), the
  `.glass` liquid-glass panel utility (SVG displacement filter in `+layout.svelte`, Chromium-only
  refraction, plain frost elsewhere), the faint fixed film-grain overlay, and the `Reveal.svelte`
  scroll-in fade/blur/rise wrapper.

## Hero: Mapbox GL background

`web/src/lib/components/MapboxHero.svelte` is a full-bleed Mapbox GL map driven by a single
`requestAnimationFrame` loop that reads scroll progress off the hero's bounding rect every frame and
writes the camera with low-level `jumpTo()` calls (never an animated `easeTo`/`flyTo`, so nothing
stacks or janks):

- **Token + style**: public URL-restricted token and base style lifted from
  `/Users/dannyliang/Desktop/ims/upapp` (`src/routes/map/+page.svelte`) — intentionally **no** custom
  planning-overlay layers (LSZ, coastal management, contamination sites, etc.) from that app; just the
  stock `mapbox://styles/mapbox/{dark,light}-v11` basemap, swapped on theme change via a
  `MutationObserver` watching `data-theme` (camera pose survives `setStyle()` automatically).
- **Centre**: Elizabeth Bay House, 7 Onslow Ave, Elizabeth Bay NSW 2011 (`-33.8701, 151.2265`).
- **Auto-spin**: bearing increments every frame (`~2.6°/s`, ~140s/revolution) via `map.jumpTo()`, paused
  when the hero scrolls out of view (`IntersectionObserver`) to hold 60fps and save battery — never a
  Mapbox animation call (`easeTo`/`flyTo`) stacking on top of itself. `prefers-reduced-motion` renders
  one static frame and never starts the loop.
- **Scroll → zoom → fade**: zoom/pitch ease in over `zoomVh` of a viewport-height of scroll, then the
  whole map fades out over a `fadeStart`/`fadeEnd` window of the hero's own height so nothing bleeds
  into the sections below.

## Final CTA: DotField background

`web/src/lib/components/DotField.svelte` is a verbatim port of the "Dot Field" background component
(interactive dot grid, canvas-drawn, with a cursor-proximity bulge + SVG radial-gradient glow) — copied
from its published Svelte source rather than reimplemented from a description, so the physics/easing
match exactly. The component itself takes no theme opinion (`gradientFrom`/`gradientTo`/`glowColor` are
plain props); `+page.svelte` tracks `data-theme` via `MutationObserver` and passes different colour sets
in for dark vs. light, which the component picks up live since Svelte 5's `$props()` destructuring
compiles to reactive getters — no internal changes needed. It's mounted inside a plain positioning
`<div class="absolute inset-0 -z-10">` rather than passed classes via its own `class` prop: the
component's root hardcodes `relative` ahead of that prop with plain string concatenation (no
`tailwind-merge`), so which of `relative`/`absolute` wins is decided by Tailwind's utility generation
order, not HTML class order — wrapping sidesteps the conflict entirely.

## Founder video: Vimeo click-to-play facade

`web/src/lib/components/VimeoEmbed.svelte` hosts the founder's-story video
(`vimeo.com/1022699488`, a 720p render — quality accepted as subpar for now). It's a facade, not a
bare embed, because Vimeo's raw player frame clashes with the theme:

- **Until played**: the video's poster frame rendered `grayscale` under a veil of
  `color-mix(in srgb, var(--bg) …%, transparent)` — since `--bg` is near-black in dark mode and
  pure white in light mode, the one rule yields the black-and-white treatment on dark and the
  lighten-white treatment on light with no per-theme branching. The custom teal play chip matches
  the demo-section placeholder's. The poster is a **static asset**
  (`web/static/founder-story-poster.jpg`, passed in via the `poster` prop), not fetched from
  Vimeo's oEmbed API at runtime: this video is privacy-restricted, so oEmbed answers **without**
  `thumbnail_url` (`domain_status_code: 403`) — the frame was grabbed once from the player-config
  JSON (`https://player.vimeo.com/video/<id>` → `i.vimeocdn.com/video/…` URL) instead. A missing
  `poster` falls back to the original brand-purple gradient.
- **On click**: the facade swaps for the real `player.vimeo.com` iframe with `autoplay=1` (allowed
  because the click grants user activation and the iframe carries `allow="autoplay"`). Nothing from
  Vimeo's player loads before that click — the facade costs one thumbnail image.

## Architecture

```
web/
  src/
    app.css               design tokens (theme, brand, glass, spec labels, grain)
    app.html               pre-paint theme script, Geist preconnect-free self-hosted fonts
    lib/
      components/
        ui/button.svelte    tailwind-variants button (default/teal/outline/ghost/link)
        Reveal.svelte       scroll-in fade/blur/rise wrapper (IntersectionObserver)
        ThemeToggle.svelte  system/light/dark
        Header.svelte       floating frosted-glass PILL nav (not a full-width bar)
        Footer.svelte
        Logo.svelte         real brand glyph (embedded PNG, theme-swapped light/dark)
        MapboxHero.svelte   see above
        DotField.svelte     see above
        VimeoEmbed.svelte   see above
        StubPage.svelte     shared "not live yet, email us" pattern for the 5 stub routes
      utils.ts              cn() — clsx + tailwind-merge
    routes/
      +layout.svelte        header/footer shell, org JSON-LD, liquid-glass SVG filter def
      +page.svelte          the whole homepage, one file, Figma content/order (see above)
      {login,signup,demo,report,developers}/+page.svelte   stub pages
  static/                   favicon.png, favicon-512.png, apple-touch-icon.png, brand logo PNGs, robots.txt
```

Single-file `+page.svelte` (not one file per section) is deliberate — it keeps the whole homepage
narrative in one place, matching how the source Figma frame reads top-to-bottom as one continuous scroll.

## Header: frosted-glass pill nav

One continuous floating rounded-full capsule (`Header.svelte`), centred with margin on all sides,
`.glass` frosted/backdrop-blur, containing logo + nav links + Log In + Start Free Trial all inside the
same pill — modelled on an attached reference screenshot (a dark rounded pill floating over a hero
photo, logo left / links centre / CTA right). Collapses to a hamburger-triggered dropdown panel below
`md`.

## Commands

Run from `web/`:

- `npm install`
- `npm run dev` — dev server (port from `$PORT` if set, else 5173)
- `npm run build` — prerenders every route (adapter-static)
- `npm run check` — `svelte-kit sync && svelte-check`

## Deployment

Deploys straight to the server at `root@143.42.46.116`, web root `/opt/www/upweb` — a plain
static-file deploy. **Not** GitHub Pages: the repo is private, so the original Pages pipeline was
pointless and has been dropped (`.github/workflows/deploy.yml` and `web/static/CNAME` removed along
with it; `preview.urbanprospects.com.au` was that era's Pages custom domain).

```sh
cd web && npm run build                                     # prerenders every route into web/build/
rsync -avz --delete build/ root@143.42.46.116:/opt/www/upweb/
```

- The vhost/TLS config serving `/opt/www/upweb` lives on the server (nginx), outside this repo.
  `web/deploy/redirects.conf` holds the 301s that vhost must `include` (currently `/blog` ->
  `/insights/`, since the article index moved to match its nav label). The static build also
  emits `build/blog/index.html` as a meta-refresh fallback, but only the nginx 301 passes link
  equity, so add the include before the domain moves to this host.
- `adapter-static` emits fully relative (`./...`) links and asset URLs on every prerendered route, so
  the same build works at the domain root or any subpath. `svelte.config.js`'s `paths.base:
  process.env.BASE_PATH ?? ''` and the `base`-from-`$app/paths` routing of every internal
  `href`/`src` (required for `web/static` assets like the logo PNGs to survive the prerender
  crawler) predate the server move and remain correct — leave them in place.
- The Mapbox token embedded in `MapboxHero.svelte` is Mapbox's `pk.`-prefixed **public** token kind
  (not `sk.`, the secret kind), URL-restricted, reused intentionally from the upapp project — not a
  leaked credential, despite what generic secret scanners claim.

## Insights (articles) and region pages

- `/insights/` (`web/src/routes/insights/+page.svelte`) is the article index: a featured split for
  the newest post, then the rest grouped by year in a plain 3-up image grid (no card chrome).
  `/blog/` is a prerendered redirect to it. Articles keep their indexed root-level `/<slug>/`
  paths (`web/src/routes/[slug]/`).
- `PostHero.svelte` is a plain editorial header for articles (mono meta line, title, lede) with
  the cover photo rendered container-wide beneath; region pages pass `map` to keep the Mapbox
  backdrop. Article pages show a non-sticky "Related articles" rail (thumbnail + title) and one
  CTA row after the body; `TrialCta` is not used on them.
- Article bodies are **not** wrapped in `Reveal`: its 15% intersection threshold never fires for
  an element several screens tall, so wrapped articles rendered blank.
- Seven migrated posts shared one stock cover; distinct covers were assigned by hand in
  `web/src/lib/content/index.ts` (hero fields only). Known content bug left as-is: the
  `the-influence-of-cultural-heritage-...` post carries the "Climate Resilience" title.

## Known gaps / next steps

- No real product screenshot or demo video assets — the hero stat strip and the mid-page demo video
  section still use placeholders (per Figma, which also placeholders the founder photo: "Photo:
  Stuart Wilmot"). The founder's-story video is now a real Vimeo embed (see below), but the source
  render is a subpar 720p — accepted for now, swap for a better master when one exists.
- `Platform`/`Services`/`Data APIs`/`About`/`Insights` are in-page anchors; if these become full routes
  later, the header/footer link targets need updating alongside new route content.
- Stub routes (`/login`, `/signup`, `/demo`, `/report`, `/developers`) are `mailto:` placeholders —
  no auth/billing backend exists yet (Urban Prospects' own SaaS backend is a separate project).
- Pointing `urbanprospects.com.au` (or any subdomain) at `143.42.46.116` is a DNS change managed
  outside this repo, as is the vhost/TLS setup on the server itself.

## New platform database (subscriptions / users)

The new platform's Postgres (`UrbanPortalDBP`) is the target store for users and
subscriptions (UP-021, UP-026, UP-027). The `user_subscriptions` table lives here. Stripe
Billing is the source of truth for subscription state (decided 2026-09-06); this table mirrors
it from Stripe webhooks. Reach it in two hops — the DB host is on a private network:

```sh
updb                                                   # shell alias in ~/.zprofile: ssh root@172.105.183.89
psql -U postgres -d UrbanPortalDBP -h 192.168.146.115  # run on that box
```

Password comes from the server-side `~/.pgpass` or is prompted; it is not stored in this repo.

### Schema notes (as found 2026-09-06)

- PostgreSQL 14, extensions `postgis`, `pg_trgm`, `plpgsql`. Mostly spatial/planning layers; the
  member-facing tables are `user_subscriptions`, `user_api_key`, `user_fav`, `user_search`,
  `user_template` — **all keyed by email** (`user_id` is the email string, not a numeric id).
- `user_subscriptions`: `payment_customer_id`/`payment_subscription_id`/`payment_price_id` are the
  Stripe `cus_`/`sub_`/`price_` ids; `plan` defaults `'Demo'`; `user_region` is a comma-joined list.
  No `plans` table exists yet (UP-026).
- `users` (created 2026-09-06, DDL in `web/deploy/sql/001_users.sql`) holds members migrated from
  WordPress. `email` is the join key to the tables above (unique on `lower(email)`); `wp_user_id`
  keeps the source `wp_users.ID`; `stripe_customer_id` mirrors `payment_customer_id`.
  `password_hash` stores `wp_users.user_pass` **verbatim** so members keep their passwords —
  `password_algo` says how to verify: `wp_phpass` (`$P$`/`$H$`, portable phpass MD5), `wp_bcrypt`
  (`$wp$2y$…`, WordPress ≥ 6.8: bcrypt over base64(sha384(password))), `bcrypt`, `argon2id`.
  Login code must detect the prefix, verify accordingly, and may opportunistically rehash to a
  modern algo on successful login. Schema files under `web/deploy/sql/` are numbered and applied
  by piping through the `updb` hop.
