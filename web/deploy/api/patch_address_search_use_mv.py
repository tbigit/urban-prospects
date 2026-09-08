"""Point /address/search at mv_address_lookup instead of the 41 GB property table.

The autocomplete query touched **98,647 buffers (~770 MB)** per lookup — a 902 MB GiST trgm
index plus random heap fetches over 308-column rows. Warm that is 735 ms; on a 15 GB box it
is rarely warm, and cold runs measured 6-36 s through the API. Rebuilding the GIN twin the
index cleanup had removed changed nothing: the planner keeps choosing the GiST on that table,
which is exactly why the GIN sat at idx_scan = 0 in the first place.

mv_address_lookup (web/deploy/sql/mv_address_lookup.sql) is the same 5.4M rows with **no
dedup** — so unit and part-lot addresses survive, unlike in mv_property_search — carrying
only the columns this endpoint reads and filters on. Same query, same results:

    up_property_d_3      98,647 buffers   735 ms   (GiST chosen)
    mv_address_lookup     4,843 buffers   192 ms   (GIN chosen)

The 20x drop in buffers is the point, not the 4x in warm milliseconds: at ~38 MB a lookup
stays cached, so the cold-cache spikes stop.

Only the FROM changes. Every column the handler names — address, normalized_address,
region_name, lga_name, suburbname — is on the view, and the WHERE, ORDER BY and LIMIT are
untouched. /address/check talks to PostGrid, not the database, and is not affected.

Run on the API host (upapi / 45.79.118.32):

    scp web/deploy/api/patch_address_search_use_mv.py root@45.79.118.32:/tmp/
    ssh root@45.79.118.32
    cp /srv/users/upapi/apps/api/api.js /srv/users/upapi/apps/api/api.js.bak-$(date +%F)-pre-addr-mv
    python3 /tmp/patch_address_search_use_mv.py
    /srv/users/upapi/.nvm/versions/node/v20.9.0/bin/node --check /srv/users/upapi/apps/api/api.js
    su - upapi -c 'export PATH=/srv/users/upapi/.nvm/versions/node/v20.9.0/bin:$PATH; pm2 restart api'
"""

import sys

p = '/srv/users/upapi/apps/api/api.js'
s = open(p).read()

if 'db_address_view_name' in s:
    sys.exit('already patched')

OLD_CONST = "let db_search_view_name = 'mv_property_search';"
NEW_CONST = """let db_search_view_name = 'mv_property_search';
// Address autocomplete's own projection: every row (units and part lots included, which
// mv_property_search dedups away), only the columns /address/search reads. Built by
// web/deploy/sql/mv_address_lookup.sql, refreshed by /usr/local/bin/refresh-lookups.sh.
let db_address_view_name = 'mv_address_lookup';"""
if s.count(OLD_CONST) != 1:
    sys.exit('db_search_view_name declaration not found — apply patch_search_use_mv.py first')
s = s.replace(OLD_CONST, NEW_CONST)

OLD_SQL = '''  let sql = `with t2 as (select address FROM "${db_propery_table_name}" WHERE ${filter_where_clause} (normalized_address = full_address_normalization('${address}') OR address ILIKE '%${address}%' OR full_address_normalization(address) ILIKE '%' || full_address_normalization('${address}') || '%') ORDER BY similarity(address, '${address}') DESC limit 50) select json_agg(t2.address) as "content" from t2;`;'''
NEW_SQL = '''  let sql = `with t2 as (select address FROM "${db_address_view_name}" WHERE ${filter_where_clause} (normalized_address = full_address_normalization('${address}') OR address ILIKE '%${address}%' OR full_address_normalization(address) ILIKE '%' || full_address_normalization('${address}') || '%') ORDER BY similarity(address, '${address}') DESC limit 50) select json_agg(t2.address) as "content" from t2;`;'''

if s.count(OLD_SQL) != 1:
    sys.exit(f"the /address/search statement was not found verbatim ({s.count(OLD_SQL)} matches)")
s = s.replace(OLD_SQL, NEW_SQL)

open(p, 'w').write(s)
print('patched: /address/search now reads mv_address_lookup')
