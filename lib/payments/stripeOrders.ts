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

export type StoredStripeDelivery = {
  fullName: string;
  phone: string;
  email: string;
  deliveryType: 'address' | 'easybox';
  addressLine1: string | null;
  city: string | null;
  postalCode: string | null;
  lockerId: string | null;
};

export type StoredStripeAwb = {
  number: string;
  status: string;
  createdAt: string;
};

export type StoredStripeOrder = {
  sessionId: string;
  paymentIntentId: string | null;
  customerEmail: string | null;
  currency: string | null;
  amountTotal: number | null;
  locale: string;
  items: StoredStripeOrderItem[];
  delivery: StoredStripeDelivery | null;
  awb: StoredStripeAwb | null;
  paidAt: string;
  emailSentAt?: string | null;
};

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

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
          delivery_full_name TEXT,
          delivery_phone TEXT,
          delivery_email TEXT,
          delivery_type TEXT CHECK (delivery_type IN ('address', 'easybox')),
          delivery_address_line1 TEXT,
          delivery_city TEXT,
          delivery_postal_code TEXT,
          delivery_locker_id TEXT,
          awb_number TEXT,
          awb_status TEXT,
          awb_created_at TIMESTAMPTZ,
          paid_at TIMESTAMPTZ NOT NULL,
          email_sent_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);

      await pool.query(`ALTER TABLE stripe_orders ADD COLUMN IF NOT EXISTS delivery_full_name TEXT`);
      await pool.query(`ALTER TABLE stripe_orders ADD COLUMN IF NOT EXISTS delivery_phone TEXT`);
      await pool.query(`ALTER TABLE stripe_orders ADD COLUMN IF NOT EXISTS delivery_email TEXT`);
      await pool.query(`ALTER TABLE stripe_orders ADD COLUMN IF NOT EXISTS delivery_type TEXT`);
      await pool.query(`ALTER TABLE stripe_orders ADD COLUMN IF NOT EXISTS delivery_address_line1 TEXT`);
      await pool.query(`ALTER TABLE stripe_orders ADD COLUMN IF NOT EXISTS delivery_city TEXT`);
      await pool.query(`ALTER TABLE stripe_orders ADD COLUMN IF NOT EXISTS delivery_postal_code TEXT`);
      await pool.query(`ALTER TABLE stripe_orders ADD COLUMN IF NOT EXISTS delivery_locker_id TEXT`);
      await pool.query(`ALTER TABLE stripe_orders ADD COLUMN IF NOT EXISTS awb_number TEXT`);
      await pool.query(`ALTER TABLE stripe_orders ADD COLUMN IF NOT EXISTS awb_status TEXT`);
      await pool.query(`ALTER TABLE stripe_orders ADD COLUMN IF NOT EXISTS awb_created_at TIMESTAMPTZ`);

      await pool.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'chk_stripe_orders_amount_total_nonnegative'
          ) THEN
            ALTER TABLE stripe_orders
              ADD CONSTRAINT chk_stripe_orders_amount_total_nonnegative
              CHECK (amount_total IS NULL OR amount_total >= 0);
          END IF;
        END
        $$;
      `);

      await pool.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS uq_stripe_orders_awb_number
        ON stripe_orders(awb_number)
        WHERE awb_number IS NOT NULL
      `);

      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_stripe_orders_paid_at
        ON stripe_orders(paid_at DESC)
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS stripe_webhook_events (
          event_id TEXT PRIMARY KEY,
          event_type TEXT NOT NULL,
          session_id TEXT,
          received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          processed_at TIMESTAMPTZ,
          status TEXT NOT NULL DEFAULT 'received',
          error_message TEXT
        )
      `);

      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_session_id
        ON stripe_webhook_events(session_id)
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS order_status_history (
          id BIGSERIAL PRIMARY KEY,
          session_id TEXT NOT NULL REFERENCES stripe_orders(session_id) ON DELETE CASCADE,
          status TEXT NOT NULL,
          details JSONB,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);

      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_order_status_history_session_id
        ON order_status_history(session_id)
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS sameday_awb_attempts (
          id BIGSERIAL PRIMARY KEY,
          session_id TEXT NOT NULL REFERENCES stripe_orders(session_id) ON DELETE CASCADE,
          attempt_no INTEGER NOT NULL CHECK (attempt_no > 0),
          request_excerpt JSONB,
          response_excerpt JSONB,
          success BOOLEAN NOT NULL,
          error_code TEXT,
          error_message TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE(session_id, attempt_no)
        )
      `);

      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_sameday_awb_attempts_session_id
        ON sameday_awb_attempts(session_id)
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
                delivery_full_name,
                delivery_phone,
                delivery_email,
                delivery_type,
                delivery_address_line1,
                delivery_city,
                delivery_postal_code,
                delivery_locker_id,
                awb_number,
                awb_status,
                awb_created_at,
                paid_at,
                email_sent_at
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17::timestamptz, $18::timestamptz, $19::timestamptz)
              ON CONFLICT (session_id) DO NOTHING
            `,
            [
              order.sessionId,
              order.paymentIntentId,
              order.customerEmail,
              order.currency,
              order.amountTotal,
              order.locale,
              order.delivery?.fullName ?? null,
              order.delivery?.phone ?? null,
              order.delivery?.email ?? null,
              order.delivery?.deliveryType ?? null,
              order.delivery?.addressLine1 ?? null,
              order.delivery?.city ?? null,
              order.delivery?.postalCode ?? null,
              order.delivery?.lockerId ?? null,
              order.awb?.number ?? null,
              order.awb?.status ?? null,
              order.awb?.createdAt ?? null,
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

function toJsonOrNull(value: JsonValue | null | undefined): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  return JSON.stringify(value);
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
  const parsed = JSON.parse(raw) as Array<StoredStripeOrder & { delivery?: StoredStripeOrder['delivery']; awb?: StoredStripeOrder['awb'] }>;
  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed.map((entry) => ({
    ...entry,
    delivery: entry.delivery ?? null,
    awb: entry.awb ?? null
  }));
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
    delivery_full_name: string | null;
    delivery_phone: string | null;
    delivery_email: string | null;
    delivery_type: 'address' | 'easybox' | null;
    delivery_address_line1: string | null;
    delivery_city: string | null;
    delivery_postal_code: string | null;
    delivery_locker_id: string | null;
    awb_number: string | null;
    awb_status: string | null;
    awb_created_at: Date | string | null;
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
      o.delivery_full_name,
      o.delivery_phone,
      o.delivery_email,
      o.delivery_type,
      o.delivery_address_line1,
      o.delivery_city,
      o.delivery_postal_code,
      o.delivery_locker_id,
      o.awb_number,
      o.awb_status,
      o.awb_created_at,
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
        delivery: row.delivery_type
          ? {
              fullName: row.delivery_full_name ?? '',
              phone: row.delivery_phone ?? '',
              email: row.delivery_email ?? '',
              deliveryType: row.delivery_type,
              addressLine1: row.delivery_address_line1,
              city: row.delivery_city,
              postalCode: row.delivery_postal_code,
              lockerId: row.delivery_locker_id
            }
          : null,
        awb: row.awb_number
          ? {
              number: row.awb_number,
              status: row.awb_status ?? 'created',
              createdAt: row.awb_created_at ? new Date(row.awb_created_at).toISOString() : new Date().toISOString()
            }
          : null,
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
            delivery_full_name,
            delivery_phone,
            delivery_email,
            delivery_type,
            delivery_address_line1,
            delivery_city,
            delivery_postal_code,
            delivery_locker_id,
            awb_number,
            awb_status,
            awb_created_at,
            paid_at,
            email_sent_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17::timestamptz, $18::timestamptz, $19::timestamptz)
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
          order.delivery?.fullName ?? null,
          order.delivery?.phone ?? null,
          order.delivery?.email ?? null,
          order.delivery?.deliveryType ?? null,
          order.delivery?.addressLine1 ?? null,
          order.delivery?.city ?? null,
          order.delivery?.postalCode ?? null,
          order.delivery?.lockerId ?? null,
          order.awb?.number ?? null,
          order.awb?.status ?? null,
          order.awb?.createdAt ?? null,
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
      delivery_full_name: string | null;
      delivery_phone: string | null;
      delivery_email: string | null;
      delivery_type: 'address' | 'easybox' | null;
      delivery_address_line1: string | null;
      delivery_city: string | null;
      delivery_postal_code: string | null;
      delivery_locker_id: string | null;
      awb_number: string | null;
      awb_status: string | null;
      awb_created_at: Date | string | null;
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
          o.delivery_full_name,
          o.delivery_phone,
          o.delivery_email,
          o.delivery_type,
          o.delivery_address_line1,
          o.delivery_city,
          o.delivery_postal_code,
          o.delivery_locker_id,
          o.awb_number,
          o.awb_status,
          o.awb_created_at,
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
      delivery: first.delivery_type
        ? {
            fullName: first.delivery_full_name ?? '',
            phone: first.delivery_phone ?? '',
            email: first.delivery_email ?? '',
            deliveryType: first.delivery_type,
            addressLine1: first.delivery_address_line1,
            city: first.delivery_city,
            postalCode: first.delivery_postal_code,
            lockerId: first.delivery_locker_id
          }
        : null,
      awb: first.awb_number
        ? {
            number: first.awb_number,
            status: first.awb_status ?? 'created',
            createdAt: first.awb_created_at ? new Date(first.awb_created_at).toISOString() : new Date().toISOString()
          }
        : null,
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

export async function markStripeOrderAwb(
  sessionId: string,
  awb: { number: string; status: string; createdAt?: string }
): Promise<void> {
  const awbCreatedAt = awb.createdAt ?? new Date().toISOString();

  if (pool) {
    await ensureDbInitialized();
    await pool.query(
      `
        UPDATE stripe_orders
        SET awb_number = $2,
            awb_status = $3,
            awb_created_at = $4::timestamptz
        WHERE session_id = $1
      `,
      [sessionId, awb.number, awb.status, awbCreatedAt]
    );
    return;
  }

  const orders = await readStripeOrders();
  const index = orders.findIndex((entry) => entry.sessionId === sessionId);
  if (index === -1) {
    return;
  }

  orders[index] = {
    ...orders[index],
    awb: {
      number: awb.number,
      status: awb.status,
      createdAt: awbCreatedAt
    }
  };

  await fs.writeFile(stripeOrdersPath, `${JSON.stringify(orders, null, 2)}\n`, 'utf8');
}

export async function recordStripeWebhookEventReceived(eventId: string, eventType: string, sessionId: string | null): Promise<boolean> {
  if (!pool) {
    return true;
  }

  await ensureDbInitialized();
  const result = await pool.query<{ event_id: string }>(
    `
      INSERT INTO stripe_webhook_events (event_id, event_type, session_id, status)
      VALUES ($1, $2, $3, 'received')
      ON CONFLICT (event_id) DO NOTHING
      RETURNING event_id
    `,
    [eventId, eventType, sessionId]
  );

  return Boolean(result.rowCount);
}

export async function markStripeWebhookEventProcessed(eventId: string, status: 'processed' | 'ignored' = 'processed'): Promise<void> {
  if (!pool) {
    return;
  }

  await ensureDbInitialized();
  await pool.query(
    `
      UPDATE stripe_webhook_events
      SET status = $2,
          processed_at = NOW(),
          error_message = NULL
      WHERE event_id = $1
    `,
    [eventId, status]
  );
}

export async function attachStripeWebhookEventSession(eventId: string, sessionId: string): Promise<void> {
  if (!pool) {
    return;
  }

  await ensureDbInitialized();
  await pool.query(
    `
      UPDATE stripe_webhook_events
      SET session_id = COALESCE(session_id, $2)
      WHERE event_id = $1
    `,
    [eventId, sessionId]
  );
}

export async function markStripeWebhookEventFailed(eventId: string, message: string): Promise<void> {
  if (!pool) {
    return;
  }

  await ensureDbInitialized();
  await pool.query(
    `
      UPDATE stripe_webhook_events
      SET status = 'failed',
          processed_at = NOW(),
          error_message = $2
      WHERE event_id = $1
    `,
    [eventId, message.slice(0, 1000)]
  );
}

export async function appendOrderStatusHistory(sessionId: string, status: string, details?: JsonValue | null): Promise<void> {
  if (!pool) {
    return;
  }

  await ensureDbInitialized();
  await pool.query(
    `
      INSERT INTO order_status_history (session_id, status, details)
      VALUES ($1, $2, $3::jsonb)
    `,
    [sessionId, status, toJsonOrNull(details)]
  );
}

export async function appendSamedayAwbAttempt(input: {
  sessionId: string;
  attemptNo: number;
  requestExcerpt?: JsonValue | null;
  responseExcerpt?: JsonValue | null;
  success: boolean;
  errorCode?: string | null;
  errorMessage?: string | null;
}): Promise<void> {
  if (!pool) {
    return;
  }

  await ensureDbInitialized();
  await pool.query(
    `
      INSERT INTO sameday_awb_attempts (
        session_id,
        attempt_no,
        request_excerpt,
        response_excerpt,
        success,
        error_code,
        error_message
      )
      VALUES ($1, $2, $3::jsonb, $4::jsonb, $5, $6, $7)
      ON CONFLICT (session_id, attempt_no) DO UPDATE SET
        request_excerpt = EXCLUDED.request_excerpt,
        response_excerpt = EXCLUDED.response_excerpt,
        success = EXCLUDED.success,
        error_code = EXCLUDED.error_code,
        error_message = EXCLUDED.error_message
    `,
    [
      input.sessionId,
      Math.max(1, Math.floor(input.attemptNo)),
      toJsonOrNull(input.requestExcerpt ?? null),
      toJsonOrNull(input.responseExcerpt ?? null),
      input.success,
      input.errorCode ?? null,
      input.errorMessage?.slice(0, 1000) ?? null
    ]
  );
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
    delivery: null,
    awb: null,
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
