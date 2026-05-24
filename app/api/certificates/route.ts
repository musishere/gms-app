import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { BURIAL_COLS, CERT_COLS } from '@/lib/supabase';
import { generateCertNumber } from '@/lib/utils';
import { randomUUID } from 'crypto';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = getSupabaseAdmin();
    let query = admin.from('certificates').select(CERT_COLS).order('created_at', { ascending: false });
    if (auth.role === 'family') query = query.eq('requested_by', auth.id);

    const { data: certs, error } = await query;
    if (error) throw error;

    const enriched = await Promise.all((certs ?? []).map(async (c: Record<string, unknown>) => {
      const { data: burial } = await admin.from('burials').select(BURIAL_COLS).eq('id', c.burialId).maybeSingle();
      return { ...c, burial };
    }));

    return NextResponse.json({ certificates: enriched });
  } catch { return NextResponse.json({ error: 'Server error' }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { burialId, issuedTo } = await req.json();
    if (!burialId || !issuedTo) return NextResponse.json({ error: 'burialId and issuedTo required' }, { status: 400 });

    const admin = getSupabaseAdmin();
    const { data: burial } = await admin.from('burials').select('deceased').eq('id', burialId).single();
    if (!burial) return NextResponse.json({ error: 'Burial not found' }, { status: 404 });

    const { data: existing } = await admin.from('certificates').select('id, status').eq('burial_id', burialId).neq('status', 'rejected').maybeSingle();
    if (existing) return NextResponse.json({ error: 'Certificate already requested', certificate: existing }, { status: 409 });

    const now = new Date().toISOString();
    const { data: cert, error } = await admin.from('certificates').insert({
      id: randomUUID(),
      burial_id: burialId,
      deceased_name: (burial.deceased as Record<string, unknown>).name,
      issued_to: issuedTo,
      requested_by: auth.id,
      certificate_number: generateCertNumber(),
      status: auth.role === 'admin' ? 'issued' : 'pending',
      issued_at: auth.role === 'admin' ? now : null,
      created_at: now,
    }).select(CERT_COLS).single();
    if (error) throw error;

    return NextResponse.json({ certificate: cert });
  } catch { return NextResponse.json({ error: 'Server error' }, { status: 500 }); }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth || !['admin', 'staff'].includes(auth.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id, status, notes } = await req.json();
    const updates: Record<string, unknown> = { status };
    if (notes) updates.notes = notes;
    if (status === 'issued') updates.issued_at = new Date().toISOString();

    const { data: certificate, error } = await getSupabaseAdmin()
      .from('certificates')
      .update(updates)
      .eq('id', id)
      .select(CERT_COLS)
      .single();

    if (error) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ certificate });
  } catch { return NextResponse.json({ error: 'Server error' }, { status: 500 }); }
}
