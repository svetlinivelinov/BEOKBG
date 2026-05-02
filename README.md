# BEOKBG

A modern, modular, responsive web application for a hardware distributor (smart thermostats & radiator actuators), inspired by [bg.beok-controls.com](https://bg.beok-controls.com). Built with Next.js 14, TypeScript, and Tailwind CSS.

## Status

| Feature | State |
|---|---|
| Next.js 14 hybrid routing (App Router + Pages Router) | ✅ Done |
| Bilingual i18n — Bulgarian (default) + English | ✅ Done |
| Component library: Header, Hero, CategoryGrid, ProductCard, Footer | ✅ Done |
| Dynamic product and category routes | ✅ Done |
| Static product data from `extracted/products-extracted.json` | ✅ Done |
| Tailwind CSS + PostCSS | ✅ Done |
| ESLint (Next.js core-web-vitals) | ✅ Done |
| TypeScript strict mode | ✅ Done |
| About Us & Contact stub pages | ✅ Done |
| PostgreSQL database (Railway) | ⬜ Planned |
| Admin panel | ⬜ Planned |
| Order management & pick & pack API integration | ⬜ Planned |
| Authentication (admin/customer roles) | ⬜ Planned |
| Language switcher component | ⬜ Planned |
| `next/image` for product images | ⬜ Planned |
| GitHub Actions CI/CD | ⬜ Planned |

## Project Structure

```
app/
  layout.tsx              # Root App Router layout (Header + Tailwind)
  globals.css
  [locale]/               # Locale-aware App Router pages (bg, en)
    page.tsx
    categories/page.tsx
    products/
      page.tsx
      [slug]/page.tsx
components/               # Shared UI components
  Header.tsx
  Hero.tsx
  CategoryGrid.tsx
  ProductCard.tsx
  Footer.tsx
extracted/
  products-extracted.json # Product data source
lib/
  i18n/
    config.ts             # Locale list
    getDictionary.ts      # Async dictionary loader
    types.ts
locales/
  bg.json                 # Bulgarian translations (default)
  en.json                 # English translations
pages/                    # Pages Router routes
  _app.tsx
  index.tsx
  products.tsx
  category.tsx
  about-us.tsx
  contact-us.tsx
  products/[id].tsx
```

## Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/svetlinivelinov/BEOKBG.git
   cd BEOKBG
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

4. (When backend is ready) Create a `.env.local` file:
   ```
   DATABASE_URL=your_postgres_url
   PICKPACK_ENDPOINT=your_pickpack_endpoint
   PICKPACK_API_KEY=your_pickpack_api_key
   ```

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |

## i18n

- Default locale: `bg` (Bulgarian)
- Supported: `bg`, `en`
- Translation files: `locales/bg.json`, `locales/en.json`
- App Router pages load translations via `lib/i18n/getDictionary.ts`
- Pages Router uses Next.js built-in `i18n` config in `next.config.js`

## Routing

The project uses a **hybrid routing** approach:

- **App Router** (`app/[locale]/`) — locale-aware pages with server components and async dictionary loading
- **Pages Router** (`pages/`) — classic routes; uses Next.js i18n for locale prefixing

Product links from `ProductCard` point to the Pages Router path (`/products/[id]`). Consolidation into a single router is a future goal.

## Deployment

Planned: GitHub Actions → Railway. Currently: `npm run build` then `npm start`.

## Contributing

Pull requests are welcome. Follow the code style, use TypeScript throughout, and add tests for new features.

## License & Usage

For business/commercial use. Ensure you have the legal rights for all images and content. Do not use copyrighted materials without authorization.