
# Project Roadmap

**Reference site for structure and content inspiration:**
https://bg.beok-controls.com

## 1. Project Setup
- Initialize a git repository (if not already done)
- Initialize Next.js app with TypeScript
- Install and configure Tailwind CSS
- Set up clean architecture: `/components`, `/lib`, `/app/api`
- Document required environment variables (e.g., database URL, pick & pack API keys)

- Note: Use only images you have rights to (e.g., your own or with permission from BEOK). Otherwise, use placeholders.

## 2. Database (Railway PostgreSQL)
- Set up Railway PostgreSQL
- Create tables:
  - products
  - categories
  - orders
  - order_items
  - pickpack_logs
  - users (for admin/customer roles)
- Define schema with field types, relations, and indexes
- Plan for file storage (e.g., product images)

## 3. Authentication & Admin Panel
- Implement authentication (admin/customer roles)
- Create admin dashboard for managing products, categories, and orders

## 4. UI Component Development
- Create reusable components:
  - Hero
  - ProductCard
  - CategoryGrid
  - Footer
- Ensure all components are responsive and use Tailwind for styling

## 5. Page & Routing Structure
- Analyze bg.beok-controls.com for page/content structure
- Implement dynamic routes for products and categories under `/app`

## 6. CRUD Operations & Order Management
- Add CRUD endpoints and UI for products and categories
- Implement order status tracking (pending, shipped, completed)

## 7. API Integration
- Create API routes under `/app/api`:
  - `/api/orders` for order handling
  - `/api/pickpack` for pick & pack integration
- Use fetch() with POST for sending orders to the external API
- Example for pick & pack integration:

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

  return NextResponse.json({
    status: "ok",
    pickPackStatus: result
  });
}
```

## 8. Helpers & Utilities
- Place helper functions in `/lib` as needed

## 9. Validation & Error Handling
- Add input validation and error handling for all API routes and forms

## 10. Testing & QA
- Add unit and integration tests for API routes and components (Jest, React Testing Library)
- Test all components and API routes
- Ensure mobile responsiveness and accessibility

## 11. Internationalization (i18n)
- Add i18n support if needed for multiple languages

## 12. Performance & SEO
- Optimize performance (image optimization, code splitting)
- Add SEO improvements (meta tags, sitemap)

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
