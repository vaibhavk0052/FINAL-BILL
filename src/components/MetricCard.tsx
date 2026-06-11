import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  accent?: 'primary' | 'success' | 'warning' | 'destructive';
  delay?: number;
  onClick?: () => void;
}

const accentMap = {
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  destructive: 'bg-destructive/10 text-destructive',
};

export default function MetricCard({ title, value, icon, accent = 'primary', delay = 0, onClick }: MetricCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden bg-white/60 backdrop-blur-xl rounded-2xl border border-white/80 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 animate-fade-up hover:-translate-y-1",
        onClick && "cursor-pointer hover:border-primary/30"
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none transform translate-x-4 -translate-y-4 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-500">
        <div className="w-24 h-24">{icon}</div>
      </div>

      <div className="flex items-start justify-between relative z-10">
        <div>
          <p className="text-sm font-medium text-slate-500 mb-2">{title}</p>
          <p className="text-3xl font-bold tracking-tight text-slate-800">{value}</p>
        </div>
        <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner', accentMap[accent])}>
          {icon}
        </div>
      </div>
    </div>
  );
}
