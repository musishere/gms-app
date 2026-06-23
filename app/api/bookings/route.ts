import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { GRAVE_COLS } from '@/lib/supabase';
import { insertBooking, selectBookings } from '@/lib/booking-db';
import { errorResponse } from '@/lib/error-handler';
import { randomUUID } from 'crypto';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    const admin = getSupabaseAdmin();
    const bookings = await selectBookings(admin, {
      role: auth.role,
      userId: auth.id,
      status,
    });

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

    const body = await req.json();
    const {
      graveId, graveyardId, slotDate, slotTime, notes,
      deceasedName, contactName, contactPhone, deceased,
    } = body;

    const resolvedDeceased = deceased ?? {
      name: deceasedName,
      nextOfKin: contactName,
      nextOfKinPhone: contactPhone,
    };
    const name = resolvedDeceased.name || deceasedName;
    const nextOfKin = resolvedDeceased.nextOfKin || contactName;
    const nextOfKinPhone = resolvedDeceased.nextOfKinPhone || contactPhone;
    const dateOfDeath = resolvedDeceased.dateOfDeath;

    if (!graveId || !slotDate || !slotTime || !name || !nextOfKin || !nextOfKinPhone || !dateOfDeath)
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });

    const cnic = String(resolvedDeceased.cnic || '').trim();
    if (cnic) {
      const cnicNormalized = cnic.replace(/\s+/g, '');
      if (!/^\d{5}-?\d{7}-?\d{1}$/.test(cnicNormalized)) {
        return NextResponse.json({ error: 'Invalid CNIC format' }, { status: 400 });
      }
    }

    const d = new Date(dateOfDeath);
    if (Number.isNaN(d.getTime())) return NextResponse.json({ error: 'Invalid dateOfDeath' }, { status: 400 });
    if (d.getTime() > Date.now()) return NextResponse.json({ error: 'dateOfDeath cannot be in the future' }, { status: 400 });

    const admin = getSupabaseAdmin();

    const { data: grave, error: graveErr } = await admin.from('graves').select(GRAVE_COLS).eq('id', graveId).single();
    if (graveErr || !grave) return NextResponse.json({ error: 'Grave not found' }, { status: 404 });
    if (!['available'].includes(String(grave.status)))
      return NextResponse.json({ error: 'Grave is not available for booking' }, { status: 409 });

    const { data: existing } = await admin
      .from('grave_bookings')
      .select('id')
      .eq('grave_id', graveId)
      .in('status', ['pending', 'approved'])
      .maybeSingle();
    if (existing) return NextResponse.json({ error: 'Grave already has an active booking' }, { status: 409 });

    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const booking = await insertBooking(admin, {
      id: randomUUID(),
      graveyard_id: graveyardId || (grave as Record<string, unknown>).graveyardId || 'uol-main',
      grave_id: graveId,
      booked_by: auth.id,
      slot_date: slotDate,
      slot_time: slotTime,
      deceased_name: name,
      contact_name: nextOfKin,
      contact_phone: nextOfKinPhone,
      deceased: resolvedDeceased,
      notes: notes || '',
      status: 'pending',
      expires_at: expiresAt,
      created_at: now,
    });

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
