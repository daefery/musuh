//! Behaviour and provenance checks for the engine (ported from prototype/test/engine.mjs).
use musuh_engine::*;
use std::collections::HashSet;

fn lib() -> Library { Library::embedded() }
fn t() -> Trainee { Trainee { nama: "Peserta Uji".into(), pangkat: "Sertu".into(), nrp: "00000000".into(), satuan: "Satuan Latihan".into() } }
fn a(t: u32, k: &str, arg: Option<&str>) -> RecordedAction { RecordedAction(t, k.into(), arg.map(String::from)) }
fn run(s: &str, code: &str, acts: &[RecordedAction]) -> Exercise { replay(&lib(), s, code, t(), acts, 400).unwrap() }
fn executed(ex: &Exercise) -> Vec<String> { ex.red.iter().filter(|r| r.executed).map(|r| r.route.id.clone()).collect() }
fn doc_ip(ip: &str) -> bool { ip.starts_with("192.0.2.") || ip.starts_with("198.51.100.") || ip.starts_with("203.0.113.") }

#[test]
fn provenance_every_route_is_sourced_and_verified() {
    let lib = lib();
    let verified: HashSet<String> = include_str!("../data/attack_verified.txt").lines()
        .filter(|l| !l.contains("NOT FOUND")).filter_map(|l| l.split(" => ").next()).map(String::from).collect();
    for s in &lib.scenarios {
        for k in &s.basis { assert!(lib.sources.contains_key(k), "{} basis {k}", s.id); }
        for o in &s.outside { if o.id.chars().next().unwrap().is_ascii_digit() { assert!(doc_ip(&o.id), "{} outside {} not RFC 5737", s.id, o.id); } }
        for p in &s.phases { for r in &p.options {
            assert!(!r.src.is_empty() && r.src.iter().all(|k| lib.sources.contains_key(k)), "{}/{} source", s.id, r.id);
            assert!(r.note.len() > 10, "{}/{} note", s.id, r.id);
            assert!(verified.contains(&r.tech), "{}/{} technique {} not verified on attack.mitre.org", s.id, r.id, r.tech);
            let hits: usize = r.logs.iter().map(|l| musuh_engine::detect::detect(&lib.rules, l, &s.hosts).len()).sum();
            assert!(hits > 0 || r.gap.is_some(), "{}/{} fires no alert and is not a declared gap", s.id, r.id);
        } }
    }
    for r in lib.rules.iter().filter(|r| !r.own) {
        assert_eq!(r.sid.as_ref().map(|s| s.len()), Some(36), "{} SigmaHQ id", r.id);
        assert!(r.path.as_ref().unwrap().starts_with("rules/"), "{} path", r.id);
    }
}

#[test]
fn domain_scenario_adapts() {
    let ex = run("domain-takeover", "MSH-0001", &[]);
    assert!(executed(&ex).contains(&"ntdsutil".into()));
    assert_eq!(score(&ex).verdict, "NO-GO");
    let ex = run("domain-takeover", "MSH-0001", &[a(45, "block", Some("198.51.100.23"))]);
    assert!(executed(&ex).contains(&"tunnel".into()), "proxy blocked -> tunnel");
    let ex = run("domain-takeover", "MSH-0001", &[a(45, "block", Some("198.51.100.23")), a(46, "block", Some("203.0.113.45"))]);
    assert!(!executed(&ex).contains(&"lsass".into()), "both channels blocked -> no credential theft");
    let ex = run("domain-takeover", "MSH-0001", &[a(130, "reset", Some("admin.server"))]);
    assert!(executed(&ex).contains(&"pth".into()) && executed(&ex).contains(&"dcsync".into()));
    let ex = run("domain-takeover", "MSH-0001", &[a(22, "incident", None), a(23, "isolate", Some("WEB-01"))]);
    assert_eq!(ex.end_reason.as_deref(), Some("MUSUH dilumpuhkan"));
    assert_eq!(score(&ex).verdict, "GO");
}

#[test]
fn ransomware_follows_bssn_order_and_adapts() {
    let ex = run("ransomware-pusdat", "MSH-0001", &[]);
    let order: Vec<String> = ex.red.iter().filter(|r| r.executed).map(|r| r.phase.clone()).collect();
    let pos = |k: &str| order.iter().position(|x| x == k).unwrap();
    assert!(pos("av") < pos("layanan") && pos("layanan") < pos("enkripsi"));
    let ex = run("ransomware-pusdat", "MSH-0001", &[a(30, "reset", Some("adm.pusdat"))]);
    assert!(executed(&ex).contains(&"local".into()));
    let ex = run("ransomware-pusdat", "MSH-0001", &[a(90, "isolate", Some("HV-01"))]);
    assert!(executed(&ex).contains(&"enc-db".into()) && !executed(&ex).contains(&"enc-hv".into()));
}

#[test]
fn power_scenario_ot() {
    let ex = run("listrik-markas", "MSH-0001", &[]);
    assert!(ex.genset.stopped_at.is_some());
    let ex = run("listrik-markas", "MSH-0001", &[a(110, "isolate", Some("VPN-01"))]);
    assert!(executed(&ex).contains(&"dualhome".into()));
    let ex = run("listrik-markas", "MSH-0001", &[a(200, "modbus-block", None)]);
    assert!(ex.genset.stopped_at.is_none());
}

#[test]
fn rapor_verifies_and_tampering_fails() {
    let lib = lib();
    let acts = [a(40, "incident", None), a(45, "block", Some("198.51.100.23")), a(130, "reset", Some("admin.server"))];
    let ex1 = run("domain-takeover", "MSH-7Q2K", &acts);
    let ex2 = run("domain-takeover", "MSH-7Q2K", &acts);
    assert_eq!(serde_json::to_string(&ex1.timeline).unwrap(), serde_json::to_string(&ex2.timeline).unwrap(), "deterministic");
    let r = make_rapor(&ex1, "2026-11-05", "uji", 4);
    assert!(verify(&lib, &r).ok, "genuine verifies");
    let mut f = r.clone(); f.total = 98; f.verdict = "GO".into();
    let v = verify(&lib, &f); assert!(!v.ok && !v.hash_ok && !v.score_ok);
    let mut f = r.clone(); f.total = 98; f.hash = rapor::sha256_hex("x");
    assert!(!verify(&lib, &f).score_ok, "replay catches recomputed hash");
    let mut f = r.clone(); f.trainee.nama = "Orang Lain".into();
    assert!(!verify(&lib, &f).hash_ok, "name swap caught");
    let mut f = r.clone(); f.mode = "latih".into();
    assert!(!verify(&lib, &f).hash_ok, "mode swap caught");
}

#[test]
fn different_codes_change_timing() {
    let codes = ["MSH-0001", "MSH-AB12", "MSH-ZZ99", "MSH-K4R7", "MSH-1945"];
    let v: HashSet<String> = codes.iter().map(|c| { let ex = run("domain-takeover", c, &[]);
        ex.red.iter().filter(|r| r.executed).map(|r| r.t.to_string()).collect::<Vec<_>>().join(",") }).collect();
    assert!(v.len() > 1);
}

// ---- round-1 council defects (must fail before the fix) ----
#[test]
fn early_stop_cannot_earn_go() {
    // Reviewer repro: incident at J+00:13 then stop -> was 95 GO.
    let lib = lib();
    let mut ex = Exercise::new(&lib, "domain-takeover", "MSH-7Q2K", t()).unwrap();
    ex.start();
    for _ in 0..13 { ex.tick(); }
    let _ = ex.act(ActionKind::Incident, None);
    ex.handover();
    while !ex.finished { ex.tick(); }
    let sc = score(&ex);
    assert_eq!(sc.verdict, "NO-GO", "remaining time must run: enemy still wins");
    assert!(sc.total < 50, "total {} too high for doing nothing", sc.total);
}

#[test]
fn response_before_any_alert_earns_no_detection() {
    let ex = run("domain-takeover", "MSH-0001", &[a(0, "incident", None)]);
    assert_eq!(score(&ex).ttd, None);
    assert_eq!(score(&ex).parts[0].v, 0);
}

#[test]
fn wrong_blocks_and_resets_cost_accuracy() {
    let ex = run("domain-takeover", "MSH-0001", &[a(20, "block", Some("192.0.2.1")), a(21, "reset", Some("tidak.ada"))]);
    assert_eq!(score(&ex).parts[3].v, 0, "two wrong actions -> 0 accuracy");
}

#[test]
fn rapor_rejects_unknown_engine_and_covers_grade() {
    let lib = lib();
    let ex = run("domain-takeover", "MSH-0001", &[a(22, "incident", None), a(23, "isolate", Some("WEB-01"))]);
    let r = make_rapor(&ex, "2026-11-05", "uji", 4);
    let mut f = r.clone(); f.v = "musuh-x".into(); f.hash = rapor::rehash(&f);
    assert!(!verify(&lib, &f).ok, "unknown engine version must fail even with a recomputed hash");
    let mut f = r.clone(); f.grade = "KURANG".into();
    assert!(!verify(&lib, &f).ok, "grade edit must fail");
    let mut f = r.clone(); f.speed = 10; f.hash = rapor::rehash(&f); f.verif = f.hash[..12].to_uppercase().chars().collect::<Vec<_>>().chunks(4).map(|c| c.iter().collect::<String>()).collect::<Vec<_>>().join("-");
    assert!(!verify(&lib, &f).ok, "Uji is locked at 4x: a rehashed 10x Uji record must fail");
    let lr = make_rapor(&ex, "2026-11-05", "latih", 10);
    assert!(verify(&lib, &lr).ok, "Latih at 10x is valid; replay is speed-independent");
}

#[test]
fn telemetry_feed_includes_unmatched_events() {
    let ex = run("ransomware-pusdat", "MSH-0001", &[]);
    assert!(ex.events.iter().any(|e| e.ev.f.get("id.resp_h").and_then(|v| v.as_str()) == Some("192.0.2.77")), "C2 conn event (no rule) is in the feed");
}

// ---- build council round 1: B6 structural record validity ----
#[test]
fn verify_rejects_structurally_invalid_records() {
    let lib = lib();
    let ex = run("domain-takeover", "MSH-7Q2K", &[a(13, "incident", None)]);
    let r = make_rapor(&ex, "2026-11-05", "latih", 4);
    assert!(verify(&lib, &r).ok);
    let mut f = r.clone(); f.actions.push(RecordedAction(999999, "not-an-action".into(), None)); f.hash = rapor::rehash(&f);
    assert!(!verify(&lib, &f).ok, "unknown action kind / impossible time must fail");
    let mut f = r.clone(); f.actions.push(RecordedAction(20, "block".into(), Some("not-an-ip".into()))); f.hash = rapor::rehash(&f);
    assert!(!verify(&lib, &f).ok, "an action the engine rejects must fail");
    let mut f = r.clone(); f.mode = "uji".into(); f.speed = 0; f.hash = rapor::rehash(&f);
    assert!(!verify(&lib, &f).ok, "impossible conditions must fail");
    let mut f = r.clone(); f.verif = "FAKE-FAKE-FAKE".into();
    assert!(!verify(&lib, &f).ok, "verification code must be derived from the hash");
    let mut f = r.clone(); f.actions = vec![RecordedAction(30, "incident".into(), None), RecordedAction(10, "isolate".into(), Some("WEB-01".into()))]; f.hash = rapor::rehash(&f);
    assert!(!verify(&lib, &f).ok, "actions out of time order must fail");
}

// ---- build council round 2: B6 malformed hashes never panic ----
#[test]
fn malformed_hash_is_rejected_without_panic() {
    let lib = lib();
    let ex = run("domain-takeover", "MSH-0001", &[]);
    let r = make_rapor(&ex, "2026-11-05", "latih", 4);
    for bad in ["", "a", "abcdefghijk\u{e9}", "zz", &"g".repeat(64)] {
        let mut f = r.clone(); f.hash = bad.to_string();
        let v = verify(&lib, &f);
        assert!(!v.ok && !v.hash_ok, "hash {bad:?} must be rejected");
    }
}
