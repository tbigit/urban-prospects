// @ts-nocheck
//
// One place to build Google Street View image URLs for a property.
//
// This used to be a template literal copy-pasted into six call sites (two in
// Property.svelte, three in app/+page.svelte, one in app/map/+page.svelte, one
// in pdfFunctions.js), each of them geocoding the address string with
// `radius=15`. Two problems with that:
//
//   * radius=15 is far too tight. Google returns ZERO_RESULTS whenever the
//     geocoded point is more than 15 m from the nearest pano, which is the norm
//     for rural and highway lots — e.g. 84A Princes Highway, Maddens Plains
//     2508 has perfectly good 2026 imagery, but only from radius 50 up. With
//     return_error_code=true the miss arrives as a 404 and the banner falls
//     back to the placeholder, so the property looks like it has no imagery.
//   * geocoding an address string is the weakest way to locate a lot we already
//     hold a centroid for. A "PT 1" part lot or an unnamed rural address can
//     geocode to the suburb centroid and silently show a photo of the wrong
//     street.
//
// So: prefer property.geom.coordinates (the lot centroid — Street View picks
// the nearest pano and aims the camera at the point we asked for), fall back to
// the address string, and use a radius that can actually find a road.

const KEY = 'AIzaSyC5I6s5Rym9KnniWrQX9pOhH6LaCi3sW9Q';
const SIZE = '640x360';
// Wide enough for a highway lot whose centroid sits well back from the road.
const RADIUS = 100;

const BASE = 'https://maps.googleapis.com/maps/api/streetview';
const META = 'https://maps.googleapis.com/maps/api/streetview/metadata';

/** "lat,lng" from a property's centroid, or '' if it has no usable geometry. */
export function coordLocation(property) {
  const c = property && property.geom && property.geom.coordinates;
  if (!Array.isArray(c)) return '';
  const lng = Number(c[0]);
  const lat = Number(c[1]);
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return '';
  return `${lat},${lng}`;
}

/** The legacy hyphenated address string, kept as the fallback locator. */
export function addressLocation(property) {
  if (!property || !property.address) return '';
  return `${String(property.address).toLowerCase().replace(/\s/g, '-')}-${property.postcode || ''}`;
}

/** Best available locator: centroid first, address second. */
export function streetViewLocation(property) {
  return coordLocation(property) || addressLocation(property);
}

function url(base, location, opts) {
  const params = new URLSearchParams({
    size: (opts && opts.size) || SIZE,
    radius: String((opts && opts.radius) || RADIUS),
    return_error_code: 'true',
    source: 'outdoor',
    location,
    key: KEY
  });
  return `${base}?${params.toString()}`;
}

/**
 * Synchronous image URL for a property. Returns '' when we can't locate it at
 * all — callers keep their existing on:error placeholder swap for the case
 * where Google has no pano within RADIUS.
 */
export function streetViewUrl(property, opts) {
  const location = streetViewLocation(property);
  return location ? url(BASE, location, opts) : '';
}

/**
 * Ask the (free, quota-exempt) metadata endpoint whether imagery actually
 * exists before rendering an <img>, trying the centroid and then the address.
 * Resolves to a usable image URL, or '' if neither locator finds a pano.
 */
export async function resolveStreetViewUrl(property, opts) {
  const locations = [coordLocation(property), addressLocation(property)].filter(Boolean);
  for (const location of locations) {
    try {
      const res = await fetch(url(META, location, opts));
      if (!res.ok) continue;
      const meta = await res.json();
      if (meta && meta.status === 'OK') return url(BASE, location, opts);
    } catch (e) {
      // Network failure: fall through and let the next locator (or the caller's
      // placeholder) handle it.
    }
  }
  return '';
}
