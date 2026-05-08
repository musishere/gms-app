'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { Shield, Users, Database, Info, LogOut, Loader2, CheckCircle2 } from 'lucide-react';

export default function SettingsPage() {
  const { user, logout, refreshUser } = useAuth();
  const [form, setForm] = useState({ name: user?.name ?? '', phone: (user as any)?.phone ?? '', address: (user as any)?.address ?? '' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setSaved(false);
    await fetch('/api/users/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    await refreshUser();
    setSaved(true); setSaving(false);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-slate-400 text-sm mt-1">Account and system configuration</p>
      </div>

      {/* Profile */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-4">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold text-2xl">
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div>
            <h2 className="font-bold text-white">{user?.name}</h2>
            <p className="text-slate-400 text-sm">{user?.email}</p>
            <span className="inline-block mt-1 text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full px-2.5 py-0.5 font-medium capitalize">{user?.role}</span>
          </div>
        </div>
        <form onSubmit={save} className="space-y-4">
          {saved && <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm rounded-lg px-4 py-3"><CheckCircle2 className="w-4 h-4" /> Profile updated</div>}
          {[
            { name: 'name', label: 'Full Name', placeholder: 'Your full name' },
            { name: 'phone', label: 'Phone', placeholder: '+92 300 0000000' },
            { name: 'address', label: 'Address', placeholder: 'Your address' },
          ].map(({ name, label, placeholder }) => (
            <div key={name}>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">{label}</label>
              <input name={name} value={(form as any)[name]} onChange={e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))} placeholder={placeholder}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition" />
            </div>
          ))}
          <button type="submit" disabled={saving} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> : 'Save Changes'}
          </button>
        </form>
      </div>

      {/* System info */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden mb-4">
        <div className="px-5 py-4 border-b border-slate-800"><h2 className="text-sm font-semibold text-slate-200">System Information</h2></div>
        <div className="divide-y divide-slate-800">
          {[
            ['Application', 'GraveYard Management System'],
            ['Version', '1.0.0'],
            ['Institution', 'University of Lahore – CS & IT'],
            ['Architecture', 'Next.js · Serverless · TailwindCSS'],
            ['Database', 'JSON (swap to PostgreSQL for production)'],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between px-5 py-3.5">
              <span className="text-sm text-slate-400">{k}</span>
              <span className="text-sm text-slate-300">{v}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-slate-900 border border-red-500/20 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800"><h2 className="text-sm font-semibold text-red-400">Account</h2></div>
        <button onClick={logout} className="w-full flex items-center gap-3 px-5 py-4 hover:bg-slate-800/50 transition text-left">
          <LogOut className="w-4 h-4 text-slate-400" />
          <div>
            <p className="text-sm text-slate-200">Sign Out</p>
            <p className="text-xs text-slate-500 mt-0.5">Sign out of your account</p>
          </div>
        </button>
      </div>
    </div>
  );
}
