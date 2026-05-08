import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { hashPassword, signToken } from '@/lib/auth';
import { ensureDataDir } from '@/lib/ensureData';
import { randomUUID } from 'crypto';

export async function POST(req: NextRequest) {
  try {
    ensureDataDir();
    const { name, email, password, role, phone, cnic, address } = await req.json();
    if (!name || !email || !password) return NextResponse.json({ error: 'Name, email and password required' }, { status: 400 });
    if (password.length < 8) return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    const db = await getDb();
    if (db.data.users.find(u => u.email === email)) return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    const now = new Date().toISOString();
    const user = { id: randomUUID(), name, email, password: await hashPassword(password), role: role || 'family', phone: phone || '', cnic: cnic || '', address: address || '', createdAt: now, updatedAt: now };
    db.data.users.push(user);
    await db.write();
    const token = signToken({ id: user.id, email: user.email, role: user.role });
    const res = NextResponse.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    res.cookies.set('gms_token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 60 * 60 * 24 * 7, path: '/' });
    return res;
  } catch (e) { return NextResponse.json({ error: 'Server error' }, { status: 500 }); }
}
