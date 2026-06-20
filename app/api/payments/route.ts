import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { BURIAL_COLS, GRAVE_COLS, PAYMENT_COLS } from '@/lib/supabase';
import { errorResponse } from '@/lib/error-handler';

function effectiveStatus(p: { status: string; due_date?: string | null }) {
  if (p.status === 'pending' && p.due_date && new Date(p.due_date) < new Date()) return 'overdue';
  return p.status;
}

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const month = searchParams.get('month');
    const method = searchParams.get('method');

    const admin = getSupabaseAdmin();
    let query = admin.from('payments').select(PAYMENT_COLS).order('created_at', { ascending: false });
    if (auth.role === 'family') query = query.eq('user_id', auth.id);
    if (status === 'overdue') {
      query = query.eq('status', 'pending').lt('due_date', new Date().toISOString());
    } else if (status) {
      query = query.eq('status', status);
    }
    if (method) query = query.eq('method', method);
    if (month) query = query.like('created_at', `${month}%`);

    const { data: payments, error } = await query;
    if (error) throw error;

    const enriched = await Promise.all((payments ?? []).map(async (p: Record<string, unknown>) => {
      const [{ data: burial }, { data: grave }] = await Promise.all([
        admin.from('burials').select(BURIAL_COLS).eq('id', p.burialId).maybeSingle(),
        admin.from('graves').select(GRAVE_COLS).eq('id', p.graveId).maybeSingle(),
      ]);
      const raw = p as { status: string; dueDate?: string };
      const eff = raw.status === 'pending' && raw.dueDate && new Date(raw.dueDate) < new Date() ? 'overdue' : raw.status;
      return { ...p, burial, grave, effectiveStatus: eff };
    }));

    let statsQuery = admin.from('payments').select('amount, status, due_date');
    if (auth.role === 'family') statsQuery = statsQuery.eq('user_id', auth.id);
    const { data: allForStats } = await statsQuery;

    const totalRevenue = allForStats?.filter(p => p.status === 'paid').reduce((s, p) => s + Number(p.amount), 0) ?? 0;
    const pendingRevenue = allForStats?.filter(p => p.status === 'pending').reduce((s, p) => s + Number(p.amount), 0) ?? 0;
    const overdueRevenue = allForStats?.filter(p => effectiveStatus(p) === 'overdue').reduce((s, p) => s + Number(p.amount), 0) ?? 0;

    return NextResponse.json({ payments: enriched, totalRevenue, pendingRevenue, overdueRevenue });
  } catch (e) { return errorResponse('Failed to fetch payments', e); }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth || !['admin', 'staff'].includes(auth.role))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id, status, transactionRef, method, notes } = await req.json();
    if (!id || !status) return NextResponse.json({ error: 'id and status required' }, { status: 400 });

    if (status === 'waived' && !notes)
      return NextResponse.json({ error: 'Notes required when waiving payment' }, { status: 400 });

    if (status === 'paid' && ['online', 'bank_transfer'].includes(method)) {
      if (!transactionRef) return NextResponse.json({ error: 'Transaction reference required for online/bank payments' }, { status: 400 });
    }

    const updates: Record<string, unknown> = { status };
    if (transactionRef) updates.transaction_ref = transactionRef;
    if (method) updates.method = method;
    if (notes !== undefined) updates.notes = notes;
    if (status === 'paid') updates.paid_at = new Date().toISOString();

    const { data: payment, error } = await getSupabaseAdmin()
      .from('payments')
      .update(updates)
      .eq('id', id)
      .select(PAYMENT_COLS)
      .single();

    if (error) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ payment });
  } catch (e) { return errorResponse('Failed to update payment', e); }
}
