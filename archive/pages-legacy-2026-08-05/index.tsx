import React from 'react';

import Header from '../components/Header';
import Hero from '../components/Hero';
import Footer from '../components/Footer';
import CategoryGrid from '../components/CategoryGrid';
import products from '../extracted/products-extracted.json';

const HomePage: React.FC = () => (
  <div className="min-h-screen flex flex-col bg-gray-50">
    <Header />
    <Hero />
    <main className="flex-1 max-w-6xl mx-auto px-4 py-8">
      <CategoryGrid products={products} />
    </main>
    <Footer />
  </div>
);

export default HomePage;
