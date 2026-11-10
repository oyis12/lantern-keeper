# The Lantern Keeper

For the Presage SmartSpectra SDK Challenge. Submission deadline supplied by the owner: **November 22, 2026, 11:59 PM PST** (November 23, 07:59 UTC / 08:59 Africa/Lagos).

A polished, story-driven desktop experience in Bramblewick, a coastal village. Real camera-measured breathing tends lantern light, scenery and ambient sound. The experience offers belonging and quiet attention without scores or a prescribed breathing pace.

## Milestone one

Explicit camera consent and Start → real SDK session → live breathing measurements and signal feedback → one responsive harbor lantern → stop and release the camera. Further chapters, scenery evolution and narrative progression follow reliable hardware verification.

## Technical decisions

- Electron main process hosts Presage's native IPC binding. Sandboxed, context-isolated renderer uses its official preload and renderer SDK.
- Host-owned `getUserMedia` video stream is handed to `useMediaStream`. The app stops original tracks independently of SDK cleanup. There is no microphone access.
- Capture requires a 25 fps minimum with a 30 fps target and at most 1280×720. Selected-mode settings are displayed separately from SDK delivery-quality feedback. The village renders at most 30 fps at 1× resolution to reserve processing headroom. These changes address slow-mode negotiation and contention but do not guarantee sustained inference on every webcam/computer.
- SmartSpectra 3.4.0 installed from npm with its Windows x64 runtime. Request only `CHEST_BREATHING` and `BREATHING_RATE`. Authentication requires an owner-supplied API key and network access.
- React/TypeScript/Vite UI; self-contained PixiJS village illustration; optional synthesized shore ambience using Web Audio. Sound level follows the same confidence-gated artistic mapping as light.
- No application recording, persistence or uploading of frames/measurements. Disable SDK telemetry and accumulated output. API key is entered as a password and retained only within the SDK session, not browser storage.
- Windows x64 is the initial packaging target. Other supported SDK platforms need explicit packaging and hardware QA before claiming app support.

## Verified breathing contract

Inspected 2026-11-09: installed npm package `@smartspectra/node-sdk@3.4.0`, `js/renderer/index.d.ts`, `js/messages/generated.d.ts`, and official docs:

- [Node/Electron overview](https://github.com/Presage-Security/SmartSpectra/blob/main/nodejs/README.md)
- [Metrics guide](https://github.com/Presage-Security/SmartSpectra/blob/main/nodejs/docs/metrics.md)
- [Model limitations](https://smartspectra.presagetech.com/docs/)
- [Breathing model card](https://vandv.presagetech.com/breathing_model_card.html)

Decoded payload: `breathing.rate[]` contains `value` (breaths/min), `confidence` (0–100), `stable`, `timestamp`; `breathing.upperTrace[]` and `lowerTrace[]` contain `value` (arbitrary units), `stable`, `timestamp`. **Trace messages do not have confidence fields** in the installed schema; their stability inherits the breathing-rate verdict. The declarations document stable breathing confidence at least 45. Public overview descriptions of waveform confidence must not be interpreted as a separate trace confidence property.

Rate is a roughly 30-second average; confidence is zero during the initial window. Documented operating range: 5–40 breaths/min, stationary subject and camera, well-lit face/chest; abdominal trace needs waist visibility. Movement, talking and unsuitable clothing can reduce quality. Validation callbacks provide framing/lighting hints independently of rate confidence.

The schema also exposes amplitude, baseline, inhale/exhale ratio and other optional fields. They are not requested or used. No verified instantaneous inhale/exhale event contract is assumed.

## Interaction contract

Gate light response on OK framing, valid rate in range, confidence ≥45, and stable rate/chest measurements. Normalize measured chest values over a bounded 150-packet window. This is an artistic light response, not calibrated lung volume or a clinical phase detector. Invalid/stale (>3 seconds without packets), duplicate/out-of-order and stopped data cannot drive the lantern. No generated sine wave substitutes for measurement. Without reliable signal, the lantern rests dimly.

## Verification policy

Unit/RTL tests use synthetic SDK fixtures and fake MediaStreams. Protobuf round-trip tests use the actual vendor encoder/decoder but synthetic values. Playwright browser tests validate graphics, consent and layout without a webcam. None proves camera acquisition, native inference, real breathing accuracy, physical camera LED release, or waveform polarity. The manual checklist in README must be completed on a permitted desktop with a real camera and valid API key.
