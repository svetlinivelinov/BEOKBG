'use client';

import { trackEvent } from '../lib/analytics';

interface ProductLeadActionsProps {
  productId: string;
  productName: string;
  locale: string;
  requestQuoteLabel: string;
  askAvailabilityLabel: string;
  downloadManualLabel: string;
  quoteSubject: string;
  availabilitySubject: string;
  manualUrl?: string;
}

export default function ProductLeadActions({
  productId,
  productName,
  locale,
  requestQuoteLabel,
  askAvailabilityLabel,
  downloadManualLabel,
  quoteSubject,
  availabilitySubject,
  manualUrl
}: ProductLeadActionsProps) {
  return (
    <div className="flex flex-wrap gap-3">
      <a
        href={`mailto:hello@beokbg.com?subject=${encodeURIComponent(quoteSubject)}`}
        className="inline-flex items-center rounded bg-brand-orange px-4 py-2 text-sm font-medium text-white hover:bg-brand-orange/90"
        onClick={() => trackEvent('product_quote_click', { product_id: productId, product_name: productName, locale })}
      >
        {requestQuoteLabel}
      </a>
      <a
        href={`mailto:hello@beokbg.com?subject=${encodeURIComponent(availabilitySubject)}`}
        className="inline-flex items-center rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:border-brand-orange hover:text-brand-orange"
        onClick={() => trackEvent('product_availability_click', { product_id: productId, product_name: productName, locale })}
      >
        {askAvailabilityLabel}
      </a>
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
  );
}
