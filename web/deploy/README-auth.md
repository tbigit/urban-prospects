# Deploying the site with login (adapter-node)

The site is no longer a pure static deploy. `npm run build` now emits a Node
server in `web/build/` (`index.js` + `client/` + `prerendered/` + `server/`).
Marketing pages are still prerendered; only the auth routes run at request time.

## One-time server setup (143.42.46.116)

1. Node 22 on the box; `mkdir -p /opt/www/upweb /opt/www/upapp`.
2. Apply the schema to UrbanPortalDBP (via the `updb` hop, see CLAUDE.md):
   `001_users.sql` (the migration session owns filling it), then `002_sessions.sql`.
3. `/opt/www/upweb/.env` from `web/.env.example` — DATABASE_URL, ORIGIN, SMTP.
   The web server must be able to reach the DB host (192.168.146.115 is on a
   private network; if 143.42.46.116 is not on it, tunnel or move the DB).
4. `deploy/upweb.service` → `/etc/systemd/system/`, `deploy/nginx-site.conf` →
   nginx, `deploy/redirects.conf` → `/opt/www/upweb-redirects.conf`.

## Each deploy

```sh
cd web && npm ci && npm run build
rsync -avz --delete --exclude .env build/ root@143.42.46.116:/opt/www/upweb/
rsync -avz package.json package-lock.json root@143.42.46.116:/opt/www/upweb/
ssh root@143.42.46.116 'cd /opt/www/upweb && npm ci --omit=dev && systemctl restart upweb'

# the app, namespaced under /app (do NOT use `npm run build` there: its postbuild
# hook sftp-deploys to the root of /opt/www/upapp on its own)
cd ~/Downloads/upapp && BASE_PATH=/app npx vite build
rsync -avz --delete build/ root@143.42.46.116:/opt/www/upapp/
```

## How the pieces fit

- `src/hooks.server.ts` resolves the `up_session` cookie to `locals.user` (DB-backed
  `sessions` table, token hashed at rest, 30-day sliding expiry).
- `/login/` verifies against `users.password_hash` in whatever format it holds
  (WordPress phpass, WordPress 6.8 `$wp$` bcrypt, plain bcrypt, argon2id) and
  rehashes to argon2id on success. `npm run test:password` exercises all four.
- `/forgot-password/` → emailed link → `/reset-password/<token>/` (one hour, single use,
  invalidates other sessions). With `SMTP_HOST` unset the mail is printed to the
  server log instead of sent.
- `/account/` shows plan/regions from `user_subscriptions` and changes password.
- `/auth/check` is nginx's `auth_request` target for `/app/`; `/auth/me` hands the
  app its profile in the same shape the WordPress embed used to pass in the query
  string, so upapp needed one fetch rather than a rewrite.
