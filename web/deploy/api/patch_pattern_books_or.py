"""Pattern-book filters: OR the flags instead of ANDing them.

Each ticked pattern book pushed its own clause onto where_clause_array, and that array is
joined with AND — so ticking Semis 01 and Terraces 01 asked for a property eligible for
*both* designs at once, which is almost never true. The UI presents them as a list of
designs to look for, so the honest reading is "eligible for any of these": one grouped
OR clause, still ANDed against the rest of the search.

Run on the API host (upapi / 45.79.118.32):

    scp web/deploy/api/patch_pattern_books_or.py root@45.79.118.32:/tmp/
    ssh root@45.79.118.32
    cp /srv/users/upapi/apps/api/api.js /srv/users/upapi/apps/api/api.js.bak-$(date +%F)-pre-pb-or
    python3 /tmp/patch_pattern_books_or.py
    node --check /srv/users/upapi/apps/api/api.js && pm2 restart api

Note: `complying_development_columns` a few lines above has the same AND semantics and
almost certainly the same bug. Left alone deliberately — changing it is a separate call.
"""

import sys

p = '/srv/users/upapi/apps/api/api.js'
s = open(p).read()

OLD = """  pattern_books_columns.forEach(column => {
    if (pattern_books && pattern_books.hasOwnProperty(column)) {
      if (pattern_books[column]) {
        where_clause_array.push(`${column} is true`);
      }
    }
  });"""

NEW = """  // Any of the ticked designs, not all of them: the flags are per-design eligibility, so
  // ANDing two of them asks for a lot that suits both at once — effectively never true.
  // One grouped OR clause, still ANDed against the rest of the search.
  const pattern_books_clauses = pattern_books
    ? pattern_books_columns.filter(column => pattern_books[column]).map(column => `${column} is true`)
    : [];

  if (pattern_books_clauses.length === 1) {
    where_clause_array.push(pattern_books_clauses[0]);
  }
  else if (pattern_books_clauses.length > 1) {
    where_clause_array.push(`(${pattern_books_clauses.join(' or ')})`);
  }"""

if NEW.splitlines()[0].strip() in s:
    sys.exit('already patched')
if s.count(OLD) != 1:
    sys.exit(f'pattern_books block not found verbatim (matches: {s.count(OLD)}) — api.js drifted')

open(p, 'w').write(s.replace(OLD, NEW))
print('patched: pattern-book flags now OR together')
