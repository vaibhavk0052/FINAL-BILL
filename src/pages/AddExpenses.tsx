import { useState, useEffect } from 'react';
import { IndianRupee, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { listenToExpenses, addExpenseRecordToFirestore, deleteExpenseRecordFromFirestore } from '@/firebase/firestore';

interface Expense {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
}

const fmt = (n: number) => '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2 });

export default function AddExpenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);

  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('General');

  useEffect(() => {
    const unsubscribe = listenToExpenses((data) => {
      setExpenses(data);
    });
    return unsubscribe;
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount) {
      toast.error('Please enter description and amount');
      return;
    }

    const newExpense = {
      id: crypto.randomUUID(),
      date,
      description,
      amount: Number(amount),
      category
    };

    addExpenseRecordToFirestore(newExpense)
      .then(() => {
        toast.success('Expense added successfully');
        setDescription('');
        setAmount('');
      })
      .catch(err => {
        console.error(err);
        toast.error('Failed to save expense');
      });
  };

  const deleteExpense = (id: string) => {
    deleteExpenseRecordFromFirestore(id)
      .then(() => {
        toast.success('Expense deleted');
      })
      .catch(err => {
        console.error(err);
        toast.error('Failed to delete expense');
      });
  };

  return (
    <div className="w-full space-y-6">
      <div className="animate-fade-up">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Add Expenses</h1>
        <p className="text-sm text-muted-foreground mt-1">Manually log and track your business expenses</p>
      </div>

      <div className="flex flex-col gap-6 animate-fade-up" style={{ animationDelay: '100ms' }}>
        {/* Expense Form */}
        <div className="bg-card rounded-xl border border-border/50 shadow-card p-5">
          <h2 className="font-semibold text-lg mb-4">New Expense Entry</h2>
          <form onSubmit={handleSubmit} className="flex flex-col md:flex-row items-end gap-4">
            <div className="w-full md:w-40">
              <label className="block text-sm font-medium mb-1.5 text-foreground">Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} required
                className="w-full px-3 py-2 rounded-lg border border-input bg-background/50 focus:outline-none focus:ring-2 focus:ring-ring/20" />
            </div>

            <div className="w-full md:w-48">
              <label className="block text-sm font-medium mb-1.5 text-foreground">Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background/50 focus:outline-none focus:ring-2 focus:ring-ring/20">
                <option value="General">General</option>
                <option value="Supplies">Supplies</option>
                <option value="Travel">Travel</option>
                <option value="Utilities">Utilities</option>
                <option value="Food & Dining">Food &amp; Dining</option>
                <option value="Maintenance">Maintenance</option>
              </select>
            </div>

            <div className="flex-1 w-full">
              <label className="block text-sm font-medium mb-1.5 text-foreground">Description</label>
              <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Printer Ink" required
                className="w-full px-3 py-2 rounded-lg border border-input bg-background/50 focus:outline-none focus:ring-2 focus:ring-ring/20" />
            </div>

            <div className="w-full md:w-32">
              <label className="block text-sm font-medium mb-1.5 text-foreground">Amount</label>
              <input type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" required
                className="w-full px-3 py-2 rounded-lg border border-input bg-background/50 focus:outline-none focus:ring-2 focus:ring-ring/20" />
            </div>

            <div className="w-full md:w-auto">
              <button type="submit" className="w-full md:w-max py-2 px-4 rounded-lg bg-primary text-primary-foreground font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity whitespace-nowrap">
                <Plus className="w-4 h-4" /> Add Expense
              </button>
            </div>
          </form>
        </div>

        {/* Expense List Table */}
        <div className="bg-card rounded-xl border border-border/50 shadow-card flex flex-col overflow-hidden">
          <div className="p-4 border-b border-border/50 bg-muted/10 flex justify-between items-center">
            <h3 className="font-semibold text-foreground text-sm">Recent Expenses</h3>
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest bg-muted px-2 py-1 rounded-full border">
              Total: {fmt(expenses.reduce((acc, curr) => acc + curr.amount, 0))}
            </span>
          </div>

          <div className="overflow-y-auto w-full relative" style={{ maxHeight: '400px' }}>
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-card shadow-sm">
                <tr className="border-b border-border/50 bg-muted/20">
                  <th className="text-left px-5 py-4 font-medium text-muted-foreground w-28 shadow-sm">Date</th>
                  <th className="text-left px-5 py-4 font-medium text-muted-foreground w-32 shadow-sm">Category</th>
                  <th className="text-left px-5 py-4 font-medium text-muted-foreground shadow-sm">Description</th>
                  <th className="text-right px-5 py-4 font-medium text-muted-foreground shadow-sm">Amount</th>
                  <th className="text-center px-5 py-4 font-medium text-muted-foreground w-20 shadow-sm">Action</th>
                </tr>
              </thead>
              <tbody>
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-muted-foreground">No expenses recorded yet.</td>
                  </tr>
                ) : (
                  expenses.map(exp => (
                    <tr key={exp.id} className="border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-3 text-muted-foreground">{new Date(exp.date).toLocaleDateString()}</td>
                      <td className="px-5 py-3">
                        <span className="px-2 py-1 bg-muted rounded-md text-xs font-semibold text-muted-foreground">
                          {exp.category}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-medium text-card-foreground">{exp.description}</td>
                      <td className="px-5 py-3 text-right tabular-nums text-foreground font-semibold">{fmt(exp.amount)}</td>
                      <td className="px-5 py-3 flex items-center justify-center">
                        <button onClick={() => deleteExpense(exp.id)} className="p-1.5 rounded-md text-destructive hover:bg-destructive/10 transition-colors" title="Delete">
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
