# Hazlett API — working reproduction (verified 2026-09-11)

> **Retraction.** The 2026-09-09 version of this file said Urban Prospects' production token was
> "rejected" and asked Hazlett for a new one. That was wrong. Hazlett's OAuth endpoints live on a
> **separate host, `oauth.hazlett.com.au`** (the spec only ever named the dev host, and
> `api.hazlett.com.au/auth` 404s), and we already hold the client secret — both were in IMTG's
> n8n export, surfaced 2026-09-11. Access tokens simply expire after 28 days; the June 2025 one
> Mark emailed was long dead. Nothing needs to be sent to Hazlett. The one item still worth
> raising with them is §4.

Client id `9fysIFgDj2zO8Ad1Qt1u3BEN`, username `URBAN`, customer code `URBA`. Client secret is
in the git-ignored `credentials.md` (`HAZLETT_CLIENT_SECRET`); `<SECRET>` below.

## 1. Mint a token (free, no order placed)

```bash
CID=9fysIFgDj2zO8Ad1Qt1u3BEN
CODE=$(curl -s "https://oauth.hazlett.com.au/auth?client_id=$CID" | python3 -c 'import sys,json;print(json.load(sys.stdin)["code"])')
curl -s -u "$CID:<SECRET>" -X POST https://oauth.hazlett.com.au/oauth/token \
  --data-urlencode "client_id=$CID" --data-urlencode "code=$CODE" --data-urlencode "username=URBAN"
```
```json
{"access_token":"EqGVx9…", "expires_in": 2419200, "refresh_token":"mFN84g…", "token_type": "Bearer"}
```

- `expires_in` 2,419,200 s = **28 days**. The app caches one token per process and re-mints a
  day before expiry (`getAccessToken` in `web/src/lib/server/hazlett.ts`).
- The other secret in the export (`ZAEA8h…`) is rejected with `{"error":"invalid_client"}` 401.
- `https://oauth.hazlett.com.au/oauth/verify?client_id=…&access_token=…` returns a 500 HTML
  page; don't depend on it.

## 2. Prove the token is accepted by the order API (still no charge)

Order id `UR20019` was burnt by Hazlett on 4 June 2025, so the API rejects the duplicate
*after* authenticating and *before* ordering:

```bash
curl -s -w '\nHTTP %{http_code}\n' -X POST https://api.hazlett.com.au/req/lrs \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN.$CID" \
  --data '{"orderId":"UR20019","productCode":"LRSTLS","folioIdentifier":"642/9165"}'
```
```json
{"orderId":"UR20019","referenceNumber":"HAZURBAUR20019","status":"Error","errorCode":"400","errorReason":"order_id already exists."}
```
Same for the image payload (`LRSIMR`, SP 103272, subType P). Compare with what an expired or
wrong token gets: `Authorization denied` 401; and no header at all: `Authorization failed` 401.

## 3. The real calls (each one is charged by LRS)

Title search (the n8n production path ordered plain `LRSTLS`; the app orders `LRSTLSWM` so the
folio/schedule metadata comes back too):

```bash
curl -s -X POST https://api.hazlett.com.au/req/lrs \
  -H 'Content-Type: application/json' -H "Authorization: Bearer $TOKEN.$CID" \
  --data '{"orderId":"UP<unique>","productCode":"LRSTLSWM","folioIdentifier":"642/9165"}'
```

Plan image (DP/SP) and dealing image:

```bash
curl -s -X POST https://api.hazlett.com.au/req/lrs \
  -H 'Content-Type: application/json' -H "Authorization: Bearer $TOKEN.$CID" \
  --data '{"orderId":"UP<unique>","productCode":"LRSIMR","imageType":"DP","subType":"P","imageReferenceNumber":"9165"}'

curl -s -X POST https://api.hazlett.com.au/req/lrs \
  -H 'Content-Type: application/json' -H "Authorization: Bearer $TOKEN.$CID" \
  --data '{"orderId":"UP<unique>","productCode":"LRSIMR","imageType":"DL","imageReferenceNumber":"Y340060"}'
```

Document retrieval, polled until it stops answering 400 "Document is not ready to download":

```bash
curl -s -o order.pdf -w 'HTTP %{http_code}\n' "https://api.hazlett.com.au/req/lrs/HAZURBAUP<unique>.pdf" \
  -H "Authorization: Bearer $TOKEN.$CID"
```

## 4. Still worth telling Hazlett

Omitting the `Bearer ` prefix returns a Werkzeug interactive-debugger page with their source
code (`lrs_api/lrsviews/authorization.py`) — Flask debug mode is on in production. And the two
client secrets have been sitting in plaintext in an emailed n8n export, so a rotation is due
once the new app is live.
