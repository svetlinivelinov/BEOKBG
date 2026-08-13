import fs from 'fs/promises';
import path from 'path';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { appendStripeOrder, StoredStripeOrder } from '../../../../lib/payments/stripeOrders';
import { sendOrderConfirmationEmail } from '../../../../lib/payments/sendOrderConfirmationEmail';

type ProductInventoryRecord = {
  id: string;
  model: string;
  priceQty?: number | null;
};

const productsPath = path.join(process.cwd(), 'data', 'products', 'products.json');

function getStripeClientAndSecret(): { stripe: Stripe; webhookSecret: string } | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!key || !webhookSecret) {
    return null;
  }

  return {
    stripe: new Stripe(key),
    webhookSecret
  };
}

async function decrementInventory(items: Array<{ productId: string; quantity: number }>): Promise<void> {
  const raw = await fs.readFile(productsPath, 'utf8');
  const products = JSON.parse(raw) as ProductInventoryRecord[];
  const orderedById = new Map<string, number>();

  for (const item of items) {
    orderedById.set(item.productId, (orderedById.get(item.productId) ?? 0) + item.quantity);
  }

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
  }

  await fs.writeFile(productsPath, `${JSON.stringify(products, null, 2)}\n`, 'utf8');
}

export async function POST(request: Request) {
  const stripeConfig = getStripeClientAndSecret();
  if (!stripeConfig) {
    return NextResponse.json({ ok: false, error: 'payment_not_configured' }, { status: 503 });
  }

  const signature = (await headers()).get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ ok: false, error: 'missing_signature' }, { status: 400 });
  }

  const rawBody = await request.text();
  let event: Stripe.Event;
  try {
    event = stripeConfig.stripe.webhooks.constructEvent(rawBody, signature, stripeConfig.webhookSecret);
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_signature' }, { status: 400 });
  }

  if (event.type !== 'checkout.session.completed') {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  if (!session.id) {
    return NextResponse.json({ ok: false, error: 'missing_session_id' }, { status: 400 });
  }

  const lineItems = await stripeConfig.stripe.checkout.sessions.listLineItems(session.id, {
    limit: 100,
    expand: ['data.price.product']
  });

  const normalizedItems: Array<{ productId: string; model: string; quantity: number }> = [];
  for (const line of lineItems.data) {
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

  if (normalizedItems.length > 0) {
    await decrementInventory(normalizedItems.map((item) => ({ productId: item.productId, quantity: item.quantity })));
  }

  const locale = session.metadata?.locale?.trim() || 'en';
  const paidOrder: StoredStripeOrder = {
    sessionId: session.id,
    paymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : null,
    customerEmail: session.customer_details?.email ?? null,
    currency: session.currency ?? null,
    amountTotal: session.amount_total ?? null,
    locale,
    items: normalizedItems,
    paidAt: new Date().toISOString()
  };

  const appended = await appendStripeOrder(paidOrder);
  if (appended) {
    try {
      await sendOrderConfirmationEmail(paidOrder);
    } catch (error) {
      console.error('[order_confirmation_email_failed]', error);
    }
  }

  return NextResponse.json({ ok: true });
}
