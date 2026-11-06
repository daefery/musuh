//! The Rust engine must reproduce the reviewed JavaScript prototype's ENEMY BEHAVIOUR exactly:
//! same timeline rows (time, kind, text) for the same code and actions. Scoring intentionally
//! differs since engine 0.4 (council round 1: evidence-based detection R2, accuracy R3), so only
//! the timeline and the objective outcomes that do not depend on those rules are compared.
use musuh_engine::{replay, score, Library, RecordedAction, Trainee};
use serde_json::Value;

#[test]
fn rust_engine_matches_js_prototype() {
    let lib = Library::embedded();
    let cases: Vec<Value> = serde_json::from_str(include_str!("fixtures/js-parity.json")).unwrap();
    let t = Trainee { nama: "Peserta Uji".into(), pangkat: "Sertu".into(), nrp: "0".into(), satuan: "X".into() };
    for c in cases {
        let acts: Vec<RecordedAction> = c["actions"].as_array().unwrap().iter().map(|a| RecordedAction(
            a[0].as_u64().unwrap() as u32, a[1].as_str().unwrap().into(), a[2].as_str().map(String::from))).collect();
        let ex = replay(&lib, c["scenario"].as_str().unwrap(), c["code"].as_str().unwrap(), t.clone(), &acts, 400).unwrap();
        let kinds = |k: &musuh_engine::RowKind| serde_json::to_value(k).unwrap().as_str().unwrap().to_string();
        let got: Vec<(u64, String, String)> = ex.timeline.iter().map(|r| (r.t as u64, kinds(&r.kind), r.text.clone())).collect();
        let want: Vec<(u64, String, String)> = c["timeline"].as_array().unwrap().iter().map(|r| (r[0].as_u64().unwrap(), r[1].as_str().unwrap().into(), r[2].as_str().unwrap().into())).collect();
        let label = format!("{} {}", c["scenario"], c["code"]);
        for (i, (g, w)) in got.iter().zip(want.iter()).enumerate() { assert_eq!(g, w, "{label}: row {i}"); }
        assert_eq!(got.len(), want.len(), "{label}: row count");
        let sc = score(&ex);
        let impact: Vec<bool> = sc.objectives.iter().filter(|o| o.kind != "detect").map(|o| o.go).collect();
        let want_obj: Vec<bool> = c["objectives"].as_array().unwrap().iter().map(|v| v.as_bool().unwrap()).collect();
        let want_impact: Vec<bool> = sc.objectives.iter().zip(want_obj.iter()).filter(|(o, _)| o.kind != "detect").map(|(_, w)| *w).collect();
        assert_eq!(impact, want_impact, "{label}: impact objectives");
        let _ = score;
    }
}
