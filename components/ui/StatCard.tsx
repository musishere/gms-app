import Link from 'next/link';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
  bg: string;
  href?: string;
}

export default function StatCard({ label, value, icon: Icon, color, bg, href }: StatCardProps) {
  const inner = (
    <>
      <div className="flex items-center justify-between mb-3">
        <p className="text-slate-400 text-xs font-medium uppercase tracking-wide">{label}</p>
        <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${color}`} />
        </div>
      </div>
      <p className="text-xl font-bold text-white">{value}</p>
    </>
  );

  if (href) {
    return (
      <Link href={href} className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition block">
        {inner}
      </Link>
    );
  }

  return <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">{inner}</div>;
}
