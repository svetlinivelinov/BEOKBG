
import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

export interface ProductCardProps {
  slug?: string;
  title: string;
  description: string;
  image: string;
  url: string;
  category?: string;
  viewProduct?: string;
  locale?: string;
}

const ProductCard: React.FC<ProductCardProps> = ({ title, description, image, viewProduct, slug, locale }) => {
  const id = slug ?? title.replace(/\s+/g, '-').toLowerCase();
  const isValidSrc = image.startsWith('/') || image.startsWith('http://') || image.startsWith('https://');

  return (
    <div className="bg-white rounded-lg shadow hover:shadow-lg transition p-4 flex flex-col items-center text-center">
      <div className="relative w-32 h-32 mb-4 bg-gray-100 rounded flex items-center justify-center">
        {isValidSrc ? (
          <Image
            src={image}
            alt={title}
            fill
            className="object-contain rounded"
            sizes="128px"
          />
        ) : (
          <span className="text-xs text-gray-400 px-2">{title}</span>
        )}
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-gray-600 text-sm mb-4">{description}</p>
      <Link
        href={locale ? `/${locale}/products/${id}` : `/products/${id}`}
        className="mt-auto inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
      >
        {viewProduct ?? 'Виж продукта'}
      </Link>
    </div>
  );
};

export default ProductCard;
