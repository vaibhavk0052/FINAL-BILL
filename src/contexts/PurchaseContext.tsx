import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { listenToPurchases, addPurchaseToFirestore, deletePurchaseFromFirestore } from '@/firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';

export interface Purchase {
  id: string;
  supplierName: string;
  itemName: string;
  quantity: number;
  price: number;
  totalAmount: number;
  date: string;
}

interface PurchaseContextType {
  purchases: Purchase[];
  addPurchase: (purchase: Purchase) => void;
  deletePurchase: (id: string) => void;
  totalPurchaseAmount: number;
}

const PurchaseContext = createContext<PurchaseContextType | undefined>(undefined);

const samplePurchases: Purchase[] = [
  {
    id: '1', supplierName: 'Tech Supplies Co', itemName: 'Camera Lens 50mm',
    quantity: 2, price: 15000, totalAmount: 30000, date: '2026-03-20',
  },
  {
    id: '2', supplierName: 'Creative Assets', itemName: 'Preset Bundle',
    quantity: 1, price: 5000, totalAmount: 5000, date: '2026-03-21',
  },
];

export function PurchaseProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [purchases, setPurchases] = useState<Purchase[]>([]);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = listenToPurchases((data) => {
      const sorted = [...data].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setPurchases(sorted);
    });
    return unsubscribe;
  }, [user]);

  const addPurchase = useCallback((purchase: Purchase) => {
    addPurchaseToFirestore(purchase).catch(err => console.error("Error adding purchase to Firestore:", err));
  }, []);

  const deletePurchase = useCallback((id: string) => {
    deletePurchaseFromFirestore(id).catch(err => console.error("Error deleting purchase from Firestore:", err));
  }, []);

  const totalPurchaseAmount = purchases.reduce((s, p) => s + p.totalAmount, 0);

  return (
    <PurchaseContext.Provider value={{ purchases, addPurchase, deletePurchase, totalPurchaseAmount }}>
      {children}
    </PurchaseContext.Provider>
  );
}

export function usePurchases() {
  const context = useContext(PurchaseContext);
  if (context === undefined) {
    throw new Error('usePurchases must be used within a PurchaseProvider');
  }
  return context;
}
