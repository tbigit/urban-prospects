# HIN Challenge 2 — pitch video: message, search demo, beat sheet

**Scope: Urban Prospects (`~/Downloads/upapp`) only.** Nothing in this brief assumes capability from
any other project.

Sources: `webinar/webinar_transcript.txt` (Susanna's Challenge 2 + her Q&A answer),
`webinar/Planning Due Diligence Working Template Excel.pdf`,
`webinar/Dual Occ CDC Planning Due Diligence Template.pdf`,
`upapp/src/` and `upapp/api.js`.

---

## 1. What Challenge 2 asks, and where Urban Prospects actually stands

Susanna runs site selection in the Homes NSW pipeline unit. Her feasibility outputs are an **Excel
workbook and a Word template**, filled by hand from "many, many different mapping systems". In the
Q&A she rules out most of the market:

> "There's programs and platforms existing that can aggregate the data into a report. However, what
> we would like is to have that data automatically populate our feasibility templates… **not just an
> instant generation of a report** that at the end of the day, we're going to have to transpose the
> information manually into our template. So we want **direct integration into our Excel or Word
> templates**."

**Urban Prospects today outputs a PDF report.** `pdfFunctions.js` / `PDFBuilder.svelte` build it with
pdfme + jsPDF + pdf-lib. There is no Excel or Word writer in the codebase — `handlebars` is used for
the mail-merge letter, and the one `JSZip` reference at `src/routes/+page.svelte:2795` is commented
out. So the literal ask — write into her workbook — **is not built.**

That is not fatal, and it should not be hidden. The grant funds *pilots*, and the eligibility rule is
explicit: a solution that has "progressed beyond early stage development and is suitable for pilot
testing," including "an already commercialised solution in a different setting that has not been
tested in the NSW social housing environment." Urban Prospects is commercialised for private
developers and has never been pointed at a social housing portfolio. That is a clean eligibility fit.

**So the honest pitch is: the analysis engine already exists and already computes most of her
workbook. The pilot builds the last mile — the write-back into her Excel and Word.**

---

## 2. The spine: her workbook, tab by tab, against what Urban Prospects computes today

Tab names taken directly from `Planning Due Diligence Working Template Excel.pdf`.

| # | Workbook tab | Urban Prospects today |
|---|---|---|
| 1 | Executive Summary — Draft | ◑ PDF report summary |
| 2 | Property Description and Site Details | ✅ Property panel — lot/plan, area, width, depth, zoning, LEP, min lot size, FSR, height |
| 3 | Site Accessibility | ✅ Walk Score + Nearby Train / School / Hospital |
| 4 | Transport Oriented Development (Part 2) 400m | ◑ TOD map layer — **not yet a filter** |
| 5A/5B/5C | Low and Mid Rise Housing (Housing SEPP Ch. 6) | ◑ LMR map layer + `LMR.svelte` — **not yet a filter** |
| 6 | Infill Affordable Housing pathway | ❌ gap |
| 7A/7B | Seniors Housing (Housing SEPP Ch. 3 Pt 5) | ❌ gap |
| 8 | Site Compatibility Certificate | ❌ gap |
| 9 | Housing SEPP Development Standards | ◑ partial, via planning controls |
| 10 | Local Development Controls | ✅ DCP + contributions plans + SEPPs per site |
| 11 | **Constraints Checklist** | ✅ **strongest match** — 20+ exclusion filters, 40+ overlays |
| 12 | **Indicative Redevelopment Potential** | ✅ yield calculator + 3D massing + Pattern Books |
| 13 | **Yield and Parking Data** | ✅ `Yield.svelte` — yield, parking, setbacks, landscaping, solar |
| 14 | Applicable Design Guidelines | ◑ 17 Pattern Book designs w/ architect, min lot area & width, FSR |

**Roughly eight of fifteen tabs are substantially computed today.** The three hard gaps — Infill
Affordable, Seniors Housing, Site Compatibility Certificate — are all *social-housing-specific
pathways*, which is precisely what a social-housing pilot should add. That is a coherent story, not
an excuse.

The Word template (`Dual Occ CDC…pdf`) is 8 sections — Property Description · Recommendations · Site
Details · Relevant Planning Provisions · Key Site Constraints · **Key Lot Requirements |
Permissibility** · Key Considerations · Summary — and it cites clauses directly in the table:
`1.18` permissibility ("Dual occupancy is permissible in the R2…"), `1.19` conservation area /
reserved land / acid sulfate soils, `1.19A` BAL-40 or BAL-FZ. Sections 1, 3, 5 and 6 map onto the
property panel, constraints and CDC eligibility Urban Prospects already resolves.

---

## 3. The message

> ### The analysis is already done. It's coming out in the wrong shape.
> Urban Prospects already computes most of the Homes NSW due diligence workbook — it just prints a
> PDF. The pilot writes it into your workbook instead.

Do **not** lead with "generate professional client-ready reports in seconds." That is the exact
product Susanna rejected. Instead, show the report and disown it — it's a stronger, more honest move
and it proves you listened.

---

## 4. Which of the 12 original bullets survive

| # | Original bullet | Verdict |
|---|---|---|
| 1 | Intro — 4.9M properties | **Keep, renumber.** 126,000 (their portfolio) and 15 tabs land harder than 4.9M |
| 2 | 34+ planning filters | **Promote.** Reframe as pathway screening |
| 3 | 40+ overlays | **Promote.** This *is* Tab 11 Constraints Checklist |
| 4 | Save & shortlist | Cut |
| 5 | Yield analysis | **Promote — this is Tab 13.** Was a demoted bullet; it's now core |
| 6 | 3D / Pattern Book | **Promote — this is Tab 12 + 14** |
| 7 | Residual land value | **Cut.** Homes NSW does not optimise for developer profit |
| 8 | Title deeds / negotiate with owners | Cut the negotiation; keep title *data* (Tab 2) |
| 9 | Pipeline / mail distributor | Cut |
| 10 | Generate reports in seconds | **Invert** — use it as the setup, not the payoff |
| 11 | Measurement tools | Cut |
| 12 | Close | Rewrite around the pilot |

Note the inversion versus the homepage cut: **yield and 3D go up, reports and RLV go down.**

---

## 5. The search: CDC + Pattern Books — yes, as a pathway screen

Justified straight from her workbook, not from the marketing:

- Tab 4 is **TOD 400m**; tabs 5A/5B/5C are **LMR under Housing SEPP Chapter 6**. Those are the two
  uplift pathways she screens every site against.
- The Word template is named **"Dual Occ CDC"** — dual occupancy, complying-development pathway.
- Kevin (Challenge 3) names the Government Architect's Pattern Books directly.

Run the whole video on **2 Welby St, Eastwood** — already shot in the existing footage, R2, ~1,024 m²,
corner lot, walk score 85, inside Eastwood station's LMR 400 m ring (visible at 31:35).

| Panel | Setting | Why |
|---|---|---|
| Location | Sydney → **Ryde** → **Eastwood** | Station catchment — Tab 3 Site Accessibility |
| Mode | **Pattern Books**, then a 2nd pass on **Complying Development** | Pathway comparison, not one answer |
| Permissible use | **Dual occupancy**, then **Multi dwelling housing / RFB** | Matches the Word template; then Kevin's "most of our portfolio are apartment buildings" |
| Zoning | **R2** + **R3** | LMR unlocks dual occ / manor houses in R2; R3 carries the mid-rise Pattern Books |
| Minimum Lot Size | **≥ 400 m²** | Dual-occ CDC threshold in `src/lib/cdcRules.svelte` |
| Area of Land | ≥ 600 m² | Headroom |
| Lot Width | **≥ 12 m** | CDC dual-occ min width (`cdcRules.svelte`); Pattern Book Small Lot Apartments 01/02 need 13 / 13.6 m (`propertyTypes.js`) |
| **Nearby Train** | **within 400 m** | Does double duty: Tab 4's TOD 400m test *and* Tab 3 accessibility |
| Nearby School | ≤ 1 km | Tab 3 |
| Walk Score | ≥ 70 | Tab 3 |
| **Price** | **leave empty** | Deliberate — a price filter signals deal-hunting to a social-housing assessor |
| Include | **Multiple Frontage** | Corner lots — best dual-occ / manor-house candidates |
| Exclude | Heritage · Flood · Bushfire · Contaminated · Biodiversity · Landslide · Salinity | Tab 11 Constraints Checklist, line for line |

---

## 6. Beat sheet — 2:45

~360 words at ~130 wpm. Same encode recipe as `video-edit-brief.md` if self-hosted.

| # | TC | Dur | VO | On screen |
|---|---|---|---|---|
| 0 | 0:00 | 0:14 | This is the Homes NSW planning due diligence workbook. Fifteen tabs — transport oriented development, low and mid-rise housing, constraints checklist, yield and parking — filled by hand, from a dozen mapping systems, one site at a time. | The real workbook. Tab strip scrolls slowly through all 15 names. Cursor copy-pasting a value in |
| 1 | 0:14 | 0:16 | You've told us you don't want another report. Fair — because a report still has to be retyped into this. But look at what's inside one: the same zoning, the same constraints, the same yield. The analysis is already done. It's coming out in the wrong shape. | PDF report generates → sits beside the workbook → matching values highlight across both. **Card: "The analysis is done. The shape is wrong."** |
| 2 | 0:30 | 0:20 | So start where site selection starts. Screen a whole LGA against the pathways this workbook has tabs for — Transport Oriented Development within four hundred metres, Low and Mid-Rise Housing under Housing SEPP Chapter Six, complying development, and the Government Architect's Pattern Book designs. | Search panel builds: Ryde → Eastwood → **Pattern Books** → dual occupancy → R2+R3 → 400 m² → 12 m → **train ≤ 400 m**. Results populate |
| 3 | 0:50 | 0:14 | Tab eleven is a constraints checklist. Here it's a filter — heritage, flood, bushfire, contamination, biodiversity, salinity — tested across every lot at once, and drawn on the map. | Exclusions flip; overlays wash across the map; count narrows. Cut to Tab 11 in the workbook |
| 4 | 1:04 | 0:16 | Open a site and tabs two and three answer themselves — lot and plan, area, frontage, zoning, minimum lot size, floor space ratio, height; then distance to the station, the school, the hospital, and a walk score. | 2 Welby St Eastwood panel opens; Overview metrics; cut to workbook tabs 2 and 3 |
| **5** | **1:20** | **0:22** | Tabs twelve and thirteen ask for indicative redevelopment potential, yield and parking. Not a gross floor area divided by an average unit size — an actual test. Pick a typology, or drop in a Pattern Book design, and watch it stand on the lot in three dimensions, with setbacks, landscaping, parking and solar. | **Centrepiece.** Typology buttons → dwelling mix → Pattern Book gallery (architect credits) → 3D massing on the lot |
| 6 | 1:42 | 0:20 | What the pilot builds is the last mile: writing those values into your workbook and your Word template, in your structure, against the clauses you already cite — one-point-eighteen for permissibility, one-point-nineteen for conservation and acid sulfate, one-point-nineteen-A for bushfire. | Values flowing from the panel into the workbook's input cells and the Word table. Clause column visible |
| 7 | 2:02 | 0:18 | Eight of the fifteen tabs are computed today. The pilot adds the social housing pathways — infill affordable, seniors housing, site compatibility — and the write-back. The judgement rows stay yours. | The tab-by-tab coverage table, honestly marked: green, amber, red |
| 8 | 2:20 | 0:16 | Urban Prospects already does this work for developers, planners and architects across New South Wales. It has never been pointed at a social housing portfolio. That's the pilot — your workbook, your process, your judgement, without the retyping. | Portfolio of addresses screening in one run → end card |
| — | 2:36 | 0:09 | *(music only)* | Logo. **"Your workbook. Not another report."** |

**Total 2:45.** If it must come down: beat 3 first, then tighten beat 2.

Beat 7 is unusual for a pitch video and it is deliberate. Assessment criterion 2 is *deliverability of
the pilot* — showing a scoped, honestly-marked coverage table scores there in a way a polished
everything-works reel does not.

---

## 7. Before you film

1. **The Pattern Books search returned zero results** throughout the raw recording (34:02–36:26,
   Chatswood / St Leonards / Willoughby, repeatedly). Test that Ryde/Eastwood + Pattern Books
   actually returns lots before you build a beat on it — beat 2 depends on it entirely.
2. **`cdcRules.svelte` is dummy data.** Line 7: *"using dummy data for now // In production, this
   would be fetched from API based on property data."* Do not put a fabricated compliance verdict in
   front of an assessor who may later pilot the tool. Wire it, or keep the panel off screen.
3. **Uncomment LMR and TOD** at `src/routes/+page.svelte:110` and `:118`. Their tooltips are already
   written at lines 71–72. Two lines — and they are exactly tabs 4 and 5A/5B/5C of her workbook.
4. **Don't claim a fill percentage or a write-back that doesn't exist yet.** Beat 6 must be visibly
   framed as the pilot deliverable — animate it as a proposal, not as a screen recording of a working
   feature.

---

## 8. The strategic call

**Challenge 3 is the better fit for Urban Prospects, and it isn't close.**

Kevin's Challenge 3 asks for "one-stop site feasibility… gather compliance checks, legislation, or
site risk, and produce a block option or feasibility test, where there is a clear visual diagram of
how a development could fit there," able to "test across every typology," working "with the
government architects' pattern books." He then names the exact weakness of the competition:
*"Existing programs at the moment are much more approximate, and they take fundamentally just a yield
out of a gross floor area."*

That is a description of `Yield.svelte` + `Design.svelte` + `propertyTypes.js` — built, working, and
differentiated on precisely the axis he named. Challenge 2 requires building a write-back layer that
does not exist yet; Challenge 3 requires almost nothing new.

Daniel confirmed in the Q&A that multiple applications are allowed provided each grant is for a
different project. If you only run one, run Challenge 3. If you run two, Challenge 3 is the platform
and Challenge 2 is the write-back — and they need to be scoped as genuinely separate pilots.
