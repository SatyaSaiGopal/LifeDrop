/**
 * Forward geocoding for the "search by city" input.
 *
 * Uses OpenStreetMap's Nominatim when the deployment allows it. If the request
 * is blocked, rate-limited or offline, the UI degrades to the donor-city list
 * already provided by the API — no map key required, no broken control.
 */

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const CACHE = new Map();

/** In-memory cache keyed by the lowercased query, so typing does not re-request. */
export async function geocodePlace(query, { signal } = {}) {
  const q = query.trim();
  if (q.length < 3) return [];

  const key = q.toLowerCase();
  if (CACHE.has(key)) return CACHE.get(key);

  const url = `${NOMINATIM_URL}?format=jsonv2&limit=5&addressdetails=0&q=${encodeURIComponent(q)}`;

  const response = await fetch(url, {
    signal,
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error('Location lookup is unavailable right now');

  const rows = await response.json();
  const results = rows.map((row) => ({
    label: row.display_name,
    shortLabel: row.display_name.split(',').slice(0, 3).join(',').trim(),
    latitude: Number(row.lat),
    longitude: Number(row.lon),
  }));

  CACHE.set(key, results);
  return results;
}

/** Human-readable "City, State" style label for a coordinate pair. */
export async function reverseGeocode(latitude, longitude, { signal } = {}) {
  const key = `${latitude.toFixed(3)},${longitude.toFixed(3)}`;
  if (CACHE.has(key)) return CACHE.get(key);

  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=14&lat=${latitude}&lon=${longitude}`;
  const response = await fetch(url, { signal, headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error('Reverse lookup failed');
  const row = await response.json();
  const address = row.address || {};
  const result = {
    city: address.city || address.town || address.village || address.suburb || address.county || '',
    state: address.state || address.region || '',
    country: address.country || '',
    areaLabel: address.suburb || address.neighbourhood || address.city_district || '',
  };
  CACHE.set(key, result);
  return result;
}
