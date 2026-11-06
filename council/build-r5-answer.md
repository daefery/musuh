# MUSUH running-build council — round 5

**B12: FIXED. Help focus: resolved. No regressions or new blocking defects found in the checks below.**

Evidence directory (**E**): `<review-evidence>/`. Repository paths are relative to `./`.

## Version and method

I inspected the source changes and tested an isolated copy of the Linux release binary, SHA-256 **`bb34ae5341ad655adabe22e13d89c954e111952829186ebd78c942e47da19164`**, using **Chrome 153.0.8010.52 / Playwright Core**. All **25 served assets** matched the captured source byte-for-byte. Final repository hash checks passed; the complete `web/` tree still matched the snapshot. Product source was not modified. Supplied toolbar/layout suites used isolated ports and runtime directories to avoid the already-running servers. [E: `snapshot/`, `reviewed-sha256.txt`, `hash-recheck.log`, `web-recheck.log`, `tasks.json:assets`.]

## B12 — FIXED

`web/css/03-ops.css:19–21` now restricts the three-track override to widths **≥1280 px**, and explicitly retains four tracks for compact short-height layouts. The running binary serves these rules. [E: `snapshot/web/css/03-ops.css`, `tasks.json`.]

I reproduced the original setup: **domain-takeover, MSH-7Q2K, Latih 10×, three alerts, Presentasi**. Both formerly failing viewports now allow an **unforced locator click** to select the first alert, reach its action, show confirmation, and click **Batal**. My probe observed **zero `/api/act` requests and zero server-side action-count increase**.

| Presentation viewport | Queue height: R4 → R5 | Detail / log / assets heights in R5 | Task result |
|---|---:|---:|---|
| 1093×614 | 2 → **148.39 px** | 123.67 / 97.59 / 281.81 px | Select → confirm → cancel passes |
| 1200×700 | 43.59 → **195.91 px** | 163.25 / 98.55 / 368.91 px | Select → confirm → cancel passes |

These are panel heights, not available text-area heights. I separately exercised actual mouse-wheel scrolling: at 1093×614 presentation, queue/detail/log scroll offsets advanced from **0 to 232/513/174 px**. Asset scrolling also worked. No CSS diagnostic override was applied. [R4 baseline: `council/build-r4-answer.md`; current proof: E `tasks.mjs/json`.]

- **Supplied task matrix: 16/16 passed**, including its ≥80 px pane assertions. [E: `layout-supplied.log`.]
- **Independent task matrix: 22/22 passed** at 1093×614, 1200×700, 1200×701, 1279×700, 1279×701, 1280×700, 1280×701, 1366×614, 1366×768, 1440×900 and 1920×1080, each normal and presentation. Checks included scrolling, confirmation inside the viewport, dismissal, request monitoring and server-side action counts. [E: `tasks.mjs/json`.]
- Re-ran the previous independent layout probe: **all seven short-height alert selections passed**. [E: `layout-journeys.json:short`.]

I opened fresh confirmation screenshots at **1093×614, 1200×700, 1280×700 and 1920×1080**, all in presentation mode. [E: `task-*-true.png`.]

## Help focus — resolved

`web/js/10-gsb.js:73–75` restores focus to the current `#t-help` on dialog close.

My test waited until the **original opener was actually detached**, then dismissed Help using either **Escape** or **Tutup**. Focus returned to `t-help` and remained there after another 700 ms of live updates: **6/6 cases passed**, covering 1920×768 normal, 1093×768 presentation and 1093×614 presentation. The previous round’s Help reproducer also passed at both original widths. [E: `tasks.json:help`, `help-focus.json`.]

## Regression checks

- Supplied toolbar suite: **ALL OK**. Previous independent toolbar probe: **9/9 normal→presentation→normal journeys passed**, including 1093 px Latih and Uji; required controls remained visible/hit-testable and presentation-button focus survived refresh. [E: `toolbar-supplied.log`, `layout-journeys.json:toolbar`.]
- Supplied E2E: **72 successful checks and ALL OK at each of 1366×768, 1440×900 and 1920×1080**. Covered Uji restrictions, confirmation safeguards, focus retention, report verification, stale-response rejection, OT recovery and Origin rejection; no reported page errors or external requests. [E: `e2e-{1366,1440,1920}.log`.]
- `cargo test -p musuh-engine`: **13 behaviour + 1 parity tests passed**. `cargo clippy --workspace --all-targets -- -D warnings`: **passed**. [E: `cargo-test.log`, `clippy.log`.]

No issues found.

**Not independently tested:** Windows execution, physical projectors/devices, actual browser zoom, Safari or screen readers. The Windows executable’s hash was recorded, not its runtime behavior.

**10x note — non-blocking, proposed:** The new task matrix implements the previous recommendation. Strengthen its cancellation oracle with a `/api/act` request counter: `test/layout.mjs` currently compares UI action counts, whereas my independent probe also checks transport and server state. Start with an assertion of **zero command requests after Batal**; this catches accidental sends even if the UI has not refreshed. No 10× gain is established.

AGREED: no blocking issue
