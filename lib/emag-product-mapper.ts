import { ProductBase } from './products/types';
import {
  EmagPriceUpdate,
  EmagProduct,
  EmagProductMeasurementPayload,
  EmagProductOfferPayload,
  EmagStockUpdate
} from '../types/emag';

const DEFAULT_SITE_URL = 'https://www.beoksmart.com';
const FALLBACK_EAN = '0000000000000';
const FALLBACK_BRAND = 'BEOK';

const defaultCategoryMap: Record<string, number> = {
  'room-thermostat': 0,
  'gas-boiler-thermostat': 0,
  trv: 0,
  'hub-controller': 0,
  'thermal-actuator': 0
};

function toFiniteNumber(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }

  return value;
}

function roundPrice(value: number): number {
  return Math.round(value * 10000) / 10000;
}

function toStockValue(value: unknown): number {
  const parsed = typeof value === 'number' && Number.isFinite(value) ? Math.floor(value) : 0;
  return Math.max(0, parsed);
}

function getCategoryMap(): Record<string, number> {
  const raw = process.env.EMAG_CATEGORY_MAP_JSON?.trim();
  if (!raw) {
    return defaultCategoryMap;
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const mapped: Record<string, number> = { ...defaultCategoryMap };

    for (const [key, value] of Object.entries(parsed)) {
      const numeric = Number(value);
      if (Number.isFinite(numeric)) {
        mapped[key] = Math.floor(numeric);
      }
    }

    return mapped;
  } catch {
    return defaultCategoryMap;
  }
}

function resolveSiteUrl(): string {
  const explicit = process.env.EMAG_PUBLIC_SITE_URL?.trim() || process.env.NEXT_PUBLIC_SITE_URL?.trim() || '';
  return explicit || DEFAULT_SITE_URL;
}

function toAbsoluteImageUrl(imagePath: string): string {
  if (!imagePath) {
    return '';
  }

  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }

  const normalized = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
  return `${resolveSiteUrl()}${normalized}`;
}

function collectImages(product: ProductBase): string[] {
  const merged = [
    ...(Array.isArray(product.images) ? product.images : []),
    product.image || ''
  ]
    .map((value) => value.trim())
    .filter(Boolean)
    .map(toAbsoluteImageUrl);

  return Array.from(new Set(merged));
}

function mapCategory(category: string): number {
  const categoryMap = getCategoryMap();
  const mapped = categoryMap[category];

  if (typeof mapped === 'number' && Number.isFinite(mapped)) {
    return mapped;
  }

  const fallback = Number(process.env.EMAG_CATEGORY_ID_DEFAULT ?? '0');
  return Number.isFinite(fallback) ? fallback : 0;
}

function getDefaultVatId(): number {
  const value = Number(process.env.EMAG_VAT_ID ?? '1');
  return Number.isFinite(value) ? Math.floor(value) : 1;
}

function getDefaultHandlingTime(): number {
  const value = Number(process.env.EMAG_HANDLING_TIME_DAYS ?? '0');
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

function getDefaultWarehouseId(): number {
  const value = Number(process.env.EMAG_WAREHOUSE_ID ?? '1');
  return Number.isFinite(value) ? Math.max(1, Math.floor(value)) : 1;
}

function buildDescription(product: ProductBase): string {
  const base = `${product.model} ${product.category} thermostat by ${FALLBACK_BRAND}.`;
  const source = Array.isArray(product.sourceUrls) && product.sourceUrls[0] ? ` Source: ${product.sourceUrls[0]}` : '';
  return `${base}${source}`.trim();
}

function getPlaceholderDimension(envName: string, fallback: number): number {
  const value = Number(process.env[envName] ?? `${fallback}`);
  return Number.isFinite(value) ? Math.max(1, value) : fallback;
}

export function mapProductToEmagProduct(product: ProductBase): EmagProduct {
  const warehouseId = getDefaultWarehouseId();
  const price = roundPrice(toFiniteNumber(product.finalPriceEur, 0));
  const stockValue = toStockValue(product.priceQty);
  const productEan = typeof product.ean === 'string' ? product.ean.trim() : '';

  return {
    id: product.id,
    name: product.model,
    category_id: mapCategory(product.category),
    part_number: product.model,
    source_language: process.env.EMAG_SOURCE_LANGUAGE?.trim() || 'bg_BG',
    description: buildDescription(product),
    brand: process.env.EMAG_BRAND?.trim() || FALLBACK_BRAND,
    ean: productEan || process.env.EMAG_DEFAULT_EAN?.trim() || FALLBACK_EAN,
    images: collectImages(product),
    status: 1,
    sale_price: price,
    currency_type: product.currency || 'EUR',
    stock: [
      {
        warehouse_id: warehouseId,
        value: stockValue
      }
    ],
    handling_time: [
      {
        warehouse_id: warehouseId,
        value: getDefaultHandlingTime()
      }
    ],
    vat_id: getDefaultVatId(),
    weight: getPlaceholderDimension('EMAG_DEFAULT_WEIGHT_GRAMS', 500),
    width: getPlaceholderDimension('EMAG_DEFAULT_WIDTH_MM', 100),
    height: getPlaceholderDimension('EMAG_DEFAULT_HEIGHT_MM', 100),
    length: getPlaceholderDimension('EMAG_DEFAULT_LENGTH_MM', 100)
  };
}

export function toProductOfferPayload(product: EmagProduct): EmagProductOfferPayload {
  return {
    id: product.id,
    name: product.name,
    category_id: product.category_id,
    part_number: product.part_number,
    source_language: product.source_language,
    description: product.description,
    brand: product.brand,
    ean: product.ean,
    images: product.images,
    status: product.status,
    sale_price: product.sale_price,
    currency_type: product.currency_type,
    stock: product.stock,
    handling_time: product.handling_time,
    vat_id: product.vat_id
  };
}

export function toMeasurementPayload(product: EmagProduct): EmagProductMeasurementPayload {
  return {
    id: product.id,
    weight: product.weight,
    width: product.width,
    height: product.height,
    length: product.length
  };
}

export function mapProductToStockUpdate(product: ProductBase): EmagStockUpdate {
  return {
    id: product.id,
    stock: [
      {
        warehouse_id: getDefaultWarehouseId(),
        value: toStockValue(product.priceQty)
      }
    ]
  };
}

export function mapProductToPriceUpdate(product: ProductBase): EmagPriceUpdate {
  return {
    id: product.id,
    sale_price: roundPrice(toFiniteNumber(product.finalPriceEur, 0)),
    currency_type: product.currency || 'EUR'
  };
}
