'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { BurialBadge, PayBadge } from '@/components/ui/Badges';
import { formatDate, formatDateTime, formatCurrency } from '@/lib/utils';
import { ArrowLeft, FileText, Download, Loader2, MapPin, Clock, User, Phone, CreditCard, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function BurialDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [editingDeceased, setEditingDeceased] = useState(false);
  const [deceasedForm, setDeceasedForm] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/burials/${id}`).then(r => r.json()).then(d => {
      setData(d);
      if (d?.burial?.deceased) setDeceasedForm({ ...d.burial.deceased });
    }).finally(() => setLoading(false));
  }, [id]);

  const saveDeceased = async () => {
    setUpdating(true);
    await fetch(`/api/burials/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deceased: deceasedForm }),
    });
    const r = await fetch(`/api/burials/${id}`);
    const d = await r.json();
    setData(d);
    setDeceasedForm({ ...d.burial.deceased });
    setEditingDeceased(false);
    setUpdating(false);
  };

  const markPaid = async () => {
    if (!data?.payment) return;
    setUpdating(true);
    const ref = prompt('Enter transaction reference (optional):') ?? '';
    await fetch('/api/payments', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: data.payment.id, status: 'paid', transactionRef: ref }) });
    const r = await fetch(`/api/burials/${id}`);
    setData(await r.json());
    setUpdating(false);
  };

  const updateStatus = async (status: string) => {
    setUpdating(true);
    await fetch(`/api/burials/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
    const r = await fetch(`/api/burials/${id}`);
    setData(await r.json());
    setUpdating(false);
  };

  const downloadReceipt = async () => {
    if (!data) return;
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    const W = doc.internal.pageSize.getWidth();
    const M = 20;

    doc.setFillColor(16, 185, 129);
    doc.rect(0, 0, W, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18); doc.setFont('helvetica', 'bold');
    doc.text('Graveyard Management System', M, 14);
    doc.setFontSize(10); doc.setFont('helvetica', 'normal');
    doc.text('Burial Record & Payment Receipt', M, 23);
    doc.text(`Generated: ${new Date().toLocaleString()}`, W - M, 23, { align: 'right' });

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(16); doc.setFont('helvetica', 'bold');
    doc.text('BURIAL RECORD', M, 50);

    // Deceased info
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(M, 56, W - 2 * M, 50, 3, 3, 'F');
    doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(71, 85, 105);
    doc.text('DECEASED INFORMATION', M + 5, 65);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(15, 23, 42);
    const b = data.burial; const g = data.grave; const p = data.payment;
    doc.text(`Name: ${b.deceased?.name}`, M + 5, 74);
    doc.text(`Date of Death: ${b.deceased?.dateOfDeath ? formatDate(b.deceased.dateOfDeath) : '—'}`, M + 5, 81);
    doc.text(`Cause of Death: ${b.deceased?.causeOfDeath || '—'}`, M + 5, 88);
    doc.text(`Next of Kin: ${b.deceased?.nextOfKin}`, M + 5 + (W / 2 - M), 74);
    doc.text(`Phone: ${b.deceased?.nextOfKinPhone}`, M + 5 + (W / 2 - M), 81);
    doc.text(`Relationship: ${b.deceased?.relationship || '—'}`, M + 5 + (W / 2 - M), 88);
    doc.text(`Nationality: ${b.deceased?.nationality || '—'}`, M + 5, 95);
    doc.text(`Religion: ${b.deceased?.religion || '—'}`, M + 5 + (W / 2 - M), 95);

    // Grave & burial
    doc.setFillColor(16, 185, 129);
    doc.roundedRect(M, 112, W - 2 * M, 35, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11); doc.setFont('helvetica', 'bold');
    doc.text(`Grave: ${g?.graveNumber}  ·  Section ${g?.section}  ·  ${g?.size?.toUpperCase()}`, M + 5, 123);
    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    doc.text(`Burial Date: ${formatDate(b.burialDate)}  ·  Time: ${b.burialTime}`, M + 5, 131);
    doc.text(`Conducted By: ${b.conductedBy || '—'}`, M + 5, 138);
    if (g?.latitude) doc.text(`GPS: ${g.latitude.toFixed(5)}, ${g.longitude?.toFixed(5)}`, W - M - 5, 131, { align: 'right' });

    // Payment
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(12); doc.setFont('helvetica', 'bold');
    doc.text('PAYMENT DETAILS', M, 160);
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(71, 85, 105);
    doc.text(`Receipt No: ${p?.receiptNumber || '—'}`, M, 168);
    doc.text(`Amount: PKR ${p?.amount?.toLocaleString() || 0}`, M, 175);
    doc.text(`Method: ${p?.method?.replace('_', ' ')?.toUpperCase() || '—'}`, M, 182);
    doc.text(`Status: ${p?.status?.toUpperCase() || '—'}`, M, 189);
    if (p?.paidAt) doc.text(`Paid At: ${formatDateTime(p.paidAt)}`, M, 196);
    if (p?.transactionRef) doc.text(`Ref: ${p.transactionRef}`, M, 203);

    if (b.notes) {
      doc.setTextColor(15, 23, 42); doc.setFontSize(11); doc.setFont('helvetica', 'bold');
      doc.text('Notes', M, 218);
      doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(71, 85, 105);
      doc.text(doc.splitTextToSize(b.notes, W - 2 * M), M, 226);
    }

    // Footer
    doc.setFillColor(241, 245, 249);
    doc.rect(0, doc.internal.pageSize.getHeight() - 20, W, 20, 'F');
    doc.setTextColor(100, 116, 139); doc.setFontSize(7.5);
    doc.text('This is an official burial record issued by the Graveyard Management System.', W / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });

    doc.save(`Burial_Receipt_${b.id.slice(0, 8)}.pdf`);
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-7 h-7 text-emerald-400 animate-spin" /></div>;
  if (!data?.burial) return <div className="p-6 text-slate-400">Burial not found. <Link href="/dashboard/burials" className="text-emerald-400">← Back</Link></div>;

  const { burial: b, grave: g, payment: p, certificate: cert } = data;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/burials" className="w-9 h-9 rounded-xl border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-600 transition">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white">Burial Record</h1>
            <p className="text-slate-500 text-xs font-mono mt-0.5">{b.id}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={downloadReceipt} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition">
            <Download className="w-4 h-4" /> Receipt PDF
          </button>
          {!cert && (
            <Link href={`/dashboard/certificates/new?burialId=${b.id}`} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition">
              <FileText className="w-4 h-4" /> Request Certificate
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-5">
          {/* Deceased */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <User className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-semibold text-slate-200">Deceased Person</h2>
              {['admin', 'staff'].includes(user?.role || '') && !editingDeceased && (
                <button onClick={() => setEditingDeceased(true)} className="ml-auto text-xs text-emerald-400 hover:text-emerald-300">Edit</button>
              )}
            </div>
            {editingDeceased && deceasedForm ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    ['name', 'Full Name'], ['cnic', 'CNIC'], ['dateOfBirth', 'Date of Birth'],
                    ['dateOfDeath', 'Date of Death'], ['causeOfDeath', 'Cause of Death'],
                    ['religion', 'Religion'], ['nationality', 'Nationality'], ['address', 'Address'],
                    ['nextOfKin', 'Next of Kin'], ['nextOfKinPhone', 'Phone'],
                    ['nextOfKinCNIC', 'NOK CNIC'], ['relationship', 'Relationship'],
                  ].map(([key, label]) => (
                    <div key={key}>
                      <label className="text-xs text-slate-500 mb-0.5 block">{label}</label>
                      <input
                        value={deceasedForm[key] || ''}
                        onChange={e => setDeceasedForm((f: any) => ({ ...f, [key]: e.target.value }))}
                        type={key.includes('date') || key.includes('Date') ? 'date' : 'text'}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={saveDeceased} disabled={updating} className="bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-semibold px-4 py-2 rounded-lg transition">Save</button>
                  <button onClick={() => { setEditingDeceased(false); setDeceasedForm({ ...b.deceased }); }} className="text-xs text-slate-400 hover:text-white px-4 py-2">Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    ['Full Name', b.deceased?.name],
                    ['CNIC', b.deceased?.cnic || '—'],
                    ['Date of Birth', b.deceased?.dateOfBirth ? formatDate(b.deceased.dateOfBirth) : '—'],
                    ['Date of Death', b.deceased?.dateOfDeath ? formatDate(b.deceased.dateOfDeath) : '—'],
                    ['Cause of Death', b.deceased?.causeOfDeath || '—'],
                    ['Religion', b.deceased?.religion || '—'],
                    ['Nationality', b.deceased?.nationality || '—'],
                    ['Address', b.deceased?.address || '—'],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <p className="text-xs text-slate-500 mb-0.5">{k}</p>
                      <p className="text-sm text-slate-200 font-medium">{v}</p>
                    </div>
                  ))}
                </div>
                <div className="border-t border-slate-800 mt-4 pt-4">
                  <p className="text-xs text-slate-500 mb-2 font-medium">Next of Kin</p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      ['Name', b.deceased?.nextOfKin],
                      ['Phone', b.deceased?.nextOfKinPhone],
                      ['CNIC', b.deceased?.nextOfKinCNIC || '—'],
                      ['Relationship', b.deceased?.relationship || '—'],
                    ].map(([k, v]) => (
                      <div key={k}>
                        <p className="text-xs text-slate-500 mb-0.5">{k}</p>
                        <p className="text-sm text-slate-200 font-medium">{v}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Burial info */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-semibold text-slate-200">Burial Information</h2>
              <div className="ml-auto"><BurialBadge status={b.status} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Date', formatDate(b.burialDate)],
                ['Time', b.burialTime],
                ['Conducted By', b.conductedBy || '—'],
                ['Recorded', formatDateTime(b.createdAt)],
              ].map(([k, v]) => (
                <div key={k}>
                  <p className="text-xs text-slate-500 mb-0.5">{k}</p>
                  <p className="text-sm text-slate-200 font-medium">{v}</p>
                </div>
              ))}
            </div>
            {b.notes && <div className="mt-3 p-3 bg-slate-800 rounded-lg text-sm text-slate-300">{b.notes}</div>}
            {['admin', 'staff'].includes(user?.role || '') && b.status !== 'completed' && (
              <div className="flex gap-2 mt-4">
                {b.status === 'confirmed' && (
                  <button onClick={() => updateStatus('completed')} disabled={updating} className="flex items-center gap-1.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30 px-3 py-1.5 rounded-lg text-xs font-medium transition">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Mark Completed
                  </button>
                )}
                {b.status !== 'cancelled' && (
                  <button onClick={() => updateStatus('cancelled')} disabled={updating} className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 px-3 py-1.5 rounded-lg text-xs font-medium transition">
                    Cancel
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-5">
          {/* Grave card */}
          {g && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-semibold text-slate-200">Grave Details</h2>
              </div>
              <div className="space-y-2 text-sm">
                {[
                  ['Grave No.', g.graveNumber],
                  ['Section', g.section],
                  ['Size', g.size],
                  ['Price', formatCurrency(g.price)],
                  g.latitude ? ['GPS Lat', g.latitude.toFixed(5)] : null,
                  g.longitude ? ['GPS Lon', g.longitude.toFixed(5)] : null,
                ].filter(Boolean).map(([k, v]: any) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-slate-500">{k}</span>
                    <span className="text-slate-200 font-medium font-mono text-xs">{v}</span>
                  </div>
                ))}
              </div>
              {g?.latitude && (
                <Link href={`/dashboard/graves?graveId=${g.id}&view=map`} className="mt-4 block w-full text-center text-xs text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 rounded-lg py-2 transition">
                  Locate on Map →
                </Link>
              )}
            </div>
          )}

          {b.qrCode && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-center">
              <h2 className="text-sm font-semibold text-slate-200 mb-3">Grave Locator QR</h2>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={b.qrCode} alt="Grave QR Code" className="w-32 h-32 mx-auto rounded-lg" />
              <p className="text-xs text-slate-500 mt-2">Scan to find grave on map</p>
            </div>
          )}

          {/* Payment card */}
          {p && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-semibold text-slate-200">Burial Fee</h2>
                <div className="ml-auto"><PayBadge status={p.status === 'pending' && p.dueDate && new Date(p.dueDate) < new Date() ? 'overdue' : p.status} /></div>
              </div>
              <div className="flex items-center gap-2 mb-4">
                {['pending', 'overdue'].includes(p.status) && (
                  <div className="flex-1 h-1.5 bg-slate-700 rounded-full"><div className="h-full w-1/3 bg-yellow-500 rounded-full" /></div>
                )}
                {p.status === 'paid' && (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-400"><CheckCircle2 className="w-3.5 h-3.5" /> Payment Complete</div>
                )}
              </div>
              <div className="space-y-2 text-sm border-b border-slate-800 pb-3 mb-3">
                <div className="flex justify-between">
                  <span className="text-slate-500">Grave Plot Fee</span>
                  <span className="text-slate-200">{formatCurrency(g?.price ?? p.amount)}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span className="text-slate-400">Total</span>
                  <span className="text-emerald-400">{formatCurrency(p.amount)}</span>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                {[
                  ['Method', p.method.replace('_', ' ')],
                  ['Receipt', p.receiptNumber],
                  p.dueDate ? ['Due Date', formatDate(p.dueDate)] : null,
                  p.paidAt ? ['Paid At', formatDate(p.paidAt)] : null,
                  p.transactionRef ? ['Ref', p.transactionRef] : null,
                ].filter(Boolean).map(([k, v]: any) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-slate-500">{k}</span>
                    <span className="text-slate-200 font-medium text-xs">{v}</span>
                  </div>
                ))}
              </div>
              {p.status === 'pending' && ['admin', 'staff'].includes(user?.role || '') && (
                <button onClick={markPaid} disabled={updating} className="mt-4 w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-semibold py-2 rounded-lg text-sm transition">
                  {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Mark as Paid
                </button>
              )}
            </div>
          )}

          {/* Certificate status */}
          {cert ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-semibold text-slate-200">Death Certificate</h2>
              </div>
              <p className="text-xs text-slate-400">No. {cert.certificateNumber}</p>
              <p className="text-xs text-slate-500 mt-1">Status: <span className="text-slate-300 font-medium">{cert.status}</span></p>
              <Link href="/dashboard/certificates" className="mt-3 block text-center text-xs text-emerald-400 hover:text-emerald-300">View Certificate →</Link>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-center">
              <FileText className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No certificate requested</p>
              <Link href={`/dashboard/certificates/new?burialId=${b.id}`} className="mt-2 inline-block text-xs text-emerald-400 hover:text-emerald-300">Request death certificate →</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
