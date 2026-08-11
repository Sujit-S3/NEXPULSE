# Environment Variables

---

## Server Variables

Validated at startup by `server/src/config/env.ts` using Zod. The server will **exit with an error** if required variables are missing or malformed. Some variables are only required conditionally — see [Production-only requirements](#production-only-requirements) below. `server/.env.example` is the authoritative, always-in-sync reference; this table mirrors it.

### Application

| Variable | Description | Required | Default |
|---|---|---|---|
| `NODE_ENV` | Runtime environment (`development`/`production`/`test`) | No | `development` |
| `PORT` | HTTP server port | No | `4000` |
| `APP_NAME` | Application display name | No | `NEXPULSE AI` |
| `APP_URL` | This server's own public URL | No | `http://localhost:4000` |
| `CLIENT_URL` | Frontend origin (used for non-API redirects) | No | `http://localhost:5174` |

### Database

| Variable | Description | Required | Default |
|---|---|---|---|
| `MONGO_URI` | MongoDB connection string (`mongodb://` or `mongodb+srv://`) | No | `mongodb://localhost:27017/nexpulse` |

### JWT & Cookies

| Variable | Description | Required | Default |
|---|---|---|---|
| `JWT_ACCESS_SECRET` | Signs access tokens, min 32 chars | **Yes** | — |
| `JWT_ACCESS_EXPIRES_IN` | Access token lifetime | No | `15m` |
| `JWT_ISSUER` | JWT `iss` claim | No | `nexpulse-api` |
| `JWT_AUDIENCE` | JWT `aud` claim | No | `nexpulse-web` |
| `COOKIE_SECRET` | Signs cookies, min 32 chars | **Yes** | — |
| `COOKIE_SECURE` | `Secure` cookie flag (always `true` in production regardless of this value) | No | `false` |
| `COOKIE_SAME_SITE` | `lax` / `strict` / `none` | No | `lax` |

### Identity & Sessions

| Variable | Description | Required | Default |
|---|---|---|---|
| `IDENTITY_ENCRYPTION_KEY` | 64-hex-char AES-256 key for MFA secrets | **Production** | — |
| `SESSION_IDLE_TIMEOUT_MINUTES` | Session inactivity timeout | No | `60` |
| `SESSION_MAX_DAYS` | Absolute session lifetime | No | `30` |
| `TRUSTED_DEVICE_DAYS` | Trusted-device MFA-skip window | No | `30` |

### CORS

| Variable | Description | Required | Default |
|---|---|---|---|
| `CORS_ORIGIN` | Allowed origin(s), comma-separated | No | `http://localhost:5174` |

### Cloudinary (avatar/media uploads)

| Variable | Description | Required | Default |
|---|---|---|---|
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | No | — |
| `CLOUDINARY_API_KEY` | Cloudinary API key | No | — |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | No | — |

### Redis / Background Job Queue

| Variable | Description | Required | Default |
|---|---|---|---|
| `REDIS_URL` | Redis connection string backing the BullMQ job queue (webhook delivery, security threat/compliance jobs, queued verification/reset email) | No | `redis://127.0.0.1:6379` |
| `ENABLE_QUEUES` | Disables background job processing entirely when `false` — enqueue calls become logged no-ops instead of attempting to reach Redis, and no workers start | No | `true` |

`docker-compose up` provides a local Redis matching the default. See [Architecture.md](./Architecture.md) for the queue/worker design and `server/src/jobs/` for the implementation. The bull-board monitoring dashboard is available at `/api/v1/developer/queues` behind the `operations.queues.manage` permission.

### AI Providers

| Variable | Description | Required | Default |
|---|---|---|---|
| `GEMINI_API_KEY` | Google Gemini API key | **Production**, if AI enabled | — |
| `OPENAI_API_KEY` | OpenAI API key | **Production**, if AI enabled | — |
| `ANTHROPIC_API_KEY` | Anthropic API key | **Production**, if AI enabled | — |
| `DEFAULT_AI_PROVIDER` | `auto` / `gemini` / `openai` / `anthropic` | No | `auto` |

At least one AI provider key is required in production when `ENABLE_AI=true`; if `DEFAULT_AI_PROVIDER` is set to a specific provider, that provider's key must be present.

### Social Platform OAuth

Every provider needs `OAUTH_TOKEN_ENCRYPTION_KEY` (32 raw bytes, hex- or base64-encoded) plus its own client ID/secret pair before it becomes available. Register OAuth callbacks as `{APP_URL}/api/v1/platforms/oauth/{provider}/callback`.

| Variable | Description | Required | Default |
|---|---|---|---|
| `OAUTH_TOKEN_ENCRYPTION_KEY` | AES key encrypting stored OAuth tokens | **Production**, if platform sync enabled | — |
| `OAUTH_SESSION_TTL_MINUTES` | OAuth handshake session lifetime | No | `15` |
| `META_CLIENT_ID` / `META_CLIENT_SECRET` | Facebook + Instagram (Meta Graph API) | No | — |
| `META_GRAPH_VERSION` | Meta Graph API version | No | `v23.0` |
| `LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET` | LinkedIn | No | — |
| `LINKEDIN_API_VERSION` | LinkedIn API version header | No | `202607` |
| `LINKEDIN_OAUTH_SCOPES` | Space-separated LinkedIn scopes | No | `openid profile w_member_social r_organization_social rw_organization_admin` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | YouTube (Google OAuth) | No | — |
| `TIKTOK_CLIENT_KEY` / `TIKTOK_CLIENT_SECRET` | TikTok | No | — |
| `PINTEREST_CLIENT_ID` / `PINTEREST_CLIENT_SECRET` | Pinterest | No | — |
| `X_CLIENT_ID` / `X_CLIENT_SECRET` | X (OAuth2 + PKCE) | No | — |

At least one complete provider pair (plus `OAUTH_TOKEN_ENCRYPTION_KEY`) is required in production when `ENABLE_PLATFORM_SYNC=true`.

### Email (SMTP)

| Variable | Description | Required | Default |
|---|---|---|---|
| `SMTP_HOST` | SMTP server host | **Production**, if email enabled | — |
| `SMTP_PORT` | SMTP server port | No | `587` |
| `SMTP_USER` | SMTP auth username | **Production**, if email enabled | — |
| `SMTP_PASSWORD` | SMTP auth password | **Production**, if email enabled | — |
| `SMTP_FROM` | From address for transactional email | **Production**, if email enabled | — |

Without SMTP configured, email sending no-ops with a warning log instead of failing — verification/reset links won't actually be delivered.

### Billing (Razorpay)

| Variable | Description | Required | Default |
|---|---|---|---|
| `ENABLE_BILLING` | Enables the billing module | No | `false` |
| `RAZORPAY_KEY_ID` | Razorpay key ID (`rzp_test_...` / `rzp_live_...`) | **Production**, if billing enabled | — |
| `RAZORPAY_KEY_SECRET` | Razorpay key secret | **Production**, if billing enabled | — |
| `RAZORPAY_WEBHOOK_SECRET` | Signs/verifies incoming Razorpay webhooks | **Production**, if billing enabled | — |
| `RAZORPAY_PROFESSIONAL_MONTHLY_PLAN_ID` | Razorpay plan ID for monthly billing | **Production**, if billing enabled | — |
| `RAZORPAY_PROFESSIONAL_ANNUAL_PLAN_ID` | Razorpay plan ID for annual billing | **Production**, if billing enabled | — |
| `RAZORPAY_CURRENCY` | 3-letter currency code | No | `INR` |
| `RAZORPAY_PROFESSIONAL_MONTHLY_PRICE_MINOR` | Monthly price, minor units | No | `399900` |
| `RAZORPAY_PROFESSIONAL_ANNUAL_PRICE_MINOR` | Annual price, minor units | No | `3838800` |

### Rate Limiting

| Variable | Description | Required | Default |
|---|---|---|---|
| `RATE_LIMIT_WINDOW_MS` | Base rate-limit window | No | `900000` (15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window (general API) | No | `100` |

Auth, OTP, recovery, token, invitation, billing, and webhook endpoints additionally carry their own tighter, purpose-specific limiters (see `server/src/middleware/rateLimiter.ts`).

### Logging & Operations

| Variable | Description | Required | Default |
|---|---|---|---|
| `LOG_LEVEL` | `error` / `warn` / `info` / `debug` | No | `info` |
| `METRICS_ENABLED` | Exposes `GET /api/v1/metrics` (Prometheus text format) | No | `true` |
| `OPERATIONS_MONITOR_ENABLED` | Enables the readiness-polling monitor loop | No | `true` |
| `OPERATIONS_ALERT_WEBHOOK_URL` | HTTPS endpoint notified on degraded/not-ready state | No | — |
| `OPERATIONS_CHECK_INTERVAL_MS` | Monitor poll interval | No | `300000` |
| `OPERATIONS_ALERT_COOLDOWN_MS` | Minimum time between repeat alerts | No | `1800000` |

### Feature Flags

| Variable | Description | Required | Default |
|---|---|---|---|
| `ENABLE_AI` | Enables the AI module | No | `true` |
| `ENABLE_PLATFORM_SYNC` | Enables social platform OAuth/sync | No | `true` |
| `ENABLE_EMAIL` | Enables transactional email | No | `false` |
| `ENABLE_ANALYTICS` | Enables the analytics module | No | `true` |
| `ENABLE_BILLING` | Enables the billing module (see [Billing](#billing-razorpay)) | No | `false` |

### Security & Deployment

| Variable | Description | Required | Default |
|---|---|---|---|
| `BCRYPT_ROUNDS` | Password hashing cost factor | No | `12` |
| `TRUST_PROXY` | Trust `X-Forwarded-*` headers (always `true` in production regardless of this value) | No | `false` |
| `RENDER_EXTERNAL_URL` | Set automatically by Render | No | — |
| `VERCEL_URL` | Set automatically by Vercel (client-side build only) | No | — |
| `API_VERSION` | API version prefix | No | `v1` |

### Production-only requirements

`NODE_ENV=production` enables additional validation on top of the table above — the server refuses to start unless every enabled feature's credentials are complete:

- `IDENTITY_ENCRYPTION_KEY` is always required.
- `ENABLE_AI=true` requires at least one AI provider key (and a matching key for `DEFAULT_AI_PROVIDER` if it isn't `auto`).
- `ENABLE_PLATFORM_SYNC=true` requires `OAUTH_TOKEN_ENCRYPTION_KEY` plus at least one complete OAuth provider pair.
- `ENABLE_EMAIL=true` requires all four SMTP variables.
- `ENABLE_BILLING=true` requires all five required Razorpay variables.

Run `npm run config:validate:strict` to check this before deploying (see `server/src/scripts/validateRuntimeConfig.ts`).

### Notes

- **`NODE_ENV`** affects: cookie `secure` flag (forced `true` in production), `TRUST_PROXY` (forced `true` in production), health/readiness endpoint disclosure detail (reduced in production), error detail exposure
- **`MONGO_URI`** supports both `mongodb://` (local) and `mongodb+srv://` (Atlas) protocols
- **`CORS_ORIGIN`** must match the client's actual origin including protocol and port; comma-separate for multiple origins
- **Cloudinary** variables are all required together if avatar/media upload is needed; if any are empty, upload features are disabled
- Generate secrets with `openssl rand -hex 64` (JWT) / `openssl rand -hex 32` (cookie, identity, OAuth token encryption)

### Server .env.example

Location: `server/.env.example` — copy it to `server/.env` and fill in the values you need; it is grouped into the same sections as this document and kept in sync with `server/src/config/env.ts`.

---

## Client Variables

Exposed at build time via Vite's `import.meta.env`. Only variables prefixed with `VITE_` are exposed to the client bundle.

| Variable | Description | Required | Default | Example |
|---|---|---|---|---|
| `VITE_API_URL` | Backend API base URL | No | `http://localhost:4000` | `https://nexpulse-api.onrender.com` |
| `VITE_APP_NAME` | Application display name | No | `NEXPULSE AI` | `NEXPULSE AI` |
| `VITE_APP_VERSION` | Application version | No | `1.0.0` | `1.0.0` |
| `VITE_ENABLE_ANALYTICS` | Enable usage analytics | No | `false` | `true` |

### Client .env.example

Location: `client/.env.example`

```env
# Client
VITE_API_URL=http://localhost:4000
VITE_APP_NAME=NEXPULSE AI
VITE_APP_VERSION=1.0.0
VITE_ENABLE_ANALYTICS=false
```

### Notes

- Client env vars are **statically embedded at build time** — changes require a rebuild
- `VITE_API_URL` is used by the Axios instance as `baseURL` and by the proxy in `vite.config.ts` during development
- Only `VITE_*` variables are available in the client bundle; secrets must never be prefixed with `VITE_`

---

## Setup Instructions

```bash
# Server
cp server/.env.example server/.env
# Edit server/.env with your values

# Client (optional — defaults work for local dev)
cp client/.env.example client/.env
```

> **Never commit `.env` files to version control.** They are listed in `.gitignore`.
