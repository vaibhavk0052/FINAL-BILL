import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useInvoices, type InvoiceItem, type Invoice, type PaymentEntry } from '@/contexts/InvoiceContext';
import { useItems } from '@/contexts/ItemContext';
import { Plus, Trash2, FileText, Globe, Lock, User, Phone, BadgeCheck } from 'lucide-react';
import InvoicePreview from '@/components/InvoicePreview';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { getEmployees, type Employee } from '@/lib/firebase';

const fmt = (n: number) => '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2 });

export default function CreateBill() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { addInvoice, updateInvoice, invoices } = useInvoices();
  const { items: availableItems } = useItems();
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');

  const existingInvoice = invoices.find(inv => inv.id === id);

  // Filter out system internal/default users to show only actual registered employees
  const actualEmployees = employees.filter(
    e => e.id !== 'mock-superadmin-uid' && e.id !== 'mock-admin-uid'
  );

  // Load employees list to get current user's phone number
  useEffect(() => {
    let unsub = () => { };
    getEmployees((data) => setEmployees(data)).then(fn => { unsub = fn; }).catch(() => { });
    return () => unsub();
  }, []);

  // Default select registered employee ONLY if editing an existing invoice to keep it blank for new bills
  useEffect(() => {
    if (id && existingInvoice && actualEmployees.length > 0 && !selectedEmployeeId) {
      const match = actualEmployees.find(
        e => e.name?.toLowerCase() === existingInvoice.createdBy?.toLowerCase()
      );
      if (match) {
        setSelectedEmployeeId(match.id);
      }
    }
  }, [id, existingInvoice, actualEmployees, selectedEmployeeId]);

  // Find selected employee record for dynamic display
  const selectedEmployee = actualEmployees.find(e => e.id === selectedEmployeeId);
  const generatorName = selectedEmployee ? selectedEmployee.name : '';
  const generatorPhone = selectedEmployee?.phone || '';
  const generatorRole = selectedEmployee ? selectedEmployee.role : 'Staff';

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
  const [items, setItems] = useState<InvoiceItem[]>([{ name: '', quantity: 1, price: 0 }]);
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');
  const [discountValue, setDiscountValue] = useState(0);
  const [gstEnabled, setGstEnabled] = useState(true);
  const [invoiceNumberInput, setInvoiceNumberInput] = useState('');
  const [description, setDescription] = useState('');
  const [cashAmount, setCashAmount] = useState(0);
  const [onlineAmount, setOnlineAmount] = useState(0);
  const [advanceAmount, setAdvanceAmount] = useState(0);
  const [advanceMethod, setAdvanceMethod] = useState<'cash' | 'online'>('cash');


  const [showRemaining, setShowRemaining] = useState(false);
  const [receivedAmount, setReceivedAmount] = useState<number | ''>('');
  const [isPrivate, setIsPrivate] = useState(false);

  const [error, setError] = useState('');
  const [paymentHistory, setPaymentHistory] = useState<PaymentEntry[]>([]);

  useEffect(() => {
    if (id && existingInvoice) {
      setInvoiceNumberInput(existingInvoice.invoiceNumber);
      setCustomerName(existingInvoice.customerName);
      setCustomerPhone(existingInvoice.customerPhone || '');
      setCustomerEmail(existingInvoice.customerEmail || '');
      setItems(existingInvoice.items);
      setDiscountType(existingInvoice.discount > 0 && existingInvoice.subtotal > 0 && Math.abs((existingInvoice.discount / existingInvoice.subtotal) * 100 - Math.round((existingInvoice.discount / existingInvoice.subtotal) * 100)) > 0.1 ? 'fixed' : 'percent');

      const percentValue = existingInvoice.subtotal > 0 ? (existingInvoice.discount / existingInvoice.subtotal) * 100 : 0;
      setDiscountValue(existingInvoice.discount > 0 && existingInvoice.subtotal > 0 && Math.abs(percentValue - Math.round(percentValue)) > 0.1 ? existingInvoice.discount : Math.round(percentValue));

      setGstEnabled(existingInvoice.gstEnabled);
      setDescription(existingInvoice.description || '');
      setCashAmount(existingInvoice.cashAmount || 0);
      setOnlineAmount(existingInvoice.onlineAmount || 0);
      setAdvanceAmount(existingInvoice.advanceAmount || 0);
      setAdvanceMethod(existingInvoice.advanceMethod || 'cash');
      setIsPrivate(existingInvoice.isPrivate || false);

      let history = existingInvoice.paymentHistory || [];
      if (!existingInvoice.paymentHistory && (existingInvoice.cashAmount > 0 || existingInvoice.onlineAmount > 0)) {
        const autoHistory: PaymentEntry[] = [];
        let rCash = existingInvoice.cashAmount || 0;
        let rOnline = existingInvoice.onlineAmount || 0;
        if (existingInvoice.advanceAmount > 0) {
          autoHistory.push({ id: crypto.randomUUID(), date: existingInvoice.createdAt, amount: existingInvoice.advanceAmount, method: existingInvoice.advanceMethod, note: 'Advance Phase' });
          if (existingInvoice.advanceMethod === 'cash') rCash -= existingInvoice.advanceAmount;
          if (existingInvoice.advanceMethod === 'online') rOnline -= existingInvoice.advanceAmount;
        }
        if (rCash > 0) autoHistory.push({ id: crypto.randomUUID(), date: existingInvoice.createdAt, amount: rCash, method: 'cash', note: 'Initial Cash' });
        if (rOnline > 0) autoHistory.push({ id: crypto.randomUUID(), date: existingInvoice.createdAt, amount: rOnline, method: 'online', note: 'Initial Online' });
        history = autoHistory;
      }
      setPaymentHistory(history);
    } else if (!id) {
      // Extract numeric values from existing invoices
      const numericInvoices = invoices.map(inv => {
        const num = parseInt(inv.invoiceNumber.replace(/\D/g, ''));
        return isNaN(num) ? 0 : num;
      });
      const maxNum = numericInvoices.length > 0 ? Math.max(...numericInvoices) : 0;
      const nextNum = maxNum + 1;
      const paddedNum = String(nextNum).padStart(3, '0');
      setInvoiceNumberInput(`INV ${paddedNum}`);
    }
  }, [id, existingInvoice, invoices]);

  const updateItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
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
      // If "Custom Service" or an empty option is selected, clear the price
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
  const remainingAmount = Math.max(0, totalAmount - cashAmount - onlineAmount);
  const paymentStatus: 'completed' | 'pending' = remainingAmount <= 0 ? 'completed' : 'pending';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!invoiceNumberInput.trim()) { setError('Invoice Number is required'); return; }
    if (!selectedEmployeeId) { setError('Please select the employee generating this bill (Employee Name is mandatory).'); return; }
    if (!customerName.trim()) { setError('Customer name is required'); return; }
    if (!customerPhone.trim()) { setError('Customer mobile number is required'); return; }
    if (customerPhone.trim().length !== 10) { setError('Customer mobile number must be exactly 10 digits'); return; }
    if (items.some(i => !i.name.trim() || i.quantity <= 0 || i.price <= 0)) {
      setError('All items must have a name, quantity > 0, and price > 0'); return;
    }

    let finalHistory = paymentHistory;
    if (!existingInvoice) {
      finalHistory = [];
      if (advanceAmount > 0) {
        finalHistory.push({ id: crypto.randomUUID(), date: new Date().toISOString(), amount: advanceAmount, method: advanceMethod, note: 'Advance Phase' });
      }
      const rCash = cashAmount - (advanceMethod === 'cash' ? advanceAmount : 0);
      if (rCash > 0) finalHistory.push({ id: crypto.randomUUID(), date: new Date().toISOString(), amount: rCash, method: 'cash', note: 'Initial Cash' });
      const rOnline = onlineAmount - (advanceMethod === 'online' ? advanceAmount : 0);
      if (rOnline > 0) finalHistory.push({ id: crypto.randomUUID(), date: new Date().toISOString(), amount: rOnline, method: 'online', note: 'Initial Online' });
    }

    const newInvoice: Invoice = {
      id: existingInvoice ? existingInvoice.id : crypto.randomUUID(),
      invoiceNumber: invoiceNumberInput.trim(),
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
      cashAmount,
      onlineAmount,
      advanceAmount,
      advanceMethod,
      remainingAmount,
      paymentStatus,
      paymentHistory: finalHistory,
      isPrivate,
      createdAt: existingInvoice ? existingInvoice.createdAt : new Date().toISOString(),
      createdBy: existingInvoice ? existingInvoice.createdBy : generatorName,
      createdByRole: existingInvoice ? existingInvoice.createdByRole : generatorRole,
      createdByPhone: existingInvoice ? existingInvoice.createdByPhone : generatorPhone,
    };

    if (existingInvoice) {
      updateInvoice(newInvoice);
    } else {
      addInvoice(newInvoice);
      // Automatically send "Thank you" SMS on new bill generation
      if (newInvoice.customerPhone) {
        const text = 'Thank you for visiting our photo studio. Please visit again!';
        const phone = newInvoice.customerPhone.replace(/\D/g, '');
        const finalPhone = phone.length === 10 ? '91' + phone : phone;
        window.open(`https://wa.me/${finalPhone}?text=${encodeURIComponent(text)}`, '_blank');
      }
    }
    setPreviewInvoice(newInvoice);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8 animate-fade-up">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{id ? 'Edit Bill' : 'Create Bill'}</h1>
        <p className="text-sm text-muted-foreground mt-1">{id ? 'Modify existing invoice details' : 'Generate a new invoice for your customer'}</p>
      </div>

      <form onSubmit={handleSubmit} className="animate-fade-up" style={{ animationDelay: '100ms' }}>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
          {/* Main Content Area (Form Fields) */}
          <div className="lg:col-span-3 space-y-6">
            {/* Customer Info */}
            <div className="bg-card rounded-xl border border-border/50 shadow-card p-6 space-y-4" style={{ borderColor: isPrivate ? 'rgba(239,68,68,0.3)' : undefined, background: isPrivate ? 'linear-gradient(135deg, hsl(var(--card)) 0%, rgba(239,68,68,0.03) 100%)' : undefined }}>
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-card-foreground flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground" /> Customer Details
                </h2>

                {/* Public / Private Toggle */}
                <div className="flex items-center gap-1 p-1 bg-muted rounded-xl border border-border/30">
                  <button
                    type="button"
                    onClick={() => setIsPrivate(false)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-300',
                      !isPrivate
                        ? 'bg-card text-emerald-600 shadow-sm border border-emerald-500/20'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Globe className="w-3 h-3" /> Public
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPrivate(true)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-300',
                      isPrivate
                        ? 'bg-red-600 text-white shadow-md shadow-red-500/30'
                        : 'text-muted-foreground hover:text-red-500'
                    )}
                  >
                    <Lock className="w-3 h-3" /> Private
                  </button>
                </div>
              </div>

              {isPrivate && (
                <div className="flex items-center gap-2 px-3 py-2 bg-red-500/5 border border-red-500/20 rounded-xl animate-fade-up">
                  <Lock className="w-3 h-3 text-red-400 shrink-0" />
                  <p className="text-[10px] font-bold text-red-500">This bill will be saved as Private — hidden from dashboard, reports &amp; public lists.</p>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5" id="invoice-number-label">Invoice Bill No *</label>
                  <input
                    type="text" value={invoiceNumberInput} onChange={e => setInvoiceNumberInput(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-input bg-background/50 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-shadow font-medium"
                    placeholder="e.g. APR-001"
                    aria-labelledby="invoice-number-label"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5" id="customer-name-label">Customer Name *</label>
                  <input
                    type="text" value={customerName} onChange={e => setCustomerName(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-input bg-background/50 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-shadow"
                    placeholder="Enter customer name"
                    aria-labelledby="customer-name-label"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5" id="customer-phone-label">Phone No *</label>
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g, '');
                      if (val.length <= 10) {
                        setCustomerPhone(val);
                      }
                    }}
                    className="w-full px-3 py-2.5 rounded-lg border border-input bg-background/50 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-shadow"
                    placeholder="Phone number"
                    aria-labelledby="customer-phone-label"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5" id="customer-email-label">Email (Optional)</label>
                  <input
                    type="email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-input bg-background/50 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-shadow"
                    placeholder="Email address"
                    aria-labelledby="customer-email-label"
                  />
                </div>
              </div>

              {/* Bill Generator Info */}
              <div className="mt-2 p-4 rounded-xl border border-violet-200/60 bg-gradient-to-r from-violet-50 to-indigo-50 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0">
                    <BadgeCheck className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-[10px] font-black text-violet-500 uppercase tracking-widest">Bill Generated By</span>
                </div>
                <div className="flex flex-wrap gap-4 flex-1">
                  {/* Select Employee Dropdown */}
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-violet-400" />
                    <div>
                      <p className="text-[10px] text-violet-400 font-bold uppercase mb-0.5">Employee Name</p>
                      <select
                        value={selectedEmployeeId}
                        onChange={(e) => setSelectedEmployeeId(e.target.value)}
                        className="bg-white/80 border border-violet-200 rounded-lg px-2 py-0.5 text-xs font-black text-violet-800 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 cursor-pointer"
                      >
                        <option value="" className="text-slate-400 italic font-semibold">Select Employee *</option>
                        {actualEmployees.map((emp) => (
                          <option key={emp.id} value={emp.id} className="font-semibold text-slate-800">
                            {emp.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {/* Role */}
                  <div className="flex items-center gap-2">
                    <BadgeCheck className="w-3.5 h-3.5 text-violet-400" />
                    <div>
                      <p className="text-[10px] text-violet-400 font-bold uppercase">Role</p>
                      <span className={cn(
                        'text-xs font-black px-2 py-0.5 rounded-full',
                        !selectedEmployeeId
                          ? 'bg-slate-100 text-slate-400 border border-slate-200 italic'
                          : generatorRole === 'Super Admin'
                            ? 'bg-pink-100 text-pink-700 border border-pink-200'
                            : 'bg-violet-100 text-violet-700 border border-violet-200'
                      )}>
                        {selectedEmployeeId ? generatorRole : 'Select Employee'}
                      </span>
                    </div>
                  </div>
                  {/* Phone */}
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-violet-400" />
                    <div>
                      <p className="text-[10px] text-violet-400 font-bold uppercase">Phone No</p>
                      <p className="text-sm font-black text-violet-800">
                        {selectedEmployeeId ? (generatorPhone || <span className="text-violet-400 font-medium text-xs italic">Not registered</span>) : <span className="text-slate-400 font-medium text-xs italic">Select Employee</span>}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-2">
                <label className="block text-sm font-medium text-foreground mb-1.5" id="description-label">Description (Optional)</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-input bg-background/50 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-shadow"
                  placeholder="Add extra details or notes"
                  rows={2}
                  aria-labelledby="description-label"
                />
              </div>
            </div>

            {/* Line Items */}
            <div className="bg-card rounded-xl border border-border/50 shadow-card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-card-foreground text-lg">Line Items</h2>
                <button type="button" onClick={addItem} className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:opacity-80 transition-all bg-primary/10 px-4 py-2 rounded-lg">
                  <Plus className="w-4 h-4" /> Add Item
                </button>
              </div>
              <div className="space-y-3">
                {items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_70px_100px_40px] gap-3 items-end p-3 rounded-xl bg-muted/20 border border-border/30">
                    <div>
                      {idx === 0 && <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Service</label>}
                      <select value={item.name} onChange={e => handleItemSelect(idx, e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background/80 text-sm">
                        <option value="" disabled>Select</option>
                        {availableItems.map(ai => <option key={ai.id} value={ai.itemName}>{ai.itemName}</option>)}
                        <option value="Custom Service">Custom Service</option>
                      </select>
                    </div>
                    <div>
                      {idx === 0 && <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Qty</label>}
                      <input type="number" min={1} value={item.quantity} onChange={e => updateItem(idx, 'quantity', Number(e.target.value))} className="w-full px-3 py-2 rounded-lg border border-input text-sm" />
                    </div>
                    <div>
                      {idx === 0 && <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Price</label>}
                      <input type="number" min={0} value={item.price} onChange={e => updateItem(idx, 'price', Number(e.target.value))} className="w-full px-3 py-2 rounded-lg border border-input text-sm" />
                    </div>
                    <button type="button" onClick={() => removeItem(idx)} className="h-9 w-9 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            </div>

            {/* Adjustments & Totals Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
              <div className="bg-card rounded-xl border border-border/50 shadow-card p-6 space-y-6">
                <h3 className="font-bold text-card-foreground text-sm uppercase tracking-wider">Payment Settings</h3>
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
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-muted-foreground">PAYMENT STATUS (AUTO)</label>
                    <div className={cn(
                      "w-full px-3 py-2 rounded-lg border text-sm font-bold capitalize cursor-default",
                      paymentStatus === 'completed'
                        ? "bg-success/10 border-success/20 text-success"
                        : "bg-destructive/10 border-destructive/20 text-destructive"
                    )}>
                      {paymentStatus}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-border/50 space-y-4">
                  {!id ? (
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground">CASH AMOUNT</label>
                        <input
                          type="number"
                          value={cashAmount || ''}
                          onChange={e => setCashAmount(Number(e.target.value))}
                          className="w-full px-3 py-2 rounded-lg border bg-muted/30 text-sm font-bold"
                          placeholder="0.00"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground">ONLINE AMOUNT</label>
                        <input
                          type="number"
                          value={onlineAmount || ''}
                          onChange={e => setOnlineAmount(Number(e.target.value))}
                          className="w-full px-3 py-2 rounded-lg border bg-muted/30 text-sm font-bold"
                          placeholder="0.00"
                        />
                      </div>
                      <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black text-primary">ADVANCE</span>
                          <div className="flex bg-muted p-0.5 rounded gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                if (advanceMethod === 'online' && advanceAmount > 0) {
                                  setOnlineAmount(prev => Math.max(0, prev - advanceAmount));
                                  setCashAmount(prev => prev + advanceAmount);
                                }
                                setAdvanceMethod('cash');
                              }}
                              className={cn(
                                "px-2 py-0.5 text-[8px] font-bold rounded",
                                advanceMethod === 'cash' ? "bg-background text-primary" : "text-muted-foreground"
                              )}
                            >
                              CASH
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (advanceMethod === 'cash' && advanceAmount > 0) {
                                  setCashAmount(prev => Math.max(0, prev - advanceAmount));
                                  setOnlineAmount(prev => prev + advanceAmount);
                                }
                                setAdvanceMethod('online');
                              }}
                              className={cn(
                                "px-2 py-0.5 text-[8px] font-bold rounded",
                                advanceMethod === 'online' ? "bg-background text-primary" : "text-muted-foreground"
                              )}
                            >
                              ONLINE
                            </button>
                          </div>
                        </div>
                        <input
                          type="number"
                          value={advanceAmount || ''}
                          onChange={e => {
                            const val = Number(e.target.value);
                            const diff = val - advanceAmount;
                            setAdvanceAmount(val);
                            if (advanceMethod === 'cash') {
                              setCashAmount(prev => prev + diff);
                            } else {
                              setOnlineAmount(prev => prev + diff);
                            }
                          }}
                          className="w-full px-3 py-1.5 bg-background border rounded text-xs font-black"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 animate-fade-in">
                      <h4 className="text-[10px] font-black text-foreground uppercase tracking-widest bg-muted py-1.5 px-3 rounded-lg inline-block">Payment History</h4>
                      <div className="space-y-2">
                        {paymentHistory.map(ph => (
                          <div key={ph.id} className="flex flex-col p-2.5 rounded-lg border border-border/50 bg-background/50">
                            <div className="flex items-center justify-between">
                              <span className="font-black text-xs">{fmt(ph.amount)}</span>
                              <span className={cn("text-[8px] font-black uppercase px-2 py-0.5 rounded-full", ph.method === 'cash' ? "bg-emerald-500/10 text-emerald-600" : "bg-blue-500/10 text-blue-600")}>{ph.method}</span>
                            </div>
                            <div className="flex items-center justify-between mt-1 text-[10px] text-muted-foreground font-medium">
                              <span>{new Date(ph.date).toLocaleDateString()}</span>
                              <span>{ph.note}</span>
                            </div>
                          </div>
                        ))}
                        {paymentHistory.length === 0 && <p className="text-[10px] text-muted-foreground italic px-1">No tracked payments prior.</p>}
                      </div>

                      {remainingAmount > 0 && (
                        <div className="mt-4 p-3 border border-primary/20 bg-primary/5 rounded-xl space-y-3">
                          <p className="text-[10px] font-black text-primary uppercase">Record New Payment</p>
                          <div className="flex gap-2">
                            <input type="number" id="newPayAmount" defaultValue={remainingAmount} className="w-full px-3 py-2 text-sm font-bold border rounded-lg" />
                            <select id="newPayMethod" className="px-2 py-2 text-sm font-bold border rounded-lg w-24 flex-shrink-0">
                              <option value="cash">Cash</option>
                              <option value="online">Online</option>
                            </select>
                          </div>
                          <button type="button" onClick={() => {
                            const amtInput = document.getElementById('newPayAmount') as HTMLInputElement;
                            const methInput = document.getElementById('newPayMethod') as HTMLSelectElement;
                            const amt = Number(amtInput.value);
                            const meth = methInput.value as 'cash' | 'online';
                            if (amt > 0) {
                              const newEntry: PaymentEntry = { id: crypto.randomUUID(), amount: amt, method: meth, date: new Date().toISOString(), note: 'Add-on Payment' };
                              setPaymentHistory(prev => [...prev, newEntry]);
                              if (meth === 'cash') setCashAmount(prev => prev + amt);
                              if (meth === 'online') setOnlineAmount(prev => prev + amt);
                              amtInput.value = String(Math.max(0, remainingAmount - amt));
                            }
                          }} className="w-full py-2 bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest rounded-lg hover:opacity-90 transition-opacity">
                            Add Payment
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-card rounded-xl border border-border/50 shadow-card p-6 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex justify-between text-xs text-muted-foreground font-bold"><span>SUBTOTAL</span><span className="tabular-nums">{fmt(subtotal)}</span></div>
                  {discount > 0 && <div className="flex justify-between text-xs font-bold text-success"><span>DISCOUNT</span><span className="tabular-nums">-{fmt(discount)}</span></div>}
                  {gstEnabled && <div className="flex justify-between text-xs text-muted-foreground font-bold"><span>GST (18%)</span><span className="tabular-nums">{fmt(gstAmount)}</span></div>}
                  <div className="pt-4 border-t border-border/50 flex justify-between items-end">
                    <span className="text-xs font-black text-primary uppercase">Grand Total</span>
                    <span className="text-2xl font-black text-primary tabular-nums tracking-tighter leading-none">{fmt(totalAmount)}</span>
                  </div>
                  {remainingAmount > 0 && (
                    <div className="mt-4 p-3 rounded-lg bg-destructive border border-destructive/20 text-white flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase">Balance Due</span>
                      <span className="text-lg font-black tabular-nums">{fmt(remainingAmount)}</span>
                    </div>
                  )}
                </div>

                <div className="pt-6">
                  {error && <p className="text-[10px] font-bold text-destructive mb-3">{error}</p>}
                  <button type="submit" className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-black text-xs uppercase tracking-widest hover:opacity-90 transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-3">
                    <FileText className="w-4 h-4" /> {id ? 'Update Bill' : 'Generate Bill'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Sticky Calculator Column */}
          <div className="lg:sticky lg:top-8 space-y-6">
            <div className="p-5 rounded-2xl bg-indigo-600 text-white shadow-xl shadow-indigo-200 animate-fade-in ring-4 ring-indigo-50 border-2 border-indigo-400/20">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] mb-4 opacity-80 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                Live Change Calculator
              </h4>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold opacity-90">Amount Received from Customer</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-indigo-200">₹</span>
                    <input
                      type="number"
                      value={receivedAmount}
                      onChange={(e) => setReceivedAmount(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="0.00"
                      className="w-full pl-8 pr-4 py-3 rounded-xl bg-indigo-500/50 border border-indigo-400 placeholder:text-indigo-300 text-white font-black text-lg focus:outline-none focus:ring-2 focus:ring-white/30 tabular-nums transition-all"
                    />
                  </div>
                </div>

                {receivedAmount !== '' && (
                  <div className="pt-2 space-y-1 group">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest opacity-80 group-hover:opacity-100 transition-opacity">
                      <span>Return to Customer</span>
                      {Number(receivedAmount) < totalAmount && <span className="text-rose-300 animate-bounce">Partial Payment!</span>}
                    </div>
                    <div className="text-3xl font-black tabular-nums tracking-tighter">
                      {fmt(Math.max(0, Number(receivedAmount) - totalAmount))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-card border border-border/50 text-center space-y-2">
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Note</p>
              <p className="text-[11px] text-muted-foreground/80 leading-relaxed">
                Use the calculator above to quickly calculate return change for cash payments.
              </p>
            </div>
          </div>
        </div>
      </form>


      {previewInvoice && (
        <InvoicePreview
          invoice={previewInvoice}
          onClose={() => {
            setPreviewInvoice(null);
            navigate('/sales-history');
          }}
        />
      )}
    </div>
  );
}
