import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { EmagOrder, EmagWebhookEvent } from '../types/emag';

const storageDir = path.join(process.cwd(), 'data', 'emag');
const ordersPath = path.join(storageDir, 'orders.json');
const webhookEventsPath = path.join(storageDir, 'webhook-events.json');

type StoredEmagOrder = EmagOrder & {
  storedAt: string;
};

async function ensureStorageDir(): Promise<void> {
  await fs.mkdir(storageDir, { recursive: true });
}

async function readJsonArray<T>(filePath: string): Promise<T[]> {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    const data = JSON.parse(raw);
    return Array.isArray(data) ? (data as T[]) : [];
  } catch {
    return [];
  }
}

async function writeJsonArray<T>(filePath: string, data: T[]): Promise<void> {
  await ensureStorageDir();
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

export async function upsertEmagOrders(orders: EmagOrder[]): Promise<{ inserted: number; updated: number; total: number }> {
  const existing = await readJsonArray<StoredEmagOrder>(ordersPath);
  const byId = new Map<number, StoredEmagOrder>(existing.map((order) => [order.id, order]));

  let inserted = 0;
  let updated = 0;

  for (const order of orders) {
    const alreadyStored = byId.get(order.id);
    const next: StoredEmagOrder = {
      ...alreadyStored,
      ...order,
      storedAt: new Date().toISOString()
    };

    if (alreadyStored) {
      updated += 1;
    } else {
      inserted += 1;
    }

    byId.set(order.id, next);
  }

  const merged = Array.from(byId.values()).sort((a, b) => {
    const aDate = new Date(a.modified || a.date || a.storedAt).getTime();
    const bDate = new Date(b.modified || b.date || b.storedAt).getTime();
    return bDate - aDate;
  });

  await writeJsonArray(ordersPath, merged);

  return {
    inserted,
    updated,
    total: merged.length
  };
}

export async function readStoredEmagOrders(limit = 100): Promise<StoredEmagOrder[]> {
  const orders = await readJsonArray<StoredEmagOrder>(ordersPath);
  return orders.slice(0, Math.max(1, limit));
}

export async function appendWebhookEvent(input: {
  sourceIp: string;
  eventType: string;
  payload: unknown;
  maxItems?: number;
}): Promise<EmagWebhookEvent> {
  const events = await readJsonArray<EmagWebhookEvent>(webhookEventsPath);
  const maxItems = Math.max(50, input.maxItems ?? 500);

  const nextEvent: EmagWebhookEvent = {
    id: randomUUID(),
    receivedAt: new Date().toISOString(),
    sourceIp: input.sourceIp,
    eventType: input.eventType,
    payload: input.payload
  };

  const merged = [nextEvent, ...events].slice(0, maxItems);
  await writeJsonArray(webhookEventsPath, merged);

  return nextEvent;
}
