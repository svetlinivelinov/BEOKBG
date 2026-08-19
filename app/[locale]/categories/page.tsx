import { getDictionary } from '../../../lib/i18n/getDictionary';
import type { Metadata } from 'next';
import Header from '../../../components/Header';
import Footer from '../../../components/Footer';
import CategoryCard from '../../../components/CategoryCard';
import Container from '../../../components/Container';
import { getProducts, getCategories } from '../../../lib/products/getProducts';
import { locales } from '../../../lib/i18n/config';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const dict = await getDictionary(locale);

  return {
    title: dict.categories,
    description:
      locale === 'bg'
        ? 'Разгледайте всички продуктови категории в каталога на BEOKBG.'
        : 'Browse all product categories in the BEOKBG catalog.',
    alternates: {
      canonical: `/${locale}/categories`,
      languages: {
        bg: '/bg/categories',
        en: '/en/categories',
        'x-default': '/bg/categories'
      }
    },
    openGraph: {
      title: `${dict.categories} | BEOKBG`,
      description:
        locale === 'bg'
          ? 'Разгледайте всички продуктови категории в каталога на BEOKBG.'
          : 'Browse all product categories in the BEOKBG catalog.',
      url: `/${locale}/categories`
    }
  };
}

export default async function CategoriesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const dict = await getDictionary(locale);
  const products = getProducts(locale);
  const categories = getCategories();
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header locale={locale} dict={dict} />
      <Container className="pt-4 text-sm text-gray-500">
        <nav aria-label="Breadcrumb">{dict.home} / {dict.categories}</nav>
      </Container>
      <Container className="flex-1 py-8 w-full">
        <h1 className="text-3xl font-bold mb-6">{dict.categories}</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {categories.map((category) => (
            <CategoryCard
              key={category}
              category={category}
              count={products.filter((p) => p.category === category).length}
              href={`/${locale}/products?category=${encodeURIComponent(category)}`}
              browseLabel={dict.browse_products}
              productsLabel={dict.products}
              locale={locale}
            />
          ))}
        </div>
      </Container>
      <Footer locale={locale} dict={dict} />
    </div>
  );
}
