import React, { Suspense } from 'react';
import Link from 'next/link';
import LanguageSwitcher from './LanguageSwitcher';
import Container from './Container';
import { Dictionary } from '../lib/i18n/types';
import { formatCategoryLabel } from '../lib/formatCategoryLabel';
import { getCategories } from '../lib/products/getProducts';

export interface HeaderProps {
  locale?: string;
  dict?: Dictionary;
}

const fallbackDict: Dictionary = {
  welcome: 'Добре дошли в BEOKBG',
  products: 'Продукти',
  categories: 'Категории',
  about: 'За нас',
  contact: 'Контакти',
  all_products: 'Всички продукти',
  category: 'Категория',
  not_found: 'Продуктът не е намерен',
  hero_subtitle: 'Модерни термостати, контролери и решения за отопление и автоматизация. Вдъхновено от BEOK Controls.',
  browse_products: 'Разгледай продуктите',
  view_product: 'Виж продукта',
  view_in_beok: 'Виж в BEOK Controls',
  rights_reserved: 'Всички права запазени.',
  home: 'Начало',
  product_description: 'Описание на продукта',
  all_categories: 'Всички категории',
  key_features: 'Основни характеристики',
  technical_data: 'Технически данни',
  documentation: 'Официална документация'
};

const withLocale = (locale: string | undefined, path: string) => {
  if (!locale) return path;
  return `/${locale}${path === '/' ? '' : path}`;
};

const Header: React.FC<HeaderProps> = ({ locale, dict }) => {
  const t = dict || fallbackDict;
  const categories = getCategories();

  return (
  <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
    <Container className="flex items-center justify-between py-3">
      <Link href={withLocale(locale, '/')} className="flex items-center gap-2">
        <span className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-orange to-brand-blue flex-shrink-0" />
        <span className="text-2xl font-extrabold text-brand-blue leading-none cursor-pointer">
          BEOK<span className="text-brand-orange">BG</span>
        </span>
      </Link>
      <div className="flex items-center gap-6">
        <ul className="flex gap-6 text-sm font-semibold uppercase tracking-wide">
          <li className="relative group">
            <Link
              href={withLocale(locale, '/products')}
              className="flex items-center gap-1 text-gray-700 hover:text-brand-orange transition-colors py-3"
            >
              {t.products}
              <span aria-hidden="true" className="text-xs">&#9662;</span>
            </Link>
            <ul className="absolute left-0 top-full w-64 bg-white border border-gray-100 shadow-lg rounded hidden group-hover:block normal-case font-normal tracking-normal z-50">
              <li>
                <Link
                  href={withLocale(locale, '/products')}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-brand-orange"
                >
                  {t.all_products}
                </Link>
              </li>
              {categories.map((category) => (
                <li key={category}>
                  <Link
                    href={`${withLocale(locale, '/products')}?category=${encodeURIComponent(category)}`}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-brand-orange"
                  >
                    {formatCategoryLabel(category, locale || 'en')}
                  </Link>
                </li>
              ))}
            </ul>
          </li>
        </ul>
        <Suspense fallback={<div className="h-7 w-16" aria-hidden="true" />}>
          <LanguageSwitcher currentLocale={locale} />
        </Suspense>
      </div>
    </Container>
  </header>
  );
};

export default Header;
