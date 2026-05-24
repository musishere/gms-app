import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

// One-time endpoint to seed the graves table.
// Requires: Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
// DELETE this route (or add an env flag) after seeding production.
export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const admin = getSupabaseAdmin();
  const { count } = await admin.from('graves').select('*', { count: 'exact', head: true });
  if ((count ?? 0) > 0) return NextResponse.json({ message: `Already seeded (${count} graves)` });

  const graves = generateGraves();
  const { error } = await admin.from('graves').insert(graves);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ message: `Seeded ${graves.length} graves successfully` });
}

function generateGraves() {
  const graves: Record<string, unknown>[] = [];
  const sections = ['A', 'B', 'C', 'D', 'VIP'];
  const sizes = ['standard', 'standard', 'standard', 'child', 'double', 'vip'];
  const prices: Record<string, number> = { standard: 15000, child: 8000, double: 25000, vip: 50000 };
  const baseLat = 31.5204;
  const baseLon = 74.3587;
  let idx = 0;

  for (const section of sections) {
    const rows = section === 'VIP' ? 3 : 8;
    const cols = section === 'VIP' ? 5 : 10;
    for (let r = 1; r <= rows; r++) {
      for (let c = 1; c <= cols; c++) {
        const size = section === 'VIP' ? 'vip' : sizes[idx % sizes.length];
        const num = String(c).padStart(3, '0');
        graves.push({
          id: `grave-${section}-${r}-${c}`,
          grave_number: `${section}-${r}${num}`,
          section,
          row: r,
          grave_col: c,
          latitude: baseLat + r * 0.0001 + sections.indexOf(section) * 0.001,
          longitude: baseLon + c * 0.0001,
          status: 'available',
          size,
          price: prices[size],
          created_at: new Date().toISOString(),
        });
        idx++;
      }
    }
  }
  return graves;
}
