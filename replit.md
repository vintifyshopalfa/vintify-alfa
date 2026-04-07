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

## Features Built

### Admin Panel
- **14-metric KPI dashboard** at `/dashboard` (home page): GMV, commission, avg order value, total orders, completed/pending orders, active sellers, buyers, new users (7d), active listings, pending requests, reviews, avg rating, commission rate
- Metrics computed from live Medusa API hooks

### Vendor Panel
- **Meta & CMS page** at `/meta-cms`: Facebook Pixel integration, Instagram Shopping Catalog, store announcements, and blog posts — all stored as seller metadata
- Sidebar nav entry: "Meta & CMS" (Newspaper icon), placed between Messages and Requests

### Backend
- **LGPD audit log module** at `backend/src/modules/audit-log/` — tracks entity mutations with actor and IP
- **OWASP security headers middleware** at `backend/src/api/middlewares.ts`
- **Algolia product sync subscriber** at `backend/src/subscribers/algolia-product-sync.ts`
- **TalkJS messaging endpoint** integrated
- **Social module** at `backend/src/modules/social/` — Post, Like, Comment models; tables `social_post`, `social_like`, `social_comment` created via direct SQL migration
  - API routes: `GET/POST /store/posts`, `POST /store/posts/:id/likes`, `GET /store/posts/:id/comments`, `GET/POST /store/products/:id/likes`
- `@mercurjs` packages **pinned to exact 1.4.3** (no `^`) — critical, see scratchpad

### Storefront
- **Teal brand palette** (`#09B1BA`) set in `storefront/src/app/colors.css` — used on buttons, borders, actions
- **Feed page** at `/[locale]/feed` — infinite scroll of seller posts with likes/comments
- **Social data layer** at `storefront/src/lib/data/social.ts` — `getFeed`, `getProductLikeState`, `createPost`
- **LikeButton atom** — optimistic UI with debounced API toggle
- **PostCard organism** — displays post content, author, likes, comment thread
- **FeedInfiniteScroll organism** — client-side pagination of posts feed
- **Feed nav link** added to `CategoryNavbar` between "All Products" and category list
- **SellerTabs** extended with Products/Posts/Reviews tabs; `SellerPostsTab` fetches seller-filtered posts
- **TalkJS Chat widget** on product detail page via `ProductDetailsSeller` cell
- **ProductCard** updated to Vinted style — condition badge, fill image, hover scale, price-prominent layout
- **i18n with next-intl** — restricted to `en` (US, `/us`) and `pt-BR` (Brazil, `/br`) locales
  - Middleware allows only `us` and `br` country codes (all others default to `us`)
  - `countryToLocale()` in `src/i18n/request.ts` maps `br` → `pt-BR`, others → `en`
  - Messages at `storefront/messages/en.json` and `storefront/messages/pt-BR.json`
  - `NextIntlClientProvider` in both `(main)/layout.tsx` and `(checkout)/layout.tsx`
  - Translated: `CategoryNavbar`, `CountrySelector`, `SellNowButton`, `Footer`, `FeedInfiniteScroll`, `SellerTabs`, `ProductCard` condition labels
  - **`TabsList`** updated to support explicit `value` prop so translated labels don't break URL-based tab routing
  - Brazil region (BRL currency) created in Medusa for `/br` routing to work

## Key Configuration Changes for Replit

1. **SSL disabled** in `backend/medusa-config.ts` via `driverOptions`
2. **allowedHosts: true** in `vendor-panel/vite.config.mts` and `admin-panel/vite.config.mts`
3. **Replit domain** added to image remote patterns in `storefront/next.config.ts`
4. **PORT=9000** explicitly set in backend workflow (avoids conflict with storefront on 5000)
