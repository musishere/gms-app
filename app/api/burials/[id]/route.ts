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

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthUser(req);
    if (!auth || auth.role !== 'admin')
      return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 });

    const { id } = await params;
    const admin = getSupabaseAdmin();

    // Fetch burial to get the linked grave id
    const { data: burial, error: fetchErr } = await admin
      .from('burials').select('id, grave_id').eq('id', id).single();
    if (fetchErr || !burial)
      return NextResponse.json({ error: 'Burial not found' }, { status: 404 });

    const graveId = (burial as Record<string, unknown>).grave_id as string | null;

    // Delete in dependency order: certificates → payments → burial
    await admin.from('certificates').delete().eq('burial_id', id);
    await admin.from('payments').delete().eq('burial_id', id);
    const { error: delErr } = await admin.from('burials').delete().eq('id', id);
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

    // Free up the grave so it can be reused
    if (graveId) {
      await admin.from('graves')
        .update({ status: 'available', occupied_by: null, burial_id: null })
        .eq('id', graveId);
    }

    return NextResponse.json({ success: true });
  } catch (e) { return errorResponse('Failed to delete burial', e); }
}
