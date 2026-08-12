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
      en: '/en'
    }
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
  return (
    <html lang="en">
      <body>
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
