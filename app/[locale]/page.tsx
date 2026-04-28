import { getDictionary } from '../../../lib/i18n/getDictionary';
import Hero from '../../../components/Hero';
import Footer from '../../../components/Footer';
import CategoryGrid from '../../../components/CategoryGrid';
import products from '../../../extracted/products-extracted.json';

export default async function Page({ params }: { params: { locale: string } }) {
  const dict = await getDictionary(params.locale);
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Hero title={dict["welcome"]} />
      <main className="flex-1 max-w-6xl mx-auto px-4 py-8">
        <CategoryGrid products={products} />
      </main>
      <Footer dict={dict} />
    </div>
  );
}
