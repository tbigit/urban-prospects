<script>
  // @ts-nocheck
  import Residual from '$lib/app/Residual.svelte';
  import { isDemoShortcut, DEMO_YIELD, applyResidualDemo, devMode } from '$lib/app/demoMode.js';

  export let property;
  export let user_fav = {};
  export let user_id = null;
  export let api_domain = '';
  export let user_email = null;
  export let user_plan = null;
  export let user_first_name = null;
  export let user_last_name = null;
  export let yieldSnapshot = null; // bound up to the parent <Property> for the PDF report

  let showResidual = false;

  // Dev mode (CTRL + SHIFT + D) reveals in-progress development types. It is held
  // in a store so it stays on when the yield calculator is closed and re-opened.

  const formatNiceCurrency = (amount) =>
    new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

  // Residual land value (final_total) — populated once the residual calculator runs.
  $: residualFinalTotal = (property && property.gurasid && user_fav[property.gurasid] && user_fav[property.gurasid].feasibility)
    ? user_fav[property.gurasid].feasibility.final_total
    : undefined;

  let developmentType = '';

  let bedroomPct = { 1: 0, 2: 0, 3: 0, 4: 0 };

  let includeStudios = false;
  let studioPct = 0;
  let circulationPct = 0;

  let subdivisionRoadPct = 20;
  let subdivisionMinLotSize = 500;
  let isEditingLotSize = false;
  let editLotSize = '';

  let includeAffordable = false;
  let affordablePct = 15;

  let editedGFA = null;
  let editGFA = '';
  let isEditingGFA = false;

  let isEditingHeight = false;
  let editHeight = '';
  let editedHeight = null;
  let apartmentFloors = 4;

  let result = null;
  let error = null;

  // Snapshot of the yield result for the PDF report (bound up to the parent <Property>).
  $: if (result && Array.isArray(result.breakdown)) {
    yieldSnapshot = {
      developmentType,
      developmentLabel: (devTypeLabels && devTypeLabels[developmentType]) || developmentType,
      floors: apartmentFloors,
      gfa: Math.round(gfa || 0),
      possible: !!result.possible,
      totalDwellings: result.totalDwellings || 0,
      summary: result.summary || '',
      breakdown: (result.breakdown || [])
        .filter((b) => b && b.count > 0)
        .map((b) => ({
          label: b.label,
          count: b.count,
          area: Math.round((b.areaUsed != null ? b.areaUsed : (b.count * (b.areaPerDwelling || b.minSize || 0))) || 0),
        })),
    };
  }

  $: calculatedGFA = property?.area
    ? parseFloat(property.area)
    : (property?.area_sqm ? parseFloat(property.area_sqm) : 0);

  $: gfa = editedGFA !== null ? editedGFA : calculatedGFA;
  
  $: calculatedHeight = property?.hob_max_b_h ? parseFloat(property.hob_max_b_h) : 12;
  $: buildingHeight = editedHeight !== null ? editedHeight : calculatedHeight;

  // Initialize apartmentFloors based on buildingHeight when it changes
  $: {
    const maxFloors = Math.max(2, Math.floor(buildingHeight / 3));
    if (apartmentFloors > maxFloors) {
      apartmentFloors = maxFloors;
    } else if (apartmentFloors < 2) {
      apartmentFloors = 2;
    }
  }

  // FIX 1: 4-bedroom size is now computed dynamically using the spec formula
  // (115m² + 12m² per bedroom above 3), so it correctly handles 4+ bedrooms.
  // For the lookup table we only need up to 4 bedrooms; the dynamic helper
  // getMinSize() is used everywhere calculations happen.
  function getMinSize(devType, bedrooms) {
    if (devType === 'apartments' || devType === 'build-to-rent') {
      const apartmentSizes = { studio: 35, 1: 50, 2: 70, 3: 90, 4: 110 };
      if (bedrooms === 'studio') return 35;
      if (bedrooms <= 4) return apartmentSizes[bedrooms];
      return 110 + (bedrooms - 4) * 12; // extend for 5+ beds if ever needed
    }
    // dual-occupancy / terraces / manor-houses
    if (bedrooms === 1) return 65;
    if (bedrooms === 2) return 90;
    if (bedrooms === 3) return 115;
    return 115 + (bedrooms - 3) * 12; // FIX 1: 4-bed = 127, 5-bed = 139, etc.
  }

  $: if (developmentType && gfa > 0) {
    runCalculation();
  }

  function runCalculation() {
    error = null;
    result = null;
    if (developmentType === 'dual-occupancy') {
      calculateDualOccupancy();
    } else if (developmentType === 'terraces' || developmentType === 'manor-houses') {
      calculateTerraceYield();
    } else if (developmentType === 'apartments' || developmentType === 'build-to-rent') {
      calculateApartmentYield();
    } else if (developmentType === 'subdivisions') {
      calculateSubdivision();
    }
  }

  // ---- Demo mode (CTRL + SHIFT + A) ----
  // Loads the canned "13 Artillery Crescent, Seven Hills" scenario into both the
  // yield inputs and the residual calculator, opens the residual panel and runs
  // the yield calculation. Nothing is saved until CALCULATE is pressed.
  // CTRL + SHIFT + Q is the same demo without the yield inputs: no development
  // type, affordable housing, levels or dwelling mix are set — residual only.
  function handleDemoShortcut(event) {
    if (isDemoShortcut(event, 'd')) {
      event.preventDefault();
      devMode.update(v => !v);
      return;
    }
    if (isDemoShortcut(event, 'q')) {
      event.preventDefault();
      user_fav = applyResidualDemo(user_fav, property);
      showResidual = true;
      return;
    }
    if (!isDemoShortcut(event)) return;
    event.preventDefault();

    developmentType = DEMO_YIELD.developmentType;
    apartmentFloors = DEMO_YIELD.apartmentFloors;
    includeStudios = DEMO_YIELD.includeStudios;
    studioPct = DEMO_YIELD.studioPct;
    includeAffordable = DEMO_YIELD.includeAffordable;
    affordablePct = DEMO_YIELD.affordablePct;
    circulationPct = DEMO_YIELD.circulationPct;
    bedroomPct = { ...DEMO_YIELD.bedroomPct };

    user_fav = applyResidualDemo(user_fav, property);
    showResidual = true;
    runCalculation();
  }

  // Debounced recompute — avoids the result breakdown flickering while a slider is dragged.
  let _recalcTimer;
  function scheduleRecalc() {
    clearTimeout(_recalcTimer);
    _recalcTimer = setTimeout(runCalculation, 120);
  }

  function calculateSubdivision() {
    const roadArea = gfa * (subdivisionRoadPct / 100);
    const netArea = gfa - roadArea;
    const lots = Math.floor(netArea / subdivisionMinLotSize);
    
    result = {
      type: 'subdivisions',
      possible: lots > 0,
      totalDwellings: lots,
      breakdown: [],
      summary: lots > 0 ? `${lots} lot${lots > 1 ? 's' : ''}` : 'No lots possible',
      details: [
        `Site Area: ${gfa.toFixed(0)}m²`,
        `Roads/Infrastructure/Open Space: ${subdivisionRoadPct}% (${roadArea.toFixed(0)}m²)`,
        `Net Developable Area: ${netArea.toFixed(0)}m²`,
        `Min Lot Size: ${subdivisionMinLotSize}m²`
      ]
    };
  }

  function calculateDualOccupancy() {
    const perDwelling = gfa / 2;

    // Minimum GFA for the smallest possible dual occupancy = 2 × 65m² = 130m²
    if (perDwelling < 65) {
      result = {
        type: 'dual-occupancy',
        possible: false,
        summary: 'Dual occupancy not possible',
        details: [`${perDwelling.toFixed(0)}m² per dwelling is below the minimum 65m² required for a 1-bedroom dwelling`]
      };
      return;
    }

    // FIX 2: Corrected thresholds to match the spec exactly:
    //   130–180m²  → 1-bedroom  (perDwelling 65–90m² range maps to this)
    //   180–230m²  → 2-bedroom  (was wrongly 330)
    //   330–354m²  → 3-bedroom
    //   354m²+     → 4-bedroom
    // The spec defines ranges by total GFA per dwelling pair, but the
    // boundaries are checked against perDwelling (GFA/2):
    //   perDwelling < 90   → 1-bed (GFA 130–180)
    //   perDwelling < 115  → 2-bed (GFA 180–230)
    //   perDwelling < 165  → gap — not explicitly covered; treat as 2-bed
    //   perDwelling < 177  → 3-bed (GFA 330–354)
    //   perDwelling >= 177 → 4-bed (GFA 354+)
    // Using the spec's own GFA thresholds directly:
    const totalGFAForCheck = perDwelling * 2; // == gfa, but named for clarity

    let bedrooms;
    if (totalGFAForCheck < 180) bedrooms = 1;
    else if (totalGFAForCheck < 230) bedrooms = 2;   // FIX 2: was < 330
    else if (totalGFAForCheck < 330) {
      // Gap in spec (230–330m²) — 2-bed still fits since perDwelling ≥ 90m²
      bedrooms = 2;
    }
    else if (totalGFAForCheck < 354) bedrooms = 3;
    else bedrooms = 4;

    const minSize = getMinSize('dual-occupancy', bedrooms);
    result = {
      type: 'dual-occupancy',
      possible: true,
      totalDwellings: 2,
      breakdown: [{ label: `${bedrooms}-bedroom`, count: 2, areaPerDwelling: perDwelling, minSize }],
      summary: `2 × ${bedrooms}-bedroom dwellings`,
      details: [
        `Total GFA: ${gfa.toFixed(0)}m²`,
        `Area per dwelling: ${perDwelling.toFixed(0)}m² (minimum ${minSize}m² for ${bedrooms}-bedroom)`
      ]
    };
  }

  function calculateTerraceYield(preventRecalc = false) {
    if (gfa < 195) {
      result = {
        type: 'terraces',
        possible: false,
        summary: `${developmentType === 'terraces' ? 'Terraces/Multi-dwelling housing' : 'Manor homes'} not possible`,
        details: [`GFA of ${gfa.toFixed(0)}m² is below the minimum 195m² required`]
      };
      return;
    }

    const types = [1, 2, 3, 4];

    let propGFA = {};
    for (const t of types) {
      propGFA[t] = gfa * ((bedroomPct[t] || 0) / 100);
    }

    let leftover = 0;
    let breakdown = [];
    let totalDwellings = 0;

    for (const t of types) {
      const pct = bedroomPct[t] || 0;
      const min = getMinSize(developmentType, t);
      let count = 0;
      let used = 0;
      // Types the user set to 0% never receive dwellings; leftover passes through them.
      if (pct > 0) {
        const available = (propGFA[t] || 0) + leftover;
        count = Math.floor(available / min);
        used = count * min;
        leftover = available - used;
      }
      breakdown.push({ label: `${t}-bedroom`, typeId: t, count, areaAllocated: propGFA[t] || 0, areaUsed: used, leftover });
      totalDwellings += count;
    }

    // FIX 5: Post-loop residual check — same logic as apartments.
    // If final leftover >= any dwelling minimum, award the largest fitting type.
    if (leftover > 0) {
      for (let i = types.length - 1; i >= 0; i--) {
        const t = types[i];
        const pct = bedroomPct[t] || 0;
        if (pct <= 0) continue;
        const min = getMinSize(developmentType, t);
        if (leftover >= min) {
          const addCount = Math.floor(leftover / min);
          const existing = breakdown.find(b => b.typeId === t);
          if (existing) {
            existing.count += addCount;
            existing.areaUsed += addCount * min;
          }
          totalDwellings += addCount;
          leftover -= addCount * min;
          break;
        }
      }
    }

    if (!preventRecalc) {
      let needsRecalc = false;
      let sumActive = 0;
      let activeKeys = [];
      
      for (const t of types) {
        const pct = bedroomPct[t] || 0;
        const hasDwellings = breakdown.find(b => b.typeId === t && b.count > 0);
        if (pct > 0 && !hasDwellings) {
          bedroomPct[t] = 0;
          needsRecalc = true;
        } else if (pct > 0) {
          activeKeys.push(t);
          sumActive += pct;
        }
      }
      
      if (needsRecalc) {
        if (activeKeys.length > 0 && sumActive > 0) {
          const remaining = Math.max(0, 100 - sumActive);
          let distributed = 0;
          for (let i = 0; i < activeKeys.length; i++) {
            const k = activeKeys[i];
            const pct = bedroomPct[k];
            let add;
            if (i === activeKeys.length - 1) {
              add = remaining - distributed;
            } else {
              add = Math.round((pct / sumActive) * remaining);
              add = Math.min(add, remaining - distributed);
            }
            add = Math.max(0, add);
            bedroomPct[k] = Math.max(0, pct + add);
            distributed += add;
          }
        }
        // Always reassign so the bound sliders + labels reflect the rebalanced mix.
        bedroomPct = { ...bedroomPct };
        return calculateTerraceYield(true);
      }
    }

    result = {
      type: 'terraces',
      possible: totalDwellings > 0,
      totalDwellings,
      breakdown,
      leftover,
      summary: totalDwellings > 0
        ? `${totalDwellings} dwelling${totalDwellings > 1 ? 's' : ''}`
        : '',
      details: buildDetailLines(breakdown, leftover, gfa)
    };
  }

  function calculateApartmentYield(preventRecalc = false) {
    const bonusMultiplier = includeAffordable ? (affordablePct / 100 * 0.30) : 0;
    const effectiveGfa = gfa * (1 + bonusMultiplier);
    const nda = effectiveGfa * (1 - (circulationPct || 0) / 100);

    const types = includeStudios ? ['studio', 1, 2, 3, 4] : [1, 2, 3, 4];

    let propNDA = {};
    if (includeStudios) {
      propNDA['studio'] = nda * ((studioPct || 0) / 100);
    }
    for (const t of [1, 2, 3, 4]) {
      propNDA[t] = nda * ((bedroomPct[t] || 0) / 100);
    }

    let leftover = 0;
    let breakdown = [];
    let totalDwellings = 0;

    for (const t of types) {
      const pct = t === 'studio' ? (studioPct || 0) : (bedroomPct[t] || 0);
      const allocated = propNDA[t] || 0;
      const min = getMinSize('apartments', t);
      let count = 0;
      let used = 0;
      // Types the user set to 0% never receive dwellings; leftover passes through them.
      if (pct > 0) {
        const available = allocated + leftover;
        count = Math.floor(available / min);
        used = count * min;
        leftover = available - used;
      }
      const label = t === 'studio' ? 'Studio' : `${t}-bedroom`;
      breakdown.push({ label, typeId: t, count, areaAllocated: allocated, areaUsed: used, leftover });
      totalDwellings += count;
    }

    // Post-loop residual check — award largest fitting type (excluding 0% types)
    if (leftover > 0) {
      for (let i = types.length - 1; i >= 0; i--) {
        const t = types[i];
        const pct = t === 'studio' ? (studioPct || 0) : (bedroomPct[t] || 0);
        if (pct <= 0) continue;
        const min = getMinSize('apartments', t);
        if (min && leftover >= min) {
          const addCount = Math.floor(leftover / min);
          const existing = breakdown.find(b => b.typeId === t);
          if (existing) {
            existing.count += addCount;
            existing.areaUsed += addCount * min;
          }
          totalDwellings += addCount;
          leftover -= addCount * min;
          break;
        }
      }
    }

    if (!preventRecalc) {
      let needsRecalc = false;
      let sumActive = 0;
      let activeKeys = [];
      
      for (const t of types) {
        const pct = t === 'studio' ? studioPct : bedroomPct[t];
        const hasDwellings = breakdown.find(b => b.typeId === t && b.count > 0);
        if (pct > 0 && !hasDwellings) {
          if (t === 'studio') studioPct = 0; else bedroomPct[t] = 0;
          needsRecalc = true;
        } else if (pct > 0) {
          activeKeys.push(t);
          sumActive += pct;
        }
      }
      
      if (needsRecalc) {
        if (activeKeys.length > 0 && sumActive > 0) {
          const remaining = Math.max(0, 100 - sumActive);
          let distributed = 0;
          for (let i = 0; i < activeKeys.length; i++) {
            const k = activeKeys[i];
            const pct = k === 'studio' ? studioPct : bedroomPct[k];
            let add;
            if (i === activeKeys.length - 1) {
              add = remaining - distributed;
            } else {
              add = Math.round((pct / sumActive) * remaining);
              add = Math.min(add, remaining - distributed);
            }
            add = Math.max(0, add);
            const val = Math.max(0, pct + add);
            if (k === 'studio') studioPct = val; else bedroomPct[k] = val;
            distributed += add;
          }
        }
        // Always reassign so the bound sliders + labels reflect the rebalanced mix.
        bedroomPct = { ...bedroomPct };
        return calculateApartmentYield(true);
      }
    }

    result = {
      type: 'apartments',
      possible: totalDwellings > 0,
      totalDwellings,
      nda,
      breakdown,
      leftover,
      summary: totalDwellings > 0
        ? `${totalDwellings} dwelling${totalDwellings > 1 ? 's' : ''}`
        : '',
      details: buildApartmentDetailLines(breakdown, leftover, gfa, effectiveGfa, bonusMultiplier, nda, circulationPct, totalDwellings, apartmentFloors)
    };
  }

  function buildDetailLines(breakdown, leftover, totalArea) {
    const lines = [`Total GFA: ${totalArea.toFixed(0)}m²`];
    for (const b of breakdown) {
      if (b.count > 0) {
        const minSize = getMinSize(developmentType, b.typeId);
        lines.push(`${b.count} × ${b.label} (min ${minSize}m² each)`);
      } else if (b.areaAllocated > 0) {
        lines.push(`${b.label}: ${b.areaAllocated.toFixed(0)}m² allocated but insufficient for minimum size — reallocated`);
      }
    }
    if (leftover > 0) {
      lines.push(`Residual area: ${leftover.toFixed(0)}m² (insufficient for additional dwelling)`);
    }
    return lines;
  }

  function buildApartmentDetailLines(breakdown, leftover, totalGFA, effectiveGfa, bonusMultiplier, nda, circPct, totalDwellings, floors) {
    const lines = [`Base GFA: ${totalGFA.toFixed(0)}m²`, `Approx. Footprint (${floors} floor${floors > 1 ? 's' : ''}): ${(totalGFA/floors).toFixed(0)}m²/floor`];
    if (includeAffordable) {
      lines.push(`Bonus GFA (+${(bonusMultiplier * 100).toFixed(1)}%): ${(effectiveGfa - totalGFA).toFixed(0)}m²`);
      lines.push(`Total GFA: ${effectiveGfa.toFixed(0)}m²`);
    }
    lines.push(`Circulation: ${(circPct || 0).toFixed(0)}%`);
    lines.push(`Net Developable Area: ${nda.toFixed(0)}m²`);

    for (const b of breakdown) {
      if (b.count > 0) {
        lines.push(`${b.count} × ${b.label}`);
      }
    }
    if (leftover > 0) {
      lines.push(`Residual area: ${leftover.toFixed(0)}m² (insufficient for additional dwelling)`);
    }
    if (includeAffordable && totalDwellings > 0) {
      const affordableCount = Math.round(totalDwellings * (affordablePct / 100));
      lines.push(`Affordable Units (${affordablePct}%): ${affordableCount}`);
    }
    return lines;
  }

  function handleSliderChange(changedKey, newVal, mode) {
    let keys;
    if ((mode === 'apartments' || mode === 'build-to-rent') && includeStudios) {
      keys = ['studio', 1, 2, 3, 4];
    } else {
      keys = [1, 2, 3, 4];
    }

    if (changedKey === 'studio') studioPct = newVal;
    else bedroomPct[changedKey] = newVal;

    const remaining = Math.max(0, 100 - newVal);
    const otherKeys = keys.filter(k => k !== changedKey);
    const otherSum = otherKeys.reduce((sum, k) => {
      return sum + (k === 'studio' ? (studioPct || 0) : (bedroomPct[k] || 0));
    }, 0);

    if (otherSum === 0) {
      const equal = Math.floor(remaining / otherKeys.length);
      let leftover = remaining;
      for (const k of otherKeys) {
        const val = k === otherKeys[otherKeys.length - 1] ? leftover : equal;
        if (k === 'studio') studioPct = val;
        else bedroomPct[k] = val;
        leftover -= val;
      }
    } else {
      let distributed = 0;
      for (let i = 0; i < otherKeys.length; i++) {
        const k = otherKeys[i];
        const currentVal = k === 'studio' ? (studioPct || 0) : (bedroomPct[k] || 0);
        let val;
        if (i === otherKeys.length - 1) {
          val = remaining - distributed;
        } else {
          val = Math.round((currentVal / otherSum) * remaining);
          val = Math.min(val, remaining - distributed);
        }
        val = Math.max(0, val);
        if (k === 'studio') studioPct = val;
        else bedroomPct[k] = val;
        distributed += val;
      }
    }
    bedroomPct = { ...bedroomPct };
  }

  // FIX 8: Reset all inputs when switching development type
  function selectType(type) {
    developmentType = type;
    result = null;
    error = null;
    bedroomPct = { 1: 0, 2: 0, 3: 0, 4: 0 };
    studioPct = 0;
    circulationPct = 0;
    subdivisionRoadPct = 20;
    subdivisionMinLotSize = 500;
    includeStudios = false;
    includeAffordable = false;
    affordablePct = 15;
  }

  $: isDevTypePermissible = checkPermissibility(developmentType, property?.permissible_uses);

  function checkPermissibility(devType, usesString) {
    if (!devType || !usesString) return true;
    const uses = usesString.toLowerCase();
    switch (devType) {
      case 'dual-occupancy':
        return uses.includes('dual occupanc');
      case 'terraces':
        return uses.includes('multi dwelling') || uses.includes('terrace') || uses.includes('attached dwelling');
      case 'manor-houses':
        return uses.includes('manor');
      case 'apartments':
      case 'build-to-rent':
        return uses.includes('residential flat') || uses.includes('apartment');
      case 'subdivisions':
        return uses.includes('subdivision');
      default:
        return true;
    }
  }

  const devTypeLabels = {
    'dual-occupancy': 'Dual Occupancy',
    'terraces': 'Terraces / Multi-Dwelling',
    'manor-houses': 'Manor Houses',
    'apartments': 'Apartments',
    'subdivisions': 'Subdivisions',
    'build-to-rent': 'Build to Rent'
  };

  function startEditGFA() {
    editGFA = gfa ? gfa.toFixed(0) : '';
    isEditingGFA = true;
  }

  function saveGFA() {
    isEditingGFA = false;
    const val = parseFloat(editGFA);
    if (!isNaN(val) && val > 0) {
      editedGFA = val;
    } else if (editedGFA !== null) {
      // Invalid edit while a custom value was set — keep the custom value
    } else {
      // Invalid edit, resets to calculated
    }
  }

  function cancelGFA() {
    isEditingGFA = false;
  }

  function startEditLotSize() {
    editLotSize = subdivisionMinLotSize.toString();
    isEditingLotSize = true;
  }

  function saveLotSize() {
    isEditingLotSize = false;
    const val = parseFloat(editLotSize);
    if (!isNaN(val) && val > 0) {
      subdivisionMinLotSize = val;
      if (developmentType === 'subdivisions') runCalculation();
    }
  }

  function cancelLotSize() {
    isEditingLotSize = false;
  }

  function startEditHeight() {
    editHeight = buildingHeight ? buildingHeight.toString() : '';
    isEditingHeight = true;
  }

  function saveHeight() {
    isEditingHeight = false;
    const val = parseFloat(editHeight);
    if (!isNaN(val) && val > 0) {
      editedHeight = val;
      if (developmentType === 'apartments' || developmentType === 'build-to-rent') runCalculation();
    }
  }

  function cancelHeight() {
    isEditingHeight = false;
  }

  function focusOnMount(node) {
    node.focus();
    node.select();
    return {};
  }
</script>

<svelte:window on:keydown={handleDemoShortcut} />

<div class="yield-calculator padding-top-wide padding-left padding-right">

  <div class="span-info flex flex-static padding-bottom" style="gap: 1em;">
    <div class="half">
      <div class="padding-bottom"><h6 class="info-type">{developmentType === 'subdivisions' ? 'SITE AREA (SQM)' : 'GROSS FLOOR AREA (GFA)'}</h6></div>
      {#if isEditingGFA}
        <!-- svelte-ignore a11y-autofocus -->
        <input type="text" bind:value={editGFA} class="gfa-input" use:focusOnMount on:blur={saveGFA} on:keydown={e => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') cancelGFA(); }} />
      {:else}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <span class="gfa-value" on:click={startEditGFA}>{gfa ? gfa.toFixed(0) : '--'} m²</span>
      {/if}
    </div>
    <div class="half">
      <div class="padding-bottom"><h6 class="info-type">PERMISSIBLE HEIGHT</h6></div>
      {#if isEditingHeight}
        <input type="text" bind:value={editHeight} class="gfa-input" use:focusOnMount on:blur={saveHeight} on:keydown={e => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') cancelHeight(); }} />
      {:else}
        <span class="gfa-value" on:click={startEditHeight}>{buildingHeight ? buildingHeight + ' m' : '--'}</span>
      {/if}
    </div>
  </div>

  <hr />

  <div class="padding-top padding-bottom-thin">
    <h6><strong>SELECT DEVELOPMENT TYPE</strong></h6>
  </div>
  <div class="development-type-grid padding-top-thin">
    <button class="btn" class:active={developmentType === 'dual-occupancy'} on:click={() => selectType('dual-occupancy')}>
      Dual Occupancy
    </button>
    <button class="btn" class:active={developmentType === 'terraces'} on:click={() => selectType('terraces')}>
      Terraces / Multi-Dwelling
    </button>
    <button class="btn" class:active={developmentType === 'manor-houses'} on:click={() => selectType('manor-houses')}>
      Manor Houses
    </button>
    <button class="btn" class:active={developmentType === 'apartments'} on:click={() => selectType('apartments')}>
      Apartments
    </button>
    <div style="grid-column: span 2;">
      <button class="btn" class:active={developmentType === 'subdivisions'} on:click={() => selectType('subdivisions')}>
        Subdivisions
      </button>
    </div>
    {#if $devMode}
      <div style="grid-column: span 2;">
        <button class="btn" class:active={developmentType === 'build-to-rent'} on:click={() => selectType('build-to-rent')}>
          Build to Rent
        </button>
      </div>
    {/if}
  </div>

  {#if developmentType && !isDevTypePermissible}
    <div class="padding-top-thin">
      <p class="text-warning"><span><i class=" icon-info"></i></span> This site may need to be rezoned to build {devTypeLabels[developmentType]}.</p>
    </div>
  {/if}

  {#if developmentType === 'terraces' || developmentType === 'manor-houses'}
    <div class="padding-top-wider">
      <h6><strong>BEDROOM MIX</strong></h6>
      <p class="info-type">% of GFA</p>
    </div>
    <div class="model-sliders padding-top">
      <div class="slider-container">
        <!-- svelte-ignore a11y-label-has-associated-control -->
        <label>1-bedroom</label>
        <input type="range" min="0" max="100" step="1" value={bedroomPct[1]} on:input={e => { handleSliderChange(1, parseInt(e.target.value), developmentType); scheduleRecalc(); }} />
        <span>{bedroomPct[1]}%</span>
      </div>
      <div class="slider-container">
        <!-- svelte-ignore a11y-label-has-associated-control -->
        <label>2-bedroom</label>
        <input type="range" min="0" max="100" step="1" value={bedroomPct[2]} on:input={e => { handleSliderChange(2, parseInt(e.target.value), developmentType); scheduleRecalc(); }} />
        <span>{bedroomPct[2]}%</span>
      </div>
      <div class="slider-container">
        <!-- svelte-ignore a11y-label-has-associated-control -->
        <label>3-bedroom</label>
        <input type="range" min="0" max="100" step="1" value={bedroomPct[3]} on:input={e => { handleSliderChange(3, parseInt(e.target.value), developmentType); scheduleRecalc(); }} />
        <span>{bedroomPct[3]}%</span>
      </div>
      <div class="slider-container">
        <!-- svelte-ignore a11y-label-has-associated-control -->
        <label>4-bedroom</label>
        <input type="range" min="0" max="100" step="1" value={bedroomPct[4]} on:input={e => { handleSliderChange(4, parseInt(e.target.value), developmentType); scheduleRecalc(); }} />
        <span>{bedroomPct[4]}%</span>
      </div>
    </div>
    <div><p class="info-type">Total 100% (sliders adjust automatically)</p></div>
  {/if}

  {#if developmentType === 'apartments' || developmentType === 'build-to-rent'}
    <div class="padding-top-wider">
      <div class="flex padding-bottom-thin" style="gap: 1.5em; flex-wrap: wrap;">
        <div class="checkbox-container">
          <label>
            <input type="checkbox" bind:checked={includeStudios} on:change={runCalculation} />
            Include Studios
          </label>
        </div>
        <div class="checkbox-container">
          <label>
            <input type="checkbox" bind:checked={includeAffordable} on:change={runCalculation} />
            Affordable Housing
          </label>
        </div>
      </div>

      {#if includeAffordable}
        <div class="slider-container" style="margin-bottom: 16px;">
          <!-- svelte-ignore a11y-label-has-associated-control -->
          <label>Affordable %</label>
          <input type="range" min="10" max="15" step="1" bind:value={affordablePct} on:input={scheduleRecalc} />
          <span>{affordablePct}%</span>
        </div>
      {/if}

      {#if includeStudios}
        <div class="slider-container">
          <!-- svelte-ignore a11y-label-has-associated-control -->
          <label>Studio</label>
          <input type="range" min="0" max="100" step="1" value={studioPct} on:input={e => { handleSliderChange('studio', parseInt(e.target.value), developmentType); scheduleRecalc(); }} />
          <span>{studioPct}%</span>
        </div>
      {/if}

      <div class="slider-container" style="margin-bottom: 16px;">
        <!-- svelte-ignore a11y-label-has-associated-control -->
        <label>Levels</label>
        <input type="range" min="2" max={Math.max(2, Math.floor(buildingHeight / 3))} step="1" bind:value={apartmentFloors} on:input={scheduleRecalc} />
        <span>{apartmentFloors}</span>
      </div>
      <div><p class="info-type" style="margin-top: -8px; margin-bottom: 16px;">Max floors based on Permissible Height / 3m</p></div>

      <h6><strong>DWELLING MIX</strong></h6>
      <p class="info-type">% of NDA</p>
    </div>
    <div class="model-sliders padding-top">
      <div class="slider-container">
        <!-- svelte-ignore a11y-label-has-associated-control -->
        <label>1-bedroom</label>
        <input type="range" min="0" max="100" step="1" value={bedroomPct[1]} on:input={e => { handleSliderChange(1, parseInt(e.target.value), developmentType); scheduleRecalc(); }} />
        <span>{bedroomPct[1]}%</span>
      </div>
      <div class="slider-container">
        <!-- svelte-ignore a11y-label-has-associated-control -->
        <label>2-bedroom</label>
        <input type="range" min="0" max="100" step="1" value={bedroomPct[2]} on:input={e => { handleSliderChange(2, parseInt(e.target.value), developmentType); scheduleRecalc(); }} />
        <span>{bedroomPct[2]}%</span>
      </div>
      <div class="slider-container">
        <!-- svelte-ignore a11y-label-has-associated-control -->
        <label>3-bedroom</label>
        <input type="range" min="0" max="100" step="1" value={bedroomPct[3]} on:input={e => { handleSliderChange(3, parseInt(e.target.value), developmentType); scheduleRecalc(); }} />
        <span>{bedroomPct[3]}%</span>
      </div>
      <div class="slider-container">
        <!-- svelte-ignore a11y-label-has-associated-control -->
        <label>4-bedroom</label>
        <input type="range" min="0" max="100" step="1" value={bedroomPct[4]} on:input={e => { handleSliderChange(4, parseInt(e.target.value), developmentType); scheduleRecalc(); }} />
        <span>{bedroomPct[4]}%</span>
      </div>
    </div>
    <div><p class="info-type">Total 100% (sliders adjust automatically)</p></div>

    <div class="padding-top-wider">
      <h6><strong>CIRCULATION</strong></h6>
      <p class="info-type">% of GFA for stairs & common areas</p>
    </div>
    <div class="model-sliders padding-top">
      <div class="slider-container">
        <!-- svelte-ignore a11y-label-has-associated-control -->
        <label>Circulation</label>
        <input type="range" min="0" max="50" step="1" bind:value={circulationPct} on:input={scheduleRecalc} />
        <span>{circulationPct}%</span>
      </div>
    </div>
  {/if}

  {#if developmentType === 'subdivisions'}
    <div class="padding-top-wider">
      <h6><strong>ROADS & INFRASTRUCTURE</strong></h6>
      <p class="info-type">% of Site Area</p>
    </div>
    <div class="model-sliders padding-top">
      <div class="slider-container">
        <!-- svelte-ignore a11y-label-has-associated-control -->
        <label>Deduction</label>
        <input type="range" min="0" max="50" step="1" bind:value={subdivisionRoadPct} on:input={scheduleRecalc} />
        <span>{subdivisionRoadPct}%</span>
      </div>
    </div>

    <div class="padding-top-wider">
      <div class="span-label">MINIMUM LOT SIZE</div>
      <div class="padding-top-thinner">
        {#if isEditingLotSize}
          <!-- svelte-ignore a11y-autofocus -->
          <input type="text" bind:value={editLotSize} class="gfa-input" use:focusOnMount on:blur={saveLotSize} on:keydown={e => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') cancelLotSize(); }} />
        {:else}
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <!-- svelte-ignore a11y-no-static-element-interactions -->
          <span class="gfa-value" on:click={startEditLotSize}>{subdivisionMinLotSize} m²</span>
        {/if}
      </div>
    </div>
  {/if}

  {#if error}
    <div class="padding-top error-message">
      <p><i class=" icon-triangle-alert"></i> {error}</p>
    </div>
  {/if}

  {#if result}
    <hr />
    {#if result.breakdown}
      <div class="padding-top span-info flex flex-static">
        {#each result.breakdown as b}
          {#if b.count > 0}
            <div class="one-quarter">
              <div class="full padding-bottom"><h6 class="info-type uppercase">{b.label}</h6></div>
              <p>{b.count}×</p>
            </div>
          {/if}
        {/each}
      </div>
    {/if}
    {#if result.totalDwellings > 0}
      <div class="padding-top span-info flex flex-static">
        <div class="full">
          <div class="full padding-bottom"><h6 class="info-type uppercase">TOTAL</h6></div>
          <p>{result.totalDwellings} dwelling{result.totalDwellings > 1 ? 's' : ''}</p>
        </div>
      </div>
    {/if}
    {#if result.summary}
      <div class="padding-top span-info">
        <hr />  
        <div class="full padding-top padding-bottom"><h6 class="uppercase"><strong>Summary</strong></h6></div>
        <div class="full padding-bottom">
          <p class="{result.possible ? '' : 'text-warning'}">{result.summary}</p>
        </div>
      </div>
    {/if}
    <div class="span-info flex flex-static padding-bottom" style="flex-wrap: wrap;">
      {#each result.details as detail}
        <div class="full">
          <p><i class=" icon-circle-check padding-right"></i>{detail}</p>
        </div>
      {/each}

      {#if residualFinalTotal != null && !isNaN(residualFinalTotal)}
        <div class="full">
          <p><i class=" icon-circle-check padding-right"></i>Residual Land Value: ${formatNiceCurrency(residualFinalTotal)}</p>
        </div>
      {/if}

    </div>
  {/if}

  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="padding-bottom">
  <hr />
  <div class="residual-collapsible-header padding-top" on:click={() => showResidual = !showResidual}>
    <h6><strong>{$devMode ? 'FEASIBILITY CALCULATOR' : 'RESIDUAL CALCULATOR'}</strong></h6>
    <i class=" {showResidual ? 'icon-chevron-up' : 'icon-chevron-down'}"></i>
  </div>
  {#if showResidual}
    <div class="padding-top">
      <Residual {property} bind:user_fav {user_id} {api_domain} {user_email} {user_plan} {user_first_name} {user_last_name} yieldIncludeAffordable={includeAffordable} yieldAffordablePct={affordablePct} yieldGfa={gfa} yieldResult={result} yieldDevelopmentType={developmentType} yieldFloors={apartmentFloors} yieldCirculationPct={circulationPct} />
    </div>
  {/if}
  </div>

  <hr/>

  <div class="padding-top-wider padding-bottom-wider">
    <div>
      <h6><strong>DISCLAIMER</strong></h6>
    </div>
    <div class="padding-top-wider">
      <p>The development yield generated by this tool is indicative only and is based on simplified assumptions, minimum dwelling sizes, and high-level planning controls. Actual yield may vary significantly once detailed site investigations, architectural design, and statutory assessments are undertaken. Factors that can materially affect achievable yield include site constraints (such as flooding, bushfire, biodiversity, heritage, contamination, slope and access), infrastructure requirements, easements, setbacks, landscaping and deep-soil obligations, parking and circulation design, building separation, solar access, overshadowing, engineering feasibility, and any additional controls in the applicable LEP, DCP or SEPPs. Council interpretation, design quality requirements, and changes to planning policy may also influence outcomes. This calculation should not be relied upon as a definitive assessment of development potential and should be verified through detailed planning, architectural and engineering analysis.</p>
    </div>
  </div>
</div>

<style>

  h6.info-type {
    font-size: 0.56rem;
    color: var(--up-c-aaaaaa);
  }

  hr {
    margin: 0.5em 0 0.5em 0;
    height: 1px;
    border: none;
    border-top: 1px solid var(--up-c-f1e9f7);
  }

  p {
    font-size: 0.7125rem;
  }

  .gfa-input {
    font-size: inherit;
    font-family: inherit;
    color: inherit;
    border: none;
    background: transparent;
    padding: 0;
    width: 100px;
    outline: none;
    display: inline;
  }

  .gfa-value {
    cursor: pointer;
  }

  .development-type-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5em;
  }

  .development-type-grid .btn {
    width: 100%;
    text-align: center;
    font-size: 0.65rem;
    padding: calc(0.6 * var(--padding-unit)) calc(0.5 * var(--padding-unit));
  }

  .development-type-grid .btn.active {
    background-color: var(--up-c-5c2587);
    color: var(--up-c-ffffff);
    border-color: var(--up-c-5c2587);
  }

  .residual-collapsible-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: pointer;
  }

  .residual-collapsible-header h6 {
    margin: 0;
  }

  .residual-collapsible-header i {
    color: var(--up-c-5c2587);
  }

  .slider-container {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }

  .slider-container label {
    display: inline-block;
    width: 90px;
    font-size: 0.65rem;
    color: var(--up-c-31144d);
    flex-shrink: 0;
  }

  .slider-container input[type="range"] {
    flex: 1;
    accent-color: var(--up-c-5c2587);
    -webkit-appearance: none;
    appearance: none;
    background: transparent;
  }

  .slider-container input[type="range"]::-webkit-slider-runnable-track {
    background: var(--up-c-f1e9f7);
    border: none;
    height: 4px;
    border-radius: 2px;
  }

  .slider-container input[type="range"]::-moz-range-track {
    background: var(--up-c-f1e9f7);
    border: none;
    height: 4px;
    border-radius: 2px;
  }

  .slider-container input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    margin-top: -6px;
    background: var(--up-c-5c2587);
    height: 16px;
    width: 16px;
    border-radius: 50%;
  }

  .slider-container input[type="range"]::-moz-range-thumb {
    background: var(--up-c-5c2587);
    border: none;
    height: 16px;
    width: 16px;
    border-radius: 50%;
  }

  .slider-container span {
    width: 40px;
    text-align: right;
    font-size: 0.65rem;
  }

  .checkbox-container label {
    display: flex;
    align-items: center;
    gap: 0.5em;
    cursor: pointer;
    font-size: 0.7125rem;
    font-family: var(--font-sans);
    color: var(--up-c-5c2587);
  }

  .checkbox-container input[type="checkbox"] {
    accent-color: var(--up-c-5c2587);
  }

  .error-message p {
    color: var(--up-c-d32f2f);
  }

  .text-warning {
    color: var(--up-c-d32f2f);
  }

  .result-count {
    font-weight: 700;
    color: var(--up-c-5c2587);
    font-size: 0.85rem;
  }

  .yield-calculator input,
  .yield-calculator .gfa-value {
    font-weight: 400;
    color: var(--up-c-31144d) !important;
    font-size: 0.7125rem;
  }
</style>