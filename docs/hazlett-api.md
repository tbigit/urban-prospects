# Hazlett LRS API — what we know (compiled 2026-09-08)

Hazlett Information Services (`hazlett.com.au`, Mark Hazlett, developer Ambar "Shome"
Associates, Douglas cc'd) is Urban Prospects' NSW Land Registry Services broker. Members buy
**title searches** ($25) and **plan / dealing image searches** ($25) from the property panel; the
PDF comes from Hazlett's HazLRS API.

Sources for this document, all in `~/Screenshots/hazlett/` on Danny's machine:

- `Hazletts_LRS_API_Service_Draft_Updated_1.0 3.docx` — Hazlett's draft spec (dev/test URLs only).
- `hazlett_email.txt` — the Feb–Jun 2025 email chain (Danny, Stuart, Makis/IMTG, Mark, Shome).
- `erorr.png` — n8n's failed production `/auth` call (401).
- `hazlett.png` — Shome's successful production plan image (SP103272, 92 pages, 53 MB).
- `title-Jai-Chambers-642-9165.pdf` — a real delivered title search (WooCommerce order 12127,
  15 Feb 2026), proof the title path worked end to end via WordPress → n8n → Hazlett.

Code: `web/src/lib/server/hazlett.ts` (client), `web/src/routes/api/title-search/+server.ts`
(purchase endpoint), `web/deploy/sql/010_title_orders.sql` (order log).

## 1. The API is a multi-call flow

```
[1] GET  https://oauth.hazlett.com.au/auth?client_id=…   -> { code }        (SEPARATE HOST from the API)
[2] POST https://oauth.hazlett.com.au/oauth/token         -> { access_token, expires_in: 2419200 (28 days),
         Basic client_id:client_secret, form client_id / code / username=URBAN      refresh_token, token_type: "Bearer" }
[3] POST /req/lrs      Authorization: Bearer <access_token>.<client_id>
         JSON order                                -> { orderId, productDetails:[{status, document…}] }
[4] GET  <document URL>  same Authorization       -> PDF bytes, or
                                                    400 "Document is not ready to download" / 404
         (poll [4] until the PDF arrives; "In Progress" orders can take minutes)
```

- **Bearer token format is `access_token.client_id`** — one string, dot-separated, *with* the
  `Bearer ` prefix. Hazlett's Flask middleware does `bearer_token.split(' ')[1]` then
  `split('.')`; without the prefix it crashes with `IndexError: list index out of range` and
  returns a Werkzeug debugger HTML page (that was the whole 4–18 June 2025 saga, §3).
- **`orderId` must be unique per Hazlett customer forever.** Re-using one gets
  `{"status":"Error","errorCode":"400","errorReason":"order_id already exists."}` (the spec says
  409; production says 400). Our order ids are `UP<title_orders.id>`.
- Hazlett's own reference is `HAZ<customer><orderId>`; our customer code is **`URBA`**
  (`HAZURBAUR20019`). Document URL in production: `https://api.hazlett.com.au/req/lrs/HAZURBA<orderId>.pdf`.
- The order response may already say `Closed` + `Document is ready to download` (titles,
  usually instant) or `In Progress` + `Document is under process` (plan/dealing images: LRS
  renders them asynchronously). Either way the `document` URL is returned up front and must
  be fetched with the Authorization header.

### Environments

| | Base URL | State (2026-09-08) |
|---|---|---|
| Dev/test | `https://api.dev.hazdev.com.au` | **Dead** — 301 to `www.hazlett.com.au`. Spec examples use it with customer `PEXA`. |
| Production API | `https://api.hazlett.com.au` | Up. `/req/lrs` answers `401 Authorization failed` without a token. Has **no** `/auth` (404) — OAuth is on the host below. |
| Production OAuth | `https://oauth.hazlett.com.au` | Up. `/auth` and `/oauth/token` work (verified 2026-09-11). `/oauth/verify` returns a 500 page. Only recorded in IMTG's n8n export and Mark's sticky note, never in the spec or the email chain. |

### Product payloads (`POST /req/lrs`)

| Product | `productCode` | Payload fields | Notes |
|---|---|---|---|
| Title search | `LRSTLS` | `folioIdentifier` "642/9165" | plain PDF |
| Title search with metadata | `LRSTLSWM` | `folioIdentifier` | PDF + `folio/land/firstSchedules/secondSchedules/unregisteredDealings` in the response. **This is what upapp used.** |
| Title search as data | `LRSTLSX` | `ltxRefId` "12/800596", `ltxFormat` "xml,json,pdf" | RTX XML/JSON — the way to *extract* dealing and DP/SP numbers from a title programmatically (Mark, 6 Feb 2025) |
| Image search (plan or dealing) | `LRSIMR` | `imageType` DP/SP/DL…, `subType` P/B/C/M/F/D, `imageReferenceNumber` "103272" | plan number **without** the DP/SP prefix. `subType` only for DP/SP. Dealings: `imageType: "DL"`, `imageReferenceNumber: "Y340060"`. Spec spells it `subtype`; the working production curl used `subType` — send `subType`. |
| Plan inquiry | `LRSPLI` | `planType` DP/SP, `planNumber` | status check only, not the image |
| Document search | `LRSDRS` | `imageType`, `imageReferenceNumber` | status check only |

Image types: DL dealing, DP deposited plan, SP strata plan, BK ADIS book, CT cancelled title,
CP crown plan, PA primary application, SS/TS/MM/GB/PM SCIMS marks. Subtypes (DP/SP only):
P plan, B 88B, C contract, M management statement, F DP pipeline form, D SP developer by-laws.

## 2. Credentials (corrected 2026-09-11)

Held in the git-ignored `credentials.md` at the repo root (section "Hazlett") and in
`web/.env` (`HAZLETT_CLIENT_ID`, `HAZLETT_CLIENT_SECRET`, `HAZLETT_USERNAME=URBAN`,
`HAZLETT_OAUTH_URL`). Client id `9fysIFgDj2zO8Ad1Qt1u3BEN`, username `URBAN`, customer code
`URBA`. The client secret came from Mark's note inside IMTG's n8n export
(`~/Screenshots/hazlett/Full_export_workflow.json`, sticky "Production"); a second value in
the export's Set nodes is rejected as `invalid_client`.

**Verified live 2026-09-11:** code → token → `POST /req/lrs` with the burnt order id `UR20019`
returns `order_id already exists` for both `LRSTLS` and `LRSIMR`, i.e. authentication passes
and no order is placed. The app mints and caches its own token (`getAccessToken` in
`hazlett.ts`), re-minting a day before the 28-day expiry.

**What the 2026-09-08/09 probes actually showed:** the access token Mark emailed on 18 Jun
2025 had simply expired (28-day life). `Authorization denied` = header parsed, token dead;
`Authorization failed` = no header. The earlier conclusion that "we cannot mint tokens
ourselves" was wrong — we had the secret all along, in the export. `docs/hazlett-curls.md`
was rewritten accordingly; its 09-09 "proof" is retracted.

## 3. The debugging back-and-forth, in order

**5 Feb 2025 — Makis (IMTG):** dealings and DP/SP calls return the wrong thing. Folio
2/1290722 with dealing Y340060 returned a "status" PDF, not the dealing; DP 1290722 returned a
table PDF with a character-encoding glitch and a Microsoft SQL Server error at the bottom; its
"order" link did not load.

**6 Feb 2025 — Danny to Mark:** are there APIs to (a) list all dealing and DP/SP numbers for a
folio, and (b) fetch all their PDFs in one call?

**6 Feb 2025 — Mark:** those calls were run in *production* (charged). The first two
attachments were **status checks** (what is available for a plan: P/B/C/M/F/D), not image
orders; the "order" link is their website UI and would be removed from API responses. The
other two were real image orders (a transfer dealing, a DP). Answers: (a) **no** — the only
way to get a folio's dealing references is a title search (use the RTX version, which splits
the title into headers, so the notification sections can be parsed); an owner/lessee inquiry
also lists title references and acquiring dealing numbers. (b) **no** — one request per
document. Titles are Lot/Plan; plans are DP/SP/Crown; dealings are registered documents
(mortgages, caveats…). LRS insists the title be ordered before dealings are known. Plans need
only plan number + type.

**11–14 Feb 2025:** meeting scheduled (Fri 14 Feb, 3:30pm, Google Meet, with Shome).

**19 Feb 2025 — Danny:** follow-up asking for a concrete curl sequence for folio 1/1002890:
title as RTX XML → extract dealing and DP/SP numbers → image-search each.
**27 Feb 2025 — Mark:** Shome still working on it. *(No reply with the curls is in the chain.)*

**4 Jun 2025 — Shome (via Mark):** ran a production plan image order for SP103272 and sent
the curl (Authorization redacted as `••••••`):

```
POST https://api.hazlett.com.au/req/lrs
{"orderId":"UR20019","productCode":"LRSIMR","imageType":"SP","subType":"P","imageReferenceNumber":"103272"}
→ {"orderId":"UR20019","productDetails":[{"productCode":"LRSIMR","status":"In Progress",
   "details":"LRS Image Search","message":"Document is under process","requestId":"R371251",
   "requestIndex":"586865","document":"https://api.hazlett.com.au/req/lrs/HAZURBAUR20019.pdf"}]}
GET  https://api.hazlett.com.au/req/lrs/HAZURBAUR20019.pdf   (Authorization: …)
```
The plan came back as a 92-page, 53 MB PDF (`hazlett.png`).

**11 Jun 2025 — Makis:** three IMTG developers tried the curl with production and dev
credentials, from curl and from the n8n workflow. Every attempt returned the Werkzeug
`IndexError: list index out of range` page from `authorization.py` line 26. They noted the new
example used a bare `Authorization:` header whereas earlier docs said Bearer, and said they
tried both.

**12 Jun 2025 — Stuart:** asked Hazlett for a screen recording of the calls working, and
proposed an **interim manual process**: Urban Prospects emails each title request (Lot/Plan,
address, customer email) to Mark; Hazlett emails the PDF to the customer, cc Urban Prospects.
**12 Jun — Mark:** agreed; asked whether to send PDFs to UP or straight to the customer.

**18 Jun 2025 — Shome:** the failure is the missing `Bearer ` prefix — the server splits on
the space before validating anything. Sent the correctly formatted example. **Mark** forwarded
a new production access token. **Makis:** "we tested with Bearer and without — same output",
but then, with Mark's fresh token and the Bearer prefix, the call **worked** — it returned
`order_id already exists` for UR20019, which means authentication passed (the "same output"
was almost certainly a stale token, not the header).

**After June 2025:** the WooCommerce `order.created` webhook "Title purchased" fed n8n
(`flow.imtg.com.au`, Railway-hosted; webhook now disabled, 6 recorded failures). Title
searches were delivered this way — `title-Jai-Chambers-642-9165.pdf` (Feb 2026) and Woo
orders 5392–5396 (Aug 2025), 12127, 15560 (Apr 2026) are real completed title purchases.
**Dealing / plan image orders were only ever seen working from Hazlett's side and in the dev
environment**; no evidence in the chain or the Woo orders that a DP/SP image order was
delivered to a customer through our pipeline. `erorr.png` shows n8n's production `/auth`
step failing 401 — consistent with production not exposing the OAuth code flow at all (it
404s today), which is why the pipeline depended on a static token from Mark.

## 4. Open questions for Hazlett (trimmed 2026-09-11)

1. ~~A current production access token~~ — resolved: we mint them from `oauth.hazlett.com.au`.
2. Confirm `subType` (camel) vs `subtype` for LRSIMR in production. (The n8n export's DP/SP
   branch used `LRSDRS` status checks with `imageType`/`imageReferenceNumber` and no subtype,
   and was never wired to a customer purchase.)
3. Is `LRSTLSX` (RTX XML/JSON title) enabled on our account? The export has a working-looking
   `LRSTLSX` node (`ltxRefId`, `ltxFormat: "json"`) for folio 2/SP103272 — untested here.
4. Polling: how long can an `In Progress` image order take; is the webhook callback available?
5. Pricing per product code.
6. Security: Flask debug page on a malformed header; rotate the client secret (it has travelled
   in plaintext by email) once the new app is live.

## 5. How the new app implements it

- `HAZLETT_MODE=mock` (default) returns the sample PDF so the UI → API → Postmark path can be
  exercised with no LRS charge. `HAZLETT_MODE=live` mints a token from `HAZLETT_OAUTH_URL`
  with `HAZLETT_CLIENT_ID`/`HAZLETT_CLIENT_SECRET`/`HAZLETT_USERNAME` (or uses a static
  `HAZLETT_TOKEN` override) and posts to `HAZLETT_BASE_URL` (`https://api.hazlett.com.au`).
- Title search → `LRSTLSWM` with the property's folio(s). Image search → `LRSIMR`; the
  identifier the member typed is parsed: `DP7750`/`SP5` → `imageType` DP/SP + `subType P` +
  number; anything else (`Y340060`, `AB123456`) → `imageType DL`.
- The document is polled (`HAZLETT_POLL_SECONDS`, default 90 s, 5 s apart) then emailed via
  Postmark as an attachment. Postmark caps a message at 10 MB, so a 53 MB plan cannot be
  attached — over `HAZLETT_MAX_ATTACH_MB` (default 9) the email carries the order reference
  and the PDF must be fetched again by an admin (still `In Progress` orders are recorded with
  `hazlett_status` so they can be re-polled later; a retry job is not built yet).
- Every order is one row in `title_orders`. **Every live order costs money at LRS** — do not
  run `live` against production for testing without Stuart's say-so.

## 6. What the WordPress orders actually show (dug 2026-09-10)

Every completed title-search order on v1 (product 920), newest first:

| Woo order | Date | Buyer | Folio | Payment |
|---|---|---|---|---|
| 15560 | 30 Apr 2026 | stuart@urbanperspectives.com.au | 19/7750 | Pin `ch_F5Uk…` |
| 12127 | 15 Feb 2026 | jai@definedplumbingcivil.com.au (real client) | 642/9165 | Pin `ch_dv2p…` |
| 5396–5392 | 15 Aug 2025 | Stuart (5 orders) | 4/244399, 6/219993, 3/244399, 17/629969, "3/524962 16/629969" | Pin |
| 5026, 5025, 5024 | 11 Jul 2025 | Stuart | 24/4278 | none recorded |
| 5112–5110 | 21 Jul 2025 | testmail+ariane@imtg.com.au (IMTG test) | DP/SP 704745 | never paid (`wc-processing`) |

Nothing on the WordPress side ever recorded a Hazlett result. The only order-item meta is
`_product_id` and `Folio Identifier`; no order notes beyond Pin's; the "downloadable file" on
product 920 is a static `Sample_PDF` (`sample-u3b4za.pdf`) — Jai downloaded it once, which is
what he got from the Woo account page. The real title always arrived by email from n8n or from
Hazlett, so the site has no delivery audit at all.

**The n8n webhook was auto-disabled on 12 Feb 2026 03:51 UTC** (`wp_wc_webhooks.date_modified`,
`failure_count` 6 — WooCommerce disables after 5 straight failures). It fired on
`order.created`, and since 22 May 2025 WooCommerce Subscriptions has been generating **~52
$0 renewal orders every day** for the 43 active "VIP 7 day free trial" subscriptions (product
4224: period 1 day, length 7, but they never expire — 11,974 orders since 1 Jan 2026, 17,319
total). Every one of those hit n8n; when the Railway instance stopped answering, the webhook
died. So:

- **Jai's title (15 Feb 2026) and Stuart's (30 Apr 2026) were not delivered by the API
  pipeline** — the webhook was already dead. Jai's PDF (`title-Jai-Chambers-642-9165.pdf`) was
  produced on **17 Feb 2026 13:16**, two days after payment, by Hazlett's own system
  (`wkhtmltopdf`, footer ref `Admin-ADMIN-`, the same ref Shome's screenshot carries) — a
  manual order by a Hazlett staff member, i.e. Stuart's June 2025 "interim manual process".
- The last title searches that *could* have gone through n8n → Hazlett API are Stuart's five
  on **15 Aug 2025** (and 11 Jul 2025). No record on our side says whether they did; only
  Stuart's inbox (or IMTG's n8n execution log) can confirm.
- No plan/dealing image order (product 5057) was ever paid for by anyone. The only three are
  IMTG's own test orders, unpaid.

Side issue worth fixing regardless of Hazlett: the 43 VIP-trial subscriptions churning 52
orders a day on v1 (and firing any webhook that still exists) — they were deliberately not
imported into the new platform, so cancelling them on v1 is safe.

## 7. What IMTG's n8n export shows (2026-09-11)

`Full_export_workflow.json` (108 nodes, most disabled dev/test branches) and IMTG's
`urban-title-search-developer-handover.md`. The enabled production path:

```
Webhook1 (order.created, path fdcd070e-…)
 └─ Title purchase?  (product_id 920 or 3180)
     ├─ yes: Set client id8 (client id/secret, api_url, folio = line_items[0].meta_data[0].value)
     │       → GET oauth.hazlett.com.au/auth → POST oauth.hazlett.com.au/oauth/token (Basic, username URBAN)
     │       → POST api.hazlett.com.au/req/lrs  {orderId:"ORD-<Date.now()>", productCode:"LRSTLS", folioIdentifier}
     │       → GET productDetails[0].document (Bearer token.client_id)
     │       → Send Email14: to billing.email, from do-not-reply@imtg.com.au via Postmark (IMTG's
     │         "AlphaFlow" stream), subject "Urban - title purchased", PDF attached, bcc makis@imtg.com.au
     └─ no: DP/SP purchase? (5057)
            ├─ yes: Send Email15 to stuart@urbanperspectives.com.au "New DP/SP purchase request
            │       received online - please fulfil" (bcc Danny@moble.com)  ← manual, never automated
            └─ no: Property PDF report? (9926) → POST www.urbanprospects.com.au/q/pdf/property → email
                   to info@imtg.com.au with property-report.pdf
```

So: titles were `LRSTLS` (no metadata), one Hazlett order per Woo order, order id from
`Date.now()` (the handover doc itself flags this — retries minted new ids), no polling and no
retry on a non-200 (the old Wait/If nodes are disabled). **DP/SP was always a manual email to
Stuart.** The dev-branch `LRSDRS` dealings/plan nodes and the `LRSTLSX` node were experiments,
never connected to the webhook. The handover notes two secrets and asks for rotation; only the
sticky-note one works. The report-PDF branch calls a WordPress-era `/q/pdf/property` and
mailed IMTG, not the customer.

## 8. Live orders placed 2026-09-11 (charged, per Danny)

Run through the app's own client (`hazlett.ts`, OAuth-minted token), from Danny's laptop.

| Order id | Product | Identifier | Result |
|---|---|---|---|
| UPTMTWLC1JC0 | LRSTLSWM | 642/9165 | `Closed` immediately; 2-page current title (edition 7), PDF in 2.9 s |
| UPTMTWLC1JC1 | LRSTLSWM | 19/7750 | `Closed`; 2 pages, edition 10, 1.8 s |
| UPTMTWLC1JC2 | LRSTLSWM | 4/244399 | `Closed`; 3 pages, edition 5, 1.5 s |
| UPIMTWLCQER | LRSIMR DP 9165 subType P | plan image | `In Progress` (requestId R804775); still "Document is not ready" 15+ min later |
| (rejected) | LRSIMR DL AN941872, no subType | dealing | `400 {'subType': ['Missing data for required field.']}` — **subType is mandatory on every LRSIMR**, including dealings |
| UPIMTWLK52Z | LRSIMR DL AN941872 subType P | dealing image | accepted, `In Progress` (R804811); not ready 6+ min later |

Findings:

- **Titles are synchronous** and fast. The `LRSTLSWM` metadata fields came back as "Folio
  Details Not Available" / "No Data Available" on all three, so the "with metadata" variant
  buys nothing today; the PDF itself is complete (schedules, notifications, dealing numbers).
- **Images are asynchronous and slow** — minutes to much longer. In-request polling
  (`HAZLETT_POLL_SECONDS`) will not be enough for plans/dealings; the order must be recorded
  as `In Progress` and collected later (background job or Hazlett's webhook callback).
- `referenceNumber` is **not** returned on a successful order (only on errors); the document
  URL is always `https://api.hazlett.com.au/req/lrs/HAZURBA<orderId>.pdf`.
- The client now sends `subType: "P"` for dealings as well as plans.

Follow-up, same day: a poller checked both image documents every minute until 17:41 AEST —
**DP 9165 (ordered 16:47) and dealing AN941872 (ordered 16:55) were still "Document is not
ready to download" after 54 and 46 minutes.** Compare Shome's June 2025 SP103272 plan, which
was also `In Progress` at order time and only shown as delivered later the same day. Image
delivery is therefore hours, not minutes: the app must collect these asynchronously, and the
question to Hazlett is whether a webhook callback exists so we do not have to poll for hours.
Re-poll with `GET /req/lrs/HAZURBAUPIMTWLCQER.pdf` and `.../HAZURBAUPIMTWLK52Z.pdf`.

**Dealing / plan image searches are VERY slow (Danny, 2026-09-11).** Two more live orders for
folio 19/7750 at 17:48 AEST — plan DP 7750 (order UPIMTWNOXXP, R805092) and dealing A541352
(UPIMTWNPDVB, R805093) — went `In Progress` like the first two. At that point DP 9165 had been
pending 61 min and AN941872 53 min. Design consequence: the member must be told at purchase
that plan/dealing images arrive later by email (hours, possibly next business day), and the
collector job — not the request — delivers them. Titles stay instant.

## 9. The queue, built 2026-09-11

`web/src/lib/server/title-orders.ts` (order log, PDF store, collector), migration
`deploy/sql/011_title_orders_queue.sql` (applied), `routes/api/title-search` (purchase),
`routes/account/documents/[id]` (download, owner/parent/admin), `/account/#documents`
(Documents section: every order, status, View / Download).

- `place()` inserts the row, orders from Hazlett with `UP<row id>`, sets `next_poll_at = now`.
- `collect()` fetches the document once; titles get a 20 s inline wait so the buyer sees
  "emailed" immediately, images get none. Ready → PDF written to `TITLE_DOCS_DIR`
  (`/opt/www/upweb-data/title-docs` in production, outside the deploy dir), row `ready`,
  Postmark email with the PDF attached (≤ `HAZLETT_MAX_ATTACH_MB`) and a download link.
  Not ready → `next_poll_at` pushed out with backoff 30 s, 1, 2, 5, 10, 15 min then every
  30 min; after `HAZLETT_COLLECT_MAX_DAYS` (5) the row goes `stale`.
- `startCollector()` runs from `hooks.server.ts` at boot: a pass every
  `HAZLETT_COLLECT_INTERVAL_MS` (60 s) over due rows (`FOR UPDATE SKIP LOCKED`, so a second
  process is safe), plus `kick()` after each purchase so the queue is event-driven, not only
  periodic. A failed email leaves `notified_at` NULL and re-queues the row for 5 min later.
- Recipient: `TITLE_SEARCH_RECIPIENT` (test phase, danny@moble.com.au); empty = the buyer.
- The four live image orders from earlier today were seeded into `title_orders` (ids 1–4,
  Stuart's account) so the collector delivers them when LRS releases them.

## 10. Payment (built 2026-09-11)

$25 per title / plan / dealing, Stripe Checkout `mode=payment` with inline `price_data`
(no Stripe Price objects to maintain), one line item per identifier. Migration
`012_title_orders_payment.sql` (applied; `lock_timeout 5s` because another session was
vacuuming). Flow, all in `lib/server/title-orders.ts`:

1. `POST /api/title-search` → rows inserted `awaiting_payment` / `unpaid`, `startCheckout()`
   returns the Checkout URL, the panel redirects to it. Nothing goes to Hazlett yet.
2. Stripe success URL `GET /api/title-search/success?session_id=` → `fulfilSession()`:
   session `paid` → rows `paid`/`pending`, `submit()` each to Hazlett, titles collected
   inline (20 s), redirect to `/account/?purchase=paid#documents`. Idempotent: only rows
   still `unpaid` for that session are claimed.
3. Closed tab: every `unpaid` row carries `next_poll_at` (+3 min); the collector calls
   `fulfilSession()` again, re-checks every 10 min, and marks the rows `abandoned` after
   24 h or when Stripe reports the session expired.
4. **Free list**: `TITLE_SEARCH_FREE_EMAILS` (default `stuart@urbanperspectives.com.au`)
   skips Checkout and orders immediately (`payment_status 'free'`).
5. Recipient stays `TITLE_SEARCH_RECIPIENT` while set (test phase); clear it to email buyers.
6. Not built: refunds when Hazlett errors or goes `stale` (row keeps `error`/`last_error`;
   refund by hand in Stripe for now), and a Stripe webhook (the success URL + reconcile
   cover it). api.js is untouched: the app still probes `/q/title/check` for the
   Hazlett-outage flag, nothing else on the API host is involved.

### Restart safety and re-submission (2026-09-11, migration 013)

State lives only in `title_orders`, never in memory, so a server restart loses nothing:
the collector's boot pass picks up every row with a due `next_poll_at`. Three recoverable
situations are handled by `submit()`/`collect()`:

- **Crash between insert and the Hazlett call** — row is `pending` with no
  `document_url`; the collector re-submits it.
- **Hazlett timeout / 5xx / token failure** — stays `pending`, `last_error` set, retried on
  the same backoff up to 8 attempts, then `error`.
- **Re-submission after the first call did land** — each attempt uses a new order id
  (`UP<id>`, `UP<id>R1`, …); if Hazlett answers "order_id already exists", the row adopts
  that order's document URL and keeps polling instead of ordering twice.

Only a definite rejection (Hazlett 4xx other than the duplicate, or an unusable
identifier) marks a row `error`. `submit_attempts` and `poll_attempts` are both on the row
for the admin to read.

### Title validity — what the law says (checked 2026-09-11)

**There is no statutory validity period for a NSW title search.** Checked against the
current *Conveyancing (Sale of Land) Regulation 2022* (legislation.nsw.gov.au, version in
force 15 Aug 2025): Schedule 1 prescribes a "property certificate" (the title search) and
the plan as documents a vendor must attach to a residential contract, with **no age
requirement**. The only currency rule in the whole Regulation is for the *land tax*
certificate — Schedule 3 ss 2–3 and the Dictionary: issued in the year of completion or "no
more than 3 months before" service. Schedule 2's vendor warranty speaks "as at the date of
the contract", not as at the search. The Real Property Act 1900 s 96B(2) (the certification
printed on every Hazlett PDF) makes the electronic search evidence of the Register as at
the search time; it confers no validity window.

Practice, not law: a search is a snapshot at its printed date and time; conveyancers run
one before exchange and a *final search* immediately before settlement (PEXA "title
activity check"), and some lenders informally treat searches older than 3–6 months as
stale. So the app **does not show an expiry**. It shows the search date and time and the
standard wording ("records the Register as at the search time printed on it; order a fresh
search before exchange and again immediately before settlement"). The earlier
`TITLE_VALIDITY_DAYS` (an assumed 14 days) was removed the same day.

Sources: Conveyancing (Sale of Land) Regulation 2022 Sch 1 Pt 1 items 3, 6; Sch 3 ss 2–3;
Sch 6 "current land tax certificate"; Real Property Act 1900 s 96B; Holding Redlich, "The
importance of final title searches in property transactions" (Cui v Salas-Photiadis).

### Download window (2026-09-11, per Danny)

PDFs are kept on disk indefinitely, but a member can re-download one only for
`TITLE_DOWNLOAD_DAYS` (default 90) after it arrived: the email says "Download until", the
Documents list hides View/Download and shows "Download closed" after that date, and
`/account/documents/<id>/` answers 410 for the member. Administrators can still fetch it.
Distinct from the validity window (§ above): a title can be expired-for-reliance yet still
downloadable, and vice versa.
