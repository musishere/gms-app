'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { BurialBadge } from '@/components/ui/Badges';
import { formatDate, formatCurrency } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  MapPin, Calendar, CreditCard, Wrench, FileText,
  AlertTriangle, CheckCircle2, Loader2, ArrowRight, BookMarked, ShieldAlert,
} from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const isAdmin = user?.role === 'admin';
  const isStaff = user?.role === 'staff';
  const isFamily = user?.role === 'family';

  useEffect(() => {
    fetch('/api/dashboard').then(r => r.json()).then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
    </div>
  );

  const PIE_COLORS = ['#10b981', '#64748b', '#3b82f6', '#f97316'];
  const pieData = data ? [
    { name: 'Available',    value: data.graveStats?.available },
    { name: 'Occupied',     value: data.graveStats?.occupied },
    { name: 'Reserved',     value: data.graveStats?.reserved },
    { name: 'Maintenance',  value: data.graveStats?.maintenance },
  ].filter(d => d.value > 0) : [];

  /* ── Family view ──────────────────────────────────────────────────────── */
  if (isFamily) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Welcome, {user?.name?.split(' ')[0]} 🌿</h1>
          <p className="text-slate-400 text-sm mt-1">Your burial records and account overview</p>
        </div>

        {/* Personal KPIs */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {[
            { label: 'My Burials',   value: data?.totalBurials ?? 0,             icon: Calendar,   color: 'text-violet-400', bg: 'bg-violet-500/10', href: '/dashboard/burials' },
            { label: 'Amount Paid',  value: formatCurrency(data?.totalRevenue ?? 0), icon: CreditCard, color: 'text-amber-400',  bg: 'bg-amber-500/10',  href: '/dashboard/payments' },
          ].map(({ label, value, icon: Icon, color, bg, href }) => (
            <Link key={label} href={href} className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition">
              <div className="flex items-center justify-between mb-3">
                <p className="text-slate-400 text-xs font-medium uppercase tracking-wide">{label}</p>
                <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
              </div>
              <p className="text-xl font-bold text-white">{value}</p>
            </Link>
          ))}
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
          {[
            { href: '/dashboard/bookings/new', label: 'Book a Grave', icon: BookMarked, accent: 'emerald' },
            { href: '/dashboard/certificates/new', label: 'Request Certificate', icon: FileText, accent: 'blue' },
            { href: '/dashboard/graves', label: 'Browse Graves', icon: MapPin, accent: 'slate' },
          ].map(({ href, label, icon: Icon, accent }) => (
            <Link key={href} href={href}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition text-center
                ${accent === 'emerald' ? 'bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-400'
                  : accent === 'blue' ? 'bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20 text-blue-400'
                  : 'bg-slate-800 border-slate-700 hover:border-slate-600 text-slate-400'}`}>
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium">{label}</span>
            </Link>
          ))}
        </div>

        {/* Recent burials (own) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
            <h2 className="text-sm font-semibold text-slate-300">My Recent Burials</h2>
            <Link href="/dashboard/burials" className="text-emerald-400 hover:text-emerald-300 text-xs font-medium flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {!data?.recentBurials?.length ? (
            <div className="py-12 text-center text-slate-500 text-sm">No burial records yet</div>
          ) : (
            <div className="divide-y divide-slate-800">
              {data.recentBurials.map((b: any) => (
                <Link key={b.id} href={`/dashboard/burials/${b.id}`} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-800/50 transition">
                  <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
                    <Calendar className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate">{b.deceased?.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{b.grave?.graveNumber} · {formatDate(b.burialDate)}</p>
                  </div>
                  <BurialBadge status={b.status} />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ── Admin / Staff view ───────────────────────────────────────────────── */
  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Welcome, {user?.name?.split(' ')[0]} 🌿
            {isAdmin && (
              <span className="ml-2 text-xs font-normal bg-red-500/15 text-red-400 border border-red-500/30 rounded-full px-2 py-0.5 align-middle">
                Admin
              </span>
            )}
          </h1>
          <p className="text-slate-400 text-sm mt-1">Graveyard Management System Overview</p>
        </div>
        <Link href="/dashboard/burials/new" className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition shadow-lg shadow-emerald-500/20">
          <Calendar className="w-4 h-4" /> New Burial
        </Link>
      </div>

      {/* KPI cards — Revenue only for admin */}
      <div className={`grid grid-cols-2 ${isAdmin ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-4 mb-6`}>
        {[
          { label: 'Total Graves',     value: data?.graveStats?.total ?? 0,       icon: MapPin,        color: 'text-emerald-400', bg: 'bg-emerald-500/10', href: '/dashboard/graves' },
          { label: 'Available Plots',  value: data?.graveStats?.available ?? 0,   icon: CheckCircle2,  color: 'text-blue-400',    bg: 'bg-blue-500/10',    href: '/dashboard/graves?status=available' },
          { label: 'Total Burials',    value: data?.totalBurials ?? 0,            icon: Calendar,      color: 'text-violet-400',  bg: 'bg-violet-500/10',  href: '/dashboard/burials' },
          // Revenue — admin only
          ...(isAdmin ? [{ label: 'Revenue Collected', value: formatCurrency(data?.totalRevenue ?? 0), icon: CreditCard, color: 'text-amber-400', bg: 'bg-amber-500/10', href: '/dashboard/payments' }] : []),
        ].map(({ label, value, icon: Icon, color, bg, href }) => (
          <Link key={label} href={href} className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition group">
            <div className="flex items-center justify-between mb-3">
              <p className="text-slate-400 text-xs font-medium uppercase tracking-wide">{label}</p>
              <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
            </div>
            <p className="text-xl font-bold text-white">{value}</p>
          </Link>
        ))}
      </div>

      {/* Alerts row — admin + staff */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {data?.maintenanceAlerts?.critical > 0 && (
          <Link href="/dashboard/maintenance" className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 hover:bg-red-500/20 transition">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-300">{data.maintenanceAlerts.critical} Critical Issues</p>
              <p className="text-xs text-red-400/70">Require immediate attention</p>
            </div>
          </Link>
        )}
        {data?.maintenanceAlerts?.open > 0 && (
          <Link href="/dashboard/maintenance" className="flex items-center gap-3 bg-orange-500/10 border border-orange-500/30 rounded-xl px-4 py-3 hover:bg-orange-500/20 transition">
            <Wrench className="w-5 h-5 text-orange-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-orange-300">{data.maintenanceAlerts.open} Maintenance Open</p>
              <p className="text-xs text-orange-400/70">Pending resolution</p>
            </div>
          </Link>
        )}
        {data?.pendingCerts > 0 && (
          <Link href="/dashboard/certificates" className="flex items-center gap-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-4 py-3 hover:bg-yellow-500/20 transition">
            <FileText className="w-5 h-5 text-yellow-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-yellow-300">{data.pendingCerts} Certificates Pending</p>
              <p className="text-xs text-yellow-400/70">Awaiting approval</p>
            </div>
          </Link>
        )}
      </div>

      {/* Charts — Monthly Burials + Grave Availability (admin + staff) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-slate-300 mb-4">Monthly Burials – Last 12 Months</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data?.monthlyBurials ?? []} barSize={18}>
              <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
              <Bar dataKey="burials" radius={[4, 4, 0, 0]} fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-slate-300 mb-4">Grave Availability</h2>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                </Pie>
                <Legend formatter={v => <span style={{ color: '#94a3b8', fontSize: 11 }}>{v}</span>} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="flex items-center justify-center h-48 text-slate-500 text-sm">No data</div>}
        </div>
      </div>

      {/* Revenue charts — ADMIN ONLY */}
      {isAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-sm font-semibold text-slate-300">Monthly Revenue (PKR)</h2>
              <span className="text-[10px] bg-red-500/15 text-red-400 border border-red-500/30 rounded-full px-1.5 py-0.5 font-semibold">Admin</span>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={data?.monthlyBurials ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }} formatter={(v: any) => [formatCurrency(v), 'Revenue']} />
                <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          {data?.revenueByMethod?.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-sm font-semibold text-slate-300">Revenue by Method</h2>
                <span className="text-[10px] bg-red-500/15 text-red-400 border border-red-500/30 rounded-full px-1.5 py-0.5 font-semibold">Admin</span>
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={data.revenueByMethod} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="amount" nameKey="method">
                    {data.revenueByMethod.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Legend formatter={v => <span style={{ color: '#94a3b8', fontSize: 10 }}>{String(v).replace('_', ' ')}</span>} />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }} formatter={(v: any) => formatCurrency(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Section stats — admin + staff */}
      {data?.sectionStats?.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6">
          <h2 className="text-sm font-semibold text-slate-300 mb-4">Section-wise Availability</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {data.sectionStats.map((s: any) => (
              <div key={s.section} className="bg-slate-800 rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-white">Section {s.section}</p>
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between text-xs"><span className="text-slate-400">Total</span><span className="text-white font-medium">{s.total}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-emerald-400">Available</span><span className="text-emerald-400 font-medium">{s.available}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-slate-400">Occupied</span><span className="text-slate-400 font-medium">{s.occupied}</span></div>
                </div>
                <div className="mt-2 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${s.total ? (s.available / s.total) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent burials */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <h2 className="text-sm font-semibold text-slate-300">Recent Burials</h2>
          <Link href="/dashboard/burials" className="text-emerald-400 hover:text-emerald-300 text-xs font-medium flex items-center gap-1">
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        {!data?.recentBurials?.length ? (
          <div className="py-12 text-center text-slate-500 text-sm">No burials recorded yet</div>
        ) : (
          <div className="divide-y divide-slate-800">
            {data.recentBurials.map((b: any) => (
              <Link key={b.id} href={`/dashboard/burials/${b.id}`} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-800/50 transition">
                <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
                  <Calendar className="w-4 h-4 text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate">{b.deceased?.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{b.grave?.graveNumber} · {formatDate(b.burialDate)} at {b.burialTime}</p>
                </div>
                <BurialBadge status={b.status} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
