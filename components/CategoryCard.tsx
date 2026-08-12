import React from 'react';
import Link from 'next/link';
import { formatCategoryLabel } from '../lib/formatCategoryLabel';

export interface CategoryCardProps {
  category: string;
  count: number;
  href: string;
  browseLabel: string;
  productsLabel: string;
  locale?: string;
}

const CategoryCard: React.FC<CategoryCardProps> = ({ category, count, href, browseLabel, productsLabel, locale = 'en' }) => (
  <div className="bg-white rounded-lg shadow hover:shadow-lg transition flex flex-col overflow-hidden">
    <div className="bg-brand-blue text-white flex items-center justify-center h-24 text-3xl font-bold">
      {category.charAt(0).toUpperCase()}
    </div>
    <div className="p-4 flex flex-col items-center text-center flex-1">
      <h3 className="text-lg font-semibold mb-1">{formatCategoryLabel(category, locale)}</h3>
      <p className="text-gray-500 text-sm mb-4">{count} {productsLabel}</p>
      <Link
        href={href}
        className="mt-auto inline-block px-4 py-2 bg-brand-orange text-white rounded hover:bg-brand-orange-dark transition-colors"
      >
        {browseLabel}
      </Link>
    </div>
  </div>
);

export default CategoryCard;
