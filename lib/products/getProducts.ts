import productsBase from '../../data/products/products.json';
import contentEn from '../../data/products/content.en.json';
import contentBg from '../../data/products/content.bg.json';
import { Product, ProductBase, ProductContent } from './types';

const contentByLocale: Record<string, Record<string, Partial<ProductContent>>> = {
  en: contentEn,
  bg: contentBg
};

// English content is the source of truth; any field missing from the active
// locale's translation file silently falls back to English so untranslated
// products still render correctly.
export function getProducts(locale: string): Product[] {
  const overlay = contentByLocale[locale] ?? {};
  return (productsBase as ProductBase[]).map((base) => {
    const en = contentEn[base.id as keyof typeof contentEn];
    const localized = overlay[base.id];
    return { ...base, ...en, ...localized } as Product;
  });
}

export function getProduct(locale: string, id: string): Product | undefined {
  return getProducts(locale).find((p) => p.id === id);
}

export function getCategories(): string[] {
  return Array.from(new Set((productsBase as ProductBase[]).map((p) => p.category))).sort();
}
