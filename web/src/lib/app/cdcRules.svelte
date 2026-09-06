<script>
  // @ts-nocheck
  import { onMount } from 'svelte';

  export let property;
  export let closeLightbox;

  // CDC Development Types with their status and rules (using dummy data for now)
  // In production, this would be fetched from API based on property data
  let cdcRules = [
    {
      id: 'dwelling_house',
      name: 'Dwelling House',
      code: 'Housing Code',
      status: 'passed',
      maxGFA: '335.0 m²',
      maxHeight: '8.5 m',
      dwellingCount: 1,
      rules: [
        { name: 'Minimum Lot Size', value: '275 m²', status: 'passed' },
        { name: 'Minimum Lot Width', value: '9m', status: 'passed' },
        { name: 'Max Building Height', value: '8.5m', status: 'passed' },
        { name: 'Floor Space Ratio', value: '0.5:1', status: 'passed' },
        { name: 'Street Frontage', value: '≥9m', status: 'passed' },
        { name: 'Primary Street Setback', value: '≥4.5m', status: 'passed' },
        { name: 'Rear Setback', value: '≥3m', status: 'passed' }
      ]
    },
    {
      id: 'dual_occupancy_detached',
      name: 'Dual Occupancy (Detached)',
      code: 'Low Rise Housing Diversity Code',
      status: 'passed',
      maxGFA: '462.8 m²',
      maxHeight: '8.5 m',
      dwellingCount: 2,
      minSubdivisionSize: '225 m²',
      rules: [
        { name: 'Minimum Lot Size', value: '400 m²', status: 'passed' },
        { name: 'Minimum Lot Width', value: '12m', status: 'passed' },
        { name: 'Max Building Height', value: '8.5m', status: 'passed' },
        { name: 'Floor Space Ratio', value: '0.5:1', status: 'passed' },
        { name: 'Street Frontage', value: '≥12m', status: 'passed' },
        { name: 'Primary Street Setback', value: '≥6m', status: 'passed' },
        { name: 'Min Subdivision Size', value: '225 m²', status: 'passed' },
        { name: 'Parking', value: '1 space/dwelling', status: 'passed' }
      ]
    },
    {
      id: 'dual_occupancy_attached',
      name: 'Dual Occupancy (Attached)',
      code: 'Low Rise Housing Diversity Code',
      status: 'passed',
      maxGBA: '462.8 m²',
      maxHeight: '8.5 m',
      dwellingCount: 2,
      minSubdivisionSize: '225 m²',
      rules: [
        { name: 'Minimum Lot Size', value: '400 m²', status: 'passed' },
        { name: 'Minimum Lot Width', value: '12m', status: 'passed' },
        { name: 'Max Building Height', value: '8.5m', status: 'passed' },
        { name: 'Floor Space Ratio', value: '0.5:1', status: 'passed' },
        { name: 'Street Frontage', value: '≥12m', status: 'passed' },
        { name: 'Separation Between Dwellings', value: '≥3m', status: 'need_verification' }
      ]
    },
    {
      id: 'manor_house',
      name: 'Manor House',
      code: 'Housing SEPP',
      status: 'passed',
      maxGFA: '312.8 m²',
      maxHeight: '8.5 m',
      dwellingCount: '3-4',
      rules: [
        { name: 'Minimum Lot Size', value: '600 m²', status: 'passed' },
        { name: 'Minimum Lot Width', value: '15m', status: 'passed' },
        { name: 'Max Building Height', value: '8.5m', status: 'passed' },
        { name: 'Floor Space Ratio', value: '0.5:1', status: 'passed' },
        { name: 'Max Storeys', value: '2', status: 'passed' },
        { name: 'Street Frontage', value: '≥15m', status: 'passed' }
      ]
    },
    {
      id: 'secondary_dwelling',
      name: 'Secondary Dwelling',
      code: 'Housing SEPP',
      status: 'passed',
      maxGFA: '325.6 m²',
      maxHeight: '8.5 m',
      dwellingCount: 1,
      rules: [
        { name: 'Minimum Principal Dwelling', value: '≥200 m²', status: 'passed' },
        { name: 'Max GFA', value: '60% of principal', status: 'passed' },
        { name: 'Max Building Height', value: '8.5m', status: 'passed' },
        { name: 'Parking', value: '1 space', status: 'passed' },
        { name: 'Not within principal dwelling', value: 'Yes', status: 'passed' }
      ]
    },
    {
      id: 'multi_dwelling_terraces',
      name: 'Multi Dwelling Housing (Terraces)',
      code: 'Low Rise Housing Diversity Code',
      status: 'failed',
      failedRule: 'Attached and facing public road',
      ruleReference: '3B.33(2)',
      rules: [
        { name: 'Minimum Lot Size', value: '800 m²', status: 'failed' },
        { name: 'Minimum Lot Width', value: '30m', status: 'passed' },
        { name: 'Max Building Height', value: '12m', status: 'passed' },
        { name: 'Floor Space Ratio', value: '0.75:1', status: 'passed' },
        { name: 'Attached and facing public road', value: 'Yes', status: 'failed' },
        { name: 'Terrace Orientation', value: 'NSW', status: 'need_verification' }
      ]
    },
    {
      id: 'group_home',
      name: 'Group Home',
      code: 'Housing Alterations Code',
      status: 'need_verification',
      rules: [
        { name: 'Maximum Residents', value: '6', status: 'need_verification' },
        { name: 'Parking', value: '2 spaces', status: 'need_verification' },
        { name: 'Scale of Development', value: 'Compatible', status: 'need_verification' }
      ]
    },
    {
      id: 'semi_01',
      name: 'Semis 01',
      code: 'Pattern Book Development Code',
      status: 'passed',
      rules: [
        { name: 'Development Type', value: 'Dual occupancy (attached)', status: 'passed' },
        { name: 'Min Lot Size', value: '375 m²', status: 'passed' },
        { name: 'Max GFA', value: 'See rules', status: 'passed' }
      ]
    },
    {
      id: 'terraces_02',
      name: 'Terraces 02',
      code: 'Pattern Book Development Code',
      status: 'failed',
      failedRule: 'Minimum lot size',
      ruleReference: '3BA.3(5)(b)',
      rules: [
        { name: 'Development Type', value: 'Multi dwelling housing (terraces)', status: 'failed' },
        { name: 'Min Lot Size', value: '2000 m²', status: 'failed' },
        { name: 'Street Frontage', value: '≥30m', status: 'need_verification' }
      ]
    }
  ];

  // Property LEP info for reference
  let lepInfo = {
    lga: property?.lga_name || 'Randwick',
    zone: property?.lzn_label || 'R2',
    fsr: property?.fsr_fsr || '0.5',
    maxHeight: property?.hob_max_b_h || '9.5',
    minLotSize: property?.lot_size || '275',
    lotWidth: property?.width || '16.75'
  };

  function getStatusColor(status) {
    switch(status) {
      case 'passed': return '#4CAF50';
      case 'failed': return '#EF5350';
      case 'need_verification': return '#FFA500';
      default: return '#9E9E9E';
    }
  }

  function getStatusLabel(status) {
    switch(status) {
      case 'passed': return 'Passed';
      case 'failed': return 'Failed';
      case 'need_verification': return 'Need Verification';
      default: return status;
    }
  }

  let expandedRules = {};

  function toggleRules(cdcId) {
    expandedRules[cdcId] = !expandedRules[cdcId];
  }
</script>

<style>

  h1, 
  h2, 
  h3, 
  h4, 
  h5, 
  h6,
  table, td, th, tr {
    color: var(--up-c-31144d);
    font-family: var(--font-sans);
  }

  .property-info,
  .stat-card {
    font-family: var(--font-sans);
  }

  td {

    line-height: 0.6875em;
  }


  .lightbox-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: var(--up-c-000000-a50);
    display: flex;
    justify-content: center;
    align-items: flex-start;
    z-index: 9999;
    overflow-y: auto;
    padding: 2rem 0;
  }

  .lightbox-content {
    background: var(--up-c-ffffff);
    padding: 2rem;
    border-radius: 8px;
    width: 95%;
    max-width: 1400px;
    max-height: none;
    overflow-y: auto;
    position: relative;
    box-shadow: 0 4px 12px var(--up-c-000000-a15);
    margin: auto;
  }

  .close-btn {
    position: absolute;
    top: 1rem;
    right: 1rem;
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: var(--up-c-31144d);
    z-index: 10;
  }

  h2 {
    color: var(--up-c-31144d);
    font-family: var(--font-sans);
    margin-top: 0;
    margin-bottom: 1rem;
  }

  .property-info {
    background: var(--up-c-f9f9f9);
    padding: 1rem;
    border-radius: 6px;
    margin-bottom: 1.5rem;
  }

  .property-info h4 {
    color: var(--up-c-5c2587);
    margin: 0 0 0.5rem 0;
    font-size: 1rem;
  }

  .property-info-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1rem;
  }

  .property-info-item {
    font-size: 0.85rem;
  }

  .property-info-item strong {
    color: var(--up-c-31144d);
    display: block;
    font-size: 0.7rem;
    text-transform: uppercase;
    margin-bottom: 0.2rem;
  }

  .cdc-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.85rem;
  }

  .cdc-table th {
    background: var(--up-c-31144d);
    color: white;
    padding: 0.75rem;
    text-align: left;
    font-weight: 600;
    position: sticky;
    top: 0;
  }

  .cdc-table td {
    padding: 0.75rem;
    border-bottom: 1px solid var(--up-c-eeeeee);
    vertical-align: top;
  }

  .cdc-table tr:hover {
    background: var(--up-c-f5f5f5);
  }

  .status-badge {
    display: inline-block;
    padding: 0.25rem 0.75rem;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 600;
    color: white;
  }

  .status-passed {
    background: var(--up-c-4caf50);
  }

  .status-failed {
    background: var(--up-c-ef5350);
  }

  .status-need_verification {
    background: var(--up-c-ffa500);
  }

  .cdc-name {
    font-weight: 600;
    color: var(--up-c-31144d);
  }

  .cdc-code {
    font-size: 0.75rem;
    color: var(--up-c-666666);
  }

  .expand-btn {
    background: var(--up-c-5c2587);
    color: white;
    border: none;
    padding: 0.4rem 0.8rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.75rem;
  }

  .expand-btn:hover {
    background: var(--up-c-31144d);
  }

  .rules-container {
    background: var(--up-c-f9f9f9);
    padding: 1rem;
    border-radius: 4px;
    margin-top: 0.5rem;
  }

  .rules-table {
    width: 100%;
    font-size: 0.8rem;
    border-collapse: collapse;
  }

  .rules-table th {
    background: var(--up-c-5c2587);
    color: white;
    padding: 0.5rem;
    text-align: left;
  }

  .rules-table td {
    padding: 0.4rem 0.5rem;
    border-bottom: 1px solid var(--up-c-eeeeee);
  }

  .rule-status {
    font-weight: 600;
  }

  .rule-passed {
    color: var(--up-c-4caf50);
  }

  .rule-failed {
    color: var(--up-c-ef5350);
  }

  .rule-need_verification {
    color: var(--up-c-ffa500);
  }

  .failed-rule-info {
    color: var(--up-c-ef5350);
    font-size: 0.8rem;
    margin-top: 0.5rem;
  }

  .summary-stats {
    display: flex;
    gap: 1rem;
    margin-bottom: 1rem;
    flex-wrap: wrap;
  }

  .stat-card {
    background: var(--up-c-f0f0f0);
    padding: 0.75rem 1rem;
    border-radius: 6px;
    text-align: center;
  }

  .stat-card .count {
    font-size: 1.5rem;
    font-weight: bold;
    color: var(--up-c-31144d);
  }

  .stat-card .label {
    font-size: 0.7rem;
    text-transform: uppercase;
    color: var(--up-c-666666);
  }

  .stat-passed .count {
    color: var(--up-c-4caf50);
  }

  .stat-failed .count {
    color: var(--up-c-ef5350);
  }

  .stat-need_verification .count {
    color: var(--up-c-ffa500);
  }
</style>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="lightbox-overlay" on:click|self={closeLightbox}>
  <div class="lightbox-content">
    <button class="close-btn" on:click={closeLightbox}>&times;</button>
    
    <h2>CDC Rules Analysis</h2>

    <div class="property-info">
      <h4>{property?.address || 'Property Address'}, {property?.suburbname || ''} {property?.postcode || ''}</h4>
      <div class="property-info-grid">
        <div class="property-info-item">
          <strong>LGA</strong>
          {lepInfo.lga}
        </div>
        <div class="property-info-item">
          <strong>Zone</strong>
          {lepInfo.zone}
        </div>
        <div class="property-info-item">
          <strong>FSR</strong>
          {lepInfo.fsr}:1
        </div>
        <div class="property-info-item">
          <strong>Max Height</strong>
          {lepInfo.maxHeight} m
        </div>
        <div class="property-info-item">
          <strong>Min Lot Size</strong>
          {lepInfo.minLotSize} m²
        </div>
        <div class="property-info-item">
          <strong>Lot Width</strong>
          {lepInfo.lotWidth} m
        </div>
      </div>
    </div>

    <div class="summary-stats">
      <div class="stat-card stat-passed">
        <div class="count">{cdcRules.filter(r => r.status === 'passed').length}</div>
        <div class="label">Passed</div>
      </div>
      <div class="stat-card stat-failed">
        <div class="count">{cdcRules.filter(r => r.status === 'failed').length}</div>
        <div class="label">Failed</div>
      </div>
      <div class="stat-card stat-need_verification">
        <div class="count">{cdcRules.filter(r => r.status === 'need_verification').length}</div>
        <div class="label">Need Verification</div>
      </div>
    </div>

    <table class="cdc-table">
      <thead>
        <tr>
          <th>Development Type</th>
          <th>Code Reference</th>
          <th>Dwellings</th>
          <th>Max GFA</th>
          <th>Max Height</th>
          <th>Status</th>
          <th>Rules</th>
        </tr>
      </thead>
      <tbody>
        {#each cdcRules as cdc}
          <tr>
            <td>
              <div class="cdc-name">{cdc.name}</div>
              {#if cdc.failedRule}
                <div class="failed-rule-info">Failed: {cdc.failedRule}</div>
                {#if cdc.ruleReference}
                  <div class="failed-rule-info">Ref: {cdc.ruleReference}</div>
                {/if}
              {/if}
            </td>
            <td class="cdc-code">{cdc.code}</td>
            <td>{cdc.dwellingCount || '-'}</td>
            <td>{cdc.maxGFA || cdc.maxGBA || '-'}</td>
            <td>{cdc.maxHeight || '-'}</td>
            <td>
              <span class="status-badge status-{cdc.status}">
                {getStatusLabel(cdc.status)}
              </span>
            </td>
            <td>
              <button class="expand-btn" on:click={() => toggleRules(cdc.id)}>
                {expandedRules[cdc.id] ? 'Hide Rules' : 'View Rules'}
              </button>
            </td>
          </tr>
          {#if expandedRules[cdc.id]}
            <tr>
              <td colspan="7">
                <div class="rules-container">
                  <table class="rules-table">
                    <thead>
                      <tr>
                        <th>Rule</th>
                        <th>Requirement</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {#each cdc.rules as rule}
                        <tr>
                          <td>{rule.name}</td>
                          <td>{rule.value}</td>
                          <td class="rule-status rule-{rule.status}">
                            {getStatusLabel(rule.status)}
                          </td>
                        </tr>
                      {/each}
                    </tbody>
                  </table>
                </div>
              </td>
            </tr>
          {/if}
        {/each}
      </tbody>
    </table>
  </div>
</div>
