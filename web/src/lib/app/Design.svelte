<script>
  // @ts-nocheck
  import { onMount } from 'svelte';
  import { propertyTypes, isDesignEligible } from './propertyTypes.js';

  export let use_debug = false;   // Ctrl+Shift+D in the map view reveals dev-only UI
  export let property;
  export let map;
  export let map_3d;

  export let modelRotateX = 0;
  export let modelRotateY = 0;
  export let modelRotateZ = 0;
  export let currentFitRotation = 0;
  export let modelScale = 1;
  export let modelNudgeX = 0;
  export let modelNudgeY = 0;
  export let modelNudgeZ = 0;
  export let modelLoaded = false;
  export let uploadedModelUrl = null;
  export let fittedAnchor = null;
  export let currentModelId = null;
  export let selectedDesignId = null;
  export let clipLayerFootprintString = null;

  $: if (property && map && property.lotGeoJson) {
    const currentFootprint = JSON.stringify(property.lotGeoJson.geometry.coordinates);
    if (clipLayerFootprintString !== currentFootprint) {
      clipLayerFootprintString = currentFootprint;

      const wasDesignId = selectedDesignId;
      const wasUploadedUrl = uploadedModelUrl;

      removePropertyModel();
      updateClipLayer();

      if (wasDesignId) {
        selectedDesignId = wasDesignId;
        loadPropertyModel(wasDesignId);
        map_3d = true;
      } else if (wasUploadedUrl) {
        removePropertyModel();
        const modelId = 'uploaded-model-' + Date.now();
        const geom = property.lotGeoJson.geometry;
        const footprintCoords = geom.type === 'MultiPolygon'
          ? geom.coordinates[0]
          : geom.coordinates;
        const streetFacingBearing = property?.record
          ? getStreetFacingBearing(footprintCoords, property.record)
          : null;
        measureAndFit(wasUploadedUrl, footprintCoords, streetFacingBearing, 0).then(fitResult => {
          try {
            if (!map.getModel || !map.getModel(modelId)) {
              map.addModel(modelId, wasUploadedUrl);
            }
          } catch (e) { console.warn('addModel error on re-place:', e); }
          waitForModelLoad(modelId).then(() => {
            placeModelOnMap(modelId, fitResult.fittedPosition, fitResult.fitRotation, fitResult.unitScale, fitResult);
          });
        }).catch(e => console.warn('Re-place uploaded model failed:', e));
        map_3d = true;
      } else {
        selectedDesignId = null;
      }
    }
  }

  function updateClipLayer() {
    if (!map || !property || !property.lotGeoJson) return;

    const source = map.getSource('property-footprint-source');
    if (source) {
      source.setData(property.lotGeoJson);
    } else {
      map.addSource('property-footprint-source', {
        type: 'geojson',
        data: property.lotGeoJson
      });
      map.addLayer({
        id: 'property-clip-layer',
        type: 'clip',
        source: 'property-footprint-source',
        layout: { 'clip-layer-types': ['symbol', 'model'] }
      });
    }

    if (map.getLayer('property-model-layer')) {
      map.moveLayer('property-model-layer');
    }
  }

  function selectDesign(design) {
    // Must match the grey-out rule on the card, or eligible-looking cards
    // silently do nothing when clicked.
    if (!isDesignEligible(property, design)) return;

    
    if (selectedDesignId === design.id) {
      selectedDesignId = null;
      removePropertyModel();
      return;
    }
    selectedDesignId = design.id;
    loadPropertyModel(design.id);
    map_3d = true;
  }

  // ── Geo helpers ────────────────────────────────────────────────────────────

  function metersPerDeg(lat) {
    return {
      lat: 111320,
      lng: 40075000 * Math.cos(lat * Math.PI / 180) / 360
    };
  }

  function getFootprintBounds(coords) {
    const ring = coords[0].slice(0, -1);
    let minLng = Infinity, maxLng = -Infinity;
    let minLat = Infinity, maxLat = -Infinity;
    for (const pt of ring) {
      if (pt[0] < minLng) minLng = pt[0];
      if (pt[0] > maxLng) maxLng = pt[0];
      if (pt[1] < minLat) minLat = pt[1];
      if (pt[1] > maxLat) maxLat = pt[1];
    }
    return { minLng, maxLng, minLat, maxLat };
  }

  function getFootprintCentroid(coords) {
    const ring = coords[0].slice(0, -1);
    const [ox, oy] = ring[0];
    const n = ring.length;
    let area = 0, cx = 0, cy = 0;
    for (let i = 0; i < n; i++) {
      const x0 = ring[i][0] - ox,       y0 = ring[i][1] - oy;
      const x1 = ring[(i+1)%n][0] - ox, y1 = ring[(i+1)%n][1] - oy;
      const cross = x0*y1 - x1*y0;
      area += cross; cx += (x0+x1)*cross; cy += (y0+y1)*cross;
    }
    area *= 0.5;
    if (Math.abs(area) < 1e-20)
      return [ring.reduce((s,p)=>s+p[0],0)/n, ring.reduce((s,p)=>s+p[1],0)/n];
    return [cx/(6*area)+ox, cy/(6*area)+oy];
  }

  // How far the model's footprint centre has to move, in the model's own rotated
  // frame, for its footprint to sit inside the lot. Returns [dx, dz] in metres.
  // The lot is reduced to its extent in that frame, so a notch in an L-shaped lot
  // still counts as buildable — this squares up an overhanging box, it is not a
  // full containment solve, and it never applies a setback.
  function containFootprint(coords, cLng, cLat, mPerDeg, cosR, sinR, modelWidth, modelDepth) {
    const ring = coords[0];
    if (!ring || ring.length < 3) return [0, 0];

    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const [lng, lat] of ring) {
      const east  = (lng - cLng) * mPerDeg.lng;
      const north = (lat - cLat) * mPerDeg.lat;
      // Inverse of the local->world mapping used for the anchor.
      const mx =  east * cosR + north * sinR;
      const mz =  east * sinR - north * cosR;
      if (mx < minX) minX = mx;
      if (mx > maxX) maxX = mx;
      if (mz < minZ) minZ = mz;
      if (mz > maxZ) maxZ = mz;
    }

    // Along an axis where the model is longer than the lot there is nothing to
    // clamp to, so centre it on the lot instead and let it overhang evenly.
    const fit = (half, lo, hi) =>
      (hi - lo) < half * 2 ? (lo + hi) / 2 : Math.min(Math.max(0, lo + half), hi - half);

    return [fit(modelWidth / 2, minX, maxX), fit(modelDepth / 2, minZ, maxZ)];
  }

  function getFootprintLongEdgeBearing(coords, mPerDegLat, mPerDegLng) {
    const ring = coords[0].slice(0, -1);
    const n = ring.length;
    let bestLen = -1, bestBearing = 0;
    for (let i = 0; i < n; i++) {
      const [x0, y0] = ring[i];
      const [x1, y1] = ring[(i+1)%n];
      const dx = (x1 - x0) * mPerDegLng;
      const dy = (y1 - y0) * mPerDegLat;
      const len = Math.sqrt(dx*dx + dy*dy);
      if (len > bestLen) {
        bestLen = len;
        let b = Math.atan2(dx, dy) * 180 / Math.PI;
        if (b < 0) b += 360;
        bestBearing = b;
      }
    }
    return bestBearing;
  }

  function getStreetFacingBearing(footprintCoords, record) {
    try {
      const ring = footprintCoords[0].slice(0, -1);
      const n = ring.length;
      const [fpCenterLng, fpCenterLat] = getFootprintCentroid(footprintCoords);
      const mPerDeg = metersPerDeg(fpCenterLat);

      const edges = ring.map((pt, i) => {
        const [x0, y0] = pt;
        const [x1, y1] = ring[(i + 1) % n];
        const dx = (x1 - x0) * mPerDeg.lng;
        const dy = (y1 - y0) * mPerDeg.lat;
        const len = Math.sqrt(dx * dx + dy * dy);
        return { i, x0, y0, x1, y1, dx, dy, len };
      });

      const frontageTarget = record?.primary_frontage_length_m
        ? parseFloat(record.primary_frontage_length_m)
        : null;

      let frontageEdges;
      if (frontageTarget && frontageTarget > 0) {
        const sorted = [...edges].sort((a, b) => b.len - a.len);
        let cumLen = 0;
        frontageEdges = [];
        for (const e of sorted) {
          if (cumLen >= frontageTarget * 1.05) break;
          frontageEdges.push(e);
          cumLen += e.len;
        }
        console.log(
          `Street frontage: target=${frontageTarget.toFixed(1)}m, ` +
          `matched ${frontageEdges.length} edge(s) totalling ${cumLen.toFixed(1)}m ` +
          `(road: ${record?.primary_frontage_road ?? 'unknown'})`
        );
      } else {
        frontageEdges = [edges.reduce((best, e) => e.len > best.len ? e : best)];
        console.log('Street frontage: no record data, using longest edge');
      }

      let totalLen = 0, midLng = 0, midLat = 0;
      for (const e of frontageEdges) {
        midLng += ((e.x0 + e.x1) / 2) * e.len;
        midLat += ((e.y0 + e.y1) / 2) * e.len;
        totalLen += e.len;
      }
      midLng /= totalLen;
      midLat /= totalLen;

      let sumDx = 0, sumDy = 0;
      for (const e of frontageEdges) {
        sumDx += e.dx * e.len;
        sumDy += e.dy * e.len;
      }

      const norm1 = { dx:  sumDy, dy: -sumDx };
      const norm2 = { dx: -sumDy, dy:  sumDx };

      const toCenterDx = (fpCenterLng - midLng) * mPerDeg.lng;
      const toCenterDy = (fpCenterLat - midLat) * mPerDeg.lat;
      const dot1 = norm1.dx * toCenterDx + norm1.dy * toCenterDy;
      const outward = dot1 < 0 ? norm1 : norm2;

      let bearing = Math.atan2(outward.dx, outward.dy) * 180 / Math.PI;
      if (bearing < 0) bearing += 360;

      console.log(`getStreetFacingBearing → ${bearing.toFixed(1)}°`);
      return bearing;

    } catch (err) {
      console.warn('getStreetFacingBearing failed:', err);
      return null;
    }
  }

  // ── Three.js loader ────────────────────────────────────────────────────────

  let threeReady = null;
  function ensureThree() {
    if (threeReady) return threeReady;
    threeReady = new Promise((resolve, reject) => {
      function loadScript(src) {
        return new Promise((res, rej) => {
          if (document.querySelector(`script[src="${src}"]`)) { res(); return; }
          const s = document.createElement('script');
          s.src = src; s.async = false;
          s.onload = res;
          s.onerror = () => rej(new Error('Failed to load ' + src));
          document.head.appendChild(s);
        });
      }

      const BASE = 'https://cdn.jsdelivr.net/npm/three@0.132.2';
      loadScript(`${BASE}/build/three.min.js`)
        .then(() => loadScript(`${BASE}/examples/js/loaders/GLTFLoader.js`))
        .then(() => loadScript(`${BASE}/examples/js/loaders/OBJLoader.js`))
        .then(() => loadScript(`${BASE}/examples/js/exporters/GLTFExporter.js`))
        .then(resolve)
        .catch(reject);
    });
    return threeReady;
  }

  // ── measureAndFit ──────────────────────────────────────────────────────────
  // glbSource: a URL string (remote) OR an ArrayBuffer (uploaded file).
  // When an ArrayBuffer is supplied, GLTFLoader.parse() is used directly so
  // Three.js never tries to JSON.parse binary GLB bytes via XHR/fetch.

  async function measureAndFit(glbSource, footprintCoords, streetFacingBearing = null, frontOffset = 0, heightAxisOverride = null) {
    await ensureThree();
    return new Promise((resolve, reject) => {
      const loader = new THREE.GLTFLoader();

      const onLoad = (gltf) => {
        const box = new THREE.Box3().setFromObject(gltf.scene);
        const size = new THREE.Vector3();
        const centerOffset = new THREE.Vector3();
        box.getSize(size);
        box.getCenter(centerOffset);

        const maxDim = Math.max(size.x, size.y, size.z);
        let unitScale = 1.0;
        if (maxDim > 5000)      { unitScale = 0.001; }
        else if (maxDim > 500)  { unitScale = 0.01; }

        const dims = [
          { axis: 'x', val: size.x },
          { axis: 'y', val: size.y },
          { axis: 'z', val: size.z }
        ].sort((a, b) => b.val - a.val);

        // Default guess: buildings are usually wider than they are tall, so the
        // smallest dimension is the height. Designs that break that (apartment
        // blocks on narrow lots) declare `heightAxis` and skip the guess.
        let groundAxes, heightAxis;
        if (heightAxisOverride) {
          heightAxis = dims.find(d => d.axis === heightAxisOverride) || dims[2];
          groundAxes = dims.filter(d => d.axis !== heightAxis.axis);
        } else {
          groundAxes = dims.slice(0, 2);
          heightAxis = dims[2];
        }
        const xGroundAxis = groundAxes.find(d => d.axis === 'x') || groundAxes[0];
        const zGroundAxis = groundAxes.find(d => d.axis !== xGroundAxis.axis);

        const modelWidth  = xGroundAxis.val * unitScale;
        const modelDepth  = zGroundAxis.val * unitScale;
        const modelHeight = heightAxis.val  * unitScale;

        const offsetX = centerOffset.x * unitScale;
        const offsetZ = centerOffset.z * unitScale;

        const [fpCenterLng, fpCenterLat] = getFootprintCentroid(footprintCoords);
        const mPerDeg = metersPerDeg(fpCenterLat);

        let fitRotation;
        if (streetFacingBearing !== null) {
          fitRotation = ((streetFacingBearing + frontOffset) % 360 + 360) % 360;
          console.log(`Street-facing bearing: ${streetFacingBearing.toFixed(1)}° + frontOffset: ${frontOffset.toFixed(1)}° → fitRotation: ${fitRotation.toFixed(1)}°`);
        } else {
          const edgeBearing = getFootprintLongEdgeBearing(footprintCoords, mPerDeg.lat, mPerDeg.lng);
          const modelIsLandscape = modelWidth >= modelDepth;
          const baseRotation = modelIsLandscape ? edgeBearing - 90 : edgeBearing;
          fitRotation = (((baseRotation + frontOffset) % 360) + 360) % 360;
        }

        const rotRad = fitRotation * Math.PI / 180;
        const cosR = Math.cos(rotRad), sinR = Math.sin(rotRad);

        // Sitting the model's centre on the lot's centroid does not keep it inside
        // the lot: a centroid is not the centre of the buildable rectangle, so a long
        // footprint on an irregular lot hangs over a boundary. Slide the footprint
        // back inside the lot's extent, measured in the model's own rotated frame.
        const [shiftX, shiftZ] = containFootprint(
          footprintCoords, fpCenterLng, fpCenterLat, mPerDeg,
          cosR, sinR, modelWidth, modelDepth
        );

        const worldEast  =  offsetX * cosR + offsetZ * sinR;
        const worldSouth = -offsetX * sinR + offsetZ * cosR;

        // Same local->world mapping as above: local +x runs east at 0deg, local +z south.
        const shiftEast  = shiftX * cosR + shiftZ * sinR;
        const shiftNorth = shiftX * sinR - shiftZ * cosR;
        if (shiftX || shiftZ) {
          console.log(`Contained within lot: shifted ${shiftX.toFixed(2)}m x, ${shiftZ.toFixed(2)}m z`);
        }

        const anchorLng = fpCenterLng + (shiftEast  - worldEast)  / mPerDeg.lng;
        const anchorLat = fpCenterLat + (shiftNorth + worldSouth) / mPerDeg.lat;
        console.log(`Anchor offset: offsetX=${offsetX.toFixed(2)}m offsetZ=${offsetZ.toFixed(2)}m → worldEast=${worldEast.toFixed(2)}m worldSouth=${worldSouth.toFixed(2)}m`);

        resolve({
          fittedPosition: [anchorLng, anchorLat],
          fitRotation,
          modelWidth, modelDepth, modelHeight,
          unitScale, offsetX, offsetZ,
          axisMapping: `W:${xGroundAxis.axis} D:${zGroundAxis.axis} H:${heightAxis.axis}`
        });
      };

      if (glbSource instanceof ArrayBuffer) {
        // Direct buffer parse — avoids Three.js trying to JSON.parse binary bytes
        loader.parse(glbSource, '', onLoad, reject);
      } else {
        // Remote URL — standard XHR load
        loader.load(glbSource, onLoad, undefined, reject);
      }
    });
  }

  // ── Remove existing model layers/sources ───────────────────────────────────

  function removePropertyModel() {
    if (!map) return;
    if (map.getLayer('property-model-layer')) map.removeLayer('property-model-layer');
    if (map.getSource('property-model-source')) map.removeSource('property-model-source');
    if (currentModelId) {
      try { map.removeModel(currentModelId); } catch (_) {}
      currentModelId = null;
    }
    modelLoaded = false;
    fittedAnchor = null;
  }

  // ── Place model on map ─────────────────────────────────────────────────────

  // Zoom that frames the whole building. The fixed zoom 20 suited the small
  // placeholder house but sits inside the wall of a 20m+ apartment block, so derive
  // it from the model's own size: fit its largest span into ~60% of the shorter
  // viewport edge. Mapbox GL uses 512px tiles, hence 78271.5 (not the 256px 156543.0).
  function framingZoom(lat, dims) {
    if (!dims) return Math.max(map.getZoom(), 20);
    // At pitch 60 the height projects onto the screen alongside the footprint,
    // so both contribute to the span the camera has to cover.
    const span = Math.max(dims.modelWidth, dims.modelDepth) + (dims.modelHeight || 0);
    if (!(span > 0)) return Math.max(map.getZoom(), 20);

    const canvas = map.getCanvas();
    const viewportPx = Math.min(canvas.clientWidth || 800, canvas.clientHeight || 600);
    const targetPx = viewportPx * 0.6;

    const zoom = Math.log2(78271.516 * Math.cos(lat * Math.PI / 180) * targetPx / span);
    return Math.min(20, Math.max(16, zoom));
  }

  function placeModelOnMap(modelId, fittedPosition, fitRotation = 0, fitScale = 1, fitDims = null) {
    fittedAnchor = fittedPosition;
    currentModelId = modelId;

    modelRotateX  = 0;
    modelRotateY  = 0;
    modelRotateZ  = fitRotation;
    modelScale    = fitScale;
    modelNudgeX   = 0;
    modelNudgeY   = 0;
    modelNudgeZ   = 0;

    if (map.getLayer('property-model-layer')) map.removeLayer('property-model-layer');
    if (map.getSource('property-model-source')) map.removeSource('property-model-source');

    map.addSource('property-model-source', {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [fittedPosition[0], fittedPosition[1], modelNudgeZ] },
        properties: { model: modelId }
      }
    });

    map.addLayer({
      id: 'property-model-layer',
      type: 'model',
      source: 'property-model-source',
      layout: { 'model-id': ['get', 'model'] },
      paint: {
        'model-scale':    [modelScale, modelScale, modelScale],
        'model-rotation': [modelRotateX, modelRotateY, modelRotateZ],
        'model-opacity':  1,
        'model-translation': [0, 0, modelNudgeZ]
      }
    });

    map.flyTo({ center: fittedPosition, pitch: 60, zoom: framingZoom(fittedPosition[1], fitDims) });
    modelLoaded = true;
  }

  // ── Wait for model load ────────────────────────────────────────────────────

  function waitForModelLoad(modelId) {
    return new Promise((resolve) => {
      if (map.getModel && map.getModel(modelId)) {
        resolve();
        return;
      }
      const onModelLoad = (e) => {
        if (e.modelId === modelId || e.id === modelId) {
          map.off('modelload', onModelLoad);
          resolve();
        }
      };
      map.on('modelload', onModelLoad);
      // Fallback in case event already fired or never fires
      setTimeout(resolve, 3000);
    });
  }

  // ── Load a pattern-book design model ──────────────────────────────────────

  let loadGeneration = 0;

  async function loadPropertyModel(designId) {
    if (!map || !property || !property.lotGeoJson) return;

    const design = propertyTypes.find(d => d.id === designId);
    if (!design) return;

    removePropertyModel();

    const myGeneration = ++loadGeneration;
    const modelUrl = design.model;
    const geom = property.lotGeoJson.geometry;
    const footprintCoords = geom.type === 'MultiPolygon'
      ? geom.coordinates[0]
      : geom.coordinates;
    const modelId = `property-model-${design.id}`;

    const streetFacingBearing = property?.record
      ? getStreetFacingBearing(footprintCoords, property.record)
      : null;

    if (myGeneration !== loadGeneration) return;

    const frontOffset = design?.frontOffset ?? 0;
    let fitResult = null;
    let fitError  = null;
    const fitPromise = measureAndFit(modelUrl, footprintCoords, streetFacingBearing, frontOffset, design?.heightAxis ?? null)
      .then(r  => { fitResult = r; })
      .catch(e => { fitError  = e; });

    try {
      if (!map.getModel || !map.getModel(modelId)) {
        map.addModel(modelId, modelUrl);
      }
    } catch (e) {
      console.warn("Model add error:", e);
    }
    const modelReadyPromise = waitForModelLoad(modelId);

    await Promise.all([fitPromise, modelReadyPromise]);

    if (myGeneration !== loadGeneration) return;

    if (fitError) {
      console.warn('measureAndFit failed, using fallback placement:', fitError);
      const fp = getFootprintBounds(footprintCoords);
      const fallbackCenter = [(fp.minLng + fp.maxLng) / 2, (fp.minLat + fp.maxLat) / 2];
      placeModelOnMap(modelId, fallbackCenter);
    } else {
      currentFitRotation = fitResult.fitRotation;
      placeModelOnMap(modelId, fitResult.fittedPosition, fitResult.fitRotation, fitResult.unitScale, fitResult);
      console.log(
        `Model fitted: ${fitResult.modelWidth.toFixed(1)}m × ${fitResult.modelDepth.toFixed(1)}m` +
        ` | rotation: ${fitResult.fitRotation.toFixed(1)}° | axes: ${fitResult.axisMapping}`
      );
    }
  }

  // ── Upload a custom GLB / GLTF / OBJ ──────────────────────────────────────
  //
  // Key fixes vs original:
  //   1. All files are converted to a base64 data URI before calling map.addModel().
  //      Mapbox cannot reliably fetch blob: URLs (same-origin XHR restrictions).
  //   2. OBJ → GLB: geometry is de-indexed before computeVertexNormals so normals
  //      are actually computed; material is converted to MeshStandardMaterial (PBR)
  //      so the GLTF exporter emits valid PBR material descriptors.
  //   3. If GLTFExporter returns a JSON object instead of an ArrayBuffer, we wrap
  //      it in a minimal binary GLB container that Mapbox can parse.
  //   4. ensureThree() guards against loading the same <script> twice.

  // Tracks blob URLs we create so we can revoke them when a new model is loaded.
  let _currentBlobUrl = null;

  async function processGlbBuffer(glbBuffer, targetProperty, isBinary = true) {
    if (_currentBlobUrl) {
      URL.revokeObjectURL(_currentBlobUrl);
      _currentBlobUrl = null;
    }

    const mimeType = isBinary ? 'model/gltf-binary' : 'model/gltf+json';
    const blobUrl = URL.createObjectURL(new Blob([glbBuffer], { type: mimeType }));
    _currentBlobUrl  = blobUrl;
    uploadedModelUrl = blobUrl; // store for lot-switch re-placement

    removePropertyModel();

    const modelId = 'uploaded-model-' + Date.now();
    const p = targetProperty || property;

    if (!p || !p.lotGeoJson) return;

    let geom;
    if (p.lotGeoJson.type === 'FeatureCollection') {
      geom = p.lotGeoJson.features[0]?.geometry;
    } else {
      geom = p.lotGeoJson.geometry;
    }

    if (!geom) return;

    const footprintCoords = geom.type === 'MultiPolygon'
      ? geom.coordinates[0]
      : geom.coordinates;

    const streetFacingBearing = p.record
      ? getStreetFacingBearing(footprintCoords, p.record)
      : null;

    let fitResult = null;
    let fitError  = null;
    
    let parseSource = glbBuffer;
    if (!isBinary) {
       // GLTFLoader.parse can take JSON string
       parseSource = new TextDecoder().decode(glbBuffer);
    }
    
    const fitPromise = measureAndFit(parseSource, footprintCoords, streetFacingBearing, 0)
      .then(r => { fitResult = r; })
      .catch(e => { fitError = e; console.warn('measureAndFit failed:', e); });

    try {
      map.addModel(modelId, blobUrl);
    } catch (e) {
      console.warn('map.addModel error:', e);
    }

    const modelReadyPromise = waitForModelLoad(modelId);
    await Promise.all([fitPromise, modelReadyPromise]);

    if (fitError) {
      const fp = getFootprintBounds(footprintCoords);
      const fallbackCenter = [(fp.minLng + fp.maxLng) / 2, (fp.minLat + fp.maxLat) / 2];
      placeModelOnMap(modelId, fallbackCenter);
    } else {
      currentFitRotation = fitResult.fitRotation;
      placeModelOnMap(modelId, fitResult.fittedPosition, fitResult.fitRotation, fitResult.unitScale, fitResult);
    }

    // Unselect any previously selected pattern-book design
    selectedDesignId = null;
  }

  async function handleModelUpload(event) {
    const file = event.target.files[0];
    const currentProperty = property; // Capture to prevent reactive race conditions
    if (!file || !map || !currentProperty || !currentProperty.lotGeoJson) return;
    event.target.value = ''; // reset immediately so the same file can be re-uploaded

    const fileName = file.name.toLowerCase();
    const isObj    = fileName.endsWith('.obj');

    map_3d = true;

    if (isObj) {
      try {
        await ensureThree();
        const text = await file.text();
        const loader = new THREE.OBJLoader();
        const object = loader.parse(text);

        object.traverse((child) => {
          if (child.isMesh) {
            if (!child.geometry.attributes.normal) {
              child.geometry.computeVertexNormals();
            }
            
            if (!child.geometry.index) {
              const count = child.geometry.attributes.position.count;
              const indices = new Uint32Array(count);
              for (let i = 0; i < count; i++) {
                indices[i] = i;
              }
              child.geometry.setIndex(new THREE.BufferAttribute(indices, 1));
            }

            child.material = new THREE.MeshStandardMaterial({
              color: 0xcccccc,
              roughness: 0.7,
              metalness: 0.0
            });
          }
        });

        const exporter = new THREE.GLTFExporter();
        
        // Try passing options as both 3rd and 4th arguments to cover different Three.js versions
        const exportOptions = { binary: true };
        
        const onComplete = async (result) => {
          if (result instanceof ArrayBuffer) {
            await processGlbBuffer(result, currentProperty);
          } else {
            // GLTFExporter returned a JSON object. We stringify it and convert to an ArrayBuffer.
            const jsonString = JSON.stringify(result);
            const textEncoder = new TextEncoder();
            const jsonBuffer = textEncoder.encode(jsonString).buffer;
            
            // Mapbox GL JS supports glTF JSON loaded from a URL if resources are embedded.
            // processGlbBuffer expects an ArrayBuffer, so we pass the encoded JSON.
            // We need to modify processGlbBuffer to handle type 'model/gltf+json' if it's not binary.
            await processGlbBuffer(jsonBuffer, currentProperty, false);
          }
        };

        try {
          // r132 and older signature: parse(input, onCompleted, options)
          exporter.parse(object, onComplete, exportOptions);
        } catch (e) {
          // newer signature: parse(input, onCompleted, onError, options)
          exporter.parse(object, onComplete, (err) => console.error('Export err:', err), exportOptions);
        }

      } catch (err) {
        console.error('OBJ upload failed:', err);
      }

    } else {
      try {
        const buffer = await file.arrayBuffer();
        await processGlbBuffer(buffer, currentProperty, true);
      } catch (err) {
        console.error('GLB upload failed:', err);
      }
    }
  }

  // ── Nudge: move source point in metres ────────────────────────────────────

  function updateModelPosition() {
    if (!map || !modelLoaded || !fittedAnchor) return;

    const mPerDeg = metersPerDeg(fittedAnchor[1]);
    const newLng  = fittedAnchor[0] + modelNudgeX / mPerDeg.lng;
    const newLat  = fittedAnchor[1] + modelNudgeY / mPerDeg.lat;

    const source = map.getSource('property-model-source');
    if (source) {
      source.setData({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [newLng, newLat, modelNudgeZ] },
        properties: { model: currentModelId }
      });
    }
  }

  // ── Slider handlers ───────────────────────────────────────────────────────

  function handleRotationChange(event) {
    if (map && modelLoaded) {
      map.setPaintProperty('property-model-layer', 'model-rotation', [modelRotateX, modelRotateY, modelRotateZ]);
    }
  }

  function handleScaleChange(event) {
    modelScale = parseFloat(event.target.value);
    if (map && modelLoaded) {
      map.setPaintProperty('property-model-layer', 'model-scale', [modelScale, modelScale, modelScale]);
    }
  }

  function handleNudgeXChange(event) {
    modelNudgeX = parseFloat(event.target.value);
    updateModelPosition();
  }

  function handleNudgeYChange(event) {
    modelNudgeY = parseFloat(event.target.value);
    updateModelPosition();
  }

  function handleNudgeZChange(event) {
    modelNudgeZ = parseFloat(event.target.value);
    if (map && modelLoaded) {
      map.setPaintProperty('property-model-layer', 'model-translation', [0, 0, modelNudgeZ]);
    }
  }

  // ── Save / lightbox ───────────────────────────────────────────────────────

  let savedModelViewImage = null;
  let lightboxOpen = false;

  onMount(() => {
    const savedView = localStorage.getItem('saved_model_view');
    if (savedView) {
      savedModelViewImage = savedView;
    }
  });

  function removeSavedModelView() {
    savedModelViewImage = null;
    localStorage.removeItem('saved_model_view');
  }

  function saveModelView() {
    if (!map || !modelLoaded) return;

    map.once('render', () => {
      try {
        const canvas = map.getCanvas();
        const base64Image = canvas.toDataURL('image/png');
        localStorage.setItem('saved_model_view', base64Image);
        savedModelViewImage = base64Image;
      } catch (err) {
        console.error('Failed to save map view:', err);
      }
    });

    map.triggerRepaint();
  }

  function portal(node) {
    document.body.appendChild(node);
    return {
      destroy() {
        if (node.parentNode) {
          node.parentNode.removeChild(node);
        }
      }
    };
  }


  // ── Buildable envelope (hardcoded pilot) ───────────────────────────────────
  // Hardcoded massing for the pilot demo, keyed off the address the same way
  // the LRM hardcoded list works in Property.svelte. Dimensions are in metres:
  // width runs parallel to the street frontage, depth runs back from it.
  const HARDCODED_ENVELOPES = [
    {
      match:  '13 ARTILLERY CRESCENT SEVEN HILLS',
      width:  22,
      depth:  30,
      height: 9.5,
      frontSetback: 6,
    }
  ];

  let envelopeVisible = false;

  $: envelopeSpec = HARDCODED_ENVELOPES.find(e =>
    (property?.address || '').toUpperCase().includes(e.match)
  ) || null;

  // Redraw / tear down whenever the property or the toggle changes.
  $: if (map) {
    if (envelopeVisible && envelopeSpec && property?.lotGeoJson) {
      drawBuildableEnvelope(envelopeSpec);
    } else {
      removeBuildableEnvelope();
    }
  }

  function buildEnvelopePolygon(spec) {
    const geom = property.lotGeoJson.geometry;
    const coords = geom.type === 'MultiPolygon' ? geom.coordinates[0] : geom.coordinates;

    const [cLng, cLat] = getFootprintCentroid(coords);
    const mPerDeg = metersPerDeg(cLat);

    let bearing = getStreetFacingBearing(coords, property?.record);
    if (bearing == null) bearing = getFootprintLongEdgeBearing(coords, mPerDeg.lat, mPerDeg.lng);
    const rad = bearing * Math.PI / 180;

    // f points from the lot out towards the street; r is perpendicular to it.
    const f = { x: Math.sin(rad),  y: Math.cos(rad) };
    const r = { x: Math.cos(rad),  y: -Math.sin(rad) };

    // Find the front boundary: the furthest lot vertex along f, in metres
    // relative to the centroid.
    const ring = coords[0].slice(0, -1);
    let frontProj = -Infinity;
    for (const [lng, lat] of ring) {
      const dx = (lng - cLng) * mPerDeg.lng;
      const dy = (lat - cLat) * mPerDeg.lat;
      const proj = dx * f.x + dy * f.y;
      if (proj > frontProj) frontProj = proj;
    }

    const front = frontProj - spec.frontSetback;   // building line
    const back  = front - spec.depth;
    const half  = spec.width / 2;

    const cornersLocal = [
      { along: front, across: -half },
      { along: front, across:  half },
      { along: back,  across:  half },
      { along: back,  across: -half },
    ];

    const ringOut = cornersLocal.map(({ along, across }) => {
      const dx = f.x * along + r.x * across;
      const dy = f.y * along + r.y * across;
      return [cLng + dx / mPerDeg.lng, cLat + dy / mPerDeg.lat];
    });
    ringOut.push(ringOut[0]);

    return {
      type: 'Feature',
      properties: { height: spec.height },
      geometry: { type: 'Polygon', coordinates: [ringOut] }
    };
  }

  function drawBuildableEnvelope(spec) {
    let feature;
    try {
      feature = buildEnvelopePolygon(spec);
    } catch (e) {
      console.warn('buildable envelope failed:', e);
      return;
    }

    const source = map.getSource('buildable-envelope-source');
    if (source) {
      source.setData(feature);
      return;
    }

    map.addSource('buildable-envelope-source', { type: 'geojson', data: feature });
    map.addLayer({
      id: 'buildable-envelope-layer',
      type: 'fill-extrusion',
      source: 'buildable-envelope-source',
      paint: {
        'fill-extrusion-color': '#5C2587',
        'fill-extrusion-height': ['get', 'height'],
        'fill-extrusion-base': 0,
        'fill-extrusion-opacity': 0.45
      }
    });
  }

  function removeBuildableEnvelope() {
    if (!map) return;
    if (map.getLayer('buildable-envelope-layer')) map.removeLayer('buildable-envelope-layer');
    if (map.getSource('buildable-envelope-source')) map.removeSource('buildable-envelope-source');
  }

  function toggleBuildableEnvelope() {
    envelopeVisible = !envelopeVisible;
    if (envelopeVisible) map_3d = true;
  }

  // ── DEV ONLY ───────────────────────────────────────────────────────────────
  // Placeholder export targets for the pilot demo. Nothing is wired up yet: no
  // exporter exists for any of these formats, and no file is produced. Visible
  // only under use_debug so it can never be mistaken for shipped functionality.
  const dev_export_formats = [
    { key: 'gis',  label: 'GIS',      ext: '.geojson', icon: 'icon-globe'      },
    { key: 'cad',  label: 'CAD',      ext: '.dxf',     icon: 'icon-file-code'  },
    { key: 'bim',  label: 'BIM',      ext: '.ifc',     icon: 'icon-building-2' },
    { key: 'mesh', label: '3D Model', ext: '.glb',     icon: 'icon-box'        },
  ];
  function _handle_dev_export(fmt) {
    console.log(`[dev] export placeholder — ${fmt.label} (${fmt.ext}); not implemented`);
  }
</script>

<div class="flex padding-bottom-thin upload-row">
  <div class="half padding-top-thinnest">
    <p><strong>UPLOAD 3D MODEL</strong>
    <span class="tooltip-container" style="margin-left: 4px;">
      <i class=" icon-info"></i>
      <span class="tooltip-text">
        You can export 3D models from Archicad via a free glTF Exporter (<a href="https://bimdots.com/manuals/gltf-out/" target="_blank" style="color: var(--up-c-ffffff); text-decoration: underline;">https://bimdots.com/manuals/gltf-out/</a>)
      </span>
    </span>
    </p>
  </div>

  <div class="half upload-section right" style="display: flex; align-items: center; justify-content: flex-end; gap: 8px;">
    <label class="btn btn-search" style="margin: 0;">
      <i class=" icon-upload"></i> Upload Model <small style="color:var(--up-c-999999);font-size:0.7em">(.glb/.gltf/.obj)</small>
      <input
        type="file"
        accept=".glb,.gltf,.obj"
        on:change={handleModelUpload}
        style="display: none;"
      />
    </label>
  </div>
</div>

<hr />

<div class="model-sliders padding-top-wider padding-bottom-wider">

  <div style="margin-bottom: 15px; display: flex; justify-content: flex-end; align-items: center; gap: 10px;">
    {#if savedModelViewImage}
      <div style="position: relative; display: inline-block; height: 28px;">
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
        <img
          src={savedModelViewImage}
          alt="Saved Design View"
          style="height: 28px; border-radius: 4px; border: 1px solid var(--up-c-cccccc); display: block; cursor: pointer;"
          on:click={() => lightboxOpen = true}
        />
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <i class=" icon-x" on:click={removeSavedModelView} style="position: absolute; top: -6px; right: -6px; background: white; border-radius: 50%; width: 14px; height: 14px; display: flex; align-items: center; justify-content: center; font-size: 10px; cursor: pointer; box-shadow: 0 1px 3px var(--up-c-000000-a30); color: var(--up-c-333333);"></i>
      </div>
    {/if}
    {#if use_debug && envelopeSpec}
      <button
        class="btn btn-small dev-export-btn"
        class:active={envelopeVisible}
        on:click={toggleBuildableEnvelope}
        title="Hardcoded buildable envelope ({envelopeSpec.width}m x {envelopeSpec.depth}m x {envelopeSpec.height}m)"
      >
        <i class="icon-box"></i> {envelopeVisible ? 'Hide' : 'Show'} Envelope
      </button>
    {/if}
    <button class="btn btn-small {modelLoaded ? '':'unclickable'}" on:click={saveModelView} style="background-color: var(--up-c-5c2587); color: white;">
      <i class=" icon-camera"></i> Save 3D Design
    </button>
  </div>

  {#if use_debug}
    <!-- DEV ONLY — placeholder export targets, nothing is wired up -->
    <div class="dev-export">
      <div class="dev-export-head">
        <strong>EXPORT</strong>
        <span class="dev-badge">PILOT</span>
      </div>
      <div class="dev-export-grid">
        {#each dev_export_formats as fmt}
          <button
            class="btn btn-small dev-export-btn"
            on:click={() => _handle_dev_export(fmt)}
            title="{fmt.label} export ({fmt.ext}) — not yet implemented"
          >
            <i class="{fmt.icon}"></i> {fmt.label}
          </button>
        {/each}
      </div>
    </div>
  {/if}

  <div class="slider-container">
    <!-- svelte-ignore a11y-label-has-associated-control -->
    <label>Rotate: <span>{Math.round(modelRotateZ)}</span>°</label>
    <input
      type="range"
      min="0"
      max="360"
      step="1"
      bind:value={modelRotateZ}
      on:input={handleRotationChange}
    />
  </div>
  <div class="slider-container">
    <!-- svelte-ignore a11y-label-has-associated-control -->
    <label>Pitch: <span>{Math.round(modelRotateX)}</span>°</label>
    <input
      type="range"
      min="0"
      max="360"
      step="1"
      bind:value={modelRotateX}
      on:input={handleRotationChange}
    />
  </div>
  <div class="slider-container">
    <!-- svelte-ignore a11y-label-has-associated-control -->
    <label>Roll: <span>{Math.round(modelRotateY)}</span>°</label>
    <input
      type="range"
      min="0"
      max="360"
      step="1"
      bind:value={modelRotateY}
      on:input={handleRotationChange}
    />
  </div>
  <div class="slider-container">
    <!-- svelte-ignore a11y-label-has-associated-control -->
    <label>Nudge X: <span>{modelNudgeX.toFixed(1)}</span>m</label>
    <input
      type="range"
      min="-50"
      max="50"
      step="0.5"
      bind:value={modelNudgeX}
      on:input={handleNudgeXChange}
    />
  </div>
  <div class="slider-container">
    <!-- svelte-ignore a11y-label-has-associated-control -->
    <label>Nudge Y: <span>{modelNudgeY.toFixed(1)}</span>m</label>
    <input
      type="range"
      min="-50"
      max="50"
      step="0.5"
      bind:value={modelNudgeY}
      on:input={handleNudgeYChange}
    />
  </div>
  <div class="slider-container">
    <!-- svelte-ignore a11y-label-has-associated-control -->
    <label>Nudge Z: <span>{modelNudgeZ.toFixed(1)}</span>m</label>
    <input
      type="range"
      min="-50"
      max="50"
      step="0.5"
      bind:value={modelNudgeZ}
      on:input={handleNudgeZChange}
    />
  </div>
  <div class="slider-container">
    <!-- svelte-ignore a11y-label-has-associated-control -->
    <label>Scale: <span
      contenteditable="true"
      on:blur={(e) => {
        let val = parseFloat(e.target.innerText);
        if (!isNaN(val)) {
          modelScale = val;
          if (map && modelLoaded) {
            map.setPaintProperty('property-model-layer', 'model-scale', [modelScale, modelScale, modelScale]);
          }
        }
        e.target.innerText = Number(modelScale.toFixed(2));
      }}
      on:keydown={(e) => {
        e.stopPropagation();
        if (e.key === 'Enter') {
          e.preventDefault();
          e.target.blur();
        }
      }}
      on:keyup|stopPropagation
      on:keypress|stopPropagation
      on:dblclick|stopPropagation
      style="outline: none; cursor: text;"
    >{Number(modelScale.toFixed(2))}</span>x</label>
    <input
      type="range"
      min="0.01"
      max="10"
      step="0.01"
      bind:value={modelScale}
      on:input={handleScaleChange}
    />
  </div>
</div>

<hr>

<div class="padding-top-wider padding-bottom-wider">
  <p class="uppercase"><strong>Select Pattern Books</strong></p>
</div>

<div class="design-grid">
  {#each propertyTypes as design}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div
      class="pattern-card"
      class:active={selectedDesignId === design.id}
      class:unclickable={!isDesignEligible(property, design)}
      on:click={() => selectDesign(design)}
    >
      {#if selectedDesignId === design.id}
        <div class="active-badge"><i class=" icon-check"></i></div>
      {/if}
      <div class="card-image" style="background-color: {design.color};">
        {#if design.image}
        <img
          src={design.image}
          alt={design.name}
          style="width: 100%; height: 100%; object-fit: cover;"
          on:error={(e) => e.target.style.display = 'none'}
        />
        {/if}
      </div>
      <div class="card-content">
        <div class="card-type">{design.housingType.replace(/-/g, ' ')}</div>
        <h3 class="card-title">{design.name}</h3>
        <div class="card-architect">{design.architect}</div>
        <ul class="card-specs-list">
          <li><i class=" icon-house icon"></i> <span>{design.houses}</span></li>
          <li><i class=" icon-bed icon"></i> <span>{design.beds}</span></li>
          <li><i class=" icon-pencil-ruler icon"></i> <span>{design.size}</span></li>
        </ul>
      </div>
    </div>
  {/each}
</div>

{#if lightboxOpen && savedModelViewImage}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div
    class="lightbox-overlay"
    on:click={() => lightboxOpen = false}
    use:portal
  >
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
    <img
      src={savedModelViewImage}
      alt="Saved Map View Enlarge"
      class="lightbox-image"
      on:click|stopPropagation
    />
    <i class=" icon-x lightbox-close"></i>
  </div>
{/if}

<style>
  /* ── DEV ONLY: placeholder export panel ─────────────────────────── */
  /* Match the 1em gutter that .padding-bottom-wider gives the sliders below,
     so the Upload Model button lines up with Save 3D Design. */
  :global(.app.mapview.viewing-property .property-other-container) .upload-row {
    padding-left: 1em;
    padding-right: 1em;
  }

  .dev-export {
    margin: 18px 0 6px;
    padding: 14px 16px 16px;
    border: 1px dashed var(--up-c-5c2587-a35);
    border-radius: 6px;
    background: var(--up-c-5c2587-a04);
  }
  .dev-export-head {
    display: flex; align-items: center; gap: 8px;
    font-size: 11px; letter-spacing: 0.14em; color: var(--up-c-5c2587); margin-bottom: 12px;
  }
  .dev-badge {
    font-size: 9px; font-weight: 700; letter-spacing: 0.1em;
    background: var(--up-c-5c2587); color: var(--up-c-ffffff); border-radius: 3px; padding: 2px 6px;
  }
  .dev-export-grid {
    display: flex; flex-wrap: wrap; gap: 8px;
  }
  .dev-export-btn { margin: 0; white-space: nowrap; }
  .dev-export-btn.active { background: var(--up-c-5c2587); color: var(--up-c-ffffff); border-color: var(--up-c-5c2587); }

  .map-settings-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .settings-col {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .settings-col .btn {
    flex: 1;
    text-align: center;
    justify-content: center;
  }

  /* The heading above gets its 1em gutter from .padding-bottom-wider; the grid
     sits outside it and was running flush to the panel edges. */
  :global(.app.mapview.viewing-property .property-other-container) .design-grid {
    padding-left: 1em;
    padding-right: 1em;
  }

  .design-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .pattern-card {
    display: flex;
    flex-direction: column;
    background: var(--up-c-ffffff);
    border: 1px solid var(--up-c-e0e0e0);
    border-radius: 8px;
    overflow: hidden;
    cursor: pointer;
    transition: box-shadow 0.2s ease, transform 0.2s ease;
    text-align: left;
  }

  .pattern-card:hover {
    box-shadow: 0 4px 12px var(--up-c-000000-a10);
    border-color: var(--up-c-5c2587);
  }

  .pattern-card.active {
    box-shadow: 0 4px 12px var(--up-c-000000-a10);
    background: var(--up-c-faf5ff);
    position: relative;
  }

  .pattern-card.active:hover {
    transform: none;
  }

  .active-badge {
    position: absolute;
    top: 8px;
    right: 8px;
    background: var(--up-c-5c2587);
    color: var(--up-c-ffffff);
    font-size: 0.6rem;
    font-weight: 700;
    border-radius: 50%;
    z-index: 2;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
  }

  .card-image {
    height: 140px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2rem;
  }

  .card-content {
    padding: 10px;
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    font-family: var(--font-sans);
  }

  .card-type {
    font-size: 0.55rem;
    text-transform: uppercase;
    color: var(--up-c-666666);
    letter-spacing: 0.5px;
    margin-bottom: 4px;
    font-weight: 600;
  }

  .card-title {
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--up-c-31144d);
    margin: 0 0 2px 0;
    line-height: 1.2;
  }

  .card-architect {
    font-size: 0.6rem;
    color: var(--up-c-777777);
    margin-bottom: 8px;
  }

  .card-specs-list {
    margin: auto 0 0 0;
    display: flex;
    justify-content: space-between;
    list-style: none;
    padding: 0;
    font-size: 0.65rem;
    color: var(--up-c-444444);
  }

  .card-specs-list li {
    display: flex;
    align-items: flex-end;
    gap: 4px;
    line-height: 1;
  }

  .card-specs-list .icon {
    font-size: 1.2em;
    color: var(--up-c-5c2587);
    line-height: 1;
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
    background: var(--up-c-8abdff);
    border: none;
    height: 4px;
    border-radius: 2px;
  }

  .slider-container input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    margin-top: -6px; /* Adjust based on track height and thumb height */
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

  .btn-small {
    padding: 6px 12px;
    font-size: 0.65rem;
    height: 28px;
  }

  hr {
    margin: 0.5em 0 0.5em 0;
    height: 1px;
    border: none;
    border-top: 1px solid var(--up-c-f1e9f7);
  }

  .unclickable {
    pointer-events: none;
    opacity: 0.5;
  }

  .lightbox-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: var(--up-c-000000-a10);
    backdrop-filter: blur(12px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 99999;
    cursor: pointer;
  }

  .lightbox-image {
    max-width: 90%;
    max-height: 90%;
    border-radius: 8px;
    box-shadow: 0 8px 40px var(--up-c-000000-a15);
    cursor: default;
  }

  .lightbox-close {
    position: absolute;
    top: 20px;
    right: 30px;
    color: white;
    font-size: 2rem;
  }

  .tooltip-container {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--up-c-5c2587);
    cursor: pointer;
    font-size: 0.7rem;
  }

  .tooltip-text {
    visibility: hidden;
    width: 320px;
    background-color: var(--up-c-000000-a80);
    backdrop-filter: blur(12px);
    color: var(--up-c-ffffff);
    text-align: left;
    border-radius: 6px;
    padding: 8px 12px;
    position: absolute;
    z-index: 100;
    top: 150%;
    left: -100px;
    opacity: 0;
    transition: opacity 0.3s;
    font-size: 0.65rem;
    font-family: var(--font-family);
    line-height: 1.4;
    box-shadow: 0 4px 12px var(--up-c-000000-a15);
    font-weight: normal;
  }

  .tooltip-text::after {
    content: "";
    position: absolute;
    bottom: 100%;
    left: 101px;
    border-width: 5px;
    border-style: solid;
    border-color: transparent transparent var(--up-c-333333) transparent;
  }

  .tooltip-container:hover .tooltip-text {
    visibility: visible;
    opacity: 1;
  }
</style>