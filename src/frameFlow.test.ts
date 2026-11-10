import { expect, it } from 'vitest';
import { FrameFlow } from './frameFlow';
it('distinguishes callback delivery cadence from source timestamp cadence', () => {
  const flow = new FrameFlow();
  for (let i = 0; i <= 30; i++) flow.add(true, i * 1e6 / 30, i * 2000 / 30);
  expect(flow.snapshot(2000)).toMatchObject({ callbacks: 31, through: 31, skipped: 0, arrivalFps: 15, timestampFps: 30 });
});
it('counts skipped callbacks without claiming completed inference', () => {
  const flow = new FrameFlow(); flow.add(true, 0, 0); flow.add(false, 1e6, 1000);
  expect(flow.snapshot(1000)).toMatchObject({ through: 1, skipped: 1, arrivalFps: 1 });
});
it('does not invent a rate without a sampling interval or reuse stale timings', () => {
  const flow = new FrameFlow(); flow.add(true, 0, 0);
  expect(flow.snapshot(0).arrivalFps).toBeNull();
  expect(flow.snapshot(6000)).toMatchObject({ callbacks: 1, arrivalFps: null, timestampFps: null });
});
