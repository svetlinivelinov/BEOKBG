import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';

const AboutPage: React.FC = () => (
  <div className="min-h-screen flex flex-col bg-gray-50">
    <Header />
    <main className="flex-1 max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-800 mb-4">За нас</h1>
      <p className="text-gray-600">BEOKBG е водещ доставчик на термостати и актуатори за радиатори.</p>
    </main>
    <Footer />
  </div>
);

export default AboutPage;
