'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { formatDate } from '@/lib/utils';
import { CheckCircle2, XCircle, Loader2, FileText } from 'lucide-react';

export default function VerifyCertificatePage() {
  const { code } = useParams<{ code: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/certificates/verify/${code}`)
      .then(r => r.json())
      .then(d => {
        if (d.valid) setData(d);
        else setError(d.error || 'Invalid certificate');
      })
      .catch(() => setError('Verification failed'))
      .finally(() => setLoading(false));
  }, [code]);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-8">
        <div className="text-center mb-6">
          <FileText className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-white">Death Certificate Verification</h1>
          <p className="text-slate-400 text-sm mt-1">Code: {code}</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-7 h-7 text-emerald-400 animate-spin" /></div>
        ) : error ? (
          <div className="text-center py-6">
            <XCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
            <p className="text-red-300 font-medium">{error}</p>
            <p className="text-slate-500 text-sm mt-2">This certificate could not be verified.</p>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-center gap-2 mb-6 text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-semibold">Valid Certificate</span>
            </div>
            <div className="space-y-3 text-sm bg-slate-800 rounded-xl p-5">
              {[
                ['Certificate No.', data.certificate.certificateNumber],
                ['Deceased', data.certificate.deceasedName],
                ['Issued To', data.certificate.issuedTo],
                ['Grave', data.grave?.graveNumber || '—'],
                ['Burial Date', data.burial?.burialDate ? formatDate(data.burial.burialDate) : '—'],
                ['Conducted By', data.burial?.conductedBy || '—'],
                ['Issued On', data.certificate.issuedAt ? formatDate(data.certificate.issuedAt) : '—'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-slate-500">{k}</span>
                  <span className="text-slate-200 font-medium text-right">{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
