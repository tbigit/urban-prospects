// @ts-nocheck
// Demo mode (CTRL + SHIFT + A)
//
// Fills the Yield + Residual calculators with the canned "13 Artillery Crescent,
// Seven Hills 2147" scenario so the tool can be demonstrated without typing every
// field. Nothing is persisted until the user clicks CALCULATE RESIDUAL LAND VALUE.

import { writable } from 'svelte/store';

// Dev mode (CTRL + SHIFT + D) lives in a store rather than in <Yield>, so it
// survives closing and re-opening the yield calculator (which unmounts the
// component). Off again on a page reload.
export const devMode = writable(false);

export const DEMO_ADDRESS = '13 ARTILLERY CRESCENT SEVEN HILLS 2147';

// True for the CTRL+SHIFT+<key> demo chord (ignored while typing in a field).
// 'a' = full demo (yield inputs + residual); 'q' = residual values only.
export function isDemoShortcut(event, key = 'a') {
  if (!event || !event.ctrlKey || !event.shiftKey || event.altKey || event.metaKey) return false;
  if ((event.key || '').toLowerCase() !== key) return false;
  const t = event.target;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return false;
  return true;
}

// Yield calculator inputs for the demo scenario.
export const DEMO_YIELD = {
  developmentType: 'apartments',
  apartmentFloors: 4,
  includeStudios: false,
  studioPct: 0,
  includeAffordable: true,
  affordablePct: 15,
  circulationPct: 15,
  bedroomPct: { 1: 25, 2: 44, 3: 25, 4: 6 }
};

const DEMO_TYPE = 'Apartments - ≤10 storeys (60-70m²)';

// Residual calculator inputs for the demo scenario.
export function applyResidualDemo(user_fav, property) {
  if (!property || !property.gurasid) return user_fav;
  const id = property.gurasid;
  if (!user_fav[id]) user_fav[id] = { property_id: id };
  if (!user_fav[id].feasibility) user_fav[id].feasibility = {};
  const f = user_fav[id].feasibility;

  // Property details & yield
  property.lot_size = 1085;
  property.fsr_fsr = '';
  f.building_type = DEMO_TYPE;
  f.bonus_fsr = '15';          // <select> option values are strings
  f.final_fsr = 0;
  f.gfa = 1912;
  f.circulation_area = '15';
  f.net_floor_area = 1625.2;

  // Sales price & building costs
  f.prices = [
    { price_type: DEMO_TYPE, price_sqm: 480,  price: 120000, build_quality: 'Low', cost: 4200 },
    { price_type: DEMO_TYPE, price_sqm: 700,  price: 13000,  build_quality: 'Low', cost: 4000 },
    { price_type: DEMO_TYPE, price_sqm: 4500, price: 14000,  build_quality: 'Low', cost: 4200 },
    { price_type: DEMO_TYPE, price_sqm: 120,  price: 15000,  build_quality: 'Low', cost: 4200 }
  ];

  // Government fees and charges
  f.da_costs = 5000;
  f.developer_costs = 400000;
  f.water_costs = 40000;
  f.biodiversity_costs = 0;
  f.other_costs = 0;

  // Consulting costs (the 2.5%/5%/3% defaults, entered as .25/.05/.03)
  f.consulting_project_manager = '.25';
  f.consulting_geotech = '.25';
  f.consulting_architect_and_interior_designer = '.25';
  f.consulting_civil_engineer = '.25';
  f.consulting_engineer = '.25';
  f.consulting_pca = '.25';
  f.consulting_basix = '.25';
  f.consulting_surveyor = '.25';
  f.consulting_town_planner = '.25';
  f.consulting_traffic_engineer = '.25';
  f.consulting_3d_model = '.25';
  f.consulting_quantity_surveyor = '.25';
  f.consulting_valuer = '.25';
  f['consulting_legal_and_conveyancing_fees_(purchase_&_sales)'] = '.25';
  f.consulting_advertising_and_marketing_expenses = '.05';
  f.consulting_other = '.05';
  f.consulting_sales_commission_fees = '.03';
  f.consulting_contingency = '.05';

  // Holding costs (2-year duration)
  f.holding_years = 2;
  f.council_rates_per_quarter = 500;
  f.land_tax_per_annum = 2000;
  f.water_and_sewer_rates = 2400;
  f.accountancy = 5000;
  f.administration = 1500;
  f.insurance = 3000;

  // Additional building costs
  f.excavation_costs_sqm = 800;   f.excavation_costs = 2000;
  f.landscaping_costs_sqm = 400;  f.landscaping_costs = 1500;
  f.contingency_costs_sqm = 100;  f.contingency_costs = 2000;

  return user_fav;
}
