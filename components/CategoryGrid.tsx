"use client";

import React, { useState } from 'react';
import ProductCard, { ProductCardProps } from './ProductCard';
import { formatCategoryLabel } from '../lib/formatCategoryLabel';

export interface CategoryGridProps {
  products: ProductCardProps[];
  category?: string;
  application?: 'electric' | 'water' | 'gas-boiler';
  locale?: string;
  viewProductLabel?: string;
  emptyStateResetHref?: string;
  emptyStateResetLabel?: string;
}

const CategoryGrid: React.FC<CategoryGridProps> = ({
  products,
  category,
  application,
  locale,
  viewProductLabel,
  emptyStateResetHref,
  emptyStateResetLabel
}) => {
  const [openDescriptionId, setOpenDescriptionId] = useState<string | null>(null);
  const filteredByCategory = category ? products.filter((p) => p.category === category) : products;
  const filtered = application ? filteredByCategory.filter((p) => p.application === application) : filteredByCategory;

  if (filtered.length === 0) {
    const emptyMessage = locale === 'bg' ? 'Няма продукти, които да съответстват на избраните филтри.' : 'No products match the selected filters.';
    const actionLabel = emptyStateResetLabel ?? (locale === 'bg' ? 'Покажи всички' : 'Show all');

    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center">
        <p className="text-lg font-semibold text-gray-700 mb-2">{emptyMessage}</p>
        {emptyStateResetHref && (
          <a href={emptyStateResetHref} className="inline-flex items-center rounded bg-brand-orange px-4 py-2 text-sm font-medium text-white hover:bg-brand-orange/90">
            {actionLabel}
          </a>
        )}
      </div>
    );
  }

  return (
    <div>
      {category && <h2 className="text-2xl font-bold mb-4">{formatCategoryLabel(category, locale || 'en')}</h2>}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 items-stretch">
        {filtered.map(product => (
          <ProductCard
            key={product.id}
            {...product}
            locale={locale}
            viewProductLabel={viewProductLabel}
            isDescriptionOpen={openDescriptionId === product.id}
            onDescriptionToggle={(open) => setOpenDescriptionId(open ? product.id : null)}
          />
        ))}
      </div>
    </div>
  );
};

export default CategoryGrid;
