import { test, expect, Page } from '@playwright/test';

const password = 'QaBrowser@123';
const accounts = [
  { name: 'QA Accountant', email: 'qa.accountant@poultry.local', role: 'Accountant' },
  { name: 'QA Brokerage Staff', email: 'qa.brokerage@poultry.local', role: 'Department staff', department: 'Brokerage' },
  { name: 'QA Supply Staff', email: 'qa.supply@poultry.local', role: 'Department staff', department: 'Supply' },
];

async function login(page: Page) {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill('admin@poultry.local');
  await page.getByLabel(/password/i).fill('Admin@123');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).not.toHaveURL(/login/);
}

test('create required QA accounts through owner UI', async ({ page }) => {
  const responses: string[] = [];
  page.on('response', r => { if (r.url().includes(':3000/users')) responses.push(`${r.request().method()} ${r.status()} ${r.url()}`); });
  await login(page);
  await page.goto('/users');
  await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible();

  for (const account of accounts) {
    if (await page.getByText(account.email, { exact: true }).count()) continue;
    await page.getByRole('button', { name: 'Add User' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Full name').fill(account.name);
    await dialog.getByLabel('Email').fill(account.email);
    await dialog.getByLabel('Initial password').fill(password);
    await dialog.getByRole('combobox').nth(0).click();
    await page.getByRole('option', { name: account.role, exact: true }).click();
    if (account.department) {
      await dialog.getByRole('combobox').nth(1).click();
      await page.getByRole('option', { name: account.department, exact: true }).click();
    }
    await dialog.getByRole('button', { name: 'Create user' }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText(account.email, { exact: true })).toBeVisible();
  }
  await page.screenshot({ path: '../qa-artifacts/02-qa-accounts.png', fullPage: true });
  console.log('ACCOUNTS password=' + password + '\n' + accounts.map(a => `${a.email} | ${a.role} | ${a.department ?? 'all departments'}`).join('\n'));
  console.log('NETWORK\n' + responses.join('\n'));
});
