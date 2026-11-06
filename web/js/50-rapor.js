// RAPOR: the paper sheet of the last run + verify any rapor file (works before any exercise).
const MONTHS = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
const tgl = (iso) => { const [y, m, d] = iso.split("-").map(Number); return `${d} ${MONTHS[m - 1]} ${y}`; };
// Verification only reads a rapor FILE. There is no editable text box and no way to change a value
// in the console: to show tamper detection, edit the saved file outside MUSUH and load it here.
const verifyState = { text: "", name: "", result: null, flow: null };

// Re-render RAPOR on updates only when what it shows changed (B2: never wipe the verify textarea on a tick).
renderRapor.needs = (v) => { const k = v ? `${v.runId}|${v.finished}|${v.rapor ? v.rapor.hash : ""}|${JSON.stringify(v.saved)}` : ""; if (k === renderRapor.key) return false; renderRapor.key = k; return true; };
function renderRapor() {
  const v = app.view, has = v && v.finished && v.rapor;
  $("#scr-rapor").innerHTML = `<div class="scroll">${stepperSvg("rapor")}<div class="rapor">
    <div>${has ? paper(v) : `<div class="empty">Rapor terbit setelah latihan selesai. Anda tetap bisa memverifikasi berkas rapor di panel kanan.</div>`}</div>
    <aside style="display:grid;gap:1rem">
      ${has ? `<section class="panel"><header><h2>Rapor ini</h2></header><div class="body" style="display:grid;gap:.5rem">
        ${v.saved && v.saved.ok ? `<div class="small">${st("normal", "tersimpan")} Tersimpan: <span class="mono" style="word-break:break-all">${esc(v.saved.path)}</span></div>`
          : `<div class="small" style="color:var(--critical)">${st("critical", "gagal")} Rapor belum tersimpan ke berkas: ${esc(v.saved ? v.saved.error : "menunggu")}. Unduh berkasnya atau coba simpan lagi.</div><button class="btn" id="r-retry">Coba simpan lagi</button>`}
        <button class="btn primary" id="r-print">${ico("print")}Cetak / simpan PDF</button>
        <button class="btn" id="r-save">${ico("file")}Unduh berkas rapor (JSON)</button>
        <button class="btn" id="r-test">${ico("check")}Uji verifikasi berkas ini</button></div></section>` : ""}
      <section class="panel"><header><h2>Verifikasi rapor</h2></header><div class="body" style="display:grid;gap:.5rem">
        <div class="small dim">Pilih berkas rapor (.json). MUSUH memutar ulang seluruh latihan dengan kode dan tindakan yang sama, lalu membandingkan nilai dan sidik SHA-256. Isi berkas tidak bisa diubah di sini.</div>
        ${verifyFlowSvg(verifyState.flow)}
        <label class="btn primary" style="justify-self:start">${ico("file")}Pilih berkas rapor<input type="file" id="r-file" accept=".json,application/json" class="sr"></label>
        ${verifyState.name ? `<div class="small">${ico("file")} <span class="mono">${esc(verifyState.name)}</span></div>` : ""}
        <div id="r-out">${verifyState.result || ""}</div></div></section>
    </aside></div></div>`;
  if (has) {
    $("#r-print").onclick = () => window.print();
    const rt = $("#r-retry"); if (rt) rt.onclick = async () => { try { const x = await api("/api/save", {}); toast(x.ok ? "Tersimpan: " + x.path : x.error, !x.ok); } catch (e) { toast(e.message, true); } };
    $("#r-save").onclick = () => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(v.rapor, null, 2)], { type: "application/json" })); a.download = `rapor-${v.rapor.code}-${v.rapor.verif}.json`; a.click(); };
    $("#r-test").onclick = () => { verifyState.text = JSON.stringify(v.rapor); verifyState.name = "rapor latihan ini"; verifyState.result = null; verifyState.flow = null; runVerify(); };
    $$("#scr-rapor .cite").forEach(c => c.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); c.click(); } });
    $$("#scr-rapor .cite").forEach(c => c.onclick = () => { $$("#scr-rapor tr.hl").forEach(t => t.classList.remove("hl")); const row = $("#row-" + c.dataset.row); if (row) { row.classList.add("hl"); row.scrollIntoView({ block: "center", behavior: "smooth" }); } });
  }
  // Choosing a file verifies it at once.
  $("#r-file").onchange = async (e) => { const f = e.target.files[0]; if (!f) return; if (f.size > 512 * 1024) return toast("Berkas terlalu besar", true);
    verifyState.text = await f.text(); verifyState.name = f.name; verifyState.result = null; verifyState.flow = null; runVerify(); };
}

async function runVerify() {
  let r; try { r = JSON.parse(verifyState.text); } catch { verifyState.flow = { structOk: false }; verifyState.result = `<div class="vres bad"><div class="big">${st("critical")}BERKAS RUSAK</div><div class="small">Isi bukan JSON yang valid.</div></div>`; return renderRapor(); }
  try {
    const v = await api("/api/verify", r);
    verifyState.flow = { ...v, structOk: !(v.why && !v.replay_score) };
    const row = (ok, t) => `<div>${st(ok ? "normal" : "critical")}<span>${t}</span></div>`;
    verifyState.result = `<div class="vres ${v.ok ? "ok" : "bad"}"><div class="big">${st(v.ok ? "normal" : "critical")}${v.ok ? "RAPOR SAH" : "RAPOR TIDAK SAH"}</div>
      <div class="small" style="margin-top:.25rem">${esc(r.trainee?.pangkat)} ${esc(r.trainee?.nama)} · kode ${esc(r.code)} · mode ${esc((r.mode || "").toUpperCase())}${r.trainer_view ? " · tampilan pelatih dibuka" : ""}</div>
      <div class="checks">
        ${v.why ? row(false, esc(v.why)) : ""}
        ${row(v.hash_ok, v.hash_ok ? "Sidik SHA-256 cocok dengan isi berkas." : "Sidik SHA-256 tidak cocok: isi berkas diubah setelah diterbitkan.")}
        ${v.replay_score ? row(v.score_ok, v.score_ok ? `Putar ulang menghasilkan nilai yang sama: ${v.replay_total} (${esc(v.replay_verdict)}).` : `Putar ulang menghasilkan <b>${v.replay_total} (${esc(v.replay_verdict)})</b>, bukan ${esc(r.total)} (${esc(r.verdict)}) seperti tertulis.`) : ""}
        ${v.replay_score ? row(true, `MUSUH diputar ulang dari awal: ${v.enemy_steps} langkah berhasil, ${(r.actions || []).length} tindakan peserta.`) : ""}
      </div>
      <div class="limit">Nilai konsisten dengan rekaman tindakan ini. Identitas peserta dan keaslian rekaman tidak dibuktikan oleh berkas ini; itu tanggung jawab pelatih yang menandatangani.</div></div>`;
  } catch (e) { verifyState.result = `<div class="vres bad"><div class="big">${st("critical")}TIDAK BISA DIVERIFIKASI</div><div class="small">${esc(e.message)}</div></div>`; }
  renderRapor();
}

function paper(v) {
  const r = v.rapor, sc = v.score, L = app.lib, T = r.trainee;
  const cite = (s) => esc(s).replace(/\[#(\d+)\]/g, (m, n) => `<span class="cite" data-row="${n}" tabindex="0" role="button" aria-label="Lompat ke baris ${n}">[#${n}]</span>`);
  const used = [...new Set([...v.scenario.basis, ...v.red.filter(x => x.executed).flatMap(x => x.src)])];
  const rules = [...new Map(v.alerts.map(a => [a.rule, a])).values()];
  return `<article class="paper">
    <div class="kop"><div class="u">Tentara Nasional Indonesia Angkatan Darat</div><div class="small">${esc(T.satuan || "Satuan")} · Seksi Siber</div></div>
    <h1>RAPOR PRESTASI SIBER</h1><div class="not-official">Rapor latihan simulasi, bukan dokumen dinas</div>
    <div class="no">Nomor: RPS/${r.date.slice(0, 4)}/${esc(r.code)}/${esc(r.verif.slice(0, 4))}</div>
    <table><tr><th style="width:30%">Nama / Pangkat</th><td><b>${esc(T.pangkat)} ${esc(T.nama)}</b></td></tr><tr><th>NRP</th><td>${esc(T.nrp || "-")}</td></tr>
      <tr><th>Skenario</th><td>${esc(v.scenario.title)} <i>(rekaan berbasis insiden nyata)</i></td></tr>
      <tr><th>Kode latihan · mode</th><td class="mono">${esc(r.code)} · ${esc(r.mode.toUpperCase())} · ${r.speed}×${r.trainer_view ? " · tampilan pelatih dibuka selama latihan" : ""}</td></tr>
      <tr><th>Tanggal</th><td>${tgl(r.date)}</td></tr><tr><th>Hasil</th><td><b>${esc(r.verdict)}</b> · nilai <b>${r.total}</b>/100 · ${esc(r.grade)}</td></tr></table>
    <h3>1. Ringkasan</h3><p>${v.narrative.kept.map(cite).join(" ")}</p>
    ${v.narrative.dropped.length ? `<div class="dropped"><b>Dibuang oleh gerbang sitasi (${v.narrative.dropped.length}):</b> ${v.narrative.dropped.map(d => `"${esc(d.sentence)}" menyitir baris ${d.bad.map(b => "#" + b).join(", ")} yang tidak ada.`).join(" ")}</div>` : ""}
    <h3>2. Rincian nilai</h3><table><tr><th>Unsur</th><th>Nilai</th><th>Dasar</th></tr>${sc.parts.map(p => `<tr><td>${esc(p.k)}</td><td>${p.v} / ${p.max}</td><td>${esc(p.note)}</td></tr>`).join("")}
      <tr><td><b>Jumlah</b></td><td><b>${sc.total} / 100</b></td><td>Dihitung dari rekaman MUSUH vs tindakan peserta. Bobot 25/40/25/10 adalah usulan perancang.</td></tr></table>
    <h3>3. Sasaran latihan</h3><table><tr><th>Sasaran</th><th>Hasil</th><th>Keterangan</th></tr>${sc.objectives.map(o => `<tr><td>${esc(o.id)} ${esc(o.text)}</td><td><b>${o.go ? "GO" : "NO-GO"}</b></td><td>${esc(o.note)}</td></tr>`).join("")}</table>
    <h3>4. Langkah MUSUH yang berhasil</h3><table><tr><th>Waktu</th><th>Teknik</th><th>Peringatan</th><th>Yang akan menghentikan</th></tr>
      ${v.lessons.map(l => `<tr><td>${fmtJ(l.t)}</td><td>${esc(l.tech)}<br><small>${esc(l.name)}</small></td><td>${l.alerts.length ? l.alerts.map(esc).join(", ") : "<i>tidak ada (celah deteksi)</i>"}</td><td>${l.stops.map(esc).join("<br>")}</td></tr>`).join("") || `<tr><td colspan="4">MUSUH tidak berhasil satu langkah pun.</td></tr>`}</table>
    <h3>5. Garis waktu</h3><table><tr><th>No</th><th>Waktu</th><th>Kejadian</th></tr>${v.timeline.map(t => `<tr id="row-${t.n}"><td>#${t.n}</td><td>${fmtJ(t.t)}</td><td>${esc(t.text)}</td></tr>`).join("")}</table>
    <h3>6. Dasar skenario dan aturan deteksi</h3>
    <table><tr><th>Sumber publik (dasar skenario)</th></tr>${used.map(k => `<tr><td>${esc(L.sources[k].label)}<br><small>${esc(L.sources[k].url)}</small></td></tr>`).join("")}</table>
    ${rules.length ? `<table style="margin-top:.5rem"><tr><th>Aturan</th><th>Asal</th></tr>${rules.map(a => `<tr><td>${esc(a.rule)} ${esc(a.title)}</td><td><small>${a.own ? "Aturan MUSUH sendiri. " + esc(a.simplified) : `<a href="${esc(SIGMA_PIN + a.path)}" target="_blank" rel="noopener">SigmaHQ ${esc(a.sid)}</a> (${esc(a.path)}, commit c68bb91), disederhanakan: ${esc(a.simplified)}`}</small></td></tr>`).join("")}</table>` : ""}
    <div class="seal"><div style="font:700 .75rem var(--sans);text-align:center">KODE<br>VERIFIKASI</div><div><div class="code">${esc(r.verif)}</div><div class="hash">SHA-256 ${esc(r.hash)}</div>
      <div class="small" style="margin-top:.25rem">Periksa dengan <span class="mono">musuh verify berkas.json</span> atau layar RAPOR. Nilai konsisten dengan rekaman tindakan; identitas peserta dibuktikan oleh tanda tangan pelatih.</div></div></div>
    <div class="sig"><div>Peserta<div class="line">${esc(T.pangkat)} ${esc(T.nama)}</div></div><div>Mengetahui, Pelatih<div class="line">&nbsp;</div></div></div>
    <div class="foot">Diterbitkan oleh MUSUH ${esc(r.v)} tanpa koneksi internet. Jaringan latihan adalah model yang memancarkan telemetri berformat asli. Prototipe untuk Kartika Cyber Hackathon 2026.</div>
  </article>`;
}
