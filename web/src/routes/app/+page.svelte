<script>
  // @ts-nocheck
	import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment'; // For SvelteKit
  // import moment from 'moment';
  // import { fade } from 'svelte/transition';
  // import { slide } from 'svelte/transition';

  import Handlebars from 'handlebars';

  import Select from 'svelte-select';
  import { offset as fuiOffset, flip as fuiFlip, shift as fuiShift, size as fuiSize } from '@floating-ui/dom';
  // Dropdown lists: fixed so they escape the scrolling search panel; flip/shift/size keep
  // them inside the viewport and cap the height to the room actually available.
  const select_floating = {
    strategy: 'fixed',
    placement: 'bottom-start',
    middleware: [
      fuiOffset(4),
      fuiFlip({ padding: 8 }),
      fuiShift({ padding: 8 }),
      fuiSize({ padding: 8, apply({ availableHeight, elements }) {
        elements.floating.style.maxHeight = Math.max(120, Math.min(256, availableHeight)) + 'px';
      } })
    ]
  };
  import Slider from '@bulatdashiev/svelte-slider';

  import { initPdfMe, createPdf } from "$lib/app/pdfFunctions.js";
  import constructionCosts from "$lib/app/construction_costs.json";

  import Tiptap from '$lib/app/Tiptap.svelte';
  import Legends from '$lib/app/Legends.svelte';
  import Property from '$lib/app/Property.svelte';
  import Residual from '$lib/app/Residual.svelte';
  import PropertySpec from '$lib/app/PropertySpec.svelte';
  import AddressAutocomplete from '$lib/app/AddressAutocomplete.svelte';
  import ThemeToggle from '$lib/components/ThemeToggle.svelte';

  // let myFontBinaryString;
  // let get_suburbs = [];

  let report_title;
  let report_subtitle;
  let report_button_label;
  let report_buy_button_label;
  let report_button_size;
  let app_background_color;

  let rezoned;

  let slope;
  let slopes = ['Flat to Gentle', 'Moderate', 'Moderately Steep', 'Steep', 'Very Steep to Extreme'];
  // let slopes = ['Flat to Gentle (0-5)', 'Moderate (5-10)', 'Moderately Steep (10-18)', 'Steep (18-30)', 'Very Steep to Extreme (30-90)'];

  let field_tooltip = {
    'Walk Score' : 'Walk Score is a number from 0 to 100 measuring how walkable a location is, based on walking distance to nearby amenities like shops and parks. Higher scores mean easier access on foot, while lower scores indicate car dependence.',
    'Permissible Uses' : 'Permissible uses drop down list includes uses as described in NSW environmental planning instruments. Search results will identify sites where the use and the parent group of that use is permissible',
    'Minimum Lot Size' : 'Minimum lot size includes sites with a minimum lot size permitted by an environmental planning instrument (ie LEP) within the range you have selected and sites that are not subject to any minimum lot site control',
    'Floor Space Ratios' : 'Floor Space Ratios (FSR) includes sites with a FSR permitted by an environmental planning instrument (ie LEP) within the range you have selected and sites that are not subject to any FSR control',
    'Gross Floor Area' : 'Gross Floor Area (GFA) is the FSR multiplied by the site area. The search results only include sites that are subject to an FSR control',
    'Height' : 'Height includes sites with the height control permitted by an environmental planning instrument (ie LEP) within the range you have selected and sites that are not subject to any height control',
    'Area of Land' : 'Area of Land is the area of site provided from',
    'Frontage Width' : 'Frontage Width is an estimate of the lot width as measured along the boundary with street frontage',
    'Complying Development' : 'Complying Development includes only sites that meet your criteria and suitable for complying development.',
    'Pattern Books' : 'Pattern Books includes only sites that meet your criteria and are suitable for complying development.',
    'Strata Lots' : 'Strata Lots includes all sites described as part of a Strata Plan and therefore include an SP number on their land title',
    'Multiple Frontage' : 'Multiple Frontage includes sites with multiple frontages, whether it is a rear lane, a corner lot, an irregular-shaped lot, or even an island site',
    'Heritage' : 'Heritage includes any property that is listed as locally significant, state significant, or within a Heritage Conservation Area',
    'Landslide' : 'Landslide identifies sites at risk from slope instability or subsidence (e.g. old mines), based on geological, geotechnical, and historical mining records held by state geological agencies',
    'Mine Subsidence' : 'Mine Subsidence includes sites mapped within a mine subsidence district',
    'Flood Zone': 'Flood Zone includes sites mapped within a flood zone',
    'Active Street Frontages' : 'Active Street Frontage shows sites with street frontage designated for active uses (retail, commercial) in local environmental plans, derived from council LEP / DCP zoning layers',
    'Bushfire Prone' : 'Bushfire Prone identifies sites subject to bushfire risk based on NSW RFS vegetation mapping and certified council bushfire prone land maps',
    'Drinking Catchment' : 'Drinking Catchment identifies sites within catchment areas that supply drinking water, using hydrological catchment delineations from water authorities (e.g. WaterNSW)',
    'Vacant' : 'Vacant identifies sites where development implications exist due to the presence of vacant land, as designated by the relevant NSW environmental planning instrument',
    'Wetlands' : 'Wetlands identifies sites where development implications exist due to the presence of wetlands, as designated by the relevant NSW environmental planning instrument',
    'Coastal Management' : 'Coastal Management shows sites affected by coastal hazards (erosion, inundation, coastal works) based on the NSW Resilience and Hazards SEPP and coastal hazard mapping',
    'Airport Noise' : 'Airport Noise identifies sites affected by airport noise as designated by the relevant NSW environmental planning instrument',
    'Groundwater Vulnerability' : 'Groundwater vulnerability identifies sites where development implications exist due to the presence of vulnerable groundwater resources as designated by the relevant NSW environmental planning instrument',
    'Mineral and Resource land' : 'Mineral and Resource land identifies sites where development implications exist due to presence of mineral and extractive resources, as designated by the relevant NSW environmental planning instrument (EPI',
    'Riparian lands and Water Courses' : 'Riparian Lands and Water Courses identifies sites where development implications exist to reduce impacts in riparian lands and watercourses, as designated by a NSW environmental planning instrument',
    'Salinity' : 'Salinity identifies sites where development implications exist due to the presence of salinity, to ensure the effects of development are minimised and mitigated, as designated by a NSW environmental planning instrument',
    'Scenic Protection lands' : 'Scenic Protection Lands indicates sites subject to scenic or visual amenity protection as defined in planning instruments',
    'Terrestrial Biodiversity' : 'Terrestrial Biodiversity are sites mapped has having biodiversity values by the State Government or Council',
    'Contaminated Sites' : 'Contaminated Sites are sites on the NSW EPA Register of contaminated lands',
    'Low and Mid-Rise Housing (LMR)' : 'Low and Mid-Rise Housing identifies sites suitable for low and mid-rise residential development under recent housing reforms',
    'Transport Oriented Development (TOD)' : 'Transport Oriented Development identifies sites within proximity to train stations that are suitable for increased residential density under recent housing reforms'
  };

  let buy_report = false;

  let suppressClicksUntil = 0;
;
  let selectedId = null;

  let has_ran_search = false;

  let mapview_viewing_property = false;
  let search_form_expand = true;

  let retrieving = [];

  let is_print = false;
  let pdf_property;

  let generating_pdf = false;


  let default_map_status = '';
  let map_status = '';


  let exclusion_options = [
    { name: 'activestreetfrontage', label: 'Active Street Frontages', selectedValue: "0" },
    { name: 'australian_noise_exposure_forecast', label: 'Airport Noise', selectedValue: "0" },
    { name: 'biodiversity', label: 'Terrestrial Biodiversity', selectedValue: "0" },
    { name: 'bushfireproneland', label: 'Bushfire Prone', selectedValue: "0" },
    { name: 'coastalmanagement', label: 'Coastal Management', selectedValue: "0" },
    { name: 'contamination_activity_type', label: 'Contaminated Sites', selectedValue: "0" },
    { name: 'drinkingcatchment', label: 'Drinking Catchment', selectedValue: "0" },
    { name: 'floodmapping', label: 'Flood Zone', selectedValue: "0" },
    { name: 'groundwatervulnerability', label: 'Groundwater Vulnerability', selectedValue: "0" },
    { name: 'h_name', label: 'Heritage', selectedValue: "0" },
    { name: 'landslidrisk', label: 'Landslide', selectedValue: "0" },
    // { name: 'low_mid_rise_housing', label: 'Low & Mid-Rise Housing (LMR)', selectedValue: "0" },
    { name: 'mineralresoureland', label: 'Mineral & Resource land', selectedValue: "0" },
    { name: 'minesubsidence', label: 'Mine Subsidence', selectedValue: "0" },
    { name: 'multiplefrontage', label: 'Multiple Frontage', selectedValue: "0" },
    { name: 'riparianlandwatercouse', label: 'Riparian lands and Water Courses', selectedValue: "0" },
    { name: 'salinity', label: 'Salinity', selectedValue: "0" },
    { name: 'scenicprotectionland', label: 'Scenic Protection lands', selectedValue: "0" },
    { name: 'strata', label: 'Strata Lots', selectedValue: "0" },
    // { name: 'transport_oriented_development', label: 'Transport Oriented Development (TOD)', selectedValue: "0" },
    { name: 'vacant', label: 'Vacant', selectedValue: "0" },
    { name: 'wetland', label: 'Wetlands', selectedValue: "0" },
  ];

  let exclusionLabelMap = {};
  exclusion_options.forEach(opt => {
    exclusionLabelMap[opt.name] = opt.label;
  });

  let showSuggestions = false;
  let filtered_addresses = [];

  let get_address_timeout;

  // Due-diligence report purchase went through the WordPress WooCommerce cart.
  // Paused until the Stripe checkout lands; see PURCHASES_PAUSED in Property.svelte.
  const PURCHASES_PAUSED = true;
  let paused_notice = '';
  let paused_notice_timer;
  function _show_paused_notice() {
    paused_notice = 'Report purchases are temporarily unavailable while we move to our new billing system. They will be back within the next few weeks.';
    clearTimeout(paused_notice_timer);
    paused_notice_timer = setTimeout(() => { paused_notice = ''; }, 6000);
  }
  function _buy_report(gid, address) {
    if (PURCHASES_PAUSED) { _show_paused_notice(); return; }
    window.parent.location.href = website_domain_with_http + '/checkout/?add-to-cart=9926&quantity=1&gurasid=' + gid + '&address=' + address;
  }

  function toggleCollapsibleContent(event) {
    // Get the target element (the .collapsible-title)
    const target = event.target;
    // Find the closest parent with class .collapsible-title
    const collapsibleTitle = target.closest('.collapsible-title');
    
    if (collapsibleTitle) {
      // Find the next sibling with class .collapsible-content
      const collapsibleContent = collapsibleTitle.nextElementSibling;
      
      if (collapsibleContent && collapsibleContent.classList.contains('collapsible-content')) {
          // Toggle the visibility of the collapsible content
          collapsibleContent.classList.toggle('animate-fade-out');
      }
    }
  }

  function _toggle_search_panel (e) {
    e.preventDefault();
    search_form_expand = ! search_form_expand;
    return false;
  }

  function handleInput(event) {
    address_selected = event.target.value;
    let address_entered = address_selected.replace(/^(Suite|Unit|Apt|Apartment)(\s|$)/gi, '');

    if (address_entered.length > 2 && address_entered.match(/[a-z]/g)) { // Trigger search after 2 characters
      clearTimeout(get_address_timeout);
      get_address_timeout = setTimeout(function(){
        getAddress(address_selected);
      }, 10);
      
    } else {
      showSuggestions = false; // Hide suggestions if input is less than 3 characters
    }
  }

  function selectAddress(address) {
    console.log('selectAddress: ' + address);
    address_selected = address;
    setTimeout(() => {
      showSuggestions = false; // Hide suggestions after selection
    }, 150);
  }

  function closeSuggestions() {
    // Delay closing suggestions to allow click event to register
    // setTimeout(() => {
    //   showSuggestions = false; // Hide suggestions after selection
    // }, 600);
  }

  async function getAddress(address) {
    filtered_addresses = [];

    address = address.replace(/\s?\d{4}\s*$/i, '').trim();

    var address_body = {"address": address};

    if (regions_selected && regions_selected.length > 0) {
      address_body.regions = regions_selected;
    }
    if (lga_names_selected && lga_names_selected.length > 0) {
      address_body.lga_names = lga_names_selected.map(d => d.value);
    }
    if (suburb_selected && suburb_selected.length > 0) {
      address_body.suburbnames = suburb_selected.map(d => d.value);
    }

    const address_response = await fetch(`${api_domain}/address/search`, {
      method: 'POST',
      cache: "no-cache",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(address_body)
    }).then(address_response => address_response.json()).catch(function(){});
     if (address_response && address_response.length) {
      filtered_addresses = address_response;
      showSuggestions = true; // Show suggestions if there are results
      // setTimeout(() => {
      //   scrollToShowSuggestions();
      // }, 100);
      
      } else {
        showSuggestions = false; // Hide suggestions if no results
      }
  }

  function scrollToShowSuggestions() {
    const suggestionsPopup = document.querySelector('.suggestions-popup');
    const parentContainer = document.querySelector('.filter-container');

    if (suggestionsPopup && parentContainer) {
        const popupHeight = suggestionsPopup.getBoundingClientRect().height;
        const containerScrollHeight = parentContainer.scrollHeight;

        // Smooth scroll to the bottom of the container
        parentContainer.scrollTo({
            top: containerScrollHeight,
            behavior: 'smooth' // Enable smooth scrolling
        });
    }
  }

  function handleRadioChange(event, exclusion) {
     exclusion_options.forEach(option => {

      if (option.selectedValue == "2") {
        no_exclusions[option.name] = 2;
      }
      else if (option.selectedValue == "1") {
        no_exclusions[option.name] = 1;
      }
      else {
        delete no_exclusions[option.name];
      }
    });
  }

  let custom_fsr_min;
  let custom_fsr_max;

  let custom_gfa_min;
  let custom_gfa_max;

  let custom_price_range_min;
  let custom_price_range_max;

  let custom_lot_size_range_min;
  let custom_lot_size_range_max;

  let custom_area_size_range_min;
  let custom_area_size_range_max;


  let custom_walkable_score_min;
  let custom_walkable_score_max;

  let custom_height_min;
  let custom_height_max;

  let custom_width_min;
  let custom_width_max;

  let custom_depth_min;
  let custom_depth_max;

  let website_domain_with_http = 'https://www.urbanprospects.com.au';

  let is_subscribing = false;
  let is_subscribed = false;
  let subscribe_email;

  let user_template = `<p>Hello Homeowner,</p><p></p><p>I hope this message finds you well. My name is <strong>{{user.first_name}} {{user.last_name}}</strong>, and I am a site developer interested in acquiring the property located at: <br></p><p><strong>{{property.address}}</strong><br></p><p>Having researched the property, I am confident that it presents significant potential for development and investment. I am keen to explore the possibility of purchasing this property from you. <br></p><p>I would appreciate the opportunity to discuss this matter further at your earliest convenience. Please feel free to contact me via email or phone to arrange a suitable time for a meeting. <br></p><p>Thank you for considering my inquiry. I look forward to your response. <br></p><p></p><p></p><p></p><p></p><p>Best Regards,</p><p>{{user.first_name}} {{user.last_name}}<br>{{user.email}}<br></p><p></p>`;

  let from_first_name;
  let from_last_name;
  let from_company_name;
  let from_address_1;
  let from_address_2;
  let from_postcode;
  let from_city;
  let from_state = 'NSW';
  let custom_logo_url;


  // let api_domain = 'https://upapi.imtg.com.au';
  let api_domain = '/q';
  let geo_server_url_with_http = 'https://urbanprospects.com.au/p';

  let map;
  let markers = [];
  let suburb_markers = [];
  // Result rendering as GPU layers (replaces DOM markers):
  let property_results_fc = { type: 'FeatureCollection', features: [] }; // property circle source data
  let suburb_results_fc = { type: 'FeatureCollection', features: [] };   // teal suburb circle source data
  let suburb_matches = [];                       // last get_suburb response (name + centroid)
  let suburb_match_filter = ['boolean', false];  // Suburbs-tile filter for matching suburbs
  let _resultClickHandlersBound = false;         // bind property/suburb click handlers only once (map.on persists across style reloads)

  let circle_radius;
  let circle_center;

  let is_search_within_radius = false;

  let draw;
  let draw_circle_mode = false;
  let draw_line_mode = false;
  let draw_polygon_mode = false;
  let draw_multi_line_mode = false;


  let satellite = false;
  let use_map_layer = false;
  let zoom_boundary = 15;
  let hide_properties = true;


  let currentZoom = 11;

  const initialState = {
    center: [151.2120881644596, -33.88465867322051],
    zoom: 11,
    pitch: 0,
    bearing: 0,
    projection: 'globe'
  };

  let mapping_layers = {
    zoning: false,
    ass: false,
    frontage: false,
    airport: false,
    bushfire: false,
    heritage: false,
    // multiplefrontage: false,
    fsr: false,
    hob: false,
    lsz: false,
    floodplanning: false,
    coastalmanagement: false,
    contaminationsites: false,
    declaredwildness: false,
    developmentcontrolplan: false,
    drinking_water_catchment: false,
    environmentally_sensitive_land: false,
    groundwatervulnerability: false,
    // lga: false,
    landsliderisk: false,
    mine_subsidence_district: false,
    mineralresourceland: false,
    obstaclelimitationsurface: false,
    regionalgrowthboundary: false,
    riparianlandwatercourse: false,
    salinity: false,
    scenicprotectionland: false,
    suburbs: false,
    terrestrialbiodiversity: false,
    wetlands: false,
    lot: true,
    contour: false,
    property_crime: false,
    violent_crime: false,
    electricity_transmission_lines: false,
    gas_pipelines: false,
    oil_pipelines: false,
    electricity_transmission_substations: false,
    liquid_fuel: false,
    petrol_stations: false,
    transport_oriented_development: false,
    lowmidrise_development: false,
    lgapopulation: false,
    da_applications_lot: false,
    da_applications_lot_by_application_type: false,
    slope: false,
  };

  async function _handle_change_map_layer() {
    if (use_map_layer) {
      search_form_expand = true;
    }
  }

  async function _handle_toggle_search_by_radius() {

    if (is_search_within_radius) {
      _handle_search_property(3,1);
    }
    else {
      _handle_search_property(2,1);
    }
  }

  // The basemap follows the site theme (data-theme on <html>, stamped by the
  // pre-paint script and the theme toggle): Mapbox Standard's 'night' preset in
  // dark mode, 'day' in light, same monochrome theme either way. Satellite is
  // photography and has no dark variant.
  const _map_light_preset = () =>
    (typeof document !== 'undefined' && document.documentElement.dataset.theme === 'dark') ? 'night' : 'day';
  function _apply_map_theme() {
    if (!map || satellite) return;
    try { map.setConfigProperty('basemap', 'lightPreset', _map_light_preset()); } catch (e) { /* style still loading */ }
  }

  async function _handle_change_map_style() {

    if (satellite) {
      map.setStyle('mapbox://styles/mapbox/satellite-v9');
    }
    else {
        map.setStyle('mapbox://styles/mapbox/standard');
        map.once('style.load', () => {  // 'once' prevents multiple triggers
          map.setConfigProperty('basemap', 'lightPreset', _map_light_preset());
          map.setConfigProperty('basemap', 'theme', 'monochrome');
          // map.setConfigProperty('basemap', 'show3dObjects', false); // Flat map
        });
        
    }
   
    _handle_delete_all();
  }

  async function _toggle_info(event) {
    event.preventDefault();

    use_legend  = !use_legend;
    
    return false;
  }

  async function _reset_map(event) {
    event.preventDefault();

    for (let key in mapping_layers) {
      mapping_layers[key] = false;
      map.setLayoutProperty(`custom-layer-${key}`, 'visibility', 'none');
      if (map.getLayer(`custom-labels-${key}`)) {
        map.setLayoutProperty(`custom-labels-${key}`, 'visibility', 'none');
      }
    }

    if (properties && properties.length) {

      var bounds = new mapboxgl.LngLatBounds();

      properties.forEach(property => {
        bounds.extend([property.geom.coordinates[0], property.geom.coordinates[1]]);
        // Store the marker in the array
      });

      map.fitBounds(bounds, {
        padding: 40, // Optional: Add padding around the markers
        maxZoom: 17  // Zoom in to level 17 after fitting bounds
      });
    }
    else {
      map.flyTo({
          center: initialState.center,
          zoom: initialState.zoom,
          pitch: initialState.pitch,
          bearing: initialState.bearing,
          duration: 1000 // Animation duration in milliseconds
      });
      clearMarkers();
    }

    
    return false;
  }

  // DRAW FEATURES

  async function _handle_draw_line () {
    if (draw_line_mode) {
      draw_line_mode = false;
      _map_draw_reset();
    } else {
      draw_circle_mode = false;
      draw_polygon_mode = false;
      draw_multi_line_mode = false;
      draw_line_mode = true;
      draw.changeMode('draw_line_string'); 
      document.querySelector('.map-container').classList.add('mapboxgl-map');
    }
  }

  async function _handle_draw_multi_line () {
    if (draw_multi_line_mode) {
      draw_multi_line_mode = false;
      _map_draw_reset();
    } else {
      draw_circle_mode = false;
      draw_line_mode = false;
      draw_polygon_mode = false;
      draw_multi_line_mode = true;
      draw.changeMode('draw_line_string'); 
      document.querySelector('.map-container').classList.add('mapboxgl-map');
    }
  }

  async function _handle_zoom_in() {
    if (map) {
      const currentZoom = map.getZoom();
      map.zoomTo(Math.min(currentZoom + 1, 22));
    }
  }

  async function _handle_zoom_out() {
    if (map) {
      const currentZoom = map.getZoom();
      map.zoomTo(Math.max(currentZoom - 1, 0));
    }
  }

  let map_3d = false;
  let map_spin = false;
  let spinInterval;
  let model_loaded = false;
  let isProgrammaticMove = false;
  
  async function _handle_toggle_3d() {
    if (map) {
      map_3d = !map_3d;
      if (map_3d) {
        map.easeTo({ pitch: 60, bearing: -17.6, duration: 1000 });
      } else {
        map.easeTo({ pitch: 0, bearing: 0, duration: 1000 });
        map_spin = false;
        clearInterval(spinInterval);
      }
    }
  }
  
  function _handle_toggle_spin() {
    if (!map_3d) return;
    
    map_spin = !map_spin;
    if (map_spin) {
      spinInterval = setInterval(() => {
        if (map) {
          const currentBearing = map.getBearing();
          map.setBearing(currentBearing + 0.5);
        }
      }, 50);
    } else {
      clearInterval(spinInterval);
    }
  }
  
  function removePropertyModelFromMap() {
    if (map) {
      if (map.getLayer('property-model-layer')) {
        map.removeLayer('property-model-layer');
      }
      if (map.getSource('property-model-source')) {
        map.removeSource('property-model-source');
      }
      if (map.getSource('property-model')) {
        map.removeSource('property-model');
      }
      // Assuming we need to remove the clipping layer as well if we clear the model
      if (map.getLayer('property-clip-layer')) {
        map.removeLayer('property-clip-layer');
      }
      if (map.getSource('property-footprint-source')) {
        map.removeSource('property-footprint-source');
      }
    }
  }

  async function _handle_draw_polygon () {

    _handle_delete_all()
    

    draw_polygon_mode = !draw_polygon_mode;
    if (draw_polygon_mode) {
      draw_circle_mode = false;
      draw_line_mode = false;
      draw_multi_line_mode = false;
      draw.changeMode('draw_polygon');
      document.querySelector('.map-container').classList.add('mapboxgl-map');
    }
    else {
      _map_draw_reset();
    }
  }

  async function _handle_draw_circle () {

    _handle_delete_all()
    

    draw_circle_mode = !draw_circle_mode;
    if (draw_circle_mode) {
      map.dragPan.disable();
      draw_line_mode = false;
      draw_polygon_mode = false;
      draw_multi_line_mode = false;
      draw.changeMode('draw_circle');
      document.querySelector('.map-container').classList.add('mapboxgl-map');
    }
    else {
      _map_draw_reset();
    }
  }
  
  function _map_draw_reset() {
    draw.changeMode('simple_select');
    map.dragPan.enable();
    map.boxZoom.enable();
    draw_circle_mode = false;
    draw_multi_line_mode = false;
  }

  
  function removeFeatureLabels() {
    const data = draw.getAll(); // Get all features from the draw instance
  
    // Loop through each feature to remove associated labels
    data.features.forEach(feature => {
      let sourceId, layerId;

      // Check for Polygon features
      if (feature.geometry.type === 'Polygon') {
          sourceId = `polygon-label-${feature.id}`;
          layerId = `polygon-label-layer-${feature.id}`;
      }

      // Check for LineString features
      if (feature.geometry.type === 'LineString') {
          sourceId = `line-label-${feature.id}`;
          layerId = `line-label-layer-${feature.id}`;
      }

      // Remove the label source if it exists
      if (sourceId && map.getSource(sourceId)) {
          map.removeSource(sourceId);
          console.log(`Removed source: ${sourceId}`);
      }

      // Remove the label layer if it exists
      if (layerId && map.getLayer(layerId)) {
          map.removeLayer(layerId);
          console.log(`Removed layer: ${layerId}`);
      }
    });

    // Also remove multi-line total label if it exists
    const multiLineSourceId = 'multi-line-total-label';
    const multiLineLayerId = 'multi-line-total-label-layer';
    if (map.getSource(multiLineSourceId)) {
        map.removeSource(multiLineSourceId);
        console.log(`Removed source: ${multiLineSourceId}`);
    }
    if (map.getLayer(multiLineLayerId)) {
        map.removeLayer(multiLineLayerId);
        console.log(`Removed layer: ${multiLineLayerId}`);
    }
  }

  async function _handle_delete_all() {

    // Delete all features from the draw instance
    removeFeatureLabels();
    draw.deleteAll();
    
    // Reset circle properties
    circle_radius = 0;
    circle_center = null;

    if (is_search_within_radius) {
      _handle_search_property(3, 1);
    }
  }


  async function _handle_change_mapping_layer() {
    setTimeout(function(){
      for (let key in mapping_layers) {
        const visibility = mapping_layers[key] ? 'visible' : 'none';
        if (map.getLayer(`custom-layer-${key}`)) {
          map.setLayoutProperty(`custom-layer-${key}`, 'visibility', visibility);
        }
        // Any layer that also has a centred label layer (zoning, contour, DA) toggles together.
        if (map.getLayer(`custom-labels-${key}`)) {
          map.setLayoutProperty(`custom-labels-${key}`, 'visibility', visibility);
        }
      }
    }, 0);
    
  }
  


  let change_bound_timeout;
  let currentSelectedMarkerEl = null;

  // Renders the property results as a single GPU circle layer (property-results-circles)
  // instead of one DOM marker per result. Clicking is handled by custom-layer-lot-fill.
  function addMarkers(properties, changebound) {
    const features = [];
    const bounds = mapboxgl ? new mapboxgl.LngLatBounds() : null;
    let property_count = 0;
    if (properties && properties.length) {
      properties.forEach((property) => {
        if (!property || !property.geom || !property.geom.coordinates) return;
        features.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: property.geom.coordinates },
          properties: { gurasid: property.gurasid }
        });
        // Extend over EVERY result, not the first handful. Capping this at 5 meant the map
        // fitted to whichever five came back first, so a suburb search could settle on a
        // viewport that excluded most of its own result set — and because the search is then
        // re-run bounded to that viewport, qualifying sites outside it disappeared.
        // bounds.extend is cheap; there is no reason to cap it.
        if (bounds) bounds.extend(property.geom.coordinates);
        property_count++;
      });
    }

    property_results_fc = { type: 'FeatureCollection', features };
    if (map && map.getSource('property-results')) {
      map.getSource('property-results').setData(property_results_fc);
    }

    if (changebound && map && property_count > 0 && bounds) {
      clearTimeout(change_bound_timeout);
      change_bound_timeout = setTimeout(function(){
        map.fitBounds(bounds, {
          padding: 40,
          // minZoom is not a fitBounds option — with a single result the map used to
          // zoom to max. Cap it so one result still shows the surrounding streets.
          maxZoom: (zoom_boundary + 1)
        });
      }, 10);
    }
  }

  function clearMarkers() {
    property_results_fc = { type: 'FeatureCollection', features: [] };
    if (map && map.getSource('property-results')) {
      map.getSource('property-results').setData(property_results_fc);
    }
  }


// Highlights matching suburbs as teal circle markers (suburb-results-circles) built from the
// get_suburb centroids. (The Suburbs vector tile serves no data, so the polygon-fill highlight
// below it never renders — the GeoJSON circles are the functional path.)
function _suburb_name(s) {
  if (!s) return '';
  return String(s.suburbname || s.suburb_name || s.SUBURBNAME || s.name || '');
}

// Build the teal circle source data from the matched suburb centroids and push it to the map.
function _refresh_suburb_circles() {
  const features = (suburb_matches || []).map(s => {
    const c = s && s.geom && s.geom.coordinates;
    if (!c || c.length < 2 || !isFinite(c[0]) || !isFinite(c[1])) return null;
    return { type: 'Feature', geometry: { type: 'Point', coordinates: [c[0], c[1]] }, properties: { name: _suburb_name(s) } };
  }).filter(Boolean);
  suburb_results_fc = { type: 'FeatureCollection', features };
  if (map && map.getSource('suburb-results')) {
    map.getSource('suburb-results').setData(suburb_results_fc);
  }
}

function addSuburbMarkers(suburbs) {
  suburb_matches = Array.isArray(suburbs) ? suburbs : [];
  const names = suburb_matches.map(s => _suburb_name(s).toUpperCase()).filter(Boolean);
  suburb_match_filter = names.length
    ? ['match', ['upcase', ['to-string', ['get', 'SUBURBNAME']]], names, true, false]
    : ['boolean', false];
  if (map && map.getLayer('custom-layer-suburb-match')) {
    map.setFilter('custom-layer-suburb-match', suburb_match_filter);
    map.setFilter('custom-layer-suburb-match-outline', suburb_match_filter);
  }
  _refresh_suburb_circles();
}

function clearSuburbMarkers() {
  suburb_matches = [];
  suburb_match_filter = ['boolean', false];
  if (map && map.getLayer('custom-layer-suburb-match')) {
    map.setFilter('custom-layer-suburb-match', suburb_match_filter);
    map.setFilter('custom-layer-suburb-match-outline', suburb_match_filter);
  }
  _refresh_suburb_circles();
}

// Toggle result layers by zoom: property circles when zoomed in, teal suburb circles when zoomed out.
function _set_result_layer_zoom(zoomedIn) {
  if (!map) return;
  if (map.getLayer('property-results-circles')) {
    map.setLayoutProperty('property-results-circles', 'visibility', zoomedIn ? 'visible' : 'none');
  }
  const subVis = zoomedIn ? 'none' : 'visible';
  ['custom-layer-suburb-match', 'custom-layer-suburb-match-outline', 'suburb-results-circles', 'suburb-results-labels'].forEach(id => {
    if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', subVis);
  });
}

// Zoom OUT to fit every matching suburb (from the get_suburb response) so they all show as teal
// highlights at once. The user can then click a suburb to fly in and reveal its purple property
// dots. Used for suburb searches instead of zooming straight into the first few property points.
function _fit_to_suburb_matches(suburbs) {
  if (!map || !mapboxgl || !Array.isArray(suburbs) || !suburbs.length) return false;
  const bounds = new mapboxgl.LngLatBounds();
  let n = 0;
  suburbs.forEach(s => {
    const c = s && s.geom && s.geom.coordinates;
    if (c && c.length >= 2 && isFinite(c[0]) && isFinite(c[1])) { bounds.extend([c[0], c[1]]); n++; }
  });
  if (!n) return false;
  isProgrammaticMove = false; // allow zoom/move handlers to run; we stay below zoom_boundary
  map.fitBounds(bounds, {
    padding: 80,
    maxZoom: zoom_boundary - 1, // stay zoomed out so matching suburbs render as teal, not property circles
    duration: 1000
  });
  _set_result_layer_zoom(false); // show teal suburb highlights, hide property circles
  return true;
}



  function zoomMap(level) {
    map.easeTo({
      zoom: level,
      duration: 1000 // Duration in milliseconds for the zoom animation
    });
  }

  function _add_individual_layer(name, source, colours) {

    if (name == 'lot') {
      // The Lot tileset is only generated at native zoom 15 (higher zooms return 204 No Content).
      // Cap maxzoom at zoom_boundary so Mapbox overzooms the z15 tiles when the user zooms in
      // further, instead of requesting empty z16+ tiles (which made the lot lines disappear).
      map.addSource(`custom-tiles-${name}`, {
        type: 'vector',
        tiles: [
          `${geo_server_url_with_http}/${source}/{z}/{x}/{y}`
        ],
        minzoom: zoom_boundary,
        maxzoom: zoom_boundary
      });
    }
    else if (name == 'da_applications_lot' || name == 'da_applications_lot_by_application_type' || name == 'slope') {
      map.addSource(`custom-tiles-${name}`, {
        type: 'vector',
        tiles: [
          `${geo_server_url_with_http}/${source}/{z}/{x}/{y}`
        ],
        minzoom: zoom_boundary
      });
    }
    else if (name == 'lot-fill') {
      // Same Lot tileset as above (used for click-to-select) — overzoom z15 tiles so lots stay
      // clickable when zoomed past 15.
      map.addSource(`custom-tiles-${name}`, {
        type: 'vector',
        tiles: [
          `${geo_server_url_with_http}/${source}/{z}/{x}/{y}`
        ],
        promoteId: 'objectid',
        minzoom: zoom_boundary,
        maxzoom: zoom_boundary
      });
    }
    else {
      map.addSource(`custom-tiles-${name}`, {
        type: 'vector',
        tiles: [
          `${geo_server_url_with_http}/${source}/{z}/{x}/{y}`
        ],
        minzoom: 5,
        maxzoom: 22
      });
    }
    
    if (name.match(/^(developmentcontrolplan)$/)) {
      map.addLayer({
        'id': `custom-layer-${name}`,
        'type': 'line',  // Change from 'fill' to 'line'
        'source': `custom-tiles-${name}`,
        'source-layer': source,
        'layout': {
          'visibility': 'none'
        },
        'paint': {
          'line-color': colours,  // Set the color here
          'line-opacity': 1,  // Optional: Adjust the opacity of the border
          'line-width': 1       // Optional: Set the border width
        }
      });
    }
    else if (name.match(/^(contour)$/)) {
      map.addLayer({
        'id': `custom-layer-${name}`,
        'type': 'line',  // Change from 'fill' to 'line'
        'source': `custom-tiles-${name}`,
        'source-layer': source,
        'layout': {
          'visibility': 'none'
        },
        'paint': {
          'line-color': colours,  // Set the color here
          'line-opacity': 0.3,  // Optional: Adjust the opacity of the border
          'line-width': 1       // Optional: Set the border width
        }
      });

      // Add a symbol layer to show elevation numbers
      map.addLayer({
          'id': `custom-labels-${name}`,
          'type': 'symbol',
          'source': `custom-tiles-${name}`,
          'source-layer': source,
          'layout': {
          'symbol-placement': 'line', // place labels along lines
          'text-field': ['to-string', ['get', 'elevation']], // get elevation attribute value and convert it to string
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
          'text-size': 8,
          'text-allow-overlap': false,
          'visibility': 'none'
        },
        'paint': {
          'text-color': '#31144D',
          'text-halo-color': '#ffffff',
          'text-halo-width': 1
        }
      });

    }
    else if (name.match(/^(electricity_transmission_substations)$/)) {

      const electricity_station_svg = `<?xml version="1.0" encoding="iso-8859-1"?>
<svg fill="#00BFFF" height="800px" width="800px" version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" 
	 viewBox="0 0 463 463" xml:space="preserve">
<path d="M367.5,191c4.143,0,7.5-3.357,7.5-7.5v-16c0-0.278-0.018-0.551-0.047-0.821c-0.004-0.038-0.013-0.075-0.017-0.113
	c-0.039-0.312-0.099-0.617-0.175-0.916c-0.016-0.061-0.03-0.123-0.047-0.184c-0.093-0.331-0.205-0.654-0.341-0.964
	c-0.014-0.031-0.03-0.061-0.044-0.092c-0.131-0.288-0.28-0.565-0.445-0.832c-0.032-0.053-0.062-0.106-0.096-0.158
	c-0.182-0.28-0.382-0.546-0.599-0.799c-0.046-0.053-0.094-0.104-0.141-0.155c-0.223-0.245-0.458-0.479-0.711-0.693
	c-0.012-0.01-0.022-0.023-0.034-0.033l-0.03-0.025c-0.001,0-0.001-0.001-0.002-0.002l-94.235-78.529L254.684,5.345
	C253.732,2.173,250.813,0,247.5,0h-32c-3.313,0-6.232,2.173-7.184,5.345l-23.351,77.838L90.73,161.712
	c-0.001,0.001-0.001,0.001-0.002,0.002l-0.03,0.025c-0.012,0.01-0.022,0.023-0.034,0.033c-0.253,0.214-0.488,0.448-0.711,0.693
	c-0.047,0.052-0.096,0.102-0.141,0.155c-0.217,0.253-0.417,0.519-0.599,0.799c-0.034,0.052-0.064,0.105-0.096,0.158
	c-0.164,0.267-0.314,0.543-0.444,0.831c-0.014,0.031-0.031,0.062-0.045,0.093c-0.135,0.311-0.247,0.633-0.34,0.964
	c-0.017,0.061-0.032,0.122-0.047,0.184c-0.076,0.299-0.136,0.604-0.175,0.916c-0.005,0.038-0.013,0.075-0.017,0.113
	C88.018,166.949,88,167.222,88,167.5v16c0,4.143,3.357,7.5,7.5,7.5s7.5-3.357,7.5-7.5V175h67.784L90.73,241.712
	c-0.001,0.001-0.001,0.001-0.002,0.002l-0.03,0.025c-0.012,0.01-0.022,0.023-0.034,0.033c-0.253,0.214-0.488,0.448-0.711,0.693
	c-0.047,0.052-0.096,0.102-0.141,0.155c-0.217,0.253-0.417,0.519-0.599,0.799c-0.034,0.052-0.064,0.105-0.096,0.158
	c-0.164,0.267-0.314,0.543-0.444,0.831c-0.014,0.031-0.031,0.062-0.045,0.093c-0.135,0.311-0.247,0.633-0.34,0.964
	c-0.017,0.061-0.032,0.122-0.047,0.184c-0.076,0.299-0.136,0.604-0.175,0.916c-0.005,0.038-0.013,0.075-0.017,0.113
	C88.018,246.949,88,247.222,88,247.5v16c0,4.143,3.357,7.5,7.5,7.5s7.5-3.357,7.5-7.5V255h67.784L90.73,321.712
	c-0.001,0.001-0.001,0.001-0.002,0.002l-0.03,0.025c-0.012,0.01-0.022,0.023-0.034,0.033c-0.253,0.214-0.488,0.448-0.711,0.693
	c-0.047,0.052-0.096,0.102-0.141,0.155c-0.217,0.253-0.417,0.519-0.599,0.799c-0.034,0.052-0.064,0.105-0.096,0.158
	c-0.164,0.267-0.314,0.543-0.444,0.831c-0.014,0.031-0.031,0.062-0.045,0.093c-0.135,0.311-0.247,0.633-0.34,0.964
	c-0.017,0.061-0.032,0.122-0.047,0.184c-0.076,0.299-0.136,0.604-0.175,0.916c-0.005,0.038-0.013,0.075-0.017,0.113
	C88.018,326.949,88,327.222,88,327.5v16c0,4.143,3.357,7.5,7.5,7.5s7.5-3.357,7.5-7.5V335h79.464l-21.188,113H151.5
	c-4.143,0-7.5,3.357-7.5,7.5s3.357,7.5,7.5,7.5h24c4.143,0,7.5-3.357,7.5-7.5c0-3.795-2.82-6.923-6.478-7.422l3.46-18.454
	l51.516-51.515l44.308,44.31l3.201,25.607c-3.912,0.255-7.007,3.499-7.007,7.475c0,4.143,3.357,7.5,7.5,7.5h24
	c4.143,0,7.5-3.357,7.5-7.5s-3.357-7.5-7.5-7.5h-9.379l-14.125-113H360v8.5c0,4.143,3.357,7.5,7.5,7.5s7.5-3.357,7.5-7.5v-16
	c0-0.278-0.018-0.551-0.047-0.821c-0.004-0.038-0.013-0.075-0.017-0.113c-0.039-0.312-0.099-0.617-0.175-0.916
	c-0.016-0.061-0.03-0.123-0.047-0.184c-0.093-0.331-0.205-0.654-0.341-0.964c-0.014-0.031-0.03-0.061-0.044-0.092
	c-0.131-0.288-0.28-0.565-0.445-0.832c-0.032-0.053-0.062-0.106-0.096-0.158c-0.182-0.28-0.382-0.546-0.599-0.799
	c-0.046-0.053-0.094-0.104-0.141-0.155c-0.223-0.245-0.458-0.479-0.711-0.693c-0.012-0.01-0.022-0.023-0.034-0.033l-0.03-0.025
	c-0.001,0-0.001-0.001-0.002-0.002L292.216,255H360v8.5c0,4.143,3.357,7.5,7.5,7.5s7.5-3.357,7.5-7.5v-16
	c0-0.278-0.018-0.551-0.047-0.821c-0.004-0.038-0.013-0.075-0.017-0.113c-0.039-0.312-0.099-0.617-0.175-0.916
	c-0.016-0.061-0.03-0.123-0.047-0.184c-0.093-0.331-0.205-0.654-0.341-0.964c-0.014-0.031-0.03-0.061-0.044-0.092
	c-0.131-0.288-0.28-0.565-0.445-0.832c-0.032-0.053-0.062-0.106-0.096-0.158c-0.182-0.28-0.382-0.546-0.599-0.799
	c-0.046-0.053-0.094-0.104-0.141-0.155c-0.223-0.245-0.458-0.479-0.711-0.693c-0.012-0.01-0.022-0.023-0.034-0.033l-0.03-0.025
	c-0.001,0-0.001-0.001-0.002-0.002L292.216,175H360v8.5C360,187.643,363.357,191,367.5,191z M213.535,40.151l7.354,7.354
	l-13.658,13.658L213.535,40.151z M209.607,160l21.893-21.894L253.393,160H209.607z M253.393,175L231.5,196.893L209.607,175H253.393z
	 M209.606,95h43.787L231.5,116.894L209.606,95z M255.773,61.178l-13.671-13.671l7.361-7.361L255.773,61.178z M253.382,80h-43.773
	l21.887-21.887L253.382,80z M220.894,127.5L199,149.393v-43.786L220.894,127.5z M220.893,207.5L199,229.393v-43.785L220.893,207.5z
	 M209.607,240l21.893-21.893L253.393,240H209.607z M253.393,255L231.5,276.893L209.607,255H253.393z M220.893,287.5L199,309.393
	v-43.785L220.893,287.5z M231.5,298.107L253.393,320h-43.785L231.5,298.107z M253.392,335l-21.895,21.895L209.604,335H253.392z
	 M242.107,287.5L264,265.607v43.785L242.107,287.5z M242.107,207.5L264,185.607v43.785L242.107,207.5z M242.106,127.5L264,105.607
	v43.786L242.106,127.5z M241.92,15l2.648,8.827l-13.073,13.073L218.43,23.833L221.08,15H241.92z M184,103.513V160h-67.784
	L184,103.513z M184,183.513V240h-67.784L184,183.513z M184,263.513V320h-67.784L184,263.513z M184.878,403.513l11.373-60.653
	l24.64,24.641L184.878,403.513z M242.105,367.502l23.855-23.855l6.816,54.527L242.105,367.502z M279,320v-56.487L346.784,320H279z
	 M279,240v-56.487L346.784,240H279z M279,160v-56.487L346.784,160H279z"/>
</svg>`;
    
      const img = new Image(32, 32);
      img.onload = () => {

        map.addImage('electricity-svg', img);

        map.addLayer({
          'id': `custom-layer-${name}`,
          'type': 'symbol',
          'source': `custom-tiles-${name}`,
          'source-layer': source,
          'layout': {
            'visibility': 'none',
            'icon-image': 'electricity-svg',
            'icon-size': 0.55
          }
        });

      };
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(electricity_station_svg);
    }
    else if (name.match(/^(petrol_stations)$/)) {

      const petrol_station_svg = `<?xml version="1.0" encoding="iso-8859-1"?>
<svg fill="#1234de" height="800px" width="800px" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" 
	 viewBox="0 0 512 512" xml:space="preserve">
<g>
	<g>
		<g>
			<path d="M309.333,53.333h-192c-5.867,0-10.667,4.8-10.667,10.667v138.667c0,5.867,4.8,10.667,10.667,10.667h192
				c5.867,0,10.667-4.8,10.667-10.667V64C320,58.133,315.2,53.333,309.333,53.333z M298.667,192H128V74.667h170.667V192z"/>
			<path d="M394.667,490.667H32c-5.867,0-10.667,4.8-10.667,10.667C21.333,507.2,26.133,512,32,512h362.667
				c5.867,0,10.667-4.8,10.667-10.667C405.333,495.467,400.533,490.667,394.667,490.667z"/>
			<path d="M474.133,124.907l-32.64-37.653c-1.28-1.493-3.093-2.347-5.013-2.24c-11.627,0.213-15.147,11.627-9.6,18.027l31.04,35.84
				c7.253,8.32,11.413,13.44,11.413,21.12h-29.867c-7.04,0-12.8,5.76-12.8,12.8V224c0,11.733,9.6,21.333,21.333,21.333h21.333v160
				c0,5.867-4.8,10.667-10.667,10.667h-23.573c-6.187,0-8.427-5.76-8.427-10.667v-139.2c0-18.773-17.707-31.467-34.24-31.467
				h-19.093V53.333C373.333,23.893,349.44,0,320,0H106.667c-29.44,0-53.333,23.893-53.333,53.333v415.253
				c0,10.773,8.64,10.88,23.04,11.2c7.787,0.107,18.56,0.213,30.293,0.213H320c11.84,0,22.507-0.107,30.293-0.213
				c14.4-0.213,23.04-0.427,23.04-11.2V256h19.093c6.507,0,12.907,5.013,12.907,10.133v139.2c0,18.24,12.8,32,29.76,32h23.573
				c17.707,0,32-14.293,32-32V160C490.667,144,481.92,133.867,474.133,124.907z M352,458.453c-7.04,0.107-17.813,0.213-32,0.213
				H106.667c-14.187,0-24.96-0.107-32-0.213V53.333c0-17.707,14.293-32,32-32H320c17.707,0,32,14.293,32,32V458.453z M469.333,224
				H448v-42.667h21.333V224z"/>
		</g>
	</g>
</g>
</svg>`;
    
      const img = new Image(32, 32);
      img.onload = () => {

        map.addImage('petrol-svg', img);

        map.addLayer({
          'id': `custom-layer-${name}`,
          'type': 'symbol',
          'source': `custom-tiles-${name}`,
          'source-layer': source,
          'layout': {
            'visibility': 'none',
            'icon-image': 'petrol-svg',
            'icon-size': 0.4
          }
        });

      };
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(petrol_station_svg);
    }
    else if (name.match(/^(liquid_fuel)$/)) {

      const liquid_fuel_station_svg = `<?xml version="1.0" encoding="iso-8859-1"?>
<svg fill="#000000" height="800px" width="800px" version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" 
	 viewBox="0 0 463 463" xml:space="preserve">
<g>
	<path d="M455.5,400H447v-56.5c0-4.143-3.357-7.5-7.5-7.5H431V87.5c0-4.143-3.357-7.5-7.5-7.5H423V55.5c0-4.143-3.357-7.5-7.5-7.5
		h-80c-4.143,0-7.5,3.357-7.5,7.5V80h-0.5c-4.143,0-7.5,3.357-7.5,7.5V336h-17V127.5c0-17.369-14.131-31.5-31.5-31.5H271v-0.5
		c0-17.369-14.131-31.5-31.5-31.5h-48c-9.607,0-18.218,4.328-24,11.131C161.718,68.328,153.107,64,143.5,64h-48
		C78.131,64,64,78.131,64,95.5V96h-0.5C46.131,96,32,110.131,32,127.5V336h-8.5c-4.143,0-7.5,3.357-7.5,7.5V400H7.5
		c-4.143,0-7.5,3.357-7.5,7.5s3.357,7.5,7.5,7.5h448c4.143,0,7.5-3.357,7.5-7.5S459.643,400,455.5,400z M343,63h65v17h-65V63z
		 M335,95h0.5h80h0.5v241h-81V95z M263.5,312c-4.143,0-7.5,3.357-7.5,7.5V336h-17V143h49v193h-17v-16.5
		C271,315.357,267.643,312,263.5,312z M207,336v-33h17v33H207z M167.5,312c-4.143,0-7.5,3.357-7.5,7.5V336h-17V143h49v193h-17v-16.5
		C175,315.357,171.643,312,167.5,312z M111,336v-33h17v33H111z M175.5,111c9.099,0,16.5,7.401,16.5,16.5v0.5h-49v-0.5
		c0-9.099,7.401-16.5,16.5-16.5H175.5z M288,127.5v0.5h-49v-0.5c0-9.099,7.401-16.5,16.5-16.5h16C280.599,111,288,118.401,288,127.5
		z M191.5,79h48c9.098,0,16.5,7.402,16.5,16.5V96h-0.5c-17.369,0-31.5,14.131-31.5,31.5V288h-17V127.5
		c0-17.369-14.131-31.5-31.5-31.5H175v-0.5C175,86.402,182.402,79,191.5,79z M79,95.5C79,86.402,86.402,79,95.5,79h48
		c9.098,0,16.5,7.402,16.5,16.5V96h-0.5c-17.369,0-31.5,14.131-31.5,31.5V288h-17V127.5C111,110.131,96.869,96,79.5,96H79V95.5z
		 M63.5,111h16c9.099,0,16.5,7.401,16.5,16.5v0.5H47v-0.5C47,118.401,54.401,111,63.5,111z M47,143h49v193H79v-16.5
		c0-4.143-3.357-7.5-7.5-7.5s-7.5,3.357-7.5,7.5V336H47V143z M415,400v-24.5c0-4.143-3.357-7.5-7.5-7.5s-7.5,3.357-7.5,7.5V400h-17
		v-24.5c0-4.143-3.357-7.5-7.5-7.5s-7.5,3.357-7.5,7.5V400h-17v-24.5c0-4.143-3.357-7.5-7.5-7.5s-7.5,3.357-7.5,7.5V400h-17v-24.5
		c0-4.143-3.357-7.5-7.5-7.5s-7.5,3.357-7.5,7.5V400h-17v-24.5c0-4.143-3.357-7.5-7.5-7.5s-7.5,3.357-7.5,7.5V400h-17v-24.5
		c0-4.143-3.357-7.5-7.5-7.5s-7.5,3.357-7.5,7.5V400h-17v-24.5c0-4.143-3.357-7.5-7.5-7.5s-7.5,3.357-7.5,7.5V400h-17v-24.5
		c0-4.143-3.357-7.5-7.5-7.5s-7.5,3.357-7.5,7.5V400h-17v-24.5c0-4.143-3.357-7.5-7.5-7.5s-7.5,3.357-7.5,7.5V400h-17v-24.5
		c0-4.143-3.357-7.5-7.5-7.5s-7.5,3.357-7.5,7.5V400H95v-24.5c0-4.143-3.357-7.5-7.5-7.5s-7.5,3.357-7.5,7.5V400H63v-24.5
		c0-4.143-3.357-7.5-7.5-7.5s-7.5,3.357-7.5,7.5V400H31v-49h401v49H415z"/>
	<path d="M359.5,280c-4.143,0-7.5,3.357-7.5,7.5v24c0,4.143,3.357,7.5,7.5,7.5s7.5-3.357,7.5-7.5v-24
		C367,283.357,363.643,280,359.5,280z"/>
	<path d="M391.5,280c-4.143,0-7.5,3.357-7.5,7.5v24c0,4.143,3.357,7.5,7.5,7.5s7.5-3.357,7.5-7.5v-24
		C399,283.357,395.643,280,391.5,280z"/>
	<path d="M359.5,224c-4.143,0-7.5,3.357-7.5,7.5v24c0,4.143,3.357,7.5,7.5,7.5s7.5-3.357,7.5-7.5v-24
		C367,227.357,363.643,224,359.5,224z"/>
	<path d="M391.5,224c-4.143,0-7.5,3.357-7.5,7.5v24c0,4.143,3.357,7.5,7.5,7.5s7.5-3.357,7.5-7.5v-24
		C399,227.357,395.643,224,391.5,224z"/>
	<path d="M359.5,168c-4.143,0-7.5,3.357-7.5,7.5v24c0,4.143,3.357,7.5,7.5,7.5s7.5-3.357,7.5-7.5v-24
		C367,171.357,363.643,168,359.5,168z"/>
	<path d="M391.5,168c-4.143,0-7.5,3.357-7.5,7.5v24c0,4.143,3.357,7.5,7.5,7.5s7.5-3.357,7.5-7.5v-24
		C399,171.357,395.643,168,391.5,168z"/>
	<path d="M359.5,112c-4.143,0-7.5,3.357-7.5,7.5v24c0,4.143,3.357,7.5,7.5,7.5s7.5-3.357,7.5-7.5v-24
		C367,115.357,363.643,112,359.5,112z"/>
	<path d="M391.5,112c-4.143,0-7.5,3.357-7.5,7.5v24c0,4.143,3.357,7.5,7.5,7.5s7.5-3.357,7.5-7.5v-24
		C399,115.357,395.643,112,391.5,112z"/>
</g>
</svg>`;
    
      const img = new Image(32, 32);
      img.onload = () => {

        map.addImage('liquid_fuel-svg', img);

        map.addLayer({
          'id': `custom-layer-${name}`,
          'type': 'symbol',
          'source': `custom-tiles-${name}`,
          'source-layer': source,
          'layout': {
            'visibility': 'none',
            'icon-image': 'liquid_fuel-svg',
            'icon-size': 0.6
          }
        });

      };
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(liquid_fuel_station_svg);
    }
    else if (name.match(/^(electricity_transmission_lines|gas_pipelines|oil_pipelines)$/)) {
      
      map.addLayer({
        'id': `custom-layer-${name}`,
        'type': 'line',  // Change from 'fill' to 'line'
        'source': `custom-tiles-${name}`,
        'source-layer': source,
        'layout': {
          'visibility': 'none'
        },
        'paint': {
          'line-color': colours,  // Set the border color here
          'line-opacity': 0.7,  // Optional: Adjust the opacity of the border
          'line-width': 1       // Optional: Set the border width
        }
      });
    }
    else if (name.match(/^(da_applications_lot_by_application_type)$/)) {

      map.addLayer({
        'id': `custom-layer-${name}`,
        'type': 'fill',
        'source': `custom-tiles-${name}`,
        'source-layer': source,
        'layout': {
          'visibility': 'none'
        },
        'paint': {
          'fill-color': colours,
          'fill-opacity': 0.3
        }
      });

      map.addLayer({
        'id': `custom-labels-${name}`,
        'type': 'symbol',
        'source': `custom-tiles-${name}`,
        'source-layer': source,
        'layout': {
          'symbol-placement': 'line', // place labels along lines
          'text-field': ['to-string', ['get', 'application_type']], // get elevation attribute value and convert it to string
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
          'text-size': 8,
          'text-allow-overlap': false,
          'visibility': 'none'
        },
        'paint': {
          'text-color': '#31144D',
          'text-halo-color': '#ffffff',
          'text-halo-width': 1
        }
      });
    }
    else if (name.match(/^(da_applications_lot)$/)) {
      
      map.addLayer({
        'id': `custom-layer-${name}`,
        'type': 'fill',
        'source': `custom-tiles-${name}`,
        'source-layer': source,
        'layout': {
            'visibility': 'none'
        },
        'paint': {
          'fill-color': colours,
          'fill-opacity': 0.3
        }
      });
      
      map.addLayer({
          'id': `custom-labels-${name}`,
          'type': 'symbol',
          'source': `custom-tiles-${name}`,
          'source-layer': source,
          'layout': {
          'symbol-placement': 'line', // place labels along lines
          'text-field': ['to-string', ['get', 'application_type']], // get elevation attribute value and convert it to string
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
          'text-size': 8,
          'text-allow-overlap': false,
          'visibility': 'none'
        },
        'paint': {
          'text-color': '#31144D',
          'text-halo-color': '#ffffff',
          'text-halo-width': 1
        }
      });
    }
    else if (name.match(/^(slope)$/)) {
      map.addLayer({
        'id': `custom-layer-${name}`,
        'type': 'fill',
        'source': `custom-tiles-${name}`,
        'source-layer': source,
        'layout': {
            'visibility': 'none'
        },
        'paint': {
          'fill-color': colours,
          'fill-opacity': 0.3
        }
      });
    }
    else if (name.match(/^(suburbs)$/)) {
      
      map.addLayer({
        'id': `custom-layer-${name}`,
        'type': 'line',  // Change from 'fill' to 'line'
        'source': `custom-tiles-${name}`,
        'source-layer': source,
        'layout': {
          'visibility': 'none'
        },
        'paint': {
          'line-color': colours,  // Set the border color here
          'line-opacity': 0.5,  // Optional: Adjust the opacity of the border
          'line-width': 1       // Optional: Set the border width
        }
      });
    }
    else if (name == 'lot') {

      map.addLayer({
        'id': `custom-layer-${name}`,
        'type': 'line',
        'source': `custom-tiles-${name}`,
        'source-layer': source,
        'layout': {
          'visibility': 'visible'
        },
        'paint': {
          'line-color': 'rgba(0,0,0,1)',
          'line-opacity': 0.5,
          'line-width': 1
        }
      });
    }
    else if (name == 'lot-fill') {
      map.addLayer({
        id: `custom-layer-lot-fill`,
        type: 'fill',
        source: `custom-tiles-lot-fill`,
        'source-layer': 'Lot',
        paint: {
          'fill-color': [
            'case',
            ['boolean', ['feature-state', 'selected'], false],
            '#5C2587',   // purple when selected
            '#5C2587'    // purple
          ],
          'fill-opacity': [
            'case',
            ['boolean', ['feature-state', 'selected'], false],
            0.5,   // visible when selected
            0.01      // invisible otherwise
          ]
        }
      });

      map.on('mouseenter', `custom-layer-lot-fill`, (e) => {
        map.getCanvas().style.cursor = 'pointer'; // Show pointer cursor on hover
      });

      map.on('mouseleave', `custom-layer-lot-fill`, (e) => {
        map.getCanvas().style.cursor = ''; // Reset cursor to default when not hovering
      });

      map.on('click', `custom-layer-lot-fill`, (e) => {


        if (Date.now() < suppressClicksUntil) return;

        // Check if any Draw mode is currently active
        const drawMode = draw.getMode();
        if (drawMode && drawMode !== 'simple_select' && drawMode !== 'direct_select') {
          // Drawing in progress, skip lot selection logic
          return;
        }


        if (e.features && e.features.length > 0) {
          // console.log(e.features[0].properties);
          // Strata schemes (SP plans) are a single polygon covering every unit, and the Lot tiles
          // carry no lotnumber for them — only a planlabel. Those tiles used to bail out here, so
          // the whole parcel was inert unless you happened to hit one of the unit dots stacked at
          // its centroid (e.g. 127-131 Macquarie Street SYDNEY, SP3045). Fall back to the plan
          // label, which /property/:id looks up as `planlabel = ?`.
          let clickedId = e.features[0].properties.lotnumber
            ? e.features[0].properties.lotnumber + '__' + e.features[0].properties.planlabel
            : (e.features[0].properties.planlabel || null);

          if (clickedId) {

            // Lot datasets aren't uniform: some areas (e.g. Newington) have no `id` property, so
            // feature-state highlighting isn't possible there. Guard those calls — a missing id used
            // to throw in setFeatureState and silently block the property from ever opening.
            const newSelectId = e.features[0].properties.objectid;
            const hasId = newSelectId !== undefined && newSelectId !== null;
            const isSameLot = hasId && (selectedId === newSelectId);

            if (selectedId !== null && selectedId !== undefined) {
              map.setFeatureState(
                { source: `custom-tiles-lot-fill`, sourceLayer: 'Lot', id: selectedId },
                { selected: false }
              );
            }

            selectedId = hasId ? newSelectId : null;

            // Only wipe the 3D model when switching to a different lot.
            // Re-clicking the same lot keeps the existing model visible.
            if (!isSameLot) {
              removePropertyModelFromMap();
            }

            if (hasId) {
              map.setFeatureState(
                { source: `custom-tiles-lot-fill`, sourceLayer: 'Lot', id: selectedId },
                { selected: true }
              );
            }

            // A result dot under the click is the exact property the user picked, so it wins. This
            // matters most for strata: looking the parcel up by plan label returns an arbitrary unit
            // of the scheme, whereas the dot identifies the one that was clicked by gurasid. The
            // highlight and 3D model above still apply either way.
            const dotHere = map.getLayer('property-results-circles')
              ? map.queryRenderedFeatures(e.point, { layers: ['property-results-circles'] })
              : [];

            // Only re-fetch property data when switching to a different lot.
            if (!isSameLot && !dotHere.length) {
              _handle_view_property(clickedId, 1);
            }

          }
        }
      });
    
    }
    else if (name.match(/(transport_oriented)/)) {
      map.addLayer({
        'id': `custom-layer-${name}`,
        'type': 'line',
        'source': `custom-tiles-${name}`,
        'source-layer': source,
        'layout': {
            'visibility': 'none'
        },
        'paint': {
          'line-color': colours,  // Set the border color here
          'line-opacity': 1,  // Optional: Adjust the opacity of the border
          'line-width': 1,       // Optional: Set the border width
          'fill-color': colours,
          'fill-opacity': 0.03
        }
      });
    }
    else if (name.match(/(lowmidrise)/)) {
      map.addLayer({
        'id': `custom-layer-${name}`,
        'type': 'fill',
        'source': `custom-tiles-${name}`,
        'source-layer': source,
        'layout': {
            'visibility': 'none'
        },
        'paint': {
          'line-color': colours,  // Set the border color here
          'line-opacity': 1,  // Optional: Adjust the opacity of the border
          'line-width': 1,       // Optional: Set the border width
          'fill-color': colours,
          'fill-opacity': 0.18
        }
      });
    }
    else if (name.match(/(crime|lowmidrise|transport_oriented)/)) {
      map.addLayer({
        'id': `custom-layer-${name}`,
        'type': 'fill',
        'source': `custom-tiles-${name}`,
        'source-layer': source,
        'layout': {
            'visibility': 'none'
        },
        'paint': {
          'fill-color': colours,
          'fill-opacity': 0.06
        }
      });
    }
    else {
      map.addLayer({
        'id': `custom-layer-${name}`,
        'type': 'fill',
        'source': `custom-tiles-${name}`,
        'source-layer': source,
        'layout': {
            'visibility': 'none'
        },
        'paint': {
          'fill-color': colours,
          'fill-opacity': 0.44
        }
      });

      // Land Zoning: label each zone with its code, centred in the zone polygon.
      if (name == 'zoning') {
        map.addLayer({
          'id': `custom-labels-${name}`,
          'type': 'symbol',
          'source': `custom-tiles-${name}`,
          'source-layer': source,
          'minzoom': zoom_boundary, // only label once zoomed in past the lot boundary
          'layout': {
            'symbol-placement': 'point', // one label at the polygon's centre
            'text-field': ['to-string', ['get', 'sym_code']],
            'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
            'text-size': 11,
            'text-allow-overlap': false,
            'visibility': 'none'
          },
          'paint': {
            'text-color': '#31144D',
            'text-halo-color': '#ffffff',
            'text-halo-width': 1.5
          }
        });
      }
    }
  }

  function addCustomLayers() {
    
    // _add_individual_layer('da_applications_lot_by_application_type', 'da_applications_lot', [
    //   'case',
    //   ['==', ['get', 'application_type'], 'Review of determination'], '#A57FFF',
    //   ['==', ['get', 'application_type'], 'Development Application'], '#388E3C',
    //   ['==', ['get', 'application_type'], 'Modification Application'], '#FFA500',
    //   ['==', ['get', 'application_type'], 'Modification to Complying Development Certificate'], '#0288D1',
    //   ['==', ['get', 'application_type'], 'Complying Development Certificate Application'], '#26A69A',
    //   // Default color if none matches:
    //   '#EEEEEE'
    // ]);

    _add_individual_layer('slope', 'LotWithSlope', [
      'step',
      ['get', 'average_slope'],   // numeric 0â€“90 from your LotWithSlope layer
      // 1: Flat to Gentle (0â€“5)
      '#4CAF50',  // default color for < 5
      5,
      // 2: Moderate (5â€“10)
      '#8BC34A',
      10,
      // 3: Moderately Steep (10â€“18)
      '#FFCA28',
      18,
      // 4: Steep (18â€“30)
      '#FF9800',
      30,
      // 5: Very Steep to Extreme (30â€“90)
      '#F44336'
    ]);



    _add_individual_layer('zoning', 'LZN', ['match', ['get', 'sym_code'], '2(a)', '#FFA6A3', 'A', '#FC776E', 'AGB', '#FAE8C5', 'B', '#63F0F5', 'B1', '#C9FFF9', 'B2', '#62F0F5', 'B3', '#00C2ED', 'B4', '#959DC2', 'B5', '#7DA0AB', 'B6', '#95BFCC', 'B7', '#BAD6DE', 'C', '#BAD6DE', 'C1', '#E69900', 'C2', '#F0AE3C', 'C3', '#F7C568', 'C4', '#FFDA96', 'CA', '#FFDA96', 'D', '#959DC2', 'DM', '#FFFFFF', 'DR', '#FFFF70', 'E', '#00C2ED', 'E1', '#62F0F5', 'E2', '#B4C6E7', 'E3', '#8EA9DB', 'E4', '#9999FF', 'E5', '#9966FF', 'EM', '#95BFCC', 'ENP', '#FFD640', 'ENT', '#76C0D6', 'ENZ', '#73B273', 'EP', '#FCF9B6', 'F', '#FFFFA1', 'G', '#FFFF70', 'H', '#55FF00', 'I', '#D3FFBF', 'IN1', '#DDB8F5', 'IN2', '#F3DBFF', 'IN3', '#C595E8', 'MAP', '#E6FFFF', 'MU', '#959DC2', 'MU1', '#959DC2', 'P', '#B3CCFC', 'PAE', '#F4EC49', 'PEP', '#74B374', 'PRC', '#549980', 'R', '#B3FCB3', 'R1', '#FFCFFF', 'R2', '#FFA6A3', 'R3', '#FF776E', 'R4', '#FF483B', 'R5', '#FFD9D9', 'RAC', '#E6CB97', 'RAZ', '#E6CB97', 'RE1', '#55FF00', 'RE2', '#D3FFBE', 'REC', '#AEF2B3', 'REZ', '#DEB8F5', 'RO', '#55FF00', 'RP', '#D3FFBE', 'RU1', '#EDD8AD', 'RU2', '#E6CA97', 'RU3', '#DEC083', 'RU4', '#D6BC6F', 'RU5', '#D6A19C', 'RU6', '#C79E4C', 'RUR', '#EFE4BE', 'RW', '#D3B8F5', 'SET', '#FFD2DC', 'SP1', '#FFFFA1', 'SP2', '#FFFF70', 'SP3', '#FFFF00', 'SP4', '#FFFF00', 'SP5', '#E6E600', 'SPU', '#FFFF00', 'T', '#FCD2EF', 'U', '#CAFCED', 'UD', '#FF7F63', 'UL', '#FFFFFF', 'UR', '#FF776E', 'W', '#FCC4B8', 'W1', '#D9FFF2', 'W2', '#99FFDD', 'W3', '#33FFBB', 'W4', '#00E6A9', 'WFU', '#1182C2', '#DFFCCB']);

    _add_individual_layer('ass', 'AcidSulfateSoils', ['match', ['get', 'sym_code'], 'Class 1', '#FD32C5', 'Class 2', '#FD32C5', 'Class 2a', '#FD32C5', 'Class 2b', '#FD32C5', 'Class 3', '#FD32C5', 'Class 4', '#FD32C5', 'Class 5', '#FD32C5','#FD32C5']);

    _add_individual_layer('frontage', 'ActiveStreetFrontages', ['match', ['get', 'sym_code'], 'Active Street Frontage', '#ff0000', '#ff0000' ]);

    _add_individual_layer('airport', 'AirportNoise', [
      'match',
      ['get', 'anef_code'],
      'ANEF between 20 and 25', '#FDCA78',
      'ANEF between 25 and 30', '#F0AE3C',
      'ANEF between 30 and 35', '#FFA6A3',
      'ANEF between 35 and 40', '#FF776E',
      'ANEF exceeding 40', '#FF483B',
      'Runway', '#ff0000',
      '#FDCA78'
    ]);

    _add_individual_layer('bushfire', 'BushfireProneLand', [
      'match',
      ['get', 'd_category'],
      'Vegetation Category 1', '#FF000F', 
      'Vegetation Category 2', '#FFCA32',
      'Vegetation Category 3', '#FF701F',
      'Vegetation Buffer', '#FFFE77',
      '#FF000F'
    ]);


    _add_individual_layer('heritage', 'EPI_Heritage', [
      'match',
      ['get', 'sym_code'],
      'Heritage Map', '#F3C944',
      '#F3C944'
    ]);

    _add_individual_layer('floodplanning', 'FloodPlanning', ['match', ['get', 'sym_code'], 'Flood Planning Area', '#00BCE7', '#00BCE7']);

    let fsr_hob_lzn_colours = ['A', '#C9FFF9', 'B', '#99FFFD', 'C', '#66F2FF', 'D', '#33DAFF', 'E', '#D3FFBF', 'F', '#C3F0AA', 'G', '#B3E096', 'H', '#A3D182', 'I', '#95C270', 'J', '#89B560', 'K', '#FFFFBF', 'L', '#FFFF00', 'M', '#DBDB00', 'N', '#EDD8AD', 'O', '#E3C891', 'P', '#DBBB7B', 'Q', '#D1AC62', 'R', '#C79E4C', 'S', '#FFD9D9', 'T', '#FFA6A3', 'U', '#FF776E', 'V', '#FF483B', 'W', '#CC6666', 'X', '#E9BFFF', 'Y', '#D489FA', 'Z', '#BE51F0', 'AA', '#FF73DE', 'AB', '#CC6699', 'AC', '#BA5487', 'AD', '#FFEBAD', 'AE', '#FFD68F', 'AF', '#FFC700', 'AG', '#FFAA00', 'AH', '#E69800', 'AI', '#FF8C00', 'RL1', '#E1E1E1', 'RL2', '#CCCCCC', 'RL3', '#B2B2B2', 'RL4', '#828282', 'RL5', '#4E4E4E', 'RL6', '#4E4E4E', '#B3E096'];


    _add_individual_layer('fsr', 'FSR', ['match', ['get', 'fsr_label'], ... fsr_hob_lzn_colours ]);
    _add_individual_layer('hob', 'HOB', ['match', ['get', 'sym_code'], ... fsr_hob_lzn_colours ]);
    _add_individual_layer('lsz', 'LSZ', ['match', ['get', 'sym_code'], ... fsr_hob_lzn_colours ]);


    _add_individual_layer('coastalmanagement', 'CoastalManagement', ['match', ['get', 'sym_code'], ... ['Coastal Erosion Map', '#9D56F6',
      'Coastal Hazard Areas Map', '#C5A335',
      'Coastal Risk Map', '#98CB72',
      'Coastal Risk Planning Map', '#9D56F6',
      'Winda Woppa Coastal Development Map', '#9D56F6',
      '#9D56F6'
    ]]);
    _add_individual_layer('contaminationsites', 'ContaminationSites', ['match', ['get', 'sym_code'], 'Contamination Sites', '#FFB300', '#FFB300']);
    _add_individual_layer('declaredwildness', 'DeclaredWildness', ['match', ['get', 'sym_code'], ... fsr_hob_lzn_colours ]);
    _add_individual_layer('developmentcontrolplan', 'DevelopmentControlPlan', [
      'match',
      ['get', 'sym_code'],
      'LGA', '#000000',
      '#000000'
    ]);
    _add_individual_layer('drinking_water_catchment', 'Drinking_Water_Catchment', ['match', ['get', 'sym_code'], ... ['Drinking Water Catchment', '#00BFFF', '#00BFFF'] ]);
    _add_individual_layer('environmentally_sensitive_land', 'Environmentally_Sensitive_Land', ['match', ['get', 'sym_code'], ... ['Environmentally Sensitive Land', '#A0522D', '#A0522D'] ]);
    _add_individual_layer('groundwatervulnerability', 'GroundwaterVulnerability', ['match', ['get', 'sym_code'], ... ['Groundwater vulnerable', '#99FFFD', '#99FFFD'] ]);
    // _add_individual_layer('lga', 'LGA', ['match', ['get', 'sym_code'], ... fsr_hob_lzn_colours ]);
    _add_individual_layer('landsliderisk', 'LandSlideRisk', ['match', ['get', 'sym_code'], ... ['Land Slide Risk', '#FF0000', '#FF0000'] ]);
    _add_individual_layer('mine_subsidence_district', 'Mine_Subsidence_District', ['match', ['get', 'sym_code'], ... ['Mine Subsidence District', '#FFA500', '#FFA500'] ]);
    _add_individual_layer('mineralresourceland', 'MineralResourceLand', ['match', ['get', 'sym_code'], ... ['Mine Subsidence District', '#FFD700', '#FFD700'] ]);
    _add_individual_layer('obstaclelimitationsurface', 'ObstacleLimitationSurface', ['match', ['get', 'sym_code'], ... ['Obstacle Limitation Surface', '#C0C0C0', '#C0C0C0'] ]);
    _add_individual_layer('regionalgrowthboundary', 'RegionalGrowthBoundary', ['match', ['get', 'sym_code'], ... ['Obstacle Limitation Surface', '#008000', '#008000'] ]);
    _add_individual_layer('riparianlandwatercourse', 'RiparianLandWatercourse', ['match', ['get', 'sym_code'], ... fsr_hob_lzn_colours ]);
    _add_individual_layer('salinity', 'Salinity', ['match', ['get', 'sym_code'], ... ['Obstacle Limitation Surface', '#FFFF00', '#FFFF00'] ]);
    _add_individual_layer('scenicprotectionland', 'ScenicProtectionLand', ['match', ['get', 'sym_code'], ... ['Foreshore Scenic Protection Area Map', '#33DAFF', '#8B4513'] ]);
    _add_individual_layer('suburbs', 'Suburbs', ['match', ['get', 'sym_code'], ... ['Groundwater vulnerable', '#FF0000', '#FF0000'] ]);
    _add_individual_layer('terrestrialbiodiversity', 'TerrestrialBiodiversity', ['match', ['get', 'sym_code'], ... ['TerrestrialBiodiversity', '#32CD32', '#32CD32'] ]);
    _add_individual_layer('wetlands', 'Wetlands', ['match', ['get', 'sym_code'], ... ['Wetlands', '#66F2FF', '#66F2FF'] ]);


    
    _add_individual_layer('lot-fill', 'Lot', ['match', ['get', 'sym_code']]);
    _add_individual_layer('lot', 'Lot', ['match', ['get', 'sym_code'], ... ['Lot', '#010101', '#010101'] ]);

    _add_individual_layer('contour', 'Contour', ['match', ['get', 'sym_code'], ... ['Contour', '#d1c2fc', '#d1c2fc'] ]);

    _add_individual_layer('da_applications_lot', 'da_applications_lot', [
      'case',
      // Under assessment (Orange)
      ['==', ['get', 'status'], 'Additional Information Provided'], '#FFA500',
      ['==', ['get', 'status'], 'Additional Information Requested'], '#FFA500',
      ['==', ['get', 'status'], 'Awaiting-Documents'], '#FFA500',
      ['==', ['get', 'status'], 'In Progress'], '#FFA500',
      ['==', ['get', 'status'], 'On Exhibition'], '#FFA500',
      ['==', ['get', 'status'], 'Open'], '#FFA500',
      ['==', ['get', 'status'], 'Operational consent requested'], '#FFA500',
      ['==', ['get', 'status'], 'Pending Court Appeal'], '#FFA500',
      ['==', ['get', 'status'], 'Pending Exemption update'], '#FFA500',
      ['==', ['get', 'status'], 'Pending Lodgement'], '#FFA500',
      ['==', ['get', 'status'], 'Submitted'], '#FFA500',
      ['==', ['get', 'status'], 'Under Assessment'], '#FFA500',
      // Approved (Green)
      ['==', ['get', 'status'], 'Approved'], '#388E3C',
      ['==', ['get', 'status'], 'Deferred Commencement'], '#388E3C',
      ['==', ['get', 'status'], 'Operational consent issued'], '#388E3C',
      // Withdrawn (Grey)
      ['==', ['get', 'status'], 'Cancelled'], '#9E9E9E',
      ['==', ['get', 'status'], 'Rejected'], '#9E9E9E',
      ['==', ['get', 'status'], 'Returned'], '#9E9E9E',
      ['==', ['get', 'status'], 'Withdrawn'], '#9E9E9E',
      // Refused (Red)
      ['==', ['get', 'status'], 'Declined'], '#EF5350',
      ['==', ['get', 'status'], 'Operational consent declined'], '#EF5350',
      ['==', ['get', 'status'], 'Refused'], '#EF5350',
      // Determined (light Green)
      ['==', ['get', 'status'], 'Determined'], '#8BC34A',
      // Default color if none matches:
      '#EEEEEE'
    ]);

    _add_individual_layer('da_applications_lot_by_application_type', 'da_applications_lot', [
      'case',
      ['==', ['get', 'application_type'], 'Review of determination'], '#A57FFF',
      ['==', ['get', 'application_type'], 'Development Application'], '#388E3C',
      ['==', ['get', 'application_type'], 'Modification Application'], '#FFA500',
      ['==', ['get', 'application_type'], 'Modification to Complying Development Certificate'], '#0288D1',
      ['==', ['get', 'application_type'], 'Complying Development Certificate Application'], '#26A69A',
      // Default color if none matches:
      '#EEEEEE'
    ]);


    _add_individual_layer('property_crime', 'Crime_Property', [
      'case',
      ['==', ['get', 'rate'], 'n.c.'],
        'rgba(0,0,0,0)',
      [
        'step',
        ['to-number', ['get', 'rate']],
          '#FFFFFF', // 0 (or missing)
          0.0001,
          '#FFFFAF',  // > 0 - 1399.8 (light blue)
          1399.8,
          '#FFC35D',  // 1399.8 - 1943.5 (blue)
          1943.5,
          '#FFC35D',  // 1943.5 - 2460.5 (medium blue)
          2460.5,
          '#F32A21',  // 2460.5 - 3166.7 (yellow-orange)
          3166.7,
          '#B90023'   // > 3166.7 (red)
      ]
    ]);

    _add_individual_layer('violent_crime', 'Crime_Violent', [
      'case',
      ['==', ['get', 'rate'], 'n.c.'],
        'rgba(0,0,0,0)',
      [
        'step',
        ['to-number', ['get', 'rate']],
           '#FFFFFF',             // 0 (or missing)
            0.0001,
            '#FFFFAF',  // >0 - 578.3 (light blue)
            578.3,
            '#FFC35D',  // 578.3 - 795.7 (blue)
            795.7,
            '#FFC35D',  // 795.7 - 1064.8 (medium blue)
            1064.8,
            '#F32A21',  // 1064.8 - 1529.4 (yellow-orange)
            1529.4,
            '#B90023'   // >1529.4 (red)
      ]
    ]);

    _add_individual_layer('electricity_transmission_lines', 'Electricity_Transmission_Lines', ['match', ['get', 'sym_code'], ... ['Electricity_Transmission_Lines', '#00BFFF', '#00BFFF'] ]);
    _add_individual_layer('gas_pipelines', 'Gas_Pipelines', ['match', ['get', 'sym_code'], ... ['Gas_Pipelines', '#32CD32', '#32CD32'] ]);
    _add_individual_layer('oil_pipelines', 'Oil_Pipelines', ['match', ['get', 'sym_code'], ... ['Oil_Pipelines', '#965fe0', '#965fe0'] ]);


    _add_individual_layer('electricity_transmission_substations', 'Electricity_Transmission_Substations', ['match', ['get', 'sym_code'], ... ['Electricity_Transmission_Substations', '#ff6600', '#ff6600'] ]);
    _add_individual_layer('liquid_fuel', 'Liquid_Fuel', ['match', ['get', 'sym_code'], ... ['Liquid_Fuel', '#00ff00', '#00ff00'] ]);
    _add_individual_layer('petrol_stations', 'Petrol_Stations', ['match', ['get', 'sym_code'], ... ['Petrol_Stations', '#31144D', '#31144D'] ]);


    _add_individual_layer('transport_oriented_development', 'Transport_Oriented_Development', ['match', ['get', 'sym_code'], ... ['Transport_Oriented_Development', '#33DAFF', '#33DAFF'] ]);
    _add_individual_layer('lowmidrise_development', 'LowMidRise_Development', ['match', ['get', 'sym_code'], ... ['LowMidRise_Development','#BE51F0', '#BE51F0'] ]);

    _add_individual_layer('lgapopulation', 'lgapopulation', [
      'case',
      ['==', ['get', 'population'], 'n.c.'],
        'rgba(0,0,0,0)',
      [
        'step',
        ['to-number', ['get', 'population']],
           '#FFFFFF',             // 0 (or missing)
            10000,
            '#FFFFAF',  // >0 - 578.3 (light blue)
            50000,
            '#FFC35D',  // 578.3 - 795.7 (blue)
            100000,
            '#FFC35D',  // 795.7 - 1064.8 (medium blue)
            300000,
            '#F32A21',  // 1064.8 - 1529.4 (yellow-orange)
            350000,
            '#B90023'   // >1529.4 (red)
      ]
    ]);



    // sym_code to colour code zone
    // https://www.mapbox.com/maps/satellite    
    // --- Property results: GPU circle layer (replaces per-result DOM markers) ---
    if (map.getSource('property-results')) {
      map.getSource('property-results').setData(property_results_fc);
    } else {
      map.addSource('property-results', { type: 'geojson', data: property_results_fc });
    }
    if (!map.getLayer('property-results-circles')) {
      map.addLayer({
        id: 'property-results-circles',
        type: 'circle',
        source: 'property-results',
        paint: {
          'circle-radius': 6,
          'circle-color': '#5C2587',
          'circle-opacity': 0.85,
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#ffffff'
        }
      });

    }

    // Make the property dots directly clickable via their gurasid. Previously clicking a result
    // relied on the invisible lot-fill polygon underneath, but the Lot tileset is unreliable, so in
    // areas where it has no data (e.g. Newington) the dots were dead. Opening by gurasid works
    // everywhere, independent of the Lot tiles. Bound once: layer click handlers reference the layer
    // by id and survive style reloads, so re-binding on every addCustomLayers() would stack duplicates.
    if (!_resultClickHandlersBound) {
      _resultClickHandlersBound = true;

      map.on('mouseenter', 'property-results-circles', () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', 'property-results-circles', () => { map.getCanvas().style.cursor = ''; });
      map.on('click', 'property-results-circles', (e) => {
        if (Date.now() < suppressClicksUntil) return;
        const drawMode = draw && draw.getMode();
        if (drawMode && drawMode !== 'simple_select' && drawMode !== 'direct_select') return;
        if (!e.features || !e.features.length) return;
        // Always open the dot's own property by gurasid. The lot polygon underneath is only a proxy
        // for it, and resolves to the wrong record for strata (SP) results — their dots sit on the
        // scheme's base lot, which carries a different lotnumber/planlabel. The lot-fill handler
        // still runs on the same click to highlight the lot and load the 3D model; it defers the
        // open to us whenever a dot is present.
        const gurasid = e.features[0].properties.gurasid;
        if (gurasid !== undefined && gurasid !== null && gurasid !== '') {
          _handle_view_property(gurasid);
        }
      });

      // Teal suburb circles: click to fly into that suburb (its property dots then appear).
      map.on('mouseenter', 'suburb-results-circles', () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', 'suburb-results-circles', () => { map.getCanvas().style.cursor = ''; });
      map.on('click', 'suburb-results-circles', (e) => {
        if (!e.features || !e.features.length) return;
        const c = e.features[0].geometry && e.features[0].geometry.coordinates;
        if (c) map.flyTo({ center: [c[0], c[1]], zoom: (zoom_boundary + 3) });
      });
    }

    // --- Matching suburbs: teal highlight on the existing Suburbs vector tile ---
    if (!map.getLayer('custom-layer-suburb-match')) {
      map.addLayer({
        id: 'custom-layer-suburb-match',
        type: 'fill',
        source: 'custom-tiles-suburbs',
        'source-layer': 'Suburbs',
        layout: { visibility: 'none' },
        filter: suburb_match_filter,
        paint: { 'fill-color': '#5EE7AD', 'fill-opacity': 0.4 }
      });
      map.addLayer({
        id: 'custom-layer-suburb-match-outline',
        type: 'line',
        source: 'custom-tiles-suburbs',
        'source-layer': 'Suburbs',
        layout: { visibility: 'none' },
        filter: suburb_match_filter,
        paint: { 'line-color': '#1FB389', 'line-width': 1 }
      });

      map.on('mouseenter', 'custom-layer-suburb-match', () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', 'custom-layer-suburb-match', () => { map.getCanvas().style.cursor = ''; });
      map.on('click', 'custom-layer-suburb-match', (e) => {
        if (!e.features || !e.features.length) return;
        const name = String(e.features[0].properties.SUBURBNAME || '').toUpperCase();
        const match = (suburb_matches || []).find(s => _suburb_name(s).toUpperCase() === name);
        const center = (match && match.geom && match.geom.coordinates)
          ? match.geom.coordinates
          : (e.lngLat ? [e.lngLat.lng, e.lngLat.lat] : null);
        if (center) map.flyTo({ center, zoom: (zoom_boundary + 3) });
      });
    }

    // --- Matching suburbs: teal circle markers built from the get_suburb centroids ---
    // Rendered from GeoJSON because the Suburbs vector tile serves no data. Shown when zoomed out
    // (see _set_result_layer_zoom); clicking one flies into that suburb to reveal its property dots.
    if (map.getSource('suburb-results')) {
      map.getSource('suburb-results').setData(suburb_results_fc);
    } else {
      map.addSource('suburb-results', { type: 'geojson', data: suburb_results_fc });
    }
    if (!map.getLayer('suburb-results-circles')) {
      map.addLayer({
        id: 'suburb-results-circles',
        type: 'circle',
        source: 'suburb-results',
        layout: { visibility: 'none' },
        paint: {
          'circle-radius': 14,
          'circle-color': '#5EE7AD',
          'circle-opacity': 0.55,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#1FB389'
        }
      });
      map.addLayer({
        id: 'suburb-results-labels',
        type: 'symbol',
        source: 'suburb-results',
        layout: {
          visibility: 'none',
          'text-field': ['get', 'name'],
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
          'text-size': 11,
          'text-allow-overlap': false
        },
        paint: { 'text-color': '#0B6B4F', 'text-halo-color': '#ffffff', 'text-halo-width': 1.5 }
      });
    }
    // suburb-results-circles click/hover handlers are bound once above (see _resultClickHandlersBound)

  }

  // function applyMonochromeStyle() {
  //   // Define your monochrome color palette
  //   const baseColor = '#F0EDF3';
  //   const waterColor = '#E4E2EE';
  //   const roadColor = '#ffffff';
  //   const buildingColor = '#f6f7f8';

  //   // Apply colors to various layers
  //   const layers = map.getStyle().layers;
  //   for (const layer of layers) {
  //     if (layer.type === 'background') {
  //       map.setPaintProperty(layer.id, 'background-color', baseColor);
  //     } else if (layer.type === 'fill') {
  //       if (layer.id.includes('water')) {
  //         map.setPaintProperty(layer.id, 'fill-color', waterColor);
  //       } else if (layer.id.includes('building')) {
  //         map.setPaintProperty(layer.id, 'fill-color', buildingColor);
  //       } else {
  //         map.setPaintProperty(layer.id, 'fill-color', baseColor);
  //       }
  //     } else if (layer.type === 'line') {
  //       if (layer.id.includes('road')) {
  //         map.setPaintProperty(layer.id, 'line-color', roadColor);
  //       }
  //     }
  //   }

  //   // Adjust other properties for better monochrome appearance
  //   map.setPaintProperty('building', 'fill-opacity', 0.5);
  //   map.setPaintProperty('road-primary', 'line-width', 1.5);
  // }

  function applyMonochromeStyle() {
    // Define your monochrome color palette
    const baseColor = '#F0EDF3';
    const waterColor = '#E4E2EE';
    const roadColor = '#ffffff';
    const buildingColor = '#f6f7f8';

    // Apply colors to various layers
    const layers = map.getStyle().layers;
    for (const layer of layers) {
      if (layer.type === 'background') {
        map.setPaintProperty(layer.id, 'background-color', baseColor);
      } else if (layer.type === 'fill') {
        if (layer.id.includes('water')) {
          map.setPaintProperty(layer.id, 'fill-color', waterColor);
        } else if (layer.id.includes('building')) {
          map.setPaintProperty(layer.id, 'fill-color', buildingColor);
        } else {
          map.setPaintProperty(layer.id, 'fill-color', baseColor);
        }
      } else if (layer.type === 'line') {
        if (layer.id.includes('road')) {
          map.setPaintProperty(layer.id, 'line-color', roadColor);
        }
      }
    }

    // Adjust other properties for better monochrome appearance
    map.setPaintProperty('building', 'fill-opacity', 0.5);
    map.setPaintProperty('road-primary', 'line-width', 1.5);
  }

  function updateLabels () {
    const data = draw.getAll();
    const lineFeatures = data.features.filter(f => f.geometry.type === 'LineString' && f.geometry.coordinates && f.geometry.coordinates.length >= 2);

    if (draw_multi_line_mode && lineFeatures.length > 0) {
        let totalLength = 0;
        
        lineFeatures.forEach(feature => {
            totalLength += turf.length(feature, { units: 'meters' });
        });

        const multiLineSourceId = 'multi-line-total-label';
        const multiLineLayerId = 'multi-line-total-label-layer';

        const firstLine = lineFeatures[0];
        const lastLine = lineFeatures[lineFeatures.length - 1];
        const firstPoint = firstLine.geometry.coordinates[0];
        const lastPoint = lastLine.geometry.coordinates[lastLine.geometry.coordinates.length - 1];
        const centerPoint = turf.midpoint(turf.point(firstPoint), turf.point(lastPoint));

        if (map.getSource(multiLineSourceId)) {
            map.getSource(multiLineSourceId).setData({
                type: 'Feature',
                geometry: centerPoint.geometry,
                properties: {
                    label: `Total: ${totalLength.toFixed(2)} m`
                }
            });
        } else {
            map.addSource(multiLineSourceId, {
                type: 'geojson',
                data: {
                    type: 'Feature',
                    geometry: centerPoint.geometry,
                    properties: {
                        label: `Total: ${totalLength.toFixed(2)} m`
                    }
                }
            });

            map.addLayer({
                id: multiLineLayerId,
                type: 'symbol',
                source: multiLineSourceId,
                layout: {
                    'text-field': ['get', 'label'],
                    'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
                    'text-size': 18,
                    'text-offset': [0, 1.5],
                    'text-anchor': 'top',
                    'text-allow-overlap': true
                },
                paint: {
                    'text-color': '#172B22',
                    'text-halo-color': '#ffffff',
                    'text-halo-width': 2,
                    'text-halo-blur': 1
                }
            });
        }
        return;
    } else if (!draw_multi_line_mode && map.getSource('multi-line-total-label')) {
        map.removeSource('multi-line-total-label');
        if (map.getLayer('multi-line-total-label-layer')) {
            map.removeLayer('multi-line-total-label-layer');
        }
    }

    data.features.forEach(feature => {
        if (feature.geometry.type === 'Polygon') {
            const center = turf.centroid(feature).geometry.coordinates;
            const sourceId = `polygon-label-${feature.id}`;
            let labelText;

            if (feature.properties && feature.properties.isCustomCircle) {
                const perimeterPoint = feature.geometry.coordinates[0][0];
                const radius = turf.distance(center, perimeterPoint, { units: 'meters' });
                labelText = `${radius.toFixed(2)} m`;
            } else {
                const area = turf.area(feature);
                labelText = `${area.toFixed(2)} m²`;
            }

            if (map.getSource(sourceId)) {
                map.getSource(sourceId).setData({
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: center
                    },
                    properties: {
                        label: labelText
                    }
                });
            } else {
                map.addSource(sourceId, {
                    type: 'geojson',
                    data: {
                        type: 'Feature',
                        geometry: {
                            type: 'Point',
                            coordinates: center
                        },
                        properties: {
                            label: labelText
                        }
                    }
                });

                map.addLayer({
                    id: `polygon-label-layer-${feature.id}`,
                    type: 'symbol',
                    source: sourceId,
                    layout: {
                        'text-field': ['get', 'label'],
                        'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
                        'text-size': 16
                    },
                    paint: {
                        'text-color': '#172B22',
                        'text-halo-color': '#ffffff',
                        'text-halo-width': 1,
                        'text-halo-blur': 1
                    }
                });
            }
        }

        if (feature.geometry.type === 'LineString') {
            const length = turf.length(feature, { units: 'meters' });
            const midpoint = turf.midpoint(turf.point(feature.geometry.coordinates[0]), turf.point(feature.geometry.coordinates[feature.geometry.coordinates.length - 1]));
            const lineSourceId = `line-label-${feature.id}`;

            if (map.getSource(lineSourceId)) {
                map.getSource(lineSourceId).setData({
                    type: 'Feature',
                    geometry: midpoint.geometry,
                    properties: {
                        label: `${length.toFixed(2)} m`
                    }
                });
            } else {
                map.addSource(lineSourceId, {
                    type: 'geojson',
                    data: {
                        type: 'Feature',
                        geometry: midpoint.geometry,
                        properties: {
                            label: `${length.toFixed(2)} m`
                        }
                    }
                });

                map.addLayer({
                    id: `line-label-layer-${feature.id}`,
                    type: 'symbol',
                    source: lineSourceId,
                    layout: {
                        'text-field': ['get', 'label'],
                        'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
                        'text-size': 16,
                        'text-offset': [0, 1.5],
                        'text-anchor': 'top'
                    },
                    paint: {
                        'text-color': '#172B22',
                        'text-halo-color': '#ffffff',
                        'text-halo-width': 1,
                        'text-halo-blur': 1
                    }
                });
            }
        }
    });
  }

  let add_marker_timeout;
  let research_suburb_marker_timeout;

  function _init_mapbox() {

    mapboxgl.accessToken = 'pk.eyJ1IjoiZGFubnlsIiwiYSI6ImNseGJta3lhMzA3ZHEya3ExY3huOXdvaHUifQ.tWLLIKUxBJ_JBKH5o2XHTQ';
    map = new mapboxgl.Map({
      container: 'mapbox',
      pitchWithRotate: false,
      dragRotate: false,
      touchZoomRotate: false,
      style: 'mapbox://styles/mapbox/standard',
      config: {
        basemap: {
          theme: 'monochrome',  // neutral grey base in both presets
          lightPreset: _map_light_preset(),  // 'night' in dark mode, 'day' in light
          // show3dObjects: false     // Flat
        }
      },
      ...initialState
    });

    window.mapboxMap = map;
    window.mappingLayers = mapping_layers;

    // Re-apply the light preset whenever the site theme changes (toggle or OS).
    new MutationObserver(_apply_map_theme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    // Define a new custom mode for drawing circles
    var CircleMode = {};

    // Setup function to initialize the circle drawing mode
    CircleMode.onSetup = function(opts) {
      const circle = {
        id: 'circle-' + Date.now(), // Assign a unique ID
        type: 'Feature',
        properties: {
          isCustomCircle: true
        },
        geometry: {
            type: 'Polygon',
            coordinates: [[]]
        }
      };
      this.updateUIClasses({ mouse: 'add' });
      this.clearSelectedFeatures();
      this.setActionableState({ trash: true });

      // Disable map drag pan
      this.map.dragPan.disable();

      return { circle, center: null, radius: 0, currentVertexPosition: 0 };
    };

    // Implement toDisplayFeatures to control feature rendering
    CircleMode.toDisplayFeatures = function(state, geojson, display) {
      display(geojson);
    };

    // Handle mouse down or touch start events
    CircleMode.onMouseDown = CircleMode.onTouchStart = function(state, e) {
      state.center = [e.lngLat.lng, e.lngLat.lat];
      console.log('Center set to:', state.center);

      draw.deleteAll();
      

      // Add a point feature at the center
      const point = {
          type: 'Feature',
          properties: {},
          geometry: {
              type: 'Point',
              coordinates: state.center
          }
      };
      draw.add(point);
    };

    // Handle drag or touch move events to update the circle
    CircleMode.onDrag = CircleMode.onTouchMove = function(state, e) {
      const lngLat = [e.lngLat.lng, e.lngLat.lat];
      state.radius = turf.distance(state.center, lngLat, { units: 'meters' });
      const circle = turf.circle(state.center, state.radius / 1000, { steps: 64, units: 'kilometers' });
      state.circle.geometry.coordinates = circle.geometry.coordinates;
      console.log('Circle updated with radius:', state.radius);

      // Update the circle feature on the map
      draw.add(state.circle);  // Ensure the circle is added to the draw instance
      this.map.fire('draw.update', {
          action: 'change_coordinates',
          features: [state.circle]
      });

      // Update labels during drag
      updateLabels();
    };

    // Handle mouse up or touch end events to finalize the circle
    CircleMode.onMouseUp = CircleMode.onTouchEnd = function(state, e) {
      this.updateUIClasses({ mouse: 'add' });
      state.circle.properties.radius = state.radius;
      console.log('Final circle radius:', state.radius);
      console.log('Final center coordinates:', state.center);

      circle_center = state.center;
      circle_radius = state.radius;

      draw.deleteAll();
      draw.add(state.circle);

      _map_draw_reset();

      if (is_search_within_radius) {
        _handle_search_property(3, 1);
      }
  

      // Remove existing label features
      

      // Update labels after finalizing the circle
      updateLabels();
    };


    var SingleLineMode = {};

    SingleLineMode.onSetup = function(opts) {
      const line = {
          id: 'line-' + Date.now(),
          type: 'Feature',
          properties: {},
          geometry: {
              type: 'LineString',
              coordinates: []
          }
      };
      this.updateUIClasses({ mouse: 'add' });
      this.clearSelectedFeatures();
      this.setActionableState({ trash: true });

      // Disable map drag pan
      this.map.dragPan.disable();

      return { line, currentVertexPosition: 0 };
    };

    SingleLineMode.onClick = function(state, e) {
      const lngLat = [e.lngLat.lng, e.lngLat.lat];
      state.line.geometry.coordinates.push(lngLat);

      if (state.currentVertexPosition === 0) {
          state.currentVertexPosition++;
      } else {
          this.map.fire('draw.create', {
              features: [state.line]
          });

          // Finalize the line but stay in draw mode for multiple lines
          draw.add(state.line);
          
          // Stay in line drawing mode
          draw_line_mode = true;
          this.changeMode('draw_line_string');
          map.dragPan.enable();
          map.boxZoom.enable();
      }
    };

    SingleLineMode.onMouseMove = function(state, e) {
      if (state.currentVertexPosition > 0) {
          const lngLat = [e.lngLat.lng, e.lngLat.lat];
          state.line.geometry.coordinates[1] = lngLat;
          draw.add(state.line);
      }
    };

    SingleLineMode.toDisplayFeatures = function(state, geojson, display) {
      display(geojson);
    };

    SingleLineMode.onStop = function(state) {
      this.updateUIClasses({ mouse: 'none' });
      this.map.dragPan.enable();
    };

    SingleLineMode.onTrash = function(state) {
      draw.delete([state.feature.id]);
    };

    // Initialize MapboxDraw with the custom circle mode
    draw = new MapboxDraw({
      displayControlsDefault: false,
      modes: Object.assign({}, MapboxDraw.modes, { draw_circle: CircleMode, draw_line_string: SingleLineMode  }),
      styles: [
        // Style for polygons
        {
          id: 'gl-draw-polygon-fill',
          type: 'fill',
          filter: ['all', ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']],
          paint: {
              'fill-color': '#09D780', // Default fill color
              'fill-opacity': 0.3, // Fill opacity
              'fill-outline-color': '#09D780' // Outline color
          },
        },
        // Style for points
        {
          id: 'gl-draw-point',
          type: 'circle',
          filter: ['all', ['==', '$type', 'Point'], ['!=', 'mode', 'static']],
          paint: {
            'circle-radius': 1, // Radius of the point
            'circle-color': 'transparent' // Default circle color
          }
        },
        // Style for lines
        {
          id: 'gl-draw-line',
          type: 'line',
          filter: ['all', ['==', '$type', 'LineString'], ['!=', 'mode', 'static']],
          paint: {
            'line-color': '#09D780', // Line color
            'line-width': 2 // Line width in pixels
          }
        }
      ]
    });

    map.addControl(draw);
    
    map.on('load', function() {
      map.resize();
      clearMarkers();
    });

    map.on('style.load', () => {
      
      _apply_map_theme();
      addCustomLayers();
      setTimeout(function() {
        _handle_change_mapping_layer();
      }, 3000);
    });

    map.on('zoomend', () => {
      if (isProgrammaticMove) return;
      currentZoom = parseInt(map.getZoom());
      if (currentZoom >= zoom_boundary) {
        _set_result_layer_zoom(true);
        clearTimeout(add_marker_timeout);
        add_marker_timeout = setTimeout(function(){
          // suburb_markers.forEach(marker => marker.remove(map));
          if (! use_listview) {
            if (is_search_within_radius) {
              _handle_search_property(3, 1);
            }
            else {
              _handle_search_property(2, 1);
            }
          }
        }, 128);
        // hide_properties = false;

      }
      else {
        clearTimeout(research_suburb_marker_timeout);
        research_suburb_marker_timeout = setTimeout(function(){
          _set_result_layer_zoom(false);
        }, 128);
        // hide_properties = true;
        // if (markers.length > 1500) {
        //   clearMarkers();
        // }
        // else if (currentZoom < 12) {
        //   clearMarkers();
        // }
      }
    });

    map.on('moveend', function() {
      if (isProgrammaticMove) return;
      
      currentZoom = parseInt(map.getZoom());
      if (currentZoom >= zoom_boundary) {
        _set_result_layer_zoom(true);
        clearTimeout(add_marker_timeout);
        add_marker_timeout = setTimeout(function(){
          if (! use_listview) {
            if (is_search_within_radius) {
              _handle_search_property(3, 1);
            }
            else {
              _handle_search_property(2, 1);
            }
          }
          // suburb_markers.forEach(marker => marker.remove(map));
        }, 100); 
      }
      else {
        clearTimeout(research_suburb_marker_timeout);
        research_suburb_marker_timeout = setTimeout(function(){
          _set_result_layer_zoom(false);
        }, 100);
      }
    });

    map.on('draw.update', function(e) {
      e.features.forEach(function(feature) {
          if (feature.geometry.type === 'Polygon' && feature.properties.radius) {
              const center = turf.center(feature).geometry.coordinates;
              const radius = feature.properties.radius;
              console.log('New center:', center);
              console.log('New radius:', radius);

              circle_center = center;
              circle_radius = radius;


              if (is_search_within_radius) {
                _handle_search_property(3, 1);
              }
          }
      });

      // Update labels when the circle is updated
      updateLabels();
    });


    map.on('draw.selectionchange', function(e) {
      e.features.forEach(function(feature) {
        if (feature.properties.radius) {
          draw.changeMode('simple_select', { featureIds: [feature.id] });
        }
      });
    });

    map.on('draw.create', function() {
      suppressClicksUntil = Date.now() + 200; // ms window
      updateLabels();
      draw_polygon_mode = false;
    });

    map.on('draw.delete', function(e) {
      
      
    });
    
  }



  let use_crm = false;

  let use_feasibility = false;
  let use_email = false;
  let use_template = false;
  let use_settings = false;
  
  let feasibility_property;

  let is_ready = false;
  let use_debug = false;
  let is_getting_total = false;
  // null means "not counted yet" — starting at 0 made the button read "No Matches" on page load,
  // before it had ever been clicked.
  let objects_total_on_demand = null;
  let total_count_failed = false;
  let is_getting_total_on_demand = false;
  let is_searching_main = false;
  // In-flight main search, so Escape can cancel it and re-enable the SEARCH button.
  let search_abort_controller = null;
  let search_aborted = false;
  // Last completed search returned zero matches — surfaced in the search button label.
  let no_search_results = false;
  let is_saving = false;
  let can_load_more = true;


  // Option lists come straight from the API; guard against rows with an empty
  // or whitespace label/value (they render as blank options in the selects).
  function _clean_options(list) {
    if (!Array.isArray(list)) return [];
    const seen = new Set();
    return list.filter((item) => {
      if (item == null) return false;
      const raw = typeof item === 'object' ? (item.label ?? item.value ?? item.name ?? '') : item;
      const text = String(raw).trim();
      if (!text || text === 'null' || text === 'undefined') return false;
      const key = (typeof item === 'object' ? String(item.value ?? text) : text).toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  let is_logged_in = false;
  // Entitlement from the site session (/auth/me). false => the property details
  // panel shows the subscribe step instead of the property; search still works.
  let has_access = true;
  let me_answered = false;
  let renew_url = '/renew/';
  let user_id = '';
  let user_email = '';
  let user_plan = '';
  let user_first_name = '';
  let user_last_name = '';
  let user_regions = [];

  let crm_status_filter = '';

  if (use_debug) {
    is_logged_in = true;
  }

  let user_fav = {};


  let selected_properties = 0;

  $: selected_properties = Object.keys(user_fav).filter(key => user_fav[key].selected).length;

  let user_search = [];

  let img_placeholder = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

  let page = 1;
  let per_page = 50;

  let objects_total = 1;
  let start_page = 1;
  let max_number_of_pages = 1;

  let use_legend = false;

  let use_listview = false;

  let is_select_all = false;

  let region_all = true;
  // "All" is lit when every region the member can search is selected. It is a
  // shortcut, not a separate mode: clicking it selects (or clears) all of them.
  $: region_all = Array.isArray(user_regions) && user_regions.length > 0 && user_regions.every((r) => regions_selected.includes(r));
  let regions = [];
  let lga_names = [];
  let zones = [];
  let suburbs = [];
  let permissibleuses = [];

  let properties = [];

  function _toggle_my_pipeline(e) {
    e.preventDefault();
    isChecked = true;
    use_crm = true;
    use_feasibility = false;
    use_template = false;
    
    mapview_viewing_property = false;
    search_form_expand = true;
    view_property = false;

    use_listview = true;
    
    if (no_exclusions.hasOwnProperty("strata")) {
      delete no_exclusions.strata;
    }

    is_search_within_radius = false;

    regions_selected = [];
    var checkboxes = document.querySelectorAll('input[name="region"]');
    checkboxes.forEach(function(checkbox) {
      checkbox.checked = false;
    });

    lga_names_selected = [];
    zone_selected = [];
    suburb_selected = [];
    address_selected = [];
    gurasid_selected = [];
    permissibleuse_selected = [];

    lot_size_range = [0, 10000];
    min_lot_size_range = [0, 10000];
    school_range = [0, 2000];
    hospital_range = [0, 2000];
    train_range = [0, 2000];
    height_range = [0, 400];
    fsr_range = [0, 30];
    gfa_range = [0, 10000];

    width_range = [0, 1000];
    depth_range = [0, 1000];

    exclusion_options.forEach(option => {
      option.selectedValue = "0";
    });

    exclusion_options = exclusion_options;

    
    if (no_exclusions.hasOwnProperty("strata")) {
      delete no_exclusions.strata;
    }
    
    
    setTimeout(function() {
      _handle_search_property(1)
    }, 0);

    return false;
    
  }

  let isChecked = false;
  function _toggle_my_fav() {
    use_crm = false;
    if (isChecked) {
      is_search_within_radius = false;

      regions_selected = [];
      var checkboxes = document.querySelectorAll('input[name="region"]');
      checkboxes.forEach(function(checkbox) {
        checkbox.checked = false;
      });

      lga_names_selected = [];
      zone_selected = [];
      suburb_selected = [];
      address_selected = [];
      gurasid_selected = [];
      permissibleuse_selected = [];

      lot_size_range = [0, 10000];
      min_lot_size_range = [0, 10000];
      school_range = [0, 2000];
      hospital_range = [0, 2000];
      train_range = [0, 2000];
      height_range = [0, 400];
      fsr_range = [0, 30];
      gfa_range = [0, 10000];



      width_range = [0, 1000];
      depth_range = [0, 1000];

      exclusion_options.forEach(option => {
        option.selectedValue = "0";
      });

      exclusion_options = exclusion_options;

      
      if (no_exclusions.hasOwnProperty("strata")) {
        delete no_exclusions.strata;
      }
      
      
      setTimeout(function() {
        _handle_search_property(1)
      }, 0);

    }
    else {
      setTimeout(function() {
        _handle_search_property(1)
      }, 0);
    }
  }


  // async function _remove_price_item(event) {
  //   event.preventDefault();
    
  //   let price_index;
  //   if (event.currentTarget) {
  //     price_index = event.currentTarget.getAttribute('data-index');
  //   }
  //   alert(price_index);
  // }

  

  async function _handle_custom_fsr (event) {
    if (event.target.value.length > 2) {
      event.target.value = event.target.value.slice(0, 2);
    }
    fsr_range = [0, 30];
  }

  async function _handle_custom_gfa (event) {
    if (event.target.value.length > 11) {
      event.target.value = event.target.value.slice(0, 11);
    }
    gfa_range = [0, 10000];
  }

  async function _handle_custom_price_range (event) {
    if (event.target.value.length > 11) {
      event.target.value = event.target.value.slice(0, 11);
    }
    price_range = [0, 13000000];
  }

  async function _handle_custom_area_size_range (event) {
    if (event.target.value.length > 11) {
      event.target.value = event.target.value.slice(0, 11);
    }
    min_lot_size_range = [0, 10000];
  }

  async function _handle_custom_lot_size_range (event) {
    if (event.target.value.length > 11) {
      event.target.value = event.target.value.slice(0, 11);
    }
    lot_size_range = [0, 10000];
  }

  async function _handle_custom_height (event) {
    if (event.target.value.length > 5) {
      event.target.value = event.target.value.slice(0, 5);
    }
    height_range = [0, 400];
  }

  async function _handle_custom_walkable_score (event) {
    if (event.target.value.length > 5) {
      event.target.value = event.target.value.slice(0, 5);
    }
    walkable_score_range = [0, 100];
  }

  async function _handle_custom_width (event) {
    if (event.target.value.length > 5) {
      event.target.value = event.target.value.slice(0, 5);
    }
    width_range = [0, 1000];
  }

  async function _handle_custom_depth (event) {
    if (event.target.value.length > 5) {
      event.target.value = event.target.value.slice(0, 5);
    }
    depth_range = [0, 1000];
  }

  async function _handle_subscribe_email () {
    if (subscribe_email) {
      is_subscribing = true;

      await fetch(`${api_domain}/subscribe`, {
        method: 'POST',
        cache: "no-cache",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({"email": subscribe_email, "list_id": 2})
      }).then(subscribe_response => subscribe_response.json()).catch(function(){});

      setTimeout(function(){
        is_subscribing = false;
        is_subscribed = true;

        setTimeout(function(){
          is_subscribed = false;
        }, 1000);
      }, 2000);

    }
    else {
      document.getElementById('subscribe-email').focus();
    }
    return false;
  }

  async function _handle_crm_status_filter (event) {
    event.preventDefault();
    _handle_search_property(); 
   }

   async function _handle_email(event) {
    event.preventDefault();

    let gurasid;
    if (event.currentTarget) {
      gurasid = event.currentTarget.getAttribute('data-id');
    }

    // user_fav[gurasid].generating = true;

    const user_template_response = await fetch(`${api_domain}/template/` + user_id, {
      method: 'GET',
      cache: "no-cache",
      headers: {"Content-Type": "application/json"},
    }).then(user_template_response => user_template_response.json()).catch(function(){});
    if (user_template_response) {
      
      if (user_template_response.length && user_template_response[0].template) {
        user_template = user_template_response[0].template;
      }

      // alert(user_template);

      const template = Handlebars.compile(user_template);
      
      const property_selected = properties.filter((property) => property.gurasid == gurasid)[0];

      const item = {user: {"email": user_email, "first_name": user_first_name, "last_name": user_last_name}, "property": property_selected };

      const htmlContent = template(item);
      const plainTextContent = convertHtmlToPlainText(htmlContent);

      const subject = property_selected.address + ' ' + property_selected.postcode;
      const mailtoLink = `mailto:owner@email.com?from=${user_email}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(plainTextContent)}`;
      window.location.href = mailtoLink;

      // user_fav[gurasid].generating = false;
    }

    return false;
  }

 function convertHtmlToPlainText(html) {
    // Replace <br> tags with newline characters
    let plainText = html.replace(/<br\s*\/?>/gi, '\n');

    // Replace <p> tags with newline characters
    plainText = plainText.replace(/<p\s*\/?>/gi, '\n');

    // Remove all other HTML tags
    plainText = plainText.replace(/<\/?[^>]+(>|$)/g, '');

    // Strip out the first blank newline if it exists
    if (plainText.startsWith('\n')) {
        plainText = plainText.substring(1);
    }

    return plainText;
  }

  // let generating_bulk_mail = false;

  // async function _handle_bulk_gen_mail(event) {
  //   event.preventDefault();

  //   generating_bulk_mail = true;

  //   const user_template_response = await fetch(`${api_domain}/template/` + user_id, {
  //     method: 'GET',
  //     cache: "no-cache",
  //     headers: {"Content-Type": "application/json"},
  //   }).then(user_template_response => user_template_response.json()).catch(function(){});
  //   if (user_template_response) {
  //     user_template = user_template_response[0].template;

  //     // alert(user_template);

  //     const template = Handlebars.compile(user_template);
      
  //     const zip = new JSZip();

  //     await Promise.all(properties.map(async (property, index) => {
  //       if (user_fav.hasOwnProperty(property.gurasid) && user_fav[property.gurasid].selected) {
         
  //           const property_selected = property;
  //           const item = {user: {"email": user_email, "first_name": user_first_name, "last_name": user_last_name}, "property": property_selected };
  //           const htmlContent = template(item);

  //           let property_img_location = property_selected.address.toLowerCase().replace(/\s/g, '-') + '-' + property_selected.postcode;

  //           const div = document.createElement('div');
  //           div.innerHTML = htmlContent;
  //           document.querySelector('.user_template_content').appendChild(div);

  //           const scale = 2; // Increase scale for higher resolution
  //           const canvas = await html2canvas(div, { useCORS: true, scale });

  //           const svgImage = new Image();
  //           svgImage.src = canvas.toDataURL('image/svg+xml');

  //           const pdf = new jsPDF();
  //           pdf.addImage(svgImage, 'SVG', 10, 20, canvas.width / 7, canvas.height / 7);

            
  //           zip.file(`property-${property.gurasid}.pdf`, pdf.output('blob'));

  //           document.querySelector('.user_template_content').removeChild(div);
  //       }
  //     }));

  //     const content = await zip.generateAsync({ type: 'blob' });
  //     saveAs(content, 'properties.zip'); // Save the zip file

  //     generating_bulk_mail = false;
  //   }

  //   return false;
  // }

  // async function _handle_gen_mail(event) {
  //   event.preventDefault();

  //   let gurasid;
  //   if (event.currentTarget) {
  //     gurasid = event.currentTarget.getAttribute('data-id');
  //   }

  //   user_fav[gurasid].generating = true;

  //   const user_template_response = await fetch(`${api_domain}/template/` + user_id, {
  //     method: 'GET',
  //     cache: "no-cache",
  //     headers: {"Content-Type": "application/json"},
  //   }).then(user_template_response => user_template_response.json()).catch(function(){});
  //   if (user_template_response) {
  //     user_template = user_template_response[0].template;

  //     // alert(user_template);

  //     const template = Handlebars.compile(user_template);
      

  //     const property_selected = properties.filter((property) => property.gurasid == gurasid)[0];

  //     const item = {user: {"email": user_email, "first_name": user_first_name, "last_name": user_last_name}, "property": property_selected };

  //     const htmlContent = template(item);

  //     let property_img_location = property_selected.address.toLowerCase().replace(/\s/g, '-') + '-' + property_selected.postcode;


  //     const div = document.createElement('div');
  //     div.innerHTML = htmlContent;
      
  //     document.querySelector('.user_template_content').appendChild(div);

  //     const scale = 2; // Increase scale for higher resolution
  //     const canvas = await html2canvas(div, { useCORS: true, scale });

  //     const svgImage = new Image();
  //     svgImage.src = canvas.toDataURL('image/svg+xml');

  //     const pdf = new jsPDF();
  //     pdf.addImage(svgImage, 'SVG', 10, 20, canvas.width / 7, canvas.height / 7);

  //     pdf.save(`property-${property_selected.gurasid}.pdf`);
      
  //     document.querySelector('.user_template_content').removeChild(div);

  //     user_fav[gurasid].generating = false;
  //   }

  //   return false;
  // }



async function _handle_send_mail(event) {
  event.preventDefault();
  let gurasid;
  let address;
  if (event.currentTarget) {
    gurasid = event.currentTarget.getAttribute('data-id');
    address = event.currentTarget.getAttribute('data-address');
  }

  // Confirmation popup
  const confirmed = confirm(`You are about to send an mail to: ${address}.\nDo you want to continue?`);
  if (!confirmed) {
    return false; // Stop if user cancels
  }

  user_fav[gurasid].sending = true;
  const mailed_response = await fetch(`${api_domain}/mail/create`, {
    method: 'POST',
    cache: "no-cache",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({"user_id": user_id, "property_id": gurasid})
  }).then(res => res.json()).catch(() => {});

  if (mailed_response) {
    console.log(mailed_response);
    user_fav[gurasid].mailed = true;
  }
  user_fav[gurasid].sending = false;

  return false;
}

// Property-aware email — operates on the given property object directly so it works
// for any property opened in the map-view panel (not only those in the search results).
async function _email_property(property_selected) {
  if (!property_selected) return;

  let tpl = user_template;
  const user_template_response = await fetch(`${api_domain}/template/` + user_id, {
    method: 'GET',
    cache: "no-cache",
    headers: {"Content-Type": "application/json"},
  }).then(r => r.json()).catch(function(){});
  if (user_template_response && user_template_response.length && user_template_response[0].template) {
    tpl = user_template_response[0].template;
  }

  const template = Handlebars.compile(tpl);
  const item = {user: {"email": user_email, "first_name": user_first_name, "last_name": user_last_name}, "property": property_selected};
  const htmlContent = template(item);
  const plainTextContent = convertHtmlToPlainText(htmlContent);
  const subject = property_selected.address + ' ' + (property_selected.postcode || '');
  const mailtoLink = `mailto:owner@email.com?from=${user_email}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(plainTextContent)}`;
  window.location.href = mailtoLink;
}

// Property-aware mail send — operates on the given property object directly.
async function _send_mail_property(property_selected) {
  if (!property_selected) return;
  const gurasid = property_selected.gurasid;
  const address = (property_selected.address || '') + ' ' + (property_selected.postcode || '');

  const confirmed = confirm(`You are about to send an mail to: ${address}.\nDo you want to continue?`);
  if (!confirmed) return;

  if (!user_fav[gurasid]) return;
  user_fav[gurasid].sending = true;
  user_fav = user_fav;

  const mailed_response = await fetch(`${api_domain}/mail/create`, {
    method: 'POST',
    cache: "no-cache",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({"user_id": user_id, "property_id": gurasid})
  }).then(res => res.json()).catch(() => {});

  if (mailed_response) {
    user_fav[gurasid].mailed = true;
  }
  user_fav[gurasid].sending = false;
  user_fav = user_fav;
}





  function _toggle_select_all(event) {
    event.preventDefault();

    if (is_select_all) {  
      properties.forEach((property) => {
        user_fav[property.gurasid].selected = false;
      });  
    }
    else {
      properties.forEach((property) => {
        user_fav[property.gurasid].selected = true;
      });
    }

    is_select_all = !is_select_all;
    
    return false;
  }

  
  function _toggle_email_template() {
    use_template  = !use_template;
    use_feasibility = false;
    use_settings = false;
    feasibility_property = {};
    use_crm = true;
  }


  function _handle_logout() {
    // Login state comes from the parent site via querystring, so log out there
    window.parent.location.href = website_domain_with_http + '/logout';
  }

  function _toggle_settings() {
    use_settings  = !use_settings;
    use_feasibility = false;
    use_email = false;
    use_listview = true;
    use_crm = false;
    feasibility_property = {};
  }

  
  
  
  async function _handle_calculate(event) {
    const fsr = parseFloat(feasibility_property.fsr_fsr) || 0;
    const bonusFsr = parseFloat(user_fav[feasibility_property.gurasid].feasibility.bonus_fsr) || 0;
    const lotSize = parseFloat(feasibility_property.lot_size) || 0;
    
    user_fav[feasibility_property.gurasid].feasibility.final_fsr = fsr + bonusFsr * 0.01 * fsr;
    user_fav[feasibility_property.gurasid].feasibility.gfa = user_fav[feasibility_property.gurasid].feasibility.final_fsr * lotSize;

    const circulation = parseFloat(user_fav[feasibility_property.gurasid].feasibility.circulation_area) || 0;
    user_fav[feasibility_property.gurasid].feasibility.net_floor_area = roundToTwoDecimals(user_fav[feasibility_property.gurasid].feasibility.gfa * (100 - circulation) * 0.01);

      user_fav[feasibility_property.gurasid].feasibility.price_total = 0;

      user_fav[feasibility_property.gurasid].feasibility.prices.forEach((price, i) => {

        user_fav[feasibility_property.gurasid].feasibility.prices[i].price_subtotal = roundToTwoDecimals((user_fav[feasibility_property.gurasid].feasibility.prices[i].price_sqm || 0) * (user_fav[feasibility_property.gurasid].feasibility.prices[i].price || 0));
        
        user_fav[feasibility_property.gurasid].feasibility.price_total += user_fav[feasibility_property.gurasid].feasibility.prices[i].price_subtotal;
      })

      user_fav[feasibility_property.gurasid].feasibility.cost_total = 0;

      user_fav[feasibility_property.gurasid].feasibility.prices.forEach((price, i) => {

        user_fav[feasibility_property.gurasid].feasibility.cost_total += roundToTwoDecimals((user_fav[feasibility_property.gurasid].feasibility.prices[i].price_sqm || 0) * (user_fav[feasibility_property.gurasid].feasibility.prices[i].cost || 0));
      })



      user_fav[feasibility_property.gurasid].feasibility.excavation_subtotal = roundToTwoDecimals((user_fav[feasibility_property.gurasid].feasibility.excavation_costs_sqm || 0) * (user_fav[feasibility_property.gurasid].feasibility.excavation_costs || 0));
      user_fav[feasibility_property.gurasid].feasibility.landscaping_subtotal = roundToTwoDecimals((user_fav[feasibility_property.gurasid].feasibility.landscaping_costs_sqm || 0) * (user_fav[feasibility_property.gurasid].feasibility.landscaping_costs || 0));
      user_fav[feasibility_property.gurasid].feasibility.contingency_subtotal = roundToTwoDecimals((user_fav[feasibility_property.gurasid].feasibility.contingency_costs_sqm || 0) * (user_fav[feasibility_property.gurasid].feasibility.contingency_costs || 0));

      user_fav[feasibility_property.gurasid].feasibility.cost_total += roundToTwoDecimals(user_fav[feasibility_property.gurasid].feasibility.excavation_subtotal) + roundToTwoDecimals(user_fav[feasibility_property.gurasid].feasibility.landscaping_subtotal) + roundToTwoDecimals(user_fav[feasibility_property.gurasid].feasibility.contingency_subtotal);


      user_fav[feasibility_property.gurasid].feasibility.fees_total = 
      roundToTwoDecimals(user_fav[feasibility_property.gurasid].feasibility.da_costs) +
      roundToTwoDecimals(user_fav[feasibility_property.gurasid].feasibility.developer_costs) +
      roundToTwoDecimals(user_fav[feasibility_property.gurasid].feasibility.water_costs) +
      roundToTwoDecimals(user_fav[feasibility_property.gurasid].feasibility.biodiversity_costs) +
      roundToTwoDecimals(user_fav[feasibility_property.gurasid].feasibility.other_costs);



      
      let building_cost = user_fav[feasibility_property.gurasid].feasibility.cost_total || 0;

      user_fav[feasibility_property.gurasid].feasibility.consulting_costs_total = 0;

      consulting_options.forEach((consulting, i) => {

        user_fav[feasibility_property.gurasid].feasibility[consulting.name + '_subtotal'] = roundToTwoDecimals(user_fav[feasibility_property.gurasid].feasibility[consulting.name] * building_cost);

        user_fav[feasibility_property.gurasid].feasibility.consulting_costs_total += user_fav[feasibility_property.gurasid].feasibility[consulting.name + '_subtotal'];

      });

      user_fav[feasibility_property.gurasid].feasibility.holding_costs_total = 0;

      user_fav[feasibility_property.gurasid].feasibility.council_rates_per_quarter_subtotal = user_fav[feasibility_property.gurasid].feasibility.council_rates_per_quarter * user_fav[feasibility_property.gurasid].feasibility.holding_years * 4; 

      user_fav[feasibility_property.gurasid].feasibility.land_tax_per_annum_subtotal = user_fav[feasibility_property.gurasid].feasibility.land_tax_per_annum * user_fav[feasibility_property.gurasid].feasibility.holding_years;
      user_fav[feasibility_property.gurasid].feasibility.water_and_sewer_rates_subtotal = user_fav[feasibility_property.gurasid].feasibility.water_and_sewer_rates * user_fav[feasibility_property.gurasid].feasibility.holding_years;
      user_fav[feasibility_property.gurasid].feasibility.accountancy_subtotal = user_fav[feasibility_property.gurasid].feasibility.accountancy * user_fav[feasibility_property.gurasid].feasibility.holding_years;
      user_fav[feasibility_property.gurasid].feasibility.administration_subtotal = user_fav[feasibility_property.gurasid].feasibility.administration * user_fav[feasibility_property.gurasid].feasibility.holding_years;
      user_fav[feasibility_property.gurasid].feasibility.insurance_subtotal = user_fav[feasibility_property.gurasid].feasibility.insurance * user_fav[feasibility_property.gurasid].feasibility.holding_years;
      user_fav[feasibility_property.gurasid].feasibility.holding_other_subtotal = user_fav[feasibility_property.gurasid].feasibility.holding_other * user_fav[feasibility_property.gurasid].feasibility.holding_years;

      user_fav[feasibility_property.gurasid].feasibility.holding_costs_total = roundToTwoDecimals(user_fav[feasibility_property.gurasid].feasibility.council_rates_per_quarter_subtotal) +
      roundToTwoDecimals(user_fav[feasibility_property.gurasid].feasibility.land_tax_per_annum_subtotal) + 
      roundToTwoDecimals(user_fav[feasibility_property.gurasid].feasibility.water_and_sewer_rates_subtotal) + 
      roundToTwoDecimals(user_fav[feasibility_property.gurasid].feasibility.accountancy_subtotal) + 
      roundToTwoDecimals(user_fav[feasibility_property.gurasid].feasibility.administration_subtotal) + 
      roundToTwoDecimals(user_fav[feasibility_property.gurasid].feasibility.insurance_subtotal) + 
      roundToTwoDecimals(user_fav[feasibility_property.gurasid].feasibility.holding_other_subtotal);

      user_fav[feasibility_property.gurasid].feasibility.residual_land_value = roundToTwoDecimals(
        (
          (user_fav[feasibility_property.gurasid].feasibility.price_total || 0) - (user_fav[feasibility_property.gurasid].feasibility.cost_total - 0) - (user_fav[feasibility_property.gurasid].feasibility.fees_total - 0) - (user_fav[feasibility_property.gurasid].feasibility.consulting_costs_total || 0) - (user_fav[feasibility_property.gurasid].feasibility.holding_costs_total || 0)
        ) * (( 100 - user_fav[feasibility_property.gurasid].feasibility.profit_margin) / 100)
      );

      let stamp_duty_and_interest_payments = roundToTwoDecimals((user_fav[feasibility_property.gurasid].feasibility.stamp_duty / 100 * user_fav[feasibility_property.gurasid].feasibility.residual_land_value));

      user_fav[feasibility_property.gurasid].feasibility.final_total = (user_fav[feasibility_property.gurasid].feasibility.residual_land_value || 0) - stamp_duty_and_interest_payments - roundToTwoDecimals(user_fav[feasibility_property.gurasid].feasibility.interest_payments);

      
      _update_feasibility(user_fav[feasibility_property.gurasid].feasibility, user_id, feasibility_property.gurasid);
    
  }

  async function _handle_add_price(event) {
    user_fav[feasibility_property.gurasid].feasibility.prices = user_fav[feasibility_property.gurasid].feasibility.prices.concat({});
  }

  async function _handle_add_cost(event) {
    user_fav[feasibility_property.gurasid].feasibility.costs = user_fav[feasibility_property.gurasid].feasibility.costs.concat({});
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

  async function _handle_calculator(event) {
    event.preventDefault();

      let gurasid;
      if (event.currentTarget) {
        gurasid = event.currentTarget.getAttribute('data-id');

        if (feasibility_property && feasibility_property.gurasid == gurasid) {
          use_feasibility = false;
          feasibility_property = {};
        }
        else {
          // Resolve the property BEFORE switching panels. It isn't always in `properties` — opening
          // the calculator from My Favourites, or after the results were re-searched, left this
          // undefined and the `user_fav[gurasid].feasibility` read below then threw. Because
          // use_feasibility had already been flipped to true, the app was stranded showing an empty
          // Residual panel with every other control gone, recoverable only by reloading the page.
          const resolved = properties.filter((property) => property.gurasid == gurasid)[0]
            || ((viewing_property && viewing_property.gurasid == gurasid) ? viewing_property : null);

          if (!resolved) {
            console.warn('Residual calculator: no property found for gurasid', gurasid);
            return;
          }

          // A property that was never favourited has no user_fav entry at all.
          if (!user_fav[gurasid]) {
            user_fav[gurasid] = {};
          }
          if (!user_fav[gurasid].feasibility) {
            user_fav[gurasid].feasibility = {};
          }

          feasibility_property = resolved;
          use_feasibility = true;
          user_fav = user_fav;

          if (user_fav[gurasid].feasibility.prices && user_fav[gurasid].feasibility.prices.length) {

          }
          else {
            user_fav[gurasid].feasibility.prices = [{}];

            user_fav[gurasid].feasibility.holding_years = (user_fav[gurasid].feasibility.holding_years || 2);
            user_fav[gurasid].feasibility.profit_margin = (user_fav[gurasid].feasibility.profit_margin || 20)
            user_fav[gurasid].feasibility.stamp_duty = (user_fav[gurasid].feasibility.stamp_duty || 0.05);

            consulting_options.forEach((consulting, i) => {
              user_fav[gurasid].feasibility[consulting.name] = consulting.default;
            });

          }
        }
      }
      use_template = false;

  }

  function _toggle_property_search() {
    use_crm = false;
    // isChecked = false;
    use_feasibility = false;
    use_template  = false;
    use_settings = false;
    search_form_expand = true;
    if (has_ran_search) {
      // view_property = false;
      // use_map_layer = false;
      // is_search_within_radius = false;
      _handle_search_property(1); 
    }
  }

  function _toggle_crm() {
    use_crm = true;
    use_feasibility = false;
    use_template  = false;
    use_settings = false;
  }

  let use_cdc = false;
  let use_patternbooks = false;

  // All Sites - everything off
  function _toggle_all() {
    use_cdc = false;
    use_patternbooks = false;
  }

  // CDC - CDC on, others off  
  function _toggle_cdc() {
    use_cdc = true;
    use_patternbooks = false;
  }

  // Pattern Books - Pattern Books on, others off
  function _toggle_patternbooks() {
    use_cdc = false;
    use_patternbooks = true;
  }

  function _toggle_mapview() {
    use_listview = !use_listview;

      if (use_listview) {
        search_form_expand = true;
        mapview_viewing_property = false;
        view_property = false;
        use_map_layer = false;
        is_search_within_radius = false;
        if (has_ran_search) {
          _handle_search_property(1); 
        }
      }
      else {
        
        viewing_property = {'address': '...'};

        setTimeout(function(){
          if (map) {
            map.resize();
          }
        }, 300);
        
      }
    
  }

  function _reset_filter() {

    isChecked = false;

    is_search_within_radius = false;

    // Clear All restores the member's full entitlement: every region on their
    // plan selected (at least one region must always be selected).
    regions_selected = Array.isArray(user_regions) && user_regions.length ? [...user_regions] : [...regions];
    var checkboxes = document.querySelectorAll('input[name="region"]');
    checkboxes.forEach(function(checkbox) {
      checkbox.checked = regions_selected.includes(checkbox.value);
    });

    lga_names_selected = [];
    zone_selected = [];
    suburb_selected = [];
    address_selected = [];
    gurasid_selected = [];
    permissibleuse_selected = [];

    lot_size_range = [0, 10000];
    min_lot_size_range = [0, 10000];
    school_range = [0, 2000];
    hospital_range = [0, 2000];
    train_range = [0, 2000];
    height_range = [0, 400];
    fsr_range = [0, 30];
    gfa_range = [0, 10000];

    width_range = [0, 1000];
    depth_range = [0, 1000];

    exclusion_options.forEach(option => {
      option.selectedValue = "0";
    });

    exclusion_options = exclusion_options;

    if (no_exclusions.hasOwnProperty("strata")) {
      delete no_exclusions.strata;
    }
  }

  function _parse_body(load_body) {
    if (load_body.region_names) {
      regions_selected = load_body.region_names;
      var checkboxes = document.querySelectorAll('input[name="region"]');
      checkboxes.forEach(function(checkbox) {
        if (regions_selected.includes(checkbox.value)) {
          checkbox.checked = true;
        }
        else {
          checkbox.checked = false;
        }
      });
    }

    if(load_body.lga_names) {
      lga_names_selected = load_body.lga_names;
    }

    if(load_body.zones) {
      // alert(JSON.stringify(load_body.zones, null, 2));
      zone_selected = load_body.zones;
    }

    if(load_body.suburbnames) {
      suburb_selected = load_body.suburbnames;
    }

    if(load_body.address) {
      address_selected = load_body.address;
    }

    if (load_body.gurasids) {
      gurasid_selected = load_body.gurasids;
      isChecked = true;

      no_exclusions = {"strata": 0};

    }

    if(load_body.permissibleuses) {
      permissibleuse_selected = load_body.permissibleuses;
    }

    if(load_body.lot_size_min) {
      lot_size_range[0] = load_body.lot_size_min;
    }

    if(load_body.lot_size_max) {
      lot_size_range[1] = load_body.lot_size_max;
    }

    if(load_body.area_min) {
      min_lot_size_range[0] = load_body.area_min;
    }

    if(load_body.area_max) {
      min_lot_size_range[1] = load_body.area_max;
    }

    if(load_body.width_min) {
      width_range[0] = load_body.width_min;
    }

    if(load_body.width_max) {
      width_range[1] = load_body.width_max;
    }

    if(load_body.depth_min) {
      depth_range[0] = load_body.depth_min;
    }

    if(load_body.depth_max) {
      depth_range[1] = load_body.depth_max;
    }

    if (load_body.complying_development) {
      complying_development = load_body.complying_development;
    }

    if (load_body.pattern_books) {
      pattern_books = load_body.pattern_books;
    }

    if(load_body.closest_school_distance) {
      school_range[0] = load_body.closest_school_distance;
    }

    if(load_body.closest_hospital_distance) {
      hospital_range[0] = load_body.closest_hospital_distance;
    }
    
    if(load_body.closest_railway_station_distance) {
      train_range[0] = load_body.closest_railway_station_distance;
    }

    if(load_body.height_min) {
      height_range[0] = load_body.height_min;
    }

    if(load_body.ols_maximum_height) {
      height_range[1] = load_body.ols_maximum_height;
    }

    if (load_body.fsr_min) {
      fsr_range[0] = load_body.fsr_min;
    }

    if (load_body.fsr_max) {
      fsr_range[1] = load_body.fsr_max;
    }

    if (load_body.no_exclusions) {
      no_exclusions = load_body.no_exclusions;

      exclusion_options.forEach(option => {
        if (no_exclusions[option.name]) {
          option.selectedValue = no_exclusions[option.name] + "";
        }
      });

      exclusion_options = exclusion_options;

      // for (let key in exclusions) {
      //   if (no_exclusions[key]) {
      //     exclusions[key] = true;
      //   }
      // }

    }

  }

  async function _load_search(search_index) {
    if (user_search && user_search.length) {
      let load_body = JSON.parse(user_search[search_index].search_query);

      console.log('load search: ' + encodeURIComponent(user_search[search_index].search_query));

      // Set the button text to "Retrieving Search..."
      retrieving[search_index] = true;

      // Wait for 2 seconds
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Reset the button text back to its original state
      retrieving[search_index] = false;

      _reset_filter();
      _parse_body(load_body);

      setTimeout(function() {
        _handle_search_property(1)
      }, 0);

    }
  }

  async function _edit_search_name(search_index, event) {
    const selected = user_search[search_index];
    const new_name = event.target.innerText.trim();

    // No change: do nothing
    if (!new_name || new_name === selected.name) {
      event.target.innerText = selected.name;
      return;
    }

    retrieving[search_index] = true;

    try {
      const response = await fetch(`${api_domain}/usersearch/update`, {
        method: 'POST', // or PUT if your backend uses PUT
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: selected.user_id,
          search_query: selected.search_query,
          name: selected.name,   // old name
          new_name
        })
      });

      const result = await response.json();

      if (result.status === 'updated') {
        user_search[search_index].name = new_name;
      } else {
        // Revert UI on failure
        event.target.innerText = selected.name;
        console.error('Update failed', result);
      }
    } catch (err) {
      event.target.innerText = selected.name;
      console.error('Error calling /usersearch/update', err);
    } finally {
      retrieving[search_index] = false;
    }
  }

  async function _delete_search(search_index) {
    if (user_search && user_search.length) {
      const selected = user_search[search_index];
      const load_body = JSON.parse(selected.search_query);

      console.log('Deleting search: ' + encodeURIComponent(selected.search_query));

      // Show loading state on button
      retrieving[search_index] = true;

      try {
        // Call backend API to delete the saved search
        const response = await fetch(`${api_domain}/removeusersearch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: selected.user_id,
            name: selected.name,
            search_query: selected.search_query
          })
        });

        const result = await response.json();

        if (result.status === 'done') {
          console.log(`Deleted search (${selected.name}) successfully.`);

          // Optionally remove it from UI list
          user_search.splice(search_index, 1);
        } else {
          console.error('Failed to delete search:', result);
        }

        // Wait 2 seconds to simulate loading
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error('Error deleting search:', error);
      } finally {
        retrieving[search_index] = false;
      }
    }
  }



  function formatTimestamp(timestampStr) {
    const [datePart] = timestampStr.split('T');
    const [year, month, day] = datePart.split('-');
    return `${day}/${month}/${year}`;
  }

  $: total_results_label = is_getting_total_on_demand ? 'Calculating...'
    : total_count_failed ? 'Count Unavailable'
    : (objects_total_on_demand === null || objects_total_on_demand === undefined) ? 'Total Results'
    : objects_total_on_demand === 1 ? '1 Match'
    : objects_total_on_demand > 0 ? `${objects_total_on_demand.toLocaleString()} Matches`
    : 'No Matches';

  async function _handle_reset_search(event) {
    _reset_filter();
    _fetch_data_by_regions();
  }

  async function _handle_save_search(event) {
    is_saving = true;

    if (user_id) {
      if (body) {
        console.log({user_id, body});
        const save_search_response = await fetch(`${api_domain}/usersearch`, {
          method: 'POST',
          cache: "no-cache",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify({"user_id": user_id, "search_query": JSON.stringify(body)})
        }).then(save_search_response => save_search_response.json()).catch(function(){});

        setTimeout(async () => {
          is_saving = false;

          const user_search_response = await fetch(`${api_domain}/usersearch/${user_id}`, {
            method: 'GET',
            cache: "no-cache",
            headers: {"Content-Type": "application/json"},
          }).then(user_search_response => user_search_response.json()).catch(function(){});
          if (user_search_response) {
            user_search = user_search_response;

            console.log(JSON.stringify(user_search, null, 2));
          }

        }, 1000);
      }
      else {
        alert('Start Your Search!')
      }
      
      
    }
    else {

    } 
  }

  const MAX_LEN = 50;

  function limitEditableKeydown(event, search_index) {
    const key = event.key;

    // Block Enter / Return
    if (key === 'Enter') {
      event.preventDefault();
      return;
    }

    // Allow navigation, deletion, etc.
    const controlKeys = [
      'Backspace', 'Delete', 'ArrowLeft', 'ArrowRight',
      'ArrowUp', 'ArrowDown', 'Tab', 'Home', 'End'
    ];
    if (controlKeys.includes(key) || event.ctrlKey || event.metaKey) {
      return;
    }

    const el = event.target;
    const text = el.innerText ?? el.textContent ?? '';
    if (text.length >= MAX_LEN) {
      // Prevent extra characters
      event.preventDefault();
    }
  }

  function limitEditableInput(event, search_index) {
    const el = event.target;
    let text = el.innerText ?? el.textContent ?? '';

    if (text.length > MAX_LEN) {
      // Trim any overflow (e.g., from paste)
      text = text.slice(0, MAX_LEN);
      el.innerText = text;
      
      // Move caret to end after trimming
      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(el);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }





  async function _update_crm(event) {
    // event.preventDefault();
    let gurasid;
    if (event.currentTarget) {
      gurasid = event.currentTarget.getAttribute('data-id');
    }
    else {
      gurasid = event.detail.target.getAttribute('data-id');
    }
    
    if (user_id && gurasid) {
      const crm_response = await fetch(`${api_domain}/crm`, {
        method: 'POST',
        cache: "no-cache",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(user_fav[gurasid])
      }).then(crm_response => crm_response.json()).catch(function(){});
    }
  }

  async function _update_feasibility(feasibility, user_id, gurasid) {
    
    if (feasibility && user_id && gurasid) {
      const feasibility_response = await fetch(`${api_domain}/feasibility`, {
        method: 'POST',
        cache: "no-cache",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({"feasibility": feasibility, "user_id": user_id, "property_id": gurasid})
      }).then(feasibility_response => feasibility_response.json()).catch(function(){});
    }
  }

  async function _toggle_select(event) {
    event.preventDefault();
    
    let gurasid = event.currentTarget.getAttribute('data-id');
    if (user_fav && user_fav.hasOwnProperty(gurasid) && user_fav[gurasid].hasOwnProperty('selected')) {
      user_fav[gurasid].selected = ! user_fav[gurasid].selected;
    }
    else {
      user_fav[gurasid].selected = true;
    }

    return false;
  }

  
  async function _toggle_fav(event) {
    event.preventDefault();
    
    let gurasid = event.currentTarget.getAttribute('data-id');
    if (user_fav && user_fav.hasOwnProperty(gurasid)) {
      delete user_fav[gurasid];
      // user_fav = user_fav;
      properties = properties;

      if (user_id) {
        const fav_response = await fetch(`${api_domain}/unfav`, {
          method: 'POST',
          cache: "no-cache",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify({"user_id": user_id, "property_id": gurasid})
        }).then(fav_response => fav_response.json()).catch(function(){});
      }

    }
    else {
      user_fav[gurasid] = {status: '', comments: '', emailed: false, mailed: false, "user_id": user_id, "property_id": gurasid, "user_email": user_email, "user_plan": user_plan, "user_first_name": user_first_name, "user_last_name": user_last_name};
      if (user_id) {
        const fav_response = await fetch(`${api_domain}/fav`, {
          method: 'POST',
          cache: "no-cache",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify({"user_id": user_id, "property_id": gurasid, "user_email": user_email, "user_plan": user_plan, "user_first_name": user_first_name, "user_last_name": user_last_name})
        }).then(fav_response => fav_response.json()).catch(function(){});
      }

    }
    // alert(JSON.stringify(user_fav, null, 2));
    return false;
  }

  function scrollToTopOfContainer() {
    const container = document.querySelector('.search-result-container');
    if (container) {
      container.scroll({
        top: 0
      });
    }
  }

  function handleImageError(event) {
    event.target.src = img_placeholder;
  }

  function _handle_window_keydown(event) {
	  // let keyCode = event.keyCode;
	  let key = event.key;

    if (key == 'Enter') {
      const subscribe_email_input = document.getElementById('subscribe-email');
      if (document.activeElement === subscribe_email_input) {
        _handle_subscribe_email();
      }
      else {
        _handle_search_property();
      }
    }
    else if (key == 'Escape') {
      // Cancel a search that is still waiting on the API and re-enable the button.
      if (is_searching_main) {
        search_aborted = true;
        if (search_abort_controller) search_abort_controller.abort();
        is_searching_main = false;
      }
      view_property = false;
      is_getting_total = false;
      _handle_delete_all();
      showSuggestions = false;

      if (map && selectedId !== null) {
        map.setFeatureState(
          { source: `custom-tiles-lot-fill`, sourceLayer: 'Lot', id: selectedId },
          { selected: false }
        );
      }
      

    }
    else if (event.ctrlKey && event.shiftKey && key == 'Z') {
    }
    else if (event.ctrlKey && event.shiftKey && key == 'D') {
      if (use_debug) {
        use_debug = false;
      }
      else {
        use_debug = true;
        is_logged_in = true;
        // use_feasibility = true;
        // feasibility_property = properties.filter((property) => property.gurasid == gurasid)[1];
      }
    }
    else if (event.ctrlKey && event.shiftKey && key == 'Z') {
      zoomMap(22);
    }
    else if (event.ctrlKey && event.shiftKey && key == 'R') {
      map.flyTo({
        center: initialState.center,
        zoom: initialState.zoom,
        pitch: initialState.pitch,
        bearing: initialState.bearing,
        duration: 1500 // Animation duration in milliseconds
      });
    }
    else if (event.ctrlKey && event.shiftKey && key == 'P') {
      event.preventDefault();
      is_logged_in = true;
      use_listview = false;
      setTimeout(async () => {
        await _handle_view_property('1645912'); 
        // await initPdfMe();
        // createPdf('1645912', api_domain, pdf_config, custom_logo_url, user_first_name, user_last_name);
      }, 100);
      return false;
    }
    else if (event.ctrlKey && event.shiftKey && key == 'K') {
      window.location = '?id=55&email=stuart%40urbanperspectives.com.au&first_name=Stuart&last_name=Wilmot&plan=Enterprise+5+regions&regions=Sydney%2C+Western%2C+Southern%2C+Northern%2C+Central+and+Hunter&rid=ib97k1&search%3D%7B%22region_names%22%3A%5B%5D%2C%22complying_development%22%3A%7B%22cdc_dual_occupancy%22%3Afalse%7D%2C%22no_exclusions%22%3A%7B%22strata%22%3A1%7D%2C%20%22address%22%3A%20%2229%20Chandos%20Street%20ASHFIELD%22%7D';
    }
    else if (event.ctrlKey && event.shiftKey && key == 'S') {
      window.location = '?map_view=1&use_map_layer=&id=55&email=stuart%40urbanprospects.com.au&first_name=Stuart&last_name=Wilmot&plan=Enterprise+5+regions&regions=Sydney%2C+Western%2C+Southern%2C+Northern%2C+Central+and+Hunter&rid=ib97k1&search%3D%7B%22region_names%22%3A%5B%5D%2C%22complying_development%22%3A%7B%22cdc_dual_occupancy%22%3Atrue%7D%2C%22no_exclusions%22%3A%7B%22strata%22%3A1%7D%2C%20%22address%22%3A%20%2229%20Chandos%20Street%20ASHFIELD%22%7D&dev=1';
    }
    else if (event.ctrlKey && event.shiftKey && key == 'F') {
      window.location = '?id=55&email=stuart%40urbanperspectives.com.au&first_name=Stuart&last_name=Wilmot&plan=Enterprise+5+regions&regions=Sydney%2C+Western%2C+Southern%2C+Northern%2C+Central+and+Hunter&rid=ib97k1&search=';
    }
  }

  async function downloadPdf() {

    generating_pdf = true;

    let search_body = {
      "per_page": 1, 
      "page": 60
    };

    _build_body(search_body);

    
    let targetUrl = 'https://io.imsstratus.com.au/upapp/?print=1&action=1&search=' + encodeURIComponent(JSON.stringify(search_body)) + '&id=55&email=stuart%40urbanperspectives.com.au&first_name=Stuart&last_name=Wilmot&plan=Enterprise%205%20regions&regions=Sydney%2C%20Western%2C%20Southern%2C%20Northern%2C%20Central%20and%20Hunter';

    try {
      const response = await fetch(api_domain + '/pdf/property', {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ url: targetUrl })
      });

      if (!response.ok) {
        throw new Error("Failed to fetch PDF");
      }

      // Get the PDF as a blob
      const blob = await response.blob();

      // Create a link to download the PDF
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Sixty Site Search.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      generating_pdf = false;
    } catch (error) {
      alert(error.message);
    }
    return false;
  }

  function changePage(pageNumber, event) {
    if (event && event.preventDefault) {
      event.preventDefault();
    }

    page = pageNumber; 
    _handle_search_property();
    if ((page - 2) >= 2) {
      start_page = page - 2;  
    }
    else {
      start_page = 1;
    }
  }

  function nextPage() {
    if (page < max_number_of_pages) {
      page = page + 1;
      _handle_search_property();
      if ((page - 2) >= 2) {
        start_page = page - 2;  
      }

      else {
        start_page = 1;
      }
    }
  }

  function prevPage() {
    if (page > 1) {
      page = page - 1;
      _handle_search_property();
      if ((page - 2) >= 2) {
        start_page = page - 2;  
      }
      else {
        start_page = 1;
      }
    }
  }

  let user_fav_status_options = [
    'Qualified',
    'Passed Feasibility Study',
    'Failed Feasibility Study',
    'Ruled Out',
    'Initial Contact',
    'Mail Sent',
    'Emailed',
    'Initial Negotiation',
    'Acquired',
    'Not Acquired'
  ];

  let regions_selected = [];
  let lga_names_selected = [];
  let zone_selected = [];
  let permissibleuse_selected = [];
  let suburb_selected = [];
  let address_selected = '';
  let lotnumber = '';
  let sectionnumber = '';
  let planlabel = '';
  let gurasid_selected = '';

  let lga_name_response;
  let zone_response;
  let suburb_response;
  let pemissibleuse_response;

  let pdf_config = { 
    cover_page: true,
    cover_logo: true,
    cover_background_image: true,
    mapbox_cover: false,
    mapbox_last_page: false,
    overview: true,
    suburb_profile: true,
    near_by_school: true,
    near_by_hospital: true,
    near_by_train: true,
    local_environmental_plans: true,
    zoning_history: true,
    sales_history: true,
    permissible_uses: true,
    comply_development: true,
    pattern_books: true,
    planning_constraints: true,
    planning_constraint_maps: true,
    development_applications: true,
    development_applications_maps: true,
    census_suburb_age_profile: true,
    census_ancestry: true,
    census_country_of_birth: true,
    census_rent_affordability: true,
    census_mortgage_affordability: true,
    census_weekly_household_income: true,
    census_tenure_type: true,
    census_household_composition: true,
    census_crime_occurrence: true,
    census_crime_rankings: true,
    contribution_plans: true,
    development_control_plans: true,
    state_environmental_planning: true 
  };
  

  
  onMount(async () => {
    let querystring = new URLSearchParams(window.location.search);

    report_title = querystring.get('report_title') ?? "Property Search";
    report_subtitle = querystring.get('report_subtitle') ?? "Instant due diligence reports for smarter property decisions";
    report_button_label = querystring.get('report_button_label') ?? "SEARCH NOW";
    report_buy_button_label = querystring.get('report_buy_button_label') ?? "DUE DILIGENCE REPORT";
    report_button_size = querystring.get('report_button_size') ?? "small";
    app_background_color = querystring.get('app_background_color') ?? "#ffffff";

    pdf_property = querystring.get('pdf_property');

    if (pdf_property) {
      await initPdfMe();
      createPdf(pdf_property, api_domain, pdf_config, custom_logo_url, user_first_name, user_last_name);
    }

    if (querystring.get('report')) {
      buy_report = true;
      delete no_exclusions.strata;
    }

    let crm = querystring.get('crm'); 
    if (crm) {
      isChecked = true;
      use_crm = true;
      use_feasibility = false;
      use_template = false;
      
      if (no_exclusions.hasOwnProperty("strata")) {
        delete no_exclusions.strata;
      }
      
      setTimeout(function() {
        _handle_search_property(); 
      }, 350);
      
    }

    if (querystring.get('map_view')) {
      use_listview = false;
      if (querystring.get('use_map_layer')) {
        use_map_layer = true;
        search_form_expand = true;
      }
    }
  

    if (querystring.get('test_mode')) {
      
      setTimeout(function(){
        _load_search(0);
        setTimeout(function(){
          _handle_search_property(1);
        }, 500);
      }, 500);
    }


    // Served at /app on the new site, the WordPress embed no longer passes the
    // member in the query string. Ask the site for the session profile instead;
    // it answers in the same shape (id/email/plan/first_name/last_name/regions)
    // so everything below keeps reading the querystring unchanged.
    if (!querystring.get('id') && !querystring.get('test_mode')) {
      try {
        const me_res = await fetch('/auth/me', { credentials: 'same-origin', cache: 'no-store' });
        if (me_res.ok) {
          const me = await me_res.json();
          if (me.logged_in) {
            me_answered = true;
            has_access = me.has_access !== false;
            if (me.renew_url) renew_url = me.renew_url;
            querystring.set('id', me.id);
            querystring.set('email', me.email);
            querystring.set('plan', me.plan || '');
            querystring.set('first_name', me.first_name || '');
            querystring.set('last_name', me.last_name || '');
            if (Array.isArray(me.regions) && me.regions.length) querystring.set('regions', me.regions.join(','));
          }
        }
      } catch (e) { /* not on the new site; fall through to the querystring */ }
    }

    user_id = querystring.get('id');
    user_email = querystring.get('email');
    user_plan = querystring.get('plan');
    user_first_name = querystring.get('first_name');
    user_last_name = querystring.get('last_name');

    // No plan on file (never subscribed, or everything cancelled): still let them
    // in to search; the property panel carries the subscribe step.
    // /auth/me already decided access (admins have it without a plan row), so
    // only the legacy querystring path falls back to "no plan = no access".
    if (user_id && ! user_plan) {
      user_plan = 'None';
      if (! me_answered) has_access = false;
    }
    if (user_id && ! user_regions.length && querystring.get('regions') == null) {
      user_regions = ['Sydney', 'Western', 'Southern', 'Northern', 'Central and Hunter'];
    }

    let search = querystring.get('search_bak');

    if (querystring.get('regions')) {
      if (querystring.get('regions') == 'error-no-regions-found' && user_plan && user_plan.match(/trial/i)) {
        user_regions = ['Sydney', 'Western', 'Southern', 'Northern', 'Central and Hunter'];
      }
      else {
        user_regions = querystring.get('regions').split(/\s?,\s?/).map((r) => r.trim()).filter(Boolean);
      }
      
    }
    // Plan covers all five regions: start with all of them selected (and "All" lit)
    // rather than an empty selection that only implicitly means "everything".
    if (Array.isArray(user_regions) && user_regions.length >= 5 && regions_selected.length === 0 && !querystring.get('search_bak')) {
      regions_selected = [...user_regions];
    }

    if (is_print) {
      if (search) {
        is_logged_in = true;
        let load_body = JSON.parse(search);   
        setTimeout(() => {
          _parse_body(load_body);
          setTimeout(() => {
            _handle_search_property(2); 
          }, 0);
        }, 200);
      }
      else if (view_property) {
        is_logged_in = true;
      }
    }
    else if (user_id && user_plan && user_regions.length) {
      is_logged_in = true;

      if (search) {
        if (search == '1') {
          isChecked = true;
          setTimeout(() => {
            _handle_search_property(2); 
          }, 200);
        }
        else {
          if (! crm) {
            let load_body = JSON.parse(search);
            // alert(JSON.stringify(load_body, null, 2));
            setTimeout(() => {
              _parse_body(load_body);
              setTimeout(() => {
                _handle_search_property(2); 
              }, 0);
            }, 200);
          }
        }
        
      }
    }
    else if (search && ! crm && ! buy_report) {
      let load_body = JSON.parse(search);
      // alert(JSON.stringify(load_body, null, 2));
      setTimeout(() => {
        _parse_body(load_body);
        setTimeout(() => {
          _handle_search_property(2); 
        }, 0);
      }, 200);
    }
    else {
      if (querystring.get('action')) {

        if (querystring.get('selected_regions')) {
          regions_selected = querystring.get('selected_regions').split(/\,\s?/);
          region_all = false;
        }
        if(querystring.get('lga_names')) {
          lga_names_selected = querystring.get('lga_names').split(/\,\s?/);
        }
        if(querystring.get('zones')) {
          zone_selected = querystring.get('zones').split(/\,\s?/);
        }
        if(querystring.get('suburbnames')) {
          suburb_selected = querystring.get('suburbnames').split(/\,\s?/);
        }
        if(querystring.get('address')) {
          address_selected = querystring.get('address');
        }
        if(querystring.get('permissibleuses')) {
          permissibleuse_selected = querystring.get('permissibleuses').split(/\,\s?/);
        }
        if(querystring.get('lot_size_min')) {
          lot_size_range[0] = querystring.get('lot_size_min');
        }
        if(querystring.get('lot_size_max')) {
          lot_size_range[1] = querystring.get('lot_size_max');
        }
        if(querystring.get('area_min')) {
          min_lot_size_range[0] = querystring.get('area_min');
        }
        if(querystring.get('area_max')) {
          min_lot_size_range[1] = querystring.get('area_max');
        }
        if(querystring.get('width_min')) {
          width_range[0] = querystring.get('width_min');
        }
        if(querystring.get('width_max')) {
          width_range[1] = querystring.get('width_max');
        }
        if(querystring.get('depth_min')) {
          depth_range[0] = querystring.get('depth_min');
        }
        if(querystring.get('depth_max')) {
          depth_range[1] = querystring.get('depth_max');
        }
        if(querystring.get('closest_school_distance')) {
          school_range[0] = querystring.get('closest_school_distance');
        }
        if(querystring.get('closest_hospital_distance')) {
          hospital_range[0] = querystring.get('closest_hospital_distance');
        }
        if(querystring.get('closest_railway_station_distance')) {
          train_range[0] = querystring.get('closest_railway_station_distance');
        }
        if(querystring.get('height_min')) {
          height_range[0] = querystring.get('height_min');
        }
        if(querystring.get('height_max')) {
          height_range[1] = querystring.get('height_max');
        }

        if(querystring.get('fsr_min')) {
          fsr_range[0] = querystring.get('fsr_min');
        }

        if(querystring.get('fsr_max')) {
          fsr_range[1] = querystring.get('fsr_max');
        }

        setTimeout(() => {
          _handle_search_property(2); 
        }, 200);
      }
    }

    // Readiness must not wait on the per-user API calls: none of them gates
    // rendering, and on 2026-09-07 a starved API pool held /q/fav for 30-125s
    // and left this page blank. Mark ready first, then fetch the three in
    // parallel with a per-request timeout.
    is_ready = true;

    if (user_id) {
      const user_fetch = (url) => fetch(url, {
        method: 'GET',
        cache: "no-cache",
        headers: {"Content-Type": "application/json"},
        signal: AbortSignal.timeout(15000),
      }).then(r => (r.ok ? r.json() : null)).catch(function(){});

      const [user_fav_response, user_search_response, user_template_response] = await Promise.all([
        user_fetch(`${api_domain}/fav/` + user_id),
        user_fetch(`${api_domain}/usersearch/${user_id}`),
        user_fetch(`${api_domain}/template/` + user_id),
      ]);

      if (user_fav_response) {
        console.log(user_fav_response);
        user_fav_response.forEach((fav) => {
          user_fav[fav.property_id] = fav;
        });
      }

      if (user_search_response) {
        user_search = user_search_response;

        console.log(JSON.stringify(user_search, null, 2));
      }

      if (user_template_response && user_template_response[0]) {
        console.log(user_template_response[0].template);
        user_template = user_template_response[0].template;

        from_first_name = user_template_response[0].from_first_name || user_first_name;
        from_last_name = user_template_response[0].from_last_name || user_last_name;
        from_company_name = user_template_response[0].from_company_name;
        from_address_1 = user_template_response[0].from_address_1;
        from_address_2 = user_template_response[0].from_address_2;
        from_postcode = user_template_response[0].from_postcode;
        from_city = user_template_response[0].from_city;
        from_state = user_template_response[0].from_state || 'NSW';
        custom_logo_url = user_template_response[0].custom_logo_url;

      }
    }

    is_ready = true;

    const region_name_response = await fetch(`${api_domain}/region_name`, {
      method: 'GET',
      cache: "no-cache",
      headers: {"Content-Type": "application/json"},
    }).then(region_name_response => region_name_response.json()).catch(function(){});
    regions = region_name_response;

    let filtered_lga_body = {};
    let filtered_zone_body = {};

    if (regions_selected && regions_selected.length) {
      filtered_lga_body = _regions_filter_value() ? {'regions': _regions_filter_value()} : {}; 
      const r_val = regions_selected.filter(item => item && String(item).trim() !== '').join(',');
            if (r_val) filtered_zone_body = {'regions': r_val}; 
    }

    lga_name_response = await fetch(`${api_domain}/lga_name/search`, {
        method: 'POST',
        cache: "no-cache",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(filtered_lga_body)
    }).then(lga_name_response => lga_name_response.json()).catch(function(){});
    lga_names = _clean_options(lga_name_response);



  
    let filtered_regions_data = {};
    if (regions_selected && regions_selected.length) {
      filtered_regions_data = _regions_filter_value() ? {"regions": _regions_filter_value()} : {};
    }

    suburb_response = await fetch(`${api_domain}/suburbname/search`, {
      method: 'POST',
      cache: "no-cache",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(filtered_regions_data)
    }).then(suburb_response => suburb_response.json()).catch(function(){});
    suburbs = _clean_options(suburb_response);

    if (suburb_selected && suburb_selected.length) {
      // suburb_selected items are Select objects ({value,label}); restore paths
      // (_parse_body / querystring) can leave plain strings. Normalise both so
      // we never stringify an object into '[object Object]'.
      const s_val = suburb_selected
        .map(item => (item && typeof item === 'object') ? item.value : item)
        .filter(v => v && String(v).trim() !== '')
        .join(',');
            if (s_val) filtered_zone_body.suburbnames = s_val;
    }

    zone_response = await fetch(`${api_domain}/zone/search`, {
        method: 'POST',
        cache: "no-cache",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(filtered_zone_body)
    }).then(zone_response => zone_response.json()).catch(function(){});
    zones = _clean_options(zone_response);


    pemissibleuse_response = await fetch(`${api_domain}/permissibleuse?regions=${encodeURIComponent(_regions_filter_value())}`, {
      method: 'GET',
      cache: "no-cache",
      headers: {"Content-Type": "application/json"},
    }).then(pemissibleuse_response => pemissibleuse_response.json()).catch(function(){});
    permissibleuses = pemissibleuse_response;

  
    _init_mapbox();
    // setTimeout(function(){
    //   satellite = true;
    //   _handle_change_map_style();
    // }, 0);
    

    
    document.addEventListener('error', function (event) {
      if (event.target.tagName.toLowerCase() !== 'img') return;

      var image = event.target;
      image.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

    }, true);

    // myFontBinaryString = await loadMyFontAsBinaryString();

    retrieving = user_search.map(() => false);

    window.addEventListener('popstate', _handle_btn_back);

    // Infinite scroll for List View
    if (use_listview) {
      const resultsContainer = document.querySelector('.search-result-container');
      if (resultsContainer) {
        resultsContainer.addEventListener('scroll', () => {
          if (is_searching_main || !can_load_more) return;

          const scrollTop = resultsContainer.scrollTop;
          const scrollHeight = resultsContainer.scrollHeight;
          const clientHeight = resultsContainer.clientHeight;

          // If scrolled to bottom, load more results
          if (scrollTop + clientHeight >= scrollHeight - 200) { // 200px from bottom
            page++;
            _handle_search_property(0, 1); // 0 = don't reset page, 1 = no_count
          }
        });
      }
    }

  });

  onDestroy(() => {
    if (browser) { // Ensure window exists
      window.removeEventListener('popstate', _handle_btn_back);
    }
  });

  function _build_body(body) {
    if (regions_selected && regions_selected.length) {
      body.region_names = regions_selected;
    }
    else {
      regions_selected = user_regions; 
      body.region_names = regions_selected;

      var checkboxes = document.querySelectorAll('input[name="region"]');
      checkboxes.forEach(function(checkbox) {
        if (regions_selected.includes(checkbox.value)) {
          checkbox.checked = true;
        }
      });

    }
    

    if (lga_names_selected && lga_names_selected.length) {
      body.lga_names = lga_names_selected.map(d => d.value);
    }

    if (zone_selected && zone_selected.length) {
      body.zones = zone_selected.map(d => d.value);
    }

    if (suburb_selected && suburb_selected.length) {
      body.suburbnames = suburb_selected.map(d => d.value);
    }

    if (address_selected) {
      body.address = address_selected;
    }

    if (lotnumber && lotnumber.trim() !== '') {
      body.lotnumber = lotnumber.trim();
    }
    if (sectionnumber && sectionnumber.trim() !== '') {
      body.sectionnumber = sectionnumber.trim();
    }
    if (planlabel && planlabel.trim() !== '') {
      body.planlabel = planlabel.trim();
    }

    if (rezoned) {
      body.rezoned = rezoned;
    }
    
    if (isChecked && user_fav) {
      if (crm_status_filter) {
        const user_fav_with_matching_status = Object.keys(user_fav).filter(key => user_fav[key].status === crm_status_filter);
        if (user_fav_with_matching_status && user_fav_with_matching_status.length) {
          body.gurasids = user_fav_with_matching_status; 
        }
        else {
          body.gurasids = ['12345678900123']; // force no matching property with dummy gurasid 
        }
      }
      else {
        body.gurasids = Object.keys(user_fav);
      }
    }

    if (permissibleuse_selected && permissibleuse_selected.length) {
      body.permissibleuses = permissibleuse_selected.map(d => d.value);
    }


    if (custom_price_range_min || custom_price_range_max) {
      if (custom_price_range_min > 0) {
        body.price_min = custom_price_range_min; 
      }

      if (custom_price_range_max > 0) {
        body.price_max = custom_price_range_max;
      }
    }
    else {
      if (price_range[0] > 0) {
        body.price_min = price_range[0];  
      }

      if (price_range[1] < 13000000) {
        body.price_max = price_range[1];
      }
    }

    if (custom_lot_size_range_min || custom_lot_size_range_max) {
      if (custom_lot_size_range_min > 0) {
        body.lot_size_min = custom_lot_size_range_min; 
      }

      if (custom_lot_size_range_max > 0) {
        body.lot_size_max = custom_lot_size_range_max;
      }
    }
    else {
      if (lot_size_range[0] > 0) {
        body.lot_size_min = lot_size_range[0];  
      }

      if (lot_size_range[1] < 10000) {
        body.lot_size_max = lot_size_range[1];
      }
    }

    if (custom_width_min || custom_width_max) {
      if (custom_width_min > 0) {
        body.width_min = custom_width_min; 
      }

      if (custom_width_max < 1000) {
        body.width_max = custom_width_max;
      }
    }
    else {
      if (width_range[0] > 0) {
        body.width_min = width_range[0]; 
      }

      if (width_range[1] < 1000) {
        body.width_max = width_range[1];
      }
    }


    if (custom_depth_min || custom_depth_max) {
      if (custom_depth_min > 0) {
        body.depth_min = custom_depth_min; 
      }

      if (custom_depth_max < 1000) {
        body.depth_max = custom_depth_max;
      }
    }
    else {
      if (depth_range[0] > 0) {
        body.depth_min = depth_range[0];
      }

      if (depth_range[1] < 1000) {
        body.depth_max = depth_range[1];
      }
    }

    body.complying_development = complying_development;

    body.pattern_books = pattern_books;




    if (custom_area_size_range_min || custom_area_size_range_max) {
      if (custom_area_size_range_min > 0) {
        body.area_min = custom_area_size_range_min; 
      }

      if (custom_area_size_range_max > 0) {
        body.area_max = custom_area_size_range_max;
      }
    }
    else {
      if (min_lot_size_range[0] > 0) {
        body.area_min = min_lot_size_range[0];
      }

      if (min_lot_size_range[1] < 10000) {
        body.area_max = min_lot_size_range[1];
      }
    }

    if (school_range[0] >= 100) {
      body.closest_school_distance = roundToNearestTenth(school_range[0]);
    }

    if (hospital_range[0] >= 100) {
      body.closest_hospital_distance = roundToNearestTenth(hospital_range[0]);
    }

    if (train_range[0] >= 100) {
      body.closest_railway_station_distance = roundToNearestTenth(train_range[0]);
    }

    
    if (slope) {
      body.slope = slope;
    }
    

    if (custom_walkable_score_min || custom_walkable_score_max) {
      if (custom_walkable_score_min > 0) {
        body.walkable_score_min = custom_walkable_score_min; 
      }

      if (custom_walkable_score_max < 100) {
        body.walkable_score_max = custom_walkable_score_max;
      }
    }
    else {
      if (walkable_score_range[0] > 0) {
        body.walkable_score_min = walkable_score_range[0];
      }

      if (walkable_score_range[1] < 100) {
        body.walkable_score_max = walkable_score_range[1];
      }
    }
    
    if (custom_height_min || custom_height_max) {
      if (custom_height_min > 0) {
        body.height_min = custom_height_min; 
      }

      if (custom_height_max < 400) {
        body.height_max = custom_height_max;
      }
    }
    else {
      if (height_range[0] > 0) {
        body.height_min = height_range[0];
      }

      if (height_range[1] < 400) {
        body.height_max = height_range[1];
      }
    }



    if (custom_fsr_min || custom_fsr_max) {
      if (custom_fsr_min > 0) {
        body.fsr_min = custom_fsr_min; 
      }

      if (custom_fsr_max > 0) {
        body.fsr_max = custom_fsr_max;
      }
    }
    else {
      if (fsr_range[0] > 0) {
        body.fsr_min = fsr_range[0];  
      }

      if (fsr_range[1] < 30) {
        body.fsr_max = fsr_range[1];
      }
    }


    if (custom_gfa_min || custom_gfa_max) {
      if (custom_gfa_min > 0) {
        body.gfa_min = custom_gfa_min; 
      }

      if (custom_gfa_max > 0) {
        body.gfa_max = custom_gfa_max;
      }
    }
    else {
      if (gfa_range[0] > 0) {
        body.gfa_min = gfa_range[0];  
      }

      if (gfa_range[1] < 10000) {
        body.gfa_max = gfa_range[1];
      }
    }



    if (no_exclusions && Object.keys(no_exclusions).length) {
      body.no_exclusions = no_exclusions;
    }
  }


  // The region-dependent selects are disabled while their options reload. Toggling them by id is
  // null-safe because the permissible-use and zone containers aren't rendered in buy_report mode.
  function _set_filter_selects_disabled(disabled) {
    ['lga_names_select_container', 'suburbs_select_container', 'permissibleuses_select_container', 'zones_select_container']
      .forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.toggle('unclickable', disabled);
      });
  }


  // Region filter for API calls. When every known region is selected the filter is
  // omitted: the API treats "no regions" as all regions and answers in <1s, whereas
  // an explicit five-region IN-list on suburbname/search takes >25s (server-side index).
  function _regions_filter_value() {
    const known = regions.length ? regions : (Array.isArray(user_regions) ? user_regions : []);
    if (known.length && known.every((r) => regions_selected.includes(r))) return '';
    return regions_selected.join(',');
  }

  async function _fetch_data_by_regions() {
    if (regions_selected.length > 0) {

      _set_filter_selects_disabled(true);

      try {

        let filtered_lga_body = {};

        if (regions_selected && regions_selected.length) {
          filtered_lga_body = _regions_filter_value() ? {'regions': _regions_filter_value()} : {};
        }

        const filtered_lga_response = await fetch(`${api_domain}/lga_name/search`, {
          method: 'POST',
          cache: "no-cache",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(filtered_lga_body)
        });
        
        const filtered_lga_data = await filtered_lga_response.json();
        lga_names = _clean_options(filtered_lga_data);

        lga_names_selected = [];
        document.getElementById('lga_names_select_container').classList.remove('unclickable');

        let filtered_regions_data = {};
        if (regions_selected && regions_selected.length) {
          filtered_regions_data = _regions_filter_value() ? {"regions": _regions_filter_value()} : {};
        }
        const filtered_suburbname_response = await fetch(`${api_domain}/suburbname/search`, {
          method: 'POST',
          cache: "no-cache",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify(filtered_regions_data)
        });
        console.log(filtered_suburbname_response);
        const filtered_suburbname_data = await filtered_suburbname_response.json();
        suburbs = _clean_options(filtered_suburbname_data);
        
        suburb_selected = [];
        document.getElementById('suburbs_select_container').classList.remove('unclickable');

        if (! buy_report) {
          const filtered_permissibleuse_response = await fetch(`${api_domain}/permissibleuse?regions=${encodeURIComponent(_regions_filter_value())}`, {
            method: 'GET',
            cache: "no-cache",
            headers: { "Content-Type": "application/json" },
          });
          const filtered_permissibleuse_data = await filtered_permissibleuse_response.json();
          permissibleuses = filtered_permissibleuse_data;

          permissibleuse_selected = [];
          document.getElementById('permissibleuses_select_container').classList.remove('unclickable');

          let filtered_zone_body = {};
          if (regions_selected && regions_selected.length) {
            const r_val = regions_selected.filter(item => item && item.value && item.value.trim() !== '').map(item => item.value).join(',');
            if (r_val) filtered_zone_body = {'regions': r_val}; 
          }
          if (lga_names_selected && lga_names_selected.length) {
            const l_val = lga_names_selected.filter(item => item && item.value && item.value.trim() !== '').map(item => item.value).join(',');
            if (l_val) filtered_zone_body.lga_names = l_val; 
          }
          if (suburb_selected && suburb_selected.length) {
            const s_val = suburb_selected.filter(item => item && item.value && item.value.trim() !== '').map(item => item.value).join(',');
            if (s_val) filtered_zone_body.suburbnames = s_val;
          }
          
          const zone_response = await fetch(`${api_domain}/zone/search`, {
            method: 'POST',
            cache: "no-cache",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(filtered_zone_body)
          }).then(zone_response => zone_response.json()).catch(function(){});
          zones = _clean_options(zone_response);
          
          zone_selected = [];
          document.getElementById('zones_select_container').classList.remove('unclickable');
        }
        
        // address_selected = [];
        
        
      } catch (error) {
        console.error('Error fetching LGA names:', error);
      } finally {
        // Never leave a select stranded. Each one above re-enables itself as its data lands, but a
        // throw part-way through used to skip every remaining re-enable, so the LGA/suburb/zone
        // pickers stayed dead until a full page reload.
        _set_filter_selects_disabled(false);
      }
    } else {
      lga_names = _clean_options(lga_name_response);
      zones = _clean_options(zone_response);
      suburbs = _clean_options(suburb_response);
      permissibleuses = pemissibleuse_response;
    }
  }

  async function _handle_change_region(event) {
    let value = event.target.value;
    let is_checked = event.target.checked;

    // At least one region must stay selected: refuse to uncheck the last one.
    if (!is_checked && regions_selected.length <= 1) {
      event.preventDefault();
      return;
    }

    if (is_checked) {
      if (!regions_selected.includes(value)) {
        regions_selected = [...regions_selected, value];
      }
    } else {
      regions_selected = regions_selected.filter((item) => item !== value);
    }

    // region_all is derived reactively from regions_selected.
    _fetch_data_by_regions();

  }


  async function _check_suburbs() {
    if (suburb_selected && suburb_selected.length > 0) {

      const suburbs_array = suburb_selected.map(item => item.value);
      try {
        const filtered_lga_response = await fetch(`${api_domain}/lga_name/search`, {
          method: 'POST',
          cache: "no-cache",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({'suburbname': suburbs_array.join(',')})
        });
        const filtered_lga_data = await filtered_lga_response.json();

        if (lga_names_selected && lga_names_selected.length) {
          const newItems = filtered_lga_data.filter(item => !lga_names_selected.includes(item));
          lga_names_selected = lga_names_selected.concat(newItems);
        }
        else {
          lga_names_selected = filtered_lga_data; 
        }
        
      } catch (error) {
        console.error('Error fetching LGA names:', error);
      }

      let filtered_zone_body = {};
      if (regions_selected && regions_selected.length) {
        const r_val = regions_selected.filter(item => item && item.value && item.value.trim() !== '').map(item => item.value).join(',');
            if (r_val) filtered_zone_body = {'regions': r_val}; 
      }
      if (lga_names_selected && lga_names_selected.length) {
        const l_val = lga_names_selected.filter(item => item && item.value && item.value.trim() !== '').map(item => item.value).join(',');
            if (l_val) filtered_zone_body.lga_names = l_val; 
      }
      if (suburb_selected && suburb_selected.length) {
        const s_val = suburb_selected.filter(item => item && item.value && item.value.trim() !== '').map(item => item.value).join(',');
            if (s_val) filtered_zone_body.suburbnames = s_val;
      }

      const zone_response = await fetch(`${api_domain}/zone/search`, {
        method: 'POST',
        cache: "no-cache",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(filtered_zone_body)
      }).then(zone_response => zone_response.json()).catch(function(){});
      zones = _clean_options(zone_response);

    }
  }

  async function _fetch_data_by_lgas() {
    if (lga_names_selected && lga_names_selected.length > 0) {

      // console.log(JSON.stringify(lga_names_selected, null, 2));

      const lga_names_array = lga_names_selected.map(item => item.value);

      document.getElementById('suburbs_select_container').classList.add('unclickable');
      if (! buy_report) {
        document.getElementById('permissibleuses_select_container').classList.add('unclickable');
        document.getElementById('zones_select_container').classList.add('unclickable');
      }
      

      try {

        const filtered_suburbname_response = await fetch(`${api_domain}/suburbname/search`, {
          method: 'POST',
          cache: "no-cache",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({'lga_names': lga_names_array.join(',')})
        });
        
        const filtered_suburbname_data = await filtered_suburbname_response.json();
        suburbs = _clean_options(filtered_suburbname_data);
        
        suburb_selected = [];
        document.getElementById('suburbs_select_container').classList.remove('unclickable');
        
        if (! buy_report) {
          const filtered_permissibleuse_response = await fetch(`${api_domain}/permissibleuse?lga_names=${encodeURIComponent(lga_names_array.join(','))}`, {
            method: 'GET',
            cache: "no-cache",
            headers: { "Content-Type": "application/json" },
          });
          const filtered_permissibleuse_data = await filtered_permissibleuse_response.json();
          permissibleuses = filtered_permissibleuse_data;

          permissibleuse_selected = [];
          document.getElementById('permissibleuses_select_container').classList.remove('unclickable');

          let filtered_zone_body = {};
          if (regions_selected && regions_selected.length) {
            const r_val = regions_selected.filter(item => item && item.value && item.value.trim() !== '').map(item => item.value).join(',');
            if (r_val) filtered_zone_body = {'regions': r_val}; 
          }
          if (lga_names_selected && lga_names_selected.length) {
            const l_val = lga_names_selected.filter(item => item && item.value && item.value.trim() !== '').map(item => item.value).join(',');
            if (l_val) filtered_zone_body.lga_names = l_val; 
          }
          if (suburb_selected && suburb_selected.length) {
            const s_val = suburb_selected.filter(item => item && item.value && item.value.trim() !== '').map(item => item.value).join(',');
            if (s_val) filtered_zone_body.suburbnames = s_val;
          }

          const zone_response = await fetch(`${api_domain}/zone/search`, {
            method: 'POST',
            cache: "no-cache",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(filtered_zone_body)
          }).then(zone_response => zone_response.json()).catch(function(){});
          zones = _clean_options(zone_response);
          
          zone_selected = [];
          document.getElementById('zones_select_container').classList.remove('unclickable');
        }
        
        // address_selected = [];
        
        
      } catch (error) {
        console.error('Error fetching LGA names:', error);
      }
    } else {
      
        suburb_selected = [];
        permissibleuse_selected = [];
        zone_selected = [];
        _fetch_data_by_regions();
      // zones = zone_response;
      // suburbs = suburb_response;
      // permissibleuses = pemissibleuse_response;
    }
  }
	
  async function _handle_toggle_region_all(event) {
    if (event && event.preventDefault) event.preventDefault();
    const accessible = Array.isArray(user_regions) ? user_regions.filter((r) => regions.length === 0 || regions.includes(r)) : [];
    const all_on = accessible.length > 0 && accessible.every((r) => regions_selected.includes(r));
    regions_selected = all_on ? [] : [...accessible];
    document.querySelectorAll('input[name="region"]').forEach((cb) => { cb.checked = regions_selected.includes(cb.value); });
    _fetch_data_by_regions(); // LGA / suburb / zone lists depend on the regions
  }

  let price_range = [0, 13000000];
  let lot_size_range = [0, 10000];
  let min_lot_size_range = [0, 10000];
  let school_range = [0, 2000];
  let hospital_range = [0, 2000];
  let train_range = [0, 2000];
  let height_range = [0, 400];
  let walkable_score_range = [0, 100];
  let fsr_range = [0, 30];
  let gfa_range = [0, 10000];

  let width_range = [0, 1000];
  let depth_range = [0, 1000];

  function roundToNearestTenth(number) {
    return Math.round(number * 10) / 10;
  }

  let exclusions = {};
  
  exclusions.strata = true;
  exclusions.multiplefrontage = false;
  exclusions.h_name = false;
  exclusions.floodmapping = false;
  exclusions.landslidrisk = false;
  exclusions.minesubsidence = false;
  exclusions.activestreetfrontage = false;
  exclusions.bushfireproneland = false;
  exclusions.drinkingcatchment = false;
  exclusions.wetland = false;
  exclusions.coastalmanagement = false;
  exclusions.australian_noise_exposure_forecast = false;
  exclusions.groundwatervulnerability = false;
  exclusions.mineralresoureland = false;
  exclusions.riparianlandwatercouse = false;
  exclusions.salinity = false;
  exclusions.scenicprotectionland = false;
  exclusions.biodiversity = false;
  exclusions.contaminationactivitytype = false;
  exclusions.lzn_label = false;

  exclusions.vacant = false;

  let no_exclusions = {};

  let complying_development = {
    cdc_dual_occupancy: false,
    cdc_multi_dwelling_terraces: false,
    cdc_secondary_dwellings: false,
    cdc_dwelling_houses: false,
    cdc_manor_homes: false,
    cdc_rural_housing: false,
    cdc_inland_dwelling_houses: false,
    cdc_inland_farm_buildings: false,
    cdc_greenfield_housing: false,
    cdc_agritourism: false,
    cdc_farmstay_accommodation: false
  };


  let pattern_books = {
    semis_01_anthony_gill_eligible: false,
    semis_02_sibling_eligible: false,
    terraces_01_carter_eligible: false,
    terraces_02_sam_crawford_eligible: false,
    terraces_03_officer_woods_eligible: false,
    terraces_04_other_eligible: false,
    row_homes_01_saha_eligible: false,
    manor_homes_01_studio_eligible: false,
    small_lot_apt_01_3storeys_eligible: false,
    small_lot_apt_01_3storeys_min_eligible: false,
    small_lot_apt_01_4storeys_eligible: false,
    small_lot_apt_02_3storeys_eligible: false,
    small_lot_apt_02_4storeys_eligible: false,
    small_lot_apt_03_4_6storeys_eligible: false,
    small_lot_apt_04_4_5storeys_eligible: false,
    corner_lot_apt_01_4_6storeys_eligible: false,
    corner_lot_apt_02_4_6storeys_eligible: false,
    large_lot_apt_01_4storeys_eligible: false,
    large_lot_apt_01_6storeys_eligible: false,
    large_lot_apt_02_3_4storeys_eligible: false,
    large_lot_apt_02_5_6storeys_eligible: false,
    large_lot_apt_03_4_6storeys_eligible: false,
  };

  async function _handle_change_rezoned(event) {

  }

  async function _handle_change_pattern_books(event) {
    
  }

  async function _handle_change_complying_development(event) {

    // complying_development = {};

    // for (let key in complying_dev) {
    //   if (complying_dev[key]) {
    //     complying_development[key] = 1;
    //   }
    // }
  
  }

  async function _handle_change_exclusion(event) {

    no_exclusions = {};

    for (let key in exclusions) {
      if (exclusions[key]) {
        no_exclusions[key] = 1;
      }
      else {
        delete no_exclusions[key];
      }
    }
  
  }

  let body;

  let counting_timeout;
  async function _handle_search_property(reset, no_count, event) {

    if (event && event.preventDefault) {
      event.preventDefault();
    }

    // Cancel any pending count from a previous search
    clearTimeout(counting_timeout);

    // Reset on-demand total when starting a new search (not infinite scroll)
    if (reset) {
      objects_total_on_demand = null;
      is_getting_total_on_demand = false;
      total_count_failed = false;
      // Clear the "no matches" button label so a re-search starts from a clean state
      no_search_results = false;
      matches_outside_view = 0;
    }

    if (map && map_3d) {
      isProgrammaticMove = true;
      await new Promise(resolve => {
        map.once('moveend', () => {
          isProgrammaticMove = false;
          resolve();
        });
        map.easeTo({ pitch: 60, bearing: map.getBearing(), duration: 1000 });
      });
    }

    // Only reset 3D to 2D if in 3D mode - use a flag to prevent race conditions
    if (no_count) {

    }
    else {
      is_getting_total = true;
      setTimeout(function(){
        is_getting_total = false;
      }, 30000);
    }
    

    if (reset) {
      page = 1;
      start_page = 1;
    } 

    if (is_print) {
      per_page = 60;
    }
    if (use_listview) {
      per_page = 50;
    }
    else {
      map_status = 'Loading matches ...';
      per_page = 450;
    }

    body = {
      // "bounds": {},
      "per_page": per_page, 
      "page": page
    };

    if (reset >= 2) {
      map_status = 'Loading nearby matches ...';
      
      if (map) {
        const bounds = map.getBounds();
        const sw = bounds.getSouthWest();
        const ne = bounds.getNorthEast();

        body.bounds = {'southwest': sw, 'northeast': ne};
      }
      
    }
    else {
      if (draw) {
        removeFeatureLabels();
        draw.deleteAll();
      }
      
      
      // Reset circle properties
      circle_radius = 0;
      circle_center = null;
      delete body.bounds;
    }

    if (is_search_within_radius && circle_radius && circle_center) {
      body.radius = {"lng": circle_center[0], "lat": circle_center[1]};
      body.distance = Math.floor(circle_radius) / 1000 / 100;
    }

    _build_body(body);

    // A fresh suburb search (not a bounds-based pan/zoom re-search, and no specific address) should
    // zoom OUT to show every matching suburb as teal, rather than zooming into the first properties.
    const is_suburb_overview = !(reset >= 2) && suburb_selected && suburb_selected.length > 0 && !address_selected;
    // The zoomed-out teal overview exists so the user can pick between matching suburbs. With
    // exactly one suburb chosen there is nothing to pick, and sitting on its centroid at
    // zoom_boundary-1 leaves a viewport that need not contain the result set — the next
    // bounded search then drops the sites that fall outside it. Frame the results instead.
    const single_suburb = suburb_selected && suburb_selected.length === 1;
    const frame_suburb_overview = is_suburb_overview && !single_suburb;

    let api_url_path = '/properties';
    if (is_logged_in) {

    }
    else {
      api_url_path = `/quickproperties`;
    }

    is_searching_main = true;
    search_aborted = false;
    search_abort_controller = new AbortController();
    const properties_response = await fetch(`${api_domain}${api_url_path}`, {
      method: 'POST',
      cache: "no-cache",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(body),
      signal: search_abort_controller.signal
    }).then(r => r.ok ? r.json() : null).catch(function(){});
    is_searching_main = false;
    search_abort_controller = null;
    // Escape was pressed while this request was in flight: leave the previous results
    // (and the map) untouched and just hand the search button back to the user.
    if (search_aborted) {
      search_aborted = false;
      return;
    }
    if (reset) {
      properties = properties_response;
    } else {
      // Append new results to existing ones for infinite scroll
      if (properties_response && Array.isArray(properties_response)) {
        properties = [...properties, ...properties_response];
      } else {
        properties = properties_response;
      }
    }

    // A fresh search that came back with nothing shows "NO MATCHES FOUND" on the search button
    // until the next search is run.
    if (reset) {
      no_search_results = Array.isArray(properties) ? properties.length === 0 : !properties;
      // Pin the label to the criteria this search actually used; editing any of them clears it.
      signature_at_last_search = search_criteria_signature;

      // "No matches" has to be a statement about the criteria, not about the map window.
      // A bounded search returns only what is on screen, so an empty result set says nothing
      // about whether the site qualifies — 13 Artillery Cres passes every filter but sits
      // 617 m north of a viewport centred on Third Ave, and the button still read
      // "NO MATCHES FOUND". Re-count the same criteria without bounds so the label can
      // distinguish "nothing qualifies" from "nothing qualifies *here*".
      matches_outside_view = 0;
      if (no_search_results && body.bounds) {
        let unbounded_body = {... body};
        unbounded_body.count = 1;
        delete unbounded_body.bounds;

        const unbounded_total = await fetch(`${api_domain}${api_url_path}`, {
          method: 'POST',
          cache: "no-cache",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify(unbounded_body)
        }).then(r => r.ok ? r.json() : null).catch(function(){});

        matches_outside_view = Number(unbounded_total) || 0;
      }
    }

    // Update can_load_more for infinite scroll - if we got fewer results than per_page, we've reached the end
    if (properties_response && Array.isArray(properties_response) && properties_response.length < per_page) {
      can_load_more = false;
    } else {
      can_load_more = true;
    }

    // âœ… Scroll ONLY on mobile (< 60em) AFTER API completes
    if (use_listview && window.innerWidth <= 960) {  // 60em = 960px
      const resultsContainer = document.querySelector('.search-result-container');
      if (resultsContainer) {
        // Remove existing animation
        resultsContainer.classList.remove('scroll-animate');
        resultsContainer.offsetHeight; // Force reflow

        // Add animation + scroll
        resultsContainer.classList.add('scroll-animate');
        resultsContainer.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    }


    if (use_listview) {
      setTimeout(function(){
        scrollToTopOfContainer();
      }, 100);
    }

    if (no_count === false) {
      clearTimeout(counting_timeout);
      counting_timeout = setTimeout(async function(){
        let clone_body = {... body};
        clone_body.count = 1;

        const properties_count_response = await fetch(`${api_domain}${api_url_path}`, {
          method: 'POST',
          cache: "no-cache",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify(clone_body)
        }).then(r => r.ok ? r.json() : null).catch(function(){});
        if (!properties_count_response) return;
        objects_total = properties_count_response;

        max_number_of_pages = Math.ceil(objects_total / per_page);

        is_getting_total = false;
        map_status = default_map_status;
      }, 100);
    }
    
    // The teal suburb overlay exists so a user can pick between matching suburbs and drill in.
    // An unconstrained search resolves to every suburb in NSW (~4,430), which paints the whole
    // state and offers no choice at all — that is what you see for a moment after toggling
    // My Fav back off. Only fetch and draw the overlay when something actually narrows it.
    const suburb_overlay_is_useful = Boolean(
      (lga_names_selected && lga_names_selected.length) ||
      (suburb_selected && suburb_selected.length) ||
      (address_selected && address_selected.length) ||
      (zone_selected && zone_selected.length) ||
      (permissibleuse_selected && permissibleuse_selected.length) ||
      isChecked            // My Fav — constrained to the favourited gurasids
    );

    if (!suburb_overlay_is_useful) {
      clearSuburbMarkers();
    }

    if (suburb_overlay_is_useful) setTimeout(async function(){
      let clone_body = {... body};
      clone_body.get_suburb = 1;
      delete clone_body.bounds;

      const get_suburb_response = await fetch(`${api_domain}${api_url_path}`, {
        method: 'POST',
        cache: "no-cache",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(clone_body)
      }).then(get_suburb_response => get_suburb_response.json()).catch(function(){});

      // console.log(get_suburb_response);
      if (!mapview_viewing_property) {
        clearSuburbMarkers();
        addSuburbMarkers(get_suburb_response);
        // For a suburb search, frame all matching suburbs (zoomed out) so they show as teal and
        // the user can click one to drill in — instead of the property fit-bounds done below.
        if (frame_suburb_overview) {
          _fit_to_suburb_matches(get_suburb_response);
        }
      }

    }, 0);
    

    if (reset == 3) {
      clearMarkers();
      setTimeout(function(){
        addMarkers(properties);
        map_status = default_map_status;
      }, 0)
    }
    else if (reset == 2) {
      // if (markers.length > 1500) {
      //   clearMarkers();
      // }
      clearMarkers();
      setTimeout(function(){
        addMarkers(properties);
        map_status = default_map_status;
      }, 0)
    }
    else {
      clearMarkers();
      setTimeout(function(){
        // Suburb overview frames the suburbs (zoomed out); don't also fit-bounds to property points.
        addMarkers(properties, frame_suburb_overview ? 0 : 1);
        map_status = default_map_status;
      }, 0)
    }


    let current_body = {};
    _build_body(current_body);

    // Serialize current_body as JSON and encode it
    const searchParam = JSON.stringify(current_body);

    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'updateappsrc', searchParam }, '*');
    }

    has_ran_search = true;
    
    return false;
  }

  async function _calculate_total_count() {
    is_getting_total_on_demand = true;
    total_count_failed = false;

    // Create a body clone with count parameter
    let clone_body = {};
    _build_body(clone_body);
    clone_body.count = 1;

    let api_url_path = '/properties';
    if (is_logged_in) {
      api_url_path = `/properties`;
    } else {
      api_url_path = `/quickproperties`;
    }

    const properties_count_response = await fetch(`${api_domain}${api_url_path}`, {
      method: 'POST',
      cache: "no-cache",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(clone_body)
    }).then(r => r.ok ? r.json() : null).catch(function(){});

    // A count of 0 is a valid answer, not a failure. Assigning only on a truthy response swallowed
    // it, so the label never changed and the click looked like it had been ignored.
    if (typeof properties_count_response === 'number') {
      objects_total_on_demand = properties_count_response;
    }
    else {
      total_count_failed = true;
    }

    is_getting_total_on_demand = false;
  }

  let view_property = false;
  let property_loading = false;
  let property_request_seq = 0;
  let property_id;
  let viewing_property = {'address': '...'};

  async function _handle_btn_back() {
    // Cancel any in-flight property load so it can't reopen the panel
    property_request_seq++;
    property_loading = false;
    // Step 1: start slide-out animation by setting mapview_viewing_property false
    if (! use_listview) {
      mapview_viewing_property = false;

    // Step 2: wait for the slide-out animation duration (e.g., 300ms)
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    // Step 3: unmount the component by setting view_property false
    view_property = false;

    // Step 4: update the URL history as before
    history.replaceState({}, '', window.location.pathname);

    if (map && selectedId !== null) {
      map.setFeatureState(
        { source: `custom-tiles-lot-fill`, sourceLayer: 'Lot', id: selectedId },
        { selected: false }
      );
    }

  }


  async function _handle_view_property(gurasid, is_lot) {
    console.log('_handle_view_property');

    if (! is_logged_in) {
      // Not logged in: open the property panel showing the signup form instead
      // of redirecting to /login. Fetch the basic property so the banner shows the
      // correct street-view image (it needs the address), but skip the heavier,
      // auth-gated enrichment calls below.
      const basic_url = `${api_domain}/property/` + gurasid + (is_lot ? '?type=1' : '');
      const basic_response = await fetch(basic_url, {
        method: 'GET',
        cache: "no-cache",
        headers: {"Content-Type": "application/json"},
      }).then(r => r.json()).catch(function(){});
      const basic = (basic_response && basic_response[0]) ? basic_response[0] : null;
      // Only the fields the banner needs — avoids triggering the logged-in-only
      // reactives (census, hidden maps, etc.) for a signup view.
      viewing_property = basic
        ? { gurasid, address: basic.address, postcode: basic.postcode }
        : { gurasid };
      view_property = true;

      if (! use_listview) {
        setTimeout(() => {
          mapview_viewing_property = true;   // slide in panel
          search_form_expand = false;
        }, 10);
      }

      return;
    }

    let get_property_api_url = `${api_domain}/property/` + gurasid;
    if (is_lot) {
      get_property_api_url = `${api_domain}/property/` + gurasid + '?type=1';
      console.log(get_property_api_url);
    }

    // Slide the panel in immediately with a pulsing skeleton while the API calls run
    const request_seq = ++property_request_seq;
    property_loading = true;
    if (! use_listview) {
      view_property = true;
      setTimeout(() => {
        mapview_viewing_property = true;   // slide in panel
        search_form_expand = false;
      }, 10);
    }

    const property_response = await fetch(get_property_api_url, {
      method: 'GET',
      cache: "no-cache",
      headers: {"Content-Type": "application/json"},
    }).then(property_response => property_response.json()).catch(function(){});

    // An id the API can't resolve (or a failed request) used to throw right here, which aborted the
    // handler mid-way and left the click looking like it did nothing at all. Bail out loudly instead.
    // The user closed the panel (or opened another property) while this was loading
    if (request_seq !== property_request_seq) {
      return;
    }

    if (!property_response || !property_response.length || !property_response[0]) {
      console.warn('No property found for', gurasid);
      // Slide the skeleton panel back out — there's nothing to show
      property_loading = false;
      mapview_viewing_property = false;
      view_property = false;
      return;
    }

    viewing_property = property_response[0];

    // const property_walkability_response = await fetch(`${api_domain}/address/walkability`, {
    //   method: 'POST',
    //   cache: "no-cache",
    //   headers: {"Content-Type": "application/json"},
    //   body: JSON.stringify({"lga_name": viewing_property.lga_name, "suburbname": viewing_property.suburbname, "address": viewing_property.address})
    // }).then(property_walkability_response => property_walkability_response.json()).catch(function(){});
    // if (property_walkability_response && property_walkability_response[0]) {
    //   viewing_property.walkable_score = property_walkability_response[0].walkable_score;
    // }

    // Check for .das and proceed
    if (viewing_property && viewing_property.das && viewing_property.das.length > 0) {
      // Fetch DA links for each DA and attach to the object
      await Promise.all(viewing_property.das.map(async (da) => {
        const response = await fetch(`${api_domain}/development_applications`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ da_number: da.da_number, lga: viewing_property.lga_name || '' })
        });
        const daLinks = await response.json();
        // console.log(daLinks);
        da.da_application_url = daLinks.da_application || null;
        da.lga_url = daLinks.lga_url || null;
      })).catch((err) => console.error('DA links failed', err));
    }
  

    const ps_response = await fetch(`${api_domain}/permissibleuse`, {
      method: 'POST',
      cache: "no-cache",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({"lga": viewing_property.lga_name, "zone": viewing_property.lzn_label})
    }).then(ps_response => ps_response.json()).catch(function(){});
    
    if (ps_response) {
      viewing_property.permissibleuse = ps_response.map(item => item.permissiblelanduse);
    }
    else {
      viewing_property.permissibleuse = [];
    }

    try {
      const census_response = await fetch(`${api_domain}/census`, {
        method: 'POST',
        cache: "no-cache",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({"suburbname": viewing_property.suburbname, "postcode": viewing_property.postcode})
      }).then(census_response => census_response.json()).catch(function(){});

      // viewing_property.census = await census_response.json();
      viewing_property = { ...viewing_property, census: census_response };
      // console.log(viewing_property.census);
    } catch (err) {
      console.error(err);
      viewing_property = { ...viewing_property, census: [] };
    }


    try {
      const crime_response = await fetch(`${api_domain}/crime`);
      if (!crime_response.ok) throw new Error('Failed to load data');
      viewing_property.crime = await crime_response.json();
    } catch (err) {
      // Don't strand the panel on the skeleton if the crime feed fails
      console.error(err);
      viewing_property.crime = [];
    }
    // alert(JSON.stringify(viewing_property.crime, null, 2));

    
    if (request_seq !== property_request_seq) {
      return;
    }

    view_property = true;
    property_loading = false;

    if (! use_listview) {
      setTimeout(() => {
        mapview_viewing_property = true;   // slide in panel
        search_form_expand = false;
      }, 10);
    }

  }

  let build_quality;
  let build_quality_options = ['High', 'Low'];

  let building_type_options = ['Commercial offices', 'Industrial', 'Retail', 'Mixed use', 'Shop top housing', 'Dwelling', 'Dual occupancy', 'Manor home', 'Apartments', 'Multi-dwellings', 'Affordable housing', 'Build to rent', 'Group homes', 'Social housing', 'Boarding houses'];

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

  function getPropertyRegion() {
    if (feasibility_property && feasibility_property.region_name) {
      return feasibility_property.region_name;
    }
    if (feasibility_property && feasibility_property.postcode) {
      const postcode = parseInt(feasibility_property.postcode);
      if (postcode >= 2000 && postcode <= 2999) return 'Sydney';
    }
    if (regions_selected && regions_selected.length === 1) {
      return regions_selected[0];
    }
    return 'Sydney';
  }

  function updateConstructionCost(priceIndex) {
    setTimeout(() => {
      const region = getPropertyRegion();
      const buildingType = user_fav[feasibility_property.gurasid].feasibility.prices[priceIndex].price_type;
      const quality = user_fav[feasibility_property.gurasid].feasibility.prices[priceIndex].build_quality;
      const cost = getConstructionCost(buildingType, quality, region);
      user_fav[feasibility_property.gurasid].feasibility.prices[priceIndex].cost = cost;
    }, 100);
  }

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

  const formatNiceCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };



  // Function to format price values
  function formatPriceValue(min, max) {
    if (min && max) {
      return `Over ${formatNumber(min)} - Under ${formatNumber(max)}`;
    } else if (min) {
      return `Over ${formatNumber(min)}`;
    } else if (max) {
      return `Under ${formatNumber(max)}`;
    } else {
      return 'Any';
    }
  }

  function formatNumber(value) {
    if (value >= 1000000000) {
      return `${(value / 1000000000).toFixed(1).replace(/\.0+$/, '')}bil`;
    } else if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1).replace(/\.0+$/, '')}mil`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1).replace(/\.0+$/, '')}k`;
    } else {
      return value;
    }
  }

  // --- "NO MATCHES FOUND" button state -------------------------------------------------------
  // A fingerprint of every field _build_body reads, so we can tell a genuinely edited search from
  // an unchanged one. Svelte recomputes this whenever any listed value is reassigned or mutated.
  $: search_criteria_signature = JSON.stringify([
    regions_selected, lga_names_selected, suburb_selected, address_selected,
    lotnumber, sectionnumber, planlabel, rezoned, isChecked, crm_status_filter,
    permissibleuse_selected, zone_selected, gurasid_selected,
    no_exclusions, complying_development, pattern_books, use_cdc, use_patternbooks,
    price_range, lot_size_range, min_lot_size_range, fsr_range, gfa_range, height_range,
    width_range, depth_range, school_range, hospital_range, train_range, walkable_score_range,
    custom_price_range_min, custom_price_range_max,
    custom_lot_size_range_min, custom_lot_size_range_max,
    custom_area_size_range_min, custom_area_size_range_max,
    custom_fsr_min, custom_fsr_max, custom_gfa_min, custom_gfa_max,
    custom_height_min, custom_height_max, custom_width_min, custom_width_max,
    custom_depth_min, custom_depth_max,
    custom_walkable_score_min, custom_walkable_score_max,
    is_search_within_radius
  ]);

  // Captured when a search completes, so the check below compares against the query that actually
  // ran rather than firing the moment _handle_search_property sets no_search_results.
  let signature_at_last_search = null;

  // How many properties match the current criteria once the map viewport is ignored.
  // Non-zero means the search is fine and the map is simply pointed somewhere else.
  let matches_outside_view = 0;

  $: no_results_label = matches_outside_view > 0
    ? `NO MATCHES IN VIEW — ${matches_outside_view.toLocaleString()} ELSEWHERE`
    : 'NO MATCHES FOUND';

  // Editing any criterion makes the "no matches" label stale — it described the previous query.
  // Put the button back to an active SEARCH straight away.
  $: if (no_search_results && search_criteria_signature !== signature_at_last_search) {
    no_search_results = false;
    matches_outside_view = 0;
  }

</script>


<style>


  :global(.light-overlay) {
    --color-light-overlay: var(--up-c-5c2587-a04);
  }

  .planning-constraint-container label {
    font-size: 0.75rem;
    line-height: 1.2;
  }

  .planning-constraint-container .radio-group {
    margin-bottom: 0.25rem;
  }

  /* :global(html, body) {
    background-color: 000;
  }

  :global(.buy-container .dark-overlay-lightest) {
    box-shadow: inset 0 0 0 5120px var(--up-c-000000-a93);
  } */

  :global(a, a.visited) {
    color: var(--up-c-5c2587);
  }

  label {
    color: var(--up-c-5c2587);
  }

  .skeleton-panel {
    background: var(--up-c-ffffff);
    overflow: hidden;
  }

  .skeleton-banner {
    height: 300px;
    position: relative;
  }

  /* Match the real panel's .btn-close so the skeleton close doesn't jump on swap */
  .skeleton-close {
    position: absolute;
    top: 8px;
    right: 8px;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: var(--up-c-ffffff-a70);
    color: var(--up-c-5c2587);
    font-size: 1rem;
    line-height: 18px;
    text-align: center;
    text-decoration: none;
    z-index: 2;
  }

  .skeleton-box {
    background: var(--up-c-e4e4e4);
    border-radius: 6px;
    animation: skeleton-pulse 1.4s ease-in-out infinite;
  }

  .skeleton-line {
    margin-bottom: 0.75em;
  }

  @keyframes skeleton-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.45; }
  }

  .search-form {
    opacity: 1;
    max-height: 1200px;
    overflow: hidden;
    /* expanding: slide down first, then fade the content back in */
    transition: max-height 0.35s ease-in-out, opacity 0.25s ease-in-out 0.3s;
  }

  .search-form.collapsed {
    max-height: 0;
    margin: 0;
    opacity: 0;
    /* collapsing: fade the content out first, then slide up */
    transition: opacity 0.25s ease-in-out, max-height 0.35s ease-in-out 0.25s;
  }

  :global(.mapboxgl-marker) {
    cursor: pointer;
  }


  @media all and (min-width: 60em) {  
    h1 {
      font-size: 6em;
      line-height: 0.8em;
    }
  }

  h2 {
    font-size: 5em;
    color: var(--up-c-31144d);
  }

  h3 {
    color: var(--up-c-31144d);
  }

  h3 {
    font-size: 1.25rem;
  }

  @media all and (min-width: 60em) {  
    h3 {
      font-size: 1.4rem;
    }
  }

  .pagination-container,
  p, span, ul, ul li {
    color: var(--up-c-5c2587) !important;
    font-size: 0.7125rem;
    font-family: var(--font-family);
  }

  ul {
    list-style: none; /* Remove default bullet point */
    padding-left: 0; /* Remove default padding */
  }

  ul li:before {
    content: "\e559"; /* Unicode character for the desired Font Awesome icon */
    font-family: "lucide"; /* Font family for Font Awesome icons */
    font-weight: 300; /* Ensure proper weight to display the icon */
    margin-right: 5px; /* Adjust spacing between icon and text if needed */
  }  

  li {
    padding: calc(0.125 * var(--padding-unit)) 0;
  }

  .btn.btn-search.btn-search-medium {
    font-size: calc(0.7125rem * 1.5); 
    font-weight: 700;
  }

  .btn.btn-search.btn-search-large {
    font-size: calc(0.7125rem * 1.75); 
    font-weight: 700;
  }

  .btn.btn-search:hover {
    filter: brightness(1.1); 
  }

  .btn.btn-search.active {
    background-color: var(--up-c-5ee7ad);
    color: var(--up-c-31144d);
  }

  .plan-container.active .btn {
    background-color: var(--up-c-5ee7ad);
    color: var(--up-c-31144d);
  }

  .unclickable {
    opacity: 0.3;
  }

  .btn-region {
    text-transform: uppercase;
    background-color: var(--up-c-31144d);
    border: 1px solid Cfff;
    font-weight: bold;
    font-size: 0.7rem;
    padding: calc(0.75 * var(--padding-unit)) calc(1.25 * var(--padding-unit));; 
    margin-top: 1em;
    box-sizing: border-box;
  }

  .btn-region.active {
    background-color: var(--up-c-5c2587);
    border: 1px solid var(--up-c-5c2587);
    color: var(--up-c-ffffff);
    font-weight: bold;
  }

  .container-select-regions h3 {
    color: var(--up-c-ffffff);
  }

  input[type="number"] {
    font-size: 0.625rem;
		border: 1px solid var(--up-c-cccccc);
		border-radius: 0.4em;
		placeholder-color: var(--up-c-2a1b1b);
    padding: 1em;
    height: 28px;
    width: 54px;
    background-color: var(--up-c-ffffff-a40);
  }
  input[type="number"]:focus, input[type="number"]:active {
    box-shadow: none;
    outline: none;
  }

  .lot-size-range-container input[type="number"] {
    width: 90px    
  }

  input[type="text"] {
    font-size: 0.625rem;
		border: 1px solid var(--up-c-cccccc);
		border-radius: 0.4em;
		placeholder-color: var(--up-c-2a1b1b);
    padding: 1em;
    height: 42px;
    width: 100%;
    background-color: var(--up-c-ffffff-a40);
  }
  input[type="text"]:focus, input[type="text"]:active {
    box-shadow: none;
    outline: none;
  }

  input[type="email"] {
    font-size: 0.625rem;
		border: 1px solid var(--up-c-cccccc);
		border-radius: 0.4em;
		placeholder-color: var(--up-c-2a1b1b);
    padding: 1em;
    height: 42px;
    width: 100%;
  }
  input[type="email"]:focus, input[type="email"]:active {
    box-shadow: none;
    outline: none;
  }

  label {
    font-size: 0.6875rem;
    padding-right: 0.5em;
    /* white-space: nowrap; */
    text-overflow: ellipsis;
  }

  .radio-buttons label,
  .checkbox-container label {
    font-size: 0.625rem;
  }

  code {
    font-size: 0.625rem;
    white-space: wrap;
  }

  hr {
    margin: 0.5em 0 0.5em 0;
    height: 1px;
    border: none;
    border-top: 1px solid var(--up-c-f1e9f7);
  }

	:global(.themed) {
    --font-size: 0.625rem;
		--border: 1px solid var(--up-c-f1e9f7);
		--border-radius: 0.4em;
		--placeholder-color: var(--up-c-2a1b1b);
    --clear-icon-color: var(--up-c-5c2587);
    --clear-icon-width: 12px;
	}

  :global(.themed .svelte-select) {
    background-color: transparent !important;
  }

  /* When ANY .themed container has a focused select, boost its z-index */
  :global(.themed:has(.svelte-select.focused)) {
    z-index: 9999 !important;
    position: relative !important;
  }

  /* The dropdown list should also have high z-index */
  :global(.svelte-select-list) {
    z-index: 10000 !important;
  }
  
  :global(.multi-item) {
    outline: none !important;
  }

  :global(.themed .track) {
    margin: 8px 8px 16px 8px;
  }

  .property-container {
    border: 1px solid var(--up-c-f1e9f7);
    border-radius: 0.6em;
  }

  .link-property,
  .link-back {
    text-decoration: none;
    color: var(--up-c-5c2587);
    font-size: 0.75rem;
    line-height: 1.4em;
    font-family: var(--font-family);
  }

  .app.is-print .padding-top.span-info {
    padding-top: 0.25em;
  }

  .span-info,
  .span-info h4 span {
    color: var(--up-c-5c2587);
    font-size: 0.75rem;
    line-height: 1.4em;
    font-family: var(--font-family);
    font-weight: 400;
  }

  .span-label {
    color: var(--up-c-aaaaaa);
    font-size: 0.52rem;
    font-weight: 600;
    line-height: 0.8em;
    text-transform: uppercase;
  }

  h5 {
    font-size: 0.8125rem;
    line-height: 1.3em;
  }

  button {
    padding: 1em 2em;
    background-size: 600% 100%;
    border: 1px solid var(--up-c-ffffff);
    border-radius: 100em;
    font-weight: 400;
    font-size: 0.625rem !important;
    
    color: var(--up-c-111111);
    padding: 0.3em 0.5em 0.5em 0.5em !important;
    border: 0;
    height: 24px;
    width: 24px;
    aspect-ratio: 1/1;
    box-sizing: border-box;
    background-color: var(--up-c-f1e9f7);
    font-family: var(--font-family);
    cursor: pointer;
  }

  .pagination button {
    margin: 4px;
    line-height: 1.1rem;
  }

  .pagination button.current {
    color: var(--up-c-ffffff);
    background-color: var(--up-c-31144d); 
  }

  .pagination button.current:hover {
    filter: brightness(1.05);
  }

  .pagination button:not(.current):hover {
    background-color: var(--up-c-fefefc);
  }

  .pagination button:disabled {
    pointer-events: none;
    opacity: 0.4;
  }

  .debug-container {
    background-color: var(--up-c-f1f1f1);
  }

  .debug-container:not(.debug) {
    display: none;
  }

  .test-container:not(.debug) {
    display: none;
  }

  .border-primary {
    border: 1px solid var(--up-c-5c2587);
  }
  
  @media all and (min-width: 60em) {  
    .app.search-app {
      height: 100vh;
      overflow: auto;
      position: relative;
    }

    .app.search-app.mapview {
      overflow: hidden; 
    }
  }

  :global(.app.search-app::-webkit-scrollbar),
  :global(body::-webkit-scrollbar) {
    display: none;
  }

  .save-search-container {
    padding-left: 0.75em;
    padding-right: 0.75em;
    background-color: transparent; 
    border-radius: 0.6em;
  }

  .filter-container {
    height: calc(50vh);
    overflow: auto;
    padding: 0 0.75em;
    background-color: transparent; 
    border-radius: 0.6em;;
    box-shadow: inset 0 1px 12px 0px var(--up-c-000000-a07);
  }

  .mapview .filter-container {
    background-color: var(--up-c-ffffff-a07) 
    /* backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px); */
  }

  @media all and (min-width: 60em) {  
    .filter-container {
      height: calc(100vh - 19em);
    }

    .mapview .filter-container {
      height: calc(100vh - 23em);
    }
  }

  @media all and (max-width: 40em) {  
    .mapview .filter-container {
      height: calc(20vh);
    }
  }

  @media (max-width: 60em) {
    .search-result-container {
      scroll-behavior: smooth;
    }
    
    .scroll-animate {
      animation: slideDownMobile 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    }
  }


  @keyframes slideDownMobile {
    0% {
      opacity: 0;
      transform: translateY(-30px);
    }
    100% {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media all and (max-width: 60em) {  
    .search-result-container {
      margin-top: 1em;
    }
  }

  @media all and (min-width: 60em) {  
    .search-result-container {
      height: calc(100vh - 6em);
      overflow-y: scroll;
    }

    .map-container {
      height: 100vh; 
    }

    /* .map-container {
      height: 100%; 
    } */
  }

  .pagination-container {
    padding-top: 0.75em;
  }

  @media all and (max-width: 40em) { 
    .pagination {
      padding-top: 1em;      
    }
  }

  .checkbox-container label {
    color: var(--up-c-5c2587);
    border: 1px solid var(--up-c-5c2587);
    border-radius: 4px;
    font-size: 0.7125rem;
    font-weight: 400;
    padding: calc(0.5 * var(--padding-unit)) calc(0.65 * var(--padding-unit));
    text-decoration: none;
    cursor: pointer;
    font-family: var(--font-family);
    width: auto;
    display: block;
    
  }

  .checkbox-container label {
    margin-right: 0.25em;
    margin-top: 0.5em;
  }

  .checkbox-container:hover label {
    background-color: var(--up-c-f1e9f7);
    filter: brightness(1.06); 
  }

  .checkbox-container:has(input:checked) label {
    color: var(--up-c-f1e9f7);
    background-color: var(--up-c-5c2587);
  }

  :global(.link) {
    color: var(--up-c-5c2587);
    font-size: 0.7125rem;
    font-weight: 400;
    text-decoration: none;
    cursor: pointer;
    font-family: var(--font-family);
    width: auto;
    display: inline-block; 
  }

  :global(.btn) {
    background-color: var(--up-c-ffffff-a00);
    color: var(--up-c-5c2587);
    border: 1px solid var(--up-c-5c2587);
    border-radius: 4px;
    font-size: 0.7125rem;
    font-weight: 400;
    padding: calc(0.5 * var(--padding-unit)) calc(0.75 * var(--padding-unit));
    text-decoration: none;
    cursor: pointer;
    font-family: var(--font-family);
    width: auto;
    display: inline-block;
  }

  :global(.btn:hover) {
    background-color: var(--up-c-f1e9f7-a67);
    filter: brightness(1.06); 
  }

  :global(.btn.active) {
    background-color: var(--up-c-5c2587);
    color: var(--up-c-f1e9f7);
  }

  .btn.btn-search {
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

  .btn.btn-search.no-results {
    background-color: var(--up-c-8e7a9b);
  }

  .btn-save-search {
    font-size: 0.5685rem;
    padding: calc(0.35 * var(--padding-unit)) calc(0.3 * var(--padding-unit));
    width: 65px;
    text-align: center;
  }

  .btn-save-search.btn-width-auto {
    width: auto;
  }

  .toggle-label {
    color: var(--up-c-5c2587);
  }

  .toggle-label span {
    margin-right: 4px;
  }

  .toggle-label i {
    font-size: 1rem;
    transform: translateY(1.5px);
  }

  :global(.multi-item-text) {
    font-family: var(--font-family);
  }

  :global(.svelte-select-list) {
    font-family: var(--font-family) !important;
  }

  :global(.value-container) {
    gap: 5px 5px !important;
  }
  
  
  :global(.svelte-select) {
    min-height: 35px !important;
    z-index: 3;
  }

  :global(.multi-item-clear svg) {
    color: var(--up-c-ffffff) !important; 
    width: 10px !important;
    height: 10px !important;
  }

  .temp-container.pagination-container .one-third,
  .temp-container.pagination-container .one-quarter {
    display: none;
  }

  .temp-container.pagination-container button {
    color: transparent;
    animation: pulse 3.5s ease-in-out infinite;
    pointer-events: none;
    cursor: not-allowed;
  }

  .temp-container h5,
  .temp-container h6,
  .temp-container .one-quarter * {
    background-color: var(--up-c-fcfcff);
    border-radius: 4px; 
    color: transparent;
    min-width: 40px;
    transform: none;
    animation: pulse 3.5s ease-in-out infinite;
  }

  .temp-container .dark-overlay-lightest {
    animation: pulse-opacity 3.5s ease-in-out infinite;
  }
  

  @keyframes pulse {
    0% {
      background-color: var(--up-c-fcfcff);
    }
    50% {
      background-color: var(--up-c-f1e9f7);
    }
    100% {
      background-color: var(--up-c-fcfcff);
    }
  }
  
  @keyframes pulse-opacity {
    0% {
      opacity: 0.4;
    }
    50% {
      opacity: 0.8;
    }
    100% {
      opacity: 0.4;
    }
  }

  :global(.aspect-ratio-16x9:has(img[src*="gif"])::after) {
    content: "\e064"; /* Unicode for the Font Awesome camera icon */
    font-family: "lucide"; /* Font family for Font Awesome icons */
    font-weight: 300; /* Font weight for the solid style */
    font-size: 24px; /* Font size of the icon */
    color: var(--up-c-f8f8f8); /* Color of the icon */
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }

  .checkbox-group > div {
    display: flex;
    align-items: center;
    position: relative;
    width: 100%;
    padding: 6px 0;
    border-radius: 4px;
  }
  
  .checkbox-group > div:hover label {
    color: var(--up-c-5c2587);
  }

  .checkbox-group input[type="checkbox"] {
    display: none;
  }

  .checkbox-group input[type="checkbox"] + label:hover::before {
    color: var(--up-c-5c2587);
  }

  .checkbox-group.checkbox-settings input[type="checkbox"] + label {
    margin-top: -1px;   /* "Layers" text sits 1px higher than the default */
    margin-left: 18px;
    font-size: 0.7125rem;
    font-weight: 300;
    cursor: pointer;
  }


  /* Groups whose ::before is an icon glyph (not the toggle pill) keep the font base */
  .checkbox-group.checkbox-fav input[type="checkbox"] + label::before,
  .checkbox-group.checkbox-settings input[type="checkbox"] + label::before,
  .checkbox-group.checkbox-satellite input[type="checkbox"] + label::before {
    content: "";
    font-family: "lucide";
    font-weight: 400;
    font-size: 1rem;
    color: var(--up-c-82669d);
    text-align: center;
    cursor: pointer;
    padding: 3.5px 0 0 0;
    top: 0;
    position: absolute;
    right: 0;
  }

  .checkbox-group.checkbox-settings input[type="checkbox"] + label::before {
    content: "\e529";
    font-weight: 300;
    text-align: left;
    right: auto;
    left: 0;
    font-size: 11px;   /* 2px smaller than the Satellite/My Account icons */
    top: 4px;          /* nudged 2px down to sit level with the Layers label */
  }

  .checkbox-group.checkbox-settings input[type="checkbox"]:checked + label::before {
    content: "\e1b2";
    font-weight: 300;
  }



  .checkbox-group.checkbox-satellite input[type="checkbox"] + label {
    margin-top: 0px;
    margin-left: 18px;
    font-size: 0.7125rem;
    font-weight: 300;
    cursor: pointer;
  }


  .checkbox-group.checkbox-satellite input[type="checkbox"] + label::before {
    content: "\e447";
    font-weight: 300;
    text-align: left;
    right: auto;
    left: 0;
    font-size: 0.8125rem;
    top: 3.5px;
  }

  .checkbox-group.checkbox-satellite input[type="checkbox"]:checked + label::before {
    content: "\e1b2";
    font-weight: 300;
  }

  /* Satellite/Layers icons: same resting colour as the My Account icon */
  .checkbox-group.checkbox-settings input[type="checkbox"] + label::before,
  .checkbox-group.checkbox-satellite input[type="checkbox"] + label::before {
    color: var(--up-c-31144d);
  }

  .checkbox-group.checkbox-settings input[type="checkbox"] + label:hover::before,
  .checkbox-group.checkbox-satellite input[type="checkbox"] + label:hover::before {
    color: var(--up-c-5c2587);
  }
  




  .checkbox-group.checkbox-fav label {
    white-space: nowrap;
  }

  .my-account-link {
    white-space: nowrap;
    text-decoration: none;
    font-family: var(--font-family);
    font-size: 0.7125rem;
    font-weight: 300;
    margin-top: 1.5px;
  }

  .my-account-link:hover {
    text-decoration: none;
    color: var(--up-c-5c2587);
  }

  .my-account-link i {
    font-size: 0.8125rem;
    color: var(--up-c-31144d);
    vertical-align: -0.08em;
  }

  .checkbox-group.checkbox-fav input[type="checkbox"] + label {
    margin-top: 1.5px;
    margin-left: 18px;
    font-size: 0.7125rem;
    font-weight: 300;
    cursor: pointer;
  }

  .checkbox-group.checkbox-fav input[type="checkbox"] + label::before {
    content: "\e176";
    font-weight: 300;
    text-align:left;
    right: auto;
    left: 0;
    font-size: 0.8125rem;
    top: 5px;
    color: var(--up-c-5ee7ad);
  }

  .checkbox-group.checkbox-fav input[type="checkbox"] + label:hover::before {
    color: var(--up-c-5ee7ad);
  }

  /* Lucide has no filled star glyph, so the active state is the star path as a solid mask */
  .checkbox-group.checkbox-fav input[type="checkbox"]:checked + label::before {
    content: "";
    width: 0.8125rem;
    height: 0.8125rem;
    padding: 0;
    margin-top: 2px;
    background-color: var(--up-c-5ee7ad);
    -webkit-mask: url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path d='M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z'/></svg>") no-repeat center / contain;
    mask: url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path d='M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z'/></svg>") no-repeat center / contain;
  }

  /* Style the custom checkbox as a toggle — off/on both drawn as masks of the same
     24x24 pill so their size and position match exactly */
  .checkbox-group:not(.checkbox-fav):not(.checkbox-settings):not(.checkbox-satellite) input[type="checkbox"] + label::before {
    content: "";
    width: 1em;
    height: 1em;
    font-size: 1rem;
    color: var(--up-c-82669d);
    background-color: currentColor;
    -webkit-mask: url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><rect x='2' y='6' width='20' height='12' rx='6'/><circle cx='8' cy='12' r='2'/></svg>") no-repeat center / contain;
    mask: url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><rect x='2' y='6' width='20' height='12' rx='6'/><circle cx='8' cy='12' r='2'/></svg>") no-repeat center / contain;
    cursor: pointer;
    margin-top: 3.5px;
    top: 0;
    position: absolute;
    right: 0;
  }

  /* Active toggle: solid pill with punched-out knob (lucide has no filled toggle glyph) */
  .checkbox-group:not(.checkbox-fav):not(.checkbox-settings):not(.checkbox-satellite) input[type="checkbox"]:checked + label::before {
    content: "";
    width: 1em;
    height: 1em;
    padding: 0;
    margin-top: 3.5px;
    background-color: var(--up-c-31144d);
    -webkit-mask: url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path fill-rule='evenodd' d='M8 6h8a6 6 0 0 1 0 12H8A6 6 0 0 1 8 6Zm8 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z'/></svg>") no-repeat center / contain;
    mask: url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path fill-rule='evenodd' d='M8 6h8a6 6 0 0 1 0 12H8A6 6 0 0 1 8 6Zm8 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z'/></svg>") no-repeat center / contain;
  }

  .checkbox-group input[type="checkbox"] + label {
    width: 100%;
  }

  .toggle-fav i {
    color: var(--up-c-5ee7ad);
  }

  a.toggle-check i {
    color: var(--up-c-5c2587);
  }

  a.generate-pdf i {
    color: var(--up-c-5c2587);
  }

  .btn-reset {
    width: 30px;
    text-align: center;
  }

  .btn-reset-search {
    font-family: var(--font-family);
    color: var(--up-c-5ee7ad);
    border-radius: 4px;
    font-size: 0.7125rem;
    font-weight: 400;
    padding: calc(0.5 * var(--padding-unit)) 0;
    text-decoration: none;
    display: inline-block;
    cursor: pointer;
  }

  .btn-download-pdf {
    font-family: var(--font-family);
    color: var(--up-c-5c2587);
    border-radius: 4px;
    font-size: 0.7125rem;
    font-weight: 400;
    padding: calc(0.5 * var(--padding-unit)) 0;
    text-decoration: none;
    display: inline-block;
    cursor: pointer;
  }


  .link-property:hover h5 {
    color: var(--up-c-5c2587);
  }

  .link-property img {
    transition: 300ms filter ease-in-out;
  }

  .link-property:hover img {
    filter: brightness(1.1);
  }

  .search-panel-container {
    /* transition: width 0.5s ease-in-out, max-width 0.5s ease-in-out; */
    /* max-width: 400px; */
  }

  .listing-container .search-panel-container.one-third {
    max-height: 90vh;
    overflow-y: hidden;
  }

  @media all and (min-width: 60em) {
     .listing-container .search-panel-container.one-third {
        max-width: calc(33 * var(--padding-unit));
      }
  }

  .crmview .search-panel-container .select-container select,
  .crmview .search-panel-container input[type="text"] {
    font-size: 0.6rem;
  }

  @media all and (min-width: 60em) {
    .crmview .listing-container .search-panel-container.one-third {
      max-width: calc(36 * var(--padding-unit));
    }
  }

  .buy-container.listing-container .search-panel-container.one-third {
    max-height: auto !important;
    height: auto !important;
    min-height: auto !important;
  }

  @media all and (min-width: 60em) {
    :global(.buy-container.listing-container .search-panel-container.one-third) {
      max-height: auto !important;
      height: auto !important;
      min-height: auto !important;
    }
  }

  .mapview .listing-container .search-panel-container {
    background-color: var(--up-c-ffffff-a75);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }

  .satellite.mapview .listing-container .search-panel-container {
    background-color: var(--up-c-ffffff-a85);
  }

  .mapview .listing-container .search-result-parent-container {
    display:none;
  }

  .mapview .listing-container .search-panel-container.one-third {
    margin: 1em;
    min-width: 376px;
    width: 100%;
    max-width: 100%;
  }

  :global(.item-details) {
    font-family: var(--font-family);
    font-size: 0.625rem;
    color: var(--up-c-5c2587);
    font-weight: bold;
  }

  .app.is-ready {
    display: block;
    opacity: 1;
  }

  /* White placeholder behind the map while tiles load (class default is lavender) */
  :global(#mapbox.dark-overlay-lightest) {
    box-shadow: inset 0 0 0 5120px var(--up-c-ffffff);
  }

  .app {
    padding: relative;
    display: none;
    opacity: 0;
    overflow: hidden;
  } 


  .crmview:not(.feasibilityview):not(.mailtemplateview) .search-panel-container {
    display: none;
  }

  @media all and (min-width: 60em) {  
    .crmview:not(.feasibilityview):not(.mailtemplateview) .listing-container > .flex > .two-third {
      width: 100%;
      max-width: 100%;
    }
  }

  .crmview .listing-container .property-container > .one-third {
    width: 10%;
    max-width: 10%;
    min-width: 100px;
  }
  

  .crmview .listing-container .property-container > .two-third {
    width: 90%;
    max-width: 90%;
  }

  @media all and (min-width: 60em) {  
    .crmview .listing-container .property-container > .one-third {
      width: 15%;
      max-width: 15%;
      min-width: 100px;
    } 

    .crmview .listing-container .property-container > .two-third {
      width: 85%;
      max-width: 85%;
    }

    .crmview.mailtemplateview .listing-container > .one-third {
      width: 50%;
      max-width: 50%;
    }

    .crmview.mailtemplateview .listing-container > .two-third {
      width: 50%;
      max-width: 50%;
    }
  }

  .crmview .listing-container .property-container > .one-third img {
    object-fit: cover;
    height: 100%;
  }

  :global(.themed .selected-item) {
    font-family: var(--font-family);
  }

  .map-container {
    display: block;
    visibility: visible;
    opacity: 1;
    height: 100vh;
    /* transition: opacity 0.5s ease-in-out; */
  }
  
  .map-container.hide {
    display: block;
    height: 0;
    visibility: hidden;
    opacity: 0;
  }

  .app.mapview.viewing-property .map-container.hide {
    display: block;
    height: 100vh;
    visibility: visible;
    opacity: 1;
  }

  .select-container label {
    padding-left: .4em;
  } 

  .select-container select::placeholder {
    color: var(--up-c-aaaaaa);
  }

  .select-container select {
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
    height: 42px;
    margin: auto;
    border-color: var(--up-c-cccccc);
    color: var(--up-c-5c2587);
    padding-left: 0.4em;
    padding-right: 2.4em;
  }

  .listing-container .select-container select {
    height: 27.39px;
  }

  .listing-container input[type="text"] {
    height: 27.39px;
  }

  .select-container select:focus {
    outline: none;
    box-shadow: none;
  }

  .select-container select + .shift-up-more {
    -webkit-transform: translateY(-50%);
    -ms-transform: translateY(-50%);
    transform: translateY(-50%);
  }

  @media all and (min-width: 60em) {
    .select-container select + .shift-up-more {
        -webkit-transform: translateY(-44%);
        -ms-transform: translateY(-44%);
        transform: translateY(-44%);
    }
  }

  .select-container .select-arrow {
      width: 22px;
  }

  :global(.user_template_content) {
    width: 180mm; 
    padding: 0; 
    position: absolute;
    left: -9999;
  }

  :global(.debug .user_template_content) {

    position: absolute;
    left: 0;
  }

  :global(.user_template_content *, .user_template_content p) {
    font-size: 0.625rem; 
    padding: 1em 0;
    color: black !important;
  }

  .btn.btn-subscribe.unclickable {
    opacity: 0.7;
  }

  .btn.btn-subscribe {
    margin: 0;
    background-color: var(--up-c-5c2587);
    color: var(--up-c-ffffff);
    border: 0;
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
    border-top-right-radius: 4px;
    border-bottom-right-radius: 4px;
    padding: calc(1.25 * var(--padding-unit)) calc(0.75 * var(--padding-unit));
    text-transform: uppercase;
    text-decoration: none;
    cursor: pointer;
    font-family: var(--font-family);
    width: 118px;
    text-align: center;
    height: 42px;
  }

  .btn.btn-subscribe:hover {
    filter: brightness(1.1); 
    background-color: var(--up-c-5c2587) !important;
    color: var(--up-c-ffffff) !important;
  }

  .subscribe-form-container input {
    border-top-right-radius: 0;
    border-bottom-right-radius: 0; 
  }

  input[type=number] {
    -moz-appearance: textfield;
  }

  input[type=number]::-webkit-outer-spin-button,
  input[type=number]::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  .radio-group {
    margin-bottom: 0.5rem;
  }

  .radio-buttons {
    display: flex;
  }

  .pill {
    border: 1px solid var(--up-c-5c2587);
    padding: 0.45rem 0.5rem;
    display: inline-flex;
    align-items: center;
    cursor: pointer;
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
    border-right: 1px solid var(--background-color);
  }

  .pill:last-of-type {
    border-top-right-radius: 4px;
    border-bottom-right-radius: 4px;
  }

  .h6-f {
    margin-top: 0;
    font-size: 0.55rem;
  }

  :root {
    --checkbox-color: var(--up-c-31144d);
  }

  :global(.mapboxgl-ctrl-bottom-left, .mapboxgl-ctrl.mapboxgl-ctrl-attrib) {
    display: none;
  }

  .map-container {
    width: 100%;
    height: 100%;
  }

  @media all and (min-width: 60em) {
    .map-container {
      height: 100vh; 
    }
  }

  .checkbox-group.full label {
    cursor: pointer;
  }

  .checkbox-group > div {
    display: flex;
    align-items: center;
    position: relative;
    width: 100%;
    padding: 6px 0;
    border-radius: 4px;
    border-radius: 0;
  }

  .checkbox-group.full > div {
    padding: 1px 0 2px 0;
  }


  .checkbox-group.full {
    border: 1px solid transparent;
    border-radius: 0.3rem;
    background-color: transparent;
    transition: background 0.2s ease-in-out;
  }

  /* .checkbox-group.full:hover {
    background-color: var(--up-c-82669d-a06);
  } */
  
  .checkbox-group > div:hover label {
    color: var(--up-c-5c2587);
    /* font-weight: 700; */
  }

  .checkbox-group input[type="checkbox"] {
    display: none;
  }

  .checkbox-group input[type="checkbox"] + label:hover::before {
    color: var(--up-c-5c2587);
  }

  /* Style the custom checkbox as a toggle — off/on both drawn as masks of the same
     24x24 pill so their size and position match exactly */
  .checkbox-group:not(.checkbox-fav):not(.checkbox-settings):not(.checkbox-satellite) input[type="checkbox"] + label::before {
    content: "";
    width: 1em;
    height: 1em;
    font-size: 1rem;
    color: var(--up-c-82669d);
    background-color: currentColor;
    -webkit-mask: url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><rect x='2' y='6' width='20' height='12' rx='6'/><circle cx='8' cy='12' r='2'/></svg>") no-repeat center / contain;
    mask: url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><rect x='2' y='6' width='20' height='12' rx='6'/><circle cx='8' cy='12' r='2'/></svg>") no-repeat center / contain;
    cursor: pointer;
    margin-top: 4.5px;
    top: 0;
    position: absolute;
    right: 0;
  }

  .full.checkbox-group input[type="checkbox"] + label:before {
    padding-top: 0.5px;
  }

  /* Active toggle: solid pill with punched-out knob (lucide has no filled toggle glyph) */
  .checkbox-group:not(.checkbox-fav):not(.checkbox-settings):not(.checkbox-satellite) input[type="checkbox"]:checked + label::before {
    content: "";
    width: 1em;
    height: 1em;
    padding: 0;
    margin-top: 4.5px;
    background-color: var(--checkbox-color);
    -webkit-mask: url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path fill-rule='evenodd' d='M8 6h8a6 6 0 0 1 0 12H8A6 6 0 0 1 8 6Zm8 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z'/></svg>") no-repeat center / contain;
    mask: url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path fill-rule='evenodd' d='M8 6h8a6 6 0 0 1 0 12H8A6 6 0 0 1 8 6Zm8 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z'/></svg>") no-repeat center / contain;
  }

  .checkbox-group input[type="checkbox"]:hover + label::before,
  .checkbox-group input[type="checkbox"] + label::before {
    color: var(--checkbox-color);
  }

  .checkbox-group input[type="checkbox"] + label {
    width: 100%;
  }

  .checkbox-group > div:hover {
    /* border-bottom: 1px solid var(--up-c-83669d-a11); */
  }

  .mapview .listing-container {
    position: absolute;
    top: 0;
    left: 0;
    width: 33.3%;
    max-width: calc(26 * var(--padding-unit));
    height: auto;
    padding: 0;
    transition: width 0.5s ease-in-out, max-width 0.5s ease-in-out;
  }



  .mapview .listing-container .search-panel-container.one-third {
    margin: 1em;
    min-width: 376px;
    width: 100%;
    max-width: 100%;
    max-height: calc(88vh + 50px);
  }

  :global(#map) {
    width: 100%;
    position: absolute; top: 0; bottom: 0; width: 100%;
    
  }

  :global(.mapbox-info-container) {
    padding-left: 0.5em;
    padding-top: 0.75em;
    padding-bottom: 0.25em;
  }

  :global(.mapboxgl-popup-content) {
    width: 282px;
  }

  :global(.mapbox-info-container h5) {
    font-size: 0.625rem;
    font-weight: bold;
  }

  :global(.mapbox-info-container) {
    width: calc(250px + 8px);
    box-sizing: border-box;
  }

  :global(.mapbox-info-container > div.aspect-ratio-16x9) {
    width: 250px;
  }

  @media all and (min-width: 60em) {  
    :global(.google-map-info-container h5) {
      font-size: 0.625rem;
      font-weight: bold;
    }
  }

  .map-status {
    position: absolute;
    bottom: 5em;
    right: 15px;
    padding: 5px 10px;
    z-index: 1;
    display: flex;
    color: var(--up-c-aaaaaa);
    background-color: var(--up-c-ffffff);
    visibility: hidden;
    flex-direction: column;
    border-top-left-radius: 0.5rem;
  }
  
  .map-status p {
    padding: 0;
    margin: 0;
    font-size: 0.625rem !important;
    font-weight: 400;
  }

  .map-status:not([data-status=""]) {
    visibility: visible;
    animation: pulse-opacity 2s ease-in-out infinite;
  }

  .custom-control {
    position: absolute;
    top: 0;
    right: 0;
    background: var(--up-c-ffffff);
    padding: 10px;
    z-index: 1;
    display: flex;
    flex-direction: column;
    border-bottom-left-radius: 4px;
    
  }
  .custom-control button {
    color: var(--up-c-5c2587);
    border: 1px solid var(--up-c-5c2587);
    background-color: var(--up-c-ffffff);
    border-radius: 4px;
    font-size: 0.7125rem;
    font-weight: 400;
    padding: calc(0.5 * var(--padding-unit)) calc(0.75 * var(--padding-unit));
    text-decoration: none;
    cursor: pointer;
    font-family: var(--font-family);
    width: auto;
    display: inline-block;
    margin-bottom: 4px;
  }
  
  .custom-control button.active {
    color: var(--up-c-ffffff);
    border: 1px solid var(--up-c-5c2587);
    background-color: var(--up-c-5c2587); 
  }

  .custom-control button.active:hover,
  .custom-control button:hover {
    color: var(--up-c-ffffff);
    border: 1px solid var(--up-c-5c2587);
    background-color: var(--up-c-5c2587-a87); 
  }


  .suggestions-popup {
    position: absolute; /* Use absolute positioning */
    background: white;
    border: 1px solid var(--up-c-cccccc);
    border-radius: 0.4em;
    height: 100px;
    max-height: 200px;;
    overflow-y: auto;
    z-index: 10;
    display: block;
    margin-top: 1px; /* Prevent overlap with input border */
    margin-bottom: 1em;
    width: 100%; /* Match width of parent */
    left: 0;
  }

  /* Parent container needs relative positioning for popup to align */
  .padding-bottom-thinner:has(.suggestions-popup) {
    position: relative;
  }

  ul.suggestions-popup li:before {
    content: "\e111"; /* Unicode character for the desired Font Awesome icon */
  }

  .suggestions-popup li {
    padding: 8px;
    cursor: pointer;
  }

  .suggestions-popup li:hover {
    background-color: var(--up-c-f0f0f0); /* Highlight on hover */
  }

  .suggestions-popup li a {
    text-decoration: none;
    color: var(--up-c-31144d) !important;
  }

  input.input-m[type="text"] {
    height: auto;
    border-color: var(--up-c-5c2587);
  }

  p.filter-label {
    padding: 0;
    color: var(--color-black-20) !important;
    font-size:0.5875rem;
    line-height: 1.6em;
    font-weight: 600;
    /* text-transform:uppercase; */
  }

  :global(.saved-search-list-container ul li::before) {
    content: "";
    display: none;
  }

  :global(.saved-search-list-container li a.btn),
  :global(.saved-search-list-container li a.btn:visited) {
    text-decoration: none;
    font-size: 0.5685rem;
    padding: calc(0.35 * var(--padding-unit)) calc(0.3 * var(--padding-unit));
    text-align: center;
    display: block;
  }

  .map-search-btn-container {
    background-color: transparent;
  }

  .app.is-print .search-panel-container {
    display: none;
  }

  .app.is-print .search-result-parent-container {
    width: 100%;
    max-width: 100%;
  }

  .app.is-print .search-result-container {
    height: auto;
    overflow-y: auto; 
  }

  .app.is-print .pagination-container {
    display: none;
  }

  .app.is-print .one-quarter:has(.toggle-fav) {
    display: none;
  }


  .app.is-print .listing-container .property-container > .one-third {
    width: 15%;
    max-width: 15%;
    min-width: 200px;
  }

  .app.is-print .search-result-container.padding-right {
    padding-right: 0;
  }

  .app.is-print.search-app {
    height: auto;
  }

  .app.is-print.search-app .search-result-container:nth-of-type(7n) {
    break-after: page; /* Modern browsers */
    page-break-after: always; /* For legacy support */
  }

  @media print {
    .app.is-print.search-app .print-break {
      break-after: page;
      page-break-after: always;
    }

    /* Add top padding to the first item on each new page except the first */
    .app.is-print.search-app .print-top-padding {
      padding-top: 2em; /* Adjust as needed */
    }

    /* Remove padding from the very first item */
    .app.is-print.search-app .padding-bottom:first-of-type.print-top-padding {
      padding-top: 0 !important;
    }
  }


  .property-container h5 {
    font-weight: 600;
  }

  @media all and (max-width: 40em) {  
    :global(.app.mapview.viewing-property .map-view-detail) {
      min-width: 100%;
      width: 100%;
      max-width: 100%;
    }
  }

  :global(.app.mapview.viewing-property .map-view-detail) {
    position: absolute;
    top: 0;
    right: 0;
    height: 100vh;
    width: 30%;
    max-width: 680px;
    background-color: var(--up-c-ffffff-a70);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    z-index: 10;
    transform: translateX(100%);
    transition: transform 0.3s ease-in-out, opacity 0.3s ease-in-out;
    overflow: hidden;
    opacity: 0;
  }

  @media all and (min-width: 80em) {  
    :global(.app.mapview.viewing-property .map-view-detail) {
      width: 40%;
    }
  }

  :global(.app.mapview.viewing-property .map-view-detail.visible) {
    transform: translateX(0);
    opacity: 1;
  }

  .flex-gap {
    gap: 1em;
  }

  .btn-group {
    display: flex;
    min-width: 200px;
  }

  .btn-group .btn, .btn-group .btn:hover, .btn-group .btn:active {
    margin: 0;
  box-sizing: border-box;             /* include border in height/width */  /* [web:10][web:19] */
  }

  .btn-group .btn {
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
  }

  .btn-group .btn:first-child {
    border-top-left-radius: 4px;
    border-bottom-left-radius: 4px;
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
  }

  .btn-group .btn:last-child {
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
    border-top-right-radius: 4px;
    border-bottom-right-radius: 4px;
  }

  .btn-group .btn:not(:first-child):not(:last-child) {
    border-left-width: 0;
    border-right-width: 0;
  }


  .collapsible-title {
    position: relative;
    cursor: pointer;
    /* Change cursor to pointer */
  }

  .collapsible-container .collapsible-title::after {
    position: absolute;
    width: 1.25em;
    height: 100%;
    top: calc(50% - 0.5em);
    right: 0;
    font-size: 1em;
    font-weight: 300;
    font-family: "lucide";
  }

  .collapsible-container:not(:has(div.animate-fade-out)) .collapsible-title::after {
      content: "\e11c";
  }

  .collapsible-container:has(div.animate-fade-out) .collapsible-title::after {
      content: "\e13d";
  }

  .collapsible-title:hover h3 {
      color: var(--up-c-5c2587);
  }

  .collapsible-title:hover::after {
      color: var(--up-c-5c2587);
  }

  @keyframes fade-in {
    0% {
        opacity: 0;
    }

    100% {
        opacity: 1;
        visibility: visible;
    }
  }

  @keyframes fade-out {
    0% {
        opacity: 1;
    }

    100% {
        opacity: 0;
        visibility: hidden;
    }
  }

  :global(.animate-fade-in) {
    animation-delay: 0.3s;
    animation-name: fade-in;
    animation-duration: 0.8s;
    animation-fill-mode: both;
  }

  :global(.animate-fade-out) {
    display: none;
  }


  i.circle {
    z-index: 2;
    font-style: normal;
    width: 12px;
    height: 12px;
    display: inline-flex;
    align-items: center;
    margin: 0 auto;
    background-color: var(--up-c-31144d-a33);
    color: var(--up-c-ffffff);
    font-weight: 700;
    text-overflow: hidden;
    padding: 0.17em 0.6em 0em 0.6em;
    transform: translateY(-1px);
    font-size: 0.5rem;
  }

  i.circle:hover {
    background-color: var(--up-c-31144d-a93);
  }

  .vertical-center label {
    font-size: 0.75rem;
  }

  .vertical-center label i.circle {
    transform: translateY(-1px);
  }

  .btn-alt {
    margin-top: 1.5px;
    margin-left: 18px;
    font-size: 0.7125rem;
    font-weight: 300;
    cursor: pointer;
    text-decoration: none;
  }

  .settings-container a {
    text-decoration: none;
    display: block;
  }

  .settings-container a:hover {
    background-color: var(--up-c-fdf9ff);
  }

  .settings-container a h6 {
    font-weight: bold;
    font-size: 0.875rem;
  }

  .planning-constraint-container .vertical-center label {
    font-size: 0.6875rem; 
    text-overflow: ellipsis;
    display: inline-block;
    overflow: hidden;
  }

  h5 small {
    font-size: 0.5875rem;
    color: var(--up-c-5c2587);
    font-weight: 400;
  }

  div small {
    font-size: 0.5875rem;
    color: var(--up-c-5c2587);
  }
  

  /* ---- additions: theme toggle box, Total Results spacing, icon alignment ---- */
  .custom-control.custom-control-bottom {
    top: auto;
    bottom: 0;
    border-bottom-left-radius: 0;
    border-top-left-radius: 4px;
    padding: 8px;
  }
  .total-results-row {
    margin-bottom: calc(0.75 * var(--padding-unit));
  }
  /* My Fav / My Account / Satellite / Layers: icon and text on one flex line,
     centred on each other, instead of an absolutely-positioned glyph nudged by
     hand-tuned top/margin offsets that drift with the font. */
  .checkbox-group.checkbox-fav input[type="checkbox"] + label,
  .checkbox-group.checkbox-satellite input[type="checkbox"] + label,
  .checkbox-group.checkbox-settings input[type="checkbox"] + label,
  .my-account-link {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin: 0;
    line-height: 1;
    width: auto;
  }
  .checkbox-group.checkbox-fav input[type="checkbox"] + label::before,
  .checkbox-group.checkbox-satellite input[type="checkbox"] + label::before,
  .checkbox-group.checkbox-settings input[type="checkbox"] + label::before {
    position: static;
    top: auto;
    left: auto;
    right: auto;
    padding: 0;
    margin: 0;
    line-height: 1;
    font-size: 0.8125rem;
  }
  .my-account-link i {
    line-height: 1;
    vertical-align: 0;
  }
</style>

<svelte:head>
	<title>Urban Prospects Property Search App</title>
  <script src="https://kit.fontawesome.com/19fda93b05.js" crossorigin="anonymous"></script>

  <link href="https://api.mapbox.com/mapbox-gl-js/v3.20.0/mapbox-gl.css" rel="stylesheet" />
  <link rel='stylesheet' href='https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-draw/v1.5.0/mapbox-gl-draw.css' type='text/css' />
  <script src="https://api.mapbox.com/mapbox-gl-js/v3.20.0/mapbox-gl.js"></script>
  <script src='https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-draw/v1.5.0/mapbox-gl-draw.js'></script>
  <script src="https://unpkg.com/@turf/turf@7.2.0/turf.min.js"></script>


  <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/pdf.min.js"></script>

  <script src="//maps.googleapis.com/maps/api/js?key=AIzaSyC5I6s5Rym9KnniWrQX9pOhH6LaCi3sW9Q&libraries=visualization"></script>

</svelte:head>

<svelte:window on:keydown={_handle_window_keydown}/>

<div class:is-print={is_print} class:pdf-property={pdf_property} class:is-ready={is_ready} class="{view_property ? 'viewing-property': ''} {(! view_property && use_listview) ? 'container': ''} app search-app {use_listview ? 'listview': 'mapview'} {satellite ? 'satellite': ''} {use_crm ? 'crmview': ''} {use_feasibility ? 'feasibilityview': ''} {use_template ? 'mailtemplateview': ''}" style="background-color: {app_background_color};--font-family: var(--font-sans);--color-dark-overlay-lightest: #F1E9F7; --thumb-bg: #5C2587; --track-bg: #F1E9F7; --progress-bg: #F1E9F7; --multi-item-bg: #5C2587; --multi-item-color: #fff; --clear-icon-color: #fff; --multi-select-padding: 0 0 0 0.5em; --item-hover-bg: #F1E9F7; --color-dark: #5C2587; ">
  <div id="mapbox" class="relative map-container dark-overlay-lightest hide-overflow  {(use_listview || view_property) ? 'hide': ''} {draw_polygon_mode ? 'is-drawing-polygon': ''}"></div>
  <div class="custom-control  {(use_listview || view_property) ? 'hide': ''}">
    <button aria-label="Measure Radius (m)"  data-balloon-pos="left" on:click={_handle_draw_circle} id="drawCircle" class="{draw_circle_mode ? 'active' : ''}"><i class=" icon-map-pin"></i></button>
    <!-- <button aria-label="Measure Distance (m)"  data-balloon-pos="left" on:click={_handle_draw_line} id="drawLine" class="{draw_line_mode ? 'active' : ''}"><i class=" icon-ruler"></i></button> -->
    <button aria-label="Measure Multiple Distances (m)"  data-balloon-pos="left" on:click={_handle_draw_multi_line} id="drawMultiLine" class="{draw_multi_line_mode ? 'active' : ''}"><i class=" icon-ruler"></i></button>
    <button aria-label="Measure Area (m²)"  data-balloon-pos="left" on:click={_handle_draw_polygon} id="drawPolygon" class="{draw_polygon_mode ? 'active' : ''}"><i class=" icon-pentagon"></i></button>
    <button aria-label="Clear Measurement" data-balloon-pos="left" on:click={_handle_delete_all} id="deleteAll"><i class=" icon-trash-2"></i></button>
    <button aria-label="Zoom in" data-balloon-pos="left" on:click={_handle_zoom_in} id="zoomIn"><i class=" icon-zoom-in"></i></button>
    <button aria-label="Zoom out" data-balloon-pos="left" on:click={_handle_zoom_out} id="zoomOut"><i class=" icon-zoom-out"></i></button>
    <button aria-label="Toggle 3D View" data-balloon-pos="left" on:click={_handle_toggle_3d} id="toggle3d" class="{map_3d ? 'active' : ''}"><i class=" icon-box"></i></button>
    <button aria-label="Auto Spin" data-balloon-pos="left" on:click={_handle_toggle_spin} id="autoSpin" class="{map_spin ? 'active' : ''} {map_3d ? '' : 'unclickable'}" disabled={!map_3d}><i class=" icon-rotate-cw"></i></button>
  </div>
  <!-- System / light / dark, bottom right, boxed like the map tools above. The
       basemap follows it (see _apply_map_theme). -->
  <div class="custom-control custom-control-bottom {(use_listview || view_property) ? 'hide': ''}">
    <ThemeToggle />
  </div>

  <!-- <div class="map-status {(use_listview || view_property) ? 'hide': ''}" data-status="{map_status}">
    <p>{map_status}</p>
  </div> -->

  <div class:hide={view_property && use_listview} class="listing-container" class:buy-container={buy_report} class:settings-container={use_settings}>
    <div class="flex wrap">
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <div class="one-third border-rounder border-primary padding-top padding-left padding-right search-panel-container" on:click={() => {showSuggestions = false;}}>

        {#if use_email}
          <div></div>
        {:else if use_feasibility}
          <div class="flex padding-bottom">
            <div class="four-fifth">
              <h3 class="padding-bottom-thinner">Residual Land Calculator</h3>
              {#if feasibility_property}
                <h6>{feasibility_property.address} {feasibility_property?.postcode || ""}</h6>
              {/if}

              
            </div>
            <div class="two-fifth row right {is_logged_in ? '' : 'unclickable'}" style="margin-top:0;">

            </div>

          </div>

          {#if feasibility_property && user_fav}
            <div class="aspect-ratio-16x9 dark-overlay-lightest border-rounder relative">
              <!-- svelte-ignore a11y-missing-attribute -->
              <img on:error={handleImageError} class="aspect-ratio-16x9 border-round" loading="lazy" src="https://maps.googleapis.com/maps/api/streetview?size=640x360&radius=15&return_error_code=true&source=outdoor&location={feasibility_property.address.toLowerCase().replace(/\s/g, '-')}-{feasibility_property?.postcode || ""}&key=AIzaSyC5I6s5Rym9KnniWrQX9pOhH6LaCi3sW9Q"/>
            </div>
          
          <Residual property={feasibility_property} bind:user_fav {user_id} {api_domain} {user_email} {user_plan} {user_first_name} {user_last_name} {regions_selected} scrollHeight="37vh" />

          {/if}
        
        {:else if use_settings}
          <div class="flex padding-bottom-thin">
            <div class="half">
              <h3>Settings</h3>
            </div>
            <div style="width:230px;" class="row right">
              <div class="flex">
                <div class="row right padding-top-thinnest">
                  <a class="center btn-alt" href="?" on:click={_toggle_settings}><i class=" icon-x"></i> Back</a>
                </div>

              </div>
            </div>

          </div>
          <div class="padding-top-wide settings-container">
            <!-- Subscription, regions, renewal/cancellation, password and logout all
                 live on the site's /account/ page; the app keeps only what is
                 app-specific. API keys moved to /account/ too (2026-09-06). -->
            <div class="border border-bottom border-top border-light border-thinnest">
              <a href="/account/" class="display-block">
                <div class="flex padding-bottom padding-top">
                  <div class="full  padding-left-thinner">
                    <h6>Subscription &amp; Account</h6>
                  </div>
                  <div class="row right padding-right-thinner">
                    <i class=" icon-chevron-right"></i>
                  </div>
                </div>
              </a>
            </div>
            <div class="border border-bottom border-light border-thinnest">
              <a href="?" class="display-block" on:click|preventDefault={_handle_logout}>
                <div class="flex padding-bottom padding-top">
                  <div class="full  padding-left-thinner">
                    <h6>Logout</h6>
                  </div>
                  <div class="row right padding-right-thinner">
                    <i class=" icon-log-out"></i>
                  </div>
                </div>
              </a>
            </div>
          </div>
        {:else if use_template}
          <div class="flex padding-bottom">
            <h3 class="">Edit Mail Template</h3>
          </div>
          <div class="">
            <div class="" style="--font-family: var(--font-sans);">
              <Tiptap user_template={user_template} user_id={user_id} from_first_name={from_first_name} from_last_name={from_last_name} from_company_name={from_company_name} from_address_1={from_address_1} from_address_2={from_address_2} from_postcode={from_postcode} from_city={from_city} from_state={from_state} custom_logo_url={custom_logo_url}/>
            </div>
          </div>
        
        {:else if buy_report}

          <div class="flex padding-bottom-thinner">
            <div class="full">
              <h3 class="uppercases">{report_title}</h3>
              <div class="padding-top">
                <h5>{report_subtitle}</h5>
              </div>
            </div>
          </div>

          <hr>

          <div class="padding-bottom-thinner">

            <form class="search-form">
              <div class="padding-top-thin padding-bottom-thinnest">
                <h5>Local Government Area</h5>
              </div>
              <div class="padding-bottom-thinner">
                <div class="container-thinner light-overlay border-round debug-container {use_debug ? 'debug': ''}">
                  <code>Selected: {lga_names_selected ? lga_names_selected.map(d => d.value).join(', ') : ''}</code>
                </div>
              </div>

              <div class="themed relative" style="z-index: 1001;" id="lga_names_select_container">
                <Select floatingConfig={select_floating} items={lga_names} multiple={true} bind:value={lga_names_selected} on:select={_fetch_data_by_lgas} on:clear={_fetch_data_by_lgas} placeholder="Select:" containerStyles="border-color: #5C2587;"></Select>
              </div>

              <div class="padding-top-thin padding-bottom-thinnest">
                <h5>Suburb</h5>
              </div>
              <div class="padding-bottom-thinner">
                <div class="container-thinner light-overlay border-round debug-container {use_debug ? 'debug': ''}">
                  <code>Selected: {suburb_selected ? suburb_selected.map(d => d.value).join(', ') : ''}</code>
                </div>
              </div>

              <div class="themed" id="suburbs_select_container">
                <Select floatingConfig={select_floating} items={suburbs} multiple={true} bind:value={suburb_selected} on:select={_check_suburbs} on:clear={_check_suburbs} placeholder="Select:" containerStyles="border-color: #5C2587;"></Select>
              </div>

              <div class="padding-top-thin padding-bottom-thinner">
                <h5>Address</h5>
              </div>
              <div class="container-thinner border-round debug-container {use_debug ? 'debug': ''}">
                <code>Entered: {address_selected }</code>
              </div>

              <div class="padding-bottom-thinner">
                <AddressAutocomplete 
                  accessToken="pk.eyJ1IjoiZGFubnlsIiwiYSI6ImNseGJta3lhMzA3ZHEya3ExY3huOXdvaHUifQ.tWLLIKUxBJ_JBKH5o2XHTQ"
                  placeholder="Enter Address"
                  bind:value={address_selected}
                  suburb_selected={suburb_selected}
                  on:retrieve={(e) => { address_selected = e.detail.address; console.log(e.detail); }}
                />
              </div>

              <div class="padding-top-thin">
                <a class="btn btn-search btn-search-{report_button_size} {(is_searching_main || (buy_report && ! address_selected)) ? 'unclickable': ''}" class:no-results={no_search_results} href="?" on:click={() => _handle_search_property(1, undefined, event)}>{no_search_results ? no_results_label : report_button_label}</a>
              </div>

            </form>


          </div>
        

        {:else}
          
          <div class="flex padding-bottom-thinner">
            <div class="four-fifth">
              <h3 class="uppercases">Search Properties</h3>
            </div>
            <div class="one-fifth row right" class:hide={use_listview}>
              <!-- Negative margin cancels the lucide glyph's right side bearing so the
                   -/+ lines up optically with My Account / Layers on the rows below. -->
              <a href="?" on:click={_toggle_search_panel}>
                <i class=" {search_form_expand ? 'icon-minus': 'icon-plus'}" style="margin-right: -2.7px;"></i>
              </a>
            </div>
          </div>
          
          <div class="flex padding-bottom-thin">
            <div class="half">
             
            </div>
            <div class="row right {is_logged_in ? '' : 'unclickable'}">
              <div class="flex" style="justify-content: flex-end; gap: 0; width: auto;">
                <div class="row right">
                  <div class="checkbox-group checkbox-fav">
                    <div><input type="checkbox" bind:checked={isChecked} id="myfav_checkbox" on:change={_toggle_my_fav}/> <label for="myfav_checkbox"><span class=""> My Fav</span></label></div>
                  </div>
                </div>

                <div class="row right" style="padding-left: calc(2em + 3px - 10px);">
                  <a class="center my-account-link" href="/account/"><i class=" icon-user"></i> My Account</a>
                </div>

              </div>
            </div>

          </div>

          <div class="flex" style="position: relative; margin-bottom: calc(0.5 * var(--padding-unit));">
            <div class="btn-group">
              <a on:click={_toggle_mapview} class="btn {use_listview ? '': 'active'}" href="?">Map</a>
              <a on:click={_toggle_mapview} class="btn {use_listview ? 'active': ''}" href="?">List</a>
            </div>
            {#if ! use_listview}
            <!-- Mirrors the My Fav / My Account row above so Layers lines up with
                 My Account and the Satellite->Layers gap matches My Fav->My Account. -->
            <div style="position: absolute; right: 0; top: 50%; transform: translateY(-50%);">
              <div class="flex" style="justify-content: flex-end; gap: 0; width: auto;">
                <div class="row right">
                  <div class="checkbox-group checkbox-satellite"><div class=""><input bind:checked={satellite} type="checkbox" id="mapstyle_checkbox"  on:change={_handle_change_map_style}> <label for="mapstyle_checkbox" style="padding-right: 0;">Satellite</label></div></div>
                </div>
                <div class="row right" style="padding-left: calc(2em + 3px - 10px);">
                  <div class="checkbox-group checkbox-settings"><div class=""><input bind:checked={use_map_layer} type="checkbox" id="maplayer_checkbox"  on:change={_handle_change_map_layer}> <label for="maplayer_checkbox" style="padding-right: 0;">Layers</label></div></div>
                </div>
              </div>
            </div>
            {/if}
          </div>

          <form class="search-form {(mapview_viewing_property && ! search_form_expand) || (! use_listview && ! search_form_expand)  ? 'collapsed': ''}">

            {#if ! use_listview}
              <div class="filter-container filter-container-map-layers {use_map_layer ? '': 'hide'}" style="margin-bottom: 1em;">

                <div class="flex padding-top-thin padding-bottom-thin">
                  <div class="one-third padding-top-thinnest">
                    
                  </div>
                  <div class="full">
                    <div class="row right">
                      <a class="btn btn-reset btn-info"  aria-label="Legend" data-balloon-pos="left" href="?" on:click={_toggle_info}><i class=" {use_legend ? 'icon-x': 'icon-info'}"></i></a>
                      <a class="btn btn-reset" href="?" on:click={_reset_map}><i class=" icon-crosshair"></i></a>
                    </div>
                  </div>
                </div>

                <div class="padding-top {use_legend ? '' : 'hide'}">
                  <Legends></Legends>
                </div>

                <div class="padding-top-thin padding-bottom-thin">
                  <div class="collapsible-container">
                    <div class="padding-top padding-bottom collapsible-title" on:click={toggleCollapsibleContent}>
                      <h6 class="uppercase"><strong>Key Layers</strong></h6>
                    </div>
                    <div class="collapsible-content animate-fade-out">
                      <div class="full checkbox-group" style="--checkbox-color: var(--up-c-ffa6a3);"><div><input bind:checked={mapping_layers.zoning} type="checkbox" value="1" name="mapping_layer_zoning" id="mapping_layer_zoning" on:change={_handle_change_mapping_layer}/> <label for="mapping_layer_zoning">Land Zoning</label></div></div>
                      <div class="full checkbox-group" style="--checkbox-color: var(--up-c-010101);"><div><input bind:checked={mapping_layers.lot} type="checkbox" value="1" name="mapping_layer_lot" id="mapping_layer_lot" on:change={_handle_change_mapping_layer}/> <label for="mapping_layer_lot">Lots</label></div></div>
                      <div class="full checkbox-group" style="--checkbox-color: var(--up-c-d1c2fc);"><div><input bind:checked={mapping_layers.contour} type="checkbox" value="1" name="mapping_layer_contour" id="mapping_layer_contour" on:change={_handle_change_mapping_layer}/> <label for="mapping_layer_contour">Contour</label></div></div>
                      <div class="full checkbox-group" style="--checkbox-color: var(--up-c-ff9800);"><div><input bind:checked={mapping_layers.slope} type="checkbox" value="1" name="mapping_layer_slope" id="mapping_layer_slope" on:change={_handle_change_mapping_layer}/> <label for="mapping_layer_slope">Slope</label></div></div>
                      <div class="full checkbox-group" style="--checkbox-color: var(--up-c-ff0000)"><div><input bind:checked={mapping_layers.suburbs} type="checkbox" value="1" name="mapping_layer_suburbs" id="mapping_layer_suburbs" on:change={_handle_change_mapping_layer}/> <label for="mapping_layer_suburbs">Suburbs</label></div></div>
                      <div class="full checkbox-group" style="--checkbox-color: var(--up-c-388e3c);"><div><input bind:checked={mapping_layers.da_applications_lot} type="checkbox" value="1" name="mapping_layer_da_tracking" id="mapping_layer_da_tracking" on:change={_handle_change_mapping_layer}/> <label for="mapping_layer_da_tracking">Development Applications by Status</label></div></div>
                      <div class="full checkbox-group" style="--checkbox-color: var(--up-c-26a69a);"><div><input bind:checked={mapping_layers.da_applications_lot_by_application_type} type="checkbox" value="1" name="mapping_layer_da_tracking_by_type" id="mapping_layer_da_tracking_by_type" on:change={_handle_change_mapping_layer}/> <label for="mapping_layer_da_tracking_by_type">Development Applications by Type</label></div></div>
                    </div>
                  </div>

                  <hr/>
                  
                  <div class="collapsible-container">
                    <div class="padding-top padding-bottom collapsible-title" on:click={toggleCollapsibleContent}>
                      <h6 class="uppercase"><strong>Planning Layers</strong></h6>
                    </div>
                    <div class="collapsible-content animate-fade-out">
                      <div class="full checkbox-group" style="--checkbox-color: var(--up-c-fd32c5);"><div><input bind:checked={mapping_layers.ass} type="checkbox" value="1" name="mapping_layer_ass" id="mapping_layer_ass" on:change={_handle_change_mapping_layer}/> <label for="mapping_layer_ass">Acid Sulfate Soil</label></div></div>
                      <div class="full checkbox-group" style="--checkbox-color: var(--up-c-ff0000);"><div><input bind:checked={mapping_layers.frontage} type="checkbox" value="1" name="mapping_layer_frontage" id="mapping_layer_frontage" on:change={_handle_change_mapping_layer}/> <label for="mapping_layer_frontage">Active Street Frontages</label></div></div>
                      <div class="full checkbox-group" style="--checkbox-color: var(--up-c-fdca78);"><div><input bind:checked={mapping_layers.airport} type="checkbox" value="1" name="mapping_layer_airport" id="mapping_layer_airport" on:change={_handle_change_mapping_layer}/> <label for="mapping_layer_airport">Airport Noise</label></div></div>
                      <div class="full checkbox-group" style="--checkbox-color: var(--up-c-e88b91);"><div><input bind:checked={mapping_layers.bushfire} type="checkbox" value="1" name="mapping_layer_bushfire" id="mapping_layer_bushfire" on:change={_handle_change_mapping_layer}/> <label for="mapping_layer_bushfire">Bushfire Prone</label></div></div>
                      <div class="full checkbox-group" style="--checkbox-color: var(--up-c-9d56f6)"><div><input bind:checked={mapping_layers.coastalmanagement} type="checkbox" value="1" name="mapping_layer_coastalmanagement" id="mapping_layer_coastalmanagement" on:change={_handle_change_mapping_layer}/> <label for="mapping_layer_coastalmanagement">Coastal Management</label></div></div>
                      <div class="full checkbox-group" style="--checkbox-color: var(--up-c-ffb300)"><div><input bind:checked={mapping_layers.contaminationsites} type="checkbox" value="1" name="mapping_layer_contaminationsites" id="mapping_layer_contaminationsites" on:change={_handle_change_mapping_layer}/> <label for="mapping_layer_contaminationsites">Contamination Sites</label></div></div>
                      <div class="full checkbox-group" style="--checkbox-color: var(--up-c-98cb72)"><div><input bind:checked={mapping_layers.declaredwildness} type="checkbox" value="1" name="mapping_layer_declaredwildness" id="mapping_layer_declaredwildness" on:change={_handle_change_mapping_layer}/> <label for="mapping_layer_declaredwildness">Declared Wildness</label></div></div>
                      <div class="full checkbox-group" style="--checkbox-color: var(--up-c-000000)"><div><input bind:checked={mapping_layers.developmentcontrolplan} type="checkbox" value="1" name="mapping_layer_developmentcontrolplan" id="mapping_layer_developmentcontrolplan" on:change={_handle_change_mapping_layer}/> <label for="mapping_layer_developmentcontrolplan">Development Control Plan (LGA-Based)</label></div></div>
                      <div class="full checkbox-group" style="--checkbox-color: var(--up-c-00bfff)"><div><input bind:checked={mapping_layers.drinking_water_catchment} type="checkbox" value="1" name="mapping_layer_drinking_water_catchment" id="mapping_layer_drinking_water_catchment" on:change={_handle_change_mapping_layer}/> <label for="mapping_layer_drinking_water_catchment">Drinking Water Catchment</label></div></div>
                      <div class="full checkbox-group" style="--checkbox-color: var(--up-c-a0522d)"><div><input bind:checked={mapping_layers.environmentally_sensitive_land} type="checkbox" value="1" name="mapping_layer_environmentally_sensitive_land" id="mapping_layer_environmentally_sensitive_land" on:change={_handle_change_mapping_layer}/> <label for="mapping_layer_environmentally_sensitive_land">Environmentally Sensitive Land</label></div></div>
                      <div class="full checkbox-group" style="--checkbox-color: var(--up-c-00bce7);"><div><input bind:checked={mapping_layers.floodplanning} type="checkbox" value="1" name="mapping_layer_floodplanning" id="mapping_layer_floodplanning" on:change={_handle_change_mapping_layer}/> <label for="mapping_layer_floodplanning">Flood Planning</label></div></div>
                      <div class="full checkbox-group" style="--checkbox-color: var(--up-c-c595e8);"><div><input bind:checked={mapping_layers.fsr} type="checkbox" value="1" name="mapping_layer_fsr" id="mapping_layer_fsr" on:change={_handle_change_mapping_layer}/> <label for="mapping_layer_fsr">Floor Space Ratios</label></div></div>
                      <div class="full checkbox-group" style="--checkbox-color: var(--up-c-99fffd)"><div><input bind:checked={mapping_layers.groundwatervulnerability} type="checkbox" value="1" name="mapping_layer_groundwatervulnerability" id="mapping_layer_groundwatervulnerability" on:change={_handle_change_mapping_layer}/> <label for="mapping_layer_groundwatervulnerability">Ground Water Vulnerability</label></div></div>
                      <div class="full checkbox-group" style="--checkbox-color: var(--up-c-b3e096);"><div><input bind:checked={mapping_layers.hob} type="checkbox" value="1" name="mapping_layer_hob" id="mapping_layer_hob" on:change={_handle_change_mapping_layer}/> <label for="mapping_layer_hob">Height of Building</label></div></div>
                      <div class="full checkbox-group" style="--checkbox-color: var(--up-c-f3c944);"><div><input bind:checked={mapping_layers.heritage} type="checkbox" value="1" name="mapping_layer_heritage" id="mapping_layer_heritage" on:change={_handle_change_mapping_layer}/> <label for="mapping_layer_heritage">Heritage</label></div></div>
                      <div class="full checkbox-group" style="--checkbox-color: var(--up-c-ff0000)"><div><input bind:checked={mapping_layers.landsliderisk} type="checkbox" value="1" name="mapping_layer_landsliderisk" id="mapping_layer_landsliderisk" on:change={_handle_change_mapping_layer}/> <label for="mapping_layer_landsliderisk">Land Slide Risk</label></div></div>
                      <div class="full checkbox-group" style="--checkbox-color: var(--up-c-be51f0);"><div><input bind:checked={mapping_layers.lowmidrise_development} type="checkbox" value="1" name="mapping_layer_lowmidrise_development" id="mapping_layer_lowmidrise_development" on:change={_handle_change_mapping_layer}/> <label for="mapping_layer_lowmidrise_development">Low and Mid-Rise Development (LMR)</label></div></div>
                      <div class="full checkbox-group" style="--checkbox-color: var(--up-c-ffa500)"><div><input bind:checked={mapping_layers.mine_subsidence_district} type="checkbox" value="1" name="mapping_layer_mine_subsidence_district" id="mapping_layer_mine_subsidence_district" on:change={_handle_change_mapping_layer}/> <label for="mapping_layer_mine_subsidence_district">Mine Subsidence District</label></div></div>
                      <div class="full checkbox-group" style="--checkbox-color: var(--up-c-ff776e)"><div><input bind:checked={mapping_layers.lsz} type="checkbox" value="1" name="mapping_layer_lsz" id="mapping_layer_lsz" on:change={_handle_change_mapping_layer}/> <label for="mapping_layer_lsz">Minimum Lot Size</label></div></div>
                      <div class="full checkbox-group" style="--checkbox-color: var(--up-c-ffd700)"><div><input bind:checked={mapping_layers.mineralresourceland} type="checkbox" value="1" name="mapping_layer_mineralresourceland" id="mapping_layer_mineralresourceland" on:change={_handle_change_mapping_layer}/> <label for="mapping_layer_mineralresourceland">Mineral Resource Land</label></div></div>
                      <div class="full checkbox-group" style="--checkbox-color: var(--up-c-c0c0c0)"><div><input bind:checked={mapping_layers.obstaclelimitationsurface} type="checkbox" value="1" name="mapping_layer_obstaclelimitationsurface" id="mapping_layer_obstaclelimitationsurface" on:change={_handle_change_mapping_layer}/> <label for="mapping_layer_obstaclelimitationsurface">Obstacle Limitation Surface</label></div></div>
                      <div class="full checkbox-group hide" style="--checkbox-color: var(--up-c-fd32c5)"><div><input bind:checked={mapping_layers.regionalgrowthboundary} type="checkbox" value="1" name="mapping_layer_regionalgrowthboundary" id="mapping_layer_regionalgrowthboundary" on:change={_handle_change_mapping_layer}/> <label for="mapping_layer_regionalgrowthboundary">Regional Growth Boundary</label></div></div>
                      <div class="full checkbox-group" style="--checkbox-color: var(--up-c-008000)"><div><input bind:checked={mapping_layers.riparianlandwatercourse} type="checkbox" value="1" name="mapping_layer_riparianlandwatercourse" id="mapping_layer_riparianlandwatercourse" on:change={_handle_change_mapping_layer}/> <label for="mapping_layer_riparianlandwatercourse">Riparian Land Water Course</label></div></div>
                      <div class="full checkbox-group" style="--checkbox-color: var(--up-c-ffff00)"><div><input bind:checked={mapping_layers.salinity} type="checkbox" value="1" name="mapping_layer_salinity" id="mapping_layer_salinity" on:change={_handle_change_mapping_layer}/> <label for="mapping_layer_salinity">Salinity</label></div></div>
                      <div class="full checkbox-group" style="--checkbox-color: var(--up-c-8b4513)"><div><input bind:checked={mapping_layers.scenicprotectionland} type="checkbox" value="1" name="mapping_layer_scenicprotectionland" id="mapping_layer_scenicprotectionland" on:change={_handle_change_mapping_layer}/> <label for="mapping_layer_scenicprotectionland">Scenic Protection Land</label></div></div>
                      <div class="full checkbox-group" style="--checkbox-color: var(--up-c-32cd32)"><div><input bind:checked={mapping_layers.terrestrialbiodiversity} type="checkbox" value="1" name="mapping_layer_terrestrialbiodiversity" id="mapping_layer_terrestrialbiodiversity" on:change={_handle_change_mapping_layer}/> <label for="mapping_layer_terrestrialbiodiversity">Terrestrial Biodiversity</label></div></div>
                      <div class="full checkbox-group" style="--checkbox-color: var(--up-c-33daff);"><div><input bind:checked={mapping_layers.transport_oriented_development} type="checkbox" value="1" name="mapping_layer_transport_oriented_development" id="mapping_layer_transport_oriented_development" on:change={_handle_change_mapping_layer}/> <label for="mapping_layer_transport_oriented_development">Transport Oriented Development (TOD)</label></div></div>
                      <div class="full checkbox-group" style="--checkbox-color: var(--up-c-66f2ff)"><div><input bind:checked={mapping_layers.wetlands} type="checkbox" value="1" name="mapping_layer_wetlands" id="mapping_layer_wetlands" on:change={_handle_change_mapping_layer}/> <label for="mapping_layer_wetlands">Wetlands</label></div></div>
                    </div>
                  </div>

                  <hr/>
                  

                  
                  <div class="collapsible-container">
                    <div class="padding-top padding-bottom collapsible-title" on:click={toggleCollapsibleContent}>
                      <h6 class="uppercase"><strong>Crime</strong></h6>
                    </div>
                    <div class="collapsible-content animate-fade-out">
                      <div class="full checkbox-group" style="--checkbox-color: var(--up-c-b90023);"><div><input bind:checked={mapping_layers.property_crime} type="checkbox" value="1" name="mapping_layer_property_crime" id="mapping_layer_property_crime" on:change={_handle_change_mapping_layer}/> <label for="mapping_layer_property_crime">Property Crime</label></div></div>
                      <div class="full checkbox-group" style="--checkbox-color: var(--up-c-f32a21);"><div><input bind:checked={mapping_layers.violent_crime} type="checkbox" value="1" name="mapping_layer_violent_crime" id="mapping_layer_violent_crime" on:change={_handle_change_mapping_layer}/> <label for="mapping_layer_violent_crime">Violent Crime</label></div></div>
                    </div>
                  </div>

                  <hr/>


                  <div class="collapsible-container">
                    <div class="padding-top padding-bottom collapsible-title" on:click={toggleCollapsibleContent}>
                      <h6 class="uppercase"><strong>Infrastructure</strong></h6>
                    </div>
                    <div class="collapsible-content animate-fade-out">
                      <div class="full checkbox-group" style="--checkbox-color: var(--up-c-00bfff);"><div><input bind:checked={mapping_layers.electricity_transmission_substations} type="checkbox" value="1" name="mapping_layer_electricity_transmission_substations" id="mapping_layer_electricity_transmission_substations" on:change={_handle_change_mapping_layer}/> <label for="mapping_layer_electricity_transmission_substations">Electricity Transmission Substations</label></div></div>
                      <div class="full checkbox-group" style="--checkbox-color: var(--up-c-00bfff);"><div><input bind:checked={mapping_layers.electricity_transmission_lines} type="checkbox" value="1" name="mapping_layer_electricity_transmission_lines" id="mapping_layer_electricity_transmission_lines" on:change={_handle_change_mapping_layer}/> <label for="mapping_layer_electricity_transmission_lines">Electricity Transmission Lines</label></div></div>
                      <div class="full checkbox-group" style="--checkbox-color: var(--up-c-32cd32);"><div><input bind:checked={mapping_layers.gas_pipelines} type="checkbox" value="1" name="mapping_layer_gas_pipelines" id="mapping_layer_gas_pipelines" on:change={_handle_change_mapping_layer}/> <label for="mapping_layer_gas_pipelines">Gas Pipelines</label></div></div>
                      <div class="full hide checkbox-group" style="--checkbox-color: var(--up-c-965fe0);"><div><input bind:checked={mapping_layers.oil_pipelines} type="checkbox" value="1" name="mapping_layer_oil_pipelines" id="mapping_layer_oil_pipelines" on:change={_handle_change_mapping_layer}/> <label for="mapping_layer_oil_pipelines">Oil Pipelines</label></div></div>
                      <div class="full checkbox-group" style="--checkbox-color: var(--up-c-000000);"><div><input bind:checked={mapping_layers.liquid_fuel} type="checkbox" value="1" name="mapping_layer_liquid_fuel" id="mapping_layer_liquid_fuel" on:change={_handle_change_mapping_layer}/> <label for="mapping_layer_liquid_fuel">Liquid Fuel</label></div></div>
                      <div class="full checkbox-group" style="--checkbox-color: var(--up-c-1234de);"><div><input bind:checked={mapping_layers.petrol_stations} type="checkbox" value="1" name="mapping_layer_petrol_stations" id="mapping_layer_petrol_stations" on:change={_handle_change_mapping_layer}/> <label for="mapping_layer_petrol_stations">Petrol Stations</label></div></div>
                    </div>
                  </div>
                </div>

              </div>
            {/if}
            
            <div class="filter-container {use_map_layer ? 'hide': ''}">


              {#if body && use_debug}
              <div class="padding-top-wide padding-bottom-wide">
                <p>Search Parameters:</p>
                <div class="debug container light-overlay border-round">
                  <code>{JSON.stringify(body, null, 2)}</code>
                </div>
              </div>
              {/if}


              <div class="collapsible-container padding-top-thin">
                <div class="padding-top padding-bottom collapsible-title" on:click={toggleCollapsibleContent}>
                  <h6 class="uppercase"><strong>Location</strong></h6>
                </div>
                <div class="collapsible-content padding-bottom">
                  <div class="padding-top-thin">
                    <div class="padding-bottom-thinner">
                      <div class="flex">
                        <div class="half"><h5>Regions</h5></div>
                        <div class="half right"></div>
                      </div>
                    </div>
                    <div class="container-thinner light-overlay border-round debug-container {use_debug ? 'debug': ''}">
                      <code>Selected: {regions_selected.length? regions_selected.join(', ') : 'All'}</code>
                    </div>
                    <div id="regions-filter-container" class="flex wrap">
                      {#if user_plan}
                          {#each regions as region}
                          <div class="checkbox-container {user_regions && user_regions.includes(region) ? '' : 'unclickable'}">
                            <input hidden type="checkbox" value="{region}" name="region" id="region_{region}" on:click={_handle_change_region} checked={regions_selected.includes(region)}/> <label for="region_{region}">{region}</label>
                          </div>
                          {/each}
                      {:else}
                        {#each regions as region}
                        <div class="checkbox-container">
                          <input hidden type="checkbox" value="{region}" name="region" id="region_{region}" on:click={_handle_change_region} checked={regions_selected.includes(region)}/> <label for="region_{region}">{region}</label>
                        </div>
                        {/each}
                      {/if}
                    </div>
                  </div>

                  <div class="padding-top-thin padding-bottom-thinnest">
                    <h5>Local Government Areas</h5>
                  </div>
                  <div class="padding-bottom-thinner">
                    <div class="container-thinner light-overlay border-round debug-container {use_debug ? 'debug': ''}">
                      <code>Selected: {lga_names_selected ? lga_names_selected.map(d => d.value).join(', ') : ''}</code>
                    </div>
                  </div>

                  <div class="themed relative" style="z-index:1000" id="lga_names_select_container">
                    <Select floatingConfig={select_floating} items={lga_names} multiple={true} bind:value={lga_names_selected} on:select={_fetch_data_by_lgas} on:clear={_fetch_data_by_lgas} placeholder="Select:" containerStyles="border-color: #5C2587;"></Select>
                  </div>

                  <div class="padding-top-thin padding-bottom-thinnest">
                    <h5>Suburb</h5>
                  </div>
                  <div class="padding-bottom-thinner">
                    <div class="container-thinner light-overlay border-round debug-container {use_debug ? 'debug': ''}">
                      <code>Selected: {suburb_selected ? suburb_selected.map(d => d.value).join(', ') : ''}</code>
                    </div>
                  </div>

                  <div class="themed" id="suburbs_select_container">
                    <Select floatingConfig={select_floating} items={suburbs} multiple={true} bind:value={suburb_selected} on:select={_check_suburbs} on:clear={_check_suburbs} placeholder="Select:" containerStyles="border-color: #5C2587;"></Select>
                  </div>

                  <div class="padding-top-thin padding-bottom-thinner address-label-container">
                    <h5>Address</h5>
                  </div>
                  <div class="container-thinner border-round debug-container {use_debug ? 'debug': ''}">
                    <code>Entered: {address_selected }</code>
                  </div>

                  <div class="padding-bottom-thinner address-input-container">
                    <AddressAutocomplete 
                      accessToken="pk.eyJ1IjoiZGFubnlsIiwiYSI6ImNseGJta3lhMzA3ZHEya3ExY3huOXdvaHUifQ.tWLLIKUxBJ_JBKH5o2XHTQ"
                      placeholder="Enter Address"
                      bind:value={address_selected}
                      suburb_selected={suburb_selected}
                      on:retrieve={(e) => { address_selected = e.detail.address; console.log(e.detail); }}
                    />
                  </div>
                            
                  <div class="padding-top-thin padding-bottom-thinner address-label-container">
                    <h5>Lot <small>/</small> Section <small>/</small> Plan</h5>
                  </div>

                  <div class="flex padding-top-thin" style="gap: 0.5em; align-items: center;">
                    <div class="full"><input id="input-lotnumber" class="input-m" type="text" bind:value={lotnumber} placeholder="Lot" /></div>
                    <div><small>/</small></div>
                    <div class="full"><input id="input-sectionnumber" class="input-m" type="text" bind:value={sectionnumber} placeholder="Section" /></div>
                    <div><small>/</small></div>
                    <div class="full"><input id="input-planlabel" class="input-m" type="text" bind:value={planlabel} placeholder="Plan" /></div>
                  </div>


              </div>




              </div>

                <hr />
                <div class="flex padding-top-thin padding-bottom-thin">
                  <div class="btn-group width-100">
                    <a on:click={_toggle_all} 
                      class="full center btn {!(use_cdc || use_patternbooks) ? 'active': ''}" 
                      href="?">All Sites</a>
                    
                    <a on:click={_toggle_cdc} 
                      class="full center btn {use_cdc ? 'active': ''}" 
                      href="?">Complying Development</a>
                    
                    <a on:click={_toggle_patternbooks} 
                      class="full center btn {use_patternbooks ? 'active': ''}" 
                      href="?">Pattern Books</a>
                  </div>
                </div>
              
              {#if ! (use_cdc || use_patternbooks) }
                <hr/>
                <div class="collapsible-container">
                  <div class="padding-top padding-bottom collapsible-title" on:click={toggleCollapsibleContent}>
                    <h6 class="uppercase"><strong>Planning Controls</strong></h6>
                  </div>
                  <div class="collapsible-content animate-fade-out">
                    <div class="padding-bottom-thinner">
                      <div class="flex">
                        <div class="half">
                          <h5>Permissible Uses <i class="circle" data-balloon-length="medium" aria-label="{field_tooltip['Permissible Uses']}" data-balloon-pos="right">i</i></h5>
                        </div>
                      </div>
                    </div>
                    <div class="padding-bottom-thinner">
                      <div class="container-thinner light-overlay border-round debug-container {use_debug ? 'debug': ''}">
                        <code>Selected: {permissibleuse_selected ? permissibleuse_selected.map(d => d.value).join(', ') : ''}</code>
                      </div>
                    </div>
                    

                    <div class="themed relative" style="z-index:1001" id="permissibleuses_select_container">
                      <Select floatingConfig={select_floating} items={permissibleuses} multiple={true} bind:value={permissibleuse_selected} placeholder="Select:"
                        containerStyles="border-color: #5C2587;"></Select>
                    </div>
                    
                    <hr />

                    <div class="padding-top-thin padding-bottom-thinnest">
                      <h5>Zoning</h5>
                    </div>
                    <div class="padding-bottom-thinner">
                      <div class="container-thinner light-overlay border-round debug-container {use_debug ? 'debug': ''}">
                        <code>Selected: {zone_selected ? zone_selected.map(d => d.value).join(', ') : ''}</code>
                      </div>
                    </div>
                    
                    <div class="themed relative" style="z-index:1000" id="zones_select_container">
                      <Select floatingConfig={select_floating} items={zones} multiple={true} bind:value={zone_selected} placeholder="Select:"
                        containerStyles="border-color: #5C2587;"></Select>
                    </div>

                    <hr />
                    
                    <div class="padding-top-thin padding-bottom-thinnest">
                      <div class="flex">
                        <div class="half">
                          <h5 class="row-overlay vertical-center">Minimum Lot Size <i class="circle" data-balloon-length="medium" aria-label="{field_tooltip['Minimum Lot Size']}" data-balloon-pos="right">i</i></h5>
                        </div>
                        <div class="row right half lot-size-range-container" style="min-width: 190px"
                          id="custom-min-lot-size-range-container">
                          <input type="number" maxlength="11" bind:value={custom_lot_size_range_min}
                            on:input={_handle_custom_lot_size_range} placeholder="min">
                          <input type="number" maxlength="11" bind:value={custom_lot_size_range_max}
                            on:input={_handle_custom_lot_size_range} placeholder="max">
                        </div>
                      </div>
                    </div>
                    
                    
                    <div class="padding-bottom-thinner">
                      <div class="container-thinner light-overlay border-round display-inline-block">
                    
                        {#if custom_lot_size_range_min || custom_lot_size_range_max}
                        {#if custom_lot_size_range_min && custom_lot_size_range_max}
                        <code>{custom_lot_size_range_min} - {custom_lot_size_range_max} sqm</code>
                        {:else if custom_lot_size_range_min > 0}
                        <code>{custom_lot_size_range_min}+ sqm</code>
                        {:else}
                        <code>&lt; {custom_lot_size_range_max} sqm</code>
                        {/if}
                        {:else if lot_size_range[0] > 0 && lot_size_range[1] < 10000} <code>{lot_size_range[0]} - {lot_size_range[1]}
                          sqm</code>
                          {:else if lot_size_range[0] > 0}
                          <code>{lot_size_range[0]}+ sqm</code>
                          {:else if lot_size_range[1] < 10000} <code>&lt; {lot_size_range[1]} sqm</code>
                            {:else}
                            <code>Any</code>
                            {/if}
                      </div>
                    </div>
                    
                    <div class="{custom_lot_size_range_min || custom_lot_size_range_max ? " unclickable": "" }"
                      id="min-lot-size-range-container">
                      <Slider max="10000" step="100" bind:value={lot_size_range} range order />
                    </div>

                    <hr />
                    
                    <div class="padding-top-thin padding-bottom-thinnest">
                      <div class="flex">
                        <div class="half">
                          <h5 class="row-overlay vertical-center">Floor Space Ratios <i class="circle" data-balloon-length="medium" aria-label="{field_tooltip['Floor Space Ratios']}" data-balloon-pos="right">i</i></h5>
                        </div>
                        <div class="row right half fsr-range-container" style="min-width: 190px" id="custom-fsr-range-container">
                          <input type="number" maxlength="11" bind:value={custom_fsr_min} on:input={_handle_custom_fsr} placeholder="min">
                          <input type="number" maxlength="11" bind:value={custom_fsr_max} on:input={_handle_custom_fsr} placeholder="max">
                        </div>
                      </div>
                    </div>
                    
                    <div class="padding-bottom-thinner">
                      <div class="container-thinner light-overlay border-round display-inline-block">
                    
                        {#if custom_fsr_min || custom_fsr_max}
                        {#if custom_fsr_min && custom_fsr_max}
                        <code>{roundToNearestTenth(custom_fsr_min)} - {roundToNearestTenth(custom_fsr_max)} fsr</code>
                        {:else if custom_fsr_min > 0}
                        <code>{roundToNearestTenth(custom_fsr_min)} fsr</code>
                        {:else}
                        <code>&lt; {roundToNearestTenth(custom_fsr_max)} fsr</code>
                        {/if}
                        {:else if fsr_range[0] > 0 && fsr_range[1] < 30} <code>{roundToNearestTenth(fsr_range[0])} -
                          {roundToNearestTenth(fsr_range[1])} fsr</code>
                          {:else if fsr_range[0] > 0}
                          <code>{roundToNearestTenth(fsr_range[0])} fsr</code>
                          {:else if fsr_range[1] < 30} <code>&lt; {roundToNearestTenth(fsr_range[1])} fsr</code>
                            {:else}
                            <code>Any</code>
                            {/if}
                    
                      </div>
                    </div>

                    <div class="{custom_fsr_min || custom_fsr_max ? 'unclickable': ''}" id="fsr-range-container">
                      <Slider max="30" step="0.1" bind:value={fsr_range} range order />
                    </div>

                    <hr />
                    
                    <div class="padding-top-thin padding-bottom-thinnest">
                      <div class="flex">
                        <div class="half">
                          <h5 class="row-overlay vertical-center">Gross Floor Area <i class="circle" data-balloon-length="medium" aria-label="{field_tooltip['Gross Floor Area']}" data-balloon-pos="right">i</i></h5>
                        </div>
                        <div class="row right half gfa-range-container" style="min-width: 190px" id="custom-gfa-range-container">
                          <input type="number" maxlength="11" bind:value={custom_gfa_min} on:input={_handle_custom_gfa} placeholder="min">
                          <input type="number" maxlength="11" bind:value={custom_gfa_max} on:input={_handle_custom_gfa} placeholder="max">
                        </div>
                      </div>
                    </div>
                    
                    <div class="padding-bottom-thinner">
                      <div class="container-thinner light-overlay border-round display-inline-block">
                    
                        {#if custom_gfa_min || custom_gfa_max}
                        {#if custom_gfa_min && custom_gfa_max}
                        <code>{roundToNearestTenth(custom_gfa_min)} - {roundToNearestTenth(custom_gfa_max)} sqm</code>
                        {:else if custom_gfa_min > 0}
                        <code>{roundToNearestTenth(custom_gfa_min)} sqm</code>
                        {:else}
                        <code>&lt; {roundToNearestTenth(custom_gfa_max)} sqm</code>
                        {/if}
                        {:else if gfa_range[0] > 0 && gfa_range[1] < 10000} <code>{roundToNearestTenth(gfa_range[0])} -
                          {roundToNearestTenth(gfa_range[1])} sqm</code>
                          {:else if gfa_range[0] > 0}
                          <code>{roundToNearestTenth(gfa_range[0])} sqm</code>
                          {:else if gfa_range[1] < 10000} <code>&lt; {roundToNearestTenth(gfa_range[1])} sqm</code>
                            {:else}
                            <code>Any</code>
                            {/if}
                    
                      </div>
                    </div>
                    
                    <div class="{custom_gfa_min || custom_gfa_max ? 'unclickable': ''}" id="gfa-range-container">
                      <Slider max="10000" step="100" bind:value={gfa_range} range order />
                    </div>
                    
                    
                    <hr />
                    
                    <div class="padding-bottom-thinner">
                      <div class="flex">
                        <div class="two-third">
                          <h5>Height <i class="circle" data-balloon-length="medium" aria-label="{field_tooltip['Height']}" data-balloon-pos="right">i</i></h5>
                        </div>
                        <div class="row right one-third" style="min-width: 120px" id="custom-height-filter-container">
                          <input type="number" maxlength="6" bind:value={custom_height_min} on:input={_handle_custom_height}
                            placeholder="min">
                          <input type="number" maxlength="6" bind:value={custom_height_max} on:input={_handle_custom_height}
                            placeholder="max">
                        </div>
                      </div>
                    </div>
                    
                    <div class="padding-bottom-thinner">
                      <div class="container-thinner light-overlay border-round display-inline-block">
                    
                        {#if custom_height_min || custom_height_max}
                        {#if custom_height_min && custom_height_max}
                        <code>{custom_height_min} - {custom_height_max} m</code>
                        {:else if custom_height_min > 0}
                        <code>{custom_height_min}+ m</code>
                        {:else}
                        <code>&lt; {custom_height_max} m</code>
                        {/if}
                        {:else if height_range[0] > 0 && height_range[1] < 400} <code>{height_range[0]} - {height_range[1]} m</code>
                          {:else if height_range[0] > 0}
                          <code>{height_range[0]}+ m</code>
                          {:else if height_range[1] < 400} <code>&lt; {height_range[1]} m</code>
                            {:else}
                            <code>Any</code>
                            {/if}
                      </div>
                    </div>
                    
                    <div class="{custom_height_min || custom_height_max ? 'unclickable': ''}" id="height-filter-container">
                      <Slider max="400" step="1" bind:value={height_range} range order />
                    </div>
                    

                    <div class="hide">
                      <hr />

                      <div class="full checkbox-group padding-top-thin ">
                          <div><input bind:checked={rezoned} type="checkbox" value="1" name="rezoned" id="rezoned" on:change={_handle_change_rezoned} /> <label for="rezoned"><h5>Recently Rezoned</h5></label></div>
                      </div>
                    </div>

                  </div>
                </div>
              {/if}

              <hr/>
              <div class="collapsible-container">
                <div class="padding-top padding-bottom collapsible-title" on:click={toggleCollapsibleContent}>
                  <h6 class="uppercase"><strong>Site Attributes</strong></h6>
                </div>
                <div class="collapsible-content animate-fade-out">

                  {#if ! (use_cdc || use_patternbooks) }
                  
                  <div class="padding-bottom-thinnest">
                    <div class="flex">
                      <div class="half">
                        <h5 class="row-overlay vertical-center">Area of Land <i class="circle" data-balloon-length="medium" aria-label="{field_tooltip['Area of Land']}" data-balloon-pos="right">i</i></h5>
                      </div>
                      <div class="row right half area-range-container" style="min-width: 190px" id="custom-min-area-range-container">
                        <input type="number" maxlength="11" bind:value={custom_area_size_range_min}
                          on:input={_handle_custom_area_size_range} placeholder="min">
                        <input type="number" maxlength="11" bind:value={custom_area_size_range_max}
                          on:input={_handle_custom_area_size_range} placeholder="max">
                      </div>
                    </div>
                  </div>
                  
                  
                  <div class="padding-bottom-thinner">
                    <div class="container-thinner light-overlay border-round display-inline-block">
                  
                      {#if custom_area_size_range_min || custom_area_size_range_max}
                      {#if custom_area_size_range_min && custom_area_size_range_max}
                      <code>{custom_area_size_range_min} - {custom_area_size_range_max} sqm</code>
                      {:else if custom_area_size_range_min > 0}
                      <code>{custom_area_size_range_min}+ sqm</code>
                      {:else}
                      <code>&lt; {custom_area_size_range_max} sqm</code>
                      {/if}
                      {:else if min_lot_size_range[0] > 0 && min_lot_size_range[1] < 10000} <code>{min_lot_size_range[0]} -
                        {min_lot_size_range[1]} sqm</code>
                        {:else if min_lot_size_range[0] > 0}
                        <code>{min_lot_size_range[0]}+ sqm</code>
                        {:else if min_lot_size_range[1] < 10000} <code>&lt; {min_lot_size_range[1]} sqm</code>
                          {:else}
                          <code>Any</code>
                          {/if}
                    </div>
                  </div>
                  
                  <div class="{custom_area_size_range_min || custom_area_size_range_max ? 'unclickable': ''}"
                    id="lot-size-range-container">
                    <Slider max="10000" step="100" bind:value={min_lot_size_range} range order />
                  </div>
                  
                  <hr />
                  
                  <div class="padding-bottom-thinner">
                    <div class="flex">
                      <div class="two-third">
                        <h5>Frontage Width <i class="circle" data-balloon-length="medium" aria-label="{field_tooltip['Frontage Width']}" data-balloon-pos="right">i</i></h5>
                      </div>
                      <div class="row right one-third" style="min-width: 120px" id="custom-width-filter-container">
                        <input type="number" maxlength="6" bind:value={custom_width_min} on:input={_handle_custom_width}
                          placeholder="min">
                        <input type="number" maxlength="6" bind:value={custom_width_max} on:input={_handle_custom_width}
                          placeholder="max">
                      </div>
                    </div>
                  </div>
                  
                  <div class="padding-bottom-thinner">
                    <div class="container-thinner light-overlay border-round display-inline-block">
                      {#if custom_width_min || custom_width_max}
                      {#if custom_width_min && custom_width_max}
                      <code>{custom_width_min} - {custom_width_max} m</code>
                      {:else if custom_width_min > 0}
                      <code>{custom_width_min}+ m</code>
                      {:else}
                      <code>&lt; {custom_width_max} m</code>
                      {/if}
                      {:else if width_range[0] > 0 && width_range[1] < 1000} <code>{width_range[0]} - {width_range[1]} m</code>
                        {:else if width_range[0] > 0}
                        <code>{width_range[0]}+ m</code>
                        {:else if width_range[1] < 1000} <code>&lt; {width_range[1]} m</code>
                          {:else}
                          <code>Any</code>
                          {/if}
                    </div>
                  </div>
                  
                  <div class="{custom_width_min || custom_width_max ? 'unclickable': ''}" id="width-filter-container">
                    <Slider max="1000" step="1" bind:value={width_range} range order />
                  </div>
                  
                  <hr />
                  
                  <div class="padding-bottom-thinner">
                    <div class="flex">
                      <div class="two-third">
                        <h5>Lot Depth</h5>
                      </div>
                      <div class="row right one-third" style="min-width: 120px" id="custom-depth-filter-container">
                        <input type="number" maxlength="6" bind:value={custom_depth_min} on:input={_handle_custom_depth}
                          placeholder="min">
                        <input type="number" maxlength="6" bind:value={custom_depth_max} on:input={_handle_custom_depth}
                          placeholder="max">
                      </div>
                    </div>
                  </div>
                  
                  <div class="padding-bottom-thinner">
                    <div class="container-thinner light-overlay border-round display-inline-block">
                      {#if custom_depth_min || custom_depth_max}
                      {#if custom_depth_min && custom_depth_max}
                      <code>{custom_depth_min} - {custom_depth_max} m</code>
                      {:else if custom_depth_min > 0}
                      <code>{custom_depth_min}+ m</code>
                      {:else}
                      <code>&lt; {custom_depth_max} m</code>
                      {/if}
                      {:else if depth_range[0] > 0 && depth_range[1] < 1000} <code>{depth_range[0]} - {depth_range[1]} m</code>
                        {:else if depth_range[0] > 0}
                        <code>{depth_range[0]}+ m</code>
                        {:else if depth_range[1] < 1000} <code>&lt; {depth_range[1]} m</code>
                          {:else}
                          <code>Any</code>
                          {/if}
                    </div>
                  </div>
                  
                  <div class="{custom_depth_min || custom_depth_max ? 'unclickable': ''}" id="depth-filter-container">
                    <Slider max="1000" step="1" bind:value={depth_range} range order />
                  </div>

                  {/if}
                  
                  <hr />
                  <div class="padding-bottom">
                  
                    <div class="padding-bottom">
                      <h6>Nearby School</h6>
                    </div>
                    <div class="container-thinner light-overlay border-round display-inline-block">
                      {#if school_range[0] >= 100}
                      <code>within {roundToNearestTenth(school_range[0] / 1000)} km</code>
                      {:else}
                      <code>Any</code>
                      {/if}
                    </div>
                  </div>

                  
                  
                  <div id="school-range-container">
                    <Slider max="2000" step="0.1" bind:value={school_range} />
                  </div>

                  <hr />
                  
                  <div class="padding-bottom">
                  
                    <div class="padding-bottom">
                      <h6>Nearby Hospital</h6>
                    </div>
                    <div class="container-thinner light-overlay border-round display-inline-block">
                      {#if hospital_range[0] >= 100}
                      <code>within {roundToNearestTenth(hospital_range[0] / 1000)} km</code>
                      {:else}
                      <code>Any</code>
                      {/if}
                    </div>
                  </div>
                  
                  <div id="hospital-range-container">
                    <Slider max="2000" step="0.1" bind:value={hospital_range} />
                  </div>
                  
                  <hr />

                  <div class="padding-bottom">
                  
                    <div class="padding-bottom">
                      <h6>Nearby Trains</h6>
                    </div>
                    <div class="container-thinner light-overlay border-round display-inline-block">
                      {#if train_range[0] >= 100}
                      <code>within {roundToNearestTenth(train_range[0] / 1000)} km</code>
                      {:else}
                      <code>Any</code>
                      {/if}
                    </div>
                  </div>
                  
                  <div id="train-range-container">
                    <Slider max="2000" step="0.1" bind:value={train_range} />
                  </div>

                  <div class="hide">
                  <div class="padding-top-thin padding-bottom-thinner">
                    <h5>Slope</h5>
                  </div>
                  <div class="padding-bottom-thinner">
                    <div class="container-thinner light-overlay border-round debug-container {use_debug ? 'debug': ''}">
                      <code>Selected: {slope ? slope.map(d => d.value).join(', ') : ''}</code>
                    </div>
                  </div>

                  <div class="themed" id="slopes_select_container">
                    <Select floatingConfig={select_floating} items={slopes} multiple={true} bind:value={slope} placeholder="Select:" containerStyles="border-color: #5C2587;"></Select>
                  </div>
                  </div>
                  
                  <hr />

                  <div class="padding-top padding-bottom-thinner">
                    <div class="flex">
                      <div class="two-third">
                        <h5>Walk Score <i class="circle" data-balloon-length="medium" aria-label="{field_tooltip['Walk Score']}" data-balloon-pos="right">i</i></h5>
                      </div>
                      <div class="row right one-third" style="min-width: 120px" id="custom-walkable_score-filter-container">
                        <input type="number" maxlength="3" bind:value={custom_walkable_score_min} on:input={_handle_custom_walkable_score}
                          placeholder="min">
                        <input type="number" maxlength="3" bind:value={custom_walkable_score_max} on:input={_handle_custom_walkable_score}
                          placeholder="max">
                      </div>
                    </div>
                  </div>

                  <div class="padding-bottom-thinner">
                    <div class="container-thinner light-overlay border-round display-inline-block">

                      {#if custom_walkable_score_min || custom_walkable_score_max}
                      {#if custom_walkable_score_min && custom_walkable_score_max}
                      <code>{custom_walkable_score_min} - {custom_walkable_score_max} </code>
                      {:else if custom_walkable_score_min > 0}
                      <code>{custom_walkable_score_min}+ </code>
                      {:else}
                      <code>&lt; {custom_walkable_score_max} </code>
                      {/if}
                      {:else if walkable_score_range[0] > 0 && walkable_score_range[1] < 100} <code>{walkable_score_range[0]} - {walkable_score_range[1]} </code>
                        {:else if walkable_score_range[0] > 0}
                        <code>{walkable_score_range[0]}+ </code>
                        {:else if walkable_score_range[1] < 100} <code>&lt; {walkable_score_range[1]} </code>
                          {:else}
                          <code>Any</code>
                          {/if}
                    </div>
                  </div>

                  <div class="{custom_walkable_score_min || custom_walkable_score_max ? 'unclickable': ''}" id="walkable_score-filter-container">
                    <Slider max="100" step="1" bind:value={walkable_score_range} range order />
                  </div>


                  
                  <hr />
                  
                  <!-- price range -->
                  <div class="price-range-container">
                    <div class="padding-top-thin padding-bottom-thinnest">
                      <div class="flex">
                        <div class="half">
                          <h5 class="row-overlay vertical-center">Price</h5>
                        </div>
                        <div class="row right half lot-size-range-container" style="min-width: 190px" id="custom-price-range-container">
                          <input type="number" maxlength="11" bind:value={custom_price_range_min} on:input={_handle_custom_price_range}
                            placeholder="min">
                          <input type="number" maxlength="11" bind:value={custom_price_range_max} on:input={_handle_custom_price_range}
                            placeholder="max">
                        </div>
                      </div>
                    </div>
                  
                    <div class="padding-bottom-thinner">
                      <div class="container-thinner light-overlay border-round display-inline-block">
                        {#if custom_price_range_min || custom_price_range_max}
                        {#if custom_price_range_min && custom_price_range_max}
                        <code>{formatPriceValue(custom_price_range_min, custom_price_range_max)}</code>
                        {:else if custom_price_range_min > 0}
                        <code>{formatPriceValue(custom_price_range_min, null)}</code>
                        {:else}
                        <code>{formatPriceValue(null, custom_price_range_max)}</code>
                        {/if}
                        {:else if price_range[0] > 0 && price_range[1] < 13000000} <code>
                          {formatPriceValue(price_range[0],price_range[1])}</code>
                          {:else if price_range[0] > 0}
                          <code>{formatPriceValue(price_range[0], null)}</code>
                          {:else if price_range[1] < 13000000} <code>{formatPriceValue(null, price_range[1])}</code>
                            {:else}
                            <code>Any</code>
                            {/if}
                      </div>
                    </div>
                  
                    <div class="{custom_price_range_min || custom_price_range_max ? " unclickable": "" }" id="price-range-container">
                      <Slider max="13000000" step="500000" bind:value={price_range} range order />
                    </div>
                  </div>
                  <!-- end price range -->
                </div>
              </div>


              {#if use_cdc}
                <hr/>
                <div class="collapsible-container">
                  <div class="padding-top padding-bottom collapsible-title" on:click={toggleCollapsibleContent}>
                    <h6 class="uppercase"><strong>Complying Development</strong></h6>
                  </div>
                  <div class="collapsible-content animate-fade-out">
                    
                    <div class="row">

                      <div class="padding-bottom-thin">
                      <h5>Complying Development <i class="circle" data-balloon-length="medium" aria-label="{field_tooltip['Complying Development']}" data-balloon-pos="right">i</i></h5>
                      </div>
                    
                      <div class="{use_debug ? 'debug': ''} container-thinner light-overlay border-round debug-container scroll-overflow">
                        <code>Complying Development: {Object.keys(complying_development).length ? JSON.stringify(complying_development): ''}</code>
                      </div>
                    
                      <div class="full checkbox-group">
                        <!-- <div><input bind:checked={complying_development.dualoccupancy} type="checkbox" value="1" name="complying_development" id="complying_development_dualoccupancy" on:change={_handle_change_complying_development} /> <label for="complying_development_dualoccupancy">Dual Occupancy</label></div> -->
                        {#if use_cdc}
                        <div class=""><input bind:checked={complying_development.cdc_dual_occupancy} type="checkbox" value="1" name="complying_development" id="complying_development_cdc_dual_occupancy" on:change={_handle_change_complying_development} /> <label for="complying_development_cdc_dual_occupancy">Dual Occupancy</label></div>
                        <div class=""><input bind:checked={complying_development.cdc_multi_dwelling_terraces} type="checkbox" value="1" name="complying_development" id="complying_development_cdc_multi_dwelling_terraces" on:change={_handle_change_complying_development} /> <label for="complying_development_cdc_multi_dwelling_terraces">Terraces</label></div>
                        <div class=""><input bind:checked={complying_development.cdc_secondary_dwellings} type="checkbox" value="1" name="complying_development" id="complying_development_cdc_secondary_dwellings" on:change={_handle_change_complying_development} /> <label for="complying_development_cdc_secondary_dwellings">Secondary Dwellings</label></div>
                        <div class=""><input bind:checked={complying_development.cdc_dwelling_houses} type="checkbox" value="1" name="complying_development" id="complying_development_cdc_dwelling_houses" on:change={_handle_change_complying_development} /> <label for="complying_development_cdc_dwelling_houses">Dwellings</label></div>
                        <div class=""><input bind:checked={complying_development.cdc_manor_homes} type="checkbox" value="1" name="complying_development" id="complying_development_cdc_manor_homes" on:change={_handle_change_complying_development} /> <label for="complying_development_cdc_manor_homes">Manor Homes</label></div>
                        <div class=""><input bind:checked={complying_development.cdc_rural_housing} type="checkbox" value="1" name="complying_development" id="complying_development_cdc_rural_housing" on:change={_handle_change_complying_development} /> <label for="complying_development_cdc_rural_housing">Rural Housing</label></div>
                        <div class=""><input bind:checked={complying_development.cdc_inland_dwelling_houses} type="checkbox" value="1" name="complying_development" id="complying_development_cdc_inland_dwelling_houses" on:change={_handle_change_complying_development} /> <label for="complying_development_cdc_inland_dwelling_houses">Inland Dwellings Houses</label></div>
                        <div class=""><input bind:checked={complying_development.cdc_inland_farm_buildings} type="checkbox" value="1" name="complying_development" id="complying_development_cdc_inland_farm_buildings" on:change={_handle_change_complying_development} /> <label for="complying_development_cdc_inland_farm_buildings">Inland Farm Buildings</label></div>
                        <div class=""><input bind:checked={complying_development.cdc_greenfield_housing} type="checkbox" value="1" name="complying_development" id="complying_development_cdc_greenfield_housing" on:change={_handle_change_complying_development} /> <label for="complying_development_cdc_greenfield_housing">Greenfield Housing</label></div>
                        <div class=""><input bind:checked={complying_development.cdc_agritourism} type="checkbox" value="1" name="complying_development" id="complying_development_cdc_agritourism" on:change={_handle_change_complying_development} /> <label for="complying_development_cdc_agritourism">Agritourism</label></div>
                        <div class=""><input bind:checked={complying_development.cdc_farmsta} type="checkbox" value="1" name="complying_development" id="complying_development_cdc_farmsta" on:change={_handle_change_complying_development} /> <label for="complying_development_cdc_farmsta">Farmstay</label></div>
                        {/if}
                      </div>
                  
                    
                    </div>
                  </div>
                </div>
                {#if use_cdc }
                  <hr/>
                {/if}
              {/if}

              {#if use_patternbooks}
                <hr/>
                <div class="collapsible-container">
                  <div class="padding-top padding-bottom collapsible-title" on:click={toggleCollapsibleContent}>
                    <h6 class="uppercase"><strong>Pattern Books</strong></h6>
                  </div>
                  <div class="collapsible-content animate-fade-out">
                    
                    <div class="row">

                      <div class="{use_debug ? 'debug': ''} container-thinner light-overlay border-round debug-container scroll-overflow">
                        <code>Pattern Books: {Object.keys(pattern_books).length ? JSON.stringify(pattern_books): ''}</code>
                      </div>
                      
                      {#if use_patternbooks}
                      <div class="full checkbox-group">
                        <div><input bind:checked={pattern_books.semis_01_anthony_gill_eligible} type="checkbox" value="1" name="pattern_books" id="pattern_books_semis_01_anthony_gill_eligible" on:change={_handle_change_pattern_books} /> <label for="pattern_books_semis_01_anthony_gill_eligible">Semis 01</label></div>
                        <div><input bind:checked={pattern_books.semis_02_sibling_eligible} type="checkbox" value="1" name="pattern_books" id="pattern_books_semis_02_sibling_eligible" on:change={_handle_change_pattern_books} /> <label for="pattern_books_semis_02_sibling_eligible">Semis 02</label></div>
                        <div><input bind:checked={pattern_books.terraces_01_carter_eligible} type="checkbox" value="1" name="pattern_books" id="pattern_books_terraces_01_carter_eligible" on:change={_handle_change_pattern_books} /> <label for="pattern_books_terraces_01_carter_eligible">Terraces 01</label></div>
                        <div><input bind:checked={pattern_books.terraces_02_sam_crawford_eligible} type="checkbox" value="1" name="pattern_books" id="pattern_books_terraces_02_sam_crawford_eligible" on:change={_handle_change_pattern_books} /> <label for="pattern_books_terraces_02_sam_crawford_eligible">Terraces 02</label></div>
                        <div><input bind:checked={pattern_books.terraces_03_officer_woods_eligible} type="checkbox" value="1" name="pattern_books" id="pattern_books_terraces_03_officer_woods_eligible" on:change={_handle_change_pattern_books} /> <label for="pattern_books_terraces_03_officer_woods_eligible">Terraces 03</label></div>
                        <div><input bind:checked={pattern_books.terraces_04_other_eligible} type="checkbox" value="1" name="pattern_books" id="pattern_books_terraces_04_other_eligible" on:change={_handle_change_pattern_books} /> <label for="pattern_books_terraces_04_other_eligible">Terraces 04</label></div>
                        <div><input bind:checked={pattern_books.row_homes_01_saha_eligible} type="checkbox" value="1" name="pattern_books" id="pattern_books_row_homes_01_saha_eligible" on:change={_handle_change_pattern_books} /> <label for="pattern_books_row_homes_01_saha_eligible">Row Homes 01</label></div>
                        <div><input bind:checked={pattern_books.manor_homes_01_studio_eligible} type="checkbox" value="1" name="pattern_books" id="pattern_books_manor_homes_01_studio_eligible" on:change={_handle_change_pattern_books} /> <label for="pattern_books_manor_homes_01_studio_eligible">Manor Homes 01</label></div>
                        <div><input bind:checked={pattern_books.small_lot_apt_01_3storeys_eligible} type="checkbox" value="1" name="pattern_books" id="pattern_books_small_lot_apt_01_3storeys_eligible" on:change={_handle_change_pattern_books} /> <label for="pattern_books_small_lot_apt_01_3storeys_eligible">Small Lot Apartments 01 (3 Storeys)</label></div>
                        <div><input bind:checked={pattern_books.small_lot_apt_01_3storeys_min_eligible} type="checkbox" value="1" name="pattern_books" id="pattern_books_small_lot_apt_01_3storeys_min_eligible" on:change={_handle_change_pattern_books} /> <label for="pattern_books_small_lot_apt_01_3storeys_min_eligible">Small Lot Apartments 01 (3 Storeys Min)</label></div>
                        <div><input bind:checked={pattern_books.small_lot_apt_01_4storeys_eligible} type="checkbox" value="1" name="pattern_books" id="pattern_books_small_lot_apt_01_4storeys_eligible" on:change={_handle_change_pattern_books} /> <label for="pattern_books_small_lot_apt_01_4storeys_eligible">Small Lot Apartments 01 (4 Storeys)</label></div>
                        <div><input bind:checked={pattern_books.small_lot_apt_02_3storeys_eligible} type="checkbox" value="1" name="pattern_books" id="pattern_books_small_lot_apt_02_3storeys_eligible" on:change={_handle_change_pattern_books} /> <label for="pattern_books_small_lot_apt_02_3storeys_eligible">Small Lot Apartments 02 (3 Storeys)</label></div>
                        <div><input bind:checked={pattern_books.small_lot_apt_02_4storeys_eligible} type="checkbox" value="1" name="pattern_books" id="pattern_books_small_lot_apt_02_4storeys_eligible" on:change={_handle_change_pattern_books} /> <label for="pattern_books_small_lot_apt_02_4storeys_eligible">Small Lot Apartments 02 (4 Storeys)</label></div>
                        <div><input bind:checked={pattern_books.small_lot_apt_03_4_6storeys_eligible} type="checkbox" value="1" name="pattern_books" id="pattern_books_small_lot_apt_03_4_6storeys_eligible" on:change={_handle_change_pattern_books} /> <label for="pattern_books_small_lot_apt_03_4_6storeys_eligible">Small Lot Apartments 03 (4-6 Storeys)</label></div>
                        <div><input bind:checked={pattern_books.small_lot_apt_04_4_5storeys_eligible} type="checkbox" value="1" name="pattern_books" id="pattern_books_small_lot_apt_04_4_5storeys_eligible" on:change={_handle_change_pattern_books} /> <label for="pattern_books_small_lot_apt_04_4_5storeys_eligible">Small Lot Apartments 04 (4-5 Storeys)</label></div>
                        <div><input bind:checked={pattern_books.corner_lot_apt_01_4_6storeys_eligible} type="checkbox" value="1" name="pattern_books" id="pattern_books_corner_lot_apt_01_4_6storeys_eligible" on:change={_handle_change_pattern_books} /> <label for="pattern_books_corner_lot_apt_01_4_6storeys_eligible">Corner Lot Apartments 01 (4-6 Storeys)</label></div>
                        <div><input bind:checked={pattern_books.corner_lot_apt_02_4_6storeys_eligible} type="checkbox" value="1" name="pattern_books" id="pattern_books_corner_lot_apt_02_4_6storeys_eligible" on:change={_handle_change_pattern_books} /> <label for="pattern_books_corner_lot_apt_02_4_6storeys_eligible">Corner Lot Apartments 02 (4-6 Storeys)</label></div>
                        <div><input bind:checked={pattern_books.large_lot_apt_01_4storeys_eligible} type="checkbox" value="1" name="pattern_books" id="pattern_books_large_lot_apt_01_4storeys_eligible" on:change={_handle_change_pattern_books} /> <label for="pattern_books_large_lot_apt_01_4storeys_eligible">Large Lot Apartments 01 (4 Storeys)</label></div>
                        <div><input bind:checked={pattern_books.large_lot_apt_01_6storeys_eligible} type="checkbox" value="1" name="pattern_books" id="pattern_books_large_lot_apt_01_6storeys_eligible" on:change={_handle_change_pattern_books} /> <label for="pattern_books_large_lot_apt_01_6storeys_eligible">Large Lot Apartments 01 (6 Storeys)</label></div>
                        <div><input bind:checked={pattern_books.large_lot_apt_02_3_4storeys_eligible} type="checkbox" value="1" name="pattern_books" id="pattern_books_large_lot_apt_02_3_4storeys_eligible" on:change={_handle_change_pattern_books} /> <label for="pattern_books_large_lot_apt_02_3_4storeys_eligible">Large Lot Apartments 02 (3-4 Storeys)</label></div>
                        <div><input bind:checked={pattern_books.large_lot_apt_02_5_6storeys_eligible} type="checkbox" value="1" name="pattern_books" id="pattern_books_large_lot_apt_02_5_6storeys_eligible" on:change={_handle_change_pattern_books} /> <label for="pattern_books_large_lot_apt_02_5_6storeys_eligible">Large Lot Apartments 02 (5-6 Storeys)</label></div>
                        <div><input bind:checked={pattern_books.large_lot_apt_03_4_6storeys_eligible} type="checkbox" value="1" name="pattern_books" id="pattern_books_large_lot_apt_03_4_6storeys_eligible" on:change={_handle_change_pattern_books} /> <label for="pattern_books_large_lot_apt_03_4_6storeys_eligible">Large Lot Apartments 03 (4-6 Storeys)</label></div>
                      </div>
                      {/if}
                  
                    
                    </div>
                  </div>
                </div>
                <hr/>
              {/if}

              {#if ! (use_cdc || use_patternbooks) }
                <hr/>
                <div class="collapsible-container planning-constraint-container">
                  <div class="padding-top padding-bottom collapsible-title" on:click={toggleCollapsibleContent}>
                    <h6 class="uppercase"><strong>Planning Constraints</strong></h6>
                  </div>
                  <div class="collapsible-content animate-fade-out">
                    <div class="container-thinner light-overlay border-round scroll-overflow debug-container {use_debug ? 'debug': ''}">
                      <code>Planning Constraints: {Object.keys(no_exclusions).length ? JSON.stringify(no_exclusions): ''}</code>
                    </div>
                    
                    <div class="row">
                    
                      {#each exclusion_options as option, index}
                      <div class="radio-group">
                        <!-- svelte-ignore a11y-label-has-associated-control -->
                        <div class="flex">
                          <div class="width-80">
                            <div class="vertical-center"><label>{option.label} <i class="circle" data-balloon-length="medium" aria-label="{field_tooltip[option.label]}" data-balloon-pos="right">i</i></label></div>
                          </div>
                          <div class="width-20" style="min-width: 170px">
                            <div class="radio-buttons">
                              <label class="pill">
                                <input type="radio" id="exclusion-{option.name}-2" name="{option.name}-{index}" value="2" bind:group={option.selectedValue}
                                  on:change={(event)=> handleRadioChange(event, exclusion_options)} /> Include Only
                              </label>
                              <label class="pill">
                                <input type="radio" id="exclusion-{option.name}-1" name="{option.name}-{index}" value="1" bind:group={option.selectedValue}
                                  on:change={(event)=> handleRadioChange(event, exclusion_options)} /> Exclude
                              </label>
                              <label class="pill">
                                <input type="radio" id="exclusion-{option.name}-0" name="{option.name}-{index}" value="0" bind:group={option.selectedValue}
                                  on:change={(event)=> handleRadioChange(event, exclusion_options)} /> All
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>
                      {/each}
                    
                    
                    </div>
                    
                  </div>
                </div>
              {/if}

              {#if ! (use_cdc || use_patternbooks) }  
                <hr/>
                {#if is_logged_in && user_search && user_search.length}
                <div class="collapsible-container">
                  <div class="padding-top padding-bottom collapsible-title" on:click={toggleCollapsibleContent}>
                    <h6 class="uppercase"><strong>Saved Searches</strong></h6>
                  </div>
                  <div class="collapsible-content animate-fade-out">
                    
                    <div class="saved-search-list-container">
                      <ul>
                      {#each user_search as search, search_index}
                        <li>
                          <div class="flex" style="gap:5px;">
                            <div class="full">
                              <!-- svelte-ignore a11y-missing-attribute -->
                              <a
                                class="btn"
                                contenteditable="true"
                                spellcheck="false"
                                on:keydown={(event) => limitEditableKeydown(event, search_index)}
                                on:input={(event) => limitEditableInput(event, search_index)}
                                on:click|preventDefault
                                on:blur={(event) => _edit_search_name(search_index, event)}
                              >
                                {search.name}
                              </a>
                            </div>

                            <!-- Inline editable name -->
                            <div class="width-5 row right">
                              <a
                                class="{retrieving[search_index] ? 'unclickable' : ''}"
                                href="?"
                                on:click|preventDefault={() => _load_search(search_index)}
                              >
                              <i class=" icon-search"></i>
                              </a>
                            </div>

                            <div class="width-5 row right">
                              <a 
                                class="{retrieving[search_index] ? 'unclickable' : ''}"
                                href="?" on:click|preventDefault={() => _delete_search(search_index)}>
                                <i class=" icon-trash-2"></i>
                              </a>
                            </div>
                          </div>
                        </li>
                      {/each}
                      </ul>
                    </div>
                    
                  </div>
                </div>
                <hr/>
                {/if}
              {/if}
              

              <div class="debug-container {use_debug ? 'debug': ''}">
                <hr/>
                <div class="padding-bottom">
                  <h5>GURASID</h5>
                </div>
                <div class="padding-bottom">
                  <div class="container-thinner border-round debug-container {use_debug ? 'debug': ''}">
                    <code>Entered: {gurasid_selected }</code>
                  </div>
                </div>

                <div>
                  <input type="text" bind:value={gurasid_selected} placeholder="GURASID">
                </div>
              </div>


            </div>


            {#if !use_map_layer}
            <div class="padding-top-thin map-search-btn-container">
              
              <a class="btn btn-search {is_searching_main ? 'unclickable': ''}" class:no-results={no_search_results} href="?" on:click={() => _handle_search_property(1, undefined, event)}>{no_search_results ? no_results_label : 'SEARCH'}</a>

              <div class="flex padding-top-thinnest">
                <div class="full">
                  <a class="btn-reset-search" href="?" on:click={_handle_reset_search}>CLEAR ALL</a>
                  {#if is_logged_in && user_email && user_email.match('@urbanperspectives.com.au')}
                  <a class="btn btn-save-search {generating_pdf ? 'unclickable': ''}" href="?" on:click={downloadPdf}><i class=" {generating_pdf ? 'icon-loader-circle icon-spin': 'icon-file-text'}"></i> PDF</a>
                  {/if}
                  {#if is_logged_in && user_email}
                    <a class="btn btn-save-search {has_ran_search ? '' : 'unclickable'}" href="?" on:click={_handle_save_search}><i class=" icon-zoom-in"></i> SAVE</a>
                  {/if}
                </div>
                {#if use_listview}
                  <!-- List view has no radius search, so the Total Results button takes that slot
                       (it used to sit on a third row and was clipped by the panel). -->
                  <div class="full row right total-results-row">
                    <a id="btn-calculate-total" on:click={_calculate_total_count} class="btn btn-save-search {is_getting_total_on_demand ? 'unclickable': ''}" style="text-align: center; min-width: 120px">
                      <i class=" icon-calculator"></i> {total_results_label}
                    </a>
                  </div>
                {:else}
                  <div class="padding-top-thinnest full {circle_center && circle_radius ? '' : 'unclickable'}">
                    <div class="checkbox-group"><div class=""><input bind:checked={is_search_within_radius} type="checkbox" id="searchradius_checkbox"  on:change={_handle_toggle_search_by_radius}> <label for="searchradius_checkbox" style="padding-right: 2.5em; text-align: right;">Search within Radius</label></div></div>
                  </div>
                {/if}
              </div>
              {#if !use_listview}
                <div class="row right total-results-row">
                  <a id="btn-calculate-total" on:click={_calculate_total_count} class="btn btn-save-search {is_getting_total_on_demand ? 'unclickable': ''}" style="text-align: center; min-width: 120px">
                    <i class=" icon-calculator"></i> {total_results_label}
                  </a>
                </div>
              {/if}
            </div>
            {/if}

          </form>

        {/if}

      </div>
      
      <div class="two-third padding-left padding-right padding-desktop search-result-parent-container">

        
        <div class="search-result-container padding-right padding-desktop print-break {use_settings ? 'hide': ''}">
          {#if properties && properties.length}
            
            {#if buy_report }

              {#each properties as property, index}
                <div class="padding-bottom {((index + 1) % 7 === 1 && index !== 0) ? 'print-top-padding' : ''} {(index + 1) % 7 === 0 ? 'print-break' : ''}">
                  <div class="flex wrap container-thin property-container">
                    <div class="one-third aspect-ratio-16x9 dark-overlay-lightest border-rounder relative">
                      <!-- svelte-ignore a11y-missing-attribute -->
                      <img alt="" on:error={handleImageError} data-index="{index}" class="aspect-ratio-16x9 border-round cover width-100" loading="lazy" src="https://maps.googleapis.com/maps/api/streetview?size=640x360&radius=15&return_error_code=true&source=outdoor&location={property.address.toLowerCase().replace(/\s/g, '-')}-{property?.postcode || ""}&key=AIzaSyC5I6s5Rym9KnniWrQX9pOhH6LaCi3sW9Q"/>
                    </div>
                    <div class="two-third padding-left padding-right padding-desktop">
                      <div class="flex wrap">
                        <div class="three-fifth padding-top padding-mobile">
                          <h5>{property.address}</h5>
                          <!-- svelte-ignore a11y-invalid-attribute -->
                          <a href="#" class="link-property">
                            <PropertySpec property={property}></PropertySpec>
                          </a>
                        </div>
                        <div class="two-fifth padding-top-thinner">
                          <a href="?" class="btn btn-search btn-search-{report_button_size}" on:click|preventDefault={() => _buy_report(property.gurasid, property.address + ' ' + property?.postcode)}>
                            <i class=" icon-shopping-cart"></i> {report_buy_button_label}
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              {/each}

            {:else}

              {#each properties as property, index}
              <div class="padding-bottom {((index + 1) % 7 === 1 && index !== 0) ? 'print-top-padding' : ''} {(index + 1) % 7 === 0 ? 'print-break' : ''}">
                  <div class="flex wrap container-thin property-container">
                    <!-- svelte-ignore a11y-missing-attribute -->
                    <div class="one-third aspect-ratio-16x9 dark-overlay-lightest border-rounder relative">
                      <a href="?" on:click={(event) => _handle_view_property(property.gurasid)} data-property-id="{property.gurasid}" class="link-property">
                      <img on:error={handleImageError} data-index="{index}" class="aspect-ratio-16x9 border-round cover width-100" loading="lazy" src="https://maps.googleapis.com/maps/api/streetview?size=640x360&radius=15&return_error_code=true&source=outdoor&location={property.address.toLowerCase().replace(/\s/g, '-')}-{property?.postcode || ""}&key=AIzaSyC5I6s5Rym9KnniWrQX9pOhH6LaCi3sW9Q"/>
                      </a>
                    </div>
                    <div class="two-third padding-left padding-right">
                      <div class="flex flex-static">
                        <div class="three-quarter padding-top padding-mobile">
                          <a href="?" on:click={(event) => _handle_view_property(property.gurasid)} data-property-id="{property.gurasid}" class="link-property">
                            <h5>{property.address} {property?.postcode || ""}</h5>
                          </a>
                        </div>
                        <div class="one-quarter row right">


                          <!-- <a class:unclickable={generating_pdf} class="generate-pdf" data-address="{property.address} {property?.postcode || ""}" data-id="{property.gurasid}" href="?" on:click={_generate_pdf}>
                            <i class=" {generating_pdf ? 'icon-loader-circle icon-spin': 'icon-file-text'}"></i>
                          </a> -->

                          <a class="toggle-fav {is_logged_in ? '': 'unclickable'}" data-id="{property.gurasid}" href="?" on:click={_toggle_fav}>
                            {#if property.gurasid && user_fav.hasOwnProperty(property.gurasid)}
                              <i class="icon-star star-checked"></i>
                            {:else}
                              <i class=" icon-star"></i>
                            {/if}
                          </a>
                        </div>
                      </div>

                      <a href="?" on:click={(event) => _handle_view_property(property.gurasid)} data-property-id="{property.gurasid}" class="link-property">
                        <PropertySpec property={property}></PropertySpec>
                      </a>


                      
                    </div>
                  </div>
              </div>
              {/each}


            {/if}
          {:else if body && !is_getting_total}
            <div class="padding-bottom">
              <div class="container dark-overlay-lightest padding-top-wide padding-bottom-wide border-round">
                {#if isChecked}
                <h6>No matches found within your favourites. Perhaps turn off My Fav and search again.</h6>
                {:else}
                <h6>No matches found.</h6>
                {/if}
              </div>
            </div>
          {:else}
            <div class="padding-bottom">
              {#each Array.from({ length: 3 }, (_, i) => i + 1) as item}
                <div class="padding-bottom">
                  <div class="flex container-thin property-container temp-container">
                    <!-- svelte-ignore a11y-missing-attribute -->
                    <div class="one-third aspect-ratio-16x9 dark-overlay-lightest border-rounder  relative">
                      <img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" />
                    </div>
                    <div class="two-third padding-left padding-right-thin">
                      <h5>&nbsp;</h5>

                      <div class="padding-top span-info flex">
                        <div class="one-quarter"><i class=" icon-move-horizontal"></i></div>
                        <div class="one-quarter"><i class=" icon-move-vertical"></i></div>
                      </div> 

                      <div class="padding-top-thin span-info flex">
                        <div class="one-quarter"><i class=" icon-expand"></i></div>
                        <div class="one-quarter"><i class="  icon-building"></i> </div>
                        <div class="one-quarter"><i class=" icon-align-vertical-space-around"></i> </div>
                      </div> 
                    </div>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>

        {#if is_print}
          <div class="print-top-padding">
            <div class="border-rounder border-primary padding-top padding-left padding-right">
              <h5 class="padding-bottom uppercase"><strong>Search Properties</strong></h5>

              <div class="padding-top padding-bottom span-info flex flex-static">
                <div class="one-quarter">
                  <div class="span-label">
                    REGIONS
                  </div>
                  <code>{regions_selected.length? regions_selected.join(', ') : 'All'}</code>
                </div>
                <div class="one-quarter">
                  <div class="span-label">
                    LOCAL GOVERNMENT AREA
                  </div>
                  <code>{lga_names_selected.length ? lga_names_selected.map(d => d.value).join(', ') : '--'}</code>
                </div>
                <div class="one-quarter">
                  <div class="span-label">
                    SUBURB
                  </div>
                  <code>{suburb_selected.length ? suburb_selected.map(d => d.value).join(', ') : '--'}</code>
                </div>
                <div class="one-quarter">
                  <div class="span-label">
                    PERMISSIBLE USES
                  </div>
                  <code>{permissibleuse_selected.length ? permissibleuse_selected.map(d => d.value).join(', ') : '--'}</code>
                </div>
              </div>

              <div class="padding-top padding-bottom span-info flex flex-static">
                <div class="one-quarter">
                  <div class="span-label">
                    WIDTH
                  </div>
                  {#if custom_width_min || custom_width_max}
                    {#if custom_width_min && custom_width_max}
                      <code>{custom_width_min} - {custom_width_max} m</code>
                    {:else if custom_width_min > 0} 
                    <code>{custom_width_min}+ m</code>
                    {:else}
                    <code>&lt; {custom_width_max} m</code>
                    {/if}
                  {:else if width_range[0] > 0 && width_range[1] < 1000} 
                    <code>{width_range[0]} - {width_range[1]} m</code>
                  {:else if width_range[0] > 0} 
                    <code>{width_range[0]}+ m</code>
                  {:else if width_range[1] < 1000} 
                    <code>&lt; {width_range[1]} m</code>
                  {:else}
                    <code>Any</code>
                  {/if}
                </div>
                <div class="one-quarter">
                  <div class="span-label">
                    DEPTH
                  </div>
                  {#if custom_depth_min || custom_depth_max}
                    {#if custom_depth_min && custom_depth_max}
                      <code>{custom_depth_min} - {custom_depth_max} m</code>
                    {:else if custom_depth_min > 0} 
                    <code>{custom_depth_min}+ m</code>
                    {:else}
                    <code>&lt; {custom_depth_max} m</code>
                    {/if}
                  {:else if depth_range[0] > 0 && depth_range[1] < 1000} 
                    <code>{depth_range[0]} - {depth_range[1]} m</code>
                  {:else if depth_range[0] > 0} 
                    <code>{depth_range[0]}+ m</code>
                  {:else if depth_range[1] < 1000} 
                    <code>&lt; {depth_range[1]} m</code>
                  {:else}
                    <code>Any</code>
                  {/if}
                </div>
                <div class="one-quarter">
                  <div class="span-label">
                    PERMISSIBLE HEIGHT
                  </div>
                  {#if custom_height_min || custom_height_max}
                    {#if custom_height_min && custom_height_max}
                      <code>{custom_height_min} - {custom_height_max} m</code>
                    {:else if custom_height_min > 0} 
                    <code>{custom_height_min}+ m</code>
                    {:else}
                    <code>&lt; {custom_height_max} m</code>
                    {/if}
                  {:else if height_range[0] > 0 && height_range[1] < 400} 
                    <code>{height_range[0]} - {height_range[1]} m</code>
                  {:else if height_range[0] > 0} 
                    <code>{height_range[0]}+ m</code>
                  {:else if height_range[1] < 400} 
                    <code>&lt; {height_range[1]} m</code>
                  {:else}
                    <code>Any</code>
                  {/if}
                </div>
                <div class="one-quarter">
                  <div class="span-label">
                    FLOOR SPACE RATIOS
                  </div>
                  {#if custom_fsr_min || custom_fsr_max}
                    {#if custom_fsr_min && custom_fsr_max}
                      <code>{roundToNearestTenth(custom_fsr_min)} - {roundToNearestTenth(custom_fsr_max)} fsr</code>
                    {:else if custom_fsr_min > 0} 
                    <code>{roundToNearestTenth(custom_fsr_min)} fsr</code>
                    {:else}
                    <code>&lt; {roundToNearestTenth(custom_fsr_max)} fsr</code>
                    {/if}
                  {:else if fsr_range[0] > 0 && fsr_range[1] < 30} 
                    <code>{roundToNearestTenth(fsr_range[0])} - {roundToNearestTenth(fsr_range[1])} fsr</code>
                  {:else if fsr_range[0] > 0} 
                    <code>{roundToNearestTenth(fsr_range[0])} fsr</code>
                  {:else if fsr_range[1] < 30} 
                    <code>&lt; {roundToNearestTenth(fsr_range[1])} fsr</code>
                  {:else}
                    <code>Any</code>
                  {/if}
                </div>
              </div>

              <div class="padding-top padding-bottom span-info flex flex-static">
                <div class="one-quarter">
                  <div class="span-label">
                    MIN LOT SIZE
                  </div>
                  {#if custom_lot_size_range_min || custom_lot_size_range_max}
                    {#if custom_lot_size_range_min && custom_lot_size_range_max}
                      <code>{custom_lot_size_range_min} - {custom_lot_size_range_max} sqm</code>
                    {:else if custom_lot_size_range_min > 0} 
                      <code>{custom_lot_size_range_min}+ sqm</code>
                    {:else}
                      <code>&lt; {custom_lot_size_range_max} sqm</code>
                    {/if}
                  {:else if lot_size_range[0] > 0 && lot_size_range[1] < 10000} 
                    <code>{lot_size_range[0]} - {lot_size_range[1]} sqm</code>
                  {:else if lot_size_range[0] > 0}
                    <code>{lot_size_range[0]}+ sqm</code>
                  {:else if lot_size_range[1] < 10000} 
                        <code>&lt; {lot_size_range[1]} sqm</code>
                  {:else}
                    <code>Any</code>
                  {/if}
                </div>
                <div class="one-quarter">
                  <div class="span-label">
                    AREA OF LAND
                  </div>
                  {#if custom_area_size_range_min || custom_area_size_range_max}
                    {#if custom_area_size_range_min && custom_area_size_range_max}
                      <code>{custom_area_size_range_min} - {custom_area_size_range_max} sqm</code>
                    {:else if custom_area_size_range_min > 0} 
                      <code>{custom_area_size_range_min}+ sqm</code>
                    {:else}
                      <code>&lt; {custom_area_size_range_max} sqm</code>
                    {/if}
                  {:else if min_lot_size_range[0] > 0 && min_lot_size_range[1] < 10000} 
                    <code>{min_lot_size_range[0]} - {min_lot_size_range[1]} sqm</code>
                  {:else if min_lot_size_range[0] > 0}
                    <code>{min_lot_size_range[0]}+ sqm</code>
                  {:else if min_lot_size_range[1] < 10000} 
                        <code>&lt; {min_lot_size_range[1]} sqm</code>
                  {:else}
                    <code>Any</code>
                  {/if}
                </div>

                <div class="one-quarter">
                  <div class="span-label">
                    PRICE
                  </div>
                  {#if custom_price_range_min || custom_price_range_max}
                    {#if custom_price_range_min && custom_price_range_max}
                    <code>{formatPriceValue(custom_price_range_min, custom_price_range_max)}</code>
                        {:else if custom_price_range_min > 0}
                    <code>{formatPriceValue(custom_price_range_min, null)}</code>
                        {:else}
                    <code>{formatPriceValue(null, custom_price_range_max)}</code>
                    {/if}
                  {:else if price_range[0] > 0 && price_range[1] < 13000000}
                    <code>{formatPriceValue(price_range[0],price_range[1])}</code>
                  {:else if price_range[0] > 0}
                    <code>{formatPriceValue(price_range[0], null)}</code>
                  {:else if price_range[1] < 13000000}
                    <code>{formatPriceValue(null, price_range[1])}</code>
                  {:else}
                    <code>Any</code>
                  {/if}
                </div>

                <div class="one-quarter">
                  <div class="span-label">
                    ZONE
                  </div>
                  <code>{zone_selected.length ? zone_selected.map(d => d.value).join(', ') : '--'}</code>
                </div>

              </div>



              <div class="padding-top padding-bottom span-info flex flex-static">
                <div class="one-quarter">
                  <div class="span-label">
                    NEARBY SCHOOL
                  </div>
                  {#if school_range[0] >= 100} 
                    <code>within {roundToNearestTenth(school_range[0] / 1000)} km</code>
                  {:else}
                    <code>Any</code>
                  {/if}
                </div>
                <div class="one-quarter">
                  <div class="span-label">
                    NEARBY HOSPITAL
                  </div>
                  {#if hospital_range[0] >= 100} 
                    <code>within {roundToNearestTenth(hospital_range[0] / 1000)} km</code>
                  {:else}
                    <code>Any</code>
                  {/if}
                </div>
                <div class="one-quarter">
                  <div class="span-label">
                    NEARBY TRAINS
                  </div>
                  {#if train_range[0] >= 100} 
                    <code>within {roundToNearestTenth(train_range[0] / 1000)} km</code>
                  {:else}
                    <code>Any</code>
                  {/if}
                </div>
                
              </div>


              <div class="padding-top padding-bottom span-info flex flex-static">
                <div class="one-quarter">
                  <div class="span-label">
                    COMPLYING DEVELOPMENT
                  </div>

                  <code>{complying_development.dualoccupancy || 'No'}</code>
                </div>
              </div>

              <div class="padding-top padding-bottom span-info">
                
                  <div class="span-label padding-bottom">
                    PLANNING CONSTRAINTS
                  </div>
                  <div class="flex wrap">
                  {#each Object.keys(no_exclusions) as exclusion_key}
                    <div class="padding-bottom-thin" style="width:25%">
                    <code>
                      {exclusionLabelMap[exclusion_key] || exclusion_key}:
                      {no_exclusions[exclusion_key] == '2'
                        ? 'Include Only'
                        : no_exclusions[exclusion_key] == '1'
                          ? 'Exclude'
                          : 'All'}
                    </code>
                    </div>
                  {/each}
                </div>

              </div>


              


            </div>
          </div>
        {/if}
        
        <!-- <div class="pagination-container padding-right  {use_settings ? 'hide': ''} {(is_getting_total || ! body) ? 'temp-container' : ''} {use_listview ? 'hide' : ''}">
          {#if properties && properties.length}
          <div class="row padding-bottom flex flex-static wrap">
            <div class="one-quarter">
              <div class="vertical-center">
                {#if is_logged_in}
                  {#if objects_total < per_page}
                    1-{objects_total} of {objects_total}
                  {:else}
                    {(page * per_page) + 1 - per_page}-{#if ((page * per_page) + per_page  - per_page) < objects_total}{(page * per_page) + per_page - per_page}{:else}{per_page + objects_total - per_page}{/if} of {objects_total}
                  {/if}
                {:else}
                  {objects_total} Matching Properties
                {/if}
              </div>
            </div>
            <div class="four-quarter row right">
              <div class="pagination">
                {#if is_logged_in}
                  <button class="btn-prev" disabled={page === 1} on:click={prevPage}>&lsaquo;</button>
                  {#each Array.from({ length: 5 }, (_, i) => i + start_page) as pageNumber}
                    <button class="btn-page" class:current={page == pageNumber} disabled={pageNumber > max_number_of_pages} on:click={(event) => {changePage(pageNumber, event)}} class:selected={pageNumber === page}>
                      {pageNumber}
                    </button>
                  {/each}
                  <button class="btn-next" disabled={page >= max_number_of_pages} on:click={nextPage}>&rsaquo;</button>
                {:else}
                  {#if ! buy_report}
                  <div class="flex flex-static wrap subscribe-form-container">
                    <div class="two-fifth padding-right">
                      <div class="vertical-center">Sign up for our newsletter to receive latest offers, news.</div>
                    </div>
                    <div class="two-fifth">
                      <input id="subscribe-email" type="email" bind:value={subscribe_email} placeholder="Email"/>
                    </div>
                    <div class="one-fifth">
                      <button class="btn btn-subscribe {is_subscribing ? 'unclickable': ''}" on:click={_handle_subscribe_email}>
                        {#if is_subscribing }
                          <i class=" icon-loader-circle icon-spin"></i> Subscribing
                        {:else if is_subscribed }
                          <i class=" icon-check"></i> Subscribed
                        {:else }
                          Subscribe
                        { /if}
                      </button>
                    </div>
                  </div>
                  {/if}
                {/if}
              </div>
            </div>
          </div>
          {/if}
        </div> -->
      
      
      
      
      </div>
    </div>
  </div>

  {#if property_loading && ! use_listview}
  <div class="map-view-detail skeleton-panel" class:visible={mapview_viewing_property}>
    <div class="skeleton-banner relative">
      <div class="skeleton-box" style="width: 100%; height: 100%; border-radius: 0;"></div>
      <a class="skeleton-close" aria-label="Close" href="?" on:click|preventDefault={_handle_btn_back}>&times;</a>
    </div>
    <div class="padding-top padding-left padding-right padding-bottom">
      <div class="skeleton-box skeleton-line" style="width: 75%; height: 28px;"></div>
      <div class="skeleton-box skeleton-line" style="width: 40%; height: 20px;"></div>
      <div class="flex" style="gap: 1em; margin-top: 1.5em;">
        <div class="skeleton-box" style="height: 42px; width: 50%;"></div>
        <div class="skeleton-box" style="height: 42px; width: 50%;"></div>
      </div>
      <div class="skeleton-box" style="height: 180px; margin-top: 1.5em;"></div>
      <div style="margin-top: 1.5em;">
        <div class="skeleton-box skeleton-line" style="width: 90%; height: 16px;"></div>
        <div class="skeleton-box skeleton-line" style="width: 80%; height: 16px;"></div>
        <div class="skeleton-box skeleton-line" style="width: 85%; height: 16px;"></div>
      </div>
      <div class="skeleton-box" style="height: 120px; margin-top: 1.5em;"></div>
    </div>
  </div>
  {/if}

  {#if view_property && viewing_property && ! property_loading}
  <Property onAction={_handle_btn_back} {pdf_property} bind:use_listview {view_property} api_domain={api_domain} website_domain_with_http={website_domain_with_http} property={viewing_property} is_logged_in={is_logged_in} {has_access} {renew_url} bind:user_fav user_plan={user_plan} user_email={user_email} user_id={user_id} onEmail={_email_property} onSendMail={_send_mail_property} user_template={user_template} from_first_name={from_first_name} from_last_name={from_last_name} from_company_name={from_company_name} from_address_1={from_address_1} from_address_2={from_address_2} from_postcode={from_postcode} from_city={from_city} from_state={from_state} bind:mapview_viewing_property exclusion_options={exclusion_options} {pdf_config} {custom_logo_url} {user_first_name} {user_last_name} {_handle_toggle_3d} {_handle_toggle_spin} bind:map_3d bind:map_spin></Property>
  {/if}

{#if paused_notice}
  <div role="status" style="position:fixed;left:50%;bottom:1.5rem;transform:translateX(-50%);z-index:99999;max-width:32rem;padding:.8rem 1.1rem;border-radius:.6rem;background:var(--up-c-140d1f);color:var(--up-c-f2eef8);font-size:14px;line-height:1.4;box-shadow:0 8px 30px var(--up-c-000000-a35);">
    {paused_notice}
  </div>
{/if}
</div>