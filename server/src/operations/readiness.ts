import mongoose from 'mongoose';
import { config } from '../config/env.js';

export type ReadinessState = 'ready' | 'degraded' | 'not_ready';

export interface ReadinessCheck {
  id: 'database' | 'identity' | 'ai' | 'platforms' | 'email' | 'billing' | 'monitoring' | 'queues';
  enabled: boolean;
  ready: boolean;
  required: boolean;
  message: string;
  configured?: string[];
}

export interface RuntimeReadiness {
  ready: boolean;
  state: ReadinessState;
  checkedAt: string;
  checks: ReadinessCheck[];
}

function complete(values: (string | undefined)[]): boolean {
  return values.every(Boolean);
}

export function getConfigurationReadiness(): ReadinessCheck[] {
  const production = config.env === 'production';
  const configuredAiProviders = [
    config.ai.openaiApiKey ? 'openai' : null,
    config.ai.anthropicApiKey ? 'anthropic' : null,
    config.ai.geminiApiKey ? 'google' : null,
  ].filter((provider): provider is string => provider !== null);
  const oauth = config.oauth;
  const encryptedTokens = Boolean(oauth?.tokenEncryptionKey);
  const configuredProviders = [
    complete([oauth?.meta.clientId, oauth?.meta.clientSecret]) ? ['instagram', 'facebook'] : [],
    complete([oauth?.linkedin.clientId, oauth?.linkedin.clientSecret]) ? ['linkedin'] : [],
    complete([oauth?.google.clientId, oauth?.google.clientSecret]) ? ['youtube'] : [],
    complete([oauth?.tiktok.clientKey, oauth?.tiktok.clientSecret]) ? ['tiktok'] : [],
    complete([oauth?.pinterest.clientId, oauth?.pinterest.clientSecret]) ? ['pinterest'] : [],
    complete([oauth?.x.clientId, oauth?.x.clientSecret]) ? ['x'] : [],
  ].flat().filter(() => encryptedTokens);
  const identityReady = Boolean(config.identity.encryptionKey);
  const emailReady = complete([
    config.email.host,
    config.email.user,
    config.email.password,
    config.email.from,
  ]);
  const billingReady = complete([
    config.billing.razorpay.keyId,
    config.billing.razorpay.keySecret,
    config.billing.razorpay.webhookSecret,
    config.billing.razorpay.professional.monthlyPlanId,
    config.billing.razorpay.professional.annualPlanId,
  ]);

  return [
    {
      id: 'identity',
      enabled: true,
      ready: identityReady,
      required: production,
      message: identityReady
        ? 'Identity secrets are encrypted with AES-256-GCM.'
        : production
          ? 'Identity encryption is required before production can start.'
          : 'Identity encryption is not configured in this development environment.',
    },
    {
      id: 'ai',
      enabled: config.features.ai,
      ready: !config.features.ai || configuredAiProviders.length > 0,
      required: production && config.features.ai,
      message: !config.features.ai
        ? 'AI is disabled by configuration.'
        : configuredAiProviders.length > 0
          ? `AI is ready through ${configuredAiProviders.join(', ')}.`
          : 'AI is enabled but no provider key is configured.',
      configured: configuredAiProviders,
    },
    {
      id: 'platforms',
      enabled: config.features.platformSync,
      ready: !config.features.platformSync || configuredProviders.length > 0,
      required: production && config.features.platformSync,
      message: !config.features.platformSync
        ? 'Platform synchronization is disabled by configuration.'
        : configuredProviders.length > 0
          ? `${configuredProviders.length} OAuth platform adapter${configuredProviders.length === 1 ? ' is' : 's are'} ready.`
          : 'Platform sync is enabled but token encryption or provider credentials are missing.',
      configured: configuredProviders,
    },
    {
      id: 'email',
      enabled: config.features.email,
      ready: !config.features.email || emailReady,
      required: production && config.features.email,
      message: !config.features.email
        ? 'Transactional email is disabled by configuration.'
        : emailReady
          ? 'Transactional email is configured.'
          : 'Email is enabled but SMTP settings are incomplete.',
    },
    {
      id: 'billing',
      enabled: config.features.billing,
      ready: !config.features.billing || billingReady,
      required: production && config.features.billing,
      message: !config.features.billing
        ? 'Subscription billing is disabled by configuration.'
        : billingReady
          ? 'Razorpay subscription billing and signed webhooks are configured.'
          : 'Billing is enabled but Razorpay credentials, webhook secret, or plan IDs are missing.',
    },
    {
      id: 'monitoring',
      enabled: config.operations.monitorEnabled,
      ready: config.operations.monitorEnabled,
      required: false,
      message: config.operations.monitorEnabled
        ? config.operations.alertWebhookUrl
          ? 'Operational checks and webhook alerts are enabled.'
          : 'Operational checks are enabled; alerts are emitted to structured logs.'
        : 'Operational monitoring is disabled.',
    },
    {
      id: 'queues',
      enabled: config.features.queues,
      // Configuration-only check (REDIS_URL always has a value) — this does not verify
      // live Redis connectivity. Actual reachability is observed via worker/connection
      // error logs and the bull-board dashboard, not this endpoint.
      ready: true,
      required: false,
      message: config.features.queues
        ? 'Webhook delivery, security jobs, and queued email run through BullMQ/Redis.'
        : 'Background job queues are disabled (ENABLE_QUEUES=false) — falling back to no async processing for webhooks, security jobs, and queued email.',
    },
  ];
}

function redactForProduction(checks: ReadinessCheck[]): ReadinessCheck[] {
  return checks.map((check) => ({
    id: check.id,
    enabled: check.enabled,
    ready: check.ready,
    required: check.required,
    message: check.ready ? 'Operational.' : 'Not ready.',
  }));
}

export function getRuntimeReadiness(
  databaseState = mongoose.connection.readyState,
): RuntimeReadiness {
  const checks: ReadinessCheck[] = [
    {
      id: 'database',
      enabled: true,
      ready: databaseState === 1,
      required: true,
      message: databaseState === 1
        ? 'MongoDB is connected.'
        : 'MongoDB is not connected.',
    },
    ...getConfigurationReadiness(),
  ];
  const blocking = checks.some((check) => check.required && !check.ready);
  const degraded = checks.some((check) => check.enabled && !check.ready);

  return {
    ready: !blocking,
    state: blocking ? 'not_ready' : degraded ? 'degraded' : 'ready',
    checkedAt: new Date().toISOString(),
    // Detailed provider/vendor disclosure (which OAuth/AI/billing integrations are
    // configured) is only useful for operators and is infrastructure-fingerprinting
    // in the wrong hands; redact it for unauthenticated production callers.
    checks: config.env === 'production' ? redactForProduction(checks) : checks,
  };
}
