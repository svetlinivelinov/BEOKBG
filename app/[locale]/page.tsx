import { getDictionary } from '@/lib/i18n/getDictionary';
import Hero from '@/components/Hero';
import Footer from '@/components/Footer';
import CategoryGrid from '@/components/CategoryGrid';
import products from '@/extracted/products-extracted.json';
import { localizeProducts } from '@/lib/products/localizeProducts';

export default async function Page({ params }: { params: { locale: string } }) {
  const dict = await getDictionary(params.locale);
  const localizedProducts = localizeProducts(products, params.locale);
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Hero title={dict["welcome"]} subtitle={dict["hero_subtitle"]} cta={dict["hero_cta"]} />
      <main className="flex-1 max-w-6xl mx-auto px-4 py-8">
        <CategoryGrid products={localizedProducts} viewProduct={dict["view_product"]} locale={params.locale} />
      </main>
      <Footer dict={dict} />
    </div>
  );
}
