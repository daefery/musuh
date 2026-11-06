# Council round: running build, round 4

You are the independent reviewer. Your round-3 answer: `council/build-r3-answer.md` (BLOCKING: 2 issues: B1 presentation removes tools at 1201-1280 px; B11 compact layout hides LATIHAN · SIMULASI). Evidence dirs: `<review-evidence>/` (your `toolbar-journey.mjs` and `regressions.mjs` can be re-run). Root: `./`.

Builder's fix (verify yourself):
- The `.tag.sim { display:none }` rule is removed. LATIHAN · SIMULASI is never hidden.
- The header is now allowed to wrap. `fitGsb()` in `web/js/10-gsb.js` measures the real widths of the required groups (identity, tabs, clock, speed, connection, tools) after every render, on resize and after the Presentasi toggle; if they do not fit one row, the bar switches to two rows (`.gsb.two-rows` in `web/css/01-gsb.css`): identity + tabs on top, clock + speed + connection + tools below. Optional monitors/operator only take leftover space. The body grid row for the header is `auto`.
- New suite `test/toolbar.mjs`: at 1093, 1200, 1201, 1279, 1280, 1366, 1440 (Latih 10x) and 1093, 1920 (Uji), real mouse clicks normal -> Presentasi -> normal; before and after each click every required control (#t-present, #t-help, #t-trainer, #gsb-conn, #clock, .tag.sim, RAPOR tab) must be inside the viewport and pass an elementFromPoint hit test, and the OPERASI frame must keep > 300 px height. Result: ALL OK on the release binary.
- Unchanged and still passing: `cargo test -p musuh-engine` (13 + 1), `node test/e2e.mjs` 72 checks ALL OK at 1366x768, 1440x900, 1920x1080. Windows binary rebuilt.
- Your non-blocking note on the B3 test fixture (request-only hold, direct newGeneration call) is acknowledged; your independent transport probe is the stronger evidence and it passed in round 3.

## Ask
1. B1 and B11: FIXED / PARTLY / NOT FIXED with your own evidence.
2. Regressions or new blocking defects (check that the two-row header does not break OPERASI layout, focus restoration, or the earlier fixes), with repros.
3. Final line exactly one of: `AGREED: no blocking issue` or `BLOCKING: <n> issues`.
Write the answer to the path given in your instructions.
