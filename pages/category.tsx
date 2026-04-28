import React from 'react';

import Header from '../components/Header';
import { useRouter } from 'next/router';
import Footer from '../components/Footer';
import CategoryGrid from '../components/CategoryGrid';
import products from '../extracted/products-extracted.json';

const CategoryPage: React.FC = () => {
  const router = useRouter();
  const { category } = router.query;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1 max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Категория: {category}</h1>
        <CategoryGrid products={products} category={category as string} />
      </main>
      <Footer />
    </div>
  );
};

export default CategoryPage;
