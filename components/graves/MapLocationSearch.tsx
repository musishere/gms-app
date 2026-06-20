'use client';
import { useEffect, useRef, useState } from 'react';
import { Search, MapPin, Loader2, X } from 'lucide-react';

export type MapSearchResult = {
  id: string;
  type: 'graveyard' | 'cemetery' | 'place';
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  bookable?: boolean;
};

interface MapLocationSearchProps {
  onSelect: (result: MapSearchResult) => void;
  onGraveyardSelect?: (graveyardId: string) => void;
  onViewGraves?: (graveyardId: string) => void;
  placeholder?: string;
}

export default function MapLocationSearch({ onSelect, onGraveyardSelect, onViewGraves, placeholder }: MapLocationSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MapSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/geocode/search?q=${encodeURIComponent(query)}`, { cache: 'no-store' });
        const d = await r.json();
        setResults(d.results ?? []);
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const pick = (r: MapSearchResult, e?: React.MouseEvent) => {
    e?.stopPropagation();
    onSelect(r);
    if (r.type === 'graveyard') onGraveyardSelect?.(r.id);
    setQuery(r.name);
    setOpen(false);
  };

  const viewGravesOnly = (r: MapSearchResult, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (r.type !== 'graveyard') return;
    onGraveyardSelect?.(r.id);
    onViewGraves?.(r.id);
    onSelect(r);
    setQuery(r.name);
    setOpen(false);
  };

  const pinColor = (type: MapSearchResult['type']) => {
    if (type === 'graveyard') return 'text-emerald-400';
    if (type === 'cemetery') return 'text-amber-400';
    return 'text-blue-400';
  };

  const typeLabel = (r: MapSearchResult) => {
    if (r.type === 'graveyard') return { text: 'Registered · book plots', className: 'text-emerald-400 bg-emerald-500/10' };
    if (r.type === 'cemetery') return { text: 'OSM cemetery · map only', className: 'text-amber-400 bg-amber-500/10' };
    return null;
  };

  return (
    <div ref={ref} className="absolute top-3 left-3 right-3 z-[1000] max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400 animate-spin" />}
        {query && !loading && (
          <button type="button" onClick={() => { setQuery(''); setResults([]); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        )}
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={placeholder ?? 'Search Lahore graveyards, cemeteries, areas…'}
          className="w-full bg-slate-900/95 border border-slate-600 rounded-xl pl-9 pr-9 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 shadow-lg"
        />
      </div>
      {open && results.length > 0 && (
        <div className="mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-xl overflow-hidden max-h-64 overflow-y-auto">
          {results.map(r => {
            const label = typeLabel(r);
            return (
              <div
                key={r.id}
                className="w-full text-left px-4 py-3 hover:bg-slate-800 border-b border-slate-800/50 last:border-0 transition flex gap-3 items-start"
              >
                <button type="button" onClick={e => pick(r, e)} className="flex gap-3 flex-1 min-w-0 text-left">
                  <MapPin className={`w-4 h-4 shrink-0 mt-0.5 ${pinColor(r.type)}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{r.name}</p>
                    <p className="text-xs text-slate-500 truncate">{r.address}</p>
                    {label && (
                      <span className={`inline-block mt-1 text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded ${label.className}`}>
                        {label.text}
                      </span>
                    )}
                  </div>
                </button>
                {r.type === 'graveyard' && (
                  <button
                    type="button"
                    onClick={e => viewGravesOnly(r, e)}
                    className="shrink-0 text-xs font-semibold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-1.5 rounded-lg transition"
                  >
                    View graves
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
