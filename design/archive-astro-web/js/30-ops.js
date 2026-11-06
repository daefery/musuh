// OPERASI: assets (observations only) | action queue | asset detail; event log below the queue.
// Selection is by alert id; new alerts never move the selection or focus (R9).
const KIND_LABEL = { isolate: "Isolasi host", block: "Blokir IP", reset: "Reset akun", "modbus-block": "Blokir tulis Modbus", incident: "Nyatakan insiden", "genset-start": "Nyalakan genset (panel lokal)" };
const KIND_ICON = { isolate: "cut", block: "wall", reset: "key", "modbus-block": "plc", incident: "flag", "genset-start": "bolt" };
let lastAlertCount = 0;

function renderOps() {
  const v = app.view;
  const root = $("#scr-operasi");
  if (!v) { root.innerHTML = `<div class="scroll"><div class="empty">Belum ada latihan. Buka SIAPKAN.</div></div>`; return; }
  if (!root.querySelector(".ops")) { root.innerHTML = opsSkeleton(); $("#log-q").oninput = () => renderLog(app.view); }
  const locked = v.finished || v.handedOver || v.paused || !live();
  patch($("#ops-brief"), briefBar(v));
  renderAssets(v);
  renderQueue(v, locked);
  renderDetail(v, locked);
  renderLog(v);
  bindOpsButtons();
  if (v.finished && !v.aborted && !renderOps.jumped) { renderOps.jumped = true; setTimeout(() => go("evaluasi"), 600); }
  if (!v.finished) renderOps.jumped = false;
}
function opsSkeleton() {
  return `<div class="ops">
    <div class="brief" id="ops-brief"></div>
    <section class="panel assets" aria-label="Aset"><header><h2>Aset</h2><span class="grow"></span><span class="count" id="asset-count"></span></header><div class="body" id="assets"></div></section>
    <section class="panel queue" aria-label="Antrean tindakan"><header><h2>Antrean peringatan</h2><span class="grow"></span><span class="count" id="alert-count"></span></header>
      <div class="body" id="queue"></div>
      <div class="confirm" id="confirm" role="alertdialog" aria-live="assertive"></div></section>
    <section class="panel detail" aria-label="Detail aset"><header><h2>Detail</h2></header><div class="body" id="detail"></div></section>
    <section class="panel log" aria-label="Log kejadian"><header><h2>Log telemetri</h2><span class="grow"></span><input class="input search" id="log-q" placeholder="Saring log" aria-label="Saring log"><span class="count" id="log-count"></span></header><div class="body" id="log"></div></section>
  </div>`;
}
function briefBar(v) {
  const btn = v.finished ? `<button class="btn" data-go2="evaluasi">${ico("check")}Lihat evaluasi</button>`
    : v.handedOver ? `<span class="chip">${st("standby")}Konsol diserahkan. Sisa waktu dijalankan…</span>`
    : `<button class="btn" data-key="b-incident" id="b-incident" ${v.incidentAt != null ? "disabled" : ""}>${ico("flag")}Nyatakan insiden<kbd>N</kbd></button>
       <button class="btn" data-key="b-handover" id="b-handover" title="Selesai bertindak. Sisa waktu tetap dijalankan sampai skenario selesai.">${ico("handover")}Serahkan konsol</button>
       ${v.mode === "latih" ? `<button class="btn danger" data-key="b-abort" id="b-abort" title="Batalkan tanpa rapor">${ico("x")}Batalkan</button>` : ""}`;
  return `<span class="mono dim small">${esc(v.code)}</span><span class="title">${esc(v.scenario.title)}</span>
    ${v.incidentAt != null ? `<span class="chip">${st("normal")}Insiden dinyatakan ${fmtJ(v.incidentAt)}</span>` : ""}
    <span class="grow"></span>${btn}`;
}
function renderAssets(v) {
  const zone = (title, list) => list.length ? `<div class="zone"><h3>${esc(title)}</h3>${list.join("")}</div>` : "";
  const assetBtn = (a) => `<button class="asset ${a.isolated ? "off" : ""}" data-key="asset-${a.id}" data-asset="${a.id}" aria-selected="${app.selAsset === a.id}">
      <span class="ico">${ico(HOST_ICON(a))}${st(a.status, STATUS_TEXT[a.status])}</span>
      <span style="min-width:0"><div class="lbl">${esc(a.id)}</div><div class="sub">${esc(a.sub)}</div></span>
      <span>${a.truth && a.truth.foothold ? `<span class="truth" title="Kebenaran (tampilan pelatih)">MUSUH</span>` : `<span class="ip">${esc(a.ip.split(".").slice(-2).join("."))}</span>`}</span></button>`;
  const outBtn = (o) => `<div class="asset ${o.blocked ? "off" : ""}" style="cursor:default"><span class="ico">${ico(o.ip ? "globe" : "mail")}${st(o.blocked ? "off" : o.ip ? "caution" : "standby")}</span>
      <span style="min-width:0"><div class="lbl mono" style="font-size:.8125rem">${esc(o.id)}</div><div class="sub">${o.blocked ? "Diblokir firewall" : esc(o.role)}</div></span><span></span></div>`;
  const it = v.assets.filter(a => a.seg === "IT"), ot = v.assets.filter(a => a.seg === "OT");
  const prev = renderAssets.prev || {};
  patch($("#assets"), zone("Jaringan IT", it.map(assetBtn)) + zone("Segmen OT", ot.map(assetBtn)) + zone("Luar jaringan (teramati)", v.outside.map(outBtn))
    + (app.reveal && v.phases ? trainerBox(v) : ""));
  $("#asset-count").textContent = `${v.assets.length} aset`;
  // R14: one flash when an asset's status changes.
  v.assets.forEach(a => { if (prev[a.id] && prev[a.id] !== a.status) { const el = $(`[data-asset="${a.id}"]`); el && el.classList.add("flash"); } });
  renderAssets.prev = Object.fromEntries(v.assets.map(a => [a.id, a.status]));
  $$("#assets [data-asset]").forEach(b => b.onclick = () => { app.selAsset = b.dataset.asset; app.pending = null; renderOps(); });
}
function trainerBox(v) {
  return `<div class="trainer"><h4>Tampilan pelatih · kebenaran musuh</h4>
    <div class="phases">${v.phases.map(p => `<i class="${p.state}" title="${esc(p.goal)}: ${p.state}"></i>`).join("")}</div>
    ${(v.thoughts || []).slice(0, 5).map(t => `<div class="thought ${t.mood}"><div class="tt">${fmtJ(t.t)} · Pikiran MUSUH</div>${esc(t.text)}</div>`).join("") || `<div class="small dim">MUSUH sedang mengamati.</div>`}
    ${movesHtml(v, 6)}</div>`;
}
// Enemy movements as a plain from -> to list (ground truth; trainer view and debrief only).
function movesHtml(v, limit) {
  const m = (v.moves || []).slice().reverse().slice(0, limit || 999);
  if (!m.length) return "";
  return `<h4 style="margin-top:.625rem">Gerak MUSUH</h4>${m.map(x => `<div class="small mono" style="display:flex;gap:.375rem;align-items:center">${st(x.ok ? "serious" : "off")}<span>${fmtJ(x.t)} ${esc(x.from)} → ${esc(x.to)}${x.ok ? "" : " (gagal)"}</span></div>`).join("")}`;
}

// ---- action queue ----
function alertActions(v, a) {
  // Latih: the server's observation-based suggestions. Uji: no suggestions; actions come from the detail pane.
  return (a.recs || []).slice(0, 4);
}
function renderQueue(v, locked) {
  const q = $("#queue");
  if (!v.alerts.length) { patch(q, `<div class="empty">Belum ada peringatan. Pantau log telemetri di bawah.</div>`); $("#alert-count").textContent = "0"; return; }
  const sel = app.selAlert;
  const isNew = (a) => !app.seenAlerts.has(a.n);
  const items = [...v.alerts].reverse();
  patch(q, items.map(a => {
    const acts = alertActions(v, a);
    const selected = sel === a.n;
    return `<article class="alert ${a.status} ${isNew(a) ? "new" : ""}" data-key="alert-${a.n}" data-alert="${a.n}" aria-selected="${selected}" tabindex="0" role="option" aria-label="${esc(a.title)} di ${esc(a.host)}">
      ${st(a.status, a.level)}
      <div><div class="ttl">${esc(a.title)}</div>
        <div class="meta">${fmtJ(a.t)} · ${esc(a.host)} · ${esc(a.rule)} · ${a.own ? "aturan MUSUH" : `<a data-key="src-${a.n}" href="${esc(SIGMA_PIN + a.path)}" target="_blank" rel="noopener" style="color:inherit" title="${esc(a.sigmaTitle)} · disederhanakan: ${esc(a.simplified)}">SigmaHQ ${esc(a.sid.slice(0, 8))}</a>`}</div></div>
      <span class="lvl">${esc(a.level)}</span>
      ${selected && acts.length ? `<div class="acts">${acts.map((r, i) => `<button class="btn" data-key="rec-${a.n}-${i}" data-act="${r.kind}" data-arg="${esc(r.arg ?? "")}" ${locked ? "disabled" : ""}>${ico(KIND_ICON[r.kind])}${esc(r.label)}<kbd>${i + 1}</kbd></button>`).join("")}</div>` : ""}
      ${selected && !acts.length && v.mode === "uji" ? `<div class="why">Mode Uji: tentukan tindakan sendiri dari panel Detail aset.</div>` : ""}
    </article>`;
  }).join(""));
  v.alerts.forEach(a => app.seenAlerts.add(a.n));
  $("#alert-count").textContent = `${v.alerts.length}`;
  const pick = (el) => { app.selAlert = Number(el.dataset.alert); const a = v.alerts.find(x => x.n === app.selAlert); if (a) app.selAsset = a.host; app.pending = null; renderOps(); };
  $$("#queue [data-alert]").forEach(el => {
    el.onclick = (e) => { if (!e.target.closest("[data-act]")) pick(el); };
    el.onkeydown = (e) => { if ((e.key === "Enter" || e.key === " ") && e.target === el) { e.preventDefault(); e.stopPropagation(); pick(el); } };
  });
  renderConfirm();
}
// R9: every command shows verb + exact target first; Enter confirms, Esc cancels.
function ask(kind, arg) {
  if (!app.view || app.view.finished || app.view.handedOver) return;
  app.pending = { kind, arg: arg || null }; renderConfirm(); $("#confirm-go") && $("#confirm-go").focus();
}
function renderConfirm() {
  const c = $("#confirm"); if (!c) return;
  const p = app.pending;
  c.classList.toggle("on", !!p);
  if (!p) { patch(c, ""); return; }
  patch(c, `<div class="what">${ico(KIND_ICON[p.kind])} ${esc(KIND_LABEL[p.kind])}${p.arg ? ` <b class="mono">${esc(p.arg)}</b>` : ""}?</div>
    <button class="btn primary" data-key="confirm-go" id="confirm-go">Jalankan<kbd>Enter</kbd></button><button class="btn" data-key="confirm-no" id="confirm-no">Batal<kbd>Esc</kbd></button>`);
  $("#confirm-go").onclick = doPending; $("#confirm-no").onclick = () => { app.pending = null; renderConfirm(); };
}
async function doPending() { const p = app.pending; app.pending = null; renderConfirm(); if (p) await command(p.kind, p.arg); }

// ---- asset detail ----
function renderDetail(v, locked) {
  const d = $("#detail");
  const a = v.assets.find(x => x.id === app.selAsset);
  if (!a) { patch(d, `<div class="empty">Pilih aset atau peringatan untuk melihat detail dan tindakan.</div>`); return; }
  const its = v.alerts.filter(x => x.host === a.id);
  const dis = locked ? "disabled" : "";
  const ipBtns = v.seenIps.filter(ip => !v.blockedIps.includes(ip)).map(ip => `<button class="btn" data-key="blk-${esc(ip)}" data-act="block" data-arg="${esc(ip)}" ${dis}>${ico("wall")}Blokir ${esc(ip)}<span></span></button>`).join("");
  const accBtns = v.seenAccounts.filter(x => !v.resetAccounts.includes(x)).map(x => `<button class="btn" data-key="rst-${esc(x)}" data-act="reset" data-arg="${esc(x)}" ${dis}>${ico("key")}Reset ${esc(x)}<span></span></button>`).join("");
  const ot = a.seg === "OT" && /PLC/.test(a.id) ? otBox(v, dis) : "";
  patch(d, `<div class="ident"><span class="ico">${ico(HOST_ICON(a))}${st(a.status, STATUS_TEXT[a.status])}</span>
      <div><div class="nm">${esc(a.id)}</div><div class="small dim">${esc(STATUS_TEXT[a.status])} · ${esc(a.sub)}</div></div></div>
    <dl><dt>Peran</dt><dd>${esc(a.role)}</dd><dt>Alamat</dt><dd class="mono">${esc(a.ip)}</dd><dt>Sistem</dt><dd>${esc(a.os)}</dd><dt>Segmen</dt><dd>${esc(a.seg)}</dd></dl>
    ${ot}
    <h4>Tindakan pada aset ini</h4>
    <div class="cmds"><button class="btn" data-key="iso-${esc(a.id)}" data-act="isolate" data-arg="${esc(a.id)}" ${a.isolated ? "disabled" : dis}>${ico("cut")}${a.isolated ? "Sudah diisolasi" : "Isolasi " + esc(a.id)}<span></span></button></div>
    <h4>Firewall (alamat luar yang teramati)</h4><div class="cmds">${ipBtns || `<div class="small dim">${v.seenIps.length ? "Semua alamat luar yang teramati sudah diblokir." : "Belum ada alamat luar yang teramati."}</div>`}</div>
    <h4>Kredensial (akun yang teramati)</h4><div class="cmds">${accBtns || `<div class="small dim">${v.seenAccounts.length ? "Semua akun yang teramati sudah direset." : "Belum ada akun yang teramati."}</div>`}</div>
    <h4>Peringatan di aset ini</h4>${its.length ? its.slice().reverse().map(x => `<div class="small" style="display:flex;gap:.375rem;align-items:center;margin-bottom:.25rem">${st(x.status)}<span>${fmtJ(x.t)} ${esc(x.title)}</span></div>`).join("") : `<div class="small dim">Tidak ada.</div>`}`);
}
function otBox(v, dis) {
  const g = v.genset, refused = renderDetail.refused;
  return `<div class="ot ${g.running ? "" : "down"}"><div class="state">${st(g.running ? "normal" : "critical")}Genset ${g.running ? "beroperasi" : "BERHENTI"}</div>
    <div class="kw">${g.kw} kW</div>
    ${!g.running && g.stopped_at != null ? `<div class="small">Padam sejak ${fmtJ(g.stopped_at)} (${v.t - g.stopped_at} dtk)</div>` : ""}
    <div class="cmds" style="margin-top:.5rem">
      <button class="btn" data-key="mb-block" data-act="modbus-block" ${v.modbusBlocked ? "disabled" : dis}>${ico("plc")}${v.modbusBlocked ? "Tulis Modbus diblokir" : "Blokir tulis Modbus"}<span></span></button>
      <button class="btn" data-key="gen-start" data-act="genset-start" ${g.running ? "disabled" : dis}>${ico("bolt")}Nyalakan genset (panel lokal)<span></span></button></div>
    ${refused ? `<div class="why-refused">${esc(refused)}</div>` : ""}</div>`;
}

// ---- telemetry log (Astro Log: timestamp, newest on top, filter; scroll stays put while reading) ----
function evText(ev) { return Object.entries(ev.f).map(([k, x]) => `${k}=${typeof x === "string" ? x : JSON.stringify(x)}`).join("  "); }
function renderLog(v) {
  const box = $("#log"), q = ($("#log-q").value || "").toLowerCase();
  const atTop = box.scrollTop < 8;
  const rows = [];
  const acts = v.actions.map(a => ({ t: a.t, html: `<tr class="blue"><td class="t">${fmtJ(a.t)}</td><td class="src">KONSOL</td><td class="m">${esc(a.text)}</td></tr>`, txt: a.text }));
  const evs = v.events.map(e => ({ t: e.t, txt: `${e.ev.src}:${e.ev.id} ${e.ev.host} ${evText(e.ev)}`,
    html: `<tr class="${e.rules.length ? "hit" : ""}"><td class="t">${fmtJ(e.t)}</td><td class="src">${esc(e.ev.src)}:${esc(e.ev.id)} · ${esc(e.ev.host)}</td><td class="m">${esc(evText(e.ev))}${e.rules.length ? ` <span class="chip">${esc(e.rules.join(","))}</span>` : ""}</td></tr>` }));
  for (const r of [...acts, ...evs].sort((x, y) => y.t - x.t)) if (!q || r.txt.toLowerCase().includes(q)) rows.push(r.html);
  patch(box, rows.length ? `<table>${rows.join("")}</table>` : `<div class="empty">Belum ada telemetri.</div>`);
  if (atTop) box.scrollTop = 0;
  $("#log-count").textContent = `${v.events.length} event`;
}

function bindOpsButtons() {
  $$("#scr-operasi [data-act]").forEach(b => b.onclick = (e) => { e.stopPropagation(); ask(b.dataset.act, b.dataset.arg || null); });
  const inc = $("#b-incident"); if (inc) inc.onclick = () => ask("incident", null);
  const ho = $("#b-handover"); if (ho) ho.onclick = () => { if (confirm("Serahkan konsol? Anda tidak bisa bertindak lagi. Sisa waktu latihan tetap dijalankan sampai skenario selesai, lalu rapor diterbitkan.")) control({ handover: true }); };
  const ab = $("#b-abort"); if (ab) ab.onclick = () => { if (confirm("Batalkan latihan? Tidak ada rapor yang diterbitkan.")) control({ abort: true }); };
  $$("#scr-operasi [data-go2]").forEach(b => b.onclick = () => go(b.dataset.go2));
}

// The genset interlock refusal is shown in place, next to the button that was refused (R10).
const _command = command;
command = async function (kind, arg) {
  if (kind !== "genset-start") { renderDetail.refused = null; return _command(kind, arg); }
  if (!live()) return toast("Tidak tersambung. Tindakan tidak dikirim.", true);
  try {
    const r = await api("/api/act", { kind, arg: null, id: Date.now().toString(36) + "-g" });
    renderDetail.refused = r.ok ? null : r.msg; toast(r.msg, !r.ok); refresh();
  } catch (e) { toast(e.message, true); }
};
