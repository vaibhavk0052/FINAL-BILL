import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useInvoices } from '@/contexts/InvoiceContext';
import MetricCard from '@/components/MetricCard';
import { listenToExpenses, updateDashboardAnalytics } from '@/firebase/firestore';
import {
  IndianRupee, FileText, FilePlus, FileSpreadsheet, TrendingUp, Wallet, ArrowUpRight,
  CheckCircle2, Clock, ShieldCheck, Activity, User, AlertCircle, Package
} from 'lucide-react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';

interface Expense {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
}

const fmt = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { invoices } = useInvoices();

  const [localExpenses, setLocalExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem('billing_expenses');
    return saved ? JSON.parse(saved) : [];
  });

  // Load real-time expenses from Firestore on component mount
  useEffect(() => {
    const unsubscribe = listenToExpenses((data) => {
      setLocalExpenses(data);
      localStorage.setItem('billing_expenses', JSON.stringify(data));
    });
    return unsubscribe;
  }, []);

  // Filter out private invoices from the dashboard (hidden unless they are public)
  const activeInvoices = invoices.filter(inv => !inv.isPrivate);

  // Compute stats directly from current/live database state
  const totalRevenue = activeInvoices.reduce((sum, b) => sum + b.totalAmount, 0);
  const completedAmount = activeInvoices.filter(b => b.paymentStatus === 'completed').reduce((sum, b) => sum + b.totalAmount, 0);
  const pendingAmount = activeInvoices.filter(b => b.paymentStatus === 'pending').reduce((sum, b) => sum + b.totalAmount, 0);
  const totalExpenses = localExpenses.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = totalRevenue - totalExpenses;
  const totalInvoices = activeInvoices.length;

  // Sync consolidated stats with Firestore analytics document
  useEffect(() => {
    updateDashboardAnalytics({
      totalRevenue,
      completedAmount,
      pendingAmount,
      totalExpenses,
      totalInvoices,
      netProfit
    }).catch(err => console.error("Error updating analytics in Firestore:", err));
  }, [totalRevenue, completedAmount, pendingAmount, totalExpenses, totalInvoices, netProfit]);

  // Format Daily Trend Data for Recharts dynamically based on actual dates
  const chartData = React.useMemo(() => {
    const dailyMap: { [key: string]: { Revenue: number; Expenses: number } } = {};

    // Group active invoices by date (YYYY-MM-DD)
    activeInvoices.forEach(inv => {
      const dateStr = (inv.createdAt && typeof inv.createdAt === 'string') ? inv.createdAt.split('T')[0] : new Date().toISOString().split('T')[0];
      if (!dailyMap[dateStr]) {
        dailyMap[dateStr] = { Revenue: 0, Expenses: 0 };
      }
      dailyMap[dateStr].Revenue += inv.totalAmount;
    });

    // Group local expenses by date (YYYY-MM-DD)
    localExpenses.forEach(exp => {
      const dateStr = exp.date;
      if (!dailyMap[dateStr]) {
        dailyMap[dateStr] = { Revenue: 0, Expenses: 0 };
      }
      dailyMap[dateStr].Expenses += exp.amount;
    });

    // Generate trend data for the last 7 calendar days to show real live cashflow
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();

    return last7Days.map(dateStr => {
      const d = new Date(dateStr);
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const stats = dailyMap[dateStr] || { Revenue: 0, Expenses: 0 };
      return {
        name: label,
        Revenue: stats.Revenue,
        Expenses: stats.Expenses,
        Profit: stats.Revenue - stats.Expenses,
      };
    });
  }, [activeInvoices, localExpenses]);

  // Mock activity logs for Super Admin
  const activityLogs = [
    { id: 1, user: 'System', action: 'Firestore daily synchronization complete', time: '10 mins ago', type: 'system' },
    { id: 2, user: 'Billing Manager', action: 'Created invoice for Amit Verma (₹2,400)', time: '2 hours ago', type: 'billing' },
    { id: 3, user: 'Super Admin', action: 'Added new employee "Jane Smith" to roster', time: '5 hours ago', type: 'employee' },
    { id: 4, user: 'Billing Manager', action: 'Added expense of ₹3,000 for office supplies', time: '1 day ago', type: 'expense' },
    { id: 5, user: 'Super Admin', action: 'Role permission setup initialized', time: '2 days ago', type: 'security' },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(circle_at_30%_20%,rgba(219,39,119,0.4),transparent_50%),radial-gradient(circle_at_70%_60%,rgba(16,185,129,0.4),transparent_50%)]" />

        <div className="relative z-10 space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-pink-500/20 text-pink-300 border border-pink-500/30">
            <ShieldCheck className="w-3.5 h-3.5" />
            {user?.role === 'superadmin' ? 'Super Admin Portal' : 'Billing Manager Workspace'}
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Welcome back, {user?.name || 'Administrator'}
          </h1>
          <p className="text-sm text-slate-300 max-w-xl">
            {user?.role === 'superadmin'
              ? 'Real-time corporate metrics, employees oversight, and multi-channel system profits synced instantly with Firestore.'
              : 'Create new invoices, log office expenses, manage items in stock and track your billing records.'}
          </p>
        </div>

        {user?.role === 'superadmin' && (
          <button
            onClick={() => navigate('/add-employee')}
            className="relative z-10 shrink-0 px-6 py-3 rounded-2xl bg-white text-slate-950 font-bold hover:bg-slate-100 transition-all text-sm flex items-center gap-2 shadow-lg shadow-white/10 active:scale-95"
          >
            <User className="w-4 h-4" />
            Manage Employees
          </button>
        )}
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        <MetricCard
          title="Total Revenue"
          value={fmt(totalRevenue)}
          icon={<IndianRupee className="w-5 h-5" />}
          accent="primary"
          delay={0}
          onClick={() => navigate('/sales-history')}
        />
        <MetricCard
          title="Completed Bills"
          value={fmt(completedAmount)}
          icon={<CheckCircle2 className="w-5 h-5" />}
          accent="success"
          delay={40}
          onClick={() => navigate('/sales-history')}
        />
        <MetricCard
          title="Pending Bills"
          value={fmt(pendingAmount)}
          icon={<Clock className="w-5 h-5" />}
          accent="warning"
          delay={80}
          onClick={() => navigate('/sales-history')}
        />
        <MetricCard
          title="Total Expenses"
          value={fmt(totalExpenses)}
          icon={<Wallet className="w-5 h-5" />}
          accent="destructive"
          delay={120}
          onClick={() => navigate('/purchase-entry')}
        />
        <MetricCard
          title="Net Profit"
          value={fmt(netProfit)}
          icon={<TrendingUp className="w-5 h-5" />}
          accent={netProfit >= 0 ? "success" : "destructive"}
          delay={160}
          onClick={() => navigate('/daily-report')}
        />
        <MetricCard
          title="Total Invoices"
          value={String(totalInvoices)}
          icon={<FileText className="w-5 h-5" />}
          accent="primary"
          delay={200}
          onClick={() => navigate('/all-bills')}
        />
      </div>

      {/* Analytics Graph & Role-based Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Daily Profit/Revenue Graph */}
        <div className="lg:col-span-2 bg-white/60 backdrop-blur-xl rounded-3xl border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-lg shadow-pink-500/20">
                <ArrowUpRight className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-xl text-slate-800 leading-tight">Daily Cashflow Trends</h2>
                <p className="text-sm text-slate-500 mt-1 font-medium">Synced in real-time from Firestore</p>
              </div>
            </div>
          </div>

          <div className="h-[360px] w-full mt-4">
            {chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400">
                No cashflow data available.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(142, 70%, 45%)" stopOpacity={1} />
                      <stop offset="100%" stopColor="hsl(142, 70%, 45%)" stopOpacity={0.6} />
                    </linearGradient>
                    <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(346, 80%, 55%)" stopOpacity={1} />
                      <stop offset="100%" stopColor="hsl(346, 80%, 55%)" stopOpacity={0.6} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(val) => '₹' + (val / 1000) + 'k'} dx={-10} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #f1f5f9', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)' }}
                    itemStyle={{ fontSize: '14px', fontWeight: 600 }}
                    formatter={(value: number, name: string) => [fmt(value), name]}
                    labelStyle={{ color: '#64748b', marginBottom: '4px', fontWeight: 500 }}
                    cursor={{ fill: '#f8fafc', opacity: 0.8 }}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '13px', fontWeight: 500 }} />
                  <Bar dataKey="Revenue" fill="url(#colorRevenue)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Expenses" fill="url(#colorExpenses)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Sidebar Panel: Role Dependent */}
        <div className="lg:col-span-1 space-y-6">
          {user?.role === 'superadmin' ? (
            /* Super Admin View: Activity Logs */
            <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                  <Activity className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="font-bold text-lg text-slate-800">Security & Activity</h2>
                  <p className="text-xs text-slate-500">Live operational events logs</p>
                </div>
              </div>

              {/* Quotation Quick Actions */}
              <div className="grid grid-cols-2 gap-3 mb-6 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <button
                  onClick={() => navigate('/create-quotation')}
                  className="py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] uppercase tracking-wider transition-all text-center shadow-sm"
                >
                  New Estimate
                </button>
                <button
                  onClick={() => navigate('/quotations')}
                  className="py-2.5 px-3 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-[10px] uppercase tracking-wider transition-all text-center border border-slate-200"
                >
                  View Estimates
                </button>
              </div>

              <div className="flow-root">
                <ul className="-mb-8">
                  {activityLogs.map((log, logIdx) => (
                    <li key={log.id}>
                      <div className="relative pb-8">
                        {logIdx !== activityLogs.length - 1 ? (
                          <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-slate-100" aria-hidden="true" />
                        ) : null}
                        <div className="relative flex space-x-3">
                          <div>
                            <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${log.type === 'security' ? 'bg-amber-50 text-amber-600' :
                              log.type === 'employee' ? 'bg-pink-50 text-pink-600' :
                                log.type === 'billing' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-600'
                              }`}>
                              <Activity className="w-4 h-4" />
                            </span>
                          </div>
                          <div className="flex-1 min-w-0 pt-1.5 flex justify-between space-x-4">
                            <div>
                              <p className="text-sm text-slate-600 font-medium">
                                <span className="font-bold text-slate-800">{log.user}</span>: {log.action}
                              </p>
                            </div>
                            <div className="text-right text-xs whitespace-nowrap text-slate-400 font-medium">
                              {log.time}
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            /* ── Billing Manager Panel: Actions Panel ── */
            <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-slate-100/80 shadow-[0_8px_30px_rgba(0,0,0,0.015)] p-6 md:p-8 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-emerald-400 to-green-500" />
              
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center shadow-lg shadow-emerald-500/25 group-hover:scale-105 duration-300">
                  <ShieldCheck className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="font-extrabold text-lg text-slate-800">Quick Shortcuts</h2>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Manager Actions Panel</p>
                </div>
              </div>

              {/* Colorful & Beautiful Quick Actions Button Roster */}
              <div className="grid grid-cols-1 gap-3.5 pt-6">
                <button
                  onClick={() => navigate('/create-bill')}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-red-500 text-white font-bold text-sm shadow-md hover:shadow-pink-500/25 transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5 active:scale-95 duration-200"
                >
                  <FilePlus className="w-4 h-4" />
                  Create New Bill
                </button>
                <button
                  onClick={() => navigate('/create-quotation')}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 text-white font-bold text-sm shadow-md hover:shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5 active:scale-95 duration-200"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Create Quotation Estimate
                </button>
                <button
                  onClick={() => navigate('/quotations')}
                  className="w-full py-3 px-4 rounded-2xl bg-white border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 hover:text-slate-800 transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5 active:scale-95 duration-200"
                >
                  <FileText className="w-4 h-4 text-indigo-500" />
                  View Quotations List
                </button>
                <button
                  onClick={() => navigate('/items')}
                  className="w-full py-3 px-4 rounded-2xl bg-white border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 hover:text-slate-800 transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5 active:scale-95 duration-200"
                >
                  <Package className="w-4 h-4 text-amber-500" />
                  Manage Item Inventory
                </button>
                <button
                  onClick={() => navigate('/add-expenses')}
                  className="w-full py-3 px-4 rounded-2xl bg-white border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 hover:text-slate-800 transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5 active:scale-95 duration-200"
                >
                  <IndianRupee className="w-4 h-4 text-emerald-500" />
                  Log Daily Expenses
                </button>
              </div>

              {/* Informative Alert Notice */}
              <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 mt-6 flex gap-3 text-slate-500">
                <AlertCircle className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                <div className="text-xs font-semibold space-y-1">
                  <p className="font-extrabold text-slate-700 uppercase tracking-wider text-[10px]">Privilege Level Notice</p>
                  <p className="leading-relaxed">As an authorized Billing Manager, you can create bills, log daily business expenses and check item catalogs. Roster editing is locked.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

