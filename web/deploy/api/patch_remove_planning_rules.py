"""Drop the planning-rules lookup (`rule_ids` -> up_planning_code_full) from GET /property/<id>.

`up_property_d_4` does not carry `rule_ids`, and the panel only ever covered 27,101 of
5.39M properties across 8 LEPs. The app's PLANNING RULES panel was removed on the same day
(Property.svelte), so the API no longer needs the column and the d_4 cutover stops
treating its absence as a blocker.

Run on the API host (upapi / 45.79.118.32):

    scp web/deploy/api/patch_remove_planning_rules.py root@45.79.118.32:/tmp/
    ssh root@45.79.118.32
    cp /srv/users/upapi/apps/api/api.js /srv/users/upapi/apps/api/api.js.bak-$(date +%F)-pre-rules
    python3 /tmp/patch_remove_planning_rules.py
    node --check /srv/users/upapi/apps/api/api.js && pm2 restart api
"""

import sys

p = sys.argv[1] if len(sys.argv) > 1 else '/srv/users/upapi/apps/api/api.js'
s = open(p).read()

START = "        // Planning rules: up_property_d_3.rule_ids (text[]) -> up_planning_code_full.rule_id\n"
END = "          property[0]['planning_rules'] = [];\n        }\n\n"

if START not in s:
    print('already patched (no planning-rules block)')
    sys.exit(0)
a = s.index(START)
e = s.index(END, a) + len(END)
s = s[:a] + s[e:]
open(p, 'w').write(s)
print('removed planning-rules block, %d chars' % (e - a))
