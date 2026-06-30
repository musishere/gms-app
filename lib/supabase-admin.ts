import { createClient } from '@supabase/supabase-js';
import { assertSupabaseServiceConfig } from './supabase-env';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _admin: ReturnType<typeof createClient<any>> | null = null;

// Service-role client — bypasses RLS, server-side only. Never expose to the browser.
export function getSupabaseAdmin() {
  if (!_admin) {
    const { url, serviceKey } = assertSupabaseServiceConfig();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _admin = createClient<any>(url, serviceKey);
  }
  return _admin;
}
