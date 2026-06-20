import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { LAHORE_GRAVEYARDS } from '@/lib/graveyards';
import { fetchLahoreOsmCemeteries, isNear } from '@/lib/osm-cemeteries';
import { errorResponse } from '@/lib/error-handler';

/** All OSM cemeteries in Lahore (cached ~1h) minus pins already registered in GMS. */
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const all = await fetchLahoreOsmCemeteries();
    const cemeteries = all.filter(c =>
      !LAHORE_GRAVEYARDS.some(g => isNear(c.latitude, c.longitude, g.latitude, g.longitude)),
    );

    return NextResponse.json({ cemeteries });
  } catch (e) {
    return errorResponse('Failed to load cemeteries', e);
  }
}
