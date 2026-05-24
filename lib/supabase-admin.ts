import { createClient } from '@supabase/supabase-js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _admin: ReturnType<typeof createClient<any>> | null = null;

// Service-role client — bypasses RLS, server-side only. Never expose to the browser.
export function getSupabaseAdmin() {
  if (!_admin) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _admin = createClient<any>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _admin;
}
