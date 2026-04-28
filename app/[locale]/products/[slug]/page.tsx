import { getDictionary } from '../../../../../lib/i18n/getDictionary';
import Footer from '../../../../../components/Footer';
import products from '../../../../../extracted/products-extracted.json';

export default async function ProductDetailPage({ params }: { params: { locale: string; slug: string } }) {
  const dict = await getDictionary(params.locale);
  const product = Array.isArray(products)
    ? products.find((p) => p.title.replace(/\s+/g, '-').toLowerCase() === params.slug)
    : null;

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <main className="flex-1 max-w-2xl mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">{dict["not_found"]}</h1>
        </main>
        <Footer dict={dict} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <main className="flex-1 max-w-2xl mx-auto px-4 py-16">
        <img
          src={product.image}
          alt={product.title}
          className="w-64 h-64 object-contain mx-auto mb-6 rounded shadow"
        />
        <h1 className="text-3xl font-bold mb-4">{product.title}</h1>
        <p className="text-gray-700 text-lg mb-6">{product.description}</p>
        <div className="text-sm text-gray-500 mb-2">{dict["category"]}: {product.category}</div>
        <a
          href={product.url}
          className="inline-block px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          target="_blank"
          rel="noopener noreferrer"
        >
          Виж в BEOK Controls
        </a>
      </main>
      <Footer dict={dict} />
    </div>
  );
}
