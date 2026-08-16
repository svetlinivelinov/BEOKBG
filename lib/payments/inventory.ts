import fs from 'fs/promises';
import path from 'path';
import { decrementStockQuantities } from '../db/stock';

type ProductInventoryRecord = {
  id: string;
  priceQty?: number | null;
};

const productsPath = path.join(process.cwd(), 'data', 'products', 'products.json');

export async function decrementInventory(items: Array<{ productId: string; quantity: number }>): Promise<Map<string, number> | null> {
  if (items.length === 0) {
    return new Map();
  }

  const decrementedInDb = await decrementStockQuantities(items);
  if (decrementedInDb !== null) {
    return decrementedInDb;
  }

  const raw = await fs.readFile(productsPath, 'utf8');
  const products = JSON.parse(raw) as ProductInventoryRecord[];
  const orderedById = new Map<string, number>();

  for (const item of items) {
    orderedById.set(item.productId, (orderedById.get(item.productId) ?? 0) + item.quantity);
  }

  const remainingById = new Map<string, number>();

  for (const product of products) {
    const soldQty = orderedById.get(product.id);
    if (!soldQty) {
      continue;
    }

    const currentQty = typeof product.priceQty === 'number' && Number.isFinite(product.priceQty)
      ? product.priceQty
      : null;

    if (currentQty === null) {
      continue;
    }

    product.priceQty = Math.max(0, currentQty - soldQty);
    remainingById.set(product.id, product.priceQty);
  }

  await fs.writeFile(productsPath, `${JSON.stringify(products, null, 2)}\n`, 'utf8');
  return remainingById;
}