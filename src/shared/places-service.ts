import { logger } from '@elizaos/core';

/**
 * Places service — restaurants, hotels, cafes via OpenStreetMap.
 * Free, no API key needed.
 */

export interface Place {
  name: string;
  type: string; // restaurant, hotel, cafe
  address?: string;
  cuisine?: string;
  phone?: string;
  website?: string;
  openingHours?: string;
  lat: number;
  lon: number;
}

const cache = new Map<string, { data: Place[]; expiry: number }>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Geocode a location name to lat/lng using Nominatim (OpenStreetMap).
 */
async function geocode(query: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
      { headers: { 'User-Agent': 'Buddies/1.0 (multi-agent productivity app)' } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || data.length === 0) return null;
    return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

/**
 * Query OpenStreetMap Overpass API for places near a location.
 */
async function queryOverpass(lat: number, lon: number, amenityType: string, radiusMeters: number = 2000): Promise<Place[]> {
  const query = `
    [out:json][timeout:10];
    (
      node["amenity"="${amenityType}"](around:${radiusMeters},${lat},${lon});
      way["amenity"="${amenityType}"](around:${radiusMeters},${lat},${lon});
    );
    out body 20;
  `;

  try {
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    if (!res.ok) return [];
    const data = await res.json();

    return (data.elements || [])
      .filter((e: any) => e.tags?.name)
      .map((e: any) => ({
        name: e.tags.name,
        type: amenityType,
        address: [e.tags['addr:street'], e.tags['addr:housenumber'], e.tags['addr:city']].filter(Boolean).join(', ') || undefined,
        cuisine: e.tags.cuisine,
        phone: e.tags.phone || e.tags['contact:phone'],
        website: e.tags.website || e.tags['contact:website'],
        openingHours: e.tags.opening_hours,
        lat: e.lat || e.center?.lat || lat,
        lon: e.lon || e.center?.lon || lon,
      }));
  } catch {
    return [];
  }
}

/**
 * Find restaurants, hotels, or cafes near a location.
 */
export async function findPlaces(
  location: string,
  types: ('restaurant' | 'hotel' | 'cafe')[] = ['restaurant', 'hotel', 'cafe'],
  radiusMeters: number = 2000
): Promise<Place[]> {
  const cacheKey = `${location}:${types.join(',')}:${radiusMeters}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() < cached.expiry) return cached.data;

  const coords = await geocode(location);
  if (!coords) {
    logger.warn(`[PLACES] Could not geocode: ${location}`);
    return [];
  }

  logger.info(`[PLACES] Geocoded "${location}" → ${coords.lat}, ${coords.lon}`);

  // Query all types in parallel
  const results = await Promise.all(
    types.map((type) => queryOverpass(coords.lat, coords.lon, type, radiusMeters))
  );

  const places = results.flat();
  cache.set(cacheKey, { data: places, expiry: Date.now() + CACHE_TTL_MS });

  logger.info(`[PLACES] Found ${places.length} places near "${location}"`);
  return places;
}

/**
 * Get formatted place context for Buddy.
 */
export async function getPlacesContext(location: string, type?: 'restaurant' | 'hotel' | 'cafe'): Promise<string> {
  const types = type ? [type] : ['restaurant', 'hotel', 'cafe'] as const;
  const places = await findPlaces(location, [...types]);

  if (places.length === 0) {
    return `No ${type || 'places'} found near "${location}". Try a more specific location name or larger city.`;
  }

  const byType = new Map<string, Place[]>();
  for (const p of places) {
    const arr = byType.get(p.type) || [];
    arr.push(p);
    byType.set(p.type, arr);
  }

  const sections: string[] = [];
  for (const [placeType, items] of byType) {
    const lines = items.slice(0, 10).map((p) => {
      let line = `- **${p.name}**`;
      if (p.cuisine) line += ` (${p.cuisine})`;
      if (p.address) line += ` — ${p.address}`;
      if (p.phone) line += ` | ${p.phone}`;
      if (p.openingHours) line += ` | Hours: ${p.openingHours}`;
      return line;
    }).join('\n');
    sections.push(`### ${placeType.charAt(0).toUpperCase() + placeType.slice(1)}s\n${lines}`);
  }

  return `# Places near "${location}"\n\n${sections.join('\n\n')}`;
}
