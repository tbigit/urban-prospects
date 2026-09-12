"""GET /property/:id — run the six follow-up queries in parallel, drop the row dump.

The route fetched the property row, then ran contribution plans, DCPs, SEPP intersection,
LEPs, DA applications and the vg_data sold history one after another with sequential
`await`s, and `console.log`ged the full ~300-column row on every request (pm2 writes that
to disk each time). None of the six depend on each other — only on the row — so they now
go out together with `Promise.all`. The response shape is unchanged: each key still gets
the `json_agg` content (null when empty) and `sold_history` is still `[]` on no rows, no
address, or a vg_data error.

Run on the API host (upapi / 45.79.118.32; `node` is not on PATH non-interactively):

    scp web/deploy/api/patch_property_detail_parallel.py root@45.79.118.32:/tmp/
    ssh root@45.79.118.32
    cp /srv/users/upapi/apps/api/api.js /srv/users/upapi/apps/api/api.js.bak-$(date +%F)-pre-detail-parallel
    python3 /tmp/patch_property_detail_parallel.py
    /srv/users/upapi/.nvm/versions/node/v20.9.0/bin/node --check /srv/users/upapi/apps/api/api.js
    su - upapi -c 'pm2 restart api'

Measured 2026-09-12 (5 curls each; "before" is the dated backup run on a spare port):

                                     server-side, localhost   via https://upapi.imtg.com.au (Cloudflare)
    1645912 (house)          before  41-47 ms (one cold 244)   0.41-1.20 s
                             after   39-40 ms                   0.43-0.80 s
    63766041 (strata unit)   before  50-54 ms                   0.43-0.83 s
                             after   47-51 ms                   0.43-0.50 s

So the route was never the 1.3 s: the six follow-ups are sub-millisecond index lookups on a
0.5 ms LAN and parallelising them saves ~3 ms. The same request direct to the origin IP
from Sydney is 0.10 s; through the Cloudflare-proxied hostname it is 0.45-0.8 s, so the
proxy hop is where the time goes. Kept anyway: the row dump is gone from the pm2 log and
the route no longer serialises on the pool.
"""

import sys

p = '/srv/users/upapi/apps/api/api.js'
s = open(p).read()

OLD = """        let cp_sql = `select json_agg(row_to_json(t)) as "content" from (select lga_name,council_name,plan_name,plan_type,published_date,commenced_date,repealed_date,amendment,file_name from "ContributionPlan" where lga_name = ?) t;`;
        let lga_name = property[0].lga_name;
        await sequelize.database.query(cp_sql, { raw: true, replacements: [lga_name] }).then(cps => {
          property[0]['contribution_plan'] = cps[0][0].content;
        });

        let dcp_sql = `select json_agg(row_to_json(t)) as "content" from (select lga_name,council_name,plan_name,plan_type,published_date,commenced_date,repealed_date,amendment,file_name from "DevelopmentControlPlan" where lga_name = ?) t;`;
        await sequelize.database.query(dcp_sql, { raw: true, replacements: [lga_name] }).then(dcps => {
          property[0]['development_control_plan'] = dcps[0][0].content;
        });



        await sequelize.database.query(sepp_sql, { raw: true, replacements: property_replacement }).then(sepp => {
          property[0]['state_environmental_planning_policy'] = sepp[0][0].content;
        });

        let lep_sql = `select json_agg(row_to_json(t)) as "content" from (select distinct on (epi_name) epi_name, lga_name, published_date, link from "LEP" where lga_name = ?) t;`;
        await sequelize.database.query(lep_sql, { raw: true, replacements: [lga_name] }).then(leps => {
          property[0]['lep'] = leps[0][0].content;
        });

        let da_sql = `select json_agg(row_to_json(t)) as "content" from (select planlabel, lotnumber, planning_portal_app_number, council_name, status, type_of_development, application_type from "da_applications_lot" where full_address = ?) t;`;


        let da_address = property[0].address + ' ' + property[0].postcode;
        console.log(property[0]);
        await sequelize.database.query(da_sql, { raw: true, replacements: [da_address] }).then(das => {
          property[0]['das'] = das[0][0].content;
        });

        // Add vg_data sold history
        if (property[0].address) {
          const addresses_str = `'${property[0].address.replace(/'/g, "''")}'`;

          const vg_sql = `
            SELECT
              property_legal_description,
              property_unit_number,
              property_house_number,
              property_street_name,
              property_locality,
              property_post_code,
              contract_date,
              settlement_date,
              purchase_price,
              nature_of_property,
              primary_purpose,
              strata_lot_number
            FROM vg_data
            WHERE normalized_address IN (
              SELECT full_address_normalization(a)
              FROM unnest(ARRAY[${addresses_str}]) a
            )
            ORDER BY contract_date DESC;`;



          try {
            const vg_results = await sequelize.database.query(vg_sql, { raw: true });
            if (vg_results && vg_results[0] && vg_results[0].length > 0) {
              property[0]['sold_history'] = vg_results[0];
            } else {
              property[0]['sold_history'] = [];
            }
          } catch (err) {
            console.error('Error fetching vg_data sold history:', err);
            property[0]['sold_history'] = [];
          }
        } else {
          property[0]['sold_history'] = [];
        }

        return res.send(property);
"""

NEW = """        // The six follow-ups depend only on the row, not on each other: issue them together
        // (Sequelize pool max 20) instead of awaiting one after another.
        let lga_name = property[0].lga_name;
        let cp_sql = `select json_agg(row_to_json(t)) as "content" from (select lga_name,council_name,plan_name,plan_type,published_date,commenced_date,repealed_date,amendment,file_name from "ContributionPlan" where lga_name = ?) t;`;
        let dcp_sql = `select json_agg(row_to_json(t)) as "content" from (select lga_name,council_name,plan_name,plan_type,published_date,commenced_date,repealed_date,amendment,file_name from "DevelopmentControlPlan" where lga_name = ?) t;`;
        let lep_sql = `select json_agg(row_to_json(t)) as "content" from (select distinct on (epi_name) epi_name, lga_name, published_date, link from "LEP" where lga_name = ?) t;`;
        let da_sql = `select json_agg(row_to_json(t)) as "content" from (select planlabel, lotnumber, planning_portal_app_number, council_name, status, type_of_development, application_type from "da_applications_lot" where full_address = ?) t;`;
        let da_address = property[0].address + ' ' + property[0].postcode;

        const content_of = r => r[0][0].content;

        // vg_data sold history: [] on no address, no rows, or error (never fails the request)
        let vg_promise = Promise.resolve([]);
        if (property[0].address) {
          const addresses_str = `'${property[0].address.replace(/'/g, "''")}'`;

          const vg_sql = `
            SELECT
              property_legal_description,
              property_unit_number,
              property_house_number,
              property_street_name,
              property_locality,
              property_post_code,
              contract_date,
              settlement_date,
              purchase_price,
              nature_of_property,
              primary_purpose,
              strata_lot_number
            FROM vg_data
            WHERE normalized_address IN (
              SELECT full_address_normalization(a)
              FROM unnest(ARRAY[${addresses_str}]) a
            )
            ORDER BY contract_date DESC;`;

          vg_promise = sequelize.database.query(vg_sql, { raw: true })
            .then(vg_results => (vg_results && vg_results[0] && vg_results[0].length > 0) ? vg_results[0] : [])
            .catch(err => {
              console.error('Error fetching vg_data sold history:', err);
              return [];
            });
        }

        const [cps, dcps, sepp, leps, das, sold_history] = await Promise.all([
          sequelize.database.query(cp_sql, { raw: true, replacements: [lga_name] }).then(content_of),
          sequelize.database.query(dcp_sql, { raw: true, replacements: [lga_name] }).then(content_of),
          sequelize.database.query(sepp_sql, { raw: true, replacements: property_replacement }).then(content_of),
          sequelize.database.query(lep_sql, { raw: true, replacements: [lga_name] }).then(content_of),
          sequelize.database.query(da_sql, { raw: true, replacements: [da_address] }).then(content_of),
          vg_promise,
        ]);

        property[0]['contribution_plan'] = cps;
        property[0]['development_control_plan'] = dcps;
        property[0]['state_environmental_planning_policy'] = sepp;
        property[0]['lep'] = leps;
        property[0]['das'] = das;
        property[0]['sold_history'] = sold_history;

        return res.send(property);
"""

if 'const [cps, dcps, sepp, leps, das, sold_history] = await Promise.all([' in s:
    sys.exit('already patched')
if s.count(OLD) != 1:
    sys.exit(f'/property/:id follow-up block not found verbatim (matches: {s.count(OLD)}) — api.js drifted')

open(p, 'w').write(s.replace(OLD, NEW))
print('patched: /property/:id follow-up queries run in parallel, row dump removed')
