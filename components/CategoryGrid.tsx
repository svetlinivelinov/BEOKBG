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
}

const CategoryGrid: React.FC<CategoryGridProps> = ({ products, category, application, locale, viewProductLabel }) => {
  const [openDescriptionId, setOpenDescriptionId] = useState<string | null>(null);
  const filteredByCategory = category ? products.filter((p) => p.category === category) : products;
  const filtered = application ? filteredByCategory.filter((p) => p.application === application) : filteredByCategory;
  return (
    <div>
      {category && <h2 className="text-2xl font-bold mb-4">{formatCategoryLabel(category, locale || 'en')}</h2>}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 items-start">
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
