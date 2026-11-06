# Council round: running build of MUSUH (Rust + Astro-style console)

You are an independent reviewer. You reviewed the plan in round 1 (`council/design-r1-answer.md`, verdict REVISE). The builder turned your blockers into rules R1-R16 (`council/design-r2-rules.md`) and built them. Verify independently; do not trust this brief.

Root: `./`
- Engine crate (pure, no IO/clock): `crates/engine/src/*.rs`, data `crates/engine/data/*.json`, tests `crates/engine/tests/*.rs` (`cargo test -p musuh-engine`).
- App (axum, SSE, rust-embed): `crates/app/src/{main,api,session}.rs`.
- Console: `web/index.html`, `web/css/*.css`, `web/js/*.js`.
- Binaries: `target/release/musuh` (Linux), `target/x86_64-pc-windows-gnu/release/musuh.exe` (Windows, cross-built with cargo-zigbuild; the builder ran it on real Windows via PowerShell: start, act, handover, rapor saved, `musuh.exe verify` -> RAPOR SAH).
- Browser journeys: `node test/e2e.mjs <w> <h> target/release/musuh` (passes at 1366x768, 1440x900, 1920x1080). Screenshots: `test/shots/<w>x<h>/*.png`.
- Run it yourself: `cd /tmp && ./target/release/musuh --no-open --port 8300` then open http://127.0.0.1:8300/ in headless Chrome (`/usr/bin/google-chrome`; playwright-core is at `<local>`).

## Ask
1. For each rule R1-R16: MET / PARTLY / NOT MET, with your own evidence (command output, measured value, screenshot path).
2. Re-run your round-1 repros: (A) incident then stop early -> must not be GO; (B) trainee view must not contain enemy ground truth (check `/api/state` JSON and the DOM); (C) edit name/version/grade and recompute the hash -> must fail; (D) refresh mid-run; (E) OT recovery path.
3. The five looks (projector distance, first 10 seconds for a judge, keyboard-only run, colour discipline vs Astro status system, anything that reads as a toy). Give your own answer for each.
4. Any new blocking defect you find, with a repro.
5. Final line exactly one of: `AGREED: no blocking issue` or `BLOCKING: <n> issues`.
Write the answer to the path given in your instructions.
