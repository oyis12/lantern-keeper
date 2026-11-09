import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
afterEach(() => cleanup());
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', { value: () => ({ matches: false }) });
  HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
}
