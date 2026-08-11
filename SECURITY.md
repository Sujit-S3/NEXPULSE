# NEXPULSE AI Security Policy

## Supported versions

| Version | Supported |
| --- | --- |
| 0.1.x | Yes |

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability. Contact the NEXPULSE maintainers through the repository's private security channel and include:

- the affected component and environment;
- reproducible steps or a proof of concept;
- the expected and observed security boundary;
- potential impact and any evidence of exploitation.

Do not access data that does not belong to you, degrade production availability, or publish details before remediation is available.

## Platform security controls

NEXPULSE uses:

- device-bound, rotating sessions and short-lived access tokens;
- MFA, RBAC, workspace and organization isolation, scoped API credentials, and OAuth 2.1 PKCE;
- centralized zero-trust policies with immutable decisions and version history;
- AES-256-GCM envelopes for managed secrets and provider tokens;
- append-only security events, threat correlation, incident timelines, and explicit containment actions;
- data classification, retention, legal hold, governed deletion, and DLP inspection;
- Zod validation, trusted-origin checks, rate limiting, CSP/security headers, SSRF controls, and output redaction;
- dependency, secret, static-source, license, SBOM, container-policy, and container-vulnerability CI gates.

Production requires unique high-entropy values for `JWT_ACCESS_SECRET`, `COOKIE_SECRET`, `IDENTITY_ENCRYPTION_KEY`, and provider-specific encryption keys. Managed-secret operations fail closed when encryption is not configured.

## Compliance statement

The platform produces control evidence mapped to SOC 2, ISO 27001, GDPR, CCPA, and HIPAA readiness. This evidence supports an audit; it is not a certification, legal opinion, or guarantee of compliance. Organizational policies, contracts, training, vendor management, and independent assessment remain required.
