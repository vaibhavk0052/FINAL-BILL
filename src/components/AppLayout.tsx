import { useState } from 'react';
import AppSidebar from './AppSidebar';
import { Menu } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();

  return (
    <div className="flex h-screen w-full bg-[#f8fafc] relative overflow-hidden">
      {/* Premium subtle background glow for the main app area */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-pink-100/50 rounded-full blur-3xl opacity-60 -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-1/4 w-[600px] h-[600px] bg-emerald-50/60 rounded-full blur-3xl opacity-60 translate-y-1/3" />
        <div className="absolute top-1/2 left-1/2 w-[500px] h-[500px] bg-purple-50/50 rounded-full blur-3xl opacity-50 -translate-x-1/2 -translate-y-1/2" />
      </div>

      {/* Mobile Responsive Header Bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-b border-slate-200/60 z-30 flex items-center justify-between px-4 no-print">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-700 active:scale-95"
          aria-label="Open Sidebar"
        >
          <Menu className="w-6 h-6" />
        </button>
        <span
          className="font-extrabold text-lg tracking-tight"
          style={{
            background: 'linear-gradient(90deg, hsl(330 80% 50%), hsl(270 70% 55%), hsl(140 60% 40%))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          PhotoBill Pro
        </span>
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm shrink-0"
          style={{
            background: 'linear-gradient(135deg, hsl(330 80% 60%), hsl(270 70% 65%))',
          }}
        >
          {user?.name?.[0]?.toUpperCase() ?? 'A'}
        </div>
      </div>

      {/* Mobile Drawer Overlay Backdrop */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 transition-opacity duration-300"
        />
      )}
      
      <AppSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <main className="flex-1 overflow-auto relative z-10 pt-16 lg:pt-0">
        <div className="p-4 sm:p-6 lg:p-10 max-w-[1600px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
