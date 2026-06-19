import { useState, Fragment, useEffect } from 'react';
import { useInvoices, type Invoice, INVOICE_CATEGORIES, type InvoiceCategory } from '@/contexts/InvoiceContext';
import { FileText, Pencil, Trash2, CheckCircle, Package, Search, X, Star, MessageSquare, Send, Check, RotateCcw, Eye, Tags } from 'lucide-react';
import InvoicePreview from '@/components/InvoicePreview';
import { toast } from 'sonner';
import { getEmployees, type Employee } from '@/firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

const CAT_CONFIG: Record<InvoiceCategory, { emoji: string; color: string; border: string; bg: string }> = {
  'ID Photos':       { emoji: '🪪', color: 'text-blue-600',    border: 'border-blue-200 dark:border-blue-800/40',    bg: 'bg-blue-50 dark:bg-blue-950/20' },
  'Studio Shoots':   { emoji: '📸', color: 'text-violet-600',  border: 'border-violet-200 dark:border-violet-800/40',  bg: 'bg-violet-50 dark:bg-violet-950/20' },
  'Events':          { emoji: '🎉', color: 'text-emerald-600', border: 'border-emerald-200 dark:border-emerald-800/40', bg: 'bg-emerald-50 dark:bg-emerald-950/20' },
  'Frames & Prints': { emoji: '🖼️', color: 'text-amber-600',  border: 'border-amber-200 dark:border-amber-800/40',  bg: 'bg-amber-50 dark:bg-amber-950/20' },
};

const fmt = (n: number) => '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 0 });

export default function SalesHistory() {
  const { invoices, updateInvoice, updateInvoiceStatus, deleteInvoice } = useInvoices();
  const { user } = useAuth();
  const [filter, setFilter] = useState<'all' | 'completed' | 'pending' | 'vip' | 'category'>('all');
  const [categoryFilter, setCategoryFilter] = useState<InvoiceCategory | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [activeWorkDoneInvoiceId, setActiveWorkDoneInvoiceId] = useState<string | null>(null);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkReminderOpen, setBulkReminderOpen] = useState(false);
  const [sentIds, setSentIds] = useState<string[]>([]);
  const [reminderPreview, setReminderPreview] = useState<Invoice | null>(null);

  useEffect(() => {
    let unsub = () => { };
    getEmployees((data) => setEmployees(data)).then(fn => { unsub = fn; }).catch(() => { });
    return () => unsub();
  }, []);

  const actualEmployees = employees.filter(
    e => e.id !== 'mock-superadmin-uid' && e.id !== 'mock-admin-uid'
  );

  // Only show public bills in Sales History — sorted newest first
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
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const reminderInvoices = publicInvoices.filter(i => i.isWorkDone && !i.isDelivered && new Date(i.createdAt) < oneWeekAgo);

  const sendReminder = (inv: Invoice) => {
    if (!inv.customerPhone) {
      alert('Cannot send reminder: No phone number saved for this customer.');
      return;
    }

    const text = `SACHIN GHONGADE PHOTO & FILMS 

Hello ${inv.customerName},

This is a friendly reminder that your photos/videos are ready for delivery. 

We have been waiting for your visit to complete the handover. Kindly collect your order at your earliest convenience.

If there is any pending payment, please clear it before collection.

For any assistance, feel free to contact us.

Thank you for choosing us for your special moments. 

 SACHIN GHONGADE PHOTO & FILMS
9130053081 / 9422427981

 Enriching Your Moments Through Creative Photography And Cinematic Storytelling.`;

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
                    {actualEmployees.map(emp => (
                      <option key={emp.id} value={emp.name} className="text-slate-800 font-semibold">{emp.name}</option>
                    ))}
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
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
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
              autoComplete="off"
              data-lpignore="true"
              data-form-type="other"
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
          <div className="flex items-center gap-1 p-1 bg-muted rounded-xl border border-border/30 shrink-0 flex-wrap">
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
            <button
              onClick={() => setFilter('category')}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all',
                filter === 'category' ? 'bg-card text-foreground shadow-sm border border-border/30' : 'text-muted-foreground'
              )}
            >
              <Tags className="w-3 h-3" /> Category
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-12 animate-fade-up" style={{ animationDelay: '100ms' }}>
      {/* ── INLINE CATEGORY VIEW ── */}
      {filter === 'category' && (
        <div className="space-y-6 animate-fade-up pb-20" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center justify-between bg-card p-4 rounded-xl border border-border/50 shadow-sm">
            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Tags className="w-4 h-4" /> Category View
            </h2>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as any)}
              className="px-4 py-2 rounded-lg border border-input bg-background text-sm font-bold shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="All">All Categories</option>
              {INVOICE_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
          {(categoryFilter === 'All' ? INVOICE_CATEGORIES : [categoryFilter as InvoiceCategory]).map(cat => {
            const cfg = CAT_CONFIG[cat];
            const base = publicInvoices
              .filter(i => i.category === cat)
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            const pending   = base.filter(i => i.paymentStatus === 'pending');
            const completed = base.filter(i => i.paymentStatus === 'completed');

            const renderCatTable = (list: Invoice[], label: string, isP: boolean) => list.length > 0 && (
              <div className="space-y-2">
                <h3 className={cn('text-sm font-black uppercase tracking-wider flex items-center gap-2', isP ? 'text-destructive' : 'text-success')}>
                  <div className={cn('w-1.5 h-5 rounded-full', isP ? 'bg-destructive' : 'bg-success')} /> {label} ({list.length})
                </h3>
                <div className="bg-card rounded-xl border border-border/50 shadow-card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b border-border/50 bg-muted/20">
                        <th className="text-left px-5 py-3 font-medium text-[10px] uppercase text-muted-foreground">Invoice #</th>
                        <th className="text-left px-5 py-3 font-medium text-[10px] uppercase text-muted-foreground">Customer</th>
                        <th className="text-right px-5 py-3 font-medium text-[10px] uppercase text-muted-foreground">Date</th>
                        <th className="text-right px-5 py-3 font-medium text-[10px] uppercase text-muted-foreground">Total</th>
                        <th className="text-right px-5 py-3 font-medium text-[10px] uppercase text-amber-600/80">Cash</th>
                        <th className="text-right px-5 py-3 font-medium text-[10px] uppercase text-blue-600/80">Online</th>
                        <th className="text-right px-5 py-3 font-medium text-[10px] uppercase text-destructive/80">Remaining</th>
                        <th className="text-center px-5 py-3 font-medium text-[10px] uppercase text-muted-foreground">Status</th>
                      </tr></thead>
                      <tbody>{list.map(inv => renderInvoiceRow(inv))}</tbody>
                    </table>
                  </div>
                </div>
              </div>
            );

            return (
              <div key={cat} className={cn('rounded-2xl border-2 p-5 space-y-5', cfg.border, cfg.bg)}>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{cfg.emoji}</span>
                    <div>
                      <h2 className={cn('text-lg font-bold', cfg.color)}>{cat}</h2>
                      <p className="text-xs text-muted-foreground">{base.length} bill{base.length !== 1 ? 's' : ''} · {fmt(base.reduce((s, i) => s + i.totalAmount, 0))} total · {fmt(base.reduce((s, i) => s + (i.remainingAmount||0), 0))} pending</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-destructive/10 text-destructive border border-destructive/20">{pending.length} Pending</span>
                    <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-success/10 text-success border border-success/20">{completed.length} Done</span>
                  </div>
                </div>
                {base.length === 0 && <p className="text-center text-muted-foreground text-sm py-6">No bills in this category yet. Select <span className={cn('font-black', cfg.color)}>{cat}</span> when creating a bill.</p>}
                {renderCatTable(pending, 'Pending Payments', true)}
                {renderCatTable(completed, 'Completed Payments', false)}
              </div>
            );
          })}

        </div>
      )}

        {/* Reminders Alert Box */}
        {filter !== 'category' && filter === 'all' && reminderInvoices.length > 0 && (
          <div className="p-5 rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/20 shadow-md shadow-emerald-100 dark:shadow-none space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 bg-emerald-100 dark:bg-emerald-900/40 rounded-bl-full pointer-events-none" />
            <h2 className="text-xl font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-2 relative z-10">
              <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
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
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                      </svg> WhatsApp Reminder
                    </button>
                    <button
                      onClick={() => setReminderPreview(inv)}
                      title="View Bill"
                      className="p-1.5 px-3 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-600 dark:text-blue-400 font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
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
        {filter !== 'category' && (filter === 'all' || filter === 'pending' || filter === 'vip') && (publicInvoices.filter(i => i.paymentStatus === 'pending').length > 0) && (
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
                    {publicInvoices
                      .filter(i => i.paymentStatus === 'pending')
                      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .map(inv => renderInvoiceRow(inv))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Completed Section */}
        {filter !== 'category' && (filter === 'all' || filter === 'completed' || filter === 'vip') && (publicInvoices.filter(i => i.paymentStatus === 'completed').length > 0) && (
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
                    {publicInvoices
                      .filter(i => i.paymentStatus === 'completed')
                      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .map(inv => renderInvoiceRow(inv))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {filter !== 'category' && publicInvoices.length === 0 && (
          <div className="bg-card rounded-xl border border-border/50 shadow-card p-12 text-center text-muted-foreground animate-fade-in">
            No invoices generated yet.
          </div>
        )}

        {filter !== 'category' && filter !== 'all' && (
          filter === 'vip'
            ? publicInvoices.length === 0
            : publicInvoices.filter(i => i.paymentStatus === filter).length === 0
        ) && (
          <div className="bg-card rounded-xl border border-border/50 shadow-card p-12 text-center text-muted-foreground animate-fade-in">
            No {filter === 'vip' ? 'VIP' : filter} invoices found.
          </div>
        )}
      </div>

      {/* Reminder Bill Preview Modal */}
      {reminderPreview && (
        <InvoicePreview invoice={reminderPreview} onClose={() => setReminderPreview(null)} />
      )}

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
                                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
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
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
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
