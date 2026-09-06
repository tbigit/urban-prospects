<script>
  // @ts-nocheck
  import { onMount } from 'svelte';
  import { createPdf, initPdfMe } from '$lib/app/pdfFunctions.js';

  export let property;
  export let api_domain;
  export let user_first_name = '';
  export let user_last_name = '';
  export let custom_logo_url = '';
  export let save_model_title = '';
  export let closeLightbox; // function to close the modal
  export let feasibility = null;   // residual feasibility (user_fav[gurasid].feasibility)
  export let yieldSnapshot = null; // yield result snapshot from the yield calculator

  // Whether there's any yield/residual data worth offering as a PDF page.
  $: hasResidual = !!(feasibility && feasibility.final_total !== undefined && feasibility.final_total !== null && feasibility.final_total !== '' && !isNaN(parseFloat(feasibility.final_total)));
  $: hasYield = !!(yieldSnapshot && (yieldSnapshot.totalDwellings > 0 || (yieldSnapshot.breakdown && yieldSnapshot.breakdown.length)));
  $: hasCalcData = hasYield || hasResidual;

  let generating_pdf = false;
  let cover_title = 'Property Report';
  let cover_name = (user_first_name + ' ' + user_last_name).trim();

  let configOptions = [
    { id: 'cover_page', label: 'Cover Page', value: true, group: 'Cover Page Elements' },
    { id: 'mapbox_cover', label: 'Show 3D Design on Cover Page', value: false, group: 'Cover Page Elements' },
    { id: 'mapbox_last_page', label: 'Include 3D Design in Report', value: false, group: 'Cover Page Elements' },
    
    { id: 'overview', label: 'Property Overview', value: true, group: 'Property Overview, Suburb Profile, and Nearby' },
    { id: 'suburb_profile', label: 'Suburb Profile', value: true, group: 'Property Overview, Suburb Profile, and Nearby' },
    { id: 'near_by_school', label: 'Nearby School', value: true, group: 'Property Overview, Suburb Profile, and Nearby' },
    { id: 'near_by_hospital', label: 'Nearby Hospital', value: true, group: 'Property Overview, Suburb Profile, and Nearby' },
    { id: 'near_by_train', label: 'Nearby Train', value: true, group: 'Property Overview, Suburb Profile, and Nearby' },
    
    { id: 'permissible_uses', label: 'Permissible Uses', value: true, group: 'Permissible Use' },
    { id: 'sales_history', label: 'Sold History', value: true, group: 'Permissible Use' },
    
    { id: 'local_environmental_plans', label: 'Local Environmental Plans', value: true, group: 'Planning & Constraints' },
    { id: 'planning_constraints', label: 'Planning Constraints', value: true, group: 'Planning & Constraints' },
    { id: 'planning_constraint_maps', label: 'Planning Constraint Maps', value: true, group: 'Planning & Constraints' },
    { id: 'comply_development', label: 'Comply Development', value: true, group: 'Planning & Constraints' },
    { id: 'pattern_books', label: 'Pattern Books', value: true, group: 'Planning & Constraints' },

    { id: 'contribution_plans', label: 'Contribution Plans', value: true, group: '_unlabeled_1' },
    { id: 'development_control_plans', label: 'Development Control Plans', value: true, group: '_unlabeled_1' },
    { id: 'state_environmental_planning', label: 'State Environmental Planning', value: true, group: '_unlabeled_1' },

    { id: 'development_applications', label: 'Development Applications', value: true, group: 'Applications' },
    { id: 'development_applications_maps', label: 'Surrounding Development Applications Map', value: true, group: 'Applications' },

    { id: 'census_suburb_age_profile', label: 'Suburb Age Profile', value: true, group: 'Census' },
    { id: 'census_ancestry', label: 'Ancestry', value: true, group: 'Census' },
    { id: 'census_country_of_birth', label: 'Country of Birth', value: true, group: 'Census' },
    { id: 'census_rent_affordability', label: 'Rent Affordability', value: true, group: 'Census' },
    { id: 'census_mortgage_affordability', label: 'Mortgage Affordability', value: true, group: 'Census' },
    { id: 'census_weekly_household_income', label: 'Weekly Household Income', value: true, group: 'Census' },
    { id: 'census_tenure_type', label: 'Tenure Type', value: true, group: 'Census' },
    { id: 'census_household_composition', label: 'Household Composition', value: true, group: 'Census' },

    { id: 'census_crime_occurrence', label: 'Crime Occurrence', value: true, group: 'Crime' },
    { id: 'census_crime_rankings', label: 'Crime Rankings', value: true, group: 'Crime' },

    { id: 'development_calculations', label: 'Yield & Residual Calculations', value: true, group: 'Development Analysis' }
  ];

  // Group config options
  $: groupedOptions = configOptions.reduce((acc, opt) => {
    if (!acc[opt.group]) acc[opt.group] = [];
    acc[opt.group].push(opt);
    return acc;
  }, {});

  let savedModelView;

  $: isMapboxCoverDisabled = !savedModelView || !configOptions.find(o => o.id === 'cover_page')?.value;
  $: isMapboxLastPageDisabled = !savedModelView;

  function isOptionDisabled(optionId) {
    if (optionId === 'mapbox_cover') return isMapboxCoverDisabled;
    if (optionId === 'mapbox_last_page') return isMapboxLastPageDisabled;
    return false;
  }

  onMount(() => {
    savedModelView = localStorage.getItem('saved_model_view');

    // Load saved logo from localStorage
    const savedLogo = localStorage.getItem('custom_pdf_logo');
    if (savedLogo) {
      custom_logo_url = savedLogo;
    }

    // Load saved config options
    const savedConfig = localStorage.getItem('custom_pdf_config');
    if (savedConfig) {
      try {
        const parsedConfig = JSON.parse(savedConfig);
        configOptions = configOptions.map(opt => {
          if (parsedConfig[opt.id] !== undefined) {
            opt.value = parsedConfig[opt.id];
          }
          return opt;
        });
      } catch (e) {
        console.error("Failed to parse saved pdf config", e);
      }
    }
  });

  function saveConfig() {
    const configToSave = configOptions.reduce((acc, opt) => {
      acc[opt.id] = opt.value;
      return acc;
    }, {});
    localStorage.setItem('custom_pdf_config', JSON.stringify(configToSave));
  }

  function handleLogoUpload(e) {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        custom_logo_url = event.target.result;
        localStorage.setItem('custom_pdf_logo', custom_logo_url);
      };
      reader.readAsDataURL(file);
    }
  }

  function removeLogo() {
    custom_logo_url = '';
    localStorage.removeItem('custom_pdf_logo');
  }

  async function _generateCustomPdf(event) {
    event.preventDefault();
    generating_pdf = true;
    try {
      await initPdfMe();
      
      let active_pdf_config = {
        cover_title: cover_title,
        save_model_title: save_model_title,
        cover_logo: true,
        cover_background_image: true
      };
      configOptions.forEach(opt => {
        active_pdf_config[opt.id] = opt.value;
      });

      await createPdf({ ...property, feasibility, yield_snapshot: yieldSnapshot }, api_domain, active_pdf_config, custom_logo_url, cover_name, "");
      generating_pdf = false;
      closeLightbox();
    } catch (error) {
      alert(error.message);
      generating_pdf = false;
    }
  }
</script>

<style>
  .lightbox-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: var(--up-c-000000-a50);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 9999;
  }

  .lightbox-content {
    background: var(--up-c-ffffff);
    padding: 2rem;
    border-radius: 8px;
    width: 90%;
    max-width: 600px;
    max-height: 90vh;
    overflow-y: auto;
    position: relative;
    box-shadow: 0 4px 12px var(--up-c-000000-a15);
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
  }

  h3 {
    color: var(--up-c-31144d);
    font-family: var(--font-sans);
    margin-top: 0;
  }

  .pb-gap {
    padding-bottom: 1rem;
  }

  .form-group {
    margin-bottom: 1.5rem;
  }

  .form-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-size: 0.75rem;
    color: var(--up-c-31144d);
    font-weight: 600;
    height: auto;
    line-height: 0;
  }

  .form-group input[type="text"] {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid var(--up-c-cccccc);
    border-radius: 4px;
    font-size: 0.8rem;
    box-sizing: border-box;
  }

  .section-group {
    margin-bottom: 1.5rem;
    padding: 1rem;
    background: var(--up-c-f9f9f9);
    border-radius: 6px;
  }

  .flex {
    display: flex;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .section-group .flex:last-child {
    margin-bottom: 0;
  }

  .width-80 {
    width: 70%;
  }

  .width-20 {
    width: 30%;
    min-width: 130px;
    text-align: right;
  }

  .vertical-center {
    display: flex;
    align-items: center;
    height: 100%;
  }

  .radio-buttons {
    display: inline-flex;
  }

  .pill {
    border: 1px solid var(--up-c-5c2587);
    padding: 0.2rem 0.5rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 0.7rem;
    color: var(--up-c-5c2587);
    transition: all 0.2s;
    min-width: 60px;
  }

  .pill input[type="radio"] {
    display: none;
  }

  .pill:has(input[type="radio"]:checked) {
    background-color: var(--up-c-5c2587);
    color: white;
  }

  .pill:first-of-type {
    border-top-left-radius: 4px;
    border-bottom-left-radius: 4px;
  }

  .pill:not(:last-of-type) {
    border-right: 1px solid var(--up-c-5c2587);
  }

  .pill:last-of-type {
    border-top-right-radius: 4px;
    border-bottom-right-radius: 4px;
  }

  .btn-submit {
    background-color: var(--up-c-5c2587);
    color: var(--up-c-ffffff);
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9rem;
    width: 100%;
    font-weight: bold;
    margin-top: 1rem;
  }

  .btn-submit:hover {
    filter: brightness(1.1);
  }

  .btn-submit:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .logo-preview {
    max-width: 150px;
    max-height: 50px;
    display: block;
  }

  .btn-remove-logo {
    background: none;
    border: 1px solid var(--up-c-ef5350);
    color: var(--up-c-ef5350);
    padding: 0.3rem 0.6rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.7rem;
    font-family: var(--font-sans);
  }
  .btn-remove-logo:hover {
    background: var(--up-c-ef5350);
    color: var(--up-c-ffffff);
  }

  h3 {
    font-size: 1.4rem;
  }

  hr {
    margin: 1em 0;
    height: 1px;
    border: none;
    border-top: 1px solid var(--up-c-f1e9f7);
  }
</style>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="lightbox-overlay" on:click|self={closeLightbox}>
  <div class="lightbox-content">
    <button class="close-btn" on:click={closeLightbox}>&times;</button>
    <h3 class="pb-gap">Customise Report</h3>

    <form on:submit={_generateCustomPdf}>
      
      <div class="section-group">
        
        <div class="form-group">
          <!-- svelte-ignore a11y-label-has-associated-control -->
          <label style="padding-bottom: 0.5rem;">Cover Page Title</label>
          <input type="text" bind:value={cover_title} placeholder="Property Report" />
        </div>

        <div class="form-group">
          <!-- svelte-ignore a11y-label-has-associated-control -->
          <label style="padding-bottom: 0.5rem;">Cover Page Name</label>
          <input type="text" bind:value={cover_name} placeholder="John Doe" />
        </div>

        <div class="form-group">
          <!-- svelte-ignore a11y-label-has-associated-control -->
          <label style="padding-bottom: 0.5rem;">Cover Page Logo</label>
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 1rem; min-height: 50px;">
            <input type="file" accept="image/*" on:change={handleLogoUpload} style="flex: 1;" />
            {#if custom_logo_url}
              <div style="display: flex; align-items: center; gap: 1rem;">
                <img src={custom_logo_url} alt="Logo Preview" class="logo-preview" />
                <button type="button" class="btn-remove-logo" on:click={removeLogo} title="Remove Logo">
                  <i class=" icon-trash-2"></i>
                </button>
              </div>
            {/if}
          </div>
        </div>
      </div>

      <hr style="margin: 2rem 0; border: none; border-top: 1px solid var(--up-c-eeeeee);" />

      <h3 class="pb-gap">Select Sections</h3>

      {#each Object.entries(groupedOptions) as [groupName, options]}
        <!-- Skip Cover Page Elements as it's just a placeholder for the toggle, or we can leave the toggle for cover page here -->
        {#if groupName === 'Development Analysis' && !hasCalcData}
          <!-- No yield/residual data for this property — option hidden. -->
        {:else if groupName !== 'Cover Page Elements'}
          <div class="section-group">
            {#each options as option, index}
              <div class="flex" style={isOptionDisabled(option.id) ? 'opacity: 0.5; pointer-events: none;' : ''}>
                <div class="width-80">
                  <div class="vertical-center">
                    <label style="font-size: 0.75rem; margin: 0; font-weight: normal; height: auto; line-height: 0;">{option.label}</label>
                  </div>
                </div>
                <div class="width-20">
                  <div class="radio-buttons">
                    <label class="pill">
                      <input type="radio" name="radio-{option.id}" value={true} bind:group={option.value} on:change={saveConfig} disabled={isOptionDisabled(option.id)} /> {option.id === 'mapbox_cover' || option.id === 'mapbox_last_page' ? 'Yes' : 'Include'}
                    </label>
                    <label class="pill">
                      <input type="radio" name="radio-{option.id}" value={false} bind:group={option.value} on:change={saveConfig} disabled={isOptionDisabled(option.id)} /> {option.id === 'mapbox_cover' || option.id === 'mapbox_last_page' ? 'No' : 'Exclude'}
                    </label>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        {:else}
          <div class="section-group">
            {#each options as option, index}
              <div class="flex" style={isOptionDisabled(option.id) ? 'opacity: 0.5; pointer-events: none;' : ''}>
                <div class="width-80">
                  <div class="vertical-center">
                    <label style="font-size: 0.75rem; margin: 0; font-weight: normal; height: auto; line-height: 0;">{option.label}</label>
                  </div>
                </div>
                <div class="width-20">
                  <div class="radio-buttons">
                    <label class="pill">
                      <input type="radio" name="radio-{option.id}" value={true} bind:group={option.value} on:change={saveConfig} disabled={isOptionDisabled(option.id)} /> {option.id === 'mapbox_cover' || option.id === 'mapbox_last_page' ? 'Yes' : 'Include'}
                    </label>
                    <label class="pill">
                      <input type="radio" name="radio-{option.id}" value={false} bind:group={option.value} on:change={saveConfig} disabled={isOptionDisabled(option.id)} /> {option.id === 'mapbox_cover' || option.id === 'mapbox_last_page' ? 'No' : 'Exclude'}
                    </label>
                  </div>
                </div>
              </div>
            {/each}

            {#if savedModelView}
              <hr/>
              <div>
                <div class="form-group relative">
                  <!-- svelte-ignore a11y-label-has-associated-control -->
                  <label style="padding-bottom: 0.5rem;">Model Title</label>
                  <input type="text" bind:value={save_model_title} placeholder="" />
                </div>
              </div>
            {/if}
            
          </div>
        {/if}
      {/each}

      <button type="submit" class="btn-submit" disabled={generating_pdf}>
        {#if generating_pdf}
          <i class=" icon-loader icon-spin"></i> Generating...
        {:else}
          Generate Custom PDF
        {/if}
      </button>
    </form>
  </div>
</div>
