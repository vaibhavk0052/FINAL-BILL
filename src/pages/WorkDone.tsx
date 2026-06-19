import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  ClipboardList, User, Calendar, Printer, CheckCircle, 
  CircleDollarSign, FileText, ChevronRight, RefreshCw, Sparkles 
} from 'lucide-react';
import { toast } from 'sonner';
import { getEmployees, type Employee } from '@/firebase/firestore';
import { useInvoices, type Invoice } from '@/contexts/InvoiceContext';

const fmt = (n: number) => '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 0 });

export default function WorkDone() {
  const { invoices } = useInvoices();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmpId, setSelectedEmpId] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [loading, setLoading] = useState(true);

  // Subscribe to employees roster feed
  useEffect(() => {
    let unsubscribe = () => {};
    const initFeed = async () => {
      try {
        setLoading(true);
        unsubscribe = await getEmployees((data) => {
          // Filter out system default users to show only real employees
          const filtered = data.filter(
            e => e.id !== 'mock-superadmin-uid' && e.id !== 'mock-admin-uid'
          );
          setEmployees(filtered);
          setLoading(false);
        });
      } catch (err) {
        console.error("Failed to load employees:", err);
        toast.error("Failed to load employees list");
        setLoading(false);
      }
    };
    initFeed();
    return () => unsubscribe();
  }, []);

  // Find selected employee details
  const selectedEmp = useMemo(() => {
    return employees.find(e => e.id === selectedEmpId) || null;
  }, [employees, selectedEmpId]);

  // Filter bills marked work done by the selected employee in the selected month
  const filteredInvoices = useMemo(() => {
    if (!selectedEmp) return [];
    return invoices.filter(inv => {
      // Must be marked as work done
      if (!inv.isWorkDone) return false;

      // Match employee name case-insensitively
      const matchesEmp = inv.workDoneBy?.toLowerCase() === selectedEmp.name.toLowerCase();
      if (!matchesEmp) return false;

      // Extract year-month from workDoneAt or fallback to createdAt
      const dateStr = inv.workDoneAt || inv.createdAt || inv.date || '';
      const billMonth = dateStr.slice(0, 7); // returns "YYYY-MM"
      return billMonth === selectedMonth;
    });
  }, [invoices, selectedEmp, selectedMonth]);

  // Calculate stats
  const totalBillsCount = filteredInvoices.length;
  const totalAmountSum = filteredInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);

  const handlePrint = () => {
    if (!selectedEmp) {
      toast.error("Please select an employee first");
      return;
    }
    if (filteredInvoices.length === 0) {
      if (!window.confirm("There are no bills for the selected employee in this month. Print empty report anyway?")) {
        return;
      }
    }
    window.print();
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  // Human readable month name
  const monthLabel = useMemo(() => {
    const [year, month] = selectedMonth.split('-');
    const date = new Date(Number(year), Number(month) - 1, 2);
    return date.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
  }, [selectedMonth]);

  return (
    <div className="space-y-8 no-print">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-up">
        <div className="space-y-1">
          <h1 className="text-2xl font-black tracking-tight text-foreground uppercase italic px-2 border-l-8 border-primary leading-none flex items-center gap-3">
            <ClipboardList className="w-7 h-7 text-primary animate-pulse" />
            Work Done Tracker
          </h1>
          <p className="text-sm text-muted-foreground pl-3">Monitor completed employee tasks and calculate salaries</p>
        </div>

        {/* Status indicator */}
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-black uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" />
          Owner Portal
        </div>
      </div>

      {/* Control panel & summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-up" style={{ animationDelay: '50ms' }}>
        {/* Filters Card */}
        <div className="lg:col-span-2 bg-card rounded-3xl border border-border/50 shadow-card p-6 flex flex-col gap-6">
          <div className="flex items-center gap-3 pb-3 border-b border-border/40">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-white shadow-md shadow-pink-500/10">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-base text-foreground">Select Filter Criteria</h2>
              <p className="text-xs text-muted-foreground">Select employee and work period month</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Employee Dropdown */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">Choose Employee</label>
              {loading ? (
                <div className="flex items-center gap-2 px-3 py-2 border border-border/50 rounded-xl bg-muted/50 text-xs text-muted-foreground">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary" />
                  Loading Employee List...
                </div>
              ) : (
                <select
                  value={selectedEmpId}
                  onChange={e => setSelectedEmpId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-input bg-background/50 focus:outline-none focus:ring-2 focus:ring-ring/20 text-xs font-black uppercase tracking-wider cursor-pointer transition-all"
                >
                  <option value="" className="text-slate-400">-- Choose Employee --</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id} className="text-slate-800 font-semibold">{emp.name}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Month Calendar Picker */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">Select Month</label>
              <div className="relative">
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(e.target.value)}
                  className="w-full px-3 py-2.5 pl-10 rounded-xl border border-input bg-background/50 focus:outline-none focus:ring-2 focus:ring-ring/20 text-xs font-black uppercase tracking-wider cursor-pointer transition-all"
                />
                <Calendar className="w-4 h-4 text-muted-foreground absolute left-3.5 top-3.5 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Metrics/Salary Calculation Card */}
        <div className="bg-card rounded-3xl border border-border/50 shadow-card p-6 flex flex-col justify-between gap-6">
          <div className="flex items-center gap-3 pb-3 border-b border-border/40">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-indigo-500/10">
              <CircleDollarSign className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-base text-foreground">Monthly Tally</h2>
              <p className="text-xs text-muted-foreground">Salary calculation reference</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center bg-muted/40 p-3.5 rounded-2xl border border-border/20">
              <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">Work Done Bills</span>
              <span className="text-lg font-black text-foreground tabular-nums">{totalBillsCount}</span>
            </div>

            <div className="flex justify-between items-center bg-primary/5 p-3.5 rounded-2xl border border-primary/10">
              <span className="text-xs font-black uppercase tracking-wider text-primary">Total Work Amount</span>
              <span className="text-xl font-black text-primary tabular-nums">{fmt(totalAmountSum)}</span>
            </div>
          </div>

          <button
            onClick={handlePrint}
            disabled={!selectedEmp}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 hover:opacity-90 active:scale-98 text-white font-bold text-xs uppercase tracking-widest shadow-md hover:shadow-lg shadow-pink-500/15 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
          >
            <Printer className="w-4 h-4" />
            Print Work Report
          </button>
        </div>
      </div>

      {/* Main List Section */}
      <div className="bg-card rounded-3xl border border-border/50 shadow-xl overflow-hidden animate-fade-up" style={{ animationDelay: '100ms' }}>
        <div className="px-6 py-4 border-b border-border/50 bg-muted/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-5 rounded-full bg-primary" />
            <h3 className="font-bold text-foreground text-sm uppercase tracking-wider">
              {selectedEmp ? `${selectedEmp.name}'s completed bills` : 'Employee Completed Bills'}
            </h3>
          </div>
          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest bg-muted px-2.5 py-1 rounded-full border">
            {monthLabel}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-muted/20">
                <th className="text-left px-6 py-4 font-black text-[10px] uppercase tracking-widest text-muted-foreground w-16">Sr.</th>
                <th className="text-left px-6 py-4 font-black text-[10px] uppercase tracking-widest text-muted-foreground">Bill Date</th>
                <th className="text-left px-6 py-4 font-black text-[10px] uppercase tracking-widest text-muted-foreground">Bill Number</th>
                <th className="text-left px-6 py-4 font-black text-[10px] uppercase tracking-widest text-muted-foreground">Customer Name</th>
                <th className="text-right px-6 py-4 font-black text-[10px] uppercase tracking-widest text-muted-foreground">Total Bill Amount</th>
              </tr>
            </thead>
            <tbody>
              {!selectedEmp ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-muted-foreground/60 font-black uppercase tracking-widest italic text-xs">
                    💡 Select an employee and month above to display completed work
                  </td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-muted-foreground/50 font-black uppercase tracking-widest italic text-xs">
                    📭 No completed work found for {selectedEmp.name} in {monthLabel}
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv, idx) => (
                  <tr key={inv.id} className="border-b border-border/30 last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-3.5 font-bold text-muted-foreground tabular-nums">{idx + 1}</td>
                    <td className="px-6 py-3.5 text-muted-foreground font-semibold tabular-nums">
                      {formatDate(inv.workDoneAt || inv.createdAt || inv.date)}
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-2 font-black text-foreground">
                        <FileText className="w-3.5 h-3.5 text-primary" />
                        {inv.invoiceNumber}
                      </div>
                    </td>
                    <td className="px-6 py-3.5 font-medium text-foreground">{inv.customerName || 'Walk-in Customer'}</td>
                    <td className="px-6 py-3.5 text-right font-black tabular-nums text-foreground">{fmt(inv.totalAmount)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Hidden Portal for Clean Printing Layout */}
      {selectedEmp && createPortal(
        <div className="print-only p-8 bg-white text-black font-sans leading-relaxed text-sm">
          {/* Header */}
          <div className="flex items-start justify-between border-b-2 border-black pb-4 mb-6">
            <div className="flex flex-col">
              <span className="font-extrabold text-2xl tracking-tight text-black uppercase">Sachin Ghongade</span>
              <span className="text-xs font-bold text-gray-700 tracking-widest uppercase">Photo & Films Studio</span>
              <p className="text-[9px] text-gray-500 mt-1 leading-normal max-w-xs">
                State Bank Building, Below SVC Bank, Near Vishrambag Ganpati Temple, Sangli 416415
                <br />📞 9130053081 / 9422427981
              </p>
            </div>
            <div className="text-right">
              <h1 className="text-lg font-black tracking-wide uppercase text-black">Employee Monthly Work Done Report</h1>
              <p className="text-xs font-bold text-gray-700 mt-1">Period: {monthLabel}</p>
              <p className="text-[9px] text-gray-500 mt-0.5">Report Generated: {new Date().toLocaleDateString('en-IN')} {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</p>
            </div>
          </div>

          {/* Employee & Record Details */}
          <div className="bg-gray-100 p-4 rounded-xl border border-gray-300 mb-6 grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Employee Name</p>
              <p className="font-bold text-base text-black mt-0.5">{selectedEmp.name}</p>
              <p className="text-[10px] text-gray-600 mt-0.5">Role: {selectedEmp.role} | Status: {selectedEmp.status}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Contact Information</p>
              <p className="font-semibold text-black mt-0.5">📞 {selectedEmp.phone}</p>
              <p className="text-[10px] text-gray-600 mt-0.5">{selectedEmp.email}</p>
            </div>
          </div>

          {/* Table */}
          <table className="w-full text-left border-collapse text-xs mb-8">
            <thead>
              <tr className="border-b border-gray-800 text-[10px] font-bold uppercase tracking-wider text-black">
                <th className="py-2 w-12 text-center">Sr.</th>
                <th className="py-2">Date Completed</th>
                <th className="py-2">Invoice / Bill Number</th>
                <th className="py-2">Customer Name</th>
                <th className="py-2 text-right">Bill Amount</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-gray-500 italic">No completed work found for this month.</td>
                </tr>
              ) : (
                filteredInvoices.map((inv, idx) => (
                  <tr key={inv.id} className="border-b border-gray-200 text-black">
                    <td className="py-2 text-center">{idx + 1}</td>
                    <td className="py-2">{formatDate(inv.workDoneAt || inv.createdAt || inv.date)}</td>
                    <td className="py-2 font-bold">{inv.invoiceNumber}</td>
                    <td className="py-2 text-gray-700">{inv.customerName || 'Walk-in Customer'}</td>
                    <td className="py-2 text-right font-semibold">{fmt(inv.totalAmount || 0)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Totals & Signatures */}
          <div className="grid grid-cols-2 gap-8 items-start break-inside-avoid">
            {/* Payment Summary */}
            <div className="bg-gray-50 border border-gray-300 rounded-xl p-4 space-y-2 text-xs">
              <h3 className="font-bold text-black uppercase tracking-wider text-[10px] border-b border-gray-200 pb-1.5">Salary Calculation Summary</h3>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Work Done Bills:</span>
                <span className="font-bold text-black">{totalBillsCount} bills</span>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-2 font-bold text-sm">
                <span className="text-black">Total Amount Completed:</span>
                <span className="text-black">{fmt(totalAmountSum)}</span>
              </div>
            </div>

            {/* Signature Box */}
            <div className="flex flex-col justify-between h-full pt-4">
              <div className="flex justify-between text-[10px] text-gray-600">
                <div className="text-center">
                  <div className="h-12 w-32 border-b border-black"></div>
                  <p className="mt-1.5 font-bold text-black">Employee Signature</p>
                  <p className="text-[8px] text-gray-400">Date: ____/____/________</p>
                </div>
                <div className="text-center">
                  <div className="h-12 w-32 border-b border-black"></div>
                  <p className="mt-1.5 font-bold text-black">Authorized Signatory</p>
                  <p className="text-[8px] text-gray-400">Date: ____/____/________</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer note */}
          <div className="border-t border-gray-200 pt-4 mt-8 text-center text-[9px] text-gray-400">
            <p className="font-bold text-gray-500 uppercase tracking-widest">Sachin Ghongade Photo & Films</p>
            <p className="italic">This statement represents verified logs from PhotoBill Pro billing system database.</p>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
