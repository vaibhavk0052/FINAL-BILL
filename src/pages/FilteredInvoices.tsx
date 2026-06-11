import { useInvoices } from '@/contexts/InvoiceContext';
import { cn } from '@/lib/utils';
import { Eye } from 'lucide-react';
import { useState } from 'react';
import InvoicePreview from '@/components/InvoicePreview';
import type { Invoice } from '@/contexts/InvoiceContext';

const fmt = (n: number) => '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 0 });

export default function FilteredInvoices({ status }: { status: 'completed' | 'pending' }) {
  const { invoices } = useInvoices();
  const [preview, setPreview] = useState<Invoice | null>(null);

  const filtered = invoices.filter(i => i.paymentStatus === status);
  const total = filtered.reduce((s, i) => s + i.totalAmount, 0);

  return (
    <div>
      <div className="mb-8 animate-fade-up">
        <h1 className="text-2xl font-bold tracking-tight text-foreground capitalize">{status} Invoices</h1>
        <p className="text-sm text-muted-foreground mt-1">{filtered.length} invoices · Total: {fmt(total)}</p>
      </div>

      <div className="bg-card rounded-xl border border-border/50 shadow-card overflow-hidden animate-fade-up" style={{ animationDelay: '100ms' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-muted/30">
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Invoice #</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Customer</th>
                <th className="text-right px-5 py-3 font-medium text-muted-foreground">Amount</th>
                <th className="text-right px-5 py-3 font-medium text-muted-foreground">Remaining</th>
                <th className="text-right px-5 py-3 font-medium text-muted-foreground">Date</th>
                <th className="text-center px-5 py-3 font-medium text-muted-foreground">View</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(inv => (
                <tr key={inv.id} className="border-b border-border/30 last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-5 py-3 font-medium text-card-foreground">
                    <div className="flex items-center gap-2">
                      {inv.isImp && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 text-[8px] font-black uppercase tracking-wider border border-amber-500/20 shrink-0 select-none">
                          IMP
                        </span>
                      )}
                      <span>{inv.invoiceNumber}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3">{inv.customerName}</td>
                  <td className="px-5 py-3 text-right font-medium tabular-nums">{fmt(inv.totalAmount)}</td>
                  <td className="px-5 py-3 text-right font-medium tabular-nums text-destructive">{fmt(inv.remainingAmount || 0)}</td>
                  <td className="px-5 py-3 text-right text-muted-foreground tabular-nums">{inv.createdAt}</td>
                  <td className="px-5 py-3 text-center">
                    <button onClick={() => setPreview(inv)} className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-12 text-center text-muted-foreground">No {status} invoices</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {preview && <InvoicePreview invoice={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}
