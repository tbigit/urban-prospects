# Migration plan: WordPress → new site + app, same login

Status: draft 2026-09-06. Phases 1–3 can be executed autonomously; phase 4 needs Danny.

## Scope

- Everything on www.urbanprospects.com.au (WordPress) moves to the new SvelteKit site, then
  www is swapped to the new server and the old WordPress becomes legacy.urbanprospects.com.au.
- upapp (`~/Downloads/upapp`, SvelteKit 1 / Svelte 4, adapter-static) is NOT merged at source
  level. It is built separately and served at `/app` on the new origin, gated by the new site's
  session. Framework upgrade is a later task.
- Members must log in with their existing WordPress passwords (hashes copied verbatim, see
  `web/deploy/sql/001_users.sql`).
- Temporarily disabled in the app until the Stripe backend lands (target: a few weeks after
  cutover): title purchase (currently `window.parent` → WooCommerce `/checkout/?add-to-cart=9926`)
  and image search. Each gets an in-app holding notice, not a broken button. Trial links that point
  at WordPress `/vip…` URLs get the same treatment.

## Phase 1 — Content (no dependencies, start now)

1. Export posts, pages, media and redirect-relevant slugs from the WP MariaDB
   (`wp-credentials.md`, stack at /opt/urbanprospects-test).
2. Map each WP URL to a new route or a 301 in `web/deploy/redirects.conf`.
3. Port remaining pages into `web/src/lib/content` / routes; copy media into `web/static`.
Accept: every indexed WP URL returns 200 on preview or a 301 to one that does.

## Phase 2 — Users (blocks phase 3)

1. Export wp_users + usermeta (roles, names) and WooCommerce/membership state.
2. Load into UrbanPortalDBP `users` via the `updb` hop; set `password_algo` from the hash prefix.
3. Verify a phpass check passes against a throwaway test member (never Danny's real inbox).
4. Script is re-runnable as a delta so it can be replayed at cutover.
Accept: row count matches wp_users; test member's password verifies.

## Phase 3 — Auth + app mount (preview domain)

Status 2026-09-06: DONE and proven end to end — stuart@urbanperspectives.com.au logged in on a local build against the real DB with the WordPress password; row rehashed to argon2id, session row created. Previously: code complete and smoke-tested locally (see CLAUDE.md "Login, sessions and
the /app mount"). Not yet deployed: needs 002_sessions.sql applied, .env on the server, nginx
vhost + systemd unit installed, and a throwaway member to prove same-password login.

1. Switch website to adapter-node (one Node process behind nginx) — needed for sessions.
2. Login / logout / password reset; verify `$P$` (phpass), `$wp$` (WP 6.8 bcrypt-sha384),
   `$2y$` (bcrypt); rehash to argon2id on success.
3. Build upapp, deploy to `/opt/www/upapp`, serve at `/app`, protect with nginx `auth_request`
   against the site session. Remove the hardcoded `is_logged_in = true`.
4. Holding notices for title purchase, image search, `/vip` trial links.
5. Restyle/theme of the app (UP-031/032) is out of scope for cutover.
Accept: test member logs in on preview, reaches /app, disabled features show the notice,
logged-out visitors are redirected to /login.

## Phase 4 — Cutover (Danny approves the window)

1. Freeze WP signups/purchases. 2. Replay phase-2 delta. 3. DNS: www → 143.42.46.116,
legacy → old WP host; TLS for both. 4. Add nginx 301s for old WP paths. 5. Smoke test login,
/app, key articles. Rollback = point www back at WP.

## Open items needed from Danny

- ~~SSH host of the WP Docker stack~~ — 45.79.118.32 (`upapi` alias), per the migration session.
- ~~A throwaway WP member account for login parity testing~~ — done with Stuart's account.
- ~~OK to move the website to adapter-node~~ — approved 2026-09-06, done.
- Is 143.42.46.116 able to reach the DB host 192.168.146.115? If not, the Node server needs a tunnel or the DB a public listener.
- `wp-credentials.md` is still tracked in git despite the .gitignore change; untrack it.
