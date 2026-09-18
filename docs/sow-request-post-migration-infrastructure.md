# Statement of Work request: post-migration infrastructure realignment

**Client:** Urban Prospects Pty Ltd (urbanprospects.com.au)
**Prepared by:** Danny Liang, Moble
**Date:** 12 September 2026
**Status:** Request for proposal and fixed-price quote

## 1. Background

Between 6 and 12 September 2026 the Urban Prospects platform was migrated off WordPress and
onto a single Node (SvelteKit) application that serves the marketing site, member accounts,
the admin console and the property search app from one origin. In the same window the
production property table was cut over (`up_property_d_3` -> `up_property_d_4`), the primary
database host was consolidated, the API was renamed to `api.urbanprospects.com.au`, and the
web origin was placed behind Cloudflare with a Let's Encrypt wildcard certificate.

The application layer is now stable. The supporting infrastructure has **not** been brought
into line with it. Specifically, the reverse proxies (`/p`, `/p2`, `/q`, `/q2`), the TLS
endpoints, the monitoring and health checks, the backup scripts, the firewall rules and the
database standby all still reflect the pre-migration topology. This SOW asks for a quote to
close that gap.

### Current topology (for reference)

| Role | Host | Notes |
|---|---|---|
| Web / Node app (site + app + admin) | `143.42.46.116` | nginx -> Node on port 3010. Proxied through Cloudflare. Hostnames `www`, apex, `preview`. |
| Express API (`api.js`) | `45.79.118.32` | `api.urbanprospects.com.au`. Direct A record, **not** Cloudflare-proxied. Also hosts the legacy WordPress at `v1.urbanprospects.com.au` (Pin/WooCommerce billing still live). |
| Primary Postgres (`UrbanPortalDBP`) | `172.105.183.89` (`urban-db-primary`) | PostgreSQL 14 + PostGIS. Second private IP `192.168.146.115` on the same box. |
| Standby Postgres | `172.105.174.70` (listed) | Referenced by `sequelize-standby.js`; SSH currently unreachable. |
| GIS / vector tiles (`/p`, `/p2` upstream) | `172.105.184.178` (`up-geo`) | Martin 0.17 behind an nginx tile cache in Docker. |

## 2. Scope of work

Six work packages. Each lists the current state as found, the work required, deliverables and
acceptance criteria. Please quote each package separately so they can be approved individually.

### WP1. Proxy servers and traffic routing

**Current state.** The site's nginx vhost on `143.42.46.116` was patched by hand during the
cutover and has drifted from the repo template (`web/deploy/nginx-site.conf`). `/q` and `/q2`
proxy to the API; `/q/v2/` forwards the session cookie while `/q/` strips it; `/p` and `/p2`
proxy to the GIS box with the standby listed as an nginx `backup` that no longer answers. The
WordPress PHP proxies these replaced are still present on the API host. The API host's own
nginx (ServerPilot) has a hand-written vhost for `api.urbanprospects.com.au` alongside a
ServerPilot-managed `upapi.conf` that must not be edited.

**Work required.**

- Reconcile the live vhost and the repo template into one source of truth, deployed from the repo.
- Confirm every `/p`, `/p2`, `/q`, `/q2` route: correct upstream, correct cookie and header
  handling, correct timeouts for the slow endpoints (`/q/v2/app/properties/suburbs` and
  `/address/search` can take seconds).
- Remove or redirect the dead WordPress-era proxies and directories (`/opt/www/upapp`,
  `/opt/www/upapp-gated`, `/opt/www/app`, PHP `/q`, `/q2`, `/p`, `/p2` on the API host).
- Fix the `/p` upstream group: either restore the standby (see WP6) or remove it so nginx
  stops probing a dead host.
- Retire `upapi.imtg.com.au` once nothing references it (the nightly `refresh-lookups.sh`
  cache warm still calls it).

**Deliverables.** Versioned nginx configs for both hosts in the repo; a deploy step that
applies them; a routing table document listing every path, upstream and header rule.

**Acceptance.** `nginx -t` clean on both hosts; every route in the routing table returns the
expected status from an external check; no config outside the repo differs from the repo copy.

### WP2. TLS endpoints

**Current state.** The web origin serves a Let's Encrypt wildcard (`*.urbanprospects.com.au`)
issued by `acme.sh` over Cloudflare DNS-01, with the Cloudflare token stored in the acme.sh
config. The API host uses certbot webroot for `api.urbanprospects.com.au` and a separate
certbot cert for `v1.urbanprospects.com.au`. Cloudflare's SSL mode is Full (strict), so any
proxied hostname without a valid origin cert returns 526. Stale A records (`autoconfig`,
`ftp`, `mail`, `ssh`) point at a dead host, and two SendGrid DKIM CNAMEs are proxied, which
breaks them.

**Work required.**

- Inventory every certificate, its renewal mechanism, its expiry and its reload hook, on all
  four hosts (web, API, DB, GIS). The GIS box's tile endpoint is reached over plain HTTP from
  the web nginx today; state whether that should be TLS or a private network.
- Verify unattended renewal actually works on each (dry-run renewals, confirm reload hooks).
- Clean up the Cloudflare zone: remove dead A records, unproxy or delete the SendGrid CNAMEs,
  document which records must stay unproxied (MX, Postmark DKIM and return-path).
- Add expiry monitoring for every public and internal cert (feeds WP3).

**Deliverables.** Certificate inventory document; corrected Cloudflare records; renewal
dry-run output for each cert.

**Acceptance.** No hostname in the zone returns a 52x; every cert has more than 30 days
remaining and a verified automatic renewal path.

### WP3. Server monitoring scripts and health checks

**Current state.** Existing monitors and health checks predate the migration. They still
target the standalone `/app/` alias, the old `auth_request` gate, `upapi.imtg.com.au`, and
`/p`, `/p2` as separately served paths. Since the cutover `/p`, `/p2`, `/q`, `/q2` and `/app/`
all live inside the one Node origin's nginx, so the old checks either test a path that no
longer exists or pass on a redirect without exercising the real upstream.

**Work required.**

- Replace the health checks with ones that match the new topology:
  - Web: `/`, `/auth/check` (expect 401 anonymous), `/app/` (expect redirect to login),
    `/sitemap.xml`.
  - API through the proxy: `/q/v2/app/me` (expect 401), one cheap `/q/*` list endpoint.
  - API direct: `https://api.urbanprospects.com.au/` on its own IP, bypassing Cloudflare.
  - GIS: one known tile through `/p` and one direct to the tile cache.
  - Database: connection check, replication lag (once WP6 lands), disk on `/mnt/data`.
  - Node service (`upweb.service`) and PM2 `api` process liveness.
- Monitor the nightly `refresh-lookups.sh` (log freshness and exit code). It failed silently
  every night for a period before 12 Sep 2026 and nothing noticed.
- Monitor the Woo/Pin cron on the API host (`wp-cron.php` every 5 min with the `v1` Host
  header); a silent failure there stops member billing.
- Monitor certificate expiry (from WP2) and Postgres OOM kills (six occurred between 1 and 9
  Sep 2026 from oversized tile queries).
- Route alerts to an agreed channel with an escalation contact.

**Deliverables.** Monitoring configuration in version control; alert runbook describing what
each alert means and the first response.

**Acceptance.** Deliberately stopping each service (Node, PM2 API, Martin, Postgres) raises an
alert within 5 minutes; restoring it clears the alert. A forced failure of
`refresh-lookups.sh` alerts by the next morning.

### WP4. Custom server backup scripts

**Current state.** Backup scripts were written for the WordPress deployment and back up
WordPress files and the MariaDB container. The production site is now the Node app in
`/opt/www/upweb-node`, with runtime state that lives outside the deploy directory and is not
in git: `.env`, the title-search PDFs in `/opt/www/upweb-data/title-docs`, and the media
directory `web/static/media/demo` (deployed separately). The member data (`users`,
`sessions`, `user_subscriptions`, `title_orders`, `user_fav`, `user_template`) lives in
Postgres on the DB host, alongside a 49 GB property table that is reloaded from source and
does not need the same retention.

**Work required.**

- Rewrite the backup for the Node app: `.env`, `title-docs`, media, nginx configs, TLS keys
  and acme.sh/certbot state, systemd units, crontabs.
- Postgres: nightly logical dump of the member-facing tables with 30-day retention, plus a
  weekly base backup (or WAL archiving) of the whole cluster. State the retention for the
  large property tables separately and justify it.
- Keep the WordPress/MariaDB backup running until Pin billing is retired (the last renewal
  falls in January 2027 or later); do not decommission it in this SOW.
- GIS box: back up the Martin config, the nginx tile cache config and the `gnaf-db` /
  `nsw-kg-db` containers' data.
- Off-host storage for all of the above, encrypted at rest, with a documented restore.
- Remove the dead 165 GB March dump in `/mnt/data/pg-migration` after confirming the new
  backups have run.

**Deliverables.** Backup scripts in version control; retention policy; a restore runbook;
one completed test restore of the member tables into a scratch database, with timing.

**Acceptance.** A restore from the previous night's backup reproduces the member tables and
the app's runtime files on a clean host, following only the runbook.

### WP5. Firewall and network security

**Current state.** The web origin is behind Cloudflare, so its ports 80 and 443 should
accept traffic only from Cloudflare's published IP ranges, but the firewall has not been
tightened to enforce that. The API deliberately stays on a direct IP (not proxied) because
Cloudflare measurably added about 0.7 s of latency to app API calls, so it is fully exposed
to the internet. The DB host exposes Postgres on `192.168.146.115` for the API, the tile
server and local admin tunnels. The GIS box's tile cache listens on port 3000. SSH is key-based
on the hosts we have audited but root login is enabled everywhere.

**Work required.**

- Web host: restrict 80/443 to Cloudflare IP ranges (with an automated range refresh), plus
  an allowlisted direct path for monitoring (WP3) and for `acme.sh` if it ever needs HTTP-01.
- API host: it must stay directly reachable. Add rate limiting on the public `/v2/properties`
  bearer-key API and the unauthenticated `GET /property/<id>`, fail2ban on nginx and SSH, and
  confirm the `v1` WordPress admin is not reachable from the public internet except through an
  allowlist.
- DB host: Postgres reachable only from the API host, the GIS box and the standby (WP6);
  everything else via SSH tunnel. Confirm `pg_hba.conf` matches.
- GIS host: tile cache reachable only from the web nginx and monitoring; Docker published
  ports bound to the private interface, not `0.0.0.0`.
- All hosts: disable root password login, restrict SSH to an allowlist or a bastion,
  unattended security updates, and a documented port inventory.

**Deliverables.** Firewall rule sets in version control (nftables, iptables or the provider's
cloud firewall, your recommendation); port inventory; a change log of what was closed.

**Acceptance.** An external port scan of each host shows only the intended ports; the app,
admin console, API and tiles all keep working through their intended paths; the API's
direct-IP latency is unchanged.

### WP6. Standby database: rebuild, replication and hot-standby backup

**Current state.** The primary DB host was rebuilt and consolidated during the migration:
Postgres now runs on `172.105.183.89` itself, the property table moved to `up_property_d_4`
(49 GB after `VACUUM FULL`), five materialised views were rebuilt against it and a nightly
`REFRESH ... CONCURRENTLY` job runs at 03:00 Sydney. The standby at `172.105.174.70` was
never re-established after this work: SSH times out, the API's `sequelize-standby.js` and
the `/standby/on|off` switch in `api.js` still point at it, and the nginx `/p` backup
upstream references it. There is currently no failover target and no replica to take backups
from.

**Work required.**

- Provision or repair the standby host with matching PostgreSQL 14, PostGIS and `pg_trgm`,
  and disk sized for the primary plus the weekly data loads (the Friday load rewrites
  `up_property_d_4` in place, so replication traffic spikes then).
- Set up streaming physical replication from the primary (replication slot, `pg_hba`, TLS on
  the replication connection), with monitored lag (WP3).
- Replace the old standby-to-production replication scripts, which predate the host rebuild,
  with either native streaming replication or a documented, tested script set. State which and
  why.
- Verify the standby serves the API: switch `api.js` to standby, run the app's search and
  detail flows, switch back. Confirm the matviews and their unique indexes replicate intact.
- Move the base backups in WP4 to run from the standby so the primary is never loaded by
  backup I/O.
- Document a failover and fail-back procedure and rehearse it once, off peak, with the
  timings recorded.

**Deliverables.** Working streaming standby; replication configuration in version control;
failover runbook with rehearsal results; updated `sequelize-standby.js` target.

**Acceptance.** Replication lag stays under 60 s through one Friday load; a rehearsed
failover brings the app back on the standby within the agreed RTO; backups run from the
standby without affecting primary query times.

## 3. Out of scope

- Application code changes in the SvelteKit site, the property app or `api.js`, beyond the
  `sequelize-standby.js` target and the `refresh-lookups.sh` hostname.
- Retiring Pin/WooCommerce billing or the `v1` WordPress host.
- Cloudflare WAF rule design beyond what WP5 requires for IP restriction.
- Any change to the weekly property data load process on the up-geo box.

## 4. Assumptions and constraints

- Root SSH access to all four hosts and Cloudflare zone edit rights will be provided.
- All work is performed against the live production environment; each work package must
  include a rollback step and be scheduled outside AEST business hours where it affects
  members.
- No test email may be sent to `danny@moble.com.au`; request a throwaway address for any
  alert-routing test.
- Secrets (database passwords, Stripe, Postmark, Hazlett, Cloudflare tokens) are never to be
  committed to the repository or included in deliverable documents.
- Existing decisions stand: the API stays off Cloudflare, Pin billing keeps running, and the
  Woo subscriptions are not to be bulk-cancelled.

## 5. What we need from you

Please respond with:

1. A fixed price per work package (WP1 to WP6) and a total.
2. Proposed sequencing and elapsed time. Our preferred order is WP6, WP3, WP4, WP1, WP2, WP5,
   since the missing standby is the largest current risk.
3. Named engineer(s) and their availability.
4. Any additional access, tooling or hosting spend the work requires.
5. Your recommended monitoring platform and off-site backup destination, with running costs.

Responses to Danny Liang, Moble, by **26 September 2026**.
