import { useState, Fragment, useEffect } from 'react';
import { useInvoices, type Invoice } from '@/contexts/InvoiceContext';
import { FileText, Pencil, Trash2, CheckCircle, Package, Search, X, Star, MessageSquare, Send, Check, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { getEmployees, type Employee } from '@/firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

const fmt = (n: number) => '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 0 });

export default function SalesHistory() {
  const { invoices, updateInvoice, updateInvoiceStatus, deleteInvoice } = useInvoices();
  const { user } = useAuth();
  const [filter, setFilter] = useState<'all' | 'completed' | 'pending' | 'vip'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [activeWorkDoneInvoiceId, setActiveWorkDoneInvoiceId] = useState<string | null>(null);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkReminderOpen, setBulkReminderOpen] = useState(false);
  const [sentIds, setSentIds] = useState<string[]>([]);

  useEffect(() => {
    let unsub = () => { };
    getEmployees((data) => setEmployees(data)).then(fn => { unsub = fn; }).catch(() => { });
    return () => unsub();
  }, []);

  const actualEmployees = employees.filter(
    e => e.id !== 'mock-superadmin-uid' && e.id !== 'mock-admin-uid'
  );

  // Only show public bills in Sales History
  const publicInvoices = invoices
    .filter(i => !i.isPrivate)
    .filter(i => {
      if (filter === 'vip') return i.isImp;
      return true;
    })
    .filter(i => {
      const query = searchQuery.toLowerCase().trim();
      if (!query) return true;
      return (
        i.customerName?.toLowerCase().includes(query) ||
        i.invoiceNumber?.toLowerCase().includes(query)
      );
    });

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const reminderInvoices = publicInvoices.filter(i => !i.isDelivered && new Date(i.createdAt) < oneWeekAgo);

  const sendReminder = (inv: Invoice) => {
    if (!inv.customerPhone) {
      alert('Cannot send reminder: No phone number saved for this customer.');
      return;
    }

    const dateStr = new Date(inv.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const pendingStr = (inv.remainingAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 });

    const text = `*SACHIN GHONGADE PHOTO & FILMS*\n\nHello ${inv.customerName},\n\nThis is a friendly reminder that your photos/videos are ready for delivery.\n\n *Invoice No:* ${inv.invoiceNumber}\n *Invoice Date:* ${dateStr}\n *Pending Amount:* ₹${pendingStr}\n\nWe have been waiting for your visit to complete the handover. Kindly collect your order at your earliest convenience.\n\nIf there is any pending payment, please clear it before collection.\n\nFor any assistance, feel free to contact us.\n\nThank you for choosing us for your special moments.\n\n *SACHIN GHONGADE PHOTO & FILMS*\n 9422427981 / 9130053081\n\n _Enriching Your Moments Through Creative Photography And Cinematic Storytelling._`;

    const phone = inv.customerPhone.replace(/\D/g, '');
    const finalPhone = phone.length === 10 ? '91' + phone : phone;
    window.open(`https://wa.me/${finalPhone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const renderTableHeader = (isPending?: boolean) => {
    const sectionInvoices = publicInvoices.filter(i => isPending ? i.paymentStatus === 'pending' : i.paymentStatus === 'completed');
    const allSectionSelected = sectionInvoices.length > 0 && sectionInvoices.every(inv => selectedIds.includes(inv.id));
    const toggleSectionAll = () => {
      if (allSectionSelected) {
        setSelectedIds(prev => prev.filter(id => !sectionInvoices.some(i => i.id === id)));
      } else {
        setSelectedIds(prev => {
          const next = [...prev];
          sectionInvoices.forEach(i => {
            if (!next.includes(i.id)) next.push(i.id);
          });
          return next;
        });
      }
    };

    return (
      <thead>
        <tr className="border-b border-border/50 bg-muted/20">
          <th className="px-5 py-4 w-12 text-center shrink-0">
            <input
              type="checkbox"
              checked={allSectionSelected}
              onChange={toggleSectionAll}
              className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer bg-card"
            />
          </th>
          <th className="text-left px-5 py-4 font-medium text-muted-foreground">Invoice #</th>
          <th className="text-left px-5 py-4 font-medium text-muted-foreground">Customer</th>
          <th className="text-right px-5 py-4 font-medium text-muted-foreground">Date</th>
          <th className="text-right px-5 py-4 font-medium text-muted-foreground">Total</th>
          <th className="text-right px-5 py-4 font-medium text-muted-foreground text-amber-600/80">Cash</th>
          <th className="text-right px-5 py-4 font-medium text-muted-foreground text-blue-600/80">Online</th>
          <th className="text-right px-5 py-4 font-medium text-muted-foreground text-primary/80">Advance</th>
          <th className="text-right px-5 py-4 font-medium text-muted-foreground text-destructive/80">Remaining</th>
          <th className="text-center px-5 py-4 font-medium text-muted-foreground">Status</th>
        </tr>
      </thead>
    );
  };

  const renderInvoiceRow = (inv: Invoice) => (
    <Fragment key={inv.id}>
      <tr className={cn("hover:bg-muted/10 transition-colors", selectedIds.includes(inv.id) && "bg-primary/5 hover:bg-primary/10")}>
        <td className="px-5 py-4 text-center shrink-0">
          <input
            type="checkbox"
            checked={selectedIds.includes(inv.id)}
            onChange={() => {
              setSelectedIds(prev =>
                prev.includes(inv.id) ? prev.filter(id => id !== inv.id) : [...prev, inv.id]
              );
            }}
            className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer bg-card"
          />
        </td>
        <td className="px-5 py-4 font-medium text-card-foreground">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            {inv.isImp && (
              <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 text-[8px] font-black uppercase tracking-wider border border-amber-500/20 shrink-0 select-none">
                IMP
              </span>
            )}
            {inv.invoiceNumber}
          </div>
        </td>
        <td className="px-5 py-4">
          <div className="flex flex-col gap-0.5">
            <span className="font-medium text-card-foreground">{inv.customerName}</span>
            {inv.isWorkDone && (
              <span className="inline-flex items-center gap-1 text-[9px] font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 px-1.5 py-0.5 rounded w-fit select-none">
                <CheckCircle className="w-2.5 h-2.5" /> Work Done by {inv.workDoneBy || 'Staff'}
              </span>
            )}
          </div>
        </td>
        <td className="px-5 py-4 text-right text-muted-foreground tabular-nums">
          <div className="text-xs font-medium">{new Date(inv.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</div>
          <div className="text-[10px] opacity-60">{new Date(inv.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</div>
        </td>
        <td className="px-5 py-4 text-right font-medium tabular-nums text-foreground">{fmt(inv.totalAmount)}</td>
        <td className="px-5 py-4 text-right tabular-nums text-amber-600 font-medium">{fmt(inv.cashAmount || 0)}</td>
        <td className="px-5 py-4 text-right tabular-nums text-blue-600 font-medium">{fmt(inv.onlineAmount || 0)}</td>
        <td className="px-5 py-4 text-right tabular-nums text-primary font-medium">
          {fmt(inv.advanceAmount || 0)}
          {inv.advanceAmount > 0 && <span className="text-[10px] ml-1 opacity-70 uppercase">({inv.advanceMethod})</span>}
        </td>
        <td className="px-5 py-4 text-right tabular-nums text-destructive font-bold">{fmt(inv.remainingAmount || 0)}</td>
        <td className="px-5 py-4 text-center">
          <div
            className={cn(
              'inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase',
              inv.paymentStatus === 'completed' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
            )}
          >
            {inv.paymentStatus}
          </div>
        </td>
      </tr>
      <tr className="border-b border-border/30 last:border-0 bg-muted/5 hover:bg-muted/10 transition-colors">
        <td colSpan={10} className="px-5 py-2.5">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-col gap-1 items-start">
              {/* Switch VIP / IMP button */}
              <button
                onClick={() => {
                  const newImp = !inv.isImp;
                  updateInvoice({ ...inv, isImp: newImp });
                  toast.success(newImp ? 'Customer marked as VIP!' : 'Customer removed from VIP!');
                }}
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded-md border text-[9px] font-black uppercase tracking-wider transition-all shadow-sm hover:scale-[1.02] active:scale-[0.98] outline-none",
                  inv.isImp
                    ? "bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25"
                    : "bg-muted border-border text-muted-foreground hover:bg-amber-500/10 hover:text-amber-600 hover:border-amber-500/20"
                )}
              >
                <Star className={cn("w-3.5 h-3.5", inv.isImp ? "fill-amber-500 text-amber-500" : "text-muted-foreground")} />
                <span>{inv.isImp ? 'VIP' : 'Make VIP'}</span>
              </button>
              <span className="font-black uppercase tracking-wider text-[9px] bg-muted dark:bg-muted/50 border border-border/50 text-muted-foreground px-2 py-0.5 rounded-md">
                Invoice Actions
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {/* Work Status button */}
              {inv.isWorkDone ? (
                <div
                  title={`Work completed by ${inv.workDoneBy || 'Staff'} on ${inv.workDoneAt ? new Date(inv.workDoneAt).toLocaleDateString('en-IN') : 'N/A'}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 cursor-default"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Work Done ({inv.workDoneBy || 'Staff'})</span>
                </div>
              ) : activeWorkDoneInvoiceId === inv.id ? (
                <div className="flex items-center gap-1.5 bg-indigo-500/10 border border-indigo-500/20 p-1 px-2 rounded-xl animate-fade-in">
                  <select
                    onChange={(e) => {
                      const empName = e.target.value;
                      if (empName) {
                        updateInvoice({
                          ...inv,
                          isWorkDone: true,
                          workDoneBy: empName,
                          workDoneAt: new Date().toISOString()
                        });
                        toast.success(`Work completed by ${empName}!`);
                        setActiveWorkDoneInvoiceId(null);
                      }
                    }}
                    defaultValue=""
                    className="px-2 py-0.5 text-xs font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-400 bg-transparent border-0 outline-none cursor-pointer"
                  >
                    <option value="" disabled className="text-slate-400 italic">Select Employee *</option>
                    {user?.name && (
                      <option value={user.name} className="text-slate-800 font-semibold">{user.name} (You)</option>
                    )}
                    {actualEmployees
                      .filter(emp => emp.name !== user?.name)
                      .map(emp => (
                        <option key={emp.id} value={emp.name} className="text-slate-800 font-semibold">{emp.name}</option>
                      ))
                    }
                  </select>
                  <button
                    onClick={() => setActiveWorkDoneInvoiceId(null)}
                    className="p-0.5 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-100 dark:hover:bg-indigo-950 rounded-lg transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setActiveWorkDoneInvoiceId(inv.id)}
                  title="Mark client work as completed"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 font-bold transition-all border border-indigo-500/20 shadow-sm hover:scale-[1.02] active:scale-[0.98] outline-none"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Work Done</span>
                </button>
              )}

              {inv.isDelivered ? (
                <div title="Order Delivered" className="flex items-center gap-1 p-1 py-1.5 px-3 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 cursor-default">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Given to Customer</span>
                </div>
              ) : (
                <button
                  onClick={() => updateInvoice({ ...inv, isDelivered: true })}
                  title="Mark as Delivered to Customer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 font-bold transition-all border border-amber-500/20 shadow-sm hover:scale-[1.02] active:scale-[0.98] outline-none"
                >
                  <Package className="w-3.5 h-3.5" />
                  <span>Mark Given</span>
                </button>
              )}

              <button
                onClick={() => sendReminder(inv)}
                title="Send Reminder via WhatsApp"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25d366] font-bold transition-all border border-[#25d366]/30 shadow-sm hover:scale-[1.02] active:scale-[0.98] outline-none"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.966C16.49 1.975 14.025.95c-5.447 0-9.87 4.372-9.873 9.802-.001 1.777.478 3.513 1.39 5.04l-.997 3.642 3.734-.98zm11.332-6.52c-.3-.15-1.773-.875-2.047-.975-.275-.1-.475-.15-.675.15-.2.3-.775.975-.95 1.175-.175.2-.35.225-.65.075-1.02-.51-1.97-1.12-2.83-1.87-.66-.58-1.22-1.29-1.63-2.09-.175-.3-.02-.46.13-.61.137-.135.3-.35.45-.525.15-.175.2-.3.3-.5.1-.2.05-.375-.025-.525-.075-.15-.675-1.625-.925-2.225-.244-.588-.456-.587-.675-.587-.175-.01-.375-.01-.575-.01-.2 0-.525.075-.8 1.05-.275.975-1.05 1.05-1.05 1.05v.02c0 0 .075.725.35 1.25.275.525.625 1.025 1.05 1.475 2.12 2.22 4.67 3.12 6.87 3.62.6.14 1.15.11 1.57.05.47-.07 1.47-.6 1.67-1.18.2-.58.2-1.08.14-1.18-.06-.1-.225-.15-.525-.3z" />
                </svg>
                <span>WhatsApp Reminder</span>
              </button>

              <div className="w-px h-5 bg-border mx-1" />

              <button
                onClick={() => navigate(`/edit-bill/${inv.id}`)}
                title="Edit Invoice"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-bold transition-all border border-blue-500/20 shadow-sm hover:scale-[1.02] active:scale-[0.98] outline-none"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to delete this invoice? The action cannot be undone.')) {
                    deleteInvoice(inv.id);
                  }
                }}
                title="Delete Invoice"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold transition-all border border-rose-500/20 shadow-sm hover:scale-[1.02] active:scale-[0.98] outline-none"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        </td>
      </tr>
    </Fragment>
  );

  return (
    <div>
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8 animate-fade-up">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Sales History</h1>
          <p className="text-sm text-muted-foreground mt-1">{publicInvoices.length} public invoices in history</p>
        </div>

        {/* Search Bar + Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search customer or invoice..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-9 py-2 rounded-xl border border-border/30 bg-muted/50 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-ring/20 transition-all placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-muted-foreground transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Payment Status Filter */}
          <div className="flex items-center gap-1 p-1 bg-muted rounded-xl border border-border/30 shrink-0">
            {(['all', 'completed', 'pending', 'vip'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  'px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all',
                  filter === f ? 'bg-card text-foreground shadow-sm border border-border/30' : 'text-muted-foreground'
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-12 animate-fade-up" style={{ animationDelay: '100ms' }}>
        {/* Reminders Alert Box */}
        {filter === 'all' && reminderInvoices.length > 0 && (
          <div className="p-5 rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/20 shadow-md shadow-emerald-100 dark:shadow-none space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 bg-emerald-100 dark:bg-emerald-900/40 rounded-bl-full pointer-events-none" />
            <h2 className="text-xl font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-2 relative z-10">
              <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.966C16.49 1.975 14.025.95c-5.447 0-9.87 4.372-9.873 9.802-.001 1.777.478 3.513 1.39 5.04l-.997 3.642 3.734-.98zm11.332-6.52c-.3-.15-1.773-.875-2.047-.975-.275-.1-.475-.15-.675.15-.2.3-.775.975-.95 1.175-.175.2-.35.225-.65.075-1.02-.51-1.97-1.12-2.83-1.87-.66-.58-1.22-1.29-1.63-2.09-.175-.3-.02-.46.13-.61.137-.135.3-.35.45-.525.15-.175.2-.3.3-.5.1-.2.05-.375-.025-.525-.075-.15-.675-1.625-.925-2.225-.244-.588-.456-.587-.675-.587-.175-.01-.375-.01-.575-.01-.2 0-.525.075-.8 1.05-.275.975-1.05 1.05-1.05 1.05v.02c0 0 .075.725.35 1.25.275.525.625 1.025 1.05 1.475 2.12 2.22 4.67 3.12 6.87 3.62.6.14 1.15.11 1.57.05.47-.07 1.47-.6 1.67-1.18.2-.58.2-1.08.14-1.18-.06-.1-.225-.15-.525-.3z" />
              </svg>
              Automated WhatsApp Reminders (Over 7 Days)
            </h2>
            <p className="text-sm text-emerald-900/70 dark:text-emerald-300/70 relative z-10 font-medium">
              These customers haven't picked up their orders for over a week! Click the WhatsApp icon to automatically generate and send them a text.
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 relative z-10">
              {reminderInvoices.map(inv => (
                <div key={inv.id} className="bg-white dark:bg-card border-emerald-200 dark:border-border p-4 rounded-xl border flex flex-col gap-3 shadow-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        {inv.isImp && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 text-[8px] font-black uppercase tracking-wider border border-amber-500/20 shrink-0 select-none">
                            IMP
                          </span>
                        )}
                        <p className="font-bold text-foreground text-base truncate">{inv.customerName}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">{inv.customerPhone || 'No phone number'}</p>
                    </div>
                    <span className={cn("px-2 py-0.5 rounded-full text-[10px] uppercase font-black", inv.paymentStatus === 'completed' ? "bg-success/10 text-success" : "bg-amber-500/10 text-amber-600")}>
                      {inv.paymentStatus === 'completed' ? 'Paid' : 'Pending'}
                    </span>
                  </div>
                  <div className="flex gap-2 mt-auto pt-2">
                    <button onClick={() => sendReminder(inv)} className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase rounded-lg shadow-md shadow-emerald-200 dark:shadow-none transition-all flex items-center justify-center gap-1.5">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.966C16.49 1.975 14.025.95c-5.447 0-9.87 4.372-9.873 9.802-.001 1.777.478 3.513 1.39 5.04l-.997 3.642 3.734-.98zm11.332-6.52c-.3-.15-1.773-.875-2.047-.975-.275-.1-.475-.15-.675.15-.2.3-.775.975-.95 1.175-.175.2-.35.225-.65.075-1.02-.51-1.97-1.12-2.83-1.87-.66-.58-1.22-1.29-1.63-2.09-.175-.3-.02-.46.13-.61.137-.135.3-.35.45-.525.15-.175.2-.3.3-.5.1-.2.05-.375-.025-.525-.075-.15-.675-1.625-.925-2.225-.244-.588-.456-.587-.675-.587-.175-.01-.375-.01-.575-.01-.2 0-.525.075-.8 1.05-.275.975-1.05 1.05-1.05 1.05v.02c0 0 .075.725.35 1.25.275.525.625 1.025 1.05 1.475 2.12 2.22 4.67 3.12 6.87 3.62.6.14 1.15.11 1.57.05.47-.07 1.47-.6 1.67-1.18.2-.58.2-1.08.14-1.18-.06-.1-.225-.15-.525-.3z" />
                      </svg> WhatsApp Reminder
                    </button>
                    <button onClick={() => updateInvoice({ ...inv, isDelivered: true })} title="Mark Given" className="p-1.5 px-3 bg-card border border-border text-foreground hover:bg-muted font-bold text-xs rounded-lg transition-all flex items-center justify-center">
                      <Package className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pending Section */}
        {(filter === 'all' || filter === 'pending' || filter === 'vip') && (publicInvoices.filter(i => i.paymentStatus === 'pending').length > 0) && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-destructive flex items-center gap-2 px-1">
              <div className="w-2 h-6 bg-destructive rounded-full" />
              Pending Payments
            </h2>
            <div className="bg-card rounded-xl border border-border/50 shadow-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  {renderTableHeader(true)}
                  <tbody>
                    {publicInvoices.filter(i => i.paymentStatus === 'pending').map(inv => renderInvoiceRow(inv))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Completed Section */}
        {(filter === 'all' || filter === 'completed' || filter === 'vip') && (publicInvoices.filter(i => i.paymentStatus === 'completed').length > 0) && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-success flex items-center gap-2 px-1">
              <div className="w-2 h-6 bg-success rounded-full" />
              Completed Payments
            </h2>
            <div className="bg-card rounded-xl border border-border/50 shadow-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  {renderTableHeader(false)}
                  <tbody>
                    {publicInvoices.filter(i => i.paymentStatus === 'completed').map(inv => renderInvoiceRow(inv))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {publicInvoices.length === 0 && (
          <div className="bg-card rounded-xl border border-border/50 shadow-card p-12 text-center text-muted-foreground animate-fade-in">
            No invoices generated yet.
          </div>
        )}

        {filter !== 'all' && (
          filter === 'vip'
            ? publicInvoices.length === 0
            : publicInvoices.filter(i => i.paymentStatus === filter).length === 0
        ) && (
          <div className="bg-card rounded-xl border border-border/50 shadow-card p-12 text-center text-muted-foreground animate-fade-in">
            No {filter === 'vip' ? 'VIP' : filter} invoices found.
          </div>
        )}
      </div>

      {/* Bulk WhatsApp Reminder Modal */}
      {bulkReminderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-border w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-scale-in">
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-border bg-muted/20">
              <div>
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-emerald-500" />
                  Bulk WhatsApp Reminders
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Send payment and collection reminders to selected customers
                </p>
              </div>
              <button
                onClick={() => {
                  setBulkReminderOpen(false);
                  setSentIds([]);
                }}
                className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 max-h-[400px] overflow-y-auto space-y-3">
              {/* Send Next Assistant Banner */}
              {(() => {
                const selectedInvoices = invoices.filter(i => selectedIds.includes(i.id));
                const unsent = selectedInvoices.filter(i => !sentIds.includes(i.id));
                const next = unsent[0];
                return (
                  <div className="p-4 rounded-2xl bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Progress: {sentIds.length} / {selectedInvoices.length} Sent
                      </p>
                      <h4 className="text-sm font-bold text-foreground mt-1">
                        {next 
                          ? `Next Customer: ${next.customerName} (${next.invoiceNumber})` 
                          : "All selected reminders initiated!"
                        }
                      </h4>
                    </div>
                    {next && (
                      <button
                        onClick={() => {
                          sendReminder(next);
                          setSentIds(prev => [...prev, next.id]);
                        }}
                        className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-md shadow-emerald-500/20 uppercase tracking-wider"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Send Reminder
                      </button>
                    )}
                  </div>
                );
              })()}

              {/* Selected List */}
              <div className="border border-border rounded-2xl overflow-hidden bg-muted/10">
                <div className="divide-y divide-border">
                  {invoices
                    .filter(i => selectedIds.includes(i.id))
                    .map(inv => {
                      const isSent = sentIds.includes(inv.id);
                      return (
                        <div key={inv.id} className={cn("p-4 flex items-center justify-between gap-4 transition-colors", isSent && "bg-slate-50 dark:bg-slate-900/50")}>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-foreground">{inv.customerName}</span>
                              <span className="text-[10px] text-muted-foreground">({inv.invoiceNumber})</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                              <span>{inv.customerPhone || "No Phone"}</span>
                              <span>•</span>
                              <span className="font-semibold text-destructive">{fmt(inv.remainingAmount)} Pending</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {isSent ? (
                              <span className="flex items-center gap-1 text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-xl">
                                <Check className="w-3.5 h-3.5" /> Sent
                              </span>
                            ) : (
                              <button
                                onClick={() => {
                                  sendReminder(inv);
                                  setSentIds(prev => [...prev, inv.id]);
                                }}
                                className="flex items-center gap-1 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25d366] font-bold text-xs px-3 py-1.5 rounded-xl border border-[#25d366]/30 transition-all"
                              >
                                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.966C16.49 1.975 14.025.95c-5.447 0-9.87 4.372-9.873 9.802-.001 1.777.478 3.513 1.39 5.04l-.997 3.642 3.734-.98zm11.332-6.52c-.3-.15-1.773-.875-2.047-.975-.275-.1-.475-.15-.675.15-.2.3-.775.975-.95 1.175-.175.2-.35.225-.65.075-1.02-.51-1.97-1.12-2.83-1.87-.66-.58-1.22-1.29-1.63-2.09-.175-.3-.02-.46.13-.61.137-.135.3-.35.45-.525.15-.175.2-.3.3-.5.1-.2.05-.375-.025-.525-.075-.15-.675-1.625-.925-2.225-.244-.588-.456-.587-.675-.587-.175-.01-.375-.01-.575-.01-.2 0-.525.075-.8 1.05-.275.975-1.05 1.05-1.05 1.05v.02c0 0 .075.725.35 1.25.275.525.625 1.025 1.05 1.475 2.12 2.22 4.67 3.12 6.87 3.62.6.14 1.15.11 1.57.05.47-.07 1.47-.6 1.67-1.18.2-.58.2-1.08.14-1.18-.06-.1-.225-.15-.525-.3z" />
                                </svg>
                                Send
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-between items-center px-6 py-4 border-t border-border bg-muted/20">
              <button
                onClick={() => setSentIds([])}
                className="flex items-center gap-1 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-bold text-xs uppercase tracking-wider"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Status
              </button>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setSelectedIds([]);
                    setSentIds([]);
                    setBulkReminderOpen(false);
                  }}
                  className="px-4 py-2 border border-border rounded-xl text-slate-700 dark:text-slate-300 font-bold text-xs uppercase tracking-wider hover:bg-muted"
                >
                  Clear Selection
                </button>
                <button
                  onClick={() => {
                    setBulkReminderOpen(false);
                  }}
                  className="px-4 py-2 bg-slate-900 dark:bg-slate-100 dark:text-slate-900 text-white font-bold text-xs uppercase tracking-wider rounded-xl hover:opacity-90"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-border px-6 py-4 rounded-2xl shadow-2xl animate-fade-in">
          <span className="text-xs font-black uppercase tracking-widest text-foreground">
            {selectedIds.length} Invoice{selectedIds.length > 1 ? 's' : ''} Selected
          </span>
          <button
            onClick={() => {
              setBulkReminderOpen(true);
            }}
            className="flex items-center gap-2 bg-[#25D366] hover:bg-[#20ba5a] text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-emerald-500/20 active:scale-95"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.966C16.49 1.975 14.025.95c-5.447 0-9.87 4.372-9.873 9.802-.001 1.777.478 3.513 1.39 5.04l-.997 3.642 3.734-.98zm11.332-6.52c-.3-.15-1.773-.875-2.047-.975-.275-.1-.475-.15-.675.15-.2.3-.775.975-.95 1.175-.175.2-.35.225-.65.075-1.02-.51-1.97-1.12-2.83-1.87-.66-.58-1.22-1.29-1.63-2.09-.175-.3-.02-.46.13-.61.137-.135.3-.35.45-.525.15-.175.2-.3.3-.5.1-.2.05-.375-.025-.525-.075-.15-.675-1.625-.925-2.225-.244-.588-.456-.587-.675-.587-.175-.01-.375-.01-.575-.01-.2 0-.525.075-.8 1.05-.275.975-1.05 1.05-1.05 1.05v.02c0 0 .075.725.35 1.25.275.525.625 1.025 1.05 1.475 2.12 2.22 4.67 3.12 6.87 3.62.6.14 1.15.11 1.57.05.47-.07 1.47-.6 1.67-1.18.2-.58.2-1.08.14-1.18-.06-.1-.225-.15-.525-.3z" />
            </svg>
            Send WhatsApp Reminders
          </button>
          <button
            onClick={() => setSelectedIds([])}
            className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors uppercase tracking-wider"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
