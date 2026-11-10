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
          firstImage: Array.isArray(offerPayload.images) && offerPayload.images.length > 0 ? offerPayload.images[0] : null
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
    const mappedProducts = selectedProducts.map((product) =>
      mapProductToEmagProduct(product, { override: getProductOverride(overrides, product) })
    );
    const batches = toArrayChunks(mappedProducts, 50);

    const syncReport: EmagSyncBatchResult[] = [];
    const debugFailurePreview: Array<{
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
    }> = [];
    let syncedProducts = 0;

    for (let i = 0; i < batches.length; i += 1) {
      const batch = batches[i];

      try {
        await client.postSave('/product_offer/save', batch.map(toProductOfferPayload));
        await client.postSave('/measurements/save', batch.map(toMeasurementPayload));
        syncedProducts += batch.length;

        syncReport.push({
          batch: i + 1,
          products: batch.length,
          status: 'ok'
        });
      } catch (error) {
        const firstProduct = batch[0];
        const offerPayload = toProductOfferPayload(firstProduct);
        const measurementPayload = toMeasurementPayload(firstProduct);
        debugFailurePreview.push({
          batch: i + 1,
          productId: selectedProducts[i * 50]?.id ?? firstProduct.id.toString(),
          model: selectedProducts[i * 50]?.model ?? firstProduct.name,
          diagnostics: {
            vat_id: offerPayload.vat_id,
            category_id: offerPayload.category_id,
            imageCount: Array.isArray(offerPayload.images) ? offerPayload.images.length : 0,
            firstImage: Array.isArray(offerPayload.images) && offerPayload.images.length > 0 ? offerPayload.images[0] : null
          },
          offerPayload,
          measurementPayload
        });

        syncReport.push({
          batch: i + 1,
          products: batch.length,
          status: 'failed',
          error: error instanceof Error ? error.message : 'unknown_error'
        });
      }
    }

    const failures = syncReport.filter((item) => item.status === 'failed');
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
