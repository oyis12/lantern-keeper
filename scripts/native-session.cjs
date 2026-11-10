// Minimal native SDK comparison. No Electron, rendering or browser frame copying.
function hasCameraConsent(answer) {
  return typeof answer === 'string' && answer.trim().toUpperCase() === 'YES';
}
async function runNativeComparison({ vendor, consented, apiKey, cameraId, signal, report = console.log, durationMs = 60000 }) {
  if (!consented || !apiKey?.trim() || !cameraId || signal?.aborted) throw new Error('Camera consent, a key, and a camera selection are required.');
  const { SmartSpectraSDK, CameraSelection, MetricType, SmartSpectraLogLevel, decodeMetrics } = vendor;
  const sdk = new SmartSpectraSDK({ apiKey, requestedMetrics: [MetricType.CHEST_BREATHING, MetricType.BREATHING_RATE], enableTelemetry: false, enableAccumulatedOutput: false, logLevel: SmartSpectraLogLevel.kNone });
  const safe = text => String(text).replaceAll(apiKey, '[redacted]').slice(0, 600);
  const summary = { reason: '', callbacks: 0, through: 0, skipped: 0, metricsPackets: 0, stablePackets: 0 };
  let finish, settled = false, lastCode, timer, progress;
  const done = new Promise(resolve => { finish = reason => { if (!settled) { settled = true; summary.reason = reason; resolve(); } }; });
  const abort = () => finish('Stopped by user');
  try {
    sdk.on('frameSentThrough', sent => { if (settled) return; summary.callbacks++; sent ? summary.through++ : summary.skipped++; });
    sdk.on('validationStatus', (code, _ts, hint) => { if (!settled && code !== lastCode) { lastCode = code; report(`Validation ${code}: ${safe(hint)}`); } });
    sdk.on('metrics', bytes => {
      if (settled) return;
      summary.metricsPackets++;
      try {
        const breathing = decodeMetrics(bytes)?.breathing;
        if (breathing?.rate?.at(-1)?.stable && breathing?.upperTrace?.at(-1)?.stable) summary.stablePackets++;
      } catch { report('Metrics decode failed.'); finish('Metrics decode failed'); }
    });
    sdk.on('error', (code, message) => { if (!settled) report(`SDK error ${code}: ${safe(message)}`); finish(`SDK error ${code}`); });
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) abort();
    if (!settled) {
      sdk.useCamera(CameraSelection.byId(cameraId), { width: 640, height: 480, fps: 30 });
      sdk.start();
      report('Native capture requested at 640 × 480 / 30 fps. Requested settings are not a measurement of delivered fps.');
      let lastAt = performance.now(), lastCount = 0;
      progress = setInterval(() => {
        const now = performance.now(), fps = (summary.callbacks - lastCount) * 1000 / (now - lastAt);
        report(`Native callback arrival rate: ${fps.toFixed(1)}/s | through=${summary.through} skipped=${summary.skipped} | metric packets=${summary.metricsPackets} stable packets=${summary.stablePackets}`);
        lastAt = now; lastCount = summary.callbacks;
      }, 5000);
      timer = setTimeout(() => finish('60-second comparison complete'), durationMs);
    }
    await done;
  } catch (error) {
    report(`Native comparison failed: ${safe(error.message || error)}`);
    finish('Startup failed');
  } finally {
    settled = true;
    clearInterval(progress); clearTimeout(timer); signal?.removeEventListener('abort', abort);
    try { await sdk.stopAsync(); } catch { report('SDK stop failed; destroying the session.'); }
    try { await sdk.destroy(); } catch { report('SDK destroy failed. Close this process to ensure camera release.'); summary.reason += ' / cleanup failed'; }
  }
  report(`Result: ${summary.reason}; callbacks=${summary.callbacks}, through=${summary.through}, skipped=${summary.skipped}, metric packets=${summary.metricsPackets}, stable packets=${summary.stablePackets}. No footage or vital-sign values were saved.`);
  return summary;
}
module.exports = { runNativeComparison, hasCameraConsent };
