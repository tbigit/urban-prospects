-- mv_address_lookup — the address autocomplete's own index, off the 41 GB table.
--
-- /address/search runs, per keystroke-ish lookup:
--
--   select address from up_property_d_3
--    where normalized_address = full_address_normalization($1)
--       or address ILIKE '%$1%'
--       or full_address_normalization(address) ILIKE '%…%'
--    order by similarity(address, $1) desc limit 50
--
-- Measured on '5 GEORGE STREET' (EXPLAIN ANALYZE, 2026-09-08): 735 ms warm but touching
-- **98,647 buffers (~770 MB)** — a 902 MB GiST trgm index plus random heap fetches across
-- 41 GB of 308-column rows. Warm that is fine; on a 15 GB box it is rarely warm, and cold
-- runs measured 6-36 s through the API.
--
-- This view is the same 5.4M rows — **no dedup**, so unit and part-lot addresses
-- ("40/13 ARTILLERY CRESCENT") survive, which they do not in mv_property_search — carrying
-- only what the endpoint reads and filters on. Narrow rows plus GIN trgm (which the planner
-- does pick here, unlike on the base table) cut the same query to 4,843 buffers.
--
-- Refreshed by /usr/local/bin/refresh-lookups.sh. `id` exists solely to give REFRESH ...
-- CONCURRENTLY the unique index it requires; it is not stable across rebuilds and nothing
-- should reference it.

DROP MATERIALIZED VIEW IF EXISTS public.mv_address_lookup;

CREATE MATERIALIZED VIEW public.mv_address_lookup AS
  SELECT row_number() OVER () AS id,
         t1.gurasid,
         t1.propid,
         t1.address,
         t1.normalized_address,
         t1.suburbname,
         t1.postcode,
         t1.lga_name,
         t1.region_name
    FROM public.up_property_d_3 t1
   WHERE t1.address IS NOT NULL;

CREATE UNIQUE INDEX mv_address_lookup_id ON public.mv_address_lookup USING btree (id);

-- The three OR branches of the endpoint's WHERE.
CREATE INDEX mv_address_lookup_addr_gin ON public.mv_address_lookup
  USING gin (address gin_trgm_ops);
CREATE INDEX mv_address_lookup_naddr_expr_gin ON public.mv_address_lookup
  USING gin (full_address_normalization(address) gin_trgm_ops);
CREATE INDEX mv_address_lookup_naddr ON public.mv_address_lookup
  USING btree (normalized_address);

-- The optional region / LGA / suburb narrowing the app sends with the address.
CREATE INDEX mv_address_lookup_scope ON public.mv_address_lookup
  USING btree (region_name, lga_name, suburbname);

-- Answering by gurasid keeps the view usable for anything that resolves an address to an id.
CREATE INDEX mv_address_lookup_gurasid ON public.mv_address_lookup USING btree (gurasid);

ANALYZE public.mv_address_lookup;
