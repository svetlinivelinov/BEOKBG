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
- Locker normalization now supports oohId and oohType fields.
- Locker request now uses listingType and countPerPage query params.

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

4. Environment template expanded
- Added Sameday variables to .env.example for credentials, endpoints, service IDs, payload defaults, and runtime tuning.

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
