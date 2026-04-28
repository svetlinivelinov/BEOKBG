import { useRouter } from 'next/router';
import React from 'react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import products from '../../extracted/products-extracted.json';

const ProductDetail: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;
  const product = Array.isArray(products)
    ? products.find((p) => p.title.replace(/\s+/g, '-').toLowerCase() === id)
    : null;

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-1 max-w-2xl mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Продуктът не е намерен</h1>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1 max-w-2xl mx-auto px-4 py-16">
        <img
          src={product.image}
          alt={product.title}
          className="w-64 h-64 object-contain mx-auto mb-6 rounded shadow"
        />
        <h1 className="text-3xl font-bold mb-4">{product.title}</h1>
        <p className="text-gray-700 text-lg mb-6">{product.description}</p>
        <div className="text-sm text-gray-500 mb-2">Категория: {product.category}</div>
        <a
          href={product.url}
          className="inline-block px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          target="_blank"
          rel="noopener noreferrer"
        >
          Виж в BEOK Controls
        </a>
      </main>
      <Footer />
    </div>
  );
};

export default ProductDetail;
