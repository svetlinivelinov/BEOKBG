'use client';

import { useEffect } from 'react';
import { useCart } from './CartProvider';

const STORAGE_KEY = 'beokbg_cart_v1';

export default function CartClearOnSuccess() {
  const { clear } = useCart();

  useEffect(() => {
    clear();

    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore storage errors in private browsing / restricted environments
    }
  }, [clear]);

  return null;
}
