import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { BURIAL_COLS, CERT_COLS, GRAVE_COLS } from '@/lib/supabase';
import { errorResponse } from '@/lib/error-handler';

export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    const admin = getSupabaseAdmin();

    const { data: cert, error } = await admin
      .from('certificates')
      .select(CERT_COLS)
      .eq('verification_code', code.toUpperCase())
      .eq('status', 'issued')
      .single();

    if (error || !cert) return NextResponse.json({ valid: false, error: 'Certificate not found or not issued' }, { status: 404 });

    const c = cert as Record<string, unknown>;
    const { data: burial } = await admin.from('burials').select(BURIAL_COLS).eq('id', c.burialId).maybeSingle();
    let grave = null;
    if (burial) {
      const { data: g } = await admin.from('graves').select(GRAVE_COLS).eq('id', (burial as Record<string, unknown>).graveId).maybeSingle();
      grave = g;
    }

    return NextResponse.json({
      valid: true,
      certificate: cert,
      burial,
      grave,
    });
  } catch (e) { return errorResponse('Verification failed', e); }
}
