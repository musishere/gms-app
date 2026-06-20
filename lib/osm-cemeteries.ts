/** Lahore bounding box for OSM queries (south, west, north, east) */
export const LAHORE_BBOX = { south: 31.35, west: 74.15, north: 31.72, east: 74.55 };

export type OsmCemetery = {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
};

type OverpassElement = {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

type OverpassResponse = { elements: OverpassElement[] };

function elementCoords(el: OverpassElement): { lat: number; lon: number } | null {
  if (el.lat != null && el.lon != null) return { lat: el.lat, lon: el.lon };
  if (el.center) return { lat: el.center.lat, lon: el.center.lon };
  return null;
}

function elementLabel(el: OverpassElement): { name: string; address: string } {
  const tags = el.tags ?? {};
  const name =
    tags.name ||
    tags['name:en'] ||
    tags['name:ur'] ||
    tags.alt_name ||
    'Cemetery';
  const parts = [tags['addr:street'], tags['addr:suburb'], tags['addr:city']].filter(Boolean);
  const address = parts.length > 0 ? parts.join(', ') : 'Lahore, Pakistan';
  return { name, address };
}

/** Fetch all tagged cemeteries / graveyards inside Lahore from OpenStreetMap. */
export async function fetchLahoreOsmCemeteries(): Promise<OsmCemetery[]> {
  const { south, west, north, east } = LAHORE_BBOX;
  const query = `
    [out:json][timeout:25];
    (
      node["amenity"~"grave_yard|cemetery"](${south},${west},${north},${east});
      way["amenity"~"grave_yard|cemetery"](${south},${west},${north},${east});
      relation["amenity"~"grave_yard|cemetery"](${south},${west},${north},${east});
      node["landuse"="cemetery"](${south},${west},${north},${east});
      way["landuse"="cemetery"](${south},${west},${north},${east});
      relation["landuse"="cemetery"](${south},${west},${north},${east});
    );
    out center tags;
  `;

  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
    next: { revalidate: 3600 },
  });

  if (!res.ok) return [];

  const data = (await res.json()) as OverpassResponse;
  const seen = new Set<string>();
  const cemeteries: OsmCemetery[] = [];

  for (const el of data.elements ?? []) {
    const coords = elementCoords(el);
    if (!coords) continue;
    const key = `${coords.lat.toFixed(5)},${coords.lon.toFixed(5)}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const { name, address } = elementLabel(el);
    cemeteries.push({
      id: `osm-${el.type}-${el.id}`,
      name,
      address,
      latitude: coords.lat,
      longitude: coords.lon,
    });
  }

  return cemeteries.sort((a, b) => a.name.localeCompare(b.name));
}

/** ~200 m — skip OSM pins that duplicate a registered GMS graveyard. */
export function isNear(lat1: number, lon1: number, lat2: number, lon2: number, maxMeters = 200): boolean {
  const dLat = (lat2 - lat1) * 111_320;
  const dLon = (lon2 - lon1) * 111_320 * Math.cos((lat1 * Math.PI) / 180);
  return Math.hypot(dLat, dLon) <= maxMeters;
}

export function filterOsmCemeteries(query: string, cemeteries: OsmCemetery[]): OsmCemetery[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  const words = q.split(/\s+/).filter(w => w.length >= 2);
  const cemeteryWords = ['graveyard', 'graveyards', 'cemetery', 'cemetries', 'qabaristan', 'kabristan'];

  return cemeteries.filter(c => {
    const hay = `${c.name} ${c.address}`.toLowerCase();
    if (hay.includes(q)) return true;
    if (words.some(w => hay.includes(w))) return true;
    if (cemeteryWords.some(w => q.includes(w))) return true;
    return false;
  });
}
