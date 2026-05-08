import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { ensureDataDir } from '@/lib/ensureData';

export async function GET(req: NextRequest) {
  try {
    ensureDataDir();
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const month = searchParams.get('month');
    const db = await getDb();
    let payments = db.data.payments;
    if (auth.role === 'family') payments = payments.filter(p => p.userId === auth.id);
    if (status) payments = payments.filter(p => p.status === status);
    if (month) payments = payments.filter(p => p.createdAt.startsWith(month));
    // Enrich
    const enriched = payments.map(p => {
      const burial = db.data.burials.find(b => b.id === p.burialId);
      const grave = db.data.graves.find(g => g.id === p.graveId);
      return { ...p, burial, grave };
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    // Revenue stats
    const totalRevenue = db.data.payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
    const pendingRevenue = db.data.payments.filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0);
    return NextResponse.json({ payments: enriched, totalRevenue, pendingRevenue });
  } catch { return NextResponse.json({ error: 'Server error' }, { status: 500 }); }
}

export async function PATCH(req: NextRequest) {
  try {
    ensureDataDir();
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id, status, transactionRef, method } = await req.json();
    const db = await getDb();
    const idx = db.data.payments.findIndex(p => p.id === id);
    if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    db.data.payments[idx].status = status;
    if (transactionRef) db.data.payments[idx].transactionRef = transactionRef;
    if (method) db.data.payments[idx].method = method;
    if (status === 'paid') db.data.payments[idx].paidAt = new Date().toISOString();
    await db.write();
    return NextResponse.json({ payment: db.data.payments[idx] });
  } catch { return NextResponse.json({ error: 'Server error' }, { status: 500 }); }
}
