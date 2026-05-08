import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { ensureDataDir } from '@/lib/ensureData';

export async function GET(req: NextRequest) {
  try {
    ensureDataDir();
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const db = await getDb();
    const user = db.data.users.find(u => u.id === auth.id);
    if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone, cnic: user.cnic, address: user.address } });
  } catch { return NextResponse.json({ error: 'Server error' }, { status: 500 }); }
}
