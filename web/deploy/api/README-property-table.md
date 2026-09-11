# Moving the API to a new property table (`up_property_d_N`)

Each property-data load lands as a **new table** (`up_property_d_3` → `up_property_d_4` → …)
rather than an update in place, so the cutover is a code change plus a pile of DB work that
does not come with the table:

- a fresh `CREATE TABLE AS` arrives with **none** of the ~50 indexes the search depends on;
- a load can drop or rename a column the API still reads (`up_property_d_4` dropped `rule_ids`);
- the lookup materialised views (`mv_d3_zone_lookup`, `mv_region_lga_suburb`,
  `suburb_centroid`) still point at the old table, so the dropdowns keep serving stale data;
- `db_propery_table_name` is not the only reference — `api.js` has hardcoded literals too.

`qa_property_table.py` checks all of that, fixes what it can, and only switches when green.

## Setup

Runs on the DB hop host (`updb` = `root@172.105.183.89`), which has `psql` and `~/.pgpass`.
Give it a copy of `api.js` so it can read the column contract and find hardcoded references.

```bash
scp web/deploy/api/qa_property_table.py root@172.105.183.89:/tmp/
scp root@45.79.118.32:/srv/users/upapi/apps/api/api.js /tmp/api.js
scp /tmp/api.js root@172.105.183.89:/tmp/api.js
ssh root@172.105.183.89
export PGPASSWORD=$(awk -F: '{print $5}' ~/.pgpass | head -1)
```

## The sequence

```bash
# 1. What is wrong? Read-only. Exit code 0 only when everything passes.
python3 /tmp/qa_property_table.py check --to up_property_d_4 --api-js /tmp/api.js

# 2. Build the missing indexes (CONCURRENTLY, so searches keep working; hours on 41GB).
python3 /tmp/qa_property_table.py indexes --to up_property_d_4 --apply

# 3. Rebuild the lookup matviews off the new table, in dependency order, one transaction.
python3 /tmp/qa_property_table.py matviews --to up_property_d_4 --apply

# 4. Prove it: same answers, comparable speed.
python3 /tmp/qa_property_table.py sanity --to up_property_d_4
python3 /tmp/qa_property_table.py sanity --to up_property_d_4 --full-hard   # + the statewide probe

# 5. Re-check, then switch. `cutover` refuses to write unless `check` is green.
python3 /tmp/qa_property_table.py check   --to up_property_d_4 --api-js /tmp/api.js
python3 /tmp/qa_property_table.py cutover --to up_property_d_4 --api-js /tmp/api.js
```

Then copy the patched `api.js` back, `node --check`, `pm2 restart api`, and run
`/usr/local/bin/refresh-lookups.sh` to flush and re-warm the memcache.

## What each check means

| Section | Fails when |
|---|---|
| `table` | either table is missing, the new one has never been `ANALYZE`d, or the row count moved more than ±20% (a broken load, not a change in NSW) |
| `columns` | a column the API reads exists on the old table but not the new one, a type changed incompatibly, or a type no longer satisfies `expectedSchema` in api.js. Likely renames are surfaced as `WARN` so a rename is not read as a deletion. A column missing from *both* tables is a pre-existing api.js bug — `WARN`, not a blocker |
| `indexes` | the new table has no equivalent of an index the old one **actually uses**. Comparison is by normalised definition, not by name, so a differently-named but identical index passes. An index the source table has scanned fewer than `--min-scans` times (default 1, i.e. never) is reported as a `WARN` and left out of the DDL — building it costs hours of `CONCURRENTLY` on 41 GB for something no query has picked. Usage comes from `pg_stat_user_indexes` since the last stats reset, which the report prints. `--min-scans 0` includes everything |
| `matviews` | any matview still reads the old table. The set is the full dependency closure — `mv_region_lga_suburb` is built off `mv_d3_zone_lookup`, not off the table, and a `CASCADE` drop would destroy it silently. Views are dropped dependants-first, recreated bases-first, no `CASCADE`, one transaction. Names are kept (api.js queries `mv_d3_zone_lookup` by name) |
| `code` | a hardcoded `up_property_d_N` remains in real code (comments are `INFO`) |
| `sanity` | a parity count differs by more than `--tolerance` (default 20%), **or a hard query is more than `--speed-tolerance` (default 1.5×) slower on the new table** — the real symptom of a missing index is minutes, not percentages |

The `sanity` hard queries mirror the shapes `_search_property` actually emits — the
`DISTINCT ON (coalesce(propid, gurasid))` dedup with `ORDER BY suburbname, address LIMIT` —
across a bounded map search, an LGA + zone search, a suburb aggregate, a pattern-book flag,
a CDC flag and an address prefix lookup. `--full-hard` adds the statewide school-slider
search that measured 220 s on `up_property_d_3`.

Timings are single wall-clock runs on a live box, so treat anything under 1.5× as noise; the
speed check only fires above 2 s absolute for that reason.

## Known state of `up_property_d_4` (checked 2026-09-08)

- 5,408,169 rows (+0.3% vs `d_3`), 41 GB, last analyzed 2026-09-04.
- **24 of the 51 indexes are missing, but only 2 matter.** Measured over 5.5 days of
  production traffic (`pg_stat_user_indexes`, stats reset 2026-09-03): `idx_d3_lga_lzn` has
  156 scans and `idx_d3_rule_ids` has 1. The other 22 — every `cdc_*` and pattern-book
  partial GiST index — have **`idx_scan = 0`**: the planner has never once chosen them, and
  since the search moved to `mv_property_search` it never will. Build the two, skip the rest.
- **Done 2026-09-08:** `drop_unused_indexes.py` dropped the 36 never-scanned indexes from
  `up_property_d_3` — 6,435 MB of indexes down to 2,219 MB, in 2 seconds. The `CREATE`
  statements were saved first and are checked in at
  `web/deploy/sql/restore-up_property_d_3-indexes-2026-09-08.sql`; one `psql -f` puts them
  all back. `idx_d4_lga_lzn` was built on `up_property_d_4` (78 s).
- `idx_d4_rule_ids` cannot be built until the column comes back — `CREATE INDEX` fails with
  `column "rule_ids" does not exist`, which the script now reports and steps past rather than
  abandoning the rest of the run.
- **`rule_ids` was dropped — and on 2026-09-11 the code stopped reading it.**
  `patch_remove_planning_rules.py` removed the planning-rules lookup from `GET /property/<id>`
  (applied live, backup `api.js.bak-2026-09-11-pre-rules`), the PLANNING RULES panel came out
  of `Property.svelte`, and `rule_ids` left `CORE_COLUMNS` here. No longer a blocker; the
  `idx_d3_rule_ids` index is reported as never-used and can be ignored.
- 20 new columns (`addctrl_*`, `esa_*`, `apu_*`) that nothing reads yet.
- All three matviews still point at `d_3`.
- `api.js` has 4 hardcoded `up_property_d_3` literals in real code (the `expectedSchema` key
  at :3128, `queryCDCProperties` at :3807/:3814, and a query at :3645).

## Re-checked 2026-09-11

`check` is RED with 9 failures, none of them columns any more: all five matviews
(`mv_address_lookup`, `mv_d3_zone_lookup`, `mv_property_search`, `suburb_centroid`,
`mv_region_lga_suburb`) still read `d_3`, and the 4 hardcoded literals remain (now :3150,
:3667, :3829, :3836). Indexes pass (only the ignorable `rule_ids` one missing).

**Do not run `matviews --apply` or `cutover` yet:** `up_property_d_4` is still being loaded.
At check time a `UPDATE up_property_d_4 SET primary_frontage_road, primary_frontage_length_m,
propertyfrontagecount …` from the up-geo box (172.105.184.178) was running, autovacuum had been
on the table for 28 min, a `up_property_d_4_frontage_prev` copy (5.41M rows) exists, and the
table has grown to 66 GB (update bloat — expect a `VACUUM FULL`/re-load before cutover). Row
count is 5,365,076 (−0.4% vs d_3). Re-run `check` once that load has finished, then
`matviews --apply`, `sanity --full-hard`, `cutover`.
