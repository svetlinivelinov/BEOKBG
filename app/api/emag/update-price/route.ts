import fs from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';
import { isEmagAdminAuthorized, readJsonBody, unauthorizedResponse } from '../../../../lib/emag-admin';
import { getEmagClient } from '../../../../lib/emag-client';
import { mapProductToPriceUpdate } from '../../../../lib/emag-product-mapper';
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

    const updates = selectedProducts.map(mapProductToPriceUpdate);
    const batches = toArrayChunks(updates, 50);
    const client = getEmagClient();

    const report: Array<{ batch: number; updates: number; status: 'ok' | 'failed'; error?: string }> = [];
    let synced = 0;

    for (let i = 0; i < batches.length; i += 1) {
      const batch = batches[i];

      try {
        await client.postSave(
          '/offer/save',
          batch.map((item) => ({
            id: item.id,
            sale_price: item.sale_price,
            currency_type: item.currency_type
          }))
        );

        synced += batch.length;
        report.push({ batch: i + 1, updates: batch.length, status: 'ok' });
      } catch (error) {
        report.push({
          batch: i + 1,
          updates: batch.length,
          status: 'failed',
          error: error instanceof Error ? error.message : 'update_price_failed'
        });
      }
    }

    const failures = report.filter((item) => item.status === 'failed');

    return NextResponse.json({
      success: failures.length === 0,
      data: {
        totalProducts: selectedProducts.length,
        updatedOffers: synced,
        batches: batches.length,
        failures,
        report
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'update_price_failed'
      },
      {
        status: 500
      }
    );
  }
}
