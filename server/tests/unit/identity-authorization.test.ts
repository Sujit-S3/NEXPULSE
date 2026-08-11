import { describe, expect, it, vi } from 'vitest';

vi.mock('../../src/config/env.js', () => ({
  config: { features: { ai: false, analytics: true, platformSync: true } },
}));
vi.mock('../../src/modules/identity/securityEvents.js', () => ({
  recordSecurityEvent: vi.fn().mockResolvedValue(undefined),
}));

import {
  requireInteractiveSession,
  requireOrganizationScope,
  requireOwnership,
  requirePermission,
  requireWorkspaceScope,
} from '../../src/middleware/authorize.js';

function request(overrides: Record<string, unknown> = {}) {
  return {
    ip: '127.0.0.1', headers: {}, id: 'request-1',
    user: {
      id: 'user-1', email: 'user@example.com', role: 'analyst', workspaceId: 'workspace-1',
      organizationId: 'organization-1', permissions: ['analytics.read', 'ai.use'],
      actorType: 'user', sessionId: 'session-1',
    },
    ...overrides,
  };
}

describe('centralized authorization engine', () => {
  it('denies a missing permission and allows a granted permission', async () => {
    const denied = vi.fn();
    await requirePermission('billing.manage')(request() as never, {} as never, denied);
    expect(denied.mock.calls[0]?.[0]).toMatchObject({ statusCode: 403 });

    const allowed = vi.fn();
    await requirePermission('analytics.read')(request() as never, {} as never, allowed);
    expect(allowed).toHaveBeenCalledWith();
  });

  it('applies feature flags after permission evaluation', async () => {
    const next = vi.fn();
    await requirePermission('ai.use')(request() as never, {} as never, next);
    expect(next.mock.calls[0]?.[0]).toMatchObject({ statusCode: 403, message: 'Feature is disabled' });
  });

  it('enforces interactive, workspace, organization, and ownership attributes', async () => {
    const interactive = vi.fn();
    requireInteractiveSession(request() as never, {} as never, interactive);
    expect(interactive).toHaveBeenCalledWith();

    const wrongWorkspace = vi.fn();
    requireWorkspaceScope(() => 'workspace-2')(request() as never, {} as never, wrongWorkspace);
    expect(wrongWorkspace.mock.calls[0]?.[0]).toMatchObject({ statusCode: 403 });

    const wrongOrganization = vi.fn();
    requireOrganizationScope(() => 'organization-2')(request() as never, {} as never, wrongOrganization);
    expect(wrongOrganization.mock.calls[0]?.[0]).toMatchObject({ statusCode: 403 });

    const owner = vi.fn();
    await requireOwnership(() => 'user-1')(request() as never, {} as never, owner);
    expect(owner).toHaveBeenCalledWith();
  });
});
