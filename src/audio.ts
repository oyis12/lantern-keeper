// Optional, quiet synthesized shore ambience; no microphone or remote audio assets.
export class HarborAudio {
  private context: AudioContext | null = null;
  private gain: GainNode | null = null;
  async start() {
    if (this.context) return;
    const context = new AudioContext(); this.context = context;
    const gain = context.createGain(); gain.gain.value = 0.018; gain.connect(context.destination); this.gain = gain;
    const buffer = context.createBuffer(1, context.sampleRate * 4, context.sampleRate);
    const samples = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < samples.length; i++) { last = (last + (Math.random() * 2 - 1) * 0.02) / 1.02; samples[i] = last * 3; }
    const source = context.createBufferSource(); source.buffer = buffer; source.loop = true;
    const filter = context.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 600;
    source.connect(filter); filter.connect(gain); source.start();
    await context.resume();
  }
  respond(glow: number) { if (this.context && this.gain) this.gain.gain.setTargetAtTime(0.012 + glow * 0.014, this.context.currentTime, 0.5); }
  async stop() { const context = this.context; this.context = null; this.gain = null; await context?.close(); }
}
