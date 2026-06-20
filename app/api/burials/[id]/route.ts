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
    const admin = getSupabaseAdmin();

    // Slot conflict check when date/time changes
    if (updates.burialDate !== undefined || updates.burialTime !== undefined) {
      const { data: current } = await admin.from('burials').select('burial_date, burial_time').eq('id', id).single();
      const newDate = updates.burialDate ?? current?.burial_date;
      const newTime = updates.burialTime ?? current?.burial_time;
      const { data: conflict } = await admin.from('burials')
        .select('id')
        .eq('burial_date', newDate)
        .eq('burial_time', newTime)
        .neq('status', 'cancelled')
        .neq('id', id)
        .maybeSingle();
      if (conflict) {
        return NextResponse.json({ error: 'A burial is already scheduled at this date and time' }, { status: 409 });
      }
    }

    const dbUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.conductedBy !== undefined) dbUpdates.conducted_by = updates.conductedBy;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
    if (updates.burialDate !== undefined) dbUpdates.burial_date = updates.burialDate;
    if (updates.burialTime !== undefined) dbUpdates.burial_time = updates.burialTime;
    if (updates.deceased !== undefined) {
      const { data: existing } = await admin.from('burials').select('deceased').eq('id', id).single();
      const existingDeceased = (existing?.deceased ?? {}) as Record<string, unknown>;
      dbUpdates.deceased = { ...existingDeceased, ...updates.deceased };
    }

    const { data: burial, error } = await admin
      .from('burials')
      .update(dbUpdates)
      .eq('id', id)
      .select(BURIAL_COLS)
      .single();

    if (error) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Update grave occupied_by if deceased name changed
    if (updates.deceased?.name) {
      const b = burial as Record<string, unknown>;
      await admin.from('graves').update({ occupied_by: updates.deceased.name }).eq('id', b.graveId);
    }

    return NextResponse.json({ burial });
  } catch (e) { return errorResponse('Failed to update burial', e); }
}
