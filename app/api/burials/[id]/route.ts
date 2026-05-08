import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { ensureDataDir } from '@/lib/ensureData';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    ensureDataDir();
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const db = await getDb();
    const burial = db.data.burials.find(b => b.id === id);
    if (!burial) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (auth.role === 'family' && burial.bookingUserId !== auth.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const grave = db.data.graves.find(g => g.id === burial.graveId);
    const payment = db.data.payments.find(p => p.burialId === id);
    const certificate = db.data.certificates.find(c => c.burialId === id);
    return NextResponse.json({ burial, grave, payment, certificate });
  } catch { return NextResponse.json({ error: 'Server error' }, { status: 500 }); }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    ensureDataDir();
    const auth = await getAuthUser(req);
    if (!auth || !['admin', 'staff'].includes(auth.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const { id } = await params;
    const updates = await req.json();
    const db = await getDb();
    const idx = db.data.burials.findIndex(b => b.id === id);
    if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    db.data.burials[idx] = { ...db.data.burials[idx], ...updates, updatedAt: new Date().toISOString() };
    await db.write();
    return NextResponse.json({ burial: db.data.burials[idx] });
  } catch { return NextResponse.json({ error: 'Server error' }, { status: 500 }); }
}
