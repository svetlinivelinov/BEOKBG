import fs from 'fs';
import path from 'path';

function loadDotEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  const lines = raw.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const idx = trimmed.indexOf('=');
    if (idx <= 0) {
      continue;
    }

    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim().replace(/^['\"]|['\"]$/g, '');
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`missing_env:${name}`);
  }

  return value;
}

function normalizeUrl(baseUrl, endpointPath) {
  const left = baseUrl.replace(/\/+$/, '');
  const right = endpointPath.startsWith('/') ? endpointPath : `/${endpointPath}`;
  return `${left}${right}`;
}

async function run() {
  const rootDir = process.cwd();
  loadDotEnvFile(path.join(rootDir, '.env.local'));

  const baseUrl = requiredEnv('SAMEDAY_BASE_URL');
  const username = requiredEnv('SAMEDAY_USERNAME');
  const password = requiredEnv('SAMEDAY_PASSWORD');

  const authPath = (process.env.SAMEDAY_AUTH_PATH?.trim() || '/api/authenticate');
  const lockersPath = (process.env.SAMEDAY_LOCKERS_PATH?.trim() || '/api/client/ooh-locations');
  const servicesPath = '/api/client/services';
  const rememberMe = (process.env.SAMEDAY_AUTH_REMEMBER_ME?.trim().toLowerCase() || 'true') !== 'false';
  const authUrl = normalizeUrl(
    baseUrl,
    rememberMe ? `${authPath}${authPath.includes('?') ? '&' : '?'}remember_me=1` : authPath
  );

  const authResponse = await fetch(authUrl, {
    method: 'POST',
    headers: {
      'X-AUTH-USERNAME': username,
      'X-AUTH-PASSWORD': password
    }
  });

  const authText = await authResponse.text();
  let authPayload = null;
  try {
    authPayload = authText ? JSON.parse(authText) : null;
  } catch {
    authPayload = { raw: authText };
  }

  if (!authResponse.ok) {
    throw new Error(`auth_failed:${authResponse.status}:${JSON.stringify(authPayload).slice(0, 400)}`);
  }

  const token = authPayload?.token || authPayload?.accessToken || authPayload?.access_token;
  if (!token || typeof token !== 'string') {
    throw new Error('auth_failed:missing_token');
  }

  const servicesUrl = normalizeUrl(baseUrl, servicesPath);
  const servicesResponse = await fetch(servicesUrl, {
    method: 'GET',
    headers: {
      'X-AUTH-TOKEN': token
    }
  });

  const servicesText = await servicesResponse.text();
  let servicesPayload = null;
  try {
    servicesPayload = servicesText ? JSON.parse(servicesText) : null;
  } catch {
    servicesPayload = { raw: servicesText };
  }

  if (!servicesResponse.ok) {
    throw new Error(`services_failed:${servicesResponse.status}:${JSON.stringify(servicesPayload).slice(0, 400)}`);
  }

  const separator = lockersPath.includes('?') ? '&' : '?';
  const lockersUrl = normalizeUrl(baseUrl, `${lockersPath}${separator}listingType=0&countPerPage=10`);
  const lockersResponse = await fetch(lockersUrl, {
    method: 'GET',
    headers: {
      'X-AUTH-TOKEN': token
    }
  });

  const lockersText = await lockersResponse.text();
  let lockersPayload = null;
  try {
    lockersPayload = lockersText ? JSON.parse(lockersText) : null;
  } catch {
    lockersPayload = { raw: lockersText };
  }

  if (!lockersResponse.ok) {
    throw new Error(`lockers_failed:${lockersResponse.status}:${JSON.stringify(lockersPayload).slice(0, 400)}`);
  }

  const servicesList = Array.isArray(servicesPayload)
    ? servicesPayload
    : (servicesPayload && Array.isArray(servicesPayload.data) ? servicesPayload.data : []);

  const lockersList = Array.isArray(lockersPayload)
    ? lockersPayload
    : (lockersPayload && Array.isArray(lockersPayload.data) ? lockersPayload.data : []);

  const sampleLocker = lockersList[0] || null;

  console.log('Sameday sandbox smoke test OK');
  console.log(`Base URL: ${baseUrl}`);
  console.log(`Token expires at: ${authPayload?.expire_at_utc || authPayload?.expire_at || 'n/a'}`);
  console.log(`Services fetched: ${servicesList.length}`);
  console.log(`OOH locations fetched: ${lockersList.length}`);
  if (sampleLocker && typeof sampleLocker === 'object') {
    const id = sampleLocker.oohId ?? sampleLocker.id ?? 'n/a';
    const name = sampleLocker.name ?? sampleLocker.address ?? 'n/a';
    console.log(`Sample locker: ${id} - ${name}`);
  }
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Sameday sandbox smoke test FAILED: ${message}`);
  process.exit(1);
});
