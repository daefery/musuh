// Visual layer: SVG pictures of the whole process. Pure functions of the server view; no state.
// Trainee views get only observations; enemy arrows and the kill chain appear only when the
// server includes ground truth (trainer view or after the run).
const VZ = { gold: "#d4a72c", red: "#e5484d", green: "#46b85a", amber: "#f2d03b", orange: "#f07a2a", teal: "#4fb3bf", line: "#2f3c28", line2: "#44563a", text: "#ecefe2", dim: "#a3ad94" };
const STATUS_COLOR = { critical: VZ.red, serious: VZ.orange, caution: VZ.amber, normal: VZ.green, standby: VZ.teal, off: "#8a9478" };

// 1. Process stepper: where am I in the exercise, as a picture.
function stepperSvg(active) {
  const steps = [["siapkan", "Siapkan", "flag"], ["operasi", "Operasi", "shield"], ["evaluasi", "Evaluasi", "scale"], ["rapor", "Rapor", "seal"]];
  const idx = steps.findIndex(s => s[0] === active);
  return `<div class="stepper" role="img" aria-label="Tahap ${idx + 1} dari 4">${steps.map(([id, label, icon], i) => `
    <div class="stp ${i < idx ? "done" : i === idx ? "on" : ""}"><span class="dot">${i < idx ? ico("check") : ico(icon)}</span><span class="lb">${label}</span></div>${i < steps.length - 1 ? `<i class="bar ${i < idx ? "done" : ""}"></i>` : ""}`).join("")}</div>`;
}

// 2. Network map. Zones: outside | IT | OT. Assets coloured by what the defender can see.
function netMapSvg(v, opts = {}) {
  const W = 760, nodeW = 150, nodeH = 46, rowH = 64;
  const hosts = v.assets, outside = v.outside;
  const cols = [{ k: "out", label: "LUAR JARINGAN", items: outside.map(o => ({ ...o, ext: true })) },
    { k: "it", label: "JARINGAN IT", items: hosts.filter(h => h.seg === "IT") }];
  if (hosts.some(h => h.seg === "OT")) cols.push({ k: "ot", label: "SEGMEN OT", items: hosts.filter(h => h.seg === "OT") });
  const colW = W / cols.length, pos = {};
  let H = 0;
  cols.forEach((c, i) => { c.x = i * colW + 8; c.w = colW - 16;
    c.items.forEach((n, j) => { pos[n.id] = { x: c.x + (c.w - nodeW) / 2, y: 40 + j * rowH, n }; H = Math.max(H, 40 + j * rowH + nodeH + 14); }); });
  H = Math.max(H, 170);
  const cx = id => pos[id] && pos[id].x + nodeW / 2, cy = id => pos[id] && pos[id].y + nodeH / 2;
  let g = `<defs><marker id="mk-r" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="${VZ.red}"/></marker>
    <marker id="mk-g" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="${VZ.green}"/></marker></defs>`;
  cols.forEach(c => { const col = c.k === "ot" ? VZ.teal : c.k === "out" ? "#8a3a34" : VZ.line2;
    g += `<rect x="${c.x}" y="6" width="${c.w}" height="${H - 12}" rx="8" fill="${c.k === "ot" ? "rgba(79,179,191,.05)" : c.k === "out" ? "rgba(208,52,44,.05)" : "rgba(255,255,255,.015)"}" stroke="${col}" stroke-dasharray="4 4"/>
      <text x="${c.x + 10}" y="24" fill="${c.k === "ot" ? VZ.teal : c.k === "out" ? "#e58c86" : VZ.dim}" font-family="Roboto Condensed" font-weight="700" font-size="11" letter-spacing="1.5">${c.label}</text>
      ${c.items.length ? "" : `<text x="${c.x + c.w / 2}" y="${H / 2}" text-anchor="middle" fill="${VZ.dim}" font-family="Roboto" font-size="11">Alamat musuh belum teramati</text>`}`; });
  const it = hosts.filter(h => h.seg === "IT");
  for (let i = 1; i < it.length; i++) g += `<line x1="${cx(it[0].id)}" y1="${cy(it[i - 1].id)}" x2="${cx(it[0].id)}" y2="${cy(it[i].id)}" stroke="${VZ.line}" stroke-width="2"/>`;
  // Enemy moves only when ground truth is present.
  const moves = (v.moves || []).filter(m => pos[m.from] && pos[m.to] && m.from !== m.to);
  moves.forEach((m, i) => {
    const x1 = cx(m.from), y1 = cy(m.from), x2 = cx(m.to), y2 = cy(m.to), dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
    const sx = x1 + dx / len * 76, sy = y1 + dy / len * 24, ex = x2 - dx / len * 78, ey = y2 - dy / len * 26;
    const mx = (sx + ex) / 2 - dy / len * 18, my = (sy + ey) / 2 + dx / len * 18, old = i < moves.length - 3;
    g += `<path class="${m.ok ? "atk" : "atk fail"}${old ? " old" : ""}" d="M${sx} ${sy} Q${mx} ${my} ${ex} ${ey}" marker-end="url(#${m.ok ? "mk-r" : "mk-g"})"/>`;
  });
  Object.values(pos).forEach(({ x, y, n }) => {
    const status = n.ext ? (n.blocked ? "off" : n.ip ? "caution" : "standby") : n.status;
    const sel = opts.selected === n.id, held = n.truth && n.truth.foothold;
    const stroke = sel ? VZ.gold : n.ext && n.blocked ? VZ.green : status === "critical" || status === "serious" ? STATUS_COLOR[status] : n.isolated ? "#8a9478" : VZ.line2;
    const pickable = opts.interactive && !n.ext;
    g += `<g class="mnode${pickable ? " pick" : ""}" ${pickable ? `data-asset="${esc(n.id)}" data-key="asset-${esc(n.id)}" tabindex="0" role="button" aria-pressed="${sel}" aria-label="${esc(n.id)}: ${esc(STATUS_TEXT[status] || status)}"` : ""}>
      <rect x="${x}" y="${y}" width="${nodeW}" height="${nodeH}" rx="7" fill="${n.ext ? "#1d0f0d" : n.isolated ? "#1a1c14" : "#182114"}" stroke="${stroke}" stroke-width="${sel ? 2.5 : 1.5}" ${n.isolated ? 'stroke-dasharray="5 3"' : ""}/>
      <svg x="${x + 8}" y="${y + 13}" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${STATUS_COLOR[status] || VZ.dim}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><use href="#i-${n.ext ? (n.ip ? "globe" : "mail") : HOST_ICON(n)}"/></svg>
      <text x="${x + 34}" y="${y + 20}" fill="${VZ.text}" font-family="Roboto Mono" font-weight="500" font-size="12">${esc(n.id)}</text>
      <text x="${x + 34}" y="${y + 36}" fill="${VZ.dim}" font-family="Roboto" font-size="10.5">${esc((t => t.length > 23 ? t.slice(0, 22) + "…" : t)(n.ext ? (n.blocked ? "Diblokir" : n.role) : n.isolated ? "Diisolasi" : n.role))}</text>
      <svg x="${x + nodeW - 15}" y="${y - 5}" width="13" height="13" viewBox="0 0 12 12"><use href="#s-${status}"/></svg>
      ${held ? `<rect x="${x + nodeW - 62}" y="${y + nodeH - 9}" width="54" height="14" rx="3" fill="${VZ.red}"/><text x="${x + nodeW - 35}" y="${y + nodeH + 1.5}" text-anchor="middle" fill="#fff" font-family="Roboto Condensed" font-weight="700" font-size="9.5" letter-spacing="1">MUSUH</text>` : ""}
    </g>`;
  });
  return `<svg class="netmap" viewBox="0 0 ${W} ${H}" role="img" aria-label="Peta jaringan latihan">${g}</svg>`;
}

// 3. Kill chain: the enemy's phases as a chain of links (ground truth only).
function killChainSvg(phases) {
  if (!phases || !phases.length) return "";
  const W = 760, n = phases.length, gap = 6, w = (W - gap * (n - 1)) / n;
  const wrap = (t) => { const words = t.split(" "), lines = [""]; for (const wd of words) { const cur = lines[lines.length - 1]; if ((cur + " " + wd).trim().length > Math.max(9, Math.floor(w / 7.2))) lines.push(wd); else lines[lines.length - 1] = (cur + " " + wd).trim(); } return lines.slice(0, 2); };
  const col = { done: VZ.red, held: VZ.orange, skipped: VZ.green, pending: VZ.line2 };
  const lab = { done: "TERCAPAI", held: "TERTAHAN", skipped: "GAGAL", pending: "BELUM" };
  return `<svg class="chain" viewBox="0 0 ${W} 76" role="img" aria-label="Rantai serangan MUSUH">${phases.map((p, i) => {
    const x = i * (w + gap), c = col[p.state];
    const ln = wrap(p.goal), tx = x + w / 2 + (i ? 4 : 0);
    return `<g><title>${esc(p.goal)}: ${lab[p.state].toLowerCase()}</title><path d="M${x} 4 H${x + w - 10} L${x + w} 28 L${x + w - 10} 52 H${x} ${i ? `L${x + 10} 28 Z` : "Z"}" fill="${p.state === "pending" ? "#182114" : c}" fill-opacity="${p.state === "pending" ? 1 : .22}" stroke="${c}" stroke-width="1.5"/>
      ${ln.map((l, k) => `<text x="${tx}" y="${(ln.length === 1 ? 32 : 25) + k * 13}" text-anchor="middle" fill="${p.state === "pending" ? VZ.dim : VZ.text}" font-family="Roboto Condensed" font-weight="600" font-size="11">${esc(l)}</text>`).join("")}
      <text x="${x + w / 2}" y="70" text-anchor="middle" fill="${c === VZ.line2 ? VZ.dim : c}" font-family="Roboto Condensed" font-weight="700" font-size="10" letter-spacing="1">${lab[p.state]}</text></g>`;
  }).join("")}</svg>`;
}

// 4. Battle timeline: two lanes on one time axis. Red diamonds = enemy steps (hollow = blocked),
//    gold circles = trainee actions, triangles = alerts. Vertical line = now.
function timelineSvg(v) {
  const W = 760, H = 112, L = 70, R = 12, span = Math.max(v.duration || 300, v.t, 60);
  const X = t => L + (W - L - R) * Math.min(t, span) / span;
  let g = `<rect x="${L}" y="14" width="${W - L - R}" height="30" rx="4" fill="rgba(229,72,77,.06)"/><rect x="${L}" y="58" width="${W - L - R}" height="30" rx="4" fill="rgba(212,167,44,.06)"/>
    <text x="0" y="33" fill="#f19a93" font-family="Roboto Condensed" font-weight="700" font-size="11" letter-spacing="1">MUSUH</text>
    <text x="0" y="77" fill="${VZ.gold}" font-family="Roboto Condensed" font-weight="700" font-size="11" letter-spacing="1">PESERTA</text>`;
  for (let m = 0; m <= span; m += 60) g += `<line x1="${X(m)}" y1="10" x2="${X(m)}" y2="92" stroke="${VZ.line}"/><text x="${X(m)}" y="106" text-anchor="middle" fill="${VZ.dim}" font-family="Roboto Mono" font-size="9.5">${fmtJ(m).slice(2)}</text>`;
  (v.alerts || []).forEach(a => { g += `<path d="M${X(a.t)} 47 l4 7 h-8z" fill="${STATUS_COLOR[a.status]}"><title>${esc(a.title)}</title></path>`; });
  (v.red || []).forEach(r => { const x = X(r.t); g += `<rect x="${x - 6}" y="23" width="12" height="12" transform="rotate(45 ${x} 29)" fill="${r.executed ? VZ.red : "none"}" stroke="${r.executed ? VZ.red : VZ.green}" stroke-width="2"><title>${esc(r.name)}${r.executed ? "" : " (gagal)"}</title></rect>`; });
  (v.actions || []).forEach(a => { g += `<circle cx="${X(a.t)}" cy="73" r="7" fill="${VZ.gold}" stroke="#1a1405" stroke-width="1.5"><title>${esc(a.text)}</title></circle>`; });
  if (v.genset && v.genset.stopped_at != null) { const s = X(v.genset.stopped_at), e = X(v.genset.restored_at ?? v.t); g += `<rect x="${s}" y="10" width="${Math.max(2, e - s)}" height="82" fill="rgba(229,72,77,.12)"/><text x="${s + 3}" y="20" fill="${VZ.red}" font-family="Roboto Condensed" font-size="9.5" font-weight="700">GENSET MATI</text>`; }
  if (!v.finished) g += `<line x1="${X(v.t)}" y1="8" x2="${X(v.t)}" y2="94" stroke="${VZ.gold}" stroke-width="2"/><circle cx="${X(v.t)}" cy="8" r="3" fill="${VZ.gold}"/>`;
  return `<svg class="tline" viewBox="0 0 ${W} ${H}" role="img" aria-label="Garis waktu MUSUH dan peserta">${g}</svg>`;
}

// 5. Score gauge: semicircle 0-100 with the verdict.
function gaugeSvg(total, verdict) {
  const r = 70, c = Math.PI * r, frac = Math.max(0, Math.min(1, total / 100)), col = verdict === "GO" ? VZ.green : VZ.red;
  return `<svg class="gauge" viewBox="0 0 180 112" role="img" aria-label="Nilai ${total} dari 100, ${verdict}">
    <path d="M20 96 A70 70 0 0 1 160 96" fill="none" stroke="${VZ.line}" stroke-width="14" stroke-linecap="round"/>
    <path d="M20 96 A70 70 0 0 1 160 96" fill="none" stroke="${col}" stroke-width="14" stroke-linecap="round" stroke-dasharray="${c * frac} ${c}"/>
    <text x="90" y="82" text-anchor="middle" fill="${VZ.text}" font-family="Roboto Condensed" font-weight="700" font-size="40">${total}</text>
    <text x="90" y="104" text-anchor="middle" fill="${col}" font-family="Roboto Condensed" font-weight="700" font-size="15" letter-spacing="2">${verdict}</text></svg>`;
}

// 6. Radar of the four score parts (share of each maximum).
function radarSvg(parts) {
  const cx = 150, cy = 112, R = 70, n = parts.length;
  const pt = (i, f) => { const a = -Math.PI / 2 + i * 2 * Math.PI / n; return [cx + Math.cos(a) * R * f, cy + Math.sin(a) * R * f]; };
  let g = "";
  [0.25, 0.5, 0.75, 1].forEach(f => { g += `<polygon points="${parts.map((_, i) => pt(i, f).join(",")).join(" ")}" fill="none" stroke="${VZ.line}"/>`; });
  parts.forEach((p, i) => { const [x, y] = pt(i, 1.3); const anchor = Math.abs(x - cx) < 5 ? "middle" : x < cx ? "end" : "start";
    g += `<line x1="${cx}" y1="${cy}" x2="${pt(i, 1)[0]}" y2="${pt(i, 1)[1]}" stroke="${VZ.line}"/><text x="${x}" y="${y - 2}" text-anchor="${anchor}" fill="${VZ.dim}" font-family="Roboto Condensed" font-weight="600" font-size="12">${esc(p.k)}<tspan x="${x}" dy="14" fill="${VZ.gold}" font-family="Roboto Mono" font-size="11">${p.v}/${p.max}</tspan></text>`; });
  g += `<polygon points="${parts.map((p, i) => pt(i, p.v / p.max).join(",")).join(" ")}" fill="rgba(212,167,44,.3)" stroke="${VZ.gold}" stroke-width="2"/>`;
  parts.forEach((p, i) => { const [x, y] = pt(i, p.v / p.max); g += `<circle cx="${x}" cy="${y}" r="3.5" fill="${VZ.gold}"/>`; });
  return `<svg class="radar" viewBox="0 0 300 230" role="img" aria-label="Rincian nilai">${g}</svg>`;
}

// 7. Verification flow: file -> replay -> compare, each step lit by its result.
function verifyFlowSvg(res) {
  const col = (ok) => ok == null ? VZ.line2 : ok ? VZ.green : VZ.red;
  const ran = res ? !!res.replay_score : null;
  const steps = [["Berkas rapor", "file", res ? res.structOk : null, res ? (res.structOk ? "valid" : "rusak") : ""],
    ["Sidik SHA-256", "seal", res && res.structOk ? res.hash_ok : null, res && res.structOk ? (res.hash_ok ? "cocok" : "berubah") : ""],
    ["Putar ulang", "play", ran, ran == null ? "" : ran ? `nilai ${res.replay_total}` : "tidak jalan"],
    ["Nilai sama?", "scale", ran ? res.score_ok : null, ran ? (res.score_ok ? "sama" : "beda") : ""]];
  return `<div class="vflow">${steps.map(([l, i, ok, txt], k) => `<div class="vstep" style="--c:${col(ok)}"><span class="vi">${ico(i)}</span><span class="vl">${l}</span><span class="vs">${esc(txt)}</span></div>${k < steps.length - 1 ? `<i class="varr" style="--c:${col(ok)}"></i>` : ""}`).join("")}</div>`;
}
