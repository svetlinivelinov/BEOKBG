
# Project Roadmap

This roadmap is updated to match the current codebase after the App Router migration and i18n/product refactor.

## Completed

### Architecture and Routing
- Migrated active site to Next.js App Router
- Archived legacy Pages Router files to /archive/pages-legacy-2026-08-05
- Implemented locale-first routing under /app/[locale]

### Localization
- Added BG/EN dictionaries in /locales
- Implemented dynamic dictionary loading from /lib/i18n/getDictionary.ts
- Added locale-aware category label formatting
- Added query-preserving language switcher

### Product Data and Rendering
- Split product data into:
  - /data/products/products.json (base metadata)
  - /data/products/content.en.json (English content)
  - /data/products/content.bg.json (Bulgarian content)
- Implemented localized content merge with English fallback
- Added product application classification (electric, water, gas-boiler)

### Product Page UX
- Category filtering in products page
- Application sub-filter for thermostat categories
- Controlled single-open description accordion in product cards
- Shared Container component for consistent layout width/padding
- Header language switcher wrapped for safe rendering behavior

### Operations
- Added local host scripts:
  - npm run host:start
  - npm run host:stop

### SEO Metadata
- Added richer page metadata for SEO on:
  - /[locale]
  - /[locale]/categories
  - /[locale]/products
  - /[locale]/products/[id]
- Added canonical and language alternates for BG/EN routes

### QA Checklist (Executed)
- Build verification completed successfully
- BG and EN route smoke checks passed
- Product detail metadata title rendering verified
- Query-preserving locale switch verified with category/application filters

## In Progress / Near-Term

### Content and Catalog Quality
- Expand and verify localized product content accuracy
- Standardize product imagery and alt text quality
- Audit category taxonomy for naming consistency

### QA and Testing
- Add component tests for filter and accordion behavior
- Add route-level smoke tests for BG and EN pages
- Add regression checks for locale-switch query preservation

### SEO and Performance
- Add sitemap/robots if deployment strategy requires it
- Continue optimizing image sizes and loading priorities

## Future (Optional Expansion)

### Backend and Commerce
- Order APIs and checkout flow
- Admin/content management interface
- Database-backed catalog and content editing
- Optionally introduce backend APIs/admin only if business scope requires it

### Platform
- CI checks for lint/build/test gates
- Error monitoring and uptime checks

## Release Criteria for Current Catalog Version
- Build passes in CI and locally
- BG and EN parity for core catalog paths
- Filters and language switching behave consistently
- Documentation remains aligned with implementation
