import fs from 'fs/promises';
import path from 'path';
import { Pool } from 'pg';

export type DeliveryType = 'address' | 'easybox';

export type StoredCheckoutDelivery = {
  sessionId: string;
  fullName: string;
  phone: string;
  email: string;
  deliveryType: DeliveryType;
  addressLine1: string | null;
  city: string | null;
  postalCode: string | null;
  lockerId: string | null;
  createdAt: string;
  updatedAt: string;
};

const ordersDir = path.join(process.cwd(), 'data', 'orders');
const deliveryPath = path.join(ordersDir, 'checkout-delivery.json');
const databaseUrl = process.env.DATABASE_URL?.trim();
const shouldUseSsl = Boolean(databaseUrl) && !/(localhost|127\.0\.0\.1)/i.test(databaseUrl ?? '');
const pool = databaseUrl
  ? new Pool({
      connectionString: databaseUrl,
      ssl: shouldUseSsl ? { rejectUnauthorized: false } : undefined
    })
  : null;

let dbInitPromise: Promise<void> | null = null;

async function ensureDbInitialized(): Promise<void> {
  if (!pool) {
    return;
  }

  if (!dbInitPromise) {
    dbInitPromise = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS checkout_delivery (
          session_id TEXT PRIMARY KEY,
          full_name TEXT NOT NULL,
          phone TEXT NOT NULL,
          email TEXT NOT NULL,
          delivery_type TEXT NOT NULL CHECK (delivery_type IN ('address', 'easybox')),
          address_line1 TEXT,
          city TEXT,
          postal_code TEXT,
          locker_id TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
    })().catch((error) => {
      dbInitPromise = null;
      throw error;
    });
  }

  await dbInitPromise;
}

async function ensureDeliveryFile(): Promise<void> {
  await fs.mkdir(ordersDir, { recursive: true });

  try {
    await fs.access(deliveryPath);
  } catch {
    await fs.writeFile(deliveryPath, '[]\n', 'utf8');
  }
}

async function readDeliveryFromFile(): Promise<StoredCheckoutDelivery[]> {
  await ensureDeliveryFile();
  const raw = await fs.readFile(deliveryPath, 'utf8');
  const parsed = JSON.parse(raw) as StoredCheckoutDelivery[];
  return Array.isArray(parsed) ? parsed : [];
}

export async function saveCheckoutDelivery(record: Omit<StoredCheckoutDelivery, 'createdAt' | 'updatedAt'>): Promise<void> {
  const now = new Date().toISOString();

  if (pool) {
    await ensureDbInitialized();
    await pool.query(
      `
        INSERT INTO checkout_delivery (
          session_id,
          full_name,
          phone,
          email,
          delivery_type,
          address_line1,
          city,
          postal_code,
          locker_id,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
        ON CONFLICT (session_id) DO UPDATE SET
          full_name = EXCLUDED.full_name,
          phone = EXCLUDED.phone,
          email = EXCLUDED.email,
          delivery_type = EXCLUDED.delivery_type,
          address_line1 = EXCLUDED.address_line1,
          city = EXCLUDED.city,
          postal_code = EXCLUDED.postal_code,
          locker_id = EXCLUDED.locker_id,
          updated_at = NOW()
      `,
      [
        record.sessionId,
        record.fullName,
        record.phone,
        record.email,
        record.deliveryType,
        record.addressLine1,
        record.city,
        record.postalCode,
        record.lockerId
      ]
    );
    return;
  }

  const rows = await readDeliveryFromFile();
  const index = rows.findIndex((entry) => entry.sessionId === record.sessionId);
  const next: StoredCheckoutDelivery = {
    ...record,
    createdAt: index === -1 ? now : rows[index].createdAt,
    updatedAt: now
  };

  if (index === -1) {
    rows.push(next);
  } else {
    rows[index] = next;
  }

  await fs.writeFile(deliveryPath, `${JSON.stringify(rows, null, 2)}\n`, 'utf8');
}

export async function getCheckoutDeliveryBySessionId(sessionId: string): Promise<StoredCheckoutDelivery | null> {
  if (!sessionId.trim()) {
    return null;
  }

  if (pool) {
    await ensureDbInitialized();
    const result = await pool.query<{
      session_id: string;
      full_name: string;
      phone: string;
      email: string;
      delivery_type: DeliveryType;
      address_line1: string | null;
      city: string | null;
      postal_code: string | null;
      locker_id: string | null;
      created_at: Date | string;
      updated_at: Date | string;
    }>(
      `
        SELECT
          session_id,
          full_name,
          phone,
          email,
          delivery_type,
          address_line1,
          city,
          postal_code,
          locker_id,
          created_at,
          updated_at
        FROM checkout_delivery
        WHERE session_id = $1
        LIMIT 1
      `,
      [sessionId]
    );

    const row = result.rows[0];
    if (!row) {
      return null;
    }

    return {
      sessionId: row.session_id,
      fullName: row.full_name,
      phone: row.phone,
      email: row.email,
      deliveryType: row.delivery_type,
      addressLine1: row.address_line1,
      city: row.city,
      postalCode: row.postal_code,
      lockerId: row.locker_id,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString()
    };
  }

  const rows = await readDeliveryFromFile();
  return rows.find((entry) => entry.sessionId === sessionId) ?? null;
}
