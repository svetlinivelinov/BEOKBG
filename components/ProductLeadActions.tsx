'use client';

import Link from 'next/link';
import { useState } from 'react';
import { trackEvent } from '../lib/analytics';
import { useCart } from './cart/CartProvider';

interface ProductLeadActionsProps {
  productId: string;
  productName: string;
  productModel: string;
  locale: string;
  addToCartLabel: string;
  downloadManualLabel: string;
  quantityLabel: string;
  addedToCartLabel: string;
  continueShoppingLabel: string;
  goToCartLabel: string;
  manualUrl?: string;
}

export default function ProductLeadActions({
  productId,
  productName,
  productModel,
  locale,
  addToCartLabel,
  downloadManualLabel,
  quantityLabel,
  addedToCartLabel,
  continueShoppingLabel,
  goToCartLabel,
  manualUrl
}: ProductLeadActionsProps) {
  const { addItem } = useCart();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddedState, setIsAddedState] = useState(false);
  const [quantity, setQuantity] = useState('1');

  const parsedQuantity = Number.parseInt(quantity, 10);
  const normalizedQuantity = Number.isFinite(parsedQuantity) && parsedQuantity > 0 ? parsedQuantity : 1;

  const handleAddToCart = () => {
    addItem({
      id: productId,
      name: productName,
      model: productModel,
      locale,
      quantity: normalizedQuantity
    });
    setIsAddedState(true);
    trackEvent('product_add_to_cart_click', {
      product_id: productId,
      product_name: productName,
      locale,
      quantity: normalizedQuantity
    });
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setIsAddedState(false);
    setQuantity('1');
  };

  return (
    <>
      <div className="flex flex-wrap gap-3">
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className="inline-flex items-center rounded bg-brand-orange px-4 py-2 text-sm font-medium text-white hover:bg-brand-orange/90"
      >
        {addToCartLabel}
      </button>
      {manualUrl && (
        <a
          href={manualUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:border-brand-orange hover:text-brand-orange"
          onClick={() => trackEvent('product_manual_click', { product_id: productId, product_name: productName, locale })}
        >
          {downloadManualLabel}
        </a>
      )}
    </div>
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label={addToCartLabel}>
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
            {!isAddedState ? (
              <>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{addToCartLabel}</h3>
                <p className="text-sm text-gray-600 mb-4">{productName}</p>
                <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="cart-quantity">
                  {quantityLabel}
                </label>
                <input
                  id="cart-quantity"
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-brand-orange focus:outline-none"
                />
                <div className="mt-5 flex gap-3">
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    className="inline-flex items-center rounded bg-brand-orange px-4 py-2 text-sm font-medium text-white hover:bg-brand-orange/90"
                  >
                    {addToCartLabel}
                  </button>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="inline-flex items-center rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:border-brand-orange hover:text-brand-orange"
                  >
                    {continueShoppingLabel}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{addedToCartLabel}</h3>
                <p className="text-sm text-gray-600 mb-5">{productName} x {normalizedQuantity}</p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="inline-flex items-center rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:border-brand-orange hover:text-brand-orange"
                  >
                    {continueShoppingLabel}
                  </button>
                  <Link
                    href={`/${locale}/cart`}
                    className="inline-flex items-center rounded bg-brand-orange px-4 py-2 text-sm font-medium text-white hover:bg-brand-orange/90"
                    onClick={closeModal}
                  >
                    {goToCartLabel}
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
