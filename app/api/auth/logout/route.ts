import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const { supabase, cookiesToSet } = createSupabaseClient(req);
  await supabase.auth.signOut();
  const res = NextResponse.json({ success: true });
  cookiesToSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options as never));
  return res;
}
