import Link from 'next/link';
import type { Metadata } from 'next';
import { getDictionary } from '../../../lib/i18n/getDictionary';
import Header from '../../../components/Header';
import Footer from '../../../components/Footer';
import CategoryGrid from '../../../components/CategoryGrid';
import CategorySidebar from '../../../components/CategorySidebar';
import Container from '../../../components/Container';
import { getProducts, getCategories } from '../../../lib/products/getProducts';
import { APPLICATIONS, getApplicationLabels, isProductApplication, ProductApplication } from '../../../lib/products/application';
import { locales } from '../../../lib/i18n/config';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const dict = await getDictionary(locale);

  return {
    title: dict.all_products,
    description:
      locale === 'bg'
        ? 'Прегледайте всички термостати и контролери в продуктовия каталог на BEOKBG.'
        : 'Browse all thermostats and controllers in the BEOKBG product catalog.',
    alternates: {
      canonical: `/${locale}/products`,
      languages: {
        bg: '/bg/products',
        en: '/en/products'
      }
    },
    openGraph: {
      title: `${dict.all_products} | BEOKBG`,
      description:
        locale === 'bg'
          ? 'Прегледайте всички термостати и контролери в продуктовия каталог на BEOKBG.'
          : 'Browse all thermostats and controllers in the BEOKBG product catalog.',
      url: `/${locale}/products`
    }
  };
}

export default async function ProductsPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ category?: string; application?: string }>;
}) {
  const { locale } = await params;
  const { category, application } = await searchParams;
  const dict = await getDictionary(locale);
  const products = getProducts(locale);
  const categories = getCategories();
  const selectedApplication = isProductApplication(application) ? application : undefined;

  const appLabels = getApplicationLabels(locale);

  const appFilterTitle = locale === 'bg' ? 'Приложение' : 'Application';
  const allAppLabel = locale === 'bg' ? 'Всички' : 'All';

  const categoryFiltered = category ? products.filter((p) => p.category === category) : products;
  const availableApplications = APPLICATIONS.filter((app) =>
    categoryFiltered.some((p) => p.application === app)
  );

  const showApplicationFilter =
    (category === 'room-thermostat' || category === 'gas-boiler-thermostat') && availableApplications.length > 1;

  const makeFilterHref = (nextApp?: ProductApplication) => {
    const qs = new URLSearchParams();
    if (category) {
      qs.set('category', category);
    }
    if (nextApp) {
      qs.set('application', nextApp);
    }
    const query = qs.toString();
    return `/${locale}/products${query ? `?${query}` : ''}`;
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header locale={locale} dict={dict} />
      <Container className="pt-4 text-sm text-gray-500">
        <nav aria-label="Breadcrumb">
          {dict.home} / {dict.all_products}
        </nav>
      </Container>
      <Container className="flex-1 py-8 w-full flex flex-col md:flex-row gap-8">
        <CategorySidebar
          categories={categories}
          basePath={`/${locale}/products`}
          activeCategory={category}
          allLabel={dict.all_products}
          locale={locale}
        />
        <div className="flex-1">
          <h1 className="text-3xl font-bold mb-6">{dict.all_products}</h1>
          {showApplicationFilter && (
            <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-sm font-semibold text-gray-700 mb-3">{appFilterTitle}</p>
              <div className="flex flex-wrap gap-2" role="group" aria-label={appFilterTitle}>
                <Link
                  href={makeFilterHref()}
                  className={`px-3 py-1.5 rounded border text-sm transition-colors ${
                    !selectedApplication
                      ? 'bg-brand-orange text-white border-brand-orange'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-brand-orange hover:text-brand-orange'
                  }`}
                  aria-current={!selectedApplication ? 'page' : undefined}
                >
                  {allAppLabel}
                </Link>
                {availableApplications.map((app) => (
                  <Link
                    key={app}
                    href={makeFilterHref(app)}
                    className={`px-3 py-1.5 rounded border text-sm transition-colors ${
                      selectedApplication === app
                        ? 'bg-brand-orange text-white border-brand-orange'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-brand-orange hover:text-brand-orange'
                    }`}
                    aria-current={selectedApplication === app ? 'page' : undefined}
                  >
                    {appLabels[app]}
                  </Link>
                ))}
              </div>
            </div>
          )}
          <CategoryGrid
            products={products}
            category={category}
            application={selectedApplication}
            locale={locale}
            viewProductLabel={dict.view_product}
          />
        </div>
      </Container>
      <Footer locale={locale} dict={dict} />
    </div>
  );
}
