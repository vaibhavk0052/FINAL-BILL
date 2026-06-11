import { useInvoices } from '@/contexts/InvoiceContext';
import { cn } from '@/lib/utils';
import { Trash2, Eye, Printer, Pencil, Lock, Unlock, Globe, ShieldAlert, KeyRound, X, FileSpreadsheet, Phone, BadgeCheck, User, CheckCircle, Search, Star } from 'lucide-react';
import { useState, Fragment, useEffect } from 'react';
import { getEmployees, type Employee } from '@/firebase/firestore';
import { useNavigate } from 'react-router-dom';
import InvoicePreview from '@/components/InvoicePreview';
import type { Invoice } from '@/contexts/InvoiceContext';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

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
  const [filter, setFilter] = useState<'all' | 'completed' | 'pending' | 'vip'>('all');
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
        i.invoiceNumber?.toLowerCase().includes(query)
      );
    });

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
        togglePrivate(pendingInvoiceId);
        toast.success('Bill moved to Private');
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
          <div className="flex items-center gap-1 p-1 bg-muted rounded-2xl border border-border/30 shrink-0">
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

      {/* Empty private tab note */}
      {activeTab === 'private' && (
        <div className="flex items-center gap-3 px-5 py-3 bg-red-500/5 border border-red-500/20 rounded-2xl text-red-600 text-xs font-bold animate-fade-up">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          Confidential Mode Active — Only you can see these bills. They are excluded from Excel exports by default.
        </div>
      )}

      {/* Bills Table */}
      <div
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
      </div>

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
