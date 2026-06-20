'use client';
import { useEffect, useState } from 'react';
import { formatCurrency } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  LineChart, Line, Legend, PieChart, Pie, Cell,
} from 'recharts';
import { BarChart3, Download, Loader2, TrendingUp, Calendar, CreditCard, MapPin } from 'lucide-react';

export default function ReportsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard').then(r => r.json()).then(setData).finally(() => setLoading(false));
  }, []);

  const exportCSV = () => {
    if (!data?.monthlyBurials) return;
    const rows = [
      ['Month', 'Burials', 'Revenue (PKR)'],
      ...data.monthlyBurials.map((m: any) => [m.month, m.burials, m.revenue]),
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'GMS_Monthly_Report.csv'; a.click();
  };

  const exportPDF = async () => {
    if (!data) return;
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    const W = doc.internal.pageSize.getWidth();
    const M = 20;

    doc.setFillColor(16, 185, 129);
    doc.rect(0, 0, W, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16); doc.setFont('helvetica', 'bold');
    doc.text('Graveyard Management System', M, 14);
    doc.setFontSize(10); doc.setFont('helvetica', 'normal');
    doc.text('Monthly Burial & Revenue Report', M, 23);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, W - M, 23, { align: 'right' });

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(14); doc.setFont('helvetica', 'bold');
    doc.text('Summary Statistics', M, 50);

    const summaryData = [
      ['Total Graves', data.graveStats?.total ?? 0],
      ['Available Graves', data.graveStats?.available ?? 0],
      ['Occupied Graves', data.graveStats?.occupied ?? 0],
      ['Total Burials', data.totalBurials ?? 0],
      ['Revenue Collected', `PKR ${(data.totalRevenue ?? 0).toLocaleString()}`],
      ['Pending Revenue', `PKR ${(data.pendingRevenue ?? 0).toLocaleString()}`],
    ];
    doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(71, 85, 105);
    summaryData.forEach(([k, v], i) => {
      const x = i % 2 === 0 ? M : W / 2;
      const y = 60 + Math.floor(i / 2) * 10;
      doc.text(`${k}: ${v}`, x, y);
    });

    doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.setTextColor(15, 23, 42);
    doc.text('Monthly Breakdown', M, 100);
    const headers = ['Month', 'Burials', 'Revenue (PKR)'];
    const colW = (W - 2 * M) / headers.length;
    doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
    doc.setFillColor(16, 185, 129);
    doc.rect(M, 104, W - 2 * M, 8, 'F');
    headers.forEach((h, i) => doc.text(h, M + i * colW + 3, 110));

    doc.setFont('helvetica', 'normal'); doc.setTextColor(15, 23, 42);
    data.monthlyBurials?.forEach((m: any, i: number) => {
      const y = 118 + i * 8;
      if (i % 2 === 0) { doc.setFillColor(248, 250, 252); doc.rect(M, y - 4, W - 2 * M, 8, 'F'); }
      doc.text(m.month, M + 3, y);
      doc.text(String(m.burials), M + colW + 3, y);
      doc.text(`PKR ${m.revenue.toLocaleString()}`, M + 2 * colW + 3, y);
    });

    doc.save('GMS_Monthly_Report.pdf');
  };

  const PIE = ['#10b981', '#64748b', '#3b82f6', '#f97316'];

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 text-emerald-400 animate-spin" /></div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Reports & Analytics</h1>
          <p className="text-slate-400 text-sm mt-1">Monthly burial status and revenue generation</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="flex items-center gap-2 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 px-4 py-2.5 rounded-xl text-sm font-medium transition">
            <Download className="w-4 h-4" /> CSV
          </button>
          <button onClick={exportPDF} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition">
            <Download className="w-4 h-4" /> PDF Report
          </button>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Burials', value: data?.totalBurials ?? 0, icon: Calendar, color: 'text-violet-400', bg: 'bg-violet-500/10' },
          { label: 'Revenue Collected', value: formatCurrency(data?.totalRevenue ?? 0), icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Pending Revenue', value: formatCurrency(data?.pendingRevenue ?? 0), icon: CreditCard, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
          { label: 'Available Graves', value: data?.graveStats?.available ?? 0, icon: MapPin, color: 'text-blue-400', bg: 'bg-blue-500/10' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-400 uppercase tracking-wide">{label}</p>
              <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center`}><Icon className={`w-4 h-4 ${color}`} /></div>
            </div>
            <p className="text-xl font-bold text-white">{value}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        {data?.revenueByMethod?.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-slate-300 mb-4">Revenue by Payment Method</h2>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={data.revenueByMethod} cx="50%" cy="50%" outerRadius={80} paddingAngle={3} dataKey="amount" nameKey="method">
                  {data.revenueByMethod.map((_: any, i: number) => <Cell key={i} fill={PIE[i % PIE.length]} />)}
                </Pie>
                <Legend formatter={v => <span style={{ color: '#94a3b8', fontSize: 12 }}>{String(v).replace('_', ' ')}</span>} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }} formatter={(v: any) => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
        {data?.burialsBySection?.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-slate-300 mb-4">Burials by Section</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.burialsBySection} barSize={24}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="section" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Burials" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-slate-300 mb-4">Monthly Burials</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data?.monthlyBurials ?? []} barSize={16}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
              <Bar dataKey="burials" fill="#10b981" radius={[4, 4, 0, 0]} name="Burials" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-slate-300 mb-4">Monthly Revenue (PKR)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data?.monthlyBurials ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }} formatter={(v: any) => [formatCurrency(v), 'Revenue']} />
              <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2.5} dot={{ fill: '#10b981', r: 3 }} name="Revenue" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Grave distribution pie */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-slate-300 mb-4">Grave Status Distribution</h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={[
                { name: 'Available', value: data?.graveStats?.available ?? 0 },
                { name: 'Occupied', value: data?.graveStats?.occupied ?? 0 },
                { name: 'Reserved', value: data?.graveStats?.reserved ?? 0 },
                { name: 'Maintenance', value: data?.graveStats?.maintenance ?? 0 },
              ].filter(d => d.value > 0)} cx="50%" cy="50%" outerRadius={80} paddingAngle={3} dataKey="value">
                {[0, 1, 2, 3].map(i => <Cell key={i} fill={PIE[i]} />)}
              </Pie>
              <Legend formatter={v => <span style={{ color: '#94a3b8', fontSize: 12 }}>{v}</span>} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly table */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800">
            <h2 className="text-sm font-semibold text-slate-300">Monthly Burial Status</h2>
          </div>
          <div className="overflow-y-auto max-h-60 scrollbar-thin">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-900">
                <tr className="border-b border-slate-800">
                  {['Month', 'Burials', 'Revenue'].map(h => (
                    <th key={h} className="px-4 py-2 text-xs text-slate-400 font-semibold text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {[...(data?.monthlyBurials ?? [])].reverse().map((m: any) => (
                  <tr key={m.key} className="hover:bg-slate-800/40 transition">
                    <td className="px-4 py-2.5 text-slate-300">{m.month}</td>
                    <td className="px-4 py-2.5 text-slate-200 font-medium">{m.burials}</td>
                    <td className="px-4 py-2.5 text-emerald-400 font-medium">{formatCurrency(m.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
