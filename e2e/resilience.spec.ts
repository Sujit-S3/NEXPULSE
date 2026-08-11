import { expect, test } from '@playwright/test';
import { mockProductApi } from './support/mocks';

test.describe('resilience & edge states', () => {
  test('an unknown route renders the 404 page with working navigation', async ({ page }) => {
    await mockProductApi(page, { authenticated: false });
    await page.goto('/this-route-does-not-exist');

    await expect(page.getByRole('heading', { name: '404' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Page Not Found' })).toBeVisible();
    await page.getByRole('button', { name: 'Dashboard' }).click();
    await expect(page).toHaveURL(/\/(login|dashboard)$/);
  });

  test('the maintenance page renders without requiring authentication', async ({ page }) => {
    await mockProductApi(page, { authenticated: false });
    await page.goto('/maintenance');

    await expect(page.getByRole('heading', { name: 'Under Maintenance' })).toBeVisible();
    await expect(page.getByText('Auto-refreshing...')).toBeVisible();
  });

  test('losing connectivity shows the offline overlay, regaining it hides it', async ({ page }) => {
    await mockProductApi(page, { authenticated: true });
    await page.goto('/dashboard');
    await expect(page.getByText('Intelligence command center')).toBeVisible();

    await page.context().setOffline(true);
    await expect(page.getByRole('heading', { name: 'No Internet Connection' })).toBeVisible();

    await page.context().setOffline(false);
    await expect(page.getByRole('heading', { name: 'No Internet Connection' })).toHaveCount(0);
  });
});
