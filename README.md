# BEOKBG

BEOKBG is a bilingual (BG/EN) product catalog site for thermostat and heating-control products, built with Next.js App Router, TypeScript, and Tailwind CSS.

## Current Scope
- App Router architecture with locale segment routing under /app/[locale]
- Bulgarian and English UI dictionaries under /locales
- Product catalog rendered from JSON data under /data/products
- Product detail pages with localized descriptions and technical data
- Category filter and application filter (electric, water, gas-boiler)
- Query-preserving language switcher (keeps active filters on locale change)
- Local host lifecycle scripts (start/stop with PID tracking)

## What Is Implemented
- Routing
	- /bg, /en
	- /[locale]/products
	- /[locale]/products/[id]
	- /[locale]/categories
- Localization
	- Dictionary loading from /locales/bg.json and /locales/en.json
	- Locale-aware category labels
	- Product content overlay by locale with English fallback
- Product UX
	- Category sidebar filtering
	- Application sub-filter for thermostat categories
	- Single-open description accordion in product cards
	- Shared layout container and improved accessibility attributes
- SEO metadata
	- Rich page metadata for locale home, categories, products list, and product detail pages
	- Canonical and language alternates for BG/EN catalog routes

## Data Model
- Base product metadata: /data/products/products.json
	- id, model, category, application, image, sourceUrls, sourceNote
- Localized overlays:
	- /data/products/content.en.json
	- /data/products/content.bg.json
- Merge behavior
	- English overlay is the fallback source of truth
	- Missing localized fields fall back to English automatically

## Project Structure
- /app - App Router pages and layouts
- /components - reusable UI components
- /lib/i18n - locale config, dictionary loader, dictionary types
- /lib/products - product loaders, types, application helpers
- /data/products - product metadata and localized content
- /archive/pages-legacy-2026-08-05 - archived Pages Router files
- /scripts - local host start/stop PowerShell scripts

## Local Development
1. Clone and install
	 - git clone https://github.com/svetlinivelinov/BEOKBG.git
	 - cd BEOKBG
	 - npm install
2. Configure site URL
	 - Set NEXT_PUBLIC_SITE_URL to your public site origin.
	 - Example (PowerShell): $env:NEXT_PUBLIC_SITE_URL="https://your-domain.example"
3. Start dev server
	 - npm run dev
4. Optional host scripts
	 - npm run host:start
	 - npm run host:stop

Production note:
- NEXT_PUBLIC_SITE_URL is required in production. Build/runtime will throw if it is missing or invalid to prevent incorrect SEO URLs (for example localhost canonicals or sitemap links).

## Scripts
- npm run dev - start Next.js dev server
- npm run build - create production build
- npm run start - run production server
- npm run host:start - start host in background and save PID to .host.pid
- npm run host:stop - stop host process from .host.pid
- npm run prices:import -- --file "<path-to-excel.xlsx>" - import EUR prices/margins into /data/products/products.json

## Environment Variables
Create local or platform environment values from .env.example:
- NEXT_PUBLIC_SITE_URL - required in production (example: https://beoksmart.com)
- FACTORY_ORDER_EMAIL - optional, used for factory reorder mailto links

For Railway production:
1. Open project Variables.
2. Add NEXT_PUBLIC_SITE_URL=https://beoksmart.com
3. Optionally add FACTORY_ORDER_EMAIL.
4. Redeploy after saving variables.

## Domain Go-Live (Railway + Porkbun)
1. In Railway, add both domains:
	- beoksmart.com
	- www.beoksmart.com
2. In Porkbun DNS, create exactly the records Railway shows.
3. Keep one canonical host via NEXT_PUBLIC_SITE_URL.
4. Wait for certificate issuance and DNS propagation.

Notes:
- Production requests to the alternate host (www or apex) are redirected with HTTP 308 to the canonical host using middleware.
- Preview and provider domains are left unchanged.

## Price Update Workflow (Excel -> Metadata)
Use this whenever you receive a new pricing Excel.

Expected Excel columns (header names are flexible):
- Identifier: one of id/model/sku/code (matching product id or model)
- Qty (optional): Qty / Quantity / Количество
- Final price (EUR): Competitor Amazon Price (incl. VAT) / final price / price / final price eur / EUR / крайна цена
- Margin (optional): margin / margin eur / надценка / марж

Command examples:
- Dry run (no file changes):
	- npm run prices:import -- --file "./data/prices/latest-prices.xlsx" --dry-run
- Apply update:
	- npm run prices:import -- --file "./data/prices/latest-prices.xlsx"

Importer behavior:
- Matches rows by product id first, then by model.
- Writes `currency: "EUR"`, `priceQty`, `competitorAmazonPriceInclVatEur`, `finalPriceEur`, `marginEur`, and `priceUpdatedAt` in /data/products/products.json.
- Prints summary with matched/updated/unknown identifiers so you can quickly fix mismatches in the sheet.

## Notes
- The previous /pages router implementation is archived, not active.
- There is currently no backend order API, admin panel, or database integration in the active codebase.

## QA Snapshot (2026-08-12)
- Production build passes successfully.
- BG and EN routes return HTTP 200.
- Product detail pages render metadata title tags.
- Language switcher preserves category/application query filters.

## License & Usage
Use only content and images you are authorized to publish.