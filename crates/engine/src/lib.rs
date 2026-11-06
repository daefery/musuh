//! MUSUH engine. Pure logic: scenarios, deterministic adaptive enemy, Sigma-style detection,
//! scoring, after-action narrative and replay-verifiable rapor. No IO and no wall clock, so the
//! same inputs always give the same result on every machine.
pub mod model;
pub mod detect;
pub mod rng;
pub mod types;
pub mod exercise;
pub mod score;
pub mod rapor;
pub mod report;

pub use exercise::{fmt_j, Exercise};
pub use model::Library;
pub use rapor::{make_rapor, make_rapor_with, replay, replay_handover, verify, Rapor, RecordedAction, Verification, ENGINE_VERSION};
pub use score::{score, Score};
pub use types::*;
