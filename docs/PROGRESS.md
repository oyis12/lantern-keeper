# Progress — 2026-11-09

## Update — 2026-11-10: selected 30 fps still fails

- Owner reports selected mode `1280 × 720 · 30.0 fps`, then SDK low-frame-rate feedback and error 8, despite charger connected and battery saver off. Laptop: EliteBook x360 1030 G2, 7th-generation i7, 16 GB RAM, 256 GB storage. No sustained breathing measurement has been verified. Selected camera settings do not establish delivered throughput or hardware incompatibility.
- Inspected installed SDK 3.4.0 renderer: each frame is drawn to an OffscreenCanvas, read as RGBA and structured-cloned through the official bridge to main/native processing. This is a plausible overhead source, not a confirmed root cause.
- Added in-memory frame-flow diagnostics using the documented `frameSentThrough(sent, timestampUs)` event. UI retains selected camera mode, total callbacks, through/skipped counts and recent callback arrival/source-timestamp rates after stop/error; clears at the next session. Rates describe callback timing, not completed inference or a direct camera benchmark. Callback batching/delays and upstream frame loss can affect interpretation. No vendor timestamp history, footage, keys or physiological values are persisted.
- Windows hardware query confirms i7-7600U (2 physical cores, 4 logical processors), Intel HD Graphics 620. This does not establish an SDK compatibility verdict.
- Regression tests cover arrival versus source timing, skipped callbacks, insufficient/stale samples, vendor event forwarding, and failure snapshot retention/late-callback exclusion. Full suite passed 35 tests, then the additional UI-retention test passed with all four App tests (36 tests in total). TypeScript/Vite build, browser check, Windows packaging and packaged startup smoke all passed. Automated checks used synthetic measurements or no capture; no successful real-camera inference is claimed. Next: owner retries the diagnostic build and reports retained callback counts/rates; use those observations to guide a minimal SDK comparison or further capture-path changes instead of declaring the laptop unsupported.

## Update — 2026-11-10: low camera frame rate / error 8

- Owner disabled Smart App Control, launched the app and reported a warning about a camera mode providing approximately 25 fps, followed by processing error 8. This is user-reported real-camera behavior, not successful breathing verification.
- Native binding import now succeeds outside the sandbox and reports SDK 3.4.0. The previous native-loading block is resolved for this check; no camera or credentials were accessed by the agent.
- Official [measurement-quality guidance](https://smartspectra.presagetech.com/docs/measurement-quality/) calls for a sustained camera rate around 25 fps minimum and a 30 fps target. Low light and CPU/GPU contention can lower delivered fps. Error 8 is `kProcessingFailed`, not specifically an authentication failure.
- Camera capture now requests a mandatory minimum of 25 fps with a 30 fps preference, caps resolution at 1280×720, rejects and releases reported sub-25-fps streams, and explains unsupported modes. It never silently drops the minimum or retries denied permission.
- The UI shows selected camera resolution/fps (reported mode, not measured inference throughput). The SDK remains authoritative for live delivery quality. Pixi rendering is limited to 30 fps at 1× resolution to leave more inference headroom.
- Processing-error feedback retains low-frame-rate context and includes bounded SDK details with the current API key redacted. Authentication, credits, network and unavailable-camera errors have distinct guidance.
- Synthetic regression tests cover capture constraints, slow-mode release, unsupported mode, permission denial, and processing-error context/key redaction. **31 unit/component tests pass**, TypeScript/Vite build passes, browser regression passes, Windows packaging passes, and packaged startup smoke passes. Browser/desktop smoke checks did not request camera access. Native binding load was verified separately without credentials or capture.
- Real-camera recovery and sustained breathing measurement still require the owner to retry with good lighting and other camera/heavy applications closed. A strict requested frame rate does not guarantee sustained frame delivery.

## Starting environment

Workspace was empty and not a Git checkout. Cloned the owner's empty `https://github.com/oyis12/lantern-keeper.git` repository. Windows x64 (builder reports 10.0.26200), Node 24.18.0, npm 12.0.2, Git 2.55.0; GitHub CLI and CMake unavailable. No `SMARTSPECTRA*` credential environment variable was present. No real camera was requested during development checks.

## Implemented

- Electron main process, official SmartSpectra IPC/preload/renderer integration, context isolation, sandbox, navigation restrictions and video-only application-origin permission policy.
- Explicit per-session camera consent and deliberate Start. Host-owned video stream, framing preview, live breathing rate/confidence, SDK validation hints, visible lifecycle and error status.
- A PixiJS coastal village and one lantern whose brightness follows confidence-gated measured chest movement. No simulated production fallback, inhale/exhale labels or rate-driven synthetic oscillator.
- Bounded waveform normalization; rejects invalid, duplicate, out-of-order, unstable and stale packets; clears the light response on bad framing and stop.
- Stop/error/unmount/disconnection track release, cancellation of late permission results, serialized stop/cleanup and session generation guards.
- Optional local Web Audio shore ambience and reduced-motion control. No microphone access, app recording, credential persistence or SDK aggregate telemetry.
- Friendly native-runtime-unavailable state: camera access remains disabled if OS policy or installation prevents loading.
- Vitest/RTL tests, browser and packaged Electron Playwright checks, Windows electron-builder configuration, npm lockfile and GitHub Actions checks.
- `AGENTS.md`, `docs/PROJECT_BRIEF.md`, README setup and manual webcam checklist.

## Verified checks

- **26 Vitest/RTL tests pass** across six files. Sensor/MediaStream fixtures and readings are synthetic. Includes the real vendor protobuf codec with synthetic data and an adapter contract test with a mocked SDK class.
- **Production TypeScript/Vite build passes.** Pixi's static `pixi.js/unsafe-eval` module is required for strict CSP; the name is counterintuitive, but the module replaces dynamic uniform code generation. CSP does not allow unsafe script evaluation.
- **Browser Playwright test passes.** Checks actual rendered canvas, consent gating, no premature camera request, no page/console errors; screenshot visually inspected at 1440px desktop width. Uses software graphics, not hardware GPU or camera inference.
- **Windows unpacked packaging passes.** Runtime closure includes `resources/smartspectra/smartspectra_capi.dll`. Koffi is unpacked from ASAR. Output is separate from Vite's `dist` under `release/win-unpacked`. Native platform packages are excluded from ASAR and the Windows closure is copied once as an external resource. Unsigned development build; default Electron application icon remains.
- **Packaged Electron startup smoke test passes.** It launches the actual unsigned executable, connects through browser CDP, verifies the canvas/status/preload bridge, and closes without requesting camera access. The app visibly reports SDK unavailable on this host. This verifies graceful startup, not native inference. The experimental Playwright Electron inspector attachment initially timed out; direct browser CDP worked and is now used by the test.

## Known blockers and limitations

- **Real webcam verification: NOT RUN.** No API key was available. Direct native import also fails with `Failed to load shared library: An Application Control policy has blocked this file`, both inside and outside the sandbox. Do not interpret mocked/codec/browser tests or a successful package build as proof of native inference or physical camera release.
- `npm run setup:desktop` (Electron 45's `install-electron`) also hits Windows Application Control on `@electron-internal/extract-zip/index.win32-x64-msvc.node`. Its top-level error misleadingly says a native binding is missing; inspecting the nested cause confirmed the policy denial. No policy bypass attempted. electron-builder's normal package extraction succeeded.
- Online `npm audit` reports **six moderate development/build dependency advisories**, rooted in minimatch through electron-builder. Initial production-only dependency install reported zero. The proposed audit auto-fix downgrades electron-builder across a major version, so no blind `--force` change was made. An offline lockfile refresh printed zero advisories because no live audit was available; it does not supersede the online report.
- No signed installer, installer execution or real-device accuracy testing yet. Only Windows x64 packaging is configured. No claim of CI success until the pushed workflow is observed.

## Next steps

1. Run on a Windows desktop whose application policy permits the native dependencies; supply a valid Presage key locally in the app.
2. Complete README's real-webcam acceptance checklist. Record OS/camera, actual signal warm-up, feedback behavior, measured waveform response, retry and physical camera indicator release; keep credentials and footage private.
3. Resolve any hardware findings before calling milestone one accepted. Confirm waveform polarity empirically before adding any inhale/exhale-specific narrative.
4. Review build dependency audit remediation, add an application icon, decide signing/distribution, and test installer startup and camera release.
5. After reliable sensing: expand scenery reactions, story progression and ambient sound design toward the November 22 submission.

## Publication and packaged startup

All local checks above are complete. Implementation commit `bbb6a3b` was pushed successfully to `origin/main` in `oyis12/lantern-keeper`. This follow-up record preserves the observed publication and test results. CI is configured but no remote run result has been observed yet. The milestone still requires the real-webcam acceptance checklist before it can be considered accepted.
