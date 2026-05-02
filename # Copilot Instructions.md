# Copilot Instructions

You are assisting in building a Next.js 14 + TypeScript + Tailwind CSS website for a hardware distributor (smart thermostats & radiator actuators).

## Project State

The frontend is functional and builds cleanly. Current focus areas are:
- Language switcher UI
- Migrating static product data to a PostgreSQL database (Railway)
- Backend API routes for orders and pick & pack integration
- Consolidating the dual-router setup into App Router only

## Core Guidelines

- Generate clean, modular React components.
- Follow the structure of https://bg.beok-controls.com but do NOT copy CSS or text literally.
- Use Tailwind CSS for all styling — no inline styles, no CSS modules.
- Use TypeScript everywhere. Define explicit `interface` or `type` for every component's props.
- Always generate responsive layouts (mobile-first).
- Use `next/image` for all images; never bare `<img>` tags.
- Use `next/link` for all internal navigation.

## Architecture

```
app/
  layout.tsx              # Root layout — Header + Tailwind globals
  [locale]/               # App Router locale pages (server components)
components/               # Shared UI components
lib/
  i18n/                   # getDictionary, config, types
pages/                    # Pages Router (legacy — planned removal)
locales/                  # bg.json, en.json
extracted/
  products-extracted.json # Current product data source
```

- **App Router** (`app/[locale]/`) is the primary routing layer.
- **Pages Router** (`pages/`) is legacy and will be removed once App Router reaches feature parity.
- All App Router imports use the `@/` alias (maps to repo root).
- i18n: default locale `bg`, also supports `en`. Dictionary loaded via `getDictionary(locale)`.

## Existing Components

| Component | Location | Notes |
|---|---|---|
| `Header` | `components/Header.tsx` | Sticky nav; nav labels are hardcoded BG — needs i18n |
| `Hero` | `components/Hero.tsx` | Accepts optional `title?: string` prop |
| `CategoryGrid` | `components/CategoryGrid.tsx` | Accepts `products` array + optional `category` filter |
| `ProductCard` | `components/ProductCard.tsx` | Uses `<img>` — replace with `next/image` |
| `Footer` | `components/Footer.tsx` | Accepts optional `dict?: Record<string, string>` |

## API & Integration

- Create API routes under `app/api/`:
  - `app/api/orders/route.ts` for order handling
  - `app/api/pickpack/route.ts` for pick & pack integration
- Use `fetch()` with `POST` for external APIs.
- Required environment variables (in `.env.local`):
  - `DATABASE_URL`
  - `PICKPACK_ENDPOINT`
  - `PICKPACK_API_KEY`
- Return consistent JSON: `{ success: boolean, data?: unknown, error?: string }`
- Never log secrets or credentials.

## i18n

- Locale config: `lib/i18n/config.ts`
- Dictionary loader: `lib/i18n/getDictionary.ts`
- Translation files: `locales/bg.json`, `locales/en.json`
- When adding translated text to a component, add the key to both JSON files.
- A language switcher component is not yet built — it should use `useRouter` from `next/navigation`.

## Code Quality

- Keep components small and focused; extract subcomponents when needed.
- Prefer functional components and React hooks.
- No `any` unless explicitly justified with a comment.
- ESLint ruleset: `next/core-web-vitals` (configured in `.eslintrc.json`).

## Testing

- Write unit tests with Jest + React Testing Library.
- Cover: rendering, basic interactions, API success/error paths.

## Accessibility

- Semantic HTML elements throughout.
- All interactive elements must be keyboard-navigable.
- Images must have meaningful `alt` text.
- Forms must have associated `<label>` elements.

## Security

- Validate and sanitize all user input server-side.
- Protect admin routes with authentication middleware.
- Never expose `DATABASE_URL` or API keys to the client.

## Performance

- Use `next/image` with explicit `width`/`height` or `fill` for all product images.
- Avoid unnecessary re-renders — memoize only when profiling shows a need.
- Keep server components as the default in App Router; use `"use client"` only when required.
