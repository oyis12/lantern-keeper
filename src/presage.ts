import { SmartSpectraSDK, MetricType } from '@smartspectra/node-sdk/renderer';
import { decodeMetrics } from '@smartspectra/node-sdk/messages';
import type { Sensor } from './session';
export async function createPresageSensor(apiKey: string): Promise<Sensor> {
  const sdk = new SmartSpectraSDK({ apiKey, requestedMetrics: [MetricType.CHEST_BREATHING, MetricType.BREATHING_RATE], enableTelemetry: false, enableAccumulatedOutput: false, sendTimeoutMs: 15000 });
  return {
    onMetrics: cb => { sdk.on('metrics', (buf, timestamp) => cb(decodeMetrics(buf), timestamp)); },
    onValidation: cb => { sdk.on('validationStatus', (code, _ts, hint) => cb(code, hint)); },
    onError: cb => { sdk.on('error', (code) => cb(`SmartSpectra error ${code}. Check your API key, connection, credits, and camera; then retry.`)); },
    start: async stream => { sdk.useMediaStream(stream); await sdk.start(); },
    stop: () => sdk.stop(), destroy: () => sdk.destroy(),
  };
}
