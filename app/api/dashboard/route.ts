import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { BURIAL_COLS, GRAVE_COLS } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = getSupabaseAdmin();

    const [
      { data: allGraves },
      { data: allPayments },
      { data: allBurials },
      { data: allMaint },
      { data: pendingCertsRows },
      { data: allUsers },
    ] = await Promise.all([
      admin.from('graves').select('status, section'),
      admin.from('payments').select('status, amount, created_at'),
      admin.from('burials').select(`${BURIAL_COLS}`).order('created_at', { ascending: false }),
      admin.from('maintenance').select('status, priority'),
      admin.from('certificates').select('id').eq('status', 'pending'),
      admin.from('profiles').select('id'),
    ]);

    // Grave stats
    const graveStats = {
      total: allGraves?.length ?? 0,
      available: allGraves?.filter(g => g.status === 'available').length ?? 0,
      occupied: allGraves?.filter(g => g.status === 'occupied').length ?? 0,
      reserved: allGraves?.filter(g => g.status === 'reserved').length ?? 0,
      maintenance: allGraves?.filter(g => g.status === 'maintenance').length ?? 0,
    };

    // Revenue
    const totalRevenue = allPayments?.filter(p => p.status === 'paid').reduce((s, p) => s + Number(p.amount), 0) ?? 0;
    const pendingRevenue = allPayments?.filter(p => p.status === 'pending').reduce((s, p) => s + Number(p.amount), 0) ?? 0;

    // Monthly burial stats (last 12 months)
    const now = new Date();
    const monthlyBurials = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-PK', { month: 'short', year: '2-digit' });
      const count = allBurials?.filter(b => (b as Record<string, unknown>).burialDate?.toString().startsWith(key)).length ?? 0;
      const revenue = allPayments?.filter(p => p.status === 'paid' && p.created_at?.startsWith(key)).reduce((s, p) => s + Number(p.amount), 0) ?? 0;
      return { month: label, key, burials: count, revenue };
    });

    // Maintenance alerts
    const maintenanceAlerts = {
      open: allMaint?.filter(m => m.status === 'open').length ?? 0,
      critical: allMaint?.filter(m => m.priority === 'critical' && m.status !== 'resolved').length ?? 0,
    };

    // Recent burials enriched with grave
    const recentBurials = await Promise.all(
      (allBurials ?? []).slice(0, 8).map(async (b: Record<string, unknown>) => {
        const { data: grave } = await admin.from('graves').select(GRAVE_COLS).eq('id', b.graveId).single();
        return { ...b, grave };
      })
    );

    // Section-wise stats
    const sections = [...new Set(allGraves?.map(g => g.section))];
    const sectionStats = sections.map(s => ({
      section: s,
      total: allGraves?.filter(g => g.section === s).length ?? 0,
      available: allGraves?.filter(g => g.section === s && g.status === 'available').length ?? 0,
      occupied: allGraves?.filter(g => g.section === s && g.status === 'occupied').length ?? 0,
    }));

    return NextResponse.json({
      graveStats, totalRevenue, pendingRevenue,
      monthlyBurials, maintenanceAlerts,
      recentBurials, pendingCerts: pendingCertsRows?.length ?? 0,
      sectionStats,
      totalBurials: allBurials?.length ?? 0,
      totalUsers: allUsers?.length ?? 0,
    });
  } catch (e) { console.error(e); return NextResponse.json({ error: 'Server error' }, { status: 500 }); }
}
