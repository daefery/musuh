//! Runtime state and records produced by an exercise.
use serde::{Deserialize, Serialize};
use crate::model::{LogEvent, Route};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum ActionKind { Incident, Isolate, Block, Reset, ModbusBlock, GensetStart }

impl ActionKind {
    pub fn parse(s: &str) -> Option<Self> {
        Some(match s { "incident" => Self::Incident, "isolate" => Self::Isolate, "block" => Self::Block,
            "reset" => Self::Reset, "modbus-block" => Self::ModbusBlock, "genset-start" => Self::GensetStart, _ => return None })
    }
    pub fn as_str(&self) -> &'static str {
        match self { Self::Incident => "incident", Self::Isolate => "isolate", Self::Block => "block",
            Self::Reset => "reset", Self::ModbusBlock => "modbus-block", Self::GensetStart => "genset-start" }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Action { pub n: u32, pub t: u32, pub kind: ActionKind, pub arg: Option<String>, pub text: String }

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum RowKind { Sys, Red, RedBlocked, Alert, Blue, Ot }

/// One numbered timeline row. Report sentences cite rows by `n`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Row {
    pub n: u32, pub t: u32, pub kind: RowKind, pub text: String,
    #[serde(skip_serializing_if = "Option::is_none")] pub route: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")] pub host: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")] pub rule: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")] pub action: Option<ActionKind>,
    #[serde(default)] pub adapted: bool,
}

/// Ground truth of one enemy attempt.
#[derive(Debug, Clone, Serialize)]
pub struct RedStep { pub route: Route, pub phase: String, pub t: u32, pub executed: bool, pub why: Option<String> }

#[derive(Debug, Clone, Serialize)]
pub struct Alert { pub n: u32, pub t: u32, pub rule: String, pub host: String, pub ev: LogEvent }

/// Every telemetry event the range emitted, matched by a rule or not (R5).
#[derive(Debug, Clone, Serialize)]
pub struct Emitted { pub n: u32, pub t: u32, pub ev: LogEvent, pub rules: Vec<String> }

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Mood { Ok, Adapt, Hit, Stuck }

#[derive(Debug, Clone, Serialize)]
pub struct Thought { pub t: u32, pub text: String, pub mood: Mood }

#[derive(Debug, Clone, Serialize)]
pub struct Move { pub from: String, pub to: String, pub t: u32, pub ok: bool }

#[derive(Debug, Clone, Serialize)]
pub struct HostState { pub id: String, pub isolated: bool, pub compromised: bool, pub foothold: bool }

#[derive(Debug, Clone, Serialize)]
pub struct Genset { pub running: bool, pub kw: u32, pub stopped_at: Option<u32>, pub restored_at: Option<u32> }

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Default)]
pub struct Trainee { pub nama: String, pub pangkat: String, pub nrp: String, pub satuan: String }
