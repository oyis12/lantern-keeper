import { neutral, SignalMapper, type Packet, type Reading } from './signals';
import { FrameFlow, emptyFlow, type FrameFlowSnapshot } from './frameFlow';
export type State = { phase: 'idle' | 'starting' | 'measuring' | 'stopping' | 'error'; hint: string; reading: Reading; stream: MediaStream | null; cameraMode: string | null; flow: FrameFlowSnapshot };
export type Sensor = {
  onMetrics(cb: (packet: Packet, timestamp: number) => void): void;
  onValidation(cb: (code: number, hint: string) => void): void;
  onError(cb: (message: string) => void): void;
  onFrame(cb: (sent: boolean, timestampUs: number) => void): void;
  start(stream: MediaStream): Promise<void>; stop(): Promise<void>; destroy(): void;
};
export const initialState: State = { phase: 'idle', hint: 'The harbor is waiting.', reading: neutral, stream: null, cameraMode: null, flow: emptyFlow };
export class BreathingSession {
  state: State = initialState;
  private generation = 0;
  private sensor: Sensor | null = null;
  private stream: MediaStream | null = null;
  private mapper = new SignalMapper();
  private framingOk = false;
  private lastReading = 0;
  private timer: ReturnType<typeof setInterval> | undefined;
  private pending: Promise<void> = Promise.resolve();
  private stopping: Promise<void> | null = null;
  private flow = new FrameFlow();
  constructor(private create: (key: string) => Promise<Sensor>, private capture: () => Promise<MediaStream>, private changed: (s: State) => void) {}
  private update(patch: Partial<State>) { this.state = { ...this.state, ...patch }; this.changed(this.state); }
  async start(consented: boolean, key: string) {
    if (!consented || !key.trim() || !['idle', 'error'].includes(this.state.phase)) return;
    const generation = ++this.generation;
    this.mapper.reset(); this.framingOk = false;
    this.flow = new FrameFlow();
    this.update({ phase: 'starting', hint: 'Opening the camera and connecting to SmartSpectra…', reading: neutral, cameraMode: null, flow: emptyFlow });
    this.pending = this.open(key.trim(), generation);
    await this.pending;
  }
  private async open(key: string, generation: number) {
    try {
      const sensor = await this.create(key);
      if (generation !== this.generation) { sensor.destroy(); return; }
      this.sensor = sensor;
      const stream = await this.capture();
      if (generation !== this.generation) { stream.getTracks().forEach(t => t.stop()); return; }
      this.stream = stream;
      const current = () => generation === this.generation;
      sensor.onFrame((sent, timestamp) => { if (current()) this.flow.add(sent, timestamp, performance.now()); });
      stream.getTracks().forEach(t => t.addEventListener('ended', () => { if (current()) void this.fail('Camera disconnected. Reconnect it and try again.'); }));
      sensor.onMetrics((packet, timestamp) => {
        if (!current()) return;
        const reading = this.mapper.read(packet, timestamp, this.framingOk);
        if (!reading) return;
        this.lastReading = Date.now();
        this.update({ reading });
      });
      sensor.onValidation((code, hint) => {
        if (!current()) return;
        this.framingOk = code === 0;
        this.update({ hint: hint || (code === 0 ? 'Hold still. Allow at least 30 seconds for signal confidence.' : `Adjust your position (SDK status ${code}).`), ...(code === 0 ? {} : { reading: neutral }) });
      });
      sensor.onError(message => { if (current()) void this.fail(message); });
      const settings = stream.getVideoTracks?.()[0]?.getSettings?.();
      this.update({ stream, cameraMode: settings ? `${settings.width ?? '?'} × ${settings.height ?? '?'} · ${settings.frameRate?.toFixed(1) ?? '?'} fps` : null });
      await sensor.start(stream);
      if (!current()) return;
      this.lastReading = Date.now();
      this.update({ phase: 'measuring' });
      this.timer = setInterval(() => {
        this.update({ flow: this.flow.snapshot(performance.now()) });
        if (Date.now() - this.lastReading > 3000) this.update({ reading: neutral, hint: 'Waiting for a fresh breathing signal. Keep your face and chest visible.' });
      }, 1000);
    } catch (error) {
      if (generation === this.generation) void this.fail(error instanceof Error ? error.message : 'Unable to start the camera session.');
    }
  }
  private async fail(message: string) { await this.stop(); this.update({ phase: 'error', hint: message }); }
  stop(): Promise<void> {
    if (this.stopping) return this.stopping;
    const stopping = this.shutdown();
    this.stopping = stopping;
    return stopping.finally(() => { if (this.stopping === stopping) this.stopping = null; });
  }
  private async shutdown() {
    ++this.generation;
    clearInterval(this.timer);
    this.update({ phase: 'stopping', reading: neutral, stream: null, hint: 'Releasing the camera…', flow: this.flow.snapshot(performance.now()) });
    this.stream?.getTracks().forEach(t => t.stop()); this.stream = null;
    // A pending permission prompt may resolve after Stop; open() then releases those tracks.
    await this.pending;
    const sensor = this.sensor; this.sensor = null;
    let cleanupError = false;
    try { await sensor?.stop(); } catch { cleanupError = true; }
    finally { try { sensor?.destroy(); } catch { cleanupError = true; } }
    this.mapper.reset();
    this.update({ phase: cleanupError ? 'error' : 'idle', hint: cleanupError ? 'Camera released. SDK cleanup failed; try again or restart the app.' : 'Camera off. Your light can rest here.', reading: neutral });
  }
}
