import { useInvoices } from '@/contexts/InvoiceContext';
import { usePurchases } from '@/contexts/PurchaseContext';
import { useState, useMemo } from 'react';
import { IndianRupee, TrendingUp, TrendingDown, Wallet, Calendar, Plus, X, FileSpreadsheet, Lock, Globe, ShieldAlert, KeyRound } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const fmt = (n: number) => '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 0 });

export default function DailyReport() {
  const { invoices } = useInvoices();
  const { purchases, addPurchase } = usePurchases();
  const [expenses, setExpenses] = useState(() => {
    const saved = localStorage.getItem('billing_expenses');
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().substring(0, 7)); // YYYY-MM
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState<'daily' | 'monthly'>('daily');
  
  // States for manual costing form
  const [showForm, setShowForm] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');

  // States for Export Modal
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportType, setExportType] = useState<'today' | 'weekly' | 'monthly' | 'yearly' | 'custom'>('today');
  const [exportStartDate, setExportStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [exportEndDate, setExportEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [includePrivate, setIncludePrivate] = useState(false);
  const [privatePassword, setPrivatePassword] = useState('');
  const [privatePasswordError, setPrivatePasswordError] = useState('');

  // Public/Private tab for daily invoices
  const [billTab, setBillTab] = useState<'public' | 'private'>('public');
  const [showBillTabPassword, setShowBillTabPassword] = useState(false);
  const [billTabPassword, setBillTabPassword] = useState('');
  const [billTabPasswordError, setBillTabPasswordError] = useState('');

  const monthlyBreakdown = useMemo(() => {
    const daysInMonth: Record<string, { collections: number, costing: number, profit: number }> = {};
    
    // Filter by selected month
    const monthInvoices = invoices.filter(inv => inv.createdAt.startsWith(selectedMonth));
    const monthPurchases = purchases.filter(pur => pur.date.startsWith(selectedMonth));
    const monthExpenses = expenses.filter((exp: any) => exp.date.startsWith(selectedMonth));

    monthInvoices.forEach(inv => {
      const date = inv.createdAt.split('T')[0];
      if (!daysInMonth[date]) daysInMonth[date] = { collections: 0, costing: 0, profit: 0 };
      daysInMonth[date].collections += (inv.cashAmount || 0) + (inv.onlineAmount || 0);
    });

    monthPurchases.forEach(pur => {
      const date = pur.date;
      if (!daysInMonth[date]) daysInMonth[date] = { collections: 0, costing: 0, profit: 0 };
      daysInMonth[date].costing += (pur.totalAmount || 0);
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
  }, [invoices, purchases, expenses, selectedMonth]);

  const monthlyTotals = useMemo(() => {
    return monthlyBreakdown.reduce((sum, day) => ({
      collections: sum.collections + day.collections,
      costing: sum.costing + day.costing,
      profit: sum.profit + day.profit
    }), { collections: 0, costing: 0, profit: 0 });
  }, [monthlyBreakdown]);

  const publicDailyStats = useMemo(() => {
    const dailyInvoices = invoices.filter(inv => inv.createdAt.startsWith(selectedDate) && !inv.isPrivate);
    const dailyPurchases = purchases.filter(pur => pur.date.startsWith(selectedDate));
    const dailyExpenses = expenses.filter((exp: any) => exp.date === selectedDate);
    const collections = dailyInvoices.reduce((sum, inv) => sum + (inv.cashAmount || 0) + (inv.onlineAmount || 0), 0);
    const costing = dailyPurchases.reduce((sum, pur) => sum + (pur.totalAmount || 0), 0) + dailyExpenses.reduce((sum: number, exp: any) => sum + (exp.amount || 0), 0);
    return { collections, costing, profit: collections - costing, invoiceCount: dailyInvoices.length, purchaseCount: dailyPurchases.length + dailyExpenses.length, invoices: dailyInvoices, purchases: dailyPurchases, expenses: dailyExpenses };
  }, [invoices, purchases, expenses, selectedDate]);

  const privateDailyStats = useMemo(() => {
    const dailyInvoices = invoices.filter(inv => inv.createdAt.startsWith(selectedDate) && inv.isPrivate);
    const dailyPurchases = purchases.filter(pur => pur.date.startsWith(selectedDate));
    const dailyExpenses = expenses.filter((exp: any) => exp.date === selectedDate);
    const collections = dailyInvoices.reduce((sum, inv) => sum + (inv.cashAmount || 0) + (inv.onlineAmount || 0), 0);
    const costing = dailyPurchases.reduce((sum, pur) => sum + (pur.totalAmount || 0), 0) + dailyExpenses.reduce((sum: number, exp: any) => sum + (exp.amount || 0), 0);
    return { collections, costing, profit: collections - costing, invoiceCount: dailyInvoices.length, purchaseCount: dailyPurchases.length + dailyExpenses.length, invoices: dailyInvoices, purchases: dailyPurchases, expenses: dailyExpenses };
  }, [invoices, purchases, expenses, selectedDate]);

  // dailyStats kept for backward compatibility
  const dailyStats = publicDailyStats;

  const PRIVATE_EXPORT_PASSWORD = '123456';

  const runExportData = (start: string, end: string, label: string) => {
    const filteredInvoices = invoices.filter(i => {
      const d = i.createdAt.split('T')[0];
      const inRange = d >= start && d <= end;
      if (!inRange) return false;
      // Exclude private bills unless password unlocked
      if (i.isPrivate && !includePrivate) return false;
      return true;
    });
    const filteredPurchases = purchases.filter(p => {
      const d = p.date;
      return d >= start && d <= end;
    });
    const filteredExpenses = expenses.filter((e: any) => {
      const d = e.date;
      return d >= start && d <= end;
    });

    if (filteredInvoices.length === 0 && filteredPurchases.length === 0 && filteredExpenses.length === 0) {
      toast.error("No data found for the selected range");
      return;
    }

    const privacyNote = includePrivate ? 'INCLUDES PRIVATE DATA' : 'PUBLIC DATA ONLY';
    let csvContent = "\uFEFF"; 
    csvContent += `EXCEL REPORT: ${label} [${privacyNote}]\n`;
    csvContent += `Generated On: ${new Date().toLocaleString('en-IN')}\n\n`;

    csvContent += "--- COLLECTIONS ---\n";
    csvContent += "Date,Bill No,Customer,Visibility,Amount (₹)\n";
    filteredInvoices.forEach(inv => {
      csvContent += `${inv.createdAt.split('T')[0]},${inv.invoiceNumber},${inv.customerName},${inv.isPrivate ? 'PRIVATE' : 'PUBLIC'},${(inv.cashAmount || 0) + (inv.onlineAmount || 0)}\n`;
    });
    const totalColl = filteredInvoices.reduce((s, i) => s + (i.cashAmount || 0) + (i.onlineAmount || 0), 0);
    csvContent += `TOTAL COLLECTIONS,,,,${totalColl}\n\n`;

    csvContent += "--- COSTING ---\n";
    csvContent += "Date,Description,Source,Amount (₹)\n";
    filteredPurchases.forEach(pur => {
      csvContent += `${pur.date},${pur.itemName},${pur.supplierName},${pur.totalAmount}\n`;
    });
    filteredExpenses.forEach((exp: any) => {
      csvContent += `${exp.date},${exp.description},Expense Area,${exp.amount}\n`;
    });
    const totalCost = filteredPurchases.reduce((s, p) => s + p.totalAmount, 0) + filteredExpenses.reduce((s: number, e: any) => s + e.amount, 0);
    csvContent += `TOTAL COSTING,,,${totalCost}\n\n`;

    csvContent += `FINAL SUMMARY\n`;
    csvContent += `Collections,${totalColl}\n`;
    csvContent += `Costing,${totalCost}\n`;
    csvContent += `Net Balance,${totalColl - totalCost}\n`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Report_${label.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`${label} report exported successfully`);
    setShowExportModal(false);
    setIncludePrivate(false);
    setPrivatePassword('');
  };

  const handleDetailedExport = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    
    if (exportType === 'today') {
      runExportData(todayStr, todayStr, `Daily Report ${todayStr}`);
    } else if (exportType === 'weekly') {
      const now = new Date();
      const day = now.getDay(); // 0: Sun, 1: Mon, ...
      const diffToMonday = (day === 0 ? -6 : 1 - day);
      
      const monday = new Date(now);
      monday.setDate(now.getDate() + diffToMonday);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      
      const start = monday.toISOString().split('T')[0];
      const end = sunday.toISOString().split('T')[0];
      runExportData(start, end, `Weekly Report ${start} to ${end}`);
    } else if (exportType === 'monthly') {
      const start = selectedMonth + "-01";
      // Get last day of selected month
      const parts = selectedMonth.split('-');
      const lastDay = new Date(Number(parts[0]), Number(parts[1]), 0).getDate();
      const end = `${selectedMonth}-${lastDay}`;
      runExportData(start, end, `Monthly Report ${selectedMonth}`);
    } else if (exportType === 'yearly') {
      const year = selectedMonth.substring(0, 4);
      runExportData(`${year}-01-01`, `${year}-12-31`, `Yearly Report ${year}`);
    } else if (exportType === 'custom') {
      runExportData(exportStartDate, exportEndDate, `Custom Report ${exportStartDate} to ${exportEndDate}`);
    }
  };

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

    const saved = localStorage.getItem('billing_expenses');
    const existingExpenses = saved ? JSON.parse(saved) : [];
    const updatedExpenses = [newExpense, ...existingExpenses];
    
    localStorage.setItem('billing_expenses', JSON.stringify(updatedExpenses));
    setExpenses(updatedExpenses);
    
    toast.success('Cost recorded successfully as Expense');

    setNewItemName('');
    setNewItemPrice('');
    setShowForm(false);
  };

  const monthName = new Date(selectedMonth + "-01").toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  const monthlyArchives = useMemo(() => {
    const months = new Set<string>();
    invoices.forEach(inv => months.add(inv.createdAt.substring(0, 7)));
    purchases.forEach(pur => months.add(pur.date.substring(0, 7)));
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
            <h1 className="text-3xl font-black tracking-tight text-foreground uppercase italic px-2 border-l-8 border-primary leading-none">Financial Reports</h1>
            <button 
              onClick={() => setShowExportModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
            >
              <FileSpreadsheet className="w-4 h-4" /> Excel Export
            </button>
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

      {/* EXCEL EXPORT MODAL - PREMIUM REDESIGN */}
      {showExportModal && (
        <div className="fixed inset-0 bg-background/40 backdrop-blur-3xl z-[100] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card/70 border border-white/20 shadow-[0_32px_120px_-20px_rgba(0,0,0,0.3)] rounded-[2.5rem] w-full max-w-lg p-10 animate-fade-in relative overflow-hidden backdrop-saturate-150">
             {/* Decorative Background Elements */}
             <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/10 blur-3xl rounded-full" />
             <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-primary/10 blur-3xl rounded-full" />

             <div className="flex items-center justify-between mb-10 relative">
               <div>
                  <h2 className="text-2xl font-black uppercase tracking-tight italic flex items-center gap-3 text-foreground">
                    <div className="bg-emerald-500/10 p-2.5 rounded-2xl">
                      <FileSpreadsheet className="w-7 h-7 text-emerald-500" />
                    </div>
                    Report Export
                  </h2>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1 opacity-70">Generate professional Excel documents</p>
               </div>
               <button onClick={() => setShowExportModal(false)} className="p-3 rounded-2xl hover:bg-muted/50 border border-transparent hover:border-border/50 transition-all group">
                 <X className="w-5 h-5 text-muted-foreground group-hover:scale-110 transition-transform" />
               </button>
             </div>
             
             <div className="space-y-8 relative">
                <div>
                  <label className="text-[10px] font-black text-muted-foreground uppercase mb-4 block tracking-[0.25em] px-1 opacity-50">Choose Export Mode</label>
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    {[
                      { id: 'today', label: 'Day', sub: 'Today' },
                      { id: 'weekly', label: 'Week', sub: 'Mon - Sun' },
                      { id: 'monthly', label: 'Month', sub: 'Full Report' },
                      { id: 'yearly', label: 'Year', sub: 'Annual Summary' },
                    ].map(opt => (
                      <button 
                        key={opt.id}
                        onClick={() => setExportType(opt.id as any)}
                        className={cn(
                          "relative group flex flex-col items-start p-5 rounded-3xl border transition-all duration-300",
                          exportType === opt.id 
                            ? "bg-primary border-primary text-white shadow-xl shadow-primary/30 -translate-y-1" 
                            : "bg-muted/30 border-transparent hover:border-primary/20 text-foreground"
                        )}
                      >
                        <span className="text-sm font-black uppercase tracking-tighter mb-1">{opt.label}</span>
                        <span className={cn("text-[9px] font-bold uppercase tracking-widest opacity-60", exportType === opt.id ? "text-white" : "")}>{opt.sub}</span>
                      </button>
                    ))}
                    <button 
                      onClick={() => setExportType('custom')}
                      className={cn(
                        "col-span-2 group flex items-center justify-between p-5 rounded-3xl border transition-all duration-300",
                        exportType === 'custom' 
                          ? "bg-emerald-500 border-emerald-500 text-white shadow-xl shadow-emerald-500/30 -translate-y-1" 
                          : "bg-muted/30 border-transparent hover:border-emerald-200 text-foreground"
                      )}
                    >
                      <div className="flex flex-col items-start">
                        <span className="text-sm font-black uppercase tracking-tighter mb-1 leading-none">Custom Date Range</span>
                        <span className={cn("text-[8px] font-bold uppercase tracking-[0.2em] opacity-60", exportType === 'custom' ? "text-white" : "")}>Select specific interval</span>
                      </div>
                      <Calendar className="w-5 h-5 opacity-40 group-hover:opacity-100 transition-opacity" />
                    </button>
                  </div>
                </div>

                {(exportType === 'monthly' || exportType === 'yearly') && (
                  <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
                    {exportType === 'monthly' && (
                      <div>
                        <label className="text-[9px] font-black text-muted-foreground uppercase mb-2 block tracking-widest px-2 opacity-60">Month</label>
                        <div className="relative group">
                          <select 
                            value={selectedMonth.split('-')[1]} 
                            onChange={(e) => setSelectedMonth(`${selectedMonth.substring(0, 4)}-${e.target.value}`)}
                            className="w-full pl-5 pr-10 py-4 rounded-2xl border border-border/50 bg-muted/20 text-sm font-bold cursor-pointer appearance-none focus:ring-4 focus:ring-primary/10 transition-all"
                          >
                            {[
                              { v: '01', l: 'January' }, { v: '02', l: 'February' }, { v: '03', l: 'March' },
                              { v: '04', l: 'April' }, { v: '05', l: 'May' }, { v: '06', l: 'June' },
                              { v: '07', l: 'July' }, { v: '08', l: 'August' }, { v: '09', l: 'September' },
                              { v: '10', l: 'October' }, { v: '11', l: 'November' }, { v: '12', l: 'December' },
                            ].map(m => (
                              <option key={m.v} value={m.v}>{m.l}</option>
                            ))}
                          </select>
                          <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none opacity-40" />
                        </div>
                      </div>
                    )}
                    <div className={cn(exportType === 'yearly' ? "col-span-2" : "")}>
                      <label className="text-[9px] font-black text-muted-foreground uppercase mb-2 block tracking-widest px-2 opacity-60">Year</label>
                      <div className="relative group">
                        <select 
                          value={selectedMonth.substring(0, 4)} 
                          onChange={(e) => setSelectedMonth(`${e.target.value}-${selectedMonth.split('-')[1]}`)}
                          className="w-full pl-5 pr-10 py-4 rounded-2xl border border-border/50 bg-muted/20 text-sm font-bold cursor-pointer appearance-none focus:ring-4 focus:ring-primary/10 transition-all"
                        >
                          {Array.from(new Set(monthlyArchives.map(m => m.id.substring(0, 4)))).map(yr => (
                            <option key={yr} value={yr}>{yr}</option>
                          ))}
                        </select>
                        <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none opacity-40" />
                      </div>
                    </div>
                  </div>
                )}

                {exportType === 'custom' && (
                  <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div>
                      <label className="text-[9px] font-black text-muted-foreground uppercase mb-2 block tracking-widest px-2 opacity-60">Start Date</label>
                      <input type="date" value={exportStartDate} onChange={e => setExportStartDate(e.target.value)} className="w-full px-5 py-4 rounded-2xl border border-border/50 bg-muted/20 text-sm font-bold focus:ring-4 focus:ring-emerald-500/10 transition-all appearance-none" />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-muted-foreground uppercase mb-2 block tracking-widest px-2 opacity-60">End Date</label>
                      <input type="date" value={exportEndDate} onChange={e => setExportEndDate(e.target.value)} className="w-full px-5 py-4 rounded-2xl border border-border/50 bg-muted/20 text-sm font-bold focus:ring-4 focus:ring-emerald-500/10 transition-all appearance-none" />
                    </div>
                  </div>
                )}

                <div className="border-t border-border/20 pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Include Private Bills</p>
                      <p className="text-[9px] text-muted-foreground/50 font-medium mt-0.5">Requires password authentication</p>
                    </div>
                    <button
                      onClick={() => {
                        if (includePrivate) {
                          setIncludePrivate(false);
                          setPrivatePassword('');
                          setPrivatePasswordError('');
                        } else {
                          setIncludePrivate(true);
                          setPrivatePassword('');
                          setPrivatePasswordError('');
                        }
                      }}
                      className={cn(
                        'relative w-12 h-6 rounded-full transition-all duration-300 border',
                        includePrivate ? 'bg-violet-600 border-violet-600' : 'bg-muted border-border'
                      )}
                    >
                      <span className={cn(
                        'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-300',
                        includePrivate ? 'left-6' : 'left-0.5'
                      )} />
                    </button>
                  </div>

                  {includePrivate && (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                      <label className="text-[9px] font-black text-violet-400 uppercase mb-2 block tracking-widest px-1">Enter Private Password</label>
                      <input
                        type="password"
                        value={privatePassword}
                        onChange={e => { setPrivatePassword(e.target.value); setPrivatePasswordError(''); }}
                        placeholder="Enter password to unlock private data"
                        className="w-full px-5 py-3.5 rounded-2xl border border-violet-500/30 bg-violet-500/5 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-violet-500/20 transition-all text-center tracking-widest"
                      />
                      {privatePasswordError && (
                        <p className="text-[10px] font-bold text-rose-500 text-center mt-2">{privatePasswordError}</p>
                      )}
                    </div>
                  )}
                </div>

                <div className="pt-2">
                  <button 
                    onClick={() => {
                      if (includePrivate) {
                        if (privatePassword !== PRIVATE_EXPORT_PASSWORD) {
                          setPrivatePasswordError('Incorrect password. Private data not included.');
                          return;
                        }
                      }
                      handleDetailedExport();
                    }}
                    className="group relative w-full py-5 bg-foreground text-background rounded-3xl font-black text-xs uppercase tracking-[0.3em] shadow-2xl overflow-hidden active:scale-[0.98] transition-all"
                  >
                    <div className={cn("absolute inset-0 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out", includePrivate ? "bg-violet-600" : "bg-emerald-500")} />
                    <span className="relative z-10 flex items-center justify-center gap-2 group-hover:text-white transition-colors duration-300">
                      Generate Excel Report
                    </span>
                  </button>
                  <p className="text-center text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-4 opacity-40 italic">
                    {includePrivate ? '🔒 Private data will be included (password required)' : 'Public data only · .csv format'}
                  </p>
                </div>
             </div>
          </div>
        </div>
      )}

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
                            {purchases.filter(p => p.date.startsWith(selectedDate)).map(pur => (
                                <tr key={pur.id} className="border-b border-border/10 last:border-0 hover:bg-muted/10">
                                    <td className="p-4 font-black text-foreground">{pur.itemName}</td>
                                    <td className="p-4 text-muted-foreground font-medium">{pur.supplierName === 'Manual Entry' ? 'Daily Report' : pur.supplierName}</td>
                                    <td className="p-4 text-right font-black text-destructive tabular-nums">{fmt(pur.totalAmount)}</td>
                                </tr>
                            ))}
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
                            {dailyStats.purchaseCount === 0 && (
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
    </div>
  );
}
