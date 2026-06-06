import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/supabase';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { errorResponse } from '@/lib/error-handler';

export async function GET(req: NextRequest) {
  try {
    const { supabase, cookiesToSet } = createSupabaseClient(req);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await getSupabaseAdmin()
      .from('profiles')
      .select('name, role, phone, cnic, address')
      .eq('id', user.id)
      .single();

    const res = NextResponse.json({
      user: { id: user.id, name: profile?.name, email: user.email, role: profile?.role, phone: profile?.phone, cnic: profile?.cnic, address: profile?.address },
    });
    cookiesToSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options as never));
    return res;
  } catch (e) { return errorResponse('Failed to fetch user', e); }
}
