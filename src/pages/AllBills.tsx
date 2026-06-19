import { useInvoices, INVOICE_CATEGORIES, type InvoiceCategory } from '@/contexts/InvoiceContext';
import { cn } from '@/lib/utils';
import { Trash2, Eye, Printer, Pencil, Lock, Globe, ShieldAlert, KeyRound, X, Phone, BadgeCheck, User, CheckCircle, Search, Star, Tags, Package } from 'lucide-react';
import { useState, Fragment, useEffect } from 'react';
import { getEmployees, type Employee } from '@/firebase/firestore';
import { useNavigate } from 'react-router-dom';
import InvoicePreview from '@/components/InvoicePreview';
import type { Invoice } from '@/contexts/InvoiceContext';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

const CAT_CONFIG: Record<InvoiceCategory, { emoji: string; color: string; border: string; bg: string }> = {
  'ID Photos':       { emoji: '🪪', color: 'text-blue-600',    border: 'border-blue-200 dark:border-blue-800/40',    bg: 'bg-blue-50 dark:bg-blue-950/20' },
  'Studio Shoots':   { emoji: '📸', color: 'text-violet-600',  border: 'border-violet-200 dark:border-violet-800/40',  bg: 'bg-violet-50 dark:bg-violet-950/20' },
  'Events':          { emoji: '🎉', color: 'text-emerald-600', border: 'border-emerald-200 dark:border-emerald-800/40', bg: 'bg-emerald-50 dark:bg-emerald-950/20' },
  'Frames & Prints': { emoji: '🖼️', color: 'text-amber-600',  border: 'border-amber-200 dark:border-amber-800/40',  bg: 'bg-amber-50 dark:bg-amber-950/20' },
};

const fmt = (n: number) => '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 0 });

const PRIVATE_EXPORT_PASSWORD = '123456';

export default function AllBills() {
  const navigate = useNavigate();
  const { invoices, updateInvoice, updateInvoiceStatus, deleteInvoice, togglePrivate } = useInvoices();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'superadmin';
  const [preview, setPreview] = useState<Invoice | null>(null);
  const [autoPrint, setAutoPrint] = useState(false);
  const [activeTab, setActiveTab] = useState<'public' | 'private'>('public');
  const [filter, setFilter] = useState<'all' | 'completed' | 'pending' | 'vip' | 'category'>('all');
  const [categoryFilter, setCategoryFilter] = useState<InvoiceCategory | 'All'>('All');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [activeWorkDoneInvoiceId, setActiveWorkDoneInvoiceId] = useState<string | null>(null);

  useEffect(() => {
    let unsub = () => { };
    getEmployees((data) => setEmployees(data)).then(fn => { unsub = fn; }).catch(() => { });
    return () => unsub();
  }, []);

  const actualEmployees = employees.filter(
    e => e.id !== 'mock-superadmin-uid' && e.id !== 'mock-admin-uid'
  );

  // Password modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [pendingAction, setPendingAction] =
    useState<'view_private' | 'toggle_private' | null>(null);
  const [pendingInvoiceId, setPendingInvoiceId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');

  const publicBills = invoices.filter(i => !i.isPrivate);
  const privateBills = invoices.filter(i => i.isPrivate);
  const currentBills = (activeTab === 'public' ? publicBills : privateBills)
    .filter(i => {
      if (filter === 'all') return true;
      if (filter === 'vip') return i.isImp;
      return i.paymentStatus === filter;
    })
    .filter(i => {
      const query = searchQuery.toLowerCase().trim();
      if (!query) return true;
      return (
        i.customerName?.toLowerCase().includes(query) ||
        i.invoiceNumber?.toLowerCase().includes(query) ||
        i.customerPhone?.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handleDelete = (id: string, number: string) => {
    if (confirm(`Are you sure you want to delete bill ${number}?`)) {
      deleteInvoice(id);
    }
  };

  // Require password to mark a bill as private or view private tab
  const requestPassword = (action: 'view_private' | 'toggle_private', id?: string) => {
    setPendingAction(action);
    setPendingInvoiceId(id || null);
    setPasswordInput('');
    setPasswordError('');
    setShowPasswordModal(true);
  };

  const handlePasswordSubmit = () => {
    if (passwordInput === PRIVATE_EXPORT_PASSWORD) {
      setShowPasswordModal(false);
      if (pendingAction === 'view_private') {
        setActiveTab('private');
      } else if (pendingAction === 'toggle_private' && pendingInvoiceId) {
        const inv = invoices.find(i => i.id === pendingInvoiceId);
        togglePrivate(pendingInvoiceId);
        if (inv?.isPrivate) {
          toast.success('Bill moved to Public');
        } else {
          toast.success('Bill moved to Private');
        }
      }
      setPasswordInput('');
      setPendingAction(null);
      setPendingInvoiceId(null);
    } else {
      setPasswordError('Incorrect password. Please try again.');
    }
  };

  const handleTogglePrivate = (inv: Invoice) => {
    if (inv.isPrivate) {
      // Moving back to public — require password
      requestPassword('toggle_private', inv.id);
    } else {
      // Moving to private — require password
      requestPassword('toggle_private', inv.id);
    }
  };

  const handleViewPrivateTab = () => {
    requestPassword('view_private');
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-up">
        <div className="space-y-1">
          <h1 className="text-2xl font-black tracking-tight text-foreground uppercase italic px-2 border-l-8 border-primary leading-none">All Bills</h1>
          <p className="text-sm text-muted-foreground pl-3">Manage and track your generated invoices</p>
        </div>

        {/* Stats Pills */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-black uppercase tracking-wider">
            <Globe className="w-3.5 h-3.5" /> {publicBills.length} Public
          </div>
          {isSuperAdmin && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 border border-red-500/20 text-red-600 text-xs font-black uppercase tracking-wider">
              <Lock className="w-3.5 h-3.5" /> {privateBills.length} Private
            </div>
          )}
        </div>
      </div>

      {/* Tab Switch + Filters */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-fade-up" style={{ animationDelay: '50ms' }}>
        <div className="flex items-center gap-2 p-1 bg-muted rounded-2xl border border-border/30">
          <button
            onClick={() => setActiveTab('public')}
            className={cn(
              'flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300',
              activeTab === 'public'
                ? 'bg-card text-foreground shadow-md border border-border/30'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Globe className="w-3.5 h-3.5" /> Public Bills
          </button>
          {isSuperAdmin && (
            <button
              onClick={activeTab !== 'private' ? handleViewPrivateTab : () => setActiveTab('public')}
              className={cn(
                'flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300',
                activeTab === 'private'
                  ? 'bg-red-600 text-white shadow-lg shadow-red-500/20'
                  : 'text-muted-foreground hover:text-red-500'
              )}
            >
              <Lock className="w-3.5 h-3.5" />
              {activeTab === 'private' ? 'Private Bills' : 'Private (Locked)'}
            </button>
          )}
        </div>

        {/* Search Bar + Payment Filter */}
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

          {/* Payment Filter */}
          <div className="flex items-center gap-1 p-1 bg-muted rounded-2xl border border-border/30 shrink-0 flex-wrap">
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

      {/* Empty private tab note */}
      {activeTab === 'private' && (
        <div className="flex items-center gap-3 px-5 py-3 bg-red-500/5 border border-red-500/20 rounded-2xl text-red-600 text-xs font-bold animate-fade-up">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          Confidential Mode Active — Only you can see these bills. They are excluded from Excel exports by default.
        </div>
      )}

      {/* ── INLINE CATEGORY VIEW ── */}
      {filter === 'category' && (
        <div className="space-y-6 animate-fade-in pb-20">
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
            const base = (activeTab === 'public' ? publicBills : privateBills)
              .filter(i => i.category === cat)
              .filter(i => {
                const q = searchQuery.toLowerCase().trim();
                return !q || i.customerName?.toLowerCase().includes(q) || i.invoiceNumber?.toLowerCase().includes(q);
              })
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            const pending   = base.filter(i => i.paymentStatus === 'pending');
            const completed = base.filter(i => i.paymentStatus === 'completed');
            const paidAmount = (inv: Invoice) => inv.totalAmount - (inv.remainingAmount || 0);

            const renderCatRow = (inv: Invoice) => (
              <Fragment key={inv.id}>
                <tr className="hover:bg-muted/20 transition-all group">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      {inv.isImp && <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 text-[8px] font-black uppercase border border-amber-500/20 shrink-0">IMP</span>}
                      <span className="font-black text-foreground">{inv.invoiceNumber}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 tabular-nums text-muted-foreground">
                    <div className="font-semibold text-slate-700 dark:text-slate-300">{new Date(inv.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                    <div className="text-[11px] opacity-75">{new Date(inv.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium text-foreground">{inv.customerName}</span>
                      {inv.customerPhone && <span className="text-[10px] text-muted-foreground">{inv.customerPhone}</span>}
                      {inv.isWorkDone && <span className="inline-flex items-center gap-1 text-[9px] font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 px-1.5 py-0.5 rounded w-fit"><CheckCircle className="w-2.5 h-2.5" /> Work Done by {inv.workDoneBy || 'Staff'}</span>}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-right font-black tabular-nums">{fmt(inv.totalAmount)}</td>
                  <td className="px-5 py-4 text-right font-bold tabular-nums text-emerald-600">{fmt(paidAmount(inv))}</td>
                  <td className="px-5 py-4 text-right font-bold tabular-nums text-rose-500">{fmt(inv.remainingAmount || 0)}</td>
                  <td className="px-5 py-4 text-center">
                    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase', inv.paymentStatus === 'completed' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive')}>{inv.paymentStatus}</span>
                  </td>
                </tr>
                <tr className="border-b border-border/30 last:border-0 bg-muted/5 hover:bg-muted/10 transition-colors">
                  <td colSpan={7} className="px-5 py-2.5">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <button onClick={() => { const n = !inv.isImp; updateInvoice({ ...inv, isImp: n }); toast.success(n ? 'Marked VIP!' : 'Removed from VIP!'); }}
                        className={cn('flex items-center gap-1.5 px-2 py-1 rounded-md border text-[9px] font-black uppercase tracking-wider transition-all', inv.isImp ? 'bg-amber-500/15 border-amber-500/40 text-amber-600' : 'bg-muted border-border text-muted-foreground hover:text-amber-600 hover:border-amber-500/20')}>
                        <Star className={cn('w-3.5 h-3.5', inv.isImp ? 'fill-amber-500 text-amber-500' : 'text-muted-foreground')} />{inv.isImp ? 'VIP' : 'Make VIP'}
                      </button>
                      {/* Work Done */}
                      {inv.isWorkDone ? (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">
                          <CheckCircle className="w-3.5 h-3.5" /><span className="text-[10px] font-bold uppercase">Work Done ({inv.workDoneBy || 'Staff'})</span>
                        </div>
                      ) : activeWorkDoneInvoiceId === inv.id ? (
                        <div className="flex items-center gap-1.5 bg-indigo-500/10 border border-indigo-500/20 p-1 px-2 rounded-xl">
                          <select defaultValue="" onChange={e => { const n = e.target.value; if (n) { updateInvoice({ ...inv, isWorkDone: true, workDoneBy: n, workDoneAt: new Date().toISOString() }); toast.success(`Work done by ${n}!`); setActiveWorkDoneInvoiceId(null); } }} className="px-2 py-0.5 text-xs font-black text-indigo-700 bg-transparent border-0 outline-none cursor-pointer">
                            <option value="" disabled>Select Employee *</option>
                            {actualEmployees.map(e => <option key={e.id} value={e.name}>{e.name}</option>)}
                          </select>
                          <button onClick={() => setActiveWorkDoneInvoiceId(null)} className="p-0.5 text-indigo-500 hover:bg-indigo-100 rounded"><X className="w-3.5 h-3.5" /></button>
                        </div>
                      ) : (
                        <button onClick={() => setActiveWorkDoneInvoiceId(inv.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-700 font-bold border border-indigo-500/20 transition-all">
                          <CheckCircle className="w-3.5 h-3.5" /><span>Work Done</span>
                        </button>
                      )}
                      {/* Mark Given */}
                      {inv.isDelivered ? (
                        <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                          <CheckCircle className="w-3.5 h-3.5" /><span className="text-[10px] font-bold uppercase">Given to Customer</span>
                        </div>
                      ) : (
                        <button onClick={() => updateInvoice({ ...inv, isDelivered: true })} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 font-bold border border-amber-500/20 transition-all">
                          <Package className="w-3.5 h-3.5" /><span>Mark Given</span>
                        </button>
                      )}
                      {/* WhatsApp */}
                      <button onClick={() => {
                        if (!inv.customerPhone) return;
                        const txt = `SACHIN GHONGADE PHOTO & FILMS 

Hello ${inv.customerName},

This is a friendly reminder that your photos/videos are ready for delivery. 

We have been waiting for your visit to complete the handover. Kindly collect your order at your earliest convenience.

If there is any pending payment, please clear it before collection.

For any assistance, feel free to contact us.

Thank you for choosing us for your special moments. 

 SACHIN GHONGADE PHOTO & FILMS
9130053081 / 9422427981

 Enriching Your Moments Through Creative Photography And Cinematic Storytelling.`;
                        const ph = inv.customerPhone.replace(/\D/g,''); window.open(`https://wa.me/${ph.length===10?'91'+ph:ph}?text=${encodeURIComponent(txt)}`, '_blank');
                      }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25d366] font-bold border border-[#25d366]/30 transition-all">
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
                        <span>WhatsApp Reminder</span>
                      </button>
                      <div className="w-px h-5 bg-border mx-1" />
                      <button onClick={() => { setAutoPrint(false); setPreview(inv); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 font-bold border border-blue-500/20 transition-all">
                        <Eye className="w-3.5 h-3.5" /><span>View Details</span>
                      </button>
                      <button onClick={() => navigate(`/edit-bill/${inv.id}`)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 font-bold border border-emerald-500/20 transition-all">
                        <Pencil className="w-3.5 h-3.5" /><span>Edit Bill</span>
                      </button>
                      <button onClick={() => handleDelete(inv.id, inv.invoiceNumber)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 font-bold border border-rose-500/20 transition-all">
                        <Trash2 className="w-3.5 h-3.5" /><span>Delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              </Fragment>
            );

            const renderCatTable = (list: Invoice[], label: string, labelColor: string) => list.length > 0 && (
              <div className="space-y-2">
                <h3 className={cn('text-sm font-black uppercase tracking-wider flex items-center gap-2', labelColor)}>
                  <div className={cn('w-1.5 h-5 rounded-full', labelColor.includes('destructive') ? 'bg-destructive' : 'bg-success')} /> {label} ({list.length})
                </h3>
                <div className="bg-card rounded-xl border border-border/50 shadow-card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b border-border/50 bg-muted/20">
                        <th className="text-left px-5 py-3 font-black text-[10px] uppercase text-muted-foreground">Invoice #</th>
                        <th className="text-left px-5 py-3 font-black text-[10px] uppercase text-muted-foreground">Date</th>
                        <th className="text-left px-5 py-3 font-black text-[10px] uppercase text-muted-foreground">Customer</th>
                        <th className="text-right px-5 py-3 font-black text-[10px] uppercase text-muted-foreground">Total</th>
                        <th className="text-right px-5 py-3 font-black text-[10px] uppercase text-emerald-600">Paid</th>
                        <th className="text-right px-5 py-3 font-black text-[10px] uppercase text-rose-500">Remaining</th>
                        <th className="text-center px-5 py-3 font-black text-[10px] uppercase text-muted-foreground">Status</th>
                      </tr></thead>
                      <tbody>{list.map(renderCatRow)}</tbody>
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
                      <p className="text-xs text-muted-foreground">{base.length} bill{base.length !== 1 ? 's' : ''} · {fmt(base.reduce((s, i) => s + i.totalAmount, 0))} total</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-destructive/10 text-destructive border border-destructive/20">{pending.length} Pending</span>
                    <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-success/10 text-success border border-success/20">{completed.length} Done</span>
                  </div>
                </div>
                {base.length === 0 && <p className="text-center text-muted-foreground text-sm py-6">No bills in this category yet.</p>}
                {renderCatTable(pending, 'Pending Payments', 'text-destructive')}
                {renderCatTable(completed, 'Completed Payments', 'text-success')}
              </div>
            );
          })}

        </div>
      )}

      {/* ── NORMAL TABLE VIEW ── */}
      {filter !== 'category' && <div
        className={cn(
          'rounded-3xl border overflow-hidden shadow-xl animate-fade-up transition-all',
          activeTab === 'private'
            ? 'border-red-500/30 shadow-red-500/10 bg-[#1e0a0a]'
            : 'border-border/50 bg-card'
        )}
        style={{ animationDelay: '100ms' }}
      >
        {activeTab === 'private' && (
          <div className="flex items-center gap-3 px-8 py-4 border-b border-red-500/20 bg-red-600/10">
            <Lock className="w-4 h-4 text-red-400" />
            <span className="text-xs font-black text-red-400 uppercase tracking-[0.2em]">Private Vault — Confidential Records</span>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={cn(
                'border-b',
                activeTab === 'private' ? 'bg-red-500/5 border-red-500/20' : 'bg-muted/20 border-border/50'
              )}>
                <th className="text-left px-5 py-4 font-black text-[10px] uppercase tracking-widest text-muted-foreground w-32">Invoice #</th>
                <th className="text-left px-5 py-4 font-black text-[10px] uppercase tracking-widest text-muted-foreground">Date & Time</th>
                <th className="text-left px-5 py-4 font-black text-[10px] uppercase tracking-widest text-muted-foreground">Customer</th>
                <th className="text-left px-5 py-4 font-black text-[10px] uppercase tracking-widest text-muted-foreground">Generated By</th>
                <th className="text-right px-5 py-4 font-black text-[10px] uppercase tracking-widest text-muted-foreground">Amount</th>
                <th className="text-right px-5 py-4 font-black text-[10px] uppercase tracking-widest text-muted-foreground text-emerald-600">Paid</th>
                <th className="text-right px-5 py-4 font-black text-[10px] uppercase tracking-widest text-muted-foreground text-rose-500">Remaining</th>
                {isSuperAdmin && (
                  <th className="text-center px-5 py-4 font-black text-[10px] uppercase tracking-widest text-muted-foreground">Visibility</th>
                )}
              </tr>
            </thead>
            <tbody>
              {currentBills.map(inv => {
                const paidAmount = inv.totalAmount - (inv.remainingAmount || 0);
                return (
                  <Fragment key={inv.id}>
                    <tr
                      className={cn(
                        'transition-all group',
                        inv.isPrivate
                          ? 'hover:bg-red-500/[0.03]'
                          : 'hover:bg-muted/20'
                      )}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          {inv.isPrivate && <Lock className="w-3 h-3 text-red-400 shrink-0" />}
                          {inv.isImp && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 text-[8px] font-black uppercase tracking-wider border border-amber-500/20 shrink-0 select-none">
                              IMP
                            </span>
                          )}
                          <span className={cn('font-black', inv.isPrivate ? 'text-red-300' : 'text-foreground')}>
                            {inv.invoiceNumber}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 tabular-nums text-muted-foreground">
                        <div className="font-semibold text-slate-700">
                          {new Date(inv.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                        <div className="text-[11px] opacity-75 mt-0.5">
                          {new Date(inv.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-0.5">
                          <span className={cn('font-medium', inv.isPrivate ? 'text-red-200' : 'text-foreground')}>{inv.customerName}</span>
                          {inv.isWorkDone && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 px-1.5 py-0.5 rounded w-fit select-none">
                              <CheckCircle className="w-2.5 h-2.5" /> Work Done by {inv.workDoneBy || 'Staff'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-1">
                          {/* Employee name */}
                          <div className="flex items-center gap-1.5">
                            <User className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className={cn(
                              'font-semibold text-sm',
                              inv.isPrivate ? 'text-slate-300' : 'text-slate-700'
                            )}>
                              {inv.createdBy || 'System'}
                            </span>
                          </div>
                          {/* Role badge */}
                          {inv.createdByRole && (
                            <span className={cn(
                              'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black w-fit',
                              inv.createdByRole === 'Super Admin'
                                ? 'bg-pink-100 text-pink-700 border border-pink-200'
                                : inv.createdByRole.toLowerCase().includes('admin') || inv.createdByRole.toLowerCase().includes('manager')
                                  ? 'bg-violet-100 text-violet-700 border border-violet-200'
                                  : 'bg-slate-100 text-slate-600 border border-slate-200'
                            )}>
                              <BadgeCheck className="w-2.5 h-2.5" />
                              {inv.createdByRole}
                            </span>
                          )}
                          {/* Phone — only visible to super admin */}
                          {isSuperAdmin && inv.createdByPhone && (
                            <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                              <Phone className="w-3 h-3" />
                              {inv.createdByPhone}
                            </div>
                          )}
                          {/* Fallback for old bills with no extra info */}
                          {!inv.createdByRole && !inv.createdBy && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-[11px] text-slate-600">
                              System
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right font-black tabular-nums">
                        <span className={inv.isPrivate ? 'text-red-300' : 'text-foreground'}>{fmt(inv.totalAmount)}</span>
                      </td>
                      <td className="px-5 py-4 text-right font-bold tabular-nums text-emerald-600">
                        {fmt(paidAmount)}
                      </td>
                      <td className="px-5 py-4 text-right font-bold tabular-nums text-rose-500">
                        {fmt(inv.remainingAmount || 0)}
                      </td>

                      {/* Privacy Toggle (Super Admin Only) */}
                      {isSuperAdmin && (
                        <td className="px-5 py-4 text-center">
                          <button
                            onClick={() => handleTogglePrivate(inv)}
                            title={inv.isPrivate ? 'Move to Public' : 'Mark as Private'}
                            className={cn(
                              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all duration-300',
                              inv.isPrivate
                                ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
                                : 'bg-muted border-border text-muted-foreground hover:border-red-300 hover:text-red-500'
                            )}
                          >
                            {inv.isPrivate ? <><Lock className="w-3 h-3" /> Public</> : <><Globe className="w-3 h-3" /> Private</>}
                          </button>
                        </td>
                      )}
                    </tr>
                    <tr
                      className={cn(
                        'border-b border-border/30 last:border-0 transition-all duration-300',
                        inv.isPrivate
                          ? 'border-red-500/10 bg-red-500/[0.01] hover:bg-red-500/[0.03]'
                          : 'bg-muted/5 hover:bg-muted/10'
                      )}
                    >
                      <td colSpan={isSuperAdmin ? 8 : 7} className="px-5 py-2.5">
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
                            <span className={cn(
                              "font-black uppercase tracking-wider text-[9px] px-2 py-0.5 rounded-md border",
                              inv.isPrivate
                                ? "bg-red-500/10 border-red-500/20 text-red-400"
                                : "bg-muted border-border/50 text-muted-foreground"
                            )}>
                              Bill Actions
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            {/* View Bill */}
                            <button
                              onClick={() => { setAutoPrint(false); setPreview(inv); }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-bold transition-all border border-blue-500/20 shadow-sm hover:scale-[1.02] active:scale-[0.98] outline-none"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View Details</span>
                            </button>

                            {/* Edit */}
                            <button
                              onClick={() => navigate(`/edit-bill/${inv.id}`)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold transition-all border border-emerald-500/20 shadow-sm hover:scale-[1.02] active:scale-[0.98] outline-none"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              <span>Edit Bill</span>
                            </button>

                            {/* Print */}
                            <button
                              onClick={() => { setAutoPrint(true); setPreview(inv); }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-500/10 hover:bg-gray-500/20 text-gray-700 dark:text-gray-300 font-bold transition-all border border-gray-500/20 shadow-sm hover:scale-[1.02] active:scale-[0.98] outline-none"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>Print Receipt</span>
                            </button>

                            {/* Work Done Switch */}
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

                            <div className="w-px h-5 bg-border mx-1" />

                            {/* Delete */}
                            <button
                              onClick={() => handleDelete(inv.id, inv.invoiceNumber)}
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
              })}
              {currentBills.length === 0 && (
                <tr>
                  <td colSpan={isSuperAdmin ? 8 : 7} className="px-5 py-20 text-center text-muted-foreground/50 font-black uppercase tracking-widest italic text-sm">
                    {activeTab === 'private' ? '🔒 No private bills yet' : 'No invoices found'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>}

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-background/60 backdrop-blur-2xl z-[100] flex items-center justify-center p-4">
          <div className="bg-card border border-red-500/30 shadow-[0_0_80px_-20px_rgba(239,68,68,0.4)] rounded-3xl w-full max-w-sm p-8 relative animate-fade-up">
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 bg-red-600 rounded-2xl flex items-center justify-center shadow-lg shadow-red-500/30">
              <KeyRound className="w-6 h-6 text-white" />
            </div>
            <button onClick={() => setShowPasswordModal(false)} className="absolute top-4 right-4 p-2 rounded-xl hover:bg-muted transition-colors">
              <X className="w-4 h-4" />
            </button>
            <div className="mt-4 text-center mb-8">
              <h3 className="text-xl font-black uppercase tracking-tight">Private Access</h3>
              <p className="text-xs text-muted-foreground mt-2 font-medium">Enter your password to access confidential data</p>
            </div>
            <div className="space-y-4">
              <input
                type="password"
                autoComplete="new-password"
                data-lpignore="true"
                value={passwordInput}
                onChange={e => { setPasswordInput(e.target.value); setPasswordError(''); }}
                onKeyDown={e => e.key === 'Enter' && handlePasswordSubmit()}
                placeholder="Enter password"
                autoFocus
                className="w-full px-5 py-4 rounded-2xl border border-border/50 bg-background/50 text-sm font-bold tracking-widest focus:outline-none focus:ring-4 focus:ring-red-500/20 focus:border-red-500/50 transition-all text-center"
              />
              {passwordError && (
                <p className="text-xs font-bold text-rose-500 text-center animate-fade-up">{passwordError}</p>
              )}
              <button
                onClick={handlePasswordSubmit}
                className="w-full py-4 bg-red-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.25em] shadow-lg shadow-red-500/30 hover:opacity-90 active:scale-95 transition-all"
              >
                Unlock Access
              </button>
            </div>
          </div>
        </div>
      )}

      {preview && (
        <InvoicePreview invoice={preview} autoPrint={autoPrint} onClose={() => { setPreview(null); setAutoPrint(false); }} />
      )}
    </div>
  );
}
