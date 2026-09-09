<script>
  // @ts-nocheck
  import { processChartVariables } from '$lib/app/helperFunctions.js';
  import { streetViewUrl, streetViewLocation, resolveStreetViewUrl } from '$lib/app/streetview.js';
  import EthnicityChartWrapper from '$lib/app/EthnicityChartWrapper.svelte';
  import CrimeCountChartWrapper from '$lib/app/CrimeCountChartWrapper.svelte';
  import RankChartWrapper from '$lib/app/RankChartWrapper.svelte';
  import AgeChartWrapper from '$lib/app/AgeChartWrapper.svelte';
  import AgePyramidChartWrapper from '$lib/app/AgePyramidChartWrapper.svelte';
  import { initPdfMe, createPdf } from '$lib/app/pdfFunctions.js';
  import PDFBuilder from '$lib/app/PDFBuilder.svelte';
  import CdcRules from '$lib/app/cdcRules.svelte';

  import LMR from '$lib/app/LMR.svelte';
  import Design from '$lib/app/Design.svelte';
  import Yield from '$lib/app/Yield.svelte';
  import Tiptap from '$lib/app/Tiptap.svelte';
  import Signup from '$lib/app/Signup.svelte';

	import { onMount } from 'svelte';
  import { fade, slide } from 'svelte/transition';

  import Tags from "svelte-tags-input";

  let is_designing = false;
  let is_yielding = false;

  // Yield result snapshot lifted from <Yield> (for the PDF report); reset per property.
  let yield_snapshot = null;
  let _yieldSnapFor = null;
  $: if (property && property.gurasid && property.gurasid !== _yieldSnapFor) {
    _yieldSnapFor = property.gurasid;
    yield_snapshot = null;
  }
  
  function isPointInPolygon(point, polygon) {
    const x = point.coordinates[0];
    const y = point.coordinates[1];
    let inside = false;
    
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i][0], yi = polygon[i][1];
      const xj = polygon[j][0], yj = polygon[j][1];
      
      const intersect = ((yi > y) !== (yj > y)) &&
        (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    
    return inside;
  }

  export let property;
  export let user_fav;
  export let user_plan;
  export let is_logged_in;
  export let has_access = true;
  export let renew_url = '/renew/';
  export let user_email;
  export let user_id;
  export let mapview_viewing_property;
  export let use_listview;
  export let map_3d = false;
  export let map_monochrome = true;
  export let map_spin = false;

  export let _handle_toggle_spin;
  export let _handle_toggle_3d;

  export let exclusion_options;

  const pattern_book_options = [
    { name: 'semis_01_anthony_gill_eligible', label: 'Semis 01' },
    { name: 'semis_02_sibling_eligible', label: 'Semis 02' },
    { name: 'terraces_01_carter_eligible', label: 'Terraces 01' },
    { name: 'terraces_02_sam_crawford_eligible', label: 'Terraces 02' },
    { name: 'terraces_03_officer_woods_eligible', label: 'Terraces 03' },
    { name: 'terraces_04_other_eligible', label: 'Terraces 04' },
    { name: 'row_homes_01_saha_eligible', label: 'Row Homes 01' },
    { name: 'manor_homes_01_studio_eligible', label: 'Manor Homes 01' },
    { name: 'small_lot_apt_01_3storeys_eligible', label: 'Small Lot Apartments 01 (3 Storeys)' },
    { name: 'small_lot_apt_01_3storeys_min_eligible', label: 'Small Lot Apartments 01 (3 Storeys Min)' },
    { name: 'small_lot_apt_01_4storeys_eligible', label: 'Small Lot Apartments 01 (4 Storeys)' },
    { name: 'small_lot_apt_02_3storeys_eligible', label: 'Small Lot Apartments 02 (3 Storeys)' },
    { name: 'small_lot_apt_02_4storeys_eligible', label: 'Small Lot Apartments 02 (4 Storeys)' },
    { name: 'small_lot_apt_03_4_6storeys_eligible', label: 'Small Lot Apartments 03 (4-6 Storeys)' },
    { name: 'small_lot_apt_04_4_5storeys_eligible', label: 'Small Lot Apartments 04 (4-5 Storeys)' },
    { name: 'corner_lot_apt_01_4_6storeys_eligible', label: 'Corner Lot Apartments 01 (4-6 Storeys)' },
    { name: 'corner_lot_apt_02_4_6storeys_eligible', label: 'Corner Lot Apartments 02 (4-6 Storeys)' },
    { name: 'large_lot_apt_01_4storeys_eligible', label: 'Large Lot Apartments 01 (4 Storeys)' },
    { name: 'large_lot_apt_01_6storeys_eligible', label: 'Large Lot Apartments 01 (6 Storeys)' },
    { name: 'large_lot_apt_02_3_4storeys_eligible', label: 'Large Lot Apartments 02 (3-4 Storeys)' },
    { name: 'large_lot_apt_02_5_6storeys_eligible', label: 'Large Lot Apartments 02 (5-6 Storeys)' },
    { name: 'large_lot_apt_03_4_6storeys_eligible', label: 'Large Lot Apartments 03 (4-6 Storeys)' },
  ];

  export let pdf_property;
  export let pdf_config = null;
  export let custom_logo_url = null;
  export let user_first_name = null;
  export let user_last_name = null;

  let image_search_selected = [];
  let show_pdf_builder = false;
  let show_cdc_rules = false;
  
  let is_editing_price = false;

  let generating_pdf = false;
  let show_pdf_popover = false;

  // Hardcoded LMR/LRM overrides: no DB column exists for "is house in LMR" yet,
  // so specific properties are listed here by propid until one is added.
  const lrm_hardcoded_propids = [3390711];
  const lrm_hardcoded_addresses = ['13 ARTILLERY CRESCENT SEVEN HILLS'];
  $: lrm_section =
    lrm_hardcoded_propids.includes(Number(property?.propid)) ||
    lrm_hardcoded_addresses.some(a =>
      (property?.address || '').toUpperCase().includes(a)
    );

  let da_status_colours = {
    // Under assessment (Orange)
    'Additional Information Provided': '#FFA500',
    'Additional Information Requested': '#FFA500',
    'Awaiting-Documents': '#FFA500',
    'In Progress': '#FFA500',
    'On Exhibition': '#FFA500',
    'Open': '#FFA500',
    'Operational consent requested': '#FFA500',
    'Pending Court Appeal': '#FFA500',
    'Pending Exemption update': '#FFA500',
    'Pending Lodgement': '#FFA500',
    'Submitted': '#FFA500',
    'Under Assessment': '#FFA500',
    // Approved (Green)
    'Approved': '#388E3C',
    'Deferred Commencement': '#388E3C',
    'Operational consent issued': '#388E3C',
    // Withdrawn (Grey)
    'Cancelled': '#9E9E9E',
    'Rejected': '#9E9E9E',
    'Returned': '#9E9E9E',
    'Withdrawn': '#9E9E9E',
    // Refused (Red)
    'Declined': '#EF5350',
    'Operational consent declined': '#EF5350',
    'Refused': '#EF5350',
    // Determined (light Green)
    'Determined': '#8BC34A'
  };


  export let website_domain_with_http;

  export let api_domain;

  export let onAction; 

  let use_satellite = false;

  let mapType;

  let use_debug = false;

  let designModelRotateX = 0;
  let designModelRotateY = 0;
  let designModelRotateZ = 0;
  let designCurrentFitRotation = 0;
  let designModelScale = 1;
  let designModelNudgeX = 0;
  let designModelNudgeY = 0;
  let designModelNudgeZ = 0;
  let designModelLoaded = false;
  let designUploadedModelUrl = null;
  let designFittedAnchor = null;
  let designCurrentModelId = null;
  let designSelectedDesignId = null;
  let designClipLayerFootprintString = null;

  
  const exclusionToLayerMap = {
    'activestreetfrontage': { label: 'Active Street Frontages', layer: 'frontage' },
    'australian_noise_exposure_forecast': { label: 'Airport Noise', layer: 'airport' },
    'biodiversity': { label: 'Terrestrial Biodiversity', layer: 'terrestrialbiodiversity' },
    'bushfireproneland': { label: 'Bushfire Prone', layer: 'bushfire' },
    'coastalmanagement': { label: 'Coastal Management', layer: 'coastalmanagement' },
    'contamination_activity_type': { label: 'Contaminated Sites', layer: 'contaminationsites' },
    'drinkingcatchment': { label: 'Drinking Catchment', layer: 'drinking_water_catchment' },
    'floodmapping': { label: 'Flood Zone', layer: 'floodplanning' },
    'groundwatervulnerability': { label: 'Groundwater Vulnerability', layer: 'groundwatervulnerability' },
    'h_name': { label: 'Heritage', layer: 'heritage' },
    'landsliderisk': { label: 'Landslide', layer: 'landsliderisk' },
    'mineralresoureland': { label: 'Mineral & Resource Land', layer: 'mineralresourceland' },
    'minesubsidence': { label: 'Mine Subsidence', layer: 'mine_subsidence_district' },
    'riparianlandwatercouse': { label: 'Riparian Lands and Water Courses', layer: 'riparianlandwatercourse' },
    'salinity': { label: 'Salinity', layer: 'salinity' },
    'scenicprotectionland': { label: 'Scenic Protection Lands', layer: 'scenicprotectionland' },
    'wetland': { label: 'Wetlands', layer: 'wetlands' }
  };

  let hiddenMaps = {};
  let hiddenMapContainers = [];
  let mapboxgl = null;

  async function initHiddenMaps() {
    // console.log('initHiddenMaps called');
    if (!property || !window.mapboxgl) {
      // console.log('initHiddenMaps aborted: missing property or window.mapboxgl', { property: !!property, mapboxgl: !!window.mapboxgl });
      return;
    }
    
    mapboxgl = window.mapboxgl;
    
    const activeExclusions = Object.entries(exclusionToLayerMap).filter(([key]) => property[key]);
    // console.log('initHiddenMaps active exclusions:', activeExclusions.map(e => e[0]));
    
    // Get property coordinates from geom
    const propLng = property.geom?.coordinates?.[0] || 151.0;
    const propLat = property.geom?.coordinates?.[1] || -33.9;
    const center = [propLng, propLat];
    const zoom = 17;
    // console.log('initHiddenMaps center and zoom:', center, zoom);
    
    if (activeExclusions.length > 0) {
      // console.log(`initHiddenMaps generating ${activeExclusions.length} constraint maps`);
      for (const [exclusionKey] of activeExclusions) {
        // console.log(`initHiddenMaps processing constraint map for: ${exclusionKey}`);
        const containerId = `mapbox-map-planning-constraint-${exclusionKey}`;
        let container = document.getElementById(containerId);
        
        if (!container) {
          container = document.createElement('div');
          container.id = containerId;
          container.className = `mapbox-map-planning-constraint-${exclusionKey}`;
          container.style.cssText = 'position: fixed; top: -9999px; left: -9999px; width: 800px; height: 600px; visibility: hidden;';
          document.body.appendChild(container);
          // console.log(`initHiddenMaps created container: ${containerId}`);
        } else {
          // console.log(`initHiddenMaps found existing container: ${containerId}`);
        }
        
        if (hiddenMaps[exclusionKey]) {
          // console.log(`initHiddenMaps removing existing map instance for: ${exclusionKey}`);
          hiddenMaps[exclusionKey].remove();
        }
        
        // console.log(`initHiddenMaps instantiating Mapbox for: ${exclusionKey}`);
        const hiddenMap = new mapboxgl.Map({
          container: containerId,
          style: 'mapbox://styles/mapbox/standard',
          center: center,
          zoom: zoom,
          interactive: false,
          attributionControl: false,
          preserveDrawingBuffer: true
        });
        
        hiddenMap.on('error', (e) => {
          console.error(`Hidden map error for ${exclusionKey}:`, e);
        });
        
        hiddenMap.on('load', () => {
          // console.log(`initHiddenMaps map loaded for ${exclusionKey}`);
          
          const layerName = exclusionToLayerMap[exclusionKey].layer;
          const targetId = `custom-layer-${layerName}`;
          
          // Add lot-fill source and layer to hidden map (check if already exists)
          if (!hiddenMap.getSource('custom-tiles-lot-fill')) {
            // console.log(`initHiddenMaps adding lot-fill source for ${exclusionKey}`);
            hiddenMap.addSource('custom-tiles-lot-fill', {
              type: 'vector',
              tiles: [
                `${typeof window !== 'undefined' ? window.location.origin : ''}/p/Lot/{z}/{x}/{y}`
              ],
              promoteId: 'id',
              minzoom: 15
            });
          }
          
          if (!hiddenMap.getLayer('custom-layer-lot-fill')) {
            // console.log(`initHiddenMaps adding lot-fill layer for ${exclusionKey}`);
            hiddenMap.addLayer({
              id: 'custom-layer-lot-fill',
              type: 'fill',
              source: 'custom-tiles-lot-fill',
              'source-layer': 'Lot',
              paint: {
                'fill-color': '#5C2587',
                'fill-opacity': 0.3
              }
            });
          }
          
          // Try to get lot geometry from hidden map source
          setTimeout(() => {
            // console.log(`initHiddenMaps attempting to extract lot geometry for ${exclusionKey} after timeout`);
            try {
              if (!hiddenMap.getStyle()) {
                // console.log(`initHiddenMaps style not ready for ${exclusionKey}`);
                return;
              }
              const features = hiddenMap.querySourceFeatures('custom-tiles-lot-fill', {
                sourceLayer: 'Lot'
              });
              
              if (features && features.length > 0) {
                // console.log(`initHiddenMaps found ${features.length} lot features for ${exclusionKey}`);
                let lotFeature = null;
                const pt = { type: 'Point', coordinates: center };
                
                for (const f of features) {
                  if (f.geometry && f.geometry.type === 'Polygon') {
                    const coords = f.geometry.coordinates[0];
                    if (isPointInPolygon(pt, coords)) {
                      lotFeature = f;
                      break;
                    }
                  }
                }
                
                if (lotFeature) {
                  // console.log(`initHiddenMaps matched lot feature for ${exclusionKey}`);
                  const lotGeoJson = {
                    type: 'Feature',
                    geometry: lotFeature.geometry,
                    properties: lotFeature.properties
                  };
                  property.lotGeoJson = lotGeoJson;
                  
                  // Add property lot fill with purple
                  hiddenMap.addSource('property-lot-fill', {
                    type: 'geojson',
                    data: lotGeoJson
                  });
                  
                  hiddenMap.addLayer({
                    id: 'property-lot-fill',
                    type: 'fill',
                    source: 'property-lot-fill',
                    paint: {
                      'fill-color': '#5c2587',
                      'fill-opacity': 0.3
                    }
                  });
                  
                  hiddenMap.addLayer({
                    id: 'property-lot-outline',
                    type: 'line',
                    source: 'property-lot-fill',
                    paint: {
                      'line-color': '#5c2587',
                      'line-width': 1
                    }
                  });
                } else {
                  // console.log(`initHiddenMaps no matching lot feature found for ${exclusionKey} center pt`);
                }
              } else {
                // console.log(`initHiddenMaps no lot features queried for ${exclusionKey}`);
              }
            } catch (e) {
              console.warn(`Could not get lot geometry for ${exclusionKey}:`, e);
            }
          }, 2000);
          
          try {
            if (hiddenMap.getLayer(targetId)) {
              // console.log(`initHiddenMaps making target layer visible: ${targetId} for ${exclusionKey}`);
              hiddenMap.setLayoutProperty(targetId, 'visibility', 'visible');
            } else {
              // console.log(`initHiddenMaps target layer NOT FOUND: ${targetId} for ${exclusionKey}`);
            }
          } catch (e) {
            console.warn('Layer not found on hidden map:', targetId);
          }
          
          hiddenMap.resize();
        });
        
        hiddenMaps[exclusionKey] = hiddenMap;
        hiddenMapContainers.push(containerId);
      }
    } else {
      // console.log('initHiddenMaps: no active exclusions found');
    }
    
    window.planningConstraintMaps = hiddenMaps;

    // --- DEVELOPMENT APPLICATIONS MAP ---
    // console.log(`initHiddenMaps configuring DA map. property.das:`, !!property.das);
    if (property.das || true) {
      const daContainerId = `mapbox-map-da-surrounding`;
      let daContainer = document.getElementById(daContainerId);
      
      if (!daContainer) {
        daContainer = document.createElement('div');
        daContainer.id = daContainerId;
        daContainer.className = `mapbox-map-da-surrounding`;
        daContainer.style.cssText = 'position: fixed; top: -9999px; left: -9999px; width: 800px; height: 600px; visibility: hidden;';
        document.body.appendChild(daContainer);
        // console.log(`initHiddenMaps created DA container: ${daContainerId}`);
      } else {
        // console.log(`initHiddenMaps found DA container: ${daContainerId}`);
      }
      
      if (window.daHiddenMap) {
        // console.log('initHiddenMaps removing existing DA map');
        window.daHiddenMap.remove();
      }
      
      const mapStyle = window.mapboxMap ? window.mapboxMap.getStyle() : null;
      // console.log(`initHiddenMaps instantiating DA Mapbox`);
      
      const daMap = new mapboxgl.Map({
        container: daContainerId,
        style: mapStyle || 'mapbox://styles/mapbox/standard',
        center: center,
        zoom: zoom,
        interactive: false,
        attributionControl: false,
        preserveDrawingBuffer: true
      });
      
      daMap.on('error', (e) => {
        console.error('DA Hidden map error:', e);
      });

      daMap.once('style.load', () => {  // 'once' prevents multiple triggers
        // console.log('initHiddenMaps DA map style.load fired');
        daMap.setConfigProperty('basemap', 'lightPreset', 'day');
        daMap.setConfigProperty('basemap', 'theme', 'monochrome');
        // map.setConfigProperty('basemap', 'show3dObjects', false); // Flat map
      });
      
      daMap.on('load', () => {
        // console.log('initHiddenMaps DA map load fired');
        // Ensure DA layer is visible
        const daLayerId = 'custom-layer-da_applications_lot';
        const daLabelsId = 'custom-labels-da_applications_lot';
        try {
          if (daMap.getLayer(daLayerId)) {
            // console.log(`initHiddenMaps making DA layer visible: ${daLayerId}`);
            daMap.setLayoutProperty(daLayerId, 'visibility', 'visible');
          } else {
            // console.log(`initHiddenMaps DA layer NOT FOUND: ${daLayerId}`);
          }
          if (daMap.getLayer(daLabelsId)) {
            daMap.setLayoutProperty(daLabelsId, 'visibility', 'visible');
          }
        } catch (e) {
          console.warn('DA layer not found on hidden map:', daLayerId);
        }

        // Add lot-fill source and layer to hidden map (check if already exists)
        if (!daMap.getSource('custom-tiles-lot-fill')) {
          // console.log('initHiddenMaps adding lot-fill source to DA map');
          daMap.addSource('custom-tiles-lot-fill', {
            type: 'vector',
            tiles: [
              `${typeof window !== 'undefined' ? window.location.origin : ''}/p/Lot/{z}/{x}/{y}`
            ],
            promoteId: 'id',
            minzoom: 15
          });
        }
        
        if (!daMap.getLayer('custom-layer-lot-fill')) {
          // console.log('initHiddenMaps adding lot-fill layer to DA map');
          daMap.addLayer({
            id: 'custom-layer-lot-fill',
            type: 'fill',
            source: 'custom-tiles-lot-fill',
            'source-layer': 'Lot',
            paint: {
              'fill-color': '#5C2587',
              'fill-opacity': 0.3
            }
          });
        }

        setTimeout(() => {
          // console.log('initHiddenMaps attempting to extract lot geometry for DA map after timeout');
          try {
            if (!daMap.getStyle()) {
              // console.log('initHiddenMaps DA map style not ready');
              return;
            }
            const features = daMap.querySourceFeatures('custom-tiles-lot-fill', {
              sourceLayer: 'Lot'
            });
            
            if (features && features.length > 0) {
              // console.log(`initHiddenMaps found ${features.length} lot features for DA map`);
              let lotFeature = null;
              const pt = { type: 'Point', coordinates: center };
              
              for (const f of features) {
                if (f.geometry && f.geometry.type === 'Polygon') {
                  const coords = f.geometry.coordinates[0];
                  if (isPointInPolygon(pt, coords)) {
                    lotFeature = f;
                    break;
                  }
                }
              }
              
              if (lotFeature) {
                // console.log(`initHiddenMaps matched lot feature for DA map`);
                const lotGeoJson = {
                  type: 'Feature',
                  geometry: lotFeature.geometry,
                  properties: lotFeature.properties
                };
                property.lotGeoJson = lotGeoJson;
                // console.log(property.lotGeoJson);
                
                daMap.addSource('property-lot-fill', {
                  type: 'geojson',
                  data: lotGeoJson
                });
                
                daMap.addLayer({
                  id: 'property-lot-fill',
                  type: 'fill',
                  source: 'property-lot-fill',
                  paint: {
                    'fill-color': '#5c2587',
                    'fill-opacity': 0.3
                  }
                });
                
                daMap.addLayer({
                  id: 'property-lot-outline',
                  type: 'line',
                  source: 'property-lot-fill',
                  paint: {
                    'line-color': '#5c2587',
                    'line-width': 1
                  }
                });
              } else {
                // console.log('initHiddenMaps no matching lot feature found for DA map center pt');
              }
            } else {
              // console.log('initHiddenMaps no lot features queried for DA map');
            }
          } catch (e) {
            console.warn('Could not get lot geometry for DA map:', e);
          }
        }, 2000);

        daMap.resize();
      });
      
      window.daHiddenMap = daMap;
      // console.log('initHiddenMaps finished setting up DA map');
    }
  }



  let initialized_hidden_maps_gurasid = null;
  $: if (property?.gurasid && property.gurasid !== initialized_hidden_maps_gurasid && typeof window !== 'undefined' && window.mapboxgl) {
    initialized_hidden_maps_gurasid = property.gurasid;
    initHiddenMaps();
  }

  const formatNiceCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };


  function handleImageError(event) {
    event.target.src = img_placeholder;
  }

  // Banner street-view image.
  // The <img> src is kept in this variable rather than computed inline in the
  // template so that an on-error swap to the placeholder is NOT undone by
  // unrelated re-renders. Previously the src was bound directly to
  // property?.address / property?.postcode; when the street view 404'd,
  // handleImageError set the DOM src to the placeholder, but the next time any
  // property field changed Svelte re-rendered the bound src back to the failing
  // URL — which errored again — so the banner flickered between its "has image"
  // (tall) and "no image / gif placeholder" (short) heights a few times.
  //
  // banner_location only changes when the address/postcode actually change, so
  // banner_src is recomputed at most once per property and then stays put
  // (including on the placeholder after an error).
  //
  // The locator is resolved through the metadata endpoint (free and
  // quota-exempt) rather than by rendering the image and waiting for a 404:
  // that tells us up front whether the lot centroid, or failing that the
  // address, has any imagery at all, so the banner settles on one answer.
  $: banner_location = streetViewLocation(property);
  let banner_src = '';
  let _banner_location_seen = null;
  let _banner_token = 0;
  $: if (banner_location !== _banner_location_seen) {
    _banner_location_seen = banner_location;
    const token = ++_banner_token;
    banner_src = img_placeholder;
    if (banner_location) {
      resolveStreetViewUrl(property).then((src) => {
        // Ignore a probe the user has already navigated away from.
        if (token === _banner_token && src) banner_src = src;
      });
    }
  }

  function handleBannerImageError() {
    banner_src = img_placeholder;
  }
  
  function _toggle_mapstyle() {
    use_satellite = !use_satellite;
    map.setMapTypeId(map.getMapTypeId() === 'map_style' ? google.maps.MapTypeId.SATELLITE : 'map_style');
  }

  let map;
  let markers = [];
  let map_google_styles = [
    {
      "elementType": "geometry",
      "stylers": [
        {
          "color": "#eeeeee"
        }
      ]
    },
    {
      "elementType": "labels.text",
      "stylers": [
        {
          "color": "#222222"
        }
      ]
    },
    {
      "elementType": "labels.text.fill",
      "stylers": [
        {
          "color": "#999999"
        }
      ]
    },
    {
      "elementType": "labels.text.stroke",
      "stylers": [
        {
          "color": "#eeeeee"
        }
      ]
    },
    {
      "featureType": "landscape",
      "elementType": "geometry.fill",
      "stylers": [
        {
          "visibility": "simplified"
        }
      ]
    },
    {
      "featureType": "landscape.man_made",
      "elementType": "geometry.fill",
      "stylers": [
        {
          "visibility": "simplified"
        }
      ]
    },
    {
      "featureType": "landscape.natural",
      "stylers": [
        {
          "visibility": "simplified"
        }
      ]
    },
    {
      "featureType": "landscape.natural",
      "elementType": "geometry.fill",
      "stylers": [
        {
          "color": "#ededed"
        }
      ]
    },
    {
      "featureType": "poi",
      "stylers": [
        {
          "visibility": "off"
        }
      ]
    },
    {
      "featureType": "poi.medical",
      "stylers": [
        {
          "color": "#5ee7ad"
        },
        {
          "saturation": -30
        },
        {
          "lightness": -5
        },
        {
          "visibility": "on"
        }
      ]
    },
    {
      "featureType": "poi.medical",
      "elementType": "labels.text",
      "stylers": [
        {
          "color": "#6b6b6b"
        },
        {
          "weight": 1
        }
      ]
    },
    {
      "featureType": "poi.school",
      "stylers": [
        {
          "color": "#5c2587"
        },
        {
          "saturation": -35
        },
        {
          "lightness": 55
        },
        {
          "visibility": "on"
        }
      ]
    },
    {
      "featureType": "poi.school",
      "elementType": "labels.text",
      "stylers": [
        {
          "color": "#707070"
        },
        {
          "weight": 0.5
        }
      ]
    },
    {
      "featureType": "road",
      "elementType": "geometry",
      "stylers": [
        {
          "color": "#f5f5f5"
        }
      ]
    },
    {
      "featureType": "road",
      "elementType": "geometry.fill",
      "stylers": [
        {
          "color": "#e7e7e7"
        }
      ]
    },
    {
      "featureType": "road.arterial",
      "elementType": "geometry",
      "stylers": [
        {
          "visibility": "off"
        }
      ]
    },
    {
      "featureType": "road.highway",
      "elementType": "geometry",
      "stylers": [
        {
          "color": "#f1f1f1"
        }
      ]
    },
    {
      "featureType": "road.highway.controlled_access",
      "stylers": [
        {
          "visibility": "off"
        }
      ]
    },
    {
      "featureType": "road.highway.controlled_access",
      "elementType": "geometry",
      "stylers": [
        {
          "color": "#333333"
        }
      ]
    },
    {
      "featureType": "road.highway.controlled_access",
      "elementType": "labels",
      "stylers": [
        {
          "visibility": "off"
        }
      ]
    },
    {
      "featureType": "road.highway.controlled_access",
      "elementType": "labels.text",
      "stylers": [
        {
          "visibility": "off"
        }
      ]
    },
    {
      "featureType": "transit",
      "stylers": [
        {
          "visibility": "on"
        }
      ]
    },
    {
      "featureType": "transit.line",
      "elementType": "geometry",
      "stylers": [
        {
          "color": "#dfdfdf"
        },
        {
          "visibility": "off"
        }
      ]
    },
    {
      "featureType": "transit.line",
      "elementType": "labels.text.fill",
      "stylers": [
        {
          "color": "#8f8f8"
        }
      ]
    },
    {
      "featureType": "transit.line",
      "elementType": "labels.text.stroke",
      "stylers": [
        {
          "color": "#eeeeee"
        }
      ]
    },
    {
      "featureType": "transit.station",
      "stylers": [
        {
          "visibility": "on"
        }
      ]
    },
    {
      "featureType": "transit.station",
      "elementType": "geometry.fill",
      "stylers": [
        {
          "visibility": "on"
        }
      ]
    },
    {
      "featureType": "transit.station.airport",
      "elementType": "geometry.fill",
      "stylers": [
        {
          "visibility": "on"
        }
      ]
    },
    {
      "featureType": "transit.station.rail",
      "stylers": [
        {
          "visibility": "on"
        }
      ]
    },
    {
      "featureType": "water",
      "elementType": "geometry.fill",
      "stylers": [
        {
          "color": "#dddddd"
        }
      ]
    },
    {
      "featureType": "water",
      "elementType": "labels.text.fill",
      "stylers": [
        {
          "color": "#999999"
        }
      ]
    }
  ];

  let img_placeholder = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

  async function _generate_pdf(event) {
    event.preventDefault();
    
    let gurasid = event.currentTarget.getAttribute('data-id');
    let address = event.currentTarget.getAttribute('data-address');

    generating_pdf = true;

    try {
      let active_pdf_config = {
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

      await initPdfMe();
      await createPdf(property, api_domain, active_pdf_config, null, null, null);
      generating_pdf = false;
    } catch (error) {
      alert(error.message);
      generating_pdf = false;
    }
  }

  async function _toggle_fav(event) {
    event.preventDefault();
    
    let gurasid = property.gurasid;
    if (user_fav && user_fav.hasOwnProperty(gurasid)) {
      delete user_fav[gurasid];
      user_fav = user_fav;

      if (user_id) {
        await fetch(`${api_domain}/unfav`, {
          method: 'POST',
          cache: "no-cache",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify({"user_id": user_id, "property_id": gurasid})
        });
      }

    }
    else {
      user_fav[gurasid] = 1;
      if (user_id) {
        await fetch(`${api_domain}/fav`, {
          method: 'POST',
          cache: "no-cache",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify({"user_id": user_id, "property_id": gurasid, "user_email": user_email, "user_plan": user_plan})
        });
      }

    }
    return false;
  }

  function _init_widget_map() {
    var page_latlng;

    var styledMap = new google.maps.StyledMapType(map_google_styles, { name: "Styled Map" });

    var page_lat = property.geom.coordinates[1];
    var page_lng = property.geom.coordinates[0];

    page_latlng = new google.maps.LatLng(page_lat, page_lng);

    map = new google.maps.Map(document.getElementById('google-map'), {
      scrollwheel: false,
      navigationControl: true,
      disableDefaultUI: false,
      panControl: true,
      zoomControl: true,
      mapTypeControl: false,
      scaleControl: false,
      streetViewControl: false,
      overviewMapControl: false,
      fullscreenControl: false,
      rotateControl: false,
      zoom: 18,
      center: page_latlng,
      mapTypeControlOptions: {
        mapTypeIds: [google.maps.MapTypeId.ROADMAP, google.maps.MapTypeId.SATELLITE]
      }
    });

    map.mapTypes.set('map_style', styledMap);
    map.setMapTypeId('map_style');
    mapType = google.maps.MapTypeId.ROADMAP;

    var mapMarker_0 = new google.maps.Marker({
      position: page_latlng,
      title: property.address,
      icon: new google.maps.MarkerImage("http://io.imsstratus.com.au/upapp/app/images/marker_pin.svg"),
      map: map
    });

    markers.push(mapMarker_0);

  }

  let folio_ids = [];
  let folio_querystring;

  let suburb_profile = null;

  // Title search and plan (image) search used to check out through the WordPress
  // WooCommerce cart (items 920 / 5057) and an n8n workflow that called Hazlett.
  // They now post to this site's /api/title-search (src/routes/api/title-search),
  // which orders from Hazlett and emails the PDF via Postmark. TEST MODE for now:
  // no payment is captured, a confirmation slides down, and the PDF goes to the
  // test recipient configured on the server (TITLE_SEARCH_RECIPIENT).
  const PURCHASES_PAUSED = false;
  const PURCHASES_PAUSED_NOTICE = 'Title search, plan dealings and image search purchases are temporarily unavailable while we move to our new billing system. They will be back within the next few weeks.';
  let disable_title_search = PURCHASES_PAUSED;

  
  let legendDisplay = true;

  let ageData;
  let rentData;
  let mortgageData;
  let tenureData;
  let householdData;
  let ancestryData;
  let birthData;
  let weeklyIncomeData;

  $: if (property && property.census) {

    const censusObject = property.census[0];

    property = { ...property }; // Force reactivity

    const ageFilter = ([key, value]) => key.includes('age_') && !key.includes('mortgage');
    const rentFilter = ([key, value]) => key.includes('rent') && !key.includes('median') && !key.includes('tenure_');
    const mortgageFilter = ([key, value]) => key.includes('mortgage') && !key.includes('median') && !key.includes('tenure_');
    const tenureFilter = ([key, value]) => key.includes('tenure_');
    const householdFilter = ([key, value]) => key.includes('_households');
    const ancestryFilter = ([key, value]) => key.includes('ancestry_') && value !== null;
    const birthFilter = ([key, value]) => key.includes('country_of_birth_') && value !== null;
    const weeklyIncomeFilter = ([key, value]) => key.includes('_income') && key.includes('median');

    ageData = processChartVariables(censusObject, ageFilter);
    rentData = processChartVariables(censusObject, rentFilter);
    mortgageData = processChartVariables(censusObject, mortgageFilter);
    tenureData = processChartVariables(censusObject, tenureFilter);
    householdData = processChartVariables(censusObject, householdFilter);
    ancestryData = processChartVariables(censusObject, ancestryFilter);
    birthData = processChartVariables(censusObject, birthFilter);
    weeklyIncomeData = processChartVariables(censusObject, weeklyIncomeFilter);

  }

  let crimeCountObject = [];
  let yearsArray = [];
  let crimeRankObject = [];

  let lga = property.lga_name;

  if (property?.crime && lga) {
    // Filter for property crime entries matching LGA

    crimeCountObject = property.crime.property_crime[0]
      .filter(e => e.lga.toLowerCase() === lga.toLowerCase())
      .map(({ year, count, lga }) => {
        // Find corresponding violent crime count for year and LGA
        const violentCrimeEntry = property.crime.violent_crime[0]?.find(v => v.year === year && v.lga === lga);
        const violentCrimeCount = violentCrimeEntry ? violentCrimeEntry.count : 0;

        return {
          year,
          lga,
          propertyCount: count,
          violentCount: violentCrimeCount,
        };
      })
      .sort((a, b) => a.year - b.year);

    yearsArray = crimeCountObject.map(e => e.year);

    // alert(JSON.stringify(crimeCountObject));
  
  
    crimeRankObject = property.crime.property_crime[0]
      .filter(e => e.year == '2024')
      .map(({ lga, rank, year }) => {
          const violentCrimeRank = property.crime.violent_crime[0].find(e => e.lga === lga && e.year === year).rank;
          
          return { 
              lga,
              propertyRank: rank,
              violentRank: violentCrimeRank,
              year
          }
      });
  
  }


  onMount(async () => {

    const title_api_status_check = PURCHASES_PAUSED ? null : await fetch(`${api_domain}/title/check`, {
      method: 'GET',
      cache: "no-cache",
      headers: {"Content-Type": "application/json"},
    }).then(title_api_status_check => title_api_status_check.json()).catch(function(){});

    if (PURCHASES_PAUSED) {
      disable_title_search = true;
    }
    else if (title_api_status_check) {
      disable_title_search = true;
    }
    else {
      disable_title_search = false;
    }

    if (property) {
      
      if (property.suburbname) {

        let suburb_profile_url = `https://io.imsstratus.com.au/upapp/app/js/suburb-profile-short/${property.suburbname}.json`;

        try {
          const res = await fetch(suburb_profile_url);
          if (res.ok) {
            suburb_profile = await res.json();
          } else if (res.status !== 404) {
            throw new Error(`Failed to fetch: ${res.status}`);
          }
        } catch (error) {
          suburb_profile = null;
        }
      }

      if (property.property_description && property.property_description.match(/\,/)) {
      // console.log(property.property_description);
      let split_numbers = property.property_description.split(',');
      let actual_folio_number = split_numbers[split_numbers.length - 1];

      let last_number;
      if (actual_folio_number.match(/\//)) {
        let last_number_and_folio_number = actual_folio_number.split('/');
        actual_folio_number = last_number_and_folio_number[1];
        last_number = last_number_and_folio_number[0];
      }
      
      if (last_number) {
        for (let index = 0; index < (split_numbers.length - 1); index++) {
          const element = split_numbers[index].trim();
          if (parseInt(element)) {
            folio_ids = folio_ids.concat(element +  '/' + actual_folio_number.trim());
          }
          else {
            if (element.match(/\//) && element.match(/\s/)) {
              let cp_folios_and_number = element.split(/\s/);
              folio_ids = folio_ids.concat(cp_folios_and_number[0].trim());
              folio_ids = folio_ids.concat(cp_folios_and_number[1].trim() + '/' + actual_folio_number.trim());
            }
            else {
              folio_ids = folio_ids.concat(element);
            }
            
          }
        }
        // console.log(last_number.trim() +  '/' + actual_folio_number.trim());
        folio_ids = folio_ids.concat(last_number.trim() +  '/' + actual_folio_number.trim());
      }
      else {
        for (let index = 0; index < (split_numbers.length - 1); index++) {
          const element = split_numbers[index].trim();
          if (parseInt(element)) {
            folio_ids = folio_ids.concat(element +  ' ' + actual_folio_number.trim());
          }
          else {
            folio_ids = folio_ids.concat(element);
          }
        }
      }

    }
    else if (property.property_description) {
      folio_ids = folio_ids.concat(property.property_description);
    }

    window._folio_ids = folio_ids;
    folio_querystring = folio_ids.join(',');

    if (pdf_property) {

    }
    else {
      // _init_widget_map();
    }
    
  
    }



  });



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

  function roundToNearestTenth(number) {
    return Math.round(number * 10) / 10;
  }

  // "4.3:height" / "base_standard" -> "4.3: Height" / "Base Standard"
  function formatRuleKey(key) {
    if (!key) return '—';
    return String(key)
      .split(':')
      .map(part => part.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()))
      .join(': ');
  }

  // Summarise a rule's requirement, e.g. "FSR max 0.55:1". Effects are per-rule; clause_numeric
  // is clause-level (shared by every rule in the clause) so it's only a fallback.
  function formatRuleRequirement(rule) {
    const comparators = { min: 'min', max: 'max', eq: '=', no_more_than: '≤', no_less_than: '≥' };
    const fmt = (topic, comparator, value, unit) => {
      const cmp = comparators[comparator] || comparator || '';
      const u = unit && unit !== 'map' && unit !== 'ratio' ? ' ' + unit : '';
      return `${formatRuleKey(topic)} ${cmp} ${value}${u}`.trim();
    };
    const effects = Array.isArray(rule.effects) ? rule.effects : [];
    if (effects.length) {
      return effects.map(e => e.value ? fmt(e.topic, e.comparator, e.value, e.unit) : formatRuleKey(e.topic)).join('; ');
    }
    const nums = Array.isArray(rule.clause_numeric) ? rule.clause_numeric : [];
    if (nums.length) {
      return nums.map(n => fmt(n.metric, n.comparator, n.value, n.unit)).join('; ');
    }
    return '—';
  }


  let hiddenMapsVisible = false;
  
  function _handle_window_keydown(event) {
	  // let keyCode = event.keyCode;
	  let key = event.key;

    if (key == 'Enter') {
      
    }
    else if (key == 'Escape') {
      
    }
    else if (event.ctrlKey && event.shiftKey && key == 'D') {
      if (use_debug) {
        use_debug = false;
      }
      else {
        use_debug = true;
      }
    }
    else if (event.ctrlKey && event.shiftKey && key == 'M') {
      hiddenMapsVisible = !hiddenMapsVisible;
      // Toggle visibility of all hidden map containers
      Object.keys(hiddenMaps).forEach(key => {
        const container = document.getElementById(`mapbox-map-planning-constraint-${key}`);
        if (container) {
          if (hiddenMapsVisible) {
            container.style.cssText = 'position: fixed; top: 0; left: 0; width: 800px; height: 600px; z-index: 1000; visibility: visible;';
            hiddenMaps[key].resize();
          } else {
        container.style.cssText = 'position: fixed; top: -9999px; left: -9999px; width: 800px; height: 600px; visibility: visible;';
          }
        }
      });
    }
  }

  let show_plan_dealing_popup = false;

  // Purchase confirmation slide-down (title or image search).
  let purchase_confirm = null; // { product: 'title'|'image', identifiers: [] }
  let purchase_busy = false;
  let purchase_result = null;  // response of a successful order
  let purchase_error = null;
  const PURCHASE_PRICE_AUD = 25;

  function _open_purchase_confirm(product, identifiers) {
    purchase_result = null;
    purchase_error = null;
    purchase_confirm = { product, identifiers: [...new Set(identifiers.map(s => String(s).trim()).filter(Boolean))] };
  }

  function _handle_title_search(event) {
    event.preventDefault();
    if (disable_title_search) return;
    if (purchase_confirm && purchase_confirm.product === 'title') { purchase_confirm = null; return; }
    show_plan_dealing_popup = false;
    _open_purchase_confirm('title', folio_ids);
  }

  function _close_purchase_confirm() {
    purchase_confirm = null;
    purchase_error = null;
  }

  async function _confirm_purchase() {
    if (!purchase_confirm || purchase_busy) return;
    purchase_busy = true;
    purchase_error = null;
    try {
      const res = await fetch('/api/title-search', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product: purchase_confirm.product,
          identifiers: purchase_confirm.identifiers,
          address: property?.address,
          propid: property?.propid
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || `Request failed (${res.status})`);
      purchase_result = data;
      if (purchase_confirm.product === 'image') { image_search_selected = []; show_plan_dealing_popup = false; }
      purchase_confirm = null;
    } catch (e) {
      purchase_error = e.message || 'Something went wrong';
    } finally {
      purchase_busy = false;
    }
  }

  function _handle_enter_dealings(event) {
    if (PURCHASES_PAUSED) { event.preventDefault(); return; }
    event.preventDefault();
    show_plan_dealing_popup = !show_plan_dealing_popup;
    return false;
  }

  function _handle_purchase_plan_dealings(event) {
    if (PURCHASES_PAUSED) { if (event) event.preventDefault(); return; }
    event.preventDefault();
    
    if (! image_search_selected.length) {
      return false;
    }
    
    _open_purchase_confirm('image', image_search_selected);
    return false;
  }

  function convertToDDMMYYYY(dateStr) {
    // Extract year, month, and day parts from the string
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);

    // Format as dd/mm/yyyy
    return `${day}/${month}/${year}`;
  }

  async function _update_avm(event) {
    // let gurasid;
    // if (event.currentTarget) {
    //   gurasid = event.currentTarget.getAttribute('data-id');
    // }
    
    if (user_id && property && property.address && property.estimated_price) {
      await fetch(`${api_domain}/address/avm/update`, {
        method: 'POST',
        cache: "no-cache",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({address: property.address, estimated_price: parseInt(property.estimated_price)})
      }).then(crm_response => crm_response.json()).catch(function(){});
    }
  }

  // ---- My Pipeline (CRM) controls shown in the property detail panel ----
  export let onEmail = null;
  export let onSendMail = null;

  // Mail template (Edit Mail) — values come from +page; the Tiptap editor saves itself.
  export let user_template = '';
  export let from_first_name = null;
  export let from_last_name = null;
  export let from_company_name = null;
  export let from_address_1 = null;
  export let from_address_2 = null;
  export let from_postcode = null;
  export let from_city = null;
  export let from_state = 'NSW';

  let show_mail_template = false;

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

  let pipelineStatus = '';
  let pipelineComments = '';
  let _pipelineFor = null;
  $: if (property && property.gurasid && property.gurasid !== _pipelineFor) {
    _pipelineFor = property.gurasid;
    pipelineStatus = (user_fav && user_fav[property.gurasid] && user_fav[property.gurasid].status) ? user_fav[property.gurasid].status : '';
    pipelineComments = (user_fav && user_fav[property.gurasid] && user_fav[property.gurasid].comments) ? user_fav[property.gurasid].comments : '';
  }

  // Create the CRM/favourite record on first interaction so a pipeline status can be
  // saved without the property having been explicitly favourited first.
  function ensurePipelineEntry() {
    const id = property.gurasid;
    if (!user_fav[id]) {
      user_fav[id] = {
        status: '', comments: '', emailed: false, mailed: false,
        user_id, property_id: id, user_email, user_plan, user_first_name, user_last_name
      };
      user_fav = user_fav;
    }
  }

  async function _update_crm() {
    const gurasid = property.gurasid;
    if (user_id && gurasid && user_fav[gurasid]) {
      await fetch(`${api_domain}/crm`, {
        method: 'POST',
        cache: "no-cache",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(user_fav[gurasid])
      }).then(crm_response => crm_response.json()).catch(function(){});
    }
  }

  function _handle_status_change() {
    ensurePipelineEntry();
    user_fav[property.gurasid].status = pipelineStatus;
    user_fav = user_fav;
    _update_crm();
  }

  function _handle_comments_change() {
    ensurePipelineEntry();
    user_fav[property.gurasid].comments = pipelineComments;
    user_fav = user_fav;
    _update_crm();
  }

  function _handle_pipeline_email(e) {
    e.preventDefault();
    if (onEmail) onEmail(property);
  }

  function _handle_pipeline_mail(e) {
    e.preventDefault();
    ensurePipelineEntry();
    user_fav = user_fav;
    if (onSendMail) onSendMail(property);
  }

</script>


<style>
  .subscribe-gate { display: flex; align-items: center; justify-content: center; min-height: 60vh; padding: 2rem; }
  .subscribe-gate-inner { max-width: 32rem; text-align: center; }
  .subscribe-gate-eyebrow { font-family: var(--font-mono); font-size: 11px; letter-spacing: .14em; text-transform: uppercase; color: var(--up-c-5c2687); margin-bottom: .75rem; }
  .subscribe-gate h2 { font-size: 22px; font-weight: 600; margin-bottom: .75rem; }
  .subscribe-gate p { color: var(--up-c-555555); line-height: 1.5; }
  .subscribe-gate-btn { display: inline-block; margin-top: 1.25rem; background: var(--up-c-5c2687); color: var(--up-c-ffffff); border-radius: 999px; padding: .8rem 1.5rem; font-weight: 600; text-decoration: none; }
  .subscribe-gate-btn:hover { filter: brightness(1.1); }
  .subscribe-gate-note { margin-top: .9rem; font-size: 12px; color: var(--up-c-888888); }

  .planning-rules-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.85rem;
  }

  .planning-rules-table th {
    text-align: left;
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 0.5rem 0.75rem;
    border-bottom: 2px solid var(--up-c-dddddd);
    white-space: nowrap;
  }

  .planning-rules-table td {
    padding: 0.5rem 0.75rem;
    border-bottom: 1px solid var(--up-c-eeeeee);
    vertical-align: top;
  }

  .planning-rules-epi {
    display: block;
    font-size: 0.7rem;
    color: var(--up-c-888888);
  }


  a {
    text-decoration: none;
  }

  h1, 
  h2, 
  h3, 
  h4, 
  h5, 
  h6 {
    color: var(--up-c-31144d);
    font-family: var(--font-sans);
  }

  h4, .h4 {
    font-size: var(--font-family);
  }

  @media all and (min-width: 60em) {  
    h4, .h4 {
      font-size: 1.25rem;
      line-height: 0.9em;
      color: var(--up-c-31144d) !important;
    }

    :global(.app.mapview.viewing-property h4) {
      font-size: 0.7125rem;
    }

    :global(.app.mapview.viewing-property .span-info h4 span), 
    :global(.app.mapview.viewing-property h4) {
      font-weight: 400;
      color: var(--up-c-31144d) !important;
    }
  }

  h6 {
    color: var(--up-c-5c2587);
  }

  h1 {
    font-size: 1.5rem;
    line-height: 0.95em;
  }

  @media all and (min-width: 60em) {  
    h1 {
      font-size: 1rem;
      line-height: 1em;
    }
  }

  h2 {
    font-size: 5em;
    color: var(--up-c-31144d);
  }

  h3 {
    color: var(--up-c-31144d);
  }

  @media all and (min-width: 60em) {  
    h3 {
      font-size: 1.75rem;
    }
  }

  h3 {
    font-size: 1.5rem;
  }
  @media all and (min-width: 60em) {  
    h3 {
      font-size: 1.5rem;
    }
  }

  .btn-page.btn-active {
    
  }

  .pagination-container,
  p, span, ul, ul li {
    color: var(--up-c-31144d) !important;
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
    padding: calc(0.75 * var(--padding-unit)) calc(1.25 * var(--padding-unit)); 
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

  input[type="text"] {
    font-size: 0.6875rem;
		border: 1px solid var(--up-c-cccccc);
		border-radius: 0.4em;
		placeholder-color: var(--up-c-2a1b1b);
    padding: 1em;
    height: 42px;
    width: 100%;
  }
  input[type="text"]:focus, input[type="text"]:active {
    box-shadow: none;
    outline: none;
  }

  label {
    font-size: 0.75rem;
    padding-right: 0.5em;
  }

  code {
    font-size: 0.6875rem;
    white-space: wrap;
  }

  hr {
    margin: 1em 0;
    height: 1px;
    border: none;
    border-top: 1px solid var(--up-c-f1e9f7);
  }

	:global(.themed) {
    --font-size: 0.6875rem;
		--border: 1px solid var(--up-c-f1e9f7);
		--border-radius: 0.4em;
		--placeholder-color: var(--up-c-2a1b1b);
	}
  
  :global(.multi-item) {
    outline: none !important;
  }


  .link-back, .link-back:visited {
    text-decoration: none;
    color: var(--up-c-31144d);
    font-size: 0.7125rem;
    line-height: 1em;
    font-family: var(--font-family);
  }

  .link-back:hover {
    color: var(--up-c-5c2587); 
  }

  .span-info {
    color: var(--up-c-5c2587);
    font-size: 1.125rem;
    line-height: 1em;
    font-family: var(--font-family);
  }

  .span-info span {
    color: var(--up-c-5c2587);
    font-size: 1.125rem;
    line-height: 1.125rem;
    font-weight: 500;
  }

  :global(.span-label,
  .span-label h4 span) {
    color: var(--up-c-aaaaaa) !important;
    font-size: 0.52rem;
    font-weight: 600;
    text-transform: uppercase;
  }


  h5 {
    font-size: 1rem;
    line-height: 1.4em;
  }

  button {
    padding: 1.5em 2em;
    background-size: 600% 100%;
    border: 1px solid var(--up-c-ffffff);
    border-radius: 100em;
    font-weight: 400;
    font-size: 0.6875rem !important;
    line-height: 0em;
    color: var(--up-c-111111);
    border: 0;
    height: 32px;
    width: 24px;
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
    background-color: var(--up-c-f8f8f8);
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

  .border-primary {
    border: 1px solid var(--up-c-5c2587);
  }

  .select-container select {
    font-size: 0.7125rem;
    border: 1px solid var(--up-c-cccccc);
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
    color: var(--up-c-5c2587);
    padding-left: 0.4em;
    padding-right: 2.4em;
    box-sizing: border-box;
    background-color: var(--up-c-ffffff-a40);
  }

  .select-container select:focus {
    outline: none;
    box-shadow: none;
  }

  .select-container select + .shift-up-more {
    transform: translateY(-50%);
  }

  .select-container .select-arrow {
    width: 22px;
  }

  .mail-template-overlay {
    position: fixed;
    inset: 0;
    background-color: var(--up-c-ffffff-a40);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    z-index: 1000;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 2rem 1rem;
    overflow-y: auto;
  }

  .mail-template-modal {
    background: var(--up-c-ffffff);
    border-radius: 0.6em;
    padding: 1.5em;
    width: 100%;
    max-width: 760px;
    box-shadow: 0 10px 40px var(--up-c-000000-a25);
  }
  
  @media all and (min-width: 60em) {  
    .app.search-app {
      /* height: calc(100vh); */
    }
  }

  .filter-container {
    height: calc(100vh - 4em);
    overflow: auto;
    padding: 0 1em;
    background-color: var(--up-c-fafaff); 
    border-radius: 0.6em;
  }

  @media all and (min-width: 60em) {  
    .filter-container {
      height: calc(100vh - 4em);
      /* background-color: red; */
    }
  }

  @media all and (max-width: 60em) {  
    .search-result-container {
      margin-top: 1em;
    }
  }

  @media all and (min-width: 60em) {  
    .search-result-container {
      height: calc(100vh - 11em);
      overflow: scroll;
    }
  }

  .pagination-container {
    padding-top: 0.5em;
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
    margin-right: 0.5em;
    margin-top: 0.5em;
  }

  .checkbox-container:hover label {
    background-color: var(--up-c-f1e9f7);
    filter: brightness(1.06); 
  }

  .checkbox-container:has(input:checked) label {
    background-color: var(--up-c-f1e9f7);
  }

  .btn {
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

  .btn:hover {
    background-color: var(--up-c-f1e9f7-a20);
    filter: brightness(1.06); 
  }

  .btn.active {
    background-color: var(--up-c-f1e9f7);
  }

  .btn.btn-search {
    background-color: var(--up-c-5c2587);
    color: var(--up-c-ffffff);
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

  .btn-save-search {
    font-size: 0.5685rem;
    padding: calc(0.35 * var(--padding-unit)) calc(0.3 * var(--padding-unit));
    width: 80px;
    text-align: center;
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

  :global(.multi-item-clear svg) {
    color: var(--up-c-ffffff) !important; 
    width: 10px !important;
    height: 10px !important;
  }

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
      opacity: 0.7;
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

  /* Style the custom checkbox as a toggle */
  .checkbox-group input[type="checkbox"] + label::before {
    content: "";
    width: 1em;
    height: 1em;
    font-size: 1rem;
    color: var(--up-c-82669d);
    background-color: currentColor;
    -webkit-mask: url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><rect x='2' y='6' width='20' height='12' rx='6'/><circle cx='8' cy='12' r='2'/></svg>") no-repeat center / contain;
    mask: url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><rect x='2' y='6' width='20' height='12' rx='6'/><circle cx='8' cy='12' r='2'/></svg>") no-repeat center / contain;
    cursor: pointer;
    margin-top: 5.5px;
    top: 0;
    position: absolute;
    right: 0;
  }

  /* Active toggle: solid pill with punched-out knob (lucide has no filled toggle glyph) */
  .checkbox-group input[type="checkbox"]:checked + label::before {
    content: "";
    width: 1em;
    height: 1em;
    padding: 0;
    margin-top: 5.5px;
    background-color: var(--up-c-31144d);
    -webkit-mask: url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path fill-rule='evenodd' d='M8 6h8a6 6 0 0 1 0 12H8A6 6 0 0 1 8 6Zm8 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z'/></svg>") no-repeat center / contain;
    mask: url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path fill-rule='evenodd' d='M8 6h8a6 6 0 0 1 0 12H8A6 6 0 0 1 8 6Zm8 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z'/></svg>") no-repeat center / contain;
  }

  .checkbox-group input[type="checkbox"] + label {
    width: 100%;
  }

  .toggle-fav i {
    color: var(--up-c-5ee7ad);
    font-size: 1.5rem;
  }

  a.generate-pdf {
    margin-right: 1em;
  }

  a.generate-pdf i {
    color: var(--up-c-5c2587);
    font-size: 1.45rem;
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

  .banner {
    overflow: hidden;
    object-fit: 50% 100%;
    position: relative;
    width: 100%;
    height: 100%;
  }

  /* 
  :global(.banner:has(img[src*="gif"])::after) {
    content: "\e064";
    font-family: "lucide";
    font-weight: 100;
    font-size: 48px;
    color: var(--up-c-f8f8f8);
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  } 
  */

  @media all and (max-width: 60em) {  
    .property-container {
      margin-top: 1.5em;
    }
  }

  :global(.app.mapview.viewing-property .banner) {
    max-height: auto;
    min-height: auto;
    aspect-ratio: 16/9;
    height: 180px;
  }

  @media all and (min-width: 60em) {  
    
    :global(.banner) {
      height: calc(100vh - 13em);
      max-height: 650px;
      min-height: 500px;
      width: 100%;
      overflow: hidden;
    }

    :global(.app.listview .banner:has(img[src*="gif"])) {
      height: 150px;
      max-height: 150px;
      min-height: 150px;
    }

    :global(.app.mapview.viewing-property .banner) {
      max-height: auto;
      min-height: auto;
      aspect-ratio: 16/9;
      height: 230px;
    }

    :global(.app.mapview.viewing-property .property-other-container) {
      /* height: calc(100vh - 230px - 300px); */
      overflow-y: scroll;
      overflow-x: hidden;
      max-height: calc(100vh - 450px);
    }

    :global(.app.mapview.viewing-property .property-container h1) {
      font-size: 1.125rem;
    }

    :global(.app.mapview.viewing-property .property-container .property-details-container.padding-top-wide.padding-left-wide.padding-right-wide.padding-bottom) {
      padding: 0;
      background: none;
    }
  
    :global(.viewing-property .property-container) {
      margin-top: -82px;
    }

    :global(.viewing-property .property-container.property-signup-container) {
      margin-top: 1em !important;
    }

    :global(.app.mapview.viewing-property .property-container) {
      margin-top: 1em;
    }

    :global(.app.mapview.viewing-property .banner-container:has(img[src*="gif"]) + .property-container) {
      margin-top: 2em;
    }

    :global(.app.mapview.viewing-property .property-container.padding-left-widest.padding-right-widest) {
      padding-left: 1em;
      padding-right: 1em;
    }

    :global(.pdf-property .property-container) {
      margin-top: 20px;
    }
    
  }

  .property-details-container {
    backdrop-filter: blur(32px);
  }


  :global(.app.mapview.viewing-property .property-details-container) {
    background-color: var(--up-c-ffffff-a00)  !important;
    backdrop-filter: none !important;
  }

  .image-search-container {
    background-color: var(--up-c-ffffff-a70);
    border-radius: 8px;
    box-shadow: 0 0 12px 4px var(--up-c-010101-a10);
    padding: 1em;
    position: relative; /* for positioning the triangle */
  }

  .purchase-confirm-container {
    background-color: var(--up-c-ffffff-a70);
    border-radius: 8px;
    box-shadow: 0 0 12px 4px var(--up-c-010101-a10);
    padding: 1em;
    width: 100%;
  }
  .purchase-address { opacity: .75; margin: 0 0 .6em; }
  .purchase-lines { list-style: none; margin: 0 0 .8em; padding: 0; }
  .purchase-lines li { display: flex; justify-content: space-between; padding: .3em 0; border-bottom: 1px solid var(--up-c-010101-a10); }
  .purchase-lines li.purchase-total { border-bottom: 0; font-weight: 600; }
  .purchase-note { font-size: .85em; opacity: .8; margin: 0; }
  .purchase-error { color: #c0392b; margin: .5em 0 0; }
  .purchase-success p { margin: 0 0 .6em; }

  .title-search-disable-container {
    margin-top: 1em;
    background-color: var(--up-c-ffffff-a70);
    border-radius: 8px;
    box-shadow: 0 0 12px 4px var(--up-c-010101-a10);
    padding: 1em;
    position: relative; /* for positioning the triangle */
  }

  /* Triangle pointer */
  .popup-triangle {
    position: absolute;
    top: -8px;          /* place above the container */
    right: 20%;          /* 20% from the right edge (adjust to get 80% from left) */
    width: 0;
    height: 0;
    border-left: 10px solid transparent;
    border-right: 10px solid transparent;
    border-bottom: 12px solid var(--up-c-ffffff);
  }
  


  .info-type {
    font-size: 0.7125rem;
    color: var(--up-c-aaaaaa);
  }

  :global(.app.mapview.viewing-property .info-type) {
    font-size: 0.56rem;
  }

  .link {
    color: var(--up-c-31144d);
    text-decoration: none;
  }

  .link:hover {
    color: var(--up-c-5c2587);
  }

  @media all and (min-width: 60em) {
    .right-desktop {
      text-align: right;
    }
  }
  
  code > pre {
    font-family: monospace;
    font-size: 0.6875rem !important;
  }

  

  @media print {
    :global(.pdf-property .print-break) {
      break-after: page;
      page-break-after: always;
    }
  }


  .debug-container {
    background-color: var(--up-c-f1f1f1);
  }

  .debug-container:not(.debug) {
    display: none;
  }

  .custom-tags-input-container :global(ul.svelte-tags-input-matchs li::before) {
		content: "";
		width: 0;
		margin-left: 0;
		margin-right: 0;
	}

	.custom-tags-input-container :global(.svelte-tags-input) {
		margin-top: 0;
    padding-top: 0;
		height: auto;
	}

  .custom-tags-input-container :global(.svelte-tags-input:active) {
		outline: none;
    border: 0;
	}

  .custom-tags-input-container :global(.svelte-tags-input::placeholder) {
		color: var(--up-c-aaaaaa);
    font-size: 0.7125rem;
	}
	
	.custom-tags-input-container :global(.svelte-tags-input-tag),
	.custom-tags-input-container :global(.svelte-tags-input-matchs) {
		font-size: 0.7125rem !important;
		padding-left: 0.5em;
		padding-right: 0.5em;
		padding-bottom: 0;
		margin-top:0;
		border-radius: 4px !important;
    z-index: 1;
	}

	.custom-tags-input-container :global(.svelte-tags-input-tag) {
		line-height: 1.3em;
    margin-right: 3px;
    background: var(--up-c-5c2587) !important;
	}

	.custom-tags-input-container :global(.svelte-tags-input-tag-remove) {
		margin-left: 4px;
		margin-top: -1px;
		margin-bottom: 2px;
	}

	.custom-tags-input-container :global(.svelte-tags-input-layout) {
		border-radius: 4px;
		border-width: 1px;
		border-style: solid;
    border-color: var(--up-c-5c2587) !important;
		background-color: transparent;
		padding-bottom: 10px;
		padding-top: 10px;
    background-color: transparent;
    border-radius: 4px !important;
    outline: none !important;
	}

  .custom-tags-input-container :global(.svelte-tags-input-layout input) {
    font-size: 0.7125rem;
    font-family: var(--font-family);
    font-weight: 300 !important;
    color: var(--up-c-31144d) !important;
  }
    

  .custom-tags-input-container :global(.svelte-tags-input-layout:hover),
  .custom-tags-input-container :global(.svelte-tags-input-layout:active) {
		border-color: var(--up-c-31144d) !important;
    border-radius: 4px;
		border-width: 1px;
		border-style: solid;
    outline: none !important;
	}

  .custom-tags-input-container :global(.svelte-tags-input-matchs) {
		background: var(--up-c-5c2587);
		border: none;
		padding-top:0.5em;
		padding-bottom:0.5em;
    z-index: 2;
	}
  
  .btn-close {
    text-decoration: none;
    position: absolute;
    top: 8px;
    right: 8px;
    width: 18px;
    height: 18px;
    aspect-ratio: 1/1;
    background: var(--up-c-ffffff-a70); /* 50% white */
    color: var(--up-c-5c2587);
    border: none;
    border-radius: 50%;
    font-size: 1rem !important;
    line-height: 1;
    font-weight: 300;
    text-align: center;
    cursor: pointer;
    transition: filter 0.2s ease;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 0;
    user-select: none;
  }

  .btn-close:visited {
    color: var(--up-c-5c2587); /* purple for visited too */
  }

  .btn-close:hover {
    filter: brightness(1.03);
    background: var(--up-c-ffffff); /* 50% white */
  }

  .flex-gap {
    gap: 0.5em;
  }

  :global(.app.mapview.viewing-property .banner:has(img[src*="gif"])) {
    display: none;
  }


  :global(.app.mapview.viewing-property .property-other-container .padding-top-wider) {
    padding-top: 1em;
  }

  :global(.app.mapview.viewing-property .property-other-container .padding-bottom-wider) {
    padding-bottom: 1em;
    padding-left: 1em;
    padding-right: 1em;
  }

  /* The design controls row sits outside .padding-bottom-wider, so it needs the
     same 1em gutter to line up with the sliders / export panel below it. */
  :global(.app.mapview.viewing-property .property-other-container) .design-controls {
    padding-left: 1em;
    padding-right: 1em;
  }

  .collapsible-title {
    position: relative;
    cursor: pointer;
    /* Change cursor to pointer */
  }

  /* In list view the collapsible sections sat flush against the panel edges
     (the OVERVIEW block carries its own padding classes; these don't). */
  :global(.app.listview) .property-other-container .collapsible-container {
    padding-left: 16px;
    padding-right: 16px;
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

  .pdf-property .collapsible-container:not(:has(div.animate-fade-out)) .collapsible-title::after {
      content: "";
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


  @media all and (min-width: 60em) {  
    .app.mapview .flex.wrap .half {
      width: 100%;   
      max-width: 100%; 
    }

    .permissibleuse-container .flex.wrap-half .one-quarter {
      width: 50%;
      max-width: 50%;
    }
  }

  .bullet-paragraph {
    display: block;
    position: relative;
    padding-left: 24px; /* space for icon */
    margin: 0;
    text-indent: 0;
    line-height: 1.4;
  }

  .bullet-paragraph i {
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 16px; /* fixed width */
    text-align: center;
  }

  .map-view-detail .property-details-container .flex.flex-static .one-sixth {
    min-width: 80px;
    margin-top: 0;
  }

  .map-view-detail .property-details-container .flex.flex-static .one-sixth .padding-bottom {
    padding-bottom: 0;
  }

  .map-view-detail .property-details-container .flex.flex-static .one-sixth a.generate-pdf {
    margin-right: 0;
  }

  .map-view-detail .property-details-container .flex.flex-static .one-sixth a i {
    font-size: 1.125rem !important;
  }

  .map-view-detail .property-details-container .flex.flex-static .one-sixth div.pdf-popover-menu a i {
    font-size: 0.725rem !important;
  }

  .da-container {
    color: var(--up-c-31144d) !important;
    font-size: 0.7125rem;
    font-family: var(--font-family);
  }

  .da-container hr {
    border-top: 1px solid var(--up-c-aaaaaa-a40);
  }


  .da-container .circle {
    width: 8px;
    height: 8px;
    display: inline-block;
    margin-right: 6px;
  }

  i.circle {
    z-index: 2;
    text-transform: none;
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
    padding: 0.055em 0.6em 0em 0.6em;
    transform: translateY(-1px);
    font-size: 0.5rem;
  }

  i.circle:hover {
    background-color: var(--up-c-31144d-a93);
  }

  .pdf-popover-menu {
    position: absolute;
    top: calc(100% + 10px);
    right: 0px;
    background: var(--up-c-ffffff);
    border-radius: 6px;
    box-shadow: 0 4px 12px var(--up-c-000000-a15);
    padding: 0.5em 0;
    min-width: 0px;
    z-index: 100;
    padding: 0.75em;
  }

  .pdf-popover-triangle {
    position: absolute;
    top: -8px;
    right: 20px;
    width: 0;
    height: 0;
    border-left: 8px solid transparent;
    border-right: 8px solid transparent;
    border-bottom: 8px solid var(--up-c-ffffff);
  }

  :global(.app.mapview.viewing-property .pdf-popover-menu) {
    right: -10px;
  }

  :global(.app.mapview.viewing-property .pdf-popover-triangle) {
    right: 10px;
  }

  .popover-item {
    display: block;
    padding: 0.5em 1em;
    color: var(--up-c-31144d);
    text-decoration: none;
    font-size: 0.7125rem;
    font-family: var(--font-family);
    transition: background-color 0.2s;
    text-align: left;
    background-color: var(--up-c-ffffff);
    white-space: nowrap;
  }

  .popover-item i {
    margin-right: 0.5em;
    text-align: center;
    color: var(--up-c-5c2587);
    font-size: 0.6875rem !important;
  }

  .popover-item:hover {
    background-color: var(--up-c-f1e9f7);
    color: var(--up-c-5c2587);
  }

</style>

<svelte:window on:keydown={_handle_window_keydown}/>

<div class:pdf-property={pdf_property} class:visible={mapview_viewing_property} class:map-view-detail={! use_listview}>

  {#if !pdf_property}
    <div class="banner-container relative">
      <div class="banner dark-overlay-lightest">
        <!-- svelte-ignore a11y-missing-attribute -->
        <img on:error={handleBannerImageError} class="cover width-100 height-100" loading="lazy" src={banner_src}/>
      </div>
    <!-- Close button -->
      <a class="btn-close" aria-label="Close banner" href="?" on:click|preventDefault={onAction}>&times;</a>
    </div>
  {/if}

  {#if is_logged_in && !has_access}
    <div class="row property-container property-signup-container subscribe-gate">
      <div class="subscribe-gate-inner">
        <p class="subscribe-gate-eyebrow">Subscription required</p>
        <h2>{property?.address} {property?.postcode || ""}</h2>
        <p>You can search without a subscription. Planning controls, permissible uses, yield and feasibility for this property need an active plan.</p>
        <a class="subscribe-gate-btn" href={renew_url}>Subscribe to see property details</a>
        <p class="subscribe-gate-note">Payment is handled by Stripe. Your existing login stays the same.</p>
      </div>
    </div>
  {:else if is_logged_in}
    <div class="row property-details-container padding-top padding-left padding-right padding-bottom">
      <div class="{mapview_viewing_property ? 'flex flex-static': 'flex flex-static  padding-bottom'}">
        <div class="{mapview_viewing_property ? 'padding-top-thinner padding-bottom': ''} full">
          <h1>{property?.address} {property?.postcode || ""}</h1>
        </div>
        <div class="one-sixth row right padding-right"  class:hide={pdf_property}>

          {#if is_logged_in}
          <div class="pdf-popover-container relative" style="display:inline-block;">
            <a class:unclickable={generating_pdf} class="generate-pdf" href="?" on:click|preventDefault={() => show_pdf_popover = !show_pdf_popover} title="PDF Options">
              <i class=" {generating_pdf ? 'icon-loader-circle icon-spin': 'icon-file-down'}"></i>
            </a>
            {#if show_pdf_popover}
              <!-- svelte-ignore a11y-click-events-have-key-events -->
              <div class="pdf-popover-menu" transition:fade>
                <div class="pdf-popover-triangle"></div>
                <div class="flex pdf-popover-actions">
                  <a href="?" class="btn popover-item" data-address="{property.address} {property?.postcode || ""}" data-id="{property.gurasid}" on:click={(e) => { show_pdf_popover = false; _generate_pdf(e); }}>
                    <i class=" icon-download"></i> <span>Download</span>
                  </a>
                  <a href="?" class="btn popover-item" on:click|preventDefault={() => { show_pdf_popover = false; show_pdf_builder = true; }}>
                    <i class=" icon-settings"></i> <span>Customise</span>
                  </a>
                </div>
              </div>
            {/if}
          </div>
          {/if}

          <a class="toggle-fav {is_logged_in ? '': 'unclickable'}" data-id="{property.gurasid}" href="?" on:click={_toggle_fav}>
            {#if property.gurasid && user_fav.hasOwnProperty(property.gurasid)}
              <i class="icon-star star-checked"></i>
            {:else}
              <i class=" icon-star"></i>
            {/if}
          </a>
        </div>
        
      </div>
      
      <div class="{mapview_viewing_property ? '': 'flex wrap padding-bottom padding-top'}">
        
        {#if pdf_property}
          <div class="one-third aspect-ratio-16x9 dark-overlay-lightest border-rounder relative">
            <!-- svelte-ignore a11y-missing-attribute -->
            <img on:error={handleImageError} class="border-round" src={streetViewUrl(property)}/>
          </div>
        {/if}
        

        <div class="three-fifth padding-top padding-mobile">
          <div class="span-info flex wrap-half padding-desktop" class:padding-left={pdf_property}>
            {#if property.estimated_price && !pdf_property}
              <div style="margin-right:1.3em;" class="">
                <div class="span-label"></div>
                <h4>
                  <i class=" icon-dollar-sign"></i>
                  {#if is_logged_in && user_email && user_email.match('@urbanperspectives.com.au')}
                    {#if is_editing_price }
                      <span contenteditable bind:innerText={property.estimated_price} on:blur={_update_avm}></span> 
                    {:else}
                      <a href="?" on:click|preventDefault={() => is_editing_price = !is_editing_price}>{formatNiceCurrency(property.estimated_price)}</a>
                    {/if}
                  {:else}
                    {formatNiceCurrency(property.estimated_price)}
                  {/if}
                </h4>
              </div>
            {/if}
            {#if property.no_of_beds}<div style="margin-right:1.3em;" class=""><div class="span-label"></div><h4><i class=" icon-bed-double"></i> {property.no_of_beds}</h4></div>{/if}
            {#if property.no_of_baths}<div style="margin-right:1.3em;" class=" padding-top padding-mobile"><div class="span-label"></div><h4><i class=" icon-shower-head"></i> {property.no_of_baths}</h4></div>{/if}
            {#if property.no_of_cars}<div style="margin-right:1.3em;" class=" padding-top padding-mobile"><div class="span-label"></div><h4><i class=" icon-car"></i> {property.no_of_cars}</h4></div>{/if}
            {#if property.walkable_score}<div style="margin-right:1.3em;" class=" padding-top padding-mobile"><div class="span-label"></div><h4 aria-label="Walk Score" data-balloon-pos="right"><i class=" icon-person-standing"></i> {property.walkable_score}</h4></div>{/if}
          </div>
        </div>

        {#if !pdf_property}
        <div class="{mapview_viewing_property ? 'padding-top': ''} two-fifth">
          <div class="row {mapview_viewing_property ? '': 'right'}">
            <div class="flex flex-gap">
              <a style="width: 100%;" class:unclickable={disable_title_search} class:full={mapview_viewing_property} class:active={purchase_confirm?.product === 'title'} href="?" on:click={_handle_title_search} class="btn center"><i class=" {purchase_confirm?.product === 'title' ? 'icon-x' : 'icon-file-text'}"></i> TITLE SEARCH</a>
              <a style="width: 100%;"class:unclickable={disable_title_search} class:full={mapview_viewing_property} target="_parent" href="?" class="btn center" on:click={_handle_enter_dealings}><i class=" icon-building"></i> PLAN DEALINGS {#if show_plan_dealing_popup}<i class=" icon-x"></i>{/if}</a>
            </div>

            <!-- While purchases are paused the buttons are simply greyed out (class unclickable);
                 the callout only appears for the upstream-maintenance case. -->
            {#if disable_title_search && !PURCHASES_PAUSED}
              <div class="three-fifth title-search-disable-container row right">
                <div class="left">
                  <p><i class=" icon-triangle-alert"></i> {PURCHASES_PAUSED ? PURCHASES_PAUSED_NOTICE : 'Title and Plan Dealings Purchase are currently unavailable due to scheduled maintenance by our upstream service provider.'}</p>
                </div>
                <div class="popup-triangle"></div>
              </div>
            {/if}

            <div class="flex flex-gap padding-top-thinner">
              <div class="full" style="width: 100%;">
                <a class="btn center" class:active={is_yielding} style="width: 100%;" href="?" on:click|preventDefault={() => { is_yielding = !is_yielding; if (is_yielding) { is_designing = false; } }} title="Yield Calculator Mode">
                  <i class=" {is_yielding ? 'icon-x': 'icon-calculator'}"></i> YIELD CALCULATOR
                </a>
              </div>
              <div class="full" style="width: 100%;">
                <a class="btn center" class:active={is_designing} style="width: 100%;" href="?" on:click|preventDefault={() => { 
                  is_designing = !is_designing; 
                  if (is_designing) {
                    is_yielding = false;
                    use_listview = false;
                    mapview_viewing_property = true; 
                    if (window.mapboxMap && property?.geom?.coordinates) {
                      window.mapboxMap.flyTo({
                        center: property.geom.coordinates,
                        zoom: 19
                      });
                      setTimeout(function(){
                        window.mapboxMap.resize()
                      }, 100);
                    }
                  } 
                }} title="Design Mode">
                  <i class=" {is_designing ? 'icon-x': 'icon-box'}"></i> DESIGN
                </a>
              </div>
            </div>
            
            {#if show_plan_dealing_popup}
            <div class="padding-top row" transition:fade>
              <div class="image-search-container">
                <div class="padding-top padding-bottom row left">
                  <h6 class="padding-bottom"><strong>PURCHASE PLAN DEALINGS</strong></h6>
                  <p>
                    <strong>STEP 1</strong><br/>Purchase a property title search to uncover all dealing-related numbers and details tied to the property.<br/><br/>
                    <strong>STEP 2</strong><br/>Enter these dealing-related numbers below to proceed with purchasing or planning property dealings.
                  </p>
                </div>
                <div class="custom-tags-input-container">
                  <Tags
                    bind:tags={image_search_selected}
                    placeholder={"Enter one or more dealing numbers"}
                    allowPaste={true}
                    onlyUnique={true}                  
                  />
                </div>
                <div class="padding-top-thin row right">
                  <a href="?" class="btn" class:unclickable={! image_search_selected.length} on:click={_handle_purchase_plan_dealings}>CONTINUE TO PAYMENT</a>
                </div>
                <div class="popup-triangle"></div>
              </div>
            </div>
            {/if}

            {#if purchase_confirm}
            <div class="padding-top row" transition:slide={{ duration: 220 }}>
              <div class="purchase-confirm-container">
                <h6 class="padding-bottom"><strong>CONFIRM {purchase_confirm.product === 'title' ? 'TITLE SEARCH' : 'PLAN / IMAGE SEARCH'}</strong></h6>
                <p class="purchase-address">{property.address}</p>
                <ul class="purchase-lines">
                  {#each purchase_confirm.identifiers as ident}
                    <li><span>{purchase_confirm.product === 'title' ? 'Folio' : 'Dealing / plan'} {ident}</span><span>${PURCHASE_PRICE_AUD.toFixed(2)}</span></li>
                  {/each}
                  <li class="purchase-total"><span>Total</span><span>${(PURCHASE_PRICE_AUD * purchase_confirm.identifiers.length).toFixed(2)} AUD</span></li>
                </ul>
                <p class="purchase-note"><i class=" icon-info"></i> Test mode: no payment is taken. The PDF is emailed to the test address as soon as Hazlett returns it.</p>
                {#if purchase_error}<p class="purchase-error"><i class=" icon-triangle-alert"></i> {purchase_error}</p>{/if}
                <div class="flex flex-gap padding-top-thin">
                  <a href="?" class="btn" style="flex:1" on:click|preventDefault={_close_purchase_confirm}>CANCEL</a>
                  <a href="?" class="btn btn-search" style="flex:1" class:unclickable={purchase_busy || !purchase_confirm.identifiers.length} on:click|preventDefault={_confirm_purchase}>{purchase_busy ? 'ORDERING…' : 'CONFIRM PURCHASE'}</a>
                </div>
              </div>
            </div>
            {/if}

            {#if purchase_result}
            <div class="padding-top row" transition:slide={{ duration: 220 }}>
              <div class="purchase-confirm-container purchase-success">
                <p><i class=" icon-check"></i> <strong>Order placed.</strong>
                  {#if purchase_result.emailed_to}The PDF has been emailed to {purchase_result.emailed_to}.{:else}The document will be emailed once it is ready.{/if}
                  {#if purchase_result.mode === 'mock'}<br/><small>Sample document — Hazlett live ordering is not switched on yet.</small>{/if}
                </p>
                <div class="row right"><a href="?" class="btn" on:click|preventDefault={() => purchase_result = null}>CLOSE</a></div>
              </div>
            </div>
            {/if}

          </div>
        </div>
        {/if}
      </div>
      

    </div>
  {:else}
    <Signup {api_domain} {website_domain_with_http} />
  {/if}

    {#if is_designing && !use_listview}
      <div class="property-other-container padding-bottom-wider">
        <div class="design-content"> 
          <div class="design-controls padding-top-wider">
            <div class="flex row">
              <div class="row right">
                <button 
                  class="btn btn-small {map_3d ? 'active' : ''}" 
                  on:click={_handle_toggle_3d}
                  title="Toggle 3D View"
                >
                  <i class=" icon-box"></i> 3D
                </button>
                <button 
                  class="btn btn-small {map_monochrome ? 'active' : ''}" 
                  on:click={(e) => { 
                    e.preventDefault(); 
                    if (window.mapboxMap) {
                      map_monochrome = !map_monochrome;
                      window.mapboxMap.setConfigProperty('basemap', 'theme', map_monochrome ? 'monochrome' : 'default');
                    }
                  }}
                  title="Toggle Monochrome Style"
                >
                  <i class=" icon-palette"></i> Mono
                </button>
                <button 
                  class="btn btn-small {map_3d ? '' : 'unclickable'}" 
                  on:click={(e) => { 
                    e.preventDefault(); 
                    if (window.mapboxMap) {
                      window.target_bearing = (window.mapboxMap.isRotating() && window.target_bearing !== undefined) 
                        ? window.target_bearing + 45 
                        : window.mapboxMap.getBearing() + 45;
                      window.mapboxMap.rotateTo(window.target_bearing, { duration: 300 });
                    }
                  }}
                  title="Rotate 45°" disabled={!map_3d}
                >
                  <i class=" icon-rotate-cw"></i> 45°
                </button>
                <button 
                  class="btn btn-small {map_spin ? 'active' : ''} {map_3d ? '' : 'unclickable'}" 
                  on:click={_handle_toggle_spin}
                  title="Auto Spin" disabled={!map_3d}
                >
                  <i class=" icon-rotate-cw"></i> Spin
                </button>
              </div>
            </div>

        </div>

        <hr/>

        <Design 
          {use_debug}
          {property} 
          map={window.mapboxMap}
          bind:map_3d
          bind:modelRotateX={designModelRotateX}
          bind:modelRotateY={designModelRotateY}
          bind:modelRotateZ={designModelRotateZ}
          bind:currentFitRotation={designCurrentFitRotation}
          bind:modelScale={designModelScale}
          bind:modelNudgeX={designModelNudgeX}
          bind:modelNudgeY={designModelNudgeY}
          bind:modelNudgeZ={designModelNudgeZ}
          bind:modelLoaded={designModelLoaded}
          bind:uploadedModelUrl={designUploadedModelUrl}
          bind:fittedAnchor={designFittedAnchor}
          bind:currentModelId={designCurrentModelId}
          bind:selectedDesignId={designSelectedDesignId}
          bind:clipLayerFootprintString={designClipLayerFootprintString}
        />
        </div>
      </div>
    {:else if is_yielding}
      <div class="property-other-container">
        <Yield {property} bind:user_fav {user_id} {api_domain} {user_email} {user_plan} {user_first_name} {user_last_name} bind:yieldSnapshot={yield_snapshot} />
      </div>
    {:else}

      {#if is_logged_in}
      <div class="property-other-container">
        <div class="padding-top-wider padding-bottom-wider padding-left padding-right">
          <div>
            <h6><strong>OVERVIEW</strong></h6>
          </div>
          <div class="flex wrap-half">
            <div class="one-quarter">
              <div class="padding-top-wider padding-bottom">
                <h6 class="info-type">FRONTAGE WIDTH</h6>
              </div>
              <h4><i class=" icon-move-horizontal"></i> {property.primary_frontage_length_m ?? property.width ?? '--'} m</h4>
            </div>
            <div class="one-quarter">
              <div class="padding-top-wider padding-bottom">
                <h6 class="info-type">DEPTH</h6>
              </div>
              <h4><i class=" icon-move-vertical"></i> {property.lot_depth_m ?? property.depth ?? '--'} m</h4>
            </div>
            <div class="one-quarter">
              <div class="padding-top-wider padding-bottom">
                <h6 class="info-type">PERMISSIBLE HEIGHT</h6>
              </div>
              <h4><i class="  icon-building"></i> {property.hob_max_b_h || '--'} m</h4>
            </div>
            <div class="one-quarter">
              <div class="padding-top-wider padding-bottom">
                <h6 class="info-type">FLOOR SPACE RATIOS</h6>
              </div>
              <h4><i class=" icon-align-vertical-space-around"></i> {property.fsr_fsr || '--'} fsr</h4>
            </div>
          </div>
        <div class="flex wrap-half">
            <div class="one-quarter">
              {#if property.planlabel || property.lotnumber}
                {#if property.lotnumber}
                    <div class="padding-top-wider padding-bottom">
                      <h6 class="info-type">LOT NO</h6>
                    </div>
                    <h4>{property.lotnumber}/{property.planlabel}</h4>
                {:else}
                  <div class="padding-top-wider padding-bottom">
                    <h6 class="info-type">PLAN NO</h6>
                  </div>
                  <h4>{property.planlabel}</h4>
                {/if}
              {/if}
            </div>
            <div class="one-quarter">
              <div class="padding-top-wider padding-bottom">
                <h6 class="info-type">MIN LOT SIZE</h6>
              </div>
              {#if property.lot_size}
              <h4>{parseInt(property.lot_size)} sqm</h4>
              {:else}
              <h4 class="unclickable">-- sqm</h4>
              {/if}
            </div>
            <div class="one-quarter">
              <div class="padding-top-wider padding-bottom">
                <h6 class="info-type">AREA OF LAND</h6>
              </div>
              <h4>{parseInt(property.area)} sqm</h4>
            </div>
            <div class="one-quarter">
              <div class="padding-top-wider padding-bottom">
                <h6 class="info-type">ZONING</h6>
              </div>
              <h4>{property.lzn_label}: {property.lzn_lay_class}</h4>
            </div>
          </div>
        </div>

        <hr/>

        {#if lrm_section && property.closest_railway_station_distance <= 800}

          <div class="padding-top-wider padding-bottom-wider collapsible-container">
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <!-- svelte-ignore a11y-no-static-element-interactions -->
            <div class="collapsible-title" on:click={toggleCollapsibleContent}>
              <h6><strong>LOW AND MID-RISE HOUSING POLICY</strong></h6>
            </div>
            <div class="padding-top-wider collapsible-content {pdf_property ? '' : 'animate-fade-out'}">
              <LMR property={property}></LMR>
            </div>
        </div>
        <hr/>
        {/if}
        
        <div class="padding-top-wider padding-bottom-wider collapsible-container print-break">
          <!-- svelte-ignore a11y-no-static-element-interactions -->
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <div class="collapsible-title" on:click={toggleCollapsibleContent}>
            <h6><strong>{ property?.suburbname }</strong> SUBURB PROFILE</h6>
          </div>

          <div class="padding-bottom-wider collapsible-content {pdf_property ? '': 'animate-fade-out'}">

            <div class="{mapview_viewing_property ? 'row': 'flex wrap'}">
              <div class="row half">
                <div class="row padding-top-wider padding-bottom">
                  <h6 class="info-type">ABOUT</h6>
                </div>
                <p class="width-90">{suburb_profile?.suburb_profile.replace(/\[\d+\]/g, '').replace(/\s{2,}/g, ' ').trim()}</p>
              </div>
              <div class="row half ">
                <div class="row padding-top-wider padding-bottom">
                  <h6 class="info-type">INFRASTRUCTURE &amp; SERVICES</h6>
                </div>
                <p class="width-90">{suburb_profile?.infrastructure_and_services.replace(/\[\d+\]/g, '').replace(/\s{2,}/g, ' ').trim()}</p>
              </div>
            </div>

            <div class="padding-top">
              <h6><strong>NEARBY</strong></h6>
            </div>
            <div class="flex">
              <div class="half">
                <div class="padding-top-wider padding-bottom">
                  <h6 class="info-type">SCHOOL</h6>
                </div>
                <h4>{property.closest_school}</h4>
              </div>
              <div class="half">
                <div class="padding-top-wider padding-bottom">
                  <h6 class="info-type">DISTANCE</h6>
                </div>
                <h4>{roundToNearestTenth(property.closest_school_distance / 1000)} km</h4>
              </div>
            </div>
            <div class="flex">
              <div class="half">
                <div class="padding-top-wider padding-bottom">
                  <h6 class="info-type">HOSPITAL</h6>
                </div>
                <h4>{property.closest_hospital}</h4>
              </div>
              <div class="half">
                <div class="padding-top-wider padding-bottom">
                  <h6 class="info-type">DISTANCE</h6>
                </div>
                <h4>{roundToNearestTenth(property.closest_hospital_distance / 1000)} km</h4>
              </div>
            </div>
            <div class="flex">
              <div class="half">
                <div class="padding-top-wider padding-bottom">
                  <h6 class="info-type">TRAIN</h6>
                </div>
                <h4>{property.closest_railway_station}</h4>
              </div>
              <div class="half">
                <div class="padding-top-wider padding-bottom">
                  <h6 class="info-type">DISTANCE</h6>
                </div>
                <h4>{roundToNearestTenth(property.closest_railway_station_distance / 1000)} km</h4>
              </div>
            </div>
          </div>
        </div>

        {#if property && property.lep && property.lep.length}

        <hr/>

        <div class="padding-top-wider padding-bottom-wider collapsible-container">
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <!-- svelte-ignore a11y-no-static-element-interactions -->
          <div class="collapsible-title" on:click={toggleCollapsibleContent}>
            <h6><strong>LOCAL ENVIRONMENTAL PLANS</strong></h6>
          </div>
          <div class="padding-top-wider collapsible-content {pdf_property ? '': 'animate-fade-out'}">
            {#each property.lep as plep}
              {#if plep !== null}
                <div class="one-quarter">
                  <p>
                    <a target="_blank" href="{plep.link}" class="link"><i class=" icon-file padding-right"></i>{plep.epi_name}</a>
                  </p>
                </div>
              {/if}
            {/each}
          </div>
        </div>
        {/if}

        {#if property && property.planning_rules && property.planning_rules.length}

        <hr/>

        <div class="padding-top-wider padding-bottom-wider collapsible-container">
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <!-- svelte-ignore a11y-no-static-element-interactions -->
          <div class="collapsible-title" on:click={toggleCollapsibleContent}>
            <h6><strong>PLANNING RULES</strong></h6>
          </div>
          <div class="padding-top-wider collapsible-content {pdf_property ? '': 'animate-fade-out'}">
            <table class="planning-rules-table">
              <thead>
                <tr>
                  <th>Clause</th>
                  <th>Rule</th>
                  <th>Type</th>
                  <th>Requirement</th>
                  <th>Conditions</th>
                </tr>
              </thead>
              <tbody>
                {#each property.planning_rules as rule}
                  <tr>
                    <td>
                      {rule.provision_ref || ('cl ' + rule.clause)}
                      <span class="planning-rules-epi">{rule.epi_name}</span>
                    </td>
                    <td>{formatRuleKey(rule.rule_key)}</td>
                    <td>{formatRuleKey(rule.role)}</td>
                    <td>{formatRuleRequirement(rule)}</td>
                    <td>{rule.condition_summary ? rule.condition_summary.replace(/^\[ai\]\s*/, '') : '—'}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>
        {/if}

        <hr/>

      <div class="padding-top-wider padding-bottom-wider collapsible-container print-break">
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div class="collapsible-title" on:click={toggleCollapsibleContent}>
          <h6><strong>PERMISSIBLE USES</strong></h6>
        </div>

        <div class="padding-top-wider permissibleuse-container collapsible-content {pdf_property ? '': 'animate-fade-out'}">
          {#if property && property.permissible_uses}
            <div class="flex wrap-half">
            {#each property.permissible_uses.split(',').map(item => item.trim()).filter(Boolean).sort() as ps}
              {#if ps !== null}
                <div class="one-quarter"><p><i class=" icon-circle-check padding-right"></i>{ps}</p></div>
              {/if}
            {/each}
            </div>
          {:else}
            <div class="unclickable"><p>N/A</p></div>
          {/if}
        </div>
      </div>

      <hr/>

      <div class="padding-top-wider padding-bottom-wider collapsible-container print-break">
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div class="collapsible-title" on:click={toggleCollapsibleContent}>
          <h6><strong>SOLD HISTORY</strong></h6>
        </div>

        <div class="padding-top-wider collapsible-content {pdf_property ? '': 'animate-fade-out'}">
          {#if property && property.sold_history && property.sold_history.length}
          <div style="display: flex; flex-direction: column;">
          {#each property.sold_history.slice(0, 10) as sh}
            <div class="padding-bottom-thin" style="display: flex; align-items: center;">
              <div style="width: 25%;">
                <p><strong>{sh.settlement_date ? sh.settlement_date.substring(0, 4) : (sh.contract_date ? sh.contract_date.substring(0, 4) : '')}</strong></p>
              </div>
              <div style="width: 75%;">
                <p><strong>{!isNaN(parseInt(sh.purchase_price)) ? `SOLD $${formatNiceCurrency(parseInt(sh.purchase_price))}` : ''}</strong></p>
                <p class="info-type">
                  {#if sh.settlement_date}
                    {new Date(sh.settlement_date).getDate().toString().padStart(2, '0')}/{ (new Date(sh.settlement_date).getMonth() + 1).toString().padStart(2, '0') }/{new Date(sh.settlement_date).getFullYear()}
                  {:else if sh.contract_date}
                    {new Date(sh.contract_date).getDate().toString().padStart(2, '0')}/{ (new Date(sh.contract_date).getMonth() + 1).toString().padStart(2, '0') }/{new Date(sh.contract_date).getFullYear()}
                  {/if}
                </p>
              </div>
            </div>
            <hr style="margin: 0.5em 0; border-top: 1px solid var(--up-c-aaaaaa-a20);" />
          {/each}
          </div>
          {:else}
            <div class="unclickable"><p>N/A</p></div>
          {/if}
        </div>
      </div>

      <hr/>

      <div class="padding-top-wider padding-bottom-wider collapsible-container">
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div class="collapsible-title" on:click={toggleCollapsibleContent}>
          <h6><strong>COMPLYING DEVELOPMENT</strong></h6>
        </div>

        <div class="padding-top-wider cdc-container collapsible-content {pdf_property ? '': 'animate-fade-out'}">
          {#if property && [
              property.cdc_dual_occupancy,
              property.cdc_multi_dwelling_terraces,
              property.cdc_secondary_dwellings,
              property.cdc_dwelling_houses,
              property.cdc_manor_homes,
              property.cdc_rural_housing,
              property.cdc_inland_dwelling_houses,
              property.cdc_inland_farm_buildings,
              property.cdc_greenfield_housing,
              property.cdc_agritourism,
              property.cdc_farmsta
            ].filter(Boolean).length > 0}
            {#if property.cdc_dual_occupancy}<div class=""><p><i class=" icon-circle-check padding-right"></i>Dual Occupancy</p></div>{/if}
            {#if property.cdc_multi_dwelling_terraces}<div class=""><p><i class=" icon-circle-check padding-right"></i>Terraces</p></div>{/if}
            {#if property.cdc_secondary_dwellings}<div class=""><p><i class=" icon-circle-check padding-right"></i>Secondary Dwellings</p></div>{/if}
            {#if property.cdc_dwelling_houses}<div class=""><p><i class=" icon-circle-check padding-right"></i>Dwellings</p></div>{/if}
            {#if property.cdc_manor_homes}<div class=""><p><i class=" icon-circle-check padding-right"></i>Manor Homes</p></div>{/if}
            {#if property.cdc_rural_housing}<div class=""><p><i class=" icon-circle-check padding-right"></i>Rural Housing</p></div>{/if}
            {#if property.cdc_inland_dwelling_houses}<div class=""><p><i class=" icon-circle-check padding-right"></i>Dwellings Houses</p></div>{/if}
            {#if property.cdc_inland_farm_buildings}<div class=""><p><i class=" icon-circle-check padding-right"></i>Farm Buildings</p></div>{/if}
            {#if property.cdc_greenfield_housing}<div class=""><p><i class=" icon-circle-check padding-right"></i>Greenfield Housing</p></div>{/if}
            {#if property.cdc_agritourism}<div class=""><p><i class=" icon-circle-check padding-right"></i>Agritourism</p></div>{/if}
            {#if property.cdc_farmsta}<div class=""><p><i class=" icon-circle-check padding-right"></i>Farmstay</p></div>{/if}
          {:else}
            <div class="unclickable"><p>N/A</p></div>
          {/if}

          {#if use_debug}
            <div class="padding-top row">
            <button 
              href="?" class="btn btn-search" 
              on:click|stopPropagation={() => {show_cdc_rules = true}}
            >
              VIEW ANALYSIS
            </button>
            </div>
          {/if}

        </div>
      </div>

      <hr/>

      <div class="padding-top-wider padding-bottom-wider collapsible-container">
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div class="collapsible-title" on:click={toggleCollapsibleContent}>
          <h6><strong>PATTERN BOOKS</strong></h6>
        </div>

        <div class="padding-top-wider cdc-container collapsible-content {pdf_property ? '': 'animate-fade-out'}">
          {#if property && pattern_book_options.some(pb => property[pb.name])}
            {#each pattern_book_options as pb}
              {#if property[pb.name]}<div class=""><p><i class=" icon-circle-check padding-right"></i>{pb.label}</p></div>{/if}
            {/each}
          {:else}
            <div class="unclickable"><p>N/A</p></div>
          {/if}
        </div>
      </div>

      <hr/>


      <div class="padding-top-wider padding-bottom-wider collapsible-container">
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div class="collapsible-title" on:click={toggleCollapsibleContent}>
          <h6><strong>PLANNING CONSTRAINTS</strong></h6>
        </div>

        <div class="padding-top-wider permissibleuse-container collapsible-content {pdf_property ? '': 'animate-fade-out'}">
          {#if property && exclusion_options && exclusion_options.length}
          <div class="flex wrap-half">
            {#each exclusion_options as eo}
              {#if property[eo.name]}
                <div class="one-quarter">
                  <div class="padding-top-thin padding-bottom-thin">
                    <h6 class="info-type uppercase">{eo.label}</h6>
                  </div>

                  {#each property[eo.name].split(',').map(item => item.trim()).sort() as appNum}
                    <p>
                      <i class=" icon-info padding-right"></i>
                      {appNum}
                    </p>
                  {/each}
                </div>
              {/if}
            {/each}

            {#if exclusion_options.every(eo => !property[eo.name])}
              <div class="padding-top-thin padding-bottom-thin">
                <h6 class="info-type uppercase">N/A</h6>
              </div>
            {/if}
          </div>

          {/if}
        </div>

      </div>

      <hr/>

      {#if property && property.das && property.das.length}

      <div class="padding-top-wider padding-bottom-wider collapsible-container print-break">
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div class="collapsible-title" on:click={toggleCollapsibleContent}>
          <h6><strong>DEVELOPMENT APPLICATIONS</strong></h6>
        </div>

        <div class="da-container padding-top-wider permissibleuse-container collapsible-content {pdf_property ? '': 'animate-fade-out'}">
          {#if property && property.das && property.das.length}
            <div class="row">
            {#each property.das as da}
              {#if da !== null}
                <div class="padding-top padding-bottom">
                  <div class="uppercase" style="font-weight: 500;">{da.application_type}</div>
                </div>
                <div class="flex">
                  <div class="half">
                    <h6 class="info-type">APPLICATION NUMBER</h6>
                    <div class="padding-top-thin">{da.planning_portal_app_number} <a href="{da.da_application_url}" target="_blank" class="{da.da_application_url ? '': 'unclickable'}"><i class=" icon-file-text"></i></a></div>
                  </div>
                  <!-- <div class="half row">
                    <h6 class="info-type">DATE</h6>
                    <div class="padding-top-thin">
                      {convertToDDMMYYYY(da.submitted_date)}
                    </div>
                  </div> -->
                  <div class="half row">
                    <h6 class="info-type">STATUS</h6>
                    <div class="padding-top-thin">
                      <div class="circle aspect-ratio-1x1" style="background-color: {da_status_colours[da.status]}"></div>{da.status}
                    </div>
                  </div>
                </div>
                
                <div class="padding-top-wider flex">
                  <div class="half">
                    <h6 class="info-type">TYPE OF DEVELOPMENT</h6>
                    <div class="padding-top-thin padding-bottom">{da.type_of_development.replace(/\,/g, ', ')}</div>
                  </div>

                  <div class="half">
                    <h6 class="info-type">COUNCIL</h6>
                    <div class="padding-top-thin padding-bottom">{ da.council_name } <a href="{da.lga_url}" target="_blank"><i class=" icon-square-arrow-up-right"></i></a></div>
                  </div>
                  
                </div>
                
              {/if}
            {/each}
            </div>
          {:else}
            <div class="unclickable"><p>N/A</p></div>
          {/if}
        </div>
      </div>

      <hr/>

      {/if}


      
      
      <div class="padding-top-wider padding-bottom-wider collapsible-container">
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div class="collapsible-title" on:click={toggleCollapsibleContent}>
          <h6><strong>CENSUS</strong></h6>
        </div>

        <div class="padding-top collapsible-content {pdf_property ? '': 'animate-fade-out'}">

          
          <div class="{mapview_viewing_property ? 'row': 'flex wrap'}">
            <div class="one-third container-thinner">
              <p class="uppercase padding-bottom"><strong>Suburb Age Profile</strong></p>

              { #if ageData && ageData.data.length > 0 }
              <AgePyramidChartWrapper
                dataLabels={ageData.labels.slice().reverse()}
                dataSet={ageData.data.slice().reverse()}
                chartType="bar"
                legendDisplay={false}
              />
              {:else }
              <p>No age profile data available.</p>
              {/if }
            </div>
            
            <div class="one-third container-thinner">
              <p class="uppercase padding-bottom"><strong>Ancestry</p>
              
              { #if ancestryData && ancestryData.data.length > 0 }
              <EthnicityChartWrapper
                dataLabels={ancestryData.labels}
                dataSet={ancestryData.data}
                chartType="pie"
                legendDisplay={legendDisplay}
              />
              {:else }
              <p>No ancestry data available.</p>
              {/if }
            </div>

            <div class="one-third container-thinner">
              <p class="uppercase padding-bottom"><strong>Country of Birth</p>
              { #if birthData && birthData.data.length > 0 }
              <EthnicityChartWrapper
                dataLabels={birthData.labels}
                dataSet={birthData.data}
                chartType="pie"
                legendDisplay={legendDisplay}
              />
              {:else }
              <p>No country of birth data available.</p>
              {/if }
            
            </div>



          </div>

          

          <div class="{mapview_viewing_property ? 'row': 'flex wrap'}">

            <div class="one-third container-thinner">
              <p class="uppercase padding-bottom"><strong>Rent Affordability</p>
              { #if rentData && rentData.data.length > 0 }
              <AgeChartWrapper
                dataLabels={rentData.labels}
                dataSet={rentData.data}
                chartType="pie"
                legendDisplay={legendDisplay}
              />
              {:else }
              <p>No rent affordability data available.</p>
              {/if }
            </div>



            <div class="one-third container-thinner">
              
              <p class="uppercase padding-bottom"><strong>Mortgage Affordability</p>
              
              { #if mortgageData && mortgageData.data.length > 0 }
              <AgeChartWrapper
                dataLabels={mortgageData.labels}
                dataSet={mortgageData.data}
                chartType="pie"
                legendDisplay={legendDisplay}
              />
              {:else }
              <p>No mortgage affordability data available.</p>
              {/if }
              
            </div>



            



          </div>





          <div class="{mapview_viewing_property ? 'row': 'flex wrap'}">

            <div class="one-third container-thinner">
              
              <p class="uppercase padding-bottom"><strong>Weekly Household Income</p>

              { #if weeklyIncomeData && weeklyIncomeData.data.length > 0 }
              <AgePyramidChartWrapper
                dataLabels={weeklyIncomeData.labels.slice().reverse()}
                dataSet={weeklyIncomeData.data.slice().reverse()}
                chartType="bar"
                legendDisplay={false}
              />
              {:else }
              <p>No weekly household income data available.</p>
              {/if }
              
            </div>


            <div class="one-third container-thinner">
              
              <p class="uppercase padding-bottom"><strong>Tenure Type</p>
              
              { #if tenureData && tenureData.data.length > 0 }
              <AgeChartWrapper
                dataLabels={tenureData.labels}
                dataSet={tenureData.data}
                chartType="pie"
                legendDisplay={legendDisplay}
              />
              {:else }
              <p>No tenure type data available.</p>
              {/if }
              
            </div>

            <div class="one-third container-thinner">
              
              <p class="uppercase padding-bottom"><strong>Household Composition</p>
              
              { #if householdData && householdData.data.length > 0 }
              <AgeChartWrapper
                dataLabels={householdData.labels}
                dataSet={householdData.data}
                chartType="pie"
                legendDisplay={legendDisplay}
              />
              {:else }
              <p>No household composition data available.</p>
              {/if }
              
            </div>


          </div>
        

          

    

          

          <div class="{mapview_viewing_property ? 'row': 'flex wrap'}">
            <div class="one-third container-thinner">
              <p class="uppercase padding-bottom"><strong>Crime Occurrence</p>
              {#if crimeCountObject.length > 0}
                <CrimeCountChartWrapper
                  dataSet={crimeCountObject}
                  dataLabels={yearsArray}
                  chartType="line"
                  legendDisplay={legendDisplay}
                />
              {:else}
                <p>No crime data available for {lga}.</p>
              {/if}
            </div>
            <div class="one-third container-thinner">
              <p class="uppercase padding-bottom"><strong>Crime Rankings <i class="circle" data-balloon-length="medium" aria-label="Crime Rank shows suburb safety, where a higher rank means fewer crimes and a safer area." data-balloon-pos="right">i</i></p>
              {#if crimeRankObject.length > 0}
                <RankChartWrapper
                  dataSet={crimeRankObject}
                  dataLabels={[]}
                  chartType="bubble"
                  legendDisplay={false}
                  lga={lga}
                />
              {:else}
                <p>No crime ranking data available for {lga}.</p>
              {/if}
            </div>
            <div class="one-third container-thinner">

            </div>
          </div>



    


        </div>

      </div>

      <hr/>

    <div class="padding-top-wider padding-bottom-wider collapsible-container">
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <div class="collapsible-title" on:click={toggleCollapsibleContent}>
        <h6><strong>CONTRIBUTION PLANS</strong></h6>
      </div>

      <div class="padding-top-wider collapsible-content {pdf_property ? '': 'animate-fade-out'}">
        {#if property && property.contribution_plan}
          {#each property.contribution_plan as contribution_plan}
          <p class="bullet-paragraph">
            <a target="_blank" href="{contribution_plan.file_name}" class="link">
                {#if contribution_plan.file_name.match(/pdf/)}
                  <i class=" icon-file-text padding-right"></i>
                {:else}
                  <i class=" icon-app-window padding-right"></i>
                {/if}
              {contribution_plan.plan_name}
            </a>
          </p>
          {/each}
        {:else}
          <div class="unclickable"><p>N/A</p></div>
        {/if}
      </div>

    </div>

    <hr/>

    <div class="padding-top-wider padding-bottom-wider collapsible-container">
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <div class="collapsible-title" on:click={toggleCollapsibleContent}>
        <h6><strong>DEVELOPMENT CONTROL PLANS</strong></h6>
      </div>

      <div class="padding-top-wider collapsible-content {pdf_property ? '': 'animate-fade-out'}">
        {#if property && property.development_control_plan}
          {#each property.development_control_plan as development_control_plan}
          <p class="bullet-paragraph">
            <a target="_blank" href="{development_control_plan.file_name}" class="link">
              {#if development_control_plan.file_name.match(/pdf/)}
                <i class=" icon-file-text padding-right"></i>
              {:else}
                <i class=" icon-app-window padding-right"></i>
              {/if}
              {development_control_plan.plan_name}
            </a>
          </p>
          {/each}
        {:else}
          <div class="unclickable"><p>N/A</p></div>
        {/if}
      </div>
    </div>

    <hr/>

    <div class="padding-top-wider padding-bottom-wider collapsible-container">
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <div class="collapsible-title" on:click={toggleCollapsibleContent}>
        <h6><strong>STATE ENVIRONMENTAL PLANNING</strong></h6>
      </div>

      <div class="padding-top-wider collapsible-content {pdf_property ? '': 'animate-fade-out'}">
        {#if property && property.state_environmental_planning_policy}
          {#each property.state_environmental_planning_policy as state_environmental_planning_policy}
          <p class="bullet-paragraph">
          <a target="_blank" href="{state_environmental_planning_policy.sepp_link}" class="link">
              {#if state_environmental_planning_policy.sepp_link.match(/pdf/)}
                <i class=" icon-file-text padding-right"></i>
              {:else}
                <i class=" icon-app-window padding-right"></i>
              {/if}
              {state_environmental_planning_policy.sepp_name}
          </a>
          </p>
          {/each}
        {/if}
      </div>
    </div>

    <hr/>

    {#if !pdf_property && is_logged_in}
    <div class="padding-top-wider padding-bottom-wider collapsible-container">
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <div class="collapsible-title" on:click={toggleCollapsibleContent}>
        <h6><strong>MY PIPELINE</strong></h6>
      </div>

      <div class="padding-top-wider collapsible-content {pdf_property ? '' : 'animate-fade-out'}">
        <div class="flex wrap pipeline-fields" style="gap: 0.5rem 0.75rem;">
          <div class="full">
            <div class="padding-bottom-thinner"><h6 class="info-type">STATUS</h6></div>
            <div class="select-container relative">
              <select bind:value={pipelineStatus} on:change={_handle_status_change}>
                <option value="">Status:</option>
                {#each user_fav_status_options as option}
                  <option>{option}</option>
                {/each}
              </select>
              <div class="absolute center-right select-arrow shift-up-more padding-right-thin unclickable">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path fill="#5C2587" d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"></path></svg>
              </div>
            </div>
          </div>
          <div class="full">
            <div class="padding-bottom-thinner"><h6 class="info-type">NEXT ACTION</h6></div>
            <textarea rows="3" bind:value={pipelineComments} on:change={_handle_comments_change} placeholder="Next Action..." style="width: 100%;"></textarea>
          </div>
        </div>

        <div class="padding-top">
            <div class="flex flex-gap pipeline-actions">
              <a class="btn center half" href="?" on:click={_handle_pipeline_email}><i class=" icon-mail"></i> Email</a>
              {#if user_fav[property.gurasid] && user_fav[property.gurasid].mailed}
                <a class="btn center half unclickable" href="?" on:click={_handle_pipeline_mail}><i class=" {user_fav[property.gurasid] && user_fav[property.gurasid].sending ? 'icon-loader-circle icon-spin' : 'icon-mailbox'}"></i> Sent</a>
              {:else}
                <a class="btn center half {(user_fav[property.gurasid] && user_fav[property.gurasid].sending) ? 'unclickable' : ''}" href="?" on:click={_handle_pipeline_mail}><i class=" {user_fav[property.gurasid] && user_fav[property.gurasid].sending ? 'icon-loader-circle icon-spin' : 'icon-mailbox'}"></i> Mail</a>
              {/if}
            </div>
          </div>

      </div>
    </div>

    <hr/>
    {/if}

    {#if property.epi_name && property.epi_name_p && property.epi_name != property.epi_name_p}
      <div class="hide">
      
      <div class="padding-top-wider padding-bottom-wider collapsible-container">
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div class="collapsible-title" on:click={toggleCollapsibleContent}>
          <h6><strong>REZONING HISTORY</strong></h6>
        </div>
      
        <div class="padding-top-wider collapsible-content {pdf_property ? '': 'animate-fade-out'}">
          {#each property.epi_name_p.split(/\s*,\s*/) as epi_name}
          <p class="">
            {epi_name}
          </p>
          {/each}
        </div>
      </div>
      <hr />
      </div>
    {/if}
  
    <div class="padding-top-wider padding-bottom-wider">

      <div>
        <h6><strong>PROPERTY DISCLAIMERS</strong></h6>
      </div>

      <div class="padding-top-wider">
        <p>
          The search results on the Urban Prospects are for guidance only based on your search criteria and the property data sourced from NSW Government. The sites may not suit your specific needs and may already be developed to their full potential. You should verify the information provided with a site visit and professional advise.
  You should also note that there are planning controls within Environmental Planning Instruments and Development Control Plan that could affect your development. Therefore, you should consult with a town planner or professional property advisor / architect about the suitability of a site for development.

        </p>
      </div>

    </div>
    
    {#if ! mapview_viewing_property}
    <div class="padding-top-wider padding-bottom-wider" class:hide={pdf_property}>
      <a class="link-back" href="?" on:click|preventDefault={onAction}><i class=" icon-arrow-left"></i> Back to Search</a>
    </div>
    {/if}

    </div>
  {/if}
  {/if}
</div>




{#if show_pdf_builder}
  <PDFBuilder
    {property}
    {api_domain}
    bind:user_first_name
    bind:user_last_name
    bind:custom_logo_url
    feasibility={user_fav && property && user_fav[property.gurasid] ? user_fav[property.gurasid].feasibility : null}
    yieldSnapshot={yield_snapshot}
    closeLightbox={() => show_pdf_builder = false}
  />
{/if}

{#if show_cdc_rules}
  <CdcRules
    {property}
    closeLightbox={() => show_cdc_rules = false}
  />
{/if}

{#if show_mail_template}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="mail-template-overlay" on:click|self={() => show_mail_template = false}>
    <div class="mail-template-modal">
      <div class="flex padding-bottom">
        <div class="full"><h3>Edit Mail Template</h3></div>
        <div class="row right">
          <a class="btn center" href="?" on:click|preventDefault={() => show_mail_template = false}><i class=" icon-x"></i> Close</a>
        </div>
      </div>
      <div style="--font-family: var(--font-sans);">
        <Tiptap {user_template} {user_id} {from_first_name} {from_last_name} {from_company_name} {from_address_1} {from_address_2} {from_postcode} {from_city} {from_state} {custom_logo_url} />
      </div>
    </div>
  </div>
{/if}
