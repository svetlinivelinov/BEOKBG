import type { MetadataRoute } from 'next';
import { locales } from '../lib/i18n/config';
import { getProducts } from '../lib/products/getProducts';
import { getSiteUrl } from '../lib/seo/siteUrl';

const siteUrl = getSiteUrl();

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];

  for (const locale of locales) {
    entries.push({
      url: `${siteUrl}/${locale}`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1
    });

    entries.push({
      url: `${siteUrl}/${locale}/categories`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.85
    });

    entries.push({
      url: `${siteUrl}/${locale}/products`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9
    });

    const products = getProducts(locale);
    for (const product of products) {
      entries.push({
        url: `${siteUrl}/${locale}/products/${product.id}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.75
      });
    }
  }

  return entries;
}
