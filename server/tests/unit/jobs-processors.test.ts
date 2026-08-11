import { afterEach, describe, expect, it, vi } from 'vitest';

// The shared winston mock in tests/setup.ts models `format` as a plain object, but
// logger.ts calls `winston.format(fn)` (real winston's callable-format pattern) — mock
// the logger module directly here rather than depending on that shape lining up.
vi.mock('../../src/logger/index.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const webhookDeliveryMock = {
  findById: vi.fn(),
  updateOne: vi.fn(() => ({ exec: vi.fn().mockResolvedValue(undefined) })),
};
const webhookEndpointMock = {
  findOne: vi.fn(),
  updateOne: vi.fn(() => ({ exec: vi.fn().mockResolvedValue(undefined) })),
};

vi.mock('../../src/modules/developer/model.js', () => ({
  WebhookDelivery: webhookDeliveryMock,
  WebhookEndpoint: webhookEndpointMock,
}));
vi.mock('../../src/modules/identity/crypto.js', () => ({
  decryptIdentitySecret: vi.fn(() => 'whsec_test'),
}));
vi.mock('../../src/modules/developer/security.js', () => ({
  assertWebhookUrlSafe: vi.fn().mockResolvedValue(undefined),
  webhookSignature: vi.fn(() => 'sig_test'),
}));

const securityEventMock = { distinct: vi.fn() };
const threatServiceMock = { evaluate: vi.fn().mockResolvedValue(undefined) };
const complianceServiceMock = { collect: vi.fn().mockResolvedValue(undefined) };

vi.mock('../../src/modules/identity/model.js', () => ({
  SecurityEvent: securityEventMock,
}));
vi.mock('../../src/modules/security/service.js', () => ({
  threatService: threatServiceMock,
  complianceService: complianceServiceMock,
}));

const emailServiceMock = {
  sendVerificationEmail: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
};
vi.mock('../../src/services/email/email.service.js', () => ({
  emailService: emailServiceMock,
}));

const { processWebhookDelivery } = await import('../../src/jobs/processors/webhookProcessor.js');
const { processSecurityJob } = await import('../../src/jobs/processors/securityProcessor.js');
const { processEmailJob } = await import('../../src/jobs/processors/emailProcessor.js');
const { SECURITY_JOB_NAMES } = await import('../../src/jobs/queues.js');

function chain(value: unknown) {
  return { exec: vi.fn().mockResolvedValue(value), select: vi.fn().mockReturnThis() };
}

describe('processWebhookDelivery', () => {
  afterEach(() => vi.clearAllMocks());

  it('does nothing for a delivery that already reached a terminal state', async () => {
    webhookDeliveryMock.findById.mockReturnValue(chain({ status: 'succeeded' }));
    await processWebhookDelivery({ data: { deliveryId: 'd1' }, attemptsMade: 0, opts: { attempts: 8 } } as never);
    expect(webhookEndpointMock.findOne).not.toHaveBeenCalled();
  });

  it('marks the delivery dead_letter when the endpoint is gone rather than retrying forever', async () => {
    webhookDeliveryMock.findById.mockReturnValue(chain({ _id: 'd1', status: 'pending', endpointId: 'e1' }));
    webhookEndpointMock.findOne.mockReturnValue(chain(null));
    await processWebhookDelivery({ data: { deliveryId: 'd1' }, attemptsMade: 0, opts: { attempts: 8 } } as never);
    expect(webhookDeliveryMock.updateOne).toHaveBeenCalledWith(
      { _id: 'd1' },
      expect.objectContaining({ $set: expect.objectContaining({ status: 'dead_letter' }) }),
    );
  });

  it('marks the final failed attempt dead_letter and rethrows so BullMQ stops retrying', async () => {
    webhookDeliveryMock.findById.mockReturnValue(chain({
      _id: 'd1', status: 'pending', endpointId: 'e1', eventId: 'evt_1', eventType: 'webhook.test', payload: {},
    }));
    webhookEndpointMock.findOne.mockReturnValue({
      ...chain({ _id: 'e1', url: 'https://example.test/hook', secretEncrypted: 'enc' }),
      select: vi.fn().mockReturnValue(chain({ _id: 'e1', url: 'https://example.test/hook', secretEncrypted: 'enc' })),
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500, text: () => Promise.resolve('server error') }));

    await expect(processWebhookDelivery({
      data: { deliveryId: 'd1' },
      attemptsMade: 7,
      opts: { attempts: 8 },
    } as never)).rejects.toThrow();

    expect(webhookDeliveryMock.updateOne).toHaveBeenCalledWith(
      { _id: 'd1' },
      expect.objectContaining({ $set: expect.objectContaining({ status: 'dead_letter' }) }),
    );
    vi.unstubAllGlobals();
  });

  it('marks a non-final failed attempt retrying, not dead_letter', async () => {
    webhookDeliveryMock.findById.mockReturnValue(chain({
      _id: 'd1', status: 'pending', endpointId: 'e1', eventId: 'evt_1', eventType: 'webhook.test', payload: {},
    }));
    webhookEndpointMock.findOne.mockReturnValue({
      select: vi.fn().mockReturnValue(chain({ _id: 'e1', url: 'https://example.test/hook', secretEncrypted: 'enc' })),
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500, text: () => Promise.resolve('server error') }));

    await expect(processWebhookDelivery({
      data: { deliveryId: 'd1' },
      attemptsMade: 0,
      opts: { attempts: 8 },
    } as never)).rejects.toThrow();

    expect(webhookDeliveryMock.updateOne).toHaveBeenCalledWith(
      { _id: 'd1' },
      expect.objectContaining({ $set: expect.objectContaining({ status: 'retrying' }) }),
    );
    vi.unstubAllGlobals();
  });
});

describe('processSecurityJob', () => {
  afterEach(() => vi.clearAllMocks());

  it('dispatches threat evaluation for active workspaces', async () => {
    securityEventMock.distinct.mockReturnValue(chain(['507f1f77bcf86cd799439011']));
    await processSecurityJob({ name: SECURITY_JOB_NAMES.threatEval } as never);
    expect(threatServiceMock.evaluate).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
    expect(complianceServiceMock.collect).not.toHaveBeenCalled();
  });

  it('dispatches compliance collection for active workspaces', async () => {
    securityEventMock.distinct.mockReturnValue(chain(['507f1f77bcf86cd799439011']));
    await processSecurityJob({ name: SECURITY_JOB_NAMES.complianceCollect } as never);
    expect(complianceServiceMock.collect).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
    expect(threatServiceMock.evaluate).not.toHaveBeenCalled();
  });

  it('ignores malformed workspace ids from the distinct query', async () => {
    securityEventMock.distinct.mockReturnValue(chain(['not-an-object-id']));
    await processSecurityJob({ name: SECURITY_JOB_NAMES.threatEval } as never);
    expect(threatServiceMock.evaluate).not.toHaveBeenCalled();
  });
});

describe('processEmailJob', () => {
  afterEach(() => vi.clearAllMocks());

  it('sends a verification email for kind=verification', async () => {
    emailServiceMock.sendVerificationEmail.mockResolvedValue(true);
    await processEmailJob({ data: { kind: 'verification', firstName: 'Ada', email: 'ada@example.com', token: 't' } } as never);
    expect(emailServiceMock.sendVerificationEmail).toHaveBeenCalledWith('Ada', 'ada@example.com', 't');
  });

  it('sends a password reset email for kind=password-reset', async () => {
    emailServiceMock.sendPasswordResetEmail.mockResolvedValue(true);
    await processEmailJob({ data: { kind: 'password-reset', firstName: 'Ada', email: 'ada@example.com', token: 't' } } as never);
    expect(emailServiceMock.sendPasswordResetEmail).toHaveBeenCalledWith('Ada', 'ada@example.com', 't');
  });

  it('throws on send failure so BullMQ retries', async () => {
    emailServiceMock.sendVerificationEmail.mockResolvedValue(false);
    await expect(processEmailJob({
      data: { kind: 'verification', firstName: 'Ada', email: 'ada@example.com', token: 't' },
    } as never)).rejects.toThrow(/Failed to send/);
  });
});
