//! HTTP API (localhost only). Thin edges: parse input, call the engine, return the view.
use crate::session::{view, AppState, Session};
use axum::{extract::{Query, State}, http::StatusCode, response::{sse::{Event, KeepAlive, Sse}, IntoResponse}, Json};
use futures_util::stream::Stream;
use musuh_engine::*;
use serde::Deserialize;
use serde_json::{json, Value};
use std::convert::Infallible;
use tokio_stream::{wrappers::BroadcastStream, StreamExt};

type ApiResult = Result<Json<Value>, (StatusCode, Json<Value>)>;
fn bad(msg: impl Into<String>) -> (StatusCode, Json<Value>) { (StatusCode::BAD_REQUEST, Json(json!({ "error": msg.into() }))) }

pub async fn library(State(st): State<AppState>) -> Json<Value> {
    Json(json!({ "scenarios": st.lib.scenarios.iter().map(|s| json!({ "id": s.id, "title": s.title, "brief": s.brief, "basis": s.basis,
            "hosts": s.hosts.len(), "assets": s.hosts, "outside": s.outside.iter().filter(|o| !o.id.chars().next().unwrap().is_ascii_digit()).collect::<Vec<_>>(), "routes": s.phases.iter().map(|p| p.options.len()).sum::<usize>(), "phases": s.phases.len(),
            "ot": s.hosts.iter().any(|h| h.seg == "OT"), "objectives": s.objectives })).collect::<Vec<_>>(),
        "sources": st.lib.sources, "rules": st.lib.rules.len(), "engine": ENGINE_VERSION, "today": *st.today }))
}

#[derive(Deserialize)]
pub struct StartReq { scenario: String, code: String, mode: String, trainee: Trainee, speed: Option<u32> }

pub fn normalise_code(raw: &str) -> String {
    let up: String = raw.to_uppercase().chars().filter(|c| c.is_ascii_alphanumeric()).collect();
    let body = up.strip_prefix("MSH").unwrap_or(&up);
    let mut b: String = body.chars().take(4).collect();
    if b.is_empty() { b = "0001".into(); }
    while b.len() < 4 { b.push('0'); }
    format!("MSH-{b}")
}

pub async fn start(State(st): State<AppState>, Json(req): Json<StartReq>) -> ApiResult {
    let code = normalise_code(&req.code);
    let mode = if req.mode == "uji" { "uji" } else { "latih" }.to_string();
    let trainee = Trainee { nama: req.trainee.nama.trim().chars().take(60).collect(), pangkat: req.trainee.pangkat.chars().take(20).collect(),
        nrp: req.trainee.nrp.chars().take(20).collect(), satuan: req.trainee.satuan.chars().take(60).collect() };
    if trainee.nama.is_empty() { return Err(bad("Nama peserta wajib diisi")); }
    let mut ex = Exercise::new(&st.lib, &req.scenario, &code, trainee).ok_or_else(|| bad("Skenario tidak dikenal"))?;
    ex.start();
    let speed = if mode == "uji" { 4 } else { req.speed.filter(|v| [1, 4, 10].contains(v)).unwrap_or(4) };
    let run_id = format!("{:x}", std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_nanos()).unwrap_or(0));
    let s = Session { ex, mode, speed, paused: false, rapor: None, seq: 1, seen_cmd: Default::default(), trainer_view_used: false, aborted: false, run_id, saved: None };
    let v = view(&st.lib, &s, false);
    *st.session.lock().await = Some(s);
    let _ = st.tx.send("update".into());
    Ok(Json(v))
}

#[derive(Deserialize)]
pub struct ActReq { kind: String, arg: Option<String>, id: Option<String> }

pub async fn act(State(st): State<AppState>, Json(req): Json<ActReq>) -> ApiResult {
    let mut guard = st.session.lock().await;
    let s = guard.as_mut().ok_or_else(|| bad("Belum ada gladi"))?;
    if s.paused { return Err(bad("Gladi sedang dijeda pelatih")); }
    // R12: a retried command (same client id) is applied once.
    if let Some(id) = &req.id { if !s.seen_cmd.insert(id.clone()) { return Ok(Json(json!({ "ok": true, "dup": true, "msg": "Perintah sudah diterima" }))); } }
    let kind = ActionKind::parse(&req.kind).ok_or_else(|| bad("Aksi tidak dikenal"))?;
    let res = s.ex.act(kind, req.arg.as_deref());
    s.seq += 1;
    drop(guard);
    let _ = st.tx.send("update".into());
    match res { Ok(text) => Ok(Json(json!({ "ok": true, "msg": text }))),
        Err((msg, penalty)) => Ok(Json(json!({ "ok": false, "msg": msg, "penalty": penalty }))) }
}

#[derive(Deserialize)]
pub struct ControlReq { speed: Option<u32>, paused: Option<bool>, handover: Option<bool>, abort: Option<bool>, trainer_view: Option<bool> }

pub async fn control(State(st): State<AppState>, Json(req): Json<ControlReq>) -> ApiResult {
    let mut guard = st.session.lock().await;
    let s = guard.as_mut().ok_or_else(|| bad("Belum ada gladi"))?;
    // R11: in Uji the speed is fixed at start and the run cannot be paused.
    let uji = s.mode == "uji";
    if let Some(sp) = req.speed {
        if uji { return Err(bad("Mode Uji: kecepatan dikunci")); }
        if [1, 4, 10].contains(&sp) { s.speed = sp; }
    }
    if let Some(p) = req.paused { if uji && p { return Err(bad("Mode Uji: tidak bisa dijeda")); } s.paused = p; }
    if req.trainer_view == Some(true) { s.trainer_view_used = true; }
    // R1: handover plays the remaining time; abort ends without a rapor.
    if req.handover == Some(true) { s.ex.handover(); s.paused = false; }
    if req.abort == Some(true) { s.aborted = true; s.ex.finish("Dibatalkan, tanpa rapor"); }
    s.seq += 1;
    drop(guard);
    let _ = st.tx.send("update".into());
    Ok(Json(json!({ "ok": true })))
}

/// Seal the rapor once, when the exercise ends, and keep a copy on disk.
pub fn finalize(s: &mut Session, today: &str) {
    if s.rapor.is_some() || !s.ex.finished || s.aborted { return; }
    let r = make_rapor_with(&s.ex, today, &s.mode, s.speed, s.trainer_view_used);
    s.saved = Some(save_rapor(&r));
    s.rapor = Some(r);
    s.seq += 1;
}

/// Atomic write (tmp + rename) into ./rapor under the working directory. Returns the absolute
/// path on success, or the reason on failure, so the console never claims a save that failed (B5).
pub fn save_rapor(r: &Rapor) -> Result<String, String> {
    let dir = std::env::current_dir().map_err(|e| e.to_string())?.join("rapor");
    std::fs::create_dir_all(&dir).map_err(|e| format!("Folder {} tidak bisa dibuat: {e}", dir.display()))?;
    let safe: String = r.trainee.nama.chars().map(|c| if c.is_ascii_alphanumeric() { c } else { '_' }).collect();
    let file = dir.join(format!("{}-{}-{}.json", r.code, safe, r.verif));
    let tmp = file.with_extension("json.tmp");
    std::fs::write(&tmp, serde_json::to_string_pretty(r).unwrap()).map_err(|e| format!("Gagal menulis {}: {e}", tmp.display()))?;
    std::fs::rename(&tmp, &file).map_err(|e| format!("Gagal menyimpan {}: {e}", file.display()))?;
    Ok(file.display().to_string())
}

#[derive(Deserialize)]
pub struct ViewQ { reveal: Option<bool> }

pub async fn state(State(st): State<AppState>, Query(q): Query<ViewQ>) -> impl IntoResponse {
    let mut guard = st.session.lock().await;
    if q.reveal == Some(true) { if let Some(s) = guard.as_mut() { if !s.ex.finished { s.trainer_view_used = true; } } }
    match guard.as_ref() { Some(s) => Json(view(&st.lib, s, q.reveal.unwrap_or(false))).into_response(), None => Json(json!({ "idle": true })).into_response() }
}

pub async fn events(State(st): State<AppState>) -> Sse<impl Stream<Item = Result<Event, Infallible>>> {
    let rx = BroadcastStream::new(st.tx.subscribe());
    Sse::new(rx.filter_map(|m| m.ok().map(|d| Ok(Event::default().data(d))))).keep_alive(KeepAlive::default())
}

/// Retry saving the rapor of the finished run (B5).
pub async fn save_again(State(st): State<AppState>) -> ApiResult {
    let mut guard = st.session.lock().await;
    let s = guard.as_mut().ok_or_else(|| bad("Belum ada gladi"))?;
    let r = s.rapor.clone().ok_or_else(|| bad("Belum ada rapor"))?;
    s.saved = Some(save_rapor(&r)); s.seq += 1;
    let out = match s.saved.as_ref().unwrap() { Ok(p) => json!({ "ok": true, "path": p }), Err(e) => json!({ "ok": false, "error": e }) };
    drop(guard); let _ = st.tx.send("update".into());
    Ok(Json(out))
}

pub async fn verify_rapor(State(st): State<AppState>, Json(r): Json<Rapor>) -> Json<Value> {
    Json(json!(verify(&st.lib, &r)))
}

#[derive(Deserialize)]
pub struct BoardQ { code: String, scenario: String }

/// Verified rapor in ./rapor for one exercise code, best first. Unverifiable files are excluded.
pub async fn board(State(st): State<AppState>, Query(q): Query<BoardQ>) -> Json<Value> {
    let mut rows = vec![];
    if let Ok(dir) = std::fs::read_dir("rapor") {
        for e in dir.flatten() {
            let Ok(txt) = std::fs::read_to_string(e.path()) else { continue };
            let Ok(r) = serde_json::from_str::<Rapor>(&txt) else { continue };
            if r.code != q.code || r.scenario != q.scenario { continue; }
            let v = verify(&st.lib, &r);
            if v.ok { rows.push(json!({ "rapor": r, "ttd": v.replay_score.and_then(|s| s.ttd) })); }
        }
    }
    rows.sort_by(|a, b| b["rapor"]["total"].as_u64().cmp(&a["rapor"]["total"].as_u64()).then(a["ttd"].as_u64().unwrap_or(9999).cmp(&b["ttd"].as_u64().unwrap_or(9999))));
    Json(json!({ "rows": rows }))
}
