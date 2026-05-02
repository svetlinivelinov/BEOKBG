import React from 'react';

type FooterProps = {
  dict?: Record<string, string>;
};

const Footer: React.FC<FooterProps> = ({ dict }) => (
  <footer className="bg-gray-900 text-white py-8 px-4 mt-12 text-center rounded-t-lg shadow-inner">
    <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
      <div className="text-sm">&copy; {new Date().getFullYear()} BEOKBG. All rights reserved.</div>
      <div className="flex gap-4 text-sm">
        <a href="/about-us" className="hover:underline">{dict?.about ?? 'За нас'}</a>
        <a href="/products" className="hover:underline">{dict?.products ?? 'Продукти'}</a>
        <a href="/contact-us" className="hover:underline">{dict?.contact ?? 'Контакти'}</a>
      </div>
    </div>
  </footer>
);

export default Footer;
