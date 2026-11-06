# Independent review record

MUSUH was reviewed in rounds by an independent reviewer from a different model family than the builder. The reviewer reproduced each issue itself (browser probes, HTTP probes, hash tampering) and re-checked every fix. Full answers are in `council/`.

| Round | Verdict | What it found | How it was closed |
|---|---|---|---|
| Design plan | REVISE | Early stop could earn GO; trainee view leaked enemy truth; rapor overclaimed identity; alert arrival could retarget keys; no OT recovery path; refresh/reconnect undefined | 16 rules (R1 to R16), each built and tested |
| Build 1 | 9 blocking | Presentation scale did nothing; live refresh stole focus and wiped forms; reconnect enabled commands before fresh state; other-port origin accepted; silent save failure; invalid records verified; trainer truth partly wired; no live speed control; Sigma links missing | Each fixed with a journey that reproduces it |
| Build 2 | 6 blocking | Debrief rows not keyboard-operable; stale pre-reconnect response could unlock the console; malformed hash crashed the verifier; final footholds missing; Enter on Batal executed the command; toolbar off screen at laptop widths | Generation counter, hash validation, native buttons, foothold list, Enter handling, flexible header |
| Build 3 | 2 blocking | Presentation pushed tools off screen at 1201 to 1280 px; compact header hid LATIHAN · SIMULASI | Header wraps to two rows when required controls do not fit; simulation label never hidden |
| Build 4 | 1 blocking | At short compact windows the alert queue collapsed under the log | Height rule scoped to the 3-column layout; compact layout keeps four tracks; task-based layout matrix added |
| Build 5 | **AGREED: no blocking issue** | Reviewer re-ran 22 task layouts, toolbar journeys, all 72 e2e checks, engine tests and clippy; suggested counting /api/act requests during cancel | Added to `test/layout.mjs` |

Test suites that came out of the review:
- `cargo test -p musuh-engine`: 13 behaviour tests (provenance, adaptation, scoring defects, rapor tampering, structural validity, malformed hashes) and 1 parity test against the reviewed JavaScript prototype.
- `node test/e2e.mjs <w> <h> <binary>`: 72 checks.
- `node test/toolbar.mjs <binary>`: header at 1093 to 1920 px, normal and presentation, Latih and Uji.
- `node test/layout.mjs <binary>`: select an alert, reach its action, confirm, cancel, at 8 sizes in normal and presentation scale.

## After review: visual redesign (5 Nov 2026, owner request)
Owner preferred the earlier olive and gold look with more pictures. The colours and the screens were rebuilt on top of the reviewed behaviour; no rule from R1 to R16 or B1 to B12 was removed. Re-run after the change: engine 13 + 1 tests, e2e 72 checks at 1366x768, 1440x900 and 1920x1080, toolbar suite and layout task matrix, all passing. The redesign has not had its own independent review round.
