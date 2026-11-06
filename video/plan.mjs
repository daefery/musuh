// What the camera does during each narration sentence. Keys match video/narration.json scene ids;
// beat.s = sentence index, beat.o = seconds after that sentence starts.
// shot = still from capture.mjs; cam = box key to frame (or "full"), z = zoom;
// ring = [boxKey, colour]; call = callout { box, head, text, tone, side }; click = box the cursor clicks;
// cut = quick swap to another still without moving the camera (the result of the click).
export const STEP = { siapkan: 0, operasi: 1, adaptasi: 1, serahkan: 1, evaluasi: 2, rapor: 3 };
export const plan = (real) => ({
  masalah: [
    { s: 0, card: "masalah", show: ["t1", "team-r"] },
    { s: 0, o: 1.2, card: "masalah", show: ["t1", "team-r", "team-b"] },
    { s: 1, card: "masalah", show: ["t1", "team-r", "team-b", "team-e"] },
    { s: 2, card: "masalah", show: ["t1", "team-r", "team-b", "team-e", "lead", "src"] },
  ],
  solusi: [
    { s: 0, card: "solusi", show: ["big", "lead"] },
    { s: 1, card: "solusi", show: ["big", "lead", "teams", "x-r", "x-e"] },
    { s: 1, o: 2.0, card: "solusi", show: ["big", "lead", "teams", "x-r", "x-e", "pills"] },
  ],
  siapkan: [
    { s: 0, shot: "siapkan", cam: "full", z: 1 },
    { s: 0, o: 0.6, shot: "siapkan", cam: ["scn1", "scn3"], z: 1.75, ring: ["scn1"] },
    { s: 1, shot: "siapkan", cam: ["scn1", "scn3"], z: 1.75, ring: ["scn1"], call: { box: "scn1", head: "Skenario rekaan", text: "berbasis insiden publik, bukan sistem nyata", side: "right" } },
    { s: 2, shot: "siapkan", cam: ["scn1", "scn3"], z: 1.75, ring: ["scn1"], call: { box: "scn1", head: "Sumber", text: "Pola Red Team Keris Woomera 2026", side: "right" } },
    { s: 2, o: 2.1, shot: "siapkan", cam: ["scn1", "scn3"], z: 1.75, ring: ["scn2"], call: { box: "scn2", head: "Sumber", text: "Kronologi BSSN atas PDNS 2 (Juni 2024)", side: "right" } },
    { s: 2, o: 4.2, shot: "siapkan", cam: ["scn1", "scn3"], z: 1.75, ring: ["scn3"], call: { box: "scn3", head: "Sumber", text: "Serangan jaringan listrik Ukraina 2015", side: "right" } },
    { s: 3, shot: "siapkan-isi", cam: ["nama", "mulai"], z: 2, ring: ["nama"] },
    { s: 3, o: 1.0, shot: "siapkan-isi", cam: ["nama", "mulai"], z: 2, click: "mulai" },
  ],
  operasi: [
    { s: 0, shot: "ops-awal", cam: "full", z: 1, rings: [["map"], ["queue"], ["log"]], noDim: true },
    { s: 1, shot: "ops-pilih", cam: "alert", z: 2.2, ring: ["sigma"], call: { box: "alert", head: "Aturan deteksi", text: "dari SigmaHQ, dengan tautan ke aturan aslinya", side: "below" } },
    { s: 2, shot: "ops-pilih", cam: "map", z: 1.6, ring: ["ip", "red"], call: { box: "ip", head: "Proksi musuh", text: "WEB-01 meneruskan ke 198.51.100.23", side: "right", tone: "red" } },
    { s: 2, o: 2.2, shot: "ops-pilih", cam: "alert", z: 2.2, click: "block" },
    { s: 3, shot: "ops-konfirmasi", cam: "confirm", z: 2.2, ring: ["confirm"], call: { box: "confirm", head: "Konfirmasi", text: "sasaran tampil dulu, baru dijalankan", side: "above" } },
    { s: 3, o: 1.4, shot: "ops-konfirmasi", cam: "confirm", z: 2.2, click: "go" },
    { s: 3, o: 2.2, shot: "ops-blokir", cam: "map", z: 1.6, cut: true, ring: ["ip", "green"], call: { box: "ip", head: "Diblokir", text: "198.51.100.23", side: "right", tone: "green" } },
  ],
  adaptasi: [
    { s: 0, shot: "adaptasi", cam: "full", z: 1, click: "eye" },
    { s: 0, o: 0.9, shot: "adaptasi", cam: "trainer", z: 1.9, ring: ["trainer"], call: { box: "trainer", head: "Layar pelatih", text: "pikiran MUSUH, tidak terlihat peserta", side: "left" } },
    { s: 1, shot: "adaptasi", cam: "map", z: 1.6, ring: ["tunnel", "red"], call: { box: "tunnel", head: "MUSUH beradaptasi", text: "terowongan cadangan ke 203.0.113.45", side: "right", tone: "red" } },
    { s: 2, shot: "adaptasi", cam: "full", z: 1, banner: { head: "Adil", text: "kode latihan sama + tindakan sama = musuh sama" } },
  ],
  serahkan: [
    { s: 0, shot: "serahkan", cam: "map", z: 1.6, ring: ["ip1", "green"], call: { box: "ip1", head: "Diblokir", text: "jalur kedua juga diputus", side: "right", tone: "green" } },
    { s: 0, o: 1.4, shot: "serahkan", cam: "chip", z: 2.2, ring: ["chip"], call: { box: "chip", head: "Insiden", text: "dinyatakan peserta", side: "below" } },
    { s: 1, shot: "serahkan", cam: "handover", z: 2.2, click: "handover" },
    { s: 1, o: 0.9, shot: "diserahkan", cam: "full", z: 1, cut: true, ring: ["chip"], call: { box: "chip", head: "Sisa waktu dijalankan", text: "tidak ada GO karena berhenti lebih awal", side: "below" } },
  ],
  evaluasi: [
    { s: 0, shot: "eval-atas", cam: ["score", "parts"], z: 1.75, ring: ["score"], call: { box: "score", head: `Nilai ${real}`, text: "GO, dengan rincian tiap unsur", side: "right", tone: "green" } },
    { s: 0, o: 2.4, shot: "eval-atas", cam: ["obj", "obj"], z: 1.75, ring: ["obj"], call: { box: "obj", head: "Sasaran latihan", text: "GO atau NO-GO, satu per satu", side: "right" } },
    { s: 1, shot: "eval-waktu", cam: "tline", z: 1.7, ring: ["tline"], call: { box: "tline", head: "Garis waktu", text: "langkah MUSUH di atas, tindakan peserta di bawah", side: "below" } },
    { s: 2, shot: "eval-sumber", cam: "lanes", z: 1.6, ring: ["open"], call: { box: "open", head: "Dasar langkah", text: "MITRE ATT&CK, CISA, Keris Woomera", side: "left" } },
  ],
  rapor: [
    { s: 0, shot: "rapor", cam: ["title", "hasil"], z: 1.7, ring: ["hasil"], call: { box: "hasil", head: "Rapor Prestasi Siber", text: `nilai ${real}, GO`, side: "right" } },
    { s: 1, shot: "rapor", cam: ["test", "test"], z: 2, click: "test" },
    { s: 1, o: 0.8, shot: "rapor-sah", cam: ["flow", "out"], z: 2, cut: true, ring: ["out", "green"], stamp: { text: "SAH", tone: "ok" } },
    { s: 2, shot: "rapor-sah", cam: ["flow", "out"], z: 2, edit: { from: real, to: 98 } },
    { s: 2, o: 3.4, shot: "rapor-palsu", cam: ["flow", "out"], z: 2, cut: true, click: "file", ring: ["out", "red"] },
    { s: 3, shot: "rapor-palsu", cam: ["flow", "out"], z: 2, ring: ["out", "red"], stamp: { text: "TIDAK SAH", tone: "bad", sub: `putar ulang: nilai asli ${real}, bukan 98` } },
  ],
  genset: [
    { s: 0, shot: "genset-mati", cam: ["plc", "ot"], z: 1.35, ring: ["plc", "red"], call: { box: "plc", head: "Genset mati", text: "MUSUH menulis perintah Modbus", side: "below", tone: "red" } },
    { s: 1, shot: "genset-mati", cam: "ot", z: 2.2, click: "start" },
    { s: 1, o: 0.8, shot: "genset-tolak", cam: "ot", z: 2.2, cut: true, ring: ["why", "red"], call: { box: "why", head: "Ditolak", text: "MUSUH masih bisa mematikannya lagi", side: "left", tone: "red" } },
    { s: 2, shot: "genset-tolak", cam: "ot", z: 2.2, click: "mb" },
    { s: 2, o: 0.8, shot: "genset-blokir", cam: "ot", z: 2.2, cut: true, click: "start" },
    { s: 2, o: 1.6, shot: "genset-nyala", cam: "ot", z: 2.2, cut: true, ring: ["ot", "green"], call: { box: "ot", head: "Genset menyala", text: "setelah tulis Modbus diblokir", side: "left", tone: "green" } },
  ],
  penutup: [
    { s: 0, card: "penutup", show: ["big", "pills"] },
    { s: 1, card: "penutup", show: ["big", "pills", "lead", "repo"] },
  ],
});
