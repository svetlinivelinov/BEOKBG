# i18n Migration Notes

This document tracks the migration from a single-language Pages Router setup to a bilingual (Bulgarian + English) hybrid App Router + Pages Router architecture.

## What Has Been Completed

- App Router locale structure — `app/[locale]/page.tsx`, `categories/page.tsx`, `products/page.tsx`, `products/[slug]/page.tsx`
- i18n library — `lib/i18n/config.ts`, `lib/i18n/getDictionary.ts`, `lib/i18n/types.ts`
- Translation dictionaries — `locales/bg.json` (default) and `locales/en.json`
- App Router pages use `getDictionary` — all locale pages receive and render translated strings
- `Footer` and `Hero` accept `dict`/`title` props — no more hardcoded Bulgarian text in those components
- Pages Router i18n config — `next.config.js` has `i18n: { locales: ["bg","en"], defaultLocale: "bg" }`
- Root App Router layout — `app/layout.tsx` includes `<Header />` and loads global CSS

## What Still Needs Doing

### High Priority

- Language switcher component — users currently have no UI to switch between `bg` and `en`
- Locale-aware `<html lang>` in App Router — currently hardcoded to `"bg"` in `app/layout.tsx`; create `app/[locale]/layout.tsx` that reads `params.locale`

### Medium Priority

- i18n remaining hardcoded strings — `Header.tsx` nav labels and `ProductCard.tsx` CTA ("Виж продукта") are still Bulgarian literals; pass them via dictionary
- Locale-aware internal links — `ProductCard` and other components link to `/products/[id]`; for the App Router these should be `/[locale]/products/[slug]`
- `about` and `contact` keys — both dictionaries have these keys but they are not yet rendered anywhere in the UI

### Low Priority

- Expand dictionary keys — add `hero_subtitle`, `view_product`, `filter_by_category`, etc. as UI demands
- Remove or keep Pages Router — once App Router feature parity is confirmed, decide whether to retire `pages/` to avoid dual-maintenance

## Current Dictionary Keys

Both `locales/bg.json` and `locales/en.json` contain:

| Key | bg | en |
|---|---|---|
| `welcome` | Добре дошли в BEOKBG | Welcome to BEOKBG |
| `products` | Продукти | Products |
| `categories` | Категории | Categories |
| `about` | За нас | About Us |
| `contact` | Контакти | Contact |
| `all_products` | Всички продукти | All Products |
| `category` | Категория | Category |
| `not_found` | Продуктът не е намерен | Product not found |
