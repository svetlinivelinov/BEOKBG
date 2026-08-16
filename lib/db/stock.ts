import fs from 'fs/promises';
import path from 'path';
import { Pool } from 'pg';

type ProductSeedRecord = {
  id: string;
  priceQty?: number | null;
};

const productsPath = path.join(process.cwd(), 'data', 'products', 'products.json');

const databaseUrl = process.env.DATABASE_URL?.trim();
const shouldUseSsl = Boolean(databaseUrl) && !/(localhost|127\.0\.0\.1)/i.test(databaseUrl ?? '');

const pool = databaseUrl
  ? new Pool({
      connectionString: databaseUrl,
      ssl: shouldUseSsl ? { rejectUnauthorized: false } : undefined
    })
  : null;

let initPromise: Promise<void> | null = null;

export function isPostgresStockEnabled(): boolean {
  return Boolean(pool);
}

async function readStockSeedRows(): Promise<Array<{ productId: string; quantity: number }>> {
  const raw = await fs.readFile(productsPath, 'utf8');
  const parsed = JSON.parse(raw) as ProductSeedRecord[];

  return parsed
    .filter((entry) => entry && typeof entry.id === 'string')
    .map((entry) => {
      const normalized = typeof entry.priceQty === 'number' && Number.isFinite(entry.priceQty)
        ? Math.max(0, Math.floor(entry.priceQty))
        : 0;

      return {
        productId: entry.id,
        quantity: normalized
      };
    });
}

async function ensureInitialized(): Promise<void> {
  if (!pool) {
    return;
  }

  if (!initPromise) {
    initPromise = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS product_stock (
          product_id TEXT PRIMARY KEY,
          quantity INTEGER NOT NULL CHECK (quantity >= 0),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);

      const seeds = await readStockSeedRows();
      if (seeds.length === 0) {
        return;
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        for (const seed of seeds) {
          await client.query(
            `
              INSERT INTO product_stock (product_id, quantity)
              VALUES ($1, $2)
              ON CONFLICT (product_id) DO NOTHING
            `,
            [seed.productId, seed.quantity]
          );
        }
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    })().catch((error) => {
      initPromise = null;
      throw error;
    });
  }

  await initPromise;
}

export async function getStockQuantities(productIds: string[]): Promise<Map<string, number> | null> {
  if (!pool || productIds.length === 0) {
    return null;
  }

  await ensureInitialized();

  const uniqueProductIds = Array.from(new Set(productIds));
  const result = await pool.query<{
    product_id: string;
    quantity: number;
  }>(
    `
      SELECT product_id, quantity
      FROM product_stock
      WHERE product_id = ANY($1::text[])
    `,
    [uniqueProductIds]
  );

  const quantities = new Map<string, number>();
  for (const row of result.rows) {
    quantities.set(row.product_id, Math.max(0, Math.floor(row.quantity)));
  }

  return quantities;
}

export async function decrementStockQuantities(items: Array<{ productId: string; quantity: number }>): Promise<Map<string, number> | null> {
  if (!pool || items.length === 0) {
    return null;
  }

  await ensureInitialized();

  const grouped = new Map<string, number>();
  for (const item of items) {
    if (!item.productId || !Number.isFinite(item.quantity) || item.quantity < 1) {
      continue;
    }

    grouped.set(item.productId, (grouped.get(item.productId) ?? 0) + Math.floor(item.quantity));
  }

  if (grouped.size === 0) {
    return new Map();
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const remainingByProductId = new Map<string, number>();

    for (const [productId, soldQty] of grouped) {
      const result = await client.query<{ quantity: number }>(
        `
          UPDATE product_stock
          SET quantity = GREATEST(0, quantity - $2),
              updated_at = NOW()
          WHERE product_id = $1
          RETURNING quantity
        `,
        [productId, soldQty]
      );

      if (result.rowCount && result.rows[0]) {
        remainingByProductId.set(productId, Math.max(0, Math.floor(result.rows[0].quantity)));
      }
    }

    await client.query('COMMIT');
    return remainingByProductId;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}