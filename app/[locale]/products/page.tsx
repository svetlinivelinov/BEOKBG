import Link from 'next/link';
import { getDictionary } from '@/lib/i18n/getDictionary';
import Footer from '@/components/Footer';
import CategoryGrid from '@/components/CategoryGrid';
import products from '@/extracted/products-extracted.json';
import { localizeProducts } from '@/lib/products/localizeProducts';

export default async function ProductsPage({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams?: { category?: string; page?: string };
}) {
  const dict = await getDictionary(params.locale);
  const localizedProducts = localizeProducts(products, params.locale);
  const categories = [
    { key: 'room-thermostat', label: dict['thermostats'] ?? 'Термостати' },
    { key: 'radiator-actuator', label: dict['radiator_valves'] ?? 'Радиаторни вентили' },
    { key: 'underfloor-heating-controller', label: dict['ufh_controllers'] ?? 'Контролери за подово' },
    { key: 'actuator', label: dict['actuators'] ?? 'Термични задвижки' },
  ];

  const selectedCategory = categories.some(c => c.key === searchParams?.category)
    ? searchParams?.category
    : undefined;

  const filteredProducts = selectedCategory
    ? localizedProducts.filter(p => p.category === selectedCategory)
    : localizedProducts;

  const perPage = 8;
  const requestedPage = Number.parseInt(searchParams?.page ?? '1', 10);
  const safePage = Number.isNaN(requestedPage) || requestedPage < 1 ? 1 : requestedPage;
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / perPage));
  const currentPage = Math.min(safePage, totalPages);
  const startIndex = (currentPage - 1) * perPage;
  const pagedProducts = filteredProducts.slice(startIndex, startIndex + perPage);

  const buildHref = (page: number, category?: string) => {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (page > 1) params.set('page', String(page));
    const query = params.toString();
    return query ? `?${query}` : '?';
  };

  const advantages = [
    {
      title: dict['adv_quality_title'] ?? 'Високо качество',
      text: dict['adv_quality_text'] ?? 'Работим с висок стандарт на производство и контрол.',
    },
    {
      title: dict['adv_range_title'] ?? 'Богати продуктови линии',
      text: dict['adv_range_text'] ?? 'Различни продуктови серии за различни приложения и монтаж.',
    },
    {
      title: dict['adv_team_title'] ?? 'Професионален екип',
      text: dict['adv_team_text'] ?? 'Експертна предпродажбена и следпродажбена техническа поддръжка.',
    },
    {
      title: dict['adv_custom_title'] ?? 'Персонализирано обслужване',
      text: dict['adv_custom_text'] ?? 'Възможности за OEM/ODM и персонализирани решения.',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <main className="flex-1">
        <section className="relative bg-gradient-to-r from-slate-900 to-slate-700 text-white">
          <div className="max-w-7xl mx-auto px-4 py-10">
            <p className="text-sm text-slate-200 mb-2">
              {dict['home'] ?? 'Начало'} / {dict['products'] ?? 'Продукти'}
            </p>
            <h1 className="text-4xl font-bold">{dict['all_products']}</h1>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">
          <aside className="bg-white rounded-lg border border-slate-200 p-5 h-fit">
            <h2 className="text-lg font-semibold mb-4">{dict['product_category'] ?? 'Продуктова категория'}</h2>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href={buildHref(1)}
                  className={`block rounded px-3 py-2 ${
                    !selectedCategory ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {dict['all_products']}
                </Link>
              </li>
              {categories.map((c) => (
                <li key={c.key}>
                  <Link
                    href={buildHref(1, c.key)}
                    className={`block rounded px-3 py-2 ${
                      selectedCategory === c.key ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {c.label}
                  </Link>
                </li>
              ))}
            </ul>
          </aside>

          <div className="space-y-8">
            {selectedCategory && (
              <h2 className="text-xl font-semibold">
                {dict['category'] ?? 'Категория'}:{' '}
                {categories.find(c => c.key === selectedCategory)?.label ?? selectedCategory}
              </h2>
            )}

            <CategoryGrid products={pagedProducts} viewProduct={dict['view_product']} locale={params.locale} />

            {filteredProducts.length === 0 && (
              <p className="text-sm text-slate-500">{dict['no_products'] ?? 'Няма продукти в тази категория.'}</p>
            )}

            <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
              <Link
                href={buildHref(Math.max(1, currentPage - 1), selectedCategory)}
                className={`px-3 py-1 rounded border ${
                  currentPage === 1 ? 'pointer-events-none opacity-50 bg-slate-100' : 'bg-white hover:bg-slate-50'
                }`}
              >
                {dict['prev'] ?? 'Предишна'}
              </Link>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <Link
                  key={page}
                  href={buildHref(page, selectedCategory)}
                  className={`px-3 py-1 rounded border ${
                    page === currentPage ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {page}
                </Link>
              ))}

              <Link
                href={buildHref(Math.min(totalPages, currentPage + 1), selectedCategory)}
                className={`px-3 py-1 rounded border ${
                  currentPage === totalPages ? 'pointer-events-none opacity-50 bg-slate-100' : 'bg-white hover:bg-slate-50'
                }`}
              >
                {dict['next'] ?? 'Следваща'}
              </Link>
            </div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 py-10">
          <h2 className="text-2xl font-bold mb-5">{dict['catalog_download_title'] ?? 'Изтеглете Продуктови Каталози'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border rounded-lg p-5">
              <h3 className="font-semibold mb-2">{dict['thermostats']}</h3>
              <p className="text-sm text-slate-600">{dict['catalog_room'] ?? 'Каталог на стайни термостати'}</p>
            </div>
            <div className="bg-white border rounded-lg p-5">
              <h3 className="font-semibold mb-2">TRV</h3>
              <p className="text-sm text-slate-600">{dict['catalog_trv'] ?? 'Каталог на радиаторни вентили'}</p>
            </div>
            <div className="bg-white border rounded-lg p-5">
              <h3 className="font-semibold mb-2">{dict['actuators'] ?? 'Термични задвижки'}</h3>
              <p className="text-sm text-slate-600">{dict['catalog_actuators'] ?? 'Каталог на термични задвижки'}</p>
            </div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 py-10">
          <h2 className="text-2xl font-bold mb-5">{dict['why_choose_title'] ?? 'Защо Да Изберете Нас?'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {advantages.map((item) => (
              <article key={item.title} className="bg-white border rounded-lg p-5">
                <h3 className="font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-slate-600 leading-6">{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 py-10">
          <h2 className="text-2xl font-bold mb-5">{dict['factory_title'] ?? 'Нашата Фабрика'}</h2>
          <p className="text-slate-700 leading-7 mb-6">
            {dict['factory_text'] ?? 'Производствени линии, контрол на качеството и техническа експертиза за HVAC продукти.'}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <article className="bg-white border rounded-lg p-4">
              <div className="text-2xl font-bold text-slate-900">3</div>
              <div className="text-sm text-slate-600">{dict['factory_metric_sites'] ?? 'Фабрични площи'}</div>
            </article>
            <article className="bg-white border rounded-lg p-4">
              <div className="text-2xl font-bold text-slate-900">15+</div>
              <div className="text-sm text-slate-600">{dict['factory_metric_years'] ?? 'Години опит'}</div>
            </article>
            <article className="bg-white border rounded-lg p-4">
              <div className="text-2xl font-bold text-slate-900">400+</div>
              <div className="text-sm text-slate-600">{dict['factory_metric_models'] ?? 'Продуктови модели'}</div>
            </article>
            <article className="bg-white border rounded-lg p-4">
              <div className="text-2xl font-bold text-slate-900">12</div>
              <div className="text-sm text-slate-600">{dict['factory_metric_experts'] ?? 'Технически експерти'}</div>
            </article>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 py-10">
          <h2 className="text-2xl font-bold mb-5">{dict['certificates_title'] ?? 'Нашите сертификати'}</h2>
          <p className="text-slate-600 mb-5">{dict['certificates_subtitle'] ?? '(CE/RoHS сертификати)'}</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 8 }, (_, idx) => (
              <div key={idx} className="aspect-[4/3] rounded-lg border bg-white flex items-center justify-center text-xs text-slate-400">
                {dict['certificate_placeholder'] ?? 'Сертификат'} {idx + 1}
              </div>
            ))}
          </div>
        </section>
      </main>
      <Footer dict={dict} />
    </div>
  );
}
