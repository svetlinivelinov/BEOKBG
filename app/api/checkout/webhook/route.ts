import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { appendStripeOrder, StoredStripeOrder } from '../../../../lib/payments/stripeOrders';
import { sendOrderConfirmationEmail } from '../../../../lib/payments/sendOrderConfirmationEmail';
import { decrementInventory } from '../../../../lib/payments/inventory';

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

function getStripeClientAndSecret(): { stripe: Stripe; webhookSecret: string } | null {
  const key = resolveStripeSecretKey();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!key || !webhookSecret) {
    return null;
  }

  return {
    stripe: new Stripe(key),
    webhookSecret
  };
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

  const locale = session.metadata?.locale?.trim() || 'en';
  const paidOrder: StoredStripeOrder = {
    sessionId: session.id,
    paymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : null,
    customerEmail: session.customer_details?.email ?? session.customer_email ?? null,
    currency: session.currency ?? null,
    amountTotal: session.amount_total ?? null,
    locale,
    items: normalizedItems,
    paidAt: new Date().toISOString()
  };

  const appended = await appendStripeOrder(paidOrder);
  if (appended) {
    if (normalizedItems.length > 0) {
      await decrementInventory(normalizedItems.map((item) => ({ productId: item.productId, quantity: item.quantity })));
    }

    try {
      await sendOrderConfirmationEmail(paidOrder);
    } catch (error) {
      console.error('[order_confirmation_email_failed]', error);
    }
  }

  return NextResponse.json({ ok: true });
}
