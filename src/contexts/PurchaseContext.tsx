import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

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
  const [purchases, setPurchases] = useState<Purchase[]>(() => {
    const saved = localStorage.getItem('billing_purchases');
    if (saved) {
      const parsed: Purchase[] = JSON.parse(saved);
      return parsed.filter(p => p.id !== '1' && p.id !== '2');
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('billing_purchases', JSON.stringify(purchases));
  }, [purchases]);

  const addPurchase = useCallback((purchase: Purchase) => {
    setPurchases(prev => [purchase, ...prev]);
  }, []);

  const deletePurchase = useCallback((id: string) => {
    setPurchases(prev => prev.filter(p => p.id !== id));
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
