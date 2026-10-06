PROJECT: BEOKSMART / BEOKBG
FRAMEWORK: Next.js 15 + TypeScript
GOAL: Integrate eMAG Marketplace API v4.5.2

Context:

- Online store: https://www.beoksmart.com
- Repository: BEOKBG
- Product source: data/products.json
- Products are stored as JSON objects containing:
  id
  model
  category
  image/images
  application
  currency
  finalPriceEur
  sourceUrls

Objective:

Create a complete eMAG Marketplace integration.

Requirements:

1. Create a reusable eMAG API client.

File:
lib/emag-client.ts

Features:
- Basic authentication
- Environment variables:
  EMAG_USERNAME
  EMAG_PASSWORD
  EMAG_BASE_URL
- Error handling
- Request logging
- Rate limit protection

2. Create product mapper.

File:
lib/emag-product-mapper.ts

Convert products from:
data/products.json

To eMAG API product structure.

Mapping:

model -> name
finalPriceEur -> sale_price
image/images -> images
category -> eMAG category
id -> seller product code

Generate placeholders for:
ean
brand
description
stock
weight
width
height
length

if missing.

3. Create API route:

app/api/emag/sync-products/route.ts

Features:
- Read all products from products.json
- Transform to eMAG format
- Send products to eMAG
- Return sync report

4. Create API route:

app/api/emag/update-stock/route.ts

Features:
- Update stock only

5. Create API route:

app/api/emag/update-price/route.ts

Features:
- Update price only

6. Create API route:

app/api/emag/orders/route.ts

Features:
- Read new orders from eMAG
- Save orders in local database

7. Create webhook route:

app/api/emag/webhook/route.ts

Handle:
- New order
- Order status updates
- Return requests

8. Create TypeScript interfaces:

types/emag.ts

Include:
Product
Offer
Order
StockUpdate
PriceUpdate

9. Create admin page:

app/admin/emag/page.tsx

Functions:
- Sync all products
- Update stock
- Update prices
- Show sync status
- Show API errors

10. Create documentation:

docs/emag-integration.md

Include:
- Environment variables
- Setup instructions
- API flow diagrams
- Troubleshooting

Important:

Use eMAG Marketplace API v4.5.2.
Keep code fully typed with TypeScript.
Use async/await.
Use App Router architecture.
Follow Next.js best practices.
Generate production-ready code.
