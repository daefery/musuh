//! The exercise: clock, deterministic adaptive enemy, blue actions. Pure: no IO, no wall clock.
//! Driven one simulated second at a time by `tick()`. Same scenario + code + actions at the
//! same seconds always produce the same timeline (this is what makes the rapor verifiable).
use std::collections::{BTreeSet, HashSet};
use crate::detect::detect;
use crate::model::{Library, Route, Rule, Scenario};
use crate::rng::{fnv1a, Mulberry32};
use crate::types::*;

pub fn fmt_j(t: u32) -> String { format!("J+{:02}:{:02}", t / 60, t % 60) }

struct PlanPhase { at: u32, order: Vec<Route> }

pub struct Exercise {
    pub scenario: Scenario,
    rules: Vec<Rule>,
    pub code: String,
    pub trainee: Trainee,
    plan: Vec<PlanPhase>,
    pub t: u32,
    pub running: bool,
    pub finished: bool,
    pub end_reason: Option<String>,
    isolated: HashSet<String>,
    compromised: HashSet<String>,
    footholds: BTreeSet<String>,
    ever_foothold: BTreeSet<String>,
    stolen: BTreeSet<String>,
    blocked_ips: BTreeSet<String>,
    reset_accounts: BTreeSet<String>,
    c2: Option<(String, String)>,
    c2_retry: Option<u32>,
    modbus_blocked: bool,
    pub genset: Genset,
    phase_idx: usize,
    next_at: u32,
    waiting_why: Option<String>,
    done_at: Option<u32>,
    crippled_at: Option<u32>,
    pub alerts: Vec<Alert>,
    pub events: Vec<Emitted>,
    /// Set when the trainee hands over (R1): no more actions, clock runs to the natural end.
    pub handed_over_at: Option<u32>,
    pub actions: Vec<Action>,
    pub red: Vec<RedStep>,
    pub thoughts: Vec<Thought>,
    pub moves: Vec<Move>,
    pub incident_at: Option<u32>,
    pub timeline: Vec<Row>,
}

impl Exercise {
    pub fn new(lib: &Library, scenario_id: &str, code: &str, trainee: Trainee) -> Option<Exercise> {
        let scenario = lib.scenario(scenario_id)?.clone();
        let mut rng = Mulberry32::new(fnv1a(&format!("{}|{}", scenario.id, code)));
        // Seeded plan: per-phase jitter (0-4 s) and the order of equal-priority routes.
        let plan = scenario.phases.iter().map(|ph| {
            let at = ph.t + (rng.next_f64() * 5.0).floor() as u32;
            let mut keyed: Vec<(f64, Route)> = ph.options.iter().map(|o| (rng.next_f64(), o.clone())).collect();
            keyed.sort_by(|a, b| a.1.prio.cmp(&b.1.prio).then(a.0.partial_cmp(&b.0).unwrap()));
            PlanPhase { at, order: keyed.into_iter().map(|k| k.1).collect() }
        }).collect::<Vec<_>>();
        let next_at = plan.first().map(|p| p.at).unwrap_or(0);
        let footholds: BTreeSet<String> = scenario.start.on.iter().cloned().collect();
        let compromised: HashSet<String> = footholds.iter().cloned().collect();
        Some(Exercise {
            rules: lib.rules.clone(), code: code.to_string(), trainee, plan, t: 0, running: false, finished: false,
            end_reason: None, isolated: HashSet::new(), compromised, ever_foothold: footholds.clone(), footholds,
            stolen: scenario.start.creds.iter().cloned().collect(), blocked_ips: BTreeSet::new(),
            reset_accounts: BTreeSet::new(), c2: None, c2_retry: None, modbus_blocked: false,
            genset: Genset { running: true, kw: 180, stopped_at: None, restored_at: None },
            phase_idx: 0, next_at, waiting_why: None, done_at: None, crippled_at: None,
            alerts: vec![], events: vec![], handed_over_at: None, actions: vec![], red: vec![], thoughts: vec![], moves: vec![], incident_at: None,
            timeline: vec![], scenario,
        })
    }

    pub fn has_ot(&self) -> bool { self.scenario.hosts.iter().any(|h| h.seg == "OT") }
    fn has_host(&self, id: &str) -> bool { self.scenario.hosts.iter().any(|h| h.id == id) }
    fn alive(&self, id: &str) -> bool { self.footholds.contains(id) && !self.isolated.contains(id) }
    fn ot_foothold(&self) -> bool { self.scenario.hosts.iter().any(|h| h.seg == "OT" && self.alive(&h.id)) }
    fn ot_plc(&self) -> String {
        self.scenario.hosts.iter().find(|h| h.seg == "OT" && h.id.contains("PLC")).map(|h| h.id.clone()).unwrap_or_else(|| "PLC".into())
    }

    pub fn host_states(&self) -> Vec<HostState> {
        self.scenario.hosts.iter().map(|h| HostState {
            id: h.id.clone(), isolated: self.isolated.contains(&h.id),
            compromised: self.compromised.contains(&h.id), foothold: self.alive(&h.id),
        }).collect()
    }
    pub fn blocked_ips(&self) -> Vec<String> { self.blocked_ips.iter().cloned().collect() }
    pub fn reset_accounts(&self) -> Vec<String> { self.reset_accounts.iter().cloned().collect() }
    pub fn modbus_blocked(&self) -> bool { self.modbus_blocked }
    pub fn ever_foothold(&self, id: &str) -> bool { self.ever_foothold.contains(id) }
    pub fn ever_footholds(&self) -> BTreeSet<String> { self.ever_foothold.clone() }
    pub fn stolen_accounts(&self) -> BTreeSet<String> { self.stolen.clone() }
    pub fn c2_ip(&self) -> Option<String> { self.c2.as_ref().map(|c| c.0.clone()) }
    pub fn phases_done(&self) -> BTreeSet<String> { self.red.iter().filter(|r| r.executed).map(|r| r.phase.clone()).collect() }
    pub fn phase_idx(&self) -> usize { self.phase_idx }
    pub fn waiting(&self) -> bool { self.waiting_why.is_some() }

    fn stamp(&mut self, kind: RowKind, text: String) -> u32 {
        let n = self.timeline.len() as u32 + 1;
        self.timeline.push(Row { n, t: self.t, kind, text, route: None, host: None, rule: None, action: None, adapted: false });
        n
    }
    fn think(&mut self, text: impl Into<String>, mood: Mood) { self.thoughts.push(Thought { t: self.t, text: text.into(), mood }); }
}

// ---------- the enemy ----------
impl Exercise {
    /// Why a route requirement is not met, or None when it is.
    fn unmet(&self, need: &str) -> Option<String> {
        let (k, a) = need.split_once(':').unwrap_or((need, ""));
        match k {
            "on" => if self.alive(a) { None } else if self.ever_foothold.contains(a) { Some(format!("pijakan di {a} hilang karena diisolasi")) } else { Some(format!("belum punya pijakan di {a}")) },
            "reach" => if self.isolated.contains(a) { Some(format!("{a} sudah diisolasi")) } else { None },
            "ip" => if self.blocked_ips.contains(a) { Some(format!("IP {a} diblokir firewall")) } else { None },
            "c2" => match &self.c2 { Some((ip, h)) if !self.blocked_ips.contains(ip) && self.alive(h) => None, _ => Some("kanal C2 terputus".into()) },
            "cred" => if !self.stolen.contains(a) { Some(format!("belum punya kredensial {a}")) } else if self.reset_accounts.contains(a) { Some(format!("kredensial {a} sudah direset")) } else { None },
            "anycred" => if self.stolen.iter().any(|c| !self.reset_accounts.contains(c)) { None } else { Some("semua kredensial curian sudah direset".into()) },
            "modbus" => if self.modbus_blocked { Some("tulis Modbus diblokir".into()) } else { None },
            _ => None,
        }
    }

    fn execute(&mut self, route: Route, phase: &str, adapted: bool) {
        self.red.push(RedStep { route: route.clone(), phase: phase.to_string(), t: self.t, executed: true, why: None });
        if self.has_host(&route.host) { self.compromised.insert(route.host.clone()); }
        let targets = if route.fx.on.is_empty() { vec![route.host.clone()] } else { route.fx.on.clone() };
        for to in targets { self.moves.push(Move { from: route.from.clone(), to, t: self.t, ok: true }); }
        for h in &route.fx.on { self.footholds.insert(h.clone()); self.ever_foothold.insert(h.clone()); self.compromised.insert(h.clone()); }
        for c in &route.fx.creds { self.stolen.insert(c.clone()); }
        if let Some(ip) = &route.fx.c2 { self.c2 = Some((ip.clone(), route.host.clone())); }
        let n = self.stamp(RowKind::Red, format!("MUSUH: {} ({}, {})", route.name, route.tech, route.tactic));
        let row = self.timeline.last_mut().unwrap();
        row.route = Some(route.id.clone()); row.host = Some(route.host.clone()); row.adapted = adapted;
        let _ = n;
        for log in &route.logs {
            let hits: Vec<String> = detect(&self.rules, log, &self.scenario.hosts).iter().map(|r| r.id.clone()).collect();
            let en = self.events.len() as u32 + 1;
            self.events.push(Emitted { n: en, t: self.t, ev: log.clone(), rules: hits.clone() });
            for rid in hits {
                let title = self.rules.iter().find(|r| r.id == rid).map(|r| (r.title.clone(), r.level.clone())).unwrap();
                let an = self.alerts.len() as u32 + 1;
                self.alerts.push(Alert { n: an, t: self.t, rule: rid.clone(), host: log.host.clone(), ev: log.clone() });
                self.stamp(RowKind::Alert, format!("Peringatan {rid} \"{}\" ({}) di {}", title.0, title.1, log.host));
                let row = self.timeline.last_mut().unwrap();
                row.rule = Some(rid); row.host = Some(log.host.clone());
            }
        }
        if route.fx.ot.as_deref() == Some("stop") && self.genset.running {
            self.genset = Genset { running: false, kw: 0, stopped_at: Some(self.t), restored_at: None };
            self.stamp(RowKind::Ot, format!("Genset BERHENTI: register pengendali ditulis lewat Modbus dari {}", route.from));
            self.timeline.last_mut().unwrap().host = Some(route.host.clone());
        }
    }

    fn next_phase(&mut self) {
        self.phase_idx += 1;
        if self.phase_idx < self.scenario.phases.len() { self.next_at = self.plan[self.phase_idx].at.max(self.t + 5); }
        else { self.done_at = Some(self.t); }
    }

    /// First feasible route in the seeded order wins. Blocked routes are recorded as ground truth.
    fn attempt_phase(&mut self) {
        let phase = self.scenario.phases[self.phase_idx].clone();
        let order = self.plan[self.phase_idx].order.clone();
        let mut blocked: Vec<(Route, String)> = vec![];
        for route in order {
            match route.needs.iter().find_map(|n| self.unmet(n)) {
                None => {
                    if let Some((b, why)) = blocked.first() {
                        self.think(format!("Jalur \"{}\" tertutup ({}). Beralih: {}.", b.name, why, route.name), Mood::Adapt);
                    }
                    let adapted = !blocked.is_empty();
                    let think = route.think.clone();
                    self.execute(route, &phase.key, adapted);
                    self.think(think, Mood::Ok);
                    self.waiting_why = None;
                    self.next_phase();
                    if self.done_at == Some(self.t) { self.think("Semua sasaran saya tercapai.", Mood::Ok); }
                    return;
                }
                Some(why) => blocked.push((route, why)),
            }
        }
        let mut reasons: Vec<String> = vec![];
        for (_, w) in &blocked { if !reasons.contains(w) { reasons.push(w.clone()); } }
        let why = reasons.join("; ");
        for (r, w) in &blocked {
            let seen = self.red.iter().any(|x| x.route.id == r.id && !x.executed && x.why.as_deref() == Some(w.as_str()));
            if !seen {
                self.red.push(RedStep { route: r.clone(), phase: phase.key.clone(), t: self.t, executed: false, why: Some(w.clone()) });
                self.moves.push(Move { from: r.from.clone(), to: r.host.clone(), t: self.t, ok: false });
            }
        }
        if phase.optional {
            self.stamp(RowKind::RedBlocked, format!("MUSUH gagal {}: {}. Tahap dilewati.", phase.goal, why));
            self.think(format!("Tidak bisa {} ({}). Saya cari jalan lain.", phase.goal, why), Mood::Adapt);
            self.next_phase();
            return;
        }
        if self.waiting_why.as_deref() != Some(why.as_str()) {
            self.stamp(RowKind::RedBlocked, format!("MUSUH tertahan saat {}: {}", phase.goal, why));
            self.think(format!("Saya tertahan: tidak bisa {} karena {}. Menunggu celah.", phase.goal, why), Mood::Stuck);
            self.waiting_why = Some(why);
        }
        self.next_at = self.t + 15;
    }

    /// After the active C2 IP is blocked, try the remaining channels of the C2 phase.
    fn c2_recover(&mut self) {
        self.c2_retry = None;
        let Some(idx) = self.scenario.phases.iter().position(|p| p.c2) else { return };
        let key = self.scenario.phases[idx].key.clone();
        for route in self.plan[idx].order.clone() {
            let ip = route.fx.c2.clone();
            if let (Some((cur, h)), Some(ip)) = (&self.c2, &ip) {
                if cur == ip && !self.blocked_ips.contains(ip) && self.alive(h) { return; }
            }
            if route.needs.iter().all(|n| self.unmet(n).is_none()) {
                self.think(format!("Kanal C2 lama putus. Membuka kanal cadangan: {}.", route.name), Mood::Adapt);
                self.execute(route, &key, true);
                return;
            }
        }
        self.stamp(RowKind::RedBlocked, "MUSUH gagal membuka kanal C2 cadangan".into());
        self.think("Semua kanal C2 saya tertutup. Saya buta dan tuli di dalam jaringan ini.", Mood::Stuck);
    }
}

// ---------- clock and blue actions ----------
pub type ActResult = Result<String, (String, bool)>; // Ok(text) | Err((message, penalty))

impl Exercise {
    pub fn start(&mut self) {
        if self.running || self.finished { return; }
        self.running = true;
        let t = self.scenario.title.clone();
        self.stamp(RowKind::Sys, format!("Gladi dimulai. Kode latihan {}. Skenario: {}", self.code, t));
    }

    pub fn tick(&mut self) {
        if self.finished || !self.running { return; }
        self.t += 1;
        if self.c2_retry.is_some_and(|r| self.t >= r) { self.c2_recover(); }
        if self.phase_idx < self.scenario.phases.len() && self.t >= self.next_at { self.attempt_phase(); }
        let live_any = self.footholds.iter().any(|h| self.alive(h));
        if !live_any && !self.ever_foothold.is_empty() && self.phase_idx < self.scenario.phases.len() && self.crippled_at.is_none() {
            self.crippled_at = Some(self.t);
            self.stamp(RowKind::Sys, "MUSUH kehilangan semua pijakan di jaringan".into());
            self.think("Semua pijakan saya hilang. Operasi gagal.", Mood::Stuck);
        }
        let grace = if self.has_ot() { 45 } else { 20 };
        if self.crippled_at.is_some_and(|c| self.t >= c + 10) { self.finish("MUSUH dilumpuhkan"); }
        else if self.done_at.is_some_and(|d| self.t >= d + grace) || self.t >= self.scenario.duration { self.finish("Waktu latihan habis"); }
    }

    pub fn finish(&mut self, reason: &str) {
        if self.finished { return; }
        self.running = false; self.finished = true; self.end_reason = Some(reason.to_string());
        self.stamp(RowKind::Sys, format!("Gladi selesai: {reason}"));
    }

    /// R1: the trainee ends their turn. No more actions; the remaining time is still played
    /// so that every objective is actually tested. The caller keeps ticking until `finished`.
    pub fn handover(&mut self) {
        if self.finished || self.handed_over_at.is_some() { return; }
        self.handed_over_at = Some(self.t);
        self.stamp(RowKind::Sys, "Peserta menyerahkan konsol. Sisa waktu latihan dijalankan sampai selesai".into());
    }

    pub fn act(&mut self, kind: ActionKind, arg: Option<&str>) -> ActResult {
        if !self.running { return Err(("Gladi belum berjalan".into(), false)); }
        if self.handed_over_at.is_some() { return Err(("Konsol sudah diserahkan".into(), false)); }
        let arg_s = arg.unwrap_or("").trim().to_string();
        let text = match kind {
            ActionKind::Incident => {
                if self.incident_at.is_some() { return Err(("Insiden sudah dinyatakan".into(), false)); }
                self.incident_at = Some(self.t); "Peserta menyatakan INSIDEN".to_string()
            }
            ActionKind::Isolate => {
                if !self.has_host(&arg_s) { return Err(("Host tidak ada".into(), false)); }
                if !self.isolated.insert(arg_s.clone()) { return Err((format!("{arg_s} sudah diisolasi"), false)); }
                if self.c2.as_ref().is_some_and(|c| c.1 == arg_s) { self.think(format!("{arg_s} diisolasi. Kanal C2 saya di sana ikut putus."), Mood::Hit); }
                else if self.footholds.contains(&arg_s) { self.think(format!("{arg_s} diisolasi. Saya kehilangan pijakan di sana."), Mood::Hit); }
                format!("Peserta mengisolasi host {arg_s}")
            }
            ActionKind::Block => {
                let ok = arg_s.split('.').count() == 4 && arg_s.split('.').all(|p| p.parse::<u8>().is_ok());
                if !ok { return Err(("Format IP tidak valid".into(), false)); }
                if !self.blocked_ips.insert(arg_s.clone()) { return Err(("IP sudah diblokir".into(), false)); }
                if self.c2.as_ref().is_some_and(|c| c.0 == arg_s) {
                    self.think(format!("Kanal C2 ke {arg_s} diputus. Saya coba kanal cadangan."), Mood::Hit);
                    self.c2_retry = Some(self.t + 10);
                }
                format!("Peserta memblokir IP {arg_s} di firewall")
            }
            ActionKind::Reset => {
                if arg_s.is_empty() { return Err(("Isi nama akun".into(), false)); }
                if !self.reset_accounts.insert(arg_s.clone()) { return Err(("Akun sudah direset".into(), false)); }
                if self.stolen.contains(&arg_s) { self.think(format!("Kredensial {arg_s} direset. Kunci itu tidak berguna lagi."), Mood::Hit); }
                format!("Peserta mereset kredensial akun {arg_s}")
            }
            ActionKind::ModbusBlock => {
                if !self.has_ot() { return Err(("Tidak ada segmen OT".into(), false)); }
                if self.modbus_blocked { return Err(("Tulis Modbus sudah diblokir".into(), false)); }
                self.modbus_blocked = true; format!("Peserta memblokir perintah tulis Modbus ke {}", self.ot_plc())
            }
            ActionKind::GensetStart => {
                if self.genset.running { return Err(("Genset sudah menyala".into(), false)); }
                if !self.modbus_blocked && self.ot_foothold() {
                    return Err(("Genset akan dimatikan lagi: MUSUH masih bisa menulis Modbus. Blokir tulis Modbus dulu.".into(), true));
                }
                self.genset.running = true; self.genset.kw = 180; self.genset.restored_at = Some(self.t);
                "Peserta menyalakan ulang genset dari panel lokal".to_string()
            }
        };
        let n = self.actions.len() as u32 + 1;
        let stored_arg = if arg_s.is_empty() { None } else { Some(arg_s) };
        self.actions.push(Action { n, t: self.t, kind, arg: stored_arg, text: text.clone() });
        self.stamp(RowKind::Blue, text.clone());
        self.timeline.last_mut().unwrap().action = Some(kind);
        Ok(text)
    }
}
