import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { ensureDataDir } from '@/lib/ensureData';

export async function POST(req: NextRequest) {
  try {
    ensureDataDir();
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { size, section, religion } = await req.json();
    const db = await getDb();
    let candidates = db.data.graves.filter(g => g.status === 'available');
    if (size) candidates = candidates.filter(g => g.size === size);
    if (section) candidates = candidates.filter(g => g.section === section);
    if (candidates.length === 0) return NextResponse.json({ error: 'No available graves matching criteria' }, { status: 404 });
    // Sort: prefer lower-numbered graves for orderly allocation
    candidates.sort((a, b) => {
      if (a.section !== b.section) return a.section.localeCompare(b.section);
      if (a.row !== b.row) return a.row - b.row;
      return a.column - b.column;
    });
    const allocated = candidates[0];
    return NextResponse.json({ grave: allocated, message: `Grave ${allocated.graveNumber} auto-allocated in section ${allocated.section}` });
  } catch { return NextResponse.json({ error: 'Server error' }, { status: 500 }); }
}
