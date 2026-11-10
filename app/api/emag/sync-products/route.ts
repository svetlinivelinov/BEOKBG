import fs from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';
import { isEmagAdminAuthorized, readJsonBody, unauthorizedResponse } from '../../../../lib/emag-admin';
import { getEmagClient } from '../../../../lib/emag-client';
import { loadEmagOverrides } from '../../../../lib/emag-overrides';
import type { EmagOverrideIndex } from '../../../../lib/emag-overrides';
import { appendEmagSyncRun } from '../../../../lib/emag-storage';
import { mapProductToEmagProduct, toMeasurementPayload, toProductOfferPayload } from '../../../../lib/emag-product-mapper';
import { ProductBase, ProductContent } from '../../../../lib/products/types';
import type { EmagSyncBatchResult } from '../../../../types/emag';

const productsPath = path.join(process.cwd(), 'data', 'products', 'products.json');
const contentBgPath = path.join(process.cwd(), 'data', 'products', 'content.bg.json');
const contentEnPath = path.join(process.cwd(), 'data', 'products', 'content.en.json');

type ProductForEmag = ProductBase & Partial<ProductContent>;
type ProductContentById = Record<string, Partial<ProductContent>>;

function toArrayChunks<T>(items: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }
  return chunks;
}

async function readProducts(): Promise<ProductBase[]> {
  const raw = await fs.readFile(productsPath, 'utf8');
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? (parsed as ProductBase[]) : [];
}

async function readProductContent(filePath: string): Promise<ProductContentById> {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as ProductContentById) : {};
  } catch (error) {
    console.warn(
      `Unable to read eMAG content file: ${filePath}`,
      error instanceof Error ? error.message : 'unknown_error'
    );
    return {};
  }
}

async function readProductsForEmagSync(): Promise<ProductForEmag[]> {
  const [products, contentBg, contentEn] = await Promise.all([
    readProducts(),
    readProductContent(contentBgPath),
    readProductContent(contentEnPath)
  ]);

  return products.map((product) => {
    const fallbackContent = contentEn[product.id] ?? {};
    const bgContent = contentBg[product.id] ?? {};

    return {
      ...product,
      ...fallbackContent,
      ...bgContent
    };
  });
}

function getProductOverride(overrides: EmagOverrideIndex, product: ProductBase) {
  const idKey = product.id.trim().toLowerCase();
  const modelKey = product.model.trim().toLowerCase();

  return overrides[idKey] ?? overrides[modelKey];
}

type SyncEntry = {
  local: ProductForEmag;
  mapped: ReturnType<typeof mapProductToEmagProduct>;
};

type DebugFailurePreview = {
  batch: number;
  productId: string;
  model: string;
  diagnostics: {
    vat_id: number;
    category_id: number;
    imageCount: number;
    firstImage: string | null;
  };
  offerPayload: ReturnType<typeof toProductOfferPayload>;
  measurementPayload: ReturnType<typeof toMeasurementPayload>;
};

function toDebugPreview(batch: number, entry: SyncEntry): DebugFailurePreview {
  const offerPayload = toProductOfferPayload(entry.mapped);

  return {
    batch,
    productId: entry.local.id,
    model: entry.local.model,
    diagnostics: {
      vat_id: offerPayload.vat_id,
      category_id: offerPayload.category_id,
      imageCount: Array.isArray(offerPayload.images) ? offerPayload.images.length : 0,
      firstImage: Array.isArray(offerPayload.images) && offerPayload.images.length > 0 ? offerPayload.images[0].url : null
    },
    offerPayload,
    measurementPayload: toMeasurementPayload(entry.mapped)
  };
}

// eMAG reports errors as "ERROR: <text> - Product id: <id> | WARNING: ..." in one message. Warnings do not
// reject a product, so only ERROR parts are collected, grouped by the eMAG product id they name.
function parseRejectedProducts(message: string): Map<number, string[]> {
  const rejected = new Map<number, string[]>();

  for (const part of message.split(' | ')) {
    if (!part.includes('ERROR:')) {
      continue;
    }

    const idMatch = part.match(/Product id:\s*(\d+)\s*$/);
    if (!idMatch) {
      continue;
    }

    const text = part
      .replace(/^eMAG API error for [^:]+:\s*/, '')
      .replace(/^ERROR:\s*/, '')
      .replace(/\s*-\s*Product id:\s*\d+\s*$/, '')
      .trim();
    const id = Number(idMatch[1]);
    rejected.set(id, [...(rejected.get(id) ?? []), text]);
  }

  return rejected;
}

function findProductByIdOrModel(products: ProductForEmag[], query: string): ProductForEmag | null {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  return products.find((product) =>
    product.id.trim().toLowerCase() === normalized ||
    product.model.trim().toLowerCase() === normalized
  ) ?? null;
}

export async function GET(request: Request) {
  if (!isEmagAdminAuthorized(request)) {
    return unauthorizedResponse();
  }

  const url = new URL(request.url);
  const productQuery = url.searchParams.get('id') ?? url.searchParams.get('model') ?? '';

  if (!productQuery.trim()) {
    return NextResponse.json(
      {
        success: false,
        error: 'missing_product_identifier'
      },
      {
        status: 400
      }
    );
  }

  try {
    const [products, overrides] = await Promise.all([readProductsForEmagSync(), loadEmagOverrides()]);
    const selected = findProductByIdOrModel(products, productQuery);

    if (!selected) {
      return NextResponse.json(
        {
          success: false,
          error: 'product_not_found'
        },
        {
          status: 404
        }
      );
    }

    const override = getProductOverride(overrides, selected);
    const mapped = mapProductToEmagProduct(selected, { override });
    const offerPayload = toProductOfferPayload(mapped);
    const measurementPayload = toMeasurementPayload(mapped);

    return NextResponse.json({
      success: true,
      data: {
        productId: selected.id,
        model: selected.model,
        override: override ?? null,
        diagnostics: {
          vat_id: offerPayload.vat_id,
          category_id: offerPayload.category_id,
          imageCount: Array.isArray(offerPayload.images) ? offerPayload.images.length : 0,
          firstImage: Array.isArray(offerPayload.images) && offerPayload.images.length > 0 ? offerPayload.images[0].url : null,
          manufacturerCount: offerPayload.manufacturer?.length ?? 0,
          euRepresentativeCount: offerPayload.eu_representative?.length ?? 0
        },
        offerPayload,
        measurementPayload
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'preview_failed'
      },
      {
        status: 500
      }
    );
  }
}

export async function POST(request: Request) {
  if (!isEmagAdminAuthorized(request)) {
    return unauthorizedResponse();
  }

  const payload = (await readJsonBody(request)) as { ids?: string[] } | null;
  const selectedIds = new Set(Array.isArray(payload?.ids) ? payload.ids : []);
  const startedAt = new Date().toISOString();

  try {
    const [products, overrides] = await Promise.all([readProductsForEmagSync(), loadEmagOverrides()]);
    const selectedProducts = selectedIds.size > 0
      ? products.filter((product) => selectedIds.has(product.id))
      : products;

    if (selectedProducts.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          totalProducts: 0,
          syncedProducts: 0,
          batches: 0,
          failures: []
        }
      });
    }

    const client = getEmagClient();
    const entries: SyncEntry[] = selectedProducts.map((product) => ({
      local: product,
      mapped: mapProductToEmagProduct(product, { override: getProductOverride(overrides, product) })
    }));
    const batches = toArrayChunks(entries, 50);

    const syncReport: EmagSyncBatchResult[] = [];
    const debugFailurePreview: DebugFailurePreview[] = [];
    let syncedProducts = 0;

    for (let i = 0; i < batches.length; i += 1) {
      const batch = batches[i];
      const batchNumber = i + 1;
      let rejected = new Map<number, string[]>();
      let batchError: string | undefined;

      try {
        await client.postSave('/product_offer/save', batch.map((entry) => toProductOfferPayload(entry.mapped)));
      } catch (error) {
        batchError = error instanceof Error ? error.message : 'unknown_error';
        rejected = parseRejectedProducts(batchError);
      }

      // eMAG still saves the valid offers of a batch when some are rejected, so only an error without
      // identifiable rejected products counts as a completely failed batch.
      if (batchError && rejected.size === 0) {
        debugFailurePreview.push(toDebugPreview(batchNumber, batch[0]));
        syncReport.push({ batch: batchNumber, products: batch.length, status: 'failed', error: batchError });
        continue;
      }

      const accepted = batch.filter((entry) => !rejected.has(entry.mapped.id));
      const rejectedEntries = batch.filter((entry) => rejected.has(entry.mapped.id));
      let measurementError: string | undefined;

      if (accepted.length > 0) {
        try {
          await client.postSave('/measurements/save', accepted.map((entry) => toMeasurementPayload(entry.mapped)));
        } catch (error) {
          measurementError = error instanceof Error ? error.message : 'measurements_failed';
        }
      }

      for (const entry of rejectedEntries.slice(0, 3)) {
        debugFailurePreview.push(toDebugPreview(batchNumber, entry));
      }

      syncedProducts += accepted.length;
      syncReport.push({
        batch: batchNumber,
        products: batch.length,
        status: rejectedEntries.length === 0 && !measurementError ? 'ok' : accepted.length > 0 ? 'partial' : 'failed',
        savedProducts: accepted.length,
        ...(rejectedEntries.length > 0
          ? {
              rejectedProducts: rejectedEntries.map((entry) => ({
                id: entry.mapped.id,
                productId: entry.local.id,
                errors: rejected.get(entry.mapped.id) ?? []
              }))
            }
          : {}),
        ...(measurementError ? { measurementError } : {})
      });
    }

    const failures = syncReport.filter((item) => item.status !== 'ok');
    const completedAt = new Date().toISOString();
    const syncRun = await appendEmagSyncRun({
      startedAt,
      completedAt,
      requestedIds: Array.from(selectedIds),
      totalProducts: selectedProducts.length,
      syncedProducts,
      batches: batches.length,
      success: failures.length === 0,
      failures,
      report: syncReport
    });

    return NextResponse.json({
      success: failures.length === 0,
      data: {
        syncRunId: syncRun.id,
        startedAt,
        completedAt,
        totalProducts: selectedProducts.length,
        syncedProducts,
        batches: batches.length,
        failures,
        report: syncReport,
        debugFailurePreview: debugFailurePreview.slice(0, 3)
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'sync_failed'
      },
      {
        status: 500
      }
    );
  }
}
