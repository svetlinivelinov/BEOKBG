import { getDictionary } from '../../lib/i18n/getDictionary';
import type { Metadata } from 'next';
import Header from '../../components/Header';
import Hero from '../../components/Hero';
import Footer from '../../components/Footer';
import CategoryGrid from '../../components/CategoryGrid';
import Container from '../../components/Container';
import { getProducts } from '../../lib/products/getProducts';
import { locales } from '../../lib/i18n/config';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const dict = await getDictionary(locale);
  const title = locale === 'bg' ? 'Начало' : 'Home';

  return {
    title,
    description: dict.hero_subtitle,
    alternates: {
      canonical: `/${locale}`,
      languages: {
        bg: '/bg',
        en: '/en'
      }
    },
    openGraph: {
      title: `${title} | BEOKBG`,
      description: dict.hero_subtitle,
      url: `/${locale}`
    }
  };
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const dict = await getDictionary(locale);
  const products = getProducts(locale);
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header locale={locale} dict={dict} />
      <Hero title={dict.welcome} subtitle={dict.hero_subtitle} ctaLabel={dict.browse_products} />
      <Container id="products" className="flex-1 py-8">
        <CategoryGrid
          products={products}
          locale={locale}
          viewProductLabel={dict.view_product}
        />
      </Container>
      <Footer locale={locale} dict={dict} />
    </div>
  );
}
