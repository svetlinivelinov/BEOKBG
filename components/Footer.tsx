import React from 'react';
import Link from 'next/link';

type FooterProps = {
  dict?: Record<string, string>;
};

const Footer: React.FC<FooterProps> = ({ dict }) => (
  <footer className="bg-slate-950 text-slate-100 mt-14">
    <div className="max-w-7xl mx-auto px-4 py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
      <section>
        <h3 className="text-base font-semibold mb-3">{dict?.follow_us ?? 'Последвай ни'}</h3>
        <div className="flex gap-3 text-sm">
          <a href="https://www.facebook.com/Beok.Controls" target="_blank" rel="noopener noreferrer" className="px-3 py-1 rounded border border-slate-700 hover:bg-slate-800">FB</a>
          <a href="https://twitter.com/Beok_Controls" target="_blank" rel="noopener noreferrer" className="px-3 py-1 rounded border border-slate-700 hover:bg-slate-800">X</a>
          <a href="https://www.linkedin.com/company/beokcontrols/?viewAsMember=true" target="_blank" rel="noopener noreferrer" className="px-3 py-1 rounded border border-slate-700 hover:bg-slate-800">IN</a>
          <a href="https://www.youtube.com/c/BeokControls/featured" target="_blank" rel="noopener noreferrer" className="px-3 py-1 rounded border border-slate-700 hover:bg-slate-800">YT</a>
        </div>
      </section>

      <section>
        <h3 className="text-base font-semibold mb-3">{dict?.quick_navigation ?? 'Бърза навигация'}</h3>
        <ul className="space-y-2 text-sm text-slate-300">
          <li><Link href="/" className="hover:text-white">{dict?.home ?? 'Начало'}</Link></li>
          <li><Link href="/products" className="hover:text-white">{dict?.products ?? 'Продукти'}</Link></li>
          <li><Link href="/about-us" className="hover:text-white">{dict?.about ?? 'За нас'}</Link></li>
          <li><Link href="/contact-us" className="hover:text-white">{dict?.contact ?? 'Контакти'}</Link></li>
        </ul>
      </section>

      <section>
        <h3 className="text-base font-semibold mb-3">{dict?.product_category ?? 'Продуктова категория'}</h3>
        <ul className="space-y-2 text-sm text-slate-300">
          <li><Link href="/products?category=room-thermostat" className="hover:text-white">{dict?.thermostats ?? 'Термостати'}</Link></li>
          <li><Link href="/products?category=underfloor-heating-controller" className="hover:text-white">{dict?.ufh_controllers ?? 'Контролери за подово'}</Link></li>
          <li><Link href="/products?category=radiator-actuator" className="hover:text-white">{dict?.radiator_valves ?? 'Радиаторни вентили'}</Link></li>
          <li><Link href="/products?category=actuator" className="hover:text-white">{dict?.actuators ?? 'Термични задвижки'}</Link></li>
        </ul>
      </section>

      <section>
        <h3 className="text-base font-semibold mb-3">{dict?.connect_us ?? 'Свържете се с нас'}</h3>
        <ul className="space-y-2 text-sm text-slate-300">
          <li>
            <a href="mailto:shine.wang@beok-controls.com" className="hover:text-white">shine.wang@beok-controls.com</a>
          </li>
          <li>
            <a href="tel:+8613127755172" className="hover:text-white">+86 131 2775 5172</a>
          </li>
          <li>
            <a href="tel:+862133880317" className="hover:text-white">+86 21 3388 0317</a>
          </li>
          <li className="text-slate-400">
            {dict?.address ?? 'Shanghai, China'}
          </li>
        </ul>
      </section>
    </div>

    <div className="border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 py-4 text-xs text-slate-400 flex flex-col sm:flex-row justify-between gap-2">
        <span>&copy; {new Date().getFullYear()} BEOKBG</span>
        <span>{dict?.all_rights_reserved ?? 'Всички права запазени.'}</span>
      </div>
    </div>
  </footer>
);

export default Footer;
