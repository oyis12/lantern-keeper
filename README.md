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

If the SDK warns about frame rate, brighten the room and light your face/chest evenly, close other camera/video applications and heavy CPU/GPU work, then retry. Presage needs sustained capture around 25 fps minimum, with 30 fps recommended. The app requests that minimum and shows the selected camera mode, but this number is not a live measurement of frames reaching inference. Error 8 means processing failed; it does not specifically mean the API key is invalid. The error panel preserves low-frame-rate context and redacts the current key from SDK error details.

After an error, **Camera diagnostics** opens automatically and retains the last camera mode, SDK frame callback counts and callback timing rates in memory. Share those lines when reporting a failure. Callback arrival rate and callback timestamp rate are distinct; callback batching and delivery delays can affect them. They are not a completed-inference benchmark or proof of camera capability. Starting a new session clears the previous snapshot; closing the app discards it. No images or breathing readings are retained by this diagnostic feature.

For a lower-load comparison, choose **Capture size → Lower load · 640 × 480** before Start. This reduces the requested image size while retaining the 25 fps minimum and 30 fps target. It uses the real camera and SDK, but smaller images may reduce tracking quality. Check the negotiated mode, callback flow and actual stable breathing readings; this option is an experiment, not a guaranteed hardware-compatibility fix.

If both capture sizes fail, close the desktop app and run `npm run native:compare` from this repository in an interactive terminal. This minimal comparison uses the official SDK's native `useCamera` path without Electron, Pixi or browser frame copying. Type `YES` to consent, choose the same regular RGB webcam (not the IR/Windows Hello camera), then paste your API key at the hidden-input prompt. Keys are not accepted as shell arguments or environment variables. It requests 640×480 at 30 fps, runs up to 60 seconds, and stops/destroys the native session on completion, error or Ctrl+C. No footage, vital-sign values or diagnostic file is saved; SDK telemetry/accumulated output are disabled. Share the callback rates, validation/error codes and final counts, never the key. Check the physical camera indicator goes off afterward. Requested settings and callback rates are not completed-inference benchmarks. A successful native test would implicate the browser integration overhead; another failure still does not by itself prove the laptop is unsupported.

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
