import { expect, test } from '@playwright/test';
import { mockProductApi } from './support/mocks';

test.describe('profile management', () => {
  test('profile page shows the signed-in user\'s information', async ({ page }) => {
    await mockProductApi(page, { authenticated: true });
    await page.goto('/profile');

    await expect(page.getByRole('heading', { name: 'Surya Patel' })).toBeVisible();
    await expect(page.getByText('surya@example.com').first()).toBeVisible();
  });

  test('editing the profile name persists through the update-profile API', async ({ page }) => {
    await mockProductApi(page, { authenticated: true });
    await page.goto('/profile');

    await page.getByRole('button', { name: 'Edit' }).click();
    const firstNameInput = page.getByPlaceholder('First name');
    await firstNameInput.fill('Surya-Updated');
    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByRole('heading', { name: 'Surya-Updated Patel' })).toBeVisible();
  });

  test('change password rejects a mismatched confirmation before calling the API', async ({ page }) => {
    await mockProductApi(page, { authenticated: true });
    await page.goto('/profile');

    await page.getByPlaceholder('Current password').fill('the-current-password-value');
    await page.getByPlaceholder('New password', { exact: true }).fill('a brand new passphrase here');
    await page.getByPlaceholder('Confirm new password').fill('a different passphrase entirely');

    await expect(page.getByText('Passwords do not match.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Update password' })).toBeDisabled();
  });
});
