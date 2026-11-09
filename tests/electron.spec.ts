import { test, expect, chromium, type Browser } from '@playwright/test';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
test('packaged desktop starts safely without opening the camera', async () => {
  const server = createServer();
  const port = await new Promise<number>(resolve => server.listen(0, '127.0.0.1', () => { const address = server.address(); if (address && typeof address !== 'string') { const port = address.port; server.close(() => resolve(port)); } }));
  // Browser CDP avoids the experimental Electron main-process inspector path.
  const child = spawn(path.resolve('release/win-unpacked/The Lantern Keeper.exe'), [`--remote-debugging-port=${port}`, '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'], { windowsHide: true });
  let browser: Browser | undefined;
  let spawnError: Error | undefined;
  child.on('error', error => { spawnError = error; });
  try {
    await expect.poll(async () => {
      if (spawnError) throw spawnError;
      try { browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`, { timeout: 1000 }); return true; } catch { return false; }
    }, { timeout: 20000 }).toBe(true);
    const context = browser!.contexts()[0];
    const page = context.pages()[0] || await context.waitForEvent('page');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('A little light.');
    await expect(page.getByRole('status')).toHaveText('Camera off');
    await expect(page.locator('canvas')).toBeVisible();
    await expect(page.getByRole('button', { name: /Light the lantern/ })).toBeDisabled();
    expect(await page.evaluate(() => '__smartspectraBridge' in window)).toBe(true);
    await page.screenshot({ path: 'test-results/electron/packaged-harbor.png', fullPage: true });
    // Startup can be verified even when machine policy blocks SDK DLL loading.
    // This test deliberately never submits a key or requests webcam access.
    if (new URL(page.url()).searchParams.get('sdk') === 'unavailable') {
      await expect(page.getByRole('alert')).toContainText('native runtime could not load');
      test.info().annotations.push({ type: 'SDK runtime', description: 'Unavailable on this host; startup verified, real inference NOT verified.' });
    }
    await page.evaluate(() => window.close()).catch(() => {});
  } finally { await browser?.close(); if (child.exitCode === null) child.kill(); }
});
