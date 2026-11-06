//! Rapor Prestasi Siber: the verifiable record of one exercise.
//! The hash covers engine version, scenario, code, date, trainee, actions, end time, score and verdict.
//! Verification re-runs the whole exercise from the recorded actions: an edited score fails even
//! when the hash is recomputed, because the replay produces the real score.
use serde::{Deserialize, Serialize};
use serde_json::json;
use sha2::{Digest, Sha256};
use crate::exercise::Exercise;
use crate::model::Library;
use crate::score::{score, Score};
use crate::types::{ActionKind, Trainee};

pub const ENGINE_VERSION: &str = "musuh-rs-0.4";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct RecordedAction(pub u32, pub String, pub Option<String>);

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Rapor {
    pub v: String, pub scenario: String, pub code: String, pub date: String, pub mode: String, pub speed: u32,
    /// The trainer view (enemy ground truth) was opened during the run. Recorded, not a failure.
    #[serde(default)] pub trainer_view: bool,
    pub trainee: Trainee, pub actions: Vec<RecordedAction>, pub end_t: u32, pub handover_at: Option<u32>, pub finished_by: String,
    pub total: u32, pub verdict: String, pub grade: String, pub hash: String, pub verif: String,
}

fn canonical(r: &Rapor) -> String {
    json!({ "v": r.v, "s": r.scenario, "c": r.code, "d": r.date, "m": r.mode, "x": r.speed, "tv": r.trainer_view, "gr": r.grade, "f": r.finished_by,
        "p": [r.trainee.nama, r.trainee.pangkat, r.trainee.nrp, r.trainee.satuan],
        "a": r.actions, "e": r.end_t, "h": r.handover_at, "n": r.total, "g": r.verdict }).to_string()
}

pub fn sha256_hex(s: &str) -> String { Sha256::digest(s.as_bytes()).iter().map(|b| format!("{b:02x}")).collect() }

/// Verification code from a hash. Only called on a well-formed 64-char hex digest.
fn verif_code(hash: &str) -> String {
    let up = hash[..12].to_uppercase();
    format!("{}-{}-{}", &up[0..4], &up[4..8], &up[8..12])
}

fn well_formed_hash(h: &str) -> bool { h.len() == 64 && h.bytes().all(|b| b.is_ascii_hexdigit()) }

/// Recompute the hash of a record (used by tests to model a forger who recomputes it).
pub fn rehash(r: &Rapor) -> String { sha256_hex(&canonical(r)) }

pub fn make_rapor(ex: &Exercise, date: &str, mode: &str, speed: u32) -> Rapor { make_rapor_with(ex, date, mode, speed, false) }

pub fn make_rapor_with(ex: &Exercise, date: &str, mode: &str, speed: u32, trainer_view: bool) -> Rapor {
    let sc = score(ex);
    let mut r = Rapor {
        v: ENGINE_VERSION.into(), scenario: ex.scenario.id.clone(), code: ex.code.clone(), date: date.into(), mode: mode.into(), speed, trainer_view,
        trainee: ex.trainee.clone(),
        actions: ex.actions.iter().map(|a| RecordedAction(a.t, a.kind.as_str().into(), a.arg.clone())).collect(),
        end_t: ex.t, handover_at: ex.handed_over_at, finished_by: ex.end_reason.clone().unwrap_or_default(),
        total: sc.total, verdict: sc.verdict, grade: sc.grade, hash: String::new(), verif: String::new(),
    };
    r.hash = sha256_hex(&canonical(&r));
    r.verif = verif_code(&r.hash);
    r
}

/// Re-run an exercise headless: same scenario, same code, same actions at the same seconds.
/// `handover_at`: when the trainee handed over (R1); after that no actions are applied and the
/// clock runs to the natural end. `None` = ran to the natural end while acting (legacy fixtures).
pub fn replay_handover(lib: &Library, scenario: &str, code: &str, trainee: Trainee, actions: &[RecordedAction], handover_at: Option<u32>) -> Option<Exercise> {
    replay_checked(lib, scenario, code, trainee, actions, handover_at).map(|(ex, _)| ex)
}

/// Replay and count how many recorded actions the engine accepted, in order.
fn replay_checked(lib: &Library, scenario: &str, code: &str, trainee: Trainee, actions: &[RecordedAction], handover_at: Option<u32>) -> Option<(Exercise, usize)> {
    let mut ex = Exercise::new(lib, scenario, code, trainee)?;
    ex.start();
    let accepted = std::cell::Cell::new(0usize);
    let apply = |ex: &mut Exercise, t: u32| {
        for a in actions.iter().filter(|a| a.0 == t) {
            if let Some(k) = ActionKind::parse(&a.1) { if ex.act(k, a.2.as_deref()).is_ok() { accepted.set(accepted.get() + 1); } }
        }
    };
    apply(&mut ex, 0);
    if handover_at == Some(0) { ex.handover(); }
    while !ex.finished {
        ex.tick();
        let t = ex.t;
        if ex.finished { break; }
        apply(&mut ex, t);
        if handover_at == Some(t) { ex.handover(); }
    }
    let n = accepted.get();
    Some((ex, n))
}

pub fn replay(lib: &Library, scenario: &str, code: &str, trainee: Trainee, actions: &[RecordedAction], end_t: u32) -> Option<Exercise> {
    let mut ex = Exercise::new(lib, scenario, code, trainee)?;
    ex.start();
    let apply = |ex: &mut Exercise, t: u32| {
        for a in actions.iter().filter(|a| a.0 == t) {
            if let Some(k) = ActionKind::parse(&a.1) { let _ = ex.act(k, a.2.as_deref()); }
        }
    };
    apply(&mut ex, 0);
    while !ex.finished && ex.t < end_t { ex.tick(); let t = ex.t; if !ex.finished { apply(&mut ex, t); } }
    if !ex.finished { ex.finish("Diakhiri oleh peserta"); }
    Some(ex)
}

#[derive(Debug, Clone, Serialize)]
pub struct Verification { pub ok: bool, pub hash_ok: bool, pub score_ok: bool, pub replay_total: u32, pub replay_verdict: String, pub why: Option<String>, pub replay_score: Option<Score>, pub enemy_steps: usize }

/// Structural checks that need no replay: supported conditions, known action kinds, times in
/// order and inside the run, handover inside the run, verification code derived from the hash.
fn structure_problem(r: &Rapor) -> Option<String> {
    if !matches!(r.mode.as_str(), "latih" | "uji") { return Some(format!("Mode tidak dikenal: {}", r.mode)); }
    if r.mode == "uji" && r.speed != 4 { return Some("Mode Uji harus berkecepatan 4×".into()); }
    if r.mode == "latih" && ![1, 4, 10].contains(&r.speed) { return Some(format!("Kecepatan tidak didukung: {}", r.speed)); }
    if !well_formed_hash(&r.hash) { return Some("Sidik SHA-256 rusak atau tidak lengkap".into()); }
    if r.verif != verif_code(&r.hash) { return Some("Kode verifikasi tidak cocok dengan sidik".into()); }
    let mut last = 0;
    for a in &r.actions {
        if ActionKind::parse(&a.1).is_none() { return Some(format!("Jenis tindakan tidak dikenal: {}", a.1)); }
        if a.0 < last { return Some("Urutan waktu tindakan tidak valid".into()); }
        if a.0 > r.end_t || r.handover_at.is_some_and(|h| a.0 > h) { return Some("Ada tindakan di luar waktu latihan".into()); }
        last = a.0;
    }
    if r.handover_at.is_some_and(|h| h > r.end_t) { return Some("Waktu penyerahan di luar waktu latihan".into()); }
    None
}

pub fn verify(lib: &Library, r: &Rapor) -> Verification {
    let hash_ok = sha256_hex(&canonical(r)) == r.hash;
    if let Some(why) = structure_problem(r) {
        return Verification { ok: false, hash_ok, score_ok: false, replay_total: 0, replay_verdict: "-".into(), why: Some(why), replay_score: None, enemy_steps: 0 };
    }
    if r.v != ENGINE_VERSION {
        return Verification { ok: false, hash_ok, score_ok: false, replay_total: 0, replay_verdict: "-".into(),
            why: Some(format!("Versi mesin tidak didukung: {} (konsol ini {})", r.v, ENGINE_VERSION)), replay_score: None, enemy_steps: 0 };
    }
    let Some((ex, accepted)) = replay_checked(lib, &r.scenario, &r.code, r.trainee.clone(), &r.actions, r.handover_at) else {
        return Verification { ok: false, hash_ok, score_ok: false, replay_total: 0, replay_verdict: "-".into(), why: Some("Skenario tidak dikenal".into()), replay_score: None, enemy_steps: 0 };
    };
    let sc = score(&ex);
    let all_actions_replayed = accepted == r.actions.len();
    let score_ok = sc.total == r.total && sc.verdict == r.verdict && sc.grade == r.grade && ex.t == r.end_t && all_actions_replayed;
    Verification { ok: hash_ok && score_ok, hash_ok, score_ok, replay_total: sc.total, replay_verdict: sc.verdict.clone(),
        why: if all_actions_replayed { None } else { Some(format!("{} dari {} tindakan tercatat tidak bisa diputar ulang", r.actions.len() - accepted, r.actions.len())) },
        enemy_steps: ex.red.iter().filter(|s| s.executed).count(), replay_score: Some(sc) }
}
