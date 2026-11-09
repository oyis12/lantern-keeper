import { test, expect } from '@playwright/test';
test('browser shell renders the harbor and never requests a camera before consent', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { value: () => { throw new Error('Unexpected camera access'); } });
  });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('A little light.');
  await expect(page.getByRole('button', { name: /Light the lantern/ })).toBeDisabled();
  await expect(page.locator('canvas')).toBeVisible();
  await page.getByLabel(/Presage API key/).fill('synthetic-test-key');
  await page.getByRole('checkbox').check();
  await expect(page.getByRole('button', { name: /Light the lantern/ })).toBeEnabled();
  await expect(page.getByRole('status')).toHaveText('Camera off');
  await page.screenshot({ path: 'test-results/harbor-desktop.png', fullPage: true });
  expect(errors).toEqual([]);
});
