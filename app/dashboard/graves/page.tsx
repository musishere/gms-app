'use client';
import { useEffect, useState, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { GraveBadge } from '@/components/ui/Badges';
import { formatCurrency } from '@/lib/utils';
import { MapPin, Search, Zap, Loader2, X, Info, BookMarked, RefreshCw, Grid3X3, Map as MapIcon } from 'lucide-react';
import type { MapSearchResult } from '@/components/graves/MapLocationSearch';
import type { Graveyard } from '@/lib/graveyards';

const GraveMap = dynamic(() => import('@/components/graves/GraveMap'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-[500px]"><Loader2 className="w-6 h-6 text-emerald-400 animate-spin" /></div>,
});

type Grave = {
  id: string; graveyardId?: string; graveNumber: string; section: string; row: number; column: number;
  latitude?: number; longitude?: number; status: string; size: string; price: number;
  occupiedBy?: string; notes?: string; reservedUntil?: string;
};

type HeatmapRow = { section: string; total: number; available: number; occupied: number; reserved: number; maintenance: number; utilizationPct: number };

const STATUS_COLOR: Record<string, string> = {
  available: 'bg-emerald-500 hover:bg-emerald-400',
  occupied: 'bg-slate-600 hover:bg-slate-500 cursor-default',
  reserved: 'bg-blue-500 hover:bg-blue-400',
  maintenance: 'bg-orange-500 hover:bg-orange-400',
};

function DetailPanel({ selected, user, onClose, onRelease }: { selected: Grave; user: any; onClose: () => void; onRelease: () => void }) {
  return (
    <div className="w-full lg:w-72 shrink-0 bg-slate-900 border border-slate-800 rounded-2xl p-5 self-start lg:sticky lg:top-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-white text-lg">{selected.graveNumber}</h3>
        <button onClick={onClose} className="text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
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
      {selected.status === 'reserved' && ['admin', 'staff'].includes(user?.role || '') && (
        <button onClick={onRelease} className="mt-4 w-full text-xs text-orange-400 hover:text-orange-300 border border-orange-500/30 rounded-lg py-2 transition">
          Release Reservation
        </button>
      )}
      {(selected.status === 'available' || selected.status === 'reserved') && (
        <div className="mt-5 flex flex-col gap-2">
          {['admin', 'staff'].includes(user?.role || '') && (
            <Link href={`/dashboard/burials/new?graveId=${selected.id}`}
              className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold py-2.5 rounded-xl text-sm transition">
              <MapPin className="w-4 h-4" /> Record Burial
            </Link>
          )}
          {selected.status === 'available' && (
            <Link href={`/dashboard/bookings/new?graveyardId=${selected.graveyardId || 'uol-main'}&graveId=${selected.id}`}
              className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 text-white font-semibold py-2.5 rounded-xl text-sm transition">
              <BookMarked className="w-4 h-4" /> Book Slot
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

export default function GravesPage() {
  const { user } = useAuth();
  const sp = useSearchParams();
  const focusGraveId = sp.get('graveId');
  const initialView = sp.get('view') === 'map' ? 'map' : 'grid';

  const [graves, setGraves] = useState<Grave[]>([]);
  const [allGraves, setAllGraves] = useState<Grave[]>([]);
  const [stats, setStats] = useState<any>({});
  const [heatmap, setHeatmap] = useState<HeatmapRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState('A');
  const [statusFilter, setStatusFilter] = useState('');
  const [sizeFilter, setSizeFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Grave | null>(null);
  const [allocating, setAllocating] = useState(false);
  const [allocResult, setAllocResult] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'map'>(initialView);
  const [graveyards, setGraveyards] = useState<Graveyard[]>([]);
  const [selectedGraveyardId, setSelectedGraveyardId] = useState('uol-main');
  const [flyTo, setFlyTo] = useState<{ lat: number; lng: number; zoom?: number } | null>(null);

  useEffect(() => {
    fetch('/api/graveyards').then(r => r.json()).then(d => setGraveyards(d.graveyards ?? []));
  }, []);

  const fetchGraves = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const params = new URLSearchParams({ includeHeatmap: 'true', graveyardId: selectedGraveyardId });
    if (section && viewMode === 'grid') params.set('section', section);
    if (statusFilter) params.set('status', statusFilter);
    if (sizeFilter) params.set('size', sizeFilter);
    const r = await fetch(`/api/graves?${params}`);
    const d = await r.json();
    setGraves(d.graves ?? []);
    setStats(d.stats ?? {});
    setHeatmap(d.heatmap ?? []);
    if (!silent) setLoading(false);

    const allR = await fetch(`/api/graves?graveyardId=${selectedGraveyardId}`);
    const allD = await allR.json();
    setAllGraves(allD.graves ?? []);
    if (focusGraveId) {
      const g = (allD.graves ?? []).find((gr: Grave) => gr.id === focusGraveId);
      if (g) {
        setSelected(g);
        setSection(g.section);
        if (g.graveyardId) setSelectedGraveyardId(g.graveyardId);
      }
    }
  }, [section, statusFilter, sizeFilter, viewMode, focusGraveId, selectedGraveyardId]);

  useEffect(() => { fetchGraves(); }, [fetchGraves]);
  useEffect(() => {
    const id = setInterval(() => fetchGraves(true), 30000);
    return () => clearInterval(id);
  }, [fetchGraves]);

  const sections = ['A', 'B', 'C', 'D', 'VIP'];

  const filtered = useMemo(() => {
    if (!search) return graves;
    return graves.filter(g => g.graveNumber.toLowerCase().includes(search.toLowerCase()) || (g.occupiedBy ?? '').toLowerCase().includes(search.toLowerCase()));
  }, [graves, search]);

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
    const r = await fetch('/api/graves/allocate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ size: sizeFilter || 'standard', section: section || undefined, reserve: true }),
    });
    const d = await r.json();
    setAllocResult(d);
    if (d.grave) { setSelected(d.grave); fetchGraves(true); }
    setAllocating(false);
  };

  const releaseReservation = async (graveId: string) => {
    await fetch('/api/graves/allocate/release', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ graveId }),
    });
    setSelected(null);
    fetchGraves();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Grave Map (GIS)</h1>
          <p className="text-slate-400 text-sm mt-1">Interactive grave availability and allocation</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-900 border border-slate-700 rounded-xl p-1">
            <button onClick={() => setViewMode('grid')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${viewMode === 'grid' ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-white'}`}>
              <Grid3X3 className="w-3.5 h-3.5" /> Grid
            </button>
            <button onClick={() => setViewMode('map')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${viewMode === 'map' ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-white'}`}>
              <MapIcon className="w-3.5 h-3.5" /> Map
            </button>
          </div>
          <button onClick={() => fetchGraves()} className="p-2.5 rounded-xl border border-slate-700 text-slate-400 hover:text-white transition" title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </button>
          {['admin', 'staff'].includes(user?.role || '') && (
            <button onClick={autoAllocate} disabled={allocating} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition">
              {allocating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />} Auto-Allocate
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        {[
          { label: 'Total', value: stats.total, color: 'text-slate-300' },
          { label: 'Available', value: stats.available, color: 'text-emerald-400' },
          { label: 'Occupied', value: stats.occupied, color: 'text-slate-400' },
          { label: 'Reserved', value: stats.reserved, color: 'text-blue-400' },
          { label: 'Maintenance', value: stats.maintenance, color: 'text-orange-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
            <p className={`text-2xl font-bold ${color}`}>{value ?? 0}</p>
            <p className="text-xs text-slate-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {heatmap.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-6">
          <p className="text-xs font-medium text-slate-400 mb-3 uppercase tracking-wide">Section Utilization</p>
          <div className="space-y-2">
            {heatmap.map(h => (
              <div key={h.section} className="flex items-center gap-3">
                <span className="text-xs text-slate-400 w-8 font-mono">{h.section}</span>
                <div className="flex-1 h-4 bg-slate-800 rounded-full overflow-hidden flex">
                  {h.occupied > 0 && <div className="bg-slate-600 h-full" style={{ width: `${(h.occupied / h.total) * 100}%` }} title={`Occupied: ${h.occupied}`} />}
                  {h.reserved > 0 && <div className="bg-blue-500 h-full" style={{ width: `${(h.reserved / h.total) * 100}%` }} title={`Reserved: ${h.reserved}`} />}
                  {h.maintenance > 0 && <div className="bg-orange-500 h-full" style={{ width: `${(h.maintenance / h.total) * 100}%` }} title={`Maintenance: ${h.maintenance}`} />}
                  {h.available > 0 && <div className="bg-emerald-500 h-full" style={{ width: `${(h.available / h.total) * 100}%` }} title={`Available: ${h.available}`} />}
                </div>
                <span className="text-xs text-slate-500 w-10 text-right">{h.utilizationPct}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Graveyard selector */}
      <div className="mb-4">
        <p className="text-xs font-medium text-slate-400 mb-2 uppercase tracking-wide">Lahore Graveyard</p>
        <div className="flex gap-2 flex-wrap">
          {graveyards.map(gy => (
            <button
              key={gy.id}
              type="button"
              onClick={() => {
                setSelectedGraveyardId(gy.id);
                setSelected(null);
                setFlyTo({ lat: gy.latitude, lng: gy.longitude, zoom: 16 });
                if (viewMode !== 'map') setViewMode('map');
              }}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition border ${
                selectedGraveyardId === gy.id
                  ? 'bg-emerald-500 border-emerald-400 text-white'
                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white hover:border-slate-600'
              }`}
            >
              {gy.name}
              {(gy as any).stats?.available != null && (
                <span className="ml-1.5 opacity-70">({(gy as any).stats.available} free)</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {allocResult && (
        <div className={`mb-4 flex items-center gap-3 px-4 py-3 rounded-xl border text-sm ${allocResult.grave ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
          <Info className="w-4 h-4 shrink-0" />
          {allocResult.message || allocResult.error}
          <button onClick={() => setAllocResult(null)} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

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

      <div className="flex flex-col lg:flex-row gap-6">
        {viewMode === 'map' ? (
          <div className="flex-1">
            <GraveMap
              graves={allGraves}
              graveyards={graveyards}
              selectedGraveyardId={selectedGraveyardId}
              section={section}
              selectedId={selected?.id}
              focusGraveId={focusGraveId}
              flyTo={flyTo}
              onSelect={g => setSelected(g as Grave)}
              onGraveyardSelect={id => {
                setSelectedGraveyardId(id);
                setSelected(null);
                const gy = graveyards.find(g => g.id === id);
                if (gy) setFlyTo({ lat: gy.latitude, lng: gy.longitude, zoom: 16 });
              }}
              onViewGraves={id => {
                setSelectedGraveyardId(id);
                setSelected(null);
                setViewMode('map');
                const gy = graveyards.find(g => g.id === id);
                if (gy) setFlyTo({ lat: gy.latitude, lng: gy.longitude, zoom: 16 });
              }}
              onSearchSelect={(r: MapSearchResult) => setFlyTo({
                lat: r.latitude,
                lng: r.longitude,
                zoom: r.type === 'graveyard' ? 16 : r.type === 'cemetery' ? 17 : 15,
              })}
            />
          </div>
        ) : (
          <div className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl p-5 overflow-auto scrollbar-thin">
            <div className="flex items-center gap-4 mb-4 flex-wrap">
              {Object.entries(STATUS_COLOR).map(([s, c]) => (
                <div key={s} className="flex items-center gap-1.5 text-xs text-slate-400">
                  <div className={`w-3 h-3 rounded-sm ${c.split(' ')[0]}`} /> <span className="capitalize">{s}</span>
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
        )}

        {selected && (
          <DetailPanel
            selected={selected}
            user={user}
            onClose={() => setSelected(null)}
            onRelease={() => releaseReservation(selected.id)}
          />
        )}
      </div>
    </div>
  );
}
