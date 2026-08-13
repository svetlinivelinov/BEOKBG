import type { MetadataRoute } from 'next';
import { getSiteUrl } from '../lib/seo/siteUrl';

const siteUrl = getSiteUrl();

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/'
    },
    sitemap: `${siteUrl}/sitemap.xml`
  };
}
