
import React from 'react';
import Link from 'next/link';

export interface ProductCardProps {
  title: string;
  description: string;
  image: string;
  url: string;
  category?: string;
}


const ProductCard: React.FC<ProductCardProps> = ({ title, description, image }) => {
  // Generate a URL-friendly id from the title
  const id = title.replace(/\s+/g, '-').toLowerCase();
  return (
    <div className="bg-white rounded-lg shadow hover:shadow-lg transition p-4 flex flex-col items-center text-center">
      <img
        src={image}
        alt={title}
        className="w-32 h-32 object-contain mb-4 rounded"
        loading="lazy"
      />
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-gray-600 text-sm mb-4">{description}</p>
      <Link
        href={`/products/${id}`}
        className="mt-auto inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
      >
        Виж продукта
      </Link>
    </div>
  );
};

export default ProductCard;
