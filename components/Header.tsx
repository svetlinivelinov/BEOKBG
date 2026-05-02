import React from 'react';
import Link from 'next/link';
import LanguageSwitcher from './LanguageSwitcher';

type HeaderProps = {
  dict?: Record<string, string>;
  locale?: string;
};

const Header: React.FC<HeaderProps> = ({ dict, locale = 'bg' }) => (
  <header className="bg-white shadow sticky top-0 z-50">
    <nav className="max-w-6xl mx-auto flex items-center justify-between px-4 py-3">
      <Link href={`/${locale}`}>
        <span className="text-2xl font-bold text-blue-700 cursor-pointer">BEOKBG</span>
      </Link>
      <ul className="flex gap-6 text-sm font-medium items-center">
        <li><Link href={`/${locale}/products`} className="hover:text-blue-600">{dict?.products ?? 'Продукти'}</Link></li>
        <li><Link href={`/${locale}/products?category=room-thermostat`} className="hover:text-blue-600">{dict?.thermostats ?? 'Термостати'}</Link></li>
        <li><Link href={`/${locale}/products?category=radiator-actuator`} className="hover:text-blue-600">{dict?.radiator_valves ?? 'Радиаторни вентили'}</Link></li>
        <li><Link href={`/${locale}/about-us`} className="hover:text-blue-600">{dict?.about ?? 'За нас'}</Link></li>
        <li><Link href={`/${locale}/contact-us`} className="hover:text-blue-600">{dict?.contact ?? 'Контакти'}</Link></li>
        <li><LanguageSwitcher /></li>
      </ul>
    </nav>
  </header>
);

export default Header;
