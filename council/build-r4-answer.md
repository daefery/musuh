# MUSUH running-build council — round 4

**B1’s off-screen toolbar and B11’s missing simulation label are fixed. One blocking OPERASI layout defect remains at short, compact viewports.**

Repository paths below are relative to `./`. **E** means `<review-evidence>/`.

## Version and independent verification

The source and Linux binary changed during review. I inspected the additional changes, captured a separate source/binary snapshot, and repeated the browser suites against that snapshot. This verdict applies to Linux binary SHA-256 **`e294a426033a24d2b82a4e8931dcdc6cfc57e642a21ecea2f353c41df5e141d7`**. All **25 served assets** match the captured files byte-for-byte; the final repository hash recheck passed. Product source was not modified. [E: `snapshot/`, `reviewed-sha256.txt`, `hash-recheck.log`, `served-assets.json`.]

- **Chrome 153.0.8010.52 / Playwright Core.** Re-ran the supplied toolbar suite on an isolated port: **ALL OK**. Independently ran nine actual mouse normal→Presentasi→normal journeys, including **1093 px Latih**, which the supplied eight-case loop omits. My checks also include pause, all three speed buttons, mode/run-state labels, focus retention, and confirmation that presentation actually turns off. [E: `toolbar-supplied.log`, `layout-journeys.mjs/json`.]
- Re-ran the independent **36-state** running/paused, normal/presentation toolbar sweep at 1093, 1200, 1201, 1279, 1280, 1366, 1440, 1600 and 1920 px: **no required-control viewport/hit-test failures**. [E: `regressions.json:frames`.]
- `cargo test -p musuh-engine`: **13 behaviour tests + 1 parity test passed**. Supplied E2E: **72 successful checks and ALL OK at each of 1366×768, 1440×900 and 1920×1080**, with no reported page errors or external requests. [E: `cargo-test.log`, `e2e-{1366,1440,1920}.log`.]
- Opened fresh screenshots of compact presentation, failed short-height operation, the CSS diagnostic, and desktop OT recovery. **Not independently tested:** Windows execution, actual browser zoom, physical projectors/devices, Safari or screen readers.

## Requested dispositions

| Finding | Status | Own evidence |
|---|---|---|
| **B1 — Presentation removes required toolbar tools** | **FIXED** | Actual mouse toggles succeed both ways at 1093/1200/1201/1279/1280/1366/1440 px in Latih 10× and 1093/1920 px in Uji. Required controls remain fully inside the viewport and pass center hit tests before/after the toggles. At 768 px height, the two-row header is **130 px** and OPERASI retains **635 px**. Presentasi retains focus across a subsequent tick. [E: `layout-journeys.json:toolbar`.] |
| **B11 — Compact layout hides LATIHAN · SIMULASI** | **FIXED** | The hiding rule is absent. The complete simulation tag and mode tag remain visible and hit-testable in both modes and scales, including 1093 px. The independent Uji start also reports `simVisible: true`. [E: `layout-journeys.json`, `regressions.json:uji1093`; `web/css/01-gsb.css`.] |

These dispositions concern the two reported toolbar defects; they do not establish that every OPERASI pane remains usable after scaling.

## B12 — Short-height compact layout makes alerts unselectable

**issue (blocking, R13)** — `web/css/03-ops.css:14–18`, interacting with the taller header in `web/css/01-gsb.css`.

### Reproduction

1. Set the CSS viewport to **1200×700**.
2. Start **domain-takeover**, code **MSH-7Q2K**, **Latih 10×**.
3. Wait for three alerts, then click **Presentasi**.
4. Try to click the first alert to select its response actions.

**Result:** The Detail panel covers the alert content. The real locator click times out with **“Detail … intercepts pointer events”**, and `app.selAlert` remains `null`. Reproduced while running and again while paused to exclude clock/DOM churn as the cause. At **1093×614**, the queue track collapses completely. [E: `layout-journeys.json:short`, `short-height-proof.json`, `proof-1200-700-before.png`, `proof-1093-614-before.png`.]

| Presentation viewport | Outer OPERASI height | Queue panel height | Actual alert selection |
|---|---:|---:|---|
| 1200×700 | 567 px | 43.59 px | **Fails: Detail intercepts click** |
| 1093×614 | 481 px | 2 px border; zero-height track | **Fails: Detail intercepts click** |

This is a task failure, not just unfavorable geometry. The supplied **outer `.ops.height > 300` assertion passes in both broken states**.

### Cause and smallest fix

The compact-width rule defines **four grid rows/areas**: brief, queue, detail, log. The later `max-height:700px` rule replaces that with **three row sizes**, leaving the log in an implicit, content-sized fourth row. The log consumes the remaining space and the queue collapses. Presentation and the two-row header expose the failure more strongly.

The height rule predates this round; this is a newly confirmed blocker, not a claim that round 4 introduced that rule. The previous review did not catch the short-height task failure.

**Fix:** Scope the existing three-row height override to the three-column layout:

```css
@media (min-width: 1280px) and (max-height: 700px) {
  .ops { grid-template-rows: auto minmax(0, 1fr) minmax(7rem, 26%); }
}
```

Keep the compact layout’s four explicit tracks. I tested the equivalent narrow-screen override **in the browser only**: alert selection changed from failure to success at both failing sizes; queue height became **164.48 px** and **116.45 px**, respectively. This diagnoses the cause; it is not a shipped fix. [E: `short-height-proof.mjs/json`, `proof-*-diagnostic.png`.]

**Regression acceptance:** At both failing sizes, enter presentation, select an alert, reach its action, open confirmation and cancel without sending a command. Verify internal scrolling for queue/detail/log. Retain the existing toolbar assertions and add height-boundary coverage around 700/701 px; do not substitute an outer-frame measurement for the task.

## Focus and earlier-fix regressions

- **Previously repaired focus paths still pass:** resizing 1920→1093→1920 retains `t-help`; presentation toggles retain `t-present`; the exact Sigma source key **`src-3` and href** survive alert count **3→5**; RAPOR draft text/focus and EVALUASI evidence-button focus survive refresh. Native Enter opens the closed evidence row; the 50-Tab probe reaches evidence buttons **15 times**. [E: `layout-journeys.json:resize/toolbar`, `regressions.json:sourceFocus`, `followup.json`, `evidence-keyboard.json`.]
- **B3 remains fixed:** the real interrupted-SSE/held-old-response probe leaves `stale=true`, `live=false`, incident disabled and **zero actions** until a fresh snapshot arrives. Releasing run A’s response does not replace run B. [E: `reconnect.json`.]
- **Other checked fixes remain intact:** malformed hashes are rejected without panic; final footholds and empty/isolated states render; Enter/Space on Batal execute nothing; Space on Jalankan executes once; save retry creates the displayed file. The E2E suites also pass Uji restrictions, OT refusal/recovery and Origin rejection. [E: `regressions.json`, `followup.json`, E2E logs.]

**issue (non-blocking): Help dismissal loses its opener focus** — `web/js/10-gsb.js:60–73`, `web/js/00-core.js:91–98`.

Focus Help, press Enter, wait 700 ms during a live run, then press Escape. At both **1920×768 normal** and **1093×768 presentation**, the old opener has been detached by a header refresh and focus ends on **BODY**, not Help. This also reproduces without the two-row layout, so it is not evidence of a two-row regression. **Fix:** remember the opener’s stable key and restore focus to its current replacement on dialog `close`. [E: `help-focus.mjs/json`.]

**10x note — non-blocking, proposed:** Use one shared, task-based layout probe across width × height × scale combinations. The new toolbar suite correctly catches off-screen controls, but its outer-frame check misses both demonstrated alert-selection failures. Start by sharing the existing “select alert → confirm → cancel” journey with the layout matrix; measure escaped layout regressions and suite duration. No 10× gain is established.

BLOCKING: 1 issues
