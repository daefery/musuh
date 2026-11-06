# Council round: running build, round 2

You are the independent reviewer. Your previous answer is `./council/build-r1-answer.md` (BLOCKING: 9 issues, B1-B9). Your evidence directory from that round is `<review-evidence>/` (scripts `probe.mjs`, `edge-probe.mjs`, `keyboard.mjs` can be re-run).

Builder's fixes (verify each yourself; do not trust this list):
- B1: root font scaling authoritative; alert title 16 px, meta 13 px, clock 28 px; Presentasi scales ~1.22x; GSB hides monitors/operator when narrow or enlarged so tools stay on screen. `web/css/00-tokens.css`, `01-gsb.css`, `04-queue.css`.
- B2: `patch()` in `web/js/00-core.js` swaps HTML only when changed and restores focus by `data-key`; SIAPKAN, EVALUASI, RAPOR re-render only on entry or relevant change; alert cards focusable with Enter/Space; debrief evidence rows are native buttons; report citations keyboard-operable.
- B3: stale after any stream (re)open until a fresh snapshot arrives; one snapshot request at a time; older seq for the same runId ignored; server seq bumps on every tick batch and mutation; runId per run. `00-core.js`, `crates/app/src/main.rs`, `session.rs`, `api.rs`.
- B4: exact Origin match including port. `main.rs` `same_origin`.
- B5: `save_rapor` returns absolute path or error; UI shows the real path or the failure with "Coba simpan lagi" (`POST /api/save`). `api.rs`, `50-rapor.js`.
- B6: `structure_problem()` (mode/speed, action kinds, time order and bounds, handover bound, verif derived from hash) and replay must accept every recorded action. `crates/engine/src/rapor.rs`; test `verify_rejects_structurally_invalid_records`.
- B7: trainer box and EVALUASI "Kebenaran musuh" show phases, moves (from -> to) and thoughts. `30-ops.js` `movesHtml`, `40-eval.js` `truthHtml`.
- B8: live Latih 1x/4x/10x in the GSB; GSB connection indicator. `10-gsb.js`.
- B9: alert meta, lessons and rapor link to `SIGMA_PIN + path` (commit c68bb91abb1146b8a6a65caf6819b1836d97f09d).
- Non-blocking notes taken: selected scenario no longer uses the green normal symbol.
- Not changed (your non-blocking note): the citation-gate demo sentence still appears in every rapor; builder's position: keep it for the demo, it is labelled as dropped. Tell me if you see it as blocking.

Binaries rebuilt: `target/release/musuh` and Windows `target/x86_64-pc-windows-gnu/release/musuh.exe` (builder ran it on real Windows: Uji run, rapor saved to C:\...\rapor\, `musuh.exe verify` -> RAPOR SAH).
Tests: `cargo test -p musuh-engine` (14), `node test/e2e.mjs <w> <h> target/release/musuh` (56 checks, ALL OK at 1366x768, 1440x900, 1920x1080).

## Ask
1. For B1-B9: FIXED / PARTLY / NOT FIXED with your own evidence (re-run your round-1 repros).
2. Any regression or new blocking defect, with a repro.
3. Final line exactly one of: `AGREED: no blocking issue` or `BLOCKING: <n> issues`.
Write the answer to the path given in your instructions.
