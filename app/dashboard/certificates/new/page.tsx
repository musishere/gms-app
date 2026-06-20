'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Loader2, CheckCircle2, AlertCircle, FileText,
  Calendar, MapPin, User, ChevronRight, Info,
} from 'lucide-react';

interface Burial {
  id: string;
  status: string;
  burialDate: string;
  burialTime: string;
  deceased: { name?: string; nextOfKin?: string; cnic?: string };
  grave?: { graveNumber?: string; section?: string; graveId?: string };
}

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  confirmed:  { label: 'Confirmed',  cls: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  completed:  { label: 'Completed',  cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
};

function BurialCard({
  burial, selected, onClick,
}: { burial: Burial; selected: boolean; onClick: () => void }) {
  const badge = STATUS_LABEL[burial.status];
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-xl border p-4 transition-all ${
        selected
          ? 'border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500/30'
          : 'border-slate-700 bg-slate-800/50 hover:border-slate-600 hover:bg-slate-800'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-white font-semibold truncate text-sm">
            {burial.deceased?.name ?? 'Unknown'}
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            {badge && (
              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badge.cls}`}>
                {badge.label}
              </span>
            )}
            {burial.burialDate && (
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <Calendar className="w-3 h-3" /> {burial.burialDate}
              </span>
            )}
            {burial.grave?.graveNumber && (
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <MapPin className="w-3 h-3" /> {burial.grave.graveNumber}
              </span>
            )}
          </div>
          {burial.deceased?.nextOfKin && (
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <User className="w-3 h-3" /> NOK: {burial.deceased.nextOfKin}
            </p>
          )}
        </div>
        <ChevronRight className={`w-4 h-4 shrink-0 mt-0.5 transition-colors ${selected ? 'text-emerald-400' : 'text-slate-600'}`} />
      </div>
    </button>
  );
}

export default function NewCertPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const preBurialId = sp.get('burialId');

  const [allBurials, setAllBurials] = useState<Burial[]>([]);
  const [loadingBurials, setLoadingBurials] = useState(true);
  const [burialId, setBurialId] = useState(preBurialId ?? '');
  const [issuedTo, setIssuedTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch('/api/burials')
      .then(r => r.json())
      .then(d => {
        const all: Burial[] = d.burials ?? [];
        setAllBurials(all);
        // Auto-select pre-filled burial if it's eligible
        if (preBurialId) {
          const pre = all.find(b => b.id === preBurialId && ['confirmed', 'completed'].includes(b.status));
          if (pre?.deceased?.nextOfKin) setIssuedTo(pre.deceased.nextOfKin);
        }
      })
      .finally(() => setLoadingBurials(false));
  }, [preBurialId]);

  const eligibleBurials = allBurials.filter(b => ['confirmed', 'completed'].includes(b.status));
  const selectedBurial = eligibleBurials.find(b => b.id === burialId) ?? null;

  function selectBurial(id: string) {
    setBurialId(id);
    const b = eligibleBurials.find(x => x.id === id);
    if (b?.deceased?.nextOfKin && !issuedTo) setIssuedTo(b.deceased.nextOfKin);
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const r = await fetch('/api/certificates', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ burialId, issuedTo }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? 'Failed to submit');
      setSuccess(true);
      setTimeout(() => router.push('/dashboard/certificates'), 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to submit');
      setLoading(false);
    }
  };

  if (success) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white">Certificate Requested</h2>
        <p className="text-slate-400 text-sm mt-2">Redirecting…</p>
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/dashboard/certificates" className="w-9 h-9 rounded-xl border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white">Request Death Certificate</h1>
          <p className="text-slate-400 text-sm mt-0.5">Online digital death certificate application</p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
        {/* Info banner */}
        <div className="flex items-start gap-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
          <FileText className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
          <p className="text-blue-300 text-sm">Certificates are processed within 1–2 business days and available for digital download once approved.</p>
        </div>

        <form onSubmit={submit} className="space-y-6">
          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          {/* Burial selection */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-3">
              Select Burial Record <span className="text-red-400">*</span>
            </label>

            {loadingBurials ? (
              <div className="flex items-center gap-2 text-slate-400 text-sm py-4 justify-center">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading burials…
              </div>
            ) : eligibleBurials.length === 0 ? (
              <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-amber-300 text-sm font-medium">No confirmed burials found</p>
                  <p className="text-amber-400/70 text-xs mt-1">
                    A burial must be confirmed by staff before you can request a death certificate.
                    Check the status of your burial records first.
                  </p>
                  <Link href="/dashboard/burials" className="inline-block mt-2 text-xs text-amber-300 underline hover:text-amber-200 transition">
                    View burial records →
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {eligibleBurials.map(b => (
                  <BurialCard
                    key={b.id}
                    burial={b}
                    selected={burialId === b.id}
                    onClick={() => selectBurial(b.id)}
                  />
                ))}
              </div>
            )}

            {/* Hidden input for form validation */}
            <input type="hidden" name="burialId" value={burialId} required />
            {!burialId && eligibleBurials.length > 0 && (
              <p className="text-xs text-slate-500 mt-2">Select a burial above to continue.</p>
            )}
          </div>

          {/* Issued To */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Issued To (Full Name) <span className="text-red-400">*</span>
            </label>
            <input
              value={issuedTo}
              onChange={e => setIssuedTo(e.target.value)}
              required
              placeholder="Name of next of kin or representative"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
            />
            {selectedBurial?.deceased?.nextOfKin && issuedTo === selectedBurial.deceased.nextOfKin && (
              <p className="text-xs text-emerald-500/70 mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Auto-filled from burial record
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !burialId || !issuedTo}
            className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-xl text-sm transition"
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Submitting…</> : 'Submit Certificate Request'}
          </button>
        </form>
      </div>
    </div>
  );
}
