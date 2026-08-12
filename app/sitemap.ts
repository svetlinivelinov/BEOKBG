import type { MetadataRoute } from 'next';
import { locales } from '../lib/i18n/config';
import { getProducts } from '../lib/products/getProducts';
import { getSiteUrl } from '../lib/seo/siteUrl';

const siteUrl = getSiteUrl();

export default function sitemap(): MetadataRoute.Sitemap {
  const entries = new Set<string>();

  for (const locale of locales) {
    entries.add(`${siteUrl}/${locale}`);
    entries.add(`${siteUrl}/${locale}/categories`);
    entries.add(`${siteUrl}/${locale}/products`);

    const products = getProducts(locale);
    for (const product of products) {
      entries.add(`${siteUrl}/${locale}/products/${product.id}`);
    }
  }

  return Array.from(entries).map((url) => ({
    url,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7
  }));
}
