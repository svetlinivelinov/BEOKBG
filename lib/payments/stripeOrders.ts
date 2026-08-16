import fs from 'fs/promises';
import path from 'path';
import { Pool } from 'pg';
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
  emailSentAt?: string | null;
};

const ordersDir = path.join(process.cwd(), 'data', 'orders');
const stripeOrdersPath = path.join(ordersDir, 'stripe-orders.json');
const databaseUrl = process.env.DATABASE_URL?.trim();
const shouldUseSsl = Boolean(databaseUrl) && !/(localhost|127\.0\.0\.1)/i.test(databaseUrl ?? '');
const pool = databaseUrl
  ? new Pool({
      connectionString: databaseUrl,
      ssl: shouldUseSsl ? { rejectUnauthorized: false } : undefined
    })
  : null;

let dbInitPromise: Promise<void> | null = null;

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

async function ensureDbInitialized(): Promise<void> {
  if (!pool) {
    return;
  }

  if (!dbInitPromise) {
    dbInitPromise = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS stripe_orders (
          session_id TEXT PRIMARY KEY,
          payment_intent_id TEXT,
          customer_email TEXT,
          currency TEXT,
          amount_total BIGINT,
          locale TEXT NOT NULL,
          paid_at TIMESTAMPTZ NOT NULL,
          email_sent_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS stripe_order_items (
          session_id TEXT NOT NULL REFERENCES stripe_orders(session_id) ON DELETE CASCADE,
          product_id TEXT NOT NULL,
          model TEXT NOT NULL,
          quantity INTEGER NOT NULL CHECK (quantity > 0),
          PRIMARY KEY (session_id, product_id, model)
        )
      `);

      const existingCountResult = await pool.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM stripe_orders');
      const existingCount = Number.parseInt(existingCountResult.rows[0]?.count ?? '0', 10);
      if (existingCount > 0) {
        return;
      }

      const fileOrders = await readStripeOrdersFromFile();
      if (fileOrders.length === 0) {
        return;
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        for (const order of fileOrders) {
          await client.query(
            `
              INSERT INTO stripe_orders (
                session_id,
                payment_intent_id,
                customer_email,
                currency,
                amount_total,
                locale,
                paid_at,
                email_sent_at
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7::timestamptz, $8::timestamptz)
              ON CONFLICT (session_id) DO NOTHING
            `,
            [
              order.sessionId,
              order.paymentIntentId,
              order.customerEmail,
              order.currency,
              order.amountTotal,
              order.locale,
              order.paidAt,
              order.emailSentAt ?? null
            ]
          );

          for (const item of order.items) {
            await client.query(
              `
                INSERT INTO stripe_order_items (session_id, product_id, model, quantity)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (session_id, product_id, model) DO NOTHING
              `,
              [order.sessionId, item.productId, item.model, item.quantity]
            );
          }
        }

        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    })().catch((error) => {
      dbInitPromise = null;
      throw error;
    });
  }

  await dbInitPromise;
}

export async function ensureStripeOrdersFile(): Promise<void> {
  await fs.mkdir(ordersDir, { recursive: true });

  try {
    await fs.access(stripeOrdersPath);
  } catch {
    await fs.writeFile(stripeOrdersPath, '[]\n', 'utf8');
  }
}

async function readStripeOrdersFromFile(): Promise<StoredStripeOrder[]> {
  await ensureStripeOrdersFile();
  const raw = await fs.readFile(stripeOrdersPath, 'utf8');
  const parsed = JSON.parse(raw) as StoredStripeOrder[];
  return Array.isArray(parsed) ? parsed : [];
}

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  const numeric = typeof value === 'string' ? Number.parseInt(value, 10) : Number(value);
  if (!Number.isFinite(numeric)) {
    return null;
  }

  return Math.floor(numeric);
}

async function readStripeOrdersFromDb(): Promise<StoredStripeOrder[]> {
  if (!pool) {
    return [];
  }

  await ensureDbInitialized();

  const result = await pool.query<{
    session_id: string;
    payment_intent_id: string | null;
    customer_email: string | null;
    currency: string | null;
    amount_total: string | number | null;
    locale: string;
    paid_at: Date | string;
    email_sent_at: Date | string | null;
    product_id: string | null;
    model: string | null;
    quantity: number | null;
  }>(`
    SELECT
      o.session_id,
      o.payment_intent_id,
      o.customer_email,
      o.currency,
      o.amount_total,
      o.locale,
      o.paid_at,
      o.email_sent_at,
      i.product_id,
      i.model,
      i.quantity
    FROM stripe_orders o
    LEFT JOIN stripe_order_items i ON i.session_id = o.session_id
    ORDER BY o.paid_at DESC, o.created_at DESC
  `);

  const ordersBySessionId = new Map<string, StoredStripeOrder>();
  const orderSequence: string[] = [];

  for (const row of result.rows) {
    if (!ordersBySessionId.has(row.session_id)) {
      orderSequence.push(row.session_id);
      ordersBySessionId.set(row.session_id, {
        sessionId: row.session_id,
        paymentIntentId: row.payment_intent_id,
        customerEmail: row.customer_email,
        currency: row.currency,
        amountTotal: toNullableNumber(row.amount_total),
        locale: row.locale,
        items: [],
        paidAt: new Date(row.paid_at).toISOString(),
        emailSentAt: row.email_sent_at ? new Date(row.email_sent_at).toISOString() : null
      });
    }

    const order = ordersBySessionId.get(row.session_id);
    if (!order || !row.product_id || !row.model || !row.quantity) {
      continue;
    }

    order.items.push({
      productId: row.product_id,
      model: row.model,
      quantity: Math.max(1, Math.floor(row.quantity))
    });
  }

  return orderSequence.map((sessionId) => ordersBySessionId.get(sessionId)).filter((entry): entry is StoredStripeOrder => Boolean(entry));
}

export async function readStripeOrders(): Promise<StoredStripeOrder[]> {
  if (pool) {
    return readStripeOrdersFromDb();
  }

  return readStripeOrdersFromFile();
}

export async function appendStripeOrder(order: StoredStripeOrder): Promise<boolean> {
  if (pool) {
    await ensureDbInitialized();

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const inserted = await client.query<{ session_id: string }>(
        `
          INSERT INTO stripe_orders (
            session_id,
            payment_intent_id,
            customer_email,
            currency,
            amount_total,
            locale,
            paid_at,
            email_sent_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7::timestamptz, $8::timestamptz)
          ON CONFLICT (session_id) DO NOTHING
          RETURNING session_id
        `,
        [
          order.sessionId,
          order.paymentIntentId,
          order.customerEmail,
          order.currency,
          order.amountTotal,
          order.locale,
          order.paidAt,
          order.emailSentAt ?? null
        ]
      );

      if (!inserted.rowCount) {
        await client.query('ROLLBACK');
        return false;
      }

      for (const item of order.items) {
        await client.query(
          `
            INSERT INTO stripe_order_items (session_id, product_id, model, quantity)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (session_id, product_id, model) DO NOTHING
          `,
          [order.sessionId, item.productId, item.model, item.quantity]
        );
      }

      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  const orders = await readStripeOrders();
  if (orders.some((existing) => existing.sessionId === order.sessionId)) {
    return false;
  }

  orders.push(order);
  await fs.writeFile(stripeOrdersPath, `${JSON.stringify(orders, null, 2)}\n`, 'utf8');
  return true;
}

export async function getStripeOrderBySessionId(sessionId: string): Promise<StoredStripeOrder | null> {
  if (pool) {
    await ensureDbInitialized();

    const result = await pool.query<{
      session_id: string;
      payment_intent_id: string | null;
      customer_email: string | null;
      currency: string | null;
      amount_total: string | number | null;
      locale: string;
      paid_at: Date | string;
      email_sent_at: Date | string | null;
      product_id: string | null;
      model: string | null;
      quantity: number | null;
    }>(
      `
        SELECT
          o.session_id,
          o.payment_intent_id,
          o.customer_email,
          o.currency,
          o.amount_total,
          o.locale,
          o.paid_at,
          o.email_sent_at,
          i.product_id,
          i.model,
          i.quantity
        FROM stripe_orders o
        LEFT JOIN stripe_order_items i ON i.session_id = o.session_id
        WHERE o.session_id = $1
      `,
      [sessionId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const first = result.rows[0];
    const order: StoredStripeOrder = {
      sessionId: first.session_id,
      paymentIntentId: first.payment_intent_id,
      customerEmail: first.customer_email,
      currency: first.currency,
      amountTotal: toNullableNumber(first.amount_total),
      locale: first.locale,
      items: [],
      paidAt: new Date(first.paid_at).toISOString(),
      emailSentAt: first.email_sent_at ? new Date(first.email_sent_at).toISOString() : null
    };

    for (const row of result.rows) {
      if (!row.product_id || !row.model || !row.quantity) {
        continue;
      }

      order.items.push({
        productId: row.product_id,
        model: row.model,
        quantity: Math.max(1, Math.floor(row.quantity))
      });
    }

    return order;
  }

  const orders = await readStripeOrders();
  return orders.find((entry) => entry.sessionId === sessionId) ?? null;
}

export async function markStripeOrderEmailSent(sessionId: string): Promise<void> {
  if (pool) {
    await ensureDbInitialized();
    await pool.query(
      `
        UPDATE stripe_orders
        SET email_sent_at = COALESCE(email_sent_at, NOW())
        WHERE session_id = $1
      `,
      [sessionId]
    );
    return;
  }

  const orders = await readStripeOrders();
  const index = orders.findIndex((entry) => entry.sessionId === sessionId);
  if (index === -1) {
    return;
  }

  const order = orders[index];
  if (order.emailSentAt) {
    return;
  }

  orders[index] = {
    ...order,
    emailSentAt: new Date().toISOString()
  };

  await fs.writeFile(stripeOrdersPath, `${JSON.stringify(orders, null, 2)}\n`, 'utf8');
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
    paidAt: new Date().toISOString(),
    emailSentAt: null
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
    const sent = await sendOrderConfirmationEmail(order);
    if (sent) {
      await markStripeOrderEmailSent(order.sessionId);
    }
  } catch (error) {
    console.error('[order_confirmation_email_failed]', error);
  }

  return order;
}
