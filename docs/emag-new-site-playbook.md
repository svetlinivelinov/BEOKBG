# eMAG integration playbook (for a new site)

This is the short path to a working eMAG Marketplace product push, written after the first integration
(BEOKBG) took far longer than it should. Follow the sections in order. Most of the pain came from guessing
values that must be **read from eMAG first**, and from settings that exist in two places (code and hosting).

Reference docs: [emag-integration.md](./emag-integration.md) (routes and environment variables),
[emag-extra-product-information.md](./emag-extra-product-information.md) (characteristics),
[emag-relay-contabo-railway-powershell.md](./emag-relay-contabo-railway-powershell.md) (fixed outgoing IP).
The API specification is `eMAG-Marketplace-API-documentation-v4.4.8.docx` (and `openapi.json`, which is a
derived copy and is not always identical to the official document).

---

## 1. The 10 rules that would have saved days

1. **Every ID comes from eMAG, never from a guess.** `vat_id`, `category_id`, family type, characteristic
   values are all account- or category-specific. Read them (section 3), do not assume.
2. **`vat_id` is an internal ID, not a percentage.** On our account `6` = 20%, `7` = 0%, `8` = 9%. Sending
   `20`, `1`, `0` or `0.2` all fail.
3. **`images` must be objects**, not strings: `[{ "display_type": 1, "url": "https://..." }]`
   (1 = main, 2 = secondary). Strings produce "Product image url should not be empty".
4. **Prices are sent without VAT.** Convert the shop's gross price (`gross / 1.2` for 20%). eMAG shows the
   VAT-inclusive price in the panel, rounded to 2 decimals.
5. **Characteristics are restrictive.** Mandatory ones must use a value from the category's allowed list.
6. **A seller product ID is permanent.** It is an integer (1 to 16777215) and is the key of the offer.
   Never change or reuse it. See section 4.
7. **Part numbers are unique per seller.** A second product with the same `part_number` is rejected.
8. **A batch can be partly successful.** eMAG saves the valid offers even when it rejects others, so read
   the per-product errors, not only the overall status.
9. **A setting in the hosting environment beats the code default.** Stale variables in Railway silently
   overrode corrected code for hours. After changing a default, delete the old variable.
10. **Test with one product first**, read it back from eMAG, then push the rest.

---

## 2. Before writing any code

### 2.1 Access
- The API user needs **API rights**, and the **outgoing IP must be whitelisted** by eMAG. Calls from any other
  IP fail with `ERROR: Invalid vendor ip [x.x.x.x]`. Railway has no fixed IP, so use the relay on a VPS with a
  fixed address (see the relay document) and set `EMAG_BASE_URL` to it.
- Base URL for Bulgaria: `https://marketplace-api.emag.bg/api-3`.
- Auth is HTTP Basic (`username:password`). Keep both in the hosting environment only.

### 2.2 Decide and collect (from the eMAG panel and the API)
| Item | Where to get it |
|---|---|
| VAT IDs | `POST /vat/read` (our helper: `/api/emag/vat-options`) |
| Category ID per product type | the category dropdown shows `... [ID]`, or `POST /category/read` (helper: `/api/emag/category-search`) |
| Is the category allowed for you | `is_allowed = 1` in `category/read`; otherwise request access in the panel |
| Mandatory characteristics and allowed values | `POST /category/read` with `{ "id": <category> }` (helper: `/api/emag/category-characteristics`) |
| Family type ID (colour variants) | same response, `family_types` |
| EAN mandatory / warranty mandatory | same response, `is_ean_mandatory`, `is_warranty_mandatory` |
| Brand spelling | one exact spelling, used for every product. Do not mix Latin and Cyrillic look-alike letters |
| GPSR data | manufacturer and EU responsible person: name, address, email each (all three required) |
| Naming standard | link next to the product name field in the panel |
| Warehouse ID | normally `1` |

### 2.3 Rate limits
Orders 12 requests per second, everything else 3 per second. The client throttles by itself.

---

## 3. Read the values from eMAG (do this first)

Helper routes of this repository (all protected by the admin token, all read-only):

| Route | Use |
|---|---|
| `GET /api/emag/vat-options` | VAT IDs. Returns `attempts[].rawResultsPreview` so you see eMAG's raw answer |
| `GET /api/emag/category-search?q=word1,word2` | find category IDs by name (it scans all pages) |
| `GET /api/emag/category-characteristics?id=<category>` | mandatory characteristics, allowed values, family types |
| `GET /api/emag/offer-vat-samples?limit=100` | read back offers stored on eMAG (category, VAT, price, validation) |
| `GET /api/emag/sync-products?id=<local id>` | preview the exact payload for one product, sends nothing |

Pass the token as `?token=...` or the `x-admin-token` header.

Note: the eMAG field names differ from what you might expect. In `vat/read` the identifier is `vat_id` and
the rate is `vat_rate`, not `id` and `value`. Always look at the raw response.

---

## 4. Product IDs

- Seller IDs are integers. Use a **sequential, committed table**: `data/products/emag-product-ids.json`
  (local product id to number). Append new products with the next free number. Do not renumber.
- Manual products created in the panel take the lowest free numbers (1, 2, 3, ...). If you delete them, the
  numbers are not reused automatically, so start the API products above them.
- Lookup order in the code: `EMAG_PRODUCT_ID_MAP_JSON` (environment), then the file, then a hash of the SKU.
- Two products with one ID make the sync fail on purpose, instead of overwriting each other.
- If a product already exists on eMAG with the same part number (for example a manual test offer), map your
  local product **to that existing ID** instead of creating a second one.

---

## 5. Payload rules that matter

From the v4.4.8 document, `product_offer/save`:

- Body is `{ "data": [ ... ] }`, at most 50 offers per call. Read calls send filters at the top level.
- Required for a new product: `id`, `category_id`, `name`, `part_number`, `brand`, `status`, `sale_price`,
  `min_sale_price`, `max_sale_price`, `vat_id`, `stock`, `handling_time`. `ean` is required where the category
  says so. `warranty` only where mandatory.
- `part_number` is the manufacturer code (max 25 characters). The **name** must describe the product, for
  example "Термостат за електрическо подово отопление", not the model code.
- `ean` is an array of strings. Prices are decimals with up to 4 decimals.
- `currency_type` only if it differs from the marketplace currency.
- `manufacturer` and `eu_representative` are arrays of `{ name, address, email }` (GPSR). Incomplete entries
  are invalid, so omit them rather than sending half.
- Dimensions go to `POST /measurements/save` (millimetres and grams), a separate call. Send real values.
- Some categories do not support RRP (`rrp_guidelines` in the offer says so). Then `recommended_price` is
  ignored.
- Images: public HTTPS JPG or PNG, up to 6000 x 6000 px and 8 MB. eMAG downloads them later, so a
  placeholder thumbnail for a few minutes is normal.
- Characteristic 5401 (colour) and family: only send values you know exist in the allowed list.

Changing a product's category later worked for products you own (`ownership: true`): re-pushing with the
new `category_id` moved the offers.

---

## 6. Environment variables

Names only, values are set in the hosting environment (Railway). Full descriptions are in
[emag-integration.md](./emag-integration.md).

Required: `EMAG_USERNAME`, `EMAG_PASSWORD`, `EMAG_BASE_URL`, `EMAG_VAT_ID`, `EMAG_WAREHOUSE_ID`,
`EMAG_PUBLIC_SITE_URL`, `ADMIN_ORDERS_TOKEN` (or `EMAG_ADMIN_TOKEN`).

Required for compliance: `EMAG_MANUFACTURER_JSON`, `EMAG_EU_REPRESENTATIVE_JSON`.

Optional overrides: `EMAG_CATEGORY_MAP_JSON`, `EMAG_CHARACTERISTICS_MAP_JSON`, `EMAG_NAME_BY_APPLICATION_JSON`,
`EMAG_NAME_BY_CATEGORY_JSON`, `EMAG_BRAND`, `EMAG_PRICE_VAT_RATE`, `EMAG_PRODUCT_ID_MAP_JSON`,
`EMAG_RELAY_SHARED_SECRET`, `EMAG_WEBHOOK_ALLOWED_IPS`.

**Do not set an override unless you need one.** `EMAG_CATEGORY_MAP_JSON` and `EMAG_CATEGORY_ID_DEFAULT` took
priority over the code defaults and kept pushing products into a wrong category after the code was fixed.

---

## 7. Error message to cause

| eMAG message | Real cause |
|---|---|
| `Invalid vendor ip [x]` | calling IP is not whitelisted. Use the fixed-IP relay |
| `Product image url should not be empty` | `images` sent as plain strings. Use `{display_type, url}` objects |
| `Invalid vat_id` and `The VAT value must be in accordance with the delivery country VAT rates` | wrong `vat_id` (a percentage or a guess). Read `vat/read` |
| `Vat id should be a positive integer` | `vat_id` became `0` (for example `0.2` or empty) |
| `Product category_id is invalid` and `no access to category (0)` | category resolved to `0`: unmapped product type, or a stale environment override |
| `You already hold a Product associated with this PN:` | duplicate `part_number`. Map to the existing seller ID |
| `RRP not supported in this category` (offer field) | not an error, the category has no RRP |
| `401 unauthorized` from our own routes | admin token differs between the local file and the hosting environment |
| overall `failed` but offers exist on eMAG | batch with some rejected products. Read per-product errors |

---

## 8. Recommended order of work

1. Get API rights and the IP whitelist working. Test with `vat/read`.
2. Read VAT IDs, category IDs, mandatory characteristics, family type (section 3).
3. Fill the ID table, category defaults, characteristic defaults, names, brand, GPSR variables.
4. Deploy. Delete any old category variables in the hosting environment.
5. Preview the payload of one product (`GET /api/emag/sync-products?id=...`) and check it against section 5.
6. Push **one** product (`POST /api/emag/sync-products` with `{"ids":["..."]}`).
7. Read it back with `offer-vat-samples`: category, VAT, price, name, brand, characteristics, images,
   validation status, GPSR.
8. Push a second product of another category, then the rest in groups.
9. Update real dimensions, then orders and webhook (see the main document).

Price updates later: change the price in the source file, re-run the import, deploy, then use **Sync Products**
(it sends the price too). The separate "Update Price" route sends only id and price and does not satisfy the
mandatory fields of an offer update, so verify it before relying on it.

---

## 9. After the push

- eMAG keeps new products in documentation status **Draft** until the documentation is complete, then moves
  them to validation. We observed a manually completed product move on to "validation pending" while
  API-created ones stayed in Draft. The exact trigger is not confirmed. Open one product in the panel and see
  what it lists as missing.
- Check the product in the panel for the price (VAT-inclusive, 2 decimals), the category, characteristics and
  thumbnails.
- Remove test products from the panel so they do not collide on part numbers.

---

## 10. Security and project hygiene

- Never commit `.env*` files. Passwords and tokens must stay in the hosting environment.
- Secrets pasted into chats or tickets must be rotated afterwards (API password, admin token).
- GPSR data contains personal contact details. Keep it in environment variables, not in the repository.
- Keep the repository outside OneDrive-style synced folders if possible. During this work tracked files
  (`package.json`, `openapi.json`) disappeared from the working tree once and had to be restored from git.
- Run the build (`npm run build`) and the tests (`npm test`) before each commit.

---

## 11. Known open items from the first integration

- Why API-created offers stay in `Draft` while a manually completed one moved to validation (see section 9).
- Real dimensions and weight per model (placeholders are sent until configured).
- Whether an exact VAT-inclusive price (for example 54.99) can be reached, since eMAG stores the ex-VAT price
  with the panel rounding to 2 decimals.
