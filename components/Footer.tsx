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
        <p className="mt-2 text-sm text-gray-400">
          <a href="mailto:beokbg@gmail.com" className="hover:text-brand-orange transition-colors">beokbg@gmail.com</a>
        </p>
        <p className="mt-1 text-sm text-gray-400">
          <a href="tel:+359898535383" className="hover:text-brand-orange transition-colors">0898535383</a>
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
