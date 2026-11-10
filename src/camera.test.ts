import { afterEach, expect, it, vi } from 'vitest';
import { captureCamera } from './camera';
afterEach(() => vi.restoreAllMocks());
function camera(frameRate: number) {
  const stop = vi.fn();
  const track = { stop, getSettings: () => ({ width: 1280, height: 720, frameRate }) };
  const stream = { getTracks: () => [track], getVideoTracks: () => [track] } as unknown as MediaStream;
  const capture = vi.fn().mockResolvedValue(stream);
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: capture } });
  return { stream, stop, capture };
}
it('requires at least 25 fps without requesting microphone access', async () => {
  const f = camera(30); expect(await captureCamera()).toBe(f.stream);
  expect(f.capture).toHaveBeenCalledWith(expect.objectContaining({ audio: false, video: expect.objectContaining({ frameRate: { min: 25, ideal: 30 } }) }));
  expect(f.stop).not.toHaveBeenCalled();
});
it('releases a stream whose reported camera mode is too slow', async () => {
  const f = camera(15); await expect(captureCamera()).rejects.toThrow('15.0 fps'); expect(f.stop).toHaveBeenCalledOnce();
});
it('explains unavailable modes without retrying or dropping the minimum', async () => {
  const f = camera(30); f.capture.mockRejectedValue(new DOMException('Not supported', 'OverconstrainedError'));
  await expect(captureCamera()).rejects.toThrow('25–30 fps'); expect(f.capture).toHaveBeenCalledOnce();
});
it('preserves permission-denied errors', async () => {
  const f = camera(30), error = new DOMException('Permission denied', 'NotAllowedError'); f.capture.mockRejectedValue(error);
  await expect(captureCamera()).rejects.toBe(error);
});
