# Urban Prospects — homepage demo video: edit brief

Source: `docs/Screen Recording 2026-07-26 154153.mp4`
Full transcript: `docs/screen-recording-transcript.txt`

---

## 1. What the source actually is

| | |
|---|---|
| Duration | **40:15** (2,415s) |
| Resolution | 1912 × 978, 30fps, H.264 |
| Audio | AAC 192k stereo — Stuart talking to Danny |
| Size | 2.43 GB |

**It is not a demo video. It is a direction brief with B-roll attached.** Stuart is walking Danny
through the platform *and simultaneously art-directing the video that should be made from it* —
"I think at this point we should sort of say something along the lines that…", "we need to probably
do some editing of the video", "I may send you just a couple of key messages".

So: **the entire audio track is discarded.** It contains apologies, bug reports, feature requests,
and at 31:02 — "sorry Danny, this is probably making a very boring video to watch."

Roughly **11 minutes of the 40 is usable picture**. Target cut is ~2:25. That is a **17:1** ratio.

---

## 2. Hard cuts — delete entirely (~28 min)

| Range | Length | Why |
|---|---|---|
| 0:00 – 1:18 | 1:18 | Old homepage + login screen. This is the site **this repo replaces** — purple "FIND YOUR NEXT LAND DEVELOPMENT OPPORTUNITIES WITH EASE" with stock laptop photo. Also exposes Stuart's email in the username field. |
| 1:18 – 1:46 | 0:28 | Stuart dictating what the intro copy should say. |
| 4:38 – 7:23 | 2:45 | Live search build with fumbles — "Sorry, I did this wrong", "More editing work for someone". |
| **7:23 – 10:33** | **3:10** | **Dead zone.** "I don't know why am I not getting results." Repeated failed searches. |
| 13:31 – 15:13 | 1:42 | Radius-search button doesn't work — "I'm not too sure what's going on with that button" — then pure commentary. |
| 16:37 – 17:52 | 1:15 | Zoning data bug. "I think there's something wrong with that zoning" (SP2/R2 hybrid). Never ship a data-integrity complaint. |
| 21:22 – 23:24 | 2:02 | RLV button breaks → "It doesn't like me clicking the button anymore" → refresh → full reload. |
| **25:06 – 25:30** | 0:24 | **RLV calculates −$70,795,853.** Fatal. See gaps. |
| 28:01 – 29:02 | 1:01 | Stuart counting layers aloud to 41. *Picture is usable, audio is not.* |
| 29:02 – 29:58 | 0:56 | Commentary about what to shoot. |
| 30:37 – 32:45 | 2:08 | LMR layer won't display + "sorry Danny, this is probably making a very boring video to watch". |
| 32:45 – 34:02 | 1:17 | Discussion of a *missing* feature (apartments should be permissible in the LMR). |
| **34:02 – 36:26** | **2:24** | Chatswood / St Leonards Pattern Book search returns **no results**, repeatedly. |
| 38:39 – 40:15 | 1:36 | Wrap-up. "There's a few issues there… I can do the video again if you like." |

---

## 3. Keep — the B-roll bank (~11 min raw)

| Source TC | What's on screen | Feeds beat |
|---|---|---|
| 1:03 – 1:18 | Map loads, Sydney-wide | 1 |
| 1:46 – 2:26 | Location: Regions / LGA / Suburb / Address / Lot·Section·Plan; **All Sites / Complying Development / Pattern Books** toggle | 2 |
| 2:28 – 2:51 | Planning Controls: permissible use, zoning, min lot size, FSR, GFA, height | 2 |
| 2:51 – 3:33 | Site Attributes: area, lot width, lot depth, nearby school / hospital / train, walk score, price | 2 |
| 3:36 – 4:24 | Planning Constraints — ~20 rows with Include Only / Exclude / All | 2 |
| 4:24 – 4:38 | Saved Searches panel | 2 (optional) |
| 11:22 – 11:41 | Filters applied → **result dots populate the map** | 2 |
| 13:05 – 13:31 | Results across Eastwood; zoom out reveals more | 2 |
| 15:13 – 16:00 | Click a lot → **property panel opens** (2 Welby St Eastwood, photo, $, beds, walk score 85) → **star = favourite** | 4 |
| 16:00 – 16:21 | My Fav list; TITLE SEARCH / PLAN DEALINGS buttons; Overview metrics grid | 4, 8 |
| 16:43 – 17:10 | Layers → Key Layers → **Zoning on** — map floods pink/yellow | 3 |
| 17:52 – 19:06 | Detail scroll: LEPs, permissible uses, complying development, **census donut charts**, contributions plans, DCP, SEPPs | 1 |
| 19:24 – 19:50 | **MY PIPELINE** — status dropdown, next action | 9 |
| 19:50 – 20:15 | **Mail Template modal** — merge fields `[[property_address]]`, Save Template | 9 |
| 20:17 – 21:21 | **YIELD CALCULATOR** — Dual Occupancy / Terraces / Multi-Dwelling / Manor Houses / Apartments / Subdivisions; dwelling-mix sliders; "2 dwellings" | 5 |
| 23:24 – **25:00** | **RESIDUAL CALCULATOR** inputs filling — building type, land area, FSR, GFA, circulation, sales price, build cost, consultants, holding costs. **Cut before Calculate.** | 7 |
| 25:30 – 25:50 | **DESIGN** — 3D massing, Upload Model (.glb/.gltf/.obj), Rotate / Pitch / Roll / Nudge XYZ / Scale, Save 3D Design | 6 |
| 26:00 – 26:12 | **SELECT PATTERN BOOKS** — architect-credited renders (Collins and Turner, Nguluway DesignInc, MHN Design Union, Neeson Murcutt Neille) | 6 |
| 26:12 – 27:12 | **Report builder** — cover logo, ~25 Include/Exclude section toggles, **Generate Custom PDF** | 10 |
| 27:12 – 27:42 | **Satellite toggle** (aerial), Map / List toggle | 1, 3 |
| 27:42 – 28:01 + 29:58 – 30:37 | Layer list scrolling; overlays flipping colour; heritage; **LMR / TOD purple rings** | 3 |
| 38:33 – 38:39 | Clean results state | 2 |

**Best-looking material in the whole recording:** the Pattern Book render gallery (26:00–26:12) and
the coloured zoning/LMR overlays (16:50, 30:00). Use them as the hero frames.

---

## 4. Gaps — five pickups needed

None of these exist anywhere in the 40 minutes:

1. **A valid residual land value.** The only Calculate in the recording returns **−$70,795,853** because
   no sales price was entered. Stuart flags it himself: "I don't know whether we want to actually
   separate these out first and try and put some realistic numbers in to show what a result looks like."
2. **A 3D model actually placed on the site.** The tools and the Pattern Book gallery are shown; nothing
   is ever dropped in. Stuart: *"if possible it would be nice to show one dropped in."*
3. **The generated PDF.** The report builder is shown, Generate is never clicked. Stuart: *"it would be
   nice just to see the PDF report in the video and scroll through what's in it."*
4. **Measurement tools.** Beat 11 promises "measure distances, calculate areas". The tools exist — pencil
   and polygon icons on the map's right rail — but are **never touched** in 40 minutes.
5. **Title deed purchase.** Beat 8 says "purchase title deeds directly through the platform". Only the
   TITLE SEARCH / PLAN DEALINGS buttons are shown; neither is clicked.

Also unshot: any **on-market vs off-market** distinction (beat 8 claims it).

**~10 minutes of clean re-record** covers all five — assuming the RLV calculate bug (21:22) is fixed first.

---

## 5. Copy corrections before recording VO

**The three middle labels are rotated one position.** As supplied:

| Supplied label | Supplied body is actually about | Correct label |
|---|---|---|
| Drop in 3D Models | yield analysis for subdivisions/apartments/dual occs | **Automatic Yield Analysis** |
| Residual Land Value Calculations | dropping in 3D models / NSW Pattern Book | **Drop in 3D Models** |
| Drop in 3D Models | comparing returns, most profitable sites | **Residual Land Value** |

Other flags:
- **"over 4.9 million properties"** vs the homepage stat card, which says **4.5 million**. Pick one.
- The first two bullets in the brief were empty.
- "over 40 overlays" checks out — Stuart counts **41** on screen at 28:01.

---

## 6. The script — 2:26

Music bed throughout. VO in an Australian accent. No Stuart audio.
Speed-ramp 2–4× through all form-filling; cut on click.

| # | TC | Dur | VO | On-screen text | Picture (source TC) |
|---|---|---|---|---|---|
| 0 | 0:00 | 0:04 | *(music only)* | Logo → **Planning intelligence for NSW** | Title card |
| 1 | 0:04 | 0:15 | Urban Prospects gives you instant access to property and planning data for any site in NSW — over 4.9 million properties, each with detailed zoning, constraints, and planning controls at your fingertips. | **4.9M properties** (count-up) | Satellite pull-back 27:12–27:30 → map load 1:03–1:18 → detail scroll 17:52–18:20 |
| 2 | 0:19 | 0:17 | Search smarter using 34+ planning filters. Filter by zoning, SEPPs, CDC eligibility, Pattern Book suitability, environmental constraints, and more — giving you unmatched visibility of sites that truly meet your development criteria. | **34+ planning filters** | Panel scroll 1:46–2:26 → 2:28–3:33 → constraints 3:36–4:10 → **results populate 11:22–11:41** |
| 3 | 0:36 | 0:15 | Explore over 40 planning and constraint overlays — including zoning, heritage, flooding, bushfire, environmental sensitivity, hazards, buffers, SEPP layers, and more — all instantly visualised for any site in NSW. | **40+ overlays** | Zoning on 16:43–17:05 → layer list 27:42–28:01 → overlays flipping 29:58–30:30 (LMR rings) |
| 4 | 0:51 | 0:09 | Found something promising? Save and shortlist your favourite sites to build a curated pipeline of opportunities. | **Save & shortlist** | Click lot → panel opens → star 15:13–16:05 |
| 5 | 1:00 | 0:13 | Run automatic yield analysis for subdivisions, apartments, dual occupancies, and multi-dwelling housing — all calculated instantly using real planning controls and site geometry. | **Instant yield analysis** | Typology buttons → dwelling mix → summary 20:17–21:21 |
| 6 | 1:13 | 0:15 | Visualise your development options by dropping in your own 3D models, or choose from the official NSW Pattern Book designs to see exactly what can be built. | **Drop in 3D models** | 3D massing + sliders 25:30–25:50 → **Pattern Book gallery 26:00–26:12** → ⚠️ **PICKUP: model placed on site** |
| 7 | 1:28 | 0:10 | Compare returns with residual land value calculations, helping you identify the most profitable sites with confidence. | **Residual land value** | Inputs filling 23:24–25:00 → ⚠️ **PICKUP: valid result** |
| 8 | 1:38 | 0:13 | Ready to move forward? Purchase title deeds directly through the platform and negotiate with owners — whether the site is on-market or off-market. | **On-market or off-market** | TITLE SEARCH / PLAN DEALINGS 16:05–16:21 → ⚠️ **PICKUP: purchase flow** |
| 9 | 1:51 | 0:10 | Track your project from site selection to purchase, with automated owner outreach through our built-in mail distributor. | **My Pipeline** | Status dropdown 19:24–19:50 → mail template 19:50–20:15 |
| 10 | 2:01 | 0:12 | And when you're ready to present, generate professional, client-ready reports in seconds — perfect for developers, investors, architects, planners, and consultants. | **Client-ready reports** | Section toggles → Generate Custom PDF 26:12–27:10 → ⚠️ **PICKUP: PDF scroll** |
| 11 | 2:13 | 0:10 | Measure distances, calculate areas, and visualise development potential in 3D — all seamlessly integrated into one powerful tool. | **Measure · Model · Decide** | ⚠️ **PICKUP: measure tools** → 3D view 25:35 |
| 12 | 2:23 | 0:15 | Urban Prospects gives you complete planning intelligence, unmatched visibility, and the tools to make faster, smarter development decisions. Start exploring NSW's most powerful development platform today. | End card + **Start your free trial** | Satellite pull-out 27:20 → logo |

**Total 2:38.** 277 words at ~128 wpm.
To hit 2:05 (better image quality at 25MB): fold beat 11 into beat 6 and tighten beats 2 and 3 by 3s each.

---

## 7. Delivering under 25 MB at 1080p

The source is 1912×978 — wider than 16:9 — and the top ~78px is Chrome (URL bar, bookmarks bar,
profile avatar). Crop that off, scale to 1920 wide, letterbox to 1080 on the brand background
(`#0a0710`, matching `--bg`). Bars cost essentially no bitrate.

**Budget at 2:26 (146s):** 25,000,000 bytes × 8 ÷ 146 = **1,370 kbps total** → video 1,300k + audio 64k mono.

```bash
V="crop=1912:900:0:78,scale=1920:-2:flags=lanczos,pad=1920:1080:0:(oh-ih)/2:color=0x0a0710,fps=25"
ffmpeg -y -i cut.mov -vf "$V" -c:v libx264 -profile:v high -preset veryslow -b:v 1300k -pass 1 -an -f mp4 /dev/null
ffmpeg -y -i cut.mov -vf "$V" -c:v libx264 -profile:v high -preset veryslow -b:v 1300k -pass 2 \
  -c:a aac -b:a 64k -ac 1 -movflags +faststart demo-1080p.mp4
```

`fps=25` off a 30fps screencast saves ~15% for free. Two-pass matters here — CRF will overshoot.

**Two better options than fighting the cap:**

- **Split the deliverable.** A **60–75s silent hero loop** fits 25 MB at ~2,600 kbps — genuinely crisp,
  autoplays muted on the homepage. Put the full 2:26 VO cut on Vimeo — `VimeoEmbed.svelte` already
  exists in this repo and the founder video already uses it. The 25 MB cap only binds for self-hosting.
- If it must be one self-hosted file, **cut to 2:05** and encode at 1,500k.

---

## 8. Production notes

- **The basemap is near-white and washed out** — the weakest thing on screen. Favour satellite view and
  coloured planning overlays for anything wide. Reserve the plain basemap for tight panel shots.
- **Crop the browser chrome.** The purple app header below it is on-brand — keep it as the top edge.
- **Cursor wanders** through most panels. Smooth or hide it; cut on click.
- **Panels sit still for long stretches.** Nearly every kept clip wants a 2–4× speed ramp.
- **PII:** the login frame (0:39–1:06) shows a real email in the username field. Cut regardless.
- Every kept clip is from the same site (2 Welby St, Eastwood) — good, the video reads as one continuous
  workflow rather than a feature list.
