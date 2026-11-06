# MUSUH content: where every item comes from (5 Nov 2026)

Labels: **Sourced** (link), **Verified** (checked against the primary page on 5 Nov 2026), **Rekaan** (fictional, labelled in the app), **Proposed** (Fery's design choice, no external standard).

## Scenarios (all labelled in the app: "Skenario latihan rekaan berbasis insiden nyata")
| Scenario | Based on | Status |
|---|---|---|
| Pengambilalihan direktori jaringan markas | Keris Woomera 2026 red-team scenario: Windows exploitation, privilege escalation, taking over the network directory (korem072.tni-ad.mil.id, Puspen TNI, 17 Oct 2026). Steps from ATT&CK G1017 Volt Typhoon; Chisel and DCSync from ATT&CK C0064 | Sourced |
| Ransomware di pusat data satuan | BSSN preliminary forensics of PDNS 2 via detik.com d-7409192 and cnnindonesia.com (25-26 Jun 2024): Defender disabled first, then malicious files, services stopped, VSS/Hyper-V/Veeam disabled. Techniques from ATT&CK S1202 LockBit 3.0 (BSSN: Brain Cipher is a LockBit 3.0 variant). BSSN did not publish the entry point, so the scenario starts from a stolen admin account | Sourced |
| Serangan ke pasokan listrik markas | ATT&CK C0028 (Ukraine 2015): phishing attachment, BlackEnergy HTTP C2, keylogger, valid accounts into the control VPN, OT visible from IT. ATT&CK C0041/S1165 FrostyGoop: Modbus TCP 502 reads and parameter writes | Sourced |
| Fictional island setting | CYBEREX Super Garuda Shield 2026 used "two fictional islands" (dvidshub.net/news/574153) | Sourced |
| Host names, accounts, IPs, genset panel | Invented for the exercise | Rekaan |
| Outside IPs | RFC 5737 documentation ranges only (192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24); checked by test | Verified |
| Internal IPs | RFC 1918 (10.0.0.0/8) | Verified |
| Insider exfiltration scenario (old) | No source found | Removed |

## Techniques
All 28 routes use ATT&CK IDs checked one by one on attack.mitre.org on 5 Nov 2026 (list: crates/engine/data/attack_verified.txt, enforced by `cargo test -p musuh-engine`). Old ID T0855 does not exist in current ATT&CK for ICS and was removed.

## Detection rules
- S01-S20: each reproduces the core selection of a real SigmaHQ rule, with its SigmaHQ id, file path and published level (SigmaHQ commit c68bb91abb1146b8a6a65caf6819b1836d97f09d, 4 Nov 2026; links in the console are pinned to this commit). Each rule states in `simplified` what was left out. Paths are checked against the SigmaHQ tree by test. **Verified**
- M01-M03: MUSUH's own OT rules. SigmaHQ has no Modbus rule (0 hits in the tree). Field names func and pdu_type come from Zeek's modbus.log definition (zeek/zeek scripts/base/protocols/modbus/main.zeek). Labelled in the app as "aturan MUSUH (bukan SigmaHQ)". **Proposed**
- Three routes have no matching rule on purpose (encrypted C2 from the admin server x2, in-process keylogger). Each carries a `gap` note shown in the lessons and rapor.

## Log samples
Event IDs and field names follow the real formats (Sysmon 1/3/10/11, Security 4624/4662/5140, System 7036, PowerShell classic 400, Zeek conn/modbus) and match the SigmaHQ rules above. Values (paths, hashes, times) are invented for the exercise. **Rekaan**

## Scoring and "Pikiran MUSUH"
| Item | Status |
|---|---|
| GO/NO-GO vocabulary | Sourced: Keris Woomera 2026 EXCON |
| Score weights 25/40/25/10, grade bands | Proposed |
| "Pikiran MUSUH" sentences | Written per route for this prototype; each paraphrases the cited source note. In the target build a local model writes them; they never decide moves or scores |
| Leaderboard | Only rapor files in ./rapor that pass replay verification; no sample rows in the Rust build |

## Console design
| Item | Status |
|---|---|
| Colours and status symbols | Astro UXDS (Rocket Communications, Inc.), @astrouxds/tokens 1.14.0 and rux-status SVG shapes; licence shipped as ASTRO-LICENSE.txt. No US government endorsement |
| Fonts | Roboto and Roboto Mono, SIL Open Font License 1.1, bundled locally |
| Zeek modbus.log fields (func, pdu_type) | zeek/zeek scripts/base/protocols/modbus/main.zeek |
