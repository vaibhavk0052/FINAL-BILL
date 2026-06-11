import { useState } from 'react';
import { usePurchases } from '@/contexts/PurchaseContext';
import { ShoppingCart, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const fmt = (n: number) => '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 });

export default function PurchaseEntry() {
  const { purchases, addPurchase, deletePurchase } = usePurchases();
  
  const [supplierName, setSupplierName] = useState('');
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierName || !itemName || !quantity || !price || !date) {
      toast.error('Please fill in all fields');
      return;
    }

    const qty = Number(quantity);
    const prc = Number(price);

    addPurchase({
      id: crypto.randomUUID(),
      supplierName,
      itemName,
      quantity: qty,
      price: prc,
      totalAmount: qty * prc,
      date,
    });

    toast.success('Purchase saved successfully!');
    setSupplierName('');
    setItemName('');
    setQuantity('');
    setPrice('');
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this purchase entry? This will also remove the corresponding expense record.')) {
      deletePurchase(id);
      toast.success('Purchase deleted successfully');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-12 animate-fade-up">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Purchase Entry & History</h1>
        <p className="text-sm text-muted-foreground mt-1">Record new purchases and manage historical supplier transactions</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Entry Form Card */}
        <div className="lg:col-span-1 bg-card rounded-xl border border-border/50 shadow-card p-6">
          <h2 className="font-semibold text-card-foreground mb-4 flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-muted-foreground" /> New Purchase
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase mb-1.5">Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-input bg-background/50 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-shadow" />
            </div>
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase mb-1.5">Supplier Name</label>
              <input type="text" value={supplierName} onChange={e => setSupplierName(e.target.value)} placeholder="e.g. Amazon"
                className="w-full px-3 py-2.5 rounded-lg border border-input bg-background/50 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-shadow" />
            </div>
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase mb-1.5">Item Name</label>
              <input type="text" value={itemName} onChange={e => setItemName(e.target.value)} placeholder="e.g. Printer Ink"
                className="w-full px-3 py-2.5 rounded-lg border border-input bg-background/50 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-shadow" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1.5">Quantity</label>
                <input type="number" min="1" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="1"
                  className="w-full px-3 py-2.5 rounded-lg border border-input bg-background/50 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-shadow" />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1.5">Price</label>
                <input type="number" min="0" step="0.01" value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00"
                  className="w-full px-3 py-2.5 rounded-lg border border-input bg-background/50 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-shadow font-mono" />
              </div>
            </div>
            <div className="pt-4">
              <button type="submit" className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/20">
                <ShoppingCart className="w-4 h-4" />
                Save Purchase
              </button>
            </div>
          </form>
        </div>

        {/* History Table Card */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="font-semibold text-card-foreground text-lg flex items-center gap-2">
              Purchase History
              <span className="text-xs bg-muted text-muted-foreground font-bold px-2 py-0.5 rounded-full border border-border/50">
                {purchases.length} Records
              </span>
            </h2>
          </div>

          <div className="bg-card rounded-xl border border-border/50 shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/20">
                    <th className="text-left px-5 py-4 font-black text-[10px] uppercase tracking-widest text-muted-foreground">Date</th>
                    <th className="text-left px-5 py-4 font-black text-[10px] uppercase tracking-widest text-muted-foreground">Supplier</th>
                    <th className="text-left px-5 py-4 font-black text-[10px] uppercase tracking-widest text-muted-foreground">Item Name</th>
                    <th className="text-center px-5 py-4 font-black text-[10px] uppercase tracking-widest text-muted-foreground">Qty</th>
                    <th className="text-right px-5 py-4 font-black text-[10px] uppercase tracking-widest text-muted-foreground">Total Amount</th>
                    <th className="text-center px-5 py-4 font-black text-[10px] uppercase tracking-widest text-muted-foreground w-20">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {purchases.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center text-muted-foreground font-medium italic opacity-60">No purchases found.</td>
                    </tr>
                  ) : (
                    purchases.map(p => (
                      <tr key={p.id} className="border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-5 py-3 text-muted-foreground font-medium">{p.date}</td>
                        <td className="px-5 py-3 font-semibold text-card-foreground">{p.supplierName}</td>
                        <td className="px-5 py-3 text-muted-foreground font-medium">{p.itemName}</td>
                        <td className="px-5 py-3 text-center font-bold">{p.quantity}</td>
                        <td className="px-5 py-3 text-right font-black tabular-nums text-foreground">{fmt(p.totalAmount)}</td>
                        <td className="px-5 py-3 text-center">
                          <button
                            onClick={() => handleDelete(p.id)}
                            className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                            title="Delete Purchase Entry"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
