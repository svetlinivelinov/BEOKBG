import { NextResponse } from 'next/server';
import { isEmagAdminAuthorized, unauthorizedResponse } from '../../../../lib/emag-admin';
import { readStoredEmagWebhookEvents } from '../../../../lib/emag-storage';
import { readStripeWebhookEvents } from '../../../../lib/payments/stripeOrders';

type UnifiedOrderEvent = {
  id: string;
  source: 'stripe' | 'emag';
  occurredAt: string;
  eventType: string;
  status: string;
  orderRef: string | null;
  details: Record<string, unknown>;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function resolveOrderReference(payload: unknown): string | null {
  const root = asRecord(payload);
  if (!root) {
    return null;
  }

  const directCandidates = [root.order_id, root.orderId, root.id];
  for (const candidate of directCandidates) {
    if (typeof candidate === 'string' || typeof candidate === 'number') {
      return String(candidate);
    }
  }

  const nestedOrder = asRecord(root.order);
  const nestedId = nestedOrder?.id;
  if (typeof nestedId === 'string' || typeof nestedId === 'number') {
    return String(nestedId);
  }

  const results = root.results;
  if (Array.isArray(results) && results.length > 0) {
    const first = asRecord(results[0]);
    const firstId = first?.id;
    if (typeof firstId === 'string' || typeof firstId === 'number') {
      return String(firstId);
    }
  }

  return null;
}

function compareByOccurredAtDesc(left: UnifiedOrderEvent, right: UnifiedOrderEvent): number {
  return new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime();
}

export async function GET(request: Request) {
  if (!isEmagAdminAuthorized(request)) {
    return unauthorizedResponse();
  }

  const url = new URL(request.url);
  const limit = Number(url.searchParams.get('limit') ?? '200');
  const safeLimit = Number.isFinite(limit) ? Math.min(1000, Math.max(1, Math.floor(limit))) : 200;

  const [stripeEvents, emagEvents] = await Promise.all([
    readStripeWebhookEvents(safeLimit),
    readStoredEmagWebhookEvents(safeLimit)
  ]);

  const unified: UnifiedOrderEvent[] = [
    ...stripeEvents.map((event) => ({
      id: `stripe-${event.eventId}`,
      source: 'stripe' as const,
      occurredAt: event.receivedAt,
      eventType: event.eventType,
      status: event.status,
      orderRef: event.sessionId,
      details: {
        processedAt: event.processedAt,
        errorMessage: event.errorMessage
      }
    })),
    ...emagEvents.map((event) => ({
      id: `emag-${event.id}`,
      source: 'emag' as const,
      occurredAt: event.receivedAt,
      eventType: event.eventType,
      status: 'received',
      orderRef: resolveOrderReference(event.payload),
      details: {
        sourceIp: event.sourceIp
      }
    }))
  ]
    .sort(compareByOccurredAtDesc)
    .slice(0, safeLimit);

  return NextResponse.json({
    success: true,
    data: {
      count: unified.length,
      stripeCount: stripeEvents.length,
      emagCount: emagEvents.length,
      events: unified
    }
  });
}
