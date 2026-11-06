//! Scoring from enemy ground truth vs trainee actions. No language model is involved.
//! Weights 25/40/25/10 are Proposed (Fery's design), GO/NO-GO is the Keris Woomera EXCON vocabulary.
use serde::Serialize;
use std::collections::BTreeSet;
use crate::exercise::{fmt_j, Exercise};
use crate::types::ActionKind;

#[derive(Debug, Clone, Serialize)]
pub struct ObjectiveResult { pub id: String, pub text: String, pub kind: String, pub go: bool, pub note: String }

#[derive(Debug, Clone, Serialize)]
pub struct Part { pub k: String, pub v: u32, pub max: u32, pub note: String }

#[derive(Debug, Clone, Serialize)]
pub struct Score {
    pub objectives: Vec<ObjectiveResult>, pub parts: Vec<Part>, pub total: u32, pub grade: String,
    pub ttd: Option<u32>, pub ttc: Option<u32>, pub phases_done: usize, pub total_phases: usize,
    pub wrong_isolations: usize, pub adaptations: usize, pub verdict: String, pub end_t: u32,
}

pub fn score(ex: &Exercise) -> Score {
    let sc = &ex.scenario;
    let exec: Vec<_> = ex.red.iter().filter(|r| r.executed).collect();
    let first = exec.first();
    // R2: detection counts only from a response taken after at least one alert existed.
    let first_alert_t = ex.alerts.first().map(|a| a.t);
    let detect_t = first_alert_t.and_then(|fa| ex.actions.iter()
        .find(|a| a.kind != ActionKind::GensetStart && a.t >= fa).map(|a| a.t));
    let ttd = match (detect_t, first) { (Some(d), Some(f)) => Some(d.saturating_sub(f.t)), _ => None };
    let ttc = match (ex.red.iter().find(|r| !r.executed), first) { (Some(s), Some(f)) => Some(s.t.saturating_sub(f.t)), _ => None };
    let mut touched: BTreeSet<String> = ex.ever_footholds();
    for r in &exec { touched.insert(r.route.host.clone()); }
    // R3: every action type can be wrong. Enemy infrastructure = outside addresses used by any route;
    // known accounts = accounts in emitted telemetry or stolen by the enemy.
    let enemy_ips: BTreeSet<String> = sc.phases.iter().flat_map(|p| p.options.iter())
        .flat_map(|r| [Some(r.from.clone()), r.fx.c2.clone()]).flatten().collect();
    let mut known_accounts: BTreeSet<String> = ex.stolen_accounts();
    for e in &ex.events { for k in ["TargetUserName", "SubjectUserName", "User"] {
        if let Some(u) = e.ev.f.get(k).and_then(|v| v.as_str()) { known_accounts.insert(u.rsplit('\\').next().unwrap_or(u).to_string()); }
    } }
    let wrong_of = |a: &crate::types::Action| { let arg = a.arg.as_deref().unwrap_or("");
        match a.kind { ActionKind::Isolate => !touched.contains(arg), ActionKind::Block => !enemy_ips.contains(arg),
            ActionKind::Reset => !known_accounts.contains(arg), _ => false } };
    let wrong = ex.actions.iter().filter(|a| wrong_of(a)).count();
    let phases_done = ex.phases_done().len();

    let objectives: Vec<ObjectiveResult> = sc.objectives.iter().map(|o| {
        let (go, note) = match o.kind.as_str() {
            "detect" => { let w = o.within.unwrap_or(120);
                (ttd.is_some_and(|d| d <= w), ttd.map_or("Tidak ada deteksi atau tindakan".into(), |d| format!("Deteksi pada +{d} dtk (batas {w} dtk)"))) }
            "prevent" => match exec.iter().find(|r| o.techs.contains(&r.route.tech) && o.host.as_ref().is_none_or(|h| *h == r.route.host)) {
                Some(hit) => (false, format!("MUSUH berhasil {} pada {}", hit.route.name, fmt_j(hit.t))),
                None => (true, "MUSUH tidak pernah berhasil melakukan langkah ini".into()) },
            "deny" => { let h = o.host.clone().unwrap_or_default();
                if ex.ever_foothold(&h) { (false, format!("MUSUH berpijak di {h}")) } else { (true, format!("MUSUH tidak pernah berpijak di {h}")) } }
            "ot" => { let g = &ex.genset; let w = o.within.unwrap_or(60);
                match (g.stopped_at, g.restored_at) {
                    (None, _) => (true, "Genset tidak pernah berhenti".into()),
                    (Some(s), Some(r)) if r - s <= w => (true, format!("Berhenti {}, pulih {} ({} dtk)", fmt_j(s), fmt_j(r), r - s)),
                    (Some(s), None) => (false, format!("Berhenti {}, tidak pulih", fmt_j(s))),
                    (Some(s), Some(r)) => (false, format!("Pulih setelah {} dtk (batas {w} dtk)", r - s)),
                } }
            _ => (false, "jenis sasaran tidak dikenal".into()),
        };
        ObjectiveResult { id: o.id.clone(), text: o.text.clone(), kind: o.kind.clone(), go, note }
    }).collect();

    let within = sc.objectives.iter().find(|o| o.kind == "detect").and_then(|o| o.within).unwrap_or(120) as f64;
    let det = match ttd { None => 0, Some(d) if (d as f64) <= within => 25,
        Some(d) => (25.0 * (1.0 - (d as f64 - within) / (2.0 * within))).round().max(0.0) as u32 };
    let deny = (40.0 * (1.0 - phases_done as f64 / sc.phases.len() as f64)).round() as u32;
    let impact: Vec<_> = objectives.iter().filter(|o| o.kind != "detect").collect();
    let impact_ok = impact.iter().filter(|o| o.go).count();
    let imp = (25.0 * impact_ok as f64 / impact.len().max(1) as f64).round() as u32;
    let acc = 10u32.saturating_sub(5 * wrong as u32);
    let parts = vec![
        Part { k: "Deteksi".into(), v: det, max: 25, note: ttd.map_or("tidak ada".into(), |d| format!("+{d} dtk")) },
        Part { k: "Penangkalan".into(), v: deny, max: 40, note: format!("MUSUH menuntaskan {phases_done}/{} tahap", sc.phases.len()) },
        Part { k: "Dampak dicegah".into(), v: imp, max: 25, note: format!("{impact_ok}/{} sasaran aman", impact.len()) },
        Part { k: "Ketepatan".into(), v: acc, max: 10, note: if wrong > 0 { format!("{wrong} tindakan keliru (host, IP atau akun yang tidak terkait MUSUH)") } else { "tanpa tindakan keliru".into() } },
    ];
    let total: u32 = parts.iter().map(|p| p.v).sum();
    let grade = match total { 85.. => "SANGAT BAIK", 70..=84 => "BAIK", 50..=69 => "CUKUP", _ => "KURANG" }.to_string();
    let verdict = if objectives.iter().all(|o| o.go) { "GO" } else { "NO-GO" }.to_string();
    Score { objectives, parts, total, grade, ttd, ttc, phases_done, total_phases: sc.phases.len(), wrong_isolations: wrong,
        adaptations: ex.thoughts.iter().filter(|t| t.mood == crate::types::Mood::Adapt).count(), verdict, end_t: ex.t }
}
