"""Complying-development filters: OR the flags, and fix the cdc_farmsta typo.

Same bug as the pattern books (see patch_pattern_books_or.py): each ticked CDC type pushed
its own clause onto where_clause_array, which is joined with AND, so ticking Dual Occupancy
and Secondary Dwellings asked for a lot eligible for both at once. The UI lists development
types to look for, so they group into one OR clause, still ANDed against the rest.

Also: the column list says `cdc_farmsta`. The column is `cdc_farmstay` — there is no
`cdc_farmsta` on any up_property_d_* table, so the Farmstay tickbox has never matched
anything (and never errored, because the loop only emits a clause for a column the client
sends, and a mismatched name simply never appears in the body).

Run on the API host (upapi / 45.79.118.32):

    scp web/deploy/api/patch_cdc_or_and_farmstay.py root@45.79.118.32:/tmp/
    ssh root@45.79.118.32
    cp /srv/users/upapi/apps/api/api.js /srv/users/upapi/apps/api/api.js.bak-$(date +%F)-pre-cdc-or
    python3 /tmp/patch_cdc_or_and_farmstay.py
    /srv/users/upapi/.nvm/versions/node/v20.9.0/bin/node --check /srv/users/upapi/apps/api/api.js
    su - upapi -c 'export PATH=/srv/users/upapi/.nvm/versions/node/v20.9.0/bin:$PATH; pm2 restart api'

The client sends `complying_development.cdc_farmsta`, so accept both spellings for now —
dropping the old key would silently break the tickbox until upapp is redeployed.
"""

import sys

p = '/srv/users/upapi/apps/api/api.js'
s = open(p).read()

OLD = """  complying_development_columns.forEach(column => {
    if (complying_development && complying_development.hasOwnProperty(column)) {
      if (complying_development[column]) {
        where_clause_array.push(`${column} is true`);
      }
    }
    // else {
    //   where_clause_array.push(`${column} is null`);
    // }
  });"""

NEW = """  // Any of the ticked development types, not all of them: ANDing two of them asks for a lot
  // eligible for both at once, which is almost never true. One grouped OR clause, still
  // ANDed against the rest of the search.
  //
  // 'cdc_farmsta' was a typo for the real column 'cdc_farmstay', so that tickbox never
  // matched anything. The client still sends the old key, so both are accepted until upapp
  // is redeployed; the clause always names the real column.
  const CDC_COLUMN_ALIASES = { cdc_farmsta: 'cdc_farmstay' };

  const complying_development_clauses = complying_development
    ? complying_development_columns
        .filter(column => complying_development[column])
        .map(column => `${CDC_COLUMN_ALIASES[column] || column} is true`)
    : [];

  if (complying_development_clauses.length === 1) {
    where_clause_array.push(complying_development_clauses[0]);
  }
  else if (complying_development_clauses.length > 1) {
    where_clause_array.push(`(${[...new Set(complying_development_clauses)].join(' or ')})`);
  }"""

if 'CDC_COLUMN_ALIASES' in s:
    sys.exit('already patched')
if s.count(OLD) != 1:
    sys.exit(f'complying_development block not found verbatim (matches: {s.count(OLD)}) — api.js drifted')
s = s.replace(OLD, NEW)

# Keep the real column in the list as well, so a client that sends the correct spelling
# (the fixed upapp, or the Planning Data API) is honoured too.
OLD_LIST = "'cdc_agritourism', 'cdc_farmsta']"
NEW_LIST = "'cdc_agritourism', 'cdc_farmsta', 'cdc_farmstay']"
if OLD_LIST not in s:
    sys.exit('complying_development_columns list not found verbatim — api.js drifted')
s = s.replace(OLD_LIST, NEW_LIST)

open(p, 'w').write(s)
print('patched: CDC flags now OR together, cdc_farmsta mapped to cdc_farmstay')
