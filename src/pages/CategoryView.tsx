import { useState, Fragment, useEffect } from 'react';
import { useInvoices, type Invoice, INVOICE_CATEGORIES, type InvoiceCategory } from '@/contexts/InvoiceContext';
import { FileText, Pencil, Trash2, CheckCircle, Package, Search, X, Star, Send } from 'lucide-react';
import InvoicePreview from '@/components/InvoicePreview';
import { toast } from 'sonner';
import { getEmployees, type Employee } from '@/firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

const fmt = (n: number) => '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 0 });

const CAT_CONFIG: Record<InvoiceCategory, { emoji: string; color: string; border: string; badge: string; sectionBg: string; dot: string }> = {
  'ID Photos':       { emoji: '🪪', color: 'text-blue-600',    border: 'border-blue-200 dark:border-blue-800/40',   badge: 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/30 dark:text-blue-400',    sectionBg: 'from-blue-50 to-blue-50/0 dark:from-blue-950/20',   dot: 'bg-blue-500' },
  'Studio Shoots':   { emoji: '📸', color: 'text-violet-600',  border: 'border-violet-200 dark:border-violet-800/40', badge: 'bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-950/30 dark:text-violet-400', sectionBg: 'from-violet-50 to-violet-50/0 dark:from-violet-950/20', dot: 'bg-violet-500' },
  'Events':          { emoji: '🎉', color: 'text-emerald-600', border: 'border-emerald-200 dark:border-emerald-800/40', badge: 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400', sectionBg: 'from-emerald-50 to-emerald-50/0 dark:from-emerald-950/20', dot: 'bg-emerald-500' },
  'Frames & Prints': { emoji: '🖼️', color: 'text-amber-600',  border: 'border-amber-200 dark:border-amber-800/40',  badge: 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-400',   sectionBg: 'from-amber-50 to-amber-50/0 dark:from-amber-950/20',  dot: 'bg-amber-500' },
};

export default function CategoryView() {
  const { invoices, updateInvoice, deleteInvoice } = useInvoices();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activeCategory, setActiveCategory] = useState<InvoiceCategory | 'all'>('all');
  const [subFilter, setSubFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [activeWorkDoneId, setActiveWorkDoneId] = useState<string | null>(null);

  useEffect(() => {
    let unsub = () => {};
    getEmployees((data) => setEmployees(data)).then(fn => { unsub = fn; }).catch(() => {});
    return () => unsub();
  }, []);

  const actualEmployees = employees.filter(e => e.id !== 'mock-superadmin-uid' && e.id !== 'mock-admin-uid');

  const publicInvoices = invoices
    .filter(i => !i.isPrivate)
    .filter(i => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        i.customerName?.toLowerCase().includes(q) ||
        i.invoiceNumber?.toLowerCase().includes(q) ||
        i.customerPhone?.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const sendReminder = (inv: Invoice) => {
    if (!inv.customerPhone) { alert('No phone number for this customer.'); return; }
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

  const renderRow = (inv: Invoice, cfg: typeof CAT_CONFIG[InvoiceCategory]) => (
    <Fragment key={inv.id}>
      <tr className="hover:bg-muted/10 transition-colors">
        <td className="px-4 py-3 font-medium text-card-foreground">
          <div className="flex items-center gap-2">
            <FileText className={cn('w-4 h-4', cfg.color)} />
            {inv.isImp && <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 text-[8px] font-black uppercase border border-amber-500/20 shrink-0">IMP</span>}
            {inv.invoiceNumber}
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="flex flex-col gap-0.5">
            <span className="font-medium text-card-foreground">{inv.customerName}</span>
            {inv.customerPhone && <span className="text-[10px] text-muted-foreground">{inv.customerPhone}</span>}
          </div>
        </td>
        <td className="px-4 py-3 text-right text-muted-foreground tabular-nums text-xs">
          <div>{new Date(inv.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</div>
          <div className="opacity-60">{new Date(inv.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</div>
        </td>
        <td className="px-4 py-3 text-right font-medium tabular-nums">{fmt(inv.totalAmount)}</td>
        <td className="px-4 py-3 text-right tabular-nums text-amber-600 font-medium">{fmt(inv.cashAmount || 0)}</td>
        <td className="px-4 py-3 text-right tabular-nums text-blue-600 font-medium">{fmt(inv.onlineAmount || 0)}</td>
        <td className="px-4 py-3 text-right tabular-nums text-destructive font-bold">{fmt(inv.remainingAmount || 0)}</td>
        <td className="px-4 py-3 text-center">
          <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase',
            inv.paymentStatus === 'completed' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive')}>
            {inv.paymentStatus}
          </span>
        </td>
      </tr>
      <tr className="border-b border-border/30 last:border-0 bg-muted/5 hover:bg-muted/10 transition-colors">
        <td colSpan={8} className="px-4 py-2.5">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* VIP toggle */}
            <button onClick={() => { const n = !inv.isImp; updateInvoice({ ...inv, isImp: n }); toast.success(n ? 'Marked as VIP!' : 'Removed from VIP!'); }}
              className={cn('flex items-center gap-1.5 px-2 py-1 rounded-md border text-[9px] font-black uppercase tracking-wider transition-all shadow-sm hover:scale-[1.02]',
                inv.isImp ? 'bg-amber-500/15 border-amber-500/40 text-amber-600' : 'bg-muted border-border text-muted-foreground hover:text-amber-600 hover:border-amber-500/20')}>
              <Star className={cn('w-3 h-3', inv.isImp ? 'fill-amber-500 text-amber-500' : 'text-muted-foreground')} />
              {inv.isImp ? 'VIP' : 'Make VIP'}
            </button>

            {/* Work done */}
            {inv.isWorkDone ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">
                <CheckCircle className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold uppercase">Work Done ({inv.workDoneBy || 'Staff'})</span>
              </div>
            ) : activeWorkDoneId === inv.id ? (
              <div className="flex items-center gap-1.5 bg-indigo-500/10 border border-indigo-500/20 p-1 px-2 rounded-xl">
                <select defaultValue="" onChange={(e) => {
                  const name = e.target.value;
                  if (name) { updateInvoice({ ...inv, isWorkDone: true, workDoneBy: name, workDoneAt: new Date().toISOString() }); toast.success(`Work done by ${name}!`); setActiveWorkDoneId(null); }
                }} className="px-2 py-0.5 text-xs font-black text-indigo-700 bg-transparent border-0 outline-none cursor-pointer">
                  <option value="" disabled>Select Employee *</option>
                  {actualEmployees.map(e => <option key={e.id} value={e.name}>{e.name}</option>)}
                </select>
                <button onClick={() => setActiveWorkDoneId(null)} className="p-0.5 text-indigo-500 hover:bg-indigo-100 rounded"><X className="w-3 h-3" /></button>
              </div>
            ) : (
              <button onClick={() => setActiveWorkDoneId(inv.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-700 font-bold border border-indigo-500/20 transition-all">
                <CheckCircle className="w-3.5 h-3.5" /><span>Work Done</span>
              </button>
            )}

            {/* Delivered */}
            {inv.isDelivered ? (
              <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                <CheckCircle className="w-3.5 h-3.5" /><span className="text-[10px] font-bold uppercase">Given to Customer</span>
              </div>
            ) : (
              <button onClick={() => updateInvoice({ ...inv, isDelivered: true })}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 font-bold border border-amber-500/20 transition-all">
                <Package className="w-3.5 h-3.5" /><span>Mark Given</span>
              </button>
            )}

            {/* WhatsApp */}
            <button onClick={() => sendReminder(inv)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25d366] font-bold border border-[#25d366]/30 transition-all">
              <Send className="w-3.5 h-3.5" /><span>WhatsApp</span>
            </button>

            <div className="w-px h-5 bg-border mx-1" />

            <button onClick={() => setPreviewInvoice(inv)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary font-bold border border-primary/20 transition-all">
              <FileText className="w-3.5 h-3.5" /><span>View</span>
            </button>
            <button onClick={() => navigate(`/edit-bill/${inv.id}`)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 font-bold border border-blue-500/20 transition-all">
              <Pencil className="w-3.5 h-3.5" /><span>Edit</span>
            </button>
            <button onClick={() => { if (confirm('Delete this invoice?')) deleteInvoice(inv.id); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 font-bold border border-rose-500/20 transition-all">
              <Trash2 className="w-3.5 h-3.5" /><span>Delete</span>
            </button>
          </div>
        </td>
      </tr>
    </Fragment>
  );

  const renderTable = (list: Invoice[], cfg: typeof CAT_CONFIG[InvoiceCategory]) => (
    <div className="bg-card rounded-xl border border-border/50 shadow-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50 bg-muted/20">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Invoice #</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Customer</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Date</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Total</th>
              <th className="text-right px-4 py-3 font-medium text-amber-600/80">Cash</th>
              <th className="text-right px-4 py-3 font-medium text-blue-600/80">Online</th>
              <th className="text-right px-4 py-3 font-medium text-destructive/80">Remaining</th>
              <th className="text-center px-4 py-3 font-medium text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody>
            {list.map(inv => renderRow(inv, cfg))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // Build category data
  const categoriesToShow = activeCategory === 'all' ? INVOICE_CATEGORIES : [activeCategory as InvoiceCategory];

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8 animate-fade-up">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Category View</h1>
          <p className="text-sm text-muted-foreground mt-1">Browse bills organized by service category</p>
        </div>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search customer or invoice..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-9 py-2 rounded-xl border border-border/30 bg-muted/50 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-ring/20 transition-all placeholder:text-slate-400"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-muted-foreground">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Category Selector Tabs */}
      <div className="flex flex-wrap gap-3 mb-8 animate-fade-up" style={{ animationDelay: '50ms' }}>
        <button
          onClick={() => setActiveCategory('all')}
          className={cn('flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 font-bold text-sm transition-all duration-200',
            activeCategory === 'all'
              ? 'border-foreground bg-foreground text-background shadow-lg'
              : 'border-border/50 bg-muted/20 text-muted-foreground hover:border-border')}
        >
          <span>🗂️</span> All Categories
          <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-white/20 font-black">{publicInvoices.length}</span>
        </button>
        {INVOICE_CATEGORIES.map(cat => {
          const cfg = CAT_CONFIG[cat];
          const count = publicInvoices.filter(i => i.category === cat).length;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn('flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 font-bold text-sm transition-all duration-200',
                activeCategory === cat
                  ? cfg.badge + ' border-current shadow-lg scale-[1.03]'
                  : 'border-border/50 bg-muted/20 text-muted-foreground hover:border-border')}
            >
              <span>{cfg.emoji}</span> {cat}
              <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-current/10 font-black">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Sub-filter */}
      <div className="flex items-center gap-1 p-1 bg-muted rounded-xl border border-border/30 w-fit mb-8">
        {(['all', 'pending', 'completed'] as const).map(f => (
          <button key={f} onClick={() => setSubFilter(f)}
            className={cn('px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all',
              subFilter === f ? 'bg-card text-foreground shadow-sm border border-border/30' : 'text-muted-foreground')}>
            {f}
          </button>
        ))}
      </div>

      {/* Category Sections */}
      <div className="space-y-12 animate-fade-up" style={{ animationDelay: '100ms' }}>
        {categoriesToShow.map(cat => {
          const cfg = CAT_CONFIG[cat];
          let catInvoices = publicInvoices.filter(i => i.category === cat);

          const pending = catInvoices.filter(i => i.paymentStatus === 'pending');
          const completed = catInvoices.filter(i => i.paymentStatus === 'completed');

          const showPending = subFilter !== 'completed' && pending.length > 0;
          const showCompleted = subFilter !== 'pending' && completed.length > 0;
          const isEmpty = catInvoices.length === 0;

          return (
            <div key={cat} className={cn('rounded-2xl border-2 p-6 space-y-6 bg-gradient-to-br', cfg.border, cfg.sectionBg)}>
              {/* Category Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{cfg.emoji}</span>
                  <div>
                    <h2 className={cn('text-xl font-bold', cfg.color)}>{cat}</h2>
                    <p className="text-xs text-muted-foreground">{catInvoices.length} bill{catInvoices.length !== 1 ? 's' : ''} · {fmt(catInvoices.reduce((s, i) => s + i.totalAmount, 0))} total</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-destructive/10 text-destructive border border-destructive/20">
                    {pending.length} Pending
                  </span>
                  <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-success/10 text-success border border-success/20">
                    {completed.length} Completed
                  </span>
                </div>
              </div>

              {isEmpty && (
                <div className="py-10 text-center text-muted-foreground text-sm">
                  No bills in this category yet. <span className="font-bold">Create a bill</span> and select <span className={cn('font-black', cfg.color)}>{cat}</span> as the category.
                </div>
              )}

              {/* Pending Sub-section */}
              {showPending && (
                <div className="space-y-3">
                  <h3 className="text-sm font-black text-destructive uppercase tracking-wider flex items-center gap-2">
                    <div className="w-1.5 h-5 bg-destructive rounded-full" /> Pending Payments ({pending.length})
                  </h3>
                  {renderTable(pending, cfg)}
                </div>
              )}

              {/* Completed Sub-section */}
              {showCompleted && (
                <div className="space-y-3">
                  <h3 className="text-sm font-black text-success uppercase tracking-wider flex items-center gap-2">
                    <div className="w-1.5 h-5 bg-success rounded-full" /> Completed Payments ({completed.length})
                  </h3>
                  {renderTable(completed, cfg)}
                </div>
              )}

              {/* Filtered empty */}
              {!isEmpty && !showPending && !showCompleted && (
                <div className="py-6 text-center text-muted-foreground text-sm">No {subFilter} invoices in this category.</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Uncategorized section */}
      {(activeCategory === 'all') && (() => {
        const uncategorized = publicInvoices.filter(i => !i.category);
        if (uncategorized.length === 0) return null;
        const pending = uncategorized.filter(i => i.paymentStatus === 'pending');
        const completed = uncategorized.filter(i => i.paymentStatus === 'completed');
        const showPending = subFilter !== 'completed' && pending.length > 0;
        const showCompleted = subFilter !== 'pending' && completed.length > 0;
        const fakeCfg = CAT_CONFIG['ID Photos'];
        return (
          <div className="mt-12 rounded-2xl border-2 border-border/50 p-6 space-y-6 bg-muted/10">
            <div className="flex items-center gap-3">
              <span className="text-3xl">📋</span>
              <div>
                <h2 className="text-xl font-bold text-muted-foreground">Uncategorized</h2>
                <p className="text-xs text-muted-foreground">{uncategorized.length} bill{uncategorized.length !== 1 ? 's' : ''} without a category assigned</p>
              </div>
            </div>
            {showPending && (
              <div className="space-y-3">
                <h3 className="text-sm font-black text-destructive uppercase tracking-wider flex items-center gap-2">
                  <div className="w-1.5 h-5 bg-destructive rounded-full" /> Pending ({pending.length})
                </h3>
                {renderTable(pending, fakeCfg)}
              </div>
            )}
            {showCompleted && (
              <div className="space-y-3">
                <h3 className="text-sm font-black text-success uppercase tracking-wider flex items-center gap-2">
                  <div className="w-1.5 h-5 bg-success rounded-full" /> Completed ({completed.length})
                </h3>
                {renderTable(completed, fakeCfg)}
              </div>
            )}
          </div>
        );
      })()}

      {previewInvoice && <InvoicePreview invoice={previewInvoice} onClose={() => setPreviewInvoice(null)} />}
    </div>
  );
}
