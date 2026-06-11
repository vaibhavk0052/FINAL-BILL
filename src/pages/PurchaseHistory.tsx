import { useState } from 'react';
import { usePurchases } from '@/contexts/PurchaseContext';
import { Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const fmt = (n: number) => '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 });

export default function PurchaseHistory() {
  const { purchases, deletePurchase } = usePurchases();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredPurchases = purchases.filter(p => 
    p.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.itemName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this purchase entry? This will also remove the corresponding expense record.')) {
      deletePurchase(id);
      toast.success('Purchase deleted successfully');
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 animate-fade-up">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Purchase History</h1>
          <p className="text-sm text-muted-foreground mt-1">View all your historical purchases</p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search supplier or item..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 transition-all"
          />
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border/50 shadow-card overflow-x-auto animate-fade-up" style={{ animationDelay: '100ms' }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50 bg-muted/20">
              <th className="text-left px-5 py-4 font-medium text-muted-foreground">Date</th>
              <th className="text-left px-5 py-4 font-medium text-muted-foreground">Supplier Name</th>
              <th className="text-left px-5 py-4 font-medium text-muted-foreground">Item Name</th>
              <th className="text-center px-5 py-4 font-medium text-muted-foreground">Qty</th>
              <th className="text-right px-5 py-4 font-medium text-muted-foreground">Total Amount</th>
              <th className="text-center px-5 py-4 font-medium text-muted-foreground w-20">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPurchases.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-muted-foreground">No purchases found.</td>
              </tr>
            ) : (
              filteredPurchases.map(p => (
                <tr key={p.id} className="border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3 text-muted-foreground">{p.date}</td>
                  <td className="px-5 py-3 font-medium text-card-foreground">{p.supplierName}</td>
                  <td className="px-5 py-3 text-muted-foreground">{p.itemName}</td>
                  <td className="px-5 py-3 text-center">{p.quantity}</td>
                  <td className="px-5 py-3 text-right font-medium tabular-nums text-foreground">{fmt(p.totalAmount)}</td>
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
  );
}
