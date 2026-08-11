import { expect, test } from '@playwright/test';
import { json, mockProductApi, success } from './support/mocks';

const sessions = [
  {
    id: 'session-current',
    current: true,
    deviceName: 'Chrome on macOS',
    browser: 'Chrome',
    os: 'macOS',
    deviceType: 'desktop',
    ipAddress: '203.0.113.10',
    riskScore: 5,
    authMethods: ['password'],
    lastActiveAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
  },
  {
    id: 'session-other',
    current: false,
    deviceName: 'Safari on iPhone',
    browser: 'Safari',
    os: 'iOS',
    deviceType: 'mobile',
    ipAddress: '203.0.113.20',
    riskScore: 10,
    authMethods: ['password'],
    lastActiveAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
  },
];

test.describe('identity & security settings', () => {
  test('active sessions list shows the current device and a revocable second device', async ({ page }) => {
    await mockProductApi(page, { authenticated: true });
    await page.route('http://localhost:4000/api/v1/identity/sessions', (route) => json(route, success(sessions)));
    await page.goto('/settings');

    await expect(page.getByRole('heading', { name: 'Active sessions' })).toBeVisible();
    await expect(page.getByText('Chrome on macOS · Current')).toBeVisible();
    await expect(page.getByText('Safari on iPhone').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign out other devices' })).toBeVisible();
  });

  test('revoking a session removes it from the list', async ({ page }) => {
    await mockProductApi(page, { authenticated: true });
    let revoked = false;
    await page.route('http://localhost:4000/api/v1/identity/sessions', (route) => (
      json(route, success(revoked ? [sessions[0]] : sessions))
    ));
    await page.route('http://localhost:4000/api/v1/identity/sessions/session-other', async (route) => {
      revoked = true;
      await json(route, success(null));
    });
    await page.goto('/settings');

    await expect(page.getByText('Safari on iPhone')).toBeVisible();
    await page.getByRole('button', { name: 'Revoke' }).click();

    await expect(page.getByText('Safari on iPhone')).toHaveCount(0);
  });

  test('MFA status shows not enabled by default', async ({ page }) => {
    await mockProductApi(page, { authenticated: true });
    await page.goto('/settings');

    await expect(page.getByRole('heading', { name: 'Multi-factor authentication' })).toBeVisible();
    await expect(page.getByText('Not enabled')).toBeVisible();
  });
});
