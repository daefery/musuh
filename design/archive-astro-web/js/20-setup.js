// SIAPKAN: choose scenario, trainee, exercise code, mode. Start.
const SC_ICON = { "domain-takeover": "dc", "ransomware-pusdat": "hv", "listrik-markas": "plc" };
const setup = { scenario: null, mode: "latih", speed: 4 };

function renderSetup() {
  const L = app.lib; if (!L) return;
  if (!setup.scenario) setup.scenario = L.scenarios[0].id;
  const sc = L.scenarios.find(s => s.id === setup.scenario);
  const prev = setup.form || { pangkat: "Sertu", nama: "", nrp: "", satuan: "", code: "MSH-7Q2K" };
  const running = app.view && !app.view.finished;
  $("#scr-siapkan").innerHTML = `<div class="scroll">
    <div class="lede"><div><h1>Siapkan latihan</h1>
      <p>MUSUH menyerang jaringan latihan di dalam laptop ini, tidak menyentuh sistem nyata. Bila satu jalan ditutup, ia mencari jalan lain. Peserta dengan kode latihan yang sama menghadapi musuh yang sama, sehingga nilainya bisa dibandingkan dan diperiksa ulang.</p></div></div>
    ${running ? `<div class="rekaan" style="max-width:1400px;margin:0 auto 1rem">${st("caution")}<span><b>Latihan sedang berjalan.</b> Kembali ke OPERASI untuk melanjutkan. Memulai latihan baru akan menggantikannya.</span></div>` : ""}
    <div class="setup">
      <section class="panel"><header><h2>Skenario</h2><span class="grow"></span><span class="count">${L.scenarios.length} skenario · ${L.rules} aturan deteksi</span></header>
        <div class="body"><div class="scn-list">${L.scenarios.map(s => `
          <button class="scn" data-id="${s.id}" aria-pressed="${s.id === setup.scenario}">
            <span class="ico">${ico(SC_ICON[s.id] || "shield")}</span>
            <span><div class="t">${esc(s.title)}</div><div class="d">${esc(s.brief)}</div>
              <div class="chips"><span class="chip">${s.hosts} aset</span><span class="chip">${s.phases} tahap · ${s.routes} rute musuh</span><span class="chip">${s.ot ? "IT + OT" : "IT"}</span></div></span>
            <span>${s.id === setup.scenario ? `<span class="chip" style="border-color:var(--interactive);color:var(--interactive)">DIPILIH</span>` : ""}</span>
          </button>`).join("")}</div>
          <div class="rekaan">${ico("flag")}<span><b>Skenario latihan rekaan berbasis insiden nyata.</b> Jaringan, host, akun dan alamat IP rekaan (alamat luar dari rentang dokumentasi RFC 5737). Urutan dan teknik serangan diambil dari sumber publik:</span></div>
          <div class="srcs">${sc.basis.map(k => `<a href="${esc(L.sources[k].url)}" target="_blank" rel="noopener">${ico("file")}${esc(L.sources[k].label)}</a>`).join("")}</div>
          <h3 class="small dim" style="margin:1rem 0 .375rem;letter-spacing:.1em;text-transform:uppercase">Sasaran latihan</h3>
          <ul class="objlist">${sc.objectives.map(o => `<li><b>${o.id}</b><span>${esc(o.text)}</span></li>`).join("")}</ul>
        </div></section>
      <section class="panel"><header><h2>Peserta dan kondisi</h2></header>
        <div class="body"><form class="form" id="f-setup" autocomplete="off">
          <div class="field"><label for="f-pangkat">Pangkat</label><select class="input" id="f-pangkat">${["Prada","Pratu","Praka","Kopda","Koptu","Serda","Sertu","Serka","Serma","Letda","Lettu","Kapten"].map(p => `<option ${p === prev.pangkat ? "selected" : ""}>${p}</option>`).join("")}</select></div>
          <div class="field"><label for="f-nama">Nama</label><input class="input" id="f-nama" required value="${esc(prev.nama)}" placeholder="Nama peserta"></div>
          <div class="field"><label for="f-nrp">NRP</label><input class="input" id="f-nrp" value="${esc(prev.nrp)}" inputmode="numeric"></div>
          <div class="field"><label for="f-satuan">Satuan</label><input class="input" id="f-satuan" value="${esc(prev.satuan)}"></div>
          <div class="field full"><label for="f-code">Kode latihan (dari pelatih)</label><input class="input mono" id="f-code" value="${esc(prev.code)}" maxlength="8" style="font-size:1.125rem;letter-spacing:.12em"></div>
          <div class="field full"><label>Mode</label>
            <div class="seg" role="group" aria-label="Mode"><button type="button" data-mode="latih" aria-pressed="${setup.mode === "latih"}">LATIH</button><button type="button" data-mode="uji" aria-pressed="${setup.mode === "uji"}">UJI</button></div>
            <div class="modehelp">${setup.mode === "latih" ? "Latih: saran tindakan tampil, boleh jeda dan ganti kecepatan. Untuk belajar." : "Uji: tanpa saran, tanpa jeda, kecepatan dikunci 4×. Untuk rapor yang dibandingkan antarpeserta."}</div></div>
          ${setup.mode === "latih" ? `<div class="field full"><label>Kecepatan waktu</label><div class="seg" role="group" aria-label="Kecepatan">${[1, 4, 10].map(s => `<button type="button" data-speed="${s}" aria-pressed="${setup.speed === s}">${s}×</button>`).join("")}</div></div>` : ""}
          <div class="full" style="margin-top:.5rem"><button class="btn primary big" type="submit">${ico("play")}Mulai latihan</button></div>
        </form></div></section>
    </div></div>`;
  $$("#scr-siapkan .scn").forEach(b => b.onclick = () => { keepForm(); setup.scenario = b.dataset.id; renderSetup(); });
  $$("#scr-siapkan [data-mode]").forEach(b => b.onclick = () => { keepForm(); setup.mode = b.dataset.mode; renderSetup(); });
  $$("#scr-siapkan [data-speed]").forEach(b => b.onclick = () => { keepForm(); setup.speed = Number(b.dataset.speed); renderSetup(); });
  $("#f-setup").onsubmit = (e) => { e.preventDefault(); startExercise(); };
}
function keepForm() {
  setup.form = { pangkat: $("#f-pangkat").value, nama: $("#f-nama").value, nrp: $("#f-nrp").value, satuan: $("#f-satuan").value, code: $("#f-code").value };
}
async function startExercise() {
  keepForm();
  if (!setup.form.nama.trim()) { $("#f-nama").focus(); return toast("Nama peserta wajib diisi", true); }
  if (app.view && !app.view.finished && !confirm("Latihan yang sedang berjalan akan diganti. Lanjut?")) return;
  try {
    const v = await api("/api/start", { scenario: setup.scenario, code: setup.form.code, mode: setup.mode, speed: setup.speed,
      trainee: { nama: setup.form.nama, pangkat: setup.form.pangkat, nrp: setup.form.nrp, satuan: setup.form.satuan } });
    newGeneration(); app.runId = v.runId; app.view = v; app.stale = false;
    app.selAlert = null; app.selAsset = null; app.reveal = false; app.seenAlerts = new Set(); app.pending = null;
    go("operasi");
  } catch (e) { toast(e.message, true); }
}
