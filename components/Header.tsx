import React from 'react';
import Link from 'next/link';
import LanguageSwitcher from './LanguageSwitcher';

type HeaderProps = {
  dict?: Record<string, string>;
};

const Header: React.FC<HeaderProps> = ({ dict }) => (
  <header className="bg-white shadow sticky top-0 z-50">
    <nav className="max-w-6xl mx-auto flex items-center justify-between px-4 py-3">
      <Link href="/">
        <span className="text-2xl font-bold text-blue-700 cursor-pointer">BEOKBG</span>
      </Link>
      <ul className="flex gap-6 text-sm font-medium items-center">
        <li><Link href="/products" className="hover:text-blue-600">{dict?.products ?? 'Продукти'}</Link></li>
        <li><Link href="/category?category=room-thermostat" className="hover:text-blue-600">{dict?.thermostats ?? 'Термостати'}</Link></li>
        <li><Link href="/category?category=radiator-actuator" className="hover:text-blue-600">{dict?.radiator_valves ?? 'Радиаторни вентили'}</Link></li>
        <li><Link href="/about-us" className="hover:text-blue-600">{dict?.about ?? 'За нас'}</Link></li>
        <li><Link href="/contact-us" className="hover:text-blue-600">{dict?.contact ?? 'Контакти'}</Link></li>
        <li><LanguageSwitcher /></li>
      </ul>
    </nav>
  </header>
);

export default Header;
