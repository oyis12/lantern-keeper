import type { Metrics } from '@smartspectra/node-sdk/messages';
export type Packet = NonNullable<ConstructorParameters<typeof Metrics>[0]>;
type Sample = NonNullable<NonNullable<Packet['breathing']>['rate']>[number];
export type Reading = { rate: number | null; confidence: number | null; trace: number | null; glow: number; ready: boolean };
export const neutral: Reading = { rate: null, confidence: null, trace: null, glow: 0.15, ready: false };
const valid = (s?: Sample) => s && Number.isFinite(s.value) && Number.isFinite(s.confidence) && s.confidence! >= 0 && s.confidence! <= 100;
// An artistic mapping of arbitrary-unit chest displacement, never a breath phase detector.
export class SignalMapper {
  private values: number[] = [];
  private lastTimestamp = -Infinity;
  reset() { this.values = []; this.lastTimestamp = -Infinity; }
  read(packet: Packet, timestamp: number, framingOk: boolean): Reading | null {
    if (!Number.isFinite(timestamp) || timestamp <= this.lastTimestamp) return null;
    this.lastTimestamp = timestamp;
    const rate = packet.breathing?.rate?.at(-1);
    const trace = packet.breathing?.upperTrace?.at(-1);
    const rateOk = valid(rate) && rate!.value! >= 5 && rate!.value! <= 40;
    const traceOk = trace && Number.isFinite(trace.value);
    const ready = !!(framingOk && rateOk && traceOk && rate!.stable && trace!.stable && rate!.confidence! >= 45);
    if (!ready) { this.values = []; return { ...neutral, confidence: rateOk ? rate!.confidence! : null }; }
    this.values.push(trace!.value!);
    if (this.values.length > 150) this.values.shift();
    const low = Math.min(...this.values), high = Math.max(...this.values);
    const normalized = high - low > 0.000001 ? (trace!.value! - low) / (high - low) : 0.5;
    return { rate: rate!.value!, confidence: rate!.confidence!, trace: trace!.value!, glow: 0.3 + normalized * 0.7, ready: true };
  }
}
