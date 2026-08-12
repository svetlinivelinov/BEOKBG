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
2. Start dev server
	 - npm run dev
3. Optional host scripts
	 - npm run host:start
	 - npm run host:stop

## Scripts
- npm run dev - start Next.js dev server
- npm run build - create production build
- npm run start - run production server
- npm run host:start - start host in background and save PID to .host.pid
- npm run host:stop - stop host process from .host.pid

## Notes
- The previous /pages router implementation is archived, not active.
- There is currently no backend order API, admin panel, or database integration in the active codebase.

## License & Usage
Use only content and images you are authorized to publish.