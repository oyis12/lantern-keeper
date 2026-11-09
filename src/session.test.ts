import { it, expect, vi, afterEach } from 'vitest';
import { BreathingSession } from './session';
import { fixture } from './test/fakes';
import type { Packet } from './signals';
const packet: Packet = { breathing: { rate: [{ value: 12, confidence: 80, stable: true }], upperTrace: [{ value: 2, stable: true }] } };
afterEach(() => vi.useRealTimers());
it('does not create a sensor or request camera without explicit consent and key', async () => {
  const f = fixture(), session = new BreathingSession(f.create, f.capture, vi.fn());
  await session.start(false, 'key'); await session.start(true, '');
  expect(f.create).not.toHaveBeenCalled(); expect(f.capture).not.toHaveBeenCalled();
});
it('streams measurements, suppresses bad framing and ignores late callbacks after Stop', async () => {
  const f = fixture(), session = new BreathingSession(f.create, f.capture, vi.fn());
  await session.start(true, 'key'); f.validate(); f.emit(packet);
  expect(session.state.reading.rate).toBe(12);
  f.validate(7, 'Chest not visible'); expect(session.state.reading.ready).toBe(false);
  await session.stop(); f.emit(packet, 2);
  expect(f.track.stop).toHaveBeenCalledOnce(); expect(f.sensor.destroy).toHaveBeenCalledOnce();
  expect(session.state.phase).toBe('idle'); expect(session.state.reading.rate).toBeNull();
});
it('releases a camera permission result that arrives after cancellation', async () => {
  const f = fixture(); let resolve!: (s: MediaStream) => void;
  f.capture.mockImplementation(() => new Promise<MediaStream>(r => { resolve = r; }));
  const session = new BreathingSession(f.create, f.capture, vi.fn());
  const starting = session.start(true, 'key'); await vi.waitFor(() => expect(f.capture).toHaveBeenCalled());
  const stopping = session.stop(); resolve(f.stream); await Promise.all([starting, stopping]);
  expect(f.track.stop).toHaveBeenCalledOnce(); expect(f.sensor.start).not.toHaveBeenCalled(); expect(session.state.phase).toBe('idle');
});
it('cleans up on permission denial and allows retry', async () => {
  const f = fixture(); f.capture.mockRejectedValueOnce(new Error('Permission denied'));
  const session = new BreathingSession(f.create, f.capture, vi.fn()); await session.start(true, 'key');
  await vi.waitFor(() => expect(session.state.phase).toBe('error'));
  expect(f.sensor.destroy).toHaveBeenCalled(); expect(session.state.hint).toBe('Permission denied');
  await session.start(true, 'key'); expect(session.state.phase).toBe('measuring'); await session.stop();
});
it('stops the tracks even when the SDK stop fails', async () => {
  const f = fixture(); vi.mocked(f.sensor.stop).mockRejectedValue(new Error('IPC timeout'));
  const session = new BreathingSession(f.create, f.capture, vi.fn()); await session.start(true, 'key'); await session.stop();
  expect(f.track.stop).toHaveBeenCalledOnce(); expect(f.sensor.destroy).toHaveBeenCalled(); expect(session.state.phase).toBe('error');
});
it('neutralizes a stale signal instead of continuing a synthetic breathing cycle', async () => {
  vi.useFakeTimers(); const f = fixture(), session = new BreathingSession(f.create, f.capture, vi.fn());
  await session.start(true, 'key'); f.validate(); f.emit(packet); expect(session.state.reading.ready).toBe(true);
  vi.advanceTimersByTime(4000); expect(session.state.reading.ready).toBe(false); await session.stop();
});
it('releases the camera on asynchronous SDK failure', async () => {
  const f = fixture(), session = new BreathingSession(f.create, f.capture, vi.fn());
  await session.start(true, 'key'); f.error('Authentication failed');
  await vi.waitFor(() => expect(session.state.phase).toBe('error'));
  expect(f.track.stop).toHaveBeenCalledOnce(); expect(session.state.hint).toBe('Authentication failed');
});
it('destroys a sensor that finishes creation after cancellation, without acquiring camera', async () => {
  const f = fixture(); let resolve!: (s: typeof f.sensor) => void;
  f.create.mockImplementation(() => new Promise(r => { resolve = r; }));
  const session = new BreathingSession(f.create, f.capture, vi.fn());
  const starting = session.start(true, 'key'), stopping = session.stop();
  resolve(f.sensor); await Promise.all([starting, stopping]);
  expect(f.capture).not.toHaveBeenCalled(); expect(f.sensor.destroy).toHaveBeenCalledOnce();
});
it('releases original tracks when SDK startup rejects', async () => {
  const f = fixture(); vi.mocked(f.sensor.start).mockRejectedValue(new Error('SDK authentication failed'));
  const session = new BreathingSession(f.create, f.capture, vi.fn()); await session.start(true, 'key');
  await vi.waitFor(() => expect(session.state.phase).toBe('error'));
  expect(f.track.stop).toHaveBeenCalledOnce(); expect(f.sensor.destroy).toHaveBeenCalledOnce();
});
it('handles SDK destroy failure without leaving the UI in stopping', async () => {
  const f = fixture(); vi.mocked(f.sensor.destroy).mockImplementation(() => { throw new Error('closed bridge'); });
  const session = new BreathingSession(f.create, f.capture, vi.fn()); await session.start(true, 'key'); await session.stop();
  expect(f.track.stop).toHaveBeenCalledOnce(); expect(session.state.phase).toBe('error');
});
it('serializes repeated stop and error cleanup while startup is still pending', async () => {
  const f = fixture(); let resolve!: () => void;
  vi.mocked(f.sensor.start).mockImplementation(() => new Promise<void>(r => { resolve = r; }));
  const session = new BreathingSession(f.create, f.capture, vi.fn()); const starting = session.start(true, 'key');
  await vi.waitFor(() => expect(f.sensor.start).toHaveBeenCalled());
  const stop1 = session.stop(), stop2 = session.stop();
  f.error('Late error'); expect(session.state.phase).toBe('stopping');
  resolve(); await Promise.all([starting, stop1, stop2]);
  expect(f.sensor.stop).toHaveBeenCalledOnce(); expect(f.sensor.destroy).toHaveBeenCalledOnce(); expect(session.state.phase).toBe('idle');
});
