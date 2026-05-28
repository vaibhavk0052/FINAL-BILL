import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { addBillToFirestore, deleteBillFromFirestore, syncInvoicesToFirestore } from '@/lib/firebase';

export interface InvoiceItem {
  name: string;
  quantity: number;
  price: number;
}

export interface PaymentEntry {
  id: string;
  date: string;
  amount: number;
  method: 'cash' | 'online' | 'advance';
  note?: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  description?: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  taxableAmount: number;
  gstEnabled: boolean;
  gstAmount: number;
  totalAmount: number;
  cashAmount: number;
  onlineAmount: number;
  advanceAmount: number;
  advanceMethod: 'cash' | 'online';
  remainingAmount: number;
  paymentStatus: 'completed' | 'pending';
  createdAt: string;
  isPrivate?: boolean;
  paymentHistory?: PaymentEntry[];
  isDelivered?: boolean;
  createdBy?: string;
  createdByRole?: string;
  createdByPhone?: string;
  isDeleted?: boolean;
  deletedAt?: string;
}

interface InvoiceContextType {
  invoices: Invoice[];
  deletedInvoices: Invoice[];
  addInvoice: (invoice: Invoice) => void;
  updateInvoice: (invoice: Invoice) => void;
  updateInvoiceStatus: (id: string, status: 'completed' | 'pending') => void;
  deleteInvoice: (id: string) => void;
  restoreInvoice: (id: string) => void;
  permanentlyDeleteInvoice: (id: string) => void;
  togglePrivate: (id: string) => void;
  totalRevenue: number;
}

const InvoiceContext = createContext<InvoiceContextType | null>(null);

const sampleInvoices: Invoice[] = [
  {
    id: '1', invoiceNumber: 'INV 001', customerName: 'Ravi Sharma',
    customerPhone: '9876543210', items: [
      { name: 'Photo Retouching', quantity: 5, price: 800 },
      { name: 'Background Removal', quantity: 10, price: 200 },
    ],
    subtotal: 6000, discount: 1200, taxableAmount: 4800, gstEnabled: true,
    gstAmount: 864, totalAmount: 5664, cashAmount: 5664, onlineAmount: 0,
    advanceAmount: 0, advanceMethod: 'cash', remainingAmount: 0, paymentStatus: 'completed', createdAt: '2026-03-20',
  },
  {
    id: '2', invoiceNumber: 'INV 002', customerName: 'Priya Patel',
    customerPhone: '9123456789', items: [
      { name: 'Logo Design', quantity: 1, price: 5000 },
      { name: 'Social Media Kit', quantity: 1, price: 3000 },
    ],
    subtotal: 8000, discount: 1600, taxableAmount: 6400, gstEnabled: true,
    gstAmount: 1152, totalAmount: 7552, cashAmount: 0, onlineAmount: 0,
    advanceAmount: 1000, advanceMethod: 'cash', remainingAmount: 6552, paymentStatus: 'pending', createdAt: '2026-03-21',
  },
  {
    id: '3', invoiceNumber: 'INV 003', customerName: 'Amit Verma',
    items: [
      { name: 'Photo Editing Batch', quantity: 20, price: 150 },
    ],
    subtotal: 3000, discount: 600, taxableAmount: 2400, gstEnabled: false,
    gstAmount: 0, totalAmount: 2400, cashAmount: 2400, onlineAmount: 0,
    advanceAmount: 0, advanceMethod: 'online', remainingAmount: 0, paymentStatus: 'completed', createdAt: '2026-03-22',
  },
  {
    id: '4', invoiceNumber: 'INV 004', customerName: 'Sneha Gupta',
    items: [
      { name: 'Banner Design', quantity: 3, price: 1500 },
      { name: 'Flyer Design', quantity: 2, price: 800 },
    ],
    subtotal: 6100, discount: 1220, taxableAmount: 4880, gstEnabled: true,
    gstAmount: 878.4, totalAmount: 5758.4, cashAmount: 0, onlineAmount: 0,
    advanceAmount: 5758.4, advanceMethod: 'online', remainingAmount: 0, paymentStatus: 'pending', createdAt: '2026-03-22',
  },
];

export function InvoiceProvider({ children }: { children: React.ReactNode }) {
  const [allInvoices, setAllInvoices] = useState<Invoice[]>(() => {
    const saved = localStorage.getItem('billing_invoices');
    if (saved) {
      const parsed: Invoice[] = JSON.parse(saved);
      // Filter out initial mock/sample invoice records (IDs '1', '2', '3', '4')
      const filtered = parsed.filter(inv => inv.id !== '1' && inv.id !== '2' && inv.id !== '3' && inv.id !== '4');
      const migrated = filtered.map(inv => {
        // Enforce the 'INV XXX' format (extract numeric part, pad it, prefix with 'INV ')
        const cleanNum = inv.invoiceNumber.replace(/[^\d]/g, '');
        const numVal = parseInt(cleanNum);
        const formatted = isNaN(numVal) ? inv.invoiceNumber : `INV ${String(numVal).padStart(3, '0')}`;
        return {
          ...inv,
          invoiceNumber: formatted,
        };
      });
      return migrated;
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('billing_invoices', JSON.stringify(allInvoices));
  }, [allInvoices]);

  useEffect(() => {
    syncInvoicesToFirestore(allInvoices).catch(err => console.error("Error syncing initial invoices:", err));
  }, []);

  // Filter active vs deleted invoices
  const invoices = React.useMemo(() => allInvoices.filter(inv => !inv.isDeleted), [allInvoices]);
  const deletedInvoices = React.useMemo(() => allInvoices.filter(inv => inv.isDeleted === true), [allInvoices]);

  const addInvoice = useCallback((invoice: Invoice) => {
    setAllInvoices(prev => [invoice, ...prev]);
    addBillToFirestore({
      customerName: invoice.customerName,
      amount: invoice.totalAmount,
      status: invoice.paymentStatus,
      date: invoice.createdAt.split('T')[0],
      createdBy: invoice.createdBy || 'System',
      invoiceNumber: invoice.invoiceNumber
    }, invoice.id).catch(err => console.error("Error syncing new bill to Firestore:", err));
  }, []);

  const updateInvoice = useCallback((updatedInvoice: Invoice) => {
    setAllInvoices(prev => prev.map(inv => inv.id === updatedInvoice.id ? updatedInvoice : inv));
    addBillToFirestore({
      customerName: updatedInvoice.customerName,
      amount: updatedInvoice.totalAmount,
      status: updatedInvoice.paymentStatus,
      date: updatedInvoice.createdAt.split('T')[0],
      createdBy: updatedInvoice.createdBy || 'System',
      invoiceNumber: updatedInvoice.invoiceNumber
    }, updatedInvoice.id).catch(err => console.error("Error syncing updated bill to Firestore:", err));
  }, []);

  const updateInvoiceStatus = useCallback((id: string, status: 'completed' | 'pending') => {
    setAllInvoices(prev => {
      const updated = prev.map(inv => inv.id === id ? { ...inv, paymentStatus: status } : inv);
      const inv = updated.find(i => i.id === id);
      if (inv) {
        addBillToFirestore({
          customerName: inv.customerName,
          amount: inv.totalAmount,
          status: inv.paymentStatus,
          date: inv.createdAt.split('T')[0],
          createdBy: inv.createdBy || 'System',
          invoiceNumber: inv.invoiceNumber
        }, inv.id).catch(err => console.error("Error syncing invoice status to Firestore:", err));
      }
      return updated;
    });
  }, []);

  // Soft Delete
  const deleteInvoice = useCallback((id: string) => {
    setAllInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, isDeleted: true, deletedAt: new Date().toISOString() } : inv));
  }, []);

  // Restore Soft-Deleted Bill
  const restoreInvoice = useCallback((id: string) => {
    setAllInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, isDeleted: false, deletedAt: undefined } : inv));
  }, []);

  // Hard Delete
  const permanentlyDeleteInvoice = useCallback((id: string) => {
    setAllInvoices(prev => prev.filter(inv => inv.id !== id));
    deleteBillFromFirestore(id).catch(err => console.error("Error deleting bill from Firestore:", err));
  }, []);

  const togglePrivate = useCallback((id: string) => {
    setAllInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, isPrivate: !inv.isPrivate } : inv));
  }, []);

  const totalRevenue = invoices.reduce((s, i) => s + i.totalAmount, 0);

  return (
    <InvoiceContext.Provider value={{ invoices, deletedInvoices, addInvoice, updateInvoice, updateInvoiceStatus, deleteInvoice, restoreInvoice, permanentlyDeleteInvoice, togglePrivate, totalRevenue }}>
      {children}
    </InvoiceContext.Provider>
  );
}

export function useInvoices() {
  const ctx = useContext(InvoiceContext);
  if (!ctx) throw new Error('useInvoices must be used within InvoiceProvider');
  return ctx;
}
