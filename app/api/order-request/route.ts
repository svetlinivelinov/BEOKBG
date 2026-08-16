import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';

type OrderRequestItem = {
  id: string;
  name: string;
  model: string;
  quantity: number;
};

type OrderRequestPayload = {
  locale: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  customerNote?: string;
  items: OrderRequestItem[];
};

type ProductInventoryRecord = {
  id: string;
  model: string;
  priceQty?: number | null;
};

type LowStockAlert = {
  id: string;
  model: string;
  remainingQty: number;
  reorderSuggestedQty: number;
};

type InventoryUpdateResult = {
  lowStockAlerts: LowStockAlert[];
  reorderMailto: string | null;
};

const LOW_STOCK_THRESHOLD = 5;
const REORDER_TARGET_QTY = 20;
const productsPath = path.join(process.cwd(), 'data', 'products', 'products.json');

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function resolveOrderRequestRecipient(): string | null {
  const candidates = [
    process.env.ORDER_REQUEST_NOTIFICATION_EMAIL,
    process.env.ORDER_NOTIFICATION_EMAIL,
    process.env.FACTORY_ORDER_EMAIL
  ];

  for (const candidate of candidates) {
    const value = candidate?.trim();
    if (value && isValidEmail(value)) {
      return value;
    }
  }

  return null;
}

function buildOrderRequestHtml(
  payload: OrderRequestPayload,
  requestId: string,
  submittedAt: string,
  inventory: InventoryUpdateResult | null
): string {
  const itemRows = payload.items
    .map((item) => `<li>${item.model} x ${item.quantity}</li>`)
    .join('');

  const lowStockRows = inventory?.lowStockAlerts?.length
    ? `<p><strong>Low stock alerts:</strong></p><ul>${inventory.lowStockAlerts
        .map((alert) => `<li>${alert.model}: remaining ${alert.remainingQty}, suggested reorder ${alert.reorderSuggestedQty}</li>`)
        .join('')}</ul>`
    : '<p><strong>Low stock alerts:</strong> none</p>';

  const note = payload.customerNote ? payload.customerNote : '-';
  const phone = payload.customerPhone ? payload.customerPhone : '-';

  return [
    '<div style="font-family:Arial,sans-serif;line-height:1.5;color:#111">',
    '<h2>New order request</h2>',
    `<p><strong>Request ID:</strong> ${requestId}</p>`,
    `<p><strong>Submitted at:</strong> ${submittedAt}</p>`,
    `<p><strong>Locale:</strong> ${payload.locale}</p>`,
    `<p><strong>Customer name:</strong> ${payload.customerName}</p>`,
    `<p><strong>Customer email:</strong> ${payload.customerEmail}</p>`,
    `<p><strong>Customer phone:</strong> ${phone}</p>`,
    `<p><strong>Customer note:</strong> ${note}</p>`,
    '<p><strong>Items:</strong></p>',
    `<ul>${itemRows}</ul>`,
    lowStockRows,
    '</div>'
  ].join('');
}

async function sendOrderRequestEmail(
  payload: OrderRequestPayload,
  requestId: string,
  submittedAt: string,
  inventory: InventoryUpdateResult | null
): Promise<boolean> {
  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  const emailFrom = process.env.ORDER_EMAIL_FROM?.trim();
  const recipient = resolveOrderRequestRecipient();

  if (!resendApiKey || !emailFrom || !recipient) {
    console.warn('[order_request_email_skipped]', {
      hasResendApiKey: Boolean(resendApiKey),
      hasOrderEmailFrom: Boolean(emailFrom),
      hasRecipient: Boolean(recipient),
      requestId
    });
    return false;
  }

  const subject = payload.locale === 'bg'
    ? `Нова заявка за поръчка (${requestId.slice(0, 8)})`
    : `New order request (${requestId.slice(0, 8)})`;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: emailFrom,
      to: [recipient],
      reply_to: payload.customerEmail,
      subject,
      html: buildOrderRequestHtml(payload, requestId, submittedAt, inventory)
    })
  });

  if (!response.ok) {
    const responseBody = await response.text().catch(() => '');
    throw new Error(`order_request_email_failed:${response.status}:${responseBody.slice(0, 500)}`);
  }

  return true;
}

function asSafeText(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().slice(0, maxLength);
}

function parsePayload(input: unknown): OrderRequestPayload | null {
  if (!input || typeof input !== 'object') {
    return null;
  }

  const data = input as Record<string, unknown>;
  const locale = asSafeText(data.locale, 8);
  const customerName = asSafeText(data.customerName, 120);
  const customerEmail = asSafeText(data.customerEmail, 160);
  const customerPhone = asSafeText(data.customerPhone, 64);
  const customerNote = asSafeText(data.customerNote, 2000);

  const rawItems = Array.isArray(data.items) ? data.items : [];
  const items: OrderRequestItem[] = rawItems
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null;
      }

      const entry = item as Record<string, unknown>;
      const id = asSafeText(entry.id, 80);
      const name = asSafeText(entry.name, 240);
      const model = asSafeText(entry.model, 120);
      const quantity = Number(entry.quantity);

      if (!id || !name || !model || !Number.isFinite(quantity) || quantity < 1 || quantity > 999) {
        return null;
      }

      return {
        id,
        name,
        model,
        quantity: Math.floor(quantity)
      };
    })
    .filter((item): item is OrderRequestItem => Boolean(item));

  const emailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail);

  if (!locale || !customerName || !emailLooksValid || items.length === 0) {
    return null;
  }

  return {
    locale,
    customerName,
    customerEmail,
    customerPhone,
    customerNote,
    items
  };
}

function buildReorderMailto(alerts: LowStockAlert[]): string | null {
  const factoryEmail = process.env.FACTORY_ORDER_EMAIL?.trim();
  if (!factoryEmail || alerts.length === 0) {
    return null;
  }

  const subject = 'Factory reorder request';
  const lines = [
    'Please prepare a new order for the following low-stock models:',
    '',
    ...alerts.map((alert) => `${alert.model} | remaining: ${alert.remainingQty} | suggested reorder: ${alert.reorderSuggestedQty}`)
  ];

  return `mailto:${encodeURIComponent(factoryEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`;
}

async function updateInventoryAfterOrder(items: OrderRequestItem[]): Promise<InventoryUpdateResult> {
  const raw = await fs.readFile(productsPath, 'utf8');
  const products = JSON.parse(raw) as ProductInventoryRecord[];

  const orderedById = new Map<string, number>();
  for (const item of items) {
    orderedById.set(item.id, (orderedById.get(item.id) ?? 0) + item.quantity);
  }

  const lowStockAlerts: LowStockAlert[] = [];

  for (const product of products) {
    const soldQty = orderedById.get(product.id);
    if (!soldQty) {
      continue;
    }

    const currentQty = typeof product.priceQty === 'number' && Number.isFinite(product.priceQty) ? product.priceQty : null;
    if (currentQty === null) {
      continue;
    }

    const remaining = Math.max(0, currentQty - soldQty);
    product.priceQty = remaining;

    if (remaining <= LOW_STOCK_THRESHOLD) {
      lowStockAlerts.push({
        id: product.id,
        model: product.model,
        remainingQty: remaining,
        reorderSuggestedQty: Math.max(REORDER_TARGET_QTY - remaining, 0)
      });
    }
  }

  await fs.writeFile(productsPath, `${JSON.stringify(products, null, 2)}\n`, 'utf8');

  return {
    lowStockAlerts,
    reorderMailto: buildReorderMailto(lowStockAlerts)
  };
}

export async function POST(request: Request) {
  let rawBody: unknown;

  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const payload = parsePayload(rawBody);
  if (!payload) {
    return NextResponse.json({ ok: false, error: 'invalid_payload' }, { status: 400 });
  }

  const requestId = randomUUID();
  const submittedAt = new Date().toISOString();

  // Keep structured log for ops/audit.
  console.info('[order_request]', JSON.stringify({
    requestId,
    submittedAt,
    ...payload
  }));

  let inventory: InventoryUpdateResult | null = null;
  try {
    inventory = await updateInventoryAfterOrder(payload.items);
  } catch (error) {
    console.error('[inventory_update_failed]', error);
  }

  try {
    const sent = await sendOrderRequestEmail(payload, requestId, submittedAt, inventory);
    if (!sent) {
      return NextResponse.json({ ok: false, error: 'order_request_not_configured' }, { status: 503 });
    }
  } catch (error) {
    console.error('[order_request_email_failed]', {
      requestId,
      error
    });
    return NextResponse.json({ ok: false, error: 'order_request_email_failed' }, { status: 502 });
  }

  return NextResponse.json({
    ok: true,
    requestId,
    submittedAt,
    inventory
  });
}
