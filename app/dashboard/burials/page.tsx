'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { BurialBadge } from '@/components/ui/Badges';
import { formatDate, formatDateTime } from '@/lib/utils';
import { Calendar, Plus, Search, Loader2, Eye, Clock } from 'lucide-react';

export default function BurialsPage() {
  const { user } = useAuth();
  const [burials, setBurials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [month, setMonth] = useState('');

  useEffect(() => {
    const p = new URLSearchParams();
    if (status) p.set('status', status);
    if (month) p.set('month', month);
    fetch(`/api/burials?${p}`).then(r => r.json()).then(d => setBurials(d.burials ?? [])).finally(() => setLoading(false));
  }, [status, month]);

  const filtered = burials.filter(b =>
    !search ||
    b.deceased?.name?.toLowerCase().includes(search.toLowerCase()) ||
    b.grave?.graveNumber?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Burials</h1>
          <p className="text-slate-400 text-sm mt-1">{burials.length} total records</p>
        </div>
        {['admin', 'staff'].includes(user?.role || '') && (
          <Link href="/dashboard/burials/new" className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition">
            <Plus className="w-4 h-4" /> New Burial
          </Link>
        )}
      </div>

      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or grave…"
            className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition" />
        </div>
        <select value={status} onChange={e => setStatus(e.target.value)} className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-emerald-500">
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <input type="month" value={month} onChange={e => setMonth(e.target.value)}
          className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-emerald-500" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-7 h-7 text-emerald-400 animate-spin" /></div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          {filtered.length === 0 ? (
            <div className="py-16 text-center">
              <Calendar className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">No burials found</p>
              {['admin', 'staff'].includes(user?.role || '') && (
                <Link href="/dashboard/burials/new" className="inline-block mt-4 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold px-4 py-2 rounded-lg transition">Record Burial</Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-left">
                    {['Deceased', 'Grave', 'Burial Date & Time', 'Next of Kin', 'Status', ''].map(h => (
                      <th key={h} className="px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filtered.map(b => (
                    <tr key={b.id} className="hover:bg-slate-800/50 transition">
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-slate-200">{b.deceased?.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{b.deceased?.dateOfDeath ? `d. ${formatDate(b.deceased.dateOfDeath)}` : ''}</p>
                      </td>
                      <td className="px-5 py-3.5 text-slate-300 font-mono">{b.grave?.graveNumber ?? '—'}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          <span>{formatDate(b.burialDate)} {b.burialTime}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-slate-300">{b.deceased?.nextOfKin}<br /><span className="text-xs text-slate-500">{b.deceased?.nextOfKinPhone}</span></td>
                      <td className="px-5 py-3.5"><BurialBadge status={b.status} /></td>
                      <td className="px-5 py-3.5">
                        <Link href={`/dashboard/burials/${b.id}`} className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition inline-flex">
                          <Eye className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
