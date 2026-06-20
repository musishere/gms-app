import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { GRAVEYARDS } from '@/lib/graveyards';
import type { Graveyard } from '@/lib/graveyards';

const SIZES = ['standard', 'standard', 'standard', 'child', 'double', 'vip'];
const PRICES: Record<string, number> = { standard: 15000, child: 8000, double: 25000, vip: 50000 };
const SECTIONS = ['A', 'B', 'C', 'D', 'VIP'];

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const admin = getSupabaseAdmin();

  // Find which graveyards already have any graves
  const { data: existing } = await admin
    .from('graves')
    .select('graveyard_id');

  const seededIds = new Set((existing ?? []).map((g: { graveyard_id: string }) => g.graveyard_id));
  const missing = GRAVEYARDS.filter(g => !seededIds.has(g.id));

  if (missing.length === 0) {
    return NextResponse.json({
      message: `All ${GRAVEYARDS.length} graveyards already seeded.`,
      seeded: 0,
    });
  }

  const graves = generateGraves(missing);
  const { error } = await admin.from('graves').insert(graves);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    message: `Seeded ${graves.length} graves across ${missing.length} graveyard(s).`,
    graveyards: missing.map(g => `${g.name} (${g.city})`),
    seeded: graves.length,
    alreadyDone: [...seededIds],
  });
}

function graveyardPrefix(siteId: string): string {
  // Use full site ID (uppercased, hyphens kept) so prefix is always unique.
  // e.g. 'bahria-lahore' → 'BAHRIA-LAHORE', 'uol-main' → 'UOL-MAIN'
  return siteId.toUpperCase();
}

function generateGraves(sites: Graveyard[]) {
  const graves: Record<string, unknown>[] = [];

  for (const site of sites) {
    const prefix = graveyardPrefix(site.id);
    let idx = 0;

    for (const section of SECTIONS) {
      const rows = section === 'VIP' ? 2 : 5;
      const cols = section === 'VIP' ? 4 : 8;

      for (let r = 1; r <= rows; r++) {
        for (let c = 1; c <= cols; c++) {
          const size = section === 'VIP' ? 'vip' : SIZES[idx % SIZES.length];
          const col3 = String(c).padStart(3, '0');
          graves.push({
            id:           `${site.id}-${section}-${r}-${c}`,
            graveyard_id: site.id,
            grave_number: `${prefix}-${section}-${r}${col3}`,
            section,
            row:          r,
            grave_col:    c,
            latitude:     site.latitude  + r * 0.00008 + SECTIONS.indexOf(section) * 0.0004,
            longitude:    site.longitude + c * 0.00008,
            status:       'available',
            size,
            price:        PRICES[size],
            created_at:   new Date().toISOString(),
          });
          idx++;
        }
      }
    }
  }

  return graves;
}
