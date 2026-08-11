import { expect, test } from '@playwright/test';
import { json, mockProductApi, success, user } from './support/mocks';

test.describe('billing', () => {
  test('a permitted user sees the plan and can start checkout', async ({ page }) => {
    await mockProductApi(page, { authenticated: true });
    await page.goto('/billing');

    await expect(page.getByRole('heading', { name: 'Billing & subscription' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Professional' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Continue with Razorpay' })).toBeVisible();
  });

  test('a user without billing.manage sees the permission-gated message instead', async ({ page }) => {
    await mockProductApi(page, { authenticated: true });
    const restrictedUser = { ...user, permissions: user.permissions.filter((p) => p !== 'billing.manage') };
    await page.route('http://localhost:4000/api/v1/auth/refresh', (route) => (
      json(route, success({ user: restrictedUser, accessToken: 'e2e-access-token' }))
    ));
    await page.goto('/billing');

    await expect(page.getByRole('heading', { name: 'Billing administrator access required' })).toBeVisible();
  });
});
