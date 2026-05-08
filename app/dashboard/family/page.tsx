'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { BurialBadge, PayBadge, CertBadge } from '@/components/ui/Badges';
import { formatDate, formatCurrency } from '@/lib/utils';
import { Calendar, CreditCard, FileText, Loader2, MapPin, Clock } from 'lucide-react';

export default function FamilyPortalPage() {
  const { user } = useAuth();
  const [burials, setBurials] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/burials').then(r => r.json()),
      fetch('/api/payments').then(r => r.json()),
      fetch('/api/certificates').then(r => r.json()),
    ]).then(([b, p, c]) => {
      setBurials(b.burials ?? []);
      setPayments(p.payments ?? []);
      setCertificates(c.certificates ?? []);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-7 h-7 text-emerald-400 animate-spin" /></div>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Family Portal</h1>
        <p className="text-slate-400 text-sm mt-1">Track burial records, payments, and death certificates for your family</p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Burial Records', value: burials.length, icon: Calendar, color: 'text-violet-400', bg: 'bg-violet-500/10' },
          { label: 'Payment Records', value: payments.length, icon: CreditCard, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Certificates', value: certificates.length, icon: FileText, color: 'text-blue-400', bg: 'bg-blue-500/10' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-400 uppercase tracking-wide">{label}</p>
              <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center`}><Icon className={`w-4 h-4 ${color}`} /></div>
            </div>
            <p className="text-2xl font-bold text-white">{value}</p>
          </div>
        ))}
      </div>

      {/* Burial records */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl mb-5">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <h2 className="text-sm font-semibold text-slate-200">Burial Records</h2>
        </div>
        {burials.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-sm">No burial records found</div>
        ) : (
          <div className="divide-y divide-slate-800">
            {burials.map(b => (
              <Link key={b.id} href={`/dashboard/burials/${b.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-800/50 transition">
                <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4 text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-200">{b.deceased?.name}</p>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500">
                    <span className="font-mono">{b.grave?.graveNumber ?? '—'}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDate(b.burialDate)} at {b.burialTime}</span>
                  </div>
                </div>
                <BurialBadge status={b.status} />
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Payments */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl mb-5">
        <div className="px-5 py-4 border-b border-slate-800">
          <h2 className="text-sm font-semibold text-slate-200">Payment Records</h2>
        </div>
        {payments.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-sm">No payment records</div>
        ) : (
          <div className="divide-y divide-slate-800">
            {payments.map(p => (
              <div key={p.id} className="flex items-center gap-4 px-5 py-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-200">{p.burial?.deceased?.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5 font-mono">{p.receiptNumber}</p>
                </div>
                <div className="text-right mr-3">
                  <p className="font-semibold text-slate-200">{formatCurrency(p.amount)}</p>
                  <p className="text-xs text-slate-500 capitalize">{p.method.replace('_', ' ')}</p>
                </div>
                <PayBadge status={p.status} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Certificates */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <h2 className="text-sm font-semibold text-slate-200">Death Certificates</h2>
          <Link href="/dashboard/certificates/new" className="text-xs text-emerald-400 hover:text-emerald-300">Request new →</Link>
        </div>
        {certificates.length === 0 ? (
          <div className="py-12 text-center">
            <FileText className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-500 text-sm">No certificates yet</p>
            <Link href="/dashboard/certificates/new" className="inline-block mt-2 text-xs text-emerald-400 hover:text-emerald-300">Request death certificate →</Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {certificates.map(c => (
              <div key={c.id} className="flex items-center gap-4 px-5 py-4">
                <FileText className="w-4 h-4 text-slate-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-200">{c.deceasedName}</p>
                  <p className="text-xs text-slate-500 mt-0.5 font-mono">{c.certificateNumber}</p>
                </div>
                <CertBadge status={c.status} />
                {c.status === 'issued' && (
                  <Link href="/dashboard/certificates" className="text-xs text-emerald-400 hover:text-emerald-300">Download</Link>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
