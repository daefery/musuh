# Research: is MUSUH grounded, and where scenarios must come from (5 Nov 2026)

Rule for this file: every line has a source link, or is labelled **Proposed** (Fery's idea) or **Unverified**.

## 1. Competition rules that decide eligibility
| Fact | Source |
|---|---|
| Submission = link to the work, presentation video, explanation slides | kartikacyberhackathon.id (fetched 5 Nov) |
| Press release also names proposal, technical documentation and prototype demo video | liputan6.com/tekno/read/8321614 (26 Oct 2026) |
| Scoring: Relevansi 25, Inovasi 25, Fungsionalitas 25, Kelayakan 15, Dokumentasi 10 | kartikacyberhackathon.id |
| No published rule on fictional scenarios, AI use, or originality. The site has no juknis link (checked the page HTML) | kartikacyberhackathon.id, 5 Nov |
| Age 17-35: only in one outlet | wartakita.id |
**Unverified:** whether fictional scenarios are allowed. Nothing published forbids them. Ask the organisers (WhatsApp group on the site, or webinar Q&A tonight).

## 2. What the organiser signals it wants
| Signal | Source |
|---|---|
| Webinar 1 (19 Oct): "Tantangan & Konteks Keamanan Siber IT/OT" | CODEPOLITAN LinkedIn post, 19 Oct 2026 |
| Webinar 2 (tonight, 5 Nov 19:00 WIB): "Tackling the Boundaries: Cyber Exercise Development Using Agentic AI". Speaker Mahrus Qusaeri, who is also a final-day talkshow speaker. Content: AI-driven attacks, an Agentic AI flow for building cyber exercises, live demo turning a CVE into a CTF with Docker, prototype inspiration | codepolitan.com/events/webinar-pembekalan-2-kartika-cyber-hackathon-2026 |
| Press framing: solutions "berbasis kecerdasan buatan (AI)" for TNI AD cyber defence | liputan6.com 8321614 |
| Final-day talkshow includes Lettu Cpn Aghni Raesa (Digital Forensics and Detection Engineering) | kartikacyberhackathon.id |
Consequence: **cyber exercise + AI is the organiser's own suggested direction.** It is relevant, and it will also be crowded after tonight (most teams will copy the CVE-to-CTF demo).

## 3. How TNI actually runs cyber exercises (real formats to copy)
| Exercise | What is documented | Source |
|---|---|---|
| Keris Woomera 2026 (16 Oct, Baluran) | TNI Red Team vs ADF Blue Team. Scenario: exploit Windows OS vulnerabilities, from vulnerability identification to privilege escalation and attempts to take over the network directory system. Blue: DFIR via security log analysis, IoC identification, tracking suspicious activity; network isolation and controlled shutdown. EXCON (JFCyC/EXCON) scored with **GO/NO-GO** | korem072.tni-ad.mil.id (Puspen TNI release, 17 Oct 2026) |
| CYBEREX Super Garuda Shield 2026 (31 Aug-10 Sep, Sesko TNI Bandung) | About 120 participants, 10 nations. Defend simulated networks and critical infrastructure from opposing-force cyber activity. Scenarios built with Indonesian partners: telecom, energy, a solar farm, a power plant, smart cities on **two fictional islands**. Teams notionally deployed to a fictitious country. Capstone: each Defensive Cyber Team briefs infrastructure state and attack analysis | dvidshub.net/news/574153; korem072.tni-ad.mil.id (CYBEREX SGS 2026) |
| WMS Tournament 2026 (Pussiberad, final 16 Apr) | Theme "From CTF to Real-World Attack and Defense"; 18 TNI AD teams + 244 public teams; CTF prelims | indonesiadefense.com; tniad.mil.id (17 Apr 2026) |
| MTT Siber, Sansidam V/Brawijaya (27-30 Apr) | Pussiberad mobile training team; materials + practice | wartapos.id 30 Apr 2026 |
| Rise The Ranger-2 (Satsiber TNI, Aug 2026) | Categories include Incident Response and Digital Forensic | tniad.mil.id 26 Aug 2026 |
**Key finding:** TNI's own flagship exercise (SGS CYBEREX) uses **fictional countries and fictional infrastructure**. A fictional scenario is the normal military format, as long as it is labelled fictional and the attack techniques are real.

## 4. Real incidents usable as scenario sources (techniques from MITRE ATT&CK, fetched 5 Nov)
| Incident | Relevance | Documented chain (ATT&CK) | Source |
|---|---|---|---|
| Brain Cipher ransomware on PDNS 2 Surabaya, June 2024 | Indonesian, government, 282 tenants hit | Windows Defender disabled from 17 Jun 23:15 WIB; malicious activity from 20 Jun 00:54: install malicious files, delete key filesystem, stop services, VSS/Hyper-V/VirtualDisk/Veeam disabled; Defender crashed 00:55. Brain Cipher = LockBit 3.0 variant | BSSN via detik.com d-7409192 and cnnindonesia.com 20240626004744-192-1114133 |
| Defacement of dozens of tni-ad.mil.id subdomains, 26 Jul 2026 | TNI AD itself | Simultaneous defacement; Kadispenad confirmed investigation. Entry method not published | tribunnews.com 7860336; defacer.net/view/61362 |
| 2015 Ukraine power grid (Sandworm, ATT&CK C0028) | IT to OT to blackout | T1566.001 phishing attachment, T1204.002, T1056.001 keylogging, T1078 valid accounts, T1018 discovery (OT visible from IT), ICS T0822 VPN with stolen domain creds, T0823 HMI GUI, T0831 manipulation of control, T0826 loss of availability, T0816 UPS shutdown | attack.mitre.org/campaigns/C0028 |
| FrostyGoop, Ukraine heating, Jan 2024 (C0041) | Modbus abuse, exactly the genset story | T1190 public-facing router, T1505.003 web shell, T1003.002 SAM dump, T1071 L2TP tunnel, ICS T0836 modify parameter via legitimate Modbus, T0826 loss of heating | attack.mitre.org/campaigns/C0041 |
| Unitronics PLC defacement (CyberAv3ngers, Nov 2023, C0031) | Internet-exposed PLC, default password | ICS T0883 internet accessible device, T1694.001 default credentials (often "1111"), T0829 loss of view, T0814 | attack.mitre.org/campaigns/C0031; CISA AA23-335A |
| U.S. water utilities, from 27 Jul 2026 (C0066) | Same pattern in 2026 | T0883, T1694.001 default creds on MicroLogix 1100/1400, T0892 change credential, T0889 modify program, T0827 loss of control | attack.mitre.org/campaigns/C0066 |
| AI-assisted breach of Mexico government, Dec 2025-Feb 2026 (C0064) and AI-orchestrated campaign Sep 2025 (C0062) | Real attackers using AI agents; supports the webinar topic | T1190, T1003.003/.006 NTDS/DCSync, T1059.001, T1572 tunnelling, T1020 automated exfiltration | attack.mitre.org/campaigns/C0064, C0062 |

## 5. Audit of the current MUSUH prototype content
| Item | Status |
|---|---|
| 3 scenarios, names, hosts, genset, accounts | Made up, not labelled as fictional. **Fixed 5 Nov**: replaced by 3 sourced scenarios, labelled rekaan (SOURCES.md) |
| Attacker IPs | Were real third-party addresses. **Fixed 5 Nov**: RFC 5737 only, enforced by test |
| ATT&CK IDs | 21 checked on attack.mitre.org. 20 resolve correctly. **T0855 does not exist** in the current ATT&CK for ICS; the matching technique is T1692.001 Unauthorized Message: Command Message (used in C0028). **Fixed 5 Nov**: the OT step now uses T0836 Modify Parameter (FrostyGoop, C0041) |
| Log formats, Sigma-style rule names | Real formats, unchecked field by field; rule names are prototype labels |
| Score weights 25/40/25/10 | Proposed, no standard behind them |
| GO/NO-GO | Sourced (Keris Woomera EXCON) |

## 6. Verdict
Keep the MUSUH idea; replace all scenario content. The idea is supported by sources (sections 2 and 3). The content was not.

**Proposed** scenario set, each tied to a source, set on a fictional island the way SGS CYBEREX does, and labelled "Skenario latihan rekaan berbasis insiden nyata":
| # | Scenario | Built from | Replaces |
|---|---|---|---|
| 1 | Windows network takeover: vulnerability, privilege escalation, domain takeover | Keris Woomera 2026 scenario (TNI's own red-team format) | old "markas" IT chain |
| 2 | Ransomware on a data centre: Defender disabled, services stopped, shadow copies deleted, encryption | BSSN forensic timeline of PDNS 2 (June 2024) | old USB ransomware |
| 3 | Power for a base: IT foothold, then the generator controller manipulated over Modbus | 2015 Ukraine grid (C0028) + FrostyGoop Modbus (C0041) + exposed PLC default creds (C0031/C0066) | old genset chain |
| - | Insider exfiltration | No source found | **Dropped** |
Every step cites its ATT&CK campaign page. Every attacker IP comes from RFC 5737 ranges. Every name is generic (e.g. "Operator 1") or labelled rekaan.

## 7. Open questions for the organisers (ask in WhatsApp or tonight's webinar Q&A)
1. Is a fictional exercise scenario based on public incidents acceptable?
2. Is a browser-only offline prototype acceptable as the "link karya"?
3. Is there a juknis document beyond the website?
