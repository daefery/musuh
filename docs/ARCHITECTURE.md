# MUSUH architecture

## Shape
One binary. `musuh` serves a local console on 127.0.0.1 and runs one exercise at a time.

```
browser (web/*)  --HTTP JSON + SSE-->  crates/app (axum)  --calls-->  crates/engine (pure)
                                       clock, session, rapor files     scenarios, enemy, detection,
                                                                       scoring, narrative, rapor/verify
```

## Engine (`crates/engine`)
- **No IO, no wall clock.** Driven by `tick()` one simulated second at a time. Same scenario + exercise code + actions at the same seconds give the same timeline on every machine.
- **Seeded plan.** FNV-1a of `scenario|code` seeds mulberry32. The seed sets per-phase jitter (0 to 4 s) and the order of equal-priority routes.
- **Enemy.** Each phase lists routes with `needs` (foothold, reachability, IP not blocked, live C2, credential not reset, Modbus writes allowed). The first feasible route in the seeded order executes; blocked routes are recorded as ground truth. Optional phases are skipped when no route is open; required phases wait and retry every 15 s. When the active C2 IP is blocked, backup channels are tried after 10 s.
- **Detection.** Every emitted event is kept (`events`). Rules match Sigma-style selections (case-insensitive; operators eq, contains, containsAll, startswith, endswith, notendswith, notprivate).
- **Scoring.** Detection 25 (only from a response taken after the first alert), denial 40 (share of enemy phases not completed), impact 25 (non-detection objectives), accuracy 10 (minus 5 per isolate, block or reset unrelated to the enemy). GO only when every objective holds.
- **Handover.** After the trainee hands over, no actions are accepted and the remaining time runs to the natural end, so no objective is scored before it was tested.
- **Rapor.** SHA-256 over engine version, scenario, code, date, mode, speed, trainer-view flag, trainee, actions, end time, handover time, total, grade, verdict. Verification first checks structure (supported mode and speed, known action kinds, times in order and inside the run, verification code derived from the hash), rejects other engine versions, then replays the exercise; every recorded action must be accepted by the engine and total, verdict, grade and end time must match.

## App (`crates/app`)
- `GET /api/library`, `POST /api/start`, `POST /api/act` (client command id, duplicates ignored), `POST /api/control` (speed, pause, handover, abort, trainer view), `GET /api/state[?reveal=true]`, `GET /api/events` (SSE "update" pings), `POST /api/verify`, `GET /api/board`.
- Trainee state contains observations only. Enemy ground truth is added for the trainer view (recorded) and after the run.
- Uji mode: speed fixed at 4×, no pause, no suggestions.
- POST from a foreign Origin returns 403. Rapor files are written to `./rapor` via a temp file and rename.

## Console (`web`)
Plain HTML, CSS and JavaScript, embedded in the binary (rebuilt when any file under web/ changes). Look: TNI olive and gold with a merah-putih line; status shapes follow the Astro UXDS status symbols. Every stage is shown as a picture (web/js/35-viz.js): process stepper, live network map (enemy arrows only in trainer view or after the run), battle timeline with two lanes, kill chain, score gauge and radar, objective cards, and the verification flow. Live updates replace a panel only when its HTML changed and restore keyboard focus by data-key. A generation counter discards any state response sent before a reconnect or a newly started run, so a stale view can never re-enable commands. The status bar wraps to two rows when the required controls do not fit (narrow window or presentation scale). Astro UXDS dark tokens and the six Astro status symbols (critical triangle, serious diamond, caution square, normal circle, standby ring, off dot). Sigma level to status mapping: critical to critical, high to serious, medium and low to caution; an alert is never green.

## Tests
- `cargo test -p musuh-engine`: provenance (every route sourced, ATT&CK IDs verified list, RFC 5737, SigmaHQ ids), behaviour, scoring defects found by the design council, rapor tampering, and parity with the reviewed JavaScript prototype (enemy timeline identical for 11 cases).
- `node test/toolbar.mjs <binary>`: header journeys at 1093 to 1920 px, normal and presentation scale, Latih and Uji.
- `node test/e2e.mjs <w> <h> <binary>`: 72 browser checks against the real binary, including the council journeys (early finish, concurrent alerts, typing with shortcuts, Enter on Batal, OT recovery, refresh, held responses across reconnect and across a new run, foreign and other-port origins, save failure, malformed hashes, paced keyboard focus, keyboard evidence rows, presentation scale).

## Build
- Linux: `cargo build --release -p musuh`
- Windows: `cargo zigbuild --release -p musuh --target x86_64-pc-windows-gnu`
