// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { SignalMapper, type Packet } from './signals';
export const packet = (value = 1, confidence = 80, stable = true): Packet => ({ breathing: { rate: [{ value: 12, confidence, stable }], upperTrace: [{ value, stable }] } });
describe('measured waveform mapping (synthetic SDK fixtures)', () => {
  it('uses chest samples without inventing a trace confidence field', () => {
    const mapper = new SignalMapper();
    expect(mapper.read(packet(1), 1, true)?.ready).toBe(true);
    expect(mapper.read(packet(2), 2, true)?.glow).toBe(1);
    expect(mapper.read(packet(0), 3, true)?.glow).toBe(0.3);
  });
  it.each([0, 44, -1, 101, NaN])('holds neutral for unusable confidence %s', confidence => {
    expect(new SignalMapper().read(packet(1, confidence), 1, true)?.ready).toBe(false);
  });
  it('rejects poor framing, unstable and missing data', () => {
    expect(new SignalMapper().read(packet(), 1, false)?.ready).toBe(false);
    expect(new SignalMapper().read(packet(1, 80, false), 1, true)?.ready).toBe(false);
    expect(new SignalMapper().read({}, 1, true)?.rate).toBeNull();
    expect(new SignalMapper().read(packet(NaN), 1, true)?.ready).toBe(false);
  });
  it('rejects duplicate and out-of-order packets and resets between sessions', () => {
    const mapper = new SignalMapper(); mapper.read(packet(), 10, true);
    expect(mapper.read(packet(), 10, true)).toBeNull();
    expect(mapper.read(packet(), 9, true)).toBeNull();
    mapper.reset(); expect(mapper.read(packet(), 1, true)?.ready).toBe(true);
  });
  it('decodes a real protobuf wire shape using the vendor codec', async () => {
    const { Metrics, decodeMetrics } = await import('@smartspectra/node-sdk/messages');
    const decoded = decodeMetrics(Metrics.encode(packet()).finish());
    expect(new SignalMapper().read(decoded, 1, true)?.rate).toBe(12);
  });
});
