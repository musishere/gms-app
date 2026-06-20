'use client';
import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { formatCurrency } from '@/lib/utils';
import {
  BookMarked, MapPin, ChevronRight, CheckCircle2,
  Loader2, AlertCircle, ArrowLeft, Building2, Map,
} from 'lucide-react';
import Link from 'next/link';
import { PAKISTAN_CITIES, GRAVEYARDS, getGraveyardsByCity } from '@/lib/graveyards';
import type { City, Graveyard } from '@/lib/graveyards';
import type { GraveyardWithStats } from '@/components/graves/BookingFlowMap';

const BookingFlowMap = dynamic(() => import('@/components/graves/BookingFlowMap'), {
  ssr: false,
  loading: () => (
    <div className="h-80 flex items-center justify-center bg-slate-900 border border-slate-700 rounded-xl">
      <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
    </div>
  ),
});

interface Grave {
  id: string;
  graveyardId?: string;
  graveNumber: string;
  section: string;
  size: string;
  price: number;
  status: string;
  row: number;
  column: number;
}

const SECTIONS = ['A', 'B', 'C', 'D', 'VIP'];
const SIZES = ['standard', 'child', 'double', 'vip'];
const TIMES = ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00'];

const STATUS_COLOR: Record<string, string> = {
  available:   'border-emerald-700 bg-emerald-500/10 cursor-pointer hover:border-emerald-400 hover:bg-emerald-500/20',
  occupied:    'border-slate-700 bg-slate-800/40 opacity-40 cursor-not-allowed',
  reserved:    'border-blue-800 bg-blue-500/10 opacity-50 cursor-not-allowed',
  maintenance: 'border-orange-800 bg-orange-500/10 opacity-40 cursor-not-allowed',
};

const PAKISTAN_VIEW = { lat: 30.3753, lng: 69.3451, zoom: 5 };

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1.5">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = 'w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition';

const STEP_LABELS = ['Select City', 'Select Area', 'Select Slot', 'Booking Details'];

export default function NewBookingPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const preGraveId = sp.get('graveId');
  const preGraveyardId = sp.get('graveyardId') || 'uol-main';

  // Resolve initial city from URL params so we avoid sync setState in effects
  const _preGy = preGraveId ? GRAVEYARDS.find(g => g.id === preGraveyardId) : null;
  const _preCity = _preGy ? (PAKISTAN_CITIES.find(c => c.id === _preGy.cityId) ?? null) : null;

  // ── Step ───────────────────────────────────────────────────────────────────
  const [step, setStep] = useState<0 | 1 | 2 | 3>(preGraveId ? 3 : 0);

  // ── City selection ─────────────────────────────────────────────────────────
  const [selectedCity, setSelectedCity] = useState<City | null>(_preCity);
  const [flyTarget, setFlyTarget] = useState(PAKISTAN_VIEW);
  const hoverTimer = useRef<NodeJS.Timeout | null>(null);

  // ── Graveyard / area selection ─────────────────────────────────────────────
  const [graveyardsWithStats, setGraveyardsWithStats] = useState<GraveyardWithStats[]>([]);
  const [selectedGraveyardId, setSelectedGraveyardId] = useState(preGraveyardId);

  // ── Grave grid (step 2) ────────────────────────────────────────────────────
  const [graves, setGraves] = useState<Grave[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [activeSection, setActiveSection] = useState('A');
  const [sizeFilter, setSizeFilter] = useState('');
  const [totalInSection, setTotalInSection] = useState<number | null>(null);
  const [dbTotal, setDbTotal] = useState<number | null>(null);
  const [selectedGrave, setSelectedGrave] = useState<Grave | null>(null);

  // ── Booking details (step 3) ───────────────────────────────────────────────
  const [form, setForm] = useState({
    slotDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    slotTime: '10:00',
    deceasedName: '',
    contactName: '',
    contactPhone: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const h = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  // ── Fetch all graveyards with availability stats ───────────────────────────
  useEffect(() => {
    fetch('/api/graveyards')
      .then(r => r.json())
      .then(d => setGraveyardsWithStats(d.graveyards ?? []));
  }, []);

  // ── If pre-filled from grave map, fetch the specific grave async ─────────
  useEffect(() => {
    if (!preGraveId) return;
    fetch(`/api/graves?graveyardId=${preGraveyardId}`)
      .then(r => r.json())
      .then(d => {
        const found = (d.graves ?? []).find((g: Grave) => g.id === preGraveId);
        if (found?.status === 'available') setSelectedGrave(found);
      });
  }, [preGraveId, preGraveyardId]);

  // ── Fetch graves when entering step 2 ────────────────────────────────────
  useEffect(() => {
    if (step < 2) return;
    setLoading(true);
    setFetchError('');
    fetch(`/api/graves?graveyardId=${selectedGraveyardId}&section=${activeSection}`)
      .then(async r => {
        const d = await r.json();
        if (!r.ok) { setFetchError(d.error ?? `Error ${r.status}`); setGraves([]); return; }
        const g: Grave[] = d.graves ?? [];
        setGraves(g);
        setTotalInSection(g.length);
        if (d.stats?.total !== undefined) setDbTotal(d.stats.total);
        if (preGraveId && !selectedGrave) {
          const found = g.find(x => x.id === preGraveId);
          if (found?.status === 'available') setSelectedGrave(found);
        }
      })
      .catch(() => setFetchError('Network error — check your connection'))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection, selectedGraveyardId, step]);

  // ── Derived: cities with graveyard counts ──────────────────────────────────
  const citiesWithCount = useMemo(() =>
    PAKISTAN_CITIES.map(city => ({
      ...city,
      graveyardCount: GRAVEYARDS.filter(g => g.cityId === city.id).length,
    })),
  []);

  // ── Derived: graveyards for selected city (with stats merged) ──────────────
  const cityGraveyards = useMemo(() => {
    if (!selectedCity) return [];
    const local = getGraveyardsByCity(selectedCity.id);
    return local.map(gy => {
      const withStats = graveyardsWithStats.find(g => g.id === gy.id);
      return withStats ?? gy;
    });
  }, [selectedCity, graveyardsWithStats]);

  const filtered = useMemo(() =>
    graves.filter(g => !sizeFilter || g.size === sizeFilter),
  [graves, sizeFilter]);

  const availableCount = filtered.filter(g => g.status === 'available').length;

  const rows = useMemo(() => {
    const map: Record<number, Grave[]> = {};
    filtered.forEach(g => {
      if (!map[g.row]) map[g.row] = [];
      map[g.row].push(g);
    });
    return Object.entries(map)
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([row, gs]) => ({ row: Number(row), graves: gs.sort((a, b) => a.column - b.column) }));
  }, [filtered]);

  // ── City hover preview ─────────────────────────────────────────────────────
  const previewCity = useCallback((city: City) => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => {
      setFlyTarget({ lat: city.latitude, lng: city.longitude, zoom: 11 });
    }, 280);
  }, []);

  const cancelPreview = useCallback(() => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
  }, []);

  const selectCity = useCallback((cityId: string) => {
    cancelPreview();
    const city = PAKISTAN_CITIES.find(c => c.id === cityId);
    if (!city) return;
    setSelectedCity(city);
    setFlyTarget({ lat: city.latitude, lng: city.longitude, zoom: 11 });
  }, [cancelPreview]);

  // ── Graveyard hover preview ────────────────────────────────────────────────
  const previewGraveyard = useCallback((gy: Graveyard) => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => {
      setFlyTarget({ lat: gy.latitude, lng: gy.longitude, zoom: 15 });
    }, 280);
  }, []);

  const selectGraveyard = useCallback((id: string) => {
    cancelPreview();
    setSelectedGraveyardId(id);
    const gy = cityGraveyards.find(g => g.id === id);
    if (gy) setFlyTarget({ lat: gy.latitude, lng: gy.longitude, zoom: 15 });
  }, [cancelPreview, cityGraveyards]);

  const selectedGraveyard = graveyardsWithStats.find(g => g.id === selectedGraveyardId)
    ?? cityGraveyards.find(g => g.id === selectedGraveyardId);

  // ── Submit booking ─────────────────────────────────────────────────────────
  const submit = async () => {
    if (!selectedGrave) return;
    setSubmitting(true);
    setError('');
    try {
      const r = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ graveId: selectedGrave.id, graveyardId: selectedGraveyardId, ...form }),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.error ?? 'Something went wrong'); return; }
      setDone(true);
      setTimeout(() => router.push('/dashboard/bookings'), 1800);
    } catch { setError('Network error'); }
    finally { setSubmitting(false); }
  };

  // ── Success screen ─────────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-3">
          <CheckCircle2 className="w-14 h-14 text-emerald-400 mx-auto" />
          <p className="text-lg font-semibold text-white">Booking submitted!</p>
          <p className="text-sm text-slate-400">Waiting for staff approval. Redirecting…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/bookings" className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <BookMarked className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">New Grave Booking</h1>
            <p className="text-sm text-slate-400">Reserve a slot for a future burial</p>
          </div>
        </div>
      </div>

      {/* ── Stepper ────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 flex-wrap">
        {STEP_LABELS.map((label, i) => (
          <div key={i} className="flex items-center gap-1">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border transition ${
              step > i ? 'bg-emerald-500 border-emerald-400 text-white'
              : step === i ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
              : 'bg-slate-800 border-slate-700 text-slate-500'
            }`}>
              {step > i ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
            </div>
            <span className={`text-xs font-medium ${step >= i ? 'text-white' : 'text-slate-500'}`}>{label}</span>
            {i < STEP_LABELS.length - 1 && <ChevronRight className="w-3.5 h-3.5 text-slate-600 mx-0.5" />}
          </div>
        ))}
      </div>

      {/* ══ STEPS 0 & 1 — share a single persistent map so Leaflet never reinits ══ */}
      {step < 2 && (
        <div className="space-y-4">
          {/* Context header changes per step but the map below stays mounted */}
          {step === 0 ? (
            <p className="text-sm text-slate-400">
              Hover a city card to preview it on the map, then click to select.
            </p>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-400">
                Graveyards in{' '}
                <span className="text-white font-semibold">{selectedCity?.name}</span>{' '}
                — hover a card or click a marker.
              </p>
              <button
                type="button"
                onClick={() => { setStep(0); setFlyTarget(PAKISTAN_VIEW); }}
                className="text-xs text-slate-500 hover:text-emerald-400 transition"
              >
                ← Change city
              </button>
            </div>
          )}

          {/* Single BookingFlowMap — mode & data change via props, never unmounts */}
          <BookingFlowMap
            mode={step === 0 ? 'cities' : 'graveyards'}
            cities={step === 0 ? citiesWithCount : []}
            graveyards={step === 1 ? (cityGraveyards as GraveyardWithStats[]) : []}
            flyTarget={flyTarget}
            selectedCityId={selectedCity?.id}
            selectedGraveyardId={step === 1 ? selectedGraveyardId : undefined}
            onCitySelect={step === 0 ? selectCity : undefined}
            onGraveyardSelect={step === 1 ? selectGraveyard : undefined}
            height="h-80"
          />

          {/* ── Step 0 cards ── */}
          {step === 0 && (
            <>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {citiesWithCount.map(city => (
                  <button
                    key={city.id}
                    type="button"
                    onClick={() => selectCity(city.id)}
                    onMouseEnter={() => previewCity(city)}
                    onMouseLeave={cancelPreview}
                    className={`text-left p-4 rounded-xl border transition ${
                      selectedCity?.id === city.id
                        ? 'bg-emerald-500/10 border-emerald-500/40 ring-1 ring-emerald-500/30'
                        : 'bg-slate-900 border-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-white text-sm">{city.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{city.province} Province</p>
                      </div>
                      <span className={`shrink-0 text-[10px] font-bold px-2 py-1 rounded-full border ${
                        selectedCity?.id === city.id
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}>
                        {city.graveyardCount} site{city.graveyardCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                    {selectedCity?.id === city.id && (
                      <div className="mt-2 flex items-center gap-1.5 text-emerald-400 text-xs font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Selected
                      </div>
                    )}
                  </button>
                ))}
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => { if (selectedCity) { setStep(1); } }}
                  disabled={!selectedCity}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition"
                >
                  Continue to Area Selection <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </>
          )}

          {/* ── Step 1 cards ── */}
          {step === 1 && (
            <>
              <div className="grid sm:grid-cols-2 gap-3">
                {cityGraveyards.map(gy => {
                  const stats = (gy as GraveyardWithStats).stats;
                  const isSelected = selectedGraveyardId === gy.id;
                  return (
                    <button
                      key={gy.id}
                      type="button"
                      onClick={() => selectGraveyard(gy.id)}
                      onMouseEnter={() => previewGraveyard(gy)}
                      onMouseLeave={cancelPreview}
                      className={`text-left p-4 rounded-xl border transition ${
                        isSelected
                          ? 'bg-emerald-500/10 border-emerald-500/40 ring-1 ring-emerald-500/30'
                          : 'bg-slate-900 border-slate-800 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-white text-sm truncate">{gy.name}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{gy.area} · {gy.city}</p>
                          {gy.description && (
                            <p className="text-xs text-slate-400 mt-1.5 line-clamp-1">{gy.description}</p>
                          )}
                        </div>
                        <div className="shrink-0 text-right">
                          {stats ? (
                            <p className={`text-xs font-bold ${stats.available > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
                              {stats.available > 0 ? `${stats.available} available` : 'No slots'}
                            </p>
                          ) : (
                            <p className="text-xs text-slate-600">No data</p>
                          )}
                        </div>
                      </div>
                      {isSelected && (
                        <div className="mt-2 flex items-center gap-1.5 text-emerald-400 text-xs font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Selected
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="flex justify-between">
                <button
                  onClick={() => { setStep(0); setFlyTarget(PAKISTAN_VIEW); }}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-lg transition"
                >
                  ← Back
                </button>
                <button
                  onClick={() => setStep(2)}
                  disabled={!selectedGraveyardId}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition"
                >
                  Continue to Slot Selection <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ══ STEP 2 — Grave Slot Grid ══════════════════════════════════════════ */}
      {step === 2 && (
        <div className="space-y-4">
          {dbTotal === 0 && (
            <div className="flex items-start gap-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-4 py-3">
              <AlertCircle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="text-yellow-300 font-medium">Graves database is empty</p>
                <p className="text-yellow-400/70 text-xs mt-0.5">
                  No graves have been seeded yet. Call <code className="bg-yellow-500/10 px-1 rounded">POST /api/setup/graves</code> with your service role key to seed 390 graves.
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-sm text-slate-400">
              Graveyard: <span className="text-emerald-400 font-medium">{selectedGraveyard?.name ?? selectedGraveyardId}</span>
            </p>
            <button type="button" onClick={() => setStep(1)} className="text-xs text-slate-500 hover:text-emerald-400 transition">
              ← Change area
            </button>
          </div>

          {/* Section tabs */}
          <div className="flex gap-2 flex-wrap">
            {SECTIONS.map(s => (
              <button key={s} onClick={() => setActiveSection(s)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                  activeSection === s ? 'bg-emerald-500 text-white' : 'bg-slate-900 border border-slate-700 text-slate-400 hover:text-white'
                }`}>
                Section {s}
              </button>
            ))}
            <select value={sizeFilter} onChange={e => setSizeFilter(e.target.value)}
              className="ml-auto bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-emerald-500">
              <option value="">All Sizes</option>
              {SIZES.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
            </select>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 flex-wrap">
            {[['available','bg-emerald-500'],['reserved','bg-blue-500'],['occupied','bg-slate-600'],['maintenance','bg-orange-500']].map(([s,c]) => (
              <span key={s} className="flex items-center gap-1.5 text-xs text-slate-400">
                <span className={`w-2.5 h-2.5 rounded-sm ${c}`} /><span className="capitalize">{s}</span>
              </span>
            ))}
            <span className="ml-auto text-xs text-slate-500">
              {loading ? 'Loading…' : `${availableCount} available of ${filtered.length} in Section ${activeSection}`}
            </span>
          </div>

          {/* Grave grid */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 min-h-48">
            {fetchError ? (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" /> {fetchError}
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-7 h-7 text-emerald-400 animate-spin" />
              </div>
            ) : rows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500 gap-3">
                <AlertCircle className="w-8 h-8" />
                {dbTotal === 0 ? (
                  <>
                    <p className="text-sm font-medium text-slate-300">Database not seeded yet</p>
                    <p className="text-xs text-center text-slate-500 max-w-xs">
                      Run <code className="bg-slate-800 px-1.5 py-0.5 rounded text-emerald-300">POST /api/setup/graves</code> with your service role key, then refresh.
                    </p>
                  </>
                ) : sizeFilter && totalInSection && totalInSection > 0 ? (
                  <>
                    <p className="text-sm text-slate-300">No <span className="capitalize font-semibold text-white">{sizeFilter}</span>-size graves in Section {activeSection}</p>
                    <button onClick={() => setSizeFilter('')}
                      className="text-xs px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg hover:bg-emerald-500/20 transition">
                      Clear size filter
                    </button>
                  </>
                ) : (
                  <p className="text-sm">No graves in Section {activeSection} — try another section</p>
                )}
              </div>
            ) : (
              <div className="space-y-1.5 overflow-x-auto">
                {rows.map(({ row, graves: rg }) => (
                  <div key={row} className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-600 w-6 text-right shrink-0">R{row}</span>
                    <div className="flex gap-1.5">
                      {rg.map(g => {
                        const isSelected = selectedGrave?.id === g.id;
                        const isAvailable = g.status === 'available';
                        return (
                          <button key={g.id}
                            onClick={() => isAvailable && setSelectedGrave(isSelected ? null : g)}
                            disabled={!isAvailable}
                            title={`${g.graveNumber} — ${g.status}${g.status === 'available' ? ' — ' + formatCurrency(g.price) : ''}`}
                            className={`w-9 h-9 rounded text-xs font-bold transition border-2 relative ${
                              isSelected
                                ? 'bg-emerald-500 border-emerald-300 text-white scale-110 shadow-lg shadow-emerald-500/30'
                                : STATUS_COLOR[g.status] ?? STATUS_COLOR.occupied
                            }`}>
                            {g.column}
                            {isSelected && (
                              <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-300 rounded-full border border-slate-900" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Selected grave strip */}
          {selectedGrave && (
            <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="flex-1 text-sm">
                <span className="text-white font-semibold">{selectedGrave.graveNumber}</span>
                <span className="text-slate-400"> · Section {selectedGrave.section} · </span>
                <span className="text-slate-400 capitalize">{selectedGrave.size} · </span>
                <span className="text-emerald-400 font-semibold">{formatCurrency(selectedGrave.price)}</span>
              </div>
              <button onClick={() => setSelectedGrave(null)} className="text-xs text-slate-500 hover:text-red-400 transition">Clear</button>
            </div>
          )}

          <div className="flex justify-between">
            <button onClick={() => setStep(1)} className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-lg transition">
              ← Back
            </button>
            <button onClick={() => setStep(3)} disabled={!selectedGrave}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition">
              Continue <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ══ STEP 3 — Booking Details ══════════════════════════════════════════ */}
      {step === 3 && (
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-5">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-5">
              <h2 className="text-sm font-semibold text-white">Slot Details</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Slot Date" required>
                  <input type="date" name="slotDate" value={form.slotDate} onChange={h}
                    min={new Date(Date.now() + 86400000).toISOString().slice(0, 10)} className={inputCls} />
                </Field>
                <Field label="Slot Time" required>
                  <select name="slotTime" value={form.slotTime} onChange={h} className={inputCls}>
                    {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="Deceased / Reserved For" required>
                <input type="text" name="deceasedName" value={form.deceasedName} onChange={h}
                  placeholder="Full name of the deceased" className={inputCls} />
              </Field>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <h2 className="text-sm font-semibold text-white">Contact Information</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Contact Person" required>
                  <input type="text" name="contactName" value={form.contactName} onChange={h}
                    placeholder="Next of kin / family member" className={inputCls} />
                </Field>
                <Field label="Phone Number" required>
                  <input type="tel" name="contactPhone" value={form.contactPhone} onChange={h}
                    placeholder="03xx-xxxxxxx" className={inputCls} />
                </Field>
              </div>
              <Field label="Notes">
                <textarea name="notes" value={form.notes} onChange={h} rows={3}
                  placeholder="Any additional details…" className={inputCls + ' resize-none'} />
              </Field>
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" /> {error}
              </div>
            )}

            <div className="flex gap-3 justify-between">
              <button onClick={() => { if (!preGraveId) setStep(2); }}
                disabled={!!preGraveId}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 text-sm font-medium rounded-lg transition">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button onClick={submit}
                disabled={submitting || !form.deceasedName || !form.contactName || !form.contactPhone}
                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition">
                {submitting
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</>
                  : <><BookMarked className="w-4 h-4" /> Submit Booking</>}
              </button>
            </div>
          </div>

          {/* Booking summary sidebar */}
          <div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 sticky top-6">
              <h2 className="text-sm font-semibold text-white">Booking Summary</h2>

              {/* Location breadcrumb */}
              <div className="bg-slate-800 rounded-lg p-3 space-y-1 text-xs">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Map className="w-3 h-3 text-emerald-400" />
                  {selectedCity?.name ?? '—'}
                </div>
                <div className="flex items-center gap-1.5 text-slate-400 pl-4">
                  <Building2 className="w-3 h-3 text-emerald-400" />
                  {selectedGraveyard?.name ?? selectedGraveyardId}
                </div>
              </div>

              {selectedGrave ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                      <MapPin className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{selectedGrave.graveNumber}</p>
                      <p className="text-xs text-slate-400">Section {selectedGrave.section}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-800 rounded-lg p-2">
                      <p className="text-slate-500 mb-0.5">Size</p>
                      <p className="text-white capitalize font-medium">{selectedGrave.size}</p>
                    </div>
                    <div className="bg-slate-800 rounded-lg p-2">
                      <p className="text-slate-500 mb-0.5">Row · Col</p>
                      <p className="text-white font-medium">{selectedGrave.row} · {selectedGrave.column}</p>
                    </div>
                    <div className="bg-slate-800 rounded-lg p-2 col-span-2">
                      <p className="text-slate-500 mb-0.5">Burial Fee</p>
                      <p className="text-emerald-400 font-bold text-sm">{formatCurrency(selectedGrave.price)}</p>
                    </div>
                  </div>
                  {!preGraveId && (
                    <button onClick={() => { setSelectedGrave(null); setStep(2); }}
                      className="w-full text-xs text-slate-500 hover:text-emerald-400 transition pt-1">
                      ← Change grave
                    </button>
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No grave selected</p>
              )}

              <div className="pt-3 border-t border-slate-800 text-xs text-slate-500 space-y-1.5">
                <p>• Booking valid for <span className="text-yellow-400">7 days</span> pending approval</p>
                <p>• Staff will review and confirm your slot</p>
                <p>• You will be notified upon approval</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
