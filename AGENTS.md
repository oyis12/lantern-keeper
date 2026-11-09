# The Lantern Keeper — development instructions

Read `docs/PROJECT_BRIEF.md` and `docs/PROGRESS.md` before changing the project. Update PROGRESS with verified outcomes and remaining blockers before ending a development chat.

- First milestone: explicit camera consent → actual SmartSpectra SDK session → measured breathing and signal status → one responsive lantern → Stop releases camera.
- Use Electron + React + TypeScript + Vite, PixiJS, Web Audio, Vitest/RTL, Playwright, electron-builder and GitHub Actions. Current desktop packaging target is Windows x64.
- Verify SDK contracts against the installed `@smartspectra/node-sdk` declarations and official Presage sources. Never assume respiratory rate determines instantaneous inhale/exhale. Chest traces are arbitrary-unit measurements with `stable`, not their own confidence field in 3.4.0.
- Camera access must follow an explicit consent checkbox and deliberate Start click. Never request audio. Stop tracks immediately on stop/error/unmount, including late permission results. Ignore late callbacks from retired sessions.
- Keep API keys in memory only; never log, commit, persist, or put keys in Vite environment variables. Disable SDK aggregate telemetry and accumulated metrics. Do not store camera frames or readings.
- Do not add a simulation fallback to production. Label fixtures, synthetic browser tests and actual webcam observations separately.
- Write meaningful tests with each functional feature. Run `npm run check` and `npm run test:e2e`. Validate native loading and packaged startup when the environment permits; record blockers accurately.
- Maintain keyboard access, readable status, optional sound and reduced motion. Avoid performance scores, forced breathing targets and medical claims.
- Do not overwrite unrelated work. Commit and push authorized changes to the provided origin. Do not claim a push, hardware verification or CI run succeeded without evidence.
