import { expect, test } from '@playwright/test';
import { mockProductApi } from './support/mocks';

test.describe('responsive layout', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('landing page renders its hero and pricing sections on a mobile viewport', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /The Pulse of/i })).toBeVisible();

    // The nav's text links (including "Pricing") are `hidden md:flex` with no mobile
    // hamburger alternative, so they aren't reachable by click below the md breakpoint —
    // that's a real gap, not something to route around with a different locator here.
    // Verify the pricing section still renders correctly at this width via direct anchor nav.
    await page.goto('/#pricing');
    await expect(page.locator('.pricing-plan-card')).toHaveCount(3);
  });

  test('the sidebar drawer opens and closes on a mobile viewport', async ({ page }) => {
    await mockProductApi(page, { authenticated: true });
    await page.goto('/dashboard');
    await expect(page.getByText('Intelligence command center')).toBeVisible();

    const sidebar = page.locator('.nexpulse-sidebar');
    await expect(sidebar).toHaveClass(/-translate-x-full/);

    await page.getByRole('button', { name: 'Toggle navigation sidebar' }).click();
    await expect(sidebar).toHaveClass(/translate-x-0/);

    await page.getByRole('button', { name: 'Toggle navigation sidebar' }).click();
    await expect(sidebar).toHaveClass(/-translate-x-full/);
  });
});
