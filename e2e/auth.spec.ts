import { expect, test } from '@playwright/test';
import { mockProductApi } from './support/mocks';

test.describe('authentication flows', () => {
  test('registering a new account shows the verification-sent confirmation', async ({ page }) => {
    await mockProductApi(page, { authenticated: false });
    await page.goto('/register');

    await expect(page.getByRole('heading', { name: 'Create Account' })).toBeVisible();
    await page.getByLabel('First name').fill('Ada');
    await page.getByLabel('Last name').fill('Lovelace');
    await page.getByLabel('Email').fill('ada@example.com');
    await page.getByLabel('Password', { exact: true }).fill('a long private passphrase');
    await page.getByLabel('Confirm password').fill('a long private passphrase');
    await page.getByRole('button', { name: 'Create Account' }).click();

    await expect(page.getByRole('heading', { name: 'Account Created!' })).toBeVisible();
    await expect(page.getByText(/sent a verification link/i)).toBeVisible();
    await page.getByRole('button', { name: 'Go to Sign In' }).click();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('login surfaces an inline error for invalid credentials', async ({ page }) => {
    await mockProductApi(page, { authenticated: false, loginSucceeds: false });
    await page.goto('/login');

    await page.getByLabel('Email').fill('surya@example.com');
    await page.locator('input[type="password"]').fill('wrong-password');
    await page.getByRole('button', { name: 'Continue' }).click();

    await expect(page.getByText(/invalid credentials/i)).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('login with MFA enabled requires a verification code before reaching the dashboard', async ({ page }) => {
    await mockProductApi(page, {
      authenticated: false,
      loginSucceeds: true,
      mfaChallenge: { challengeToken: 'challenge-e2e', methods: ['totp', 'recovery'] },
    });
    await page.goto('/login');

    await page.getByLabel('Email').fill('surya@example.com');
    await page.locator('input[type="password"]').fill('correct-password-value');
    await page.getByRole('button', { name: 'Continue' }).click();

    await expect(page.getByRole('heading', { name: /Verify/i })).toBeVisible();
    await page.getByRole('button', { name: 'Authenticator' }).click();
    await page.getByLabel('6-digit code').fill('123456');
    await page.getByRole('button', { name: 'Verify and continue' }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test('logging out returns an authenticated user to the login page', async ({ page }) => {
    await mockProductApi(page, { authenticated: true });
    await page.goto('/dashboard');
    await expect(page.getByText('Intelligence command center')).toBeVisible();

    await page.getByRole('button', { name: 'Surya Patel' }).click();
    await page.getByRole('button', { name: 'Sign Out' }).click();

    await expect(page).toHaveURL(/\/login$/);
  });

  test('forgot password shows a confirmation regardless of whether the email exists', async ({ page }) => {
    await mockProductApi(page, { authenticated: false });
    await page.goto('/forgot-password');

    await expect(page.getByRole('heading', { name: 'Forgot Password?' })).toBeVisible();
    await page.getByLabel('Email').fill('surya@example.com');
    await page.getByRole('button', { name: 'Send Reset Link' }).click();

    await expect(page.getByRole('heading', { name: 'Check Your Email' })).toBeVisible();
    await page.getByRole('link', { name: 'Back to Sign In' }).click();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('reset password without a token shows an invalid-link state', async ({ page }) => {
    await mockProductApi(page, { authenticated: false });
    await page.goto('/reset-password');

    await expect(page.getByRole('heading', { name: 'Invalid Link' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Request a new reset link' })).toBeVisible();
  });

  test('verify-email with no token shows a failure state with a resend option', async ({ page }) => {
    await mockProductApi(page, { authenticated: false });
    await page.goto('/verify-email');

    await expect(page.getByRole('heading', { name: 'Verification Failed' })).toBeVisible();
    await expect(page.getByText(/no verification token/i)).toBeVisible();
  });
});
