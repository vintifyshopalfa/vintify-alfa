# Vintify Backend

Medusa.js v2 backend for the Vintify multi-vendor marketplace.

## Required Environment Variables

Copy `.env.example` to `.env` and fill in all required values before starting the server.

### Critical Secrets (required in all environments)

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgres://user:pass@host:5432/db` |
| `JWT_SECRET` | >= 32 char random secret for JWT signing | `openssl rand -hex 32` |
| `COOKIE_SECRET` | >= 32 char random secret for cookie signing | `openssl rand -hex 32` |
| `PASSWORD_PEPPER` | >= 32 char random string appended to passwords before bcrypt hashing | `openssl rand -hex 32` |

> **Note:** In development, the server will start with a warning if `JWT_SECRET`, `COOKIE_SECRET`, or `PASSWORD_PEPPER` are missing. In production (`NODE_ENV=production`), the server will refuse to start without these values.

### CORS Configuration

| Variable | Description |
|---|---|
| `STORE_CORS` | Allowed origins for storefront (e.g. `http://localhost:5000`) |
| `ADMIN_CORS` | Allowed origins for admin panel (e.g. `http://localhost:5173`) |
| `VENDOR_CORS` | Allowed origins for vendor panel (e.g. `http://localhost:6000`) |
| `AUTH_CORS` | Allowed origins for auth endpoints |
| `BACKEND_URL` | Public URL of this backend (e.g. `http://localhost:9000`) |

### WorkOS SSO (optional — enables SSO login)

| Variable | Description |
|---|---|
| `WORKOS_CLIENT_ID` | WorkOS Application Client ID |
| `WORKOS_CLIENT_SECRET` | WorkOS Application Client Secret |
| `WORKOS_REDIRECT_URI` | OAuth callback URL registered in WorkOS |
| `WORKOS_STATE_SECRET` | >= 32 char secret for signing OAuth CSRF state tokens (falls back to `JWT_SECRET`) |
| `WORKOS_ORGANIZATION_ID` | (optional) WorkOS Organization ID to scope SSO to a specific org |
| `WORKOS_REQUIRE_MFA` | Set to `"true"` to reject logins where MFA was not verified |

**WorkOS MFA Setup:**
1. In the WorkOS dashboard, navigate to your Organization -> Authentication -> Factors
2. Enable TOTP and/or SMS factors for the organization
3. Set `WORKOS_ORGANIZATION_ID` to the organization ID
4. Set `WORKOS_REQUIRE_MFA=true` to enforce MFA at the application layer
5. WorkOS enforces the MFA policy at the IdP level when an organization policy requires it

### Stripe Payments (optional — enables payouts)

| Variable | Description |
|---|---|
| `STRIPE_SECRET_API_KEY` | Stripe secret key (`sk_live_...` or `sk_test_...`) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret (`whsec_...`) |

### Algolia Search (optional — enables full-text search)

| Variable | Description |
|---|---|
| `ALGOLIA_APP_ID` | Algolia Application ID |
| `ALGOLIA_API_KEY` | Algolia Admin API Key (requires write access for seeding) |

Run `pnpm ts-node src/scripts/init-algolia.ts` to configure indices and seed existing data from the database into Algolia.

### Redis (optional — enables distributed caching, event bus, and rate limiting)

| Variable | Description |
|---|---|
| `REDIS_URL` | Redis connection URL (e.g. `redis://localhost:6379`) |

When `REDIS_URL` is set, the auth rate limiter uses Redis for distributed rate limiting across all server instances. Without Redis, rate limiting is in-memory (suitable for single-instance deployments only).

### Object Storage / MinIO (optional — replaces local file storage)

| Variable | Description |
|---|---|
| `MINIO_ENDPOINT` | MinIO or S3-compatible endpoint |
| `MINIO_ACCESS_KEY` | MinIO access key |
| `MINIO_SECRET_KEY` | MinIO secret key |
| `MINIO_BUCKET` | Target bucket name |

### Email via Resend (optional)

| Variable | Description |
|---|---|
| `RESEND_API_KEY` | Resend API key |
| `RESEND_FROM_EMAIL` | Sender address (e.g. `noreply@yourdomain.com`) |

### TalkJS (optional — enables in-app messaging)

| Variable | Description |
|---|---|
| `TALKJS_APP_ID` | TalkJS Application ID |
| `TALKJS_SECRET_KEY` | TalkJS Secret Key |

## Running in Development

```bash
pnpm install
cp .env.example .env
# Edit .env with your values
pnpm run dev
```

## Building for Production

```bash
pnpm medusa build
cd .medusa/server
pnpm install --ignore-scripts
PORT=9000 pnpm medusa start
```

## Generating a Secure Secret

```bash
openssl rand -hex 32
```

Use this command to generate values for `JWT_SECRET`, `COOKIE_SECRET`, `PASSWORD_PEPPER`, and `WORKOS_STATE_SECRET`.

## Security Notes

- **Password hashing**: Passwords are hashed with bcrypt (12 rounds) + a pepper from `PASSWORD_PEPPER`. Store register/login use this custom path; do not remove `provider_metadata.password_hash` entries. Never change the pepper after users have registered.
- **Rate limiting**: Auth endpoints (`/auth/*`, `/store/auth/*`) are rate-limited to 20 requests per 15 minutes per IP. Uses Redis if `REDIS_URL` is set, otherwise in-memory.
- **Audit logs**: All operations are logged to the `audit_logs` table. Logs are append-only (enforced at both application and database trigger levels).
- **CSRF protection**: WorkOS OAuth state tokens are HMAC-SHA256 signed with a 10-minute TTL. Buffer length is checked before constant-time comparison to prevent panics on malformed tokens.
- **MFA**: Set `WORKOS_REQUIRE_MFA=true` to reject WorkOS SSO logins where the authentication method was not MFA-verified. Configure MFA policies in the WorkOS dashboard under Organization -> Factors.
