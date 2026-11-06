//! Scenario, rule and source data. Loaded from the embedded JSON in `data/`.
//! Every attack route carries the public source it is built from (see SOURCES.md).
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};
use std::collections::BTreeMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Host { pub id: String, pub ip: String, pub role: String, pub os: String, pub seg: String }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Outside { pub id: String, pub role: String }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Start { pub on: Vec<String>, pub creds: Vec<String> }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Objective {
    pub id: String, pub text: String, pub kind: String,
    #[serde(default)] pub within: Option<u32>,
    #[serde(default)] pub techs: Vec<String>,
    #[serde(default)] pub host: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogEvent { pub src: String, pub id: Value, pub host: String, pub f: Map<String, Value> }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Effects { pub on: Vec<String>, pub creds: Vec<String>, pub c2: Option<String>, pub ot: Option<String> }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Route {
    pub id: String, pub prio: u8, pub tech: String, pub tactic: String,
    pub from: String, pub host: String, pub src: Vec<String>, pub name: String, pub note: String,
    pub needs: Vec<String>, pub fx: Effects, pub think: String, pub logs: Vec<LogEvent>,
    pub gap: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Phase { pub key: String, pub goal: String, pub t: u32, pub optional: bool, pub c2: bool, pub options: Vec<Route> }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Scenario {
    pub id: String, pub title: String, pub brief: String, pub basis: Vec<String>, pub duration: u32,
    pub hosts: Vec<Host>, pub outside: Vec<Outside>, pub start: Start,
    pub objectives: Vec<Objective>, pub phases: Vec<Phase>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Source { pub label: String, pub url: String }

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Rule {
    pub id: String, pub title: String, pub sigma_title: Option<String>, pub level: String,
    pub sid: Option<String>, pub path: Option<String>, pub src: String, pub eid: String,
    /// field -> operator -> operand (list of strings/numbers, or bool for `notprivate`)
    pub sel: BTreeMap<String, BTreeMap<String, Value>>,
    pub simplified: String, pub own: bool, pub host_seg: Option<String>,
}

pub struct Library { pub scenarios: Vec<Scenario>, pub sources: BTreeMap<String, Source>, pub rules: Vec<Rule> }

impl Library {
    /// The content shipped inside the binary.
    pub fn embedded() -> Library {
        Library {
            scenarios: serde_json::from_str(include_str!("../data/scenarios.json")).expect("scenarios.json"),
            sources: serde_json::from_str(include_str!("../data/sources.json")).expect("sources.json"),
            rules: serde_json::from_str(include_str!("../data/rules.json")).expect("rules.json"),
        }
    }
    pub fn scenario(&self, id: &str) -> Option<&Scenario> { self.scenarios.iter().find(|s| s.id == id) }
}
