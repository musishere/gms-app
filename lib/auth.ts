import { NextRequest } from "next/server";
import { createSupabaseClient } from "./supabase";
import { getSupabaseAdmin } from "./supabase-admin";

export async function getAuthUser(
  req: NextRequest,
): Promise<{ id: string; email: string; role: string } | null> {
  const { supabase } = createSupabaseClient(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await getSupabaseAdmin()
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return { id: user.id, email: user.email!, role: profile?.role ?? "family" };
}
