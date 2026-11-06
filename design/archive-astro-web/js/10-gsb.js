// Global Status Bar: identity + app state, mode switch, monitoring icons, mission clock, operator, tools.
function worst(statuses) {
  const order = ["off", "standby", "normal", "caution", "serious", "critical"];
  return statuses.reduce((w, s) => order.indexOf(s) > order.indexOf(w) ? s : w, "off");
}
function monitors(v) {
  if (!v) return [];
  const it = v.assets.filter(a => a.seg === "IT"), ot = v.assets.filter(a => a.seg === "OT");
  const sum = (arr) => { const s = worst(arr.map(a => a.status)); return s === "off" && arr.some(a => !a.isolated) ? "standby" : s; };
  const m = [{ lbl: "Jaringan IT", status: sum(it), val: `${it.filter(a => a.status !== "standby" && !a.isolated).length}/${it.length} berindikasi` }];
  if (v.scenario.hasOT) {
    const g = v.genset;
    m.push({ lbl: "Genset", status: g.running ? "normal" : "critical", val: g.running ? `${g.kw} kW` : "BERHENTI" });
  }
  const unread = v.alerts.filter(a => !app.seenAlerts.has(a.n)).length;
  m.push({ lbl: "Peringatan", status: v.alerts.length ? worst(v.alerts.map(a => a.status)) : "off", val: `${v.alerts.length} total · ${unread} baru` });
  m.push({ lbl: "Firewall", status: v.blockedIps.length ? "normal" : "standby", val: `${v.blockedIps.length} IP diblokir` });
  return m;
}
function runState(v) {
  if (!v) return { txt: "SIAGA", cls: "" };
  if (v.aborted) return { txt: "DIBATALKAN", cls: "" };
  if (v.finished) return { txt: "SELESAI", cls: "" };
  if (v.handedOver) return { txt: "MENYELESAIKAN", cls: "" };
  if (v.paused) return { txt: "JEDA", cls: "" };
  return { txt: "BERJALAN", cls: "" };
}
function renderGsb() {
  const v = app.view, live = v && !v.finished, rs = runState(v);
  const tabs = [["siapkan", "SIAPKAN", true], ["operasi", "OPERASI", !!v], ["evaluasi", "EVALUASI", !!(v && v.finished)], ["rapor", "RAPOR", true]];
  const html = `
    <div class="app"><div class="name">MUSUH</div>
      <div class="row"><span class="tag sim" title="Simulasi: tidak menyentuh sistem nyata">LATIHAN · SIMULASI</span>${v ? `<span class="tag ${v.mode}">${v.mode === "uji" ? "MODE UJI" : "MODE LATIH"}</span>` : ""}</div></div>
    <nav class="tabs" aria-label="Tahap">${tabs.map(([id, l, en]) => `<button data-go="${id}" ${en ? "" : "disabled"} ${app.screen === id ? 'aria-current="page"' : ""}>${l}</button>`).join("")}</nav>
    <div class="mon">${monitors(v).map(m => `<div class="monitor" title="${esc(m.lbl)}: ${esc(STATUS_TEXT[m.status])}">${st(m.status, STATUS_TEXT[m.status])}<div><div class="lbl">${esc(m.lbl)}</div><div class="val">${esc(m.val)}</div></div></div>`).join("")}</div>
    <div class="clock"><div class="t mono" id="clock">${v ? v.clock : "J+00:00"}</div><div class="s">${esc(rs.txt)}${v ? ` · ${v.mode === "uji" ? "4× (terkunci)" : v.speed + "×"} · ${esc(v.code)}` : ""}</div></div>
    <div class="who">${v ? `<b>${esc(v.trainee.pangkat)} ${esc(v.trainee.nama)}</b><span>${esc(v.trainee.satuan)}</span>` : `<b>Belum ada peserta</b><span>Siapkan latihan</span>`}</div>
    ${live && v.mode === "latih" && !v.handedOver ? `<div class="speedctl"><div class="seg" role="group" aria-label="Kecepatan">${[1, 4, 10].map(s => `<button data-key="spd${s}" data-speed="${s}" aria-pressed="${v.speed === s}" title="Kecepatan ${s}×">${s}×</button>`).join("")}</div></div>` : ""}
    <div class="conn" id="gsb-conn" aria-live="polite"></div>
    <div class="tools">
      ${live && v.mode === "latih" && !v.handedOver ? `<button class="iconbtn" data-key="t-pause" id="t-pause" title="${v.paused ? "Lanjutkan" : "Jeda"} (Spasi)" aria-pressed="${v.paused}">${ico(v.paused ? "play" : "pause")}</button>` : ""}
      ${live ? `<button class="iconbtn" data-key="t-trainer" id="t-trainer" title="Tampilan pelatih: kebenaran musuh (tercatat di rapor)" aria-pressed="${app.reveal}">${ico("eye")}</button>` : ""}
      <button class="iconbtn" data-key="t-present" id="t-present" title="Mode presentasi (perbesar)" aria-pressed="${document.documentElement.classList.contains("presentasi")}">${ico("screen")}</button>
      <button class="iconbtn" data-key="t-help" id="t-help" title="Bantuan dan tombol (?)">${ico("help")}</button>
    </div>`;
  // Rebuilt HTML loses the "cut" marks, so fit again after every real change (and on resize/fonts).
  patch($("#gsb"), html.replace(/<button data-go="(\w+)"/g, '<button data-key="tab-$1" data-go="$1"'));
  fitGsb(); // cheap: only toggles classes; widths change with the clock and counters even when markup is reused
  $$("#gsb [data-go]").forEach(b => b.onclick = () => go(b.dataset.go));
  $$("#gsb [data-speed]").forEach(b => b.onclick = () => control({ speed: Number(b.dataset.speed) }));
  const p = $("#t-pause"); if (p) p.onclick = () => control({ paused: !app.view.paused });
  const tr = $("#t-trainer"); if (tr) tr.onclick = toggleTrainer;
  $("#t-present").onclick = () => { document.documentElement.classList.toggle("presentasi"); render(); fitGsb(); };
  $("#t-help").onclick = openHelp;
}
function toggleTrainer() {
  if (!app.reveal && !confirm("Buka tampilan pelatih? Kebenaran musuh akan terlihat dan hal ini dicatat di rapor.")) return;
  app.reveal = !app.reveal; if (app.reveal) control({ trainer_view: true }); refresh();
}
function openHelp() {
  const d = $("#help");
  d.innerHTML = `<header>Bantuan konsol</header><div class="content">
    <p class="small dim" style="margin-top:0">Pilih satu peringatan, lalu pilih tindakan. Setiap tindakan menampilkan kata kerja dan sasarannya dulu; tekan Enter untuk menjalankan atau Esc untuk batal.</p>
    <table class="keys">
      <tr><td><span class="key">↑ ↓</span></td><td>Pilih peringatan (peringatan baru tidak mengubah pilihan)</td></tr>
      <tr><td><span class="key">1</span>–<span class="key">4</span></td><td>Tindakan pada peringatan terpilih</td></tr>
      <tr><td><span class="key">N</span></td><td>Nyatakan insiden</td></tr>
      <tr><td><span class="key">Enter</span> / <span class="key">Esc</span></td><td>Jalankan / batalkan tindakan</td></tr>
      <tr><td><span class="key">Spasi</span></td><td>Jeda / lanjut (mode Latih saja)</td></tr>
      <tr><td><span class="key">?</span></td><td>Bantuan ini</td></tr></table>
    <p class="small dim">Tampilan memakai Astro UXDS (Rocket Communications, Inc., berlisensi; lihat <a href="/ASTRO-LICENSE.txt" style="color:var(--interactive)">lisensi</a>). Tidak ada dukungan atau endorsement dari pemerintah AS. Huruf Roboto, SIL Open Font License.</p></div>
    <footer><button class="btn primary" id="help-close">Tutup</button></footer>`;
  // Return focus to the current Help button after closing (the header may have been re-rendered).
  d.onclose = () => { const h = $("#t-help"); h && h.focus(); };
  d.showModal(); $("#help-close").onclick = () => d.close();
}

// B1: if the required groups do not fit on one row (narrow window or presentation scale), switch the
// bar to two rows. Measured from the real widths, so it holds at any width, label length or scale.
function fitGsb() {
  const g = $("#gsb"); if (!g) return;
  const mon = g.querySelector(":scope > .mon");
  const items = mon ? [...mon.querySelectorAll(".monitor")] : [];
  items.forEach(i => i.classList.remove("cut"));
  g.classList.remove("two-rows");
  const need = [".app", ".tabs", ".clock", ".speedctl", ".conn", ".tools"].map(s => g.querySelector(":scope > " + s)).filter(Boolean)
    .reduce((w, e) => w + e.getBoundingClientRect().width, 0);
  if (need + 8 > g.clientWidth) g.classList.add("two-rows");
  // Optional monitors: keep whole items only; drop from the end until every shown item is fully inside.
  if (mon && getComputedStyle(mon).display !== "none") {
    const box = mon.getBoundingClientRect(), cs = getComputedStyle(mon);
    const L = box.left + parseFloat(cs.paddingLeft), R = box.right - parseFloat(cs.paddingRight);
    const out = (i) => { const r = i.getBoundingClientRect(); return r.left < L - 0.5 || r.right > R + 0.5; };
    for (let k = items.length - 1; k >= 0 && items.some(i => !i.classList.contains("cut") && out(i)); k--) items[k].classList.add("cut");
  }
}
window.addEventListener("resize", fitGsb);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitGsb);
