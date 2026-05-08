'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { CertBadge } from '@/components/ui/Badges';
import { formatDateTime, formatDate } from '@/lib/utils';
import { FileText, Plus, Loader2, Download, CheckCircle2, XCircle, Search } from 'lucide-react';

export default function CertificatesPage() {
  const { user } = useAuth();
  const [certs, setCerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchCerts = () =>
    fetch('/api/certificates').then(r => r.json()).then(d => setCerts(d.certificates ?? [])).finally(() => setLoading(false));

  useEffect(() => { fetchCerts(); }, []);

  const updateStatus = async (id: string, status: string) => {
    setUpdating(id);
    await fetch('/api/certificates', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) });
    fetchCerts();
    setUpdating(null);
  };

  const downloadCert = async (c: any) => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const M = 20;

    // Border
    doc.setDrawColor(16, 185, 129); doc.setLineWidth(3);
    doc.rect(10, 10, W - 20, H - 20);
    doc.setDrawColor(16, 185, 129); doc.setLineWidth(0.5);
    doc.rect(13, 13, W - 26, H - 26);

    // Header
    doc.setFillColor(16, 185, 129);
    doc.rect(10, 10, W - 20, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22); doc.setFont('helvetica', 'bold');
    doc.text('DEATH CERTIFICATE', W / 2, 28, { align: 'center' });
    doc.setFontSize(10); doc.setFont('helvetica', 'normal');
    doc.text('Graveyard Management System – Official Document', W / 2, 40, { align: 'center' });

    // Cert number
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(11); doc.setFont('helvetica', 'bold');
    doc.text(`Certificate No: ${c.certificateNumber}`, W / 2, 60, { align: 'center' });
    doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.3);
    doc.line(M, 64, W - M, 64);

    // Body
    doc.setFontSize(12); doc.setFont('helvetica', 'normal'); doc.setTextColor(30, 41, 59);
    const body = `This is to certify that\n\n${c.deceasedName}\n\nhas been officially recorded as deceased and buried in accordance with the records maintained by the Graveyard Management System.`;
    const lines = doc.splitTextToSize(body, W - 2 * M - 10);
    doc.text(lines, W / 2, 80, { align: 'center' });

    // Details box
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(M, 120, W - 2 * M, 55, 3, 3, 'F');
    doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(71, 85, 105);
    doc.text('CERTIFICATE DETAILS', M + 5, 130);
    doc.setFont('helvetica', 'normal');
    const burial = c.burial;
    const details = [
      ['Deceased Name', c.deceasedName],
      ['Issued To', c.issuedTo],
      ['Grave Number', burial?.graveId ? '—' : '—'],
      ['Burial Date', burial?.burialDate ? formatDate(burial.burialDate) : '—'],
      ['Issued On', c.issuedAt ? formatDate(c.issuedAt) : '—'],
      ['Status', c.status.toUpperCase()],
    ];
    details.forEach(([k, v], i) => {
      const x = i % 2 === 0 ? M + 5 : W / 2;
      const y = 140 + Math.floor(i / 2) * 10;
      doc.setTextColor(100, 116, 139); doc.text(`${k}:`, x, y);
      doc.setTextColor(15, 23, 42); doc.text(v, x + 45, y);
    });

    // Signature area
    doc.setDrawColor(100, 116, 139); doc.setLineWidth(0.4);
    doc.line(M, H - 50, M + 60, H - 50);
    doc.line(W - M - 60, H - 50, W - M, H - 50);
    doc.setFontSize(8); doc.setTextColor(100, 116, 139);
    doc.text('Authorized Signatory', M, H - 44);
    doc.text('Official Stamp', W - M - 30, H - 44, { align: 'right' });

    // Footer
    doc.setFontSize(7); doc.text('This certificate is issued electronically and is valid without physical signature.', W / 2, H - 18, { align: 'center' });

    doc.save(`DeathCertificate_${c.certificateNumber}.pdf`);
  };

  const filtered = certs.filter(c =>
    !search ||
    c.deceasedName?.toLowerCase().includes(search.toLowerCase()) ||
    c.certificateNumber?.toLowerCase().includes(search.toLowerCase()) ||
    c.issuedTo?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Death Certificates</h1>
          <p className="text-slate-400 text-sm mt-1">Online death certificate requests and issuance</p>
        </div>
        <Link href="/dashboard/certificates/new" className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition">
          <Plus className="w-4 h-4" /> Request Certificate
        </Link>
      </div>

      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, certificate number, or issued to…"
          className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-7 h-7 text-emerald-400 animate-spin" /></div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          {filtered.length === 0 ? (
            <div className="py-16 text-center">
              <FileText className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">No certificates found</p>
              <Link href="/dashboard/certificates/new" className="inline-block mt-3 text-sm text-emerald-400 hover:text-emerald-300">Request your first certificate →</Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-left">
                    {['Certificate #', 'Deceased', 'Issued To', 'Requested', 'Status', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filtered.map(c => (
                    <tr key={c.id} className="hover:bg-slate-800/40 transition">
                      <td className="px-4 py-3.5 font-mono text-xs text-emerald-400">{c.certificateNumber}</td>
                      <td className="px-4 py-3.5 font-medium text-slate-200">{c.deceasedName}</td>
                      <td className="px-4 py-3.5 text-slate-300">{c.issuedTo}</td>
                      <td className="px-4 py-3.5 text-slate-500 text-xs">{formatDateTime(c.createdAt)}</td>
                      <td className="px-4 py-3.5"><CertBadge status={c.status} /></td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          {c.status === 'issued' && (
                            <button onClick={() => downloadCert(c)} className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition" title="Download">
                              <Download className="w-4 h-4" />
                            </button>
                          )}
                          {c.status === 'pending' && ['admin', 'staff'].includes(user?.role || '') && (
                            <>
                              <button onClick={() => updateStatus(c.id, 'issued')} disabled={updating === c.id} className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition" title="Approve">
                                {updating === c.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                              </button>
                              <button onClick={() => updateStatus(c.id, 'rejected')} disabled={updating === c.id} className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition" title="Reject">
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
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
