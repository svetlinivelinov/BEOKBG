'use client';

import React, { useEffect, useMemo, useState } from 'react';

export interface HeroProps {
  title?: string;
  subtitle?: string;
  ctaLabel?: string;
  images?: string[];
}

function shuffleImages(values: string[]): string[] {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
  }

  return copy;
}

const Hero: React.FC<HeroProps> = ({
  title = 'Добре дошли в BEOKBG',
  subtitle = 'Модерни термостати, контролери и решения за отопление и автоматизация. Вдъхновено от BEOK Controls.',
  ctaLabel = 'Разгледай продуктите',
  images = []
}) => {
  const uniqueImages = useMemo(() => Array.from(new Set(images.filter(Boolean))), [images]);
  const [orderedImages, setOrderedImages] = useState<string[]>(uniqueImages);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (uniqueImages.length === 0) {
      setOrderedImages([]);
      setActiveIndex(0);
      return;
    }

    setOrderedImages(shuffleImages(uniqueImages));
    setActiveIndex(0);
  }, [uniqueImages]);

  useEffect(() => {
    if (orderedImages.length <= 1) {
      return;
    }

    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % orderedImages.length);
    }, 5000);

    return () => window.clearInterval(interval);
  }, [orderedImages]);

  const activeImage = orderedImages.length > 0 ? orderedImages[activeIndex] : null;

  return (
    <section className="relative text-white py-16 px-4 text-center shadow mb-8 overflow-hidden">
      {activeImage ? (
        <>
          <div
            key={activeImage}
            className="hero-slide-zoom-out absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${activeImage})` }}
            aria-hidden="true"
          />
          <div className="absolute inset-0 bg-brand-blue-dark/70" aria-hidden="true" />
        </>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-r from-brand-blue-dark via-brand-blue to-gray-700" aria-hidden="true" />
      )}

      <div className="relative z-10">
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
      </div>
    </section>
  );
};

export default Hero;
