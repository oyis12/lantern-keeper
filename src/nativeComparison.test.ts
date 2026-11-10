// @vitest-environment node
import { createRequire } from 'node:module';
import { expect, it, vi, afterEach } from 'vitest';
const { runNativeComparison, hasCameraConsent } = createRequire(import.meta.url)('../scripts/native-session.cjs');
it.each(['yes', 'YES', 'Yes', ' yes '])('accepts explicit consent in any letter case: %s', answer => expect(hasCameraConsent(answer)).toBe(true));
it.each(['', 'y', 'no', 'yes please', undefined])('does not infer consent from %s', answer => expect(hasCameraConsent(answer)).toBe(false));
afterEach(() => vi.useRealTimers());
function fixture() {
  const callbacks = new Map<string, (...args: any[]) => void>();
  const sdk = { on: vi.fn((event, cb) => callbacks.set(event, cb)), useCamera: vi.fn(), start: vi.fn(), stopAsync: vi.fn().mockResolvedValue(undefined), destroy: vi.fn().mockResolvedValue(undefined) };
  const vendor = { SmartSpectraSDK: vi.fn(function() { return sdk; }), CameraSelection: { byId: (id: string) => ({ id }) }, MetricType: { CHEST_BREATHING: 0, BREATHING_RATE: 2 }, SmartSpectraLogLevel: { kNone: 4 }, decodeMetrics: vi.fn().mockReturnValue({ breathing: { rate: [{ stable: true }], upperTrace: [{ stable: true }] } }) };
  return { sdk, vendor, callbacks, report: vi.fn(), controller: new AbortController() };
}
it('never creates a native session without consent and a key', async () => {
  const f = fixture();
  await expect(runNativeComparison({ vendor: f.vendor, consented: false, apiKey: 'key', cameraId: 'camera' })).rejects.toThrow('consent');
  await expect(runNativeComparison({ vendor: f.vendor, consented: true, apiKey: '', cameraId: 'camera' })).rejects.toThrow('consent');
  expect(f.vendor.SmartSpectraSDK).not.toHaveBeenCalled();
});
it('uses native camera input, counts synthetic events and releases on user stop', async () => {
  const f = fixture(); const pending = runNativeComparison({ vendor: f.vendor, consented: true, apiKey: 'private-key', cameraId: 'camera', signal: f.controller.signal, report: f.report });
  expect(f.vendor.SmartSpectraSDK).toHaveBeenCalledWith(expect.objectContaining({ enableTelemetry: false, enableAccumulatedOutput: false, requestedMetrics: [0, 2] }));
  expect(f.sdk.useCamera).toHaveBeenCalledWith({ id: 'camera' }, { width: 640, height: 480, fps: 30 });
  f.callbacks.get('frameSentThrough')!(true, 1); f.callbacks.get('frameSentThrough')!(false, 2); f.callbacks.get('metrics')!(new Uint8Array());
  f.controller.abort(); const result = await pending;
  expect(result).toMatchObject({ callbacks: 2, through: 1, skipped: 1, stablePackets: 1 });
  expect(f.sdk.stopAsync).toHaveBeenCalledOnce(); expect(f.sdk.destroy).toHaveBeenCalledOnce();
  expect(JSON.stringify(f.report.mock.calls)).not.toContain('private-key');
});
it('redacts credentials in error details and destroys even if stop rejects', async () => {
  const f = fixture(); f.sdk.stopAsync.mockRejectedValue(new Error('stop failed'));
  const pending = runNativeComparison({ vendor: f.vendor, consented: true, apiKey: 'private-key', cameraId: 'camera', report: f.report });
  f.callbacks.get('error')!(8, 'failure private-key'); await pending;
  expect(JSON.stringify(f.report.mock.calls)).not.toContain('private-key'); expect(f.sdk.destroy).toHaveBeenCalledOnce();
});
it('bounds the native comparison and cleans up at the deadline', async () => {
  vi.useFakeTimers(); const f = fixture(); const pending = runNativeComparison({ vendor: f.vendor, consented: true, apiKey: 'key', cameraId: 'camera', report: f.report, durationMs: 1000 });
  await vi.advanceTimersByTimeAsync(1000); await pending; expect(f.sdk.destroy).toHaveBeenCalledOnce();
});
