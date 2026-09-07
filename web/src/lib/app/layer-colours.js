// @ts-nocheck
// Map-layer colours per theme.
//
// The light palette is what `addCustomLayers()` in routes/app/+page.svelte passes to
// `_add_individual_layer` (the Mapbox paint expressions) — that is the source of truth for
// light mode and is left untouched. This file says how those colours change in dark mode and
// gives the toggle swatch for each layer in both themes, so the switch always matches the map.
//
// To retune a layer for dark mode edit DARK below:
//   key: '#hex'                       every colour in that layer becomes this one (single-colour
//                                     layers: zoning boundaries, pipelines, suburbs, ...)
//   key: { '#light': '#dark', ... }   per-colour overrides for multi-colour layers (DA status,
//                                     slope bands, crime steps); colours not listed fall back to
//                                     autoDark()
// Layers absent from DARK get autoDark() on every colour: same hue, saturation lifted, lightness
// pulled into a band that reads on a near-black ground. SWATCH_LIGHT is the toggle colour in
// light mode (one representative colour per layer); the dark swatch is derived the same way as
// the map colour, so both stay in step automatically.

export const SWATCH_LIGHT = {
  zoning: '#ffa6a3',
  lot: '#010101',
  contour: '#d1c2fc',
  slope: '#ff9800',
  suburbs: '#ff0000',
  da_applications_lot: '#388e3c',
  da_applications_lot_by_application_type: '#26a69a',
  ass: '#fd32c5',
  frontage: '#ff0000',
  airport: '#fdca78',
  bushfire: '#e88b91',
  coastalmanagement: '#9d56f6',
  contaminationsites: '#ffb300',
  declaredwildness: '#98cb72',
  developmentcontrolplan: '#000000',
  drinking_water_catchment: '#00bfff',
  environmentally_sensitive_land: '#a0522d',
  floodplanning: '#00bce7',
  fsr: '#c595e8',
  groundwatervulnerability: '#99fffd',
  hob: '#b3e096',
  heritage: '#f3c944',
  landsliderisk: '#ff0000',
  lowmidrise_development: '#be51f0',
  mine_subsidence_district: '#ffa500',
  lsz: '#ff776e',
  mineralresourceland: '#ffd700',
  obstaclelimitationsurface: '#c0c0c0',
  regionalgrowthboundary: '#fd32c5',
  riparianlandwatercourse: '#008000',
  salinity: '#ffff00',
  scenicprotectionland: '#8b4513',
  terrestrialbiodiversity: '#32cd32',
  transport_oriented_development: '#33daff',
  wetlands: '#66f2ff',
  property_crime: '#b90023',
  violent_crime: '#f32a21',
  electricity_transmission_substations: '#00bfff',
  electricity_transmission_lines: '#00bfff',
  gas_pipelines: '#32cd32',
  oil_pipelines: '#965fe0',
  liquid_fuel: '#000000',
  petrol_stations: '#1234de',
};

// Light-mode contour is a very pale lilac; the request was a darker purple there too.
export const LIGHT = {
  contour: '#7c4dff',
};

export const DARK = {
  // Near-black lines vanish on the dark basemap: lift them to pale tints.
  lot: '#ffffff',
  developmentcontrolplan: '#f5f5f5',
  liquid_fuel: '#7dff7d',
  petrol_stations: '#a58bff',
  contour: '#b79cff',
  suburbs: '#ff6b6b',
  frontage: '#ff6b6b',
  landsliderisk: '#ff6b6b',
  obstaclelimitationsurface: '#8f8f9a',
  environmentally_sensitive_land: '#d98a5a',
  scenicprotectionland: '#c98a4b',
  riparianlandwatercourse: '#4fd45f',
  regionalgrowthboundary: '#ff6bd6',
  // Multi-colour layers: only the colours that need a hand-picked dark value; the rest autoDark.
  da_applications_lot: { '#9E9E9E': '#7a7a85', '#EEEEEE': '#4a4650', '#388E3C': '#4fd45f' },
  da_applications_lot_by_application_type: { '#EEEEEE': '#4a4650', '#388E3C': '#4fd45f', '#0288D1': '#3fb6ff' },
  slope: { '#4CAF50': '#5fd868', '#8BC34A': '#a6e05a' },
  property_crime: { '#FFFFFF': '#4a4650', '#B90023': '#ff3d5a' },
  violent_crime: { '#FFFFFF': '#4a4650', '#B90023': '#ff3d5a' },
  lgapopulation: { '#FFFFFF': '#4a4650', '#B90023': '#ff3d5a' },
  zoning: { '#FFFFFF': '#c9c2d6', '#DFFCCB': '#8fd66b' },
};

// Opacity in dark mode. Light keeps whatever the layer was added with (fills are mostly 0.3);
// on a near-black ground that reads as nothing, so dark multiplies it up to a floor.
// `key: { fill: 0.6, line: 1 }` per layer overrides the defaults.
export const DARK_OPACITY = {
  default: { fill: 0.5, line: 1 },
  lot: { line: 1 },
  contour: { line: 0.85 },
};

export function themedOpacity(name, kind, lightValue, theme) {
  if (theme !== 'dark') return lightValue;
  const o = { ...DARK_OPACITY.default, ...(DARK_OPACITY[name] || {}) };
  if (typeof lightValue === 'number') return Math.max(lightValue, o[kind] ?? lightValue);
  return lightValue; // expressions (per-feature opacity) are left alone
}

// Result overlays that are not planning layers (teal suburb circles when zoomed out). Each
// entry is the full paint block per theme; `_apply_layer_colours` sets every property listed.
export const RESULT_LAYER_PAINT = {
  'suburb-results-circles': {
    light: { 'circle-color': '#5EE7AD', 'circle-opacity': 0.55, 'circle-stroke-color': '#1FB389' },
    dark:  { 'circle-color': '#5ee8ad', 'circle-opacity': 0.9, 'circle-stroke-color': '#c9ffe6' },  // brand teal
  },
  // Property dots and clusters: brand purple in light; dark lifts it to a lighter, saturated
  // purple (the My Fav chip tone) so it does not sink into the ground.
  'property-results-circles': {
    light: { 'circle-color': '#5C2587', 'circle-opacity': 0.85 },
    dark:  { 'circle-color': '#a35df0', 'circle-opacity': 1 },
  },
  'property-results-clusters': {
    light: { 'circle-color': '#5C2587', 'circle-opacity': 0.8 },
    dark:  { 'circle-color': '#a35df0', 'circle-opacity': 0.95 },
  },
  'suburb-results-labels': {
    light: { 'text-color': '#0B6B4F', 'text-halo-color': '#ffffff' },
    dark:  { 'text-color': '#ffffff', 'text-halo-color': '#0a3a2a' },
  },
};

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

function hexToHsl(hex) {
  let h = hex.slice(1);
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const r = parseInt(h.slice(0, 2), 16) / 255, g = parseInt(h.slice(2, 4), 16) / 255, b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min, s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let hue;
  if (max === r) hue = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) hue = (b - r) / d + 2;
  else hue = (r - g) / d + 4;
  return [hue / 6, s, l];
}

function hslToHex(h, s, l) {
  const f = (n) => {
    const k = (n + h * 12) % 12, a = s * Math.min(l, 1 - l);
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(c * 255).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

// Same hue; pastels are pulled down and saturated, darks are lifted, so every layer colour
// lands in a lightness band that reads against the near-black ground.
export function autoDark(hex) {
  const [h, s, l] = hexToHsl(hex);
  if (s < 0.08) return hslToHex(h, s, Math.max(0.55, Math.min(0.85, 1 - l * 0.6)));
  const s2 = Math.max(s, 0.75);
  const l2 = Math.max(0.56, Math.min(0.72, l < 0.5 ? l + 0.25 : l - 0.08));
  return hslToHex(h, s2, l2);
}

function override(name, theme) {
  return theme === 'dark' ? DARK[name] : LIGHT[name];
}

// Colour for one hex inside a layer's paint expression, for the given theme.
export function themedColour(name, hex, theme) {
  const o = override(name, theme);
  if (typeof o === 'string') return o;
  if (o && typeof o === 'object') {
    const hit = Object.keys(o).find((k) => k.toLowerCase() === hex.toLowerCase());
    if (hit) return o[hit];
  }
  return theme === 'dark' ? autoDark(hex) : hex;
}

// Deep-copies a Mapbox paint expression, re-colouring every hex literal in it.
export function themedExpression(name, expr, theme) {
  if (theme !== 'dark' && !LIGHT[name]) return expr;
  const walk = (v) => {
    if (Array.isArray(v)) return v.map(walk);
    if (typeof v === 'string' && HEX.test(v)) return themedColour(name, v, theme);
    return v;
  };
  return walk(expr);
}

// Toggle swatch for a layer.
export function swatch(name, theme) {
  const base = SWATCH_LIGHT[name] || '#888888';
  return themedColour(name, base, theme);
}

export function currentTheme() {
  if (typeof document === 'undefined') return 'light';
  const t = document.documentElement.dataset.theme;
  if (t === 'dark' || t === 'light') return t;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
