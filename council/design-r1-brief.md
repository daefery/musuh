# Council round 1: MUSUH console design plan (review BEFORE build)

You are an independent reviewer. Be blunt. Verify claims by opening the files named below.

## Product (read first)
- `../PROPOSAL.md` (what MUSUH is, scoring rubric of the competition)
- `../SOURCES.md` (where content comes from)
- Current HTML prototype: `../prototype/musuh.html` (olive/gold TNI look). Screenshots: `../prototype/test/shots/1440x900/*.png`
- Engine logic to keep: `../prototype/src/30-engine.js`, scenarios `10-scenarios.js`, rules `20-rules.js`.

MUSUH: offline cyber exercise for Indonesian Army (TNI AD) cyber soldiers. A deterministic adaptive attacker (MUSUH) attacks a simulated unit network; the trainee defends from a console; the system scores GO/NO-GO and issues a tamper-evident score sheet (rapor) verifiable by replay. Competition: Kartika Cyber Hackathon 2026 (judged on relevance to TNI AD IT/OT 25%, technical innovation 25%, working prototype 25%, deployability in a unit 15%, documentation 10%). Final = 10-minute live demo in Jakarta on a projector, 24 Nov 2026. Submission deadline 15 Nov.

## Owner request (Fery, 5 Nov)
"Build MUSUH using Rust, prepare all documents, think harder about the prototype design, use US force design or easy-to-operate console style."

## Users and context
- Trainee: bintara/perwira siber at a unit, Bahasa Indonesia, laptop 1366-1920 px, mouse + keyboard, under time pressure. Not a SOC analyst.
- Pelatih (trainer): sets exercise code, watches, reviews rapor.
- Judges: watch on a projector from 5-10 m; may take the keyboard during the demo.

## Decisions to review (answer KEEP / CHANGE / DROP for each, with reason)

D1 Design system: adopt **Astro UXDS** (Rocket Communications, built under contract for US Space Force / DoD ground systems; public domain in the US, licence copy at `./design/ASTRO-LICENSE.txt`). Use its real tokens (`design/astro-tokens-system.css`: base #101923, surface #1b2d3e, header #172635, interactive #4dacff, text #fff/#d4d8dd) and its 6-level Status System with the exact shapes (`design/*.svg`: critical = red triangle, serious = orange diamond, caution = yellow square, normal = green circle, standby = cyan ring, off = grey dot). We re-implement in plain HTML/CSS/SVG (no Astro web components, no CDN). Credit Astro in the About panel and docs. No US flags/insignia. Indonesian identity kept only via a thin merah-putih line and TNI AD terms (GO/NO-GO, EXCON, satuan).

D2 Layout = an ops console, not a web page: one fixed 3-row frame that never scrolls on 1366x768 and up.
  - Row 1 Global Status Bar (Astro pattern): app name MUSUH, **Application State tag "LATIHAN" (exercise) always visible** (Astro: app state prevents acting on a live asset), monitoring icons with status symbols for: Jaringan (IT), Segmen OT, Kanal Musuh (C2), Kredensial; mission clock J+mm:ss; exercise code; operator name.
  - Row 2 main: left = network map (assets with Astro monitoring icons + status symbol + label + sub-label), center-top = **Action Queue** (one card per alert: what happened, severity symbol, the 1-3 recommended actions as big buttons with keyboard numbers), right = asset detail of the selected asset (its events, its available actions).
  - Row 3 bottom = Event Log (Astro Log pattern: timestamp, newest on top, search filter, scroll lock) and a slim "Pikiran MUSUH" ticker for the pelatih (toggleable, hidden by default in trainee mode).
D3 Interaction model "select asset, then act" with keyboard: arrow keys move between assets, I = isolate, B = block (offers the IPs seen), R = reset (offers accounts seen), M = block Modbus write, N = declare incident, 1-3 = accept recommended action on top alert, Space = pause (pelatih only), ? = help overlay. Every action needs no typing (no free-text IP/account fields in the main flow).
D4 Recommended actions on alerts: shown as options, never auto-applied; wrong actions still allowed and penalised (to keep it a test). Concern: does showing recommendations make it too easy? Proposed: "Mode Latih" shows them, "Mode Uji" (graded for rapor) hides them. Rapor records which mode.
D5 Screens: only 4 modes in the top bar: SIAPKAN (setup), OPERASI (live), EVALUASI (debrief + replay), RAPOR (sheet + verify). Leaderboard folded into EVALUASI. Fewer tabs than the current 6.
D6 Typography: Roboto + Roboto Mono (Astro default, OFL, bundled locally). Body 14-16 px; projector-safe minimums: 13 px for secondary labels, 24 px+ clock.
D7 Colour discipline: red only for critical; status colours only for status (never decoration); one accent (#4dacff) for interactive.
D8 Motion: only on state change (asset status change flashes once, new alert slides in once). No looping animation except a critical alert pulse that stops after 3 cycles.
D9 Debrief (EVALUASI): left = timeline lanes MUSUH vs PESERTA on one time axis (a "swimlane" like a flight replay), right = GO/NO-GO per objective with the evidence, and the score breakdown. Click a timeline event to see its source citation.
D10 Rust architecture: one binary `musuh` (axum + tokio, rust-embed for static assets, serde, sha2). Engine in a pure crate (no IO, no clock: tick-driven, seeded), compiled native for the server AND the same rules used for verification. Browser UI talks to `localhost` over JSON + Server-Sent Events. Runs offline; `musuh.exe` for Windows via cross-compile, Linux binary too. Scenarios as embedded JSON (same content as today, sourced). Verification CLI: `musuh verify rapor.json`.
D11 What is NOT built: no login, no database (rapor saved as JSON files in a folder), no multiplayer, no real network attacks.

## Ask
1. KEEP/CHANGE/DROP for D1-D11 with one-line reasons.
2. The 5 biggest design risks for a live projector demo with judges taking the keyboard.
3. Anything that would make a TNI AD judge or a US-style ops UX expert say "this is a toy".
4. Final line: BUILD (if the plan is sound after your changes) or REVISE.
Write the answer to the path given in your instructions.
