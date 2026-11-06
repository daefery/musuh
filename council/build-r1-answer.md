# MUSUH running-build council — round 1

The early-stop scoring, observation-only trainee view and OT recovery fixes work. The supplied journeys also pass. **The build still has six operational defects and three smaller, explicit contract gaps.** They are numbered B1–B9 below; visual preferences are not included in that count.

## Independent verification

Repository paths below are relative to `./`. Evidence directory **E** means `<review-evidence>/`.

- Read R1–R16, the previous review, every engine/app Rust source file, engine tests, scenario/rule/source JSON, console HTML/JS/CSS, licence and browser journey source.
- Ran `cargo test -p musuh-engine`: **12 tests passed**—11 behaviour tests and one parity test. Output: `E/cargo-test.log`. This checks the bundled provenance records, not the current external publications.
- Re-ran the supplied `test/e2e.mjs` against the supplied release binary at **1366×768, 1440×900 and 1920×1080**. Each produced **41 successful checks and ALL OK**. Logs: `E/e2e-{1366,1440,1920}.log`; fresh screenshots: `E/test/shots/<width>x<height>/`. Existing repository screenshots were not overwritten.
- Ran independent HTTP/browser probes, including tampering with recomputed hashes, delayed/reordered snapshots, an actual SSE transport interruption through a local proxy, and a deliberately unwritable report destination. Scripts/results: `E/probe.mjs`, `E/probe.json`, `E/edge-probe.mjs`, `E/edge-probe.json`.
- Ran a separate keyboard-only exercise and a paced keyboard navigation probe: `E/keyboard.mjs`, `E/keyboard.json`.
- Browser: **Chrome 153.0.8010.52**, Playwright Core. Also inspected **1279×768 and 1093×614** CSS viewports and the presentation toggle. Opened the resulting screenshots myself. The independent main browser probe recorded **zero page errors and zero external requests**, with external requests blocked.
- Reviewed Linux binary SHA-256: `63ca02c1011e4a8a73d8e75991d9039ff45690b0cc12a67a0feaedfff58dc570`. Source/binary hashes: `E/reviewed-sha256.txt`.
- **Not independently tested:** native Windows execution, physical projector readability at 5–10 m, screen readers, Safari, real users or phone support. The Windows file is a PE32+ x86-64 executable; that alone does not verify the reported Windows journey. The reduced viewport is not a real browser-zoom test.

## R1–R16 acceptance

| Rule | Status | Independently verified evidence |
|---|---|---|
| **R1 — No early-stop GO** | **MET** | Incident at t=13, immediate handover: natural completion at **t=277, 35/100, NO-GO**. Further action refused with “Konsol sudah diserahkan”. Abort produced `rapor: null`. `E/probe.json`: `early`, `afterHandoverAction`, `abort`; engine regression passes. |
| **R2 — Evidence-based detection** | **MET** | Incident before the first alert, then handover: **Deteksi 0/25**, no detection time. `score.rs:25–29` selects a response at/after the first alert; pre-alert engine test passes. `E/probe.json:preAlertScore`. |
| **R3 — Wrong-action accuracy** | **MET** | Unrelated IP `192.0.2.1` plus account `tidak.ada`: **Ketepatan 0/10**, two wrong actions. Host scoring includes executed-route hosts and historical footholds. `score.rs:31–48`; `E/probe.json:wrongScore`. |
| **R4 — Record/result consistency** | **PARTLY** | Rehashed unknown version and false grade are rejected; grade/mode/speed are hashed and the authenticity limitation is present. However, impossible conditions/actions and an altered verification code are accepted: **B6**. Name-only rehash qualification below. |
| **R5 — Complete telemetry/pickers** | **MET** | Ransomware's unmatched Zeek HTTPS event to `192.0.2.77` appears in `events`, the log and observed addresses, without an alert. `E/probe.json:unmatched`, `E/unmatched.png`; `session.rs:138–164` derives choices from emitted telemetry. |
| **R6 — Trainee projection** | **MET** | Fresh active trainee JSON contained no `moves`, `thoughts`, `phases`, `timeline` or asset `truth`; matching truth DOM elements counted **0**. Unknown assets were standby, not green. Initial outside IP list was empty; observed proxy address appeared later. `E/probe.json:traineeApi/traineeDOM`; `E/frame-1366x768.png`. The OT scenario's initial `INET` item is an inventory mail source, not an undisclosed IP. |
| **R7 — Trainer/debrief truth** | **PARTLY** | Explicit trainer toggle records `trainerViewUsed=true`; observed one foothold badge, phase strip and two thoughts. The server supplies moves, but the console never renders that field; EVALUASI omits the phase/foothold/thought views. **B7**. `E/probe.json:trainer`, `E/trainer.png`, `E/evaluation.png`. |
| **R8 — Sigma/Astro severity** | **MET** | High→serious and medium→caution in live snapshots; full domain run included **S10 low→caution**, while OT M01 was critical. Queue prints the original level, uppercased by CSS. Mapping is documented in `session.rs:68–71` and `docs/ARCHITECTURE.md`. `E/edge-probe.json:levels`; `E/ot-refusal.png`. |
| **R9 — Stable targeting/keyboard** | **PARTLY** | Selected alert remained **id 2→2** across arrivals. Confirmation named “Isolasi host WEB-01”; Escape cancelled. Typing `n1234` in the filter triggered nothing. However, updates destroy focused controls and live form drafts, and debrief evidence is click-only: **B2**. |
| **R10 — OT recovery together** | **MET** | PLC detail showed outage, power and both actions. Premature restart was refused in place. Block writes→restart restored **180 kW**, stopped t=214, restored t=217. `E/probe.json:otRefusal/otRecovery`; `E/ot-refusal.png`, `E/ot-recovered.png`. |
| **R11 — Visible conditions/mode controls** | **PARTLY** | Simulation/mode/run/speed labels exist. Uji has empty recommendations, fixed 4×, and pause/speed changes return **400**. Rapor stores mode/speed/trainer flag. But there is no live Latih speed control or explicit connection state in the GSB: **B8**. |
| **R12 — Reconnect/order/origin/save** | **PARTLY** | Refresh preserves the server run; repeated action ID returns `dup:true`; ordinary foreign host returns 403; successful saves use temp+rename. But reconnection unlocks before a snapshot and old responses roll state backwards (**B3**), other loopback origins pass (**B4**), and failed saves are reported as saved at the wrong described location (**B5**). |
| **R13 — Viewport/type/presentation** | **PARTLY** | OPERASI fits the three main viewports with internally scrolling panes; detail moves below the queue at 1279 px. Actual alert/secondary/clock sizes are **14/10.5/24.5 px**, not 16/13–14/28. Presentasi changes none of them. Narrow toolbar clips: **B1**. `E/probe.json:frames/presentationBefore/presentationAfter`. |
| **R14 — Bounded/reduced motion** | **MET** | CSS specifies one asset flash, one arrival animation and at most three critical pulse cycles; reduced-motion forces animation/transition off. Measured `animationName: none` with reduced-motion. `00-tokens.css:35`, `03-ops.css:35–36`, `04-queue.css:15–18`; `E/probe.json:reducedMotion`. |
| **R15 — Rapor/provenance** | **PARTLY** | Simulation disclaimer is immediately under the title; expanded debrief distinguishes public scenario provenance from exercise events. But **zero SigmaHQ links** are rendered; the pinned URL constant is unused: **B9**. `E/rapor.png`, `E/probe.json:report.links`. |
| **R16 — Astro attribution** | **MET** | Served `/ASTRO-LICENSE.txt` returned the copyright and full licence; CSS identifies Rocket Communications; help explicitly disclaims US-government endorsement. `E/probe.json:license`; `web/ASTRO-LICENSE.txt`, `10-gsb.js:64`. |

## Required round-1 reproductions

**A — Incident then stop early: PASS.** With `domain-takeover`, `MSH-7Q2K`, incident t=13 and handover t=13, the remaining attack ran to t=277. Result **35, NO-GO**, not the old 95 GO. As a positive control, a keyboard-only incident **plus actual WEB-01 isolation** at t=12 legitimately earned **95, GO**. These are different action histories. [E: `early.json`, `keyboard.json`.]

**B — No trainee ground truth: PASS for the fresh active trainee view.** Checked both `/api/state` and the rendered DOM before enabling trainer view. No enemy-state fields/badges/thoughts appeared. Explicit reveal remains a supervised, recorded toggle—not authenticated access control, as agreed. [E: `probe.json:traineeApi/traineeDOM/trainer`.]

**C — Edit name/version/grade and recompute hash: qualified result.**

| Mutation, with a correctly recomputed canonical hash | `/api/verify` result |
|---|---|
| Unknown engine version only | `hash_ok=true`, `ok=false` |
| False grade only | `hash_ok=true`, `score_ok=false`, `ok=false` |
| Name + version + grade | `hash_ok=true`, `ok=false` |
| Name only | `hash_ok=true`, `score_ok=true`, **`ok=true`** |

Files and responses: `E/record-{name,version,grade,all}.json`, `E/probe.json:verify`. Thus, the combined mutation fails, but **name-only rejection does not pass** if that is what the ask intended. This is consistent with adopted R4's unsigned-record limitation: changing a name and recomputing an unkeyed hash cannot be distinguished from issuing a record with that name. I am **not reopening the settled no-signing scope** or calling identity authentication implemented. Do not claim that a rehashed name change must fail under the current design. B6 concerns structural consistency, which can and should be verified without signatures.

**D — Refresh mid-run: PASS; broader reconnect contract: FAIL.** Reload preserved code, t=46 and the action history; supplied journeys also confirmed no repeated actions. Selective SSE interruption and reordered HTTP snapshots exposed B3. A refresh success is not proof of reconnect safety. [E: `probe.json:refresh/reorder`, `edge-probe.json`.]

**E — OT recovery: PASS.** Unprotected restart returned “MUSUH masih bisa menulis Modbus. Blokir tulis Modbus dulu.” The reason appeared beside the controls. Blocking writes and restarting restored the genset in three simulated seconds in this scripted run. This is scripted timing, not measured human performance. [E: `ot-refusal.png`, `ot-recovered.png`, `probe.json:otRecovery`.]

## Blocking findings

### B1 — Presentation enlargement does nothing; task type is below the adopted sizes

**issue (blocking, R13)** — `web/css/00-tokens.css:21–24`; toolbar layout in `01-gsb.css`.

**Repro/evidence:** At 1366×768, enable Presentasi. `--scale` changes **1→1.22**, but root font stays **14 px**, body **12.25 px**, alert title **14 px**, alert metadata **10.5 px**, clock **24.5 px**, and handover button **31.5 px high**. The later `font` shorthand on `html, body` overrides the root `font-size` calculation. At 1093×614, the presentation button occupies x=1152–1181, outside the 1093 px viewport. [E: `probe.json`, `presentation-1366.png`, `frame-1093x614.png`.]

**Fix:** Keep the root scaling declaration authoritative; apply the body font shorthand only to `body`. Set actual primary/secondary/clock tokens to R13's values. Adapt the GSB at reduced widths and after enlargement so its tools remain accessible. Re-run task journeys at normal and presentation scale; do not fix this by shrinking labels again.

### B2 — Live rendering removes keyboard focus and erases unsaved input

**issue (blocking, R9)** — `00-core.js:31–39,69–76`; `10-gsb.js:31`; `20-setup.js:11`; `30-ops.js:53,78,109,125`.

**Repro/evidence:** Focus WEB-01 or the confirmation button while running; after 350–400 ms, `document.activeElement` becomes **BODY**. In a keyboard-only Uji probe, Tab reached the isolate button, but each of five 350 ms waits removed its focus. On SIAPKAN during a live exercise, typing **“Nama sementara”** became **empty** on the next update. These are reproduced losses, not just source concerns. [E: `probe.json:focus/confirmFocus`, `keyboard.json:uji`, `edge-probe.json:setupBefore/setupAfter`.]

The debrief additionally renders expandable evidence as plain `.lane` divs with only `onclick`: all measured `tabIndex=-1`, no role, and Enter did not expand the row. [E: `edge-probe.json:lanes/expandedAfterEnter`; `40-eval.js:25,44`.]

**Fix:** Preserve keyed controls and the focused element across snapshots; do not rebuild setup/import forms on clock ticks. Update dynamic text in place and retain drafts on input. Use native keyboard-operable disclosure controls for debrief evidence and report citations. Prove paced Tab→Enter interaction while ticks and alerts continue—not just fast global shortcuts or programmatic `ask()` calls.

### B3 — Reconnect enables commands before fresh state; delayed snapshots roll the display backwards

**issue (blocking, R12)** — `web/js/00-core.js:31–53`; ticker in `crates/app/src/main.rs:65–79`; `session.rs:13–15`.

**Repro/evidence:** Cut only the SSE transport, keeping the engine running. Hold subsequent `/api/state` responses, then allow SSE to reopen. Before any snapshot was delivered, the console reported **connected=true, stale=false, no TERPUTUS banner**, still displaying **t=3, paused=true**. Keyboard N→Enter was accepted by the server at **t=18**. Separately, releasing an older state response after a newer one rolled the displayed clock **222→217**. Server snapshots at **t=47 and t=51 both had seq=4**. [E: `edge-probe.json:beforeFreshSnapshot/actionBeforeFreshSnapshot`; `probe.json:reorder/sequence`.]

**Fix:** Mark state stale on stream loss; keep mutations disabled after transport reopening until an accepted current snapshot arrives. Apply this to controls as well as actions. Serialize/coalesce refreshes or reject older responses. Increment the server state version for ticks and every visible mutation, and scope it to a session identity so new runs cannot be confused with old responses. Add both transport-recovery and out-of-order-response tests.

### B4 — The foreign-Origin check accepts other origins

**issue (blocking, R12)** — `crates/app/src/main.rs:107–112`.

**Repro/evidence:** With the console on port 8300, POST `/api/control` with `Origin: http://localhost:9999` or `Origin: http://127.0.0.1:9999` returned **200**, not 403. The ordinary `http://evil.example` case correctly returned 403. The check is a string-prefix test, not a comparison with the console's allowed origin. [E: `probe.json:foreign`.]

**Fix:** Parse and validate the origin against exact configured console origins, including the listening port. Test another loopback port as well as an external hostname. This establishes a failed origin-guard contract; it is **not a claim that a remote browser exploit was demonstrated**—browser preflight is a separate control.

### B5 — Report-save failure is silent, and the displayed save location is inaccurate

**issue (blocking, R12)** — `crates/app/src/api.rs:91–99`; `web/js/50-rapor.js:12`.

**Repro/evidence:** Start the binary in an isolated working directory containing a regular file named `rapor`, then finish an exercise. No report directory/file can be created, but the API still supplies a rapor and the UI says **“Disimpan di folder rapor/ di samping program MUSUH.”** No error is shown. In successful tests, files actually went under the process working directory `E/runtime/rapor/`, not beside `target/release/musuh`. [E: `edge-probe.json:saveFailure`, `save-failure.png`.]

**Fix:** Return actual persistence status and the resolved absolute save path. Propagate directory/write/rename errors to the UI, preserve the in-memory report for download, and offer retry. Say “saved” only after successful rename. Keep the atomic-write approach.

### B6 — Verification accepts records that do not describe a valid replay

**issue (blocking, R4)** — `crates/engine/src/rapor.rs:65–77,100–112`.

**Repro/evidence:** Starting from the genuine 35/NO-GO record:

1. Append `[999999,"not-an-action",null]` and recompute its hash: **`ok=true`**. Replay silently ignores the supplied action.
2. Set `mode="uji", speed=0`, recompute: **`ok=true`**, although the live engine fixes Uji at 4×.
3. Change only `verif` to `FAKE-FAKE-FAKE`, without rehashing: **`ok=true`**.

[E: `record-invalidAction.json`, `record-invalidConditions.json`, `record-verifCode.json`; `probe.json:verify`.]

**Fix:** Validate supported conditions and action kinds/times/order; require that replay consumes and successfully reproduces the recorded actions rather than dropping invalid entries. Validate the handover boundary and derived verification code. Continue deriving grade/total/verdict/end time. This is structural record consistency, not the out-of-scope authentication of names or original actions.

### B7 — The promised trainer/debrief truth is only partly wired into the UI

**issue (blocking contract gap, R7)** — `web/js/30-ops.js:61–65`; `web/js/40-eval.js`.

**Repro/evidence:** Enable trainer view: foothold badges, phase strip and thoughts appear. Complete the exercise and open EVALUASI: it shows the timeline, objectives and lessons, but no foothold/phase/thought inspection. `v.moves` is supplied by `session.rs` but is never consumed by console JS. [E: `trainer.png`, `evaluation.png`; source search for `.moves`, `.thoughts`, `.phases`.]

**Fix:** Expose the already-supplied ground-truth fields in clearly labelled trainer/debrief details. A plain from→to list and accessible disclosure are sufficient; this does **not** require a new animated map. Keep them absent from the active trainee projection.

### B8 — Live Latih speed control and GSB connection state are missing

**issue (blocking contract gap, R11)** — `web/js/10-gsb.js`; `web/js/20-setup.js:39,45`; `web/js/00-core.js:48–53`.

**Repro/evidence:** Start Latih at 10× and try to change its speed from OPERASI. There are **zero live `[data-speed]` controls**. The only speed selector changes `setup.speed` for a future run; `/api/control` supports the live change, but no UI calls it. The GSB also has no connection label: TERPUTUS is a separate bottom banner, and connected state has no explicit indicator. [E: `probe.json:frames`, `edge-probe.json:loss`; source handlers.]

**Fix:** Wire a Latih-only live 1×/4×/10× control to `/api/control`; leave Uji locked. Show connected/stale/disconnected state persistently in the GSB, driven by B3's freshness state rather than transport openness alone.

### B9 — The pinned Sigma source links do not exist in the rendered console

**issue (blocking contract gap, R15)** — `web/js/00-core.js:10`; `30-ops.js:84`; `50-rapor.js:77`.

**Repro/evidence:** Inspect a Sigma alert and the final report, then enumerate anchors whose URL contains `SigmaHQ`: **0 links**. `SIGMA_PIN` has no use beyond its declaration. The report prints the rule path and abbreviated commit, but does not link to it. [E: `probe.json:report.links`; source search.]

**Fix:** Render each external rule's source anchor using `SIGMA_PIN + a.path`, with the pinned revision and simplification note. Keep MUSUH-owned rules explicitly separate. Assert actual rendered `href` values, not merely the presence of the word “SigmaHQ”.

## The five looks

1. **Projector distance — not ready.** This is a measured sizing failure, not a claim from a physical projector test. Supporting text is 10.5 px and Presentasi does not enlarge it. B1 must be fixed before calling the view projector-ready. The pane layout itself is substantially better: important OT controls fit together at 1366×768. [E: `frame-1366x768.png`, `ot-refusal.png`.]
2. **First ten seconds for a judge — clear starting point; visual payoff needs the demonstration.** Reviewer judgement: SIAPKAN clearly presents three scenarios, conditions and one start action. It honestly identifies simulation and invented scenarios. The initial screen explains adaptation in prose rather than demonstrating it; once a proxy is blocked, the independently observed tunnel event supplies the convincing mechanism. No first-time-judge study was performed. [E: `test/shots/1366x768/01-siapkan.png`, `e2e-1366.log`.]
3. **Keyboard-only run — a happy path works, the general interaction does not.** I completed setup→incident→isolation→95 GO using only keyboard input. In Uji, a deliberately paced Tab sequence repeatedly lost focus before activation; evidence disclosure is also mouse-only. B2 is the blocker, not the existence of shortcuts. [E: `keyboard.json`, `edge-probe.json`.]
4. **Colour discipline versus Astro — mostly sound.** Reviewer judgement: serious diamonds, caution squares, critical downward triangles and blue interaction distinguish state from selection; LOW remains visible and is not green. The red-white identifier and purple simulation/trainer labels are understandable non-severity cues. The green dot used merely to mark the selected setup scenario slightly conflates selection with normal status; this is **non-blocking**, not a request to redesign the palette. [E: setup/operation/OT screenshots; `20-setup.js:22`, status SVGs in `index.html`.]
5. **Anything that reads as a toy — the report demonstration, not the console shell.** Reviewer judgement: the operational shell and visible OT interlock are credible. Every report deliberately displays a rejected, invented antivirus sentence in a red “Dibuang oleh gerbang sitasi” block (`report.rs:30`, `50-rapor.js:66`). That reads as a developer demonstration inside the participant's result. Consider putting this demonstration in help/demo mode; **non-blocking**. Do not describe citation-existence checking as semantic truth verification: `compile()` only checks whether referenced row numbers exist. B5/B6 are the consequential report-integrity problems.

## Gate and non-blocking leverage

Keep the passing engine behaviours and observation-only projection. Address B1–B9 without adding authentication, a new visual system or real-network simulation. The existing E2E suite is useful but currently misses computed typography, paced focus, delayed snapshots, storage failure, malformed replay inputs and actual source-link targets; its ALL OK result cannot stand in for those checks.

**10x note — non-blocking, proposed:** Turn the deterministic replay into a reusable browser-state fixture generator for contract testing. The engine already generates repeatable telemetry, alerts and end states; currently the supplied browser suite waits on wall-clock attack progression and the additional checks live in three separate reviewer scripts. First step: generate representative trainee/trainer/OT/final snapshots for one scenario and replay them through the real renderer, retaining a smaller real-server journey for timing and persistence. Measure regression-suite duration and contract defects caught before council. No 10× improvement is established; this proposal is separate from fixing the nine findings.

BLOCKING: 9 issues
