'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { formatCurrency } from '@/lib/utils';
import { Loader2, Zap, MapPin, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

interface Grave {
  id: string; graveNumber: string; section: string; size: string; price: number;
  status: string; latitude?: number; longitude?: number; reservedUntil?: string;
}

const SUGGESTED_SLOTS = ['08:00', '10:00', '12:00', '14:00', '16:00'];

const Input = ({ name, label, type = 'text', required = false, placeholder = '', form, onChange, hint }: any) => (
  <div>
    <label className="block text-xs font-medium text-slate-400 mb-1">{label}{required && <span className="text-red-400">*</span>}</label>
    <input type={type} name={name} value={form[name]} onChange={onChange} required={required} placeholder={placeholder}
      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition" />
    {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
  </div>
);

const Select = ({ name, label, options, required = false, form, onChange }: any) => (
  <div>
    <label className="block text-xs font-medium text-slate-400 mb-1">{label}{required && <span className="text-red-400">*</span>}</label>
    <select name={name} value={form[name]} onChange={onChange} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-emerald-500 transition">
      {options.map(([v, l]: string[]) => <option key={v} value={v}>{l}</option>)}
    </select>
  </div>
);

export default function NewBurialPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const preGraveId = sp.get('graveId');
  const bookingId = sp.get('bookingId');
  const preDeceasedName = sp.get('deceasedName');

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

  const [form, setForm] = useState({
    deceasedName: preDeceasedName || '', deceasedCNIC: '', dateOfBirth: '', dateOfDeath: '', causeOfDeath: '',
    religion: 'Islam', nationality: 'Pakistani', address: '',
    nextOfKin: '', nextOfKinPhone: '', nextOfKinCNIC: '', relationship: '',
    burialDate: new Date().toISOString().slice(0, 10),
    burialTime: '10:00', conductedBy: '', notes: '',
    paymentMethod: 'cash', graveSize: 'standard', graveSection: '',
  });

  const h = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const checkSlotConflict = useCallback(async (date: string, time: string) => {
    const month = date.slice(0, 7);
    const r = await fetch(`/api/burials?month=${month}`);
    const d = await r.json();
    const conflict = (d.burials ?? []).some((b: any) =>
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
      if (preGraveId) {
        const g = available.find((g: Grave) => g.id === preGraveId);
        if (g) setSelectedGrave(g);
        else {
          fetch(`/api/graves`).then(r2 => r2.json()).then(d2 => {
            const all = d2.graves ?? [];
            const reserved = all.find((g: Grave) => g.id === preGraveId && g.status === 'reserved');
            if (reserved) setSelectedGrave(reserved);
          });
        }
      }
    });
  }, [preGraveId]);

  useEffect(() => {
    if (!bookingId) return;
    fetch('/api/bookings').then(r => r.json()).then(d => {
      const booking = (d.bookings ?? []).find((b: any) => b.id === bookingId);
      if (booking) {
        setForm(f => ({
          ...f,
          deceasedName: booking.deceasedName || f.deceasedName,
          burialDate: booking.slotDate || f.burialDate,
          burialTime: booking.slotTime || f.burialTime,
          // Map booking contact -> next of kin fields when converting
          nextOfKin: booking.contactName || f.nextOfKin,
          nextOfKinPhone: booking.contactPhone || f.nextOfKinPhone,
          notes: booking.notes || f.notes,
          // Map additional deceased details from booking
          deceasedCNIC: booking.deceasedCnic || f.deceasedCNIC,
          dateOfDeath: booking.dateOfDeath || f.dateOfDeath,
          causeOfDeath: booking.causeOfDeath || f.causeOfDeath,
          address: booking.address || f.address,
        }));
      }
    });
  }, [bookingId]);

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
      const r = await fetch('/api/burials', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          graveId: selectedGrave.id,
          bookingId: bookingId || undefined,
          deceased: {
            name: form.deceasedName, cnic: form.deceasedCNIC, dateOfBirth: form.dateOfBirth,
            dateOfDeath: form.dateOfDeath, causeOfDeath: form.causeOfDeath, religion: form.religion,
            nationality: form.nationality, address: form.address, nextOfKin: form.nextOfKin,
            nextOfKinPhone: form.nextOfKinPhone, nextOfKinCNIC: form.nextOfKinCNIC, relationship: form.relationship,
          },
          burialDate: form.burialDate, burialTime: form.burialTime, conductedBy: form.conductedBy, notes: form.notes,
          paymentMethod: form.paymentMethod, amount: selectedGrave.price,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setSuccess(true);
      setTimeout(() => router.push(`/dashboard/burials/${d.burial.id}`), 1500);
    } catch (err: any) { setError(err.message); setSubmitting(false); }
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
        {bookingId && (
          <p className="text-xs text-emerald-400 mt-2 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Converting approved booking
          </p>
        )}
      </div>

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
            <h2 className="text-sm font-semibold text-slate-200 mb-4">Deceased Person Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input form={form} onChange={h} name="deceasedName" label="Full Name" required />
              <Input form={form} onChange={h} name="deceasedCNIC" label="CNIC (if available)" placeholder="00000-0000000-0" hint="Format: XXXXX-XXXXXXX-X" />
              <Input form={form} onChange={h} name="dateOfBirth" label="Date of Birth" type="date" />
              <Input form={form} onChange={h} name="dateOfDeath" label="Date of Death" type="date" required />
              <Input form={form} onChange={h} name="causeOfDeath" label="Cause of Death" />
              <Select form={form} onChange={h} name="religion" label="Religion" options={[['Islam', 'Islam'], ['Christianity', 'Christianity'], ['Hinduism', 'Hinduism'], ['Other', 'Other']]} />
              <Input form={form} onChange={h} name="nationality" label="Nationality" />
              <Input form={form} onChange={h} name="address" label="Home Address" />
            </div>
            <hr className="border-slate-700 my-4" />
            <h3 className="text-sm font-semibold text-slate-200">Next of Kin Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input form={form} onChange={h} name="nextOfKin" label="Next of Kin Name" required />
              <Input form={form} onChange={h} name="nextOfKinPhone" label="Phone Number" required placeholder="+92 300 0000000" />
              <Input form={form} onChange={h} name="nextOfKinCNIC" label="CNIC" placeholder="00000-0000000-0" />
              <Input form={form} onChange={h} name="relationship" label="Relationship to Deceased" placeholder="Son, Daughter, Spouse…" />
            </div>
            <div className="flex justify-end mt-4">
              <button onClick={() => {
                if (!form.deceasedName || !form.dateOfDeath || !form.nextOfKin || !form.nextOfKinPhone) {
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
                <button onClick={autoAllocate} disabled={allocating} className="w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-400 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg text-sm transition">
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
                    {selectedGrave.status === 'reserved' && (
                      <button onClick={releaseReservation} className="text-xs text-orange-400 hover:text-orange-300">Release</button>
                    )}
                    <button onClick={() => { setSelectedGrave(null); setReservedUntil(null); }} className="text-slate-400 hover:text-white text-xs">Change</button>
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
