"""Build mv_property_search — the narrow, pre-deduped projection the site search runs on.

Why this exists
---------------
`_search_property` runs

    select * from (
      select distinct on (coalesce(t1.propid, t1.gurasid)) t1.*
        from up_property_d_3 t1 where <filters>
       order by coalesce(t1.propid, t1.gurasid), (t1.address ~ '^\\S*/'), t1.address) t1
    order by suburbname, address limit 450

against a 41 GB, 308-column table on a box with 15 GB of RAM. Measured on a five-region
school-distance search (EXPLAIN ANALYZE, 2026-09-08): **220 s**, of which ~120 s is a
parallel seq scan reading 17 GB off disk and ~90 s is the dedup sort — 3.8 M rows at
4,422 bytes each, spilling **7.5 GB** to temp (2.5 GB per worker, external merge).

The width is the problem, not the filters. `select t1.*` drags all 308 columns through a
sort that only needs the dedup key. This view keeps just the columns the search filters on
and the columns the result list and map markers actually read, with the dedup already
applied — one row per coalesce(propid, gurasid) instead of 1.85 rows.

Column set
----------
Derived, not hand-listed, so it survives a schema change:

  FILTER  every column named in a `where_clause_array.push(...)` in api.js, plus the
          cdc_* / pattern-book / exclusion column arrays and expectedSchema's keys
  OUTPUT  every `property.<field>` the result list, cluster picker and PropertySpec read

Anything not present on the source table is dropped with a warning rather than failing the
build — a column can legitimately disappear between loads (`rule_ids` did, in d_4).

Usage (on the DB hop host, updb / 172.105.183.89):

    scp web/deploy/api/build_mv_property_search.py root@172.105.183.89:/tmp/
    export PGPASSWORD=$(awk -F: '{print $5}' ~/.pgpass | head -1)
    python3 -u /tmp/build_mv_property_search.py --table up_property_d_3 --print   # DDL only
    python3 -u /tmp/build_mv_property_search.py --table up_property_d_3 --apply   # build it

Refreshing: `refresh materialized view concurrently mv_property_search;` — add it to
/usr/local/bin/refresh-lookups.sh ahead of the zone lookups. On the next table bump
qa_property_table.py picks it up automatically, as one more matview that reads the
property table.
"""

import argparse
import os
import subprocess
import sys
import time

DB = os.environ.get("QA_DB", "UrbanPortalDBP")
DB_USER = os.environ.get("QA_DB_USER", "postgres")
DB_HOST = os.environ.get("QA_DB_HOST", "192.168.146.115")

MV = "mv_property_search"

# --- columns the search filters on (every where_clause_array.push in _search_property) ----
FILTER_COLUMNS = [
    # identity / location
    "gurasid", "propid", "address", "postcode", "suburbname", "lga_name", "region_name",
    "planlabel", "lotnumber", "sectionnumber", "geom",
    # zoning / planning
    "lzn_label", "lzn_lay_class", "epi_name", "epi_name_p",
    "ols_minimum_height", "ols_maximum_height",
    # numeric sliders
    "fsr_fsr", "area", "hob_max_b_h", "walkable_score", "estimated_price", "lot_size",
    "primary_frontage_length_m", "lot_depth_m", "propertyfrontagecount",
    "closest_hospital_distance", "closest_school_distance", "closest_railway_station_distance",
    # strata / part-lot detection
    "property_description",
]

# `no_exclusions`: each of these is tested `is null` / `is not null`.
EXCLUSION_COLUMNS = [
    "h_name", "floodmapping", "landslidrisk", "activestreetfrontage", "bushfireproneland",
    "wetland", "coastalmanagement", "australian_noise_exposure_forecast",
    "groundwatervulnerability", "mineralresoureland", "riparianlandwatercouse", "salinity",
    "scenicprotectionland", "biodiversity", "contaminationactivitytype",
]

CDC_COLUMNS = [
    "cdc_dual_occupancy", "cdc_multi_dwelling_terraces", "cdc_secondary_dwellings",
    "cdc_dwelling_houses", "cdc_manor_homes", "cdc_rural_housing",
    "cdc_inland_dwelling_houses", "cdc_inland_farm_buildings", "cdc_greenfield_housing",
    "cdc_agritourism", "cdc_farmstay",
]

PATTERN_BOOK_COLUMNS = [
    "semis_01_anthony_gill_eligible", "semis_02_sibling_eligible",
    "terraces_01_carter_eligible", "terraces_02_sam_crawford_eligible",
    "terraces_03_officer_woods_eligible", "terraces_04_other_eligible",
    "row_homes_01_saha_eligible", "manor_homes_01_studio_eligible",
    "small_lot_apt_01_3storeys_eligible", "small_lot_apt_01_3storeys_min_eligible",
    "small_lot_apt_01_4storeys_eligible", "small_lot_apt_02_3storeys_eligible",
    "small_lot_apt_02_4storeys_eligible", "small_lot_apt_03_4_6storeys_eligible",
    "small_lot_apt_04_4_5storeys_eligible", "corner_lot_apt_01_4_6storeys_eligible",
    "corner_lot_apt_02_4_6storeys_eligible", "large_lot_apt_01_4storeys_eligible",
    "large_lot_apt_01_6storeys_eligible", "large_lot_apt_02_3_4storeys_eligible",
    "large_lot_apt_02_5_6storeys_eligible", "large_lot_apt_03_4_6storeys_eligible",
]

# --- columns the result list, cluster picker and PropertySpec render ----------------------
OUTPUT_COLUMNS = [
    "land_value", "land_value_1", "lot_section_plan", "no_of_beds", "no_of_baths",
    "no_of_cars", "depth", "width", "area_sqm", "normalized_address",
]

WANTED = (FILTER_COLUMNS + EXCLUSION_COLUMNS + CDC_COLUMNS
          + PATTERN_BOOK_COLUMNS + OUTPUT_COLUMNS)


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


def existing_columns(table):
    rows = psql(f"""select column_name from information_schema.columns
                     where table_schema='public' and table_name='{table}'""")
    return {r[0] for r in rows}


def build_ddl(table, columns):
    cols = ",\n         ".join(f"t1.{c}" for c in columns)
    create = f"""CREATE MATERIALIZED VIEW public.{MV} AS
  SELECT DISTINCT ON (coalesce(t1.propid, t1.gurasid))
         coalesce(t1.propid, t1.gurasid) AS search_key,
         {cols}
    FROM public.{table} t1
   ORDER BY coalesce(t1.propid, t1.gurasid), (t1.address ~ '^\\S*/'), t1.address;"""

    indexes = [
        # CONCURRENTLY refresh needs a unique index; search_key is the dedup key, so it is
        # unique by construction.
        f"CREATE UNIQUE INDEX {MV}_key ON public.{MV} USING btree (search_key);",
        # The final ORDER BY of every search. Having it as an index lets the planner stop
        # at 450 rows instead of sorting the whole result set.
        f"CREATE INDEX {MV}_sort ON public.{MV} USING btree (suburbname, address);",
        f"CREATE INDEX {MV}_region_sort ON public.{MV} USING btree (region_name, suburbname, address);",
        f"CREATE INDEX {MV}_lga_sort ON public.{MV} USING btree (lga_name, suburbname, address);",
        f"CREATE INDEX {MV}_suburb_sort ON public.{MV} USING btree (suburbname, address) "
        f"INCLUDE (region_name, lga_name);",
        f"CREATE INDEX {MV}_zone ON public.{MV} USING btree (lzn_label, region_name);",
        f"CREATE INDEX {MV}_gurasid ON public.{MV} USING btree (gurasid);",
        f"CREATE INDEX {MV}_geom ON public.{MV} USING gist (geom);",
        # The distance sliders are the filters with no index on the base table at all —
        # the reason a school-distance search seq-scans 41 GB.
        f"CREATE INDEX {MV}_school ON public.{MV} USING btree (closest_school_distance);",
        f"CREATE INDEX {MV}_hospital ON public.{MV} USING btree (closest_hospital_distance);",
        f"CREATE INDEX {MV}_rail ON public.{MV} USING btree (closest_railway_station_distance);",
    ]
    # One partial GiST per flag, matching what the base table carries: these filters are
    # highly selective, so a partial index turns them into a small index scan.
    for col in [c for c in CDC_COLUMNS + PATTERN_BOOK_COLUMNS if c in columns]:
        indexes.append(
            f"CREATE INDEX {MV}_{col[:40]} ON public.{MV} USING gist (geom) "
            f"WHERE ({col} = true);")

    return create, indexes


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--table", default="up_property_d_3")
    ap.add_argument("--apply", action="store_true", help="run the DDL (tens of minutes)")
    ap.add_argument("--print", dest="show", action="store_true", help="print the DDL only")
    ap.add_argument("--drop", action="store_true", help="drop the view first")
    args = ap.parse_args()
    sys.stdout.reconfigure(line_buffering=True)

    present = existing_columns(args.table)
    if not present:
        sys.exit(f"{args.table} does not exist")

    columns, missing = [], []
    for c in WANTED:
        (columns if c in present else missing).append(c)
    # dict.fromkeys keeps order and drops the duplicates between the lists.
    columns = list(dict.fromkeys(columns))

    if missing:
        print(f"note: {len(missing)} wanted column(s) absent from {args.table}, skipped: "
              + ", ".join(missing))
    print(f"{MV} will carry {len(columns)} columns from {args.table}")

    create, indexes = build_ddl(args.table, columns)

    if args.show or not args.apply:
        print()
        if args.drop:
            print(f"DROP MATERIALIZED VIEW IF EXISTS public.{MV};")
        print(create)
        for i in indexes:
            print(i)
        print(f"ANALYZE public.{MV};")
        if not args.apply:
            print("\n(nothing applied — re-run with --apply)")
        return 0

    if args.drop:
        print("dropping existing view…")
        psql(f"DROP MATERIALIZED VIEW IF EXISTS public.{MV};", tuples=False)

    t0 = time.time()
    print("building the view (this is one full pass over the property table)…")
    # The build sorts 5.4M rows to dedup them; at the cluster's 64MB work_mem that spills
    # to disk for no reason. Session-local, so nothing else on the box is affected.
    psql("SET work_mem = '1GB'; SET maintenance_work_mem = '2GB';\n" + create, tuples=False)
    print(f"  built in {time.time() - t0:.0f}s")

    for i, stmt in enumerate(indexes, 1):
        t1 = time.time()
        print(f"  index {i}/{len(indexes)}: {stmt.split(' ON ')[0][13:]}")
        psql("SET maintenance_work_mem = '2GB';\n" + stmt, tuples=False)
        print(f"    {time.time() - t1:.0f}s")

    psql(f"ANALYZE public.{MV};", tuples=False)

    rows = psql(f"""select (select count(*) from public.{MV}),
                           pg_size_pretty(pg_table_size('public.{MV}')),
                           pg_size_pretty(pg_indexes_size('public.{MV}'))""")[0]
    print(f"\n{MV}: {int(rows[0]):,} rows, {rows[1]} heap, {rows[2]} indexes "
          f"(total {time.time() - t0:.0f}s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
