# The Lantern Keeper

A quiet coastal village where camera-measured breathing tends a lantern. Built for the Presage SmartSpectra SDK Challenge, due November 22, 2026 at 11:59 PM PST.

## Run on Windows x64

Requires Node 24, a graphics-capable desktop, webcam, and a [Presage API key](https://physiology.presagetech.com/auth/login).

```powershell
npm ci
npm run setup:desktop
npm run dev
```

Enter your API key in the app, check the camera consent box, then select **Light the lantern**. Keep face and chest visible, sit still and allow at least 30 seconds for confidence. Select **Stop & release camera** to end capture. No keys belong in source code or `.env` files. Sound is off by default.

The native SDK processes video locally; authentication needs internet access. The app does not record frames or measurements. Aggregate SDK telemetry is disabled. This is a wellness experience, not a medical device.

## Checks and builds

```powershell
npm run check
npx playwright install chromium
npm run test:e2e
npm run pack
npm run test:electron
npm run dist
```

Vitest/React Testing Library cover consent, lifecycle races, stream cleanup, SDK failures, protobuf decoding, invalid/stale data and signal mapping. Playwright covers the browser shell and Pixi graphics using a software graphics backend. The packaged Electron smoke test checks startup and the preload bridge without requesting camera access. These use **simulated measurements and camera fixtures**, never proof of real inference. Windows packaging includes the native runtime as an external resource. Builds are unsigned development artifacts. A release requires packaged hardware QA and signing decisions.

## Real webcam acceptance checklist — not yet verified

1. Launch the Electron app on Windows x64 where native DLL loading is allowed. Confirm no camera indicator before consent and Start.
2. Enter a valid key locally. Consent and Start. Confirm preview and physical camera indicator. Confirm real SDK validation messages react to face/chest occlusion and lighting.
3. Remain still for 30–60 seconds. Confirm real rate, confidence, stable status and lantern response to the measured chest waveform; do not infer inhale/exhale polarity yet.
4. Move out of frame; confirm responsive light stops and an actionable hint appears. Return; verify recovery.
5. Stop. Confirm preview disappears and physical indicator goes off. Verify another camera app can acquire the device. Repeat Start/Stop and close the app during capture.
6. Test denied permissions, busy/disconnected camera, invalid key, network loss and a canceled start. Confirm tracks release and retry behavior is understandable.
7. Repeat with the packaged app. Record OS/camera, app/SDK versions, observed timings and results in `docs/PROGRESS.md` without saving participant footage or credentials.

See [project brief](docs/PROJECT_BRIEF.md), [progress](docs/PROGRESS.md), and [development instructions](AGENTS.md).

On this development machine, Windows Application Control blocks native SmartSpectra loading and Electron's native ZIP extractor. The app displays an SDK-unavailable message when the SDK cannot load. Verify on a desktop whose application policy permits these dependencies; no policy bypass is included.
