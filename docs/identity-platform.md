# NEXPULSE AI Identity Platform

## Architecture

The identity boundary consists of:

- `User`: personal identity, password state, verification and recovery state, MFA configuration, and default organization/workspace pointers.
- `Organization`: enterprise boundary with an owner, active/suspended membership, and SSO preparation.
- `Workspace`: authorization and data-isolation boundary. Membership role and status are authoritative.
- `IdentitySession`: one device-bound refresh-token family with idle and absolute expiry, activity, risk, and revocation state.
- `ApiCredential`: hashed API key, personal access token, or service token with workspace scopes and expiry.
- `ServiceAccount`: non-human workspace identity with explicitly limited permissions.
- `WorkspaceInvitation`: hashed, expiring, single-use role assignment.
- `SecurityEvent`: append-only identity audit record.
- `SsoConfiguration`: encrypted configuration boundary prepared for SAML, OIDC, Azure AD, Google Workspace, Okta, and Auth0.

Bearer access tokens contain a session ID and security stamp. Authentication accepts a token only when the backing session, user, organization membership, and workspace membership are all active. Roles in the token are informational; current database membership determines effective permissions.

## Role hierarchy

| Role | Effective authority |
| --- | --- |
| Super Admin | All permissions across explicitly selected scope |
| Organization Owner | All organization/workspace permissions |
| Workspace Owner | All workspace permissions, including deletion |
| Workspace Admin | All workspace permissions except workspace deletion |
| Manager | Editor access plus invitations, platform connection management, and notification management |
| Editor | Analyst access plus workspace content changes |
| Analyst | Viewer access plus analytics export, report generation, and AI use |
| Viewer | Read access plus team/settings/notifications read access |
| Guest | Restricted workspace, analytics, report, and platform read access |
| Service Account | Only the intersection of service-account and service-token scopes |

Every interactive role can manage its own sessions and MFA. Role assignment is strictly downward: an actor cannot grant or modify a role at or above the actor's level.

## Permission matrix

The canonical permissions are exported from `server/src/modules/identity/permissions.ts` and exposed by `GET /api/v1/identity/info`.

| Domain | Permissions |
| --- | --- |
| Workspace | `workspace.read`, `workspace.write`, `workspace.delete`, `workspace.switch` |
| Analytics | `analytics.read`, `analytics.export` |
| Reports | `reports.read`, `reports.generate`, `reports.delete` |
| Team | `team.read`, `team.invite`, `team.remove`, `team.manage` |
| Billing | `billing.manage` |
| Platforms | `platform.read`, `platform.connect`, `platform.disconnect` |
| AI | `ai.use` |
| Settings | `settings.read`, `settings.manage` |
| Notifications | `notifications.read`, `notifications.manage` |
| Identity | `identity.sessions.manage`, `identity.api_keys.manage`, `identity.service_accounts.manage`, `identity.audit.read`, `identity.mfa.manage` |

Authorization middleware supports permission, interactive-session, ownership, workspace, organization, feature-flag, and policy checks. Controllers do not implement role lists.

## Authentication flow

1. Registration creates a personal workspace and organization and hashes the email-verification token.
2. Login performs a constant-cost password comparison, lockout checks, workspace IP policy checks, and MFA/trusted-device evaluation.
3. MFA challenges are short-lived, attempt-limited, device-bound, and single-use.
4. Successful authentication rotates the browser device ID, creates an `IdentitySession`, and returns a short-lived access token plus an opaque HttpOnly refresh cookie.
5. Every API request reloads the session, user security stamp, organization status/membership, workspace membership, MFA policy, and effective role permissions.

Fake Google/GitHub sign-in controls were removed. No identity provider is displayed until a real SSO implementation and configuration exist.

## Session and refresh flow

1. The refresh cookie contains `<session-id>.<random-secret>`.
2. Only SHA-256 hashes are stored; raw refresh tokens never enter the database.
3. Rotation atomically matches the current hash, stores the next hash, and records the consumed hash.
4. Reuse of a consumed token or concurrent rotation revokes the session family.
5. Refresh and access use require the bound device cookie.
6. Idle timeout, absolute timeout, active-session limit, account security-stamp changes, workspace removal, and manual logout can revoke sessions.
7. Session and trusted-device controls are available in Settings.

## MFA and recovery

- TOTP secrets use AES-256-GCM with a deployment-provided identity encryption key.
- TOTP accepts a narrow clock-skew window.
- Email OTP is available only when email delivery is enabled and SMTP is configured.
- Recovery codes are shown once, stored as hashes, and consumed once.
- Trusted devices expire and can be removed with their sessions.
- Password reset and email verification tokens are random, hashed, expiring, single-use, and rate-limited.
- Password policy uses length, compromised/predictable-password blocking, and no mandatory composition rules.

SMS is not enabled. The challenge model is intentionally isolated so a verified SMS provider can be added without changing session or authorization contracts.

## Machine authentication

API keys (`nxk_`), personal access tokens (`npt_`), and service tokens (`nxs_`) use a public prefix plus a high-entropy secret. Only the prefix and secret hash persist. Tokens support explicit scopes, expiry, one-time display, rotation, revocation, usage timestamps, IP history, and audit events.

Service accounts have an explicit purpose (`automation`, `integration`, `bot`, or `ci_cd`) and cannot exceed the creator's permissions. Disabling an account revokes all of its credentials.

## Invitations

Workspace invitations validate downward role assignment and optional email-domain policy. Tokens are hashed, expire after seven days, and support resend and revocation. Acceptance verifies the signed-in email and atomically updates invitation, workspace membership, and organization membership in a MongoDB transaction.

## Security policies

Workspace policy supports:

- password minimum length;
- session idle and absolute duration;
- maximum active sessions;
- roles requiring MFA;
- allowed invitation email domains;
- login IP allowlist;
- API-key and service-account enablement;
- invitation enablement and default role.

Users who are subject to required MFA but are not enrolled receive only MFA/session permissions until enrollment is complete.

## Identity API

- `/api/v1/auth/*`: register, login, MFA login verification, refresh, logout, recovery, verification, and profile security.
- `/api/v1/identity/sessions/*`: device/session list and revocation.
- `/api/v1/identity/mfa/*`: TOTP, email OTP, recovery codes, and trusted devices.
- `/api/v1/identity/credentials/*`: API/PAT creation, rotation, and revocation.
- `/api/v1/identity/service-accounts/*`: machine identities and service-token rotation.
- `/api/v1/identity/members/*`: real member directory, role updates, and removal.
- `/api/v1/identity/invitations/*`: invite, resend, revoke, accept, and decline.
- `/api/v1/identity/security-events` and `/audit`: personal and privileged workspace audit views.
- `/api/v1/identity/policies`: workspace identity policy.
- `/api/v1/identity/sso/readiness`: configured federation readiness without pretending federation is active.

## Deployment and migration

Production requires strong `JWT_ACCESS_SECRET`, `COOKIE_SECRET`, and a 64-hex-character `IDENTITY_ENCRYPTION_KEY`. Email OTP and invitations additionally require `ENABLE_EMAIL=true` and SMTP credentials.

Run once before deploying the new identity model:

```text
npm --prefix server run migrate:identity
```

The migration hashes usable legacy recovery tokens, removes plaintext token fields, revokes plaintext legacy refresh tokens, normalizes legacy roles, initializes MFA/session policy fields, and backfills organizations. Existing users must sign in again.

MongoDB must support transactions. The supplied Compose stack runs a single-node replica set. Production refuses to fall back to ephemeral storage when MongoDB is unavailable.

## SSO status and remaining risks

SAML/OIDC configuration storage and readiness reporting are prepared, but federation execution, metadata verification, certificate rotation, SCIM provisioning, SMS delivery, geo-IP enrichment, and provider-specific enterprise SSO are intentionally not advertised as active. These require vendor configuration and end-to-end testing before enablement.
