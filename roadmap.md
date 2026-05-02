
# Project Roadmap

**Reference site for structure and content inspiration:**
https://bg.beok-controls.com

## 1. Project Setup ✅
- ✅ Initialize Next.js app with TypeScript
- ✅ Install and configure Tailwind CSS + PostCSS
- ✅ Clean architecture: `/components`, `/lib`, `/app`, `/pages`
- ✅ `tsconfig.json` with strict mode and `@/` path alias
- ✅ ESLint configured (`next/core-web-vitals`)
- ✅ `.gitignore` with standard Next.js ignores
- ✅ Document required environment variables

## 2. UI Component Development ✅
- ✅ `Header` — sticky nav with product/category links
- ✅ `Hero` — banner with CTA button (scrolls to `#products`)
- ✅ `ProductCard` — image, title, description, external link
- ✅ `CategoryGrid` — responsive grid with optional category filter
- ✅ `Footer` — links with optional i18n dictionary prop
- ✅ All components use TypeScript prop interfaces

## 3. Page & Routing Structure ✅
- ✅ Pages Router: `/`, `/products`, `/products/[id]`, `/category`
- ✅ Pages Router: `/about-us`, `/contact-us` (stub pages)
- ✅ App Router: `/[locale]/`, `/[locale]/categories`, `/[locale]/products`, `/[locale]/products/[slug]`
- ✅ `pages/_app.tsx` — correct Next.js App wrapper with global CSS
- ⬜ Consolidate to a single router (App Router preferred long-term)

## 4. Internationalization (i18n) ✅
- ✅ `lib/i18n/config.ts` — locale list (`bg`, `en`)
- ✅ `lib/i18n/getDictionary.ts` — async locale loader with guard
- ✅ `locales/bg.json` + `locales/en.json` — translation dictionaries
- ✅ App Router pages use `getDictionary` for server-side translations
- ✅ Pages Router uses Next.js built-in `i18n` config
- ⬜ Language switcher UI component
- ⬜ Locale-aware `<html lang>` in App Router layout
- ⬜ i18n all hardcoded Bulgarian strings in Pages Router components

## 5. Static Data ✅
- ✅ Product data sourced from `extracted/products-extracted.json`
- ⬜ Migrate to PostgreSQL (Railway)

## 6. Database (Railway PostgreSQL) ⬜
- ⬜ Set up Railway PostgreSQL
- ⬜ Create tables: `products`, `categories`, `orders`, `order_items`, `pickpack_logs`, `users`
- ⬜ Define schema with field types, relations, and indexes
- ⬜ Plan file storage for product images

## 7. Authentication & Admin Panel ⬜
- ⬜ Authentication (admin/customer roles)
- ⬜ Admin dashboard for managing products, categories, and orders

## 8. CRUD Operations & Order Management ⬜
- ⬜ CRUD endpoints and UI for products and categories
- ⬜ Order status tracking (pending, shipped, completed)

## 9. API Integration ⬜
- ⬜ `/api/orders` — order handling
- ⬜ `/api/pickpack` — pick & pack integration

  ```ts
  import { NextResponse } from "next/server";

  export async function POST(req: Request) {
    const body = await req.json();

    const pickPackResponse = await fetch(process.env.PICKPACK_ENDPOINT!, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.PICKPACK_API_KEY}`
      },
      body: JSON.stringify({
        orderId: body.orderId,
        customer: body.customer,
        items: body.items,
        address: body.address
      })
    });

    const result = await pickPackResponse.json();
    return NextResponse.json({ status: "ok", pickPackStatus: result });
  }
  ```

## 10. Image Optimization ⬜
- ⬜ Replace `<img>` tags in `ProductCard` with `next/image`
- ⬜ Add `remotePatterns` in `next.config.js` for external image domains

## 11. Validation & Error Handling ⬜
- ⬜ Input validation on all API routes and forms
- ⬜ Consistent error response format: `{ success: boolean, data?, error? }`

## 12. Testing & QA ⬜
- ⬜ Unit tests for components (Jest, React Testing Library)
- ⬜ Integration tests for API routes
- ⬜ Mobile responsiveness and accessibility audit

## 13. Performance & SEO ⬜
- ⬜ `next/image` for all product images (lazy load, sizing)
- ⬜ Per-page `<meta>` tags and Open Graph
- ⬜ Sitemap generation

## 14. Security ⬜
- ⬜ Upgrade Next.js to v15+ (resolves remaining high CVEs in v14)
- ⬜ Protect admin API routes (auth middleware)
- ⬜ Sanitize all user input server-side

## 15. Deployment ⬜
- ⬜ GitHub Actions CI pipeline (lint → test → build)
- ⬜ Railway deployment on push to `main`

## 13. Security
- Secure API endpoints and sensitive data

## 14. Logging & Monitoring
- Add logging and monitoring for production

## 15. Documentation
- Write README with setup, environment, and deployment instructions

## 16. Deployment
- Set up GitHub Actions for CI/CD
- Deploy to Railway using the workflow

---

## Final Deliverables
- Professional site 1:1 like Beok
- Backend API on Railway
- Automatic deploy from GitHub
- Copilot writing 80% of the code
- Automatic order sending to pick & pack
- Database for orders and logs
- Admin panel for management
- Secure, tested, and documented codebase
