import { BOOKING_COLS, OLD_BOOKING_COLS } from '@/lib/supabase';

export function isMissingColumnError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { code?: string; message?: string };
  if (e.code === '42703' || e.code === 'PGRST204') return true;
  const msg = e.message ?? '';
  return msg.includes('schema cache') || msg.includes('Could not find');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Admin = { from: (table: string) => any };

export async function selectBookings(
  admin: Admin,
  filters: { role: string; userId: string; status?: string | null },
) {
  const applyFilters = (q: ReturnType<Admin['from']>) => {
    let query = q.order('created_at', { ascending: false });
    if (filters.role === 'family') query = query.eq('booked_by', filters.userId);
    if (filters.status) query = query.eq('status', filters.status);
    return query;
  };

  const res = await applyFilters(admin.from('grave_bookings').select(BOOKING_COLS));
  if (!res.error) return res.data ?? [];

  if (isMissingColumnError(res.error)) {
    const fallback = await applyFilters(admin.from('grave_bookings').select(OLD_BOOKING_COLS));
    if (fallback.error) throw fallback.error;
    return fallback.data ?? [];
  }
  throw res.error;
}

export async function selectBookingById(admin: Admin, id: string) {
  const res = await admin.from('grave_bookings').select(BOOKING_COLS).eq('id', id).single();
  if (!res.error) return res.data;

  if (isMissingColumnError(res.error)) {
    const fallback = await admin.from('grave_bookings').select(OLD_BOOKING_COLS).eq('id', id).single();
    if (fallback.error) throw fallback.error;
    return fallback.data;
  }
  throw res.error;
}

export async function insertBooking(
  admin: Admin,
  payload: Record<string, unknown>,
) {
  const withDeceased = await admin.from('grave_bookings').insert(payload).select(BOOKING_COLS).single();
  if (!withDeceased.error) return withDeceased.data;

  if (isMissingColumnError(withDeceased.error)) {
    const minimal = {
      id: payload.id,
      graveyard_id: payload.graveyard_id,
      grave_id: payload.grave_id,
      booked_by: payload.booked_by,
      slot_date: payload.slot_date,
      slot_time: payload.slot_time,
      deceased_name: payload.deceased_name,
      contact_name: payload.contact_name,
      contact_phone: payload.contact_phone,
      notes: payload.notes,
      status: payload.status,
      expires_at: payload.expires_at,
      created_at: payload.created_at,
    };
    const fallback = await admin.from('grave_bookings').insert(minimal).select(OLD_BOOKING_COLS).single();
    if (fallback.error) throw fallback.error;
    return fallback.data;
  }
  throw withDeceased.error;
}

export async function updateBooking(
  admin: Admin,
  id: string,
  updates: Record<string, unknown>,
) {
  const res = await admin.from('grave_bookings').update(updates).eq('id', id).select(BOOKING_COLS).single();
  if (!res.error) return res.data;

  if (isMissingColumnError(res.error)) {
    const fallback = await admin.from('grave_bookings').update(updates).eq('id', id).select(OLD_BOOKING_COLS).single();
    if (fallback.error) throw fallback.error;
    return fallback.data;
  }
  throw res.error;
}
