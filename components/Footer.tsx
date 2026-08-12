import React from 'react';
import Link from 'next/link';
import Container from './Container';
import { Dictionary } from '../lib/i18n/types';

interface FooterProps {
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

const Footer: React.FC<FooterProps> = ({ locale, dict }) => {
  const t = dict || fallbackDict;

  return (
  <footer className="bg-gray-900 text-gray-300 mt-12">
    <Container className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 py-10">
      <div>
        <span className="text-xl font-extrabold text-white">
          BEOK<span className="text-brand-orange">BG</span>
        </span>
        <p className="mt-3 text-sm text-gray-400">{t.hero_subtitle}</p>
      </div>
      <div>
        <h3 className="text-white font-semibold uppercase text-sm tracking-wide mb-3">{t.products}</h3>
        <ul className="space-y-2 text-sm">
          <li><Link href={withLocale(locale, '/')} className="hover:text-brand-orange transition-colors">BEOKBG</Link></li>
          <li><Link href={withLocale(locale, '/products')} className="hover:text-brand-orange transition-colors">{t.all_products}</Link></li>
          <li><Link href={withLocale(locale, '/categories')} className="hover:text-brand-orange transition-colors">{t.all_categories}</Link></li>
        </ul>
      </div>
      <div>
        <h3 className="text-white font-semibold uppercase text-sm tracking-wide mb-3">{t.contact}</h3>
        <p className="text-sm text-gray-400">{t.view_in_beok}:{' '}
          <a href="https://www.beok-controls.com" target="_blank" rel="noopener noreferrer" className="hover:text-brand-orange transition-colors">
            beok-controls.com
          </a>
        </p>
      </div>
    </Container>
    <div className="border-t border-gray-800 py-4 text-center text-xs text-gray-500">
      &copy; {new Date().getFullYear()} BEOKBG. {t.rights_reserved}
    </div>
  </footer>
  );
};

export default Footer;
