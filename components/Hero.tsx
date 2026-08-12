import React from 'react';

export interface HeroProps {
  title?: string;
  subtitle?: string;
  ctaLabel?: string;
}

const Hero: React.FC<HeroProps> = ({
  title = 'Добре дошли в BEOKBG',
  subtitle = 'Модерни термостати, контролери и решения за отопление и автоматизация. Вдъхновено от BEOK Controls.',
  ctaLabel = 'Разгледай продуктите'
}) => (
  <section className="bg-gradient-to-r from-brand-blue-dark via-brand-blue to-gray-700 text-white py-16 px-4 text-center shadow mb-8">
    <h1 className="text-4xl md:text-5xl font-extrabold mb-4">{title}</h1>
    <p className="text-lg md:text-xl mb-6 max-w-2xl mx-auto text-gray-100">
      {subtitle}
    </p>
    <a
      href="#products"
      className="inline-block px-8 py-3 bg-brand-orange text-white font-semibold rounded shadow hover:bg-brand-orange-dark transition-colors"
    >
      {ctaLabel}
    </a>
  </section>
);

export default Hero;
