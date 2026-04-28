import React from 'react';

const Footer: React.FC = () => (
  <footer className="bg-gray-900 text-white py-8 px-4 mt-12 text-center rounded-t-lg shadow-inner">
    <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
      <div className="text-sm">&copy; {new Date().getFullYear()} BEOKBG. All rights reserved.</div>
      <div className="flex gap-4 text-sm">
        <a href="/about-us" className="hover:underline">За нас</a>
        <a href="/products" className="hover:underline">Продукти</a>
        <a href="/contact-us" className="hover:underline">Контакти</a>
      </div>
    </div>
  </footer>
);

export default Footer;
