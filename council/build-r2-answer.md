# MUSUH running-build council — round 2

Four findings are fixed. Five are partly fixed, and one additional keyboard-command defect is reproduced. **Six blocking findings remain: B1, B2, B3, B6, B7 and B10.**

## Independent verification

Paths below are relative to `./`. **E** means `<review-evidence>/`.

- Read the adopted R1–R16 contract, both build briefs, the previous review, and the relevant Rust, JavaScript, CSS and test implementations.
- Ran `cargo test -p musuh-engine`: **13 tests passed**, not 14—12 behaviour tests and one parity test. [E: `cargo-test.log`.]
- Re-ran the supplied E2E suite against the release binary at **1366×768, 1440×900 and 1920×1080**: **56 successful checks and ALL OK at each size**. [E: `e2e-{1366,1440,1920}.log`.]
- Re-ran the three round-1 probes in a separate evidence directory. Updated the edge probe to observe rejection rather than wait indefinitely for an incorrectly accepted action, and to target the new evidence button. Added independent delayed-response, keyboard, malformed-file and save-retry probes. Scripts and JSON results are in E.
- Used **Chrome 153.0.8010.52 / Playwright Core**. Opened fresh screenshots myself, including normal/enlarged operations, trainer, evaluation and save failure. Also tested 1279×768 and 1093×614 CSS viewports. The main probe recorded zero page errors and external requests, with external requests blocked.
- Release Linux binary SHA-256: `c022e3ba7a27316b141e142a6c4c691617330f7e610c5e1094e650527f74b843`. Reviewed source/binary hashes remained unchanged at the final recheck. [E: `reviewed-sha256.txt`, `hash-recheck.log`.]
- **Not independently tested:** native Windows execution, physical projector legibility, screen readers, Safari or real users. Reduced CSS viewport testing is not a real browser-zoom test. The reported Windows journey remains builder-supplied evidence.

## B1–B9 disposition

| Finding | Status | Own evidence |
|---|---|---|
| **B1 — Scaling/layout** | **PARTLY** | Alert title/meta/clock now measure **16/13/28 px**, enlarged to **19.52/15.86/34.16 px**. However, normal-scale GSB tools remain off screen at supported laptop sizes. Details below. [E: `probe.json`, `followup.json:toolbar`.] |
| **B2 — Focus/forms/evidence** | **PARTLY** | Asset and confirmation focus survive ticks; paced Uji navigation improves; setup draft “Nama sementara” survives. Report citations work with Enter. But debrief buttons cannot receive focus, source-link focus disappears on arrivals, and the first report refresh still removes textarea focus. [E: `keyboard.json`, `edge-probe.json`, `followup.json`, `evidence-keyboard.json`.] |
| **B3 — Freshness/order** | **PARTLY** | Original post-reconnect held-request case now remains stale and sends no action. Requests are serialized; tick snapshots advance **t=47/seq=51 → t=50/seq=54**. But a pre-disconnection response unlocks the console after reconnect, and an old run's response replaces a newly started run. [E: `probe.json:sequence/reorder`, `edge-probe.json`, `reconnect.json`.] |
| **B4 — Origin** | **FIXED** | External Origin, `localhost:9999` and `127.0.0.1:9999` all return **403**; the exact console Origin returns **200**. `main.rs:same_origin` compares complete allowed strings, including port. [E: `probe.json:foreign`.] |
| **B5 — Persistence** | **FIXED** | A regular file named `rapor` produces an explicit save error and retry button, not a saved claim. Removing that fixture and clicking **Coba simpan lagi** creates the report; the displayed absolute path exists. Normal saves also show their actual working-directory path. [E: `edge-probe.json:saveFailure`, `followup.json:retry`, `save-failure.png`.] |
| **B6 — Record validation** | **PARTLY** | Original unknown-action, impossible-Uji and altered-verification-code repros now fail. Independently rehashed bad-IP, duplicate-action, reversed-time and out-of-bound-handover records also fail, with their derived verification codes updated. However, malformed hash strings now panic the verifier. [E: `probe.json:verify`, `followup.json:mutations/badHashes`.] |
| **B7 — Trainer/debrief truth** | **PARTLY** | Trainer moves are wired through `movesHtml`; EVALUASI renders phases, moves and an expandable thought history. Opened the disclosure and counted **9 thoughts**. EVALUASI still does not expose current footholds, required by R7. [E: `followup.json:truth`, `evidence-keyboard.json:thoughts`, `eval-truth.png`.] |
| **B8 — Live speed/connection** | **FIXED** | The live GSB has 1×/4×/10× controls; clicking 1× changes the running session. Uji still has no pause control and rejects pause server-side. GSB connection labels are implemented. Their freshness correctness remains B3, and toolbar fit remains B1—not separate B8 defects. [E: E2E logs; `10-gsb.js:37–49`, `00-core.js:57–65`.] |
| **B9 — Pinned Sigma links** | **FIXED** | Independently enumerated queue, lesson and report anchors: **5, 10 and 9** in the follow-up run. Every URL uses the full pinned commit and a `rules/` path. These are rendered anchors, not just source constants. External destinations were not fetched. [E: `followup.json:links`.] |

The original early-handover reproduction still yields **35/100, NO-GO**; trainee truth remains absent; OT restart refusal/recovery still passes. Name-only rehashing still verifies, consistent with the already accepted unsigned-record limitation. None of these settled points is reopened. [E: `probe.json`.]

## Remaining blockers

### B1 — Tools disappear at normal laptop scale

**issue (blocking, R13)** — `web/css/01-gsb.css:17–38`.

**Repro:** At 1366×768, start Latih with participant `Sertu Review`, leave Presentasi off, and inspect the GSB without programmatically scrolling it. The presentation button is at **x=1418–1450**, entirely outside the viewport; trainer and help are also outside. At 1440×900, help is still entirely outside, and Presentasi is partly clipped. The 1279 px case also fails. Screenshots show the missing controls; browser hit tests cannot reach their centers at 1366 px. This is a missing mouse-accessible task control, not a cosmetic overflow complaint. [E: `followup.json:toolbar`, `toolbar-1366-false.png`, `frame-1366x768.png`.]

Presentasi itself now scales correctly and fits at 1366 px **once activated**. Playwright's automatic scroll-before-click can reach the initially off-screen toggle and conceal the preceding failure.

**Fix:** Reserve space for the complete tools/connection/speed group; hide or reflow monitors/operator before their combined minimum widths overflow. Assert every required GSB control is on screen **before** clicking, for both scale states and representative participant labels. Do not shrink the corrected task typography.

### B2 — Debrief is still not keyboard-operable; some refreshes still steal focus

**issue (blocking, R9)** — `web/css/07-eval.css:21`; `web/js/00-core.js:82–88,97–101`; alert anchor in `30-ops.js:90`.

**Debrief repro:** Finish a run, enter EVALUASI, focus the first enabled `.lane button.open`, then press Enter. The button reports `tabIndex=0`, but computed **`display: contents`** means focus stays on the previous control in this Chrome build. **50 Tab presses reached zero evidence buttons; Enter opened zero rows.** Mouse activation opens the row. A browser-only diagnostic replacing `display: contents` with a grid made the same button focusable and Enter opened it. No product files were changed. [E: `evidence-keyboard.json`.]

**Remaining focus repros:** Focus a Sigma source anchor in the queue and let another alert arrive: focus becomes **BODY**. Those anchors lack the key/id that `patch()` needs. Enter RAPOR during a paused live run, focus/type in `#r-text`, then perform one ordinary `refresh()`: the text survives, but focus becomes **BODY**. The entry path short-circuits `renderRapor.needs()`, leaving its render key uninitialized until the next refresh. [E: `followup.json:sourceFocus/raporEntry`.]

**Fix:** Make the evidence button a real rendered grid box spanning the row; retain the nested evidence outside it. Key focusable source anchors. Update screen render keys on entry as well as refresh, so the next unchanged snapshot does not rebuild the form. Test actual active-element identity and a **closed→open** disclosure transition.

### B3 — An old response can still authorize interaction with stale or wrong-run state

**issue (blocking, R12)** — `web/js/00-core.js:33–53`; direct start-response assignment in `20-setup.js:startExercise`.

Two real HTTP-response reproductions:

1. Pause at **t=3, seq=5**. Capture but hold a snapshot response, then sever SSE. Resume the server and allow SSE to reconnect while holding new snapshots. Release the **pre-loss** response. The UI becomes **`live=true`, `stale=false`, “Tersambung”**, displaying the old paused t=3 state; the engine is actually running at **t=18, seq=21**. Press N→Enter: the server records an incident at **t=18**, before any post-reconnect snapshot has arrived.
2. Hold a snapshot from domain run A. Through SIAPKAN, start power run B; its start response correctly updates the UI. Release A's old response. The UI returns to **domain run A and `live=true`**, while `/api/state` still reports power run B. The `runId !== current.runId` branch accepts the obsolete run unconditionally.

[E: `reconnect.mjs`, `reconnect.json`, `reconnect-stale-unlocked.png`, `old-run-rollback.png`. The test proxy maps its own Origin to the upstream console Origin; this isolates freshness testing from the correctly fixed Origin guard.]

**Fix:** Invalidate outstanding snapshots on connection-generation and run-start changes. Only an accepted snapshot requested in the current connection/run generation may clear stale state. Ignore obsolete-run responses even when their IDs differ; keep serialized/coalesced fetching. Add both repros as transport tests, not an inline copy of the comparison expression.

### B6 — Malformed hash input panics instead of returning an invalid-record result

**issue (blocking regression)** — `crates/engine/src/rapor.rs:35–37,108–112,125–126`.

**Repro:** Take a genuine report and set `hash` to `""` or `"a"`. `musuh verify FILE` exits **101** with `end byte index 12 is out of bounds`. A hash containing eleven ASCII characters followed by `é` panics at a UTF-8 boundary. Sending each record to `/api/verify` fails the HTTP request; the server process remains alive. The new structural check calls `verif_code(&r.hash)` on untrusted input even though the computed hash already does not match. [E: `followup.json:badHashes`, `extra-hash-*.json`, `followup-server.err`.]

**Fix:** Validate exactly 64 ASCII hex characters before slicing, or derive the expected verification code from the safely computed digest and reject malformed supplied hashes explicitly. API verification must return a structured rejection; CLI verification must return a controlled invalid/corrupt-file result, never a panic. Test empty, truncated and Unicode hashes, including files encountered by the leaderboard scanner.

### B7 — EVALUASI still lacks the promised foothold state

**issue (blocking contract gap, R7)** — `web/js/40-eval.js:31–36`.

**Repro:** Complete the undefended domain route. The API reports current footholds on **WEB-01, FS-01 and DC-01**. EVALUASI's Kebenaran musuh section shows phases, movement history and thoughts, but no current foothold list or asset-state view. `truthHtml()` never reads `v.assets[].truth`. A historical movement is not the same as a remaining foothold after isolation. This was already part of B7/R7, not a request for a new map. [E: `followup.json:truth`, `eval-truth.png`; R7 in `council/design-r2-rules.md`.]

**Fix:** Add a small labelled current/final foothold list from the supplied asset truth, including an explicit empty state. Keep it in trainer/debrief views, absent from the active trainee projection.

### B10 — Enter on “Batal” executes the pending command

**issue (newly identified blocking defect, R9)** — `web/js/31-keys.js:9–12`.

**Repro:** In a live Latih run, press **N**, then **Tab** from Jalankan to **Batal**, then **Enter**. Verified active element: `confirm-no`. Action history changes from empty to an **incident at t=74**. The document-level Enter handler calls `doPending()` before the focused cancel button can perform its native action. This is newly identified, not claimed to have been introduced by round 2. [E: `followup.json:cancel`.]

**Fix:** Let Enter/Space activate a focused confirmation button normally. Apply the global Enter-to-confirm shortcut only when focus is not on another actionable control; preserve Escape cancellation. Assert N→Tab→Enter leaves the action history unchanged, while Enter on Jalankan adds exactly one action.

## Test interpretation and non-blocking decisions

The supplied suite genuinely returns ALL OK, but two checks overstate their coverage: its keyboard-evidence assertion runs after a mouse-opened row and only checks whether **any** row remains expanded; its ordering assertion executes a copied comparison against an invented object rather than delivering a delayed response. The independent probes above test the actual transitions. [Source: `test/e2e.mjs`, B2/B3 sections.]

**Citation-gate demo sentence: non-blocking.** It remains explicitly labelled “Dibuang oleh gerbang sitasi”. Keeping it for this demo is a reasoned choice; I accept that decision and do not promote the earlier presentation preference into a blocker. Do not describe citation-existence checking as semantic truth verification. [Source: `web/js/50-rapor.js:paper`; E: `save-failure.png`.]

**10x note — non-blocking, proposed:** Extend the prior replay-fixture idea with shared assertions for actual state transitions: focused-control identity, closed→open evidence, and stale→fresh only after an eligible response. This round's 56/56 suite still missed those failures. Start with the captured reconnect fixture and one closed evidence row; measure escaped regressions and suite duration. No 10× gain is established, and this proposal does not add scope to the six fixes.

BLOCKING: 6 issues
