import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuotations } from '@/contexts/QuotationContext';
import { useItems } from '@/contexts/ItemContext';
import { Plus, Trash2, FileText, Globe, Lock, User, Phone, BadgeCheck } from 'lucide-react';
import QuotationPreview from '@/components/QuotationPreview';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { getEmployees, type Employee, type Quotation, type QuotationItem } from '@/firebase/firestore';

const fmt = (n: number) => '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2 });

export default function CreateQuotation() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { addQuotation, updateQuotation, quotations } = useQuotations();
  const { items: availableItems } = useItems();
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');

  const existingQuotation = quotations.find(q => q.id === id);

  // Filter out system users
  const actualEmployees = employees.filter(
    e => e.id !== 'mock-superadmin-uid' && e.id !== 'mock-admin-uid'
  );

  // Load employees
  useEffect(() => {
    let unsub = () => { };
    getEmployees((data) => setEmployees(data)).then(fn => { unsub = fn; }).catch(() => { });
    return () => unsub();
  }, []);

  // Pre-fill employee if editing
  useEffect(() => {
    if (id && existingQuotation && actualEmployees.length > 0 && !selectedEmployeeId) {
      const match = actualEmployees.find(
        e => e.name?.toLowerCase() === existingQuotation.createdBy?.toLowerCase()
      );
      if (match) {
        setSelectedEmployeeId(match.id);
      }
    }
  }, [id, existingQuotation, actualEmployees, selectedEmployeeId]);

  const selectedEmployee = actualEmployees.find(e => e.id === selectedEmployeeId);
  const generatorName = selectedEmployee ? selectedEmployee.name : '';
  const generatorPhone = selectedEmployee?.phone || '';
  const generatorRole = selectedEmployee ? selectedEmployee.role : 'Staff';

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [previewQuotation, setPreviewQuotation] = useState<Quotation | null>(null);
  const [items, setItems] = useState<QuotationItem[]>([{ name: '', quantity: 1, price: 0 }]);
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');
  const [discountValue, setDiscountValue] = useState(0);
  const [gstEnabled, setGstEnabled] = useState(false);
  const [quotationNumberInput, setQuotationNumberInput] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  // Initial load or generate number
  useEffect(() => {
    if (id && existingQuotation) {
      setQuotationNumberInput(existingQuotation.quotationNumber);
      setCustomerName(existingQuotation.customerName);
      setCustomerPhone(existingQuotation.customerPhone || '');
      setCustomerEmail(existingQuotation.customerEmail || '');
      setItems(existingQuotation.items);
      setGstEnabled(existingQuotation.gstEnabled);
      setDescription(existingQuotation.description || '');

      const sub = existingQuotation.subtotal || 0;
      const disc = existingQuotation.discount || 0;
      if (disc > 0 && sub > 0 && Math.abs((disc / sub) * 100 - Math.round((disc / sub) * 100)) > 0.1) {
        setDiscountType('fixed');
        setDiscountValue(disc);
      } else {
        setDiscountType('percent');
        setDiscountValue(sub > 0 ? Math.round((disc / sub) * 100) : 0);
      }
    } else if (!id) {
      // Clear inputs
      setCustomerName('');
      setCustomerPhone('');
      setCustomerEmail('');
      setItems([{ name: '', quantity: 1, price: 0 }]);
      setDiscountType('percent');
      setDiscountValue(0);
      setGstEnabled(false);
      setDescription('');
      setSelectedEmployeeId('');

      // Generate next Quotation number
      const qtnNumbers = quotations.map(q => {
        const num = parseInt(q.quotationNumber.replace(/\D/g, ''));
        return isNaN(num) ? 0 : num;
      });
      const maxNum = qtnNumbers.length > 0 ? Math.max(...qtnNumbers) : 0;
      const nextNum = maxNum + 1;
      const paddedNum = String(nextNum).padStart(3, '0');
      setQuotationNumberInput(`QTN-${paddedNum}`);
    }
  }, [id, existingQuotation, quotations]);

  const updateItem = (index: number, field: keyof QuotationItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleItemSelect = (index: number, selectedName: string) => {
    const selectedItem = availableItems.find(i => i.itemName === selectedName);
    const newItems = [...items];
    if (selectedItem) {
      newItems[index] = { ...newItems[index], name: selectedItem.itemName, price: selectedItem.price };
    } else {
      newItems[index] = { ...newItems[index], name: selectedName, price: selectedName === 'Custom Service' ? 0 : newItems[index].price };
    }
    setItems(newItems);
  };

  const addItem = () => setItems(prev => [...prev, { name: '', quantity: 1, price: 0 }]);
  const removeItem = (index: number) => {
    if (items.length > 1) setItems(prev => prev.filter((_, i) => i !== index));
  };

  const subtotal = items.reduce((s, item) => s + (item.quantity || 0) * (item.price || 0), 0);
  const discount = discountType === 'percent' ? (subtotal * Math.max(0, discountValue)) / 100 : Math.max(0, discountValue);
  const taxableAmount = Math.max(0, subtotal - discount);
  const gstAmount = gstEnabled ? taxableAmount * 0.18 : 0;
  const totalAmount = taxableAmount + gstAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!quotationNumberInput.trim()) { setError('Quotation Number is required'); return; }
    if (!selectedEmployeeId) { setError('Please select the employee generating this estimate.'); return; }
    if (!customerName.trim()) { setError('Customer name is required'); return; }
    if (!customerPhone.trim()) { setError('Customer mobile number is required'); return; }
    if (customerPhone.trim().length !== 10) { setError('Customer mobile number must be exactly 10 digits'); return; }
    if (items.some(i => !i.name.trim() || i.quantity <= 0 || i.price <= 0)) {
      setError('All items must have a name, quantity > 0, and price > 0'); return;
    }

    const newQuotation: Quotation = {
      id: existingQuotation ? existingQuotation.id : crypto.randomUUID(),
      quotationNumber: quotationNumberInput.trim(),
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerEmail: customerEmail.trim(),
      description: description.trim(),
      items,
      subtotal,
      discount,
      taxableAmount,
      gstEnabled,
      gstAmount,
      totalAmount,
      createdAt: existingQuotation ? existingQuotation.createdAt : new Date().toISOString(),
      createdBy: existingQuotation ? existingQuotation.createdBy : generatorName,
      createdByRole: existingQuotation ? existingQuotation.createdByRole : generatorRole,
      createdByPhone: existingQuotation ? existingQuotation.createdByPhone : generatorPhone,
    };

    if (existingQuotation) {
      await updateQuotation(newQuotation);
    } else {
      await addQuotation(newQuotation);

      // Reset form fields
      setCustomerName('');
      setCustomerPhone('');
      setCustomerEmail('');
      setItems([{ name: '', quantity: 1, price: 0 }]);
      setDiscountType('percent');
      setDiscountValue(0);
      setGstEnabled(false);
      setDescription('');
      setSelectedEmployeeId('');
    }

    setPreviewQuotation(newQuotation);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8 animate-fade-up">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{id ? 'Edit Quotation' : 'Create Quotation'}</h1>
        <p className="text-sm text-muted-foreground mt-1">{id ? 'Modify existing quotation details' : 'Generate a new estimate proposal for your customer'}</p>
      </div>

      <form onSubmit={handleSubmit} className="animate-fade-up" style={{ animationDelay: '100ms' }}>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
          {/* Main Content Area */}
          <div className="lg:col-span-3 space-y-6">

            {/* Customer Details */}
            <div className="bg-card rounded-xl border border-border/50 shadow-card p-6 space-y-4">
              <h2 className="font-semibold text-card-foreground flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" /> Customer Details
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Quotation Number</label>
                  <input type="text" value={quotationNumberInput} onChange={e => setQuotationNumberInput(e.target.value)} className="px-3 py-2 bg-muted/30 border border-input rounded-lg text-sm font-black focus:outline-none focus:ring-1 focus:ring-primary" placeholder="QTN-001" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Customer Name *</label>
                  <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} className="px-3 py-2 border border-input rounded-lg text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Enter customer name" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Customer Mobile Number *</label>
                  <input type="tel" maxLength={10} value={customerPhone} onChange={e => setCustomerPhone(e.target.value.replace(/\D/g, ''))} className="px-3 py-2 border border-input rounded-lg text-sm font-bold focus:outline-none focus:ring-1 focus:ring-primary" placeholder="10-digit number" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Customer Email Address</label>
                  <input type="email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} className="px-3 py-2 border border-input rounded-lg text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Enter email address" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Employee / Proposal Generated By *</label>
                  <select value={selectedEmployeeId} onChange={e => setSelectedEmployeeId(e.target.value)} className="px-3 py-2 border border-input rounded-lg text-sm font-bold bg-background focus:outline-none focus:ring-1 focus:ring-primary">
                    <option value="">-- Select Employee --</option>
                    {actualEmployees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name} ({emp.role})</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Scope / Description */}
            <div className="bg-card rounded-xl border border-border/50 shadow-card p-6 space-y-3">
              <h3 className="font-semibold text-card-foreground text-xs uppercase tracking-wider">CATEGORY </h3>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className="w-full px-3 py-2 border border-input rounded-lg text-sm outline-none resize-y placeholder:text-muted-foreground" placeholder="Describe the service details or project instructions..." />
            </div>

            {/* Service & Items Table */}
            <div className="bg-card rounded-xl border border-border/50 shadow-card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-card-foreground text-sm uppercase tracking-wider">Services / Quotation Items</h3>
                <button type="button" onClick={addItem} className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-primary hover:opacity-85 transition-all">
                  <Plus className="w-3.5 h-3.5" /> Add Service
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[600px]">
                  <thead>
                    <tr className="border-b border-border/50 bg-muted/20">
                      <th className="text-left py-3 px-3 font-semibold text-muted-foreground">Service Name</th>
                      <th className="text-right py-3 px-3 font-semibold text-muted-foreground w-32">Rate (₹)</th>
                      <th className="text-right py-3 px-3 font-semibold text-muted-foreground w-36">Total (₹)</th>
                      <th className="py-3 px-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={idx} className="border-b border-border/20 hover:bg-muted/5">
                        <td className="py-3 px-3">
                          <div className="flex flex-col gap-1.5">
                            <div className="flex gap-2">
                              <select value={item.name} onChange={e => handleItemSelect(idx, e.target.value)} className="px-2 py-1.5 border border-input rounded text-xs font-semibold bg-background w-44">
                                <option value="">-- Choose Item --</option>
                                {availableItems.map(i => (
                                  <option key={i.id} value={i.itemName}>{i.itemName}</option>
                                ))}
                                <option value="Custom Service">Custom Service / Other</option>
                              </select>
                              <input type="text" value={item.name} onChange={e => updateItem(idx, 'name', e.target.value)} className="px-2 py-1.5 border border-input rounded text-xs font-semibold flex-1" placeholder="Enter service description" />
                            </div>
                            <textarea
                              value={item.description || ''}
                              onChange={e => updateItem(idx, 'description', e.target.value)}
                              placeholder="Service details / description (optional)"
                              rows={1}
                              className="w-full px-2 py-1 border border-input rounded text-[10px] text-muted-foreground bg-background/50 focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/60 font-medium resize-none overflow-hidden transition-all duration-200"
                              style={{ minHeight: '28px' }}
                              onFocus={e => { e.target.rows = 4; }}
                              onBlur={e => { if (!e.target.value) e.target.rows = 1; else e.target.rows = 2; }}
                            />
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <input type="number" min={0} value={item.price || ''} onChange={e => updateItem(idx, 'price', Number(e.target.value))} className="w-full px-2 py-1.5 border border-input rounded text-right text-xs font-bold" />
                        </td>
                        <td className="py-3 px-3 text-right font-black text-xs text-card-foreground">
                          {fmt((item.quantity || 0) * (item.price || 0))}
                        </td>
                        <td className="py-3 px-2">
                          <button type="button" onClick={() => removeItem(idx)} disabled={items.length === 1} className="p-1 hover:bg-red-500/10 hover:text-red-500 rounded disabled:opacity-30 disabled:pointer-events-none transition-all">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Sidebar - Pricing Summary */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-card rounded-xl border border-border/50 shadow-card p-6 space-y-6">
              <h3 className="font-bold text-card-foreground text-sm uppercase tracking-wider">Adjustment Settings</h3>
              <div className="space-y-4">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-muted-foreground">DISCOUNT</label>
                  <div className="flex rounded-lg overflow-hidden border border-input">
                    <select value={discountType} onChange={e => setDiscountType(e.target.value as 'percent' | 'fixed')} className="bg-muted px-2 py-2 text-xs font-bold border-r border-input outline-none">
                      <option value="percent">%</option>
                      <option value="fixed">₹</option>
                    </select>
                    <input type="number" value={discountValue || ''} onChange={e => setDiscountValue(Number(e.target.value))} className="w-full px-3 py-2 text-sm outline-none" placeholder="0" />
                  </div>
                </div>
                <label className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-muted/20 cursor-pointer group">
                  <input type="checkbox" checked={gstEnabled} onChange={e => setGstEnabled(e.target.checked)} className="rounded text-primary w-4 h-4" />
                  <span className="font-bold text-xs">Apply GST (18%)</span>
                </label>
              </div>
            </div>

            <div className="bg-card rounded-xl border border-border/50 shadow-card p-6 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex justify-between text-xs text-muted-foreground font-bold"><span>SUBTOTAL</span><span className="tabular-nums">{fmt(subtotal)}</span></div>
                {discount > 0 && <div className="flex justify-between text-xs font-bold text-success"><span>DISCOUNT</span><span className="tabular-nums">-{fmt(discount)}</span></div>}
                {gstEnabled && <div className="flex justify-between text-xs text-muted-foreground font-bold"><span>GST (18%)</span><span className="tabular-nums">{fmt(gstAmount)}</span></div>}
                <div className="pt-4 border-t border-border/50 flex justify-between items-end">
                  <span className="text-xs font-black text-indigo-600 uppercase">Estimated Total</span>
                  <span className="text-2xl font-black text-indigo-600 tabular-nums tracking-tighter leading-none">{fmt(totalAmount)}</span>
                </div>
              </div>

              {error && <p className="text-[10px] text-red-500 font-bold leading-normal mt-4 animate-shake">{error}</p>}

              <button type="submit" className="w-full py-4 mt-6 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-indigo-600/10 flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] outline-none">
                <FileText className="w-4 h-4" /> {id ? 'Save Changes' : 'Generate Quotation'}
              </button>
            </div>
          </div>
        </div>
      </form>

      {previewQuotation && (
        <QuotationPreview
          quotation={previewQuotation}
          autoPrint={false}
          isNew={!id}
          onClose={() => {
            setPreviewQuotation(null);
            navigate('/quotations');
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
