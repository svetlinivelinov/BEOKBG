import fs from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';
import { isEmagAdminAuthorized, readJsonBody, unauthorizedResponse } from '../../../../lib/emag-admin';
import { getEmagClient } from '../../../../lib/emag-client';
import { mapProductToEmagProduct, toMeasurementPayload, toProductOfferPayload } from '../../../../lib/emag-product-mapper';
import { ProductBase } from '../../../../lib/products/types';

const productsPath = path.join(process.cwd(), 'data', 'products', 'products.json');

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

export async function POST(request: Request) {
  if (!isEmagAdminAuthorized(request)) {
    return unauthorizedResponse();
  }

  const payload = (await readJsonBody(request)) as { ids?: string[] } | null;
  const selectedIds = new Set(Array.isArray(payload?.ids) ? payload.ids : []);

  try {
    const products = await readProducts();
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
  const mappedProducts = selectedProducts.map(mapProductToEmagProduct);
    const batches = toArrayChunks(mappedProducts, 50);

    const syncReport: Array<{ batch: number; products: number; status: 'ok' | 'failed'; error?: string }> = [];
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
        syncReport.push({
          batch: i + 1,
          products: batch.length,
          status: 'failed',
          error: error instanceof Error ? error.message : 'unknown_error'
        });
      }
    }

    const failures = syncReport.filter((item) => item.status === 'failed');

    return NextResponse.json({
      success: failures.length === 0,
      data: {
        totalProducts: selectedProducts.length,
        syncedProducts,
        batches: batches.length,
        failures,
        report: syncReport
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
