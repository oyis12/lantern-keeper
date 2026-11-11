# Draft Presage support inquiry — not sent

Subject: SmartSpectra Node SDK 3.4.0 on Windows: low native camera callback rate and no breathing metrics

We are building The Lantern Keeper for the SDK Challenge and need help determining whether this is camera/driver behavior, native processing capacity, a configuration issue, or an SDK issue.

## Environment

- HP EliteBook x360 1030 G2; Intel i7-7600U (2 cores / 4 logical processors), Intel HD Graphics 620; owner reports 16 GB RAM.
- Windows x64; earlier builder identified OS build 10.0.26200. Node 24.18.0; `@smartspectra/node-sdk` and Windows x64 native runtime 3.4.0.
- Camera discovered by SDK: HP HD Camera. Camera driver version has not been established.
- Smart App Control initially blocked native loading. Owner disabled it; native import/discovery now succeed. Successful native runs below no longer reported authentication errors.
- API keys are entered locally and omitted from this report. No participant footage or vital-sign values were recorded.

## Reproduction

Repository: https://github.com/oyis12/lantern-keeper

Close Electron and other camera apps. Run `node .\scripts\native-compare.cjs` in an interactive terminal. Consent, select HP HD Camera, enter key at the hidden prompt. Harness uses native `useCamera(CameraSelection.byId(id), { width: 640, height: 480, fps: 30 })`, requests CHEST_BREATHING and BREATHING_RATE, disables telemetry and accumulated output, and stops/destroys after 60 seconds. No Electron, preview, Pixi or browser frame copying is active in this harness.

## Owner-reported real-camera observations

| Run | Recent native callback arrival rates | Total callbacks | Through / skipped | Metric / stable packets |
| --- | --- | --- | --- | --- |
| November 10 | Mostly 16.6/s; some 21.8/s and 24.5/s intervals | 1061 | 1061 / 0 | 0 / 0 |
| November 11 | Mostly 9.8–10.2/s; initially 8.8/s | 593 | 593 / 0 | 0 / 0 |

Both runs completed the harness timer, not a validated measurement. SDK reported low-frame-rate code 11. Framing warnings 7 (chest not visible) and 15 (face too high) also occurred; the first run included code 5 (insufficient light). Environmental/framing conditions were not objectively controlled, so these are not formal hardware benchmarks. Callback arrival counts measure events received by Node, not raw camera frames or completed inference. Zero skipped callbacks does not exclude upstream drops.

In the Electron path, browser settings reported 1280×720 at 30 fps while SDK callback arrival/source-timestamp rates were ~16.7/16.5. At 640×480 the rates improved to ~19.9/20.0, but processing failed with error 8 after low-frame-rate feedback. Native-only runs reproduced low frame flow without that UI/copying path.

## Questions

1. Is 640×480 at requested 30 fps a supported configuration for these breathing metrics on Windows SDK 3.4.0? What framing/resolution constraints should we use?
2. What exactly does `frameSentThrough(sent, timestampUs)` measure for native camera input? Can upstream drops or native backpressure occur without `sent=false` callbacks?
3. How can we inspect actual negotiated native camera mode, raw capture fps, capture backend and processing latency without recording footage or vitals?
4. Are there known Windows camera-backend/driver issues or relevant SDK fixes, and what CPU/runtime performance requirements apply to this hardware?
5. Which additional privacy-preserving diagnostics would distinguish exposure/capture limitations from native processing throughput?

Official guidance consulted: https://smartspectra.presagetech.com/docs/nodejs/ and https://smartspectra.presagetech.com/docs/measurement-quality/
