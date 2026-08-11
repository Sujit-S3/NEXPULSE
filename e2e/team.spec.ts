import { expect, test } from '@playwright/test';
import { json, mockProductApi, success } from './support/mocks';

test.describe('team management', () => {
  test('members and empty invitations render', async ({ page }) => {
    await mockProductApi(page, { authenticated: true });
    await page.goto('/team');

    await expect(page.getByRole('heading', { name: 'Team' })).toBeVisible();
    await expect(page.getByText('surya@example.com · active')).toBeVisible();
    await expect(page.getByText('No pending invitations.')).toBeVisible();
  });

  test('sending an invitation adds it to the pending list', async ({ page }) => {
    await mockProductApi(page, { authenticated: true });
    let invited = false;
    await page.route('http://localhost:4000/api/v1/identity/invitations', async (route) => {
      if (route.request().method() === 'POST') {
        invited = true;
        return json(route, success({
          id: 'invitation-e2e', email: 'new.teammate@example.com', role: 'viewer',
          status: 'pending', expiresAt: new Date(Date.now() + 604_800_000).toISOString(), createdAt: new Date().toISOString(),
        }), 201);
      }
      return json(route, success(invited ? [{
        id: 'invitation-e2e', email: 'new.teammate@example.com', role: 'viewer',
        status: 'pending', expiresAt: new Date(Date.now() + 604_800_000).toISOString(), createdAt: new Date().toISOString(),
      }] : []));
    });
    await page.goto('/team');

    await page.getByPlaceholder('name@company.com').fill('new.teammate@example.com');
    await page.getByRole('button', { name: 'Send invite' }).click();

    await expect(page.getByText('new.teammate@example.com')).toBeVisible();
  });
});
