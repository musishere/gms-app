import { LucideIcon } from 'lucide-react';
import Link from 'next/link';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}

export default function EmptyState({ icon: Icon, title, description, actionLabel, actionHref, onAction }: EmptyStateProps) {
  return (
    <div className="text-center py-16">
      <Icon className="w-10 h-10 text-slate-600 mx-auto mb-3" />
      <p className="text-slate-400 font-medium">{title}</p>
      {description && <p className="text-slate-500 text-sm mt-1">{description}</p>}
      {actionLabel && actionHref && (
        <Link href={actionHref} className="inline-block mt-4 text-sm text-emerald-400 hover:text-emerald-300">{actionLabel}</Link>
      )}
      {actionLabel && onAction && !actionHref && (
        <button onClick={onAction} className="inline-block mt-4 text-sm text-emerald-400 hover:text-emerald-300">{actionLabel}</button>
      )}
    </div>
  );
}
