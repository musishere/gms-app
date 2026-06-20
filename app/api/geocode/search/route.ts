import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { LAHORE_GRAVEYARDS } from '@/lib/graveyards';
import { fetchLahoreOsmCemeteries, filterOsmCemeteries, isNear } from '@/lib/osm-cemeteries';
import { errorResponse } from '@/lib/error-handler';

type NominatimResult = {
  lat: string;
  lon: string;
  display_name: string;
};

/** Lahore bounding box: minLon, maxLat, maxLon, minLat */
const LAHORE_VIEWBOX = '74.15,31.72,74.55,31.35';

export type GeocodeSearchResult = {
  id: string;
  type: 'graveyard' | 'cemetery' | 'place';
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  bookable: boolean;
};

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const q = req.nextUrl.searchParams.get('q')?.trim();
    if (!q || q.length < 2) return NextResponse.json({ results: [] });

    const queryLower = q.toLowerCase();

    const graveyardMatches: GeocodeSearchResult[] = LAHORE_GRAVEYARDS.filter(g =>
      g.name.toLowerCase().includes(queryLower) ||
      g.area.toLowerCase().includes(queryLower) ||
      g.address.toLowerCase().includes(queryLower),
    ).map(g => ({
      id: g.id,
      type: 'graveyard',
      name: g.name,
      address: `${g.address}, ${g.city}`,
      latitude: g.latitude,
      longitude: g.longitude,
      bookable: true,
    }));

    let cemeteryMatches: GeocodeSearchResult[] = [];
    try {
      const osmAll = await fetchLahoreOsmCemeteries();
      cemeteryMatches = filterOsmCemeteries(q, osmAll)
        .filter(c => !LAHORE_GRAVEYARDS.some(g => isNear(c.latitude, c.longitude, g.latitude, g.longitude)))
        .filter(c => !graveyardMatches.some(g => isNear(c.latitude, c.longitude, g.latitude, g.longitude)))
        .slice(0, 6)
        .map(c => ({
          id: c.id,
          type: 'cemetery',
          name: c.name,
          address: c.address,
          latitude: c.latitude,
          longitude: c.longitude,
          bookable: false,
        }));
    } catch {
      // Overpass optional — registered + Nominatim still returned
    }

    let geoResults: GeocodeSearchResult[] = [];
    try {
      const nominatimUrl = new URL('https://nominatim.openstreetmap.org/search');
      nominatimUrl.searchParams.set('q', `${q}, Lahore, Pakistan`);
      nominatimUrl.searchParams.set('format', 'json');
      nominatimUrl.searchParams.set('limit', '4');
      nominatimUrl.searchParams.set('countrycodes', 'pk');
      nominatimUrl.searchParams.set('viewbox', LAHORE_VIEWBOX);
      nominatimUrl.searchParams.set('bounded', '1');

      const res = await fetch(nominatimUrl.toString(), {
        headers: { 'User-Agent': 'GMS-Graveyard-App/1.0 (graveyard management)' },
        cache: 'no-store',
      });
      if (res.ok) {
        const data = (await res.json()) as NominatimResult[];
        geoResults = data.map((item, i) => ({
          id: `place-${i}-${item.lat}`,
          type: 'place',
          name: item.display_name.split(',')[0],
          address: item.display_name,
          latitude: parseFloat(item.lat),
          longitude: parseFloat(item.lon),
          bookable: false,
        }));
      }
    } catch {
      // Nominatim optional
    }

    const seen = new Set<string>();
    const results = [...graveyardMatches, ...cemeteryMatches, ...geoResults].filter(r => {
      const key = `${r.latitude.toFixed(4)},${r.longitude.toFixed(4)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 10);

    return NextResponse.json({ results });
  } catch (e) {
    return errorResponse('Search failed', e);
  }
}
