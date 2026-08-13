import fs from 'fs/promises';
import path from 'path';

export type StoredStripeOrderItem = {
  productId: string;
  model: string;
  quantity: number;
};

export type StoredStripeOrder = {
  sessionId: string;
  paymentIntentId: string | null;
  customerEmail: string | null;
  currency: string | null;
  amountTotal: number | null;
  locale: string;
  items: StoredStripeOrderItem[];
  paidAt: string;
};

const ordersDir = path.join(process.cwd(), 'data', 'orders');
const stripeOrdersPath = path.join(ordersDir, 'stripe-orders.json');

export async function ensureStripeOrdersFile(): Promise<void> {
  await fs.mkdir(ordersDir, { recursive: true });

  try {
    await fs.access(stripeOrdersPath);
  } catch {
    await fs.writeFile(stripeOrdersPath, '[]\n', 'utf8');
  }
}

export async function readStripeOrders(): Promise<StoredStripeOrder[]> {
  await ensureStripeOrdersFile();
  const raw = await fs.readFile(stripeOrdersPath, 'utf8');
  const parsed = JSON.parse(raw) as StoredStripeOrder[];
  return Array.isArray(parsed) ? parsed : [];
}

export async function appendStripeOrder(order: StoredStripeOrder): Promise<boolean> {
  const orders = await readStripeOrders();
  if (orders.some((existing) => existing.sessionId === order.sessionId)) {
    return false;
  }

  orders.push(order);
  await fs.writeFile(stripeOrdersPath, `${JSON.stringify(orders, null, 2)}\n`, 'utf8');
  return true;
}
