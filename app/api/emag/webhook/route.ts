import { NextResponse } from 'next/server';
import { appendWebhookEvent, upsertEmagOrders } from '../../../../lib/emag-storage';
import { EmagOrder } from '../../../../types/emag';

const defaultAllowedIps = ['43.131.5.30', '91.206.37.14', '46.174.144.128'];

function resolveAllowedIps(): Set<string> {
  const configured = process.env.EMAG_WEBHOOK_ALLOWED_IPS?.trim();
  if (!configured) {
    return new Set(defaultAllowedIps);
  }

  const list = configured
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  return new Set(list.length > 0 ? list : defaultAllowedIps);
}

function getSourceIp(request: Request): string {
  const fromForwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '';
  const fromRealIp = request.headers.get('x-real-ip')?.trim() || '';
  return fromForwarded || fromRealIp || 'unknown';
}

function inferEventType(payload: unknown): string {
  if (!payload || typeof payload !== 'object') {
    return 'unknown';
  }

  const map = payload as Record<string, unknown>;
  const candidates = [
    map.event,
    map.type,
    map.notificationType,
    map.topic,
    map.action
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }

  return 'unknown';
}

function extractOrdersFromPayload(payload: unknown): EmagOrder[] {
  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const map = payload as Record<string, unknown>;
  const candidates: unknown[] = [];

  candidates.push(map.order);
  candidates.push(map.orders);
  candidates.push(map.results);
  candidates.push(map.data);

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.filter((entry): entry is EmagOrder => {
        if (!entry || typeof entry !== 'object') {
          return false;
        }

        const idValue = (entry as Record<string, unknown>).id;
        return typeof idValue === 'number' && Number.isFinite(idValue);
      });
    }

    if (candidate && typeof candidate === 'object') {
      const idValue = (candidate as Record<string, unknown>).id;
      if (typeof idValue === 'number' && Number.isFinite(idValue)) {
        return [candidate as EmagOrder];
      }
    }
  }

  return [];
}

export async function POST(request: Request) {
  const sourceIp = getSourceIp(request);
  const allowedIps = resolveAllowedIps();

  if (sourceIp !== 'unknown' && !allowedIps.has(sourceIp)) {
    return NextResponse.json(
      {
        success: false,
        error: 'forbidden_source_ip'
      },
      {
        status: 403
      }
    );
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: 'invalid_json'
      },
      {
        status: 400
      }
    );
  }

  const eventType = inferEventType(payload);
  const storedEvent = await appendWebhookEvent({
    sourceIp,
    eventType,
    payload
  });

  const orders = extractOrdersFromPayload(payload);
  const persisted = orders.length > 0 ? await upsertEmagOrders(orders) : null;

  return NextResponse.json({
    success: true,
    data: {
      eventId: storedEvent.id,
      eventType,
      sourceIp,
      savedOrders: persisted
    }
  });
}
