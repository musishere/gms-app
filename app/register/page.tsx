'use client';
import { useState } from 'react';
import Link from 'next/link';
import { MapPin, Loader2 } from 'lucide-react';

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', cnic: '', address: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const h = (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const r = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, role: 'family' }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      window.location.href = '/dashboard';
    } catch (err: any) { setError(err.message); setLoading(false); }
  };

  const F = ({ name, label, type = 'text', placeholder, req = false }: any) => (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-1.5">{label}{req && <span className="text-red-400">*</span>}</label>
      <input type={type} name={name} value={(form as any)[name]} onChange={h} required={req} placeholder={placeholder}
        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500 flex items-center justify-center mb-4">
            <MapPin className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Create Account</h1>
          <p className="text-slate-400 text-sm mt-1">Family / Next of Kin Registration</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
          <form onSubmit={submit} className="space-y-4">
            {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3">{error}</div>}
            <F name="name" label="Full Name " req placeholder="Muhammad Ahmad" />
            <F name="email" label="Email " type="email" req placeholder="email@example.com" />
            <F name="password" label="Password " type="password" req placeholder="Min. 8 characters" />
            <F name="phone" label="Phone Number" placeholder="+92 300 0000000" />
            <F name="cnic" label="CNIC" placeholder="00000-0000000-0" />
            <F name="address" label="Address" placeholder="House #, Street, City" />
            <button type="submit" disabled={loading} className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-semibold rounded-lg py-2.5 transition flex items-center justify-center gap-2 text-sm">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Creating…</> : 'Create Account'}
            </button>
          </form>
          <p className="text-center text-slate-400 text-sm mt-4">
            Already have an account? <Link href="/login" className="text-emerald-400 hover:text-emerald-300 font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
