import { ProductBase } from './products/types';
import type { ProductContent } from './products/types';
import type { EmagProductOverride } from './emag-overrides';
import {
  EmagCharacteristic,
  EmagFamily,
  EmagPriceUpdate,
  EmagProduct,
  EmagProductMeasurementPayload,
  EmagProductOfferPayload,
  EmagStockUpdate
} from '../types/emag';

const DEFAULT_SITE_URL = 'https://www.beoksmart.com';
const FALLBACK_EAN = '0000000000000';
const FALLBACK_BRAND = 'BEOK';
const MAX_EMAG_PRODUCT_ID = 16_777_215;
type EmagMappableProduct = ProductBase & Partial<ProductContent>;
type CharacteristicValueByApplication = Partial<Record<ProductBase['application'], string>>;
type CharacteristicConfigValue = string | CharacteristicValueByApplication;
type CharacteristicConfigById = Record<string, CharacteristicConfigValue>;
type CharacteristicsConfigByCategory = Record<string, CharacteristicConfigById>;
type FamilyConfig = {
  id?: number;
  name?: string;
  family_type_id?: number;
  color?: string;
};
type FamilyConfigMap = Record<string, FamilyConfig>;
type ResolvedFamilyConfig = {
  family?: EmagFamily;
  color?: string;
};

const DEFAULT_CATEGORY_CHARACTERISTICS: CharacteristicsConfigByCategory = {
  'room-thermostat': {
    '5704': 'Термостат',
    '8434': 'Вътрешна употреба',
    '7597': 'BEOK',
    '9645': {
      electric: 'Електрическо подово отопление',
      water: 'Водно подово отопление',
      'gas-boiler': 'Газов котел'
    }
  },
  'gas-boiler-thermostat': {
    '5704': 'Термостат',
    '8434': 'Вътрешна употреба',
    '7597': 'BEOK',
    '9645': {
      electric: 'Електрическо подово отопление',
      water: 'Водно подово отопление',
      'gas-boiler': 'Газов котел'
    }
  }
};

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

function toEmagProductId(localId: string): number {
  let hash = 2_166_136_261;

  for (let index = 0; index < localId.length; index += 1) {
    hash ^= localId.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }

  return (hash >>> 0) % MAX_EMAG_PRODUCT_ID + 1;
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

function getDefaultWarrantyMonths(): number | undefined {
  const raw = process.env.EMAG_WARRANTY_MONTHS?.trim();
  if (!raw) {
    return undefined;
  }

  const value = Number(raw);
  if (!Number.isFinite(value)) {
    return undefined;
  }

  return Math.max(0, Math.floor(value));
}

function getPriceFactor(envName: string, fallback: number): number {
  const raw = process.env[envName]?.trim();
  if (!raw) {
    return fallback;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

function getRecommendedPriceFactor(): number | undefined {
  const raw = process.env.EMAG_RECOMMENDED_PRICE_FACTOR?.trim();
  if (!raw) {
    return undefined;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 1) {
    return undefined;
  }

  return parsed;
}

function getColorCharacteristicId(): number | undefined {
  const raw = process.env.EMAG_COLOR_CHARACTERISTIC_ID?.trim();
  if (!raw) {
    return 5401;
  }

  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    return undefined;
  }

  return Math.floor(value);
}

function parseCharacteristicByApplication(value: unknown): CharacteristicValueByApplication | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }

  const source = value as Record<string, unknown>;
  const result: CharacteristicValueByApplication = {};
  for (const key of ['electric', 'water', 'gas-boiler'] as ProductBase['application'][]) {
    if (typeof source[key] === 'string' && source[key].trim()) {
      result[key] = source[key].trim();
    }
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

function parseCharacteristicValue(value: unknown): CharacteristicConfigValue | undefined {
  if (typeof value === 'string') {
    const normalized = value.trim();
    return normalized || undefined;
  }

  return parseCharacteristicByApplication(value);
}

function parseCategoryCharacteristicsConfig(raw: unknown): CharacteristicsConfigByCategory {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {};
  }

  const source = raw as Record<string, unknown>;
  const parsed: CharacteristicsConfigByCategory = {};

  for (const [categoryKey, value] of Object.entries(source)) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      continue;
    }

    const characteristics = value as Record<string, unknown>;
    const parsedById: CharacteristicConfigById = {};

    for (const [characteristicId, characteristicValue] of Object.entries(characteristics)) {
      const normalizedValue = parseCharacteristicValue(characteristicValue);
      if (normalizedValue !== undefined) {
        parsedById[characteristicId] = normalizedValue;
      }
    }

    if (Object.keys(parsedById).length > 0) {
      parsed[categoryKey] = parsedById;
    }
  }

  return parsed;
}

function parseFamilyConfig(value: unknown): FamilyConfig | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }

  const source = value as Record<string, unknown>;
  const id = Number(source.id);
  const familyTypeId = Number(source.family_type_id);
  const name = typeof source.name === 'string' ? source.name.trim() : '';
  const color = typeof source.color === 'string' ? source.color.trim() : '';

  const parsed: FamilyConfig = {
    ...(Number.isFinite(id) && id > 0 ? { id: Math.floor(id) } : {}),
    ...(name ? { name } : {}),
    ...(Number.isFinite(familyTypeId) && familyTypeId > 0 ? { family_type_id: Math.floor(familyTypeId) } : {}),
    ...(color ? { color } : {})
  };

  return Object.keys(parsed).length > 0 ? parsed : undefined;
}

function getFamilyConfigMap(): FamilyConfigMap {
  const raw = process.env.EMAG_FAMILY_MAP_JSON?.trim();
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }

    const source = parsed as Record<string, unknown>;
    const map: FamilyConfigMap = {};

    for (const [key, value] of Object.entries(source)) {
      const normalizedKey = key.trim().toLowerCase();
      if (!normalizedKey) {
        continue;
      }

      const parsedFamily = parseFamilyConfig(value);
      if (parsedFamily) {
        map[normalizedKey] = parsedFamily;
      }
    }

    return map;
  } catch {
    return {};
  }
}

function inferFamilyNameFromModel(model: string): string | undefined {
  const normalizedModel = model.trim().toUpperCase();
  if (!normalizedModel) {
    return undefined;
  }

  const match = normalizedModel.match(/^(.*)-(EP|WP|WPB|NR)$/);
  if (!match) {
    return undefined;
  }

  const familyName = match[1]?.trim();
  return familyName || undefined;
}

function inferColorFromModel(model: string): string | undefined {
  const normalized = model.trim().toUpperCase();
  if (!normalized) {
    return undefined;
  }

  if (/(^|-)R7B(-|$)|(^|-)TGM50B(-|$)|BLACK|ЧЕРЕН/.test(normalized)) {
    return 'Черен';
  }

  if (/(^|-)R7W(-|$)|(^|-)TGM50(-|$)|WHITE|БЯЛ/.test(normalized)) {
    return 'Бял';
  }

  return undefined;
}

function resolveFamilyConfig(product: EmagMappableProduct): ResolvedFamilyConfig {
  const map = getFamilyConfigMap();
  const productIdKey = product.id.trim().toLowerCase();
  const modelKey = product.model.trim().toLowerCase();
  const explicit = map[productIdKey] ?? map[modelKey];

  if (explicit) {
    const familyId = explicit.id ?? (explicit.name ? toEmagProductId(`family:${explicit.name}`) : undefined);
    const family = familyId
      ? {
          id: familyId,
          ...(explicit.name ? { name: explicit.name } : {}),
          ...(explicit.family_type_id ? { family_type_id: explicit.family_type_id } : {})
        }
      : undefined;

    return {
      ...(family ? { family } : {}),
      ...(explicit.color ? { color: explicit.color } : {})
    };
  }

  const autoEnabled = process.env.EMAG_ENABLE_AUTO_FAMILY === '1';
  if (!autoEnabled) {
    return {};
  }

  const inferredName = inferFamilyNameFromModel(product.model);
  if (!inferredName) {
    return {};
  }

  const rawFamilyTypeId = Number(process.env.EMAG_FAMILY_TYPE_ID ?? '1');
  const familyTypeId = Number.isFinite(rawFamilyTypeId) && rawFamilyTypeId > 0 ? Math.floor(rawFamilyTypeId) : 1;

  return {
    family: {
      id: toEmagProductId(`family:${inferredName}`),
      name: inferredName,
      family_type_id: familyTypeId
    },
    color: inferColorFromModel(product.model)
  };
}

function getCategoryCharacteristicsConfig(): CharacteristicsConfigByCategory {
  const raw = process.env.EMAG_CHARACTERISTICS_MAP_JSON?.trim();
  if (!raw) {
    return DEFAULT_CATEGORY_CHARACTERISTICS;
  }

  try {
    const parsed = JSON.parse(raw);
    const config = parseCategoryCharacteristicsConfig(parsed);
    return Object.keys(config).length > 0 ? config : DEFAULT_CATEGORY_CHARACTERISTICS;
  } catch {
    return DEFAULT_CATEGORY_CHARACTERISTICS;
  }
}

function getCharacteristicValue(
  value: CharacteristicConfigValue,
  application: ProductBase['application']
): string | undefined {
  if (typeof value === 'string') {
    return value;
  }

  const byApplication = value[application]?.trim();
  return byApplication || undefined;
}

function buildCharacteristics(product: EmagMappableProduct, color?: string): EmagCharacteristic[] {
  const configByCategory = getCategoryCharacteristicsConfig()[product.category];
  const mapped: EmagCharacteristic[] = [];

  if (configByCategory) {
    for (const [idRaw, valueRaw] of Object.entries(configByCategory)) {
      const id = Number(idRaw);
      if (!Number.isFinite(id) || id <= 0) {
        continue;
      }

      const value = getCharacteristicValue(valueRaw, product.application);
      if (!value) {
        continue;
      }

      mapped.push({
        id: Math.floor(id),
        value
      });
    }
  }

  const colorCharacteristicId = getColorCharacteristicId();
  const normalizedColor = color?.trim();
  const hasColorInMapping = Boolean(colorCharacteristicId && mapped.some((item) => item.id === colorCharacteristicId));
  if (colorCharacteristicId && normalizedColor && !hasColorInMapping) {
    mapped.push({
      id: colorCharacteristicId,
      value: normalizedColor
    });
  }

  mapped.sort((a, b) => a.id - b.id);
  return mapped;
}

function parseOptionalText(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized || undefined;
}

function asTextLines(values: string[] | undefined): string[] {
  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .map((value) => value.trim())
    .filter(Boolean);
}

function buildDescription(product: EmagMappableProduct, overrideDescription?: string): string {
  const customDescription = parseOptionalText(overrideDescription);
  if (customDescription) {
    return customDescription;
  }

  const description = parseOptionalText(product.description);
  if (description) {
    return description;
  }

  const keyFeatures = asTextLines(product.keyFeatures);
  const technicalData = asTextLines(product.technicalData);
  const localizedSections: string[] = [];

  if (keyFeatures.length) {
    localizedSections.push(`Key features:\n- ${keyFeatures.join('\n- ')}`);
  }

  if (technicalData.length) {
    localizedSections.push(`Technical data:\n- ${technicalData.join('\n- ')}`);
  }

  if (localizedSections.length) {
    return localizedSections.join('\n\n');
  }

  const base = `${product.model} ${product.category} thermostat by ${FALLBACK_BRAND}.`;
  const source = Array.isArray(product.sourceUrls) && product.sourceUrls[0] ? ` Source: ${product.sourceUrls[0]}` : '';
  return `${base}${source}`.trim();
}

function buildProductUrl(productId: string): string {
  return `${resolveSiteUrl()}/bg/products/${encodeURIComponent(productId)}`;
}

function getPlaceholderDimension(envName: string, fallback: number): number {
  const value = Number(process.env[envName] ?? `${fallback}`);
  return Number.isFinite(value) ? Math.max(1, value) : fallback;
}

export function mapProductToEmagProduct(
  product: EmagMappableProduct,
  options?: { override?: EmagProductOverride }
): EmagProduct {
  const warehouseId = getDefaultWarehouseId();
  const price = roundPrice(toFiniteNumber(product.finalPriceEur, 0));
  const minPriceFactor = getPriceFactor('EMAG_MIN_SALE_PRICE_FACTOR', 0.9);
  const maxPriceFactor = getPriceFactor('EMAG_MAX_SALE_PRICE_FACTOR', 1.1);
  const minSalePrice = roundPrice(Math.max(0.0001, price * minPriceFactor));
  const maxSalePrice = roundPrice(Math.max(minSalePrice + 0.0001, price * maxPriceFactor));
  const recommendedPriceFactor = getRecommendedPriceFactor();
  const recommendedPrice = recommendedPriceFactor
    ? roundPrice(Math.max(maxSalePrice + 0.0001, price * recommendedPriceFactor))
    : undefined;
  const override = options?.override;
  const stockValue = toStockValue(override?.stock ?? product.priceQty);
  const familyConfig = resolveFamilyConfig(product);
  const characteristics = buildCharacteristics(product, familyConfig.color);
  const warranty = getDefaultWarrantyMonths();
  const productEan = typeof override?.ean === 'string'
    ? override.ean.trim()
    : typeof product.ean === 'string'
      ? product.ean.trim()
      : '';

  return {
    id: toEmagProductId(product.id),
    name: product.model,
    category_id: mapCategory(product.category),
    part_number: product.model,
    url: buildProductUrl(product.id),
    source_language: process.env.EMAG_SOURCE_LANGUAGE?.trim() || 'bg_BG',
    description: buildDescription(product, override?.description),
    brand: override?.brand?.trim() || process.env.EMAG_BRAND?.trim() || FALLBACK_BRAND,
    ean: productEan || process.env.EMAG_DEFAULT_EAN?.trim() || FALLBACK_EAN,
    images: collectImages(product),
    status: 1,
    sale_price: price,
    min_sale_price: minSalePrice,
    max_sale_price: maxSalePrice,
    ...(recommendedPrice ? { recommended_price: recommendedPrice } : {}),
    currency_type: product.currency || 'EUR',
    stock: [
      {
        warehouse_id: warehouseId,
        value: stockValue
      }
    ],
    ...(familyConfig.family ? { family: familyConfig.family } : {}),
    ...(characteristics.length > 0 ? { characteristics } : {}),
    handling_time: [
      {
        warehouse_id: warehouseId,
        value: getDefaultHandlingTime()
      }
    ],
    ...(warranty !== undefined ? { warranty } : {}),
    vat_id: getDefaultVatId(),
    weight: toFiniteNumber(override?.weight, getPlaceholderDimension('EMAG_DEFAULT_WEIGHT_GRAMS', 500)),
    width: toFiniteNumber(override?.width, getPlaceholderDimension('EMAG_DEFAULT_WIDTH_MM', 100)),
    height: toFiniteNumber(override?.height, getPlaceholderDimension('EMAG_DEFAULT_HEIGHT_MM', 100)),
    length: toFiniteNumber(override?.length, getPlaceholderDimension('EMAG_DEFAULT_LENGTH_MM', 100))
  };
}

export function toProductOfferPayload(product: EmagProduct): EmagProductOfferPayload {
  return {
    id: product.id,
    name: product.name,
    category_id: product.category_id,
    part_number: product.part_number,
    url: product.url,
    source_language: product.source_language,
    description: product.description,
    brand: product.brand,
    ean: product.ean,
    images: product.images,
    status: product.status,
    sale_price: product.sale_price,
    min_sale_price: product.min_sale_price,
    max_sale_price: product.max_sale_price,
    recommended_price: product.recommended_price,
    currency_type: product.currency_type,
    stock: product.stock,
    family: product.family,
    characteristics: product.characteristics,
    handling_time: product.handling_time,
    warranty: product.warranty,
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
    id: toEmagProductId(product.id),
    value: toStockValue(product.priceQty)
  };
}

export function mapProductToPriceUpdate(product: ProductBase): EmagPriceUpdate {
  return {
    id: toEmagProductId(product.id),
    sale_price: roundPrice(toFiniteNumber(product.finalPriceEur, 0)),
    currency_type: product.currency || 'EUR'
  };
}
