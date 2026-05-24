import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/supabase';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) return NextResponse.json({ error: 'Email and password required' }, { status: 400 });

    const { supabase, cookiesToSet } = createSupabaseClient(req);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });

    const { data: profile } = await getSupabaseAdmin()
      .from('profiles')
      .select('name, role')
      .eq('id', data.user.id)
      .single();

    const res = NextResponse.json({
      user: { id: data.user.id, name: profile?.name ?? '', email: data.user.email, role: profile?.role ?? 'family' },
    });
    cookiesToSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options as never));
    return res;
  } catch { return NextResponse.json({ error: 'Server error' }, { status: 500 }); }
}
