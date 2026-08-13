'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';

interface ProductImageGalleryProps {
  images: string[];
  alt: string;
}

export default function ProductImageGallery({ images, alt }: ProductImageGalleryProps) {
  const sanitized = useMemo(() => images.filter(Boolean), [images]);
  const [activeIndex, setActiveIndex] = useState(0);

  if (sanitized.length === 0) {
    return null;
  }

  const activeImage = sanitized[Math.min(activeIndex, sanitized.length - 1)];

  return (
    <div className="w-full md:w-72 flex-shrink-0">
      <Image
        src={activeImage}
        alt={alt}
        width={288}
        height={288}
        sizes="(max-width: 768px) 100vw, 288px"
        className="w-full h-72 object-contain rounded"
      />

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
