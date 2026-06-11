import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
  addBillToFirestore,
  deleteBillFromFirestore,
  syncInvoicesToFirestore,
  listenToBills,
  softDeleteBillInFirestore,
  restoreBillInFirestore
} from '@/firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';

export interface InvoiceItem {
  name: string;
  quantity: number;
  price: number;
  description?: string;
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
  isImp?: boolean;
  paymentHistory?: PaymentEntry[];
  isDelivered?: boolean;
  isWorkDone?: boolean;
  workDoneBy?: string;
  workDoneAt?: string;
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
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'superadmin';

  const [allInvoices, setAllInvoices] = useState<Invoice[]>(() => {
    const saved = localStorage.getItem('billing_invoices');
    if (saved) {
      const parsed: Invoice[] = JSON.parse(saved);
      // Filter out initial mock/sample invoice records (IDs '1', '2', '3', '4')
      const filtered = parsed.filter(inv => inv.id !== '1' && inv.id !== '2' && inv.id !== '3' && inv.id !== '4');
      const migrated = filtered.map(inv => {
        // Enforce formatted layout while preserving existing custom prefix (e.g. JUN, MAY, INV)
        const parts = inv.invoiceNumber.trim().split(/\s+/);
        let prefix = 'INV';
        let numStr = inv.invoiceNumber;
        if (parts.length > 1) {
          prefix = parts[0];
          numStr = parts[1];
        }
        const cleanNum = numStr.replace(/[^\d]/g, '');
        const numVal = parseInt(cleanNum);
        const formatted = isNaN(numVal)
          ? inv.invoiceNumber
          : `${prefix} ${String(numVal).padStart(3, '0')}`;
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

  // Real-time listener for Firestore bills
  useEffect(() => {
    if (!user) return;

    const unsubscribe = listenToBills((firestoreBills) => {
      const parsedInvoices: Invoice[] = firestoreBills.map((fb: any) => {
        if (!fb.items) {
          return {
            id: fb.id,
            invoiceNumber: fb.invoiceNumber || 'INV 000',
            customerName: fb.customerName || 'Walk-in Customer',
            customerPhone: fb.customerPhone || '',
            items: fb.items || [{ name: 'Billing Sale', quantity: 1, price: fb.amount }],
            subtotal: fb.amount || 0,
            discount: fb.discount || 0,
            taxableAmount: fb.amount || 0,
            gstEnabled: fb.gstEnabled || false,
            gstAmount: fb.gstAmount || 0,
            totalAmount: fb.amount || 0,
            cashAmount: fb.cashAmount || (fb.status === 'completed' ? fb.amount : 0),
            onlineAmount: fb.onlineAmount || 0,
            advanceAmount: fb.advanceAmount || 0,
            advanceMethod: fb.advanceMethod || 'cash',
            remainingAmount: fb.remainingAmount || (fb.status === 'completed' ? 0 : fb.amount),
            paymentStatus: fb.status || fb.paymentStatus || 'completed',
            createdAt: fb.createdAt || (fb.date ? `${fb.date}T12:00:00.000Z` : new Date().toISOString()),
            createdBy: fb.createdBy || 'System',
            createdByRole: fb.createdByRole || 'Admin',
            isPrivate: fb.isPrivate || false,
            isImp: fb.isImp || false,
            isWorkDone: fb.isWorkDone || false,
            workDoneBy: fb.workDoneBy || undefined,
            workDoneAt: fb.workDoneAt || undefined,
            isDeleted: fb.isDeleted || false,
            deletedAt: fb.deletedAt || undefined
          } as Invoice;
        }

        return {
          id: fb.id,
          invoiceNumber: fb.invoiceNumber,
          customerName: fb.customerName,
          customerPhone: fb.customerPhone,
          customerEmail: fb.customerEmail,
          description: fb.description,
          items: fb.items,
          subtotal: fb.subtotal,
          discount: fb.discount,
          taxableAmount: fb.taxableAmount,
          gstEnabled: fb.gstEnabled,
          gstAmount: fb.gstAmount,
          totalAmount: fb.totalAmount,
          cashAmount: fb.cashAmount,
          onlineAmount: fb.onlineAmount,
          advanceAmount: fb.advanceAmount,
          advanceMethod: fb.advanceMethod,
          remainingAmount: fb.remainingAmount,
          paymentStatus: fb.paymentStatus,
          createdAt: fb.createdAt,
          isPrivate: fb.isPrivate,
          isImp: fb.isImp || false,
          paymentHistory: fb.paymentHistory,
          isDelivered: fb.isDelivered,
          isWorkDone: fb.isWorkDone || false,
          workDoneBy: fb.workDoneBy,
          workDoneAt: fb.workDoneAt,
          createdBy: fb.createdBy,
          createdByRole: fb.createdByRole,
          createdByPhone: fb.createdByPhone,
          isDeleted: fb.isDeleted || false,
          deletedAt: fb.deletedAt
        } as Invoice;
      });

      setAllInvoices((prev) => {
        // Remove any invoice from local state that is no longer in Firestore (deleted from database)
        const firestoreIds = new Set(parsedInvoices.map(i => i.id));
        let merged = prev.filter(localInv => firestoreIds.has(localInv.id));

        parsedInvoices.forEach((fbInv) => {
          const shouldInclude = isSuperAdmin || !fbInv.isPrivate;

          if (shouldInclude) {
            const index = merged.findIndex((i) => i.id === fbInv.id);
            if (index !== -1) {
              merged[index] = fbInv;
            } else {
              merged.unshift(fbInv);
            }
          } else {
            merged = merged.filter((i) => i.id !== fbInv.id);
          }
        });

        const seen = new Set();
        return merged.filter((i) => {
          if (seen.has(i.id)) return false;
          seen.add(i.id);
          return true;
        });
      });
    });

    return unsubscribe;
  }, [user, isSuperAdmin]);

  useEffect(() => {
    if (!user) return;
    const activeInvoices = allInvoices.filter(inv => !inv.isDeleted);
    syncInvoicesToFirestore(activeInvoices).catch(err => console.error("Error syncing initial invoices:", err));
  }, [user]);

  // Filter active vs deleted invoices
  const invoices = React.useMemo(() => allInvoices.filter(inv => !inv.isDeleted), [allInvoices]);
  const deletedInvoices = React.useMemo(() => allInvoices.filter(inv => inv.isDeleted === true), [allInvoices]);

  const addInvoice = useCallback((invoice: Invoice) => {
    setAllInvoices(prev => [invoice, ...prev]);
    addBillToFirestore(invoice, invoice.id).catch(err => console.error("Error syncing new bill to Firestore:", err));
  }, []);

  const updateInvoice = useCallback((updatedInvoice: Invoice) => {
    setAllInvoices(prev => prev.map(inv => inv.id === updatedInvoice.id ? updatedInvoice : inv));
    addBillToFirestore(updatedInvoice, updatedInvoice.id).catch(err => console.error("Error syncing updated bill to Firestore:", err));
  }, []);

  const updateInvoiceStatus = useCallback((id: string, status: 'completed' | 'pending') => {
    setAllInvoices(prev => {
      const updated = prev.map(inv => inv.id === id ? { ...inv, paymentStatus: status } : inv);
      const inv = updated.find(i => i.id === id);
      if (inv) {
        addBillToFirestore(inv, inv.id).catch(err => console.error("Error syncing invoice status to Firestore:", err));
      }
      return updated;
    });
  }, []);

  // Soft Delete
  const deleteInvoice = useCallback((id: string) => {
    setAllInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, isDeleted: true, deletedAt: new Date().toISOString() } : inv));
    
    const roleStr = user?.role === 'superadmin' 
      ? 'Super Admin' 
      : user?.role === 'admin' 
        ? 'Admin' 
        : 'Staff';

    softDeleteBillInFirestore(
      id,
      user?.name || 'System',
      roleStr,
      user?.phone || ''
    ).catch(err => console.error("Error soft-deleting bill in Firestore:", err));
  }, [user]);

  // Restore Soft-Deleted Bill
  const restoreInvoice = useCallback((id: string) => {
    setAllInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, isDeleted: false, deletedAt: undefined } : inv));
    restoreBillInFirestore(id).catch(err => console.error("Error restoring bill in Firestore:", err));
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
