# Copilot Implementation Instructions
## Stripe Checkout + Sameday (UNNO) AWB Flow
### Author: Svetlin

## Goal
Build a production-ready integration where paid Stripe orders automatically create Sameday AWB, supporting two delivery modes:

- Home address delivery
- Easybox locker delivery

The generated code must be modular, typed, testable, and consistent with this repository.

## Hard Constraints (must follow)
- Keep current Next.js App Router architecture.
- Do not invent a new /src structure.
- Do not replace Stripe with another provider.
- Do not propose another courier.
- Do not break existing checkout behavior.
- Use TypeScript for new server code in this repo.

## Repository-aligned file map
Use these locations unless explicitly requested otherwise:

- [app/api/checkout/session/route.ts](app/api/checkout/session/route.ts): create Stripe Checkout Session
- [app/api/checkout/webhook/route.ts](app/api/checkout/webhook/route.ts): handle Stripe webhook
- [lib/payments](lib/payments): order and payment helpers
- [lib/db](lib/db): persistence helpers
- [components/cart](components/cart): cart/checkout client UX
- [data/products/products.json](data/products/products.json): catalog and price data

For new Sameday logic, prefer:

- [lib/payments/samedayClient.ts](lib/payments/samedayClient.ts)
- [lib/payments/samedayCreateAwb.ts](lib/payments/samedayCreateAwb.ts)
- [app/api/sameday/lockers/route.ts](app/api/sameday/lockers/route.ts)

## End-to-end workflow
1. Customer completes cart and selects delivery type (address or easybox).
2. Session endpoint creates Stripe Checkout Session and stores delivery metadata linked to sessionId.
3. Stripe sends checkout.session.completed to webhook.
4. Webhook verifies signature, resolves stored delivery data, and calls Sameday API.
5. AWB result is persisted and customer confirmation email is sent.
6. Flow is idempotent: duplicate webhook events must not create duplicate AWB.

## Delivery input contract
Required common fields:

- fullName
- phone
- email
- deliveryType (address | easybox)

If deliveryType is address, require:

- addressLine1
- city
- postalCode

If deliveryType is easybox, require:

- lockerId

Validation rules:

- Trim all text inputs.
- Reject empty required fields.
- Normalize phone and postal code formats.
- Return structured 400 errors for invalid payloads.

## Stripe session requirements
When creating session:

- Use product prices from trusted server-side data.
- Do not trust client-side price totals.
- Store locale + delivery metadata reference in session metadata.
- Return session URL and sessionId.

## Webhook requirements
Webhook must:

- Verify Stripe signature using STRIPE_WEBHOOK_SECRET.
- Process only checkout.session.completed.
- Be idempotent by sessionId and eventId.
- Persist raw Sameday request/response excerpts needed for support.
- Update order record with AWB number/status.
- Log failures with actionable context, without leaking secrets.

## Sameday client requirements
Implement a reusable API client with:

- Auth/login token management
- Automatic token refresh when needed
- Timeout + retry for transient errors (429/5xx)
- Typed request/response models
- Clear error mapping (auth, validation, upstream, network)

## AWB payload behavior
AWB creation must:

- Use recipient address fields for address delivery
- Use lockerId for easybox delivery
- Include COD block only when business rule requires COD
- Include parcel dimensions/weight from configurable defaults

## Data persistence requirements
Persist at minimum:

- sessionId
- paymentIntentId (if available)
- deliveryType
- recipient snapshot
- lockerId or address snapshot
- AWB number
- AWB status
- createdAt/updatedAt

If a table/schema is changed, provide migration-safe logic for existing rows.

## Error handling and observability
- Return stable machine-readable error codes.
- Log with event names and identifiers (sessionId, orderId).
- Never log secret keys, tokens, or full card/payment sensitive data.
- Separate user-facing messages from internal diagnostics.

## Security rules
- Secrets only from environment variables.
- Verify all external webhook signatures.
- Validate and sanitize all inbound JSON.
- Keep least-privilege access to DB and API credentials.

## Environment variables
Expected variables:

- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET
- SAMEDAY_BASE_URL
- SAMEDAY_USERNAME
- SAMEDAY_PASSWORD
- SAMEDAY_CLIENT_ID
- SAMEDAY_SERVICE_ID
- SAMEDAY_PICKUP_POINT_ID

Optional:

- SAMEDAY_REQUEST_TIMEOUT_MS
- SAMEDAY_RETRY_COUNT

## Code quality standards
- Use async/await.
- Keep functions small and single-purpose.
- Prefer pure utility functions for parsing/validation.
- Add short comments only where intent is not obvious.
- Preserve existing coding style and naming conventions in this repo.

## Acceptance criteria
Implementation is complete only if:

- Checkout session creation still works with current cart flow.
- Webhook creates exactly one AWB per paid session.
- Both delivery types (address/easybox) are supported end-to-end.
- Failures are recoverable and visible in logs.
- TypeScript build passes with no new type errors.

## Copilot execution mode for this project
When asked to implement this flow, Copilot should:

1. Read existing checkout and webhook routes first.
2. Reuse existing order/inventory helpers where possible.
3. Add minimal new files needed for Sameday integration.
4. Update code incrementally and validate after each change.
5. Avoid architectural rewrites unless explicitly requested.