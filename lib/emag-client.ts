import { EmagApiResponse } from '../types/emag';

type RateBucket = 'orders' | 'general';

const bucketRules: Record<RateBucket, { minIntervalMs: number }> = {
  orders: { minIntervalMs: Math.ceil(1000 / 12) },
  general: { minIntervalMs: Math.ceil(1000 / 3) }
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function normalizeBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim();
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
}

function selectBucket(endpoint: string): RateBucket {
  return endpoint.startsWith('/order/') ? 'orders' : 'general';
}

function joinUrl(baseUrl: string, endpoint: string): string {
  if (!endpoint.startsWith('/')) {
    return `${baseUrl}/${endpoint}`;
  }

  return `${baseUrl}${endpoint}`;
}

function stringifyError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return 'unknown_error';
}

export class EmagApiClient {
  private readonly baseUrl: string;
  private readonly authorizationHeader: string;
  private readonly debugEnabled: boolean;
  private readonly lastRequestAt: Record<RateBucket, number>;
  private readonly bucketQueues: Record<RateBucket, Promise<void>>;

  constructor(options?: {
    baseUrl?: string;
    username?: string;
    password?: string;
    debug?: boolean;
  }) {
    const baseUrl = options?.baseUrl || process.env.EMAG_BASE_URL || 'https://marketplace-api.emag.bg/api-3';
    const username = options?.username || process.env.EMAG_USERNAME || '';
    const password = options?.password || process.env.EMAG_PASSWORD || '';

    if (!username || !password) {
      throw new Error('Missing eMAG credentials. Set EMAG_USERNAME and EMAG_PASSWORD.');
    }

    this.baseUrl = normalizeBaseUrl(baseUrl);
    this.authorizationHeader = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
    this.debugEnabled = options?.debug ?? process.env.EMAG_DEBUG === '1';
    this.lastRequestAt = { orders: 0, general: 0 };
    this.bucketQueues = {
      orders: Promise.resolve(),
      general: Promise.resolve()
    };
  }

  async postRead<T = unknown>(endpoint: string, payload: Record<string, unknown> = {}): Promise<EmagApiResponse<T>> {
    return this.request<EmagApiResponse<T>>('POST', endpoint, payload);
  }

  async postSave<T = unknown>(endpoint: string, data: unknown[]): Promise<EmagApiResponse<T>> {
    return this.request<EmagApiResponse<T>>('POST', endpoint, { data });
  }

  async post<T = unknown>(endpoint: string, payload: unknown): Promise<T> {
    return this.request<T>('POST', endpoint, payload);
  }

  async patch<T = unknown>(endpoint: string, payload: unknown): Promise<T> {
    return this.request<T>('PATCH', endpoint, payload);
  }

  private async throttle(endpoint: string): Promise<void> {
    const bucket = selectBucket(endpoint);
    const rule = bucketRules[bucket];

    const gate = this.bucketQueues[bucket].then(async () => {
      const now = Date.now();
      const elapsed = now - this.lastRequestAt[bucket];
      const wait = Math.max(0, rule.minIntervalMs - elapsed);

      if (wait > 0) {
        await sleep(wait);
      }

      this.lastRequestAt[bucket] = Date.now();
    });

    this.bucketQueues[bucket] = gate.catch(() => undefined);
    await gate;
  }

  private async request<T>(method: 'POST' | 'PATCH' | 'GET', endpoint: string, payload?: unknown): Promise<T> {
    await this.throttle(endpoint);

    const url = joinUrl(this.baseUrl, endpoint);
    const startedAt = Date.now();

    if (this.debugEnabled) {
      console.info('[emag_request_start]', JSON.stringify({ method, endpoint, url }));
    }

    let response: Response;

    try {
      response = await fetch(url, {
        method,
        headers: {
          Authorization: this.authorizationHeader,
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        body: method === 'GET' ? undefined : JSON.stringify(payload ?? {})
      });
    } catch (error) {
      throw new Error(`eMAG network error for ${endpoint}: ${stringifyError(error)}`);
    }

    const responseText = await response.text();
    const durationMs = Date.now() - startedAt;

    if (this.debugEnabled) {
      console.info(
        '[emag_request_end]',
        JSON.stringify({ method, endpoint, status: response.status, durationMs })
      );
    }

    let responseJson: unknown = null;
    try {
      responseJson = responseText ? JSON.parse(responseText) : null;
    } catch {
      responseJson = null;
    }

    if (response.status === 429) {
      throw new Error(`eMAG rate limit exceeded for ${endpoint}`);
    }

    if (!response.ok) {
      throw new Error(`eMAG request failed for ${endpoint} with status ${response.status}`);
    }

    const parsed = responseJson as EmagApiResponse<unknown> | null;
    if (parsed && typeof parsed === 'object' && parsed.isError) {
      const message = Array.isArray(parsed.messages) ? parsed.messages.join(' | ') : 'eMAG returned isError=true';
      throw new Error(`eMAG API error for ${endpoint}: ${message}`);
    }

    return (responseJson as T) ?? ({} as T);
  }
}

let singleton: EmagApiClient | null = null;

export function getEmagClient(): EmagApiClient {
  if (!singleton) {
    singleton = new EmagApiClient();
  }

  return singleton;
}
