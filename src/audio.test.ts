import { it, expect, vi } from 'vitest';
import { HarborAudio } from './audio';
it('creates optional local ambience, modulates it and closes audio resources', async () => {
  const close = vi.fn().mockResolvedValue(undefined), respond = vi.fn(), resume = vi.fn().mockResolvedValue(undefined), start = vi.fn();
  const connect = vi.fn();
  const AudioContextFake = vi.fn(function() { return { sampleRate: 100, currentTime: 1, destination: {}, createGain: () => ({ gain: { value: 0, setTargetAtTime: respond }, connect }), createBuffer: () => ({ getChannelData: () => new Float32Array(400) }), createBufferSource: () => ({ connect, start }), createBiquadFilter: () => ({ frequency: { value: 0 }, connect }), resume, close }; });
  vi.stubGlobal('AudioContext', AudioContextFake);
  const audio = new HarborAudio(); expect(AudioContextFake).not.toHaveBeenCalled();
  await audio.start(); await audio.start(); expect(AudioContextFake).toHaveBeenCalledOnce();
  audio.respond(0.5); expect(respond).toHaveBeenCalledWith(0.019, 1, 0.5);
  await audio.stop(); await audio.stop(); expect(close).toHaveBeenCalledOnce(); expect(start).toHaveBeenCalledOnce();
  vi.unstubAllGlobals();
});
