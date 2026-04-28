import React from 'react';

const Hero: React.FC = () => (
  <section className="bg-gradient-to-r from-blue-600 to-blue-400 text-white py-16 px-4 text-center rounded-lg shadow mb-8">
    <h1 className="text-4xl md:text-5xl font-bold mb-4">Добре дошли в BEOKBG</h1>
    <p className="text-lg md:text-xl mb-6 max-w-2xl mx-auto">
      Модерни термостати, контролери и решения за отопление и автоматизация. Вдъхновено от BEOK Controls.
    </p>
    <a
      href="#products"
      className="inline-block px-8 py-3 bg-white text-blue-700 font-semibold rounded shadow hover:bg-blue-100 transition"
    >
      Разгледай продуктите
    </a>
  </section>
);

export default Hero;
