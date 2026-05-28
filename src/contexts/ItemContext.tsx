import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

export interface Item {
  id: string;
  itemName: string;
  price: number;
}

interface ItemContextType {
  items: Item[];
  addItem: (item: Item) => void;
  deleteItem: (id: string) => void;
  updateItem: (item: Item) => void;
}

const ItemContext = createContext<ItemContextType | undefined>(undefined);

const sampleItems: Item[] = [
  { id: '1', itemName: 'Photoshop Editing', price: 500 },
  { id: '2', itemName: 'Banner Design', price: 1200 },
  { id: '3', itemName: 'Video Color Grading', price: 2500 },
];

export function ItemProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Item[]>(() => {
    const saved = localStorage.getItem('billing_items');
    if (saved) {
      const parsed: Item[] = JSON.parse(saved);
      return parsed.filter(i => i.id !== '1' && i.id !== '2' && i.id !== '3');
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('billing_items', JSON.stringify(items));
  }, [items]);

  const addItem = useCallback((item: Item) => {
    setItems(prev => [item, ...prev]);
  }, []);

  const deleteItem = useCallback((id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  }, []);

  const updateItem = useCallback((updatedItem: Item) => {
    setItems(prev => prev.map(i => i.id === updatedItem.id ? updatedItem : i));
  }, []);

  return (
    <ItemContext.Provider value={{ items, addItem, deleteItem, updateItem }}>
      {children}
    </ItemContext.Provider>
  );
}

export function useItems() {
  const context = useContext(ItemContext);
  if (context === undefined) {
    throw new Error('useItems must be used within a ItemProvider');
  }
  return context;
}
