import React from 'react';
import Link from 'next/link';
import { formatCategoryLabel } from '../lib/formatCategoryLabel';

export interface CategorySidebarProps {
  categories: string[];
  basePath: string;
  activeCategory?: string;
  allLabel: string;
  locale?: string;
}

const CategorySidebar: React.FC<CategorySidebarProps> = ({ categories, basePath, activeCategory, allLabel, locale = 'en' }) => {
  return (
    <aside className="w-full md:w-64 flex-shrink-0">
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <h2 className="bg-brand-orange text-white font-bold text-lg px-4 py-3">{allLabel}</h2>
        <ul className="divide-y divide-gray-100">
          <li>
            <Link
              href={basePath}
              className={`flex items-center justify-between px-4 py-3 text-sm hover:text-brand-orange transition-colors ${
                !activeCategory ? 'text-brand-orange font-semibold' : 'text-gray-700'
              }`}
            >
              {allLabel}
              <span aria-hidden="true">&rsaquo;</span>
            </Link>
          </li>
          {categories.map((category) => (
            <li key={category}>
              <Link
                href={`${basePath}?category=${encodeURIComponent(category)}`}
                className={`flex items-center justify-between px-4 py-3 text-sm hover:text-brand-orange transition-colors ${
                  activeCategory === category ? 'text-brand-orange font-semibold' : 'text-gray-700'
                }`}
              >
                {formatCategoryLabel(category, locale)}
                <span aria-hidden="true">&rsaquo;</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
};

export default CategorySidebar;
