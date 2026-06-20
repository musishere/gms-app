'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { MaintBadge, PriorityBadge } from '@/components/ui/Badges';
import { formatDateTime } from '@/lib/utils';
import { Wrench, Plus, Loader2, CheckCircle2, PlayCircle, AlertTriangle, X } from 'lucide-react';

export default function MaintenancePage() {
  const { user } = useAuth();
  const router = useRouter();
  const isStaff = ['admin', 'staff'].includes(user?.role || '');

  // Staff/admin only — redirect family users
  useEffect(() => {
    if (user && user.role === 'family') router.replace('/dashboard');
  }, [user, router]);
  const [requests, setRequests] = useState<any[]>([]);
  const [graves, setGraves] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', priority: 'medium', graveId: '' });
  const [submitting, setSubmitting] = useState(false);
  const h = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const fetchData = () => {
    const p = new URLSearchParams();
    if (statusFilter) p.set('status', statusFilter);
    if (priorityFilter) p.set('priority', priorityFilter);
    fetch(`/api/maintenance?${p}`)
      .then(r => r.json())
      .then(d => { setRequests(d.requests ?? []); setStats(d.stats ?? {}); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [statusFilter, priorityFilter]);
  useEffect(() => {
    fetch('/api/graves').then(r => r.json()).then(d => setGraves(d.graves ?? []));
  }, []);

  const updateStatus = async (id: string, status: string) => {
    setUpdating(id);
    await fetch('/api/maintenance', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) });
    fetchData(); setUpdating(null);
  };

  const submitRequest = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true);
    const selectedGrave = graves.find(g => g.id === form.graveId);
    await fetch('/api/maintenance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: form.title,
        description: form.description,
        priority: form.priority,
        graveId: form.graveId || undefined,
        graveNumber: selectedGrave?.graveNumber,
        section: selectedGrave?.section,
      }),
    });
    setForm({ title: '', description: '', priority: 'medium', graveId: '' });
    setShowForm(false); setSubmitting(false); fetchData();
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">{isStaff ? 'Maintenance' : 'Report Maintenance'}</h1>
          <p className="text-slate-400 text-sm mt-1">
            {isStaff ? 'Report and track grave & facility maintenance' : 'Submit maintenance requests for graves'}
          </p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition">
          <Plus className="w-4 h-4" /> Report Issue
        </button>
      </div>

      {isStaff && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Open Issues', value: stats.open ?? 0, color: 'text-red-400' },
            { label: 'In Progress', value: stats.inProgress ?? 0, color: 'text-yellow-400' },
            { label: 'Resolved', value: stats.resolved ?? 0, color: 'text-emerald-400' },
            { label: 'Critical', value: stats.critical ?? 0, color: 'text-orange-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-slate-500 mt-1">{label}</p>
            </div>
          ))}
        </div>
      )}

      {isStaff && stats.critical > 0 && (
        <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 mb-5 animate-pulse">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
          <p className="text-red-300 text-sm font-medium">{stats.critical} critical issue{stats.critical > 1 ? 's' : ''} require immediate attention</p>
        </div>
      )}

      {showForm && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-200">Report New Issue</h2>
            <button onClick={() => setShowForm(false)} className="text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
          </div>
          <form onSubmit={submitRequest} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Issue Title *</label>
                <input name="title" value={form.title} onChange={h} required placeholder="e.g. Broken grave marker" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Priority</label>
                <select name="priority" value={form.priority} onChange={h} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-emerald-500 transition">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  {isStaff && <option value="critical">Critical</option>}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Grave (optional)</label>
              <select name="graveId" value={form.graveId} onChange={h} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-emerald-500 transition">
                <option value="">Select a grave…</option>
                {graves.map(g => (
                  <option key={g.id} value={g.id}>{g.graveNumber} — Section {g.section} ({g.status})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Description *</label>
              <textarea name="description" value={form.description} onChange={h} required rows={3} placeholder="Describe the issue in detail…"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition resize-none" />
            </div>
            <button type="submit" disabled={submitting} className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition">
              {submitting ? 'Submitting…' : 'Submit Request'}
            </button>
          </form>
        </div>
      )}

      {isStaff && (
        <div className="flex gap-3 mb-5">
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-300">
            <option value="">All Status</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </select>
          <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-300">
            <option value="">All Priority</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-7 h-7 text-emerald-400 animate-spin" /></div>
      ) : requests.length === 0 ? (
        <div className="text-center py-20 bg-slate-900 border border-slate-800 rounded-2xl">
          <Wrench className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">No maintenance requests</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map(r => (
            <div key={r.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <h3 className="font-semibold text-white">{r.title}</h3>
                    <MaintBadge status={r.status} />
                    <PriorityBadge priority={r.priority} />
                  </div>
                  <p className="text-sm text-slate-400">{r.description}</p>
                  <p className="text-xs text-slate-600 mt-2">
                    {r.graveNumber ? `Grave ${r.graveNumber}` : ''}{r.section ? ` · Section ${r.section}` : ''} · {formatDateTime(r.createdAt)}
                  </p>
                </div>
                {isStaff && r.status !== 'resolved' && (
                  <div className="flex gap-2 shrink-0">
                    {r.status === 'open' && (
                      <button onClick={() => updateStatus(r.id, 'in_progress')} disabled={updating === r.id} className="flex items-center gap-1 text-xs bg-yellow-500/15 border border-yellow-500/30 text-yellow-400 px-2.5 py-1.5 rounded-lg">
                        <PlayCircle className="w-3.5 h-3.5" /> Start
                      </button>
                    )}
                    <button onClick={() => updateStatus(r.id, 'resolved')} disabled={updating === r.id} className="flex items-center gap-1 text-xs bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 px-2.5 py-1.5 rounded-lg">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Resolve
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
