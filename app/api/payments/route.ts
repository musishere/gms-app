import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { BURIAL_COLS, GRAVE_COLS, PAYMENT_COLS } from '@/lib/supabase';
import { errorResponse } from '@/lib/error-handler';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const month = searchParams.get('month');

    const admin = getSupabaseAdmin();
    let query = admin.from('payments').select(PAYMENT_COLS).order('created_at', { ascending: false });
    if (auth.role === 'family') query = query.eq('user_id', auth.id);
    if (status) query = query.eq('status', status);
    if (month) query = query.like('created_at', `${month}%`);

    const { data: payments, error } = await query;
    if (error) throw error;

    const enriched = await Promise.all((payments ?? []).map(async (p: Record<string, unknown>) => {
      const [{ data: burial }, { data: grave }] = await Promise.all([
        admin.from('burials').select(BURIAL_COLS).eq('id', p.burialId).maybeSingle(),
        admin.from('graves').select(GRAVE_COLS).eq('id', p.graveId).maybeSingle(),
      ]);
      return { ...p, burial, grave };
    }));

    // Revenue stats (all payments, ignore filters)
    const { data: allPaid } = await admin.from('payments').select('amount, status');
    const totalRevenue = allPaid?.filter(p => p.status === 'paid').reduce((s, p) => s + Number(p.amount), 0) ?? 0;
    const pendingRevenue = allPaid?.filter(p => p.status === 'pending').reduce((s, p) => s + Number(p.amount), 0) ?? 0;

    return NextResponse.json({ payments: enriched, totalRevenue, pendingRevenue });
  } catch (e) { return errorResponse('Failed to fetch payments', e); }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id, status, transactionRef, method } = await req.json();
    const updates: Record<string, unknown> = { status };
    if (transactionRef) updates.transaction_ref = transactionRef;
    if (method) updates.method = method;
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
