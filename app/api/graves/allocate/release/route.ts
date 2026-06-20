import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { GRAVE_COLS } from '@/lib/supabase';
import { errorResponse } from '@/lib/error-handler';

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth || !['admin', 'staff'].includes(auth.role))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { graveId } = await req.json();
    if (!graveId) return NextResponse.json({ error: 'graveId required' }, { status: 400 });

    const admin = getSupabaseAdmin();
    const { data: grave } = await admin.from('graves').select(GRAVE_COLS).eq('id', graveId).single();
    if (!grave) return NextResponse.json({ error: 'Grave not found' }, { status: 404 });
    if (grave.status !== 'reserved')
      return NextResponse.json({ error: 'Grave is not reserved' }, { status: 409 });

    const { data: updated, error } = await admin
      .from('graves')
      .update({ status: 'available', occupied_by: null, reserved_until: null })
      .eq('id', graveId)
      .eq('status', 'reserved')
      .select(GRAVE_COLS)
      .single();

    if (error || !updated) return NextResponse.json({ error: 'Failed to release grave' }, { status: 500 });

    return NextResponse.json({ grave: updated, message: `Reservation for grave ${updated.graveNumber} released` });
  } catch (e) { return errorResponse('Failed to release grave', e); }
}
