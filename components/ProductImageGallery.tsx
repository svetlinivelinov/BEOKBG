'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Lightbox from 'yet-another-react-lightbox';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import 'yet-another-react-lightbox/styles.css';

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
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  useEffect(() => {
    setActiveIndex(0);
    setIsLightboxOpen(false);
  }, [sanitized]);

  const hasMultipleImages = sanitized.length > 1;

  const goNext = () => {
    if (!hasMultipleImages) {
      return;
    }

    setActiveIndex((current) => (current + 1) % sanitized.length);
  };

  const goPrev = () => {
    if (!hasMultipleImages) {
      return;
    }

    setActiveIndex((current) => (current - 1 + sanitized.length) % sanitized.length);
  };

  useEffect(() => {
    if (!hasMultipleImages) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isLightboxOpen) {
        return;
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goPrev();
        return;
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        goNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [hasMultipleImages, sanitized.length, isLightboxOpen]);

  if (sanitized.length === 0) {
    return null;
  }

  const activeImage = sanitized[Math.min(activeIndex, sanitized.length - 1)];
  const slides = sanitized.map((src) => ({ src }));

  const handleWheel: React.WheelEventHandler<HTMLDivElement> = (event) => {
    if (!hasMultipleImages || isLightboxOpen) {
      return;
    }

    if (Math.abs(event.deltaY) < 8) {
      return;
    }

    event.preventDefault();
    if (event.deltaY > 0) {
      goNext();
      return;
    }

    goPrev();
  };

  return (
    <div className="w-full md:w-72 flex-shrink-0">
      <div className="relative" onWheel={handleWheel}>
        {hasMultipleImages && (
          <>
            <button
              type="button"
              onClick={goPrev}
              aria-label="Previous image"
              className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/55 px-3 py-1 text-lg leading-none text-white hover:bg-black/70"
            >
              {'<'}
            </button>
            <button
              type="button"
              onClick={goNext}
              aria-label="Next image"
              className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/55 px-3 py-1 text-lg leading-none text-white hover:bg-black/70"
            >
              {'>'}
            </button>
          </>
        )}

        <button
          type="button"
          onClick={() => setIsLightboxOpen(true)}
          className="block w-full"
          aria-label="Open product image viewer"
        >
          <Image
            src={activeImage}
            alt={alt}
            width={288}
            height={288}
            sizes="(max-width: 768px) 100vw, 288px"
            className="w-full h-72 object-contain rounded"
            priority
          />
        </button>
      </div>

      {hasMultipleImages && (
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

      <Lightbox
        open={isLightboxOpen}
        close={() => setIsLightboxOpen(false)}
        index={activeIndex}
        slides={slides}
        plugins={[Zoom]}
        zoom={{
          maxZoomPixelRatio: 4,
          zoomInMultiplier: 1.6,
          wheelZoomDistanceFactor: 140
        }}
        on={{
          view: ({ index }) => setActiveIndex(index)
        }}
        carousel={{ finite: false }}
      />
    </div>
  );
}
