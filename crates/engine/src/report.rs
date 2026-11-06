//! After-action narrative. Each sentence cites timeline rows as [#n]. `compile` drops any
//! sentence whose citations do not all exist: the same gate the full build applies to the
//! local language model. The prototype's "model" is a template writer with one deliberately
//! unsupported sentence, to show the gate working.
use serde::Serialize;
use crate::exercise::{fmt_j, Exercise};
use crate::score::Score;
use crate::types::{ActionKind, RowKind};

#[derive(Debug, Clone, Serialize)]
pub struct Dropped { pub sentence: String, pub bad: Vec<u32> }

#[derive(Debug, Clone, Serialize)]
pub struct Lesson { pub t: u32, pub route: String, pub name: String, pub tech: String, pub alerts: Vec<String>, pub stops: Vec<String>, pub gap: Option<String>, pub note: String, pub src: Vec<String> }

#[derive(Debug, Clone, Serialize)]
pub struct Narrative { pub kept: Vec<String>, pub dropped: Vec<Dropped> }

pub fn draft(ex: &Exercise, sc: &Score) -> Vec<String> {
    let tl = &ex.timeline;
    let mut s = vec![];
    let strip = |t: &str| t.trim_start_matches("MUSUH: ").to_string();
    if let Some(r) = tl.iter().find(|r| r.kind == RowKind::Red) { s.push(format!("MUSUH memulai serangan pada {}: {} [#{}].", fmt_j(r.t), strip(&r.text), r.n)); }
    if let Some(r) = tl.iter().find(|r| r.kind == RowKind::Alert) { s.push(format!("Peringatan pertama muncul pada {} [#{}].", fmt_j(r.t), r.n)); }
    match tl.iter().find(|r| r.kind == RowKind::Blue && r.action == Some(ActionKind::Incident)) {
        Some(r) => s.push(format!("Peserta menyatakan insiden pada {} [#{}].", fmt_j(r.t), r.n)),
        None => s.push("Peserta tidak menyatakan insiden secara resmi selama gladi.".into()),
    }
    if let Some(r) = tl.iter().find(|r| r.kind == RowKind::RedBlocked) { s.push(format!("Tindakan peserta pertama kali menahan MUSUH pada {}: {} [#{}].", fmt_j(r.t), r.text.trim_start_matches("MUSUH "), r.n)); }
    for r in tl.iter().filter(|r| r.kind == RowKind::Red && r.adapted) { s.push(format!("MUSUH beradaptasi dan mengambil jalur lain: {} [#{}].", strip(&r.text), r.n)); }
    if let Some(r) = tl.iter().rev().find(|r| r.kind == RowKind::Red) { s.push(format!("Langkah terjauh MUSUH: {} [#{}].", strip(&r.text), r.n)); }
    if let Some(r) = tl.iter().find(|r| r.kind == RowKind::Ot) { s.push(format!("Genset berhenti pada {} akibat perintah tulis Modbus [#{}].", fmt_j(r.t), r.n)); }
    if let Some(r) = tl.iter().find(|r| r.action == Some(ActionKind::GensetStart)) { s.push(format!("Peserta memulihkan genset pada {} [#{}].", fmt_j(r.t), r.n)); }
    s.push(format!("Peserta juga memperbarui antivirus di seluruh host [#{}].", tl.len() + 40));
    s.push(format!("Nilai akhir {} ({}), status {}.", sc.total, sc.grade, sc.verdict));
    s
}

pub fn compile(sentences: Vec<String>, ex: &Exercise) -> Narrative {
    let valid: std::collections::HashSet<u32> = ex.timeline.iter().map(|r| r.n).collect();
    let mut kept = vec![]; let mut dropped = vec![];
    for sentence in sentences {
        let cites: Vec<u32> = sentence.match_indices("[#").filter_map(|(i, _)| sentence[i + 2..].split(']').next()?.parse().ok()).collect();
        let bad: Vec<u32> = cites.into_iter().filter(|c| !valid.contains(c)).collect();
        if bad.is_empty() { kept.push(sentence) } else { dropped.push(Dropped { sentence, bad }) }
    }
    Narrative { kept, dropped }
}

fn need_label(n: &str) -> String {
    let (k, a) = n.split_once(':').unwrap_or((n, ""));
    match k { "on" | "reach" => format!("isolasi {a}"), "ip" => format!("blokir IP {a}"), "c2" => "putus kanal C2 (blokir IP C2 aktif)".into(),
        "cred" => format!("reset akun {a}"), "anycred" => "reset semua akun yang dicuri".into(), "modbus" => "blokir tulis Modbus".into(), _ => n.into() }
}

pub fn lessons(ex: &Exercise) -> Vec<Lesson> {
    ex.red.iter().filter(|r| r.executed).map(|r| {
        let mut stops: Vec<String> = vec![];
        for n in &r.route.needs { let l = need_label(n); if !stops.contains(&l) { stops.push(l); } }
        Lesson { t: r.t, route: r.route.id.clone(), name: r.route.name.clone(), tech: r.route.tech.clone(),
            alerts: ex.alerts.iter().filter(|a| a.t == r.t).map(|a| a.rule.clone()).collect(),
            stops, gap: r.route.gap.clone(), note: r.route.note.clone(), src: r.route.src.clone() }
    }).collect()
}
