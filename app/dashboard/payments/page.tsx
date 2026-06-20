'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { PayBadge } from '@/components/ui/Badges';
import { formatDate, formatCurrency } from '@/lib/utils';
import { CreditCard, Search, Loader2, CheckCircle2, TrendingUp, Clock, AlertCircle, Banknote, Building2, Globe, FileCheck, X } from 'lucide-react';

const METHOD_ICONS: Record<string, typeof CreditCard> = {
  cash: Banknote,
  online: Globe,
  bank_transfer: Building2,
  cheque: FileCheck,
};

function MarkPaidModal({ payment, onClose, onConfirm, loading }: {
  payment: any; onClose: () => void; onConfirm: (data: { method: string; transactionRef: string }) => void; loading: boolean;
}) {
  const [method, setMethod] = useState(payment.method);
  const [transactionRef, setTransactionRef] = useState(payment.transactionRef || '');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">Mark as Paid</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <p className="text-sm text-slate-400 mb-4">{formatCurrency(payment.amount)} for {payment.burial?.deceased?.name}</p>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Payment Method</label>
            <select value={method} onChange={e => setMethod(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500">
              <option value="cash">Cash</option>
              <option value="online">Online Transfer</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="cheque">Cheque</option>
            </select>
          </div>
          {['online', 'bank_transfer'].includes(method) && (
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Transaction Reference *</label>
              <input value={transactionRef} onChange={e => setTransactionRef(e.target.value)} placeholder="Enter reference number"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500" />
            </div>
          )}
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-sm hover:bg-slate-800 transition">Cancel</button>
          <button
            onClick={() => onConfirm({ method, transactionRef })}
            disabled={loading || (['online', 'bank_transfer'].includes(method) && !transactionRef)}
            className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white text-sm font-semibold transition flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Confirm Paid
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PaymentsPage() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<any[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [pendingRevenue, setPendingRevenue] = useState(0);
  const [overdueRevenue, setOverdueRevenue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [method, setMethod] = useState('');
  const [month, setMonth] = useState('');
  const [updating, setUpdating] = useState(false);
  const [markPaidTarget, setMarkPaidTarget] = useState<any>(null);

  const fetchPayments = () => {
    const p = new URLSearchParams();
    if (status) p.set('status', status);
    if (method) p.set('method', method);
    if (month) p.set('month', month);
    fetch(`/api/payments?${p}`)
      .then(r => r.json())
      .then(d => {
        setPayments(d.payments ?? []);
        setTotalRevenue(d.totalRevenue ?? 0);
        setPendingRevenue(d.pendingRevenue ?? 0);
        setOverdueRevenue(d.overdueRevenue ?? 0);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchPayments(); }, [status, method, month]);

  const confirmMarkPaid = async ({ method: m, transactionRef }: { method: string; transactionRef: string }) => {
    if (!markPaidTarget) return;
    setUpdating(true);
    await fetch('/api/payments', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: markPaidTarget.id, status: 'paid', method: m, transactionRef }),
    });
    setMarkPaidTarget(null);
    fetchPayments();
    setUpdating(false);
  };

  const filtered = payments.filter(p =>
    !search ||
    p.burial?.deceased?.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.receiptNumber?.toLowerCase().includes(search.toLowerCase()) ||
    p.grave?.graveNumber?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {markPaidTarget && (
        <MarkPaidModal payment={markPaidTarget} onClose={() => setMarkPaidTarget(null)} onConfirm={confirmMarkPaid} loading={updating} />
      )}

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Burial Fees & Payments</h1>
        <p className="text-slate-400 text-sm mt-1">Track all burial fee records and payment statuses</p>
      </div>

      {['admin', 'staff'].includes(user?.role || '') && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Revenue Collected', value: formatCurrency(totalRevenue), icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
            { label: 'Pending Collection', value: formatCurrency(pendingRevenue), icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
            { label: 'Overdue', value: formatCurrency(overdueRevenue), icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
            { label: 'Transactions', value: payments.length, icon: CreditCard, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-slate-400 uppercase tracking-wide">{label}</p>
                <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
              </div>
              <p className="text-xl font-bold text-white">{value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, receipt, grave…"
            className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition" />
        </div>
        <select value={status} onChange={e => setStatus(e.target.value)} className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-emerald-500">
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
          <option value="waived">Waived</option>
        </select>
        <select value={method} onChange={e => setMethod(e.target.value)} className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-emerald-500">
          <option value="">All Methods</option>
          <option value="cash">Cash</option>
          <option value="online">Online</option>
          <option value="bank_transfer">Bank Transfer</option>
          <option value="cheque">Cheque</option>
        </select>
        <input type="month" value={month} onChange={e => setMonth(e.target.value)}
          className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-emerald-500" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-7 h-7 text-emerald-400 animate-spin" /></div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          {filtered.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-sm">No payment records found</div>
          ) : (
            <>
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-left">
                      {['Receipt #', 'Deceased', 'Grave', 'Amount', 'Method', 'Status', 'Date', ''].map(h => (
                        <th key={h} className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {filtered.map(p => {
                      const Icon = METHOD_ICONS[p.method] ?? CreditCard;
                      const displayStatus = p.effectiveStatus || p.status;
                      return (
                        <tr key={p.id} className="hover:bg-slate-800/40 transition">
                          <td className="px-4 py-3.5 font-mono text-xs text-slate-400">{p.receiptNumber}</td>
                          <td className="px-4 py-3.5 font-medium text-slate-200">{p.burial?.deceased?.name ?? '—'}</td>
                          <td className="px-4 py-3.5 font-mono text-slate-300">{p.grave?.graveNumber ?? '—'}</td>
                          <td className="px-4 py-3.5 font-semibold text-slate-200">{formatCurrency(p.amount)}</td>
                          <td className="px-4 py-3.5">
                            <span className="flex items-center gap-1.5 text-slate-400 capitalize">
                              <Icon className="w-3.5 h-3.5" />{p.method.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-3.5"><PayBadge status={displayStatus} /></td>
                          <td className="px-4 py-3.5 text-slate-500 text-xs">
                            {p.paidAt ? formatDate(p.paidAt) : p.dueDate ? `Due: ${formatDate(p.dueDate)}` : '—'}
                          </td>
                          <td className="px-4 py-3.5">
                            {['pending', 'overdue'].includes(displayStatus) && ['admin', 'staff'].includes(user?.role || '') && (
                              <button onClick={() => setMarkPaidTarget(p)}
                                className="flex items-center gap-1 text-xs bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 px-2.5 py-1.5 rounded-lg transition">
                                <CheckCircle2 className="w-3 h-3" /> Mark Paid
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="sm:hidden divide-y divide-slate-800">
                {filtered.map(p => {
                  const displayStatus = p.effectiveStatus || p.status;
                  return (
                    <div key={p.id} className="p-4 space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-white">{p.burial?.deceased?.name}</p>
                          <p className="text-xs text-slate-500 font-mono">{p.receiptNumber}</p>
                        </div>
                        <PayBadge status={displayStatus} />
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">{p.grave?.graveNumber}</span>
                        <span className="font-semibold text-white">{formatCurrency(p.amount)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
