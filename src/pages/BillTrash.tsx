import { useInvoices } from '@/contexts/InvoiceContext';
import { cn } from '@/lib/utils';
import { Trash2, Eye, RefreshCw, X, ShieldAlert, BadgeCheck, User, Phone, Printer } from 'lucide-react';
import { useState, Fragment } from 'react';
import InvoicePreview from '@/components/InvoicePreview';
import type { Invoice } from '@/contexts/InvoiceContext';
import { toast } from 'sonner';

const fmt = (n: number) => '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 0 });

export default function BillTrash() {
  const { deletedInvoices, restoreInvoice, permanentlyDeleteInvoice } = useInvoices();
  const [preview, setPreview] = useState<Invoice | null>(null);
  const [autoPrint, setAutoPrint] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [showBulkMenu, setShowBulkMenu] = useState(false);

  const filteredBills = deletedInvoices.filter(i => 
    i.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.customerName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRestore = (id: string, number: string) => {
    restoreInvoice(id);
    toast.success(`Bill ${number} recovered successfully!`);
  };

  const handlePermanentDelete = (id: string, number: string) => {
    if (confirm(`Are you absolutely sure you want to PERMANENTLY delete bill ${number}? This action CANNOT be undone.`)) {
      permanentlyDeleteInvoice(id);
      toast.success(`Bill ${number} permanently deleted.`);
    }
  };

  const handleRecoverAll = () => {
    if (deletedInvoices.length === 0) return;
    if (confirm(`Are you sure you want to recover all ${deletedInvoices.length} deleted bills?`)) {
      deletedInvoices.forEach(inv => restoreInvoice(inv.id));
      toast.success(`All ${deletedInvoices.length} bills recovered successfully!`);
      setShowBulkMenu(false);
    }
  };

  const handleEmptyTrash = () => {
    if (deletedInvoices.length === 0) return;
    if (confirm(`Are you absolutely sure you want to PERMANENTLY delete all ${deletedInvoices.length} bills? This action is permanent and CANNOT be undone.`)) {
      deletedInvoices.forEach(inv => permanentlyDeleteInvoice(inv.id));
      toast.success(`Trashbin emptied successfully.`);
      setShowBulkMenu(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-up relative z-50">
        <div className="space-y-1">
          <h1 className="text-2xl font-black tracking-tight text-foreground uppercase italic px-2 border-l-8 border-rose-500 leading-none">Bill Trashbin</h1>
          <p className="text-sm text-muted-foreground pl-3">Recover soft-deleted invoices or permanently remove them from the system</p>
        </div>

        {/* Stats Pill / Bulk Action Button */}
        <div className="flex items-center gap-3 relative z-50">
          <button
            onClick={() => setShowBulkMenu(!showBulkMenu)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-rose-500 to-pink-600 text-white font-black hover:from-rose-600 hover:to-pink-700 transition-all text-xs uppercase tracking-wider shadow-lg shadow-rose-500/20 active:scale-95 cursor-pointer outline-none border-none"
          >
            <Trash2 className="w-3.5 h-3.5 animate-pulse" /> {deletedInvoices.length} Deleted Bills
          </button>

          {showBulkMenu && (
            <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl bg-white border border-slate-150 shadow-[0_12px_40px_rgba(0,0,0,0.18)] p-2 z-[9999] animate-fade-up">
              <button
                type="button"
                onClick={handleRecoverAll}
                className="w-full text-left px-4 py-3 rounded-xl text-xs font-black text-slate-700 hover:bg-emerald-50 hover:text-emerald-600 transition-all flex items-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5 text-emerald-500" /> Recover All Bills
              </button>
              <button
                type="button"
                onClick={handleEmptyTrash}
                className="w-full text-left px-4 py-3 rounded-xl text-xs font-black text-rose-600 hover:bg-rose-50 transition-all flex items-center gap-2 mt-1"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-500" /> Empty Trashbin
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Info Warning Banner */}
      <div className="flex items-center gap-3 px-5 py-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl text-amber-700 text-xs font-bold animate-fade-up">
        <ShieldAlert className="w-4 h-4 shrink-0 text-amber-500" />
        Super Admin Vault — The bills deleted by any employees are held here. They are completely hidden from sales reports, dashboard charts, and daily summaries until recovered.
      </div>

      {/* Search Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-4 bg-card border border-border/50 p-4 rounded-3xl animate-fade-up">
        <div className="relative w-full">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Bill Number or Customer Name..."
            className="w-full pl-4 pr-10 py-3 rounded-2xl border border-input bg-background/50 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-rose-500 transition-shadow"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Bills Table / Empty State */}
      {filteredBills.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center bg-card border border-border/30 rounded-3xl shadow-xl min-h-[300px] animate-fade-up">
          <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 mb-4 border border-rose-100">
            <Trash2 className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-black text-slate-800 uppercase tracking-wider">Trashbin is Empty</h3>
          <p className="text-slate-500 text-sm max-w-sm mt-1">There are no soft-deleted bills matching your search.</p>
        </div>
      ) : (
        <div className="rounded-3xl border border-border/50 bg-card overflow-hidden shadow-xl animate-fade-up">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/20 border-b border-border/50">
                  <th className="text-left px-5 py-4 font-black text-[10px] uppercase tracking-widest text-muted-foreground w-32">Invoice #</th>
                  <th className="text-left px-5 py-4 font-black text-[10px] uppercase tracking-widest text-muted-foreground">Date & Time Info</th>
                  <th className="text-left px-5 py-4 font-black text-[10px] uppercase tracking-widest text-muted-foreground">Customer</th>
                  <th className="text-left px-5 py-4 font-black text-[10px] uppercase tracking-widest text-muted-foreground">Deleted By</th>
                  <th className="text-right px-5 py-4 font-black text-[10px] uppercase tracking-widest text-muted-foreground">Amount</th>
                  <th className="text-right px-5 py-4 font-black text-[10px] uppercase tracking-widest text-muted-foreground text-emerald-600">Paid</th>
                  <th className="text-right px-5 py-4 font-black text-[10px] uppercase tracking-widest text-muted-foreground text-rose-500">Remaining</th>
                </tr>
              </thead>
              <tbody>
                {filteredBills.map(inv => {
                  const paidAmount = inv.totalAmount - (inv.remainingAmount || 0);
                  return (
                    <Fragment key={inv.id}>
                      <tr className="hover:bg-muted/20 transition-all group">
                        <td className="px-5 py-4">
                          <span className="font-black text-slate-700">{inv.invoiceNumber}</span>
                        </td>
                        <td className="px-5 py-4 tabular-nums text-muted-foreground">
                          <div className="font-semibold text-slate-700">
                            Orig: {new Date(inv.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </div>
                          <div className="text-[11px] text-rose-500 font-medium mt-0.5">
                            Del: {inv.deletedAt 
                              ? new Date(inv.deletedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                              : 'N/A'
                            }
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="font-medium text-slate-800">{inv.customerName}</span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5">
                              <User className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="font-semibold text-sm text-slate-700">{inv.createdBy || 'System'}</span>
                            </div>
                            {inv.createdByRole && (
                              <span className={cn(
                                'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black w-fit',
                                inv.createdByRole === 'Super Admin'
                                  ? 'bg-pink-100 text-pink-700 border border-pink-200'
                                  : 'bg-violet-100 text-violet-700 border border-violet-200'
                              )}>
                                <BadgeCheck className="w-2.5 h-2.5" />
                                {inv.createdByRole}
                              </span>
                            )}
                            {inv.createdByPhone && (
                              <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                                <Phone className="w-3 h-3" />
                                {inv.createdByPhone}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right font-black text-slate-800 tabular-nums">
                          {fmt(inv.totalAmount)}
                        </td>
                        <td className="px-5 py-4 text-right font-bold tabular-nums text-emerald-600">
                          {fmt(paidAmount)}
                        </td>
                        <td className="px-5 py-4 text-right font-bold tabular-nums text-rose-500">
                          {fmt(inv.remainingAmount || 0)}
                        </td>
                      </tr>
                      <tr className="border-b border-border/30 last:border-0 bg-muted/5 hover:bg-muted/10 transition-all duration-300">
                        <td colSpan={7} className="px-5 py-2.5">
                          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                            <div className="flex items-center gap-2">
                              <span className="font-black uppercase tracking-wider text-[9px] px-2 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-600">
                                Trash Actions
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              {/* View Bill */}
                              <button
                                onClick={() => { setPreview(inv); setAutoPrint(false); }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-500/10 hover:bg-violet-500/20 text-violet-600 dark:text-violet-400 font-bold transition-all border border-violet-500/20 shadow-sm hover:scale-[1.02] active:scale-[0.98] outline-none"
                                title="View Bill Details"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>View Details</span>
                              </button>

                              {/* Recovery / Restore */}
                              <button
                                onClick={() => handleRestore(inv.id, inv.invoiceNumber)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold transition-all border border-emerald-500/20 shadow-sm hover:scale-[1.02] active:scale-[0.98] outline-none"
                                title="Recover Bill"
                              >
                                <RefreshCw className="w-3.5 h-3.5 animate-spin-slow" />
                                <span>Recover Bill</span>
                              </button>

                              <div className="w-px h-5 bg-border mx-1" />

                              {/* Delete Permanently */}
                              <button
                                onClick={() => handlePermanentDelete(inv.id, inv.invoiceNumber)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold transition-all border border-rose-500/20 shadow-sm hover:scale-[1.02] active:scale-[0.98] outline-none"
                                title="Permanently Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete Permanently</span>
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Invoice View Modal */}
      {preview && (
        <InvoicePreview 
          invoice={preview} 
          autoPrint={autoPrint} 
          onClose={() => { setPreview(null); setAutoPrint(false); }} 
        />
      )}
    </div>
  );
}
