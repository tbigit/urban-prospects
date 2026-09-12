"""Gate the property detail route: `GET /v2/app/property/:id` behind requireSession.

`GET /property/<id>` was the last unauthenticated property route — the full 300-column
row plus plans, SEPPs, DAs and sold history to anyone who could reach the API, and the
subscription gate lived only in the app's UI. The handler is now a named function
registered twice: as `/v2/app/property/:id` behind `requireSession` (the same middleware
as `/v2/app/properties`), and at the old path answering **410 Gone**, like the v1 search
removal. nginx already forwards the `up_session` cookie for `/q/v2/` and strips it for
`/q/`, so the site's vhost needs no change; the app's three fetches move to the v2 path
in the same commit (`routes/app/+page.svelte`, `lib/app/pdfFunctions.js`).

Callers before the change (API access logs, 2026-09-12): only the app via
www.urbanprospects.com.au and curl probes — no API-key customer used it.
`/v2/properties` (no `/app`, bearer key) is untouched.

Run on the API host (upapi / 45.79.118.32) and deploy the site straight after — between
the two, property clicks on the live app get a 410:

    scp web/deploy/api/patch_property_detail_auth.py root@45.79.118.32:/tmp/
    ssh root@45.79.118.32
    cp /srv/users/upapi/apps/api/api.js /srv/users/upapi/apps/api/api.js.bak-$(date +%F)-pre-detail-auth
    python3 /tmp/patch_property_detail_auth.py
    /srv/users/upapi/.nvm/versions/node/v20.9.0/bin/node --check /srv/users/upapi/apps/api/api.js
    su - upapi -c 'export PATH=/srv/users/upapi/.nvm/versions/node/v20.9.0/bin:$PATH; pm2 restart api'
"""

import sys

p = '/srv/users/upapi/apps/api/api.js'
s = open(p).read()

OLD_HEAD = "app.get('/property/:id', async function (req, res) {\n"
NEW_HEAD = """// Property detail. Registered below as /v2/app/property/:id (requireSession) and as the
// retired unauthenticated /property/:id (410).
async function _property_detail(req, res) {
"""

OLD_TAIL = """  else {
    return res.send([]);
  }

});


// ---- v2: session-cookie authenticated routes"""
NEW_TAIL = """  else {
    return res.send([]);
  }

}

// GET /property/:id (unauthenticated detail) was retired 2026-09-12: use
// GET /v2/app/property/:id, the same handler behind requireSession. 410 rather than 404 so
// a stale caller says why it broke.
app.get('/property/:id', function (req, res) {
  res.status(410).send({ error: 'gone: use /v2/app/property/:id (session)' });
});


// ---- v2: session-cookie authenticated routes"""

OLD_V2 = "app.get('/v2/app/me', requireSession, (req, res) => res.send(req.user));\n"
NEW_V2 = OLD_V2 + """
// Authenticated twin of GET /property/:id (full row + plans/SEPP/DAs/sold history).
app.get('/v2/app/property/:id', requireSession, _property_detail);
"""

if "app.get('/v2/app/property/:id'" in s:
    sys.exit('already patched')
for name, old in (('route head', OLD_HEAD), ('route tail', OLD_TAIL), ('/v2/app/me line', OLD_V2)):
    if s.count(old) != 1:
        sys.exit(f'{name} not found verbatim ({s.count(old)} matches) — api.js drifted')

s = s.replace(OLD_HEAD, NEW_HEAD).replace(OLD_TAIL, NEW_TAIL).replace(OLD_V2, NEW_V2)
open(p, 'w').write(s)
print('patched: GET /v2/app/property/:id behind requireSession; GET /property/:id answers 410')
