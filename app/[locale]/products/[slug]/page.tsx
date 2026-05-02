import Image from 'next/image';
import Link from 'next/link';
import { getDictionary } from '@/lib/i18n/getDictionary';
import Footer from '@/components/Footer';
import products from '@/extracted/products-extracted.json';
import { localizeProducts } from '@/lib/products/localizeProducts';

export default async function ProductDetailPage({ params }: { params: { locale: string; slug: string } }) {
  const dict = await getDictionary(params.locale);
  const localizedProducts = localizeProducts(products, params.locale);
  const product = localizedProducts.find((p) => p.slug === params.slug) ?? null;

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <main className="flex-1 max-w-2xl mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">{dict["not_found"]}</h1>
          <Link href={`/${params.locale}/products`} className="text-blue-700 hover:underline">
            {dict['back_to_products'] ?? 'Обратно към продукти'}
          </Link>
        </main>
        <Footer dict={dict} />
      </div>
    );
  }

  const imageSrc = product.image ?? '';
  const isValidSrc = imageSrc.startsWith('/') || imageSrc.startsWith('http://') || imageSrc.startsWith('https://');
  const relatedProducts = localizedProducts
    .filter((p) => p.category === product.category && p.title !== product.title)
    .slice(0, 3);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <main className="flex-1">
        <section className="bg-gradient-to-r from-slate-900 to-slate-700 text-white">
          <div className="max-w-7xl mx-auto px-4 py-8">
            <p className="text-sm text-slate-200 mb-2">
              {dict['home'] ?? 'Начало'} / {dict['products'] ?? 'Продукти'} / {product.title}
            </p>
            <h1 className="text-3xl md:text-4xl font-bold">{product.title}</h1>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-8">
          <div className="bg-white border rounded-xl p-6">
            <div className="relative w-full h-[360px] bg-slate-100 rounded-lg overflow-hidden">
              {isValidSrc ? (
                <Image src={imageSrc} alt={product.title} fill className="object-contain" sizes="(max-width: 1024px) 100vw, 50vw" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm px-4 text-center">
                  {dict['image_placeholder'] ?? 'Изображението ще бъде налично скоро'}
                </div>
              )}
            </div>
          </div>

          <article className="bg-white border rounded-xl p-6">
            <h2 className="text-2xl font-semibold mb-3">{product.title}</h2>
            <p className="text-slate-700 leading-7 mb-5">{product.description}</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              <div className="rounded-lg bg-slate-50 border p-3 text-sm">
                <div className="text-slate-500 mb-1">{dict['category'] ?? 'Категория'}</div>
                <div className="font-medium text-slate-800">{product.category}</div>
              </div>
              <div className="rounded-lg bg-slate-50 border p-3 text-sm">
                <div className="text-slate-500 mb-1">{dict['model'] ?? 'Модел'}</div>
                <div className="font-medium text-slate-800">{product.title}</div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <a
                href={product.url}
                className="inline-block px-5 py-2 bg-blue-700 text-white rounded hover:bg-blue-800 transition"
                target="_blank"
                rel="noopener noreferrer"
              >
                {dict['view_on_source'] ?? 'Виж в BEOK Controls'}
              </a>
              <Link
                href={`/${params.locale}/products`}
                className="inline-block px-5 py-2 border border-slate-300 text-slate-700 rounded hover:bg-slate-100 transition"
              >
                {dict['back_to_products'] ?? 'Обратно към продукти'}
              </Link>
            </div>
          </article>
        </section>

        <section className="max-w-7xl mx-auto px-4 py-4">
          <h3 className="text-xl font-semibold mb-4">{dict['key_features'] ?? 'Ключови предимства'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border rounded-lg p-4">
              <h4 className="font-semibold mb-2">{dict['feature_precision_title'] ?? 'Прецизен контрол'}</h4>
              <p className="text-sm text-slate-600">{dict['feature_precision_text'] ?? 'Стабилно управление на температурата и надеждна работа.'}</p>
            </div>
            <div className="bg-white border rounded-lg p-4">
              <h4 className="font-semibold mb-2">{dict['feature_install_title'] ?? 'Лесен монтаж'}</h4>
              <p className="text-sm text-slate-600">{dict['feature_install_text'] ?? 'Подходящ за стандартни HVAC инсталации.'}</p>
            </div>
            <div className="bg-white border rounded-lg p-4">
              <h4 className="font-semibold mb-2">{dict['feature_support_title'] ?? 'Техническа поддръжка'}</h4>
              <p className="text-sm text-slate-600">{dict['feature_support_text'] ?? 'Съдействие при избор, интеграция и експлоатация.'}</p>
            </div>
          </div>
        </section>

        {relatedProducts.length > 0 && (
          <section className="max-w-7xl mx-auto px-4 py-10">
            <h3 className="text-xl font-semibold mb-4">{dict['related_products'] ?? 'Свързани продукти'}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {relatedProducts.map((item) => {
                return (
                  <Link key={item.slug} href={`/${params.locale}/products/${item.slug}`} className="bg-white border rounded-lg p-4 hover:shadow-sm transition">
                    <div className="font-medium text-slate-900">{item.title}</div>
                    <div className="text-sm text-slate-600 mt-1">{item.description}</div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </main>
      <Footer dict={dict} />
    </div>
  );
}
