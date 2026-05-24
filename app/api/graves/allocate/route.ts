import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { GRAVE_COLS } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { size, section } = await req.json();
    const admin = getSupabaseAdmin();

    let query = admin.from('graves').select(GRAVE_COLS).eq('status', 'available');
    if (size) query = query.eq('size', size);
    if (section) query = query.eq('section', section);

    const { data: candidates, error } = await query;
    if (error) throw error;
    if (!candidates || candidates.length === 0)
      return NextResponse.json({ error: 'No available graves matching criteria' }, { status: 404 });

    candidates.sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
      if (a.section !== b.section) return String(a.section).localeCompare(String(b.section));
      if (a.row !== b.row) return Number(a.row) - Number(b.row);
      return Number(a.column) - Number(b.column);
    });

    const allocated = candidates[0];
    return NextResponse.json({
      grave: allocated,
      message: `Grave ${allocated.graveNumber} auto-allocated in section ${allocated.section}`,
    });
  } catch { return NextResponse.json({ error: 'Server error' }, { status: 500 }); }
}
