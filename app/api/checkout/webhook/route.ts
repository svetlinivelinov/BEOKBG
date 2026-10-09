import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import {
  attachStripeWebhookEventSession,
  appendOrderStatusHistory,
  appendSamedayAwbAttempt,
  appendStripeOrder,
  getStripeOrderBySessionId,
  markStripeWebhookEventFailed,
  markStripeWebhookEventProcessed,
  markStripeOrderAwb,
  markStripeOrderEmailSent,
  recordStripeWebhookEventReceived,
  StoredStripeOrder
} from '../../../../lib/payments/stripeOrders';
import { sendOrderConfirmationEmail } from '../../../../lib/payments/sendOrderConfirmationEmail';
import { decrementInventory } from '../../../../lib/payments/inventory';
import { getCheckoutDeliveryBySessionId } from '../../../../lib/payments/checkoutDelivery';
import { createSamedayAwb } from '../../../../lib/payments/samedayCreateAwb';

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

  console.info('[checkout_webhook_received]', {
    eventType: event.type,
    eventId: event.id
  });

  const isFreshEvent = await recordStripeWebhookEventReceived(event.id, event.type, null);
  if (!isFreshEvent) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  if (event.type !== 'checkout.session.completed') {
    await markStripeWebhookEventProcessed(event.id, 'ignored');
    return NextResponse.json({ ok: true, ignored: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  if (!session.id) {
    await markStripeWebhookEventFailed(event.id, 'missing_session_id');
    return NextResponse.json({ ok: false, error: 'missing_session_id' }, { status: 400 });
  }

  await attachStripeWebhookEventSession(event.id, session.id);

  try {
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
    const delivery = await getCheckoutDeliveryBySessionId(session.id);
    const paidOrder: StoredStripeOrder = {
      sessionId: session.id,
      paymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : null,
      customerEmail: delivery?.email ?? session.customer_details?.email ?? session.customer_email ?? null,
      currency: session.currency ?? null,
      amountTotal: session.amount_total ?? null,
      locale,
      items: normalizedItems,
      delivery: delivery
        ? {
            fullName: delivery.fullName,
            phone: delivery.phone,
            email: delivery.email,
            deliveryType: delivery.deliveryType,
            addressLine1: delivery.addressLine1,
            city: delivery.city,
            postalCode: delivery.postalCode,
            lockerId: delivery.lockerId
          }
        : null,
      awb: null,
      paidAt: new Date().toISOString(),
      emailSentAt: null
    };

    const appended = await appendStripeOrder(paidOrder);
    if (appended) {
      if (normalizedItems.length > 0) {
        await decrementInventory(normalizedItems.map((item) => ({ productId: item.productId, quantity: item.quantity })));
      }

      await appendOrderStatusHistory(paidOrder.sessionId, 'paid', {
        itemCount: normalizedItems.length,
        amountTotal: paidOrder.amountTotal,
        currency: paidOrder.currency
      });

      console.info('[checkout_webhook_order_saved]', {
        sessionId: paidOrder.sessionId,
        appended,
        itemCount: normalizedItems.length
      });
    }

    const storedOrder = (await getStripeOrderBySessionId(paidOrder.sessionId)) ?? paidOrder;

    if (!storedOrder.awb && delivery) {
      try {
        const awbRequest = {
          clientId: process.env.SAMEDAY_CLIENT_ID?.trim() || '',
          serviceId: process.env.SAMEDAY_SERVICE_ID?.trim() || '',
          pickupId: process.env.SAMEDAY_PICKUP_POINT_ID?.trim() || '',
          deliveryType: delivery.deliveryType,
          recipient: {
            fullName: delivery.fullName,
            phone: delivery.phone,
            email: delivery.email,
            addressLine1: delivery.addressLine1,
            city: delivery.city,
            postalCode: delivery.postalCode,
            lockerId: delivery.lockerId
          },
          codAmountEur: typeof storedOrder.amountTotal === 'number' ? storedOrder.amountTotal / 100 : null
        };

        const awb = await createSamedayAwb(awbRequest);

        await markStripeOrderAwb(storedOrder.sessionId, {
          number: awb.awbNumber,
          status: awb.status
        });

        await appendSamedayAwbAttempt({
          sessionId: storedOrder.sessionId,
          attemptNo: 1,
          requestExcerpt: {
            deliveryType: awbRequest.deliveryType,
            lockerId: awbRequest.recipient.lockerId,
            city: awbRequest.recipient.city
          },
          responseExcerpt: {
            awbNumber: awb.awbNumber,
            status: awb.status
          },
          success: true
        });

        await appendOrderStatusHistory(storedOrder.sessionId, 'awb_created', {
          awbNumber: awb.awbNumber,
          deliveryType: delivery.deliveryType
        });

        console.info('[sameday_awb_created]', {
          sessionId: storedOrder.sessionId,
          awbNumber: awb.awbNumber,
          deliveryType: delivery.deliveryType
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'unknown_error';
        await appendSamedayAwbAttempt({
          sessionId: storedOrder.sessionId,
          attemptNo: 1,
          requestExcerpt: {
            deliveryType: delivery.deliveryType,
            lockerId: delivery.lockerId,
            city: delivery.city
          },
          responseExcerpt: null,
          success: false,
          errorCode: 'sameday_awb_failed',
          errorMessage: message
        });

        await appendOrderStatusHistory(storedOrder.sessionId, 'awb_failed', {
          error: message
        });

        console.error('[sameday_awb_failed]', {
          sessionId: storedOrder.sessionId,
          error
        });
      }
    }

    if (!storedOrder.emailSentAt) {
      const orderForEmail = {
        ...storedOrder,
        customerEmail: storedOrder.customerEmail ?? paidOrder.customerEmail
      };

      try {
        const sent = await sendOrderConfirmationEmail(orderForEmail);
        if (sent) {
          await markStripeOrderEmailSent(paidOrder.sessionId);
          await appendOrderStatusHistory(paidOrder.sessionId, 'email_sent');
          console.info('[order_confirmation_email_sent]', {
            sessionId: paidOrder.sessionId
          });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'unknown_error';
        await appendOrderStatusHistory(paidOrder.sessionId, 'email_failed', {
          error: message
        });
        console.error('[order_confirmation_email_failed]', {
          sessionId: paidOrder.sessionId,
          error
        });
      }
    }

    await markStripeWebhookEventProcessed(event.id, 'processed');
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown_error';
    await markStripeWebhookEventFailed(event.id, message);
    console.error('[checkout_webhook_failed]', {
      eventId: event.id,
      error
    });
    return NextResponse.json({ ok: false, error: 'checkout_webhook_failed' }, { status: 500 });
  }
}
