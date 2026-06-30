export function getSupabasePublicConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  return { url, anonKey };
}

export function assertSupabasePublicConfig(): { url: string; anonKey: string } {
  const { url, anonKey } = getSupabasePublicConfig();
  if (!url || !anonKey) {
    throw new Error(
      'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in production, then redeploy.',
    );
  }
  return { url, anonKey };
}

export function assertSupabaseServiceConfig(): { url: string; serviceKey: string } {
  const { url } = assertSupabasePublicConfig();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!serviceKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is missing in production environment variables.',
    );
  }
  return { url, serviceKey };
}

export function mapAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('email not confirmed')) {
    return 'Email not confirmed. Check your inbox or confirm the user in Supabase Dashboard → Authentication → Users.';
  }
  if (lower.includes('invalid login credentials') || lower.includes('invalid credentials')) {
    return 'Invalid email or password.';
  }
  if (lower.includes('invalid api key') || lower.includes('apikey')) {
    return 'Server auth configuration error. Check Supabase API keys in production env vars and redeploy.';
  }
  return message;
}
