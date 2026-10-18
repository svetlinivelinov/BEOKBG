type JsonRecord = Record<string, unknown>;

type AuthTokenPayload = {
  token?: string;
  accessToken?: string;
  access_token?: string;
  expire_at?: string;
  expire_at_utc?: string;
};

export type SamedayLocker = {
  id: string;
  name: string;
  city?: string | null;
  address?: string | null;
  cityId?: string | null;
  county?: string | null;
  countyId?: string | null;
  postalCode?: string | null;
  oohType?: number | null;
  supportedPayment?: number | null;
};

const AUTH_PATH = process.env.SAMEDAY_AUTH_PATH?.trim() || '/api/authenticate';
const LOCKERS_PATH = process.env.SAMEDAY_LOCKERS_PATH?.trim() || '/api/client/ooh-locations';
const CREATE_AWB_PATH = process.env.SAMEDAY_AWB_PATH?.trim() || '/api/awb';
const DEFAULT_TIMEOUT_MS = readIntegerSetting('SAMEDAY_REQUEST_TIMEOUT_MS', 12000, 1);
const DEFAULT_RETRIES = readIntegerSetting('SAMEDAY_RETRY_COUNT', 2, 0);
const COUNTRY_CODE = process.env.SAMEDAY_COUNTRY_CODE?.trim() || 'BG';
const AUTH_REMEMBER_ME = process.env.SAMEDAY_AUTH_REMEMBER_ME?.trim()?.toLowerCase() !== 'false';

let cachedToken: string | null = null;
let tokenRefreshedAtMs = 0;
let tokenExpiresAtMs: number | null = null;
let authenticationPromise: Promise<string> | null = null;

function readIntegerSetting(name: string, fallback: number, minimum: number): number {
  const value = process.env[name]?.trim();
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < minimum) {
    throw new Error(`sameday_invalid_setting:${name.toLowerCase()}`);
  }
  return parsed;
}

function asSafeId(value: unknown): string {
  const text = typeof value === 'number' ? String(value) : asSafeString(value);
  return /^\d+$/.test(text) && Number.isSafeInteger(Number(text)) && Number(text) > 0 ? text : '';
}

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

function asSafeNumber(value: unknown): number | null {
  const number = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN;
  if (!Number.isFinite(number)) {
    return null;
  }

  return number;
}

function extractAuthToken(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const data = payload as AuthTokenPayload;
  const token = asSafeString(data.token ?? data.accessToken ?? data.access_token);
  return token || null;
}

function extractTokenExpiry(payload: unknown): number | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const data = payload as AuthTokenPayload;
  const candidates = [data.expire_at_utc, data.expire_at];
  for (const candidate of candidates) {
    const value = asSafeString(candidate);
    if (!value) {
      continue;
    }

    const normalized = value.includes('T') ? value : value.replace(' ', 'T');
    const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(normalized);
    const timestamp = Date.parse(hasTimezone ? normalized : `${normalized}Z`);
    if (Number.isFinite(timestamp)) {
      return timestamp;
    }
  }

  return null;
}

async function parseJsonResponse(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text.trim()) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error('sameday_invalid_json_response');
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

  const authPath = AUTH_REMEMBER_ME
    ? `${AUTH_PATH}${AUTH_PATH.includes('?') ? '&' : '?'}remember_me=1`
    : AUTH_PATH;
  const url = normalizeUrl(baseUrl, authPath);
  const response = await requestWithTimeout(
    url,
    {
      method: 'POST',
      headers: {
        'X-AUTH-USERNAME': username,
        'X-AUTH-PASSWORD': password
      }
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
  tokenExpiresAtMs = extractTokenExpiry(payload);
  return token;
}

async function getToken(forceRefresh = false): Promise<string> {
  const now = Date.now();
  const tokenAgeMs = now - tokenRefreshedAtMs;
  const looksStale = tokenExpiresAtMs === null && tokenAgeMs > 50 * 60 * 1000;
  const expiresSoon = typeof tokenExpiresAtMs === 'number' && tokenExpiresAtMs - now <= 10 * 60 * 1000;

  if (!forceRefresh && cachedToken && !looksStale && !expiresSoon) {
    return cachedToken;
  }

  if (!authenticationPromise) {
    authenticationPromise = authenticate().finally(() => {
      authenticationPromise = null;
    });
  }
  return authenticationPromise;
}

export async function samedayRequest<TResponse>(
  path: string,
  init: RequestInit,
  options?: { retryCount?: number }
): Promise<TResponse> {
  const baseUrl = getBaseUrl();
  const method = (init.method ?? 'GET').toUpperCase();
  const isReadOnly = method === 'GET' || method === 'HEAD';
  const configuredRetries = options?.retryCount ?? DEFAULT_RETRIES;
  if (!Number.isSafeInteger(configuredRetries) || configuredRetries < 0) {
    throw new Error('sameday_invalid_retry_count');
  }
  // A failed AWB POST may already have created a shipment; do not replay it.
  const retryCount = isReadOnly ? configuredRetries : 0;

  let token = await getToken(false);
  for (let attempt = 0; attempt <= retryCount; attempt += 1) {
    const response = await requestWithTimeout(
      normalizeUrl(baseUrl, path),
      {
        ...init,
        headers: {
          'X-AUTH-TOKEN': token,
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

      throw new Error(`sameday_request_failed:${response.status}`);
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
  const id = asSafeId(data.oohId ?? data.id ?? data.lockerId ?? data.code);
  const name = asSafeString(data.name ?? data.label ?? data.address);

  if (!id || !name) {
    return null;
  }

  return {
    id,
    name,
    city: asSafeString(data.city) || null,
    address: asSafeString(data.address) || null,
    cityId: asSafeId(data.cityId) || null,
    county: asSafeString(data.county) || null,
    countyId: asSafeId(data.countyId) || null,
    postalCode: asSafeString(data.postalCode) || null,
    oohType: asSafeNumber(data.oohType),
    supportedPayment: asSafeNumber(data.supportedPayment)
  };
}

export async function listSamedayLockers(): Promise<SamedayLocker[]> {
  if (!['BG', 'RO', 'HU'].includes(COUNTRY_CODE)) {
    throw new Error('sameday_invalid_country_code');
  }

  const lockers = new Map<string, SamedayLocker>();
  let page = 1;
  let pages = 1;
  do {
    const url = new URL(normalizeUrl(getBaseUrl(), LOCKERS_PATH));
    url.searchParams.set('listingType', '0');
    url.searchParams.set('countPerPage', '500');
    url.searchParams.set('countryCode', COUNTRY_CODE);
    url.searchParams.set('page', String(page));
    const payload = await samedayRequest<unknown>(`${url.pathname}${url.search}`, { method: 'GET' });
    const data = payload && typeof payload === 'object' && !Array.isArray(payload) ? payload as JsonRecord : null;
    const rows = Array.isArray(payload) ? payload : data?.data;
    if (!Array.isArray(rows)) {
      throw new Error('sameday_invalid_locations_response');
    }

    if (data) {
      const pageCount = asSafeNumber(data.pages);
      const currentPage = asSafeNumber(data.currentPage);
      if (pageCount === null || !Number.isSafeInteger(pageCount) || pageCount < 0 ||
          currentPage !== page || (pageCount === 0 && rows.length > 0) ||
          (page > 1 && pageCount !== pages)) {
        throw new Error('sameday_invalid_locations_pagination');
      }
      pages = pageCount;
    }

    for (const row of rows) {
      const locker = normalizeLockerRow(row);
      if (!locker) {
        throw new Error('sameday_invalid_location');
      }
      if (locker.oohType !== null && locker.oohType !== 0) {
        continue;
      }
      lockers.set(locker.id, locker);
    }
    page += 1;
  } while (page <= pages);

  return [...lockers.values()];
}

export function getCreateAwbPath(): string {
  return CREATE_AWB_PATH;
}
