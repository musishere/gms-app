import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { BURIAL_COLS, CERT_COLS, GRAVE_COLS, PAYMENT_COLS } from '@/lib/supabase';
import { errorResponse } from '@/lib/error-handler';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const admin = getSupabaseAdmin();

    const { data: burial, error } = await admin.from('burials').select(BURIAL_COLS).eq('id', id).single();
    if (error || !burial) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const b = burial as Record<string, unknown>;
    if (auth.role === 'family' && b.bookingUserId !== auth.id)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const [{ data: grave }, { data: payment }, { data: certificate }] = await Promise.all([
      admin.from('graves').select(GRAVE_COLS).eq('id', b.graveId).single(),
      admin.from('payments').select(PAYMENT_COLS).eq('burial_id', id).maybeSingle(),
      admin.from('certificates').select(CERT_COLS).eq('burial_id', id).maybeSingle(),
    ]);

    return NextResponse.json({ burial, grave, payment, certificate });
  } catch (e) { return errorResponse('Failed to fetch burial', e); }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthUser(req);
    if (!auth || !['admin', 'staff'].includes(auth.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const updates = await req.json();

    // Convert camelCase keys to snake_case for DB
    const dbUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.conductedBy !== undefined) dbUpdates.conducted_by = updates.conductedBy;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
    if (updates.burialDate !== undefined) dbUpdates.burial_date = updates.burialDate;
    if (updates.burialTime !== undefined) dbUpdates.burial_time = updates.burialTime;

    const { data: burial, error } = await getSupabaseAdmin()
      .from('burials')
      .update(dbUpdates)
      .eq('id', id)
      .select(BURIAL_COLS)
      .single();

    if (error) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ burial });
  } catch (e) { return errorResponse('Failed to update burial', e); }
}
