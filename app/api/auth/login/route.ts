import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { comparePassword, signToken } from '@/lib/auth';
import { ensureDataDir } from '@/lib/ensureData';

export async function POST(req: NextRequest) {
  try {
    ensureDataDir();
    const { email, password } = await req.json();
    if (!email || !password) return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    const db = await getDb();
    const user = db.data.users.find(u => u.email === email);
    if (!user || !await comparePassword(password, user.password))
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    const token = signToken({ id: user.id, email: user.email, role: user.role });
    const res = NextResponse.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    res.cookies.set('gms_token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 60 * 60 * 24 * 7, path: '/' });
    return res;
  } catch (e) { return NextResponse.json({ error: 'Server error' }, { status: 500 }); }
}
