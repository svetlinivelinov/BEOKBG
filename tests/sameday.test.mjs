import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { test, beforeEach, after } from 'node:test';

// Node's TypeScript runner needs the extension for the app's bundler-style import.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === './samedayClient' && context.parentURL?.endsWith('/samedayCreateAwb.ts')) {
      return nextResolve(`${specifier}.ts`, context);
    }
    return nextResolve(specifier, context);
  }
});

const environment = { ...process.env };
const originalFetch = globalThis.fetch;
Object.assign(process.env, {
  SAMEDAY_BASE_URL: 'https://sameday.invalid',
  SAMEDAY_USERNAME: 'test-user',
  SAMEDAY_PASSWORD: 'test-password',
  SAMEDAY_CLIENT_ID: '123',
  SAMEDAY_PICKUP_POINT_ID: '456',
  SAMEDAY_SERVICE_ID: '7',
  SAMEDAY_SERVICE_ID_ADDRESS: '7',
  SAMEDAY_SERVICE_ID_EASYBOX: '15',
  SAMEDAY_COUNTRY_CODE: 'BG',
  SAMEDAY_RETRY_COUNT: '0',
  SAMEDAY_ENABLE_COD: 'false'
});

const { listSamedayLockers, samedayRequest } = await import('../lib/payments/samedayClient.ts');
const { createSamedayAwb } = await import('../lib/payments/samedayCreateAwb.ts');
let calls;
let respond;
beforeEach(() => {
  calls = [];
  respond = () => Response.json({});
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    if (String(url).includes('/api/authenticate')) {
      return Response.json({ token: 'test-token', expire_at_utc: '2099-01-01 00:00:00' });
    }
    return respond(String(url), init);
  };
});
after(() => {
  globalThis.fetch = originalFetch;
  for (const key of Object.keys(process.env)) {
    if (!(key in environment)) delete process.env[key];
  }
  Object.assign(process.env, environment);
});

test('concurrent requests share one authentication and cache the token', async () => {
  await Promise.all([samedayRequest('/one', {}), samedayRequest('/two', {})]);
  assert.equal(calls.filter(({ url }) => url.includes('/api/authenticate')).length, 1);
  for (const { init } of calls.filter(({ url }) => !url.includes('/api/authenticate'))) {
    assert.equal(init.headers['X-AUTH-TOKEN'], 'test-token');
    assert.equal(init.headers['X-AUTH-PASSWORD'], undefined);
  }
  await samedayRequest('/three', {});
  assert.equal(calls.filter(({ url }) => url.includes('/api/authenticate')).length, 1);
});

test('numeric OOH IDs, geography, all pages, country filter and deduplication', async () => {
  respond = (url) => {
    const parsed = new URL(url);
    const page = Number(parsed.searchParams.get('page'));
    assert.equal(parsed.pathname, '/api/client/ooh-locations');
    assert.equal(parsed.searchParams.get('countryCode'), 'BG');
    assert.equal(parsed.searchParams.get('listingType'), '0');
    return Response.json({
      currentPage: page,
      pages: 2,
      data: page === 1
        ? [{ oohId: 174, name: 'Locker A', cityId: 10, countyId: 20, oohType: 0, postalCode: '1000' }]
        : [{ oohId: '174', name: 'Locker A', oohType: 0 }, { oohId: 175, name: 'Locker B', oohType: 0 },
           { oohId: 500162, name: 'PUDO', oohType: 1 }]
    });
  };
  const lockers = await listSamedayLockers();
  assert.deepEqual(lockers.map(({ id }) => id), ['174', '175']);
  assert.equal(calls.filter(({ url }) => url.includes('ooh-locations')).length, 2);
});

test('locker metadata retains Sameday geographic IDs and address', async () => {
  respond = () => Response.json([{ oohId: 174, name: 'Locker', cityId: 10, countyId: 20,
    city: 'Sofia', county: 'Sofia', address: 'Test address', postalCode: '1000', oohType: '0' }]);
  const [locker] = await listSamedayLockers();
  assert.equal(locker.cityId, '10');
  assert.equal(locker.countyId, '20');
  assert.equal(locker.address, 'Test address');
  assert.equal(locker.postalCode, '1000');
});

test('malformed location results and invalid IDs fail explicitly', async () => {
  for (const payload of [{ unexpected: [] }, [{ oohId: -1, name: 'Invalid' }],
    { currentPage: 1, pages: 0, data: [{ oohId: 1, name: 'Invalid pagination' }] }]) {
    respond = () => Response.json(payload);
    await assert.rejects(listSamedayLockers(), /sameday_invalid_/);
  }
});

test('configured zero retries is respected and upstream error bodies stay private', async () => {
  respond = () => new Response('sensitive upstream response', { status: 503 });
  await assert.rejects(samedayRequest('/test', { method: 'GET' }), /^Error: sameday_request_failed:503$/);
  assert.equal(calls.filter(({ url }) => url.endsWith('/test')).length, 1);
});

test('read-only requests can retry, but AWB POST is never replayed after 5xx', async () => {
  let attempt = 0;
  respond = () => ++attempt === 1 ? new Response('', { status: 503 }) : Response.json({ ok: true });
  assert.deepEqual(await samedayRequest('/test', {}, { retryCount: 1 }), { ok: true });
  attempt = 0;
  await assert.rejects(samedayRequest('/api/awb', { method: 'POST' }, { retryCount: 2 }), /503/);
  assert.equal(attempt, 1);
});

test('invalid JSON does not look like a successful response', async () => {
  respond = () => new Response('not JSON');
  await assert.rejects(samedayRequest('/test', {}), /sameday_invalid_json_response/);
});

test('read-only 401 refreshes authentication once before retrying', async () => {
  let attempt = 0;
  respond = () => ++attempt === 1 ? new Response('', { status: 401 }) : Response.json({ ok: true });
  assert.deepEqual(await samedayRequest('/test', {}, { retryCount: 1 }), { ok: true });
  assert.equal(calls.filter(({ url }) => url.includes('/api/authenticate')).length, 1);
  assert.equal(attempt, 2);
});

test('tokens near expiration are refreshed and offset timestamps are understood', async () => {
  let authentications = 0;
  globalThis.fetch = async (url) => {
    if (String(url).includes('/api/authenticate')) {
      authentications += 1;
      return Response.json({ token: 'expiry-token', expire_at_utc: authentications === 1
        ? new Date(Date.now() + 60_000).toISOString()
        : '2099-01-01T02:00:00+02:00' });
    }
    return Response.json({ ok: true });
  };
  const client = await import('../lib/payments/samedayClient.ts?expiry-test');
  await client.samedayRequest('/test', {});
  await client.samedayRequest('/test', {});
  await client.samedayRequest('/test', {});
  assert.equal(authentications, 2);
});

const recipient = {
  fullName: 'Test Customer', phone: '0000000000', email: 'test@example.invalid',
  addressLine1: 'Test address', city: 'Sofia', postalCode: '1000', lockerId: '174'
};

test('Easybox uses service 15 despite generic service 7; address delivery stays 7', async () => {
  const payloads = [];
  respond = (_url, init) => {
    payloads.push(JSON.parse(init.body));
    return Response.json({ awbNumber: 'TEST-AWB' });
  };
  for (const deliveryType of ['easybox', 'address']) {
    const result = await createSamedayAwb({ clientId: '123', pickupId: '456',
      deliveryType, recipient, codAmountEur: null });
    assert.equal(result.awbNumber, 'TEST-AWB');
  }
  assert.equal(payloads[0].service, 15);
  assert.equal(payloads[0].oohLastMile, 174);
  assert.equal(payloads[0].oohType, 0);
  assert.equal(payloads[1].service, 7);
  assert.equal(payloads[1].oohLastMile, undefined);
});

test('invalid Easybox ID fails before creating an AWB', async () => {
  await assert.rejects(createSamedayAwb({ clientId: '123', pickupId: '456',
    deliveryType: 'easybox', recipient: { ...recipient, lockerId: 'invalid' }, codAmountEur: null }),
  /missing_locker_id/);
  assert.equal(calls.length, 0);
});

test('missing Easybox override defaults to service 15, not the home service', async () => {
  const saved = process.env.SAMEDAY_SERVICE_ID_EASYBOX;
  delete process.env.SAMEDAY_SERVICE_ID_EASYBOX;
  let payload;
  respond = (_url, init) => {
    payload = JSON.parse(init.body);
    return Response.json({ awbNumber: 'TEST-AWB' });
  };
  try {
    await createSamedayAwb({ clientId: '123', pickupId: '456', deliveryType: 'easybox',
      recipient, codAmountEur: null });
    assert.equal(payload.service, 15);
  } finally {
    process.env.SAMEDAY_SERVICE_ID_EASYBOX = saved;
  }
});
