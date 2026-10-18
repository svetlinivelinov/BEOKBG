# Sameday Integration Audit Checklist for Next.js

## Goal

Verify that the Sameday integration for beoksmart.com follows Sameday API v3.4 best practices and supports production-ready Easybox delivery.

The implementation should NOT use WooCommerce plugins or third-party bridges. It should communicate directly with the Sameday REST API.

---

# Required Architecture

Expected flow:

Customer Checkout
↓
Next.js API Route / Backend
↓
Sameday REST API
↓
AWB Generation
↓
Order Update

Sameday credentials must never be exposed to the browser.

---

# Authentication

Questions:

1. Is authentication implemented through:

POST /api/authenticate

using:

- X-AUTH-USERNAME
- X-AUTH-PASSWORD

2. Is the authentication token cached and reused until expiration?

3. Is token refresh performed automatically before expiration?

4. Is the frontend prevented from accessing raw Sameday credentials?

Expected result:

✅ Backend-only authentication.

❌ Authentication executed directly from browser.

---

# OOH Locations (Easybox / PUDO)

Questions:

1. Are OOH locations loaded through:

GET /api/client/ooh-locations

2. Is the deprecated endpoint avoided?

GET /api/client/lockers

3. Is the selected Easybox saved with its oohId?

Expected result:

✅ Uses ooh-locations.

❌ Uses old lockers endpoint.

---

# Checkout Integration

Questions:

1. Can the customer choose:

- Courier Delivery
- Easybox Delivery
- PUDO Point Delivery (optional)

2. Does the checkout store:

- delivery type
- oohId
- Easybox name
- Easybox address

3. Is Easybox selection mandatory before order completion?

Expected result:

Selected locker is stored in Order data.

---

# Pickup Points

Questions:

1. Is pickup point information loaded through:

GET /api/client/pickup-points

2. Are pickupPoint IDs cached locally?

3. Are contactPerson IDs cached locally?

Expected result:

No hardcoded values.

---

# AWB Creation

Questions:

1. Where is the AWB generated?

Expected answer:

Server-side only.

2. Which endpoint is used?

POST /api/awb

3. For Easybox delivery, is the payload similar to:

```json
{
  "service": "15",
  "pickupPoint": "XXX",
  "contactPerson": "XXX",
  "oohLastMile": "174"
}
```

4. Is service 15 used for Easybox deliveries?

5. Is oohLastMile populated with the selected locker ID?

Expected result:

✅ service=15
✅ oohLastMile present

❌ Hardcoded values
❌ Missing Easybox ID

=================================================================
Geographic Data

Questions:

Are county IDs retrieved from:

GET /api/geolocation/county

Are city IDs retrieved from:

GET /api/geolocation/city

Are Sameday IDs used instead of free-text names?

Expected result:

✅ Numeric Sameday IDs

❌ Text-only city names

Order Storage

Questions:

Are the following fields saved to the order?
AWB Number
AWB Cost
Delivery Type
Easybox ID
Easybox Name
Tracking URL
Can an administrator regenerate an AWB if needed?

Expected result:

Order contains full shipment metadata.

Shipment Tracking

Questions:

Is tracking implemented through:

GET /api/client/status-sync

Is status synchronization automated?

How often is shipment status refreshed?

Expected result:

Order status reflects current Sameday status.

Error Handling

Questions:

What happens when Sameday API is unavailable?

What happens when token generation fails?

What happens when AWB creation fails?

Are failed requests logged?

Expected result:

Graceful recovery with proper logging.

Security Requirements

Verify:

No Sameday credentials exposed in browser
No Sameday secret values in frontend bundles
API calls routed through backend
Secrets stored in environment variables
Proper error handling without exposing credentials

Expected result:

Production-safe implementation.

Final Demonstration Required

Request the developer to show:

Authentication code
Locker loading code
Easybox selection flow
AWB creation payload
Order database structure
Example order with generated AWB
Example tracking update

The developer should be able to provide an actual payload example sent to Sameday API.

Example:

JSON
{
"service": "15",
"pickupPoint": "123",
"contactPerson": "1",
"oohLastMile": "174",
"awbRecipient": {
"name": "Customer Name",
"phoneNumber": "0888123456",
"email": "customer@example.com"
}
}