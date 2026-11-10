import { SmartSpectraSDK, MetricType } from '@smartspectra/node-sdk/renderer';
import { decodeMetrics } from '@smartspectra/node-sdk/messages';
import type { Sensor } from './session';
export async function createPresageSensor(apiKey: string): Promise<Sensor> {
  const sdk = new SmartSpectraSDK({ apiKey, requestedMetrics: [MetricType.CHEST_BREATHING, MetricType.BREATHING_RATE], enableTelemetry: false, enableAccumulatedOutput: false, sendTimeoutMs: 15000 });
  let validationCode = 0;
  const safeDetail = (message: string) => message.replaceAll(apiKey, '[redacted]').slice(0, 600);
  return {
    onMetrics: cb => { sdk.on('metrics', (buf, timestamp) => cb(decodeMetrics(buf), timestamp)); },
    onFrame: cb => { sdk.on('frameSentThrough', cb); },
    onValidation: cb => { sdk.on('validationStatus', (code, _ts, hint) => { validationCode = code; cb(code, safeDetail(hint)); }); },
    onError: cb => { sdk.on('error', (code, message) => {
      if (code === 8) {
        const advice = validationCode === 11
          ? 'The SDK reported a low frame rate before processing stopped. Improve lighting, close camera/video apps and other heavy apps, then retry. A sustained 25–30 fps is needed.'
          : 'The breathing processing pipeline stopped. Check camera framing, lighting and device load, then retry.';
        cb(`SmartSpectra processing failed (error 8). ${advice}${message ? ` SDK detail: ${safeDetail(message)}` : ''}`);
      } else {
        const advice: Record<number, string> = { 2: 'Authentication failed. Check your Presage API key.', 4: 'Presage credits are exhausted. Check your developer account.', 5: 'Network error. Check your connection.', 7: 'Camera input is unavailable. Close other camera apps and reconnect the camera.' };
        cb(`SmartSpectra error ${code}. ${advice[code] ?? 'The SDK session failed. Stop and retry, or restart the app.'}`);
      }
    }); },
    start: async stream => { sdk.useMediaStream(stream); await sdk.start(); },
    stop: () => sdk.stop(), destroy: () => sdk.destroy(),
  };
}
