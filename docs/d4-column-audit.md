# `up_property_d_4` column audit

**What the platform reads, what it does not, and how many bytes each unread column costs.** Generated 2026-09-12 from the live table (330 columns, 5,409,689 rows). For the data team to mark each group drop / keep / move before the next load.

## Method

Every column name was matched as a whole word against every consumer we could find:

- the property app (`web/src/lib/app/**`, `web/src/routes/app/**`)
- every JS file on the API host (`api.js`, `sequelize*.js`, `cronaddress*.js`, `ddg.js`, `test.js`, `email_templates/`)
- every materialised view, view and function in `UrbanPortalDBP` that mentions `up_property`
- the indexes on `up_property_d_4`
- the Martin tile config on the up-geo box (publishes only `address, gurasid, propid, suburbname` from d_4)
- this repo's deploy tooling (`web/deploy/api/*.py`, `web/deploy/sql/*.sql`, `web/src/lib/server/*.ts`)
- the Handlebars placeholders in every member `user_template` row (only `{{property.address}}` is used)

Dynamic access was checked separately. The app builds no column names from strings: the pattern-book map in `propertyTypes.js` lists the `*_eligible` columns literally and all of them are referenced. The API's `no_exclusions` loop iterates a fixed list. `/mail/create` does a `select *` but only feeds the template placeholders above. The public Planning Data API (`POST /v2/properties`, bearer key) selects an explicit column list, so API customers cannot see anything outside it. `GET /property/<id>` returns `select *` to the app, so the app-side grep is what decides whether a column is displayed.

Sizes are **measured**, not estimated: `sum(pg_column_size(col))` over a 2% `TABLESAMPLE` (107,691 rows), scaled to the row count. They include TOAST, which is where most of this table lives (10 GB main heap, 29 GB TOAST).


## Result

| | Columns | Stored bytes |
|---|---|---|
| Referenced by something (keep) | 114 | 8.8 GB |
| Referenced by nothing (candidates) | 216 | **21.2 GB** |
| Total | 330 | 30.0 GB |


The single biggest referenced column is `permissible_uses` (4.8 GB, filtered by the permissible-use search). The biggest unreferenced ones are `buffered_geom` (3.6 GB of geometry serialised as text), `sepp_landuses` (1.6 GB) and the 22 pattern-book `*_reasons` columns (9.0 GB between them).


## Candidates, grouped. Confirm each group with the data team before dropping.

Unread by the platform does not mean unwanted: several groups look like inputs to a later load step (`*_reasons` explain the `*_eligible` flags; `addctrl_*` and `apu_*` arrived in this load and may be for a feature not built yet). The data team owns that call. "Move" means keep the data in a side table keyed by `gurasid` so nothing is lost but the hot table gets narrower.


### Pattern-book reasons (*_reasons): 22 columns, 8.99 GB

| Column | Type | Null % | Stored |
|---|---|---|---|
| `large_lot_apt_01_6storeys_reasons` | text | 0% | 527 MB |
| `large_lot_apt_01_4storeys_reasons` | text | 0% | 527 MB |
| `small_lot_apt_01_4storeys_reasons` | text | 0% | 502 MB |
| `small_lot_apt_03_4_6storeys_reasons` | text | 0% | 501 MB |
| `corner_lot_apt_02_4_6storeys_reasons` | text | 0% | 500 MB |
| `small_lot_apt_04_4_5storeys_reasons` | text | 0% | 499 MB |
| `small_lot_apt_02_4storeys_reasons` | text | 0% | 485 MB |
| `corner_lot_apt_01_4_6storeys_reasons` | text | 0% | 482 MB |
| `small_lot_apt_01_3storeys_reasons` | text | 0% | 480 MB |
| `small_lot_apt_01_3storeys_min_reasons` | text | 0% | 469 MB |
| `small_lot_apt_02_3storeys_reasons` | text | 0% | 458 MB |
| `large_lot_apt_03_4_6storeys_reasons` | text | 0% | 451 MB |
| `large_lot_apt_02_5_6storeys_reasons` | text | 0% | 401 MB |
| `large_lot_apt_02_3_4storeys_reasons` | text | 0% | 397 MB |
| `terraces_02_sam_crawford_reasons` | text | 0% | 331 MB |
| `terraces_04_other_reasons` | text | 0% | 330 MB |
| `terraces_03_officer_woods_reasons` | text | 0% | 327 MB |
| `row_homes_01_saha_reasons` | text | 0% | 316 MB |
| `terraces_01_carter_reasons` | text | 0% | 313 MB |
| `semis_02_sibling_reasons` | text | 0% | 235 MB |
| `semis_01_anthony_gill_reasons` | text | 0% | 230 MB |
| `manor_homes_01_studio_reasons` | text | 0% | 230 MB |

### Duplicate geometry stored as text: 3 columns, 3.61 GB

| Column | Type | Null % | Stored |
|---|---|---|---|
| `buffered_geom` | text | 0% | 3,615 MB |
| `centroid_geom` | text | 100% | 0 MB |
| `geom_1` | text | 100% | 0 MB |

### Planning-layer detail (epi / lay_class / label per layer): 101 columns, 2.72 GB

| Column | Type | Null % | Stored |
|---|---|---|---|
| `dcp_plan_name` | text | 4% | 675 MB |
| `historic_amendment` | character varying | 9% | 330 MB |
| `historic_published_date` | text | 9% | 181 MB |
| `historic_commenced_date` | character varying | 9% | 178 MB |
| `mls_epi_name` | text | 26% | 165 MB |
| `historic_lay_class` | text | 9% | 155 MB |
| `hob_epi_name` | text | 35% | 149 MB |
| `dcp_council_name` | text | 5% | 125 MB |
| `localprov_lay_name` | text | 60% | 92 MB |
| `fsr_epi_name` | text | 62% | 86 MB |
| `lep_currency_date` | text | 4% | 73 MB |
| `dcp_lga_name` | text | 4% | 65 MB |
| `lep_lga_name` | text | 4% | 65 MB |
| `localprov_lay_class` | text | 60% | 49 MB |
| `cenv_epi_name` | text | 87% | 47 MB |
| `lep_lay_class` | text | 4% | 47 MB |
| `historic_zone` | character varying | 9% | 46 MB |
| `cenv_map_name` | text | 87% | 45 MB |
| `biovalue_boset_class` | text | 89% | 33 MB |
| `dcp_plan_type` | text | 5% | 21 MB |
| `coastalmanagement_env` | text | 87% | 17 MB |
| `biovalue_category` | text | 89% | 13 MB |
| `heritage_class` | text | 93% | 10 MB |
| `ghc_lay_class` | text | 96% | 5 MB |
| `scenic_epi_name` | text | 98% | 4 MB |
| `dwc_epi_name` | text | 99% | 3 MB |
| `asf_epi_name` | text | 99% | 3 MB |
| `cuse_epi_name` | text | 99% | 3 MB |
| `cwet_map_name` | text | 99% | 3 MB |
| `salinity_epi_name` | text | 99% | 3 MB |
| `cuse_map_name` | text | 99% | 2 MB |
| `cwet_epi_name` | text | 99% | 2 MB |
| `fbl_epi_name` | text | 99% | 2 MB |
| `mineral_epi_name` | text | 99% | 2 MB |
| `tod_map_name` | text | 99% | 2 MB |
| `fbl_lay_class` | text | 99% | 1 MB |
| `tod_lay_class` | text | 99% | 1 MB |
| `crown_reserve_name` | text | 99% | 1 MB |
| `biomap_epi_name` | text | 99% | 1 MB |
| `envsensi_epi_name` | text | 100% | 1 MB |
| `scenic_lga_name` | text | 98% | 1 MB |
| `dwc_lga_name` | text | 99% | 1 MB |
| `localcomplying_lay_class` | text | 100% | 1 MB |
| `landres_lay_class` | text | 100% | 1 MB |
| `asf_lga_name` | text | 99% | 1 MB |
| `coastalmanagement_use` | text | 99% | 1 MB |
| `envsensi_lay_class` | text | 100% | 1 MB |
| `landres_lra_type` | text | 100% | 1 MB |
| `nrbio_epi_name` | text | 100% | 1 MB |
| `hawkesbury_lay_name` | text | 100% | 1 MB |
| `hawkesbury_lay_class` | text | 100% | 1 MB |
| `fbl_lga_name` | text | 99% | 1 MB |
| `sca_legislation` | text | 100% | 1 MB |
| `biomap_lay_class` | text | 99% | 0 MB |
| `rip_epi_name` | text | 100% | 0 MB |
| `nrbio_lay_class` | text | 100% | 0 MB |
| `envsensi_lga_name` | text | 100% | 0 MB |
| `sca_label` | text | 100% | 0 MB |
| `rip_lay_name` | text | 100% | 0 MB |
| `sca_class` | text | 100% | 0 MB |
| `biomap_lay_name` | text | 100% | 0 MB |
| `npws_ogc_fid` | text | 100% | 0 MB |
| `nrwater_epi_name` | text | 100% | 0 MB |
| `mineral_epi_type` | text | 99% | 0 MB |
| `bct_controllin` | text | 99% | 0 MB |
| `ramsar_source` | text | 100% | 0 MB |
| `wilderness_name` | text | 100% | 0 MB |
| `nrbio_epi_type` | text | 100% | 0 MB |
| `nrwater_lay_name` | text | 100% | 0 MB |
| `rfa_lay_class` | text | 100% | 0 MB |
| `rfa_lay_name` | text | 100% | 0 MB |
| `koala_lay_class` | text | 100% | 0 MB |
| `koala_lay_name` | text | 100% | 0 MB |
| `rfa_label` | text | 100% | 0 MB |
| `nrwater_lay_class` | text | 100% | 0 MB |
| `chaz_lay_name` | text | 100% | 0 MB |
| `chaz_lay_class` | text | 100% | 0 MB |
| `pnf_controllin` | text | 100% | 0 MB |
| `ramsar_refcode` | text | 100% | 0 MB |
| `nrsensi_epi_name` | text | 100% | 0 MB |
| `nrsensi_lay_name` | text | 100% | 0 MB |
| `nrsensi_lay_class` | text | 100% | 0 MB |
| `biomap_label` | text | 100% | 0 MB |
| `ada_class_description` | text | 100% | 0 MB |
| `ada_lay_class` | text | 100% | 0 MB |
| `ada_lay_name` | text | 100% | 0 MB |
| `kcorr_lay_class` | text | 100% | 0 MB |
| `kcorr_lay_name` | text | 100% | 0 MB |
| `asb_class_description` | text | 100% | 0 MB |
| `asb_label` | text | 100% | 0 MB |
| `asb_lay_class` | text | 100% | 0 MB |
| `asb_lay_name` | text | 100% | 0 MB |
| `chaz_label` | text | 100% | 0 MB |
| `floodsdf_ogc_fid` | text | 100% | 0 MB |
| `hawkesbury_label` | text | 100% | 0 MB |
| `kcorr_area_ha` | text | 100% | 0 MB |
| `kcorr_label` | text | 100% | 0 MB |
| `lfb_class_description` | text | 100% | 0 MB |
| `lfb_label` | text | 100% | 0 MB |
| `lfb_lay_class` | text | 100% | 0 MB |
| `lfb_lay_name` | text | 100% | 0 MB |

### CDC exclusions / sub-flags: 19 columns, 2.19 GB

| Column | Type | Null % | Stored |
|---|---|---|---|
| `cdc_reasons` | text | 0% | 191 MB |
| `cdc_greenfield_housing_exclusions` | text | 2% | 187 MB |
| `cdc_manor_homes_exclusions` | text | 0% | 175 MB |
| `cdc_inland_farm_buildings_exclusions` | text | 1% | 171 MB |
| `cdc_rural_housing_exclusions` | text | 1% | 170 MB |
| `cdc_inland_dwelling_houses_ru1246_exclusions` | text | 1% | 170 MB |
| `cdc_inland_dwelling_houses_r5_exclusions` | text | 0% | 169 MB |
| `cdc_farmstay_exclusions` | text | 1% | 139 MB |
| `cdc_agritourism_exclusions` | text | 1% | 139 MB |
| `cdc_multi_dwelling_terraces_exclusions` | text | 20% | 122 MB |
| `cdc_dual_occupancy_exclusions` | text | 27% | 118 MB |
| `cdc_secondary_dwellings_exclusions` | text | 30% | 114 MB |
| `cdc_dwelling_houses_exclusions` | text | 36% | 111 MB |
| `cdc_inland_dwelling_houses_ru5_r1_r2_r3_r4_exclusions` | text | 36% | 110 MB |
| `cdc_general_exclusions` | text | 47% | 79 MB |
| `cdc_eligible` | boolean | 0% | 5 MB |
| `cdc_inland_dwelling_houses_ru1246` | boolean | 0% | 5 MB |
| `cdc_inland_dwelling_houses_ru5_r1_r2_r3_r4` | boolean | 0% | 5 MB |
| `cdc_inland_dwelling_houses_r5` | boolean | 0% | 5 MB |

### Other: 9 columns, 1.79 GB

| Column | Type | Null % | Stored |
|---|---|---|---|
| `sepp_landuses` | text | 3% | 1,597 MB |
| `area_h` | double precision | 0% | 43 MB |
| `propid_count` | bigint | 0% | 43 MB |
| `lsz_lay_class` | text | 26% | 33 MB |
| `postcode_1` | text | 0% | 27 MB |
| `total_cdc_eligible` | integer | 0% | 22 MB |
| `lsz_sym_code` | text | 26% | 10 MB |
| `in_lmr_housing_area` | boolean | 0% | 5 MB |
| `in_tod_area` | boolean | 0% | 5 MB |

### Lot geometry metrics: 24 columns, 1.36 GB

| Column | Type | Null % | Stored |
|---|---|---|---|
| `all_edges_measurements` | text | 5% | 329 MB |
| `all_frontages` | text | 3% | 197 MB |
| `frontage_area_ratio` | double precision | 0% | 43 MB |
| `all_frontage_road_ids` | text | 23% | 43 MB |
| `do_depth` | double precision | 3% | 42 MB |
| `do_width` | double precision | 3% | 42 MB |
| `centroid_lat` | double precision | 5% | 41 MB |
| `centroid_lon` | double precision | 5% | 41 MB |
| `circular_compactness` | double precision | 5% | 41 MB |
| `convexity` | double precision | 5% | 41 MB |
| `corners_count` | double precision | 5% | 41 MB |
| `effective_diameter_m` | double precision | 5% | 41 MB |
| `elongation` | double precision | 5% | 41 MB |
| `equivalent_rectangular_index` | double precision | 5% | 41 MB |
| `fractal_dimension` | double precision | 5% | 41 MB |
| `longest_axis_m` | double precision | 5% | 41 MB |
| `neck_ratio` | double precision | 5% | 41 MB |
| `orientation_degrees` | double precision | 5% | 41 MB |
| `perimeter_m` | double precision | 5% | 41 MB |
| `rectangularity` | double precision | 5% | 41 MB |
| `shape_index` | double precision | 5% | 41 MB |
| `square_compactness` | double precision | 5% | 41 MB |
| `is_battleaxe` | boolean | 0% | 5 MB |
| `is_corner_lot` | boolean | 0% | 5 MB |

### Planning-proposal duplicates (*_p): 10 columns, 0.46 GB

| Column | Type | Null % | Stored |
|---|---|---|---|
| `lzn_epi_name_p` | text | 2% | 223 MB |
| `lzn_lay_class_p` | text | 2% | 116 MB |
| `lsz_lay_class_p` | text | 26% | 34 MB |
| `lsz_lay_size_p` | text | 26% | 24 MB |
| `lzn_sym_code_p` | text | 2% | 18 MB |
| `fsr_lay_class_p` | text | 62% | 18 MB |
| `lsz_sym_code_p` | text | 26% | 10 MB |
| `fsr_fsr_p` | text | 62% | 9 MB |
| `fsr_sym_code_p` | text | 62% | 5 MB |
| `fsr_label_p` | text | 62% | 5 MB |

### Low-mid-rise housing (lmr_*): 7 columns, 0.04 GB

| Column | Type | Null % | Stored |
|---|---|---|---|
| `lmr_landuse` | text | 97% | 21 MB |
| `lmr_train_stations` | text | 97% | 6 MB |
| `lmr_lotsize` | text | 97% | 4 MB |
| `lmr_fsr` | text | 97% | 3 MB |
| `lmr_lot_width` | text | 97% | 2 MB |
| `lmr_hob` | text | 97% | 2 MB |
| `lmr_sym_code` | text | 97% | 1 MB |

### Additional controls (addctrl_*): 16 columns, 0.01 GB

| Column | Type | Null % | Stored |
|---|---|---|---|
| `addctrl_fsr_clause` | text | 94% | 5 MB |
| `addctrl_hob_label` | text | 98% | 3 MB |
| `addctrl_fsr_label` | text | 93% | 3 MB |
| `addctrl_hob_clause` | text | 98% | 1 MB |
| `addctrl_ls_clause` | text | 98% | 1 MB |
| `addctrl_ls_label` | text | 98% | 1 MB |
| `addctrl_lzn_label` | text | 100% | 1 MB |
| `addctrl_ls_sym_code` | text | 98% | 0 MB |
| `addctrl_fsr_value` | text | 100% | 0 MB |
| `addctrl_stmarys_epi_name` | text | 100% | 0 MB |
| `addctrl_hob_value` | text | 100% | 0 MB |
| `addctrl_lzn_area` | text | 100% | 0 MB |
| `addctrl_ls_value` | text | 100% | 0 MB |
| `addctrl_stmarys_area` | text | 100% | 0 MB |
| `addctrl_hob_max_height_m` | text | 100% | 0 MB |
| `addctrl_ls_precinct` | text | 100% | 0 MB |

### ESA: 2 columns, 0.01 GB

| Column | Type | Null % | Stored |
|---|---|---|---|
| `esa_ref` | text | 88% | 7 MB |
| `esa_coverage_type` | text | 88% | 6 MB |

### Additional permitted uses (apu_*): 2 columns, 0.00 GB

| Column | Type | Null % | Stored |
|---|---|---|---|
| `apu_code` | text | 97% | 1 MB |
| `apu_clause` | text | 99% | 1 MB |

### Loader progress flags: 1 columns, 0.00 GB

| Column | Type | Null % | Stored |
|---|---|---|---|
| `_restore_done` | boolean | 99% | 0 MB |

## Referenced only by the `expectedSchema` contract in api.js

These appear in api.js only as keys of the schema contract that `/api/schema/validate` and the QA script check; no query selects or filters on them. They can join the candidates if `expectedSchema` is edited at the same time:

- `area_type` (text, 11 MB)
- `ass_lay_class` (text, 17 MB)
- `h_id` (text, 2 MB)
- `hob_sym_code` (double precision, 27 MB)
- `hob_units` (text, 7 MB)
- `hob_max_b_h_m` (text, 16 MB)
- `lot_size_units` (text, 16 MB)
- `fsr_sym_code` (text, 5 MB)
- `fsr_lay_class` (text, 18 MB)

## Referenced columns (keep): where each is used

Counts are whole-word occurrences per corpus.

| Column | Stored | app | api | views/fns | tooling | martin |
|---|---|---|---|---|---|---|
| `permissible_uses` | 4,769 MB | 9 | 6 |  |  |  |
| `sepps` | 579 MB | 2 | 10 |  |  |  |
| `property_description` | 512 MB | 10 | 5 | 2 | 2 |  |
| `epi_name_p` | 223 MB | 3 | 2 | 8 | 8 |  |
| `epi_name` | 213 MB | 6 | 9 | 8 | 8 |  |
| `geom` | 157 MB | 50 | 45 | 10 | 36 |  |
| `address` | 157 MB | 136 | 166 | 13 | 82 | ✓ |
| `closest_school` | 146 MB | 2 | 4 |  |  |  |
| `closest_hospital` | 142 MB | 2 | 4 |  |  |  |
| `closest_railway_station` | 140 MB | 2 | 4 |  |  |  |
| `council_name` | 129 MB | 2 | 7 |  |  |  |
| `lzn_lay_class` | 112 MB | 2 | 24 | 6 | 4 |  |
| `primary_frontage_road` | 68 MB | 1 |  |  |  |  |
| `lga_name` | 67 MB | 12 | 66 | 9 | 10 |  |
| `lot_section_plan` | 67 MB | 1 |  | 4 | 5 |  |
| `area` | 65 MB | 87 | 19 | 1 | 1 |  |
| `suburbname` | 56 MB | 27 | 62 | 16 | 30 | ✓ |
| `region_name` | 50 MB | 7 | 26 | 15 | 22 |  |
| `planlabel` | 47 MB | 21 | 10 | 2 | 4 |  |
| `closest_hospital_distance` | 43 MB | 8 | 9 | 1 | 2 |  |
| `closest_school_distance` | 43 MB | 8 | 9 | 1 | 3 |  |
| `closest_railway_station_distance` | 43 MB | 12 | 9 | 1 | 2 |  |
| `primary_frontage_length_m` | 43 MB | 5 | 6 | 1 | 1 |  |
| `width` | 42 MB | 1145 | 11 | 1 | 14 |  |
| `depth` | 42 MB | 14 | 9 | 1 | 1 |  |
| `lot_depth_m` | 42 MB | 2 | 6 | 1 | 1 |  |
| `bushfireproneland` | 41 MB | 10 | 3 | 1 | 1 |  |
| `area_sqm` | 41 MB | 6 |  | 2 | 2 |  |
| `land_value_1` | 41 MB | 1 | 2 | 1 | 1 |  |
| `walkable_score` | 39 MB | 7 | 14 | 1 | 1 |  |
| `average_slope` | 33 MB | 1 |  |  |  |  |
| `lot_size` | 32 MB | 12 | 12 | 1 | 1 |  |
| `hob_sym_code` | 27 MB |  | 2 |  |  |  |
| `hob_max_b_h` | 27 MB | 6 | 7 | 1 | 1 |  |
| `objectid` | 22 MB | 2 |  |  |  |  |
| `propid` | 22 MB | 12 | 9 | 6 | 30 | ✓ |
| `gurasid` | 22 MB | 443 | 40 | 10 | 33 | ✓ |
| `property_id` | 22 MB | 14 | 51 |  |  |  |
| `postcode` | 22 MB | 41 | 15 | 3 | 4 |  |
| `fsr_lay_class` | 18 MB |  | 2 |  |  |  |
| `lzn_label` | 18 MB | 10 | 38 | 9 | 7 |  |
| `ass_lay_class` | 17 MB |  | 2 |  |  |  |
| `fsr_fsr` | 17 MB | 10 | 20 | 2 | 2 |  |
| `hob_max_b_h_m` | 16 MB |  | 2 |  |  |  |
| `lot_size_units` | 16 MB |  | 2 |  |  |  |
| `h_name` | 14 MB | 8 | 4 | 1 | 1 |  |
| `lotnumber` | 13 MB | 20 | 9 | 1 | 2 |  |
| `estimated_price` | 11 MB | 17 | 21 | 1 | 1 |  |
| `propertyfrontagecount` | 11 MB |  | 5 | 1 | 1 |  |
| `area_type` | 11 MB |  | 2 |  |  |  |
| `biodiversity` | 10 MB | 20 | 3 | 1 | 1 |  |
| `hob_units` | 7 MB |  | 2 |  |  |  |
| `cdc_general` | 5 MB |  |  | 1 | 1 |  |
| `cdc_dual_occupancy` | 5 MB | 7 | 3 | 3 | 6 |  |
| `cdc_multi_dwelling_terraces` | 5 MB | 7 | 3 | 3 | 4 |  |
| `cdc_secondary_dwellings` | 5 MB | 7 | 3 | 3 | 4 |  |
| `cdc_dwelling_houses` | 5 MB | 7 | 3 | 3 | 4 |  |
| `cdc_manor_homes` | 5 MB | 7 | 3 | 1 | 2 |  |
| `cdc_rural_housing` | 5 MB | 7 | 3 | 2 | 3 |  |
| `cdc_inland_dwelling_houses` | 5 MB | 7 | 3 | 1 | 2 |  |
| `cdc_inland_farm_buildings` | 5 MB | 7 | 3 | 1 | 2 |  |
| `cdc_greenfield_housing` | 5 MB | 7 | 3 | 1 | 2 |  |
| `cdc_agritourism` | 5 MB | 7 | 3 | 1 | 4 |  |
| `cdc_farmstay` | 5 MB |  | 4 | 1 | 7 |  |
| `corner_lot_apt_01_4_6storeys_eligible` | 5 MB | 4 | 1 | 1 | 2 |  |
| `corner_lot_apt_02_4_6storeys_eligible` | 5 MB | 4 | 1 | 1 | 2 |  |
| `large_lot_apt_01_4storeys_eligible` | 5 MB | 4 | 1 | 1 | 2 |  |
| `large_lot_apt_01_6storeys_eligible` | 5 MB | 4 | 1 | 1 | 2 |  |
| `large_lot_apt_02_3_4storeys_eligible` | 5 MB | 4 | 1 | 1 | 2 |  |
| `large_lot_apt_02_5_6storeys_eligible` | 5 MB | 4 | 1 | 1 | 2 |  |
| `large_lot_apt_03_4_6storeys_eligible` | 5 MB | 4 | 1 | 1 | 2 |  |
| `manor_homes_01_studio_eligible` | 5 MB | 4 | 2 | 1 | 1 |  |
| `row_homes_01_saha_eligible` | 5 MB | 4 | 2 | 1 | 1 |  |
| `semis_01_anthony_gill_eligible` | 5 MB | 4 | 2 | 1 | 1 |  |
| `semis_02_sibling_eligible` | 5 MB | 4 | 2 | 1 | 1 |  |
| `small_lot_apt_01_3storeys_eligible` | 5 MB | 4 | 2 | 1 | 2 |  |
| `small_lot_apt_01_3storeys_min_eligible` | 5 MB | 4 | 2 | 1 | 1 |  |
| `small_lot_apt_01_4storeys_eligible` | 5 MB | 4 | 2 | 1 | 1 |  |
| `small_lot_apt_02_3storeys_eligible` | 5 MB | 4 | 2 | 1 | 2 |  |
| `small_lot_apt_02_4storeys_eligible` | 5 MB | 4 | 2 | 1 | 1 |  |
| `small_lot_apt_03_4_6storeys_eligible` | 5 MB | 4 | 2 | 1 | 2 |  |
| `small_lot_apt_04_4_5storeys_eligible` | 5 MB | 4 | 2 | 1 | 2 |  |
| `terraces_01_carter_eligible` | 5 MB | 4 | 2 | 1 | 3 |  |
| `terraces_02_sam_crawford_eligible` | 5 MB | 4 | 2 | 1 | 1 |  |
| `terraces_03_officer_woods_eligible` | 5 MB | 4 | 2 | 1 | 1 |  |
| `terraces_04_other_eligible` | 5 MB | 4 | 2 | 1 | 1 |  |
| `_poi_done` | 5 MB |  |  | 2 |  |  |
| `_lotsize_done` | 5 MB |  |  | 2 |  |  |
| `fsr_sym_code` | 5 MB |  | 2 |  |  |  |
| `groundwatervulnerability` | 5 MB | 22 | 3 | 1 | 1 |  |
| `fsr_label` | 5 MB | 2 | 2 |  |  |  |
| `landslidrisk` | 3 MB | 4 | 3 | 1 | 1 |  |
| `mine_subsidence_district` | 3 MB | 14 | 2 |  |  |  |
| `no_of_beds` | 2 MB | 5 | 33 | 1 | 1 |  |
| `scenicprotectionland` | 2 MB | 23 | 3 | 1 | 1 |  |
| `h_id` | 2 MB |  | 2 |  |  |  |
| `salinity` | 2 MB | 32 | 3 | 1 | 1 |  |
| `floodmapping` | 2 MB | 8 | 4 | 1 | 1 |  |
| `drinking_water_catchment` | 2 MB | 14 |  |  |  |  |
| `activestreetfrontage` | 2 MB | 8 | 3 | 1 | 1 |  |
| `ols_maximum_height` | 1 MB | 2 | 3 | 1 | 1 |  |
| `ols_minimum_height` | 1 MB |  | 3 | 1 | 1 |  |
| `buffer` | 1 MB | 6 | 2 |  | 10 |  |
| `sectionnumber` | 1 MB | 8 | 6 | 1 | 1 |  |
| `contaminationactivitytype` | 1 MB | 3 | 3 | 1 | 1 |  |
| `no_of_baths` | 1 MB | 5 | 6 | 1 | 1 |  |
| `no_of_cars` | 1 MB | 5 | 6 | 1 | 1 |  |
| `wetland` | 1 MB | 8 | 3 | 1 | 1 |  |
| `mineralresoureland` | 0 MB | 8 | 3 | 1 | 1 |  |
| `riparianlandwatercouse` | 0 MB | 8 | 3 | 1 | 1 |  |
| `australian_noise_exposure_forecast` | 0 MB | 8 | 3 | 1 | 1 |  |
| `coastalmanagement` | 0 MB | 22 | 3 | 1 | 1 |  |
| `dualoccupancy` | 0 MB | 2 |  |  |  |  |
| `normalized_address` | 0 MB |  | 11 | 4 | 8 |  |

## How to act on this

1. Data team marks each group **drop / keep / move**.
2. Apply to the **next** load, not to d_4 in place: build the narrow table as one `CREATE TABLE AS` (see "How a load should land" in `web/deploy/api/README-property-table.md`), then run `qa_property_table.py check`. Its column diff lists every drop as `WARN columns … dropped but not referenced by the API` (expected) and any drop that *is* referenced as a `FAIL` (stop).
3. Re-run this audit whenever the app or api.js changes; the inputs and script are described in the README under "Column audit".
