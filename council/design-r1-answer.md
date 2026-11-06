# MUSUH design council — round 1

The console direction is sound. The plan is not ready to freeze: its graded-exercise contract, keyboard targeting and projector layout need revision. **Preserve the deterministic attacker, not the current scoring defects.**

## Independent verification

Paths below are relative to `../`.

- Read `PROPOSAL.md`, `SOURCES.md`, the HTML, scenario/rule/engine sources, UI implementation, all ten supplied screenshots, Astro licence, tokens and six SVGs. Confirmed the three engine/data source files are embedded verbatim in the HTML.
- Ran `node prototype/test/engine.mjs`: **34 checks passed**. These check local provenance snapshots, not the current external publications.
- Opened the prototype in headless Chrome **153.0.8010.52**, with external HTTP requests blocked, at **1366×768, 1440×900, 1920×1080 and 1093×614**. The last is a reduced-CSS-viewport stress test, not a real browser-zoom test. Inspected fresh screenshots. Exercised proxy→Chisel adaptation, blocking both channels, report verification, score alteration, OT restart rejection/recovery and premature completion. No page errors or external requests occurred. Advanced simulation ticks explicitly; did not measure human response times.
- No new console, Windows binary or physical projector was tested. The audience, distance and competition rubric are supplied requirements, not independently confirmed event facts. Diagnostic outputs and screenshots: `<review-evidence>/`.

## D1–D11 decisions

All requested changes below are **proposed**, not approved product decisions.

| Decision | Verdict | One-line reason |
|---|---|---|
| D1 — Astro | **KEEP** | Local tokens and shapes match the brief; distribute the copyright/licence, retain the downward critical triangle, and distinguish asset state from alert severity rather than treating all six statuses as severity levels. |
| D2 — Frame | **CHANGE** | Keep the persistent shell, but permit pane scrolling and height/zoom-driven collapse; prioritise alert, selected target, mission impact and action over keeping three columns visible. |
| D3 — Actions | **CHANGE** | Keep select-then-act and no typing; bind shortcuts to a stable selected alert/asset, add explicit OT recovery, and prevent typing, focus changes or new alerts from retargeting commands. |
| D4 — Training/testing | **CHANGE** | Keep guided versus graded modes, but lock mode/assistance policy at start, exclude attacker truth from the trainee view, and repair grading before issuing comparable results. |
| D5 — Four screens | **KEEP** | Four stages simplify navigation, provided RAPOR can verify an imported file before any exercise and leaving OPERASI cannot silently reset or finish a run. |
| D6 — Typography | **CHANGE** | Keep locally bundled fonts with their actual licences; “13 px projector-safe” is unproven—provide an enlarged presentation layout and validate legibility at the stated distance. |
| D7 — Colour | **CHANGE** | Keep semantic status colours and blue interaction; explicitly exempt the merah-putih identifier and preserve a distinct visible focus ring instead of forcing every cue into blue. |
| D8 — Motion | **KEEP** | Bounded state-change motion improves on the current infinite arrows/pulse; reduced-motion must remove it without removing persistent status or stealing focus. |
| D9 — Debrief | **KEEP** | Shared-time-axis replay plus objective evidence fits the product; distinguish exercise-event evidence from external provenance and make both readable offline. |
| D10 — Rust | **CHANGE** | Keep one binary and one deterministic core, but specify versioned replay, server-ordered actions, reconnect behaviour and native Windows acceptance tests before promising deployment. |
| D11 — Scope | **KEEP** | No login/database/multiplayer/live attacks is appropriate; trainer mode remains supervised workflow, not an authenticated role, and local files still need safe writes and import validation. |

**D1 licence qualification:** `musuh/design/ASTRO-LICENSE.txt` grants worldwide royalty-free use subject to conditions; US public-domain wording is not the whole Indonesian distribution story. It explicitly disclaims government endorsement. Its text establishes a US-government contract, not the specific Space Force provenance. Do not imply MUSUH is DoD-certified. Retain original Sigma severity alongside a documented display mapping: `low` must not become a green “safe” assertion (`prototype/src/20-rules.js`, S07/S10/S16).

## Five biggest live-demo design risks

### 1. The screen fits, but the task does not
**issue (blocking) — D2/D6.** At 1366×768, the existing block button occupied y=874–916 and reset y=955–997; the document was 1219 px tall. At 1440×900, block was still partly below the viewport. Map secondary labels are 10.5 px and alert titles 13.5 px. These are baseline measurements, not failures of an unbuilt layout.

**Fix:** Define the OPERASI frame by the usable CSS viewport, not monitor resolution. Collapse asset detail into a drawer before shrinking labels; keep the selected action and mission consequence visible. Let setup, debrief and report content scroll. Proposed presentation starting point: 20 px primary task text and 16 px supporting text, subject to actual projector testing—not a guaranteed safe minimum.

### 2. A new alert changes what “1” means
**issue (blocking) — D3.** “Top alert” is a moving target; the current `addAlert()` prepends cards (`prototype/src/52-gladi.js:47–66`). Automatic retargeting can turn a judge’s intended action into a different command.

**Fix:** Numbers address a visibly selected, stable alert ID; arrivals never move selection or focus. Show verb and exact target before execution, with a confirm step for consequential commands and Escape to cancel. Suppress global shortcuts inside inputs, selects, editable content and dialogs; ignore key repeat. Keep mouse equivalents and visible shortcut hints. Define new/acknowledged/resolved states: acknowledgement must not imply containment, and stale recommendations must not remain executable.

### 3. The OT climax has no obvious recovery path
**issue (blocking) — D2/D3/D4.** D3 omits `genset-start`, although O3 explicitly grades recovery. In the browser, the stopped-genset alert offered only **“isolasi PLC-GEN”**; restart was at y=1035–1078 on a 768 px viewport. Blocking writes then restarting worked; restarting first was refused. [Sources: `10-scenarios.js`, SC_POWER/O3; `30-engine.js:241–245`; `52-gladi.js:55`.]

**Fix:** Keep genset running/stopped, outage duration and the **block writes → restart locally** interaction together in the selected OT detail. Preserve the engine’s restart interlock. In Uji, expose available controls and rejection reasons without revealing the answer in advance. Do not relabel the current generic “isolate this alert’s host” chips as validated recommendations.

### 4. The handoff changes exercise conditions without anyone noticing
**issue (blocking) — D2/D4/D5.** “LATIHAN,” Latih/Uji, trainee/trainer, running/paused and simulation speed are different states; the plan does not fully separate them. The current UI defaults to 4× (`50-ui-core.js`, `app.speed`). A hidden ticker alone does not define an exam boundary.

**Fix:** Persistently show simulation label, assessment mode, run state and speed; keep scenario/code/operator available without crowding the primary action. Uji has fixed declared timing rules and no mid-run assistance toggle. Trainer intervention is recorded and either invalidates comparison or follows an explicit assessment policy. Display immediate command acknowledgement and its target. A one-laptop demo may be supervised; do not claim authenticated trainer-only access without login.

### 5. Refresh or a disconnected event stream destroys the demonstration
**issue (blocking plan gap) — D10.** Moving from in-browser state to JSON/SSE introduces disconnection and duplicate-submission states absent from this design contract; these have not been reproduced against a Rust build.

**Fix:** The server owns tick plus within-tick action sequence; commands carry unique IDs. Reconnect retrieves a current snapshot and sequenced events without executing commands twice. A stale UI says so and disables actions. Specify whether loss of the trainee connection pauses the exercise and record that intervention. Bind loopback only, reject foreign-origin mutations, validate bounded imports, and save reports atomically with a visible writable location. Prove launch→exercise→save→CLI verify on Windows offline; cross-compilation alone is not that proof.

## What could make this look like a toy

These are evidence-backed credibility risks, not claims about what a particular judge will say.

### A. A verified GO without defending anything
**issue (blocking) — D4/D10; `30-engine.js:255–339`.** Independently reproduced through the browser and engine: scenario `domain-takeover`, code `MSH-7Q2K`, declare incident at J+00:13, then finish immediately. Result: **95/100, GO, RAPOR SAH**, with no defensive action. Declaring at t=0 also earns 25 detection points. Unrelated IP blocking and resetting a nonexistent account retain 10/10 accuracy; only certain isolations are penalised.

**Fix:** Specify valid graded completion versus aborted/partial practice; untested future objectives cannot become GO merely because the participant stopped early. Define evidence-based detection and explicit action-cost/accuracy rules instead of promising blanket wrong-action penalties. Version these approved changes; do not silently preserve the defects under “engine logic to keep.”

### B. An all-seeing map dressed as a defender’s console
**issue (blocking) — D2/D4; `51-map.js:46–65`.** The current map draws `state.moves`, `state.footholds` and `compromised` directly. Scenario data deliberately includes undetected C2/keylogger activity (`10-scenarios.js:168,175,292`). Hiding recommendations and thoughts does not hide this ground truth.

**Fix:** Define a trainee-visible projection from observations, not attacker state; show uncertainty rather than “normal” when compromise is unknown. Candidate IP/account lists must come from accessible observations or the stated inventory, not future scenario routes. The event log must include telemetry without matching alerts. Full attacker truth belongs in supervised trainer view and post-run replay.

### C. Calling replay consistency tamper-proof identity
**issue (blocking) — D10 and report copy.** I changed both trainee name and engine version, recomputed `sha256(canonical(rec))`, and verification still succeeded. Changing `grade` without changing the hash also succeeded. `verifyRecord()` does not enforce `rec.v`; `canonical()` omits `grade`. Existing “name/actions were not changed” wording overclaims what a self-contained hash proves (`54-rapor.js:50–57`; `55-verif.js:11–13`).

**Fix:** Reject unsupported engine/scenario/rule versions; derive or verify every displayed result; record mode and assessment conditions. State **“score consistent with this recorded replay; participant identity and authenticity of the recorded actions are not proven.”** This matches `PROPOSAL.md` §6 better than “tak bisa dikarang.” No new signing system is required for this scope.

### D. Military styling substitutes for operational meaning
**issue (non-blocking presentation risk) — D1/D9.** The existing paper has a TNI AD letterhead while “bukan dokumen dinas” appears only in its footer (`54-rapor.js:78–84`). External Sigma links use mutable `master` (`20-rules.js:7`).

**Fix:** Put “Rapor latihan simulasi — bukan dokumen dinas” near the heading. On replay selection, show the local event, action and objective consequence first; show the cited public source and simplified-rule limitation separately, with pinned source revision metadata. Astro styling cannot establish operational validity or institutional approval.

## Build gate

Revise the brief to settle the blocking contracts above, especially graded completion, trainee visibility, stable action targeting and adaptive layout priority. Then build against executable journeys for early finish, concurrent alert arrival, typing with shortcuts enabled, OT recovery, refresh/reconnect and imported-report verification. These are correctness conditions, not requests for more visual polish.

**10x note (non-blocking, proposed):** Use the existing replay mechanism to offer one post-exercise “try a different action at this moment” branch beside the original outcome. This changes debrief from reading advice to testing it without repeating setup. Measure time to a second evidence-backed decision; no 10× gain is established. Start with the existing proxy-versus-tunnel case, clearly marked practice and never overwriting the graded record. [Basis: `30-engine.js`, `replay()`; D9.]

REVISE
