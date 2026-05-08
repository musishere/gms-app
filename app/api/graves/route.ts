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
    const section = searchParams.get('section');
    const status = searchParams.get('status');
    const size = searchParams.get('size');
    const db = await getDb();
    let graves = db.data.graves;
    if (section) graves = graves.filter(g => g.section === section);
    if (status) graves = graves.filter(g => g.status === status);
    if (size) graves = graves.filter(g => g.size === size);
    // Stats
    const stats = {
      total: db.data.graves.length,
      available: db.data.graves.filter(g => g.status === 'available').length,
      occupied: db.data.graves.filter(g => g.status === 'occupied').length,
      reserved: db.data.graves.filter(g => g.status === 'reserved').length,
      maintenance: db.data.graves.filter(g => g.status === 'maintenance').length,
    };
    return NextResponse.json({ graves, stats });
  } catch { return NextResponse.json({ error: 'Server error' }, { status: 500 }); }
}

export async function PUT(req: NextRequest) {
  try {
    ensureDataDir();
    const auth = await getAuthUser(req);
    if (!auth || !['admin', 'staff'].includes(auth.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const { id, ...updates } = await req.json();
    const db = await getDb();
    const idx = db.data.graves.findIndex(g => g.id === id);
    if (idx === -1) return NextResponse.json({ error: 'Grave not found' }, { status: 404 });
    db.data.graves[idx] = { ...db.data.graves[idx], ...updates };
    await db.write();
    return NextResponse.json({ grave: db.data.graves[idx] });
  } catch { return NextResponse.json({ error: 'Server error' }, { status: 500 }); }
}
