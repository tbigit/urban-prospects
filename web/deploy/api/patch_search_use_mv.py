"""Point the property search at mv_property_search instead of the 41 GB table.

Measured on the five-region school-distance search (EXPLAIN ANALYZE, 2026-09-08):

    up_property_d_3      219,572 ms   17 GB read, 7.5 GB spilled to temp
    mv_property_search         2 ms   index scan, stops at 450 rows

The view (built by build_mv_property_search.py) is the same rows with the dedup already
applied and only the 87 columns the search filters on or the result list renders — 1.27 GB
heap + 1.55 GB indexes, so it stays in cache on a 15 GB box, where the base table never can.

How the patch works
-------------------
`_search_property` assembles its SQL through half a dozen branches (permissible uses, bounds,
get_suburb, count, aggregate). Rewriting each one would be a large, risky diff for what is
mechanically the same three substitutions, so the swap is applied to the finished statement
instead, immediately before it is logged and run:

  1. the table name becomes the view;
  2. `select DISTINCT ON (coalesce(t1.propid, t1.gurasid)) t1.*` becomes `select t1.*` —
     the view is already one row per property;
  3. the inner `order by coalesce(...), (address ~ '^\\S*/'), address` goes, because that
     sort existed only to drive the DISTINCT ON. Leaving it in would force a full sort of
     the result set and throw away the entire gain;
  4. `count(DISTINCT coalesce(t1.propid, t1.gurasid))` becomes `count(*)`.

Set USE_SEARCH_MV=0 in the environment to fall straight back to the base table without
editing code — the substitutions are skipped and the SQL is exactly what it is today.

Two things to know before running this
--------------------------------------
* **The result rows carry 87 columns, not 308.** The property detail panel loads through
  /property/<id>, which is untouched, but if the list or a marker reads a field that is not
  in the view it will read as undefined. Add it to build_mv_property_search.py and rebuild.
* **Dedup now happens before the filter, not after.** The view picks one canonical row per
  property once; the old query picked one per property *within each search's result set*.
  Where duplicate rows of the same property disagree on a filter column the counts differ
  slightly — measured at 2,068,523 vs 2,070,707 on the statewide school search, 0.1%.
  Arguably the more correct reading (a property either qualifies or it does not), but it is
  a behaviour change, not a pure optimisation.

Run on the API host (upapi / 45.79.118.32):

    scp web/deploy/api/patch_search_use_mv.py root@45.79.118.32:/tmp/
    ssh root@45.79.118.32
    cp /srv/users/upapi/apps/api/api.js /srv/users/upapi/apps/api/api.js.bak-$(date +%F)-pre-search-mv
    python3 /tmp/patch_search_use_mv.py
    /srv/users/upapi/.nvm/versions/node/v20.9.0/bin/node --check /srv/users/upapi/apps/api/api.js
    su - upapi -c 'export PATH=/srv/users/upapi/.nvm/versions/node/v20.9.0/bin:$PATH; pm2 restart api'
"""

import sys

p = '/srv/users/upapi/apps/api/api.js'
s = open(p).read()

if 'db_search_view_name' in s:
    sys.exit('already patched')

# 1. the view name, next to the table name it stands in for
OLD_CONST = "let db_propery_table_name = 'up_property_d_3';"
NEW_CONST = """let db_propery_table_name = 'up_property_d_3';
// Narrow, pre-deduped projection of the property table that the search runs on: same rows,
// dedup applied, 87 columns instead of 308, 1.3GB instead of 41GB — so it stays in cache.
// Built and rebuilt by web/deploy/api/build_mv_property_search.py; refreshed by
// /usr/local/bin/refresh-lookups.sh. USE_SEARCH_MV=0 falls back to the base table.
let db_search_view_name = 'mv_property_search';
const USE_SEARCH_MV = process.env.USE_SEARCH_MV !== '0';"""
if s.count(OLD_CONST) != 1:
    sys.exit('db_propery_table_name declaration not found verbatim — api.js drifted')
s = s.replace(OLD_CONST, NEW_CONST)

# 2. the swap, applied to the finished statement in _search_property
OLD_LOG = """\n  console.log(sql);"""
NEW_LOG = """\n  if (USE_SEARCH_MV) {
    // The view is already one row per coalesce(propid, gurasid), so the DISTINCT ON and the
    // sort that drove it both go. Dropping that inner ORDER BY is the whole point: left in,
    // it sorts the entire result set before the outer LIMIT can take 450 rows.
    sql = sql
      .split(`"${db_propery_table_name}"`).join(`"${db_search_view_name}"`)
      .split(`select DISTINCT ON (${one_per_property_key}) t1.*`).join('select t1.*')
      .split(`order by ${one_per_property_order}`).join('')
      .split(`count(DISTINCT ${one_per_property_key})`).join('count(*)');
  }

  console.log(sql);"""
if s.count(OLD_LOG) != 1:
    sys.exit(f'the sql console.log in _search_property is not unique ({s.count(OLD_LOG)} matches)')
s = s.replace(OLD_LOG, NEW_LOG)

open(p, 'w').write(s)
print('patched: search now runs on mv_property_search (USE_SEARCH_MV=0 to revert)')
