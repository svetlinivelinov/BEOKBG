'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useCart } from './CartProvider';
import { trackEvent } from '../../lib/analytics';
import { formatEurPrice } from '../../lib/products/formatEurPrice';

type DeliveryType = 'address' | 'easybox';

type LockerOption = {
  id: string;
  name: string;
  city?: string | null;
  address?: string | null;
};

type CartPageClientProps = {
  locale: string;
  productMetaById: Record<string, { name: string; model: string; finalPriceEur?: number | null; priceQty?: number | null }>;
  labels: {
    cart: string;
    quantity: string;
    unitPrice: string;
    lineTotal: string;
    subtotal: string;
    remove: string;
    clearCart: string;
    continueShopping: string;
    cartEmpty: string;
    orderRequestTitle: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    customerNote: string;
    sendOrderRequest: string;
    orderRequestIntro: string;
    pleaseFillRequired: string;
    orderRequestSuccess: string;
    orderRequestError: string;
    lowStockAlertTitle: string;
    sendFactoryReorderEmail: string;
    proceedToCheckout: string;
    checkoutProcessing: string;
    checkoutError: string;
    checkoutUnavailableForLowStock: string;
    checkoutNotConfigured: string;
    checkoutSuccess: string;
    checkoutCancelled: string;
    paymentOptionsTitle: string;
    deliveryTitle: string;
    fullName: string;
    phone: string;
    email: string;
    deliveryAddress: string;
    deliveryEasybox: string;
    addressLine1: string;
    city: string;
    postalCode: string;
    easyboxLocker: string;
    loadEasyboxError: string;
    fillDeliveryRequired: string;
  };
};

type LowStockAlert = {
  id: string;
  model: string;
  remainingQty: number;
  reorderSuggestedQty: number;
};

export default function CartPageClient({ locale, productMetaById, labels }: CartPageClientProps) {
  const searchParams = useSearchParams();
  const { items, updateQuantity, removeItem, clear } = useCart();
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerNote, setCustomerNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [lowStockAlerts, setLowStockAlerts] = useState<LowStockAlert[]>([]);
  const [reorderMailto, setReorderMailto] = useState<string | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [hasAttemptedCheckout, setHasAttemptedCheckout] = useState(false);
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('address');
  const [checkoutFullName, setCheckoutFullName] = useState('');
  const [checkoutPhone, setCheckoutPhone] = useState('');
  const [checkoutEmail, setCheckoutEmail] = useState('');
  const [checkoutAddressLine1, setCheckoutAddressLine1] = useState('');
  const [checkoutCity, setCheckoutCity] = useState('');
  const [checkoutPostalCode, setCheckoutPostalCode] = useState('');
  const [checkoutLockerId, setCheckoutLockerId] = useState('');
  const [lockers, setLockers] = useState<LockerOption[]>([]);
  const [isLoadingLockers, setIsLoadingLockers] = useState(false);
  const [lockersError, setLockersError] = useState<string | null>(null);

  const hasRequiredCustomerFields = customerName.trim().length > 0 && customerEmail.trim().length > 0;
  const cartRows = items.map((item) => {
    const meta = productMetaById[item.id];
    const unitPrice = typeof meta?.finalPriceEur === 'number' && Number.isFinite(meta.finalPriceEur) ? meta.finalPriceEur : null;
    const lineTotal = unitPrice === null ? null : Number((unitPrice * item.quantity).toFixed(2));
    const availableQty = typeof meta?.priceQty === 'number' && Number.isFinite(meta.priceQty) ? meta.priceQty : null;
    const insufficientBy = availableQty !== null && item.quantity > availableQty ? item.quantity - availableQty : 0;
    return {
      item,
      meta,
      unitPrice,
      lineTotal,
      availableQty,
      insufficientBy
    };
  });
  const subtotal = cartRows.reduce((sum, row) => sum + (row.lineTotal ?? 0), 0);
  const hasInsufficientQty = cartRows.some((row) => row.insufficientBy > 0);
  const checkoutStatus = searchParams.get('checkout');
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(checkoutEmail.trim());
  const hasCommonDeliveryFields = checkoutFullName.trim().length > 0 && checkoutPhone.trim().length > 0 && isEmailValid;
  const hasAddressDeliveryFields = checkoutAddressLine1.trim().length > 0 && checkoutCity.trim().length > 0 && checkoutPostalCode.trim().length > 0;
  const hasEasyboxFields = checkoutLockerId.trim().length > 0;
  const hasRequiredDeliveryFields = hasCommonDeliveryFields && (deliveryType === 'address' ? hasAddressDeliveryFields : hasEasyboxFields);

  useEffect(() => {
    if (deliveryType !== 'easybox' || lockers.length > 0 || isLoadingLockers) {
      return;
    }

    let isActive = true;
    setIsLoadingLockers(true);
    setLockersError(null);

    fetch('/api/sameday/lockers')
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('failed');
        }

        const json = await response.json() as { ok: boolean; lockers?: LockerOption[] };
        if (!json.ok || !Array.isArray(json.lockers)) {
          throw new Error('invalid_payload');
        }

        if (isActive) {
          setLockers(json.lockers);
        }
      })
      .catch(() => {
        if (isActive) {
          setLockersError(labels.loadEasyboxError);
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoadingLockers(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [deliveryType, isLoadingLockers, labels.loadEasyboxError, lockers.length]);

  const handleCheckout = async () => {
    setHasAttemptedCheckout(true);
    if (isCheckingOut || hasInsufficientQty || items.length === 0 || !hasRequiredDeliveryFields) {
      return;
    }

    setCheckoutError(null);
    setIsCheckingOut(true);

    try {
      const response = await fetch('/api/checkout/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locale,
          items: items.map((item) => ({ id: item.id, quantity: item.quantity })),
          delivery: {
            fullName: checkoutFullName.trim(),
            phone: checkoutPhone.trim(),
            email: checkoutEmail.trim().toLowerCase(),
            deliveryType,
            addressLine1: deliveryType === 'address' ? checkoutAddressLine1.trim() : null,
            city: deliveryType === 'address' ? checkoutCity.trim() : null,
            postalCode: deliveryType === 'address' ? checkoutPostalCode.trim() : null,
            lockerId: deliveryType === 'easybox' ? checkoutLockerId.trim() : null
          }
        })
      });

      if (!response.ok) {
        const responseJson = await response.json().catch(() => null) as { error?: string } | null;
        if (responseJson?.error === 'payment_not_configured') {
          setCheckoutError(labels.checkoutNotConfigured);
          setIsCheckingOut(false);
          return;
        }
        throw new Error('checkout_failed');
      }

      const responseJson = await response.json() as { ok: boolean; url?: string | null };
      if (!responseJson.url) {
        throw new Error('missing_checkout_url');
      }

      trackEvent('checkout_started', {
        locale,
        items_count: items.length,
        total_quantity: items.reduce((sum, item) => sum + item.quantity, 0)
      });

      window.location.href = responseJson.url;
    } catch {
      setCheckoutError(labels.checkoutError);
      setIsCheckingOut(false);
    }
  };

  const handleSubmit = async () => {
    if (!hasRequiredCustomerFields || isSubmitting || items.length === 0) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitMessage(null);
    setLowStockAlerts([]);
    setReorderMailto(null);

    const payload = {
      locale,
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim(),
      customerPhone: customerPhone.trim(),
      customerNote: customerNote.trim(),
      items: items.map((item) => ({
        id: item.id,
        name: productMetaById[item.id]?.name ?? item.name,
        model: productMetaById[item.id]?.model ?? item.model,
        quantity: item.quantity
      }))
    };

    try {
      const response = await fetch('/api/order-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('request_failed');
      }

      const responseJson = await response.json() as {
        ok: boolean;
        inventory?: {
          lowStockAlerts?: LowStockAlert[];
          reorderMailto?: string | null;
        } | null;
      };

      if (responseJson.inventory?.lowStockAlerts?.length) {
        setLowStockAlerts(responseJson.inventory.lowStockAlerts);
      }

      if (responseJson.inventory?.reorderMailto) {
        setReorderMailto(responseJson.inventory.reorderMailto);
      }

      trackEvent('order_request_submitted', {
        locale,
        items_count: items.length,
        total_quantity: items.reduce((sum, item) => sum + item.quantity, 0)
      });

      setSubmitMessage(labels.orderRequestSuccess);
      setCustomerName('');
      setCustomerEmail('');
      setCustomerPhone('');
      setCustomerNote('');
      clear();
    } catch {
      setSubmitError(labels.orderRequestError);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 text-center">
        <p className="text-gray-700 mb-4">{labels.cartEmpty}</p>
        <Link
          href={`/${locale}/products`}
          className="inline-flex items-center rounded bg-brand-orange px-4 py-2 text-sm font-medium text-white hover:bg-brand-orange/90"
        >
          {labels.continueShopping}
        </Link>
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl sm:text-3xl font-bold">{labels.cart}</h1>
        <button
          type="button"
          onClick={clear}
          className="text-sm font-medium text-gray-600 hover:text-brand-orange"
        >
          {labels.clearCart}
        </button>
      </div>

      <div className="space-y-3">
        {cartRows.map((row) => {
          const item = row.item;
          const name = row.meta?.name ?? item.name;
          const model = row.meta?.model ?? item.model;
          const unitPriceText = row.unitPrice === null ? '-' : formatEurPrice(row.unitPrice, locale);
          const lineTotalText = row.lineTotal === null ? '-' : formatEurPrice(row.lineTotal, locale);

          return (
            <div key={item.id} className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0 md:flex-1">
                  <p className="min-h-12 font-semibold leading-tight text-gray-900 break-words">{name}</p>
                  <p className="text-sm text-gray-500 break-words">{model}</p>
                  <p className="mt-2 text-sm text-gray-600">{labels.unitPrice}: <span className="font-medium text-gray-800">{unitPriceText}</span></p>
                  <p className="text-sm text-gray-600">{labels.lineTotal}: <span className="font-semibold text-brand-orange">{lineTotalText}</span></p>
                  {row.insufficientBy > 0 && (
                    <p className="mt-2 text-xs text-amber-700 break-words">
                      {locale === 'bg'
                        ? `${model}: недостиг ${row.insufficientBy}. ${labels.orderRequestTitle} е налична като опция.`
                        : `${model}: short by ${row.insufficientBy}. ${labels.orderRequestTitle} remains available.`}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 md:justify-end md:shrink-0">
                  <label className="text-sm text-gray-600" htmlFor={`qty-${item.id}`}>{labels.quantity}</label>
                  <input
                    id={`qty-${item.id}`}
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(event) => updateQuantity(item.id, Number.parseInt(event.target.value, 10) || 1)}
                    className="h-9 w-20 rounded border border-gray-300 px-2 py-1 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="h-9 text-sm font-medium text-gray-600 hover:text-brand-orange"
                  >
                    {labels.remove}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4 flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm text-gray-600 uppercase tracking-wide">{labels.subtotal}</span>
        <span className="text-2xl font-bold text-brand-orange">{formatEurPrice(subtotal, locale)}</span>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">{labels.paymentOptionsTitle}</h2>
        <p className="mb-3 text-sm font-medium text-gray-700">{labels.deliveryTitle}</p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 mb-4">
          <div>
            <label htmlFor="checkout-full-name" className="mb-1 block text-sm font-medium text-gray-700">{labels.fullName}</label>
            <input
              id="checkout-full-name"
              type="text"
              value={checkoutFullName}
              onChange={(event) => setCheckoutFullName(event.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-brand-orange focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="checkout-phone" className="mb-1 block text-sm font-medium text-gray-700">{labels.phone}</label>
            <input
              id="checkout-phone"
              type="text"
              value={checkoutPhone}
              onChange={(event) => setCheckoutPhone(event.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-brand-orange focus:outline-none"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="checkout-email" className="mb-1 block text-sm font-medium text-gray-700">{labels.email}</label>
            <input
              id="checkout-email"
              type="email"
              value={checkoutEmail}
              onChange={(event) => setCheckoutEmail(event.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-brand-orange focus:outline-none"
            />
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-4">
          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input
              type="radio"
              name="deliveryType"
              value="address"
              checked={deliveryType === 'address'}
              onChange={() => setDeliveryType('address')}
            />
            {labels.deliveryAddress}
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input
              type="radio"
              name="deliveryType"
              value="easybox"
              checked={deliveryType === 'easybox'}
              onChange={() => setDeliveryType('easybox')}
            />
            {labels.deliveryEasybox}
          </label>
        </div>

        {deliveryType === 'address' ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 mb-4">
            <div className="sm:col-span-3">
              <label htmlFor="checkout-address-line1" className="mb-1 block text-sm font-medium text-gray-700">{labels.addressLine1}</label>
              <input
                id="checkout-address-line1"
                type="text"
                value={checkoutAddressLine1}
                onChange={(event) => setCheckoutAddressLine1(event.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-brand-orange focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="checkout-city" className="mb-1 block text-sm font-medium text-gray-700">{labels.city}</label>
              <input
                id="checkout-city"
                type="text"
                value={checkoutCity}
                onChange={(event) => setCheckoutCity(event.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-brand-orange focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="checkout-postal-code" className="mb-1 block text-sm font-medium text-gray-700">{labels.postalCode}</label>
              <input
                id="checkout-postal-code"
                type="text"
                value={checkoutPostalCode}
                onChange={(event) => setCheckoutPostalCode(event.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-brand-orange focus:outline-none"
              />
            </div>
          </div>
        ) : (
          <div className="mb-4">
            <label htmlFor="checkout-locker" className="mb-1 block text-sm font-medium text-gray-700">{labels.easyboxLocker}</label>
            <select
              id="checkout-locker"
              value={checkoutLockerId}
              onChange={(event) => setCheckoutLockerId(event.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-brand-orange focus:outline-none"
              disabled={isLoadingLockers}
            >
              <option value="">{isLoadingLockers ? 'Loading...' : '--'}</option>
              {lockers.map((locker) => (
                <option key={locker.id} value={locker.id}>
                  {locker.name}{locker.city ? ` (${locker.city})` : ''}
                </option>
              ))}
            </select>
            {lockersError && <p className="mt-2 text-sm text-red-600">{lockersError}</p>}
          </div>
        )}

        {checkoutStatus === 'success' && (
          <p className="mb-3 text-sm text-green-700 break-words">{labels.checkoutSuccess}</p>
        )}
        {checkoutStatus === 'cancelled' && (
          <p className="mb-3 text-sm text-amber-700 break-words">{labels.checkoutCancelled}</p>
        )}

        {!hasInsufficientQty ? (
          <button
            type="button"
            onClick={handleCheckout}
            disabled={isCheckingOut || !hasRequiredDeliveryFields}
            className={`inline-flex h-10 w-full justify-center sm:w-auto items-center rounded px-4 py-2 text-sm font-medium text-white ${
              isCheckingOut || !hasRequiredDeliveryFields ? 'bg-gray-300 cursor-not-allowed' : 'bg-brand-orange hover:bg-brand-orange/90'
            }`}
          >
            {isCheckingOut ? labels.checkoutProcessing : labels.proceedToCheckout}
          </button>
        ) : (
          <p className="text-sm text-amber-700 break-words">{labels.checkoutUnavailableForLowStock}</p>
        )}

        {hasAttemptedCheckout && !hasRequiredDeliveryFields && !hasInsufficientQty && (
          <p className="mt-3 text-sm text-red-600 break-words">{labels.fillDeliveryRequired}</p>
        )}

        {checkoutError && (
          <p className="mt-3 text-sm text-red-600 break-words">{checkoutError}</p>
        )}
      </div>

      <div className="pt-2">
        <Link
          href={`/${locale}/products`}
          className="inline-flex h-10 w-full justify-center sm:w-auto items-center rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:border-brand-orange hover:text-brand-orange"
        >
          {labels.continueShopping}
        </Link>
      </div>

      {hasInsufficientQty && (
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="text-xl font-bold text-gray-900 mb-2">{labels.orderRequestTitle}</h2>
          <p className="text-sm text-gray-600 mb-4">
            {labels.orderRequestIntro}
            {locale === 'bg'
              ? ' Някои артикули надвишават наличността и ще бъдат обработени чрез заявка.'
              : ' Some items exceed available quantity and will be handled via request.'}
          </p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="customer-name" className="mb-1 block text-sm font-medium text-gray-700">{labels.customerName}</label>
              <input
                id="customer-name"
                type="text"
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-brand-orange focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="customer-email" className="mb-1 block text-sm font-medium text-gray-700">{labels.customerEmail}</label>
              <input
                id="customer-email"
                type="email"
                value={customerEmail}
                onChange={(event) => setCustomerEmail(event.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-brand-orange focus:outline-none"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="customer-phone" className="mb-1 block text-sm font-medium text-gray-700">{labels.customerPhone}</label>
              <input
                id="customer-phone"
                type="text"
                value={customerPhone}
                onChange={(event) => setCustomerPhone(event.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-brand-orange focus:outline-none"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="customer-note" className="mb-1 block text-sm font-medium text-gray-700">{labels.customerNote}</label>
              <textarea
                id="customer-note"
                rows={4}
                value={customerNote}
                onChange={(event) => setCustomerNote(event.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-brand-orange focus:outline-none"
              />
            </div>
          </div>


          {!hasRequiredCustomerFields && (
            <p className="mt-3 text-sm text-red-600">{labels.pleaseFillRequired}</p>
          )}

          {submitMessage && (
            <p className="mt-3 text-sm text-green-700">{submitMessage}</p>
          )}

          {submitError && (
            <p className="mt-3 text-sm text-red-600">{submitError}</p>
          )}

          {lowStockAlerts.length > 0 && (
            <div className="mt-4 rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              <p className="font-semibold mb-2">{labels.lowStockAlertTitle}</p>
              <ul className="list-disc pl-5 space-y-1">
                {lowStockAlerts.map((alert) => (
                  <li key={alert.id}>
                    {alert.model}: {alert.remainingQty} left, reorder {alert.reorderSuggestedQty}
                  </li>
                ))}
              </ul>
              {reorderMailto && (
                <a
                  href={reorderMailto}
                  className="mt-3 inline-flex items-center rounded bg-amber-600 px-3 py-2 text-xs font-medium text-white hover:bg-amber-700"
                >
                  {labels.sendFactoryReorderEmail}
                </a>
              )}
            </div>
          )}

          <div className="mt-4">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!hasRequiredCustomerFields || isSubmitting}
              className={`inline-flex items-center rounded px-4 py-2 text-sm font-medium text-white ${
                hasRequiredCustomerFields && !isSubmitting ? 'bg-brand-orange hover:bg-brand-orange/90' : 'bg-gray-300 cursor-not-allowed'
              }`}
            >
              {isSubmitting ? `${labels.sendOrderRequest}...` : labels.sendOrderRequest}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
