//! MUSUH: offline cyber exercise console.
//!   musuh                 start the console on http://127.0.0.1:8090 and open the browser
//!   musuh --port 9000     use another port
//!   musuh verify FILE     verify a rapor file by replaying the exercise (exit 0 = SAH, 1 = TIDAK SAH)
//! Binds to 127.0.0.1 only. No internet access is used or needed.
mod api;
mod session;

use axum::{http::{header, StatusCode, Uri}, response::IntoResponse, routing::{get, post}, Router};
use musuh_engine::{verify, Library, Rapor};
use rust_embed::RustEmbed;
use session::AppState;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::{broadcast, Mutex};

static PORT: std::sync::OnceLock<u16> = std::sync::OnceLock::new();

#[derive(RustEmbed)]
#[folder = "../../web/"]
struct Web;

async fn static_file(uri: Uri) -> impl IntoResponse {
    let path = uri.path().trim_start_matches('/');
    let path = if path.is_empty() { "index.html" } else { path };
    match Web::get(path) {
        Some(f) => ([(header::CONTENT_TYPE, mime_guess::from_path(path).first_or_octet_stream().to_string())], f.data.into_owned()).into_response(),
        None => (StatusCode::NOT_FOUND, "not found").into_response(),
    }
}

/// Civil date from the OS clock, used only to stamp the rapor (never inside the engine).
fn today() -> String {
    let secs = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_secs()).unwrap_or(0) as i64 + 7 * 3600; // WIB
    let z = secs.div_euclid(86400) + 719468;
    let era = z.div_euclid(146097); let doe = z - era * 146097;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100); let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1; let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let y = yoe + era * 400 + if m <= 2 { 1 } else { 0 };
    format!("{y:04}-{m:02}-{d:02}")
}

fn verify_cli(path: &str) -> i32 {
    let lib = Library::embedded();
    let txt = match std::fs::read_to_string(path) { Ok(t) => t, Err(e) => { eprintln!("Tidak bisa membaca {path}: {e}"); return 2; } };
    let r: Rapor = match serde_json::from_str(&txt) { Ok(r) => r, Err(e) => { eprintln!("Berkas rapor rusak: {e}"); return 2; } };
    let v = verify(&lib, &r);
    println!("{} {} · {} {} · kode {}", if v.ok { "RAPOR SAH" } else { "RAPOR TIDAK SAH" }, r.verif, r.trainee.pangkat, r.trainee.nama, r.code);
    println!("  sidik SHA-256   : {}", if v.hash_ok { "cocok" } else { "TIDAK cocok (isi diubah)" });
    println!("  putar ulang     : nilai {} ({}), tertulis {} ({})", v.replay_total, v.replay_verdict, r.total, r.verdict);
    if v.ok { 0 } else { 1 }
}

#[tokio::main]
async fn main() {
    let args: Vec<String> = std::env::args().collect();
    if args.get(1).map(String::as_str) == Some("verify") {
        let Some(p) = args.get(2) else { eprintln!("pakai: musuh verify <rapor.json>"); std::process::exit(2) };
        std::process::exit(verify_cli(p));
    }
    let port: u16 = args.iter().position(|a| a == "--port").and_then(|i| args.get(i + 1)).and_then(|p| p.parse().ok()).unwrap_or(8090);
    let no_open = args.iter().any(|a| a == "--no-open");
    let _ = PORT.set(port);
    let (tx, _) = broadcast::channel(64);
    let st = AppState { lib: Arc::new(Library::embedded()), session: Arc::new(Mutex::new(None)), tx, today: Arc::new(today()) };

    // The exercise clock: one engine tick per (1000 / speed) ms of wall time, unless paused.
    let clock = st.clone();
    tokio::spawn(async move {
        let mut acc = 0u32;
        loop {
            tokio::time::sleep(Duration::from_millis(25)).await;
            let mut g = clock.session.lock().await;
            let Some(s) = g.as_mut() else { continue };
            if s.paused || !s.ex.running { acc = 0; continue; }
            acc += 25;
            // After handover the remaining time is played fast (R1); the result does not depend on speed.
            let step = if s.ex.handed_over_at.is_some() { 5 } else { 1000 / s.speed.max(1) };
            let mut changed = false;
            while acc >= step && s.ex.running { acc -= step; s.ex.tick(); changed = true; }
            if changed { s.seq += 1; } // B3: every visible change bumps the state version
            if s.ex.finished { api::finalize(s, &clock.today); }
            drop(g);
            if changed { let _ = clock.tx.send("update".into()); }
        }
    });

    let app = Router::new()
        .route("/api/library", get(api::library))
        .route("/api/start", post(api::start))
        .route("/api/act", post(api::act))
        .route("/api/control", post(api::control))
        .route("/api/state", get(api::state))
        .route("/api/events", get(api::events))
        .route("/api/verify", post(api::verify_rapor))
        .route("/api/save", post(api::save_again))
        .route("/api/board", get(api::board))
        .fallback(static_file)
        .layer(axum::middleware::from_fn(same_origin))
        .with_state(st);
    let addr = std::net::SocketAddr::from(([127, 0, 0, 1], port));
    let listener = match tokio::net::TcpListener::bind(addr).await { Ok(l) => l, Err(e) => { eprintln!("Port {port} dipakai ({e}). Coba: musuh --port 9000"); std::process::exit(2) } };
    let url = format!("http://127.0.0.1:{port}/");
    println!("MUSUH {} · konsol latihan siber offline\n  buka: {url}\n  Ctrl+C untuk berhenti", env!("CARGO_PKG_VERSION"));
    if !no_open { open_browser(&url); }
    axum::serve(listener, app).with_graceful_shutdown(async { let _ = tokio::signal::ctrl_c().await; }).await.unwrap();
}

/// R12: reject state-changing requests that come from another web origin (a page on the
/// internet cannot drive the local console). Reads and same-origin requests pass.
async fn same_origin(req: axum::extract::Request, next: axum::middleware::Next) -> axum::response::Response {
    // B4: exact match against this console's own origin, including the port.
    if req.method() == axum::http::Method::POST {
        if let Some(origin) = req.headers().get(header::ORIGIN).and_then(|v| v.to_str().ok()) {
            let port = PORT.get().copied().unwrap_or(0);
            let ok = origin == format!("http://127.0.0.1:{port}") || origin == format!("http://localhost:{port}");
            if !ok { return (StatusCode::FORBIDDEN, "origin ditolak").into_response(); }
        }
    }
    next.run(req).await
}

fn open_browser(url: &str) {
    #[cfg(target_os = "windows")] let _ = std::process::Command::new("cmd").args(["/C", "start", "", url]).spawn();
    #[cfg(target_os = "macos")] let _ = std::process::Command::new("open").arg(url).spawn();
    #[cfg(all(unix, not(target_os = "macos")))] let _ = std::process::Command::new("xdg-open").arg(url).stderr(std::process::Stdio::null()).spawn();
}
