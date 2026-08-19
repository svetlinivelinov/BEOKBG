import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import { getDictionary } from '../../../../lib/i18n/getDictionary';
import Header from '../../../../components/Header';
import Footer from '../../../../components/Footer';
import CategoryGrid from '../../../../components/CategoryGrid';
import Container from '../../../../components/Container';
import ProductImageGallery from '../../../../components/ProductImageGallery';
import ProductStructuredData from '../../../../components/ProductStructuredData';
import ProductLeadActions from '../../../../components/ProductLeadActions';
import { getProducts } from '../../../../lib/products/getProducts';
import { formatCategoryLabel } from '../../../../lib/formatCategoryLabel';
import { formatEurPrice } from '../../../../lib/products/formatEurPrice';
import { locales } from '../../../../lib/i18n/config';

export function generateStaticParams() {
  return locales.flatMap((locale) =>
    getProducts(locale).map((p) => ({ locale, id: p.id }))
  );
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  const dict = await getDictionary(locale);
  const product = getProducts(locale).find((p) => p.id === decodeURIComponent(id));

  if (!product) {
    return {
      title: dict.not_found,
      robots: {
        index: false,
        follow: true
      }
    };
  }

  return {
    title: product.name,
    description: product.description,
    alternates: {
      canonical: `/${locale}/products/${product.id}`,
      languages: {
        bg: `/bg/products/${product.id}`,
        en: `/en/products/${product.id}`,
        'x-default': `/bg/products/${product.id}`
      }
    },
    openGraph: {
      title: `${product.name} | BEOKBG`,
      description: product.description,
      url: `/${locale}/products/${product.id}`
    }
  };
}

export default async function ProductDetailPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  const dict = await getDictionary(locale);
  const products = getProducts(locale);
  const product = products.find((p) => p.id === decodeURIComponent(id));

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header locale={locale} dict={dict} />
        <Container className="flex-1 max-w-2xl py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">{dict.not_found}</h1>
        </Container>
        <Footer locale={locale} dict={dict} />
      </div>
    );
  }

  const related = products.filter(
    (p) => p.category === product.category && p.id !== product.id
  ).slice(0, 4);

  const gallerySortKey = (src: string): number => {
    const dashMatch = src.match(/-(\d+)\.[a-zA-Z]+$/);
    if (dashMatch) {
      return Number.parseInt(dashMatch[1], 10);
    }

    const parenMatch = src.match(/\((\d+)\)\.[a-zA-Z]+$/);
    if (parenMatch) {
      return Number.parseInt(parenMatch[1], 10);
    }

    return Number.MAX_SAFE_INTEGER;
  };

  const uniqueGalleryImages = Array.from(
    new Set([...(product.image ? [product.image] : []), ...(product.images ?? [])].filter(Boolean))
  );
  const galleryImages = uniqueGalleryImages
    .sort((a, b) => {
      const orderA = gallerySortKey(a);
      const orderB = gallerySortKey(b);
      if (orderA !== orderB) {
        return orderA - orderB;
      }

      return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
    });
  const hasPrice = typeof product.finalPriceEur === 'number' && Number.isFinite(product.finalPriceEur);
  const priceDisplayValue = hasPrice ? Number(product.finalPriceEur) : null;
  const priceLabel = locale === 'bg' ? 'Цена (с ДДС)' : 'Price (incl. VAT)';

  return (
    <>
      <ProductStructuredData
        name={product.name}
        model={product.model}
        description={product.description}
        category={formatCategoryLabel(product.category, locale)}
        imageUrl={product.image ?? undefined}
        locale={locale}
        productId={product.id}
      />
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header locale={locale} dict={dict} />
        <Container className="pt-4 text-sm text-gray-500">
          <nav aria-label="Breadcrumb">
            <Link href={`/${locale}`} className="hover:text-brand-orange">{dict.home}</Link>
            {' / '}
            <Link href={`/${locale}/products`} className="hover:text-brand-orange">{dict.all_products}</Link>
            {' / '}
            <span aria-current="page">{product.name}</span>
          </nav>
        </Container>
        <Container className="flex-1 py-8 w-full">
          <div className="bg-white rounded-lg shadow p-6 flex flex-col md:flex-row gap-8">
            {galleryImages.length > 0 ? (
              <ProductImageGallery images={galleryImages} alt={product.name} />
            ) : (
              <div
                className="w-full md:w-72 h-72 rounded bg-gray-100 flex items-center justify-center text-gray-400 text-6xl font-semibold flex-shrink-0"
                aria-hidden="true"
              >
                {product.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-1">{product.name}</h1>
              <div className="text-sm text-gray-400 mb-4">{product.model}</div>
              {priceDisplayValue !== null && (
                <div className="mb-4 rounded border border-brand-orange/30 bg-orange-50 px-3 py-2 inline-block">
                  <div className="text-xs uppercase tracking-wide text-gray-500">{priceLabel}</div>
                  <div className="text-2xl font-bold text-brand-orange leading-tight">{formatEurPrice(priceDisplayValue, locale)}</div>
                </div>
              )}
              <div className="text-sm text-gray-500 mb-6">{dict.category}: {formatCategoryLabel(product.category, locale)}</div>

              <div className="rounded-lg border border-brand-orange/20 bg-orange-50 p-4 mb-6">
                <p className="text-sm text-gray-700 mb-3">{dict.product_actions_hint}</p>
                <ProductLeadActions
                  productId={product.id}
                  productName={product.name}
                  productModel={product.model}
                  locale={locale}
                  addToCartLabel={dict.add_to_cart}
                  downloadManualLabel={dict.download_manual}
                  quantityLabel={dict.quantity}
                  addedToCartLabel={dict.added_to_cart}
                  continueShoppingLabel={dict.continue_shopping}
                  goToCartLabel={dict.go_to_cart}
                  manualUrl={product.sourceUrls[0]}
                />
              </div>
            </div>
          </div>

          <div className="mt-8 bg-white rounded-lg shadow overflow-hidden">
            <h2 className="bg-brand-orange text-white font-bold px-4 py-3">{dict.product_description}</h2>
            <p className="text-gray-700 text-lg p-6">{product.description}</p>
          </div>

        {product.keyFeatures.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow overflow-hidden">
            <h2 className="bg-brand-orange text-white font-bold px-4 py-3">{dict.key_features}</h2>
            <ul className="p-6 space-y-2 list-disc list-inside text-gray-700">
              {product.keyFeatures.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
          </div>
        )}

        {product.technicalData.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow overflow-hidden">
            <h2 className="bg-brand-orange text-white font-bold px-4 py-3">{dict.technical_data}</h2>
            <ul className="p-6 space-y-2 list-disc list-inside text-gray-700">
              {product.technicalData.map((spec) => (
                <li key={spec}>{spec}</li>
              ))}
            </ul>
          </div>
        )}

        {product.sourceUrls.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow overflow-hidden">
            <h2 className="bg-brand-orange text-white font-bold px-4 py-3">{dict.documentation}</h2>
            <ul className="p-6 space-y-2 text-sm">
              {product.sourceUrls.map((url) => (
                <li key={url}>
                  <a href={url} target="_blank" rel="noopener noreferrer" className="text-brand-blue hover:text-brand-orange break-all">
                    {url}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

          {related.length > 0 && (
            <div className="mt-12">
              <h2 className="text-2xl font-bold mb-6">{dict.all_products}</h2>
              <CategoryGrid products={related} locale={locale} viewProductLabel={dict.view_product} />
            </div>
          )}
        </Container>
        <Footer locale={locale} dict={dict} />
      </div>
    </>
  );
}
