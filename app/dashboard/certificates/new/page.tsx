'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, CheckCircle2, AlertCircle, FileText } from 'lucide-react';

export default function NewCertPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const preBurialId = sp.get('burialId');
  const [burials, setBurials] = useState<any[]>([]);
  const [burialId, setBurialId] = useState(preBurialId ?? '');
  const [issuedTo, setIssuedTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch('/api/burials').then(r => r.json()).then(d => setBurials(d.burials ?? []));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const r = await fetch('/api/certificates', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ burialId, issuedTo }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setSuccess(true);
      setTimeout(() => router.push('/dashboard/certificates'), 1500);
    } catch (err: any) { setError(err.message); setLoading(false); }
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

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
          <FileText className="w-5 h-5 text-blue-400 shrink-0" />
          <p className="text-blue-300 text-sm">Certificates are processed within 1-2 business days and available for digital download once approved.</p>
        </div>

        <form onSubmit={submit} className="space-y-5">
          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Select Burial Record <span className="text-red-400">*</span></label>
            <select value={burialId} onChange={e => setBurialId(e.target.value)} required
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-emerald-500 transition">
              <option value="">— Select a burial —</option>
              {burials.map(b => (
                <option key={b.id} value={b.id}>{b.deceased?.name} ({b.burialDate} · {b.grave?.graveNumber ?? 'N/A'})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Issued To (Full Name) <span className="text-red-400">*</span></label>
            <input value={issuedTo} onChange={e => setIssuedTo(e.target.value)} required placeholder="Name of next of kin or representative"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition" />
          </div>
          <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm transition">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Submitting…</> : 'Submit Certificate Request'}
          </button>
        </form>
      </div>
    </div>
  );
}
