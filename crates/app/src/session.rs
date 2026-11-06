//! One running exercise per console (single-laptop product). The engine is pure; this module
//! owns the wall-clock ticker, speed and pause, and turns engine state into the view model
//! the console renders. Rapor files are written to ./rapor/ next to the binary's working dir.
use musuh_engine::report::{compile, draft, lessons};
use musuh_engine::*;
use serde::Serialize;
use serde_json::{json, Value};
use std::sync::Arc;
use tokio::sync::{broadcast, Mutex};

pub struct Session {
    pub ex: Exercise,
    /// Monotonic version of the state, sent with every snapshot so a reconnecting console
    /// can tell a stale view from a fresh one (R12).
    pub seq: u64,
    /// Client command ids already applied; a retried command is ignored (R12).
    pub seen_cmd: std::collections::HashSet<String>,
    /// The trainer view was opened during this run (R7); recorded, shown in the rapor.
    pub trainer_view_used: bool,
    /// Aborted runs (Batalkan) never produce a rapor (R1).
    pub aborted: bool,
    /// Identity of this run, so a response from an earlier run is never mistaken for this one (B3).
    pub run_id: String,
    /// Where the rapor was saved, or why saving failed (B5).
    pub saved: Option<Result<String, String>>,
    pub mode: String,          // "latih" shows recommended actions, "uji" hides them
    pub speed: u32,            // simulated seconds per real second
    pub paused: bool,
    pub rapor: Option<Rapor>,
}

#[derive(Clone)]
pub struct AppState {
    pub lib: Arc<Library>,
    pub session: Arc<Mutex<Option<Session>>>,
    pub tx: broadcast::Sender<String>,
    pub today: Arc<String>,
}

#[derive(Serialize)]
struct Recommendation { kind: String, arg: Option<String>, label: String }

/// Actions a defender could take from what an alert shows (no knowledge of the enemy plan).
fn recommendations(ex: &Exercise, a: &Alert) -> Vec<Recommendation> {
    let mut out = vec![];
    let hs = ex.host_states();
    if hs.iter().any(|h| h.id == a.host && !h.isolated) {
        out.push(Recommendation { kind: "isolate".into(), arg: Some(a.host.clone()), label: format!("Isolasi {}", a.host) });
    }
    let text = serde_json::to_string(&a.ev.f).unwrap_or_default();
    let mut ips: Vec<String> = vec![];
    for tok in text.split(|c: char| !(c.is_ascii_digit() || c == '.')) {
        let p: Vec<&str> = tok.split('.').collect();
        if p.len() == 4 && p.iter().all(|x| x.parse::<u8>().is_ok()) && !musuh_engine::detect::is_private(tok) && tok != "0.0.0.0" && !ips.contains(&tok.to_string()) {
            ips.push(tok.to_string());
        }
    }
    let blocked = ex.blocked_ips();
    for ip in ips.into_iter().filter(|i| !blocked.contains(i)) { out.push(Recommendation { kind: "block".into(), label: format!("Blokir {ip}"), arg: Some(ip) }); }
    let f = &a.ev.f;
    let user = f.get("User").and_then(|v| v.as_str()).filter(|u| !u.contains("APPPOOL") && !u.contains("AUTHORITY")).and_then(|u| u.split('\\').nth(1));
    let acc = f.get("TargetUserName").and_then(|v| v.as_str()).or(f.get("SubjectUserName").and_then(|v| v.as_str())).or(user);
    if let Some(acc) = acc { if !ex.reset_accounts().contains(&acc.to_string()) {
        out.push(Recommendation { kind: "reset".into(), arg: Some(acc.into()), label: format!("Reset akun {acc}") });
    } }
    if a.host.starts_with("PLC") && ex.has_ot() && !ex.modbus_blocked() {
        out.push(Recommendation { kind: "modbus-block".into(), arg: None, label: "Blokir tulis Modbus".into() });
    }
    out
}

fn level_status(level: &str) -> &'static str {
    // R8: Sigma level -> Astro status. Never green for an alert.
    match level { "critical" => "critical", "high" => "serious", _ => "caution" }
}
fn rank(st: &str) -> u8 { match st { "critical" => 5, "serious" => 4, "caution" => 3, _ => 0 } }

/// Everything the console needs for one frame.
/// Trainee view (R6): built from observations only. Ground truth (enemy footholds, moves,
/// phases, thoughts, red steps) is added only for the trainer view or after the run (R7).
pub fn view(lib: &Library, s: &Session, reveal: bool) -> Value {
    let ex = &s.ex;
    let reveal = reveal || ex.finished;
    let rule = |id: &str| lib.rules.iter().find(|r| r.id == id).cloned();
    let alerts: Vec<Value> = ex.alerts.iter().map(|a| {
        let r = rule(&a.rule).unwrap();
        json!({ "n": a.n, "t": a.t, "host": a.host, "rule": r.id, "title": r.title, "level": r.level, "status": level_status(&r.level), "own": r.own,
            "sigmaTitle": r.sigma_title, "sid": r.sid, "path": r.path, "simplified": r.simplified, "ev": a.ev,
            "recs": if s.mode == "latih" { serde_json::to_value(recommendations(ex, a)).unwrap() } else { json!([]) } })
    }).collect();
    // Asset status from what the defender can see.
    let hs = ex.host_states();
    let assets: Vec<Value> = ex.scenario.hosts.iter().map(|h| {
        let st = hs.iter().find(|x| x.id == h.id).unwrap();
        let worst = ex.alerts.iter().filter(|a| a.host == h.id).map(|a| level_status(&rule(&a.rule).unwrap().level)).max_by_key(|s| rank(s));
        let n_alerts = ex.alerts.iter().filter(|a| a.host == h.id).count();
        let (status, sub) = if st.isolated { ("off", "Diisolasi".to_string()) }
            else if let Some(w) = worst { (w, format!("{n_alerts} peringatan")) }
            else { ("standby", "Dipantau, tanpa indikasi".to_string()) };
        let mut a = json!({ "id": h.id, "ip": h.ip, "role": h.role, "os": h.os, "seg": h.seg, "status": status, "sub": sub, "isolated": st.isolated });
        if reveal { a["truth"] = json!({ "compromised": st.compromised, "foothold": st.foothold }); }
        a
    }).collect();
    let observed: Vec<String> = seen_ips(ex);
    let outside: Vec<Value> = ex.scenario.outside.iter().filter(|o| reveal || observed.contains(&o.id) || !o.id.chars().next().unwrap().is_ascii_digit())
        .map(|o| { let is_ip = o.id.chars().next().unwrap().is_ascii_digit();
            json!({ "id": o.id, "role": if reveal || !is_ip { o.role.clone() } else { "Alamat luar teramati".into() }, "blocked": ex.blocked_ips().contains(&o.id), "ip": is_ip }) }).collect();
    let events: Vec<Value> = ex.events.iter().rev().map(|e| json!({ "n": e.n, "t": e.t, "ev": e.ev, "rules": e.rules })).collect();
    let mut v = json!({
        "seq": s.seq, "runId": s.run_id, "saved": s.saved.as_ref().map(|r| match r { Ok(p) => json!({ "ok": true, "path": p }), Err(e) => json!({ "ok": false, "error": e }) }), "running": ex.running, "finished": ex.finished, "handedOver": ex.handed_over_at.is_some(), "aborted": s.aborted,
        "endReason": ex.end_reason, "t": ex.t, "clock": fmt_j(ex.t), "duration": ex.scenario.duration,
        "code": ex.code, "mode": s.mode, "speed": s.speed, "paused": s.paused, "trainee": ex.trainee, "reveal": reveal, "trainerViewUsed": s.trainer_view_used,
        "scenario": { "id": ex.scenario.id, "title": ex.scenario.title, "brief": ex.scenario.brief, "basis": ex.scenario.basis,
            "objectives": ex.scenario.objectives, "hasOT": ex.has_ot() },
        "assets": assets, "outside": outside, "blockedIps": ex.blocked_ips(), "resetAccounts": ex.reset_accounts(),
        "modbusBlocked": ex.modbus_blocked(), "genset": ex.genset, "incidentAt": ex.incident_at,
        "alerts": alerts, "events": events, "actions": ex.actions,
        "seenIps": observed, "seenAccounts": seen_accounts(ex),
    });
    if reveal {
        let done = ex.phases_done();
        v["phases"] = json!(ex.scenario.phases.iter().enumerate().map(|(i, p)| json!({ "key": p.key, "goal": p.goal,
            "state": if done.contains(&p.key) { "done" } else if i == ex.phase_idx() && ex.waiting() { "held" } else if i < ex.phase_idx() { "skipped" } else { "pending" } })).collect::<Vec<_>>());
        v["thoughts"] = json!(ex.thoughts.iter().rev().collect::<Vec<_>>());
        v["moves"] = json!(ex.moves);
        v["timeline"] = json!(ex.timeline);
        v["outsideAll"] = json!(ex.scenario.outside);
    }
    if ex.finished {
        let sc = score(ex);
        let narrative = compile(draft(ex, &sc), ex);
        v["score"] = json!(sc);
        v["narrative"] = json!(narrative);
        v["lessons"] = json!(lessons(ex));
        v["rapor"] = json!(s.rapor);
        v["red"] = json!(ex.red.iter().map(|r| json!({ "t": r.t, "phase": r.phase, "executed": r.executed, "why": r.why,
            "route": r.route.id, "name": r.route.name, "tech": r.route.tech, "tactic": r.route.tactic, "host": r.route.host,
            "note": r.route.note, "src": r.route.src, "gap": r.route.gap })).collect::<Vec<_>>());
    }
    v
}

/// IPs and accounts the trainee has seen in alerts: the only choices offered in the action pickers,
/// so the console never needs free typing and never leaks what the enemy has not shown yet.
fn seen_ips(ex: &Exercise) -> Vec<String> {
    let mut out: Vec<String> = vec![];
    for a in &ex.events {
        let text = serde_json::to_string(&a.ev.f).unwrap_or_default();
        for tok in text.split(|c: char| !(c.is_ascii_digit() || c == '.')) {
            let p: Vec<&str> = tok.split('.').collect();
            if p.len() == 4 && p.iter().all(|x| x.parse::<u8>().is_ok()) && !musuh_engine::detect::is_private(tok) && tok != "0.0.0.0" && !out.contains(&tok.to_string()) { out.push(tok.into()); }
        }
    }
    out
}
fn seen_accounts(ex: &Exercise) -> Vec<String> {
    let mut out: Vec<String> = vec![];
    for a in &ex.events {
        for k in ["TargetUserName", "SubjectUserName", "User"] {
            if let Some(u) = a.ev.f.get(k).and_then(|v| v.as_str()) {
                if u.contains("APPPOOL") || u.contains("AUTHORITY") { continue; }
                let name = u.rsplit('\\').next().unwrap_or(u).to_string();
                if !out.contains(&name) { out.push(name); }
            }
        }
    }
    out
}
