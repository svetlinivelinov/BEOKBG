import React from 'react';
import ProductCard, { ProductCardProps } from './ProductCard';

export interface CategoryGridProps {
  products: ProductCardProps[];
  category?: string;
  viewProduct?: string;
}

const CategoryGrid: React.FC<CategoryGridProps> = ({ products, category, viewProduct }) => {
  const filtered = category ? products.filter(p => p.category === category) : products;
  return (
    <div>
      {category && <h2 className="text-2xl font-bold mb-4">{category}</h2>}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {filtered.map(product => (
          <ProductCard key={product.title} {...product} viewProduct={viewProduct} />
        ))}
      </div>
    </div>
  );
};

export default CategoryGrid;
