import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard, History, FilePlus, FileText, CreditCard, Clock,
  BarChart3, ShoppingCart, ClipboardList, Users2, Package, Tags,
  IndianRupee, UserPlus, Settings, UserCircle, LogOut, Zap, ChevronDown, Trash2, X
} from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';


interface MenuItem {
  label: string;
  icon: React.ElementType;
  path?: string;
  children?: { label: string; icon: React.ElementType; path: string }[];
}

// Per-section color config: gradient, badge color, icon accent
const sectionColors: Record<string, {
  gradient: string;
  badge: string;
  iconColor: string;
  activeGlow: string;
  activeBg: string;
  hoverBg: string;
}> = {
  'Main':         {
    gradient:   'from-cyan-500 to-blue-500',
    badge:      'bg-cyan-50 text-cyan-600 border-cyan-200',
    iconColor:  'text-cyan-500',
    activeGlow: 'shadow-[0_0_12px_hsl(190_80%_50%/0.2)]',
    activeBg:   'bg-cyan-50 border-l-2 border-cyan-500',
    hoverBg:    'hover:bg-cyan-50',
  },
  'Purchases':    {
    gradient:   'from-violet-500 to-purple-600',
    badge:      'bg-violet-50 text-violet-600 border-violet-200',
    iconColor:  'text-violet-500',
    activeGlow: 'shadow-[0_0_12px_hsl(265_70%_60%/0.2)]',
    activeBg:   'bg-violet-50 border-l-2 border-violet-500',
    hoverBg:    'hover:bg-violet-50',
  },
  'Sales Module': {
    gradient:   'from-emerald-400 to-green-500',
    badge:      'bg-emerald-50 text-emerald-600 border-emerald-200',
    iconColor:  'text-emerald-500',
    activeGlow: 'shadow-[0_0_12px_hsl(148_60%_45%/0.2)]',
    activeBg:   'bg-emerald-50 border-l-2 border-emerald-500',
    hoverBg:    'hover:bg-emerald-50',
  },
  'Bills Module': {
    gradient:   'from-pink-500 to-rose-600',
    badge:      'bg-pink-50 text-pink-600 border-pink-200',
    iconColor:  'text-pink-500',
    activeGlow: 'shadow-[0_0_12px_hsl(330_80%_60%/0.2)]',
    activeBg:   'bg-pink-50 border-l-2 border-pink-500',
    hoverBg:    'hover:bg-pink-50',
  },
  'Items Module': {
    gradient:   'from-orange-400 to-amber-500',
    badge:      'bg-orange-50 text-orange-600 border-orange-200',
    iconColor:  'text-orange-500',
    activeGlow: 'shadow-[0_0_12px_hsl(25_90%_55%/0.2)]',
    activeBg:   'bg-orange-50 border-l-2 border-orange-500',
    hoverBg:    'hover:bg-orange-50',
  },
  'System':       {
    gradient:   'from-red-400 to-pink-600',
    badge:      'bg-red-50 text-red-600 border-red-200',
    iconColor:  'text-red-500',
    activeGlow: 'shadow-[0_0_12px_hsl(0_80%_60%/0.2)]',
    activeBg:   'bg-red-50 border-l-2 border-red-500',
    hoverBg:    'hover:bg-red-50',
  },
  'Expenses': {
    gradient:   'from-indigo-500 to-blue-600',
    badge:      'bg-indigo-50 text-indigo-600 border-indigo-200',
    iconColor:  'text-indigo-500',
    activeGlow: 'shadow-[0_0_12px_hsl(220_80%_60%/0.2)]',
    activeBg:   'bg-indigo-50 border-l-2 border-indigo-500',
    hoverBg:    'hover:bg-indigo-50',
  },
};

const menu: { section: string; items: (MenuItem & { role?: string })[] }[] = [
  {
    section: 'Main',
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
    ],
  },
  {
    section: 'Purchases',
    items: [
      { label: 'Purchase Entry',   icon: ShoppingCart,  path: '/purchase-entry' },
      { label: 'Purchase History', icon: ClipboardList, path: '/purchase-history' },
    ],
  },
  {
    section: 'Sales Module',
    items: [
      { label: 'Sales History', icon: BarChart3, path: '/sales-history' },
    ],
  },
  {
    section: 'Bills Module',
    items: [
      { label: 'Create Bill', icon: FilePlus,      path: '/create-bill' },
      { label: 'All Bills',   icon: FileText,      path: '/all-bills' },
      { label: 'Daily report', icon: ClipboardList, path: '/daily-report' },
      { label: 'Bill Trash',  icon: Trash2,        path: '/bill-trash', role: 'superadmin' },
    ],
  },
  {
    section: 'Items Module',
    items: [
      { label: 'Manage Items', icon: Package, path: '/items' },
    ],
  },
  {
    section: 'Expenses',
    items: [
      { label: 'Add Expenses', icon: IndianRupee, path: '/add-expenses' },
    ],
  },
  {
    section: 'System',
    items: [
      { label: 'Add Employee', icon: UserPlus, path: '/add-employee', role: 'superadmin' },
    ],
  },
];

interface AppSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function AppSidebar({ isOpen = false, onClose }: AppSidebarProps) {
  const location = useLocation();
  const navigate  = useNavigate();
  const { logout, user } = useAuth();

  // Filter menu items dynamically according to current user's role
  const filteredMenu = useMemo(() => {
    return menu.map(group => {
      const items = group.items.filter(item => {
        if (item.role === 'superadmin' && user?.role !== 'superadmin') {
          return false;
        }
        return true;
      });
      return { ...group, items };
    }).filter(group => group.items.length > 0);
  }, [user]);

  return (
    <aside
      className={cn(
        "w-[258px] h-full flex flex-col shrink-0 no-print relative overflow-hidden transition-transform duration-300 ease-in-out",
        "fixed inset-y-0 left-0 z-50 lg:static lg:translate-x-0 lg:flex",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}
      style={{
        background: 'linear-gradient(160deg, #fff5f8 0%, #ffffff 40%, #f0fdf4 100%)',
        borderRight: '1px solid hsl(330 20% 90%)',
      }}
    >
      {/* Animated background orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-24 -left-16 w-64 h-64 rounded-full opacity-30"
          style={{
            background: 'radial-gradient(circle, hsl(330 80% 88%) 0%, transparent 70%)',
            animation: 'pulse 4s ease-in-out infinite',
          }}
        />
        <div
          className="absolute top-1/2 -right-20 w-48 h-48 rounded-full opacity-30"
          style={{
            background: 'radial-gradient(circle, hsl(270 70% 88%) 0%, transparent 70%)',
            animation: 'pulse 6s ease-in-out infinite 1s',
          }}
        />
        <div
          className="absolute -bottom-12 left-10 w-48 h-48 rounded-full opacity-30"
          style={{
            background: 'radial-gradient(circle, hsl(140 60% 85%) 0%, transparent 70%)',
            animation: 'pulse 5s ease-in-out infinite 2s',
          }}
        />
      </div>

      {/* ── Logo / Header ── */}
      <div
        className="relative h-16 flex items-center justify-between px-5 shrink-0"
        style={{ borderBottom: '1px solid hsl(330 20% 90%)' }}
      >
        <div className="flex items-center gap-3">
          {/* Shimmer logo icon */}
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: 'linear-gradient(135deg, hsl(330 80% 60%), hsl(270 70% 65%))',
              boxShadow: '0 4px 10px hsl(330 80% 60% / 0.3)',
            }}
          >
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <span
              className="font-extrabold text-xl tracking-tight"
              style={{
                background: 'linear-gradient(90deg, hsl(330 80% 50%), hsl(270 70% 55%), hsl(140 60% 40%))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              PhotoBill Pro
            </span>
            <p className="text-xs leading-none mt-0.5 text-slate-500">
              Billing Manager
            </p>
          </div>
        </div>

        {/* Close trigger visible only on mobile overlay */}
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* ── Navigation ── */}
      <nav className="relative flex-1 overflow-hidden py-2 px-3 flex flex-col gap-1">
        {filteredMenu.map((group, gi) => {
          const sc = sectionColors[group.section] ?? sectionColors['System'];
          return (
            <ul key={group.section} className="flex flex-col gap-1">
              {group.items.map((item, ii) => {
                const active = location.pathname === item.path;
                return (
                  <li key={item.label} style={{ animation: `slideIn 0.35s ease both ${(gi * 2 + ii) * 40}ms` }}>
                    <button
                      onClick={() => {
                        if (item.path) {
                          navigate(item.path);
                          if (onClose) onClose();
                        }
                      }}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-1.5 rounded-xl text-[15px] transition-all duration-200 group',
                        active
                          ? cn('font-semibold text-slate-900', sc.activeBg, sc.activeGlow)
                          : cn('text-slate-600 hover:text-slate-900', sc.hoverBg),
                      )}
                    >
                      {/* Icon wrapper */}
                      <span
                        className={cn(
                          'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all',
                          active
                            ? 'bg-white shadow-sm'
                            : 'bg-slate-100/50 group-hover:bg-white group-hover:shadow-sm',
                        )}
                      >
                        <item.icon
                          className={cn('w-4 h-4', sc.iconColor)}
                        />
                      </span>
                      <span className="truncate">{item.label}</span>

                      {/* Active pill dot */}
                      {active && (
                        <span
                          className={cn("ml-auto w-1.5 h-1.5 rounded-full shrink-0", sc.iconColor.replace('text-', 'bg-'))}
                          style={{ boxShadow: '0 0 4px currentColor' }}
                        />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          );
        })}
      </nav>

      {/* ── User / Logout ── */}
      <div
        className="relative p-3 shrink-0"
        style={{ borderTop: '1px solid hsl(330 20% 90%)' }}
      >
        {/* User card */}
        <div
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 bg-white/60 shadow-sm border border-slate-100 backdrop-blur-sm"
        >
          {/* Avatar with gradient ring */}
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
            style={{
              background: 'linear-gradient(135deg, hsl(330 80% 60%), hsl(270 70% 65%))',
              boxShadow: '0 4px 10px hsl(330 80% 60% / 0.3)',
            }}
          >
            {user?.name?.[0]?.toUpperCase() ?? 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-semibold text-slate-800 truncate">{user?.name || 'Administrator'}</p>
            <p
              className="text-xs font-medium font-sans"
              style={{
                background: 'linear-gradient(90deg, hsl(330 80% 50%), hsl(270 70% 55%))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              {user?.role === 'superadmin' ? 'Super Admin' : user?.role === 'admin' ? 'Billing Manager' : 'Staff'}
            </p>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-base transition-all duration-200 group text-slate-600 hover:text-red-500 hover:bg-red-50"
        >
          <span className="w-8 h-8 rounded-lg bg-slate-100/50 group-hover:bg-red-100 flex items-center justify-center transition-colors">
            <LogOut className="w-4 h-4 group-hover:text-red-500" />
          </span>
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </aside>
  );
}
