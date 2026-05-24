import { createServerClient } from '@supabase/ssr';
import type { NextRequest } from 'next/server';

// Column select strings using PostgREST aliasing (camelCase alias: snake_case column)
export const GRAVE_COLS =
  'id, graveNumber:grave_number, section, row, column:grave_col, latitude, longitude, status, size, price, occupiedBy:occupied_by, burialId:burial_id, lastMaintenanceDate:last_maintenance_date, notes, createdAt:created_at';

export const BURIAL_COLS =
  'id, graveId:grave_id, deceased, burialDate:burial_date, burialTime:burial_time, conductedBy:conducted_by, status, notes, bookingUserId:booking_user_id, qrCode:qr_code, createdAt:created_at, updatedAt:updated_at';

export const PAYMENT_COLS =
  'id, burialId:burial_id, graveId:grave_id, userId:user_id, amount, method, status, transactionRef:transaction_ref, paidAt:paid_at, dueDate:due_date, receiptNumber:receipt_number, notes, createdAt:created_at';

export const CERT_COLS =
  'id, burialId:burial_id, deceasedName:deceased_name, issuedTo:issued_to, requestedBy:requested_by, certificateNumber:certificate_number, status, issuedAt:issued_at, notes, createdAt:created_at';

export const MAINTENANCE_COLS =
  'id, graveId:grave_id, graveNumber:grave_number, section, title, description, priority, status, reportedBy:reported_by, assignedTo:assigned_to, resolvedAt:resolved_at, createdAt:created_at, updatedAt:updated_at';

// Creates an anon-key server client that reads/sets cookies from the request.
// Returns the client and a cookiesToSet array — apply these to your response.
export function createSupabaseClient(request: NextRequest) {
  const cookiesToSet: Array<{ name: string; value: string; options: Record<string, unknown> }> = [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookies) { cookiesToSet.push(...cookies); },
      },
    }
  );

  return { supabase, cookiesToSet };
}
