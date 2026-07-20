# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

**Urban Prospects** (`urbanprospects.com.au`) is a planning-intelligence marketing site for a NSW
(Australia) property/development SaaS: search every property in NSW, filter by 34+ planning
attributes (zoning, SEPPs, CDC eligibility, Pattern Book suitability), run yield and residual-land-value
analysis, test Pattern Book designs in 3D, and negotiate with owners — on-market or off-market —
before competitors know a site exists.

This repo is the **homepage rebuild**, architecturally cloned from `/Users/dannyliang/Downloads/blip/web`
(SvelteKit 5 + Tailwind v4, `adapter-static`, token-swap dark/light theme, liquid-glass panels,
scroll-reveal, a full-bleed animated hero). Content and section order come from the Figma file
*"Urban Prospects — Homepage Redesign"* — **content/order only**; none of Figma's visual styling
(cream backgrounds, flat card treatment, solid-purple full-bleed bands) was carried over. The visual
language is blip's, re-themed to Urban Prospects' brand colours.

## Content source

Figma access required login this session couldn't obtain; the actual homepage content was extracted
from a client-exported PDF (`~/Downloads/Homepage/Desktop 1440.pdf`, 1440×7065pt, one continuous
scrolling frame) rendered to PNG via `pdftoppm` and read in slices. Section order, as built in
`web/src/routes/+page.svelte`:

1. **Hero** — pill "Planning Intelligence for NSW" · H1 "Find better sites, faster. Secure them with
   confidence." · body · CTAs (Search for a Site Now / Watch How It Works) · "Search. Save. Succeed."
   · 3-stat strip (12 viable sites / 9 min to shortlist / 34+ filters applied — pulled off the
   Figma's inline dashboard mockup, which the Mapbox hero replaces).
2. **Every advantage, measured** — 6 stat cards (4.5 million properties / 100% visibility / 34 data
   sources / Permissible uses / 17 Pattern Book designs / Weekly updates).
3. **From site search to feasibility in minutes** — demo video placeholder (no real video asset yet).
4. **What you can do** (`#platform`) — 8 capability cards (search, off-market, yield, 3D, RLV,
   negotiate, shortlist, reports).
5. **Case studies** — 3 testimonials (Sarah/agent, Alex/developer, Maya/architect) with outcome tags.
6. **Built by planners, not just data people** (`#insights`) — founder teaser + "Follow Our Planning
   Insights" CTA.
7. **Our services** (`#services`) — two pricing cards ($55 one-off report vs 7-day platform trial) +
   "Who uses Urban Prospects" pill list.
8. **Planning Data APIs** (`#data-apis`) — API pitch + 6-item checklist.
9. **Final CTA** — "Your next site is already in the platform."
10. **Founder's story** (`#about`) — fuller Stuart Wilmot bio + video placeholder.
11. **Footer** — Platform / Services / Contact columns, tagline, theme toggle.

Figma also duplicates the founder content (a short teaser mid-page, a fuller story near the footer) —
preserved as-is rather than de-duplicated, since that's a deliberate teaser→payoff pattern.

`Platform`/`Services`/`Data APIs`/`About`/`Insights` are same-page anchors (`#platform` etc.), not
separate routes — Figma only covers the homepage. `Login`/`Start Free Trial`/`Book a Demo`/`Buy a
Report`/`Explore the Data APIs` route to small stub pages (`web/src/routes/{login,signup,demo,report,developers}`)
that `mailto:info@urbanprospects.com.au` rather than pretending a working signup/auth backend exists.

## Design system

- **Theme**: token-swap dark/light via `data-theme` on `<html>` (system/light/dark, `ThemeToggle.svelte`,
  pre-paint script in `app.html` avoids FOUC) — identical mechanism to blip.
  - **Dark** (default): `--bg:#0a0710` — a near-black tuned faintly toward the brand purple, not a
    neutral black (sampled from the Figma's own dark section, `#140d1f`, used as the raised-panel tone).
  - **Light**: `--bg:#ffffff` — pure white, deliberately **no** cream/beige undertone (Figma's actual
    light sections were beige `#f2ede5`; overridden per instruction).
- **Brand colours** — extracted from the Figma PDF by sampling pixels (`web/src/app.css`
  `--color-brand-purple:#5c2687`, `--color-brand-teal:#5ee8ad`) and used **only as highlights**: CTA
  fills, stat numbers, icon chips, active states, checkmarks — never as a page-filling background (the
  Figma's solid-purple stat band and CTA band were re-themed to the standard `--bg`/`--color-subtle`
  alternation instead). `--accent-teal-text` swaps the raw mint (dark mode) for a darkened ink-teal
  `#0d7a56` (light mode) so it clears AA contrast on white.
- **Fonts** — Geist Sans / Geist Mono, self-hosted via `@fontsource/geist-sans` + `@fontsource/geist-mono`
  (imported in `app.css`), replacing blip's Inter/system-mono.
- **"Vibe" carried over from blip**: `.spec` monospaced uppercase eyebrow labels (Figma's own eyebrows —
  "Planning Intelligence for NSW", "Case Studies", "Founder's Story" — map onto this directly), the
  `.glass` liquid-glass panel utility (SVG displacement filter in `+layout.svelte`, Chromium-only
  refraction, plain frost elsewhere), the faint fixed film-grain overlay, and the `Reveal.svelte`
  scroll-in fade/blur/rise wrapper.

## Hero: Mapbox instead of blip's dot-cloud

`web/src/lib/components/MapboxHero.svelte` replaces blip's three.js `DotCloudZoom` with a full-bleed
Mapbox GL map, reusing the exact same technique (fixed background div, a single `requestAnimationFrame`
loop reading scroll progress off the hero's bounding rect every frame, `jumpTo()`-style low-level camera
writes instead of animated transitions so nothing stacks/janks):

- **Token + style**: public URL-restricted token and base style lifted from
  `/Users/dannyliang/Desktop/ims/upapp` (`src/routes/map/+page.svelte`) — intentionally **no** custom
  planning-overlay layers (LSZ, coastal management, contamination sites, etc.) from that app; just the
  stock `mapbox://styles/mapbox/{dark,light}-v11` basemap, swapped on theme change via the same
  `MutationObserver` pattern as blip's `MarketMap.svelte` (camera pose survives `setStyle()` automatically).
- **Centre**: Elizabeth Bay House, 7 Onslow Ave, Elizabeth Bay NSW 2011 (`-33.8701, 151.2265`).
- **Auto-spin**: bearing increments every frame (`~2.6°/s`, ~140s/revolution) via `map.jumpTo()`, paused
  when the hero scrolls out of view (`IntersectionObserver`) or the tab is hidden, to hold 60fps and
  save battery — never a Mapbox animation call (`easeTo`/`flyTo`) stacking on top of itself.
  `prefers-reduced-motion` renders one static frame and never starts the loop.
- **Scroll → zoom → fade**: identical shape to `DotCloudZoom` — zoom/pitch ease in over `zoomVh` of a
  viewport-height of scroll, then the whole map fades out over a `fadeStart`/`fadeEnd` window of the
  hero's own height so nothing bleeds into the sections below.

## Architecture (mirrors blip/web)

```
web/
  src/
    app.css               design tokens (theme, brand, glass, spec labels, grain)
    app.html               pre-paint theme script, Geist preconnect-free self-hosted fonts
    lib/
      components/
        ui/button.svelte    tailwind-variants button (default/teal/outline/ghost/link)
        Reveal.svelte       scroll-in fade/blur/rise (ported ~verbatim from blip)
        ThemeToggle.svelte  system/light/dark (ported ~verbatim from blip)
        Header.svelte       floating frosted-glass PILL nav (not a full-width bar)
        Footer.svelte
        Logo.svelte         original abstract mark (not traced from Figma's icon)
        MapboxHero.svelte   see above
        StubPage.svelte     shared "not live yet, email us" pattern for the 5 stub routes
      utils.ts              cn() — clsx + tailwind-merge
    routes/
      +layout.svelte        header/footer shell, org JSON-LD, liquid-glass SVG filter def
      +page.svelte          the whole homepage, one file, Figma content/order (see above)
      {login,signup,demo,report,developers}/+page.svelte   stub pages
  static/                   favicon.svg, apple-touch-icon.png, robots.txt
```

Single-file `+page.svelte` (not one file per section) is deliberate — it mirrors blip's own
homepage, which is one 547-line file with all sections inline.

## Header: frosted-glass pill nav

Not blip's full-width sticky bar. One continuous floating rounded-full capsule (`Header.svelte`),
centred with margin on all sides, `.glass` frosted/backdrop-blur, containing logo + nav links + Log In
+ Start Free Trial all inside the same pill — modelled on the attached reference screenshot (a dark
rounded pill floating over a hero photo, logo left / links centre / CTA right). Collapses to a
hamburger-triggered dropdown panel below `md`.

## Commands

Run from `web/`:

- `npm install`
- `npm run dev` — dev server (port from `$PORT` if set, else 5173)
- `npm run build` — prerenders every route (adapter-static)
- `npm run check` — `svelte-kit sync && svelte-check`

## Known gaps / next steps

- No real product screenshot or demo video assets — hero stat strip and both video sections use
  placeholders (per Figma, which also placeholders the founder photo: "Photo: Stuart Wilmot").
- `Platform`/`Services`/`Data APIs`/`About`/`Insights` are in-page anchors; if these become full
  routes later (matching blip's `/about`, `/pricing`, `/developers` pattern), the header/footer link
  targets need updating alongside new route content.
- Stub routes (`/login`, `/signup`, `/demo`, `/report`, `/developers`) are `mailto:` placeholders —
  no auth/billing backend exists yet (Urban Prospects' own SaaS backend is a separate project).
- No deploy script wired up yet (blip's `postbuild` rsyncs to a droplet; Urban Prospects' hosting
  target isn't set up in this repo).
