import { NextRequest, NextResponse } from "next/server";
import { createSupabaseClient } from "@/lib/supabase";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { assertSupabasePublicConfig, mapAuthError } from "@/lib/supabase-env";

function setAuthCookies(
  res: NextResponse,
  cookiesToSet: Array<{ name: string; value: string; options: Record<string, unknown> }>,
) {
  cookiesToSet.forEach(({ name, value, options }) => {
    res.cookies.set(name, value, {
      ...options,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    } as never);
  });
}

export async function POST(req: NextRequest) {
  try {
    assertSupabasePublicConfig();

    const { email, password } = await req.json();
    if (!email || !password)
      return NextResponse.json(
        { error: "Email and password required" },
        { status: 400 },
      );

    const { supabase, cookiesToSet } = createSupabaseClient(req);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: String(email).trim().toLowerCase(),
      password,
    });

    if (error) {
      console.error('[auth/login] Supabase signIn error:', error.message);
      return NextResponse.json(
        { error: mapAuthError(error.message) },
        { status: 401 },
      );
    }

    if (!data.user)
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 },
      );

    const { data: profile, error: profileError } = await getSupabaseAdmin()
      .from("profiles")
      .select("name, role")
      .eq("id", data.user.id)
      .single();

    if (profileError) {
      console.error('[auth/login] Profile lookup error:', profileError.message);
    }

    const res = NextResponse.json({
      user: {
        id: data.user.id,
        name: profile?.name ?? "",
        email: data.user.email,
        role: profile?.role ?? "family",
      },
    });
    setAuthCookies(res, cookiesToSet);
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Server error';
    console.error('[auth/login] Unexpected error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
