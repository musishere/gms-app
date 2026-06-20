import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { BURIAL_COLS, GRAVE_COLS } from '@/lib/supabase';
import { errorResponse } from '@/lib/error-handler';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = getSupabaseAdmin();
    const isFamily = auth.role === 'family';

    const gravesQuery = admin.from('graves').select('status, section');
    const paymentsQuery = admin.from('payments').select('status, amount, method, paid_at, created_at, grave_id, user_id, due_date');
    const burialsQuery = admin.from('burials').select(`${BURIAL_COLS}`).order('created_at', { ascending: false });
    const maintQuery = admin.from('maintenance').select('status, priority');
    const certsQuery = admin.from('certificates').select('id').eq('status', 'pending');
    const usersQuery = admin.from('profiles').select('id');

    if (isFamily) {
      burialsQuery.eq('booking_user_id', auth.id);
      paymentsQuery.eq('user_id', auth.id);
    }

    const [
      { data: allGraves },
      { data: allPayments },
      { data: allBurials },
      { data: allMaint },
      { data: pendingCertsRows },
      { data: allUsers },
    ] = await Promise.all([
      gravesQuery,
      paymentsQuery,
      burialsQuery,
      maintQuery,
      certsQuery,
      usersQuery,
    ]);

    const graveStats = isFamily ? null : {
      total: allGraves?.length ?? 0,
      available: allGraves?.filter(g => g.status === 'available').length ?? 0,
      occupied: allGraves?.filter(g => g.status === 'occupied').length ?? 0,
      reserved: allGraves?.filter(g => g.status === 'reserved').length ?? 0,
      maintenance: allGraves?.filter(g => g.status === 'maintenance').length ?? 0,
    };

    const totalRevenue = allPayments?.filter(p => p.status === 'paid').reduce((s, p) => s + Number(p.amount), 0) ?? 0;
    const pendingRevenue = allPayments?.filter(p => p.status === 'pending').reduce((s, p) => s + Number(p.amount), 0) ?? 0;
    const overdueRevenue = allPayments?.filter(p => p.status === 'pending' && p.due_date && new Date(p.due_date) < new Date())
      .reduce((s, p) => s + Number(p.amount), 0) ?? 0;

    const now = new Date();
    const monthlyBurials = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-PK', { month: 'short', year: '2-digit' });
      const count = allBurials?.filter(b => (b as Record<string, unknown>).burialDate?.toString().startsWith(key)).length ?? 0;
      const revenue = allPayments?.filter(p => {
        if (p.status !== 'paid') return false;
        const dateStr = p.paid_at || p.created_at;
        return dateStr?.startsWith(key);
      }).reduce((s, p) => s + Number(p.amount), 0) ?? 0;
      return { month: label, key, burials: count, revenue };
    });

    const maintenanceAlerts = isFamily ? { open: 0, critical: 0 } : {
      open: allMaint?.filter(m => m.status === 'open').length ?? 0,
      critical: allMaint?.filter(m => m.priority === 'critical' && m.status !== 'resolved').length ?? 0,
    };

    const recentBurials = await Promise.all(
      (allBurials ?? []).slice(0, 8).map(async (b: Record<string, unknown>) => {
        const { data: grave } = await admin.from('graves').select(GRAVE_COLS).eq('id', b.graveId).single();
        return { ...b, grave };
      })
    );

    const sections = isFamily ? [] : [...new Set(allGraves?.map(g => g.section))];
    const sectionStats = sections.map(s => ({
      section: s,
      total: allGraves?.filter(g => g.section === s).length ?? 0,
      available: allGraves?.filter(g => g.section === s && g.status === 'available').length ?? 0,
      occupied: allGraves?.filter(g => g.section === s && g.status === 'occupied').length ?? 0,
    }));

    const methods = ['cash', 'online', 'bank_transfer', 'cheque'] as const;
    const revenueByMethod = methods.map(m => ({
      method: m,
      amount: allPayments?.filter(p => p.status === 'paid' && p.method === m).reduce((s, p) => s + Number(p.amount), 0) ?? 0,
      count: allPayments?.filter(p => p.status === 'paid' && p.method === m).length ?? 0,
    })).filter(r => r.count > 0);

    const burialsBySection: Record<string, number> = {};
    for (const b of allBurials ?? []) {
      const { data: grave } = await admin.from('graves').select('section').eq('id', (b as Record<string, unknown>).graveId).single();
      const sec = grave?.section ?? 'Unknown';
      burialsBySection[sec] = (burialsBySection[sec] ?? 0) + 1;
    }

    const revenueBySection: Record<string, number> = {};
    for (const p of allPayments?.filter(p => p.status === 'paid') ?? []) {
      if (!p.grave_id) continue;
      const { data: grave } = await admin.from('graves').select('section').eq('id', p.grave_id).single();
      const sec = grave?.section ?? 'Unknown';
      revenueBySection[sec] = (revenueBySection[sec] ?? 0) + Number(p.amount);
    }

    return NextResponse.json({
      graveStats,
      totalRevenue,
      pendingRevenue,
      overdueRevenue,
      monthlyBurials,
      maintenanceAlerts,
      recentBurials,
      pendingCerts: isFamily ? 0 : (pendingCertsRows?.length ?? 0),
      sectionStats,
      totalBurials: allBurials?.length ?? 0,
      totalUsers: isFamily ? 0 : (allUsers?.length ?? 0),
      revenueByMethod,
      burialsBySection: Object.entries(burialsBySection).map(([section, count]) => ({ section, count })),
      revenueBySection: Object.entries(revenueBySection).map(([section, amount]) => ({ section, amount })),
    });
  } catch (e) { return errorResponse('Failed to fetch dashboard data', e); }
}
