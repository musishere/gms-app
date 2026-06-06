import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { MAINTENANCE_COLS } from '@/lib/supabase';
import { randomUUID } from 'crypto';
import { errorResponse } from '@/lib/error-handler';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');

    const admin = getSupabaseAdmin();
    let query = admin.from('maintenance').select(MAINTENANCE_COLS).order('created_at', { ascending: false });
    if (status) query = query.eq('status', status);
    if (priority) query = query.eq('priority', priority);

    const { data: requests, error } = await query;
    if (error) throw error;

    const { data: all } = await admin.from('maintenance').select('status, priority');
    const stats = {
      open: all?.filter(m => m.status === 'open').length ?? 0,
      inProgress: all?.filter(m => m.status === 'in_progress').length ?? 0,
      resolved: all?.filter(m => m.status === 'resolved').length ?? 0,
      critical: all?.filter(m => m.priority === 'critical' && m.status !== 'resolved').length ?? 0,
    };

    return NextResponse.json({ requests: requests ?? [], stats });
  } catch (e) { return errorResponse('Server error', e); }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { graveId, graveNumber, section, title, description, priority } = await req.json();
    if (!title || !description) return NextResponse.json({ error: 'Title and description required' }, { status: 400 });

    const now = new Date().toISOString();
    const admin = getSupabaseAdmin();

    // Mark grave as under maintenance for critical requests
    if (priority === 'critical' && graveId) {
      await admin.from('graves').update({ status: 'maintenance' }).eq('id', graveId).eq('status', 'available');
    }

    const { data: request, error } = await admin.from('maintenance').insert({
      id: randomUUID(),
      grave_id: graveId || null,
      grave_number: graveNumber || null,
      section: section || null,
      title,
      description,
      priority: priority || 'medium',
      status: 'open',
      reported_by: auth.id,
      created_at: now,
      updated_at: now,
    }).select(MAINTENANCE_COLS).single();
    if (error) throw error;

    return NextResponse.json({ request });
  } catch (e) { return errorResponse('Server error', e); }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth || !['admin', 'staff'].includes(auth.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id, status, assignedTo } = await req.json();
    const updates: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
    if (assignedTo) updates.assigned_to = assignedTo;
    if (status === 'resolved') updates.resolved_at = new Date().toISOString();

    const admin = getSupabaseAdmin();
    const { data: request, error } = await admin.from('maintenance').update(updates).eq('id', id).select(MAINTENANCE_COLS).single();
    if (error) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Restore grave when resolved
    if (status === 'resolved') {
      const r = request as Record<string, unknown>;
      if (r.graveId) {
        await admin.from('graves').update({ status: 'available', last_maintenance_date: new Date().toISOString() })
          .eq('id', r.graveId).eq('status', 'maintenance');
      }
    }

    return NextResponse.json({ request });
  } catch (e) { return errorResponse('Server error', e); }
}
