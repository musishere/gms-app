import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { ensureDataDir } from '@/lib/ensureData';
import { generateReceiptNumber } from '@/lib/utils';
import { randomUUID } from 'crypto';

export async function GET(req: NextRequest) {
  try {
    ensureDataDir();
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const month = searchParams.get('month'); // YYYY-MM
    const db = await getDb();
    let burials = db.data.burials;
    // Family users only see their own
    if (auth.role === 'family') burials = burials.filter(b => b.bookingUserId === auth.id);
    if (status) burials = burials.filter(b => b.status === status);
    if (month) burials = burials.filter(b => b.burialDate.startsWith(month));
    burials = burials.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    // Enrich with grave info
    const enriched = burials.map(b => {
      const grave = db.data.graves.find(g => g.id === b.graveId);
      const payment = db.data.payments.find(p => p.burialId === b.id);
      return { ...b, grave, payment };
    });
    return NextResponse.json({ burials: enriched });
  } catch (e) { console.error(e); return NextResponse.json({ error: 'Server error' }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  try {
    ensureDataDir();
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const { graveId, deceased, burialDate, burialTime, conductedBy, notes, paymentMethod, amount } = body;
    if (!graveId || !deceased || !burialDate || !burialTime) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    const db = await getDb();
    const grave = db.data.graves.find(g => g.id === graveId);
    if (!grave) return NextResponse.json({ error: 'Grave not found' }, { status: 404 });
    if (grave.status !== 'available' && grave.status !== 'reserved') return NextResponse.json({ error: 'Grave not available' }, { status: 409 });
    const now = new Date().toISOString();
    const burialId = randomUUID();
    // Create burial
    const burial = {
      id: burialId,
      graveId,
      deceased: { id: randomUUID(), ...deceased },
      burialDate,
      burialTime,
      conductedBy: conductedBy || '',
      status: 'confirmed' as const,
      notes: notes || '',
      bookingUserId: auth.id,
      createdAt: now,
      updatedAt: now,
    };
    db.data.burials.push(burial);
    // Mark grave occupied
    const gIdx = db.data.graves.findIndex(g => g.id === graveId);
    db.data.graves[gIdx].status = 'occupied';
    db.data.graves[gIdx].occupiedBy = deceased.name;
    db.data.graves[gIdx].burialId = burialId;
    // Create payment record
    const paymentAmount = amount || grave.price;
    const payment = {
      id: randomUUID(),
      burialId,
      graveId,
      userId: auth.id,
      amount: paymentAmount,
      method: (paymentMethod || 'cash') as any,
      status: 'pending' as const,
      receiptNumber: generateReceiptNumber(),
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: now,
    };
    db.data.payments.push(payment);
    // Notification
    db.data.notifications.push({
      id: randomUUID(),
      userId: auth.id,
      title: 'Burial Confirmed',
      message: `Burial of ${deceased.name} confirmed at grave ${grave.graveNumber} on ${burialDate} at ${burialTime}.`,
      type: 'success',
      read: false,
      createdAt: now,
    });
    await db.write();
    return NextResponse.json({ burial, payment, grave: db.data.graves[gIdx] });
  } catch (e) { console.error(e); return NextResponse.json({ error: 'Server error' }, { status: 500 }); }
}
