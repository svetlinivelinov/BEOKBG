import fs from 'fs/promises';
import path from 'path';
import Stripe from 'stripe';
import { decrementInventory } from './inventory';

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

function resolveStripeSecretKey(): string | null {
  const candidates = [
    process.env.STRIPE_SECRET_KEY,
    process.env.STRIPE_API_KEY,
    process.env.STRIPE_SECRET,
    process.env.NEXT_PUBLIC_STRIPE_SECRET_KEY
  ];

  for (const candidate of candidates) {
    const key = candidate?.trim();
    if (key) {
      return key;
    }
  }

  return null;
}

function getStripeClient(): Stripe | null {
  const key = resolveStripeSecretKey();
  if (!key) {
    return null;
  }

  return new Stripe(key);
}

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

export async function syncOrderFromCheckoutSession(sessionId: string, localeHint?: string): Promise<StoredStripeOrder | null> {
  const stripe = getStripeClient();
  if (!stripe) {
    return null;
  }

  const existingOrders = await readStripeOrders();
  const existing = existingOrders.find((entry) => entry.sessionId === sessionId);
  if (existing) {
    return existing;
  }

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items.data.price.product']
    });
  } catch {
    return null;
  }

  if (session.payment_status !== 'paid' || session.status !== 'complete') {
    return null;
  }

  const lineItems = session.line_items && 'data' in session.line_items ? session.line_items.data : [];
  const normalizedItems: StoredStripeOrderItem[] = [];

  for (const line of lineItems) {
    const quantity = line.quantity ?? 0;
    if (!Number.isFinite(quantity) || quantity < 1) {
      continue;
    }

    const productData = line.price?.product;
    if (!productData || typeof productData === 'string') {
      continue;
    }

    if ('deleted' in productData && productData.deleted) {
      continue;
    }

    const productId = productData.metadata?.productId?.trim();
    const model = productData.metadata?.model?.trim() || line.description || 'unknown-model';
    if (!productId) {
      continue;
    }

    normalizedItems.push({
      productId,
      model,
      quantity: Math.floor(quantity)
    });
  }

  const order: StoredStripeOrder = {
    sessionId: session.id,
    paymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : null,
    customerEmail: session.customer_details?.email ?? session.customer_email ?? null,
    currency: session.currency ?? null,
    amountTotal: session.amount_total ?? null,
    locale: localeHint?.trim() || session.metadata?.locale?.trim() || 'en',
    items: normalizedItems,
    paidAt: new Date().toISOString()
  };

  const appended = await appendStripeOrder(order);
  if (!appended) {
    const refreshed = await readStripeOrders();
    return refreshed.find((entry) => entry.sessionId === sessionId) ?? order;
  }

  if (normalizedItems.length > 0) {
    await decrementInventory(normalizedItems.map((item) => ({ productId: item.productId, quantity: item.quantity })));
  }

  try {
    const { sendOrderConfirmationEmail } = await import('./sendOrderConfirmationEmail');
    await sendOrderConfirmationEmail(order);
  } catch (error) {
    console.error('[order_confirmation_email_failed]', error);
  }

  return order;
}
