import React from 'react';
import Link from 'next/link';

const Header: React.FC = () => (
  <header className="bg-white shadow sticky top-0 z-50">
    <nav className="max-w-6xl mx-auto flex items-center justify-between px-4 py-3">
      <Link href="/">
        <span className="text-2xl font-bold text-blue-700 cursor-pointer">BEOKBG</span>
      </Link>
      <ul className="flex gap-6 text-sm font-medium">
        <li><Link href="/products" className="hover:text-blue-600">Продукти</Link></li>
        <li><Link href="/category?category=room-thermostat" className="hover:text-blue-600">Термостати</Link></li>
        <li><Link href="/category?category=radiator-actuator" className="hover:text-blue-600">Радиаторни вентили</Link></li>
        <li><Link href="/about-us" className="hover:text-blue-600">За нас</Link></li>
        <li><Link href="/contact-us" className="hover:text-blue-600">Контакти</Link></li>
      </ul>
    </nav>
  </header>
);

export default Header;
