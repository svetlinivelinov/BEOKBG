# Sameday API v3.4 Integration Notes

This file summarizes what was verified from Sameday API v3.4 documentation and what this repository now implements.

## Confirmed from v3.4 docs

- BG production base URL: https://api.sameday.bg
- BG official Swagger and sandbox docs: https://sameday-api-bg.demo.zitec.com/documentation/client
- Locker SDK docs: https://cdn.sameday.ro/locker-plugin/techdoc.html
- Base sandbox example (generic): https://sameday-api.demo.zitec.com
- Authentication endpoint: POST /api/authenticate
- Authentication headers:
  - X-AUTH-USERNAME
  - X-AUTH-PASSWORD
- Optional long-lived token mode: remember_me=1 (controlled via SAMEDAY_AUTH_REMEMBER_ME)
- Auth for subsequent calls:
  - X-AUTH-TOKEN
- Token response includes token and expire_at / expire_at_utc.
- Locker endpoint deprecation note:
  - Deprecated: GET /api/client/lockers
  - Recommended: GET /api/client/ooh-locations
- AWB endpoint: POST /api/awb

## Credential handling (one-time links)

- Access credentials were delivered via one-time Privnote links (live and sandbox).
- Do not commit these credentials or links in repository files.
- Copy values only to local/runtime secret storage (for example .env.local in development, hosting secrets in production).
- After copying, validate by calling auth and one read-only endpoint (/api/client/services or /api/client/ooh-locations).

## Implemented changes in this repo

1. Auth protocol aligned to v3.4
- Updated Sameday auth request to use X-AUTH-USERNAME and X-AUTH-PASSWORD headers.
- Updated authenticated requests to use X-AUTH-TOKEN (removed Bearer Authorization dependency).
- Added token expiry parsing and refresh-before-expiration behavior.

2. OOH/locker endpoint alignment
- Default locker path switched to /api/client/ooh-locations.
- Locker normalization accepts numeric or string OOH IDs and retains city/county IDs, postal code, and address.
- Locker requests filter by `SAMEDAY_COUNTRY_CODE` (default `BG`), use `listingType=0`, and fetch every page reported by the API.
- Duplicate IDs are merged; PUDO rows are excluded from the Easybox list.
- Invalid location responses and pagination fail explicitly rather than returning a success-shaped empty list.

3. AWB payload field mapping toward v3.4
- Request now sends v3.4-style fields such as:
  - pickupPoint
  - packageType
  - packageNumber
  - packageWeight
  - service
  - awbPayment
  - cashOnDelivery
  - insuredValue
  - thirdPartyPickup
  - awbRecipient
  - parcels
- Easybox delivery now includes:
  - oohLastMile
  - oohType=0
- Service selection is resolved by delivery type inside AWB creation. The Stripe webhook no longer overrides the Easybox-specific setting with the generic service ID.

4. Environment template expanded
- Added Sameday variables to .env.example for credentials, endpoints, service IDs, payload defaults, and runtime tuning.

5. Client reliability and regression tests
- Concurrent calls share an in-flight authentication request.
- Tokens with an explicit expiration are reused until the refresh margin; the 50-minute fallback applies only when expiration is unavailable.
- Numeric timezone offsets in token expiry are preserved.
- `SAMEDAY_RETRY_COUNT=0` is respected; invalid retry/timeout settings fail explicitly.
- Only read-only requests retry HTTP failures. AWB POST requests are not automatically replayed, because an ambiguous failure may already have created a shipment.
- Upstream error response bodies are not included in request errors; malformed JSON is rejected.
- Run `npm test` with Node.js 22.18+ (Node.js 24 LTS recommended). Tests use Node's native TypeScript support and mocked HTTP responses; no real authentication, payment, or shipment is performed.

## Implementation sequence

1. **Completed: client/AWB foundations.** Numeric OOH IDs, paginated BG locker loading, service selection, token caching, and safe POST behavior have regression tests.
2. **Next: account and geography discovery.** Verify authenticated response schemas for pickup points/contact persons, enabled services, counties, and cities. The PDF examples for some of these responses are screenshots; do not invent their structure. BG Swagger currently requires authentication.
3. **Complete checkout/order storage.** Validate selected IDs on the server and store authoritative locker name/address and geography; retain AWB cost and tracking metadata.
4. **Shipment recovery and tracking.** Add protected admin actions, durable attempt state and duplicate prevention; implement paginated status sync with persisted cursors and windows of at most two hours. Confirm scheduling and safe retry rules before automatic shipment creation.
5. **Enable Easybox and demonstrate.** Keep the existing Easybox control disabled until its selection/storage flow is completed. Validate address and Easybox shipments against the demo account before enabling production.

Current boundaries: pickup/contact discovery, numeric address geography, full shipment metadata, admin retry, and scheduled tracking are not implemented by the foundation changes. Network/time-out retries for read-only calls are also not implemented. A failed AWB still requires recovery outside the acknowledged Stripe webhook.

## Remaining required data decisions before production

1. County/city authoritative mapping
- v3.4 recommends county/city nomenclature alignment.
- Current checkout flow stores city text but not county ID.
- Action:
  - Decide whether to send county/city IDs from Sameday nomenclature or rely on string fields.
  - If IDs are required by your account rules, extend checkout metadata to capture county and city ID.

2. Easybox selection quality
- Current data model stores locker ID only.
- Action:
  - Optionally persist oohType and locker metadata snapshot to avoid ambiguity when OOH network evolves.

3. Service configuration validation
- Service IDs usually are 7 (home) and 15 (Locker Nextday), but account-specific availability can differ.
- Action:
  - Verify enabled services via GET /api/client/services for this account.
  - Confirm SAMEDAY_SERVICE_ID_ADDRESS and SAMEDAY_SERVICE_ID_EASYBOX values.

4. COD and insurance policy
- Current behavior is env-driven (SAMEDAY_ENABLE_COD).
- Action:
  - Confirm business rule per payment method and destination country.
  - If needed, implement explicit rules in webhook before AWB creation.

5. Status synchronization
- v3.4 provides status-sync endpoints for shipment tracking updates.
- Action:
  - Add a scheduled sync job using /api/client/status-sync (and xb-status-sync for crossborder if needed).

## Suggested rollout checklist

1. Fill Sameday env vars in .env.local.
2. Test auth and OOH endpoint manually through app routes.
3. Place one address and one easybox paid test order in sandbox.
4. Confirm one AWB per Stripe session (idempotency check).
5. Validate logged AWB fields and customer email flow.
6. Verify failure behavior for invalid locker or missing recipient fields.
7. Enable production base URL and production credentials.
