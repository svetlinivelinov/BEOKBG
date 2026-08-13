'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { locales, defaultLocale } from '../lib/i18n/config';
import { trackEvent } from '../lib/analytics';

function switchLocalePath(pathname: string, targetLocale: string, searchParams?: URLSearchParams) {
  const parts = pathname.split('/').filter(Boolean);
  const query = searchParams?.toString();

  const withQuery = (path: string) => (query ? `${path}?${query}` : path);

  if (parts.length === 0) {
    return withQuery(`/${targetLocale}`);
  }

  if (locales.includes(parts[0])) {
    parts[0] = targetLocale;
    return withQuery(`/${parts.join('/')}`);
  }

  return withQuery(`/${targetLocale}${pathname === '/' ? '' : pathname}`);
}

interface LanguageSwitcherProps {
  currentLocale?: string;
}

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ currentLocale }) => {
  const pathname = usePathname() || '/';
  const searchParams = useSearchParams();
  const activeLocale = currentLocale && locales.includes(currentLocale) ? currentLocale : defaultLocale;

  return (
    <div className="flex items-center gap-2 text-xs font-semibold">
      {locales.map((locale) => {
        const isActive = locale === activeLocale;
        return (
          <Link
            key={locale}
            href={switchLocalePath(pathname, locale, new URLSearchParams(searchParams.toString()))}
            className={[
              'px-2 py-1 rounded border transition',
              isActive
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-blue-700 border-blue-200 hover:border-blue-500'
            ].join(' ')}
            aria-current={isActive ? 'page' : undefined}
            onClick={() => {
              if (!isActive) {
                trackEvent('language_switch', { from: activeLocale, to: locale, path: pathname });
              }
            }}
          >
            {locale.toUpperCase()}
          </Link>
        );
      })}
    </div>
  );
};

export default LanguageSwitcher;