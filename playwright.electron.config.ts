import { defineConfig } from '@playwright/test';
export default defineConfig({ testDir: './tests', testMatch: 'electron.spec.ts', timeout: 45000, outputDir: 'test-results/electron' });
