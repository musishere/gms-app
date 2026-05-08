import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { ensureDataDir } from '@/lib/ensureData';

export async function GET(req: NextRequest) {
  try {
    ensureDataDir();
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const db = await getDb();

    // Grave availability
    const graveStats = {
      total: db.data.graves.length,
      available: db.data.graves.filter(g => g.status === 'available').length,
      occupied: db.data.graves.filter(g => g.status === 'occupied').length,
      reserved: db.data.graves.filter(g => g.status === 'reserved').length,
      maintenance: db.data.graves.filter(g => g.status === 'maintenance').length,
    };

    // Revenue
    const totalRevenue = db.data.payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
    const pendingRevenue = db.data.payments.filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0);

    // Monthly burial stats (last 12 months)
    const now = new Date();
    const monthlyBurials = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-PK', { month: 'short', year: '2-digit' });
      const count = db.data.burials.filter(b => b.burialDate.startsWith(key)).length;
      const revenue = db.data.payments.filter(p => p.status === 'paid' && p.createdAt.startsWith(key)).reduce((s, p) => s + p.amount, 0);
      return { month: label, key, burials: count, revenue };
    });

    // Maintenance alerts
    const maintenanceAlerts = {
      open: db.data.maintenance.filter(m => m.status === 'open').length,
      critical: db.data.maintenance.filter(m => m.priority === 'critical' && m.status !== 'resolved').length,
    };

    // Recent burials
    const recentBurials = db.data.burials
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 8)
      .map(b => ({ ...b, grave: db.data.graves.find(g => g.id === b.graveId) }));

    // Pending certificates
    const pendingCerts = db.data.certificates.filter(c => c.status === 'pending').length;

    // Section-wise availability
    const sections = [...new Set(db.data.graves.map(g => g.section))];
    const sectionStats = sections.map(s => ({
      section: s,
      total: db.data.graves.filter(g => g.section === s).length,
      available: db.data.graves.filter(g => g.section === s && g.status === 'available').length,
      occupied: db.data.graves.filter(g => g.section === s && g.status === 'occupied').length,
    }));

    return NextResponse.json({
      graveStats, totalRevenue, pendingRevenue,
      monthlyBurials, maintenanceAlerts,
      recentBurials, pendingCerts, sectionStats,
      totalBurials: db.data.burials.length,
      totalUsers: db.data.users.length,
    });
  } catch (e) { console.error(e); return NextResponse.json({ error: 'Server error' }, { status: 500 }); }
}
