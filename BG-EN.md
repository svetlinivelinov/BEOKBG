# i18n Architecture Reference

This document describes the bilingual (bg/en) i18n structure as implemented in this project.

## File Structure

```
app/
  layout.tsx              # Root layout — Header + global CSS
  [locale]/
    layout.tsx            # (planned) locale-specific layout for <html lang>
    page.tsx              # Home page — uses getDictionary
    products/
      page.tsx
      [slug]/page.tsx
    categories/
      page.tsx
locales/
  bg.json                 # Bulgarian translations (default locale)
  en.json                 # English translations
lib/
  i18n/
    config.ts             # Locale list and type
    getDictionary.ts      # Async loader for locale dictionaries
    types.ts              # Dictionary interface
```

## next.config.js — i18n for Pages Router

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  i18n: {
    locales: ["bg", "en"],
    defaultLocale: "bg",
  },
};

module.exports = nextConfig;
```

## lib/i18n/config.ts

```ts
export const locales = ["bg", "en"] as const;
export type Locale = (typeof locales)[number];
```

## lib/i18n/getDictionary.ts

```ts
import { locales } from "./config";

export async function getDictionary(locale: string) {
  if (!locales.includes(locale as never)) throw new Error("Invalid locale");
  return import(`../../locales/${locale}.json`).then(mod => mod.default);
}
```

## lib/i18n/types.ts

```ts
export interface Dictionary {
  welcome: string;
  products: string;
  categories: string;
  about: string;
  contact: string;
  all_products: string;
  category: string;
  not_found: string;
}
```

## locales/bg.json (current)

```json
{
  "welcome": "Добре дошли в BEOKBG",
  "products": "Продукти",
  "categories": "Категории",
  "about": "За нас",
  "contact": "Контакти",
  "all_products": "Всички продукти",
  "category": "Категория",
  "not_found": "Продуктът не е намерен"
}
```

## locales/en.json (current)

```json
{
  "welcome": "Welcome to BEOKBG",
  "products": "Products",
  "categories": "Categories",
  "about": "About Us",
  "contact": "Contact",
  "all_products": "All Products",
  "category": "Category",
  "not_found": "Product not found"
}
```

## Usage in App Router Pages

```tsx
// app/[locale]/page.tsx
import { getDictionary } from "@/lib/i18n/getDictionary";

export default async function Page({ params }: { params: { locale: string } }) {
  const dict = await getDictionary(params.locale);
  return <Hero title={dict.welcome} />;
}
```

## Planned: Language Switcher

A `LanguageSwitcher` component should:
- Read the current locale from `useParams()` or `useRouter()`
- Render links to the same page in the other locale (e.g. `/bg/products` ↔ `/en/products`)
- Be placed in the `Header` component

## Adding a New Language

1. Add the locale code to `locales` array in `lib/i18n/config.ts`
2. Add it to the `locales` array in `next.config.js`
3. Create `locales/<code>.json` with all required keys
4. No other code changes needed — `getDictionary` handles it dynamically
