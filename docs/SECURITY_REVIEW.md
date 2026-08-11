# NEXPULSE Enterprise Security Review

**Review date:** 2026-07-24  
**Scope:** Phase 21 security, governance, compliance, identity, developer platform, application runtime, CI, and containers.

## Executive result

Phase 21 adds a workspace-scoped enterprise security control plane without replacing the established identity boundary. RBAC remains the baseline grant; centralized policies can then deny, require step-up authentication, or apply stricter session-risk, network, country, actor, and resource constraints.

The review also corrected an authentication-routing defect in the developer public-resource router. Authentication is now applied to its organization and user resources individually, so public auth endpoints remain reachable while those resource endpoints remain protected.

## Implemented architecture

| Capability | Enforcement |
| --- | --- |
| Zero trust | Central policy evaluator, priority ordering, glob-scoped action/resource targets, MFA and risk requirements, IPv4/CIDR and country constraints |
| Policy governance | Optimistic version checks, immutable revisions, immutable decision records, actor and request fingerprints |
| Secrets | AES-256-GCM envelopes, versioned values, rotation and expiry metadata, one-time generated-value response, access audit |
| Data governance | Ownership, classification, residency, lineage, retention, legal hold, lifecycle state, governed deletion queue |
| DLP | Bounded recursive inspection, credential/PII/payment/private-key detectors, masked previews, fingerprints, structured redaction |
| Compliance | Live evidence collection for SOC 2, ISO 27001, GDPR, CCPA, and HIPAA readiness with evidence hashes and expiry |
| Threat detection | Brute-force, credential-stuffing, replay, and privilege-probing correlation over append-only events |
| Incident response | Owned lifecycle, evidence links, immutable audit events, timeline, session/credential containment options |
| Supply chain | Repository secret and static scans, complete dependency audit, CycloneDX SBOM, license policy, non-root container policy, pinned Trivy CI action |

## Threat model

Primary protected assets are identities, session and API credentials, OAuth/provider tokens, managed secrets, workspace data, security evidence, plugin/runtime permissions, and administrative actions.

Primary threat actors and abuse cases:

- anonymous attackers attempting credential stuffing, brute force, replay, injection, SSRF, and service exhaustion;
- compromised users or service accounts probing privilege boundaries or crossing workspace scope;
- malicious integrations, webhooks, or plugins requesting undeclared capabilities;
- administrators accidentally weakening controls or exposing secrets in logs and exports;
- compromised dependencies, build scripts, base images, or CI actions.

Trust boundaries exist at the browser/API edge, authentication middleware, workspace and organization scope, policy decision point, encrypted persistence, outbound webhooks/providers, plugin runtime, database, and CI/container supply chain.

## Data and key handling

- Secret values are excluded from normal queries and list responses.
- Generated secret values are returned only in the creation or rotation response.
- Secret metadata, versions, access, rotation, revocation, and expiry are audited.
- Logs redact sensitive keys and inline credential/PII signatures; HTTP logging excludes query strings.
- `IDENTITY_ENCRYPTION_KEY` is mandatory in production and required for managed-secret operations in every environment.
- Key rotation is versioned, but external KMS/HSM custody and envelope-key rotation remain deployment responsibilities.

## Compliance evidence boundaries

Evidence snapshots are derived from live policy, event, session, threat, incident, and data-catalogue state. Framework mappings establish readiness and traceability, not certification. HIPAA readiness also requires a qualifying deployment, business associate agreements, operational procedures, and customer-specific configuration.

## Verification performed

- Client lint and TypeScript checks passed.
- Server lint and TypeScript checks passed.
- 40 client tests, 55 server tests, and 2 Python SDK tests passed.
- Client, server, and TypeScript SDK production builds passed.
- Secret, static-source, license, SBOM, container-policy, and complete dependency scans passed.
- The generated CycloneDX SBOM contains 888 components.
- The production dependency audit reports zero vulnerabilities across root, client, and server lockfiles.
- The security migration synchronized indexes and seeded 52 baseline policies across 13 existing workspaces.
- Live API verification covered registration, dashboard, enforced policy, one-time secret creation, rotation to version 2, non-disclosure in list responses, governed deletion, DLP, seven evidence controls across five frameworks, threat evaluation, and incident containment.

Docker and Trivy are not installed in the local environment, so image construction and vulnerability execution were not run locally. CI contains the blocking image scans. The browser runtime exposed no browser session, so interactive screenshot and responsive browser QA were unavailable.

## Residual risks and next controls

- ~~Run workers in a distributed queue with leases before horizontally scaling the API.~~ Done — webhook delivery, security threat/compliance jobs, and queued email now run through BullMQ/Redis (`server/src/jobs/`) instead of in-process `setInterval` loops; concurrency and retry/backoff are handled per-job by BullMQ rather than a hand-rolled Mongo lease. See [Architecture.md](./Architecture.md#background-job-queue-serversrcjobs).
- Use a cloud KMS/HSM and managed vault for production root-key custody.
- ~~Add IPv6 CIDR evaluation before enforcing IPv6 network policies.~~ Done — `policyEngine.ts`'s `ipMatches` now dispatches to IPv6-aware CIDR matching (`ipv6ToBigInt`/`ipv6Matches`) alongside the existing IPv4 path.
- Add organization-specific DLP dictionaries and structured data connectors.
- Connect paging, SIEM/SOAR, evidence export, and external ticketing in the later observability/AIOps milestone.
- Complete an independent penetration test and formal compliance audit before making certification claims.
