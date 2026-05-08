import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { ensureDataDir } from '@/lib/ensureData';

export async function PUT(req: NextRequest) {
  try {
    ensureDataDir();
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { name, phone, address } = await req.json();
    const db = await getDb();
    const idx = db.data.users.findIndex(u => u.id === auth.id);
    if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (name) db.data.users[idx].name = name;
    if (phone !== undefined) db.data.users[idx].phone = phone;
    if (address !== undefined) db.data.users[idx].address = address;
    db.data.users[idx].updatedAt = new Date().toISOString();
    await db.write();
    const u = db.data.users[idx];
    return NextResponse.json({ user: { id: u.id, name: u.name, email: u.email, role: u.role, phone: u.phone, address: u.address } });
  } catch { return NextResponse.json({ error: 'Server error' }, { status: 500 }); }
}
