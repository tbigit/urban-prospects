# Hazlett image orders not being fulfilled — reproduction for Hazlett's developers

Client id `9fysIFgDj2zO8Ad1Qt1u3BEN` (Urban Prospects, customer `URBA`). All times AEST.
Title searches through the same API return in under 3 seconds; **plan and dealing image
orders are accepted, answer "In Progress", and are still not downloadable 14 hours later.**

## 1. Token (works)

```bash
CID=9fysIFgDj2zO8Ad1Qt1u3BEN
CODE=$(curl -s "https://oauth.hazlett.com.au/auth?client_id=$CID" | python3 -c 'import sys,json;print(json.load(sys.stdin)["code"])')
TOKEN=$(curl -s -u "$CID:<client_secret>" -X POST https://oauth.hazlett.com.au/oauth/token \
  --data-urlencode "client_id=$CID" --data-urlencode "code=$CODE" --data-urlencode "username=URBAN" \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["access_token"])')
```

## 2. The four image orders, placed 11 Sep 2026

Request and the exact response received at order time:

```bash
curl -s -X POST https://api.hazlett.com.au/req/lrs -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN.$CID" \
  --data '{"orderId":"UPIMTWLCQER","productCode":"LRSIMR","imageType":"DP","subType":"P","imageReferenceNumber":"9165"}'
```
```json
{"orderId":"UPIMTWLCQER","productDetails":[{"productCode":"LRSIMR","status":"In Progress","details":"LRS Image Search",
 "message":"Document is under process","requestId":"R804775","requestIndex":"586869",
 "document":"https://api.hazlett.com.au/req/lrs/HAZURBAUPIMTWLCQER.pdf"}]}
```

| Ordered (AEST) | orderId | Payload | Hazlett requestId |
|---|---|---|---|
| 11 Sep 16:47 | UPIMTWLCQER | LRSIMR, DP, subType P, 9165 | R804775 |
| 11 Sep 16:55 | UPIMTWLK52Z | LRSIMR, DL, subType P, AN941872 | R804811 |
| 11 Sep 17:48 | UPIMTWNOXXP | LRSIMR, DP, subType P, 7750 | R805092 |
| 11 Sep 17:48 | UPIMTWNPDVB | LRSIMR, DL, subType P, A541352 | R805093 |

(Dealing orders had to carry `subType` — without it the API rejects them with
`{'subType': ['Missing data for required field.']}`, which contradicts the spec.)

## 3. Polling the document — still not ready 14 hours later

```bash
for O in UPIMTWLCQER UPIMTWLK52Z UPIMTWNOXXP UPIMTWNPDVB; do
  curl -s -w '\nHTTP %{http_code}\n' "https://api.hazlett.com.au/req/lrs/HAZURBA$O.pdf" -H "Authorization: Bearer $TOKEN.$CID"
done
```
Captured 12 Sep 2026 06:57 AEST (20:57 UTC 11 Sep), identical for all four:
```json
{"status": "Error", "errorCode": "400", "errorReason": "Document is not ready to download"}
HTTP 400
```

Our server has polled each order every 30 minutes since ordering (53 attempts each at the time
of writing) with the same answer every time.

## 4. Comparison: titles work instantly on the same token

```bash
curl -s -X POST https://api.hazlett.com.au/req/lrs -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN.$CID" \
  --data '{"orderId":"UPTMTWLC1JC1","productCode":"LRSTLSWM","folioIdentifier":"19/7750"}'
```
Answered `"status":"Closed"`, `"message":"Document is ready to download"`, and the PDF (46 KB,
2 pages, search time 11 Sep 2026 16:44) downloaded 1.8 s after the order.

## 5. Questions

1. Are LRSIMR requests R804775, R804811, R805092 and R805093 queued at LRS, failed, or
   awaiting something on Hazlett's side? Your 4 June 2025 example (SP103272, R371251) was
   delivered the same day.
2. What is the expected turnaround for plan and dealing images ordered through the API, and
   is there a webhook callback so we do not have to poll for hours?
3. Please confirm `subType` is required for DL (dealing) image orders, and which value is
   correct — we are sending `P`.
