# MercurJS Multi-Vendor Marketplace

A full-stack multi-vendor marketplace built with MercurJS on top of MedusaJS v2.

## Architecture

This is a monorepo with 4 services:

| Service | Port | Description |
|---------|------|-------------|
| Backend (Medusa) | 9000 | Core API server |
| Storefront | 5000 | Next.js customer storefront (webview) |
| Admin Panel | 5173 | Vite/React admin dashboard |
| Vendor Panel | 6000 | Vite/React vendor/seller dashboard |

## Tech Stack

- **Backend**: MedusaJS v2.10.2 with MercurJS plugins
- **Storefront**: Next.js 15 + TailwindCSS
- **Admin Panel**: Vite/React (Medusa Admin dashboard)
- **Vendor Panel**: Vite/React (MercurJS vendor panel)
- **Database**: PostgreSQL (Replit Helium)
- **Package Manager**: pnpm

## Workflows

- `Backend` — starts the Medusa API server (`cd backend/.medusa/server && PORT=9000 pnpm exec medusa start`)
- `Start application` — starts the Next.js storefront in dev mode on port 5000
- `Admin Panel` — starts the admin Vite dev server on port 5173
- `Vendor Panel` — starts the vendor Vite dev server on port 6000

## Initial Setup Notes

### Database
- PostgreSQL provisioned via Replit database (DATABASE_URL secret)
- SSL disabled via `driverOptions: { connection: { ssl: false } }` in `backend/medusa-config.ts`
- Migrations must be run from `backend/.medusa/server` (the compiled output directory)
- Run migrations: `cd backend && pnpm run build && cd .medusa/server && pnpm install --ignore-scripts && pnpm exec medusa db:migrate`

### Admin Credentials
- Email: `admin@test.com`
- Password: `supersecret`

### Publishable API Key
- Set as `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` and `VITE_PUBLISHABLE_API_KEY` environment variables

## Environment Variables (set in Replit secrets/env)

### Backend
- `DATABASE_URL` - PostgreSQL connection (Replit secret)
- `JWT_SECRET` - JWT signing secret
- `COOKIE_SECRET` - Cookie signing secret
- `STORE_CORS` - CORS for storefront
- `ADMIN_CORS` - CORS for admin panel
- `AUTH_CORS` - CORS for auth endpoints
- `VENDOR_CORS` - CORS for vendor panel
- `BACKEND_URL` - Public backend URL

### Storefront
- `NEXT_PUBLIC_MEDUSA_BACKEND_URL` - Backend API URL
- `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` - Medusa publishable API key
- `NEXT_PUBLIC_BASE_URL` - Storefront public URL

### Admin & Vendor Panels
- `VITE_MEDUSA_BACKEND_URL` - Backend URL
- `VITE_MEDUSA_STOREFRONT_URL` - Storefront URL
- `VITE_PUBLISHABLE_API_KEY` - Medusa publishable API key
- `VITE_PUBLIC_BASE_URL` - Public base URL

### Optional Services
- `STRIPE_SECRET_API_KEY` + `STRIPE_WEBHOOK_SECRET` - Stripe Connect payments
- `RESEND_API_KEY` + `RESEND_FROM_EMAIL` - Email notifications
- `ALGOLIA_API_KEY` + `ALGOLIA_APP_ID` - Search
- `MINIO_ENDPOINT` + `MINIO_ACCESS_KEY` + `MINIO_SECRET_KEY` - Object storage

## Key Configuration Changes for Replit

1. **SSL disabled** in `backend/medusa-config.ts` via `driverOptions`
2. **allowedHosts: true** in `vendor-panel/vite.config.mts` and `admin-panel/vite.config.mts`
3. **Replit domain** added to image remote patterns in `storefront/next.config.ts`
4. **PORT=9000** explicitly set in backend workflow (avoids conflict with storefront on 5000)
