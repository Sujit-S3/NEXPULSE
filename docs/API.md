# API Reference

Base URL: `http://localhost:4000/api/v1` (dev) · production base URL is your Render deployment (see [Deployment.md](./Deployment.md)).

All endpoints return JSON. Browser authentication uses a short-lived, session-bound Bearer access token (`Authorization: Bearer <accessToken>`) and a rotating opaque HttpOnly refresh cookie. Machine clients use scoped API keys (`X-API-Key`) or service-account tokens. See [identity-platform.md](./identity-platform.md) for the full identity/session/MFA model.

Every route below except the ones explicitly marked **Public** requires `requireAuth`; most additionally require a specific permission string via `requirePermission(...)` — see [identity-platform.md](./identity-platform.md) for the permission catalogue. Routes marked **Interactive session required** additionally reject machine (API-key/service-account) credentials.

---

## Response Format

### Success
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message"
}
```

### Error
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error description",
    "errors": {
      "fieldName": ["Field-level error message"]
    }
  }
}
```

See [Error Codes](#error-codes) for the full list.

---

## Authentication (`/auth`)

| Method | Endpoint | Public | Description |
|---|---|---|---|
| `POST` | `/auth/register` | Yes | Create a user + workspace |
| `POST` | `/auth/login` | Yes | Returns `accessToken`, or a `202` MFA challenge |
| `POST` | `/auth/mfa/verify` | Yes | Completes login after an MFA challenge |
| `POST` | `/auth/logout` | — | Revokes the current device session |
| `POST` | `/auth/refresh` | Yes (cookie) | Issues a new `accessToken` from the refresh cookie |
| `POST` | `/auth/forgot-password` | Yes | Sends a reset token if the email exists |
| `POST` | `/auth/reset-password` | Yes | Resets password with an emailed token |
| `POST` | `/auth/verify-email` | Yes | Verifies email with a token |
| `POST` | `/auth/resend-verification` | Yes | Resends the verification email |
| `GET` | `/auth/me` | — | Current user |
| `PATCH` | `/auth/profile` | — | Update `firstName`/`lastName`/`avatar`/`preferences` |
| `PATCH` | `/auth/password` | — | Change password; revokes all other sessions |
| `POST` | `/auth/avatar` | — | Multipart avatar upload (`multipart/form-data`, field `avatar`, ≤5MB), stored via Cloudinary |

All of these carry purpose-specific rate limiting (`authLimiter` on register/login, `otpLimiter` on MFA verify, `recoveryLimiter` on forgot/reset/resend, `tokenLimiter` on refresh) plus `requireTrustedOrigin` on every state-changing route.

### Register

```
POST /auth/register
```

**Body:**
```json
{
  "firstName": "Jane",
  "lastName": "Doe",
  "email": "jane@example.com",
  "password": "a long private passphrase",
  "confirmPassword": "a long private passphrase",
  "invitationToken": "optional-32-to-256-char-token"
}
```

**Constraints:** password 15–128 characters, rejected if it matches a blocklist/repeated-phrase pattern. Composition rules (uppercase/digit/symbol) are not imposed.

**Response (201):**
```json
{
  "success": true,
  "data": { "user": { "id": "...", "firstName": "Jane", "workspaceId": "...", "role": "workspace_owner", "...": "..." }, "accessToken": "eyJ..." },
  "message": "Registration successful"
}
```

### Login

```
POST /auth/login
```

**Body:** `{ "email": "jane@example.com", "password": "...", "rememberMe": false }`

**Response (200):** `{ "user": { ... }, "accessToken": "eyJ..." }`, plus a device-bound rotating refresh cookie.

**Response (202)** if MFA is enabled — no session is created yet:
```json
{ "success": true, "data": { "mfaRequired": true, "challengeToken": "...", "methods": ["totp", "email", "recovery"] } }
```

### Verify MFA

```
POST /auth/mfa/verify
```

**Body:** `{ "challengeToken": "...", "method": "totp", "code": "123456", "rememberDevice": false }`

**Response (200):** same shape as a successful login (`user`, `accessToken`, refresh cookie set).

### Refresh / Forgot / Reset / Verify Email

Unchanged wire shape from the table above — see `server/src/modules/auth/validator.ts` for exact field constraints if you need to validate client-side before submitting.

---

## Platform Endpoints (`/platforms`)

Connecting a social account is a **3-step OAuth flow** (not a single "connect with credentials" call): start → provider redirect/callback → select which discovered accounts to keep.

| Method | Endpoint | Public | Description |
|---|---|---|---|
| `GET` | `/platforms/providers` | Yes | Which social providers are configured (no secrets) |
| `GET` | `/platforms/provider-status` | Yes | Per-provider health/configuration status |
| `GET` | `/platforms/oauth/:provider/callback` | Yes | Provider redirects here after consent; NEXPULSE redirects the browser onward |
| `GET` | `/platforms/connections` | — | List this workspace's connected accounts |
| `GET` | `/platforms/health` | — | Sync health per connection |
| `POST` | `/platforms/oauth/:provider/start` | — | Step 1: begin the OAuth handshake |
| `GET` | `/platforms/oauth/sessions/:sessionId/accounts` | — | Step 3a: list accounts discovered after provider consent |
| `POST` | `/platforms/oauth/sessions/:sessionId/select` | — | Step 3b: choose which discovered accounts to persist as connections |
| `PATCH` | `/platforms/connections/:connectionId/primary` | — | Mark a connection primary for its provider |
| `DELETE` | `/platforms/connections/:connectionId` | — | Disconnect (best-effort remote token revocation — see [identity-platform.md](./identity-platform.md) for the two providers that don't support it) |

`:provider` is one of `instagram`, `facebook`, `linkedin`, `tiktok`, `x`, `youtube`, `pinterest`.

### Step 1 — start

```
POST /platforms/oauth/instagram/start
```

**Body (optional):** `{ "returnTo": "/platforms", "forceConsent": false }`

**Response (201):** `{ "authorizationUrl": "https://...", "sessionId": "..." }` — redirect the browser to `authorizationUrl`.

### Step 2 — provider callback (browser-driven, not called directly)

`GET /platforms/oauth/:provider/callback?code=...&state=...` — the provider redirects here; NEXPULSE exchanges the code, discovers the user's accounts on that platform, and 303-redirects the browser to the client app with the OAuth session id.

### Step 3 — select accounts

```
GET /platforms/oauth/sessions/:sessionId/accounts
POST /platforms/oauth/sessions/:sessionId/select
```

**Select body:** `{ "accountIds": ["123456"] }` — persists the chosen discovered accounts as `PlatformConnection` records (encrypted tokens).

---

## Analytics, Dashboard & Reports

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/analytics?connectionId=...&from=...&to=...` | Normalized cross-platform analytics |
| `GET` | `/analytics/audience` | Audience demographics |
| `GET` | `/analytics/growth` | Historical growth series |
| `GET` | `/dashboard` | Dashboard summary (delegates to analytics; no dedicated model) |
| `GET` | `/reports` | List generated reports |
| `POST` | `/reports` | Generate a report (`{ connectionId, title, from, to }`) |
| `GET` | `/reports/:reportId/export` | Export as CSV or a minimal hand-rolled PDF |

## Notifications (`/notifications`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/notifications/stream` | Server-Sent Events stream of live notifications |
| `GET` | `/notifications?status=unread\|read\|archived&type=...&page=&limit=` | Paginated list |
| `PATCH` | `/notifications/read-all` | Mark all read |
| `PATCH` | `/notifications/:notificationId/read` | Mark one read |
| `PATCH` | `/notifications/:notificationId/archive` | Archive one |

## Settings (`/settings`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/settings` | User preferences + workspace personalization |
| `PATCH` | `/settings` | Update either; persists onto `User.preferences` (no dedicated model) |

## Workspaces (`/workspaces`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/workspaces` | Workspaces the current user belongs to |
| `GET` | `/workspaces/current` | The active workspace |
| `POST` | `/workspaces/:workspaceId/switch` | Switch active workspace — reissues `accessToken` scoped to the new workspace |

---

## Identity Endpoints (`/identity`)

Sessions, MFA, credentials, and team management. See [identity-platform.md](./identity-platform.md) for the full RBAC/MFA model this surface manages.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/identity/info` | Role/permission catalogue + security configuration |
| `GET` | `/identity/sessions` | List this user's active sessions **(interactive)** |
| `DELETE` | `/identity/sessions/:sessionId` | Revoke one session **(interactive)** |
| `POST` | `/identity/sessions/revoke-others` | Revoke every session but the current one **(interactive)** |
| `GET` | `/identity/mfa` | MFA status (TOTP/email OTP/recovery codes/trusted devices) **(interactive)** |
| `POST` | `/identity/mfa/totp/setup` | Begin TOTP enrollment (requires password) **(interactive)** |
| `POST` | `/identity/mfa/totp/confirm` | Confirm TOTP with a 6-digit code, returns recovery codes **(interactive)** |
| `POST` | `/identity/mfa/email/enable` | Enable email OTP as a second factor **(interactive)** |
| `POST` | `/identity/mfa/recovery/regenerate` | Invalidate and reissue recovery codes **(interactive)** |
| `DELETE` | `/identity/mfa/trusted-devices/:deviceId` | Revoke a trusted device (and its sessions) **(interactive)** |
| `DELETE` | `/identity/mfa` | Disable MFA (requires password + a valid code) **(interactive)** |
| `GET` / `POST` | `/identity/credentials` | List / create personal API keys **(interactive)** |
| `POST` | `/identity/credentials/:credentialId/rotate` | Rotate a key (old one invalidated) **(interactive)** |
| `DELETE` | `/identity/credentials/:credentialId` | Revoke a key **(interactive)** |
| `GET` / `POST` | `/identity/service-accounts` | List / create machine identities **(interactive)** |
| `POST` | `/identity/service-accounts/:serviceAccountId/rotate` | Rotate a service token **(interactive)** |
| `DELETE` | `/identity/service-accounts/:serviceAccountId` | Disable a service account **(interactive)** |
| `GET` | `/identity/members` | Workspace member roster |
| `PATCH` | `/identity/members/:memberId/role` | Change a member's role **(interactive)** |
| `DELETE` | `/identity/members/:memberId` | Remove a member **(interactive)** |
| `GET` / `POST` | `/identity/invitations` | List / send invitations **(interactive to send)** |
| `POST` | `/identity/invitations/:invitationId/resend` | Resend an invitation **(interactive)** |
| `DELETE` | `/identity/invitations/:invitationId` | Revoke a pending invitation **(interactive)** |
| `POST` | `/identity/invitations/respond` | Accept/decline an invitation by token (**public** — the recipient isn't a member yet) |
| `GET` | `/identity/security-events` | The current user's own audit trail (`?page=&limit=`) **(interactive)** |
| `GET` | `/identity/audit` | Workspace-wide audit trail (`?page=&limit=&type=`) |
| `GET` / `PATCH` | `/identity/policies` | Workspace identity policy (password rules, session limits, MFA-required roles, IP allowlist) |
| `GET` | `/identity/sso/readiness` | Whether the org's SSO configuration is deployable |

Credential/key list responses are capped at 200 records server-side (see [Database.md](./Database.md)); there is no `page`/`limit` on those specific endpoints yet.

## Developer Platform (`/developer`, plus `/oauth`)

The public developer-facing surface: register OAuth apps, manage API keys' bigger sibling (full OAuth 2.1 apps), webhooks, and the plugin marketplace.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/developer/catalog` | Developer-platform capability/lifecycle catalogue |
| `GET` / `POST` | `/developer/applications` | List / register an OAuth 2.1 application |
| `POST` | `/developer/applications/:applicationId/rotate-secret` | Rotate an app's client secret |
| `DELETE` | `/developer/applications/:applicationId` | Revoke an application |
| `GET` / `POST` | `/developer/webhooks` | List / create outbound webhook subscriptions |
| `PATCH` | `/developer/webhooks/:endpointId` | Update a webhook (URL, subscribed events) |
| `POST` | `/developer/webhooks/:endpointId/rotate-secret` | Rotate the HMAC signing secret |
| `POST` | `/developer/webhooks/:endpointId/test` | Send a test delivery |
| `DELETE` | `/developer/webhooks/:endpointId` | Delete a webhook |
| `GET` | `/developer/webhook-deliveries?limit=` | Delivery ledger (status, attempts, response codes) |
| `POST` | `/developer/webhook-deliveries/:deliveryId/replay` | Re-send a specific delivery |
| `GET` | `/developer/marketplace` | Approved plugin listings |
| `GET` / `POST` | `/developer/plugins/submissions` | List / submit a plugin for review |
| `PATCH` | `/developer/plugins/:pluginId/approval` | Approve/reject a submission |
| `PUT` | `/developer/plugins/:pluginId/review` | Record a marketplace review |
| `POST` | `/developer/plugins/install` | Install an approved plugin into the workspace |
| `GET` | `/developer/plugin-installations` | This workspace's installed plugins |
| `PATCH` | `/developer/plugin-installations/:installationId` | Enable/disable an installation |
| `GET` / `PUT` | `/developer/quota` | Read/update this workspace's API quota policy |
| `GET` | `/developer/usage` | API gateway usage metrics |
| `GET` | `/developer/queues` | bull-board job queue monitoring dashboard (HTML UI, not a JSON API) — requires `operations.queues.manage` |

**Note:** installing a plugin only records the installation — there is no execution runtime wired up yet (see the Roadmap in the root README).

### Developer OAuth server (`/oauth`, public — this is NEXPULSE acting as an OAuth *provider* for third-party integrations, distinct from `/platforms/oauth/*` where NEXPULSE is an OAuth *client* of social platforms)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/oauth/authorize` | Consent screen data for a pending authorization request **(interactive)** |
| `POST` | `/oauth/authorize` | Approve the request, issuing an authorization code **(interactive)** |
| `POST` | `/oauth/token` | Exchange a code (or refresh token) for an access token — PKCE required |
| `POST` | `/oauth/revoke` | Revoke a token |

### Public organization/user resources (mounted at API root, not under `/developer`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` / `PATCH` | `/organizations/current` | Read/update the active organization |
| `GET` | `/users` | Members of the active workspace's organization |
| `GET` | `/users/:userId` | One member, scoped to the caller's workspace |

## Security Endpoints (`/security`)

The zero-trust/compliance control plane. Every route additionally runs `enforceZeroTrust(...)` on top of RBAC — a request can hold the right permission and still be denied or stepped-up by policy.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/security/dashboard` | Aggregate security posture summary |
| `GET` / `POST` | `/security/policies` | List / create zero-trust policy rules |
| `PATCH` | `/security/policies/:policyId` | Update a policy (versioned — see `PolicyRevision` in [Database.md](./Database.md)) |
| `GET` / `POST` | `/security/secrets` | List metadata / create a managed secret (value shown once) |
| `POST` | `/security/secrets/:secretId/rotate` | Rotate a secret to a new version |
| `DELETE` | `/security/secrets/:secretId` | Revoke a secret |
| `GET` / `POST` | `/security/governance/assets` | List / register a data asset for governance/classification |
| `POST` | `/security/governance/assets/:assetId/deletion` | Queue governed deletion |
| `POST` | `/security/dlp/inspect` | Run DLP detectors against a payload |
| `GET` | `/security/compliance` | Collected compliance evidence |
| `POST` | `/security/compliance/collect` | Trigger evidence collection |
| `GET` | `/security/threats` | Detected threat signals |
| `POST` | `/security/threats/evaluate` | Force a threat-detection evaluation pass |
| `PATCH` | `/security/threats/:signalId` | Update a signal's disposition |
| `GET` / `POST` | `/security/incidents` | List / open a security incident |
| `PATCH` | `/security/incidents/:incidentId` | Transition an incident's status |
| `POST` | `/security/incidents/:incidentId/contain` | Record containment actions |

## Billing Endpoints (`/billing`)

Razorpay-backed subscription billing.

| Method | Endpoint | Public | Description |
|---|---|---|---|
| `GET` | `/billing/plans` | Yes | Available plans/pricing |
| `POST` | `/billing/webhook` | Yes (signature-verified) | Razorpay webhook receiver — HMAC + idempotency verified, not RBAC-gated |
| `GET` | `/billing/subscription` | — | Current workspace subscription **(interactive)** |
| `POST` | `/billing/subscriptions` | — | Create a subscription **(interactive)** |
| `POST` | `/billing/subscriptions/confirm` | — | Confirm Razorpay Checkout's signed response **(interactive)** |
| `POST` | `/billing/subscription/cancel` | — | Cancel, optionally at cycle end **(interactive)** |

### Create → confirm flow

```
POST /billing/subscriptions
```
**Body:** `{ "billingCycle": "monthly" }` (or `"annual"`) → returns a Razorpay subscription to open in Checkout.

```
POST /billing/subscriptions/confirm
```
**Body:** `{ "subscriptionId": "...", "paymentId": "...", "signature": "..." }` — the three values Razorpay Checkout's success callback provides; the server verifies the HMAC signature before activating the subscription.

---

## AI Endpoints (`/ai`)

### Chat

```
POST /ai/chat
```

**Body:**
```json
{
  "connectionId": "platform-connection-id",
  "conversationId": "optional-existing-conversation-id",
  "message": "Analyze my Instagram engagement trends",
  "settings": { "model": "gpt-4o", "temperature": 0.7, "tone": "Professional", "responseLength": "Balanced" },
  "tools": ["analyze-platform"],
  "from": "2026-07-01T00:00:00.000Z",
  "to": "2026-08-01T00:00:00.000Z"
}
```

`model` must be one of the app's configured `AI_MODELS`; the response is generated by whichever real provider (OpenAI/Anthropic/Gemini) that model maps to — there is no mock provider in the current codebase.

### Stream Chat

```
POST /ai/stream
```

Same body as `/chat`, returns Server-Sent Events. On an unexpected server-side error, the stream emits `{"type":"error","message":"..."}` with the message sanitized to a generic string unless it's a known, safe-to-expose application error (see `server/src/modules/ai/controller.ts`).

### Abort Stream

```
POST /ai/stream/:conversationId/abort
```

### Conversations & Memory

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/ai/conversations` | Create a conversation (`{ model }`) |
| `GET` | `/ai/conversations?page=&limit=` | List this user's conversations in the current workspace |
| `GET` | `/ai/conversations/:conversationId` | Get one conversation with messages |
| `PATCH` | `/ai/conversations/:conversationId` | Rename / change model |
| `DELETE` | `/ai/conversations/:conversationId` | Delete |
| `GET` | `/ai/memory?type=` | List workspace AI memory entries |
| `POST` | `/ai/memory` | Set a memory entry (`{ key, value, type, ttl? }`) |

---

## Health Endpoints

### Health Check

```
GET /health
```

**Response (200), non-production:**
```json
{ "success": true, "data": { "status": "healthy", "app": "NEXPULSE AI", "apiVersion": "v1", "uptime": 12345.67, "environment": "development", "version": "0.1.0", "database": "connected" } }
```

**Response (200), production:** detail is intentionally reduced to avoid fingerprinting the deployment to anonymous callers: `{ "success": true, "data": { "status": "healthy", "uptime": 12345.67 } }`

### Readiness

```
GET /ready
```

Returns per-subsystem checks (database, identity, ai, platforms, email, billing, monitoring). **Response (200)** when `ready: true`, **(503)** otherwise. In production, each check's `message`/`configured` detail is redacted to `id`/`enabled`/`ready`/`required` only — see `server/src/operations/readiness.ts`.

### Metrics

```
GET /metrics
```

Prometheus text-format metrics (request counts, error counts, readiness gauges). Only mounted when `METRICS_ENABLED=true`; unauthenticated but low-cardinality/secret-free by design.

---

## Error Codes

| Code | Typical HTTP Status | Description |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Request body/query/params failed Zod validation |
| `AUTHENTICATION_ERROR` | 401 | Missing, invalid, or expired token |
| `AUTHORIZATION_ERROR` | 403 | Insufficient role/permission, or zero-trust policy denial |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT_ERROR` | 409 | Duplicate resource / already in a terminal state |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests for the matched limiter |
| `INTERNAL_SERVER_ERROR` | 500 | Unhandled server error (message is sanitized; details are logged server-side, not returned) |

## Rate Limits

Limits are tiered by endpoint sensitivity (`server/src/middleware/rateLimiter.ts`), not a single global limit. **All limits below apply only when `NODE_ENV=production`** — in development/test every limiter's max is relaxed to 100,000/window so local work and tests aren't throttled.

| Limiter | Applied to | Production limit |
|---|---|---|
| `apiLimiter` | General authenticated API traffic, `/health`, `/ready` | `RATE_LIMIT_MAX_REQUESTS` (default 100) / `RATE_LIMIT_WINDOW_MS` (default 15 min) |
| `authLimiter` | All of `/api/v1/auth` | 10 req / 15 min |
| `otpLimiter` | MFA setup/verify endpoints | 10 req / 10 min |
| `recoveryLimiter` | Forgot/reset/resend-verification | 5 req / 60 min |
| `tokenLimiter` | `/auth/refresh`, credential/service-token/OAuth-token issuance | 30 req / 15 min |
| `invitationLimiter` | Sending/responding to invitations | 20 req / 60 min |
| `billingLimiter` | Subscription create/confirm/cancel | 20 req / 15 min |
| `webhookLimiter` | Inbound billing webhook | 1000 req / 15 min (tuned for provider retry storms) |

Headers: `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`.

---

## Authentication Flow

1. Client sends `POST /auth/login` with email/password.
2. Server validates credentials, returns `accessToken` in the body and sets a rotating, device-bound refresh token as an httpOnly cookie (or a `202` MFA challenge, completed via `POST /auth/mfa/verify`).
3. Client stores `accessToken` in memory (`AuthContext`) — never in `localStorage`.
4. All subsequent requests include `Authorization: Bearer <accessToken>`.
5. When the access token expires (401), the Axios response interceptor calls `POST /auth/refresh` using the cookie, queuing any concurrent requests until it resolves.
6. Server returns a new `accessToken` (rotating the refresh token and detecting replay); the original failed request is retried automatically.
7. If refresh fails, the user is redirected to `/login`.
