import { getSiteUrl } from '../lib/seo/siteUrl';

type ProductStructuredDataProps = {
  name: string;
  model: string;
  description: string;
  category: string;
  imageUrl?: string | null;
  locale: string;
  productId: string;
  ean?: string | null;
  price?: number | null;
  priceCurrency?: string | null;
  availability?: 'https://schema.org/InStock' | 'https://schema.org/OutOfStock';
  stockQuantity?: number | null;
};

export default function ProductStructuredData({
  name,
  model,
  description,
  category,
  imageUrl,
  locale,
  productId,
  ean,
  price,
  priceCurrency,
  availability,
  stockQuantity
}: ProductStructuredDataProps) {
  const siteUrl = getSiteUrl();
  const productUrl = `${siteUrl}/${locale}/products/${productId}`;
  const productImageUrl = imageUrl
    ? (imageUrl.startsWith('http://') || imageUrl.startsWith('https://') ? imageUrl : `${siteUrl}${imageUrl}`)
    : undefined;
  const normalizedCurrency = typeof priceCurrency === 'string' ? priceCurrency.trim().toUpperCase() : '';
  const hasValidPrice = typeof price === 'number' && Number.isFinite(price);
  const normalizedEan = typeof ean === 'string' ? ean.trim() : '';
  const normalizedDigitsEan = normalizedEan.replace(/\D/g, '');
  const gtinSchemaProperty = normalizedDigitsEan.length === 13
    ? { gtin13: normalizedDigitsEan }
    : normalizedEan
      ? { gtin: normalizedEan }
      : {};
  const hasInventory = typeof stockQuantity === 'number' && Number.isFinite(stockQuantity) && stockQuantity >= 0;

  const offerSchema = hasValidPrice
    ? {
        '@type': 'Offer',
        price,
        priceCurrency: normalizedCurrency || 'EUR',
        url: productUrl,
        itemCondition: 'https://schema.org/NewCondition',
        ...(availability ? { availability } : {}),
        ...(hasInventory
          ? {
              inventoryLevel: {
                '@type': 'QuantitativeValue',
                value: stockQuantity
              }
            }
          : {})
      }
    : undefined;

  const productSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    model,
    description,
    category,
    sku: productId,
    brand: {
      '@type': 'Brand',
      name: 'BEOKBG'
    },
    url: productUrl,
    ...(productImageUrl ? { image: productImageUrl } : {}),
    ...gtinSchemaProperty,
    ...(offerSchema ? { offers: offerSchema } : {})
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
    />
  );
}
