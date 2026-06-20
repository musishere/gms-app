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
    let query = admin.from('grave_bookings').select(BOOKING_COLS).order('created_at', { ascending: false });

    if (auth.role === 'family') query = query.eq('booked_by', auth.id);
    if (status) query = query.eq('status', status);

    const { data: bookings, error } = await query;
    if (error) throw error;

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

    const { graveId, graveyardId, slotDate, slotTime, deceasedName, contactName, contactPhone, notes } = await req.json();
    if (!graveId || !slotDate || !slotTime || !deceasedName || !contactName || !contactPhone)
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });

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

    const { data: booking, error } = await admin.from('grave_bookings').insert({
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
    }).select(BOOKING_COLS).single();
    if (error) throw error;

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
