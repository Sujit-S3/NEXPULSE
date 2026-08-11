import { expect, test } from '@playwright/test';
import { mockProductApi } from './support/mocks';

test.describe('premium NEXPULSE experience', () => {
  test('landing uses the sixth logo, premium pricing cards, and both themes', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('nexpulse-theme', 'dark'));
    await page.goto('/');

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('img[src="/branding/main-dark.png"]').first()).toBeVisible();
    await expect(page.getByRole('heading', { name: /The Pulse of/i })).toBeVisible();

    await page.getByRole('link', { name: 'Pricing' }).click();
    await expect(page.locator('.pricing-plan-card')).toHaveCount(3);
    await expect(page.locator('.pricing-plan-card .atropos')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Pro', exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Switch to light mode' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    const backgroundImage = await page.locator('body').evaluate(
      (element) => getComputedStyle(element).backgroundImage,
    );
    expect(backgroundImage).toContain('gradient');
  });

  test('login opens the dashboard and direct dashboard URLs remain stable', async ({ page }) => {
    await mockProductApi(page, { authenticated: false, loginSucceeds: true });
    await page.goto('/login');

    await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();
    await page.getByLabel('Email').fill('surya@example.com');
    await page.locator('input[type="password"]').fill('correct-password-value');
    await page.getByRole('button', { name: 'Continue' }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByText('Intelligence command center')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Connect your first source of truth' })).toBeVisible();
  });

  test('unauthenticated direct dashboard traffic is routed to login', async ({ page }) => {
    await mockProductApi(page, { authenticated: false });
    await page.goto('/dashboard');

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();
  });

  test('platforms, reports, and AI routes render truthful premium states', async ({ page }) => {
    await mockProductApi(page, { authenticated: true });

    await page.goto('/platforms');
    await expect(page.getByRole('heading', { name: 'Connected accounts' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Bring every account into focus' })).toBeVisible();

    await page.getByRole('link', { name: 'Reports' }).click();
    await expect(page).toHaveURL(/\/reports$/);
    await expect(page.getByRole('heading', { name: 'Reports that feel board-ready.' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Connect data before creating a report' })).toBeVisible();

    await page.getByRole('link', { name: 'AI Insights' }).click();
    await expect(page).toHaveURL(/\/ai$/);
    await expect(page.getByRole('heading', { name: 'Choose an account to begin' })).toBeVisible();
    await expect(page.getByText('AI provider setup required')).toBeVisible();
  });
});
