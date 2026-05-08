import { cn } from '@/lib/utils';

type GraveStatus = 'available' | 'occupied' | 'reserved' | 'maintenance';
type BurialStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';
type PayStatus = 'pending' | 'paid' | 'overdue' | 'waived';
type MaintStatus = 'open' | 'in_progress' | 'resolved';
type Priority = 'low' | 'medium' | 'high' | 'critical';
type CertStatus = 'pending' | 'issued' | 'rejected';

const GRAVE_CFG: Record<GraveStatus, { label: string; cls: string }> = {
  available: { label: 'Available', cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  occupied:  { label: 'Occupied',  cls: 'bg-slate-500/15 text-slate-400 border-slate-500/30' },
  reserved:  { label: 'Reserved',  cls: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  maintenance:{ label: 'Maintenance', cls: 'bg-orange-500/15 text-orange-400 border-orange-500/30' },
};
const BURIAL_CFG: Record<BurialStatus, { label: string; cls: string }> = {
  pending:   { label: 'Pending',   cls: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' },
  confirmed: { label: 'Confirmed', cls: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  completed: { label: 'Completed', cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  cancelled: { label: 'Cancelled', cls: 'bg-red-500/15 text-red-400 border-red-500/30' },
};
const PAY_CFG: Record<PayStatus, { label: string; cls: string }> = {
  pending: { label: 'Pending', cls: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' },
  paid:    { label: 'Paid',    cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  overdue: { label: 'Overdue', cls: 'bg-red-500/15 text-red-400 border-red-500/30' },
  waived:  { label: 'Waived',  cls: 'bg-slate-500/15 text-slate-400 border-slate-500/30' },
};
const PRIORITY_CFG: Record<Priority, { label: string; cls: string }> = {
  low:      { label: 'Low',      cls: 'bg-slate-500/15 text-slate-400 border-slate-500/30' },
  medium:   { label: 'Medium',   cls: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' },
  high:     { label: 'High',     cls: 'bg-orange-500/15 text-orange-400 border-orange-500/30' },
  critical: { label: 'Critical', cls: 'bg-red-500/15 text-red-400 border-red-500/30' },
};
const CERT_CFG: Record<CertStatus, { label: string; cls: string }> = {
  pending:  { label: 'Pending',  cls: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' },
  issued:   { label: 'Issued',   cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  rejected: { label: 'Rejected', cls: 'bg-red-500/15 text-red-400 border-red-500/30' },
};
const MAINT_CFG: Record<MaintStatus, { label: string; cls: string }> = {
  open:        { label: 'Open',        cls: 'bg-red-500/15 text-red-400 border-red-500/30' },
  in_progress: { label: 'In Progress', cls: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' },
  resolved:    { label: 'Resolved',    cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
};

function Badge({ cls, label, size = 'sm' }: { cls: string; label: string; size?: 'xs' | 'sm' }) {
  return <span className={cn('inline-flex items-center rounded-full border font-medium', cls, size === 'xs' ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-1')}>{label}</span>;
}

export const GraveBadge = ({ status }: { status: GraveStatus }) => <Badge {...GRAVE_CFG[status] ?? GRAVE_CFG.available} />;
export const BurialBadge = ({ status }: { status: BurialStatus }) => <Badge {...BURIAL_CFG[status] ?? BURIAL_CFG.pending} />;
export const PayBadge = ({ status }: { status: PayStatus }) => <Badge {...PAY_CFG[status] ?? PAY_CFG.pending} />;
export const PriorityBadge = ({ priority }: { priority: Priority }) => <Badge {...PRIORITY_CFG[priority] ?? PRIORITY_CFG.medium} />;
export const CertBadge = ({ status }: { status: CertStatus }) => <Badge {...CERT_CFG[status] ?? CERT_CFG.pending} />;
export const MaintBadge = ({ status }: { status: MaintStatus }) => <Badge {...MAINT_CFG[status] ?? MAINT_CFG.open} />;
