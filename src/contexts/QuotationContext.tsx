import React, { createContext, useContext, useState, useEffect } from 'react';
import { listenToQuotations, addQuotationToFirestore, deleteQuotationFromFirestore, type Quotation } from '@/firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';

interface QuotationContextType {
  quotations: Quotation[];
  addQuotation: (quotation: Quotation) => Promise<void>;
  updateQuotation: (quotation: Quotation) => Promise<void>;
  deleteQuotation: (id: string) => Promise<void>;
}

const QuotationContext = createContext<QuotationContextType | null>(null);

export function QuotationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [quotations, setQuotations] = useState<Quotation[]>([]);

  useEffect(() => {
    if (!user) return;
    const unsub = listenToQuotations((data) => {
      setQuotations(data);
    });
    return () => unsub();
  }, [user]);

  const addQuotation = async (q: Quotation) => {
    await addQuotationToFirestore(q);
  };

  const updateQuotation = async (q: Quotation) => {
    await addQuotationToFirestore(q, q.id);
  };

  const deleteQuotation = async (id: string) => {
    await deleteQuotationFromFirestore(id);
  };

  return (
    <QuotationContext.Provider value={{ quotations, addQuotation, updateQuotation, deleteQuotation }}>
      {children}
    </QuotationContext.Provider>
  );
}

export function useQuotations() {
  const context = useContext(QuotationContext);
  if (!context) throw new Error('useQuotations must be used within a QuotationProvider');
  return context;
}
