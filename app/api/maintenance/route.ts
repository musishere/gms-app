import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { ensureDataDir } from '@/lib/ensureData';
import { randomUUID } from 'crypto';

export async function GET(req: NextRequest) {
  try {
    ensureDataDir();
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const db = await getDb();
    let reqs = db.data.maintenance;
    if (status) reqs = reqs.filter(m => m.status === status);
    if (priority) reqs = reqs.filter(m => m.priority === priority);
    reqs = reqs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const stats = {
      open: db.data.maintenance.filter(m => m.status === 'open').length,
      inProgress: db.data.maintenance.filter(m => m.status === 'in_progress').length,
      resolved: db.data.maintenance.filter(m => m.status === 'resolved').length,
      critical: db.data.maintenance.filter(m => m.priority === 'critical' && m.status !== 'resolved').length,
    };
    return NextResponse.json({ requests: reqs, stats });
  } catch { return NextResponse.json({ error: 'Server error' }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  try {
    ensureDataDir();
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { graveId, graveNumber, section, title, description, priority } = await req.json();
    if (!title || !description) return NextResponse.json({ error: 'Title and description required' }, { status: 400 });
    const now = new Date().toISOString();
    const db = await getDb();
    // If critical, mark grave as maintenance
    if (priority === 'critical' && graveId) {
      const gIdx = db.data.graves.findIndex(g => g.id === graveId);
      if (gIdx !== -1 && db.data.graves[gIdx].status === 'available') {
        db.data.graves[gIdx].status = 'maintenance';
      }
    }
    const request = { id: randomUUID(), graveId, graveNumber, section, title, description, priority: priority || 'medium', status: 'open' as const, reportedBy: auth.id, createdAt: now, updatedAt: now };
    db.data.maintenance.push(request);
    await db.write();
    return NextResponse.json({ request });
  } catch { return NextResponse.json({ error: 'Server error' }, { status: 500 }); }
}

export async function PATCH(req: NextRequest) {
  try {
    ensureDataDir();
    const auth = await getAuthUser(req);
    if (!auth || !['admin', 'staff'].includes(auth.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const { id, status, assignedTo } = await req.json();
    const db = await getDb();
    const idx = db.data.maintenance.findIndex(m => m.id === id);
    if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    db.data.maintenance[idx].status = status;
    if (assignedTo) db.data.maintenance[idx].assignedTo = assignedTo;
    if (status === 'resolved') {
      db.data.maintenance[idx].resolvedAt = new Date().toISOString();
      // Restore grave status if was in maintenance
      const graveId = db.data.maintenance[idx].graveId;
      if (graveId) {
        const gIdx = db.data.graves.findIndex(g => g.id === graveId);
        if (gIdx !== -1 && db.data.graves[gIdx].status === 'maintenance') {
          db.data.graves[gIdx].status = 'available';
          db.data.graves[gIdx].lastMaintenanceDate = new Date().toISOString();
        }
      }
    }
    db.data.maintenance[idx].updatedAt = new Date().toISOString();
    await db.write();
    return NextResponse.json({ request: db.data.maintenance[idx] });
  } catch { return NextResponse.json({ error: 'Server error' }, { status: 500 }); }
}
