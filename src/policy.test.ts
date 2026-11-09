import { createRequire } from 'node:module';
import { it, expect } from 'vitest';
const require = createRequire(import.meta.url);
const { trustedPage, allowCamera } = require('../electron/policy.cjs');
it('grants only video and only the exact application page', () => {
  expect(trustedPage('http://127.0.0.1:5173/', false, '')).toBe(true);
  expect(trustedPage('http://127.0.0.1:5173.evil.test/', false, '')).toBe(false);
  expect(trustedPage('https://example.com', false, '')).toBe(false);
  expect(trustedPage('http://127.0.0.1:5173/remote', false, '')).toBe(false);
  expect(allowCamera('media', { mediaTypes: ['video'] })).toBe(true);
  expect(allowCamera('media', { mediaTypes: ['audio', 'video'] })).toBe(false);
  expect(allowCamera('media', {})).toBe(false);
});
