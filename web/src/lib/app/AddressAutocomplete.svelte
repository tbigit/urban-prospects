<script>
  // @ts-nocheck
  import { createEventDispatcher } from 'svelte';

  export let accessToken = '';
  export let placeholder = 'Enter Address';
  export let value = '';
  export let suburb_selected = [];

  const dispatch = createEventDispatcher();

  let inputEl;
  let suggestions = [];
  let showSuggestions = false;
  let isLoading = false;
  let debounceTimer;

  let typedUnitPrefix = ''; // e.g. "401/" or "Unit 4 " — preserved from user input

  async function getAddress(searchText) {
    isLoading = true;
    suggestions = [];

    try {
      // NSW bbox: west, south, east, north
      const nswBbox = '140.9993,-37.5051,153.6390,-28.1570';
      // Mapbox Geocoding v6 — supports unit-level addressing (401/, Unit 4, Apt 12, etc.)
      const url = `https://api.mapbox.com/search/geocode/v6/forward?q=${encodeURIComponent(searchText)}&access_token=${accessToken}&country=AU&bbox=${nswBbox}&types=address&limit=6`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.features && data.features.length > 0) {
        suggestions = data.features.map(f => {
          // Mapbox v6 can bleed a suburb's leading directional into `name` — for
          // 21 Queen Street, North Strathfield it returns name "21 Queen Street North"
          // while locality is "North Strathfield", so appending the suburb produced
          // "21 Queen Street North North Strathfield" and matched nothing. Both
          // context.address and name_preferred carry the unpolluted street address.
          const name = f.properties.context?.address?.name
                    ?? f.properties.name_preferred
                    ?? f.properties.name
                    ?? '';
          const postcode = f.properties.context?.postcode?.name ?? '';
          const suburb  = f.properties.context?.locality?.name ?? f.properties.context?.place?.name ?? '';
          const base    = [name, suburb, postcode].filter(Boolean).join(' ');
          // Prepend unit prefix typed by user (e.g. "401/") — v6 drops it for AU addresses
          const label   = typedUnitPrefix && !base.toLowerCase().startsWith(typedUnitPrefix.toLowerCase())
            ? typedUnitPrefix + base
            : base;
          return {
            label,
            value: f.properties.mapbox_id,
            coordinates: [f.properties.coordinates.longitude, f.properties.coordinates.latitude],
            properties: f.properties,
            feature: f,
            suburb // keep suburb to filter later
          };
        }).filter(s => s.label.trim().length > 0);

        if (suburb_selected && suburb_selected.length > 0) {
          const allowedSuburbs = suburb_selected.map(s => s.value.toLowerCase());
          suggestions = suggestions.filter(s => allowedSuburbs.includes(s.suburb.toLowerCase()));
        }

        showSuggestions = suggestions.length > 0;
      } else {
        showSuggestions = false;
      }
    } catch (error) {
      console.error('Address search error:', error);
      showSuggestions = false;
    } finally {
      isLoading = false;
    }
  }

  function handleInput(event) {
    const typed = event.target.value;
    value = typed;

    // Extract leading unit prefix (e.g. "401/", "Unit 4 ", "Apt 3 ")
    const unitMatch = typed.match(/^(\d+\/|(?:Suite|Unit|Apt|Apartment)\s+\S+\s)/i);
    typedUnitPrefix = unitMatch ? unitMatch[1] : '';

    if (typed.trim().length >= 3) {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        getAddress(typed);
      }, 300);
    } else {
      showSuggestions = false;
      suggestions = [];
    }

    dispatch('change', { value: typed });
  }

  function selectAddress(suggestion) {
    value = suggestion.label;
    setTimeout(() => {
      showSuggestions = false;
    }, 150);

    dispatch('retrieve', {
      address: suggestion.label,
      coordinates: suggestion.coordinates,
      properties: suggestion.properties,
      feature: suggestion.feature
    });
  }

  function handleBlur() {
    // Delay so click on suggestion fires before hiding
    setTimeout(() => {
      showSuggestions = false;
    }, 200);
  }

  function handleClear() {
    value = '';
    suggestions = [];
    showSuggestions = false;
    dispatch('clear', { value: '' });
  }

  export function focus() {
    inputEl?.focus();
  }

  export function blur() {
    inputEl?.blur();
  }
</script>

<div class="address-autocomplete-wrapper">
  <div class="address-input-container">
    <input
      bind:this={inputEl}
      class="address-input"
      type="text"
      bind:value={value}
      {placeholder}
      on:input={handleInput}
      on:blur={handleBlur}
      autocomplete="off"
    />

    {#if value && typeof value === 'string' && value.length > 0 && !isLoading}
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <span class="clear-btn" on:click={handleClear}>×</span>
    {/if}

    {#if isLoading}
      <span class="spinner"><i class=" icon-loader icon-spin"></i></span>
    {/if}
  </div>

  {#if showSuggestions && suggestions.length > 0}
    <ul class="suggestions-popup" style="transform: translateZ(1px);">
      {#each suggestions as suggestion}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
        <li on:click={() => selectAddress(suggestion)}>
          {suggestion.label}
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .address-autocomplete-wrapper {
    position: relative;
    width: 100%;
  }

  .address-input-container {
    position: relative;
    display: flex;
    align-items: center;
  }

  /* Copied from _page.svelte: input[type="text"] + input.input-m overrides */
  .address-input {
    font-size: 0.625rem;
    border: 1px solid var(--up-c-cccccc);
    border-radius: 0.4em;
    padding: 1em;
    padding-right: 2rem; /* room for clear/spinner icon */
    height: auto;        /* input-m override: auto instead of 42px */
    width: 100%;
    border-color: var(--up-c-5c2587); /* input-m override */
    box-sizing: border-box;
    background-color: var(--up-c-ffffff-a40); /* input-m override */
  }

  .address-input::placeholder {
    color: var(--up-c-2a1b1b);
  }

  .address-input:focus,
  .address-input:active {
    box-shadow: none;
    outline: none;
    border-color: var(--up-c-5c2587);
  }

  .address-input:hover {
    border-color: var(--up-c-5c2587);
  }

  .clear-btn {
    position: absolute;
    right: 0.5rem;
    cursor: pointer;
    color: var(--up-c-999999);
    font-size: 1.1rem;
    line-height: 1;
    user-select: none;
  }

  .clear-btn:hover {
    color: var(--up-c-5c2587);
  }

  .spinner {
    position: absolute;
    right: 0.5rem;
    color: var(--up-c-5c2587);
    font-size: 0.8rem;
    pointer-events: none;
  }

  .suggestions-popup {
    position: absolute;
    background: white;
    border: 1px solid var(--up-c-cccccc);
    border-radius: 0.4em;
    max-height: 200px;
    overflow-y: auto;
    z-index: 10;
    display: block;
    margin-top: 1px;
    width: 100%;
    left: 0;
    list-style: none;
    padding: 0;
  }

  .suggestions-popup li {
    padding: 8px;
    cursor: pointer;
    font-size: 0.75rem;
    color: var(--up-c-31144d);
    line-height: 1.3;
  }

  .suggestions-popup li:hover {
    background-color: var(--up-c-f1e9f7);
  }
</style>