"""Remove the unauthenticated v1 search route, `POST /properties`.

It answered a full property search — every filter, up to 10,000 rows a page — to anyone who
could reach the API, with no session cookie and no API key. `/v2/app/properties` has been the
real route since 2026-09-07: same handler, behind `requireSession`, with nginx forwarding the
`up_session` cookie for `/q/v2/` only.

Traffic on the day this was removed (nginx access log, upapi):

    08/Sep/2026   POST /v2/app/properties          309
                  POST /v2/app/properties/suburbs   57
                  POST /properties                   8   <- all from this box's own probes

`/quickproperties` (the anonymous variant) went on 2026-09-07 and is already absent. The app's
client-side v1 fallback in `_api_post` goes in the same commit, so nothing reaches for it.

Deliberately left alone
-----------------------
* `GET /property/<id>` — the detail route, ~416 hits. There is no v2 twin yet, and gating it
  needs more than an api.js change: nginx strips the Cookie header on `/q/` and forwards it
  only on `/q/v2/`, so an authenticated detail route has to be a new `/v2/app/property/<id>`
  with the client moved over. That is the last unauthenticated property route; worth doing,
  but it is its own change.
* `POST /v2/properties` (no `/app`) — the public Planning Data API, bearer key. Not this.

Run on the API host (upapi / 45.79.118.32):

    scp web/deploy/api/patch_remove_v1_properties.py root@45.79.118.32:/tmp/
    ssh root@45.79.118.32
    cp /srv/users/upapi/apps/api/api.js /srv/users/upapi/apps/api/api.js.bak-$(date +%F)-pre-v1-removal
    python3 /tmp/patch_remove_v1_properties.py
    /srv/users/upapi/.nvm/versions/node/v20.9.0/bin/node --check /srv/users/upapi/apps/api/api.js
    su - upapi -c 'export PATH=/srv/users/upapi/.nvm/versions/node/v20.9.0/bin:$PATH; pm2 restart api'
"""

import sys

p = '/srv/users/upapi/apps/api/api.js'
s = open(p).read()

OLD = """app.post('/properties', async function (req, res) {
  _search_property(req, res);
});"""

NEW = """// POST /properties (unauthenticated search) was removed 2026-09-08. It answered a full
// property search to anyone who could reach the API. Use POST /v2/app/properties, which is
// the same handler behind requireSession; /v2/properties (no /app) is the public bearer-key
// Planning Data API. Answer 410 rather than 404 so a stale caller says why it broke.
app.post('/properties', function (req, res) {
  res.status(410).send({ error: 'gone: use /v2/app/properties (session) or /v2/properties (API key)' });
});"""

if '410' in s and 'use /v2/app/properties' in s:
    sys.exit('already patched')
if s.count(OLD) != 1:
    sys.exit(f"the v1 /properties route was not found verbatim ({s.count(OLD)} matches) — api.js drifted")

open(p, 'w').write(s.replace(OLD, NEW))
print('patched: POST /properties now answers 410 Gone')
