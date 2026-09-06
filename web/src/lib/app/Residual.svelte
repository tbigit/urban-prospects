<script>
  // @ts-nocheck
  import constructionCosts from "$lib/app/construction_costs.json";
  import { isDemoShortcut, applyResidualDemo } from '$lib/app/demoMode.js';

  export let property;
  export let user_fav = {};
  export let user_id = null;
  export let api_domain;
  export let user_email = null;
  export let user_plan = null;
  export let user_first_name = null;
  export let user_last_name = null;
  export let regions_selected = [];
  // Optional fixed-height inner scroll for the cost inputs (e.g. "37vh") when the
  // component sits inside a fixed-height panel. Left null in the property detail panel.
  export let scrollHeight = null;
  
  export let yieldIncludeAffordable = false;
  export let yieldAffordablePct = 0;
  export let yieldGfa = null;
  export let yieldResult = null;          // the yield calculator's result (with .breakdown)
  export let yieldDevelopmentType = '';   // 'apartments' | 'terraces' | 'manor-houses' | 'dual-occupancy' | 'subdivisions'
  export let yieldFloors = null;          // apartment floors/levels selected in the yield calc
  export let yieldCirculationPct = 0;     // circulation % selected in the yield calc

  let build_quality_options = ['High', 'Low'];

  let building_type_options = ['Commercial offices', 'Industrial', 'Retail', 'Mixed use', 'Shop top housing', 'Dwelling', 'Dual occupancy', 'Manor home', 'Apartments', 'Multi-dwellings', 'Affordable housing', 'Build to rent', 'Group homes', 'Social housing', 'Boarding houses'];

  let consulting_options = [
    {default: 2.5, name: 'consulting_project_manager', label: 'Project Manager'},
    {default: 2.5, name: 'consulting_geotech', label: 'Geotech'},
    {default: 2.5, name: 'consulting_architect_and_interior_designer', label: 'Architect and interior designer'},
    {default: 2.5, name: 'consulting_civil_engineer', label: 'Civil engineer'},
    {default: 2.5, name: 'consulting_engineer', label: 'Engineer'},
    {default: 2.5, name: 'consulting_pca', label: 'PCA'},
    {default: 2.5, name: 'consulting_basix', label: 'Basix'},
    {default: 2.5, name: 'consulting_surveyor', label: 'Surveyor'},
    {default: 2.5, name: 'consulting_town_planner', label: 'Town planner'},
    {default: 2.5, name: 'consulting_traffic_engineer', label: 'traffic engineer'},
    {default: 2.5, name: 'consulting_3d_model', label: '3D Model'},
    {default: 2.5, name: 'consulting_quantity_surveyor', label: 'Quantity surveyor'},
    {default: 2.5, name: 'consulting_valuer', label: 'Valuer'},
    {default: 2.5, name: 'consulting_legal_and_conveyancing_fees_(purchase_&_sales)', label: 'Legal and conveyancing fees (purchase & sales)'},
    {default: 5, name: 'consulting_advertising_and_marketing_expenses', label: 'Advertising and Marketing expenses'},
    {default: 5, name: 'consulting_other', label: 'Other'},
    {default: 3, name: 'consulting_sales_commission_fees', label: 'Sales commission fees'},
    {default: 5, name: 'consulting_contingency', label: 'Contingency'}
  ];

  // Ensure the feasibility/CRM object exists for the current property so the form
  // can bind safely. This only sets up local state — nothing is persisted until the
  // user clicks CALCULATE (which calls _update_feasibility). Pipeline status now lives
  // in the dedicated "My Pipeline" section of the property detail panel.
  let _initedFor = null;
  $: if (property && property.gurasid && property.gurasid !== _initedFor) {
    _initedFor = property.gurasid;
    ensureFeasibility(property.gurasid);
  }
  
  // Reactively default Bonus FSR + Final FSR (from the Yield affordable-housing %)
  // and GFA (from the property's GFA). Each is only set when the user hasn't already
  // entered/saved a value, so saved feasibilities are never overwritten. The `changed`
  // guard prevents the reassignment from re-triggering this block indefinitely.
  $: if (property && property.gurasid && user_fav[property.gurasid]?.feasibility) {
    const f = user_fav[property.gurasid].feasibility;
    let changed = false;

    if (yieldIncludeAffordable && yieldAffordablePct > 0 && !f.bonus_fsr) {
      f.bonus_fsr = yieldAffordablePct;
      changed = true;
    }

    if (!f.final_fsr) {
      const baseFsr = parseFloat(property.fsr_fsr) || 0;
      if (baseFsr) {
        const bonus = parseFloat(f.bonus_fsr) || 0;
        f.final_fsr = baseFsr + bonus * 0.01 * baseFsr;
        changed = true;
      }
    }

    if (!f.gfa && yieldGfa) {
      f.gfa = yieldGfa;
      changed = true;
    }

    if (!f.circulation_area && yieldCirculationPct > 0) {
      f.circulation_area = yieldCirculationPct;
      changed = true;
    }

    if (changed) user_fav = user_fav;
  }

  function ensureFeasibility(id) {
    if (!user_fav[id]) {
      user_fav[id] = {
        status: '', comments: '', emailed: false, mailed: false,
        user_id, property_id: id, user_email, user_plan, user_first_name, user_last_name
      };
    }
    if (!user_fav[id].feasibility) {
      user_fav[id].feasibility = {};
    }
    
    if (!user_fav[id].feasibility.gfa) {
      if (yieldGfa !== null && yieldGfa > 0) {
        user_fav[id].feasibility.gfa = Math.round(yieldGfa);
      } else {
        let areaVal = property?.area ? parseFloat(property.area) : (property?.area_sqm ? parseFloat(property.area_sqm) : 0);
        user_fav[id].feasibility.gfa = Math.round(areaVal);
      }
    }
    
    if (yieldIncludeAffordable && !user_fav[id].feasibility.bonus_fsr) {
      user_fav[id].feasibility.bonus_fsr = yieldAffordablePct;
    }

    if (!(user_fav[id].feasibility.prices && user_fav[id].feasibility.prices.length)) {
      user_fav[id].feasibility.prices = [{}];
      user_fav[id].feasibility.holding_years = (user_fav[id].feasibility.holding_years || 2);
      user_fav[id].feasibility.profit_margin = (user_fav[id].feasibility.profit_margin || 20);
      user_fav[id].feasibility.stamp_duty = (user_fav[id].feasibility.stamp_duty || 0.05);
      consulting_options.forEach((consulting) => {
        user_fav[id].feasibility[consulting.name] = consulting.default;
      });
    }
    user_fav = user_fav;
  }

  // ---- Pre-fill "Sales Price & Building Costs" from a yield calculation ----
  // When the user has run a yield calc but not yet a residual one (no final_total)
  // and the price rows are still empty, seed them from the yield dwelling mix:
  // matched building-cost line + total floor area (m²) + $/m² construction cost.
  // The sale price ($/m²) is left blank for the user to enter.

  // Map a yield development type + dwelling type + storeys to the best cost line.
  function matchCostItem(devType, typeId, floors, items) {
    if (devType === 'apartments' || devType === 'build-to-rent') {
      const f = parseInt(floors) || 1;
      if (f <= 2) {
        return items.find(i => i.type === 'Apartments' && /without lift/i.test(i.name))
            || items.find(i => i.type === 'Apartments');
      }
      let storey;
      if (f <= 10) storey = '≤10 storeys';      // ≤10 storeys
      else if (f <= 20) storey = '10-20 storeys';
      else if (f <= 40) storey = '20-40 storeys';
      else storey = '40-80 storeys';
      const beds = (typeId === 'studio') ? 1 : (parseInt(typeId) || 2);
      const size = beds >= 3 ? '90-120' : '60-70';   // 3+ bed -> larger unit, else 2-bed unit
      return items.find(i => i.type === 'Apartments' && i.name.includes(storey) && i.name.includes(size))
          || items.find(i => i.type === 'Apartments' && i.name.includes(storey))
          || items.find(i => i.type === 'Apartments');
    }
    if (devType === 'dual-occupancy') {
      return items.find(i => i.type === 'Residential' && /house/i.test(i.name))
          || items.find(i => i.type === 'Residential');
    }
    // terraces / manor-houses -> multi-dwelling residential (townhouses)
    return items.find(i => i.type === 'Residential' && /townhouse/i.test(i.name))
        || items.find(i => i.type === 'Residential' && /house/i.test(i.name))
        || items.find(i => i.type === 'Residential');
  }

  function buildPricesFromYield() {
    if (!yieldDevelopmentType) return null;
    const region = getPropertyRegion();
    const items = constructionCosts[region] || [];
    const groups = new Map(); // "type - name" -> { item, area }

    if (yieldDevelopmentType === 'subdivisions') {
      const item = items.find(i => i.type === 'Subdivisions' && /residential/i.test(i.name))
        || items.find(i => i.type === 'Subdivisions');
      if (item) groups.set(`${item.type} - ${item.name}`, { item, area: 0 });
    } else if (yieldResult && Array.isArray(yieldResult.breakdown)) {
      for (const b of yieldResult.breakdown) {
        if (!b || !b.count || b.count <= 0) continue;
        const item = matchCostItem(yieldDevelopmentType, b.typeId, yieldFloors, items);
        if (!item) continue;
        const key = `${item.type} - ${item.name}`;
        const area = (b.areaUsed != null && b.areaUsed > 0)
          ? b.areaUsed
          : (b.count * (b.areaPerDwelling || b.minSize || 0));
        const g = groups.get(key);
        if (g) g.area += area; else groups.set(key, { item, area });
      }
    }

    if (groups.size === 0) return null;
    return [...groups.values()].map(({ item, area }) => {
      const key = `${item.type} - ${item.name}`;
      return {
        price_type: key,
        price_sqm: area ? Math.round(area) : '',
        price: '',
        build_quality: 'High',
        cost: getConstructionCost(key, 'High', region),
      };
    });
  }

  // Best single building-type ("type - name", a getBuildingTypeGroups option) for the
  // yield development type — uses the dominant dwelling group for apartments.
  function bestBuildingType() {
    if (!yieldDevelopmentType) return null;
    const region = getPropertyRegion();
    const items = constructionCosts[region] || [];
    if (yieldDevelopmentType === 'subdivisions') {
      const it = items.find(i => i.type === 'Subdivisions' && /residential/i.test(i.name))
        || items.find(i => i.type === 'Subdivisions');
      return it ? `${it.type} - ${it.name}` : null;
    }
    let dominantTypeId = null;
    if (yieldResult && Array.isArray(yieldResult.breakdown)) {
      let maxArea = -1;
      for (const b of yieldResult.breakdown) {
        if (!b || !b.count || b.count <= 0) continue;
        const area = (b.areaUsed != null && b.areaUsed > 0)
          ? b.areaUsed
          : (b.count * (b.areaPerDwelling || b.minSize || 0));
        if (area > maxArea) { maxArea = area; dominantTypeId = b.typeId; }
      }
    }
    const it = matchCostItem(yieldDevelopmentType, dominantTypeId, yieldFloors, items);
    return it ? `${it.type} - ${it.name}` : null;
  }

  // Defaults the Building Type (whenever empty) and seeds the price rows once.
  // (Args are passed purely so Svelte re-runs the block when the yield inputs change.)
  let _prefilledFor = null;
  $: maybePrefillFromYield(property, yieldResult, yieldDevelopmentType, yieldFloors, user_fav);

  function maybePrefillFromYield() {
    if (!property || !property.gurasid) return;
    const fav = user_fav[property.gurasid];
    if (!fav || !fav.feasibility) return;
    const f = fav.feasibility;
    let changed = false;

    // Pre-populate the Building Type from the yield development type (only when empty).
    if (!f.building_type) {
      const bt = bestBuildingType();
      if (bt) { f.building_type = bt; changed = true; }
    }

    // Seed Sales Price & Building Costs once: only when no residual result yet and the
    // rows are still empty (never clobber existing data).
    if (property.gurasid !== _prefilledFor) {
      const p = f.prices;
      const pricesEmpty = !p || p.length === 0
        || (p.length === 1 && !p[0].price_type && !p[0].price && !p[0].cost && !p[0].price_sqm);
      if (f.final_total || !pricesEmpty) {
        _prefilledFor = property.gurasid;
      } else {
        const yp = buildPricesFromYield();
        if (yp && yp.length) {
          f.prices = yp;
          _prefilledFor = property.gurasid;
          changed = true;
        }
      }
    }

    if (changed) user_fav = user_fav;
  }

  function getBuildingTypesByRegion(region) {
    if (!region || !constructionCosts[region]) {
      return building_type_options;
    }
    const types = constructionCosts[region].map(item => item.name);
    return types.length > 0 ? types : building_type_options;
  }

  function getBuildingTypeGroups(region) {
    if (!region || !constructionCosts[region]) {
      return [];
    }
    return constructionCosts[region].map(item => item.type + ' - ' + item.name);
  }

  function getConstructionCost(buildingTypeName, quality, region) {
    if (!region || !constructionCosts[region] || !buildingTypeName || !quality) {
      return 0;
    }
    const item = constructionCosts[region].find(i => (i.type + ' - ' + i.name) === buildingTypeName);
    if (!item) return 0;
    return quality === 'High' ? item.high : item.low;
  }

  function getPropertyRegion(prop = property, regions = regions_selected) {
    if (prop && prop.region_name) {
      return prop.region_name;
    }
    if (prop && prop.postcode) {
      const postcode = parseInt(prop.postcode);
      if (postcode >= 2000 && postcode <= 2999) return 'Sydney';
    }
    if (regions && regions.length === 1) {
      return regions[0];
    }
    return 'Sydney';
  }

  // Reactive region used by the building-type dropdowns.
  $: region = getPropertyRegion(property, regions_selected);

  function updateConstructionCost(priceIndex) {
    setTimeout(() => {
      const r = getPropertyRegion();
      const buildingType = user_fav[property.gurasid].feasibility.prices[priceIndex].price_type;
      const quality = user_fav[property.gurasid].feasibility.prices[priceIndex].build_quality;
      const cost = getConstructionCost(buildingType, quality, r);
      user_fav[property.gurasid].feasibility.prices[priceIndex].cost = cost;
      user_fav = user_fav;
    }, 100);
  }

  function formatCurrency(value) {
    return (Math.round(value * 100) / 100).toFixed(2);
  }

  function roundToTwoDecimals(num) {
    num = parseFloat(num);
    if (!num) {
      num = 0;
    }
    return (Math.round(num * 100) / 100);
  }

  const formatNiceCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  async function _handle_add_price(event) {
    if (event) event.preventDefault();
    user_fav[property.gurasid].feasibility.prices = user_fav[property.gurasid].feasibility.prices.concat({});
    user_fav = user_fav;
  }

  // Demo mode (CTRL + SHIFT + A): load the canned demo feasibility for the open
  // property. Also handled by <Yield>, which fills the yield inputs at the same
  // time; this listener covers the standalone residual panel.
  function handleDemoShortcut(event) {
    if (!isDemoShortcut(event) && !isDemoShortcut(event, 'q')) return;
    event.preventDefault();
    _prefilledFor = property && property.gurasid;   // don't re-seed prices from the yield calc
    user_fav = applyResidualDemo(user_fav, property);
  }

  async function _handle_calculate(event) {
    if (event) event.preventDefault();

    const fsr = parseFloat(property.fsr_fsr) || 0;
    const bonusFsr = parseFloat(user_fav[property.gurasid].feasibility.bonus_fsr) || 0;
    const lotSize = parseFloat(property.lot_size) || 0;

    let calcFinalFsr = fsr + bonusFsr * 0.01 * fsr;
    if (calcFinalFsr > 0 || !user_fav[property.gurasid].feasibility.final_fsr) {
      user_fav[property.gurasid].feasibility.final_fsr = calcFinalFsr;
    }

    let calculatedGfa = user_fav[property.gurasid].feasibility.final_fsr * lotSize;
    if (!user_fav[property.gurasid].feasibility.gfa) {
      if (calculatedGfa > 0) {
        user_fav[property.gurasid].feasibility.gfa = Math.round(calculatedGfa);
      } else {
        let areaVal = property?.area ? parseFloat(property.area) : (property?.area_sqm ? parseFloat(property.area_sqm) : 0);
        user_fav[property.gurasid].feasibility.gfa = Math.round(areaVal);
      }
    }

    const circulation = parseFloat(user_fav[property.gurasid].feasibility.circulation_area) || 0;
    user_fav[property.gurasid].feasibility.net_floor_area = roundToTwoDecimals(user_fav[property.gurasid].feasibility.gfa * (100 - circulation) * 0.01);

    user_fav[property.gurasid].feasibility.price_total = 0;
    user_fav[property.gurasid].feasibility.prices.forEach((price, i) => {
      user_fav[property.gurasid].feasibility.prices[i].price_subtotal = roundToTwoDecimals((user_fav[property.gurasid].feasibility.prices[i].price_sqm || 0) * (user_fav[property.gurasid].feasibility.prices[i].price || 0));
      user_fav[property.gurasid].feasibility.price_total += user_fav[property.gurasid].feasibility.prices[i].price_subtotal;
    });

    user_fav[property.gurasid].feasibility.cost_total = 0;
    user_fav[property.gurasid].feasibility.prices.forEach((price, i) => {
      user_fav[property.gurasid].feasibility.cost_total += roundToTwoDecimals((user_fav[property.gurasid].feasibility.prices[i].price_sqm || 0) * (user_fav[property.gurasid].feasibility.prices[i].cost || 0));
    });

    user_fav[property.gurasid].feasibility.excavation_subtotal = roundToTwoDecimals((user_fav[property.gurasid].feasibility.excavation_costs_sqm || 0) * (user_fav[property.gurasid].feasibility.excavation_costs || 0));
    user_fav[property.gurasid].feasibility.landscaping_subtotal = roundToTwoDecimals((user_fav[property.gurasid].feasibility.landscaping_costs_sqm || 0) * (user_fav[property.gurasid].feasibility.landscaping_costs || 0));
    user_fav[property.gurasid].feasibility.contingency_subtotal = roundToTwoDecimals((user_fav[property.gurasid].feasibility.contingency_costs_sqm || 0) * (user_fav[property.gurasid].feasibility.contingency_costs || 0));

    user_fav[property.gurasid].feasibility.cost_total += roundToTwoDecimals(user_fav[property.gurasid].feasibility.excavation_subtotal) + roundToTwoDecimals(user_fav[property.gurasid].feasibility.landscaping_subtotal) + roundToTwoDecimals(user_fav[property.gurasid].feasibility.contingency_subtotal);

    user_fav[property.gurasid].feasibility.fees_total =
      roundToTwoDecimals(user_fav[property.gurasid].feasibility.da_costs) +
      roundToTwoDecimals(user_fav[property.gurasid].feasibility.developer_costs) +
      roundToTwoDecimals(user_fav[property.gurasid].feasibility.water_costs) +
      roundToTwoDecimals(user_fav[property.gurasid].feasibility.biodiversity_costs) +
      roundToTwoDecimals(user_fav[property.gurasid].feasibility.other_costs);

    let building_cost = user_fav[property.gurasid].feasibility.cost_total || 0;

    user_fav[property.gurasid].feasibility.consulting_costs_total = 0;
    consulting_options.forEach((consulting, i) => {
      user_fav[property.gurasid].feasibility[consulting.name + '_subtotal'] = roundToTwoDecimals(user_fav[property.gurasid].feasibility[consulting.name] * building_cost);
      user_fav[property.gurasid].feasibility.consulting_costs_total += user_fav[property.gurasid].feasibility[consulting.name + '_subtotal'];
    });

    user_fav[property.gurasid].feasibility.holding_costs_total = 0;
    user_fav[property.gurasid].feasibility.council_rates_per_quarter_subtotal = user_fav[property.gurasid].feasibility.council_rates_per_quarter * user_fav[property.gurasid].feasibility.holding_years * 4;
    user_fav[property.gurasid].feasibility.land_tax_per_annum_subtotal = user_fav[property.gurasid].feasibility.land_tax_per_annum * user_fav[property.gurasid].feasibility.holding_years;
    user_fav[property.gurasid].feasibility.water_and_sewer_rates_subtotal = user_fav[property.gurasid].feasibility.water_and_sewer_rates * user_fav[property.gurasid].feasibility.holding_years;
    user_fav[property.gurasid].feasibility.accountancy_subtotal = user_fav[property.gurasid].feasibility.accountancy * user_fav[property.gurasid].feasibility.holding_years;
    user_fav[property.gurasid].feasibility.administration_subtotal = user_fav[property.gurasid].feasibility.administration * user_fav[property.gurasid].feasibility.holding_years;
    user_fav[property.gurasid].feasibility.insurance_subtotal = user_fav[property.gurasid].feasibility.insurance * user_fav[property.gurasid].feasibility.holding_years;
    user_fav[property.gurasid].feasibility.holding_other_subtotal = user_fav[property.gurasid].feasibility.holding_other * user_fav[property.gurasid].feasibility.holding_years;

    user_fav[property.gurasid].feasibility.holding_costs_total = roundToTwoDecimals(user_fav[property.gurasid].feasibility.council_rates_per_quarter_subtotal) +
      roundToTwoDecimals(user_fav[property.gurasid].feasibility.land_tax_per_annum_subtotal) +
      roundToTwoDecimals(user_fav[property.gurasid].feasibility.water_and_sewer_rates_subtotal) +
      roundToTwoDecimals(user_fav[property.gurasid].feasibility.accountancy_subtotal) +
      roundToTwoDecimals(user_fav[property.gurasid].feasibility.administration_subtotal) +
      roundToTwoDecimals(user_fav[property.gurasid].feasibility.insurance_subtotal) +
      roundToTwoDecimals(user_fav[property.gurasid].feasibility.holding_other_subtotal);

    user_fav[property.gurasid].feasibility.residual_land_value = roundToTwoDecimals(
      (
        (user_fav[property.gurasid].feasibility.price_total || 0) - (user_fav[property.gurasid].feasibility.cost_total - 0) - (user_fav[property.gurasid].feasibility.fees_total - 0) - (user_fav[property.gurasid].feasibility.consulting_costs_total || 0) - (user_fav[property.gurasid].feasibility.holding_costs_total || 0)
      ) * (( 100 - user_fav[property.gurasid].feasibility.profit_margin) / 100)
    );

    let stamp_duty_and_interest_payments = roundToTwoDecimals((user_fav[property.gurasid].feasibility.stamp_duty / 100 * user_fav[property.gurasid].feasibility.residual_land_value));

    user_fav[property.gurasid].feasibility.final_total = (user_fav[property.gurasid].feasibility.residual_land_value || 0) - stamp_duty_and_interest_payments - roundToTwoDecimals(user_fav[property.gurasid].feasibility.interest_payments);

    user_fav = user_fav;

    _update_feasibility(user_fav[property.gurasid].feasibility, user_id, property.gurasid);
  }

  async function _update_feasibility(feasibility, user_id, gurasid) {
    if (feasibility && user_id && gurasid) {
      await fetch(`${api_domain}/feasibility`, {
        method: 'POST',
        cache: "no-cache",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({"feasibility": feasibility, "user_id": user_id, "property_id": gurasid})
      }).then(feasibility_response => feasibility_response.json()).catch(function(){});
    }
  }

  // Residual value vs AVM colouring: green when above the AVM, red when below,
  // black when the property has no AVM (estimated_price).
  $: avmValue = (property && property.estimated_price !== undefined && property.estimated_price !== null && property.estimated_price !== '')
    ? parseFloat(property.estimated_price)
    : null;
  $: finalTotal = (user_fav && property && user_fav[property.gurasid] && user_fav[property.gurasid].feasibility)
    ? (user_fav[property.gurasid].feasibility.final_total || 0)
    : 0;
  $: residualColour = (avmValue === null || isNaN(avmValue))
    ? '#111111'
    : (finalTotal > avmValue ? '#388E3C' : (finalTotal < avmValue ? '#EF5350' : '#111111'));
</script>

<svelte:window on:keydown={handleDemoShortcut} />


<div class="residual-calculator">
  {#if property && property.gurasid && user_fav[property.gurasid] && user_fav[property.gurasid].feasibility}

    <!-- PROPERTY DETAILS & YIELD (yield results) -->
    <div class="padding-bottom-thin">
      <h5>Property Details &amp; Yield</h5>
    </div>

    <div class="flex" style="gap:0.5em;">
      <div class="half padding-top-thin"><div class="padding-bottom-thinner"><h6 class="h6-f">Building Type</h6></div>
      <div class="select-container relative">
        <select bind:value={user_fav[property.gurasid].feasibility.building_type}>
          <option value="">Select:</option>
          {#each getBuildingTypeGroups(region) as name}
            <option value="{name}">{name}</option>
          {/each}
        </select>
        <div class="absolute center-right select-arrow shift-up-more padding-right-thin unclickable">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path fill="#5C2587" d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"></path></svg>
        </div>
      </div>
    </div>
      <div class="half padding-top-thin"><div class="padding-bottom-thinner"><h6 class="h6-f">Area of Land</h6></div><input bind:value={property.lot_size} placeholder="" type="text"></div>
    </div>
    <div class="flex" style="gap:0.5em;">
      <div class="half padding-top-thin"><div class="padding-bottom-thinner"><h6 class="h6-f">FSR</h6></div><input bind:value={property.fsr_fsr} placeholder="" type="text"></div>
      <div class="half padding-top-thin"><div class="padding-bottom-thinner"><h6 class="h6-f">Bonus FSR (%)</h6></div>
        <div class="select-container relative">
          <select bind:value={user_fav[property.gurasid].feasibility.bonus_fsr}>
            <option value="">Select:</option>
            {#each [...Array(100).keys()].map(i => i + 1) as option}
              <option value="{option}">{option}%</option>
            {/each}
          </select>
          <div class="absolute center-right select-arrow shift-up-more padding-right-thin unclickable">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path fill="#5C2587" d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"></path></svg>
          </div>
        </div>
      </div>
    </div>

    <div class="flex" style="gap:0.5em;">
      <div class="half padding-top-thin"><div class="padding-bottom-thinner"><h6 class="h6-f">Final FSR</h6></div><input bind:value={user_fav[property.gurasid].feasibility.final_fsr} placeholder="" type="text"></div>
      <div class="half padding-top-thin"><div class="padding-bottom-thinner"><h6 class="h6-f">GFA</h6></div><input bind:value={user_fav[property.gurasid].feasibility.gfa} placeholder="" type="text"></div>
    </div>

    <div class="flex" style="gap:0.5em;">
      <div class="half padding-top-thin"><div class="padding-bottom-thinner"><h6 class="h6-f">Circulation area</h6></div>
      <div class="select-container relative">
          <select bind:value={user_fav[property.gurasid].feasibility.circulation_area}>
            <option value="">Select:</option>
            {#each [...Array(100).keys()].map(i => i + 1) as option}
              <option value="{option}">{option}%</option>
            {/each}
          </select>
          <div class="absolute center-right select-arrow shift-up-more padding-right-thin unclickable">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path fill="#5C2587" d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"></path></svg>
          </div>
        </div>
    </div>
      <div class="half padding-top-thin"><div class="padding-bottom-thinner"><h6 class="h6-f">Net floor area</h6></div><input bind:value={user_fav[property.gurasid].feasibility.net_floor_area} placeholder="" type="text"></div>
    </div>

    <!-- COST INPUTS -->
    <div class="padding-top" style={scrollHeight ? `height:${scrollHeight};overflow-y:auto;` : ''}>

      <div class="flex">
        <div class="full">
          <h5>Sales Price & Building Costs</h5>
        </div>
        <div class="row right">
          <a class="btn center" href="?" on:click={_handle_add_price}><i class=" icon-plus"></i> Add</a>
        </div>
      </div>

      <div class="flex" style="gap:0.5em;margin-bottom: 0.5em;">
        <div class="one-quarter padding-top-thin" style="min-width: 120px"><div class="padding-bottom-thinner"><h6 class="h6-f">Type</h6></div></div>
        <div class="one-sixth padding-top-thin"><div class="padding-bottom-thinner"><h6 class="h6-f">No. / Area</h6></div></div>
        <div class="one-quarter padding-top-thin"><div class="padding-bottom-thinner"><h6 class="h6-f">Sale<br/>Price</h6></div></div>
        <div class="one-sixth padding-top-thin" style="min-width: 55px"><div class="padding-bottom-thinner"><h6 class="h6-f">Building<br/>Quality</h6></div></div>
        <div class="one-quarter padding-top-thin"><div class="padding-bottom-thinner"><h6 class="h6-f">Construction<br>Cost / m²</h6></div></div>
        <div class="one-quarter padding-top-thin right"><div class="padding-bottom-thinner"><h6 class="h6-f">Total</h6></div></div>
      </div>

      {#each user_fav[property.gurasid].feasibility.prices as price, price_index}
      <div class="flex" style="gap:0.5em;padding-bottom:0.25em;">
        <div class="one-quarter" style="min-width: 120px"><div class="padding-bottom-thinner vertical-center"><div class="select-container relative">
          <select on:change={() => updateConstructionCost(price_index)} bind:value={user_fav[property.gurasid].feasibility.prices[price_index].price_type}>
            <option value="">Select:</option>
            {#each getBuildingTypeGroups(region) as name}
              <option value="{name}">{name}</option>
            {/each}
          </select>
          <div class="absolute center-right select-arrow shift-up-more padding-right-thin unclickable">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path fill="#5C2587" d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"></path></svg>
          </div>
        </div></div></div>
        <div class="one-sixth"><div class="padding-bottom-thinner"><input bind:value={user_fav[property.gurasid].feasibility.prices[price_index].price_sqm} placeholder="" type="text"></div></div>
        <div class="one-quarter"><div class="padding-bottom-thinner"><input bind:value={user_fav[property.gurasid].feasibility.prices[price_index].price} placeholder="" type="text"></div></div>

        <div class="one-sixth"  style="min-width: 55px"><div class="padding-bottom-thinner vertical-center"><div class="select-container relative">
          <select on:change={() => updateConstructionCost(price_index)} bind:value={user_fav[property.gurasid].feasibility.prices[price_index].build_quality}>
            <option value="">Select:</option>
            {#each build_quality_options as option}
              <option>{option}</option>
            {/each}
          </select>
          <div class="absolute center-right select-arrow shift-up-more padding-right-thin unclickable">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path fill="#5C2587" d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"></path></svg>
          </div>
        </div></div></div>

        <div class="one-quarter"><div class="padding-bottom-thinner"><input bind:value={user_fav[property.gurasid].feasibility.prices[price_index].cost} placeholder="" type="text"></div></div>

        <div class="one-quarter">
          <div class="padding-bottom-thinner vertical-center">
            <div class="flex">
              <div class="full right"><h6 class="h6-f">${formatCurrency(user_fav[property.gurasid].feasibility.prices[price_index].price_subtotal || 0)}</h6></div>
            </div>
          </div>
        </div>
      </div>
      {/each}

      <div class="flex" style="gap:0.5em;border-top:1px solid var(--up-c-f1e9f7);margin-bottom: 0.5em;">
        <div class="two-third padding-top-thin"><div class="padding-bottom-thinner vertical-center row right"><h6 class="h6-f">Subtotal:</h6></div></div>
        <div class="right one-third padding-top-thin"><div class="padding-bottom-thinner"><h6 class="h6-f">${formatCurrency(user_fav[property.gurasid].feasibility.price_total || 0)}</h6></div></div>
      </div>

      <!-- START building-cost -->
      <div class="flex padding-bottom-thin">
        <div class="full">
          <h5>Additional Building Costs</h5>
        </div>
      </div>

      <div class="flex" style="gap:0.5em;border-bottom:1px solid var(--up-c-f1e9f7);margin-bottom: 0.5em;">
        <div class="full"><div class="padding-bottom-thinner"><h6 class="h6-f">Type</h6></div></div>
        <div class="one-sixth padding-top-thin"><div class="padding-bottom-thinner"><h6 class="h6-f">No. / Area</h6></div></div>
        <div class="one-sixth padding-top-thin"><div class="padding-bottom-thinner"><h6 class="h6-f">Cost / sqm</h6></div></div>
        <div class="one-sixth padding-top-thin right"><div class="padding-bottom-thinner"><h6 class="h6-f">Total</h6></div></div>
      </div>

      <div class="flex" style="gap:0.5em;margin-bottom: 0.25em;">
        <div class="full"><div class="padding-bottom-thinner vertical-center"><h6 class="h6-f">Excavation costs</h6></div></div>
        <div class="one-sixth"><div class="padding-bottom-thinner"><input bind:value={user_fav[property.gurasid].feasibility.excavation_costs_sqm} placeholder="" type="text"></div></div>
        <div class="one-sixth"><div class="padding-bottom-thinner"><input bind:value={user_fav[property.gurasid].feasibility.excavation_costs} placeholder="" type="text"></div></div>
        <div class="one-sixth right padding-top-thin"><div class="padding-bottom-thinner"><h6 class="h6-f">${formatCurrency(user_fav[property.gurasid].feasibility.excavation_subtotal || 0)}</h6></div></div>
      </div>

      <div class="flex" style="gap:0.5em;margin-bottom: 0.25em;">
        <div class="full"><div class="padding-bottom-thinner vertical-center"><h6 class="h6-f">Landscaping</h6></div></div>
        <div class="one-sixth"><div class="padding-bottom-thinner"><input bind:value={user_fav[property.gurasid].feasibility.landscaping_costs_sqm} placeholder="" type="text"></div></div>
        <div class="one-sixth"><div class="padding-bottom-thinner"><input bind:value={user_fav[property.gurasid].feasibility.landscaping_costs} placeholder="" type="text"></div></div>
        <div class="one-sixth right padding-top-thin"><div class="padding-bottom-thinner"><h6 class="h6-f">${formatCurrency(user_fav[property.gurasid].feasibility.landscaping_subtotal || 0)}</h6></div></div>
      </div>

      <div class="flex" style="gap:0.5em;margin-bottom: 0.25em;">
        <div class="full"><div class="padding-bottom-thinner vertical-center"><h6 class="h6-f">Contingency</h6></div></div>
        <div class="one-sixth"><div class="padding-bottom-thinner"><input bind:value={user_fav[property.gurasid].feasibility.contingency_costs_sqm} placeholder="" type="text"></div></div>
        <div class="one-sixth"><div class="padding-bottom-thinner"><input bind:value={user_fav[property.gurasid].feasibility.contingency_costs} placeholder="" type="text"></div></div>
        <div class="one-sixth right padding-top-thin"><div class="padding-bottom-thinner"><h6 class="h6-f">${formatCurrency(user_fav[property.gurasid].feasibility.contingency_subtotal || 0)}</h6></div></div>
      </div>

      <div class="flex" style="gap:0.5em;border-top:1px solid var(--up-c-f1e9f7);margin-bottom: 0.5em;">
        <div class="two-third padding-top-thin"><div class="padding-bottom-thinner vertical-center row right"><h6 class="h6-f">Subtotal:</h6></div></div>
        <div class="right one-third padding-top-thin"><div class="padding-bottom-thinner"><h6 class="h6-f">${formatCurrency(user_fav[property.gurasid].feasibility.cost_total || 0)}</h6></div></div>
      </div>
      <!-- END building-cost -->

      <!-- START building-fee -->
      <div class="flex padding-bottom-thin">
        <div class="full">
          <h5>Government Fees and Charges</h5>
        </div>
      </div>

      <div class="flex" style="gap:0.5em;border-bottom:1px solid var(--up-c-f1e9f7);margin-bottom: 0.5em;">
        <div class="full"><div class="padding-bottom-thinner"><h6 class="h6-f">Type</h6></div></div>
        <div class="one-sixth padding-top-thin"><div class="padding-bottom-thinner"><h6 class="h6-f">Fees</h6></div></div>
      </div>

      <div class="flex" style="gap:0.5em;margin-bottom: 0.25em;">
        <div class="full"><div class="padding-bottom-thinner vertical-center"><h6 class="h6-f">DA Fees</h6></div></div>
        <div class="one-sixth"><div class="padding-bottom-thinner"><input bind:value={user_fav[property.gurasid].feasibility.da_costs} placeholder="" type="text"></div></div>
      </div>

      <div class="flex" style="gap:0.5em;margin-bottom: 0.25em;">
        <div class="full"><div class="padding-bottom-thinner vertical-center"><h6 class="h6-f">Developer Contributions</h6></div></div>
        <div class="one-sixth"><div class="padding-bottom-thinner"><input bind:value={user_fav[property.gurasid].feasibility.developer_costs} placeholder="" type="text"></div></div>
      </div>

      <div class="flex" style="gap:0.5em;margin-bottom: 0.25em;">
        <div class="full"><div class="padding-bottom-thinner vertical-center"><h6 class="h6-f">Sydney Water Contribution</h6></div></div>
        <div class="one-sixth"><div class="padding-bottom-thinner"><input bind:value={user_fav[property.gurasid].feasibility.water_costs} placeholder="" type="text"></div></div>
      </div>

      <div class="flex" style="gap:0.5em;margin-bottom: 0.25em;">
        <div class="full"><div class="padding-bottom-thinner vertical-center"><h6 class="h6-f">Biodiversity offsets</h6></div></div>
        <div class="one-sixth"><div class="padding-bottom-thinner"><input bind:value={user_fav[property.gurasid].feasibility.biodiversity_costs} placeholder="" type="text"></div></div>
      </div>

      <div class="flex" style="gap:0.5em;margin-bottom: 0.25em;">
        <div class="full"><div class="padding-bottom-thinner vertical-center"><h6 class="h6-f">Other</h6></div></div>
        <div class="one-sixth"><div class="padding-bottom-thinner"><input bind:value={user_fav[property.gurasid].feasibility.other_costs} placeholder="" type="text"></div></div>
      </div>

      <div class="flex" style="gap:0.5em;border-top:1px solid var(--up-c-f1e9f7);margin-bottom: 0.5em;">
        <div class="two-third padding-top-thin"><div class="padding-bottom-thinner vertical-center row right"><h6 class="h6-f">Subtotal:</h6></div></div>
        <div class="right one-third padding-top-thin"><div class="padding-bottom-thinner"><h6 class="h6-f">${formatCurrency(user_fav[property.gurasid].feasibility.fees_total || 0)}</h6></div></div>
      </div>
      <!-- END building-fee -->

      <!-- START consulting-cost -->
      <div class="flex padding-bottom-thin">
        <div class="full">
          <h5>Consultants</h5>
        </div>
      </div>

      <div class="flex" style="gap:0.5em;border-bottom:1px solid var(--up-c-f1e9f7);margin-bottom: 0.5em;">
        <div class="full"><div class="padding-bottom-thinner"><h6 class="h6-f">Type</h6></div></div>
        <div class="one-sixth padding-top-thin"><div class="padding-bottom-thinner"><h6 class="h6-f">%</h6></div></div>
        <div class="one-sixth padding-top-thin right"><div class="padding-bottom-thinner"><h6 class="h6-f">Total</h6></div></div>
      </div>

      {#each consulting_options as consulting}
      <div class="flex" style="gap:0.5em;margin-bottom: 0.25em;">
        <div class="full"><div class="padding-bottom-thinner vertical-center"><h6 class="h6-f">{consulting.label}</h6></div></div>
        <div class="one-sixth"><div class="padding-bottom-thinner"><input maxlength="6" bind:value={user_fav[property.gurasid].feasibility[consulting.name]} placeholder="" type="text"></div></div>
        <div class="one-sixth right padding-top-thin"><div class="padding-bottom-thinner"><h6 class="h6-f">${formatCurrency(user_fav[property.gurasid].feasibility[consulting.name + '_subtotal'] || 0)}</h6></div></div>
      </div>
      {/each}

      <div class="flex" style="gap:0.5em;border-top:1px solid var(--up-c-f1e9f7);margin-bottom: 0.5em;">
        <div class="two-third padding-top-thin"><div class="padding-bottom-thinner vertical-center row right"><h6 class="h6-f">Total Cost:</h6></div></div>
        <div class="right one-third padding-top-thin"><div class="padding-bottom-thinner"><h6 class="h6-f">${formatCurrency(user_fav[property.gurasid].feasibility.consulting_costs_total || 0)}</h6></div></div>
      </div>
      <!-- END consulting-cost -->

      <div class="flex padding-bottom-thin">
        <div class="full">
          <h5>Holding Costs</h5>
        </div>
        <div class="one-sixth"><div class="vertical-center"><h6 class="h6-f">Duration:</h6></div></div>
        <div class="row right one-sixth">
          <div class="select-container relative">
            <select bind:value={user_fav[property.gurasid].feasibility.holding_years}>
              <option value="">Years:</option>
              {#each [...Array(10).keys()].map(i => i + 1) as option}
                <option value="{option}">{option}</option>
              {/each}
            </select>
            <div class="absolute center-right select-arrow shift-up-more padding-right-thin unclickable">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path fill="#5C2587" d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"></path></svg>
            </div>
          </div>
        </div>
      </div>

      <div class="flex" style="gap:0.5em;border-bottom:1px solid var(--up-c-f1e9f7);margin-bottom: 0.5em;">
        <div class="full"><div class="padding-bottom-thinner"><h6 class="h6-f">Type</h6></div></div>
        <div class="one-sixth padding-top-thin"><div class="padding-bottom-thinner"><h6 class="h6-f">Cost</h6></div></div>
        <div class="one-sixth padding-top-thin right"><div class="padding-bottom-thinner"><h6 class="h6-f">Total</h6></div></div>
      </div>

      <div class="flex" style="gap:0.5em;margin-bottom: 0.25em;">
        <div class="full"><div class="padding-bottom-thinner vertical-center"><h6 class="h6-f">Council rates per quarter</h6></div></div>
        <div class="one-sixth"><div class="padding-bottom-thinner"><input maxlength="6" bind:value={user_fav[property.gurasid].feasibility.council_rates_per_quarter} placeholder="" type="text"></div></div>
        <div class="one-sixth right padding-top-thin"><div class="padding-bottom-thinner"><h6 class="h6-f">${formatCurrency(user_fav[property.gurasid].feasibility.council_rates_per_quarter_subtotal || 0)}</h6></div></div>
      </div>

      <div class="flex" style="gap:0.5em;margin-bottom: 0.25em;">
        <div class="full"><div class="padding-bottom-thinner vertical-center"><h6 class="h6-f">Land tax per annum</h6></div></div>
        <div class="one-sixth"><div class="padding-bottom-thinner"><input maxlength="6" bind:value={user_fav[property.gurasid].feasibility.land_tax_per_annum} placeholder="" type="text"></div></div>
        <div class="one-sixth right padding-top-thin"><div class="padding-bottom-thinner"><h6 class="h6-f">${formatCurrency(user_fav[property.gurasid].feasibility.land_tax_per_annum_subtotal || 0)}</h6></div></div>
      </div>

      <div class="flex" style="gap:0.5em;margin-bottom: 0.25em;">
        <div class="full"><div class="padding-bottom-thinner vertical-center"><h6 class="h6-f">Water and sewer rates</h6></div></div>
        <div class="one-sixth"><div class="padding-bottom-thinner"><input maxlength="6" bind:value={user_fav[property.gurasid].feasibility.water_and_sewer_rates} placeholder="" type="text"></div></div>
        <div class="one-sixth right padding-top-thin"><div class="padding-bottom-thinner"><h6 class="h6-f">${formatCurrency(user_fav[property.gurasid].feasibility.water_and_sewer_rates_subtotal || 0)}</h6></div></div>
      </div>

      <div class="flex" style="gap:0.5em;margin-bottom: 0.25em;">
        <div class="full"><div class="padding-bottom-thinner vertical-center"><h6 class="h6-f">Accountancy</h6></div></div>
        <div class="one-sixth"><div class="padding-bottom-thinner"><input maxlength="6" bind:value={user_fav[property.gurasid].feasibility.accountancy} placeholder="" type="text"></div></div>
        <div class="one-sixth right padding-top-thin"><div class="padding-bottom-thinner"><h6 class="h6-f">${formatCurrency(user_fav[property.gurasid].feasibility.accountancy_subtotal || 0)}</h6></div></div>
      </div>

      <div class="flex" style="gap:0.5em;margin-bottom: 0.25em;">
        <div class="full"><div class="padding-bottom-thinner vertical-center"><h6 class="h6-f">Administration</h6></div></div>
        <div class="one-sixth"><div class="padding-bottom-thinner"><input maxlength="6" bind:value={user_fav[property.gurasid].feasibility.administration} placeholder="" type="text"></div></div>
        <div class="one-sixth right padding-top-thin"><div class="padding-bottom-thinner"><h6 class="h6-f">${formatCurrency(user_fav[property.gurasid].feasibility.administration_subtotal || 0)}</h6></div></div>
      </div>

      <div class="flex" style="gap:0.5em;margin-bottom: 0.25em;">
        <div class="full"><div class="padding-bottom-thinner vertical-center"><h6 class="h6-f">Insurance</h6></div></div>
        <div class="one-sixth"><div class="padding-bottom-thinner"><input maxlength="6" bind:value={user_fav[property.gurasid].feasibility.insurance} placeholder="" type="text"></div></div>
        <div class="one-sixth right padding-top-thin"><div class="padding-bottom-thinner"><h6 class="h6-f">${formatCurrency(user_fav[property.gurasid].feasibility.insurance_subtotal || 0)}</h6></div></div>
      </div>

      <div class="flex" style="gap:0.5em;margin-bottom: 0.25em;">
        <div class="full"><div class="padding-bottom-thinner vertical-center"><h6 class="h6-f">Other</h6></div></div>
        <div class="one-sixth"><div class="padding-bottom-thinner"><input maxlength="6" bind:value={user_fav[property.gurasid].feasibility.holding_other} placeholder="" type="text"></div></div>
        <div class="one-sixth right padding-top-thin"><div class="padding-bottom-thinner"><h6 class="h6-f">${formatCurrency(user_fav[property.gurasid].feasibility.holding_other_subtotal || 0)}</h6></div></div>
      </div>

      <div class="flex" style="gap:0.5em;border-top:1px solid var(--up-c-f1e9f7);margin-bottom: 0.5em;">
        <div class="two-third padding-top-thin"><div class="padding-bottom-thinner vertical-center row right"><h6 class="h6-f">Total Cost:</h6></div></div>
        <div class="right one-third padding-top-thin"><div class="padding-bottom-thinner"><h6 class="h6-f">${formatCurrency(user_fav[property.gurasid].feasibility.holding_costs_total || 0)}</h6></div></div>
      </div>

      <div class="flex padding-bottom-thin">
        <div class="full"><div class="padding-bottom-thinner vertical-center"><h6 class="h6-f">Profit margin</h6></div></div>
        <div class="row right one-sixth">
          <div class="select-container relative">
            <select bind:value={user_fav[property.gurasid].feasibility.profit_margin}>
              {#each [...Array(100).keys()].map(i => i + 1) as option}
                <option value="{option}">{option}%</option>
              {/each}
            </select>
            <div class="absolute center-right select-arrow shift-up-more padding-right-thin unclickable">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path fill="#5C2587" d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"></path></svg>
            </div>
          </div>
        </div>
      </div>

      <div class="flex" style="gap:0.5em;margin-bottom: 0.5em;">
        <div class="full"><div class="padding-bottom-thinner vertical-center"><h6 class="h6-f">Residual land value</h6></div></div>
        <div class="row right one-sixth">
          <div class="padding-bottom-thinner"><h6 class="h6-f">${formatCurrency(user_fav[property.gurasid].feasibility.residual_land_value || 0)}</h6></div>
        </div>
      </div>

      <div class="flex" style="gap:0.5em;margin-bottom: 0.25em;">
        <div class="full"><div class="padding-bottom-thinner vertical-center"><h6 class="h6-f">Stamp duty</h6></div></div>
        <div class="one-sixth"><div class="padding-bottom-thinner"><input maxlength="6" bind:value={user_fav[property.gurasid].feasibility.stamp_duty} placeholder="" type="text"></div></div>
      </div>

      <div class="flex" style="gap:0.5em;margin-bottom: 0.25em;">
        <div class="full"><div class="padding-bottom-thinner vertical-center"><h6 class="h6-f">Total interest payments</h6></div></div>
        <div class="one-sixth"><div class="padding-bottom-thinner"><input maxlength="6" bind:value={user_fav[property.gurasid].feasibility.interest_payments} placeholder="" type="text"></div></div>
      </div>

    </div>

    <div class="padding-top-thin">
      <a class="btn btn-search" href="?" on:click={_handle_calculate}>CALCULATE RESIDUAL LAND VALUE</a>
    </div>

    <!-- RESIDUAL LAND VALUE (moved directly below the yield results, coloured vs AVM) -->
    <div class="flex padding-top-wide" style="gap:0.5em;">
      <div class="two-third"><div class="vertical-center"><h5>Residual Land Value:</h5></div></div>
      <div class="full right"><div class="vertical-center row right"><h5 style="color: {residualColour};">${formatCurrency(user_fav[property.gurasid].feasibility.final_total || 0)}</h5></div></div>
    </div>
    {#if avmValue !== null && !isNaN(avmValue)}
      <div class="padding-bottom-thin"><p class="avm-compare">vs AVM ${formatNiceCurrency(avmValue)}</p></div>
    {/if}

  {/if}
</div>


<style>
  .residual-calculator h5 {
    color: var(--up-c-31144d);
    font-family: var(--font-sans);
    font-size: 0.8125rem;
    line-height: 1.3em;
  }

  .residual-calculator h6 {
    color: var(--up-c-5c2587);
    font-family: var(--font-sans);
  }

  .residual-calculator .h6-f {
    margin-top: 0;
    font-size: 0.55rem;
  }

  .residual-calculator .avm-compare {
    color: var(--up-c-aaaaaa) !important;
    font-size: 0.52rem;
    font-weight: 600;
    text-transform: uppercase;
    margin: 0;
  }

  .residual-calculator input[type="text"] {
    font-size: 0.625rem;
    border: 1px solid var(--up-c-cccccc);
    border-radius: 0.4em;
    padding: 1em;
    height: 27.39px;
    width: 100%;
    background-color: var(--up-c-ffffff-a40);
    box-sizing: border-box;
  }

  .residual-calculator input[type="text"]:focus,
  .residual-calculator input[type="text"]:active {
    box-shadow: none;
    outline: none;
  }

  .residual-calculator .select-container select {
    font-size: 0.625rem;
    border: 1px solid var(--up-c-f1e9f7);
    border-radius: 0.4em;
    font-weight: 400;
    font-family: var(--font-family);
    -webkit-appearance: none;
    -moz-appearance: none;
    appearance: none;
    line-height: 1.7em;
    width: 100%;
    display: inline-flex;
    height: 27.39px;
    margin: auto;
    border-color: var(--up-c-cccccc);
    color: var(--up-c-5c2587);
    padding-left: 0.4em;
    padding-right: 1.4em;
    box-sizing: border-box;
  }

  /* Fade out overflowing option text instead of a hard clip at the chevron */
  .residual-calculator .select-container::after {
    content: "";
    position: absolute;
    top: 1px;
    bottom: 1px;
    right: 1px;
    width: 2.6em;
    border-radius: 0 0.4em 0.4em 0;
    background: linear-gradient(to right, var(--up-c-ffffff-a00), var(--up-c-ffffff) 65%);
    pointer-events: none;
  }

  .residual-calculator .select-container select::placeholder {
    color: var(--up-c-aaaaaa);
  }

  .residual-calculator .select-container select:focus {
    outline: none;
    box-shadow: none;
  }

  .residual-calculator .select-container select + .shift-up-more {
    -webkit-transform: translateY(-50%);
    -ms-transform: translateY(-50%);
    transform: translateY(-50%);
  }

  .residual-calculator .select-container .select-arrow {
    width: 22px;
    z-index: 1;
  }

  .residual-calculator .btn.btn-search {
    background-color: var(--up-c-5c2587);
    color: var(--up-c-f1e9f7);
    border: 0;
    border-radius: 4px;
    padding: calc(1 * var(--padding-unit)) calc(2 * var(--padding-unit));
    text-decoration: none;
    cursor: pointer;
    font-family: var(--font-family);
    width: 100%;
    text-align: center;
    display: block;
  }

  .residual-calculator hr {
    margin: 0.75em 0;
    height: 1px;
    border: none;
    border-top: 1px solid var(--up-c-f1e9f7);
  }
</style>
