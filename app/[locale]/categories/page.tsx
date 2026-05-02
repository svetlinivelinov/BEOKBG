import { getDictionary } from '@/lib/i18n/getDictionary';
import Footer from '@/components/Footer';
import CategoryGrid from '@/components/CategoryGrid';
import products from '@/extracted/products-extracted.json';
import { localizeProducts } from '@/lib/products/localizeProducts';

export default async function CategoriesPage({ params }: { params: { locale: string } }) {
  const dict = await getDictionary(params.locale);
  const localizedProducts = localizeProducts(products, params.locale);
  // Example: show all categories or a grid of categories
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <main className="flex-1 max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">{dict["categories"]}</h1>
        <CategoryGrid products={localizedProducts} viewProduct={dict["view_product"]} locale={params.locale} />
      </main>
      <Footer dict={dict} locale={params.locale} />
    </div>
  );
}
