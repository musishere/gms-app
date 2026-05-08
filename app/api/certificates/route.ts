import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { ensureDataDir } from '@/lib/ensureData';
import { generateCertNumber } from '@/lib/utils';
import { randomUUID } from 'crypto';

export async function GET(req: NextRequest) {
  try {
    ensureDataDir();
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const db = await getDb();
    let certs = db.data.certificates;
    if (auth.role === 'family') certs = certs.filter(c => c.requestedBy === auth.id);
    const enriched = certs.map(c => {
      const burial = db.data.burials.find(b => b.id === c.burialId);
      return { ...c, burial };
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return NextResponse.json({ certificates: enriched });
  } catch { return NextResponse.json({ error: 'Server error' }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  try {
    ensureDataDir();
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { burialId, issuedTo } = await req.json();
    if (!burialId || !issuedTo) return NextResponse.json({ error: 'burialId and issuedTo required' }, { status: 400 });
    const db = await getDb();
    const burial = db.data.burials.find(b => b.id === burialId);
    if (!burial) return NextResponse.json({ error: 'Burial not found' }, { status: 404 });
    const existing = db.data.certificates.find(c => c.burialId === burialId && c.status !== 'rejected');
    if (existing) return NextResponse.json({ error: 'Certificate already requested', certificate: existing }, { status: 409 });
    const now = new Date().toISOString();
    const cert = {
      id: randomUUID(),
      burialId,
      deceasedName: burial.deceased.name,
      issuedTo,
      requestedBy: auth.id,
      certificateNumber: generateCertNumber(),
      status: auth.role === 'admin' ? 'issued' as const : 'pending' as const,
      issuedAt: auth.role === 'admin' ? now : undefined,
      createdAt: now,
    };
    db.data.certificates.push(cert);
    await db.write();
    return NextResponse.json({ certificate: cert });
  } catch { return NextResponse.json({ error: 'Server error' }, { status: 500 }); }
}

export async function PATCH(req: NextRequest) {
  try {
    ensureDataDir();
    const auth = await getAuthUser(req);
    if (!auth || !['admin', 'staff'].includes(auth.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const { id, status, notes } = await req.json();
    const db = await getDb();
    const idx = db.data.certificates.findIndex(c => c.id === id);
    if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    db.data.certificates[idx].status = status;
    if (notes) db.data.certificates[idx].notes = notes;
    if (status === 'issued') db.data.certificates[idx].issuedAt = new Date().toISOString();
    await db.write();
    return NextResponse.json({ certificate: db.data.certificates[idx] });
  } catch { return NextResponse.json({ error: 'Server error' }, { status: 500 }); }
}
