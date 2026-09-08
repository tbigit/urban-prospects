"""Drop indexes a table has never used, after saving the DDL to put them back.

`up_property_d_3` carries ~51 indexes, most inherited from experiments that predate the
current query set. Over 5.5 days of production traffic (`pg_stat_user_indexes`, stats reset
2026-09-03) **36 of them had `idx_scan = 0`** — 4,216 MB the planner has never once chosen.
On a DB box with 15 GB of RAM that is cache and write amplification spent on nothing, and
since the search moved to `mv_property_search` the base table's filter indexes will never be
chosen again.

Safety
------
* Only indexes with `idx_scan < --min-scans` (default 1) are touched.
* Unique, primary-key and constraint-backing indexes are excluded outright — dropping one
  changes what the table permits, not just how fast it reads.
* Every dropped index's `CREATE` statement is written to a restore file **before** the first
  drop, so the whole set can be put back with one psql run.
* `DROP INDEX CONCURRENTLY`, one statement at a time, so readers and writers keep working.
* `--print` (the default) shows exactly what would happen and changes nothing.

The window is the catch, not the mechanism: an index used once a quarter looks identical to
one used never. Check `stats_reset` in the output and be sure it covers a representative
stretch — a month is comfortable, five days is thin for anything seasonal.

Usage (on the DB hop host, updb / 172.105.183.89):

    export PGPASSWORD=$(awk -F: '{print $5}' ~/.pgpass | head -1)
    python3 -u /tmp/drop_unused_indexes.py --table up_property_d_3            # dry run
    python3 -u /tmp/drop_unused_indexes.py --table up_property_d_3 --apply \\
        --restore-file /root/restore-d3-indexes-2026-09-08.sql

To put them back:  psql -U postgres -d UrbanPortalDBP -h 192.168.146.115 -f <restore file>
"""

import argparse
import os
import subprocess
import sys
import time
from datetime import datetime, timezone

DB = os.environ.get("QA_DB", "UrbanPortalDBP")
DB_USER = os.environ.get("QA_DB_USER", "postgres")
DB_HOST = os.environ.get("QA_DB_HOST", "192.168.146.115")


def psql(sql, timeout=14400, tuples=True):
    cmd = ["psql", "-U", DB_USER, "-d", DB, "-h", DB_HOST, "-X", "-q", "-v", "ON_ERROR_STOP=1"]
    if tuples:
        cmd += ["-A", "-t", "-F", "|"]
    cmd += ["-c", sql]
    proc = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
    if proc.returncode != 0:
        raise RuntimeError(f"psql failed:\n{proc.stderr.strip()}")
    if not tuples:
        return proc.stdout
    return [l.split("|") for l in proc.stdout.strip().splitlines() if l.strip()]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--table", required=True)
    ap.add_argument("--min-scans", type=int, default=1,
                    help="drop indexes scanned fewer times than this (default 1: never used)")
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--restore-file", default=None,
                    help="where to write the CREATE statements (default: ./restore-<table>-indexes-<date>.sql)")
    ap.add_argument("--keep", default="",
                    help="comma-separated index names to leave alone regardless")
    args = ap.parse_args()
    sys.stdout.reconfigure(line_buffering=True)

    keep = {k.strip() for k in args.keep.split(",") if k.strip()}
    reset = psql("select coalesce(stats_reset::text,'unknown') from pg_stat_database "
                 "where datname = current_database()")[0][0]

    rows = psql(f"""
        select s.indexrelname, s.idx_scan,
               pg_size_pretty(pg_relation_size(s.indexrelid)),
               pg_relation_size(s.indexrelid),
               pg_get_indexdef(s.indexrelid)
          from pg_stat_user_indexes s
          join pg_index i on i.indexrelid = s.indexrelid
         where s.relname = '{args.table}'
           and s.idx_scan < {args.min_scans}
           and not i.indisunique and not i.indisprimary
           and not exists (select 1 from pg_constraint c where c.conindid = s.indexrelid)
         order by pg_relation_size(s.indexrelid) desc
    """)

    targets = [r for r in rows if r[0] not in keep]
    if not targets:
        print(f"nothing to drop on {args.table}")
        return 0

    total = sum(int(r[3]) for r in targets)
    print(f"{args.table}: {len(targets)} index(es) with < {args.min_scans} scan(s) "
          f"since {reset}")
    print(f"space to reclaim: {total / 1024 / 1024:,.0f} MB")
    print()
    for name, scans, size, _, _ in targets:
        print(f"  {size:>11}  {scans:>4} scans  {name}")
    print()

    stamp = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    restore = args.restore_file or f"restore-{args.table}-indexes-{stamp}.sql"
    body = (f"-- Restores the {len(targets)} unused indexes dropped from {args.table} on {stamp}.\n"
            f"-- Usage stats window began {reset}.\n"
            f"-- psql -U {DB_USER} -d {DB} -h {DB_HOST} -f {os.path.basename(restore)}\n\n"
            + "\n".join(r[4].replace("CREATE INDEX ", "CREATE INDEX CONCURRENTLY ", 1)
                         + ";" for r in targets) + "\n")

    if not args.apply:
        print(f"(dry run — nothing dropped. Restore DDL would go to {restore})")
        print("--- restore file preview ---")
        print(body)
        return 0

    # Written before the first drop, deliberately: a half-finished run must still be undoable.
    with open(restore, "w") as fh:
        fh.write(body)
    print(f"restore DDL saved to {restore}\n")

    t0 = time.time()
    for i, (name, _, size, _, _) in enumerate(targets, 1):
        print(f"  [{i}/{len(targets)}] dropping {name} ({size})")
        # CONCURRENTLY keeps readers and writers going, and cannot run in a transaction block.
        psql(f"DROP INDEX CONCURRENTLY IF EXISTS public.{name};", tuples=False)

    left = psql(f"""select count(*), pg_size_pretty(pg_indexes_size('public.{args.table}'))
                      from pg_indexes where tablename = '{args.table}'""")[0]
    print(f"\ndropped {len(targets)} in {time.time() - t0:.0f}s — "
          f"{args.table} now has {left[0]} indexes, {left[1]} total")
    return 0


if __name__ == "__main__":
    sys.exit(main())
