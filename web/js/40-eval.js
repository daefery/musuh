// EVALUASI: ground truth revealed. Verdict, objectives, score parts, swimlane replay, lessons, board.
renderEval.needs = (v) => { const k = v ? `${v.runId}|${v.finished}|${v.aborted}|${!!v.score}` : ""; if (k === renderEval.key) return false; renderEval.key = k; return true; };
function renderEval() {
  const v = app.view, root = $("#scr-evaluasi");
  if (!v || !v.finished) { root.innerHTML = `<div class="scroll"><div class="empty">Evaluasi tersedia setelah latihan selesai.</div></div>`; return; }
  if (v.aborted) { root.innerHTML = `<div class="scroll"><div class="empty">Latihan dibatalkan. Tidak ada evaluasi dan rapor.</div></div>`; return; }
  const sc = v.score;
  root.innerHTML = `<div class="scroll">${stepperSvg("evaluasi")}<div class="eval">
    <div style="display:grid;gap:1rem;align-content:start">
      <section class="panel"><header><h2>${ico("seal")}Hasil</h2><span class="grow"></span><span class="count">${esc(v.endReason || "")} · ${v.clock}</span></header><div class="body">
        <div class="scoreviz"><div style="text-align:center">${gaugeSvg(sc.total, sc.verdict)}<div class="small dim">${esc(sc.grade)} · MUSUH beradaptasi ${sc.adaptations}×</div></div>${radarSvg(sc.parts)}</div>
        <div class="parts">${sc.parts.map(p => `<div class="part"><span>${esc(p.k)}</span><span class="bar"><i style="width:${100 * p.v / p.max}%"></i></span><span class="v">${p.v}/${p.max}</span><span class="n">${esc(p.note)}</span></div>`).join("")}</div>
      </div></section>
      <section class="panel"><header><h2>${ico("flag")}Sasaran latihan</h2></header><div class="body">
        <div class="objgrid">${sc.objectives.map(o => `<div class="objcard ${o.go ? "go" : "nogo"}"><div class="h"><span>${esc(o.id)}</span><b>${st(o.go ? "normal" : "critical")} ${o.go ? "GO" : "NO-GO"}</b></div><div class="t">${esc(o.text)}</div><div class="n">${esc(o.note)}</div></div>`).join("")}</div>
      </div></section>
      <section class="panel"><header><h2>Pelajaran</h2></header><div class="body">${lessonsHtml(v)}</div></section>
      <section class="panel"><header><h2>Kebenaran musuh</h2><span class="grow"></span><span class="count">tidak terlihat oleh peserta selama latihan</span></header><div class="body">${truthHtml(v)}</div></section>
      <div style="display:flex;gap:.5rem;flex-wrap:wrap"><button class="btn primary big" data-go3="rapor">${ico("file")}Lihat rapor</button><button class="btn big" data-go3="siapkan">Latihan lagi</button></div>
    </div>
    <div style="display:grid;gap:1rem;align-content:start">
      <section class="panel"><header><h2>${ico("brain")}Rantai serangan MUSUH</h2></header><div class="body">${killChainSvg(v.phases)}</div></section>
      <section class="panel"><header><h2>${ico("play")}Garis waktu: MUSUH lawan peserta</h2></header>
        <div class="tlwrap">${timelineSvg(v)}</div>
        <div class="legend"><span><i class="lr"></i>Langkah MUSUH</span><span><i class="lf"></i>Digagalkan</span><span><i class="la"></i>Peringatan</span><span><i class="lb"></i>Tindakan peserta</span></div></section>
      <section class="panel"><header><h2>${ico("shield")}Peta akhir</h2><span class="grow"></span><span class="count">jejak MUSUH di jaringan</span></header><div class="body mapwrap">${netMapSvg(v)}</div></section>
      <section class="panel"><header><h2>Rekaman rinci</h2><span class="grow"></span><span class="count">klik baris untuk bukti dan sumber</span></header>
        <div class="body"><div class="lanes" id="lanes">${lanesHtml(v)}</div></div></section>
      <section class="panel board"><header><h2>Papan prestasi · ${esc(v.code)}</h2><span class="grow"></span><span class="count">hanya rapor yang lolos verifikasi ulang</span></header><div class="body" id="board"><div class="empty">Memuat…</div></div></section>
    </div></div></div>`;
  $$("#scr-evaluasi [data-go3]").forEach(b => b.onclick = () => go(b.dataset.go3));
  // B2: native buttons, so evidence opens with Enter/Space as well as a click.
  $$("#lanes .lane button.open").forEach(bt => bt.onclick = () => { const l = bt.closest(".lane"); const on = l.getAttribute("aria-expanded") !== "true"; l.setAttribute("aria-expanded", on); bt.setAttribute("aria-expanded", on); });
  loadBoard(v);
}
function truthHtml(v) {
  const phases = (v.phases || []).map(p => `<div class="small" style="display:flex;gap:.375rem;align-items:center">${st(p.state === "done" ? "critical" : p.state === "held" ? "serious" : p.state === "skipped" ? "normal" : "off")}<span>${esc(p.goal)}: ${({ done: "tercapai", held: "tertahan", skipped: "dilewati", pending: "belum dicoba" })[p.state]}</span></div>`).join("");
  const thoughts = (v.thoughts || []).slice().reverse().map(t => `<div class="thought ${t.mood}"><div class="tt">${fmtJ(t.t)}</div>${esc(t.text)}</div>`).join("");
  const holds = v.assets.filter(a => a.truth && a.truth.foothold);
  const touched = v.assets.filter(a => a.truth && a.truth.compromised && !a.truth.foothold);
  const footholds = `<h4 class="small dim" style="margin:0 0 .375rem;letter-spacing:.1em;text-transform:uppercase">Pijakan MUSUH di akhir latihan</h4>
    ${holds.length ? holds.map(a => `<div class="small" style="display:flex;gap:.375rem;align-items:center">${st("critical")}<span><b>${esc(a.id)}</b> masih dikuasai MUSUH</span></div>`).join("") : `<div class="small">${st("normal")} Tidak ada pijakan MUSUH yang tersisa.</div>`}
    ${touched.map(a => `<div class="small dim" style="display:flex;gap:.375rem;align-items:center">${st("off")}<span>${esc(a.id)} sempat disentuh MUSUH${a.isolated ? ", kini diisolasi" : ""}</span></div>`).join("")}`;
  return `${footholds}
    ${movesHtml(v)}
    <details style="margin-top:.625rem"><summary class="small" style="cursor:pointer">Pikiran MUSUH (${(v.thoughts || []).length})</summary>${thoughts}</details>`;
}
function lessonsHtml(v) {
  if (!v.lessons.length) return `<div class="small">MUSUH tidak berhasil satu langkah pun.</div>`;
  return v.lessons.map(l => `<div class="lesson"><b>${fmtJ(l.t)} ${esc(l.name)}</b> <span class="chip mono">${esc(l.tech)}</span><br>
    ${l.alerts.length ? `Peringatan: ${l.alerts.map(id => { const a = v.alerts.find(x => x.rule === id); return a && !a.own ? `<a data-key="lsrc-${esc(id)}" href="${esc(SIGMA_PIN + a.path)}" target="_blank" rel="noopener" style="color:var(--interactive)">${esc(id)}</a>` : esc(id); }).join(", ")}.` : `<span class="gapnote">Tidak ada peringatan (celah deteksi).</span> ${esc(l.gap || "")}`}
    Menghentikannya butuh salah satu: ${l.stops.map(esc).join("; ")}.</div>`).join("");
}
function lanesHtml(v) {
  const L = app.lib;
  const rows = v.timeline.filter(r => ["red", "red-blocked", "blue", "ot"].includes(r.kind));
  return `<div class="axis"><span>Waktu</span><span>MUSUH</span><span>Peserta</span></div>` + rows.map(r => {
    const red = v.red.find(x => x.route === r.route && x.t === r.t && x.executed);
    const ev = red ? `<div class="ev"><b>Dasar langkah ini:</b> ${esc(red.note)}<br>${red.src.map(k => `<a href="${esc(L.sources[k].url)}" target="_blank" rel="noopener">${esc(L.sources[k].label)}</a>`).join("<br>")}
      ${red.gap ? `<br><span class="gapnote">Celah deteksi yang disengaja: ${esc(red.gap)}</span>` : ""}<br><span class="dim">Kejadian latihan #${r.n}. Sumber publik di atas adalah dasar skenario, bukan bukti kejadian.</span></div>` : "";
    const left = r.kind === "red" || r.kind === "ot" ? `<span class="red">${st(r.kind === "ot" ? "critical" : r.adapted ? "serious" : "caution")}<span>${esc(r.text.replace("MUSUH: ", ""))}${r.adapted ? ` <span class="chip">beradaptasi</span>` : ""}</span></span>`
      : r.kind === "red-blocked" ? `<span class="red fail">${st("off")}<span>${esc(r.text.replace("MUSUH ", ""))}</span></span>` : "<span></span>";
    const right = r.kind === "blue" ? `<span class="blue">${esc(r.text.replace("Peserta ", ""))}</span>` : "<span></span>";
    return `<div class="lane" aria-expanded="false"><button class="open" aria-expanded="false" ${ev ? "" : "disabled"} aria-label="Bukti ${fmtJ(r.t)}"><span class="t">${fmtJ(r.t)}</span>${left}${right}</button>${ev}</div>`;
  }).join("");
}
async function loadBoard(v) {
  try {
    const b = await api(`/api/board?code=${encodeURIComponent(v.code)}&scenario=${encodeURIComponent(v.scenario.id)}`);
    const me = v.rapor && v.rapor.hash;
    $("#board").innerHTML = b.rows.length ? `<table><tr><th>#</th><th>Peserta</th><th>Mode</th><th>Nilai</th><th>Deteksi</th><th>Status</th><th>Kode verifikasi</th></tr>
      ${b.rows.map((x, i) => { const r = x.rapor; return `<tr class="${r.hash === me ? "me" : ""}"><td class="mono">${i + 1}</td><td>${esc(r.trainee.pangkat)} ${esc(r.trainee.nama)}</td><td>${esc(r.mode.toUpperCase())}</td><td class="mono">${r.total}</td><td class="mono">${x.ttd == null ? "—" : "+" + x.ttd + " dtk"}</td><td>${st(r.verdict === "GO" ? "normal" : "critical")} ${esc(r.verdict)}</td><td class="mono">${esc(r.verif)}</td></tr>`; }).join("")}</table>
      <p class="small dim">Urutan menurut nilai yang lolos verifikasi ulang, bukan pangkat. Hanya kode latihan yang sama yang dibandingkan.</p>` : `<div class="empty">Belum ada rapor lain dengan kode ini.</div>`;
  } catch (e) { $("#board").innerHTML = `<div class="empty">${esc(e.message)}</div>`; }
}
