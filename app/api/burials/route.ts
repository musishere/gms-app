import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { BURIAL_COLS, GRAVE_COLS, PAYMENT_COLS } from '@/lib/supabase';
import { generateReceiptNumber } from '@/lib/utils';
import { randomUUID } from 'crypto';
import { errorResponse } from '@/lib/error-handler';
import QRCode from 'qrcode';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const month = searchParams.get('month');
    const search = searchParams.get('search');

    const admin = getSupabaseAdmin();
    let query = admin.from('burials').select(BURIAL_COLS).order('created_at', { ascending: false });
    if (auth.role === 'family') query = query.eq('booking_user_id', auth.id);
    if (status) query = query.eq('status', status);
    if (month) {
      // month in format YYYY-MM, filter by date range (first day of month inclusive, first day of next month exclusive)
      const start = `${month}-01`;
      const d = new Date(start);
      const next = new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString().slice(0, 10);
      query = query.gte('burial_date', start).lt('burial_date', next);
    }
    if (search) {
      const term = `%${search}%`;
      query = query.or(`deceased->>name.ilike.${term},deceased->>cnic.ilike.${term}`);
    }

    const { data: burials, error } = await query;
    if (error) throw error;

    const enriched = await Promise.all((burials ?? []).map(async (b: Record<string, unknown>) => {
      const [{ data: grave }, { data: payment }] = await Promise.all([
        admin.from('graves').select(GRAVE_COLS).eq('id', b.graveId).single(),
        admin.from('payments').select(PAYMENT_COLS).eq('burial_id', b.id).maybeSingle(),
      ]);
      return { ...b, grave, payment };
    }));

    return NextResponse.json({ burials: enriched });
  } catch (e) { return errorResponse('Failed to fetch burials', e); }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { graveId, deceased, burialDate, burialTime, conductedBy, notes, paymentMethod, amount, bookingId } = await req.json();
    if (!graveId || !deceased || !burialDate || !burialTime)
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });

    const admin = getSupabaseAdmin();

    // Slot conflict check
    const { data: conflict } = await admin.from('burials')
      .select('id')
      .eq('burial_date', burialDate)
      .eq('burial_time', burialTime)
      .neq('status', 'cancelled')
      .maybeSingle();
    if (conflict) {
      return NextResponse.json({
        error: 'A burial is already scheduled at this date and time',
        conflictingBurialId: conflict.id,
      }, { status: 409 });
    }

    const { data: grave, error: graveErr } = await admin.from('graves').select(GRAVE_COLS).eq('id', graveId).single();
    if (graveErr || !grave) return NextResponse.json({ error: 'Grave not found' }, { status: 404 });
    if (!['available', 'reserved'].includes(String(grave.status)))
      return NextResponse.json({ error: 'Grave not available' }, { status: 409 });

    // If reserved, verify approved booking when bookingId provided
    if (grave.status === 'reserved' && bookingId) {
      const { data: booking } = await admin.from('grave_bookings')
        .select('id, grave_id, status')
        .eq('id', bookingId)
        .single();
      if (!booking || booking.grave_id !== graveId || booking.status !== 'approved')
        return NextResponse.json({ error: 'Grave reservation does not match booking' }, { status: 409 });
    }

    const now = new Date().toISOString();
    const burialId = randomUUID();
    const qrCodeData = await QRCode.toDataURL(`/dashboard/graves?graveId=${graveId}`, { width: 200, margin: 1 });

    let bookingUserId = auth.id;
    if (bookingId) {
      const { data: booking } = await admin.from('grave_bookings')
        .select('booked_by')
        .eq('id', bookingId)
        .single();
      if (booking?.booked_by) bookingUserId = booking.booked_by;
    }

    const { data: burial, error: burialErr } = await admin.from('burials').insert({
      id: burialId,
      grave_id: graveId,
      deceased: { id: randomUUID(), ...deceased },
      burial_date: burialDate,
      burial_time: burialTime,
      conducted_by: conductedBy || '',
      status: 'confirmed',
      notes: notes || '',
      booking_user_id: bookingUserId,
      qr_code: qrCodeData,
      created_at: now,
      updated_at: now,
    }).select(BURIAL_COLS).single();
    if (burialErr) throw burialErr;

    await admin.from('graves').update({
      status: 'occupied',
      occupied_by: deceased.name,
      burial_id: burialId,
      reserved_until: null,
    }).eq('id', graveId);
    const { data: updatedGrave } = await admin.from('graves').select(GRAVE_COLS).eq('id', graveId).single();

    const paymentAmount = amount || (grave as Record<string, unknown>).price;
    const { data: payment } = await admin.from('payments').insert({
      id: randomUUID(),
      burial_id: burialId,
      grave_id: graveId,
      user_id: bookingUserId,
      amount: paymentAmount,
      method: paymentMethod || 'cash',
      status: 'pending',
      receipt_number: generateReceiptNumber(),
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: now,
    }).select(PAYMENT_COLS).single();

    if (bookingId) {
      await admin.from('grave_bookings').update({ status: 'converted' }).eq('id', bookingId);
      await admin.from('notifications').insert({
        id: randomUUID(),
        user_id: bookingUserId,
        title: 'Burial Confirmed',
        message: `Burial of ${deceased.name} confirmed at grave ${grave.graveNumber} on ${burialDate} at ${burialTime}.`,
        type: 'success',
        read: false,
        created_at: now,
      });
    } else {
      await admin.from('notifications').insert({
        id: randomUUID(),
        user_id: auth.id,
        title: 'Burial Confirmed',
        message: `Burial of ${deceased.name} confirmed at grave ${grave.graveNumber} on ${burialDate} at ${burialTime}.`,
        type: 'success',
        read: false,
        created_at: now,
      });
    }

    return NextResponse.json({ burial, payment, grave: updatedGrave });
  } catch (e) { return errorResponse('Failed to create burial', e); }
}
