import fs from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getSiteUrl } from '../../../../lib/seo/siteUrl';

type CheckoutRequestItem = {
  id: string;
  quantity: number;
};

type CheckoutRequestPayload = {
  locale: string;
  items: CheckoutRequestItem[];
};

type ProductRecord = {
  id: string;
  name?: string;
  model: string;
  finalPriceEur?: number | null;
  priceQty?: number | null;
};

const productsPath = path.join(process.cwd(), 'data', 'products', 'products.json');

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

function asSafeText(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().slice(0, maxLength);
}

function parsePayload(input: unknown): CheckoutRequestPayload | null {
  if (!input || typeof input !== 'object') {
    return null;
  }

  const data = input as Record<string, unknown>;
  const locale = asSafeText(data.locale, 8);

  const rawItems = Array.isArray(data.items) ? data.items : [];
  const items: CheckoutRequestItem[] = rawItems
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null;
      }

      const entry = item as Record<string, unknown>;
      const id = asSafeText(entry.id, 80);
      const quantity = Number(entry.quantity);

      if (!id || !Number.isFinite(quantity) || quantity < 1 || quantity > 999) {
        return null;
      }

      return {
        id,
        quantity: Math.floor(quantity)
      };
    })
    .filter((item): item is CheckoutRequestItem => Boolean(item));

  if (!locale || items.length === 0) {
    return null;
  }

  return { locale, items };
}

function getStripeClient(): Stripe | null {
  const key = resolveStripeSecretKey();
  if (!key) {
    return null;
  }

  return new Stripe(key);
}

export async function POST(request: Request) {
  const stripe = getStripeClient();
  if (!stripe) {
    return NextResponse.json({ ok: false, error: 'payment_not_configured' }, { status: 503 });
  }

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

  const rawProducts = await fs.readFile(productsPath, 'utf8');
  const products = JSON.parse(rawProducts) as ProductRecord[];
  const productsById = new Map(products.map((product) => [product.id, product]));

  const insufficientItems: Array<{ id: string; model: string; requestedQty: number; availableQty: number }> = [];

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
  for (const item of payload.items) {
    const product = productsById.get(item.id);
    if (!product) {
      return NextResponse.json({ ok: false, error: 'product_not_found', productId: item.id }, { status: 400 });
    }

    const unitPrice = typeof product.finalPriceEur === 'number' && Number.isFinite(product.finalPriceEur)
      ? product.finalPriceEur
      : null;

    if (unitPrice === null || unitPrice <= 0) {
      return NextResponse.json({ ok: false, error: 'product_not_payable', productId: item.id }, { status: 400 });
    }

    const availableQty = typeof product.priceQty === 'number' && Number.isFinite(product.priceQty)
      ? Math.max(0, Math.floor(product.priceQty))
      : null;

    if (availableQty !== null && item.quantity > availableQty) {
      insufficientItems.push({
        id: item.id,
        model: product.model,
        requestedQty: item.quantity,
        availableQty
      });
      continue;
    }

    lineItems.push({
      quantity: item.quantity,
      price_data: {
        currency: 'eur',
        unit_amount: Math.round(unitPrice * 100),
        product_data: {
          name: product.name ?? product.model,
          metadata: {
            productId: product.id,
            model: product.model
          }
        }
      }
    });
  }

  if (insufficientItems.length > 0) {
    return NextResponse.json({ ok: false, error: 'insufficient_stock', insufficientItems }, { status: 409 });
  }

  if (lineItems.length === 0) {
    return NextResponse.json({ ok: false, error: 'empty_checkout' }, { status: 400 });
  }

  try {
    const siteUrl = getSiteUrl();
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      allow_promotion_codes: true,
      success_url: `${siteUrl}/${payload.locale}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/${payload.locale}/cart?checkout=cancelled`,
      metadata: {
        locale: payload.locale,
        source: 'beokbg-cart'
      }
    });

    return NextResponse.json({ ok: true, url: session.url, sessionId: session.id });
  } catch (error) {
    console.error('[checkout_session_failed]', error);
    return NextResponse.json({ ok: false, error: 'checkout_session_failed' }, { status: 500 });
  }
}
