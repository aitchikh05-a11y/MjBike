import { test, expect } from '@playwright/test';

/**
 * Public site smoke tests. Run with the demo backend (no env vars needed).
 * See playwright.config.ts for installation instructions.
 */

test.describe('public site', () => {
  test('English homepage renders hero, services and offers', async ({ page }) => {
    await page.goto('/en/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/discover tangier on two wheels/i);
    await expect(page.getByRole('link', { name: /book your ride/i }).first()).toBeVisible();
    await expect(page.locator('main')).toContainText(/bike rental/i);
  });

  test('French and Arabic pages use localized URLs and direction', async ({ page }) => {
    await page.goto('/fr/location-velos/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
    await expect(page.getByRole('heading', { level: 1 })).not.toBeEmpty();

    await page.goto('/ar/tajir-darajat/');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
  });

  test('language switcher keeps the equivalent page', async ({ page }) => {
    await page.goto('/en/bike-tours/');
    await page.getByRole('button', { name: /language|english/i }).first().click();
    await page.getByRole('link', { name: /français|french/i }).first().click();
    await expect(page).toHaveURL(/\/fr\/balades-velo\//);
  });

  test('SEO tags expose canonical and hreflang alternates', async ({ page }) => {
    await page.goto('/en/offers/');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/en\/offers\/$/);
    await expect(page.locator('link[rel="alternate"][hreflang="fr"]')).toHaveCount(1);
    await expect(page.locator('link[rel="alternate"][hreflang="ar"]')).toHaveCount(1);
  });

  test('unknown URL renders the localized 404 page', async ({ page }) => {
    const response = await page.goto('/en/this-page-does-not-exist/');
    expect(response?.status()).toBeLessThan(400); // SPA: the 404 page is rendered client-side
    await expect(page.locator('main')).toContainText(/not found|404/i);
  });
});

test.describe('booking request', () => {
  test('guest can submit a request and is told it is not yet confirmed', async ({ page }) => {
    await page.goto('/en/reservations/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    await page.getByLabel(/full name/i).fill('Playwright Tester');
    await page.getByLabel(/^email/i).fill('playwright@example.com');
    await page.getByLabel(/phone/i).fill('+212 612 345 678');

    // Date: tomorrow, formatted for the date input.
    const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
    await page.getByLabel(/date/i).first().fill(tomorrow);
    await page.getByLabel(/start time/i).selectOption({ index: 1 });

    await page.getByLabel(/privacy/i).check();
    await page.getByRole('button', { name: /send|request|book/i }).last().click();

    await expect(page.locator('main')).toContainText(/MJB-\d{6}-[A-Z0-9]{4}/, { timeout: 15_000 });
    await expect(page.locator('main')).toContainText(/not (yet )?confirmed|pending/i);
  });
});

test.describe('admin', () => {
  test('anonymous visitors are redirected to the login screen', async ({ page }) => {
    await page.goto('/admin/dashboard');
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test('demo super admin reaches the dashboard with real-data cards', async ({ page }) => {
    await page.goto('/admin/login');
    await page.getByLabel(/email/i).fill('owner@mjbiketangier.com');
    await page.getByLabel(/password/i).fill('MjBike!2026');
    await page.getByRole('button', { name: /sign in|log in/i }).click();

    await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 15_000 });
    await expect(page.locator('main')).toContainText(/dashboard/i);
    await expect(page.getByText(/local demo mode/i).first()).toBeVisible();
  });

  test('staff cannot see settings', async ({ page }) => {
    await page.goto('/admin/login');
    await page.getByLabel(/email/i).fill('staff@mjbiketangier.com');
    await page.getByLabel(/password/i).fill('MjBike!2026');
    await page.getByRole('button', { name: /sign in|log in/i }).click();
    await page.goto('/admin/settings');
    await expect(page.locator('main')).not.toContainText(/business information/i);
  });
});
