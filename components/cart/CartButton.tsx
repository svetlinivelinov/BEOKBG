'use client';

import Link from 'next/link';
import { useCart } from './CartProvider';

type CartButtonProps = {
  locale: string;
  label: string;
};

export default function CartButton({ locale, label }: CartButtonProps) {
  const { totalItems } = useCart();

  return (
    <Link
      href={`/${locale}/cart`}
      className="relative inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:border-brand-orange hover:text-brand-orange"
      aria-label={`${label} (${totalItems})`}
    >
      <span aria-hidden="true" className="mr-2">🛒</span>
      <span>{label}</span>
      {totalItems > 0 && (
        <span className="absolute -right-2 -top-2 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-brand-orange px-1 text-xs font-bold text-white">
          {totalItems > 99 ? '99+' : totalItems}
        </span>
      )}
    </Link>
  );
}
