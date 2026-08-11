# Database

## Purpose

This document describes the database schema, models, relationships, and data access patterns for NEXPULSE AI.

## Scope

- MongoDB schema design
- Mongoose model definitions
- Relationships between entities
- Indexing strategy
- Migration patterns

## Table of Contents

1. [Overview](#overview)
2. [Models](#models)
3. [Relationships](#relationships)
4. [Indexes](#indexes)
5. [Migrations](#migrations)

---

## Overview

NEXPULSE AI uses MongoDB as its primary database, accessed via Mongoose ODM. The database name is `nexpulse` by default (see `MONGO_URI`).

### Connection

The database connection is configured via the `MONGO_URI` environment variable in `server/.env` (see [ENVIRONMENT.md](ENVIRONMENT.md)). Connection setup lives in `server/src/database/`.

Every model file lives at `server/src/modules/<module>/model.ts` (or `telemetryModel.ts` for the platforms module's sync telemetry), colocated with the module that owns it — there is no separate top-level `models/` directory.

## Models

30 Mongoose models across 11 modules. `dashboard`, `settings`, and `workspaces` have no model of their own: `dashboard` delegates to `analytics`, `settings` persists onto `User.preferences` and a workspace-personalization subdocument, and `workspaces` reads/writes the `Workspace` model owned by `auth`.

### auth (`modules/auth/model.ts`)

| Model | Notes |
|---|---|
| `User` | Authentication, profile, MFA state, preferences. Indexed on `{ email: 1, deletedAt: 1 }` (soft-delete aware). References `Organization` via `organizationId`. |
| `Workspace` | Owner (`owner` → `User`) plus an embedded `members[]` array (`{ user, role, status, joinedAt }`) — the workspace's member roster lives inline on this document, not in a separate collection. |

### identity (`modules/identity/model.ts`)

| Model | Notes |
|---|---|
| `Organization` | Top-level tenant above workspaces; embeds a members list, owned by a `User` (`ownerId`). Indexed on `{ 'members.userId': 1, status: 1 }`. |
| `IdentitySession` | Refresh-token session record: device binding, idle/absolute expiry, revocation. Indexed on `{ userId: 1, revokedAt: 1, lastActiveAt: -1 }`. |
| `ApiCredential` | Long-lived API keys (`workspaceId`, optional `userId` for personal keys). Indexed on `{ workspaceId: 1, type: 1, revokedAt: 1 }`. |
| `ServiceAccount` | Machine identities scoped to a workspace. Unique per `{ workspaceId, name }`. |
| `SecurityEvent` | Sanitized audit log entries (auth, session, security-relevant actions). Indexed on `{ workspaceId: 1, createdAt: -1 }` and `{ userId: 1, createdAt: -1 }`. |
| `IdentityChallenge` | Short-lived MFA/step-up challenge state. |
| `WorkspaceInvitation` | Pending/accepted/revoked team invitations. Indexed on `{ workspaceId: 1, email: 1, status: 1 }`. |
| `SsoConfiguration` | Per-organization SSO readiness config. Unique per `{ organizationId, provider }`. |

### platforms (`modules/platforms/model.ts`, `telemetryModel.ts`)

| Model | Notes |
|---|---|
| `PlatformConnection` | One connected social account per `{ workspaceId, userId, provider }` (encrypted OAuth tokens live here). |
| `OAuthSession` | Short-lived OAuth handshake state (CSRF/PKCE), TTL-bound by `OAUTH_SESSION_TTL_MINUTES`. |
| `PlatformTelemetry` (`telemetryModel.ts`) | Sync/health telemetry per `connectionId`, referencing `PlatformConnection`. |

### analytics (`modules/analytics/model.ts`)

| Model | Notes |
|---|---|
| `AnalyticsSnapshot` | Cached normalized analytics per `{ workspaceId, connectionId, collectedAt }`; embeds `metricPointSchema` and `postSchema` subdocuments rather than referencing separate collections. Indexed on `{ workspaceId: 1, connectionId: 1, collectedAt: -1 }` and `{ workspaceId: 1, providerAccountId: 1, collectedAt: -1 }`. |

### ai (`modules/ai/model.ts`)

| Model | Notes |
|---|---|
| `Conversation` | Chat history per `{ workspaceId, userId }`. Indexed on `{ workspaceId: 1, updatedAt: -1 }` and `{ workspaceId: 1, userId: 1, updatedAt: -1 }`. |
| `Memory` | Workspace-scoped AI memory entries with a TTL index (`{ expiresAt: 1 }`, `expireAfterSeconds: 0`) for automatic expiry. |

### billing (`modules/billing/model.ts`)

| Model | Notes |
|---|---|
| `BillingSubscription` | Razorpay subscription state per workspace. Indexed on `{ workspaceId: 1, createdAt: -1 }`. |
| `BillingWebhookEvent` | Idempotent webhook processing ledger — unique on the provider's event ID; indexed on `{ status: 1, updatedAt: 1 }` for retry sweeps. |

### developer (`modules/developer/model.ts`)

| Model | Notes |
|---|---|
| `DeveloperApplication` | OAuth 2.1 app registered by a workspace. Unique per `{ workspaceId, name }`. |
| `OAuthAuthorizationCode` | Short-lived PKCE authorization codes. |
| `OAuthToken` | Issued access/refresh tokens for developer OAuth apps. Indexed on `{ applicationId: 1, revokedAt: 1, createdAt: -1 }`. |
| `WebhookEndpoint` | Outbound webhook subscriptions. Unique per `{ workspaceId, name }`. |
| `WebhookDelivery` | Per-attempt delivery ledger with lease/retry state. Indexed on `{ status: 1, nextAttemptAt: 1 }` (dispatcher polling) and `{ workspaceId: 1, createdAt: -1 }`. |
| `ApiRateLimitBucket` | Fixed-window rate-limit counters. Unique per `{ key, bucketStart }`. |
| `ApiUsageMetric` | Per-credential usage metering with a 90-day TTL index. |
| `ApiQuotaPolicy` | Per-workspace/organization/credential/application quota overrides. |
| `PluginPackage` | Marketplace plugin listing (submit/review/approve state). |
| `PluginInstallation` | A workspace's installed plugin instance. Unique per `{ workspaceId, pluginId }`. |

### security (`modules/security/model.ts`)

| Model | Notes |
|---|---|
| `SecurityPolicy` | Zero-trust policy rule (target/action/resource pattern, conditions, effect, priority). |
| `PolicyRevision` | Immutable version history for a `SecurityPolicy`. |
| `PolicyDecision` | Persisted allow/deny/step-up evaluation outcomes. |
| `ManagedSecret` | AES-256-GCM encrypted secret metadata (value never returned after creation/rotation). |
| `SecretVersion` | Rotation history for a `ManagedSecret`. |
| `DataAsset` | Data governance/classification record; `upstreamAssets[]` self-references other `DataAsset`s for lineage. |
| `ComplianceEvidence` | Collected evidence artifacts mapped to compliance frameworks (SOC2/ISO27001/GDPR/CCPA/HIPAA-oriented). |
| `ThreatSignal` | Individual detected threat-detection signals. |
| `SecurityIncident` | Incident record aggregating `signalIds[]` → `ThreatSignal`. |

### notifications (`modules/notifications/model.ts`)

| Model | Notes |
|---|---|
| `NotificationModel` (collection `Notification`) | Per-user notifications. Indexed on `{ workspaceId: 1, userId: 1, archivedAt: 1, createdAt: -1 }` and `{ workspaceId: 1, userId: 1, readAt: 1, createdAt: -1 }` for the unread/archived filters the UI uses. |

### reports (`modules/reports/model.ts`)

| Model | Notes |
|---|---|
| `Report` | Generated report metadata + export state, referencing `PlatformConnection` and the creating `User`. |

---

## Relationships

Nearly every workspace-scoped collection carries a `workspaceId: ObjectId` reference to `Workspace` (indexed) rather than embedding data — `Workspace` itself only embeds its `members[]` roster inline. The broad shape:

```
Organization ──< Workspace ──< User (via Workspace.members / User.workspaceId)
                     │
                     ├──< PlatformConnection ──< AnalyticsSnapshot
                     │                       └─< PlatformTelemetry
                     ├──< IdentitySession, ApiCredential, ServiceAccount, SecurityEvent
                     ├──< WorkspaceInvitation
                     ├──< Conversation ──< Memory
                     ├──< BillingSubscription ──< BillingWebhookEvent (by provider event ID)
                     ├──< DeveloperApplication ──< OAuthToken, OAuthAuthorizationCode
                     │                          └─< WebhookEndpoint ──< WebhookDelivery
                     ├──< PluginInstallation >── PluginPackage
                     ├──< SecurityPolicy ──< PolicyRevision, PolicyDecision
                     ├──< ManagedSecret ──< SecretVersion
                     ├──< DataAsset (self-referencing via upstreamAssets)
                     ├──< ThreatSignal ──< SecurityIncident (via signalIds)
                     ├──< NotificationModel
                     └──< Report ──> PlatformConnection
```

`SsoConfiguration` hangs off `Organization` rather than `Workspace` (SSO is an org-level concern). All cross-references use `Schema.Types.ObjectId` with `ref:`, populated on demand rather than by default (no schemas set `autopopulate`).

## Indexes

Indexing follows one consistent pattern throughout: a leading `workspaceId` (or `userId`/`applicationId`/`policyId` for child collections) compound with a sort/filter field, matching the access pattern of "this workspace's records, most recent first." Two collections use MongoDB's TTL index feature for automatic expiry instead of application-level cleanup jobs: `Memory` (`expiresAt`, immediate expiry) and `ApiUsageMetric` (`updatedAt`, 90-day retention). Uniqueness constraints are used for natural per-workspace keys (`DeveloperApplication.name`, `WebhookEndpoint.name`, `ServiceAccount.name`, `PluginInstallation.pluginId`, `SsoConfiguration.provider`, `ApiRateLimitBucket` bucket key) rather than synthetic slugs.

## Migrations

There is no ORM-level migration framework (e.g. `migrate-mongo`) — schema evolution is handled by one-off scripts under `server/src/scripts/`, run manually against a target environment:

| Script | Purpose |
|---|---|
| `migrateIdentityPlatform.ts` | Backfills/indexes the identity platform's collections (organizations, sessions, credentials, invitations, security events). |
| `migrateDeveloperPlatform.ts` | Backfills/indexes the developer platform's collections (applications, tokens, webhooks, quota policies, plugins). |
| `migrateSecurityPlatform.ts` | Seeds baseline zero-trust policies and indexes the security control-plane collections. |
| `migrateBillingPlatform.ts` | Backfills/indexes billing subscriptions and webhook event ledger. |
| `migratePlatformOAuth.ts` | Backfills/indexes social platform OAuth connections and sessions. |

Each targets one module's collections so they can be run independently as that module's schema changes; none of them are wired into automatic startup — run them explicitly during a deploy when a module's data shape changes. `server/src/scripts/validateRuntimeConfig.ts` (via `npm run config:validate[:strict]`) is a separate, non-migration script that validates environment configuration rather than data.
