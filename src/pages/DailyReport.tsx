import { useInvoices } from '@/contexts/InvoiceContext';
import { usePurchases } from '@/contexts/PurchaseContext';
import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/contexts/AuthContext';
import { listenToExpenses, addExpenseRecordToFirestore } from '@/firebase/firestore';
import { IndianRupee, TrendingUp, TrendingDown, Wallet, Calendar, Plus, X, FileSpreadsheet, Lock, Globe, ShieldAlert, KeyRound, Printer } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const PRIVATE_EXPORT_PASSWORD = '123456';
const fmt = (n: number) => '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 0 });

export default function DailyReport() {
  const { invoices } = useInvoices();
  const { purchases, addPurchase } = usePurchases();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'superadmin';
  const [expenses, setExpenses] = useState<any[]>(() => {
    const saved = localStorage.getItem('billing_expenses');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    const unsubscribe = listenToExpenses((data) => {
      setExpenses(data);
      localStorage.setItem('billing_expenses', JSON.stringify(data));
    });
    return unsubscribe;
  }, []);

  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().substring(0, 7)); // YYYY-MM
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState<'daily' | 'monthly'>('daily');

  // States for manual costing form
  const [showForm, setShowForm] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');



  // Public/Private tab for daily invoices
  const [billTab, setBillTab] = useState<'public' | 'private'>('public');
  const [showBillTabPassword, setShowBillTabPassword] = useState(false);
  const [billTabPassword, setBillTabPassword] = useState('');
  const [billTabPasswordError, setBillTabPasswordError] = useState('');

  const monthlyBreakdown = useMemo(() => {
    const daysInMonth: Record<string, { collections: number, costing: number, profit: number }> = {};

    // Filter by selected month
    const monthInvoices = invoices.filter(inv => inv.createdAt && typeof inv.createdAt === 'string' && inv.createdAt.startsWith(selectedMonth));
    const monthExpenses = expenses.filter((exp: any) => exp.date && typeof exp.date === 'string' && exp.date.startsWith(selectedMonth));

    monthInvoices.forEach(inv => {
      const date = (inv.createdAt && typeof inv.createdAt === 'string') ? inv.createdAt.split('T')[0] : new Date().toISOString().split('T')[0];
      if (!daysInMonth[date]) daysInMonth[date] = { collections: 0, costing: 0, profit: 0 };
      daysInMonth[date].collections += (inv.cashAmount || 0) + (inv.onlineAmount || 0);
    });

    monthExpenses.forEach((exp: any) => {
      const date = exp.date;
      if (!daysInMonth[date]) daysInMonth[date] = { collections: 0, costing: 0, profit: 0 };
      daysInMonth[date].costing += (exp.amount || 0);
    });

    // Calculate profit for each day
    Object.keys(daysInMonth).forEach(date => {
      daysInMonth[date].profit = daysInMonth[date].collections - daysInMonth[date].costing;
    });

    return Object.entries(daysInMonth)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [invoices, expenses, selectedMonth]);

  const monthlyTotals = useMemo(() => {
    return monthlyBreakdown.reduce((sum, day) => ({
      collections: sum.collections + day.collections,
      costing: sum.costing + day.costing,
      profit: sum.profit + day.profit
    }), { collections: 0, costing: 0, profit: 0 });
  }, [monthlyBreakdown]);

  const publicDailyStats = useMemo(() => {
    const dailyInvoices = invoices.filter(inv => inv.createdAt && typeof inv.createdAt === 'string' && inv.createdAt.startsWith(selectedDate) && !inv.isPrivate);
    const dailyExpenses = expenses.filter((exp: any) => exp.date === selectedDate);
    const collections = dailyInvoices.reduce((sum, inv) => sum + (inv.cashAmount || 0) + (inv.onlineAmount || 0), 0);
    const costing = dailyExpenses.reduce((sum: number, exp: any) => sum + (exp.amount || 0), 0);
    return { collections, costing, profit: collections - costing, invoiceCount: dailyInvoices.length, purchaseCount: dailyExpenses.length, invoices: dailyInvoices, purchases: [], expenses: dailyExpenses };
  }, [invoices, expenses, selectedDate]);

  const privateDailyStats = useMemo(() => {
    const dailyInvoices = invoices.filter(inv => inv.createdAt && typeof inv.createdAt === 'string' && inv.createdAt.startsWith(selectedDate) && inv.isPrivate);
    const dailyExpenses = expenses.filter((exp: any) => exp.date === selectedDate);
    const collections = dailyInvoices.reduce((sum, inv) => sum + (inv.cashAmount || 0) + (inv.onlineAmount || 0), 0);
    const costing = dailyExpenses.reduce((sum: number, exp: any) => sum + (exp.amount || 0), 0);
    return { collections, costing, profit: collections - costing, invoiceCount: dailyInvoices.length, purchaseCount: dailyExpenses.length, invoices: dailyInvoices, purchases: [], expenses: dailyExpenses };
  }, [invoices, expenses, selectedDate]);

  // dailyStats kept for backward compatibility
  const dailyStats = publicDailyStats;

  const activeStats = useMemo(() => {
    return billTab === 'private' ? privateDailyStats : publicDailyStats;
  }, [billTab, publicDailyStats, privateDailyStats]);

  const formattedPrintDate = useMemo(() => {
    if (!selectedDate) return '';
    const d = new Date(selectedDate);
    return d.toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }, [selectedDate]);



  const handleAddCost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName || !newItemPrice) return;

    const newExpense = {
      id: crypto.randomUUID(),
      date: selectedDate,
      description: newItemName,
      amount: Number(newItemPrice),
      category: 'General'
    };

    addExpenseRecordToFirestore(newExpense)
      .then(() => {
        toast.success('Cost recorded successfully as Expense in Firestore');
      })
      .catch(err => {
        console.error(err);
        toast.error('Failed to save manual cost');
      });

    setNewItemName('');
    setNewItemPrice('');
    setShowForm(false);
  };

  const monthName = new Date(selectedMonth + "-01").toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  const monthlyArchives = useMemo(() => {
    const months = new Set<string>();
    invoices.forEach(inv => {
      if (inv.createdAt && typeof inv.createdAt === 'string') {
        months.add(inv.createdAt.substring(0, 7));
      }
    });
    purchases.forEach(pur => {
      if (pur.date && typeof pur.date === 'string') {
        months.add(pur.date.substring(0, 7));
      }
    });
    // Always include current month
    months.add(new Date().toISOString().substring(0, 7));

    return Array.from(months)
      .sort((a, b) => b.localeCompare(a))
      .map(m => ({
        id: m,
        name: new Date(m + "-01").toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
      }));
  }, [invoices, purchases]);

  return (
    <div className="space-y-8 animate-fade-up">
      {/* HEADER SECTION */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <h1 className="text-3xl font-black tracking-tight text-foreground uppercase italic px-2 border-l-8 border-primary leading-none">Daily Reports</h1>
            {viewMode === 'daily' && (
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-[10px] font-black uppercase tracking-widest hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 active:scale-95"
              >
                <Printer className="w-4 h-4" /> Print Report
              </button>
            )}
          </div>
          <p className="text-sm font-medium text-muted-foreground opacity-80">Track your business performance day-by-day</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* DAILY / MONTHLY TOGGLE */}
          <div className="flex bg-muted p-1 rounded-xl shadow-sm border border-border/50">
            <button
              onClick={() => setViewMode('monthly')}
              className={cn("px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all", viewMode === 'monthly' ? "bg-background text-primary shadow-sm" : "text-muted-foreground")}
            >Monthly</button>
            <button
              onClick={() => setViewMode('daily')}
              className={cn("px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all", viewMode === 'daily' ? "bg-background text-primary shadow-sm" : "text-muted-foreground")}
            >Daily</button>
          </div>

          {/* DATE / MONTH PICKER */}
          <div className="flex items-center gap-2 bg-card px-4 py-2.5 rounded-xl border border-border/50 shadow-sm transition-all focus-within:ring-2 focus-within:ring-primary/20">
            {viewMode === 'monthly' ? (
              <>
                <Calendar className="w-4 h-4 text-primary" />
                <select
                  value={selectedMonth.split('-')[1]}
                  onChange={(e) => setSelectedMonth(`${selectedMonth.substring(0, 4)}-${e.target.value}`)}
                  className="bg-transparent border-none focus:outline-none text-sm font-black text-foreground cursor-pointer"
                >
                  {[
                    { v: '01', l: 'January' },
                    { v: '02', l: 'February' },
                    { v: '03', l: 'March' },
                    { v: '04', l: 'April' },
                    { v: '05', l: 'May' },
                    { v: '06', l: 'June' },
                    { v: '07', l: 'July' },
                    { v: '08', l: 'August' },
                    { v: '09', l: 'September' },
                    { v: '10', l: 'October' },
                    { v: '11', l: 'November' },
                    { v: '12', l: 'December' },
                  ].map(m => (
                    <option key={m.v} value={m.v}>{m.l}</option>
                  ))}
                </select>
                <div className="w-[1px] h-4 bg-border/50 mx-1" />
                <select
                  value={selectedMonth.substring(0, 4)}
                  onChange={(e) => setSelectedMonth(`${e.target.value}-${selectedMonth.split('-')[1]}`)}
                  className="bg-transparent border-none focus:outline-none text-xs font-black text-muted-foreground cursor-pointer"
                >
                  {Array.from(new Set(monthlyArchives.map(m => m.id.substring(0, 4)))).map(yr => (
                    <option key={yr} value={yr}>{yr}</option>
                  ))}
                </select>
              </>
            ) : (
              <>
                <Calendar className="w-4 h-4 text-primary" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent border-none focus:outline-none text-sm font-black text-foreground cursor-pointer"
                />
              </>
            )}
          </div>
        </div>
      </div>



      {/* VIEW CONTENT */}
      {/* DASHBOARD SUMMARY - PREMIUM GRADING */}
      {viewMode === 'monthly' ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
          <div className="lg:col-span-3 space-y-10 animate-fade-in duration-700">
            {/* Monthly Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="relative group p-8 rounded-[2rem] bg-emerald-500/5 border border-emerald-500/10 hover:border-emerald-500/30 transition-all duration-500 overflow-hidden">
                <div className="absolute top-0 right-0 -mr-6 -mt-6 p-12 bg-emerald-500/5 rounded-full blur-2xl group-hover:scale-125 transition-transform" />
                <TrendingUp className="absolute -right-2 -bottom-2 w-32 h-32 text-emerald-500/5 group-hover:text-emerald-500/10 group-hover:scale-110 transition-all duration-700" />
                <p className="text-[10px] font-black text-emerald-500/70 uppercase tracking-[0.25em] mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  {monthName} Inflow
                </p>
                <div className="flex items-baseline gap-1.5 text-foreground">
                  <span className="text-3xl font-black opacity-40">₹</span>
                  <span className="text-5xl font-black tracking-tighter tabular-nums drop-shadow-sm">{monthlyTotals.collections.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="relative group p-8 rounded-[2rem] bg-rose-500/5 border border-rose-500/10 hover:border-rose-500/30 transition-all duration-500 overflow-hidden">
                <div className="absolute top-0 right-0 -mr-6 -mt-6 p-12 bg-rose-500/5 rounded-full blur-2xl group-hover:scale-125 transition-transform" />
                <TrendingDown className="absolute -right-2 -bottom-2 w-32 h-32 text-rose-500/5 group-hover:text-rose-500/10 group-hover:scale-110 transition-all duration-700" />
                <p className="text-[10px] font-black text-rose-500/70 uppercase tracking-[0.25em] mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
                  {monthName} Outflow
                </p>
                <div className="flex items-baseline gap-1.5 text-foreground">
                  <span className="text-3xl font-black opacity-40">₹</span>
                  <span className="text-5xl font-black tracking-tighter tabular-nums drop-shadow-sm">{monthlyTotals.costing.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className={cn(
                "relative group p-8 rounded-[2rem] border shadow-2xl transition-all duration-700 overflow-hidden",
                monthlyTotals.profit >= 0
                  ? "bg-slate-900 border-slate-800 text-white shadow-slate-900/40"
                  : "bg-rose-950 border-rose-900 text-white shadow-rose-950/40"
              )}>
                <div className="absolute top-0 right-0 -mr-6 -mt-6 p-12 bg-white/5 rounded-full blur-2xl group-hover:scale-125 transition-transform" />
                <Wallet className="absolute -right-2 -bottom-2 w-32 h-32 text-white/5 group-hover:text-white/10 group-hover:scale-110 transition-all duration-700" />
                <p className="text-[10px] font-black uppercase tracking-[0.25em] mb-4 opacity-50 flex items-center gap-2">
                  <span className={cn("w-2 h-2 rounded-full", monthlyTotals.profit >= 0 ? "bg-emerald-400" : "bg-rose-400")} />
                  Net Performance
                </p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-black opacity-30">₹</span>
                  <span className="text-5xl font-black tracking-tighter tabular-nums">{monthlyTotals.profit.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* Date-wise Table */}
            <div className="space-y-6">
              <div className="flex items-center justify-between px-2">
                <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
                  <div className="w-1.5 h-7 bg-primary rounded-full" />
                  Detailed Breakdown
                </h2>
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-muted/50 px-3 py-1.5 rounded-full border border-border/50">
                  {monthlyBreakdown.length} active days
                </div>
              </div>
              <div className="relative p-1 rounded-[2.5rem] bg-gradient-to-br from-border/50 via-transparent to-border/50">
                <div className="bg-card/50 backdrop-blur-xl rounded-[2.3rem] border border-white/10 shadow-2xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/10 border-b border-border/30">
                        <th className="text-left py-6 px-10 font-black text-[10px] uppercase tracking-[0.3em] text-muted-foreground/60">Date Period</th>
                        <th className="text-right py-6 px-10 font-black text-[10px] uppercase tracking-[0.3em] text-muted-foreground/60">Revenue</th>
                        <th className="text-right py-6 px-10 font-black text-[10px] uppercase tracking-[0.3em] text-muted-foreground/60">Expense</th>
                        <th className="text-right py-6 px-10 font-black text-[10px] uppercase tracking-[0.3em] text-muted-foreground/60">Impact</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/10">
                      {monthlyBreakdown.map(day => (
                        <tr key={day.date} className="hover:bg-primary/[0.03] transition-all group cursor-pointer" onClick={() => { setSelectedDate(day.date); setViewMode('daily'); }}>
                          <td className="py-7 px-10">
                            <span className="font-black text-foreground text-sm uppercase tracking-tighter group-hover:text-primary transition-colors">
                              {new Date(day.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </span>
                          </td>
                          <td className="py-7 px-10 text-right font-black text-emerald-500 tabular-nums">+{fmt(day.collections)}</td>
                          <td className="py-7 px-10 text-right font-bold text-rose-500/80 tabular-nums">-{fmt(day.costing)}</td>
                          <td className="py-7 px-10 text-right">
                            <div className={cn(
                              "inline-flex items-center justify-end px-4 py-1.5 rounded-full font-black text-[11px] min-w-[100px]",
                              day.profit >= 0 ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"
                            )}>
                              {fmt(day.profit)}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {monthlyBreakdown.length === 0 && (
                        <tr><td colSpan={4} className="py-32 text-center text-muted-foreground/40 font-black uppercase tracking-[0.2em] italic">Empty Ledger for {monthName}</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* MONTHLY ARCHIVES SIDEBAR */}
          {/* SIDEBAR: MONTH SELECTOR & ARCHIVES */}
          <div className="space-y-8">
            <div className="bg-card border border-border/50 rounded-3xl p-6 shadow-xl">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground italic border-b border-border/10 pb-4 mb-4">
                {selectedMonth.substring(0, 4)} Overview
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].map(m => {
                  const id = `${selectedMonth.substring(0, 4)}-${m}`;
                  const isActive = selectedMonth === id;
                  const monthName = new Date(`2024-${m}-01`).toLocaleDateString('en-IN', { month: 'short' }).toUpperCase();

                  return (
                    <button
                      key={m}
                      onClick={() => setSelectedMonth(id)}
                      className={cn(
                        "py-3 rounded-xl text-[10px] font-black transition-all border",
                        isActive
                          ? "bg-primary border-primary text-white shadow-lg shadow-primary/20"
                          : "bg-muted/50 border-border/50 text-muted-foreground hover:border-primary/50"
                      )}
                    >
                      {monthName}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground italic px-1">Other Years</h3>
              <div className="space-y-2">
                {monthlyArchives.filter(m => !m.id.startsWith(selectedMonth.substring(0, 4))).map(m => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedMonth(m.id)}
                    className="w-full text-left px-4 py-4 rounded-2xl transition-all font-bold border bg-card border-border hover:border-primary/30 hover:bg-muted/30"
                  >
                    <div className="text-xs opacity-60 uppercase tracking-tighter mb-1">Backup for</div>
                    {m.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setViewMode('monthly')}
              className="inline-flex items-center gap-2 text-xs font-black text-muted-foreground hover:text-primary transition-colors uppercase tracking-widest"
            >
              ← Back to Monthly View
            </button>

            {/* PUBLIC / PRIVATE TAB — controls the entire daily section */}
            {isSuperAdmin ? (
              <div className="flex items-center gap-1 p-1 bg-muted rounded-2xl border border-border/30">
                <button
                  onClick={() => setBillTab('public')}
                  className={cn(
                    'flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300',
                    billTab === 'public'
                      ? 'bg-card text-emerald-600 shadow-md border border-emerald-500/20'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Globe className="w-3.5 h-3.5" /> Public
                </button>
                <button
                  onClick={() => {
                    if (billTab !== 'private') {
                      setBillTabPassword('');
                      setBillTabPasswordError('');
                      setShowBillTabPassword(true);
                    } else {
                      setBillTab('public');
                    }
                  }}
                  className={cn(
                    'flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300',
                    billTab === 'private'
                      ? 'bg-red-600 text-white shadow-lg shadow-red-500/20'
                      : 'text-muted-foreground hover:text-red-500'
                  )}
                >
                  <Lock className="w-3.5 h-3.5" />
                  {billTab === 'private' ? 'Private Bills' : 'Private 🔒'}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1 p-1 bg-muted rounded-2xl border border-border/30">
                <span className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest bg-card text-emerald-600 shadow-md border border-emerald-500/20 cursor-default">
                  <Globe className="w-3.5 h-3.5" /> Public Only
                </span>
              </div>
            )}
          </div>

          {/* Private mode alert banner */}
          {billTab === 'private' && (
            <div className="flex items-center gap-3 px-5 py-3 bg-red-500/5 border border-red-500/20 rounded-2xl text-red-600 text-xs font-bold animate-fade-up">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              Confidential Mode Active — Showing private bill data only. Excluded from all public reports.
            </div>
          )}

          {/* Daily Summary Cards — driven by billTab */}
          {(() => {
            const activeStats = billTab === 'private' ? privateDailyStats : publicDailyStats;
            return (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className={cn(
                  "p-6 rounded-2xl border shadow-card relative overflow-hidden group transition-all",
                  billTab === 'private' ? 'bg-red-500/5 border-red-500/20' : 'bg-card border-border/50'
                )}>
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform text-success pointer-events-none">
                    <TrendingUp className="w-12 h-12" />
                  </div>
                  <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-1">
                    {billTab === 'private' ? '🔒 Private' : '🌐 Public'} Collections
                  </p>
                  <div className="flex items-baseline gap-1.5 text-success">
                    <span className="text-2xl font-black">₹</span>
                    <span className="text-4xl font-black tracking-tighter tabular-nums leading-none">
                      {activeStats.collections.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <p className="text-[10px] font-bold text-muted-foreground mt-4">
                    From {activeStats.invoiceCount} {billTab} bills
                  </p>
                </div>

                <div className="bg-card p-6 rounded-2xl border border-border/50 shadow-card relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform text-destructive pointer-events-none">
                    <TrendingDown className="w-12 h-12" />
                  </div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">Total Costing</p>
                    <button
                      type="button"
                      onClick={() => setShowForm(true)}
                      className="text-[10px] font-black bg-destructive/10 text-destructive px-2 py-0.5 rounded hover:bg-destructive/20 transition-colors relative z-10"
                    >
                      + ADD COST
                    </button>
                  </div>
                  <div className="flex items-baseline gap-1.5 text-destructive">
                    <span className="text-2xl font-black">₹</span>
                    <span className="text-4xl font-black tracking-tighter tabular-nums leading-none">
                      {activeStats.costing.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <p className="text-[10px] font-bold text-muted-foreground mt-4">
                    {activeStats.purchaseCount} items recorded
                  </p>
                </div>

                <div className={cn(
                  "p-6 rounded-2xl border shadow-card relative overflow-hidden group transition-all",
                  billTab === 'private'
                    ? 'bg-red-700 border-red-600 text-white shadow-red-900/40'
                    : activeStats.profit >= 0
                      ? 'bg-primary shadow-lg shadow-primary/20 text-white'
                      : 'bg-destructive shadow-lg shadow-destructive/20 text-white'
                )}>
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform pointer-events-none">
                    <Wallet className="w-12 h-12" />
                  </div>
                  <p className="text-xs font-black uppercase tracking-widest mb-1 opacity-80">Final Balance</p>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black">₹</span>
                    <span className="text-4xl font-black tracking-tighter tabular-nums leading-none">
                      {activeStats.profit.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <p className="text-[10px] font-bold mt-4 opacity-80 uppercase tracking-tighter">
                    Net for {new Date(selectedDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                  </p>
                </div>
              </div>
            );
          })()}

          {/* Daily Tables Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-20">
            {/* Daily Invoices — filtered by billTab */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <h2 className="font-black text-lg uppercase tracking-tight">Daily Invoices</h2>
                <span className={cn(
                  'text-[10px] font-black uppercase px-2 py-1 rounded-full border',
                  billTab === 'private'
                    ? 'bg-red-500/10 border-red-500/30 text-red-500'
                    : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600'
                )}>
                  {billTab === 'private' ? '🔒 Private' : '🌐 Public'}
                </span>
              </div>

              <div className={cn(
                'rounded-2xl overflow-hidden shadow-xl transition-all',
                billTab === 'private'
                  ? 'border-2 border-red-500 bg-[#1e0a0a]'
                  : 'border border-border/5 bg-card'
              )}>
                {billTab === 'private' && (
                  <div className="flex items-center gap-2 px-5 py-3 border-b-2 border-red-500 bg-red-600/10">
                    <Lock className="w-3.5 h-3.5 text-red-400" />
                    <span className="text-[10px] font-black text-red-400 uppercase tracking-[0.2em]">Private Vault — Confidential</span>
                  </div>
                )}
                <table className="w-full text-sm">
                  <thead>
                    <tr className={cn(
                      'border-b',
                      billTab === 'private' ? 'bg-red-500/5 border-red-500/20' : 'bg-muted/30 border-border/50'
                    )}>
                      <th className="text-left p-4 font-black text-[10px] uppercase tracking-widest text-muted-foreground">Bill No</th>
                      <th className="text-left p-4 font-black text-[10px] uppercase tracking-widest text-muted-foreground">Customer</th>
                      <th className="text-right p-4 font-black text-[10px] uppercase tracking-widest text-muted-foreground">Collected</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices
                      .filter(i => i.createdAt.startsWith(selectedDate))
                      .filter(i => billTab === 'private' ? i.isPrivate : !i.isPrivate)
                      .map(inv => (
                        <tr
                          key={inv.id}
                          className={cn(
                            'border-b last:border-0 transition-all',
                            inv.isPrivate
                              ? 'border-red-500/20 hover:bg-red-500/[0.05]'
                              : 'border-border/10 hover:bg-muted/10'
                          )}
                          style={inv.isPrivate ? { borderLeft: '3px solid #ef4444' } : {}}
                        >
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              {inv.isPrivate && <Lock className="w-3 h-3 text-red-400 shrink-0" />}
                              {inv.isImp && (
                                <span className="px-1 py-0.5 rounded bg-amber-500/10 text-amber-600 text-[8px] font-black uppercase tracking-wider border border-amber-500/20 shrink-0 select-none">
                                  IMP
                                </span>
                              )}
                              <span className={cn('font-black', inv.isPrivate ? 'text-red-300' : 'text-foreground')}>{inv.invoiceNumber}</span>
                            </div>
                          </td>
                          <td className={cn('p-4 font-medium', inv.isPrivate ? 'text-red-200' : 'text-muted-foreground')}>{inv.customerName}</td>
                          <td className="p-4 text-right font-black text-success tabular-nums">{fmt((inv.cashAmount || 0) + (inv.onlineAmount || 0))}</td>
                        </tr>
                      ))}
                    {invoices.filter(i => i.createdAt.startsWith(selectedDate) && (billTab === 'private' ? i.isPrivate : !i.isPrivate)).length === 0 && (
                      <tr><td colSpan={3} className="p-12 text-center text-muted-foreground font-medium italic opacity-60">
                        {billTab === 'private' ? '🔒 No private bills for this date' : 'No public sales record for this date'}
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <h2 className="font-black text-lg uppercase tracking-tight">Daily Costing</h2>
              </div>
              <div className="bg-card rounded-2xl border border-border/5 shadow-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/30 border-b border-border/50">
                      <th className="text-left p-4 font-black text-[10px] uppercase tracking-widest text-muted-foreground">Description</th>
                      <th className="text-left p-4 font-black text-[10px] uppercase tracking-widest text-muted-foreground">Source</th>
                      <th className="text-right p-4 font-black text-[10px] uppercase tracking-widest text-muted-foreground">Expense</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.filter((e: any) => e.date.startsWith(selectedDate)).map((exp: any) => (
                      <tr key={exp.id} className="border-b border-border/10 last:border-0 hover:bg-muted/10">
                        <td className="p-4 font-black text-foreground">{exp.description}</td>
                        <td className="p-4 text-muted-foreground font-medium flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-muted rounded text-[10px] font-bold uppercase tracking-wider">{exp.category}</span>
                          Expense
                        </td>
                        <td className="p-4 text-right font-black text-destructive tabular-nums">{fmt(exp.amount)}</td>
                      </tr>
                    ))}
                    {expenses.filter((e: any) => e.date.startsWith(selectedDate)).length === 0 && (
                      <tr><td colSpan={3} className="p-12 text-center text-muted-foreground font-medium italic opacity-60">No costing record for this date</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BILL TAB PASSWORD MODAL */}
      {showBillTabPassword && (
        <div className="fixed inset-0 bg-background/60 backdrop-blur-2xl z-[100] flex items-center justify-center p-4">
          <div className="bg-card border border-red-500/30 shadow-[0_0_80px_-20px_rgba(239,68,68,0.4)] rounded-3xl w-full max-w-sm p-8 relative animate-fade-up">
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 bg-red-600 rounded-2xl flex items-center justify-center shadow-lg shadow-red-500/30">
              <KeyRound className="w-6 h-6 text-white" />
            </div>
            <button onClick={() => setShowBillTabPassword(false)} className="absolute top-4 right-4 p-2 rounded-xl hover:bg-muted transition-colors">
              <X className="w-4 h-4" />
            </button>
            <div className="mt-4 text-center mb-8">
              <h3 className="text-xl font-black uppercase tracking-tight">Private Access</h3>
              <p className="text-xs text-muted-foreground mt-2 font-medium">Enter your password to view confidential bills</p>
            </div>
            <div className="space-y-4">
              <input
                type="password"
                value={billTabPassword}
                onChange={e => { setBillTabPassword(e.target.value); setBillTabPasswordError(''); }}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    if (billTabPassword === PRIVATE_EXPORT_PASSWORD) {
                      setShowBillTabPassword(false);
                      setBillTab('private');
                    } else {
                      setBillTabPasswordError('Incorrect password. Please try again.');
                    }
                  }
                }}
                placeholder="Enter password"
                autoFocus
                className="w-full px-5 py-4 rounded-2xl border border-border/50 bg-background/50 text-sm font-bold tracking-widest focus:outline-none focus:ring-4 focus:ring-red-500/20 focus:border-red-500/50 transition-all text-center"
              />
              {billTabPasswordError && (
                <p className="text-xs font-bold text-red-500 text-center animate-fade-up">{billTabPasswordError}</p>
              )}
              <button
                onClick={() => {
                  if (billTabPassword === PRIVATE_EXPORT_PASSWORD) {
                    setShowBillTabPassword(false);
                    setBillTab('private');
                  } else {
                    setBillTabPasswordError('Incorrect password. Please try again.');
                  }
                }}
                className="w-full py-4 bg-red-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.25em] shadow-lg shadow-red-500/30 hover:opacity-90 active:scale-95 transition-all"
              >
                Unlock Private Bills
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MANUAL COSTING ENTRY MODAL */}
      {showForm && (
        <div className="fixed inset-0 bg-background/90 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-card border border-border/30 shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] rounded-3xl w-full max-w-sm p-8 animate-scale-in">
            <div className="flex items-center justify-between mb-8">
              <h2 className="font-black text-xl uppercase tracking-tight">Add Daily Cost</h2>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-full hover:bg-muted transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAddCost} className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-muted-foreground uppercase mb-2 block tracking-[0.2em] px-1">Description</label>
                <input
                  type="text" value={newItemName} onChange={e => setNewItemName(e.target.value)}
                  placeholder="e.g. Electricity, Rent" required
                  className="w-full px-5 py-4 rounded-2xl border border-input bg-background/50 focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-bold"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-muted-foreground uppercase mb-2 block tracking-[0.2em] px-1">Amount (₹)</label>
                <input
                  type="number" value={newItemPrice} onChange={e => setNewItemPrice(e.target.value)}
                  placeholder="0.00" required
                  className="w-full px-5 py-4 rounded-2xl border border-input bg-background/50 focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-black text-lg tabular-nums"
                />
              </div>
              <button type="submit" className="w-full py-5 bg-destructive text-white rounded-2xl font-black text-xs uppercase tracking-[0.25em] hover:opacity-90 shadow-2xl shadow-destructive/20 transition-all active:scale-[0.98]">
                Save Daily Costing
              </button>
            </form>
          </div>
        </div>
      )}

      {/* PRINT ONLY SECTION */}
      {createPortal(
        <div className="hidden print:block print-only w-full max-w-[800px] mx-auto p-8 bg-white text-black font-sans text-xs">
        {/* Header */}
        <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-6">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-black uppercase">PhotoBill Pro</h1>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">Premium Billing System</p>
          </div>
          <div className="text-right">
            <h2 className="text-sm font-black uppercase tracking-wider text-gray-800">Daily Performance Report</h2>
            <p className="text-xs font-bold text-gray-600 mt-1">{formattedPrintDate}</p>
            <span className={`inline-block mt-2 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
              billTab === 'private' ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-green-100 text-green-800 border border-green-200'
            }`}>
              {billTab === 'private' ? 'Confidential - Private' : 'Official - Public'}
            </span>
          </div>
        </div>

        {/* Financial Metrics Summary */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="p-4 rounded-xl border border-gray-300 bg-gray-50/50">
            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Total Collections</p>
            <p className="text-lg font-black text-black">{fmt(activeStats.collections)}</p>
            <p className="text-[8px] font-bold text-gray-500 mt-2">From {activeStats.invoiceCount} invoices</p>
          </div>
          <div className="p-4 rounded-xl border border-gray-300 bg-gray-50/50">
            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Total Costing</p>
            <p className="text-lg font-black text-black">{fmt(activeStats.costing)}</p>
            <p className="text-[8px] font-bold text-gray-500 mt-2">From {activeStats.purchaseCount} items</p>
          </div>
          <div className={`p-4 rounded-xl border ${
            activeStats.profit >= 0 ? 'border-green-300 bg-green-50/30' : 'border-red-300 bg-red-50/30'
          }`}>
            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Net Balance</p>
            <p className={`text-lg font-black ${activeStats.profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>{fmt(activeStats.profit)}</p>
            <p className="text-[8px] font-bold text-gray-500 mt-2">Daily Revenue Surplus</p>
          </div>
        </div>

        {/* Detailed breakdown */}
        <div className="grid grid-cols-2 gap-6 border-b border-gray-300 pb-6 mb-6">
          {/* Daily Invoices */}
          <div>
            <div className="flex items-center gap-1.5 border-b border-gray-400 pb-2 mb-3">
              <span className="w-1.5 h-3.5 bg-black rounded-full" />
              <h3 className="font-black text-xs uppercase tracking-wider text-black">Invoices</h3>
            </div>
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-300">
                  <th className="py-1.5 font-bold text-[9px] uppercase tracking-wider text-gray-500">Bill No</th>
                  <th className="py-1.5 font-bold text-[9px] uppercase tracking-wider text-gray-500">Customer</th>
                  <th className="py-1.5 font-bold text-[9px] uppercase tracking-wider text-gray-500 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {invoices
                  .filter(i => i.createdAt.startsWith(selectedDate))
                  .filter(i => billTab === 'private' ? i.isPrivate : !i.isPrivate)
                  .map(inv => (
                    <tr key={inv.id}>
                      <td className="py-2 font-bold text-gray-800">
                        <div className="flex items-center gap-1.5">
                          {inv.isImp && (
                            <span className="px-1 py-0.5 rounded bg-amber-500/10 text-amber-600 text-[7px] font-black uppercase tracking-wider border border-amber-500/20 shrink-0 select-none">
                              IMP
                            </span>
                          )}
                          <span>{inv.invoiceNumber}</span>
                        </div>
                      </td>
                      <td className="py-2 text-gray-600 font-medium">{inv.customerName}</td>
                      <td className="py-2 text-right font-bold text-black">{fmt((inv.cashAmount || 0) + (inv.onlineAmount || 0))}</td>
                    </tr>
                  ))}
                {invoices.filter(i => i.createdAt.startsWith(selectedDate) && (billTab === 'private' ? i.isPrivate : !i.isPrivate)).length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-gray-400 italic">
                      No invoices recorded
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Daily Costing */}
          <div>
            <div className="flex items-center gap-1.5 border-b border-gray-400 pb-2 mb-3">
              <span className="w-1.5 h-3.5 bg-black rounded-full" />
              <h3 className="font-black text-xs uppercase tracking-wider text-black">Costing & Expenses</h3>
            </div>
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-300">
                  <th className="py-1.5 font-bold text-[9px] uppercase tracking-wider text-gray-500">Description</th>
                  <th className="py-1.5 font-bold text-[9px] uppercase tracking-wider text-gray-500">Category</th>
                  <th className="py-1.5 font-bold text-[9px] uppercase tracking-wider text-gray-500 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {expenses
                  .filter((e: any) => e.date.startsWith(selectedDate))
                  .map((exp: any) => (
                    <tr key={exp.id}>
                      <td className="py-2 font-bold text-gray-800">{exp.description}</td>
                      <td className="py-2 text-gray-600 font-medium">{exp.category}</td>
                      <td className="py-2 text-right font-bold text-black">{fmt(exp.amount)}</td>
                    </tr>
                  ))}
                {expenses.filter((e: any) => e.date.startsWith(selectedDate)).length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-gray-400 italic">
                      No expenses recorded
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer info / signatures */}
        <div className="flex justify-between items-end mt-12 pt-4">
          <div className="text-[9px] text-gray-500 leading-normal">
            <p className="font-bold">Printed On: {new Date().toLocaleString('en-IN')}</p>
            <p className="mt-1">Generated securely via PhotoBill Pro Dashboard.</p>
            <p className="text-[8px] text-gray-400 mt-2">© {new Date().getFullYear()} PhotoBill Pro. All rights reserved.</p>
          </div>
          <div className="text-center w-40 border-t border-black pt-2">
            <p className="font-bold text-[10px] text-black uppercase tracking-wider">Authorized Signatory</p>
          </div>
        </div>
      </div>,
      document.body
    )}
    </div>
  );
}
