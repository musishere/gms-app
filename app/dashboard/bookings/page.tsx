'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { formatDate, formatCurrency } from '@/lib/utils';
import {
  BookMarked, Plus, CheckCircle2, XCircle, Clock, RefreshCw,
  MapPin, Calendar, Phone, User, Loader2, AlertCircle, Eye,
} from 'lucide-react';

type BookingStatus = 'pending' | 'approved' | 'cancelled' | 'converted';

interface Grave { id: string; graveNumber: string; section: string; size: string; price: number; status: string; }
interface Booking {
  id: string; graveId: string; bookedBy: string; slotDate: string; slotTime: string;
  deceasedName: string; contactName: string; contactPhone: string; notes?: string;
  status: BookingStatus; approvedAt?: string; expiresAt?: string; createdAt: string;
  grave?: Grave;
}

const STATUS_META: Record<BookingStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pending:   { label: 'Pending',   color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',  icon: <Clock className="w-3.5 h-3.5" /> },
  approved:  { label: 'Approved',  color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  cancelled: { label: 'Cancelled', color: 'bg-red-500/10 text-red-400 border-red-500/30',           icon: <XCircle className="w-3.5 h-3.5" /> },
  converted: { label: 'Converted', color: 'bg-blue-500/10 text-blue-400 border-blue-500/30',         icon: <RefreshCw className="w-3.5 h-3.5" /> },
};

function StatusBadge({ status }: { status: BookingStatus }) {
  const m = STATUS_META[status] ?? STATUS_META.pending;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${m.color}`}>
      {m.icon}{m.label}
    </span>
  );
}

export default function BookingsPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [actionId, setActionId] = useState<string | null>(null);

  const isStaff = user?.role === 'admin' || user?.role === 'staff';

  const load = async () => {
    setLoading(true);
    const url = filter ? `/api/bookings?status=${filter}` : '/api/bookings';
    const r = await fetch(url);
    const d = await r.json();
    setBookings(d.bookings ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter]);

  const patch = async (id: string, status: BookingStatus) => {
    setActionId(id);
    await fetch(`/api/bookings/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
    await load();
    setActionId(null);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <BookMarked className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Grave Bookings</h1>
            <p className="text-sm text-slate-400">Reserve grave slots for future burials</p>
          </div>
        </div>
        <Link href="/dashboard/bookings/new"
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold rounded-lg transition">
          <Plus className="w-4 h-4" /> New Booking
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {['', 'pending', 'approved', 'cancelled', 'converted'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${filter === s ? 'bg-emerald-500 border-emerald-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'}`}>
            {s === '' ? 'All' : STATUS_META[s as BookingStatus]?.label ?? s}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
        </div>
      ) : bookings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-3">
          <AlertCircle className="w-10 h-10" />
          <p className="text-sm">No bookings found</p>
          <Link href="/dashboard/bookings/new" className="text-sm text-emerald-400 hover:underline">Make your first booking →</Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {bookings.map(b => (
            <div key={b.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition">
              <div className="flex items-start justify-between gap-4">
                {/* Left */}
                <div className="flex-1 min-w-0 space-y-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="text-sm font-semibold text-white">{b.deceasedName}</h3>
                    <StatusBadge status={b.status} />
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>{b.grave?.graveNumber ?? b.graveId} <span className="text-slate-600">·</span> {b.grave?.section}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>{formatDate(b.slotDate)} at {b.slotTime}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <User className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>{b.contactName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>{b.contactPhone}</span>
                    </div>
                  </div>

                  {b.grave && (
                    <div className="flex gap-3 text-xs text-slate-500">
                      <span className="capitalize">{b.grave.size}</span>
                      <span>·</span>
                      <span>{formatCurrency(b.grave.price)}</span>
                      {b.expiresAt && b.status === 'pending' && (
                        <><span>·</span><span className="text-yellow-500">Expires {formatDate(b.expiresAt)}</span></>
                      )}
                    </div>
                  )}

                  {b.notes && <p className="text-xs text-slate-500 italic">"{b.notes}"</p>}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 shrink-0">
                  <Link href={`/dashboard/bookings/${b.id}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium rounded-lg border border-slate-700 transition">
                    <Eye className="w-3.5 h-3.5" /> View
                  </Link>
                  {isStaff && b.status === 'pending' && (
                    <>
                      <button onClick={() => patch(b.id, 'approved')} disabled={actionId === b.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition">
                        {actionId === b.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        Approve
                      </button>
                      <button onClick={() => patch(b.id, 'cancelled')} disabled={actionId === b.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/20 hover:bg-red-600/40 disabled:opacity-50 text-red-400 text-xs font-medium rounded-lg border border-red-500/30 transition">
                        <XCircle className="w-3.5 h-3.5" /> Cancel
                      </button>
                    </>
                  )}
                  {!isStaff && b.status === 'pending' && (
                    <button onClick={() => patch(b.id, 'cancelled')} disabled={actionId === b.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/20 hover:bg-red-600/40 disabled:opacity-50 text-red-400 text-xs font-medium rounded-lg border border-red-500/30 transition">
                      <XCircle className="w-3.5 h-3.5" /> Cancel
                    </button>
                  )}
                  {isStaff && b.status === 'approved' && (
                    <Link href={`/dashboard/burials/new?graveId=${b.graveId}&bookingId=${b.id}&deceasedName=${encodeURIComponent(b.deceasedName)}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg transition">
                      <RefreshCw className="w-3.5 h-3.5" /> Convert to Burial
                    </Link>
                  )}
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-800 text-xs text-slate-600">
                Booked {formatDate(b.createdAt)}
                {b.approvedAt && <> · Approved {formatDate(b.approvedAt)}</>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
