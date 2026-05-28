import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

export interface Customer {
  id: string;
  name: string;
  contact: string;
}

interface CustomerContextType {
  customers: Customer[];
  addCustomer: (customer: Customer) => void;
  deleteCustomer: (id: string) => void;
}

const CustomerContext = createContext<CustomerContextType | undefined>(undefined);

const sampleCustomers: Customer[] = [
  { id: '1', name: 'Ravi Kumar', contact: '+91 9876543210' },
  { id: '2', name: 'Sneha Gupta', contact: '+91 8765432109' },
  { id: '3', name: 'Amit Verma', contact: '+91 7654321098' },
];

export function CustomerProvider({ children }: { children: ReactNode }) {
  const [customers, setCustomers] = useState<Customer[]>(() => {
    const saved = localStorage.getItem('billing_customers');
    if (saved) {
      const parsed: Customer[] = JSON.parse(saved);
      return parsed.filter(c => c.id !== '1' && c.id !== '2' && c.id !== '3');
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('billing_customers', JSON.stringify(customers));
  }, [customers]);

  const addCustomer = useCallback((customer: Customer) => {
    setCustomers(prev => [customer, ...prev]);
  }, []);

  const deleteCustomer = useCallback((id: string) => {
    setCustomers(prev => prev.filter(c => c.id !== id));
  }, []);

  return (
    <CustomerContext.Provider value={{ customers, addCustomer, deleteCustomer }}>
      {children}
    </CustomerContext.Provider>
  );
}

export function useCustomers() {
  const context = useContext(CustomerContext);
  if (context === undefined) {
    throw new Error('useCustomers must be used within a CustomerProvider');
  }
  return context;
}
