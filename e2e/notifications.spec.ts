import { expect, test } from '@playwright/test';
import { json, mockProductApi, success } from './support/mocks';

test.describe('notifications', () => {
  test('empty state renders when there is no activity', async ({ page }) => {
    await mockProductApi(page, { authenticated: true });
    await page.goto('/notifications');

    await expect(page.getByRole('heading', { name: 'No matching activity' })).toBeVisible();
  });

  test('an unread notification can be marked all-read', async ({ page }) => {
    await mockProductApi(page, { authenticated: true });
    let unread = 1;
    // The page appends query params (e.g. ?status=all), so match by pathname via a
    // predicate rather than an exact URL string, which would only match a bare-path request.
    await page.route((url) => url.hostname === 'localhost' && url.pathname === '/api/v1/notifications', (route) => json(route, success({
      items: [{
        id: 'notification-e2e',
        type: 'insight',
        title: 'New audience insight',
        message: 'Your Instagram audience grew 12% this week.',
        timestamp: new Date().toISOString(),
        read: unread === 0,
      }],
      unread,
      meta: { page: 1, limit: 20, total: 1, hasNext: false, hasPrevious: false },
    })));
    await page.route('http://localhost:4000/api/v1/notifications/read-all', async (route) => {
      unread = 0;
      await json(route, success(null));
    });
    await page.goto('/notifications');

    await expect(page.getByText('New audience insight')).toBeVisible();
    await page.getByRole('button', { name: /mark all.*read/i }).click();

    await expect(page.getByRole('button', { name: /mark all.*read/i })).toHaveCount(0);
  });
});
