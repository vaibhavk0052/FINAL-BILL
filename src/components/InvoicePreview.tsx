import { type Invoice } from '@/contexts/InvoiceContext';
import { useEffect } from 'react';
import { X, Printer, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

const fmt = (n: number) => '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2 });

interface Props {
  invoice: Invoice;
  onClose: () => void;
  autoPrint?: boolean;
}

export default function InvoicePreview({ invoice, onClose, autoPrint = false }: Props) {
  const handlePrint = () => window.print();

  useEffect(() => {
    if (autoPrint) {
      const timer = setTimeout(() => {
        handlePrint();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [autoPrint]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card rounded-2xl shadow-elevated w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4 animate-scale-in" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <h2 className="font-semibold text-card-foreground">Invoice Preview</h2>
            <span className={cn(
              'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium uppercase tracking-wider',
              invoice.paymentStatus === 'completed' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
            )}>
              {invoice.paymentStatus}
            </span>
          </div>
          <div className="flex gap-2">
            <button onClick={handlePrint} className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
              <Printer className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Invoice Body */}
        <div className="p-6 space-y-6 print-only">
          {/* Company Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Zap className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-card-foreground">PhotoBill Pro</h3>
                <p className="text-xs text-muted-foreground">Professional Billing</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-black text-lg text-card-foreground uppercase tracking-wide">{invoice.invoiceNumber}</p>
              <p className="text-xs font-medium text-muted-foreground mt-1">
                {new Date(invoice.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} - {new Date(invoice.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
              </p>
              <span className={cn(
                'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1.5 uppercase tracking-wider',
                invoice.paymentStatus === 'completed' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
              )}>
                {invoice.paymentStatus}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted/50 rounded-lg p-5">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Bill To</p>
              <p className="font-medium text-lg text-card-foreground">{invoice.customerName}</p>
              {invoice.customerPhone && <p className="text-sm text-muted-foreground mt-1">{invoice.customerPhone}</p>}
              {invoice.customerEmail && <p className="text-sm text-muted-foreground">{invoice.customerEmail}</p>}
            </div>
            <div className="sm:text-right">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Billed By</p>
              <p className="font-bold text-lg text-card-foreground">{invoice.createdBy || 'System'}</p>
            </div>
          </div>

          {invoice.description && (
            <div className="px-1 border-l-2 border-primary/20 bg-primary/5 py-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Description</p>
              <p className="text-sm text-card-foreground whitespace-pre-wrap">{invoice.description}</p>
            </div>
          )}

          {/* Items Table */}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 font-medium text-muted-foreground">Item</th>
                <th className="text-center py-2 font-medium text-muted-foreground">Qty</th>
                <th className="text-right py-2 font-medium text-muted-foreground">Price</th>
                <th className="text-right py-2 font-medium text-muted-foreground">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, i) => (
                <tr key={i} className="border-b border-border/30">
                  <td className="py-2 text-card-foreground">{item.name}</td>
                  <td className="py-2 text-center tabular-nums">{item.quantity}</td>
                  <td className="py-2 text-right tabular-nums">{fmt(item.price)}</td>
                  <td className="py-2 text-right font-medium tabular-nums">{fmt(item.quantity * item.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals & Payments */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-border">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Payment Details</p>
              {invoice.paymentHistory && invoice.paymentHistory.length > 0 ? (
                <div className="space-y-1">
                  {invoice.paymentHistory.map((ph, idx) => (
                    <div key={idx} className="flex justify-between text-sm items-center">
                      <div className="flex items-center gap-1.5">
                        <span className="text-muted-foreground text-xs">{new Date(ph.date).toLocaleDateString()}</span>
                        <span className={cn("text-[8px] font-black uppercase px-1.5 py-0.5 rounded-sm", ph.method === 'cash' ? "bg-emerald-500/10 text-emerald-600" : "bg-blue-500/10 text-blue-600")}>{ph.method}</span>
                        {ph.note && <span className="text-[10px] text-muted-foreground hidden sm:inline-block">- {ph.note}</span>}
                      </div>
                      <span className="font-medium text-foreground">{fmt(ph.amount)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm pt-2 mt-2 border-t border-dotted border-border font-bold">
                    <span className="text-foreground">Total Paid</span>
                    <span className="text-foreground">{fmt((invoice.cashAmount || 0) + (invoice.onlineAmount || 0))}</span>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Cash Payment</span>
                    <span className="font-medium text-foreground">{fmt(invoice.cashAmount || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Online Payment</span>
                    <span className="font-medium text-foreground">{fmt(invoice.onlineAmount || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground font-semibold text-primary">Advance Payment</span>
                    <span className="font-bold text-primary">{fmt(invoice.advanceAmount || 0)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between text-sm pt-2 mt-2 border-t border-dotted border-border">
                <span className="font-bold text-destructive">Remaining Balance</span>
                <span className="font-bold text-destructive">{fmt(invoice.remainingAmount || 0)}</span>
              </div>
            </div>

            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span className="tabular-nums font-medium text-foreground">{fmt(invoice.subtotal)}</span></div>
              {invoice.discount > 0 && <div className="flex justify-between text-muted-foreground"><span>Discount</span><span className="tabular-nums text-success">-{fmt(invoice.discount)}</span></div>}
              <div className="flex justify-between text-muted-foreground"><span>Taxable Amount</span><span className="tabular-nums">{fmt(invoice.taxableAmount)}</span></div>
              {invoice.gstEnabled && <div className="flex justify-between text-muted-foreground"><span>GST (18%)</span><span className="tabular-nums">{fmt(invoice.gstAmount)}</span></div>}
              <div className="flex justify-between font-bold text-lg text-primary pt-2 border-t border-border">
                <span>Total Amount</span><span className="tabular-nums">{fmt(invoice.totalAmount)}</span>
              </div>
              {invoice.remainingAmount > 0 && (
                <div className="flex justify-between font-bold text-lg text-destructive pt-1">
                  <span>Remaining</span><span className="tabular-nums">{fmt(invoice.remainingAmount)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Terms & Conditions for Print */}
          <div className="pt-4 mt-4 border-t border-border break-inside-avoid">
            <h4 className="font-bold text-card-foreground mb-2 text-[10px] uppercase tracking-widest text-center sm:text-left">अटी व शर्ती · Terms & Conditions</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-[8px] sm:text-[9px] leading-tight">
              <div className="space-y-0">
                <p className="font-bold text-card-foreground">1. पावती शिवाय फोटो दिले जाणार नाहीत.</p>
                <p className="text-muted-foreground text-[7.5px] sm:text-[8px]">No photos will be delivered without receipt.</p>
              </div>
              <div className="space-y-0">
                <p className="font-bold text-card-foreground">2. पूर्ण रक्कम भरल्याशिवाय फोटो तयार केले जाणार नाहीत.</p>
                <p className="text-muted-foreground text-[7.5px] sm:text-[8px]">Photos will not be processed without full payment.</p>
              </div>
              <div className="space-y-0">
                <p className="font-bold text-card-foreground">3. तांत्रिक कारणामुळे फोटो खराब झाल्यास, फोटो पुन्हा काढून दिले जातील.</p>
                <p className="text-muted-foreground text-[7.5px] sm:text-[8px]">If photos are defective due to technical issues, they will be retaken.</p>
              </div>
              <div className="space-y-0">
                <p className="font-bold text-card-foreground">4. फोटो एका महिन्याच्या आत घेऊन जावेत; त्यानंतर आम्ही जबाबदार राहणार नाही.</p>
                <p className="text-muted-foreground text-[7.5px] sm:text-[8px]">Photos must be collected within one month; we are not responsible after that.</p>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-border/50 text-center flex justify-between items-end">
              <div className="text-[9px] text-muted-foreground text-left">
                <p className="font-bold text-foreground">Customer Signature</p>
                <p className="mt-4 border-t border-border w-24 pt-0.5">Authorized Signatory</p>
              </div>
              <div className="text-[9px] text-muted-foreground text-right">
                <p className="font-bold text-foreground">For PhotoBill Pro</p>
                <p className="mt-4 border-t border-border w-24 pt-0.5 inline-block">Authorized Signatory</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
