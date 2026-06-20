import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { BOOKING_COLS, GRAVE_COLS } from '@/lib/supabase';
import { errorResponse } from '@/lib/error-handler';
import { randomUUID } from 'crypto';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    const admin = getSupabaseAdmin();
    // Try selecting with the extended BOOKING_COLS; fall back to the previous alias if DB doesn't have the new columns yet.
    let bookings: any = null;
    try {
      let q = admin.from('grave_bookings').select(BOOKING_COLS).order('created_at', { ascending: false });
      if (auth.role === 'family') q = q.eq('booked_by', auth.id);
      if (status) q = q.eq('status', status);
      const res = await q;
      if (res.error) throw res.error;
      bookings = res.data ?? [];
    } catch (err: any) {
      // If the error is missing-column (42703), retry with the older booking columns that don't include the new fields.
      if (err && err.code === '42703') {
        const OLD = 'id, graveyardId:graveyard_id, graveId:grave_id, bookedBy:booked_by, slotDate:slot_date, slotTime:slot_time, deceasedName:deceased_name, contactName:contact_name, contactPhone:contact_phone, notes, status, approvedBy:approved_by, approvedAt:approved_at, expiresAt:expires_at, createdAt:created_at';
        let q2 = admin.from('grave_bookings').select(OLD).order('created_at', { ascending: false });
        if (auth.role === 'family') q2 = q2.eq('booked_by', auth.id);
        if (status) q2 = q2.eq('status', status);
        const r2 = await q2;
        if (r2.error) throw r2.error;
        bookings = r2.data ?? [];
      } else throw err;
    }

    const enriched = await Promise.all((bookings ?? []).map(async (b: Record<string, unknown>) => {
      const { data: grave } = await admin.from('graves').select(GRAVE_COLS).eq('id', b.graveId).single();
      return { ...b, grave };
    }));

    return NextResponse.json({ bookings: enriched });
  } catch (e) { return errorResponse('Failed to fetch bookings', e); }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { graveId, graveyardId, slotDate, slotTime, deceasedName, deceasedCNIC, dateOfDeath, causeOfDeath, address, contactName, contactPhone, notes } = await req.json();
    if (!graveId || !slotDate || !slotTime || !deceasedName || !contactName || !contactPhone)
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });

    // Basic validation: CNIC format (allow blank), dateOfDeath must be a valid date not in the future
    const cnic = String(deceasedCNIC || '').trim();
    if (cnic) {
      const cnicNormalized = cnic.replace(/\s+/g, '');
      const cnicRegex = /^\d{5}-?\d{7}-?\d{1}$/; // accepts 12345-1234567-1 or 1234512345671
      if (!cnicRegex.test(cnicNormalized)) {
        return NextResponse.json({ error: 'Invalid CNIC format' }, { status: 400 });
      }
    }

    if (dateOfDeath) {
      const d = new Date(dateOfDeath);
      if (Number.isNaN(d.getTime())) return NextResponse.json({ error: 'Invalid dateOfDeath' }, { status: 400 });
      if (d.getTime() > Date.now()) return NextResponse.json({ error: 'dateOfDeath cannot be in the future' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();

    const { data: grave, error: graveErr } = await admin.from('graves').select(GRAVE_COLS).eq('id', graveId).single();
    if (graveErr || !grave) return NextResponse.json({ error: 'Grave not found' }, { status: 404 });
    if (!['available'].includes(String(grave.status)))
      return NextResponse.json({ error: 'Grave is not available for booking' }, { status: 409 });

    // Check no active booking already exists for this grave
    const { data: existing } = await admin
      .from('grave_bookings')
      .select('id')
      .eq('grave_id', graveId)
      .in('status', ['pending', 'approved'])
      .maybeSingle();
    if (existing) return NextResponse.json({ error: 'Grave already has an active booking' }, { status: 409 });

    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    let booking: any = null;
    try {
      const res = await admin.from('grave_bookings').insert({
        id: randomUUID(),
        graveyard_id: graveyardId || (grave as Record<string, unknown>).graveyardId || 'uol-main',
        grave_id: graveId,
        booked_by: auth.id,
        slot_date: slotDate,
        slot_time: slotTime,
        deceased_name: deceasedName,
        deceased_cnic: deceasedCNIC || '',
        date_of_death: dateOfDeath || null,
        cause_of_death: causeOfDeath || '',
        address: address || '',
        contact_name: contactName,
        contact_phone: contactPhone,
        notes: notes || '',
        status: 'pending',
        expires_at: expiresAt,
        created_at: now,
      }).select(BOOKING_COLS).single();
      if (res.error) throw res.error;
      booking = res.data;
    } catch (err: any) {
      // If the DB doesn't have the new columns (e.g. migration not applied), retry without them
      if (err && err.code === '42703') {
        const res2 = await admin.from('grave_bookings').insert({
          id: randomUUID(),
          graveyard_id: graveyardId || (grave as Record<string, unknown>).graveyardId || 'uol-main',
          grave_id: graveId,
          booked_by: auth.id,
          slot_date: slotDate,
          slot_time: slotTime,
          deceased_name: deceasedName,
          contact_name: contactName,
          contact_phone: contactPhone,
          notes: notes || '',
          status: 'pending',
          expires_at: expiresAt,
          created_at: now,
        }).select();
        if (res2.error) throw res2.error;
        booking = res2.data ? res2.data[0] : null;
      } else {
        throw err;
      }
    }

    await admin.from('notifications').insert({
      id: randomUUID(),
      user_id: auth.id,
      title: 'Grave Booking Submitted',
      message: `Your booking for grave ${grave.graveNumber} on ${slotDate} at ${slotTime} is pending approval.`,
      type: 'info',
      read: false,
      created_at: now,
    });

    return NextResponse.json({ booking, grave });
  } catch (e) { return errorResponse('Failed to create booking', e); }
}
