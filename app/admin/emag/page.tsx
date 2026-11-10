'use client';

import { useMemo, useState } from 'react';

type ApiResult = {
  success: boolean;
  data?: unknown;
  error?: string;
};

type UnifiedOrderEvent = {
  id: string;
  source: 'stripe' | 'emag';
  occurredAt: string;
  eventType: string;
  status: string;
  orderRef: string | null;
  details: Record<string, unknown>;
};

type ActionKey =
  | 'syncProducts'
  | 'updateStock'
  | 'updatePrice'
  | 'readOrders'
  | 'readLocalOrders'
  | 'readOrderEvents';

const actionConfig: Record<ActionKey, { title: string; endpoint: string; method: 'POST' | 'GET'; payload?: Record<string, unknown> }> = {
  syncProducts: {
    title: 'Sync Products',
    endpoint: '/api/emag/sync-products',
    method: 'POST',
    payload: {}
  },
  updateStock: {
    title: 'Update Stock',
    endpoint: '/api/emag/update-stock',
    method: 'POST',
    payload: {}
  },
  updatePrice: {
    title: 'Update Price',
    endpoint: '/api/emag/update-price',
    method: 'POST',
    payload: {}
  },
  readOrders: {
    title: 'Read New Orders',
    endpoint: '/api/emag/orders',
    method: 'POST',
    payload: {
      currentPage: 1,
      itemsPerPage: 100
    }
  },
  readLocalOrders: {
    title: 'Show Local Orders',
    endpoint: '/api/emag/orders?limit=100',
    method: 'GET'
  },
  readOrderEvents: {
    title: 'Show Stripe + eMAG Events',
    endpoint: '/api/admin/order-events?limit=300',
    method: 'GET'
  }
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function readUnifiedEvents(result: ApiResult | null): UnifiedOrderEvent[] {
  if (!result?.success) {
    return [];
  }

  const data = asRecord(result.data);
  if (!data) {
    return [];
  }

  const events = data.events;
  if (!Array.isArray(events)) {
    return [];
  }

  return events
    .map((entry): UnifiedOrderEvent | null => {
      const item = asRecord(entry);
      if (!item) {
        return null;
      }

      if ((item.source !== 'stripe' && item.source !== 'emag') || typeof item.id !== 'string' || typeof item.occurredAt !== 'string') {
        return null;
      }

      return {
        id: item.id,
        source: item.source,
        occurredAt: item.occurredAt,
        eventType: typeof item.eventType === 'string' ? item.eventType : 'unknown_event',
        status: typeof item.status === 'string' ? item.status : 'unknown',
        orderRef: typeof item.orderRef === 'string' ? item.orderRef : item.orderRef === null ? null : String(item.orderRef),
        details: asRecord(item.details) ?? {}
      };
    })
    .filter((entry): entry is UnifiedOrderEvent => Boolean(entry));
}

function formatDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString();
}

export default function EmagAdminPage() {
  const [token, setToken] = useState('');
  const [running, setRunning] = useState<ActionKey | null>(null);
  const [result, setResult] = useState<ApiResult | null>(null);
  const [lastActionTitle, setLastActionTitle] = useState('');

  const isBusy = useMemo(() => running !== null, [running]);
  const orderEvents = useMemo(() => readUnifiedEvents(result), [result]);

  async function runAction(action: ActionKey): Promise<void> {
    setRunning(action);
    setLastActionTitle(actionConfig[action].title);

    const config = actionConfig[action];

    try {
      const response = await fetch(config.endpoint, {
        method: config.method,
        headers: {
          'Content-Type': 'application/json',
          ...(token.trim() ? { 'x-admin-token': token.trim() } : {})
        },
        body: config.method === 'POST' ? JSON.stringify(config.payload || {}) : undefined
      });

      const payload = (await response.json()) as ApiResult;
      setResult(payload);
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'request_failed'
      });
    } finally {
      setRunning(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">eMAG Marketplace Admin</h1>
          <p className="text-sm text-slate-600">
            Control product sync, stock, pricing, and order retrieval from the eMAG API.
          </p>
        </header>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="admin-token">
            Admin token (optional if endpoint is open)
          </label>
          <input
            id="admin-token"
            type="password"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-blue-200 focus:border-blue-500 focus:ring"
            placeholder="Enter EMAG_ADMIN_TOKEN"
          />
        </section>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(Object.keys(actionConfig) as ActionKey[]).map((key) => {
            const config = actionConfig[key];
            const active = running === key;

            return (
              <button
                key={key}
                type="button"
                onClick={() => runAction(key)}
                disabled={isBusy}
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-left text-sm font-medium text-slate-800 transition hover:border-slate-400 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <div>{config.title}</div>
                {active ? <div className="mt-1 text-xs text-slate-500">Running...</div> : null}
              </button>
            );
          })}
        </section>

        {orderEvents.length > 0 ? (
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Unified order events timeline</h2>
            <p className="mt-1 text-sm text-slate-600">Each row is labeled by source: Stripe or eMAG.</p>

            <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-100 text-left text-slate-700">
                  <tr>
                    <th className="px-3 py-2">Time</th>
                    <th className="px-3 py-2">Source</th>
                    <th className="px-3 py-2">Event</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Order Ref</th>
                    <th className="px-3 py-2">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {orderEvents.map((event) => (
                    <tr key={event.id} className="border-t border-slate-200 align-top">
                      <td className="px-3 py-2 text-slate-700">{formatDate(event.occurredAt)}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                            event.source === 'stripe'
                              ? 'bg-violet-100 text-violet-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {event.source === 'stripe' ? 'Stripe' : 'eMAG'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-800">{event.eventType}</td>
                      <td className="px-3 py-2 text-slate-700">{event.status}</td>
                      <td className="px-3 py-2 text-slate-700">{event.orderRef ?? '-'}</td>
                      <td className="px-3 py-2 text-slate-700">
                        <pre className="max-w-[360px] overflow-auto whitespace-pre-wrap break-words text-xs">
                          {JSON.stringify(event.details, null, 2)}
                        </pre>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Last response</h2>
          {lastActionTitle ? <p className="mt-1 text-sm text-slate-600">Action: {lastActionTitle}</p> : null}

          <pre className="mt-4 max-h-[480px] overflow-auto rounded-lg bg-slate-900 p-4 text-xs text-slate-100">
            {JSON.stringify(result ?? { info: 'No action executed yet.' }, null, 2)}
          </pre>
        </section>
      </div>
    </main>
  );
}
