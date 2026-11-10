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

type EmagSyncBatchResult = {
  batch: number;
  products: number;
  status: 'ok' | 'failed';
  error?: string;
};

type EmagSyncRun = {
  id: string;
  startedAt: string;
  completedAt: string;
  requestedIds: string[];
  totalProducts: number;
  syncedProducts: number;
  batches: number;
  success: boolean;
  failures: EmagSyncBatchResult[];
  report: EmagSyncBatchResult[];
};

type EmagVatOption = {
  id: number;
  name: string | null;
  value: number | null;
  raw: Record<string, unknown>;
};

type EmagOfferVatSample = {
  id: number;
  partNumber: string | null;
  name: string | null;
  vatId: number | null;
  categoryId: number | null;
  status: number | null;
  raw: Record<string, unknown>;
};

type ActionKey =
  | 'syncProducts'
  | 'updateStock'
  | 'updatePrice'
  | 'readOrders'
  | 'readLocalOrders'
  | 'readOrderEvents'
  | 'readSyncHistory'
  | 'readVatOptions'
  | 'readOfferVatSamples'
  | 'searchCategories';

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
  },
  readSyncHistory: {
    title: 'Show Sync History',
    endpoint: '/api/emag/sync-runs?limit=100',
    method: 'GET'
  },
  readVatOptions: {
    title: 'Show VAT Options',
    endpoint: '/api/emag/vat-options',
    method: 'GET'
  },
  readOfferVatSamples: {
    title: 'Show Offer VAT Samples',
    endpoint: '/api/emag/offer-vat-samples?limit=100',
    method: 'GET'
  },
  searchCategories: {
    title: 'Find Thermostat Categories',
    endpoint: `/api/emag/category-search?q=${encodeURIComponent('термостат,thermostat')}`,
    method: 'GET'
  }
};

type EmagCategoryMatch = {
  id: number;
  name: string;
  isAllowed: boolean | number | null;
};

function readCategoryMatches(result: ApiResult | null): EmagCategoryMatch[] {
  if (!result?.success) {
    return [];
  }

  const matches = asRecord(result.data)?.matches;
  if (!Array.isArray(matches)) {
    return [];
  }

  return matches
    .map((entry): EmagCategoryMatch | null => {
      const item = asRecord(entry);
      if (!item || typeof item.id !== 'number' || typeof item.name !== 'string') {
        return null;
      }

      const allowed = item.isAllowed;
      return {
        id: item.id,
        name: item.name,
        isAllowed: typeof allowed === 'boolean' || typeof allowed === 'number' ? allowed : null
      };
    })
    .filter((entry): entry is EmagCategoryMatch => Boolean(entry));
}

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

function readSyncRuns(result: ApiResult | null): EmagSyncRun[] {
  if (!result?.success) {
    return [];
  }

  const data = asRecord(result.data);
  if (!data) {
    return [];
  }

  const runs = data.runs;
  if (!Array.isArray(runs)) {
    return [];
  }

  return runs
    .map((entry): EmagSyncRun | null => {
      const run = asRecord(entry);
      if (!run) {
        return null;
      }

      if (
        typeof run.id !== 'string' ||
        typeof run.startedAt !== 'string' ||
        typeof run.completedAt !== 'string' ||
        !Array.isArray(run.requestedIds) ||
        typeof run.totalProducts !== 'number' ||
        typeof run.syncedProducts !== 'number' ||
        typeof run.batches !== 'number' ||
        typeof run.success !== 'boolean' ||
        !Array.isArray(run.failures) ||
        !Array.isArray(run.report)
      ) {
        return null;
      }

      return {
        id: run.id,
        startedAt: run.startedAt,
        completedAt: run.completedAt,
        requestedIds: run.requestedIds.filter((value): value is string => typeof value === 'string'),
        totalProducts: run.totalProducts,
        syncedProducts: run.syncedProducts,
        batches: run.batches,
        success: run.success,
        failures: run.failures as EmagSyncBatchResult[],
        report: run.report as EmagSyncBatchResult[]
      };
    })
    .filter((entry): entry is EmagSyncRun => Boolean(entry));
}

function readVatOptions(result: ApiResult | null): EmagVatOption[] {
  if (!result?.success) {
    return [];
  }

  const data = asRecord(result.data);
  if (!data) {
    return [];
  }

  const options = data.vatOptions;
  if (!Array.isArray(options)) {
    return [];
  }

  return options
    .map((entry): EmagVatOption | null => {
      const item = asRecord(entry);
      if (!item || typeof item.id !== 'number') {
        return null;
      }

      return {
        id: Math.floor(item.id),
        name: typeof item.name === 'string' ? item.name : null,
        value: typeof item.value === 'number' ? item.value : null,
        raw: asRecord(item.raw) ?? {}
      };
    })
    .filter((entry): entry is EmagVatOption => Boolean(entry))
    .sort((left, right) => left.id - right.id);
}

function readOfferVatSamples(result: ApiResult | null): EmagOfferVatSample[] {
  if (!result?.success) {
    return [];
  }

  const data = asRecord(result.data);
  if (!data) {
    return [];
  }

  const samples = data.samples;
  if (!Array.isArray(samples)) {
    return [];
  }

  return samples
    .map((entry): EmagOfferVatSample | null => {
      const item = asRecord(entry);
      if (!item || typeof item.id !== 'number') {
        return null;
      }

      return {
        id: Math.floor(item.id),
        partNumber: typeof item.partNumber === 'string' ? item.partNumber : null,
        name: typeof item.name === 'string' ? item.name : null,
        vatId: typeof item.vatId === 'number' ? item.vatId : null,
        categoryId: typeof item.categoryId === 'number' ? item.categoryId : null,
        status: typeof item.status === 'number' ? item.status : null,
        raw: asRecord(item.raw) ?? {}
      };
    })
    .filter((entry): entry is EmagOfferVatSample => Boolean(entry));
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
  const syncRuns = useMemo(() => readSyncRuns(result), [result]);
  const vatOptions = useMemo(() => readVatOptions(result), [result]);
  const offerVatSamples = useMemo(() => readOfferVatSamples(result), [result]);
  const categoryMatches = useMemo(() => readCategoryMatches(result), [result]);

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

        {syncRuns.length > 0 ? (
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Product sync history</h2>
            <p className="mt-1 text-sm text-slate-600">Stored history of eMAG product push runs.</p>

            <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-100 text-left text-slate-700">
                  <tr>
                    <th className="px-3 py-2">Started</th>
                    <th className="px-3 py-2">Completed</th>
                    <th className="px-3 py-2">Result</th>
                    <th className="px-3 py-2">Synced</th>
                    <th className="px-3 py-2">Batches</th>
                    <th className="px-3 py-2">Failed Batches</th>
                    <th className="px-3 py-2">Scope</th>
                  </tr>
                </thead>
                <tbody>
                  {syncRuns.map((run) => (
                    <tr key={run.id} className="border-t border-slate-200 align-top">
                      <td className="px-3 py-2 text-slate-700">{formatDate(run.startedAt)}</td>
                      <td className="px-3 py-2 text-slate-700">{formatDate(run.completedAt)}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                            run.success ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {run.success ? 'Success' : 'Failed'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-700">{run.syncedProducts}/{run.totalProducts}</td>
                      <td className="px-3 py-2 text-slate-700">{run.batches}</td>
                      <td className="px-3 py-2 text-slate-700">{run.failures.length}</td>
                      <td className="px-3 py-2 text-slate-700">
                        {run.requestedIds.length > 0 ? `${run.requestedIds.length} selected IDs` : 'All products'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {vatOptions.length > 0 ? (
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">VAT options from eMAG</h2>
            <p className="mt-1 text-sm text-slate-600">Use the ID column for EMAG_VAT_ID.</p>

            <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-100 text-left text-slate-700">
                  <tr>
                    <th className="px-3 py-2">ID</th>
                    <th className="px-3 py-2">Label</th>
                    <th className="px-3 py-2">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {vatOptions.map((item) => (
                    <tr key={item.id} className="border-t border-slate-200">
                      <td className="px-3 py-2 font-semibold text-slate-900">{item.id}</td>
                      <td className="px-3 py-2 text-slate-700">{item.name ?? '-'}</td>
                      <td className="px-3 py-2 text-slate-700">{item.value ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {offerVatSamples.length > 0 ? (
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Offer VAT samples from eMAG</h2>
            <p className="mt-1 text-sm text-slate-600">Use this table to identify real working VAT IDs from existing offers.</p>

            <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-100 text-left text-slate-700">
                  <tr>
                    <th className="px-3 py-2">Offer ID</th>
                    <th className="px-3 py-2">Part number</th>
                    <th className="px-3 py-2">VAT ID</th>
                    <th className="px-3 py-2">Category</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {offerVatSamples.map((sample) => (
                    <tr key={sample.id} className="border-t border-slate-200">
                      <td className="px-3 py-2 font-semibold text-slate-900">{sample.id}</td>
                      <td className="px-3 py-2 text-slate-700">{sample.partNumber ?? sample.name ?? '-'}</td>
                      <td className="px-3 py-2 text-slate-700">{sample.vatId ?? '-'}</td>
                      <td className="px-3 py-2 text-slate-700">{sample.categoryId ?? '-'}</td>
                      <td className="px-3 py-2 text-slate-700">{sample.status ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {categoryMatches.length > 0 ? (
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Matching eMAG categories</h2>
            <p className="mt-1 text-sm text-slate-600">Use the ID column for EMAG_CATEGORY_MAP_JSON. Allowed = 1 means your account can publish there.</p>

            <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-100 text-left text-slate-700">
                  <tr>
                    <th className="px-3 py-2">ID</th>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Allowed</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryMatches.map((category) => (
                    <tr key={category.id} className="border-t border-slate-200">
                      <td className="px-3 py-2 font-semibold text-slate-900">{category.id}</td>
                      <td className="px-3 py-2 text-slate-700">{category.name}</td>
                      <td className="px-3 py-2 text-slate-700">{category.isAllowed === null ? '-' : String(category.isAllowed)}</td>
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
