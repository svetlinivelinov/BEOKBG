import './globals.css';
import type { Metadata } from 'next';
import React from 'react';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
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
      <body>{children}</body>
    </html>
  );
}
