import { getDictionary } from '../../../../lib/i18n/getDictionary';
import Footer from '../../../../components/Footer';
import CategoryGrid from '../../../../components/CategoryGrid';
import products from '../../../../extracted/products-extracted.json';

export default async function ProductsPage({ params }: { params: { locale: string } }) {
  const dict = await getDictionary(params.locale);
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <main className="flex-1 max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">{dict["all_products"]}</h1>
        <CategoryGrid products={products} />
      </main>
      <Footer dict={dict} />
    </div>
  );
}
