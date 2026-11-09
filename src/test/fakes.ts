import { vi } from 'vitest';
import type { Packet } from '../signals';
import type { Sensor } from '../session';
export function fixture() {
  let metrics = (_p: Packet, _t: number) => {};
  let validation = (_c: number, _h: string) => {};
  let error = (_m: string) => {};
  const sensor: Sensor = { onMetrics: cb => { metrics = cb; }, onValidation: cb => { validation = cb; }, onError: cb => { error = cb; }, start: vi.fn().mockResolvedValue(undefined), stop: vi.fn().mockResolvedValue(undefined), destroy: vi.fn() };
  const track = { stop: vi.fn(), addEventListener: vi.fn() };
  const stream = { getTracks: () => [track] } as unknown as MediaStream;
  return { sensor, track, stream, create: vi.fn().mockResolvedValue(sensor), capture: vi.fn().mockResolvedValue(stream), emit: (p: Packet, t = 1) => metrics(p, t), validate: (c = 0, h = '') => validation(c, h), error: (m: string) => error(m) };
}
