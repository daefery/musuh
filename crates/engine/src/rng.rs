//! Seeded randomness. FNV-1a for the seed, mulberry32 for the stream. Deterministic on every
//! platform: the same scenario + exercise code always yields the same enemy plan.
pub fn fnv1a(s: &str) -> u32 {
    let mut h: u32 = 2166136261;
    for b in s.encode_utf16() { h ^= b as u32; h = h.wrapping_mul(16777619); }
    h
}

pub struct Mulberry32(u32);
impl Mulberry32 {
    pub fn new(seed: u32) -> Self { Mulberry32(seed) }
    /// Uniform in [0, 1).
    pub fn next_f64(&mut self) -> f64 {
        self.0 = self.0.wrapping_add(0x6D2B79F5);
        let a = self.0;
        let mut t = (a ^ (a >> 15)).wrapping_mul(1 | a);
        t = t.wrapping_add((t ^ (t >> 7)).wrapping_mul(61 | t)) ^ t;
        ((t ^ (t >> 14)) as f64) / 4294967296.0
    }
}
