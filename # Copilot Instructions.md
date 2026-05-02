# Copilot Instructions

You are assisting in building a high-fidelity BEOKBG website clone with Next.js 14 + TypeScript + Tailwind CSS.

## Primary Goal

Replicate the reference site's information architecture and page composition as closely as possible:
- hero/banner areas
- breadcrumb patterns
- category/sidebar navigation
- product listing density and pagination blocks
- supporting sections like catalog download, "why choose us", and factory content

Do this without copying copyrighted text/assets verbatim unless the project owner has rights to them.

## Non-Negotiables

- Use App Router (`app/[locale]/`) as the canonical routing layer.
- Keep full bilingual support (`bg`, `en`) via dictionary keys in `locales/bg.json` and `locales/en.json`.
- No hardcoded user-facing text in components/pages when a dictionary key is feasible.
- Use TypeScript types for all props and data structures.
- Use Tailwind CSS only.
- Use `next/image` for image rendering.

## Fidelity Rules

- Match section order and hierarchy first.
- Match spacing rhythm and visual grouping second.
- Match wording and media only when legally permitted.
- If source content is unavailable, use placeholders that preserve layout proportions.

## Architecture

```
app/
  layout.tsx
  [locale]/
    layout.tsx
    page.tsx
    products/page.tsx
    products/[slug]/page.tsx
components/
lib/i18n/
locales/
extracted/products-extracted.json
```

## Data Model Direction

Product data should evolve toward:
- id
- slug
- title.bg / title.en
- description.bg / description.en
- category
- subcategory
- image (absolute URL or `/public` path)
- spec summary

## Component Priorities

1. Product listing page composition parity
2. Sidebar category navigation and active state
3. Product card visual density and CTA parity
4. Footer information depth parity

## i18n Rules

- Every new label must be added to both locale files in the same change.
- Use dictionary lookup in server components and pass labels via props.
- Keep fallback text only as a safety net, not as primary content.

## Quality Gates Before Commit

- `npm run build` passes
- No TypeScript errors
- EN and BG render without mixed-language strings
- No broken internal links

## Security and Legal

- Do not include copyrighted images/text from third-party sources without permission.
- Do not expose secrets.
- Validate external URLs before rendering.
