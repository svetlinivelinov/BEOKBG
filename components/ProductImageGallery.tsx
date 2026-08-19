'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Zoom from 'react-medium-image-zoom';
import 'react-medium-image-zoom/dist/styles.css';

interface ProductImageGalleryProps {
  images: string[];
  alt: string;
}

export default function ProductImageGallery({ images, alt }: ProductImageGalleryProps) {
  const sanitized = useMemo(() => {
    const unique = Array.from(new Set(images.filter(Boolean)));

    const sortKey = (src: string): number => {
      const dashMatch = src.match(/-(\d+)\.[a-zA-Z]+$/);
      if (dashMatch) {
        return Number.parseInt(dashMatch[1], 10);
      }

      const parenMatch = src.match(/\((\d+)\)\.[a-zA-Z]+$/);
      if (parenMatch) {
        return Number.parseInt(parenMatch[1], 10);
      }

      return Number.MAX_SAFE_INTEGER;
    };

    return unique.sort((a, b) => {
      const orderA = sortKey(a);
      const orderB = sortKey(b);
      if (orderA !== orderB) {
        return orderA - orderB;
      }

      return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [images]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [images]);

  if (sanitized.length === 0) {
    return null;
  }

  const activeImage = sanitized[Math.min(activeIndex, sanitized.length - 1)];

  return (
    <div className="w-full md:w-72 flex-shrink-0">
      <Zoom zoomImg={{ src: activeImage, alt }}>
        <img
          src={activeImage}
          alt={alt}
          width={288}
          height={288}
          className="w-full h-72 object-contain rounded cursor-zoom-in"
          loading="eager"
        />
      </Zoom>

      {sanitized.length > 1 && (
        <div className="mt-3 grid grid-cols-4 gap-2">
          {sanitized.map((image, index) => {
            const isActive = index === activeIndex;
            return (
              <button
                key={`${image}-${index}`}
                type="button"
                className={[
                  'border rounded p-1 bg-white transition',
                  isActive ? 'border-brand-orange' : 'border-gray-200 hover:border-brand-orange'
                ].join(' ')}
                onClick={() => setActiveIndex(index)}
                aria-label={`Show image ${index + 1}`}
                aria-pressed={isActive}
              >
                <Image
                  src={image}
                  alt={`${alt} ${index + 1}`}
                  width={64}
                  height={64}
                  sizes="64px"
                  className="w-full h-14 object-contain"
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
