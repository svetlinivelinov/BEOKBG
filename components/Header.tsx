import React, { Suspense } from 'react';
import Link from 'next/link';
import LanguageSwitcher from './LanguageSwitcher';
import Container from './Container';
import { Dictionary } from '../lib/i18n/types';
import { formatCategoryLabel } from '../lib/formatCategoryLabel';
import { getCategories } from '../lib/products/getProducts';
import CartButton from './cart/CartButton';

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
  documentation: 'Официална документация',
  cart: 'Количка',
  add_to_cart: 'Добави в количката',
  product_actions_hint: 'Имате нужда от този продукт? Добавете го в количката или изтеглете ръководството.',
  quantity: 'Количество',
  unit_price: 'Ед. цена',
  line_total: 'Стойност',
  subtotal: 'Общо',
  added_to_cart: 'Продуктът е добавен в количката.',
  continue_shopping: 'Продължи пазаруването',
  go_to_cart: 'Към количката',
  cart_empty: 'Количката е празна.',
  remove: 'Премахни',
  clear_cart: 'Изчисти количката',
  order_request_title: 'Заявка за поръчка',
  customer_name: 'Име',
  customer_email: 'Имейл',
  customer_phone: 'Телефон',
  customer_note: 'Бележка',
  send_order_request: 'Изпрати заявка за поръчка',
  order_request_subject: 'Заявка за поръчка от BEOKBG',
  order_request_intro: 'Попълнете данните си и изпратете заявката. Ще се свържем с вас възможно най-скоро.',
  please_fill_required: 'Моля, попълнете име и имейл.',
  order_request_success: 'Заявката за поръчка е изпратена успешно.',
  order_request_error: 'Заявката не можа да бъде изпратена. Моля, опитайте отново.',
  low_stock_alert_title: 'Предупреждение за ниска наличност',
  send_factory_reorder_email: 'Изпрати имейл за заявка към фабриката',
  proceed_to_checkout: 'Към защитено плащане',
  checkout_processing: 'Пренасочване към защитено плащане...',
  checkout_error: 'Плащането не може да стартира в момента. Опитайте отново.',
  checkout_unavailable_for_low_stock: 'Плащането е изключено, защото някои артикули надвишават наличността. Използвайте заявка за поръчка по-долу.',
  checkout_not_configured: 'Онлайн плащането все още не е конфигурирано. Свържете се с нас или използвайте заявка за поръчка.',
  checkout_success: 'Плащането е успешно. Благодарим за поръчката.',
  checkout_cancelled: 'Плащането беше отказано. Можете да продължите и платите по-късно.',
  payment_options_title: 'Опции за плащане',
  request_quote: 'Заявка за оферта',
  ask_availability: 'Питай за наличност',
  download_manual: 'Изтегли ръководство',
  contact_for_availability: 'Нуждаете се от наличност или оферта? Свържете се с нас и ще ви помогнем бързо.',
  request_quote_cta: 'Заявете оферта за този продукт',
  delivery_title: 'Данни за доставка',
  full_name: 'Име и фамилия',
  phone: 'Телефон',
  email: 'Имейл',
  delivery_address: 'Доставка до адрес',
  delivery_easybox: 'Доставка до easybox',
  address_line1: 'Адрес',
  city: 'Град',
  postal_code: 'Пощенски код',
  easybox_locker: 'Easybox локация',
  load_easybox_error: 'В момента не можем да заредим Easybox локациите.',
  fill_delivery_required: 'Моля, попълнете всички задължителни полета за доставка преди плащане.'
};

const withLocale = (locale: string | undefined, path: string) => {
  if (!locale) return path;
  return `/${locale}${path === '/' ? '' : path}`;
};

const Header: React.FC<HeaderProps> = ({ locale, dict }) => {
  const t = dict || fallbackDict;
  const activeLocale = locale || 'en';
  const categories = getCategories();

  return (
  <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
    <Container className="flex flex-wrap items-center gap-2 py-3 sm:flex-nowrap sm:justify-between">
      <Link href={withLocale(locale, '/')} className="flex items-center gap-2">
        <span className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-orange to-brand-blue flex-shrink-0" />
        <span className="text-xl sm:text-2xl font-extrabold text-brand-blue leading-none cursor-pointer">
          BEOK<span className="text-brand-orange">BG</span>
        </span>
      </Link>
      <div className="ml-auto flex items-center justify-end gap-2 sm:gap-4">
        <ul className="flex gap-2 sm:gap-6 text-xs sm:text-sm font-semibold uppercase tracking-wide">
          <li className="relative group">
            <Link
              href={withLocale(locale, '/products')}
              className="flex items-center gap-1 text-gray-700 hover:text-brand-orange transition-colors py-2"
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
        <CartButton locale={activeLocale} label={t.cart} />
      </div>
    </Container>
  </header>
  );
};

export default Header;
