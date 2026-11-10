// @vitest-environment node
import { it, vi, expect } from 'vitest';
import { Metrics } from '@smartspectra/node-sdk/messages';
const mock = vi.hoisted(() => ({ options: {} as Record<string, unknown>, callbacks: new Map<string, (...args: any[]) => void>(), start: vi.fn().mockResolvedValue(undefined), stop: vi.fn().mockResolvedValue(undefined), destroy: vi.fn(), stream: vi.fn() }));
vi.mock('@smartspectra/node-sdk/renderer', () => ({
  MetricType: { CHEST_BREATHING: 0, BREATHING_RATE: 2 },
  SmartSpectraSDK: class {
    constructor(options: Record<string, unknown>) { mock.options = options; }
    on(event: string, cb: (...args: any[]) => void) { mock.callbacks.set(event, cb); }
    useMediaStream = mock.stream; start = mock.start; stop = mock.stop; destroy = mock.destroy;
  },
}));
import { createPresageSensor } from './presage';
it('wires the official SDK API and decodes real wire messages using synthetic readings', async () => {
  const sensor = await createPresageSensor('synthetic-key');
  expect(mock.options).toMatchObject({ apiKey: 'synthetic-key', requestedMetrics: [0, 2], enableTelemetry: false, enableAccumulatedOutput: false });
  const received = vi.fn(), validation = vi.fn(), error = vi.fn();
  sensor.onMetrics(received); sensor.onValidation(validation); sensor.onError(error);
  const frame = vi.fn(); sensor.onFrame(frame); mock.callbacks.get('frameSentThrough')!(true, 99); expect(frame).toHaveBeenCalledWith(true, 99);
  const bytes = Metrics.encode({ breathing: { rate: [{ value: 12, confidence: 80, stable: true }], upperTrace: [{ value: 0.2, stable: true }] } }).finish();
  mock.callbacks.get('metrics')!(bytes, 100);
  expect(received.mock.calls[0][0].breathing.rate[0].value).toBe(12);
  mock.callbacks.get('validationStatus')!(7, 101, 'Chest not visible'); expect(validation).toHaveBeenCalledWith(7, 'Chest not visible');
  mock.callbacks.get('error')!(2, 'secret vendor details', false); expect(error.mock.calls[0][0]).not.toContain('secret');
  const stream = {} as MediaStream; await sensor.start(stream);
  expect(mock.stream).toHaveBeenCalledWith(stream); expect(mock.start).toHaveBeenCalledOnce();
  await sensor.stop(); sensor.destroy(); expect(mock.stop).toHaveBeenCalledOnce(); expect(mock.destroy).toHaveBeenCalledOnce();
});
it('retains low-frame-rate context for processing failures and redacts the key', async () => {
  const sensor = await createPresageSensor('private-test-key'); const error = vi.fn();
  sensor.onValidation(vi.fn()); sensor.onError(error);
  mock.callbacks.get('validationStatus')!(11, 1, 'Use a camera mode providing at least 25 fps');
  mock.callbacks.get('error')!(8, 'Processing stopped private-test-key', false);
  expect(error.mock.calls[0][0]).toContain('low frame rate');
  expect(error.mock.calls[0][0]).toContain('SDK detail: Processing stopped [redacted]');
  expect(error.mock.calls[0][0]).not.toContain('private-test-key');
});
