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
3. **From site search to feasibility in minutes** — the product demo film (`DemoPlayer.svelte`, see
   "Demo video" below): muted autoplay loop, click for sound.
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

`Platform`/`Services`/`Data APIs`/`About` are real routes (`web/src/routes/{platform,services,data-apis,about}`)
built on the same content as the homepage sections (shared arrays in `web/src/lib/content/site.ts`,
page header in `PageHeader.svelte`); the homepage keeps its `#platform` etc. anchors. `Login`/`Start Free Trial`/`Book a Demo`/`Buy a
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

## Demo video: HLS ladder + vidstack player

`web/src/lib/components/DemoPlayer.svelte` is a port of address-agent's `FilmPlayer.svelte`
(xyref.com/video): vidstack elements with a bar composed from the primitives, hls.js for the
ladder, skinned in this site's tokens. It autoplays muted in a loop while on screen (paused off
screen, never under `prefers-reduced-motion` or Save-Data); the teal badge restarts it with sound.
The film is cut with `~/.claude/skills/film-ladder` from `~/Downloads/upapp-video/up-1min.mov`
(4K60, 76s) into `web/static/media/demo/` (five HLS rungs + 1080p faststart mp4 + poster, ~105MB).
That directory is git-ignored and deployed on its own by `web/deploy/deploy-media.sh`; a re-cut
goes in a new directory and `web/src/lib/video.ts` (`MEDIA_BASE`) moves with it, because
segments are served immutable.

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

- No real product screenshot assets — the hero stat strip still uses placeholders (per Figma, which also placeholders the founder photo: "Photo:
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
  `user_template`. `user_subscriptions.user_id` is the **email**; but `user_fav`, `user_search`
  and `user_template` are keyed by the **WordPress numeric user id** as a string (`'55'` =
  Stuart), because the WP embed passed `wp_users.ID` as `id`. `/auth/me` therefore returns
  `users.wp_user_id` as `id` (email for accounts with no WordPress past). Corrected 2026-09-07
  after favourites came back empty for every migrated member.
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

### WordPress source and the 2026-09-06 member import

- Source site runs in Docker on the Urban API host (`upapi` alias = `ssh root@45.79.118.32`), stack
  at `/opt/urbanprospects-test`, containers `urbanprospects-test-web` / `urbanprospects-test-db`
  (MariaDB 11.4). DB credentials are in the git-ignored `wp-credentials.md` at the repo root — never
  commit them. WordPress 6.9.7, WooCommerce Subscriptions with **legacy post storage** (HPOS off:
  subscriptions are `wp_posts.post_type='shop_subscription'`), gateway plugins are Pin Payments and
  WooPayments. Regions a member bought are stored as the `Regions` meta on the subscription's line
  item; older 2024 Enterprise subs have no `Regions` meta (treated as all five).
- 169 `wp_users`: 96 on `$wp$` (WP 6.8+ bcrypt), 73 on `$P$` phpass. Both formats are verified by
  `web/src/lib/server/password.ts` (`verifyPassword`), tested 2026-09-06 against hashes generated
  by the live WordPress container. `$wp$` is bcrypt over
  base64(**HMAC**-SHA384(trim(password), key `'wp-sha384'`)) — a plain sha384 prehash silently
  fails every WP 6.8+ login, which is how the first draft of that file was wrong.
- Of 74 `wc-active` subscriptions, 53 are the "VIP … free trial" products (4224/4238/4240/4241)
  and were **deliberately not imported**. The other 21 paid/comped subscriptions (Starter,
  Business, Enterprise, 1 region, 3 regions; yearly and monthly) were loaded 2026-09-06 into
  `wp_import_subscriptions` (raw, DDL `web/deploy/sql/003_wp_import_staging.sql`, includes the
  Pin customer tokens), `users`, and `user_subscriptions` (status `Active`, `plan` = Woo product
  title, `billing_cycle` `Yearly`/`Monthly`, `user_region` comma-joined with no spaces, the format
  `upapp/api.js` writes). Pin tokens cannot map to Stripe `payment_customer_id`; those columns stay
  NULL until each member is re-carded on Stripe. The 24 rows in `user_subscriptions` = 3 pre-existing
  Stripe/Demo rows + 21 imported.
- The current `upapp` API has no login of its own: it calls WordPress `/api/create_update_user`
  (a functions.php endpoint, bearer token in `api.js`) and relies on WP for auth. That is what the
  new `users` table replaces (UP-021/022/030).

## Login, sessions and the /app mount (phase 3, built 2026-09-06)

- The site now builds with **adapter-node** (`web/build/index.js`), not adapter-static. Marketing
  pages are still prerendered; the auth routes opt out with `export const prerender = false`.
  Deploy steps, nginx vhost and systemd unit: `web/deploy/README-auth.md`, `nginx-site.conf`,
  `upweb.service`. Env comes from `web/.env` (template `web/.env.example`, git-ignored).
- `web/src/lib/server/`: `db.ts` (pg pool on `DATABASE_URL`), `password.ts` (verify phpass /
  `$wp$` bcrypt / bcrypt / argon2id, rehash to argon2id — `npm run test:password`), `session.ts`
  (`sessions` table, cookie `up_session` holds a random token, only its sha256 is stored, 30-day
  sliding expiry), `auth.ts` (login by email or user_login, reset tokens, change password),
  `mail.ts` (nodemailer; no `SMTP_HOST` = print to stdout, so staging never sends).
  `src/hooks.server.ts` puts the user on `locals.user`. Schema: `web/deploy/sql/002_sessions.sql`.
- Routes: `/login/` (`?next=` same-origin paths only), `/logout/` (POST), `/forgot-password/`,
  `/reset-password/[token]/`, `/account/` (plan + regions from `user_subscriptions`, password
  change), `/auth/check` (200/401 session probe; nginx no longer uses it as an `auth_request`
  gate), `/auth/me` (JSON profile).
- **Superseded 2026-09-06/07:** the app was merged into this repo (see "The property app,
  merged" below), so it is no longer built separately or served by nginx from a static alias.
  `/auth/me` returns `id/email/plan/first_name/last_name/regions/has_access/renew_url`; `id` is
  the WordPress user id (see "Schema notes"). The app's `onMount` fetches it when `?id=` is
  absent and feeds it into the existing querystring parsing; `is_logged_in` in
  `map/+page.svelte` derives from it too.
- **Paused in upapp until the Stripe checkout exists** (`PURCHASES_PAUSED` in `Property.svelte`,
  `+page.svelte`; `TRIAL_LINKS_PAUSED` in `trial/+page.svelte`): title search (Woo item 920),
  plan dealings / image search (5057), due-diligence report (`add-to-cart=9926`), and the
  `/vipN/<email>` trial magic links. Each shows a holding notice. Flip the constants to re-enable.
- `api_domain` is relative `/q`; nginx proxies it to `upapi.imtg.com.au` (done in the repo's
  `deploy/nginx-site.conf` and, since 2026-09-07, in the live preview vhost — see "Live server
  vhost" below). Still open: the `/pricing` and `/property?pid=` WordPress URLs the app links
  to need routes or redirects.
- `users.is_test` (added by `004_users_is_test.sql`) and `wp_import_subscriptions.is_test` flag the
  10 non-customer accounts Danny identified on 2026-09-06: urbanperspectives.com.au staff (Stuart,
  Mary, Tony, Wassef), the imtg dev-agency accounts, and kheradmandi.m@gmail.com (mitch@partridgebuilding.com was flagged too but
  unflagged 2026-09-08: a real Pin subscriber). They keep login access;
  exclude them from customer counts and billing. That leaves 11 real paying members, 1 monthly.

## Outbound mail: Postmark (2026-09-08)

`web/src/lib/server/mail.ts` prefers Postmark's HTTP API (`POSTMARK_TOKEN`, no SDK — just
`fetch`), falls back to nodemailer/SMTP, and with neither set logs the message to stdout, so dev
and staging never send. Postmark answers HTTP 200 with a non-zero `ErrorCode` on failure, so both
are checked.

- **The verified sender domain is `app.urbanprospects.com.au`, not the root domain.** Cloudflare
  carries Postmark's DKIM (`…pm._domainkey.app.urbanprospects.com.au`) and return-path
  (`pm-bounces.app.urbanprospects.com.au`) for the subdomain; the root domain's matching records
  are not confirmed on this Postmark account, and every `From: …@urbanprospects.com.au` is
  rejected with "not a Sender Signature". Verification is at domain level, so any local part on
  the subdomain sends. `MAIL_FROM` is therefore
  `Urban Prospects <no-reply@app.urbanprospects.com.au>` with `MAIL_REPLY_TO=info@urbanprospects.com.au`
  so replies reach a real inbox. `_dmarc` is `p=none; aspf=r; adkim=r` — relaxed alignment, so the
  subdomain DKIM aligns with the org domain.
- `requestPasswordReset` catches and logs a send failure rather than throwing: `/forgot-password/`
  must answer identically whether or not the address exists.
- Delivery to `danny@moble.com.au` confirmed 2026-09-08 (Google `250 2.0.0 OK`). **Standing rule:
  never send test mail to that address** — ask Danny for a throwaway first.

## Admin console (`/admin/`)

Server-rendered, DB-backed, gated in `web/src/routes/admin/+layout.server.ts` to `users.role =
'administrator'` (non-admins get 403, anonymous users bounce to `/login/?next=`). Queries live in
`web/src/lib/server/admin.ts`; display helpers in `web/src/lib/admin-format.ts`. Layout follows the
address-match console (left rail, stat tiles, filterable paginated tables) restyled with this
site's tokens (`.spec`, `--color-line`, brand purple/teal) via `.adm-*` classes in the layout.

- `/admin/` — tiles (paying members, active subs, annualised revenue, ending in 30 days, trialing,
  users) + next-60-days period ends + recent logins.
- `/admin/users/` — search/filter/paginate, create user (temp password); `/admin/users/[id]/` —
  edit details/role/status/test flag/Stripe customer id, set temp password (ends sessions),
  sign out everywhere, subscriptions on that email, add a subscription, read-only WordPress import record.
- `/admin/subscriptions/` — filter by status/cycle/plan/test; `/admin/subscriptions/[id]/` — edit
  status, plan, cycle, price, period end, regions, lookups, note; delete (for duplicates).
- Renaming a user's email cascades to `user_subscriptions` because the app keys on email.
- `/account/` (2026-09-07) no longer uses the console shell. It is styled as the property app's
  map view on the plain page ground (the spinning `MapboxHero` backdrop was dropped
  2026-09-07): a full-height 30rem frosted menu panel on the left (Overview / API keys /
  Billing / Email template / Password) and one continuous detail panel
  on the right. Overview carries the dashboard tiles (plan, regions, plan ends, bookmarked
  properties from `user_fav` keyed by `wp_user_id`, API key count). API keys render redacted
  with a per-row eye toggle; Copy always copies the full key. Billing shows the
  `user_subscriptions` row. "Update card" (Stripe customers) mounts a Stripe card element:
  `POST /account/card` mints a SetupIntent (`createSetupIntent`), the client confirms it,
  then the `?/card` action makes the `pm_` the customer's and subscription's default
  (`setDefaultPaymentMethod`, `lib/server/stripe.ts`). Needs `STRIPE_PUBLISHABLE_KEY` as well
  as the secret key; until both are set the button is disabled. "Invoices and billing
  details" still opens the Billing Portal. Imported Pin members are sent to `/renew/` to
  re-card. Overview tiles: Plan (4/5) + Plan ends (1/5), then Regions / Bookmarked / API
  keys; no region pills or Search button. Log out sits at the foot of the menu panel.
  "Email template" (2026-09-07) edits the prospect email the app merges with Handlebars:
  tiptap editor + from-address fields, upserted into `user_template` keyed by the same id
  the app uses (`wp_user_id`, else email) so upapp's `/q/template/<id>` reads it unchanged.
  Styles in `web/src/lib/account.css` (`.acct-*`, tokens mirror `lib/app/css/skin.css`); the
  open section is kept in the URL hash.
- Administrators land on `/admin/` after login (and when visiting `/login/` already signed in)
  unless a `next` was given; everyone else lands on `/account/`. The root layout drops the
  marketing Header/Footer on `/admin*` — the console has its own rail. Wording is "Log out"
  everywhere (site and admin), never "Sign out".
- Saving a subscription's period end through the date input stores midnight UTC of the chosen
  day; imported timestamps carry a time of day, so a save truncates it. Harmless for entitlement.
- Migration `005_subscription_period_end.sql` added `current_period_end`, `updated_at`,
  `admin_note` to `user_subscriptions` (additive; upapp inserts by column list).
- Admin account `admin@urbanprospects.com.au` (users.id 22, `is_test`, argon2id) was created
  2026-09-06 with the temporary password Danny specified; change it after first login via
  `/account/`. `passwordProblem` enforces ≥10 chars on new passwords only, so the short temp one
  logs in fine.
- Local dev against the real DB: `ssh -f -N -L 5433:192.168.146.115:5432 root@172.105.183.89`
  then `web/.env` with `DATABASE_URL=postgres://postgres:<pw>@127.0.0.1:5433/UrbanPortalDBP`
  and `COOKIE_SECURE=0`. The password is the one in `~/.pgpass` on the updb host.

## Renewal pathway for imported members (no outreach)

Decided 2026-09-06: members are never emailed or linked. `web/src/lib/server/renewal.ts`:

- **Login redirect**: after login, an imported (non-Stripe) `Active` row whose `current_period_end`
  is within 7 days (`RENEW_WINDOW_DAYS`) or already past sends the member to `/renew/` instead of
  `/account/`. `/account/` also redirects when overdue and shows a banner when merely due.
- **`/renew/`** prefills plan, regions and cycle from that row (or, for a cancelled/expired
  member, their most recent row; default 1 region yearly otherwise) and starts a Stripe Checkout
  with **no trial**, email locked to the account, metadata `renewal_of` + `user_id`.
  `/renew/success/` fetches the session (expanded subscription) and writes the Stripe row itself
  (`ON CONFLICT (payment_subscription_id)`, so the upapp webhook landing first is harmless),
  sets `users.stripe_customer_id`, marks the imported row `Expired`, and sets
  `wp_import_subscriptions.woo_cancel_due_at` so the admin knows to cancel the WooCommerce
  subscription (Pin keeps billing until someone does — never bulk-cancel Woo at cutover).
- **Cancelled members keep login and search.** `/auth/check` (nginx gate for `/app/`) passes
  anyone logged in. `/auth/me` now returns `has_access` (Active/Trialing row; imported rows only
  while not past period end; admins always true) and `renew_url`. **upapp must gate the property
  details panel on `has_access === false` and render `renew_url` there** — that change lives in
  the upapp repo and is not done yet.
- **Admin cancel** (`/admin/subscriptions/[id]/`): "Cancel at period end" (Stripe
  `cancel_at_period_end=true`, mirrored in `user_subscriptions.cancel_at_period_end`) and
  "Cancel now" (Stripe `DELETE /v1/subscriptions/:id`, row -> `Canceled`, `canceled_at`). Stripe is
  called first; the row changes only on success. Imported rows have no Stripe call — they are
  marked and the Woo cancel queue is set. Dashboard shows the queue; the sub page has "Mark
  cancelled in WooCommerce". Migrations 006 (queue columns) and 007 (cancel columns) applied.
- Stripe env (`STRIPE_SECRET_KEY`, `STRIPE_PRICE_REGION_*`) is not in the local `.env`; `/renew/`
  shows a "not switched on yet" notice and disables the button until it is.
- First live case: jai@definedplumbingcivil.com.au, monthly, Pin renews 9 Sep 2026 — bump his
  `current_period_end` to 9 Oct after confirming that charge; he becomes the first Stripe renewal.

## Member self-service billing and child accounts (2026-09-07)

`web/src/lib/server/billing.ts` backs the /account/ Billing and Users sections (actions in
`account/+page.server.ts`: `cancel`, `resume`, `changePlan`, `addChild`, `removeChild`,
`resendInvite`). Decided 2026-09-07: **the old Pin/WooCommerce billing is not self-managed** —
any upgrade, downgrade, seat change or re-card on an imported row goes through Stripe Checkout
(`startRenewalCheckout` with the chosen regions/cycle/seats; `/renew/success/` retires the
imported row as before). Only live Stripe rows are changed in place:

- **Change plan**: `updateSubscriptionPlan` swaps the single line item to
  `STRIPE_PRICE_REGION_{N}{M|A}` with quantity = seats. Dearer per month ⇒
  `always_invoice` (prorated difference charged now, `error_if_incomplete`); cheaper ⇒
  `create_prorations` (credit on the next invoice). Metadata `regions/users/interval/user_id`
  is rewritten so a webhook mirroring metadata stays consistent. The row's
  `user_region/billing_cycle/plan/payment_price(_id)/seats/current_period_end` follow.
- **Cancel** = `cancel_at_period_end=true` (access to period end), **Keep** = resume.
  Stripe is called first; the row changes only on success. No "cancel now" for members.
- **Child accounts** (migration `009_child_accounts_seats.sql`): `users.parent_user_id`
  and `user_subscriptions.seats`. Prices are per user, so seats = Stripe item quantity =
  1 + active children (`syncSeats`, called after add/remove; an add that Stripe refuses
  deletes the child again). A child is a normal `users` row (own password, own favourites
  keyed by its email) whose `billing_email` (new `SessionUser` field, parent's email) drives
  plan, regions and `/auth/me.has_access`. Removing sets `status='inactive'`,
  clears the parent and ends sessions. Invites reuse `password_reset_tokens` (7-day link,
  `issueResetToken` in auth.ts). Children see a read-only Billing section and no Users
  section. `MAX_SEATS` = 20. Adding children needs a live Stripe row.
## Live server vhost (143.42.46.116) vs `deploy/nginx-site.conf`

The nginx config actually serving `preview.urbanprospects.com.au` is
`/etc/nginx/conf.d/preview.urbanprospects.com.au.conf` on the box, **not** the repo file, and it
drifts. Found 2026-09-07: it still aliased `/app/` to `/opt/www/upapp-gated/` (a stale standalone
build behind `auth_request`) and proxied `/q/` to `127.0.0.1:3000`, which on that host is
`/opt/api/api.js`, an unrelated OpenAI vector-store service, so every app API call 404'd. Both
blocks were rewritten that day (`/app/` -> the Node site, `/q/` -> `upapi.imtg.com.au`, cookies
stripped); backup `*.conf.bak-2026-09-07`. The Node site listens on **3010** there (`PORT` in
`/opt/www/upweb-node/.env`) because 3000 is taken. `deploy/nginx-site.conf` is the intended
config; when it and the live file disagree, check the live file first. `/opt/www/upapp`,
`/opt/www/upapp-gated` and `/opt/www/app` are dead directories. 2026-09-08: a `/q/v2/` block
that forwards the `up_session` cookie (for the API's session-checked `/v2/app/*` routes) was
inserted ahead of `/q/` in the live file; backup `*.conf.bak-2026-09-08-pre-v2`.

## API list lookups: materialised views (2026-09-07)

Uncached `/q/{lga_name,suburbname,zone}/search` calls used to scan the 47GB
`up_property_d_3` (150–230s each) and, with Sequelize's default pool of 5, starved
`/q/fav`, `/q/template` and `/q/usersearch` for minutes (Cloudflare 524s). Now:

- `mv_d3_zone_lookup` (region, LGA, suburb, zone label, zone class, count; 40k rows) and
  `mv_region_lga_suburb` (5.1k rows) are built off `up_property_d_3` in ~25s and answer
  every list endpoint in <40ms. `api.js` (`_lga_list`/`_suburb_list`/`_zone_list`) queries
  only these; `Region_LGA_Suburb` is no longer used by the list endpoints (its data was
  suspected stale). Cache keys are sorted/trimmed lists.
- Nightly refresh + memcache flush/warm: `/usr/local/bin/refresh-lookups.sh` on the DB hop
  host (`updb`, cron 03:30 UTC, log `/var/log/refresh-lookups.log`). Run it by hand after any
  property-data load.
- `sequelize.js` / `sequelize-standby.js` on the API host now set
  `pool: { max: 20, acquire: 120000 }` and `statement_timeout: 180000` (the old top-level
  `max: 10` was ignored by Sequelize). Backups of both plus `api.js.bak-2026-09-07-pre-mv`
  sit beside them.
- `deploy/nginx-site.conf` proxies `/q`, `/q2` straight to `upapi.imtg.com.au` and `/p`, `/p2`
  to the GIS server with the standby as an nginx `backup`, replacing WordPress's PHP proxies
  (`/var/www/html/{q,q2,p,p2}`). The DB live/standby swap already lives in `api.js`
  (`standby` file, `/standby/on|off`).

## App search: v2 aggregate, no count scans, Mapbox clusters (2026-09-08)

A search used to be three scans of `up_property_d_3` (page, `count(*)`, `get_suburb`), and the
suburb overlay was skipped for slider-only searches, so a state-wide result showed nothing to
click. Now:

- `deploy/api/patch_api_v2.py` patches `api.js` on the API host (`upapi`,
  `/srv/users/upapi/apps/api/api.js`; copy it over, back up, run it, `node --check`, `pm2
  restart api`). It adds `requireSession` (reads the site's `up_session` cookie, checks
  `sessions`/`users` in the same Postgres, 60s in-memory cache) and the routes
  `/v2/app/me`, `/v2/app/properties` (page, same filters) and `/v2/app/properties/suburbs`
  (one `GROUP BY suburbname` scan: `{suburbname, n, geom}` with a real centroid; memcached 10
  min per body). `/v2/properties` **without** `/app` is the public bearer-key Planning Data
  API; leave it alone. When every caller is on `/v2/app/*`, the unauthenticated v1 routes can go.
- nginx: `location /q/v2/` forwards the Cookie header (v1 `/q/` still strips it). Vite dev
  proxies `/q/v2` straight to `upapi.imtg.com.au` with the cookie; dev sessions live in the
  same DB so they verify.
- `routes/app/+page.svelte`: `_api_post()` tries the v2 path and falls back to v1 on 404, so the
  app works before and after the API patch. The per-search `count(*)` and the "unbounded
  count" on empty bounded results are gone; the total is the sum of the aggregate's `n`
  (`suburb_total`), which also answers the Total Results button instantly. The aggregate
  is fetched on fresh searches only (reset 1/0), never on bounded map re-searches.
- Results source is a Mapbox cluster source (`clusterRadius` 48, `clusterMaxZoom` 16) with a
  `suburb` cluster property that reduces to the suburb name while every point shares it,
  else `MIXED`. Cluster labels show "SUBURB\n n" for single-suburb clusters of 10+ below
  zoom 15, otherwise the count; clicking a cluster eases to its expansion zoom. Teal suburb
  circles (zoomed out) now carry "NAME · n".
- **Stacked points** (strata units, "PT" part lots): every unit sits on the parent lot's point,
  so the cluster can never expand. When the expansion zoom is past `clusterMaxZoom` (or the
  map is already at 16+), the click opens `_show_cluster_picker`: a Mapbox popup
  (`.cluster-picker`, skin.css) listing each leaf's address plus a detail line
  (lot/plan, land value, estimate, propid) since part lots share one address string; picking
  one calls `_handle_view_property(gurasid)`. The lot-fill click handler also treats a
  cluster under the click as "a dot is here" so it no longer opens the base lot instead.
- **Zoom boundary is integer-compared** (`parseInt(map.getZoom()) >= zoom_boundary`, 15), so a
  fit that lands on 14.9 hides the dots and leaves only the teal circle. `_fly_into_suburb`
  (suburb circle / polygon click) frames the suburb's loaded result points and clamps to
  `[zoom_boundary + 0.5, zoom_boundary + 2]`; the fresh-search fit in `addMarkers` lifts a
  near-boundary fit to `zoom_boundary + 0.5` the same way. Previously the circle click flew to
  the centroid at zoom 18, which showed neither of two favourites 1 km apart.

## Dev server note

`vite.config.ts` ignores `build/**` and `.svelte-kit/output/**` in the file watcher. Without
that, `npm run build` (from any session) makes the dev server issue dozens of full page
reloads and the app never reaches `is-ready` — it looked like a blank/broken page.

The `/q` dev proxy strips `cookie`/`set-cookie` (`vite.config.ts`). The current upstream is
WordPress-fronted and sets `PHPSESSID`; with that cookie stored for the dev origin, PHP's
session lock serialises every `/q` call behind the slowest one (an uncached region-filtered
`/q/zone/search` runs 15–65s), so `/q/fav`, `/q/usersearch`, `/q/template` waited 25–75s and
`/app/` sat blank in dev. Production nginx proxies `/q` straight to Express, no PHP session, so
it never saw this. Also: several stale `vite dev` processes on the same `web/` dir each rewrite
`.svelte-kit/generated/**` on start and trigger full page reloads in the others — kill old ones
(`lsof -nP -iTCP -sTCP:LISTEN | grep node`) rather than chasing phantom reload storms.

## The property app, merged (`/app/`)

`upapp` (the SvelteKit 1 / Svelte 4 property search app from `~/Downloads/upapp`) was copied
into this project on 2026-09-06 so one node server, one session cookie and one deploy cover
site + app. Nothing was rewritten: Svelte 5 compiles the Svelte 4 components in legacy mode.

- `web/src/routes/app/{+page,map,house,trial}` ← upapp `src/routes/*`; `web/src/lib/app/*` ←
  upapp `src/lib/*` (imports rewritten `$lib/` → `$lib/app/`); `web/static/app/` ← upapp
  `static/app/` (its stylesheets, images, lucide icon font). Every copied file carries
  `@ts-nocheck` — the app is untyped JS and `svelte-check` would otherwise report ~1,000
  strictness errors that are not bugs. `.backup` files, `yield.html`, `test.html` and
  `custom_backup.css` were not carried over.
- `web/src/routes/app/+layout.ts`: `ssr=false`, `prerender=false` (browser-only SPA).
  `+layout.server.ts`: requires `locals.user` (else `/login/?next=`), returns `has_access`.
  `+layout.svelte`: imports `$lib/app/css/{global,theme,skin}.css` (Vite-bundled, HMR) + links lucide, forces a white light page, and maps
  `--font-family` to the site's `--font-sans` (Geist). Root layout hides Header/Footer on `/app*`.
- Identity: the page's existing `/auth/me` branch is used (no query string). `/auth/me` now
  also returns `has_access` + `renew_url`; `+page.svelte` passes `has_access` into
  `Property.svelte`, which renders a `.subscribe-gate` (link to `/renew/`) instead of the
  details when false. Search, favourites list and map all keep working for cancelled members.
  A member with no plan row is no longer bounced to `/pricing`; they get the gate.
- `api_domain` is now relative `/q` (nginx proxies to the Express API in production;
  `vite.config.ts` proxies it to www.urbanprospects.com.au in dev). `website_domain_with_http`
  is unchanged.
- Fonts: Poppins/Montserrat/Space Mono (Typekit + Google Fonts) were replaced with
  `var(--font-sans)` / `var(--font-mono)` across the copied CSS and component styles; the
  Typekit and Google Fonts `<link>`s are gone. Headings 600, body 400. Stripe Elements gets a
  literal Geist stack (its iframe cannot read our variables).
- Svelte 5 compile fixes applied to the copy: `<div>` inside `<p>` in `Design.svelte`
  (tooltip now a `<span>`), `;;` in three `<style>` blocks. The rest compiles as-is; the 186
  remaining `svelte-check` warnings are a11y/unused-CSS in the app and are pre-existing.
- Debug shortcut kept from upapp: Ctrl+Shift+P opens property 1645912 directly — handy for
  testing the panel without a search.
- nginx: `deploy/nginx-site.conf` no longer aliases `/app/` to `/opt/www/upapp` or uses
  `auth_request`; `/app/` is just another node route. `/opt/www/upapp` and upapp's
  `npm run build` SFTP deploy are obsolete — **do not run upapp's build any more**; deploying
  this project deploys the app.
- **Skin**: `web/src/lib/app/css/skin.css` (loaded after theme.css) restyles the app's main
  surfaces to match the site and /admin without touching its markup: frosted-glass search
  panel, tool rail and property panel (`color-mix` on `--bg`/`--fg` + backdrop blur, so it
  works in both themes), mono `.spec`-style section labels, pill segment groups, brand-purple
  primary button, `.auth-field`-style inputs and svelte-select variables, neutral chip
  borders. Rules are scoped to `.up-app` and use `!important` on purpose — the app's own
  scoped styles and tokenised inline `style=""` attrs would otherwise win. Extend this file,
  not the app's markup, for further visual alignment.
- **Behaviour tweaks made during the restyle** (in `web/src/routes/app/+page.svelte`): every
  `<Select>` gets `floatingConfig={select_floating}` (fixed strategy + floating-ui
  offset/flip/shift/size) so dropdown lists escape the scrolling panel and stay inside the
  viewport at any height. The glass blur on the panel lives on a `::before` pseudo-element,
  not the panel itself — a `backdrop-filter` on the panel would make it the containing block
  for those fixed lists and they would be clipped by `.filter-container`'s scroll again;
  `_clean_options()` filters empty/whitespace/duplicate rows out of the LGA, suburb and zone
  lists (the API returned two blank LGAs); the "All" region chip was removed (a member whose
  plan covers all five regions simply starts with all five selected; `region_all` is still
  derived reactively for the legacy code paths). **List is a slide-in panel over the map
  (2026-09-07)**: the map is always the view; `show_list` (not `use_listview`, which still
  drives the CRM/settings layouts) adds `.show-list` to the root and skin.css positions the
  already-rendered `.search-result-parent-container` as a fixed 34rem frosted column on the
  right, fed by the same 450-per-page `properties` the markers use (no second search, no
  infinite scroll). It slides out while `.viewing-property` and returns when the detail
  panel closes; a full-width bottom sheet under 60em. `_regions_filter_value()` omits the
  `regions` filter from LGA/suburb/zone/permissible-use calls when every region is selected:
  the API answers `{}` in <1s but an explicit five-region list on `suburbname/search` takes
  >25s (server-side, worth an index on the API box). The 30rem-wide panel applies to map
  view only — in list view `.listing-container` also holds the results grid.
- **Dark/light**: the app follows the site's theme (data-theme on `<html>`, else system).
  `web/scripts/app-theme.py` replaced all 1,580 colour literals in the app's CSS contexts
  (.css files, `<style>` blocks, literal `style=""` attrs — never JS/Chart.js/Mapbox paint)
  with `var(--up-c-<hex>)` and generates `web/src/lib/app/css/theme.css`: light = original
  values, dark = derived (greys invert lightness with a faint purple cast toward `--bg`,
  pastel surfaces go dark, saturated darks lift to ~0.7 lightness). 226 tokens. Re-run the
  script after adding colours to app styles; it is idempotent. Page ground uses the site's
  `--bg`/`--fg`. Map tiles and photos are untouched. A shadcn/Tailwind rewrite of the app
  (2,300 usages of `incremental.css` grid/spacing utilities across a 9.4k-line page) remains
  a separate decision under UP-031.
