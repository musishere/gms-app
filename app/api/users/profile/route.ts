import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function PUT(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { name, phone, address } = await req.json();
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (name !== undefined) updates.name = name;
    if (phone !== undefined) updates.phone = phone;
    if (address !== undefined) updates.address = address;

    const { data: profile, error } = await getSupabaseAdmin()
      .from('profiles')
      .update(updates)
      .eq('id', auth.id)
      .select('id, name, role, phone, cnic, address')
      .single();

    if (error) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({
      user: { id: auth.id, name: profile.name, email: auth.email, role: profile.role, phone: profile.phone, address: profile.address },
    });
  } catch { return NextResponse.json({ error: 'Server error' }, { status: 500 }); }
}
