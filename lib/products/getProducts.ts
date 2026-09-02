import productsBase from '../../data/products/products.json';
import contentEn from '../../data/products/content.en.json';
import contentBg from '../../data/products/content.bg.json';
import fs from 'node:fs';
import path from 'node:path';
import { Product, ProductBase, ProductContent } from './types';

const contentByLocale: Record<string, Record<string, Partial<ProductContent>>> = {
  en: contentEn,
  bg: contentBg
};

const productImagesRoot = path.join(process.cwd(), 'public', 'images', 'products');

function isImageFile(fileName: string): boolean {
  return ['.jpg', '.jpeg', '.png', '.webp', '.avif'].includes(path.extname(fileName).toLowerCase());
}

function compareNatural(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

function getProductImagesFromFs(productId: string): string[] {
  const dirPath = path.join(productImagesRoot, productId);
  if (!fs.existsSync(dirPath)) {
    return [];
  }

  return fs
    .readdirSync(dirPath, { withFileTypes: true })
    .filter((entry) => entry.isFile() && isImageFile(entry.name))
    .map((entry) => `/images/products/${productId}/${entry.name}`)
    .sort(compareNatural);
}

// English content is the source of truth; any field missing from the active
// locale's translation file silently falls back to English so untranslated
// products still render correctly.
export function getProducts(locale: string): Product[] {
  const overlay = contentByLocale[locale] ?? {};
  return (productsBase as ProductBase[]).map((base) => {
    const en = contentEn[base.id as keyof typeof contentEn];
    const localized = overlay[base.id];
    const diskImages = getProductImagesFromFs(base.id);
    const syncedImages = diskImages.length > 0 ? diskImages : [];
    const syncedPrimaryImage = syncedImages[0] ?? null;

    return {
      ...base,
      ...en,
      ...localized,
      image: syncedPrimaryImage,
      images: syncedImages
    } as Product;
  });
}

export function getProduct(locale: string, id: string): Product | undefined {
  return getProducts(locale).find((p) => p.id === id);
}

const CATEGORY_ORDER: string[] = [
  'room-thermostat',
  'gas-boiler-thermostat',
  'hub-controller',
  'thermal-actuator',
  'trv'
];

export function getCategories(): string[] {
  const unique = Array.from(new Set((productsBase as ProductBase[]).map((p) => p.category)));

  return unique.sort((a, b) => {
    const indexA = CATEGORY_ORDER.indexOf(a);
    const indexB = CATEGORY_ORDER.indexOf(b);

    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB;
    }

    if (indexA !== -1) {
      return -1;
    }

    if (indexB !== -1) {
      return 1;
    }

    return a.localeCompare(b, undefined, { sensitivity: 'base' });
  });
}
