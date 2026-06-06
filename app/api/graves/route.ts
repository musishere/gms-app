import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { GRAVE_COLS } from '@/lib/supabase';
import { errorResponse } from '@/lib/error-handler';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const section = searchParams.get('section');
    const status = searchParams.get('status');
    const size = searchParams.get('size');

    const admin = getSupabaseAdmin();
    let query = admin.from('graves').select(GRAVE_COLS);
    if (section) query = query.eq('section', section);
    if (status) query = query.eq('status', status);
    if (size) query = query.eq('size', size);
    const { data: graves, error } = await query;
    if (error) throw error;

    const { data: all } = await admin.from('graves').select('status');
    const stats = {
      total: all?.length ?? 0,
      available: all?.filter(g => g.status === 'available').length ?? 0,
      occupied: all?.filter(g => g.status === 'occupied').length ?? 0,
      reserved: all?.filter(g => g.status === 'reserved').length ?? 0,
      maintenance: all?.filter(g => g.status === 'maintenance').length ?? 0,
    };

    return NextResponse.json({ graves: graves ?? [], stats });
  } catch (e) { return errorResponse('Failed to fetch graves', e); }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth || !['admin', 'staff'].includes(auth.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id, graveNumber, occupiedBy, burialId, lastMaintenanceDate, ...rest } = await req.json();

    // Build snake_case update object
    const updates: Record<string, unknown> = { ...rest };
    if (graveNumber !== undefined) updates.grave_number = graveNumber;
    if (occupiedBy !== undefined) updates.occupied_by = occupiedBy;
    if (burialId !== undefined) updates.burial_id = burialId;
    if (lastMaintenanceDate !== undefined) updates.last_maintenance_date = lastMaintenanceDate;

    const { data: grave, error } = await getSupabaseAdmin()
      .from('graves')
      .update(updates)
      .eq('id', id)
      .select(GRAVE_COLS)
      .single();

    if (error) return NextResponse.json({ error: 'Grave not found' }, { status: 404 });
    return NextResponse.json({ grave });
  } catch (e) { return errorResponse('Failed to update grave', e); }
}
