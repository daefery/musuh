// Rebuild the binary whenever a console asset changes (the assets are embedded with rust-embed).
fn main() {
    fn walk(d: &std::path::Path) {
        if let Ok(rd) = std::fs::read_dir(d) {
            for e in rd.flatten() {
                let p = e.path();
                if p.is_dir() { walk(&p) } else { println!("cargo:rerun-if-changed={}", p.display()); }
            }
        }
    }
    println!("cargo:rerun-if-changed=../../web");
    walk(std::path::Path::new("../../web"));
}
