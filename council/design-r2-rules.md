# Round 2: rules adopted from the round-1 review (design-r1-answer.md)

Builder: accepted all blocking items. Rules R1-R16 are the build contract.

## Grading and record (engine)
- R1 **No early-stop GO.** "Akhiri" no longer stops the clock. It hands over: the trainee cannot act anymore and the remaining simulated time runs at maximum speed to the scenario's natural end (enemy done + grace, enemy crippled, or duration). Every objective is therefore actually tested. A separate "Batalkan" (abort) ends a run with **no rapor** (practice only).
- R2 **Evidence-based detection.** Detection time counts only from the first response action (incident/isolate/block/reset/modbus-block) taken **after at least one alert existed**. A response before any alert earns no detection credit.
- R3 **Accuracy covers every action type.** Wrong = isolating a host the enemy never touched, blocking an IP that is not enemy infrastructure, resetting an account that never appeared in telemetry or enemy credentials. 5 points each, floor 0.
- R4 **Record covers all displayed results and conditions.** Hash input adds grade, mode, speed. Verification rejects an unknown engine version and re-derives grade. Wording: "Nilai konsisten dengan rekaman tindakan ini. Identitas peserta dan keaslian rekaman tidak dibuktikan oleh berkas ini; itu tanggung jawab pelatih yang menandatangani." The tagline changes from "tidak bisa dikarang" to "bisa diperiksa ulang".
- R5 **Telemetry feed.** Every emitted event (including events no rule matches) is stored and shown in the trainee's event log. IP/account pickers offer only values observed in emitted telemetry.

## Trainee view (no ground truth)
- R6 The trainee map is a projection of observations: asset status = isolated (OFF, "ISOLASI") / highest alert severity seen on that asset / otherwise STANDBY "Dipantau, tanpa indikasi" (never green "normal" for an unknown state). Outside addresses appear only after they were observed. No enemy arrows, footholds, phase progress or thoughts in the trainee view.
- R7 Pelatih view (explicit toggle, labelled, recorded in the session) and EVALUASI show ground truth: moves, footholds, phase progress, Pikiran MUSUH.
- R8 Sigma levels keep their text on screen. Display mapping (documented): critical→Astro critical, high→serious, medium→caution, low→caution with "LOW" text. Never green for an alert.

## Interaction
- R9 **Stable targeting.** Alerts are selected by id. New arrivals never change the selection or focus. Keys 1-4 trigger the selected alert's listed actions; every command shows "verb + exact target" in a confirm strip (Enter confirm, Esc cancel). Global keys are ignored inside inputs/selects/dialogs and on key repeat. Mouse equivalents everywhere.
- R10 **OT recovery in one place.** Selecting the PLC/genset shows: genset state, outage time, "Blokir tulis Modbus", "Nyalakan genset (panel lokal)" with the interlock reason when refused.
- R11 **States always visible** in the Global Status Bar: LATIHAN (simulation) tag, mode LATIH/UJI, run state (BERJALAN/JEDA/SELESAI), speed, connection state. Uji: speed fixed at start, no pause, no recommendations, all recorded in the rapor. Latih: pause and speed allowed.
- R12 **Reconnect.** Server owns the clock and order of actions. Each command carries a client id; duplicates are ignored. On stream loss the console shows TERPUTUS and disables actions until a fresh snapshot arrives. Mutating requests from a foreign Origin are rejected. Rapor files are written atomically (tmp + rename) and the folder path is shown.

## Layout and look
- R13 OPERASI frame sized by the CSS viewport: fixed status bar, panes scroll internally; at < 1280 px wide the asset detail collapses under the queue. Primary task text 16 px, secondary 13-14 px, clock 28 px. A "Presentasi" toggle scales the whole console ~125% for projectors.
- R14 Motion: one flash on state change; critical pulse max 3 cycles; `prefers-reduced-motion` removes motion but keeps status.
- R15 Rapor shows "Rapor latihan simulasi, bukan dokumen dinas" under the title; SigmaHQ links pinned to commit c68bb91abb11; scenario provenance separated from exercise evidence.
- R16 Astro attribution: copyright line and licence file shipped; no claim of DoD/US endorsement.
