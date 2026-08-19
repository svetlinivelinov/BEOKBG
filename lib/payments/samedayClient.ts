type JsonRecord = Record<string, unknown>;

type AuthTokenPayload = {
  token?: string;
  accessToken?: string;
  access_token?: string;
};

export type SamedayLocker = {
  id: string;
  name: string;
  city?: string | null;
  address?: string | null;
};

const AUTH_PATH = process.env.SAMEDAY_AUTH_PATH?.trim() || '/api/authenticate';
const LOCKERS_PATH = process.env.SAMEDAY_LOCKERS_PATH?.trim() || '/api/lockers';
const CREATE_AWB_PATH = process.env.SAMEDAY_AWB_PATH?.trim() || '/api/awb';
const DEFAULT_TIMEOUT_MS = Number.parseInt(process.env.SAMEDAY_REQUEST_TIMEOUT_MS?.trim() || '12000', 10) || 12000;
const DEFAULT_RETRIES = Number.parseInt(process.env.SAMEDAY_RETRY_COUNT?.trim() || '2', 10) || 2;

let cachedToken: string | null = null;
let tokenRefreshedAtMs = 0;

function normalizeUrl(baseUrl: string, endpointPath: string): string {
  const left = baseUrl.replace(/\/+$/, '');
  const right = endpointPath.startsWith('/') ? endpointPath : `/${endpointPath}`;
  return `${left}${right}`;
}

function getBaseUrl(): string {
  const value = process.env.SAMEDAY_BASE_URL?.trim();
  if (!value) {
    throw new Error('sameday_not_configured:missing_base_url');
  }

  return value;
}

function asSafeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function extractAuthToken(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const data = payload as AuthTokenPayload;
  const token = asSafeString(data.token ?? data.accessToken ?? data.access_token);
  return token || null;
}

async function parseJsonResponse(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text.trim()) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { raw: text };
  }
}

async function requestWithTimeout(input: RequestInfo | URL, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

function shouldRetry(status: number): boolean {
  return status === 429 || (status >= 500 && status < 600);
}

async function authenticate(): Promise<string> {
  const baseUrl = getBaseUrl();
  const username = process.env.SAMEDAY_USERNAME?.trim();
  const password = process.env.SAMEDAY_PASSWORD?.trim();

  if (!username || !password) {
    throw new Error('sameday_not_configured:missing_credentials');
  }

  const url = normalizeUrl(baseUrl, AUTH_PATH);
  const response = await requestWithTimeout(
    url,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    },
    DEFAULT_TIMEOUT_MS
  );

  const payload = await parseJsonResponse(response);
  if (!response.ok) {
    throw new Error(`sameday_auth_failed:${response.status}`);
  }

  const token = extractAuthToken(payload);
  if (!token) {
    throw new Error('sameday_auth_failed:missing_token');
  }

  cachedToken = token;
  tokenRefreshedAtMs = Date.now();
  return token;
}

async function getToken(forceRefresh = false): Promise<string> {
  const tokenAgeMs = Date.now() - tokenRefreshedAtMs;
  const looksStale = tokenAgeMs > 50 * 60 * 1000;

  if (!forceRefresh && cachedToken && !looksStale) {
    return cachedToken;
  }

  return authenticate();
}

export async function samedayRequest<TResponse>(
  path: string,
  init: RequestInit,
  options?: { retryCount?: number }
): Promise<TResponse> {
  const baseUrl = getBaseUrl();
  const retryCount = Number.isFinite(options?.retryCount) ? Math.max(0, Math.floor(options?.retryCount as number)) : DEFAULT_RETRIES;

  let token = await getToken(false);
  for (let attempt = 0; attempt <= retryCount; attempt += 1) {
    const response = await requestWithTimeout(
      normalizeUrl(baseUrl, path),
      {
        ...init,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...(init.headers ?? {})
        }
      },
      DEFAULT_TIMEOUT_MS
    );

    if (response.status === 401 && attempt < retryCount) {
      token = await getToken(true);
      continue;
    }

    if (!response.ok) {
      if (shouldRetry(response.status) && attempt < retryCount) {
        continue;
      }

      const payload = await parseJsonResponse(response);
      throw new Error(`sameday_request_failed:${response.status}:${JSON.stringify(payload).slice(0, 500)}`);
    }

    const payload = (await parseJsonResponse(response)) as TResponse;
    return payload;
  }

  throw new Error('sameday_request_failed:retries_exhausted');
}

function normalizeLockerRow(row: unknown): SamedayLocker | null {
  if (!row || typeof row !== 'object') {
    return null;
  }

  const data = row as JsonRecord;
  const id = asSafeString(data.id ?? data.lockerId ?? data.code);
  const name = asSafeString(data.name ?? data.label ?? data.address);

  if (!id || !name) {
    return null;
  }

  return {
    id,
    name,
    city: asSafeString(data.city) || null,
    address: asSafeString(data.address) || null
  };
}

export async function listSamedayLockers(): Promise<SamedayLocker[]> {
  const payload = await samedayRequest<unknown>(LOCKERS_PATH, {
    method: 'GET'
  });

  const source = Array.isArray(payload)
    ? payload
    : payload && typeof payload === 'object' && Array.isArray((payload as JsonRecord).data)
      ? ((payload as JsonRecord).data as unknown[])
      : [];

  return source
    .map((entry) => normalizeLockerRow(entry))
    .filter((entry): entry is SamedayLocker => Boolean(entry));
}

export function getCreateAwbPath(): string {
  return CREATE_AWB_PATH;
}
