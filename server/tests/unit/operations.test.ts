import { describe, expect, it, vi } from 'vitest';

vi.mock('../../src/config/env.js', () => ({
  config: {
    env: 'development',
    features: { ai: true, platformSync: true, email: false, billing: false, queues: true },
    ai: { openaiApiKey: undefined, anthropicApiKey: undefined, geminiApiKey: undefined },
    oauth: {
      tokenEncryptionKey: undefined,
      meta: { clientId: undefined, clientSecret: undefined },
      linkedin: { clientId: undefined, clientSecret: undefined },
      google: { clientId: undefined, clientSecret: undefined },
      tiktok: { clientKey: undefined, clientSecret: undefined },
      pinterest: { clientId: undefined, clientSecret: undefined },
      x: { clientId: undefined, clientSecret: undefined },
    },
    identity: { encryptionKey: undefined },
    email: { host: undefined, user: undefined, password: undefined, from: undefined },
    billing: {
      razorpay: {
        keyId: undefined,
        keySecret: undefined,
        webhookSecret: undefined,
        professional: { monthlyPlanId: undefined, annualPlanId: undefined },
      },
    },
    operations: { monitorEnabled: true, alertWebhookUrl: undefined },
  },
}));

const { renderMetrics } = await import('../../src/operations/metrics.js');
const { getRuntimeReadiness } = await import('../../src/operations/readiness.js');

describe('operational readiness', () => {
  it('keeps development available while truthfully reporting unconfigured integrations', () => {
    const readiness = getRuntimeReadiness(1);

    expect(readiness.ready).toBe(true);
    expect(readiness.state).toBe('degraded');
    expect(readiness.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'database', ready: true, required: true }),
        expect.objectContaining({ id: 'ai', ready: false, required: false }),
        expect.objectContaining({ id: 'platforms', ready: false, required: false }),
      ]),
    );
  });

  it('fails readiness when MongoDB is disconnected', () => {
    const readiness = getRuntimeReadiness(0);

    expect(readiness.ready).toBe(false);
    expect(readiness.state).toBe('not_ready');
  });

  it('renders low-cardinality Prometheus metrics without secrets', () => {
    const metrics = renderMetrics(getRuntimeReadiness(1));

    expect(metrics).toContain('nexpulse_ready 1');
    expect(metrics).toContain('nexpulse_readiness_check{check="ai",required="false"} 0');
    expect(metrics).not.toContain('API_KEY');
    expect(metrics).not.toContain('TOKEN');
  });
});
