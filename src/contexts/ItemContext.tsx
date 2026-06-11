import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { listenToItems, addItemToFirestore, deleteItemFromFirestore } from '@/firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';

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

export function ItemProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = listenToItems((data) => {
      setItems(data);
    });
    return unsubscribe;
  }, [user]);

  const addItem = useCallback((item: Item) => {
    addItemToFirestore(item).catch(err => console.error("Error adding item to Firestore:", err));
  }, []);

  const deleteItem = useCallback((id: string) => {
    deleteItemFromFirestore(id).catch(err => console.error("Error deleting item from Firestore:", err));
  }, []);

  const updateItem = useCallback((updatedItem: Item) => {
    addItemToFirestore(updatedItem).catch(err => console.error("Error updating item in Firestore:", err));
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
