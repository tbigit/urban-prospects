<script>
  // @ts-nocheck
	import { onMount } from 'svelte';

  let is_ready = false;
  let use_debug = false;

  
  let properties;
  
  let map;
  let draw;
  let markers = [];

  let circle_radius;
  let circle_center;

  let website_domain_with_http = 'https://www.urbanprospects.com.au';
  // Was hard-coded true (the WordPress membership page gated access). On the new
  // site the session decides; /auth/me answers 401 when logged out.
  let is_logged_in = false;
  fetch('/auth/me', { credentials: 'same-origin', cache: 'no-store' })
    .then((r) => r.ok ? r.json() : null)
    .then((me) => { is_logged_in = !!(me && me.logged_in); })
    .catch(() => {});

  let satellite = false;
  let zoom_boundary = 17;
  let hide_properties = true;

  let api_url = 'https://urbanprospects.com.au/q/properties';
  let img_placeholder = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

  // http://172.105.184.178:3000
  let geo_server_url_with_http = 'https://urbanprospects.com.au/p';

  const initialState = {
    center: [151.2120881644596, -33.88465867322051],
    zoom: 11,
    pitch: 0,
    bearing: 0
  };

  let mapping_layers = {
    zoning: false,
    ass: false,
    frontage: false,
    airport: false,
    bushfire: false,
    heritage: false,
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
  };

  async function _handle_change_map_style() {
    
    // for (let key in mapping_layers) {
    //   if (mapping_layers[key]) {
    //     mapping_layers[key] = false;
    //     map.setLayoutProperty(`custom-layer-${key}`, 'visibility', 'none');
    //   }
    // }

    if (satellite) {
      map.setStyle('mapbox://styles/mapbox/satellite-streets-v11');
    }
    else {
      // map.setStyle('mapbox://styles/mapbox/streets-v11');
        map.setStyle('mapbox://styles/mapbox/light-v10');
    }

    _handle_delete_all();
  }

  async function _reset_map(event) {
    event.preventDefault();
    map.flyTo({
        center: initialState.center,
        zoom: initialState.zoom,
        pitch: initialState.pitch,
        bearing: initialState.bearing,
        duration: 1500 // Animation duration in milliseconds
    });
    clearMarkers();
    return false;
  }

  async function _zoom_map(event) {
    event.preventDefault();
    zoomMap(17);
    return false;
  }

  let draw_circle_mode = false;
  let draw_line_mode = false;
  let draw_polygon_mode = false;

  async function _handle_draw_line () {

    _handle_delete_all()

    draw_line_mode = !draw_line_mode;
    if (draw_line_mode) {
      draw_circle_mode = false;
      draw_polygon_mode = false;
      draw.changeMode('draw_line_string'); 
    }
    else {
      _map_draw_reset();
    }
  }

  async function _handle_draw_polygon () {

    _handle_delete_all()

    draw_polygon_mode = !draw_polygon_mode;
    if (draw_polygon_mode) {
      draw_circle_mode = false;
      draw_line_mode = false;
      draw.changeMode('draw_polygon');
    }
    else {
      _map_draw_reset();
    }
  }


  async function _handle_draw_circle () {

    _handle_delete_all()

    draw_circle_mode = !draw_circle_mode;
    if (draw_circle_mode) {
      draw_line_mode = false;
      draw_polygon_mode = false;
      draw.changeMode('draw_circle');
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
}

  async function _handle_delete_all() {
    // Function to remove labels for all features

    // Remove all labels before deleting the drawings
    

    // Delete all features from the draw instance
    removeFeatureLabels();
    draw.deleteAll();
    

    // Reset circle properties
    circle_radius = 0;
    circle_center = null;
    circle_area = 0;

    console.log('before _get_properties_by_boundaries: _handle_delete_all');
    _get_properties_by_boundaries();
  }



  async function _handle_change_mapping_layer() {
    setTimeout(function(){
      for (let key in mapping_layers) {
        if (mapping_layers[key]) {
          // alert(`ON: ${key}: ${mapping_layers[key]}`);
          map.setLayoutProperty(`custom-layer-${key}`, 'visibility', 'visible');
        }
        else {
          // alert(`OFF: ${key}: ${mapping_layers[key]}`);
          map.setLayoutProperty(`custom-layer-${key}`, 'visibility', 'none');
        }
      }
    }, 0);
    
  }

  async function _get_properties_by_boundaries() {
    const bounds = map.getBounds();
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();

    // const nw = { lat: ne.lat, lng: sw.lng };
    // const se = { lat: sw.lat, lng: ne.lng };

    // console.log('Southwest corner:', sw);
    // console.log('Northeast corner:', ne);

    let body = {bounds: {}};
    body.bounds = {'southwest': sw, 'northeast': ne};

    if (circle_radius && circle_center) {
      body.radius = {"lng": circle_center[0], "lat": circle_center[1]};
      body.distance = Math.floor(circle_radius) / 1000 / 100;
    }

    const properties_response = await fetch(api_url, {
      method: 'POST',
      cache: "no-cache",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(body)
    }).then(properties_response => properties_response.json()).catch(function(){});
    properties = properties_response;

    // console.log(properties);
    
    clearMarkers();
    addMarkers(properties);
    


    // console.log('Northwest corner:', nw);
    // console.log('Southeast corner:', se);
  }

  function addMarkers(properties) {
    if (properties && properties.length) {
      properties.forEach(property => {
        const el = document.createElement('div');
        el.className = 'marker';
        el.style.backgroundImage = 'url(http://io.imsstratus.com.au/upapp/app/images/marker_pin.svg)';
        el.style.width = '18px';
        el.style.height = '34px';
        el.style.backgroundSize = '100%';

        let address = property.address;

        let property_img_location = address.toLowerCase().replace(/\s/g, '-') + '-' + property.postcode;

        let property_link =  website_domain_with_http + '/join';
        if (is_logged_in) {
          property_link = website_domain_with_http + `/property?pid=${property.gurasid}`;
        }

        const marker = new mapboxgl.Marker(el)
        .setLngLat(property.geom.coordinates)
        .setPopup(new mapboxgl.Popup({ offset: 25 })
            .setHTML(`<div class="mapbox-info-container"><div class="aspect-ratio-16x9 dark-overlay-lightest border-rounder relative"><img class="border-round" loading="lazy" src="https://maps.googleapis.com/maps/api/streetview?size=640x360&radius=15&return_error_code=true&source=outdoor&location=${property_img_location}&key=AIzaSyDtcpZMaC13xHQEux1qzwv1g3GGGxkrKyc" onerror="this.onerror=null;this.src='${img_placeholder}';"/></div><div class="padding-top"><h5 class="item-title">${property.address} ${property.postcode}</h5><div class="item-details row right padding-top-thin padding-right-thin"><a target="_parent" class="btn" href="${property_link}">VIEW</a></div></div></div>`))
        .addTo(map);

        // Store the marker in the array
        markers.push(marker);
    });
    }
  }

  function clearMarkers() {
    markers.forEach(marker => marker.remove());
    markers = []; // Clear the array
  }

  function zoomMap(level) {
    map.easeTo({
      zoom: level,
      duration: 1000 // Duration in milliseconds for the zoom animation
    });
  }

  function _add_individual_layer(name, source, colours) {

    map.addSource(`custom-tiles-${name}`, {
      type: 'vector',
      tiles: [
        `${geo_server_url_with_http}/${source}/{z}/{x}/{y}`
      ],
      minzoom: 5,
      maxzoom: 22
    });

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
          'line-opacity': 0.3,  // Optional: Adjust the opacity of the border
          'line-width': 1       // Optional: Set the border width
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
    }
  }

  function addCustomLayers() {

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



    // sym_code to colour code zone
    // https://www.mapbox.com/maps/satellite    
  }

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

  function calculateCircleArea(feature) {
    // return turf.area(feature);
    // return Math.PI * Math.pow(radius, 2);
  }

  function _init_mapbox() {

    mapboxgl.accessToken = 'pk.eyJ1IjoiZGFubnlsIiwiYSI6ImNseGJta3lhMzA3ZHEya3ExY3huOXdvaHUifQ.tWLLIKUxBJ_JBKH5o2XHTQ';
    map = new mapboxgl.Map({
      container: 'mapbox',
      pitchWithRotate: false,
      dragRotate: false,
      touchZoomRotate: false,
      style: 'mapbox://styles/mapbox/light-v10',
      ...initialState
    });

    map.on('style.load', () => {
      
      _handle_change_mapping_layer();
      if (!satellite) {
        applyMonochromeStyle();
      }
      addCustomLayers();
    });

    map.on('zoomend', () => {
      const currentZoom = map.getZoom();
      console.log('Current zoom level:', currentZoom);
      if (currentZoom >= zoom_boundary) {
        _get_properties_by_boundaries();
        hide_properties = false;
      }
      else {
        hide_properties = true;
        clearMarkers();
      }
    });

    map.on('moveend', function() {
      setTimeout(function(){
        const currentZoom = map.getZoom();
        if (currentZoom >= zoom_boundary) {
            _get_properties_by_boundaries();
        }
        else {
          clearMarkers();
        }
      }, 300);
    });

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
      console.log('before _get_properties_by_boundaries: CircleMode.onMouseUp');
      _get_properties_by_boundaries();

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

          // Finalize the line
          draw.add(state.line);
          this.changeMode('simple_select');
          
          map.dragPan.enable();
          map.boxZoom.enable();
          draw_line_mode = false;

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

      if (state.line.geometry.coordinates.length < 2) {
          draw.delete([state.line.id]);
      }

      // _map_draw_reset();
    };

    SingleLineMode.onTrash = function(state) {
      draw.delete([state.line.id]);
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

    map.on('load', function () {
      map.resize();
      if (map.getZoom() < zoom_boundary) {
        clearMarkers();
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

              circle_area = calculateCircleArea(feature);

              console.log('before _get_properties_by_boundaries: draw.update');
              _get_properties_by_boundaries();
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
      updateLabels();
      draw_polygon_mode = false;
    });

    map.on('draw.delete', function(e) {
      
      
    });

  }


  function updateLabels() {
    const data = draw.getAll();

    data.features.forEach(feature => {
        if (feature.geometry.type === 'Polygon') {
            const center = turf.centroid(feature).geometry.coordinates;
            const sourceId = `polygon-label-${feature.id}`;
            let labelText;

            if (feature.properties && feature.properties.isCustomCircle) {
                // For custom circles, calculate and display radius
                const perimeterPoint = feature.geometry.coordinates[0][0];
                const radius = turf.distance(center, perimeterPoint, { units: 'meters' });
                labelText = `${radius.toFixed(2)} m`;
            } else {
                // For regular polygons, calculate and display area
                const area = turf.area(feature);
                labelText = `${area.toFixed(2)} m²`;
            }

            if (map.getSource(sourceId)) {
                // Update existing source
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
                // Add new source for the polygon label
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

                // Add the label layer
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
            // The LineString handling remains the same
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


  function _handle_window_keydown(event) {
	  // let keyCode = event.keyCode;
	  let key = event.key;

    if (key == 'Enter') {
      
    }
    else if (key == 'Escape') {
      _handle_delete_all();
    }
  }

  onMount(async () => {

    _init_mapbox();
    is_ready = true;
  
  });


</script>


<style>
  

  .app {
    background-color: white;
  } 

  h1, h2, h3, h4, h5, h6 {
    color: var(--up-c-31144d);
    font-family: var(--font-sans);
  }

  h6 {
    color: var(--up-c-5c2587);
  }

  h1 {
    line-height: 0.8em;
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

  p, span, ul, ul li {
    color: var(--up-c-31144d) !important;
    font-size: 0.7125rem;
    font-family: var(--font-family);
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
    --clear-icon-color: var(--up-c-5c2587);
    --clear-icon-width: 12px;
	}
  
  :global(.multi-item) {
    outline: none !important;
  }

  h5 {
    font-size: 1rem;
    line-height: 1.4em;
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
  
  @media all and (min-width: 60em) {  
    .app.search-app {
      height: calc(100vh - 5em);
      overflow: auto;
    }
  }

  :global(.app.search-app::-webkit-scrollbar),
  :global(body::-webkit-scrollbar) {
    display: none;
  }

  .filter-container {
    height: calc(50vh);
    overflow: auto;
    padding: 0 1em;
    background-color: var(--up-c-fafaff); 
    border-radius: 0.6em;
  }

  .mapview .filter-container {
    background-color: var(--up-c-fafaff); 
  }

  @media all and (min-width: 60em) {  
    .filter-container {
      height: calc(100vh - 19em);
    }

    .mapview .filter-container {
      height: calc(100vh - 23em);
      min-height: 40vh;
    }
  }

  @media all and (max-width: 40em) {  
    .mapview .filter-container {
      height: calc(20vh);
    }
  }

  .map-container {
    width: 100%;
    height: 100%;
  }

  @media all and (min-width: 60em) {
    .map-container {
      height: calc(100vh - 8em); 
    }
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
    background-color: var(--up-c-f1e9f7);
    filter: brightness(1.06); 
  }

  :global(.btn.active) {
    background-color: var(--up-c-f1e9f7);
  }

  .btn.btn-reset {
    font-size: 0.5rem;
    padding: calc(0.25 * var(--padding-unit)) calc(0.75 * var(--padding-unit));
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
    border: 2px solid transparent;
    border-radius: 0.3rem;
    background-color: transparent;
    transition: background 0.2s ease-in-out;
  }

  .checkbox-group.full:hover {
    background-color: var(--up-c-82669d-a06);
  }
  
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

  .full.checkbox-group input[type="checkbox"] + label:before {
    padding-top: 0.5px;
  }

  :root {
    --checkbox-color: var(--up-c-31144d);
  }

  /* Active toggle: solid pill with punched-out knob (lucide has no filled toggle glyph) */
  .checkbox-group input[type="checkbox"]:checked + label::before {
    content: "";
    width: 1em;
    height: 1em;
    padding: 0;
    margin-top: 5.5px;
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
    height: 100%;
    padding: 1em;
    transition: width 0.5s ease-in-out, max-width 0.5s ease-in-out;
  }

  .search-panel-container {
    /* display: none; */
    min-height: 60vh;
  }

  .listing-container .search-panel-container.one-third {
    max-width: calc(33 * var(--padding-unit));
    max-height: 88.5vh;
    overflow-y: auto;
  }

  .mapview .listing-container .search-panel-container {
    background-color: var(--up-c-ffffff-a80);
    backdrop-filter: blur(10px);
  }

  .mapview .listing-container .search-panel-container.one-third {
    margin: 1em;
    min-width: 376px;
    width: 100%;
    max-width: 100%;
  }
  
  .app.is-ready {
    display: block;
    opacity: 1;
  }

  .app {
    display: none;
    opacity: 0;
    overflow: hidden;
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
    font-size: 0.6875rem;
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
      font-size: 0.6875rem;
      font-weight: bold;
    }
  }

  .unclickable {
    opacity: 0.3;
  }

  .custom-control {
    position: absolute;
    top: 10px;
    right: 10px;
    background: white;
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



</style>

<svelte:head>
	<title>Urban Prospects Property Search App</title>
  <script src="https://kit.fontawesome.com/19fda93b05.js" crossorigin="anonymous"></script>

  <script src="https://api.mapbox.com/mapbox-gl-js/v3.5.1/mapbox-gl.js"></script>
  <link href="https://api.mapbox.com/mapbox-gl-js/v3.5.1/mapbox-gl.css" rel="stylesheet" />

  <script src='https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-draw/v1.4.3/mapbox-gl-draw.js'></script>
  <link rel='stylesheet' href='https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-draw/v1.4.3/mapbox-gl-draw.css' type='text/css' />

  <script src="https://unpkg.com/@turf/turf/turf.min.js"></script>
</svelte:head>

<svelte:window on:keydown={_handle_window_keydown}/>

<div class:is-ready={is_ready} class="container app search-app relative mapview" style="--font-family: var(--font-sans);--color-dark-overlay-lightest: var(--up-c-f1e9f7); --thumb-bg: var(--up-c-5c2587); --track-bg: var(--up-c-f1e9f7); --progress-bg: var(--up-c-f1e9f7); --multi-item-bg: var(--up-c-5c2587); --multi-item-color: var(--up-c-ffffff); --clear-icon-color: var(--up-c-ffffff); --multi-select-padding: 0 0 0 0.5em; --item-hover-bg: var(--up-c-f1e9f7); --color-dark: var(--up-c-5c2587); ">

  <div id="mapbox" class="map-container dark-overlay-lightest border-rounder"></div>

  <div class="custom-control">
        <button aria-label="Measure Radius (m)"  data-balloon-pos="left" on:click={_handle_draw_circle} id="drawCircle" class="{draw_circle_mode ? 'active' : ''}"><i class=" icon-map-pin"></i></button>
        <button aria-label="Measure Distance (m)"  data-balloon-pos="left" on:click={_handle_draw_line} id="drawLine" class="{draw_line_mode ? 'active' : ''}"><i class=" icon-ruler"></i></button>
        <button aria-label="Measure Area (m²)"  data-balloon-pos="left" on:click={_handle_draw_polygon} id="drawPolygon" class="{draw_polygon_mode ? 'active' : ''}"><i class=" icon-pentagon"></i></button>
        <button aria-label="Clear Measurement" data-balloon-pos="left" on:click={_handle_delete_all} id="deleteAll"><i class=" icon-trash-2"></i></button>
    </div>

  <p>Radius: <span id="radius">0</span> meters</p>

  <div class="listing-container">
    <div class="flex wrap">
      <div class="one-third border-rounder border-primary padding-top padding-left padding-right search-panel-container">

        <form>
          <div class="filter-container">
            <div class="container-thinner light-overlay border-round">
              
              <div class="flex padding-bottom">
                <div class="half">
                  <h5>Mapping Layers</h5>
                </div>
                <div class="half">
                  <div class="checkbox-group"><div class=""><input bind:checked={satellite} type="checkbox" value="1" id="mapstyle_checkbox"  on:change={_handle_change_map_style}> <label for="mapstyle_checkbox" style="padding-right: 2em; text-align: right;">Satellite</label></div></div>  
                </div>
              </div>

              <div class="{use_debug ? 'debug': ''} container-thinner light-overlay border-round debug-container scroll-overflow">
                <code>Mapping Layers: {Object.keys(mapping_layers).length ? JSON.stringify(mapping_layers): ''}</code>
              </div>

              <div class="full checkbox-group"  style="--checkbox-color: var(--up-c-ffa6a3);">
                <div><input bind:checked={mapping_layers.zoning} type="checkbox" value="1" name="mapping_layer_zoning" id="mapping_layer_zoning" on:change={_handle_change_mapping_layer}/> <label for="mapping_layer_zoning">Land Zoning</label></div>
              </div>

              <div class="full checkbox-group" style="--checkbox-color: var(--up-c-fd32c5);">
                <div><input bind:checked={mapping_layers.ass} type="checkbox" value="1" name="mapping_layer_ass" id="mapping_layer_ass" on:change={_handle_change_mapping_layer}/> <label for="mapping_layer_ass">Acid Sulfate Soil</label></div>
              </div>

              <div class="full checkbox-group" style="--checkbox-color: var(--up-c-ff0000);">
                <div><input bind:checked={mapping_layers.frontage} type="checkbox" value="1" name="mapping_layer_frontage" id="mapping_layer_frontage" on:change={_handle_change_mapping_layer}/> <label for="mapping_layer_frontage">Active Street Frontages</label></div>
              </div>

              <div class="full checkbox-group"  style="--checkbox-color: var(--up-c-fdca78);">
                <div><input bind:checked={mapping_layers.airport} type="checkbox" value="1" name="mapping_layer_airport" id="mapping_layer_airport" on:change={_handle_change_mapping_layer}/> <label for="mapping_layer_airport">Airport Noise</label></div>
              </div>

              <div class="full checkbox-group" style="--checkbox-color: var(--up-c-e88b91);">
                <div><input bind:checked={mapping_layers.bushfire} type="checkbox" value="1" name="mapping_layer_bushfire" id="mapping_layer_bushfire" on:change={_handle_change_mapping_layer}/> <label for="mapping_layer_bushfire">Bushfire Prone</label></div>
              </div>

              <div class="full checkbox-group"  style="--checkbox-color: var(--up-c-f3c944);">
                <div><input bind:checked={mapping_layers.heritage} type="checkbox" value="1" name="mapping_layer_heritage" id="mapping_layer_heritage" on:change={_handle_change_mapping_layer}/> <label for="mapping_layer_heritage">Heritage</label></div>
              </div>

              <div class="full checkbox-group"  style="--checkbox-color: var(--up-c-c595e8);">
                <div><input bind:checked={mapping_layers.fsr} type="checkbox" value="1" name="mapping_layer_fsr" id="mapping_layer_fsr" on:change={_handle_change_mapping_layer}/> <label for="mapping_layer_fsr">Floor Space Ratios</label></div>
              </div>

              <div class="full checkbox-group"  style="--checkbox-color: var(--up-c-00bce7);">
                <div><input bind:checked={mapping_layers.floodplanning} type="checkbox" value="1" name="mapping_layer_floodplanning" id="mapping_layer_floodplanning" on:change={_handle_change_mapping_layer}/> <label for="mapping_layer_floodplanning">Flood Planning</label></div>
              </div>

              <div class="full checkbox-group"  style="--checkbox-color: var(--up-c-b3e096);">
                <div><input bind:checked={mapping_layers.hob} type="checkbox" value="1" name="mapping_layer_hob" id="mapping_layer_hob" on:change={_handle_change_mapping_layer}/> <label for="mapping_layer_hob">Height of Building</label></div>
              </div>

              <div class="full checkbox-group" style="--checkbox-color: var(--up-c-ff776e)"><div><input bind:checked={mapping_layers.lsz} type="checkbox" value="1" name="mapping_layer_lsz" id="mapping_layer_lsz" on:change={_handle_change_mapping_layer}/> <label for="mapping_layer_lsz">Minimum Lot Size</label></div></div>

              <div class="full checkbox-group" style="--checkbox-color: var(--up-c-9d56f6)"><div><input bind:checked={mapping_layers.coastalmanagement} type="checkbox" value="1" name="mapping_layer_coastalmanagement" id="mapping_layer_coastalmanagement" on:change={_handle_change_mapping_layer}/> <label for="mapping_layer_coastalmanagement">Coastal Management</label></div></div>
              <div class="full checkbox-group" style="--checkbox-color: var(--up-c-ffb300)"><div><input bind:checked={mapping_layers.contaminationsites} type="checkbox" value="1" name="mapping_layer_contaminationsites" id="mapping_layer_contaminationsites" on:change={_handle_change_mapping_layer}/> <label for="mapping_layer_contaminationsites">Contamination Sites</label></div></div>
              <div class="full checkbox-group" style="--checkbox-color: var(--up-c-98cb72)"><div><input bind:checked={mapping_layers.declaredwildness} type="checkbox" value="1" name="mapping_layer_declaredwildness" id="mapping_layer_declaredwildness" on:change={_handle_change_mapping_layer}/> <label for="mapping_layer_declaredwildness">Declared Wildness</label></div></div>
              <div class="full checkbox-group" style="--checkbox-color: var(--up-c-000000)"><div><input bind:checked={mapping_layers.developmentcontrolplan} type="checkbox" value="1" name="mapping_layer_developmentcontrolplan" id="mapping_layer_developmentcontrolplan" on:change={_handle_change_mapping_layer}/> <label for="mapping_layer_developmentcontrolplan">Development Control Plan (LGA-Based)</label></div></div>
              <div class="full checkbox-group" style="--checkbox-color: var(--up-c-00bfff)"><div><input bind:checked={mapping_layers.drinking_water_catchment} type="checkbox" value="1" name="mapping_layer_drinking_water_catchment" id="mapping_layer_drinking_water_catchment" on:change={_handle_change_mapping_layer}/> <label for="mapping_layer_drinking_water_catchment">Drinking Water Catchment</label></div></div>
              <div class="full checkbox-group" style="--checkbox-color: var(--up-c-a0522d)"><div><input bind:checked={mapping_layers.environmentally_sensitive_land} type="checkbox" value="1" name="mapping_layer_environmentally_sensitive_land" id="mapping_layer_environmentally_sensitive_land" on:change={_handle_change_mapping_layer}/> <label for="mapping_layer_environmentally_sensitive_land">Environmentally Sensitive Land</label></div></div>
              <div class="full checkbox-group" style="--checkbox-color: var(--up-c-99fffd)"><div><input bind:checked={mapping_layers.groundwatervulnerability} type="checkbox" value="1" name="mapping_layer_groundwatervulnerability" id="mapping_layer_groundwatervulnerability" on:change={_handle_change_mapping_layer}/> <label for="mapping_layer_groundwatervulnerability">Ground Water Vulnerability</label></div></div>
              <div class="full checkbox-group" style="--checkbox-color: var(--up-c-ff0000)"><div><input bind:checked={mapping_layers.landsliderisk} type="checkbox" value="1" name="mapping_layer_landsliderisk" id="mapping_layer_landsliderisk" on:change={_handle_change_mapping_layer}/> <label for="mapping_layer_landsliderisk">Land Slide Risk</label></div></div>
              <div class="full checkbox-group" style="--checkbox-color: var(--up-c-ffa500)"><div><input bind:checked={mapping_layers.mine_subsidence_district} type="checkbox" value="1" name="mapping_layer_mine_subsidence_district" id="mapping_layer_mine_subsidence_district" on:change={_handle_change_mapping_layer}/> <label for="mapping_layer_mine_subsidence_district">Mine Subsidence District</label></div></div>
              <div class="full checkbox-group" style="--checkbox-color: var(--up-c-ffd700)"><div><input bind:checked={mapping_layers.mineralresourceland} type="checkbox" value="1" name="mapping_layer_mineralresourceland" id="mapping_layer_mineralresourceland" on:change={_handle_change_mapping_layer}/> <label for="mapping_layer_mineralresourceland">Mineral Resource Land</label></div></div>
              <div class="full checkbox-group" style="--checkbox-color: var(--up-c-c0c0c0)"><div><input bind:checked={mapping_layers.obstaclelimitationsurface} type="checkbox" value="1" name="mapping_layer_obstaclelimitationsurface" id="mapping_layer_obstaclelimitationsurface" on:change={_handle_change_mapping_layer}/> <label for="mapping_layer_obstaclelimitationsurface">Obstacle Limitation Surface</label></div></div>
              <div class="full checkbox-group" style="--checkbox-color: var(--up-c-fd32c5)"><div><input bind:checked={mapping_layers.regionalgrowthboundary} type="checkbox" value="1" name="mapping_layer_regionalgrowthboundary" id="mapping_layer_regionalgrowthboundary" on:change={_handle_change_mapping_layer}/> <label for="mapping_layer_regionalgrowthboundary">Regional Growth Boundary</label></div></div>
              <div class="full checkbox-group" style="--checkbox-color: var(--up-c-008000)"><div><input bind:checked={mapping_layers.riparianlandwatercourse} type="checkbox" value="1" name="mapping_layer_riparianlandwatercourse" id="mapping_layer_riparianlandwatercourse" on:change={_handle_change_mapping_layer}/> <label for="mapping_layer_riparianlandwatercourse">Riparian Land Water Course</label></div></div>
              <div class="full checkbox-group" style="--checkbox-color: var(--up-c-ffff00)"><div><input bind:checked={mapping_layers.salinity} type="checkbox" value="1" name="mapping_layer_salinity" id="mapping_layer_salinity" on:change={_handle_change_mapping_layer}/> <label for="mapping_layer_salinity">Salinity</label></div></div>
              <div class="full checkbox-group" style="--checkbox-color: var(--up-c-8b4513)"><div><input bind:checked={mapping_layers.scenicprotectionland} type="checkbox" value="1" name="mapping_layer_scenicprotectionland" id="mapping_layer_scenicprotectionland" on:change={_handle_change_mapping_layer}/> <label for="mapping_layer_scenicprotectionland">Scenic Protection Land</label></div></div>
              <div class="full checkbox-group" style="--checkbox-color: var(--up-c-ff0000)"><div><input bind:checked={mapping_layers.suburbs} type="checkbox" value="1" name="mapping_layer_suburbs" id="mapping_layer_suburbs" on:change={_handle_change_mapping_layer}/> <label for="mapping_layer_suburbs">Suburbs</label></div></div>
              <div class="full checkbox-group" style="--checkbox-color: var(--up-c-32cd32)"><div><input bind:checked={mapping_layers.terrestrialbiodiversity} type="checkbox" value="1" name="mapping_layer_terrestrialbiodiversity" id="mapping_layer_terrestrialbiodiversity" on:change={_handle_change_mapping_layer}/> <label for="mapping_layer_terrestrialbiodiversity">Terrestrial Biodiversity</label></div></div>
              <div class="full checkbox-group" style="--checkbox-color: var(--up-c-66f2ff)"><div><input bind:checked={mapping_layers.wetlands} type="checkbox" value="1" name="mapping_layer_wetlands" id="mapping_layer_wetlands" on:change={_handle_change_mapping_layer}/> <label for="mapping_layer_wetlands">Wetlands</label></div></div>

              

            </div>
          </div>

          <div class="row right padding-top">
            <a class="btn btn-reset" class:unclickable={!hide_properties} href="?" on:click={_zoom_map}>Show Properties</a>
            <a class="btn btn-reset" href="?" on:click={_reset_map}>Reset</a>
          </div>

          <div class="row padding-top">
            <!-- svelte-ignore a11y-label-has-associated-control -->
             <!-- <label>Radius Area: {circle_area.toFixed(2)} m²</label><br/> -->
            <!-- svelte-ignore a11y-label-has-associated-control -->
            <label>Distance from Radius: { parseInt(circle_radius) || '0' } ms</label><br/>
            <!-- svelte-ignore a11y-label-has-associated-control -->
            <label>Center Point: { circle_center  || 'N/A' }</label>
          </div>

        </form>
      </div>
      <div class="two-third padding-left padding-right padding-desktop search-result-parent-container">
      </div>
    </div>
  </div>
  
  
</div>