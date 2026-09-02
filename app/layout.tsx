import './globals.css';
import type { Metadata } from 'next';
import React from 'react';
import { getSiteMetadataBase, getSiteUrl } from '../lib/seo/siteUrl';
import CartProvider from '../components/cart/CartProvider';

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: getSiteMetadataBase(),
  title: {
    default: 'BEOKBG | Thermostat Catalog',
    template: '%s | BEOKBG'
  },
  description:
    'Bilingual BG/EN product catalog for BEOK thermostats and heating-control devices.',
  alternates: {
    languages: {
      bg: '/bg',
      en: '/en',
      'x-default': '/bg'
    }
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION
  },
  openGraph: {
    title: 'BEOKBG | Thermostat Catalog',
    description:
      'Bilingual BG/EN product catalog for BEOK thermostats and heating-control devices.',
    url: siteUrl,
    siteName: 'BEOKBG',
    type: 'website'
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'BEOKBG',
    url: siteUrl,
    logo: `${siteUrl}/favicon.ico`
  };

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'BEOKBG',
    url: siteUrl,
    inLanguage: ['bg', 'en']
  };

  return (
    <html lang="en">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
