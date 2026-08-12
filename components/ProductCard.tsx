
import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

export interface ProductCardProps {
  id: string;
  name: string;
  description: string;
  category?: string;
  application?: 'electric' | 'water' | 'gas-boiler';
  image?: string | null;
  locale?: string;
  viewProductLabel?: string;
  isDescriptionOpen?: boolean;
  onDescriptionToggle?: (open: boolean) => void;
}


const ProductCard: React.FC<ProductCardProps> = ({
  id,
  name,
  description,
  image,
  locale,
  viewProductLabel = 'Виж продукта',
  isDescriptionOpen = false,
  onDescriptionToggle
}) => {
  const href = locale ? `/${locale}/products/${id}` : `/products/${id}`;
  const descriptionLabel = locale === 'bg' ? 'Описание' : 'Description';
  const detailsRegionId = `product-description-${id}`;
  return (
    <div className="bg-white rounded-lg shadow hover:shadow-lg transition p-4 flex flex-col items-center text-center self-start">
      {image ? (
        <Image
          src={image}
          alt={name}
          width={128}
          height={128}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          className="w-32 h-32 object-contain mb-4 rounded"
        />
      ) : (
        <div
          className="w-32 h-32 mb-4 rounded bg-gray-100 flex items-center justify-center text-gray-400 text-3xl font-semibold"
          aria-hidden="true"
        >
          {name.charAt(0).toUpperCase()}
        </div>
      )}
      <h3 className="text-lg font-semibold mb-2">{name}</h3>
      <details className="w-full text-left mb-4 group" open={isDescriptionOpen}>
        <summary
          className="cursor-pointer list-none text-sm font-medium text-gray-700 flex items-center justify-between"
          aria-controls={detailsRegionId}
          aria-expanded={isDescriptionOpen}
          onClick={(event) => {
            event.preventDefault();
            onDescriptionToggle?.(!isDescriptionOpen);
          }}
        >
          <span>{descriptionLabel}</span>
          <span className="text-brand-orange transition-transform group-open:rotate-180" aria-hidden="true">▾</span>
        </summary>
        <p id={detailsRegionId} className="text-gray-600 text-sm mt-2">{description}</p>
      </details>
      <Link
        href={href}
        className="mt-auto inline-block px-4 py-2 bg-brand-orange text-white rounded hover:bg-brand-orange-dark transition-colors"
      >
        {viewProductLabel}
      </Link>
    </div>
  );
};

export default ProductCard;
