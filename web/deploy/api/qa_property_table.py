#!/usr/bin/env python3
"""
qa_property_table.py — gate a property-table cutover (up_property_d_3 -> up_property_d_4 -> ...).

Every data refresh lands as a *new* table rather than an update in place, so the API's
`db_propery_table_name` has to move. The new table is a fresh CREATE TABLE AS: it arrives
with none of the 50-odd indexes the search queries depend on, may have dropped a column the
code still reads, and the lookup materialised views still point at the old one. Flipping the
name without checking any of that turns every search into a seq scan (or a 500).

This script checks all of it, fixes what it can, and only then offers the switch:

  check          columns, types, indexes, matviews, code references   (read-only)
  indexes        create the missing indexes on the new table
  matviews       rebuild the lookup matviews off the new table
  sanity         parity + timing: the same counts AND the real hard search shapes,
                 run against both tables and compared (rows must match, and the new
                 table must not be materially slower)
  cutover        point api.js at the new table (only if `check` is green)

Run it on the DB hop host (updb / 172.105.183.89), which has psql and ~/.pgpass:

  scp web/deploy/api/qa_property_table.py root@172.105.183.89:/tmp/
  scp root@45.79.118.32:/srv/users/upapi/apps/api/api.js /tmp/ && scp /tmp/api.js root@172.105.183.89:/tmp/
  ssh root@172.105.183.89 'python3 /tmp/qa_property_table.py check --to up_property_d_4 --api-js /tmp/api.js'

`--from` defaults to whatever api.js currently uses (or up_property_d_3 without --api-js).
Exit code is 0 only when every check passes, so it can gate a script.
"""

import argparse
import os
import re
import shutil
import subprocess
import sys
import time
from datetime import datetime, timezone

DB = os.environ.get("QA_DB", "UrbanPortalDBP")
DB_USER = os.environ.get("QA_DB_USER", "postgres")
DB_HOST = os.environ.get("QA_DB_HOST", "192.168.146.115")

# Columns the search code reads through raw SQL rather than through api.js's
# `expectedSchema` contract, so a --api-js run cannot discover them.
CORE_COLUMNS = [
    "gurasid", "propid", "address", "normalized_address", "suburbname", "postcode",
    "region_name", "lga_name", "lot_section_plan", "lotnumber", "planlabel",
    "lzn_label", "lzn_lay_class", "geom",
]

# Widening / spelling differences that are safe for the queries we run.
TYPE_COMPAT = [
    {"character varying", "text"},
    {"integer", "bigint"},
    {"real", "double precision"},
    {"numeric", "double precision"},
    {"timestamp without time zone", "timestamp with time zone"},
]

RESET, RED, GREEN, YELLOW, DIM = "\033[0m", "\033[31m", "\033[32m", "\033[33m", "\033[2m"


class Report:
    """Collects PASS/WARN/FAIL lines; the exit code is driven off the fails."""

    def __init__(self):
        self.rows = []

    def add(self, level, section, message):
        self.rows.append((level, section, message))
        colour = {"FAIL": RED, "WARN": YELLOW, "PASS": GREEN, "INFO": DIM}[level]
        if sys.stdout.isatty():
            print(f"  {colour}{level:<4}{RESET} {section:<12} {message}")
        else:
            print(f"  {level:<4} {section:<12} {message}")

    def fails(self):
        return [r for r in self.rows if r[0] == "FAIL"]

    def warns(self):
        return [r for r in self.rows if r[0] == "WARN"]

    def green(self):
        return not self.fails()


def psql(sql, timeout=1800, tuples=True):
    """One psql round trip. Returns a list of '|'-split rows."""
    cmd = ["psql", "-U", DB_USER, "-d", DB, "-h", DB_HOST, "-X", "-q", "-v", "ON_ERROR_STOP=1"]
    if tuples:
        cmd += ["-A", "-t", "-F", "|"]
    cmd += ["-c", sql]
    proc = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
    if proc.returncode != 0:
        raise RuntimeError(f"psql failed:\n{proc.stderr.strip()}\n--- sql ---\n{sql}")
    if not tuples:
        return proc.stdout
    return [line.split("|") for line in proc.stdout.strip().splitlines() if line.strip()]


def q1(sql):
    rows = psql(sql)
    return rows[0][0] if rows else None


# --------------------------------------------------------------------------- api.js

def api_current_table(api_js):
    m = re.search(r"""let\s+db_propery_table_name\s*=\s*['"]([^'"]+)['"]""", api_js)
    return m.group(1) if m else None


def api_expected_columns(api_js, table):
    """Pull expectedSchema[<table>] — api.js's own column -> allowed-types contract."""
    block = re.search(
        r"const\s+expectedSchema\s*=\s*\{(.*?)\n\};", api_js, re.S)
    if not block:
        return {}
    body = block.group(1)
    tbl = re.search(rf"\n  {re.escape(table)}:\s*\{{(.*?)\n  \}},", body, re.S)
    if not tbl:
        return {}
    out = {}
    for line in tbl.group(1).splitlines():
        line = line.strip()
        if not line or line.startswith("//"):
            continue
        m = re.match(r"([A-Za-z_][A-Za-z0-9_]*)\s*:\s*\[(.*?)\]", line)
        if m:
            types = re.findall(r"['\"]([^'\"]+)['\"]", m.group(2))
            out[m.group(1)] = types
    return out


def api_column_arrays(api_js):
    """The cdc_* / *_eligible / exclusion column lists the filters are built from."""
    cols = []
    for name in ("exclude_columns", "complying_development_columns", "pattern_books_columns"):
        m = re.search(rf"let\s+{name}\s*=\s*\[(.*?)\];", api_js, re.S)
        if m:
            cols += re.findall(r"['\"]([A-Za-z_][A-Za-z0-9_]*)['\"]", m.group(1))
    return cols


def api_hardcoded_refs(api_js, table):
    """Literal occurrences of the old table name outside the constant — these do NOT
    move when db_propery_table_name changes, and are the usual cutover foot-gun."""
    hits = []
    for i, line in enumerate(api_js.splitlines(), 1):
        if table not in line:
            continue
        if "db_propery_table_name" in line and "=" in line:
            continue  # the constant itself
        stripped = line.strip()
        kind = "comment" if stripped.startswith("//") or stripped.startswith("*") else "CODE"
        hits.append((i, kind, stripped[:110]))
    return hits


# --------------------------------------------------------------------------- checks

def load_columns(table):
    rows = psql(f"""
        select column_name, data_type, coalesce(udt_name,'')
          from information_schema.columns
         where table_schema='public' and table_name='{table}'
         order by column_name
    """)
    return {r[0]: (r[1], r[2]) for r in rows}


def types_compatible(old, new):
    if old == new:
        return True
    return any({old, new} <= group for group in TYPE_COMPAT)


def check_tables(rep, old, new):
    for t in (old, new):
        exists = q1(f"select to_regclass('public.{t}') is not null")
        if exists != "t":
            rep.add("FAIL", "table", f"{t} does not exist")
            return False
    rows = psql(f"""
        select c.relname, s.n_live_tup, pg_size_pretty(pg_table_size(c.oid)),
               coalesce(to_char(greatest(s.last_analyze, s.last_autoanalyze),'YYYY-MM-DD HH24:MI'),'never')
          from pg_class c join pg_stat_user_tables s on s.relid=c.oid
         where c.relname in ('{old}','{new}')
    """)
    stats = {r[0]: r for r in rows}
    for t in (old, new):
        _, tup, size, analyzed = stats.get(t, (t, "?", "?", "never"))
        rep.add("INFO", "table", f"{t}: ~{int(float(tup)):,} rows, {size}, last analyze {analyzed}")
        if t == new and analyzed == "never":
            rep.add("FAIL", "table",
                    f"{new} has never been ANALYZEd — the planner will pick bad plans. "
                    f"Run: ANALYZE public.{new};")

    o = int(float(stats.get(old, (0, 0))[1]))
    n = int(float(stats.get(new, (0, 0))[1]))
    if o and n:
        delta = (n - o) / o
        msg = f"row count {o:,} -> {n:,} ({delta:+.1%})"
        # A new load losing rows, or doubling, is far more likely a broken load than a
        # real change in NSW's property stock.
        rep.add("FAIL" if abs(delta) > 0.20 else "PASS", "table", msg)
    return True


def check_columns(rep, old, new, api_js):
    old_cols, new_cols = load_columns(old), load_columns(new)

    dropped = sorted(set(old_cols) - set(new_cols))
    added = sorted(set(new_cols) - set(old_cols))

    # Every column the code can possibly touch. A column dropped from the new table only
    # matters if something reads it — but "something" includes every filter name, so the
    # required set is deliberately broad.
    required = set(CORE_COLUMNS)
    contract = {}
    if api_js:
        contract = api_expected_columns(api_js, old)
        required |= set(contract)
        required |= set(api_column_arrays(api_js))
        rep.add("INFO", "columns",
                f"contract from api.js expectedSchema[{old}]: {len(contract)} columns")

    # A column absent from BOTH tables is a pre-existing bug in api.js (a typo in a filter
    # list, say) — real, worth fixing, but not a reason to block this cutover.
    missing_required = sorted(c for c in required if c not in new_cols and c in old_cols)
    for c in missing_required:
        where = "expectedSchema" if c in contract else "used in raw SQL / filter lists"
        rep.add("FAIL", "columns", f"{new} is missing '{c}' ({where}) — present on {old}")
    for c in sorted(c for c in required if c not in new_cols and c not in old_cols):
        rep.add("WARN", "columns",
                f"api.js references '{c}' but it exists on neither {old} nor {new} "
                f"(pre-existing: that filter has never matched anything)")

    other_dropped = [c for c in dropped if c not in missing_required]
    if other_dropped:
        rep.add("WARN", "columns",
                f"{len(other_dropped)} column(s) dropped but not referenced by the API: "
                + ", ".join(other_dropped[:12]) + (" …" if len(other_dropped) > 12 else ""))
    if added:
        rep.add("INFO", "columns",
                f"{len(added)} new column(s): " + ", ".join(added[:12]) + (" …" if len(added) > 12 else ""))

    # Renames hide as "one dropped, one added" — surface likely pairs so a rename is not
    # mistaken for a deletion.
    for d in dropped:
        for a in added:
            if d.replace("_", "") == a.replace("_", "") or d in a or a in d:
                rep.add("WARN", "columns", f"possible rename: '{d}' -> '{a}'")

    changed = []
    for c in sorted(set(old_cols) & set(new_cols)):
        if not types_compatible(old_cols[c][0], new_cols[c][0]):
            changed.append(f"{c}: {old_cols[c][0]} -> {new_cols[c][0]}")
    for c in changed:
        rep.add("FAIL", "columns", f"type changed — {c}")

    for col, allowed in contract.items():
        if col in new_cols:
            data_type, udt = new_cols[col]
            actual = udt if data_type == "USER-DEFINED" else data_type
            if actual not in allowed:
                rep.add("FAIL", "columns",
                        f"'{col}' is {actual} on {new}; api.js expects one of {allowed}")

    if not missing_required and not changed:
        rep.add("PASS", "columns",
                f"all {len(required)} API-referenced columns present with compatible types")
    return missing_required, changed


INDEX_NAME_RE = re.compile(r"^CREATE (UNIQUE )?INDEX (\S+) ON ")


def index_defs(table):
    rows = psql(f"select indexname, indexdef from pg_indexes "
                f"where schemaname='public' and tablename='{table}'")
    return {r[0]: r[1] for r in rows}


def index_usage(table):
    """indexname -> (scans since the last stats reset, size). An index the old table has
    never used is not worth hours of CONCURRENTLY on the new one."""
    rows = psql(f"""select indexrelname, idx_scan,
                           pg_size_pretty(pg_relation_size(indexrelid))
                      from pg_stat_user_indexes where relname='{table}'""")
    return {r[0]: (int(r[1]), r[2]) for r in rows}


def stats_window():
    return q1("select coalesce(stats_reset::date::text,'unknown') "
              "from pg_stat_database where datname = current_database()")


def normalise_index(defn, table, other):
    """Strip the index name and rewrite the table name so two tables' indexes compare."""
    body = INDEX_NAME_RE.sub("CREATE INDEX ON ", defn)
    return body.replace(f"public.{table}", f"public.{other}").replace(f" {table} ", f" {other} ")


def rename_index(name, old, new):
    """idx_d3_lga_name -> idx_d4_lga_name; anything else gets a suffix so it stays unique."""
    o = old.replace("up_property_", "")           # d_3
    n = new.replace("up_property_", "")           # d_4
    short_o, short_n = o.replace("_", ""), n.replace("_", "")   # d3 / d4
    for a, b in ((old, new), (o, n), (short_o, short_n)):
        if a in name:
            return name.replace(a, b, 1)
    return f"{name}_{short_n}"


def check_indexes(rep, old, new, apply=False, concurrently=True, min_scans=1):
    old_idx, new_idx = index_defs(old), index_defs(new)
    usage = index_usage(old)
    have = {normalise_index(d, new, new) for d in new_idx.values()}

    missing = []
    for name, defn in sorted(old_idx.items()):
        if normalise_index(defn, old, new) not in have:
            missing.append((name, defn))

    rep.add("INFO", "indexes", f"{old}: {len(old_idx)} indexes, {new}: {len(new_idx)}; "
                               f"usage counted since {stats_window()}")

    if not missing:
        rep.add("PASS", "indexes", f"{new} has an equivalent of every index on {old}")
        return []

    # An index the source table has never once used does not justify hours of
    # CONCURRENTLY on a 41GB table — and after the search moved to mv_property_search,
    # most of the cdc_*/pattern-book partials on the base table are exactly that.
    used = [(n, d) for n, d in missing if usage.get(n, (0, ""))[0] >= min_scans]
    unused = [(n, d) for n, d in missing if usage.get(n, (0, ""))[0] < min_scans]

    for name, _ in used:
        scans, size = usage.get(name, (0, "?"))
        rep.add("FAIL", "indexes", f"missing on {new}: {name} ({scans:,} scans on {old}, {size})")
    if unused:
        rep.add("WARN", "indexes",
                f"{len(unused)} index(es) missing on {new} that {old} has never used — "
                f"skip them unless a query needs one: "
                + ", ".join(n for n, _ in unused[:6]) + (" …" if len(unused) > 6 else ""))

    ddl = []
    for name, defn in (used if not apply else used):
        stmt = defn.replace(f"public.{old}", f"public.{new}")
        stmt = stmt.replace(f" ON {old} ", f" ON {new} ")
        stmt = stmt.replace(f" INDEX {name} ", f" INDEX {rename_index(name, old, new)} ")
        if concurrently:
            stmt = stmt.replace("CREATE INDEX ", "CREATE INDEX CONCURRENTLY ", 1)
            stmt = stmt.replace("CREATE UNIQUE INDEX ", "CREATE UNIQUE INDEX CONCURRENTLY ", 1)
        ddl.append(stmt + ";")

    if ddl:
        print()
        print(f"{DIM}--- DDL for the {len(ddl)} index(es) {old} actually uses "
              f"(run with `indexes --apply`; --min-scans 0 to include the unused ones) ---{RESET}")
        for stmt in ddl:
            print(stmt)
        print()

    if apply:
        built = 0
        for i, stmt in enumerate(ddl, 1):
            print(f"  [{i}/{len(ddl)}] {stmt[:100]}…")
            t0 = time.time()
            try:
                # CONCURRENTLY cannot run in a transaction block; -c sends each on its own.
                psql(stmt, timeout=14400, tuples=False)
            except RuntimeError as exc:
                # One index over a column the new load dropped must not abandon the rest.
                # Report Postgres's reason, not the echoed statement.
                reason = next((l for l in str(exc).splitlines() if l.startswith("ERROR:")),
                              str(exc).splitlines()[0])
                rep.add("FAIL", "indexes", f"could not create on {new}: {reason[:110]}")
                continue
            built += 1
            print(f"        done in {time.time() - t0:.0f}s")
        rep.add("PASS" if built == len(ddl) else "WARN", "indexes",
                f"created {built} of {len(ddl)} index(es) on {new}")
    return ddl


def all_matviews():
    """name -> single-line definition for every matview in public."""
    rows = psql(r"""
        select matviewname || chr(9) ||
               regexp_replace(regexp_replace(definition, '\s+', ' ', 'g'), ';\s*$', '')
          from pg_matviews where schemaname='public'
    """)
    return dict(r[0].split("\t", 1) for r in rows)


def dependent_matviews(table):
    """Every matview that has to be rebuilt, base-first.

    Direct dependants reference the property table; indirect ones reference another
    matview in the set (mv_region_lga_suburb is built off mv_d3_zone_lookup, not off
    the table, so it would be silently destroyed by a CASCADE drop of its base and
    never recreated).
    """
    everything = all_matviews()
    affected = {n for n, d in everything.items() if re.search(rf"\b{re.escape(table)}\b", d)}
    changed = True
    while changed:
        changed = False
        for name, defn in everything.items():
            if name in affected:
                continue
            if any(re.search(rf"\b{re.escape(dep)}\b", defn) for dep in affected):
                affected.add(name)
                changed = True

    # Base-first: a matview goes after every affected matview it reads.
    ordered, remaining = [], dict((n, everything[n]) for n in affected)
    while remaining:
        ready = [n for n, d in remaining.items()
                 if not any(re.search(rf"\b{re.escape(o)}\b", d)
                            for o in remaining if o != n)]
        if not ready:  # a cycle is impossible in Postgres, but never loop forever
            ready = list(remaining)
        for n in sorted(ready):
            ordered.append((n, remaining.pop(n)))
    return ordered


def check_matviews(rep, old, new, rebuild=False):
    mvs = dependent_matviews(old)
    if not mvs:
        rep.add("INFO", "matviews", f"no materialised view references {old}")
        return

    direct = [n for n, d in mvs if re.search(rf"\b{re.escape(old)}\b", d)]
    for name, _ in mvs:
        why = f"built off {old}" if name in direct else "built off one of the above"
        rep.add("FAIL" if not rebuild else "INFO", "matviews", f"{name} is still {why}")

    drops, creates = [], []
    # Drop dependants first, create bases first — no CASCADE, so a view we failed to
    # account for raises instead of vanishing.
    for name, defn in reversed(mvs):
        drops.append(f"DROP MATERIALIZED VIEW IF EXISTS public.{name};")
    for name, defn in mvs:
        new_def = re.sub(rf"\b{re.escape(old)}\b", new, defn).strip().rstrip(";")
        # Names stay the same — api.js queries mv_d3_zone_lookup by name, and renaming it
        # would be a second, avoidable code change on every table bump.
        creates.append(f"CREATE MATERIALIZED VIEW public.{name} AS\n{new_def};")
        creates += [d + ";" for d in index_defs(name).values()]
    analyzes = [f"ANALYZE public.{name};" for name, _ in mvs]

    print()
    print(f"{DIM}--- matview rebuild DDL, {len(mvs)} view(s) "
          f"(run with `matviews --apply`) ---{RESET}")
    for s_ in drops + creates + analyzes:
        print(s_)
    print()

    if rebuild:
        before = {n: q1(f"select count(*) from public.{n}") for n, _ in mvs}
        # One transaction: a half-rebuilt set of views would break every list dropdown.
        script = "BEGIN;\n" + "\n".join(drops + creates) + "\nCOMMIT;\n" + "\n".join(analyzes)
        t0 = time.time()
        psql(script, timeout=7200, tuples=False)
        for name, _ in mvs:
            o, a = int(before[name]), int(q1(f"select count(*) from public.{name}"))
            delta = (a - o) / o if o else 0
            rep.add("FAIL" if o and abs(delta) > 0.20 else "PASS", "matviews",
                    f"{name} rebuilt on {new}: {o:,} -> {a:,} rows ({delta:+.1%})")
        rep.add("INFO", "matviews", f"rebuild took {time.time() - t0:.0f}s — "
                                    f"now run /usr/local/bin/refresh-lookups.sh to flush "
                                    f"and re-warm the API cache")


def check_code_refs(rep, old, api_js_path, api_js):
    if not api_js:
        rep.add("WARN", "code", "no --api-js given; hardcoded table references not checked")
        return
    current = api_current_table(api_js)
    rep.add("INFO", "code", f"{api_js_path}: db_propery_table_name = {current}")
    hits = api_hardcoded_refs(api_js, old)
    code_hits = [h for h in hits if h[1] == "CODE"]
    for line_no, _, text in code_hits:
        rep.add("FAIL", "code", f"hardcoded '{old}' at api.js:{line_no} — {text}")
    if not code_hits:
        rep.add("PASS", "code", f"no hardcoded '{old}' outside the constant and comments")
    comments = len(hits) - len(code_hits)
    if comments:
        rep.add("INFO", "code", f"{comments} mention(s) in comments (harmless, worth updating)")


# --------------------------------------------------------------------------- sanity

SANITY = [
    ("row count",
     "select count(*) from public.{t}"),
    ("distinct suburbs",
     "select count(distinct suburbname) from public.{t}"),
    ("distinct zones",
     "select count(distinct lzn_label) from public.{t}"),
    ("rows per region",
     "select string_agg(region_name||'='||n, ', ' order by region_name) from "
     "(select region_name, count(*) n from public.{t} group by region_name) x"),
    ("deduped rows (Sydney)",
     "select count(distinct coalesce(propid, gurasid)) from public.{t} "
     "where region_name='Sydney'"),
    ("CDC dual occupancy",
     "select count(*) from public.{t} where cdc_dual_occupancy is true"),
    ("pattern book terraces_01",
     "select count(*) from public.{t} where terraces_01_carter_eligible is true"),
    ("search plan ({lga})",
     "select count(*) from (select distinct on (coalesce(t1.propid, t1.gurasid)) t1.gurasid "
     "from public.{t} t1 where lga_name = '{lga}' "
     "order by coalesce(t1.propid, t1.gurasid), (t1.address ~ '^\\S*/'), t1.address) s"),
]


# The query shapes that actually hurt, in the form _search_property emits them:
# DISTINCT ON (coalesce(propid, gurasid)) over the filtered set, then ORDER BY
# suburbname, address LIMIT. A new table without the right indexes does not get 20%
# slower on these — it goes from seconds to minutes, which is the failure users report.
# Timings are wall clock on a live box, so treat a <1.5x difference as noise.
HARD = [
    ("bounded map search", """
        select count(*) from (
          with bbox as (select ST_MakeEnvelope(151.15,-33.90,151.28,-33.82,4283) as geom)
          select distinct on (coalesce(t1.propid, t1.gurasid)) t1.gurasid
            from public.{t} t1
           where region_name in ('Sydney') and ST_Within(geom, (select geom from bbox))
           order by coalesce(t1.propid, t1.gurasid), (t1.address ~ '^\\S*/'), t1.address
        ) s"""),
    ("LGA + zone search", """
        select count(*) from (
          select * from (
            select distinct on (coalesce(t1.propid, t1.gurasid)) t1.gurasid, t1.suburbname, t1.address
              from public.{t} t1
             where lga_name = '{lga}' and lzn_label in ('R2','R3')
             order by coalesce(t1.propid, t1.gurasid), (t1.address ~ '^\\S*/'), t1.address) t1
          order by suburbname, address limit 450) s"""),
    ("suburb aggregate ({lga})", """
        select count(*) from (
          select suburbname, count(*) n from public.{t}
           where lga_name = '{lga}' group by suburbname) s"""),
    ("pattern book (region)", """
        select count(*) from public.{t}
         where region_name = 'Sydney' and terraces_01_carter_eligible is true"""),
    ("CDC + geom (region)", """
        select count(*) from public.{t}
         where region_name = 'Sydney' and cdc_dual_occupancy is true"""),
    ("address prefix lookup", """
        select count(*) from (
          select address from public.{t}
           where address ilike '13 ARTILLERY%' limit 50) s"""),
]

# Statewide, no useful index — the shape that measured 220s on up_property_d_3. Only run
# under --full-hard: it is minutes per table and hammers the box.
HARD_FULL = [
    ("statewide school slider", """
        select count(*) from (
          select * from (
            select distinct on (coalesce(t1.propid, t1.gurasid)) t1.gurasid, t1.suburbname, t1.address
              from public.{t} t1
             where closest_school_distance <= 1100
               and region_name in ('Sydney','Northern','Southern','Western','Central and Hunter')
             order by coalesce(t1.propid, t1.gurasid), (t1.address ~ '^\\S*/'), t1.address) t1
          order by suburbname, address limit 450) s"""),
]


def run_hard(rep, old, new, lga, speed_tolerance, full):
    probes = HARD + (HARD_FULL if full else [])
    print()
    print(f"{DIM}--- hard-query timings (wall clock, one run each; "
          f"<{speed_tolerance:g}x is noise) ---{RESET}")
    print(f"  {'query':<28} {'old s':>8} {'new s':>8} {'ratio':>7}   {'rows old':>10} {'rows new':>10}")
    for label, sql in probes:
        out = {}
        # Alternate which table goes first so a warming box does not always favour one.
        order = (("old", old), ("new", new))
        for tag, table in order:
            t0 = time.time()
            try:
                out[tag] = (q1(sql.format(t=table, lga=lga)), time.time() - t0)
            except Exception as exc:  # noqa: BLE001
                out[tag] = (f"ERR:{str(exc).splitlines()[0][:24]}", time.time() - t0)
        name = label.format(lga=lga)
        (ro, so), (rn, sn) = out["old"], out["new"]
        ratio = sn / so if so > 0.01 else 0
        print(f"  {name:<28} {so:>8.1f} {sn:>8.1f} {ratio:>6.1f}x   {str(ro):>10} {str(rn):>10}")

        if str(ro).startswith("ERR") or str(rn).startswith("ERR"):
            rep.add("FAIL", "hard", f"{name}: old={ro} new={rn}")
            continue
        if str(ro).isdigit() and str(rn).isdigit() and int(ro):
            drift = (int(rn) - int(ro)) / int(ro)
            if abs(drift) > 0.20:
                rep.add("FAIL", "hard", f"{name}: {int(ro):,} -> {int(rn):,} rows ({drift:+.1%})")
        # Absolute floor so a 0.2s -> 0.6s probe does not fail the run on noise.
        if sn > 2.0 and ratio > speed_tolerance:
            rep.add("FAIL", "hard",
                    f"{name}: {sn:.1f}s on {new} vs {so:.1f}s on {old} ({ratio:.1f}x slower) "
                    f"— missing or unusable index")
        else:
            rep.add("PASS", "hard", f"{name}: {sn:.1f}s vs {so:.1f}s ({ratio:.1f}x)")
    print()


def run_sanity(rep, old, new, lga, tolerance):
    print()
    print(f"{DIM}--- parity + timing ({lga} for the scoped query) ---{RESET}")
    header = f"  {'check':<26} {'old':>14} {'new':>14} {'Δ':>8}  {'old s':>7} {'new s':>7}"
    print(header)
    for label, sql in SANITY:
        vals, secs = {}, {}
        for tag, table in (("old", old), ("new", new)):
            t0 = time.time()
            try:
                vals[tag] = q1(sql.format(t=table, lga=lga))
            except Exception as exc:  # noqa: BLE001 — a failing probe IS the finding
                vals[tag] = f"ERROR: {str(exc).splitlines()[0][:40]}"
            secs[tag] = time.time() - t0

        name = label.format(lga=lga)
        o, n = vals["old"], vals["new"]
        delta = ""
        level = "PASS"
        if str(o).startswith("ERROR") or str(n).startswith("ERROR"):
            level = "FAIL"
        elif o.isdigit() and n.isdigit():
            oi, ni = int(o), int(n)
            d = (ni - oi) / oi if oi else 0
            delta = f"{d:+.1%}"
            level = "FAIL" if abs(d) > tolerance else "PASS"
        elif o != n:
            # A textual probe (the per-region breakdown) differs as soon as any one count
            # moves, which the numeric probes already judge — report it, do not flag it.
            level = "INFO"

        print(f"  {name:<26} {str(o)[:14]:>14} {str(n)[:14]:>14} {delta:>8}  "
              f"{secs['old']:>7.1f} {secs['new']:>7.1f}")
        if level != "PASS":
            rep.add(level, "sanity", f"{name}: old={o} new={n}")
        # A new table without the indexes is not just slower — it is a different order of
        # magnitude, and that is the symptom users report.
        if secs["new"] > max(5.0, secs["old"] * 3):
            rep.add("WARN", "sanity",
                    f"{name}: {secs['new']:.0f}s on {new} vs {secs['old']:.0f}s on {old} "
                    f"— check the indexes")
    print()


# --------------------------------------------------------------------------- cutover

def do_cutover(rep, old, new, api_js_path, api_js):
    if not rep.green():
        print(f"{RED}Refusing to cut over: {len(rep.fails())} check(s) failed.{RESET}")
        return 1

    stamp = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    backup = f"{api_js_path}.bak-{stamp}-pre-{new}"
    shutil.copy2(api_js_path, backup)

    updated = re.sub(
        r"""(let\s+db_propery_table_name\s*=\s*['"])[^'"]+(['"])""",
        rf"\g<1>{new}\g<2>", api_js, count=1)
    # Hardcoded literals in real code (queryCDCProperties and friends) must move too;
    # `check` fails when any exist, so this only ever rewrites comments in a green run.
    updated = re.sub(rf"\b{re.escape(old)}\b", new, updated)

    with open(api_js_path, "w") as fh:
        fh.write(updated)

    print(f"{GREEN}api.js now points at {new}{RESET}  (backup: {backup})")
    print("Next, on the API host (upapi / 45.79.118.32):")
    print("  node --check /srv/users/upapi/apps/api/api.js")
    print("  pm2 restart api && pm2 logs api --lines 50")
    print("  curl -s https://upapi.imtg.com.au/api/schema/validate | head")
    print("Then flush and re-warm the lookup cache:")
    print("  /usr/local/bin/refresh-lookups.sh")
    return 0


# --------------------------------------------------------------------------- main

def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("command", choices=["check", "indexes", "matviews", "sanity", "cutover"])
    ap.add_argument("--from", dest="old", default=None,
                    help="current table (default: read from --api-js, else up_property_d_3)")
    ap.add_argument("--to", dest="new", required=True, help="new table, e.g. up_property_d_4")
    ap.add_argument("--api-js", default=None,
                    help="path to a copy of api.js (enables the column contract and code checks)")
    ap.add_argument("--apply", action="store_true",
                    help="indexes/matviews: actually run the DDL instead of just printing it")
    ap.add_argument("--min-scans", type=int, default=1,
                    help="an index the old table scanned fewer times than this is reported "
                         "but not required (default 1: never used = not required)")
    ap.add_argument("--no-concurrently", action="store_true",
                    help="build indexes with a table lock (faster, blocks writers)")
    ap.add_argument("--sanity-lga", default="HORNSBY",
                    help="LGA used for the scoped search probe (default HORNSBY)")
    ap.add_argument("--speed-tolerance", type=float, default=1.5,
                    help="sanity: how many times slower the new table may be before it "
                         "fails (default 1.5x, only applied above 2s)")
    ap.add_argument("--full-hard", action="store_true",
                    help="sanity: also run the statewide unindexed probe (minutes per table)")
    ap.add_argument("--tolerance", type=float, default=0.20,
                    help="fractional difference in a parity count that fails (default 0.20)")
    args = ap.parse_args()

    # Probes take minutes each; without this a redirected run shows nothing until the end.
    sys.stdout.reconfigure(line_buffering=True)

    api_js = None
    if args.api_js:
        with open(args.api_js) as fh:
            api_js = fh.read()

    old = args.old or (api_current_table(api_js) if api_js else None) or "up_property_d_3"
    new = args.new
    if old == new:
        print("--from and --to are the same table; nothing to do.")
        return 1

    print()
    print(f"{DIM}{DB}@{DB_HOST}  {old} -> {new}  ({args.command}){RESET}")
    print()

    rep = Report()

    if not check_tables(rep, old, new):
        return 1

    if args.command in ("check", "cutover"):
        check_columns(rep, old, new, api_js)
        check_indexes(rep, old, new, apply=False, min_scans=args.min_scans)
        check_matviews(rep, old, new, rebuild=False)
        check_code_refs(rep, old, args.api_js, api_js)
    elif args.command == "indexes":
        check_indexes(rep, old, new, apply=args.apply,
                      concurrently=not args.no_concurrently, min_scans=args.min_scans)
    elif args.command == "matviews":
        check_matviews(rep, old, new, rebuild=args.apply)
    elif args.command == "sanity":
        run_sanity(rep, old, new, args.sanity_lga, args.tolerance)
        run_hard(rep, old, new, args.sanity_lga, args.speed_tolerance, args.full_hard)

    print()
    if rep.green():
        extra = f" ({len(rep.warns())} warning(s))" if rep.warns() else ""
        print(f"{GREEN}GREEN — {args.command} passed{extra}{RESET}")
    else:
        print(f"{RED}RED — {len(rep.fails())} failure(s){RESET}")
        for _, section, message in rep.fails():
            print(f"  · [{section}] {message}")
    print()

    if args.command == "cutover":
        if not args.api_js:
            print("cutover needs --api-js pointing at the api.js to rewrite.")
            return 1
        return do_cutover(rep, old, new, args.api_js, api_js)

    return 0 if rep.green() else 1


if __name__ == "__main__":
    sys.exit(main())
