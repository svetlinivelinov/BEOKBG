import fs from 'fs/promises';
import path from 'path';

export type EmagProductOverride = {
  id?: string;
  model?: string;
  brand?: string;
  ean?: string;
  stock?: number;
  description?: string;
  weight?: number;
  width?: number;
  height?: number;
  length?: number;
};

export type EmagOverrideIndex = Record<string, EmagProductOverride>;

type RawOverridesFile = {
  products?: unknown;
};

function parseNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().replace(',', '.');
    if (!normalized) {
      return undefined;
    }

    const parsed = Number(normalized);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
}

function parseText(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim();
  return normalized || undefined;
}

function parseOverride(input: unknown): EmagProductOverride | null {
  if (!input || typeof input !== 'object') {
    return null;
  }

  const source = input as Record<string, unknown>;
  const id = parseText(source.id);
  const model = parseText(source.model);

  if (!id && !model) {
    return null;
  }

  const stock = parseNumber(source.stock);
  const weight = parseNumber(source.weight);
  const width = parseNumber(source.width);
  const height = parseNumber(source.height);
  const length = parseNumber(source.length);

  return {
    id,
    model,
    brand: parseText(source.brand),
    ean: parseText(source.ean),
    stock: stock !== undefined ? Math.max(0, Math.floor(stock)) : undefined,
    description: parseText(source.description),
    weight: weight !== undefined ? Math.max(1, weight) : undefined,
    width: width !== undefined ? Math.max(1, width) : undefined,
    height: height !== undefined ? Math.max(1, height) : undefined,
    length: length !== undefined ? Math.max(1, length) : undefined
  };
}

function addToIndex(index: EmagOverrideIndex, key: string | undefined, override: EmagProductOverride): void {
  if (!key) {
    return;
  }

  index[key.trim().toLowerCase()] = override;
}

function toOverrideArray(products: unknown): EmagProductOverride[] {
  if (Array.isArray(products)) {
    return products
      .map(parseOverride)
      .filter((item): item is EmagProductOverride => Boolean(item));
  }

  if (products && typeof products === 'object') {
    const entries = Object.entries(products as Record<string, unknown>);
    return entries
      .map(([id, value]) => {
        if (!value || typeof value !== 'object') {
          return null;
        }

        const base = value as Record<string, unknown>;
        return parseOverride({
          id,
          ...base
        });
      })
      .filter((item): item is EmagProductOverride => Boolean(item));
  }

  return [];
}

export async function loadEmagOverrides(): Promise<EmagOverrideIndex> {
  const configuredPath = process.env.EMAG_OVERRIDES_PATH?.trim();
  const filePath = configuredPath
    ? path.resolve(/*turbopackIgnore: true*/ process.cwd(), configuredPath)
    : path.join(process.cwd(), 'data', 'products', 'emag.overrides.json');

  try {
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw) as RawOverridesFile;
    const overrides = toOverrideArray(parsed.products);

    const index: EmagOverrideIndex = {};

    for (const override of overrides) {
      addToIndex(index, override.id, override);
      addToIndex(index, override.model, override);
    }

    return index;
  } catch {
    return {};
  }
}
