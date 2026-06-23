'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/components/AuthProvider';
import DeceasedInfoFields from '@/components/forms/DeceasedInfoFields';
import {
  DEFAULT_DECEASED_FORM,
  deceasedFormToApi,
  bookingToDeceasedForm,
  isDeceasedFormValid,
  type DeceasedFormData,
} from '@/lib/deceased-form';
import { Loader2, Zap, MapPin, CheckCircle2, AlertCircle, Clock, BookMarked } from 'lucide-react';

interface Grave {
  id: string; graveNumber: string; section: string; size: string; price: number;
  status: string; latitude?: number; longitude?: number; reservedUntil?: string;
}

interface ApprovedBooking {
  id: string;
  deceasedName: string;
  graveId: string;
  slotDate: string;
  slotTime: string;
  notes?: string;
  deceased?: Record<string, string | undefined>;
  contactName?: string;
  contactPhone?: string;
  grave?: Grave;
}

const SUGGESTED_SLOTS = ['08:00', '10:00', '12:00', '14:00', '16:00'];

const Input = ({ name, label, type = 'text', required = false, placeholder = '', form, onChange }: {
  name: string; label: string; type?: string; required?: boolean; placeholder?: string;
  form: Record<string, string>; onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
}) => (
  <div>
    <label className="block text-xs font-medium text-slate-400 mb-1">{label}{required && <span className="text-red-400">*</span>}</label>
    <input type={type} name={name} value={form[name]} onChange={onChange} required={required} placeholder={placeholder}
      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition" />
  </div>
);

const Select = ({ name, label, options, required = false, form, onChange }: {
  name: string; label: string; options: [string, string][]; required?: boolean;
  form: Record<string, string>; onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
}) => (
  <div>
    <label className="block text-xs font-medium text-slate-400 mb-1">{label}{required && <span className="text-red-400">*</span>}</label>
    <select name={name} value={form[name]} onChange={onChange} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-emerald-500 transition">
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  </div>
);

function applyBookingToForm(booking: ApprovedBooking) {
  const deceasedFields = bookingToDeceasedForm(booking);
  return {
    ...DEFAULT_DECEASED_FORM,
    ...deceasedFields,
    burialDate: booking.slotDate,
    burialTime: booking.slotTime,
    notes: booking.notes || '',
  };
}

export default function NewBurialPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const { user } = useAuth();
  const isStaff = ['admin', 'staff'].includes(user?.role ?? '');

  const preGraveId = sp.get('graveId');
  const urlBookingId = sp.get('bookingId');

  const [step, setStep] = useState(1);
  const [graves, setGraves] = useState<Grave[]>([]);
  const [selectedGrave, setSelectedGrave] = useState<Grave | null>(null);
  const [allocating, setAllocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [slotConflict, setSlotConflict] = useState(false);
  const [reservedUntil, setReservedUntil] = useState<string | null>(null);
  const [reservationTimer, setReservationTimer] = useState('');

  const [approvedBookings, setApprovedBookings] = useState<ApprovedBooking[]>([]);
  const [selectedBookingId, setSelectedBookingId] = useState(urlBookingId || '');

  const [form, setForm] = useState({
    ...DEFAULT_DECEASED_FORM,
    burialDate: new Date().toISOString().slice(0, 10),
    burialTime: '10:00',
    conductedBy: '',
    notes: '',
    paymentMethod: 'cash',
    graveSize: 'standard',
    graveSection: '',
  });

  const h = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const loadBooking = useCallback(async (id: string) => {
    const r = await fetch(`/api/bookings/${id}`);
    if (!r.ok) return;
    const d = await r.json();
    const booking = d.booking as ApprovedBooking;
    if (!booking) return;

    setForm(f => ({ ...f, ...applyBookingToForm(booking) }));
    if (d.grave) setSelectedGrave(d.grave);
    else if (booking.grave) setSelectedGrave(booking.grave);
    else if (booking.graveId) {
      const gRes = await fetch('/api/graves');
      const gData = await gRes.json();
      const g = (gData.graves ?? []).find((x: Grave) => x.id === booking.graveId);
      if (g) setSelectedGrave(g);
    }
  }, []);

  const checkSlotConflict = useCallback(async (date: string, time: string) => {
    const month = date.slice(0, 7);
    const r = await fetch(`/api/burials?month=${month}`);
    const d = await r.json();
    const conflict = (d.burials ?? []).some((b: { burialDate: string; burialTime: string; status: string }) =>
      b.burialDate === date && b.burialTime === time && b.status !== 'cancelled'
    );
    setSlotConflict(conflict);
  }, []);

  useEffect(() => {
    if (form.burialDate && form.burialTime) checkSlotConflict(form.burialDate, form.burialTime);
  }, [form.burialDate, form.burialTime, checkSlotConflict]);

  useEffect(() => {
    fetch('/api/graves?status=available').then(r => r.json()).then(d => {
      const available = d.graves ?? [];
      setGraves(available);
      if (preGraveId && !selectedBookingId) {
        const g = available.find((g: Grave) => g.id === preGraveId);
        if (g) setSelectedGrave(g);
        else {
          fetch('/api/graves').then(r2 => r2.json()).then(d2 => {
            const reserved = (d2.graves ?? []).find((g: Grave) => g.id === preGraveId && g.status === 'reserved');
            if (reserved) setSelectedGrave(reserved);
          });
        }
      }
    });
  }, [preGraveId, selectedBookingId]);

  useEffect(() => {
    if (!isStaff) return;
    fetch('/api/bookings?status=approved').then(r => r.json()).then(d => {
      setApprovedBookings(d.bookings ?? []);
    });
  }, [isStaff]);

  useEffect(() => {
    if (!selectedBookingId) return;
    loadBooking(selectedBookingId);
  }, [selectedBookingId, loadBooking]);

  useEffect(() => {
    if (!reservedUntil) return;
    const tick = () => {
      const diff = new Date(reservedUntil).getTime() - Date.now();
      if (diff <= 0) { setReservationTimer('Expired'); return; }
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setReservationTimer(`${m}:${s.toString().padStart(2, '0')}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [reservedUntil]);

  const handleBookingSelect = (id: string) => {
    setSelectedBookingId(id);
    if (!id) {
      setForm(f => ({
        ...DEFAULT_DECEASED_FORM,
        burialDate: new Date().toISOString().slice(0, 10),
        burialTime: '10:00',
        conductedBy: '',
        notes: '',
        paymentMethod: 'cash',
        graveSize: 'standard',
        graveSection: '',
      }));
      setSelectedGrave(null);
    }
  };

  const autoAllocate = async () => {
    setAllocating(true); setError('');
    const r = await fetch('/api/graves/allocate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        size: form.graveSize,
        section: form.graveSection || undefined,
        deceasedName: form.deceasedName || 'Pending allocation',
        reserve: true,
      }),
    });
    const d = await r.json();
    if (d.grave) {
      setSelectedGrave(d.grave);
      if (d.reservedUntil) setReservedUntil(d.reservedUntil);
    } else setError(d.error || 'No available graves');
    setAllocating(false);
  };

  const releaseReservation = async () => {
    if (!selectedGrave) return;
    await fetch('/api/graves/allocate/release', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ graveId: selectedGrave.id }),
    });
    setSelectedGrave(null);
    setReservedUntil(null);
    const r = await fetch('/api/graves?status=available');
    const d = await r.json();
    setGraves(d.graves ?? []);
  };

  const submit = async () => {
    if (!selectedGrave) { setError('Please select a grave'); return; }
    if (slotConflict) { setError('This burial slot is already taken'); return; }
    setSubmitting(true); setError('');
    try {
      const deceasedData = form as DeceasedFormData & { burialDate: string; burialTime: string; conductedBy: string; notes: string; paymentMethod: string };
      const r = await fetch('/api/burials', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          graveId: selectedGrave.id,
          bookingId: selectedBookingId || undefined,
          deceased: deceasedFormToApi(deceasedData),
          burialDate: form.burialDate,
          burialTime: form.burialTime,
          conductedBy: form.conductedBy,
          notes: form.notes,
          paymentMethod: form.paymentMethod,
          amount: selectedGrave.price,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setSuccess(true);
      setTimeout(() => router.push(`/dashboard/burials/${d.burial.id}`), 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create burial');
      setSubmitting(false);
    }
  };

  if (success) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white">Burial Recorded Successfully</h2>
        <p className="text-slate-400 text-sm mt-2">Redirecting to burial details…</p>
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Record New Burial</h1>
        <p className="text-slate-400 text-sm mt-1">Complete all required fields to register a burial</p>
        {selectedBookingId && (
          <p className="text-xs text-emerald-400 mt-2 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Converting approved booking — form auto-filled from user data
          </p>
        )}
      </div>

      {isStaff && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-6">
          <label className="block text-xs font-medium text-slate-400 mb-2">
            <BookMarked className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
            Select Approved Booking (auto-fills form)
          </label>
          <select
            value={selectedBookingId}
            onChange={e => handleBookingSelect(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-emerald-500 transition"
          >
            <option value="">— Manual entry (no booking) —</option>
            {approvedBookings.map(b => (
              <option key={b.id} value={b.id}>
                {b.deceasedName} · {b.slotDate} {b.slotTime} · Grave {b.grave?.graveNumber ?? b.graveId?.slice(0, 8)}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex gap-2 mb-6">
        {[1, 2, 3].map(s => (
          <button key={s} onClick={() => setStep(s)} className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition ${step === s ? 'bg-emerald-500 text-white' : 'bg-slate-900 border border-slate-700 text-slate-400 hover:text-white'}`}>
            Step {s}: {['Deceased Info', 'Grave Selection', 'Burial Details'][s - 1]}
          </button>
        ))}
      </div>

      {error && <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3 mb-5"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>}

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        {step === 1 && (
          <div className="space-y-4">
            <DeceasedInfoFields form={form as DeceasedFormData} onChange={h} />
            <div className="flex justify-end mt-4">
              <button onClick={() => {
                if (!isDeceasedFormValid(form as DeceasedFormData)) {
                  setError('Fill all required fields'); return;
                }
                setError(''); setStep(2);
              }} className="bg-emerald-500 hover:bg-emerald-400 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition">Continue →</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-slate-200 mb-2">Grave Selection</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
              <Select form={form} onChange={h} name="graveSize" label="Preferred Size" options={[['standard', 'Standard'], ['child', 'Child'], ['double', 'Double'], ['vip', 'VIP']]} />
              <Select form={form} onChange={h} name="graveSection" label="Preferred Section" options={[['', 'Any Section'], ['A', 'Section A'], ['B', 'Section B'], ['C', 'Section C'], ['D', 'Section D'], ['VIP', 'Section VIP']]} />
              <div className="flex items-end">
                <button onClick={autoAllocate} disabled={allocating || !!selectedBookingId} className="w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-400 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg text-sm transition">
                  {allocating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />} Auto-Allocate
                </button>
              </div>
            </div>
            {selectedGrave ? (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div className="flex-1">
                    <p className="font-semibold text-emerald-300">Grave {selectedGrave.graveNumber} Selected</p>
                    <p className="text-xs text-emerald-400/70 mt-0.5">
                      Section {selectedGrave.section} · {selectedGrave.size} · {formatCurrency(selectedGrave.price)}
                      {selectedGrave.latitude ? ` · GPS: ${selectedGrave.latitude.toFixed(4)}, ${selectedGrave.longitude?.toFixed(4)}` : ''}
                    </p>
                    {reservedUntil && reservationTimer && (
                      <p className="text-xs text-blue-400 mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Reservation expires in {reservationTimer}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {selectedGrave.status === 'reserved' && !selectedBookingId && (
                      <button onClick={releaseReservation} className="text-xs text-orange-400 hover:text-orange-300">Release</button>
                    )}
                    {!selectedBookingId && (
                      <button onClick={() => { setSelectedGrave(null); setReservedUntil(null); }} className="text-slate-400 hover:text-white text-xs">Change</button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 max-h-64 overflow-y-auto scrollbar-thin">
                <p className="text-xs text-slate-400 mb-3">Or select manually:</p>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {graves.filter(g => (!form.graveSection || g.section === form.graveSection) && (!form.graveSize || g.size === form.graveSize))
                    .slice(0, 48).map(g => (
                      <button key={g.id} onClick={() => setSelectedGrave(g)}
                        className="bg-emerald-500/20 hover:bg-emerald-500/40 border border-emerald-500/30 rounded-lg p-2 text-center text-xs text-emerald-300 transition">
                        <MapPin className="w-3 h-3 mx-auto mb-0.5" />{g.graveNumber}
                      </button>
                    ))}
                </div>
              </div>
            )}
            <div className="flex justify-between mt-4">
              <button onClick={() => setStep(1)} className="px-5 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-sm transition">← Back</button>
              <button onClick={() => { if (!selectedGrave) { setError('Select a grave'); return; } setError(''); setStep(3); }}
                className="bg-emerald-500 hover:bg-emerald-400 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition">Continue →</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-slate-200 mb-2">Burial Details & Payment</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input form={form} onChange={h} name="burialDate" label="Date of Burial" type="date" required />
              <div>
                <Input form={form} onChange={h} name="burialTime" label="Time of Burial" type="time" required />
                <div className="flex flex-wrap gap-2 mt-2">
                  {SUGGESTED_SLOTS.map(t => (
                    <button key={t} type="button" onClick={() => setForm(f => ({ ...f, burialTime: t }))}
                      className={`px-2.5 py-1 rounded-lg text-xs transition ${form.burialTime === t ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <Input form={form} onChange={h} name="conductedBy" label="Conducted By (Imam / Official)" />
              <Select form={form} onChange={h} name="paymentMethod" label="Payment Method" options={[['cash', 'Cash'], ['online', 'Online Transfer'], ['bank_transfer', 'Bank Transfer'], ['cheque', 'Cheque']]} />
            </div>
            {slotConflict && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3">
                <AlertCircle className="w-4 h-4 shrink-0" />
                A burial is already scheduled at this date and time. Please choose a different slot.
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Notes</label>
              <textarea name="notes" value={form.notes} onChange={h} rows={3} placeholder="Any special instructions or notes…"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition resize-none" />
            </div>
            {selectedGrave && (
              <div className="bg-slate-800 rounded-xl p-4 mt-2">
                <p className="text-xs text-slate-400 mb-2 font-medium">Review Summary</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-slate-400">Deceased</span><span className="text-white font-medium">{form.deceasedName}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Grave</span><span className="text-white font-mono">{selectedGrave.graveNumber}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Date & Time</span><span className="text-white">{form.burialDate} at {form.burialTime}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Payment Method</span><span className="text-white capitalize">{form.paymentMethod.replace('_', ' ')}</span></div>
                  <div className="flex justify-between font-semibold border-t border-slate-700 pt-2 mt-2"><span className="text-slate-400">Burial Fee</span><span className="text-emerald-400">{formatCurrency(selectedGrave.price)}</span></div>
                  <p className="text-xs text-slate-500 mt-1">Due within 7 days of registration</p>
                </div>
              </div>
            )}
            <div className="flex justify-between mt-4">
              <button onClick={() => setStep(2)} className="px-5 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-sm transition">← Back</button>
              <button onClick={submit} disabled={submitting || slotConflict} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition">
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> : '✓ Confirm Burial'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
