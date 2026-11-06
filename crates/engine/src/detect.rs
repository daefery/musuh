//! Sigma-style matching. Each rule reproduces the core selection of a SigmaHQ rule (or is
//! marked `own`). Operators: eq, contains, containsAny2, containsAll, startswith, endswith,
//! notendswith, notprivate. Comparison is case-insensitive, as in Sigma.
use crate::model::{Host, LogEvent, Rule};
use serde_json::Value;

pub fn is_private(ip: &str) -> bool {
    let p: Vec<u8> = ip.split('.').filter_map(|x| x.parse().ok()).collect();
    if p.len() != 4 { return false; }
    p[0] == 10 || p[0] == 127 || (p[0] == 192 && p[1] == 168) || (p[0] == 172 && (16..=31).contains(&p[1]))
}

fn as_text(v: &Value) -> String {
    match v { Value::String(s) => s.clone(), other => other.to_string() }
}

fn list(v: &Value) -> Vec<String> {
    match v { Value::Array(a) => a.iter().map(|x| as_text(x).to_lowercase()).collect(), other => vec![as_text(other).to_lowercase()] }
}

fn cond_holds(value: &str, op: &str, operand: &Value) -> bool {
    let low = value.to_lowercase();
    let items = list(operand);
    match op {
        "eq" => items.contains(&low),
        "contains" | "containsAny2" => items.iter().any(|a| low.contains(a.as_str())),
        "containsAll" => items.iter().all(|a| low.contains(a.as_str())),
        "startswith" => items.iter().any(|a| low.starts_with(a.as_str())),
        "endswith" => items.iter().any(|a| low.ends_with(a.as_str())),
        "notendswith" => !items.iter().any(|a| low.ends_with(a.as_str())),
        "notprivate" => !is_private(value),
        _ => false,
    }
}

pub fn matches(rule: &Rule, ev: &LogEvent, host: Option<&Host>) -> bool {
    if rule.src != ev.src || rule.eid != as_text(&ev.id) { return false; }
    if let Some(seg) = &rule.host_seg { if host.map(|h| &h.seg) != Some(seg) { return false; } }
    rule.sel.iter().all(|(field, ops)| match ev.f.get(field) {
        None | Some(Value::Null) => false,
        Some(v) => { let s = as_text(v); ops.iter().all(|(op, operand)| cond_holds(&s, op, operand)) }
    })
}

pub fn detect<'a>(rules: &'a [Rule], ev: &LogEvent, hosts: &[Host]) -> Vec<&'a Rule> {
    let host = hosts.iter().find(|h| h.id == ev.host);
    rules.iter().filter(|r| matches(r, ev, host)).collect()
}
