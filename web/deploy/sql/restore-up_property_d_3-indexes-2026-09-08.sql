-- Restores the 36 unused indexes dropped from up_property_d_3 on 2026-09-08.
-- Usage stats window began 2026-09-03 03:49:10.971794+00.
-- psql -U postgres -d UrbanPortalDBP -h 192.168.146.115 -f restore-up_property_d_3-indexes-2026-09-08.sql

CREATE INDEX CONCURRENTLY idx_d3_suburb_region_addr ON public.up_property_d_3 USING btree (suburbname, region_name, address) INCLUDE (epi_name, epi_name_p);
CREATE INDEX CONCURRENTLY idx_d3_postcode_region ON public.up_property_d_3 USING btree (postcode, region_name) INCLUDE (gurasid, suburbname, address);
CREATE INDEX CONCURRENTLY idx_d3_property_description_trgm ON public.up_property_d_3 USING gin (property_description gin_trgm_ops);
CREATE INDEX CONCURRENTLY idx_d3_address_trgm_gin ON public.up_property_d_3 USING gin (address gin_trgm_ops);
CREATE INDEX CONCURRENTLY idx_d3_up_property_geom_4283 ON public.up_property_d_3 USING gist (st_transform(geom, 4283));
CREATE INDEX CONCURRENTLY idx_d3_cdc_all_suburb ON public.up_property_d_3 USING btree (region_name, suburbname, cdc_dual_occupancy, cdc_multi_dwelling_terraces, cdc_secondary_dwellings, cdc_dwelling_houses) INCLUDE (geom) WHERE (cdc_dual_occupancy OR cdc_multi_dwelling_terraces OR cdc_secondary_dwellings OR cdc_dwelling_houses OR cdc_general OR cdc_rural_housing);
CREATE INDEX CONCURRENTLY idx_up_property_d_3_keyset ON public.up_property_d_3 USING btree (gurasid, propid, lot_section_plan);
CREATE INDEX CONCURRENTLY idx_d3_upd_lot_gurasid ON public.up_property_d_3 USING btree (lot_section_plan, gurasid);
CREATE INDEX CONCURRENTLY idx_d3_fsr_area_expr ON public.up_property_d_3 USING btree (((fsr_fsr * area_sqm)));
CREATE INDEX CONCURRENTLY idx_d3_lot_section_plan ON public.up_property_d_3 USING btree (lot_section_plan);
CREATE INDEX CONCURRENTLY idx_cdc_inland_dwelling_houses_geom ON public.up_property_d_3 USING gist (geom) WHERE (cdc_inland_dwelling_houses = true);
CREATE INDEX CONCURRENTLY idx_cdc_dwelling_houses_geom ON public.up_property_d_3 USING gist (geom) WHERE (cdc_dwelling_houses = true);
CREATE INDEX CONCURRENTLY idx_cdc_secondary_dwellings_geom ON public.up_property_d_3 USING gist (geom) WHERE (cdc_secondary_dwellings = true);
CREATE INDEX CONCURRENTLY idx_cdc_dual_occupancy_geom ON public.up_property_d_3 USING gist (geom) WHERE (cdc_dual_occupancy = true);
CREATE INDEX CONCURRENTLY idx_cdc_multi_dwelling_terraces_geom ON public.up_property_d_3 USING gist (geom) WHERE (cdc_multi_dwelling_terraces = true);
CREATE INDEX CONCURRENTLY idx_d3_lzn_lay_class_lzn_label ON public.up_property_d_3 USING btree (lzn_lay_class, lzn_label);
CREATE INDEX CONCURRENTLY idx_d3_lzn_lay_class ON public.up_property_d_3 USING btree (lzn_lay_class);
CREATE INDEX CONCURRENTLY idx_cdc_greenfield_housing_geom ON public.up_property_d_3 USING gist (geom) WHERE (cdc_greenfield_housing = true);
CREATE INDEX CONCURRENTLY idx_d3_epi_notnull ON public.up_property_d_3 USING btree (suburbname, region_name, address) INCLUDE (epi_name, epi_name_p) WHERE ((epi_name IS NOT NULL) AND (epi_name_p IS NOT NULL) AND (epi_name <> epi_name_p));
CREATE INDEX CONCURRENTLY idx_d3_suburb_region_addr_full ON public.up_property_d_3 USING btree (suburbname, region_name, address) INCLUDE (epi_name, epi_name_p) WHERE ((epi_name IS NOT NULL) AND (epi_name_p IS NOT NULL) AND (epi_name <> epi_name_p));
CREATE INDEX CONCURRENTLY idx_cdc_farmstay_geom ON public.up_property_d_3 USING gist (geom) WHERE (cdc_farmstay = true);
CREATE INDEX CONCURRENTLY idx_cdc_agritourism_geom ON public.up_property_d_3 USING gist (geom) WHERE (cdc_agritourism = true);
CREATE INDEX CONCURRENTLY idx_cdc_rural_housing_geom ON public.up_property_d_3 USING gist (geom) WHERE (cdc_rural_housing = true);
CREATE INDEX CONCURRENTLY idx_cdc_inland_farm_buildings_geom ON public.up_property_d_3 USING gist (geom) WHERE (cdc_inland_farm_buildings = true);
CREATE INDEX CONCURRENTLY idx_large_lot_apt_02_3_4storeys_geom ON public.up_property_d_3 USING gist (geom) WHERE (large_lot_apt_02_3_4storeys_eligible = true);
CREATE INDEX CONCURRENTLY idx_large_lot_apt_02_5_6storeys_geom ON public.up_property_d_3 USING gist (geom) WHERE (large_lot_apt_02_5_6storeys_eligible = true);
CREATE INDEX CONCURRENTLY idx_large_lot_apt_03_4_6storeys_geom ON public.up_property_d_3 USING gist (geom) WHERE (large_lot_apt_03_4_6storeys_eligible = true);
CREATE INDEX CONCURRENTLY idx_small_lot_apt_02_3storeys_geom ON public.up_property_d_3 USING gist (geom) WHERE (small_lot_apt_02_3storeys_eligible = true);
CREATE INDEX CONCURRENTLY idx_small_lot_apt_01_3storeys_geom ON public.up_property_d_3 USING gist (geom) WHERE (small_lot_apt_01_3storeys_eligible = true);
CREATE INDEX CONCURRENTLY idx_corner_lot_apt_01_4_6storeys_geom ON public.up_property_d_3 USING gist (geom) WHERE (corner_lot_apt_01_4_6storeys_eligible = true);
CREATE INDEX CONCURRENTLY idx_corner_lot_apt_02_4_6storeys_geom ON public.up_property_d_3 USING gist (geom) WHERE (corner_lot_apt_02_4_6storeys_eligible = true);
CREATE INDEX CONCURRENTLY idx_small_lot_apt_03_4_6storeys_geom ON public.up_property_d_3 USING gist (geom) WHERE (small_lot_apt_03_4_6storeys_eligible = true);
CREATE INDEX CONCURRENTLY idx_small_lot_apt_04_4_5storeys_geom ON public.up_property_d_3 USING gist (geom) WHERE (small_lot_apt_04_4_5storeys_eligible = true);
CREATE INDEX CONCURRENTLY idx_large_lot_apt_01_4storeys_geom ON public.up_property_d_3 USING gist (geom) WHERE (large_lot_apt_01_4storeys_eligible = true);
CREATE INDEX CONCURRENTLY idx_large_lot_apt_01_6storeys_geom ON public.up_property_d_3 USING gist (geom) WHERE (large_lot_apt_01_6storeys_eligible = true);
CREATE INDEX CONCURRENTLY idx_cdc_manor_homes_geom ON public.up_property_d_3 USING gist (geom) WHERE (cdc_manor_homes = true);
