import fs from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';
import { isEmagAdminAuthorized, readJsonBody, unauthorizedResponse } from '../../../../lib/emag-admin';
import { getEmagClient } from '../../../../lib/emag-client';
import { mapProductToStockUpdate } from '../../../../lib/emag-product-mapper';
import { ProductBase } from '../../../../lib/products/types';

const productsPath = path.join(process.cwd(), 'data', 'products', 'products.json');

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

    const updates = selectedProducts.map(mapProductToStockUpdate);
    const client = getEmagClient();

    const report: Array<{ id: number; status: 'ok' | 'failed'; error?: string }> = [];
    let synced = 0;

    for (const update of updates) {
      try {
        await client.patch(`/offer_stock/${update.id}`, { value: update.value });
        synced += 1;
        report.push({ id: update.id, status: 'ok' });
      } catch (error) {
        report.push({
          id: update.id,
          status: 'failed',
          error: error instanceof Error ? error.message : 'update_stock_failed'
        });
      }
    }

    const failures = report.filter((item) => item.status === 'failed');

    return NextResponse.json({
      success: failures.length === 0,
      data: {
        totalProducts: selectedProducts.length,
        updatedOffers: synced,
        updates: updates.length,
        failures,
        report
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'update_stock_failed'
      },
      {
        status: 500
      }
    );
  }
}
