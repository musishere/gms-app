'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { PayBadge } from '@/components/ui/Badges';
import { formatDate, formatCurrency, formatDateTime } from '@/lib/utils';
import { CreditCard, Search, Loader2, CheckCircle2, TrendingUp, Clock, AlertCircle } from 'lucide-react';

export default function PaymentsPage() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<any[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [pendingRevenue, setPendingRevenue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [month, setMonth] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchPayments = () => {
    const p = new URLSearchParams();
    if (status) p.set('status', status);
    if (month) p.set('month', month);
    fetch(`/api/payments?${p}`)
      .then(r => r.json())
      .then(d => {
        setPayments(d.payments ?? []);
        setTotalRevenue(d.totalRevenue ?? 0);
        setPendingRevenue(d.pendingRevenue ?? 0);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchPayments(); }, [status, month]);

  const markPaid = async (id: string) => {
    const ref = prompt('Transaction reference (optional):') ?? '';
    setUpdating(id);
    await fetch('/api/payments', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: 'paid', transactionRef: ref }),
    });
    fetchPayments();
    setUpdating(null);
  };

  const filtered = payments.filter(p =>
    !search ||
    p.burial?.deceased?.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.receiptNumber?.toLowerCase().includes(search.toLowerCase()) ||
    p.grave?.graveNumber?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Burial Fees & Payments</h1>
        <p className="text-slate-400 text-sm mt-1">Track all burial fee records and payment statuses</p>
      </div>

      {/* Revenue stats */}
      {['admin', 'staff'].includes(user?.role || '') && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Total Revenue Collected', value: formatCurrency(totalRevenue), icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
            { label: 'Pending Collection', value: formatCurrency(pendingRevenue), icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
            { label: 'Total Transactions', value: payments.length, icon: CreditCard, color: 'text-blue-400', bg: 'bg-blue-500/10' },
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

      {/* Filters */}
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
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-left">
                    {['Receipt #', 'Deceased', 'Grave', 'Amount', 'Method', 'Status', 'Date', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filtered.map(p => (
                    <tr key={p.id} className="hover:bg-slate-800/40 transition">
                      <td className="px-4 py-3.5 font-mono text-xs text-slate-400">{p.receiptNumber}</td>
                      <td className="px-4 py-3.5">
                        <p className="font-medium text-slate-200">{p.burial?.deceased?.name ?? '—'}</p>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-slate-300">{p.grave?.graveNumber ?? '—'}</td>
                      <td className="px-4 py-3.5 font-semibold text-slate-200">{formatCurrency(p.amount)}</td>
                      <td className="px-4 py-3.5 text-slate-400 capitalize">{p.method.replace('_', ' ')}</td>
                      <td className="px-4 py-3.5"><PayBadge status={p.status} /></td>
                      <td className="px-4 py-3.5 text-slate-500 text-xs">
                        {p.paidAt ? formatDate(p.paidAt) : p.dueDate ? `Due: ${formatDate(p.dueDate)}` : '—'}
                      </td>
                      <td className="px-4 py-3.5">
                        {p.status === 'pending' && ['admin', 'staff'].includes(user?.role || '') && (
                          <button onClick={() => markPaid(p.id)} disabled={updating === p.id}
                            className="flex items-center gap-1 text-xs bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 px-2.5 py-1.5 rounded-lg transition">
                            {updating === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                            Mark Paid
                          </button>
                        )}
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
