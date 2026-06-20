import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { GRAVE_COLS } from '@/lib/supabase';
import { errorResponse } from '@/lib/error-handler';

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { size, section, graveyardId, reserve, deceasedName } = await req.json();
    const shouldReserve = reserve !== false && ['admin', 'staff'].includes(auth.role);
    const admin = getSupabaseAdmin();

    let query = admin.from('graves').select(GRAVE_COLS).eq('status', 'available');
    if (graveyardId) query = query.eq('graveyard_id', graveyardId);
    if (size) query = query.eq('size', size);
    if (section) query = query.eq('section', section);

    const { data: candidates, error } = await query;
    if (error) throw error;
    if (!candidates || candidates.length === 0)
      return NextResponse.json({ error: 'No available graves matching criteria' }, { status: 404 });

    candidates.sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
      if (a.section !== b.section) return String(a.section).localeCompare(String(b.section));
      if (a.row !== b.row) return Number(a.row) - Number(b.row);
      return Number(a.column) - Number(b.column);
    });

    const allocated = candidates[0] as Record<string, unknown>;

    if (shouldReserve) {
      const reservedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      const { data: updated, error: updateErr } = await admin
        .from('graves')
        .update({
          status: 'reserved',
          occupied_by: deceasedName || 'Pending allocation',
          reserved_until: reservedUntil,
        })
        .eq('id', allocated.id)
        .eq('status', 'available')
        .select(GRAVE_COLS)
        .single();

      if (updateErr || !updated) {
        return NextResponse.json({ error: 'Grave was taken by another user, please try again' }, { status: 409 });
      }

      return NextResponse.json({
        grave: updated,
        reserved: true,
        reservedUntil,
        message: `Grave ${updated.graveNumber} reserved in section ${updated.section}`,
      });
    }

    return NextResponse.json({
      grave: allocated,
      reserved: false,
      message: `Grave ${allocated.graveNumber} auto-allocated in section ${allocated.section}`,
    });
  } catch (e) { return errorResponse('Failed to allocate grave', e); }
}
