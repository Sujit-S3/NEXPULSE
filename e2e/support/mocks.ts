import type { Page, Route } from '@playwright/test';

export const user = {
  id: 'user-e2e',
  firstName: 'Surya',
  lastName: 'Patel',
  email: 'surya@example.com',
  role: 'owner',
  status: 'active',
  emailVerified: true,
  workspaceId: 'workspace-e2e',
  // Client-side permission gates do exact-string matching (no '*' wildcard support),
  // so every permission a test needs to see the "permitted" UI must be listed explicitly.
  permissions: [
    'team.read', 'team.invite', 'team.manage', 'team.remove',
    'billing.manage',
    'identity.sessions.manage', 'identity.mfa.manage',
    'identity.api_keys.manage', 'identity.service_accounts.manage',
    'ai.use', 'analytics.read',
    'platform.read', 'platform.connect', 'platform.disconnect',
    'notifications.read', 'notifications.manage',
    'settings.read', 'settings.manage',
    'workspace.read',
  ],
  mfa: {
    enabled: false,
    emailOtpEnabled: false,
    enrollmentRequired: false,
  },
  preferences: {
    theme: 'dark',
    notifications: true,
    timezone: 'Asia/Calcutta',
  },
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

export const workspace = {
  id: 'workspace-e2e',
  name: 'NEXPULSE Studio',
  slug: 'nexpulse-studio',
  members: 1,
  plan: 'enterprise',
};

export function success(data: unknown) {
  return { success: true, data };
}

export function failure(code: string, message: string) {
  return { success: false, error: { code, message } };
}

export async function json(route: Route, data: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(data),
  });
}

export interface MockApiOptions {
  authenticated: boolean;
  loginSucceeds?: boolean;
  /** When set, POST /auth/login returns a 202 MFA challenge instead of a session. */
  mfaChallenge?: { challengeToken: string; methods: string[] };
}

/**
 * Registers the baseline API mock every spec builds on. Individual tests can layer
 * more specific `page.route(...)` calls afterward — Playwright runs the most recently
 * registered matching handler first, so a later, narrower route wins without needing
 * an overrides parameter here.
 */
export async function mockProductApi(page: Page, options: MockApiOptions) {
  let authenticated = options.authenticated;

  await page.route('http://localhost:4000/api/v1/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();

    // Long-lived SSE-style connections: never resolve, matching a real idle stream,
    // so the client's reconnect loop doesn't busy-spin against a mock that closes instantly.
    if (path === '/api/v1/notifications/stream') {
      await new Promise(() => {});
      return;
    }

    if (path === '/api/v1/auth/refresh') {
      if (!authenticated) return json(route, failure('AUTHENTICATION_ERROR', 'No active session'), 401);
      return json(route, success({ user, accessToken: 'e2e-access-token' }));
    }

    if (path === '/api/v1/auth/login' && method === 'POST') {
      if (!options.loginSucceeds) return json(route, failure('AUTHENTICATION_ERROR', 'Invalid credentials'), 401);
      if (options.mfaChallenge) {
        return json(route, success({ mfaRequired: true, ...options.mfaChallenge }), 202);
      }
      authenticated = true;
      return json(route, success({ user, accessToken: 'e2e-access-token', mfaRequired: false }));
    }

    if (path === '/api/v1/auth/mfa/verify' && method === 'POST') {
      authenticated = true;
      return json(route, success({ user, accessToken: 'e2e-access-token' }));
    }

    if (path === '/api/v1/auth/register' && method === 'POST') {
      authenticated = true;
      return json(route, success({ user, accessToken: 'e2e-access-token' }), 201);
    }

    if (path === '/api/v1/auth/logout' && method === 'POST') {
      authenticated = false;
      return json(route, success(null));
    }

    if (path === '/api/v1/auth/forgot-password' && method === 'POST') {
      return json(route, success({ message: 'If an account exists, a reset link has been sent' }));
    }

    if (path === '/api/v1/auth/reset-password' && method === 'POST') {
      return json(route, success(null));
    }

    if (path === '/api/v1/auth/verify-email' && method === 'POST') {
      return json(route, success(null));
    }

    if (path === '/api/v1/auth/resend-verification' && method === 'POST') {
      return json(route, success(null));
    }

    if (path === '/api/v1/auth/profile' && method === 'PATCH') {
      const body = request.postDataJSON() as Record<string, unknown>;
      return json(route, success({ ...user, ...body }), 200);
    }

    if (path === '/api/v1/auth/password' && method === 'PATCH') {
      return json(route, success(null));
    }

    if (path === '/api/v1/workspaces/current') return json(route, success(workspace));
    if (path === '/api/v1/workspaces') return json(route, success([workspace]));

    if (path === '/api/v1/notifications' && method === 'GET') {
      return json(route, success({
        items: [],
        unread: 0,
        meta: { page: 1, limit: 20, total: 0, hasNext: false, hasPrevious: false },
      }));
    }
    if (/^\/api\/v1\/notifications\/[^/]+\/read$/.test(path) || path === '/api/v1/notifications/read-all') {
      return json(route, success(null));
    }

    if (path === '/api/v1/platforms/connections') return json(route, success([]));
    if (path === '/api/v1/platforms/providers') return json(route, success([]));
    if (path === '/api/v1/platforms/provider-status') {
      return json(route, success([
        { id: 'instagram', name: 'Instagram', scopes: [], configured: false },
        { id: 'youtube', name: 'YouTube', scopes: [], configured: false },
      ]));
    }
    if (path === '/api/v1/platforms/health') return json(route, success([]));

    if (path === '/api/v1/ai/status') {
      return json(route, success({
        enabled: true,
        ready: false,
        defaultModel: null,
        models: [
          { id: 'gpt-4o', provider: 'OpenAI', label: 'GPT-4o', configured: false },
          { id: 'claude-3.5', provider: 'Anthropic', label: 'Claude 3.5', configured: false },
          { id: 'gemini-2.0', provider: 'Google', label: 'Gemini 2.0', configured: false },
        ],
      }));
    }
    if (path === '/api/v1/ai/conversations' && method === 'GET') {
      return json(route, success({ conversations: [], total: 0 }));
    }

    if (path === '/api/v1/identity/sessions' && method === 'GET') return json(route, success([]));
    if (path === '/api/v1/identity/mfa' && method === 'GET') {
      return json(route, success({ enabled: false, totpEnabled: false, emailOtpEnabled: false, recoveryCodesRemaining: 0, trustedDevices: [] }));
    }
    if (path === '/api/v1/identity/security-events') return json(route, success({ items: [] }));
    if (path === '/api/v1/identity/credentials') return json(route, success([]));
    if (path === '/api/v1/identity/service-accounts') return json(route, success([]));
    if (path === '/api/v1/identity/members') return json(route, success([user]));
    if (path === '/api/v1/identity/invitations' && method === 'GET') return json(route, success([]));

    if (path === '/api/v1/billing/plans') {
      return json(route, success({
        currency: 'INR',
        plans: [{
          id: 'professional',
          prices: {
            monthly: { amountMinor: 399900 },
            annual: { amountMinor: 3838800 },
          },
        }],
      }));
    }
    if (path === '/api/v1/billing/subscription') return json(route, success(null));

    if (path === '/api/v1/reports') return json(route, success([]));
    if (path === '/api/v1/analytics') return json(route, success(null));

    await json(route, success([]));
  });
}
