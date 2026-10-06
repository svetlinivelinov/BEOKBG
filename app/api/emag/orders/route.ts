import { NextResponse } from 'next/server';
import { isEmagAdminAuthorized, readJsonBody, unauthorizedResponse } from '../../../../lib/emag-admin';
import { getEmagClient } from '../../../../lib/emag-client';
import { readStoredEmagOrders, upsertEmagOrders } from '../../../../lib/emag-storage';
import { EmagApiResponse, EmagOrder } from '../../../../types/emag';

type ReadOrdersPayload = {
  status?: number;
  currentPage?: number;
  itemsPerPage?: number;
  date?: string;
  modifiedAfter?: string;
};

function asNumber(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }

  return value;
}

function asText(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().slice(0, maxLength);
  return normalized || null;
}

function toOrderFilters(input: unknown): Record<string, unknown> {
  const payload = (input || {}) as ReadOrdersPayload;

  const status = asNumber(payload.status);
  const currentPage = asNumber(payload.currentPage) ?? 1;
  const itemsPerPage = asNumber(payload.itemsPerPage) ?? 100;
  const date = asText(payload.date, 32);
  const modifiedAfter = asText(payload.modifiedAfter, 32);

  const filters: Record<string, unknown> = {
    currentPage,
    itemsPerPage: Math.min(1000, Math.max(1, Math.floor(itemsPerPage)))
  };

  if (status !== null) {
    filters.status = Math.floor(status);
  }

  if (date) {
    filters.date = date;
  }

  if (modifiedAfter) {
    filters.modified_after = modifiedAfter;
  }

  return filters;
}

export async function POST(request: Request) {
  if (!isEmagAdminAuthorized(request)) {
    return unauthorizedResponse();
  }

  const body = await readJsonBody(request);

  try {
    const client = getEmagClient();
    const filters = toOrderFilters(body);
    const response = await client.postRead<EmagOrder[]>('/order/read', filters);

    const orders = Array.isArray(response.results) ? response.results : [];
    const persisted = await upsertEmagOrders(orders);

    return NextResponse.json({
      success: true,
      data: {
        fetched: orders.length,
        inserted: persisted.inserted,
        updated: persisted.updated,
        totalStored: persisted.total,
        filters,
        messages: response.messages || []
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'orders_sync_failed'
      },
      {
        status: 500
      }
    );
  }
}

export async function GET(request: Request) {
  if (!isEmagAdminAuthorized(request)) {
    return unauthorizedResponse();
  }

  const url = new URL(request.url);
  const limit = Number(url.searchParams.get('limit') ?? '100');
  const safeLimit = Number.isFinite(limit) ? Math.min(500, Math.max(1, Math.floor(limit))) : 100;

  const orders = await readStoredEmagOrders(safeLimit);

  return NextResponse.json({
    success: true,
    data: {
      count: orders.length,
      orders
    }
  });
}
