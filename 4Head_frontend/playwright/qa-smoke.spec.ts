import { test, expect } from '@playwright/test';

test('real browser login and navigation inventory', async ({ page }) => {
  const traffic: Array<{ method: string; url: string; status: number }> = [];
  page.on('response', response => {
    if (response.url().includes(':3000')) traffic.push({ method: response.request().method(), url: response.url(), status: response.status() });
  });
  await page.goto('/login');
  await page.getByLabel(/email/i).fill('admin@poultry.local');
  await page.getByLabel(/password/i).fill('Admin@123');
  await page.getByRole('button', { name: /sign in|login/i }).click();
  await expect(page).not.toHaveURL(/login/);
  await page.screenshot({ path: '../qa-artifacts/01-owner-dashboard.png', fullPage: true });
  const body = await page.locator('body').innerText();
  console.log('VISIBLE_UI\n' + body);
  console.log('NETWORK\n' + JSON.stringify(traffic, null, 2));
});
