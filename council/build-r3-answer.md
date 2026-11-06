# MUSUH running-build council — round 3

**Five findings are fixed. B1 remains partly fixed, and the toolbar change introduces one simulation-label regression. Two blockers remain: B1 and B11.**

## Independent verification

Repository paths are relative to `./`. **E** means `<review-evidence>/`.

- Read the round-3 brief, previous answers, adopted R1–R16 contract, and relevant implementation/test files. Product source was not changed.
- Re-ran the previous `reconnect.mjs`, `edge-probe.mjs`, `followup.mjs` and `evidence-keyboard.mjs`, changing only their evidence-directory path. All completed. Added `regressions.mjs` and `toolbar-journey.mjs` for independent boundary/state checks.
- `cargo test -p musuh-engine`: **13 behaviour tests + 1 parity test passed**. `cargo clippy --all-targets -- -D warnings`: **passed**. [E: `cargo-test.log`, `clippy.log`.]
- Re-ran the supplied E2E suite against the release binary at **1366×768, 1440×900 and 1920×1080**: **72 successful checks and ALL OK at each size**, with zero reported page errors/external requests. Copies ran from E, preserving repository screenshots. [E: `e2e-{1366,1440,1920}.log`.]
- Browser: **Chrome 153.0.8010.52 / Playwright Core**. Independently checked normal/presentation and running/paused toolbar states at **1093, 1200, 1201, 1279, 1280, 1366, 1440, 1600 and 1920 px**. Opened fresh operation, presentation, Uji, evaluation and OT screenshots myself.
- Confirmed the binary serves byte-identical copies of the nine reviewed JS/CSS assets. Reviewed binary SHA-256: `fd54f3d1b2ede007c23dfaae27421068b8bb2cdfa409e151234cf3fe80e3457f`. Recorded source/binary hashes remained unchanged at recheck. [E: `regressions.json:servedSources`, `reviewed-sha256.txt`, `hash-recheck.log`.]
- **Not independently tested:** native Windows execution, physical projector legibility, real browser zoom, Safari, screen readers or real users. The Windows run remains builder-supplied evidence.

## Requested dispositions

| Finding | Status | Own evidence |
|---|---|---|
| **B1 — Toolbar/scaling** | **PARTLY** | Normal-scale tools now fit and pass center hit tests at the previously failing 1093/1279/1366/1440 widths. Enlarged type still works. However, clicking Presentasi at 1279 px moves Presentasi and Help completely outside the viewport. The new compact rule also removes the required simulation label; see B11. [E: `followup.json:toolbar`, `toolbar-journey.json`, `regressions.json:frames`.] |
| **B2 — Keyboard/focus** | **FIXED** | Evidence buttons compute to `display:grid`, receive focus, and Enter opens a previously closed row. The 50-Tab probe reached evidence buttons **15 times**, versus zero previously. RAPOR textarea and EVALUASI button focus survive the first unchanged refresh. The exact Sigma source key **`src-3` and href** survive alert count **3→5**; this is stronger than checking only that focus remains on some anchor. [E: `evidence-keyboard.json`, `followup.json:raporEntry/evalEntry`, `regressions.json:sourceFocus`.] |
| **B3 — Stale/obsolete snapshots** | **FIXED** | Re-ran the real proxy interruption with an already-fetched pre-loss response held back. After reconnect and release, UI remained **stale=true, live=false**, incident disabled, with **zero server actions** after N→Enter. Releasing an old domain-run response after starting a power run preserved the new power run ID, matching the server. This verifies the generation guard independently of the supplied test's shortcuts. [E: `reconnect.json`, `edge-probe.json`; `web/js/00-core.js:37–63`, `20-setup.js:startExercise`.] |
| **B6 — Malformed hash** | **FIXED** | Empty, short and Unicode hashes now give **CLI exit 1**, no panic/stderr, and **HTTP 200 / `ok:false`**, with an explicit malformed-hash reason. The leaderboard returns 200 and two valid rows while skipping five malformed fixtures, including a 64-byte Unicode hash and 64 non-hex characters. Guard precedes slicing at `rapor.rs:115–116`. [E: `followup.json:badHashes`, `regressions.json:board`, `cargo-test.log`.] |
| **B7 — Final footholds** | **FIXED** | Undefended debrief names **WEB-01, FS-01 and DC-01**, matching API truth. Isolating WEB-01 before compromise produces the explicit no-foothold state; isolating after compromise additionally renders **“WEB-01 sempat disentuh MUSUH, kini diisolasi”**. Phases, movement history and nine expandable thoughts remain available in the undefended run. [E: `followup.json:truth`, `regressions.json:footholds`, `eval-ground-truth-expanded.png`, `empty-footholds-true.png`.] |
| **B10 — Cancel executes command** | **FIXED** | Original **N→Tab→Enter** focused `confirm-no` and left actions empty. Independent Enter and Space cancellation both leave zero actions; Space on Jalankan adds exactly one incident. Supplied journeys independently pass Enter-on-Jalankan at all three sizes. [E: `followup.json:cancel`, `regressions.json:nativeKeys`, E2E logs; `web/js/31-keys.js:9–14`.] |

## Remaining blockers

### B1 — Presentation still removes mouse-accessible tools

**issue (blocking, R13)** — `web/css/01-gsb.css:37–43`.

**Repro:** At **1279×768**, start Latih at **10×**, code `MSH-7Q2K`, and click the visible Presentasi button. Do not use a subsequent Playwright click that automatically scrolls the target into view.

| Control | Before Presentasi | After Presentasi |
|---|---:|---:|
| Presentasi | x=1203–1235; reachable | **x=1292.72–1331.30; entirely outside** |
| Help | x=1239–1271; reachable | **x=1336.17–1374.75; entirely outside** |

Both post-toggle center hit tests fail; both visible intersections are **0 px**; document horizontal scroll remains **0**. A mouse user cannot reach Help or toggle presentation back off. Native Enter on the still-focused toggle restores normal scale, confirming that the control works but its presentation is inaccessible. [E: `toolbar-journey.json`, `actual-toggle-1279.png`.]

The width sweep also reproduces missing presentation tools at **1201 and 1280 px**. At **1366 px / running 10×**, Help is partially clipped, ending at **1374.75**; its center remains reachable, so that partial clipping alone is not the blocking task failure. [E: `regressions.json:frames`, `actual-toggle-1366.png`.]

**Cause:** Presentation removes optional monitors/operator, but the remaining non-shrinking groups still exceed available width. Compact rules apply only at ≤1200 px, leaving a failing interval above that breakpoint. The supplied fit test runs after switching to **1×** (`test/e2e.mjs:171`), missing the wider 10× clock/state line.

**Fix:** Adapt the required groups themselves when their combined width exceeds the viewport—compact tab spacing or a second header row, while preserving required states and corrected task typography. Test actual normal→presentation→normal mouse journeys at 1201/1279/1280, plus running 10× at 1366, with pre-click visibility/hit assertions.

### B11 — Compact layout hides the simulation identity

**issue (new blocking regression, R11)** — `web/css/01-gsb.css:42`.

**Repro:** At **1093×768**, start **Uji** through SIAPKAN and enter OPERASI. The header shows `MUSUH` and `MODE UJI`, but **no LATIHAN / SIMULASI label**. `.tag.sim` is `display:none`; browser visibility is false. Reproduced at 1093 and 1200 px in normal and presentation scales. [E: `regressions.json:uji1093/frames`, `uji-1093.png`.]

The brief describes the SIMULASI tag as shrinking, but the implementation removes it. R11 explicitly requires the simulation identity to remain visible; `MODE UJI` is not a replacement. This is a missing required state, not a styling preference.

**Fix:** Remove the `.tag.sim { display:none }` rule. Preserve a visible simulation label through compact composition or an additional header row. Assert its actual visibility after starting both Latih and Uji at compact widths, not just on the initial desktop setup screen.

## Regression/test interpretation

The repeated journeys still pass OT refusal/recovery, Uji restrictions, genuine/forged verification, Origin rejection and save-failure reporting. The independent retry probe again creates the report at the displayed absolute path. No additional blocker was reproduced in those checks. [E: E2E logs; `followup.json:retry`.]

**suggestion (non-blocking): finish strengthening the transport test** — `test/e2e.mjs:190–204`. Its route handler holds an **unsent request**, then calls `route.continue()` after the new run starts. It does not retain run A's response body, so the server can simply return run B. The reconnect section also calls `newGeneration()` directly rather than exercising stream callbacks. These are not equivalent to the real delayed-response/reconnect reproductions. B3 nevertheless passes my independent transport probe; this test limitation is not an additional product blocker. The closed→open keyboard-evidence check is genuinely corrected.

**10x note — non-blocking, proposed:** Promote the existing response-capture/proxy fixture into the maintained suite: fetch and hold an actual old response, interrupt SSE, then release it. The mechanism is already in `E/reconnect.mjs`; first replace the request-only B3 fixture with that transport fixture. Measure escaped reconnect regressions and suite duration. No 10× gain is established, and this proposal does not expand the two required UI fixes.

BLOCKING: 2 issues
