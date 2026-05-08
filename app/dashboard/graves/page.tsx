'use client';
import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { GraveBadge } from '@/components/ui/Badges';
import { formatCurrency } from '@/lib/utils';
import { MapPin, Search, Filter, Zap, Loader2, X, Info } from 'lucide-react';

type Grave = {
  id: string; graveNumber: string; section: string; row: number; column: number;
  latitude?: number; longitude?: number; status: string; size: string; price: number;
  occupiedBy?: string; notes?: string;
};

const STATUS_COLOR: Record<string, string> = {
  available: 'bg-emerald-500 hover:bg-emerald-400',
  occupied: 'bg-slate-600 hover:bg-slate-500 cursor-default',
  reserved: 'bg-blue-500 hover:bg-blue-400',
  maintenance: 'bg-orange-500 hover:bg-orange-400',
};

export default function GravesPage() {
  const { user } = useAuth();
  const [graves, setGraves] = useState<Grave[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState('A');
  const [statusFilter, setStatusFilter] = useState('');
  const [sizeFilter, setSizeFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Grave | null>(null);
  const [allocating, setAllocating] = useState(false);
  const [allocResult, setAllocResult] = useState<any>(null);

  const fetchGraves = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (section) params.set('section', section);
    if (statusFilter) params.set('status', statusFilter);
    if (sizeFilter) params.set('size', sizeFilter);
    const r = await fetch(`/api/graves?${params}`);
    const d = await r.json();
    setGraves(d.graves ?? []);
    setStats(d.stats ?? {});
    setLoading(false);
  };

  useEffect(() => { fetchGraves(); }, [section, statusFilter, sizeFilter]);

  const sections = ['A', 'B', 'C', 'D', 'VIP'];

  const filtered = useMemo(() => {
    if (!search) return graves;
    return graves.filter(g => g.graveNumber.toLowerCase().includes(search.toLowerCase()) || (g.occupiedBy ?? '').toLowerCase().includes(search.toLowerCase()));
  }, [graves, search]);

  // Build grid for current section
  const rows = useMemo(() => {
    const map: Record<number, Grave[]> = {};
    filtered.forEach(g => {
      if (!map[g.row]) map[g.row] = [];
      map[g.row].push(g);
    });
    return Object.entries(map).sort((a, b) => Number(a[0]) - Number(b[0])).map(([row, gs]) => ({ row: Number(row), graves: gs.sort((a, b) => a.column - b.column) }));
  }, [filtered]);

  const autoAllocate = async () => {
    setAllocating(true); setAllocResult(null);
    const r = await fetch('/api/graves/allocate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ size: sizeFilter || 'standard', section: section || undefined }) });
    const d = await r.json();
    setAllocResult(d);
    if (d.grave) setSelected(d.grave);
    setAllocating(false);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Grave Availability Map</h1>
          <p className="text-slate-400 text-sm mt-1">GIS-enabled interactive grave allocation</p>
        </div>
        {['admin', 'staff'].includes(user?.role || '') && (
          <button onClick={autoAllocate} disabled={allocating} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition">
            {allocating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />} Auto-Allocate
          </button>
        )}
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total', value: stats.total, color: 'text-slate-300' },
          { label: 'Available', value: stats.available, color: 'text-emerald-400' },
          { label: 'Occupied', value: stats.occupied, color: 'text-slate-400' },
          { label: 'Maintenance', value: stats.maintenance, color: 'text-orange-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
            <p className={`text-2xl font-bold ${color}`}>{value ?? 0}</p>
            <p className="text-xs text-slate-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {allocResult && (
        <div className={`mb-4 flex items-center gap-3 px-4 py-3 rounded-xl border text-sm ${allocResult.grave ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
          <Info className="w-4 h-4 shrink-0" />
          {allocResult.message || allocResult.error}
          <button onClick={() => setAllocResult(null)} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap gap-3 mb-4">
        {sections.map(s => (
          <button key={s} onClick={() => setSection(s)} className={`px-4 py-2 rounded-xl text-sm font-medium transition ${section === s ? 'bg-emerald-500 text-white' : 'bg-slate-900 border border-slate-700 text-slate-400 hover:text-white'}`}>
            Section {s}
          </button>
        ))}
        <div className="relative ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search grave…"
            className="bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition w-48" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-emerald-500">
          <option value="">All Status</option>
          <option value="available">Available</option>
          <option value="occupied">Occupied</option>
          <option value="reserved">Reserved</option>
          <option value="maintenance">Maintenance</option>
        </select>
        <select value={sizeFilter} onChange={e => setSizeFilter(e.target.value)} className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-emerald-500">
          <option value="">All Sizes</option>
          <option value="standard">Standard</option>
          <option value="child">Child</option>
          <option value="double">Double</option>
          <option value="vip">VIP</option>
        </select>
      </div>

      <div className="flex gap-6">
        {/* Grid map */}
        <div className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl p-5 overflow-auto scrollbar-thin">
          <div className="flex items-center gap-4 mb-4 flex-wrap">
            {[['available', 'bg-emerald-500'], ['occupied', 'bg-slate-600'], ['reserved', 'bg-blue-500'], ['maintenance', 'bg-orange-500']].map(([s, c]) => (
              <div key={s} className="flex items-center gap-1.5 text-xs text-slate-400">
                <div className={`w-3 h-3 rounded-sm ${c}`} /> <span className="capitalize">{s}</span>
              </div>
            ))}
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 text-emerald-400 animate-spin" /></div>
          ) : rows.length === 0 ? (
            <div className="text-center py-20 text-slate-500 text-sm">No graves found</div>
          ) : (
            <div className="space-y-1.5">
              {rows.map(({ row, graves: rg }) => (
                <div key={row} className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-600 w-6 text-right shrink-0">R{row}</span>
                  <div className="flex gap-1.5 flex-wrap">
                    {rg.map(g => (
                      <button key={g.id} onClick={() => setSelected(g === selected ? null : g)}
                        title={`${g.graveNumber} – ${g.status}${g.occupiedBy ? ` (${g.occupiedBy})` : ''}`}
                        className={`w-8 h-8 rounded text-xs font-medium transition border-2 ${STATUS_COLOR[g.status] ?? 'bg-slate-700'} ${selected?.id === g.id ? 'border-white scale-110 shadow-lg' : 'border-transparent'}`}>
                        {g.column}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="w-72 shrink-0 bg-slate-900 border border-slate-800 rounded-2xl p-5 self-start sticky top-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white text-lg">{selected.graveNumber}</h3>
              <button onClick={() => setSelected(null)} className="text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <GraveBadge status={selected.status as any} />
            <div className="mt-4 space-y-3 text-sm">
              {[
                ['Section', selected.section],
                ['Row', selected.row],
                ['Column', selected.column],
                ['Size', selected.size],
                ['Burial Fee', formatCurrency(selected.price)],
                selected.occupiedBy ? ['Occupied By', selected.occupiedBy] : null,
                selected.latitude ? ['GPS', `${selected.latitude?.toFixed(4)}, ${selected.longitude?.toFixed(4)}`] : null,
              ].filter(Boolean).map(([k, v]: any) => (
                <div key={k} className="flex justify-between">
                  <span className="text-slate-500">{k}</span>
                  <span className="text-slate-200 font-medium text-right ml-2">{v}</span>
                </div>
              ))}
            </div>
            {selected.status === 'available' && ['admin', 'staff'].includes(user?.role || '') && (
              <Link href={`/dashboard/burials/new?graveId=${selected.id}`}
                className="mt-5 w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold py-2.5 rounded-xl text-sm transition">
                <MapPin className="w-4 h-4" /> Book This Grave
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
