# Architecture

## System Overview

NEXPULSE is a full-stack TypeScript application with a decoupled client/server architecture. The client is a React SPA served by Vite, and the server is an Express REST API backed by MongoDB.

```
┌────────────────────────────────────────────────────┐
│                   Browser                          │
│  ┌──────────────────────────────────────────────┐  │
│  │         React SPA (Vite + TS)                │  │
│  │  ┌─────────┐ ┌──────────┐ ┌──────────────┐  │  │
│  │  │ Zustand │ │ React    │ │ Framer Motion│  │  │
│  │  │ Stores  │ │ Query    │ │ + Recharts   │  │  │
│  │  └────┬────┘ └────┬─────┘ └──────────────┘  │  │
│  │       │            │                         │  │
│  │  ┌────▼────────────▼──────────┐              │  │
│  │  │    Axios (with JWT         │              │  │
│  │  │    interceptor + refresh)  │              │  │
│  │  └────────────┬───────────────┘              │  │
│  └───────────────┼──────────────────────────────┘  │
└──────────────────┼─────────────────────────────────┘
                   │ HTTP/REST /api/v1/*
                   ▼
┌────────────────────────────────────────────────────┐
│              Express Server (Node.js)              │
│                                                    │
│  ┌──────────────────────────────────────────────┐  │
│  │  Middleware Stack                            │  │
│  │  helmet → cors → compression → cookieParser  │  │
│  │  → requestId → morgan → rateLimiter          │  │
│  └──────────────────────┬───────────────────────┘  │
│                         │                          │
│  ┌──────────────────────▼───────────────────────┐  │
│  │  Routes /api/v1/* (14 module prefixes)      │  │
│  │  auth · identity · platforms · analytics ·  │  │
│  │  dashboard · reports · notifications ·      │  │
│  │  settings · workspaces · developer ·        │  │
│  │  security · billing · ai (+ public /oauth)  │  │
│  │  ┌──────────────────┬───────────────────┐   │  │
│  │  │  Modules (Controller → Service →     │   │  │
│  │  │           Repository → Model)         │   │  │
│  │  └──────────────────┬───────────────────┘   │  │
│  └─────────────────────┼────────────────────────┘  │
│                        │                           │
│  ┌─────────────────────▼────────────────────────┐  │
│  │  MongoDB (Mongoose ODM), 30 models —         │  │
│  │  see docs/Database.md for the full           │  │
│  │  collection-by-module list                   │  │
│  └──────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────┘
```

> The diagram above is intentionally compact — see [Database.md](./Database.md) for every model and [API.md](./API.md) for every route.

---

## Client Architecture

### Pages (lazy-loaded)

| Page | Route | Auth Required |
|---|---|---|
| `LandingPage` | `/` | No |
| `GetStartedPage` | `/get-started` | No |
| `LoginPage` | `/login` | No |
| `RegisterPage` | `/register` | No |
| `ForgotPasswordPage` | `/forgot-password` | No |
| `ResetPasswordPage` | `/reset-password` | No |
| `VerifyEmailPage` | `/verify-email` | No |
| `OAuthConsentPage` | `/oauth/authorize` | Yes |
| `DashboardPage` | `/dashboard` | Yes |
| `AnalyticsPage` | `/analytics` | Yes |
| `PlatformsPage` | `/platforms` | Yes |
| `ReportsPage` | `/reports` | Yes |
| `AIPage` | `/ai` | Yes |
| `TeamPage` | `/team` | Yes |
| `BillingPage` | `/billing` | Yes |
| `DeveloperPage` | `/developer` | Yes |
| `SecurityPage` | `/security` | Yes |
| `SettingsPage` | `/settings` | Yes |
| `NotificationsPage` | `/notifications` | Yes |
| `ProfilePage` | `/profile` | Yes |
| `MaintenancePage` | `/maintenance` | No |
| `NotFoundPage` | `*` | No |

`AIPage` sits under its own `AILayout` (not `MainLayout`); every other authenticated page shares `MainLayout` (navbar + sidebar). Both layouts wrap their `<Outlet />` in an `ErrorBoundary`. Two more page components exist but aren't routed: `OfflinePage` is mounted globally (not per-route) as a connectivity overlay in `AuthenticatedApplication.tsx`.

### Component Layers

```
pages/              → Route-level page components (lazy-loaded), 24 total
  └─ components/    → layout/, glass/, common/, auth/, landing/, get-started/, identity/, platforms/, enterprise/, effects/, ui/
      └─ glass/     → Glass morphism design primitives (GlassButton, GlassCard, GlassInput, GlassBadge, GlassAvatar, GlassSearch)
          └─ common/ → Shared components (ProtectedRoute, ErrorBoundary, EmptyState, Skeleton family, BrandLogo, ThemeToggle)
```

See [DesignSystem.md](./DesignSystem.md) for the full component-directory breakdown. There is no dedicated `charts/`, `dashboard/`, or `forms/` component directory — chart rendering and dashboard widgets are built inline within their owning page rather than factored into a shared library.

### Feature Modules

Features are organized under `features/`:

- **features/core/** — Dashboard/analytics/platforms/workspace/notifications/reports/settings hooks and API clients (`hooks/`, `services/`, `types/`, `constants/`). `store/` currently holds just `notificationStore.ts` (Zustand) — most server state lives in React Query, not client-side stores; `client/src/store/` (the top-level, feature-agnostic store folder) is an intentionally empty placeholder for future client-only state.
- **features/billing/** — Razorpay checkout + subscription API client.
- **features/developer/** — API keys, OAuth apps, webhooks, plugin marketplace API client.
- **features/security/** — Zero-trust policy, secrets, DLP, threats, incidents API client.
- **features/personalization/** — `PersonalizationProvider` + `WorkspacePersonalizationPanel`, persisting workspace UI preferences (density, accent, motion, sidebar width, widget order) through the settings API.
- **features/ai/** — Thin layout/routing shim (`AILayout`) only — the actual chat logic (streaming, tool calls, citations) lives directly in `pages/AI.tsx`, not in a separate `core/`+`components/` split.

### State Management

Two-layer approach:

1. **React Query** (`features/core/hooks/*`) — Server state: caching, background refetch, retries with backoff, pagination. This carries the large majority of state in the app.
2. **Zustand** (`features/core/store/notificationStore.ts`) — The one piece of client-only state currently factored into a store (live notification stream state); most other local UI state is plain `useState` colocated in the owning component.
3. **Contexts** — `AuthContext` (access token + user, refresh-on-mount), `PersonalizationProvider`, `ThemeContext` — used for cross-cutting concerns that aren't naturally server state.

### Routing

Routes are defined in `routes/AppRouter.tsx` using React Router v6 with:
- Public routes (Landing, Login, Register, etc.)
- Protected routes wrapped in `<ProtectedRoute>` with `<MainLayout>` (navbar + sidebar)
- AI routes wrapped in `<ProtectedRoute>` with `<AILayout>`
- Lazy-loaded pages with `<Suspense>` and `LoadingOverlay`

### API Communication

- Axios instance configured in `lib/axios.ts`
- Base URL from `VITE_API_URL` env var
- `withCredentials: true` for device-bound, rotating opaque refresh cookies
- Request interceptor attaches `Bearer` token from AuthContext
- Response interceptor handles 401 with automatic token refresh and request queue

---

## Server Architecture

### Module Pattern

Each feature module follows a layered architecture:

```
modules/<module>/
├── routes.ts         ← Route definitions with validators
├── controller.ts     ← Request/response handling
├── service.ts        ← Business logic
├── repository.ts     ← Database access (data layer)
├── model.ts          ← Mongoose schema/model
├── types.ts          ← TypeScript types
├── validator.ts      ← Zod request schemas
└── index.ts          ← Barrel exports
```

### Modules

14 modules under `server/src/modules/`. `dashboard`, `settings`, and `workspaces` are thin — they have no model of their own (see [Database.md](./Database.md)).

| Module | Description |
|---|---|
| **auth** | Register, login, logout, session rotation, password management, email verification, avatar upload, and MFA login |
| **identity** | RBAC/ABAC, device sessions, MFA management (TOTP/email OTP/recovery/trusted devices), API credentials, service accounts, team invitations, audit events, identity policies, SSO readiness |
| **platforms** | OAuth connect/disconnect for 6 social platforms (7 connection types — Meta covers both Facebook and Instagram), sync, analytics/posts/audience/growth |
| **analytics** | Cross-platform analytics aggregation and normalization, cached as snapshots |
| **dashboard** | Dashboard summary — delegates to `analytics`, no model of its own |
| **reports** | CSV/PDF report generation and export |
| **notifications** | In-app notifications plus a live SSE stream |
| **settings** | User preferences + workspace personalization — persists onto `User.preferences`, no model of its own |
| **workspaces** | Workspace list/current/switch — operates on the `Workspace` model owned by `auth` |
| **developer** | OAuth 2.1 developer apps, API keys' bigger sibling, webhooks, plugin marketplace, usage/quota metering, plus the `/oauth` public authorization-server endpoints |
| **security** | Zero-trust policy engine, secrets manager, data governance/DLP, threat detection, incident response, compliance evidence |
| **billing** | Razorpay subscription lifecycle, signed/idempotent webhook processing |
| **ai** | Streaming chat over OpenAI/Anthropic/Gemini, conversation persistence, memory, tool-calling against real analytics/report data |

### Middleware Stack (applied in order, `server/src/app.ts`)

| Middleware | Purpose |
|---|---|
| `helmet({ contentSecurityPolicy: {...}, crossOriginResourcePolicy: {...} })` | Security headers with explicit CSP directives; CORP set to `cross-origin` since the client (Vercel) and server (Render) are deployed on different sites by design |
| `cors({ origin: config.cors.origin, credentials: true })` | CORS with a configurable, comma-separated origin allowlist |
| `compression()` | Gzip response compression |
| `express.json({ limit: '1mb' })` | JSON body parsing (captures raw body for the billing webhook route's signature check) |
| `express.urlencoded()` | URL-encoded body parsing |
| `cookieParser(secret)` | Cookie signing/parsing |
| `requestId` | Attach unique ID to each request (`req.id`) |
| `recordRequestMetrics` | Track request/error counts and duration for `/metrics` |
| `morganMiddleware` | HTTP request logging via Winston |
| `apiGatewayIngress` | Per-credential API usage metering for the developer platform |
| `authLimiter` on `/api/v1/auth`, `apiLimiter` on `/api/v1/health` and `/api/v1/ready` | Route-scoped rate limiting (each module additionally applies its own purpose-specific limiters — see [API.md](./API.md#rate-limits)) |
| Routes | `/api/v1/*` (14 module routers, mounted in `routes/v1/index.ts`) |
| Non-API `GET *` | 307-redirects to `CLIENT_URL` — this server never renders HTML itself |
| `notFound` | 404 handler |
| `errorHandler` | Global error handler — sanitizes non-operational errors before they reach the client |

### Background Job Queue (`server/src/jobs/`)

BullMQ + Redis, replacing the earlier in-process `setInterval` workers. Three queues:

| Queue | Producer | Worker concurrency | Retry policy |
|---|---|---|---|
| `webhook-delivery` | `developer/webhookService.ts` (`publish`, `testEndpoint`, `replay`) | 10 | 8 attempts, exponential backoff from 15s |
| `email` | `auth/service.ts` (register, forgot-password, resend-verification) | 5 | 5 attempts, exponential backoff from 10s |
| `security` | Scheduled on startup (repeatable jobs) | 1 | 3 attempts, exponential backoff from 30s |

Design notes:

- **Lazy connections.** Nothing in `jobs/` connects to Redis at module-import time — `Queue`/`Worker` instances are constructed on first use (`getWebhookQueue()`, `startJobWorkers()`), not at the top of the file. This matters because `webhookService.ts` and `auth/service.ts` are on the import path of `app.ts`, which integration tests import directly; eager connection would mean every test run tries to reach Redis.
- **Fire-and-forget enqueueing.** `jobs/queues.ts`'s `enqueue()` never propagates a failure to the caller — an unreachable Redis logs an error and the request completes normally, the same degrade-gracefully pattern `emailService` already used for an unconfigured SMTP server. Producer-side Redis connections use bounded retries (`connectTimeout: 5s`, max 3 retries) so this fails fast rather than hanging.
- **`ENABLE_QUEUES=false`** short-circuits `enqueue()` to a logged no-op and skips starting workers — for environments that want zero Redis dependency.
- **Retry timing moved from Mongo to BullMQ.** The `WebhookDelivery` Mongoose record is still the developer-facing audit log (status, attempt history, response bodies), but *when* a retry happens is now owned by BullMQ's backoff config, not the record's `nextAttemptAt` field (which is now advisory/display-only).
- **Monitoring.** A bull-board dashboard is mounted at `/api/v1/developer/queues`, gated behind `requireAuth` + the `operations.queues.manage` permission (granted to `workspace_admin` and above). It's also built lazily — the router is constructed on the first request to that path, not at `app.ts` load time.
- **Repeatable jobs are idempotent to (re)register.** `scheduleRecurringSecurityJobs()` runs on every server startup; BullMQ keys a repeatable job by name + repeat options, so this doesn't create duplicate schedulers on restart.

### Error Handling

Custom error hierarchy in `errors/`:

```
AppError (base)
├── ValidationError      (400) — with field-level errors
├── AuthenticationError  (401)
├── AuthorizationError   (403)
├── NotFoundError        (404)
├── ConflictError        (409)
└── DatabaseError        (500)
```

Error response format:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "errors": { "email": ["Invalid email address"] }
  }
}
```

---

## Data Flow

```
User Action
    │
    ▼
Page Component (e.g., DashboardPage)
    │
    ├─ Reads from Zustand store (UI state)
    └─ Uses React Query hook (e.g., useDashboard())
           │
           ▼
    Query key triggers fetcher
           │
           ▼
    features/core/services/api.ts
           │
           ▼
    Axios instance (lib/axios.ts)
    └─ Interceptor adds Bearer token
           │
           ▼
    HTTP Request ──────────► Express Server
                                │
                           Middleware stack
                                │
                           Route handler → Controller
                                │
                           Service (business logic)
                                │
                           Repository (data access)
                                │
                           Mongoose Model
                                │
                           MongoDB
                                │
                           ◄──── Response ────┐
                                │              │
                           apiResponse()      │
                           wrapper            │
                                │              │
    ◄──── JSON Response ───────┘              │
    │                                          │
    Axios interceptor checks status            │
    └─ 401 → auto-refresh token                │
    └─ Error → reject with message             │
    │                                          │
    React Query:                               │
    ├─ Caches response (staleTime: 5min)       │
    ├─ Updates query data                      │
    └─ Component re-renders                    │
    │                                          │
    Provider (if present):                     │
    └─ Syncs to Zustand store                  │
```

---

## Key Design Decisions

### 1. Module Pattern over Flat Structure
Server modules encapsulate all layers of a feature (routes, controller, service, repository, model) in a single directory. This keeps features self-contained and makes it easy to reason about dependencies.

### 2. Two-Layer State Management
- **React Query** handles server state with caching, deduplication, and background sync
- **Zustand** handles client-only state (UI state, streaming status, active IDs)
- Providers bridge the two, syncing React Query data into Zustand stores when needed

### 3. Cookie-Based Refresh Tokens
Refresh tokens are stored in httpOnly cookies (secure in production), reducing XSS risk. Access tokens are short-lived (15 min default) and stored in memory (AuthContext), not localStorage.

### 4. Adapter Pattern for Platforms
Each social platform implements a common adapter interface (`buildAuthorizationUrl`/`exchangeCode`/`discoverAccounts`/`fetchAnalytics`, plus an optional `revokeAccess`), allowing uniform data access regardless of the underlying vendor API. All adapters make real calls to the vendor's actual API — none are mocked. Current adapters: Meta (Facebook + Instagram), LinkedIn, TikTok, X, YouTube, Pinterest. `revokeAccess` isn't implemented for LinkedIn or Pinterest yet, so disconnecting those two only deletes the local record — the provider-side grant must be revoked by the user on the provider's own site.

### 5. Provider Adapter Pattern for AI
Similarly, each AI provider implements a common adapter interface with a streaming `chat()` generator. All three configured providers make real streaming API calls — OpenAI, Anthropic, and Google Gemini — selected per-request or via `DEFAULT_AI_PROVIDER`. There is no mock/offline provider in the current codebase; at least one provider key is required for the AI module to function.

### 6. Zod Validation Everywhere
- Server: Zod schemas validate request bodies via `validate()` middleware
- Config: Zod schema validates `process.env` on startup (fail fast)
- Client: Zod schemas used with react-hook-form via `@hookform/resolvers`

### 7. Strict TypeScript Configuration
Both client and server use:
- `strict: true`
- `verbatimModuleSyntax: true`
- `noUnusedLocals: true`, `noUnusedParameters: true`
- `noFallthroughCasesInSwitch: true`
- `noUncheckedSideEffectImports: true`
- `.js` extensions in all relative imports

### 8. Glass Morphism Design System
The UI is built around a glass-morphism aesthetic with CSS custom properties for theming. The `components/glass/` directory contains primitives (GlassButton, GlassCard, GlassInput, etc.) that serve as the foundation for all UI.

### 9. Graceful Shutdown
Server handles SIGTERM and SIGINT signals, closing the HTTP server, stopping job workers, closing the Redis connections, and disconnecting from MongoDB, in that order.
