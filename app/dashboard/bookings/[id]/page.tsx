'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { formatDate, formatCurrency } from '@/lib/utils';
import {
  ArrowLeft, BookMarked, MapPin, Calendar, Clock, User, Phone,
  CheckCircle2, XCircle, RefreshCw, Loader2, StickyNote, Hash,
  ShieldCheck, Building2, LayoutGrid,
} from 'lucide-react';

type BookingStatus = 'pending' | 'approved' | 'cancelled' | 'converted';

const STATUS_META: Record<BookingStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pending:   { label: 'Pending',   color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',    icon: <Clock className="w-3.5 h-3.5" /> },
  approved:  { label: 'Approved',  color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  cancelled: { label: 'Cancelled', color: 'bg-red-500/10 text-red-400 border-red-500/30',             icon: <XCircle className="w-3.5 h-3.5" /> },
  converted: { label: 'Converted to Burial', color: 'bg-blue-500/10 text-blue-400 border-blue-500/30', icon: <RefreshCw className="w-3.5 h-3.5" /> },
};

function Field({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="w-4 h-4 text-slate-400" />
      </div>
      <div>
        <p className="text-xs text-slate-500 mb-0.5">{label}</p>
        <p className="text-sm text-slate-200 font-medium">{value ?? '—'}</p>
      </div>
    </div>
  );
}

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [booking, setBooking] = useState<any>(null);
  const [grave, setGrave] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState(false);
  const [error, setError] = useState('');

  const isStaff = ['admin', 'staff'].includes(user?.role ?? '');

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/bookings/${id}`);
      if (!r.ok) { setError('Booking not found'); return; }
      const d = await r.json();
      setBooking(d.booking);
      setGrave(d.grave);
    } catch { setError('Failed to load booking'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  const patch = async (status: BookingStatus) => {
    setActioning(true);
    await fetch(`/api/bookings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    await load();
    setActioning(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
    </div>
  );

  if (error || !booking) return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => router.back()} className="w-9 h-9 rounded-xl border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="text-xl font-bold text-white">Booking Details</h1>
      </div>
      <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-6 text-center text-sm">
        {error || 'Booking not found'}
      </div>
    </div>
  );

  const meta = STATUS_META[booking.status as BookingStatus] ?? STATUS_META.pending;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => router.back()} className="w-9 h-9 rounded-xl border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-white">{booking.deceasedName}</h1>
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${meta.color}`}>
              {meta.icon}{meta.label}
            </span>
          </div>
          <p className="text-slate-400 text-sm mt-0.5">Booking #{id.slice(0, 8).toUpperCase()}</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Grave info */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Grave Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field icon={MapPin}     label="Grave Number" value={grave?.graveNumber ?? booking.graveId?.slice(0, 12)} />
            <Field icon={LayoutGrid} label="Section"      value={grave?.section} />
            <Field icon={Building2}  label="Size"         value={<span className="capitalize">{grave?.size}</span>} />
            <Field icon={ShieldCheck} label="Price"       value={grave?.price ? formatCurrency(grave.price) : '—'} />
          </div>
        </div>

        {/* Slot info */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Slot Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field icon={Calendar} label="Slot Date" value={formatDate(booking.slotDate)} />
            <Field icon={Clock}    label="Slot Time" value={booking.slotTime} />
            {booking.expiresAt && (
              <Field icon={Clock} label="Reservation Expires" value={
                <span className={new Date(booking.expiresAt) < new Date() ? 'text-red-400' : 'text-yellow-400'}>
                  {formatDate(booking.expiresAt)}
                </span>
              } />
            )}
          </div>
        </div>

        {/* Deceased info */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Deceased Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field icon={User} label="Full Name" value={booking.deceasedName} />
            {booking.deceased?.cnic && <Field icon={Hash} label="CNIC" value={booking.deceased.cnic} />}
            {booking.deceased?.dateOfBirth && <Field icon={Calendar} label="Date of Birth" value={formatDate(booking.deceased.dateOfBirth)} />}
            {booking.deceased?.dateOfDeath && <Field icon={Calendar} label="Date of Death" value={formatDate(booking.deceased.dateOfDeath)} />}
            {booking.deceased?.causeOfDeath && <Field icon={StickyNote} label="Cause of Death" value={booking.deceased.causeOfDeath} />}
            {booking.deceased?.religion && <Field icon={ShieldCheck} label="Religion" value={booking.deceased.religion} />}
            {booking.deceased?.nationality && <Field icon={MapPin} label="Nationality" value={booking.deceased.nationality} />}
            {booking.deceased?.address && <Field icon={Building2} label="Home Address" value={booking.deceased.address} />}
          </div>
        </div>

        {/* Contact info */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Next of Kin</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field icon={User}  label="Contact Name"  value={booking.contactName} />
            <Field icon={Phone} label="Contact Phone" value={booking.contactPhone} />
            {booking.deceased?.nextOfKinCNIC && <Field icon={Hash} label="CNIC" value={booking.deceased.nextOfKinCNIC} />}
            {booking.deceased?.relationship && <Field icon={User} label="Relationship" value={booking.deceased.relationship} />}
          </div>
        </div>

        {/* Notes */}
        {booking.notes && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Notes</h2>
            <p className="text-sm text-slate-400 italic">"{booking.notes}"</p>
          </div>
        )}

        {/* Timeline */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Timeline</h2>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between text-slate-400">
              <span>Booked on</span>
              <span className="text-slate-300">{formatDate(booking.createdAt)}</span>
            </div>
            {booking.approvedAt && (
              <div className="flex items-center justify-between text-slate-400">
                <span>Approved on</span>
                <span className="text-emerald-400">{formatDate(booking.approvedAt)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 flex-wrap">
          {isStaff && booking.status === 'pending' && (
            <>
              <button onClick={() => patch('approved')} disabled={actioning}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition">
                {actioning ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Approve Booking
              </button>
              <button onClick={() => patch('cancelled')} disabled={actioning}
                className="flex items-center gap-2 px-4 py-2.5 bg-red-600/20 hover:bg-red-600/40 disabled:opacity-50 text-red-400 text-sm font-medium rounded-xl border border-red-500/30 transition">
                <XCircle className="w-4 h-4" /> Cancel Booking
              </button>
            </>
          )}
          {!isStaff && booking.status === 'pending' && (
            <button onClick={() => patch('cancelled')} disabled={actioning}
              className="flex items-center gap-2 px-4 py-2.5 bg-red-600/20 hover:bg-red-600/40 disabled:opacity-50 text-red-400 text-sm font-medium rounded-xl border border-red-500/30 transition">
              {actioning ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
              Cancel Booking
            </button>
          )}
          {isStaff && booking.status === 'approved' && (
            <Link href={`/dashboard/burials/new?graveId=${booking.graveId}&bookingId=${id}&deceasedName=${encodeURIComponent(booking.deceasedName)}`}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl transition">
              <RefreshCw className="w-4 h-4" /> Convert to Burial
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
