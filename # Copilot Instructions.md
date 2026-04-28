# Copilot Instructions

You are assisting in building a Next.js + TypeScript + Tailwind website for a hardware distributor.

## Core Guidelines

- Generate clean, modular React components.
- Follow the structure of https://bg.beok-controls.com but do NOT copy CSS or text literally.
- Use Tailwind CSS for all styling.
- Use TypeScript everywhere (no `any` unless explicitly justified).
- Always generate responsive layouts (mobile-first).

## Architecture

- Follow clean architecture:
  - `/components` for UI components
  - `/lib` for helpers and utilities
  - `/app` for routes and API handlers
- Create reusable UI components:
  - `Hero`
  - `ProductCard`
  - `CategoryGrid`
  - `Footer`
- Implement dynamic routes for products and categories under `/app`.

## API & Integration

- Create API routes under `/app/api`:
  - `/api/orders` for order handling
  - `/api/pickpack` for pick & pack integration
- Use `fetch()` with `POST` for sending orders to external APIs.
- Use and document required environment variables:
  - `PICKPACK_ENDPOINT`
  - `PICKPACK_API_KEY`
  - `DATABASE_URL`
- Handle API errors gracefully and return consistent JSON response formats:
  - `{ success: boolean, data?: unknown, error?: string }`

## Component & Code Quality

- Define explicit prop types/interfaces for all components.
- Keep components small and focused; extract subcomponents when needed.
- Enforce linting and formatting (ESLint, Prettier) and follow their suggestions.
- Prefer functional components and React hooks.

## Testing

- Write unit tests for components and API routes.
- Use Jest and React Testing Library.
- Cover:
  - rendering
  - basic interactions
  - success and error paths for API routes

## Accessibility

- Ensure all UI components are accessible:
  - proper ARIA attributes where needed
  - keyboard navigation support
  - semantic HTML elements
- Forms must have associated labels and clear error messages.

## Documentation

- Add JSDoc or TypeDoc comments for helpers and complex logic.
- Document all public APIs (request/response shapes, error formats).
- Keep README updated with:
  - setup
  - environment variables
  - scripts
  - deployment flow

## Performance

- Use Next.js `<Image>` and `<Link>` components where appropriate.
- Optimize and lazy-load images.
- Avoid unnecessary re-renders and heavy computations in render paths.

## Security

- Sanitize and validate all user input on the server.
- Protect sensitive API endpoints from unauthorized access (e.g., admin-only routes).
- Never log secrets or full credentials.
