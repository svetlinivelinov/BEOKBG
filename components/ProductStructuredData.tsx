type ProductStructuredDataProps = {
  name: string;
  model: string;
  description: string;
  category: string;
  imageUrl?: string | null;
  locale: string;
  productId: string;
};

export default function ProductStructuredData({
  name,
  model,
  description,
  category,
  imageUrl,
  locale,
  productId
}: ProductStructuredDataProps) {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
  const productUrl = `${siteUrl}/${locale}/products/${productId}`;
  const productImageUrl = imageUrl
    ? (imageUrl.startsWith('http://') || imageUrl.startsWith('https://') ? imageUrl : `${siteUrl}${imageUrl}`)
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
    ...(productImageUrl ? { image: productImageUrl } : {})
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
    />
  );
}
