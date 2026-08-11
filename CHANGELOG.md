# Changelog

All notable changes to the NEXPULSE AI project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Identity platform: RBAC/ABAC permissions, refresh-token rotation with replay detection and
  device binding, MFA (TOTP, email OTP, recovery codes, trusted devices), API credentials,
  service accounts, workspace member invitations, and a queryable security/audit event log.
- Developer platform: OAuth 2.1 (PKCE) apps, API keys, outbound webhooks with HMAC signing and
  SSRF-safe delivery, a plugin marketplace (submit/review/install), and per-workspace usage
  metering.
- Billing: Razorpay subscription lifecycle (create/confirm/cancel), signed + idempotent webhook
  processing, plan-mismatch protection.
- Security control plane: zero-trust policy engine, secrets manager (AES-256-GCM), data
  governance/classification, DLP detectors, threat detection, incident response workflow, and
  compliance evidence collection (SOC2/ISO27001/GDPR/CCPA/HIPAA-oriented).
- Platform OAuth integrations for Meta (Facebook/Instagram), LinkedIn, TikTok, X, YouTube, and
  Pinterest, with encrypted token storage and analytics normalization.
- AI module: streaming chat over OpenAI/Anthropic/Gemini, persisted conversations and memory,
  tool-calling against real analytics/report data.
- Reports, notifications (with live SSE stream), and settings/workspace-personalization modules.
- Client: Billing, Developer, Security, Team, Notifications, and Profile pages; identity/MFA
  settings UI; workspace personalization panel; onboarding wizard (`/get-started`).
- Published TypeScript (`@nexpulse/sdk`) and Python (`nexpulse`) SDKs covering a subset of the
  public API surface (organizations, users, workspaces, analytics, reports, dashboards,
  notifications, connections, ai, developer).
- Security hardening: explicit CSP directives, production-safe health/readiness disclosure,
  reusable query/params validation middleware, sanitized AI streaming error responses.
- CI/CD: lint/typecheck/test/build/e2e/security-scan pipeline, encrypted nightly database
  backups, production uptime probes, SBOM generation, container and dependency audits.
- Distributed background job queue (BullMQ + Redis, `server/src/jobs/`) replacing the
  in-process `setInterval` workers: webhook delivery now runs as a per-delivery job with
  BullMQ-managed retry/backoff and dead-lettering (was a 1s polling loop with manual lease
  reclaim); security threat evaluation (60s) and compliance evidence collection (daily) are
  now BullMQ repeatable jobs; verification and password-reset emails are queued with
  retry-on-failure instead of a fire-and-forget send that gave up permanently on the first
  SMTP error. MFA-code and invitation emails remain synchronous — their calling code depends
  on knowing immediately whether the send succeeded. A bull-board monitoring dashboard is
  available at `/api/v1/developer/queues` behind the new `operations.queues.manage`
  permission. `REDIS_URL` defaults to `redis://127.0.0.1:6379`; set `ENABLE_QUEUES=false` to
  disable background job processing entirely (enqueue calls become logged no-ops).
- Expanded e2e coverage from 1 spec file (4 tests) to 10 spec files (31 tests): auth, MFA,
  profile editing, AI chat streaming, sessions/MFA settings, billing, team invitations,
  notifications, 404/maintenance/offline states, and responsive layout.

### Fixed
- Verified by actually booting the server with no Redis reachable (not just unit tests):
  the producer Redis connection's `retryStrategy` gave up reconnecting after 3 attempts,
  permanently entering ioredis's terminal "closed" state — after which any later command
  threw synchronously outside of a catchable promise, crashing the entire process on an
  unrelated request. Reconnection now retries indefinitely with capped backoff for both
  connections; only individual command timeouts (`maxRetriesPerRequest`, `connectTimeout`)
  are bounded. `process.on('unhandledRejection'/'uncaughtException')` handlers also moved to
  the top of `index.ts`, before any DB/Redis/worker startup, closing a startup-ordering race
  that could otherwise let an early rejection fire before those safety nets existed.
- Profile page is now editable (name, avatar) with a change-password form, using the
  previously-unwired `authApi.updateProfile`/`changePassword`/avatar-upload endpoints.
- `/get-started` wizard now carries `StepDetails`' collected data through to the confirmation
  step, and routes unauthenticated visitors to `/register` instead of dead-ending at a
  `/dashboard` redirect-to-login bounce.
- Render-time errors on authenticated pages now show a friendly fallback instead of a blank
  screen (`ErrorBoundary` wired at the layout level).
- Offline connectivity loss now shows an overlay instead of a silently unresponsive UI.
- Registration's "check your email" confirmation screen was unreachable — `register()`
  authenticates immediately, so the page's `isAuthenticated` redirect fired before the success
  state ever rendered. The success check now runs first.
- A failed login attempt (wrong password) triggered the axios response interceptor's
  session-refresh-and-redirect flow, hard-reloading the page and wiping out the inline error
  before it could be read. `/auth/login`, `/auth/register`, and `/auth/mfa/verify` are now
  excluded from that flow, matching the existing `/auth/refresh` exclusion.
- Broadened e2e coverage from 1 spec file (4 tests) to 10 spec files (31 tests) covering
  auth, MFA, profile editing, AI chat streaming, sessions/MFA settings, billing, team
  invitations, notifications, 404/maintenance/offline states, and responsive layout.

### Removed
- Dead scaffolding left over from earlier iterations: empty top-level `server/{controllers,
  routes, services, models, middleware, cron, jobs, queues, repositories, validators, utils,
  config}` directories (real code lives under `server/src/modules/*`), unused
  `server/src/modules/workspace` (superseded by `workspaces`), unused mock-era dashboard/analytics
  types, dead `client/src/config` and `client/src/constants` modules, empty placeholder component
  directories, and the orphaned `turbo.json` `.gitignore` entry.

## Phase 0.5 baseline

### Added
- Phase 0.5: Foundation Hardening
  - Environment templates (server/.env.example, client/.env.example)
  - Documentation structure (docs/)
  - Client infrastructure (axios, query, motion utilities)
  - Folder hardening with barrel exports
  - Shared workspace structure
  - Project metadata (LICENSE, CHANGELOG, CODE_OF_CONDUCT, SECURITY)
  - Improved README.md

## [0.1.0] - 2026-06-30

### Added
- Phase 0: Initial project setup
  - React 19 + TypeScript client with Vite
  - Express + MongoDB server
  - Theme system (dark/light/system modes)
  - Routing structure
  - Page components
  - Glass morphism design language
