import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/supabase';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { errorResponse } from '@/lib/error-handler';

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, role, phone, cnic, address } = await req.json();
    if (!name || !email || !password) return NextResponse.json({ error: 'Name, email and password required' }, { status: 400 });
    if (password.length < 8) return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });

    const { supabase, cookiesToSet } = createSupabaseClient(req);
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return NextResponse.json({ error: error.message }, { status: 409 });
    if (!data.user) return NextResponse.json({ error: 'Registration failed' }, { status: 500 });

    const { error: profileError } = await getSupabaseAdmin()
      .from('profiles')
      .insert({ id: data.user.id, name, role: role || 'family', phone: phone || '', cnic: cnic || '', address: address || '' });
    if (profileError) {
      console.error('Profile creation error:', profileError);
      return NextResponse.json({ error: `Profile creation failed: ${profileError.message}` }, { status: 500 });
    }

    const res = NextResponse.json({
      user: { id: data.user.id, name, email, role: role || 'family' },
    });
    cookiesToSet.forEach(({ name: n, value, options }) => res.cookies.set(n, value, options as never));
    return res;
  } catch (e) { return errorResponse('Registration failed', e); }
}
