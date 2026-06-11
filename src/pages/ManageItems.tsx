import { useState } from 'react';
import { useItems, type Item } from '@/contexts/ItemContext';
import { PackagePlus, Trash2, Pencil, Save } from 'lucide-react';
import { toast } from 'sonner';

const fmt = (n: number) => '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 });

export default function ManageItems() {
  const { items, addItem, deleteItem, updateItem } = useItems();
  
  const [itemName, setItemName] = useState('');
  const [price, setPrice] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName || !price) {
      toast.error('Please fill in both fields');
      return;
    }
    
    if (editingId) {
      updateItem({
        id: editingId,
        itemName,
        price: Number(price)
      });
      toast.success('Item updated successfully');
      setEditingId(null);
    } else {
      addItem({
        id: crypto.randomUUID(),
        itemName,
        price: Number(price)
      });
      toast.success('Item added successfully');
    }
    setItemName('');
    setPrice('');
  };

  const handleEdit = (item: Item) => {
    setEditingId(item.id);
    setItemName(item.itemName);
    setPrice(String(item.price));
  };



  return (
    <div className="w-full space-y-6">
      <div className="animate-fade-up">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Manage Items</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your services and products</p>
      </div>

      <div className="flex flex-col gap-6 animate-fade-up" style={{ animationDelay: '100ms' }}>
        {/* Add Item Form */}
        <div className="bg-card rounded-xl border border-border/50 shadow-card p-5">
          <h2 className="font-semibold text-lg mb-4">{editingId ? 'Edit Item' : 'Add New Item'}</h2>
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-end gap-4">
            <div className="flex-1 w-full">
              <label className="block text-sm font-medium mb-1.5 text-foreground">Item Name</label>
              <input type="text" value={itemName} onChange={e => setItemName(e.target.value)} placeholder="e.g. Logo Design"
                className="w-full px-3 py-2 rounded-lg border border-input bg-background/50 focus:outline-none focus:ring-2 focus:ring-ring/20" />
            </div>
            <div className="w-full sm:w-48">
              <label className="block text-sm font-medium mb-1.5 text-foreground">Price</label>
              <input type="number" min="0" value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00"
                className="w-full px-3 py-2 rounded-lg border border-input bg-background/50 focus:outline-none focus:ring-2 focus:ring-ring/20" />
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <button type="submit" className="flex-1 sm:flex-none py-2 px-4 rounded-lg bg-primary text-primary-foreground font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity whitespace-nowrap">
                {editingId ? <Save className="w-4 h-4" /> : <PackagePlus className="w-4 h-4" />}
                {editingId ? 'Update' : 'Add Item'}
              </button>
              {editingId && (
                <button type="button" onClick={() => { setEditingId(null); setItemName(''); setPrice(''); }} className="flex-1 sm:flex-none py-2 px-4 rounded-lg border border-border bg-muted/50 text-foreground font-medium flex items-center justify-center gap-2 hover:bg-muted transition-colors whitespace-nowrap">
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Item List */}
        <div className="bg-card rounded-xl border border-border/50 shadow-card flex flex-col overflow-hidden">
          <div className="overflow-y-auto w-full relative" style={{ maxHeight: '340px' }}>
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-card shadow-sm">
                <tr className="border-b border-border/50 bg-muted/20">
                  <th className="text-left px-5 py-4 font-medium text-muted-foreground w-1/2">Item Name</th>
                  <th className="text-right px-5 py-4 font-medium text-muted-foreground">Price</th>
                  <th className="text-center px-5 py-4 font-medium text-muted-foreground w-32">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-5 py-8 text-center text-muted-foreground">No items found.</td>
                  </tr>
                ) : (
                  items.map(item => (
                    <tr key={item.id} className="border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-3 font-medium text-card-foreground">{item.itemName}</td>
                      <td className="px-5 py-3 text-right tabular-nums text-foreground">{fmt(item.price)}</td>
                      <td className="px-5 py-3 flex items-center justify-center gap-2">
                        <button onClick={() => handleEdit(item)} className="p-1.5 rounded-md text-emerald-500 hover:bg-emerald-500/10 transition-colors" title="Edit">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => deleteItem(item.id)} className="p-1.5 rounded-md text-destructive hover:bg-destructive/10 transition-colors" title="Delete">
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
  );
}
