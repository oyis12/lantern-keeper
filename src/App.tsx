import { useEffect, useRef, useState } from 'react';
import { BreathingSession, initialState, type Sensor } from './session';
import { LanternScene } from './LanternScene';
import { HarborAudio } from './audio';
import { captureCamera } from './camera';
const productionSensor = async (key: string) => (await import('./presage')).createPresageSensor(key);
export function App({ createSensor = productionSensor, capture = captureCamera }: { createSensor?: (key: string) => Promise<Sensor>; capture?: () => Promise<MediaStream> }) {
  const [state, setState] = useState(initialState);
  const [consent, setConsent] = useState(false), [key, setKey] = useState('');
  const [sound, setSound] = useState(false), [reducedMotion, setReducedMotion] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [audioError, setAudioError] = useState('');
  const sdkUnavailable = new URLSearchParams(location.search).get('sdk') === 'unavailable';
  const session = useRef<BreathingSession | null>(null);
  if (!session.current) session.current = new BreathingSession(createSensor, capture, setState);
  const audio = useRef(new HarborAudio());
  const preview = useRef<HTMLVideoElement>(null);
  useEffect(() => { if (preview.current) preview.current.srcObject = state.stream; }, [state.stream]);
  useEffect(() => { audio.current.respond(state.reading.glow); }, [state.reading.glow]);
  useEffect(() => {
    const stop = () => { void session.current?.stop(); void audio.current.stop(); };
    addEventListener('pagehide', stop);
    return () => { removeEventListener('pagehide', stop); stop(); };
  }, []);
  const active = ['starting', 'measuring', 'stopping'].includes(state.phase);
  async function toggleSound() {
    if (sound) { await audio.current.stop(); setSound(false); }
    else try { await audio.current.start(); setSound(true); setAudioError(''); } catch { await audio.current.stop(); setAudioError('Ambient sound is unavailable on this device.'); }
  }
  return <main>
    <header><a className="wordmark" href="#home"><span className="mark">✦</span> THE LANTERN KEEPER</a><span className="chapter">A QUIET PLACE TO RETURN TO</span><span className="edition">PRESAGE · 2026</span></header>
    <section className="intro" id="home"><div><p className="eyebrow">CHAPTER ONE / THE HARBOR</p><h1>A little light.<br/><em>A breath of belonging.</em></h1><p className="lede">The village has gone quiet. At the edge of the sea,<br/>one lantern is waiting for its keeper.</p></div><aside className="story"><span>01 — THE FIRST LIGHT</span><p>“You don’t have to still the ocean.<br/>Just be here, and let the light find you.”</p><small>From the keeper’s journal</small></aside></section>
    <section className="experience" aria-label="The harbor experience">
      <div className="village"><div className="scene-label"><span className="dot"/> BRAMBLEWICK HARBOR <span>AFTER DUSK</span></div><LanternScene glow={state.reading.glow} reducedMotion={reducedMotion}/><div className="scene-caption"><span>{state.reading.ready ? 'Your breathing is tending the light.' : 'Every return begins with a single light.'}</span><span>01 / 01 LANTERN</span></div></div>
      <aside className="panel"><p className="eyebrow">TEND THE LANTERN</p><h2>Settle into the harbor.</h2><p className="muted">Sit comfortably, with your face and chest in view. Breathe naturally. There is no pace to follow.</p>
        <div className="status" role="status"><span className={`dot ${state.reading.ready ? 'live' : ''}`}/>{state.phase === 'idle' ? 'Camera off' : state.phase === 'error' ? 'Session needs attention' : state.phase === 'starting' ? 'Connecting' : state.phase === 'stopping' ? 'Stopping' : state.reading.ready ? 'Live breathing signal' : 'Finding your signal'}</div>
        <div className="metrics"><div><strong>{state.reading.rate === null ? '—' : state.reading.rate.toFixed(1)}</strong><small>BREATHS / MIN</small></div><div><strong>{state.reading.confidence === null ? '—' : `${state.reading.confidence.toFixed(0)}%`}</strong><small>SDK CONFIDENCE</small></div></div>
        <p className="hint">{state.hint}</p>
        <video ref={preview} autoPlay muted playsInline aria-label="Local camera framing preview" hidden={!state.stream}/>
        {state.cameraMode && <details className="privacy" open={state.phase === 'error'}><summary>Camera diagnostics {state.stream ? '(live)' : '(last session)'}</summary><p>Camera mode: {state.cameraMode}</p><p>SDK frame callbacks: {state.flow.callbacks} · through: {state.flow.through} · skipped: {state.flow.skipped}</p><p>Callback arrival rate: {state.flow.arrivalFps?.toFixed(1) ?? 'waiting'} /s<br/>Callback timestamp rate: {state.flow.timestampFps?.toFixed(1) ?? 'waiting'} fps</p><p>Recent callback timing only, not completed inference or a direct camera-speed test. Batching and delays can affect these rates. No images or breathing readings are saved.</p></details>}
        {!active && <><label className="key-label" htmlFor="api-key">Presage API key <span>Kept in memory only</span></label><input id="api-key" type="password" autoComplete="off" spellCheck={false} value={key} onChange={e => setKey(e.target.value)} placeholder="Enter your SmartSpectra key"/><label className="consent"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)}/><span>I consent to camera access to measure my breathing for this session.</span></label></>}
        {sdkUnavailable && <p className="hint" role="alert">The SmartSpectra native runtime could not load. Camera access is disabled. Check Windows application control or the SDK installation, then reopen the app.</p>}
        {!active ? <button className="primary" disabled={sdkUnavailable || !consent || !key.trim()} onClick={() => { void session.current?.start(consent, key); setKey(''); }}>Light the lantern <span>↗</span></button> : <button className="primary" disabled={state.phase === 'stopping'} onClick={() => { void session.current?.stop(); setConsent(false); }}>Stop & release camera <span>□</span></button>}
        <p className="privacy">Video is processed locally by SmartSpectra. This app does not record or upload footage. SDK authentication requires an internet connection. Aggregate SDK telemetry is disabled.</p>
      </aside>
    </section>
    <footer><span>NO SCORE. NO PERFECT BREATH. JUST A MOMENT HERE.</span><div><button className="text-button" aria-pressed={sound} onClick={() => void toggleSound()}>♪ Sound {sound ? 'on' : 'off'}</button><button className="text-button" aria-pressed={reducedMotion} onClick={() => setReducedMotion(!reducedMotion)}>Reduce motion {reducedMotion ? 'on' : 'off'}</button></div></footer>
    {audioError && <p role="alert">{audioError}</p>}
    <p className="wellness">An ambient wellness experience, not a medical device. Lantern brightness follows a measured chest waveform when the SDK reports a stable signal; it does not identify inhale or exhale.</p>
  </main>;
}
