'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'beokbg_cart_v1';

export type CartItem = {
  id: string;
  name: string;
  model: string;
  locale: string;
  quantity: number;
};

type AddCartItemInput = {
  id: string;
  name: string;
  model: string;
  locale: string;
  quantity: number;
};

type CartContextValue = {
  items: CartItem[];
  totalItems: number;
  addItem: (item: AddCartItemInput) => void;
  updateQuantity: (id: string, quantity: number) => void;
  removeItem: (id: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

function normalizeQuantity(value: number): number {
  if (!Number.isFinite(value)) {
    return 1;
  }

  const rounded = Math.floor(value);
  if (rounded < 1) {
    return 1;
  }

  return rounded;
}

export default function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw) as CartItem[];
      if (Array.isArray(parsed)) {
        setItems(
          parsed
            .filter((item) => item && typeof item.id === 'string' && typeof item.quantity === 'number')
            .map((item) => ({ ...item, quantity: normalizeQuantity(item.quantity) }))
        );
      }
    } catch {
      setItems([]);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [isHydrated, items]);

  const value = useMemo<CartContextValue>(() => {
    const addItem = (item: AddCartItemInput) => {
      const quantity = normalizeQuantity(item.quantity);
      setItems((prev) => {
        const existingIndex = prev.findIndex((entry) => entry.id === item.id);
        if (existingIndex === -1) {
          return [...prev, { ...item, quantity }];
        }

        const next = [...prev];
        const existing = next[existingIndex];
        next[existingIndex] = { ...existing, quantity: normalizeQuantity(existing.quantity + quantity) };
        return next;
      });
    };

    const updateQuantity = (id: string, quantity: number) => {
      const normalized = normalizeQuantity(quantity);
      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, quantity: normalized } : item)));
    };

    const removeItem = (id: string) => {
      setItems((prev) => prev.filter((item) => item.id !== id));
    };

    const clear = () => {
      setItems([]);
    };

    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

    return {
      items,
      totalItems,
      addItem,
      updateQuantity,
      removeItem,
      clear
    };
  }, [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used inside CartProvider');
  }

  return context;
}
