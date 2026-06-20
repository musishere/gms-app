'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';
import { Search, Loader2, User, ArrowRight } from 'lucide-react';

export default function DeceasedRegistryPage() {
  const [burials, setBurials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setQuery(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (query) params.set('search', query);
    fetch(`/api/burials?${params}`)
      .then(r => r.json())
      .then(d => setBurials(d.burials ?? []))
      .finally(() => setLoading(false));
  }, [query]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Deceased Registry</h1>
        <p className="text-slate-400 text-sm mt-1">Search and browse all deceased person records</p>
      </div>

      <div className="relative mb-6 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or CNIC…"
          className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
        />
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
          </div>
        ) : burials.length === 0 ? (
          <div className="text-center py-20">
            <User className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">No records found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-left">
                  <th className="px-5 py-3 text-xs font-medium text-slate-500 uppercase">Name</th>
                  <th className="px-5 py-3 text-xs font-medium text-slate-500 uppercase">CNIC</th>
                  <th className="px-5 py-3 text-xs font-medium text-slate-500 uppercase">Date of Death</th>
                  <th className="px-5 py-3 text-xs font-medium text-slate-500 uppercase">Burial Date</th>
                  <th className="px-5 py-3 text-xs font-medium text-slate-500 uppercase">Grave</th>
                  <th className="px-5 py-3 text-xs font-medium text-slate-500 uppercase">Next of Kin</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {burials.map(b => (
                  <tr key={b.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition">
                    <td className="px-5 py-3.5 font-medium text-white">{b.deceased?.name}</td>
                    <td className="px-5 py-3.5 text-slate-400 font-mono text-xs">{b.deceased?.cnic || '—'}</td>
                    <td className="px-5 py-3.5 text-slate-300">{b.deceased?.dateOfDeath ? formatDate(b.deceased.dateOfDeath) : '—'}</td>
                    <td className="px-5 py-3.5 text-slate-300">{formatDate(b.burialDate)} {b.burialTime}</td>
                    <td className="px-5 py-3.5 font-mono text-emerald-400 text-xs">{b.grave?.graveNumber || '—'}</td>
                    <td className="px-5 py-3.5 text-slate-400">{b.deceased?.nextOfKin}</td>
                    <td className="px-5 py-3.5">
                      <Link href={`/dashboard/burials/${b.id}`} className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300">
                        View <ArrowRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
