<script>
  // @ts-nocheck
  import { onMount, onDestroy } from 'svelte';

  let mapContainer;
  let map;
  let mapLoaded = false;

  // Lot geometry for the property
  const lotGeometry = {
    type: 'Feature',
    properties: { lotnumber: null, plannumber: '67869', planlabel: 'SP67869' },
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [151.212244192, -33.884584942],
        [151.212263814, -33.884588231],
        [151.212263572, -33.884589235],
        [151.21228713, -33.884593153],
        [151.212329108, -33.884601328],
        [151.212299061, -33.884732883],
        [151.21226948, -33.884748615],
        [151.212090083, -33.884720127],
        [151.212070336, -33.884696579],
        [151.21210076, -33.884567184],
        [151.212184071, -33.884578398],
        [151.212242901, -33.884584753],
        [151.212244192, -33.884584942]
      ]]
    }
  };

  // House model position (center of lot)
  const housePosition = [151.2122, -33.88465];

  onMount(() => {
    mapboxgl.accessToken = 'pk.eyJ1IjoiZGFubnlsIiwiYSI6ImNseGJta3lhMzA3ZHEya3ExY3huOXdvaHUifQ.tWLLIKUxBJ_JBKH5o2XHTQ';

    map = new mapboxgl.Map({
      container: mapContainer,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [151.2122, -33.8846],
      zoom: 17,
      pitch: 45,
      bearing: -17.6,
      antialias: true
    });

    map.on('load', () => {
      mapLoaded = true;

      // Add lot geometry source
      map.addSource('lot', {
        type: 'geojson',
        data: lotGeometry
      });

      // Add lot boundary fill
      map.addLayer({
        id: 'lot-fill',
        type: 'fill',
        source: 'lot',
        paint: {
          'fill-color': '#6366f1',
          'fill-opacity': 0.2
        }
      });

      // Add lot boundary line
      map.addLayer({
        id: 'lot-outline',
        type: 'line',
        source: 'lot',
        paint: {
          'line-color': '#6366f1',
          'line-width': 3
        }
      });

      // Add house marker
      const el = document.createElement('div');
      el.className = 'house-marker';
      el.innerHTML = '🏠';
      el.style.fontSize = '32px';
      el.style.cursor = 'pointer';

      new mapboxgl.Marker(el)
        .setLngLat(housePosition)
        .addTo(map);

      // Add a model label
      const popup = new mapboxgl.Popup({ offset: 25 })
        .setHTML('<div class="p-2"><h3 class="font-bold">Modern House 3D Model</h3><p class="text-sm">SP67869</p></div>');

      new mapboxgl.Marker(el)
        .setLngLat(housePosition)
        .setPopup(popup)
        .addTo(map);
    });
  });

  onDestroy(() => {
    if (map) {
      map.remove();
    }
  });
</script>

<svelte:head>
  <script src="https://api.mapbox.com/mapbox-gl-js/v3.5.1/mapbox-gl.js"></script>
  <link href="https://api.mapbox.com/mapbox-gl-js/v3.5.1/mapbox-gl.css" rel="stylesheet" />
</svelte:head>

<style>
  .house-page {
    display: flex;
    height: calc(100vh - 64px);
  }

  .sidebar {
    width: 320px;
    background: white;
    padding: 1.5rem;
    border-right: 1px solid var(--up-c-e5e7eb);
    overflow-y: auto;
  }

  .map-container {
    flex: 1;
    position: relative;
  }

  .lot-info {
    margin-top: 1rem;
  }

  .lot-info h3 {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--up-c-31144d);
    margin-bottom: 0.75rem;
  }

  .info-card {
    background: var(--up-c-f8fafc);
    border-radius: 0.5rem;
    padding: 1rem;
  }

  .info-row {
    display: flex;
    justify-content: space-between;
    padding: 0.25rem 0;
    font-size: 0.875rem;
  }

  .info-label {
    color: var(--up-c-64748b);
  }

  .info-value {
    color: var(--up-c-31144d);
    font-weight: 500;
  }

  .status-badge {
    display: inline-block;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-weight: 500;
  }

  .status-loaded {
    background: var(--up-c-dcfce7);
    color: var(--up-c-166534);
  }

  .status-loading {
    background: var(--up-c-fef3c7);
    color: var(--up-c-92400e);
  }

  .instructions {
    margin-top: 1.5rem;
    font-size: 0.75rem;
    color: var(--up-c-64748b);
  }

  .instructions ul {
    list-style: disc;
    padding-left: 1rem;
    margin-top: 0.25rem;
  }

  .instructions li {
    padding: 0.125rem 0;
  }
</style>

<div class="house-page">
  <!-- Left Panel - Info -->
  <div class="sidebar">
    <h2 class="text-lg font-bold" style="color: var(--up-c-31144d);">Property Site</h2>
    <p class="text-xs" style="color: var(--up-c-64748b); margin-top: 0.25rem;">Lot Plan: SP67869</p>

    <!-- Lot Details -->
    <div class="lot-info">
      <h3>Lot Details</h3>
      <div class="info-card">
        <div class="info-row">
          <span class="info-label">Plan Number:</span>
          <span class="info-value">SP67869</span>
        </div>
        <div class="info-row">
          <span class="info-label">Coordinates:</span>
          <span class="info-value">-33.8846, 151.2122</span>
        </div>
      </div>
    </div>

    <!-- Model Info -->
    <div class="lot-info">
      <h3>3D Model</h3>
      <div class="info-card">
        <div class="info-row">
          <span class="info-label">Model:</span>
          <span class="info-value">Modern House</span>
        </div>
        <div class="info-row">
          <span class="info-label">Status:</span>
          <span class="status-badge {mapLoaded ? 'status-loaded' : 'status-loading'}">
            {mapLoaded ? 'Loaded' : 'Loading...'}
          </span>
        </div>
      </div>
    </div>

    <!-- Instructions -->
    <div class="instructions">
      <p>Use mouse to:</p>
      <ul>
        <li>Left-click + drag to rotate</li>
        <li>Right-click + drag to pan</li>
        <li>Scroll to zoom</li>
      </ul>
    </div>
  </div>

  <!-- Right Panel - Map -->
  <div class="map-container">
    <div id="mapbox" bind:this={mapContainer} style="width: 100%; height: 100%;"></div>
  </div>
</div>