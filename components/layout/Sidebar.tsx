'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import {
  LayoutDashboard, MapPin, Users, Calendar, CreditCard,
  FileText, Wrench, BarChart3, LogOut, Settings, ChevronRight, BookOpen, Map,
} from 'lucide-react';

const ALL_NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'staff', 'family'] },
  { href: '/dashboard/graves', label: 'Grave Map', icon: Map, roles: ['admin', 'staff', 'family'] },
  { href: '/dashboard/burials', label: 'Burials', icon: Calendar, roles: ['admin', 'staff', 'family'] },
  { href: '/dashboard/payments', label: 'Payments', icon: CreditCard, roles: ['admin', 'staff', 'family'] },
  { href: '/dashboard/certificates', label: 'Death Certificates', icon: FileText, roles: ['admin', 'staff', 'family'] },
  { href: '/dashboard/maintenance', label: 'Maintenance', icon: Wrench, roles: ['admin', 'staff'] },
  { href: '/dashboard/reports', label: 'Reports', icon: BarChart3, roles: ['admin', 'staff'] },
  { href: '/dashboard/family', label: 'Family Portal', icon: Users, roles: ['admin', 'staff', 'family'] },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings, roles: ['admin', 'staff'] },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const nav = ALL_NAV.filter(n => n.roles.includes(user?.role || 'family'));

  return (
    <aside className="flex flex-col w-64 min-h-screen bg-slate-900 border-r border-slate-800">
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-800">
        <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0">
          <MapPin className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-white leading-tight">GMS</p>
          <p className="text-xs text-slate-400">Graveyard Management</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto scrollbar-thin">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
          return (
            <Link key={href} href={href} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group ${active ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight className="w-3.5 h-3.5 opacity-60" />}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-slate-800">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold text-sm">
            {user?.name?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <p className="text-xs text-slate-500 capitalize">{user?.role}</p>
          </div>
        </div>
        <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition">
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      </div>
    </aside>
  );
}
