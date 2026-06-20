import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { GRAVEYARDS } from '@/lib/graveyards';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { errorResponse } from '@/lib/error-handler';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = getSupabaseAdmin();
    const cityId = new URL(req.url).searchParams.get('cityId');
    const { data: counts } = await admin.from('graves').select('graveyard_id, status');

    const source = cityId ? GRAVEYARDS.filter(g => g.cityId === cityId) : GRAVEYARDS;
    const graveyards = source.map(g => {
      const siteGraves = (counts ?? []).filter(c => (c.graveyard_id ?? 'uol-main') === g.id);
      return {
        ...g,
        stats: {
          total: siteGraves.length,
          available: siteGraves.filter(c => c.status === 'available').length,
        },
      };
    });

    return NextResponse.json({ graveyards });
  } catch (e) { return errorResponse('Failed to fetch graveyards', e); }
}
