import React from 'react';

type HeroProps = {
  title?: string;
  subtitle?: string;
  cta?: string;
};

const Hero: React.FC<HeroProps> = ({ title, subtitle, cta }) => (
  <section className="bg-gradient-to-r from-blue-600 to-blue-400 text-white py-16 px-4 text-center rounded-lg shadow mb-8">
    <h1 className="text-4xl md:text-5xl font-bold mb-4">
      {title ?? 'Добре дошли в BEOKBG'}
    </h1>
    <p className="text-lg md:text-xl mb-6 max-w-2xl mx-auto">
      {subtitle ?? 'Модерни термостати, контролери и решения за отопление и автоматизация.'}
    </p>
    <a
      href="#products"
      className="inline-block px-8 py-3 bg-white text-blue-700 font-semibold rounded shadow hover:bg-blue-100 transition"
    >
      {cta ?? 'Разгледай продуктите'}
    </a>
  </section>
);

export default Hero;
