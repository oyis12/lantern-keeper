export type FrameFlowSnapshot = { callbacks: number; through: number; skipped: number; arrivalFps: number | null; timestampFps: number | null };
export const emptyFlow: FrameFlowSnapshot = { callbacks: 0, through: 0, skipped: 0, arrivalFps: null, timestampFps: null };
// In-memory timing/counts only. A callback is not proof of completed inference.
export class FrameFlow {
  private samples: { at: number; timestamp: number }[] = [];
  private through = 0;
  private skipped = 0;
  add(sent: boolean, timestamp: number, at: number) {
    sent ? this.through++ : this.skipped++;
    if (!Number.isFinite(at) || !Number.isFinite(timestamp)) return;
    this.samples.push({ at, timestamp });
    this.samples = this.samples.filter(s => s.at >= at - 5000).slice(-300);
  }
  snapshot(now: number): FrameFlowSnapshot {
    const samples = this.samples.filter(s => s.at >= now - 5000);
    const first = samples[0], last = samples.at(-1);
    const wallMs = first && last ? last.at - first.at : 0;
    const sourceUs = first && last ? last.timestamp - first.timestamp : 0;
    return { callbacks: this.through + this.skipped, through: this.through, skipped: this.skipped,
      arrivalFps: wallMs >= 1000 ? (samples.length - 1) * 1000 / wallMs : null,
      timestampFps: wallMs >= 1000 && sourceUs > 0 ? (samples.length - 1) * 1e6 / sourceUs : null };
  }
}
