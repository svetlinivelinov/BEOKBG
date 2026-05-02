'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { locales } from '@/lib/i18n/config';

export default function LanguageSwitcher() {
  const pathname = usePathname() ?? '/';
  const segments = pathname.split('/').filter(Boolean);
  const firstSegment = segments[0] ?? '';
  const currentLocale = locales.includes(firstSegment) ? firstSegment : 'bg';
  const rest = locales.includes(firstSegment) ? segments.slice(1).join('/') : segments.join('/');

  return (
    <div className="flex gap-1 ml-2">
      {locales.map(locale => (
        <Link
          key={locale}
          href={`/${locale}${rest ? `/${rest}` : ''}`}
          className={`text-xs font-bold px-2 py-1 rounded border transition ${
            locale === currentLocale
              ? 'bg-blue-600 text-white border-blue-600'
              : 'border-blue-600 text-blue-600 hover:bg-blue-50'
          }`}
        >
          {locale.toUpperCase()}
        </Link>
      ))}
    </div>
  );
}
