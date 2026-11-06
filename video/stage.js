// Draws the video at time t (seconds). PLAN (from out/plan.js) = { fps, total, shots, scenes, beats, subs }.
// Everything is a pure function of t, so frames render deterministically.
const P = window.PLAN, $ = (s) => document.querySelector(s);
const ease = (x) => x <= 0 ? 0 : x >= 1 ? 1 : x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const lerp = (a, b, k) => a + (b - a) * k;
const VW = 1920, VH = 1080, SAFE_BOTTOM = 190;

// Camera for a beat: scale + offset so the target box sits centred above the subtitle area.
function camFor(b) {
  if (!b.shot || b.cam === "full") return { s: 1, x: 0, y: 0 };
  const boxes = P.shots[b.shot].boxes;
  const keys = Array.isArray(b.cam) ? b.cam : [b.cam];
  const bs = keys.map(k => boxes[k]).filter(Boolean);
  if (!bs.length) return { s: 1, x: 0, y: 0 };
  const x0 = Math.min(...bs.map(r => r[0])), y0 = Math.min(...bs.map(r => r[1]));
  const x1 = Math.max(...bs.map(r => r[0] + r[2])), y1 = Math.max(...bs.map(r => r[1] + r[3]));
  const availH = VH - SAFE_BOTTOM - 110;
  const s = Math.max(1, Math.min(b.z || 1.6, (VW - 160) / (x1 - x0), availH / (y1 - y0)));
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  let x = VW / 2 - cx * s, y = 110 + availH / 2 - cy * s;
  x = clamp(x, VW - VW * s, 0); y = clamp(y, VH - VH * s, 0);
  return { s, x, y };
}
const toScreen = (c, r) => [c.x + r[0] * c.s, c.y + r[1] * c.s, r[2] * c.s, r[3] * c.s];

// Active beat at time t (and the one before, for camera moves and crossfades).
function beatAt(t) { let i = 0; for (let k = 0; k < P.beats.length; k++) if (P.beats[k].t <= t) i = k; return i; }

const cam = $("#cam"), sub = $("#sub"), chip = $("#chip"), steps = $("#steps"), bar = $("#bar i");
const imgs = {}; // preloaded stills
const layers = document.createElement("div"), ovl = document.createElement("div");
ovl.style.cssText = "position:absolute;inset:0"; cam.append(layers, ovl);
function shotEl(name) {
  if (!imgs[name]) { const d = document.createElement("div"); d.className = "shot"; d.style.display = "none"; d.innerHTML = `<img src="out/shots/${name}.png">`; imgs[name] = d; layers.appendChild(d); }
  return imgs[name];
}
function showShots(list) { // list: [[name, transform, opacity], ...] in paint order
  const want = new Map(list.map(([n, tf, o], z) => [n, { tf, o, z }]));
  for (const [n, el] of Object.entries(imgs)) { const w = want.get(n);
    if (!w) { if (el.style.display !== "none") el.style.display = "none"; continue; }
    el.style.display = ""; el.style.transform = w.tf; el.style.opacity = w.o; el.style.zIndex = w.z; }
}
window.ready = () => Promise.all(Object.keys(P.shots).map(n => new Promise(r => { const i = shotEl(n).querySelector("img"); if (i.complete) r(); else { i.onload = r; i.onerror = r; } }))).then(() => document.fonts.ready);

const CARDS = {
  masalah: (on) => `<div class="card"><div class="eyebrow">Masalah</div>
    <div class="h1" style="opacity:${on.t1}">Latihan siber butuh tiga tim</div>
    <div class="teams">
      <div class="team red" style="opacity:${on["team-r"]};transform:translateY(${(1 - on["team-r"]) * 30}px)"><svg style="color:#ff8a8d"><use href="#i-sword"/></svg><h3>Tim merah</h3><p>menyerang jaringan</p></div>
      <div class="team blue" style="opacity:${on["team-b"]};transform:translateY(${(1 - on["team-b"]) * 30}px)"><svg style="color:#8cc8ff"><use href="#i-shield"/></svg><h3>Tim biru</h3><p>bertahan dan memulihkan</p></div>
      <div class="team ex" style="opacity:${on["team-e"]};transform:translateY(${(1 - on["team-e"]) * 30}px)"><svg style="color:#f0d27a"><use href="#i-clip"/></svg><h3>EXCON</h3><p>menilai GO / NO-GO</p></div>
    </div>
    <div class="lead" style="opacity:${on.lead}">Akibatnya latihan terikat pada acara besar, seperti Keris Woomera 2026.</div>
    <div class="src" style="opacity:${on.src}">Sumber: Puspen TNI, "TNI–ADF Perkuat Pertahanan Siber melalui Simulasi Terpadu Keris Woomera 2026", korem072.tni-ad.mil.id, 17 Okt 2026</div></div>`,
  solusi: (on) => `<div class="card"><div class="eyebrow" style="opacity:${on.big}">Kartika Cyber Hackathon 2026 · Dukungan Teknologi</div>
    <div class="big" style="opacity:${on.big};transform:scale(${0.92 + 0.08 * on.big});transform-origin:left">MUSUH</div>
    <div class="h1" style="opacity:${on.lead};font-size:52px;color:var(--text)">Mesin Uji Serangan dan Ketahanan</div>
    <div class="teams" style="opacity:${on.teams};margin-top:48px">
      <div class="team red gone"><svg style="color:#ff8a8d"><use href="#i-sword"/></svg><h3>Tim merah</h3><p>menyerang jaringan</p><div class="x" style="opacity:${on["x-r"]}"><span>MUSUH</span></div></div>
      <div class="team blue"><svg style="color:#8cc8ff"><use href="#i-shield"/></svg><h3>Tim biru</h3><p>peserta latihan</p></div>
      <div class="team ex gone"><svg style="color:#f0d27a"><use href="#i-clip"/></svg><h3>EXCON</h3><p>menilai GO / NO-GO</p><div class="x" style="opacity:${on["x-e"]}"><span>MUSUH</span></div></div>
    </div>
    <div class="pills" style="opacity:${on.pills}"><span class="pill"><svg><use href="#i-laptop"/></svg>Satu laptop</span><span class="pill"><svg><use href="#i-wifi-off"/></svg>Tanpa internet</span></div></div>`,
  penutup: (on) => `<div class="card"><div class="big" style="opacity:${on.big}">MUSUH</div>
    <div class="pills" style="opacity:${on.pills};margin-top:10px"><span class="pill"><svg><use href="#i-laptop"/></svg>Satu program</span><span class="pill"><svg><use href="#i-wifi-off"/></svg>Tanpa internet</span><span class="pill"><svg><use href="#i-shield"/></svg>Setiap satuan</span></div>
    <div class="lead" style="opacity:${on.lead};font-size:48px;margin-top:56px"><span style="color:var(--gold-2)">Lawannya adil.</span> Nilainya bisa diperiksa ulang.</div>
    <div class="lead" style="opacity:${on.repo};font:500 30px/1 'Roboto Mono';color:var(--dim);margin-top:40px">github.com/daefery/musuh · Fery</div></div>`,
};

function callHtml(c, box, cs, k, i) {
  const [x, y, w, h] = box, tone = c.tone || "";
  const W = 520; let left, top, side = c.side || "right";
  if (side === "right") { left = x + w + 28; top = y + h / 2 - 50; if (left + W > VW - 30) side = "left"; }
  if (side === "left") { left = x - W - 28; top = y + h / 2 - 50; if (left < 30) { side = "below"; } }
  if (side === "below") { left = x + w / 2 - W / 2; top = y + h + 24; }
  if (side === "above") { left = x + w / 2 - W / 2; top = y - 130; }
  left = clamp(left, 30, VW - W - 30); top = clamp(top, 120, VH - SAFE_BOTTOM - 120);
  const dy = (1 - k) * 16;
  return `<div class="call ${tone}" style="left:${left}px;top:${top + dy}px;width:${W}px;opacity:${k}"><small>${c.head}</small>${c.text}</div>`;
}

window.seek = (t) => {
  const i = beatAt(t), b = P.beats[i], prev = P.beats[i - 1];
  const dt = t - b.t, sc = P.scenes.find(s => t >= s.t0 && t < s.t1) || P.scenes[P.scenes.length - 1];
  // Camera: move from the previous beat's view over 0.7 s (cuts and new scenes are instant + fade).
  const sameShot = prev && prev.shot && b.shot && prev.shot === b.shot && prev.scene === b.scene;
  const morph = sameShot || (b.cut && prev && prev.scene === b.scene);
  const c1 = camFor(b), c0 = morph && prev ? camFor(prev) : c1;
  const k = ease(clamp(dt / 0.7, 0, 1)), c = { s: lerp(c0.s, c1.s, k), x: lerp(c0.x, c1.x, k), y: lerp(c0.y, c1.y, k) };
  let html = ""; const shown = [];
  const fadeIn = !morph ? clamp(dt / 0.35, 0, 1) : 1;
  if (b.card) {
    const on = {}; (b.show || []).forEach(key => on[key] = 1);
    const pv = prev && prev.card === b.card ? new Set(prev.show) : new Set();
    for (const key of Object.keys(on)) if (!pv.has(key)) on[key] = ease(clamp(dt / 0.5, 0, 1));
    const all = ["t1", "team-r", "team-b", "team-e", "lead", "src", "big", "teams", "x-r", "x-e", "pills", "repo"]; all.forEach(key => on[key] ??= 0);
    html = `<div style="position:absolute;inset:0;opacity:${prev && prev.card === b.card ? 1 : fadeIn}">${CARDS[b.card](on)}</div>`;
  } else {
    // Cut: crossfade the new still in over 0.25 s on the same camera.
    const cf = b.cut && prev && prev.shot ? clamp(dt / 0.25, 0, 1) : 1;
    const tf = `translate(${c.x}px,${c.y}px) scale(${c.s})`;
    if (cf < 1) shown.push([prev.shot, tf, 1]);
    shown.push([b.shot, tf, cf * fadeIn]);
    const boxes = P.shots[b.shot].boxes, ov = ease(clamp((dt - 0.45) / 0.35, 0, 1));
    const rings = b.rings || (b.ring ? [b.ring] : []);
    rings.forEach(([key, tone]) => { const r = boxes[key]; if (!r) return; const [x, y, w, h] = toScreen(c, r);
      html += `<div class="ring ${tone || ""} ${b.noDim || rings.length > 1 ? "nodim" : ""}" style="left:${x - 8}px;top:${y - 8}px;width:${w + 16}px;height:${h + 16}px;opacity:${ov}"></div>`; });
    if (b.call && boxes[b.call.box]) html += callHtml(b.call, toScreen(c, boxes[b.call.box]), c.s, ov, i);
    if (b.click && boxes[b.click]) {
      const [x, y, w, h] = toScreen(c, boxes[b.click]);
      const pv = prev && prev.click && P.shots[prev.shot] && P.shots[prev.shot].boxes[prev.click] ? toScreen(c, P.shots[prev.shot].boxes[prev.click]) : [VW * .62, VH * .62, 0, 0];
      const mk = ease(clamp(dt / 0.55, 0, 1)), cx = lerp(pv[0] + pv[2] / 2, x + w / 2, mk), cy = lerp(pv[1] + pv[3] / 2, y + h / 2, mk);
      const press = clamp((dt - 0.55) / 0.35, 0, 1), p = press > 0 && press < 1 ? 1 - press : 0;
      html += `<div class="ring nodim" style="left:${x - 6}px;top:${y - 6}px;width:${w + 12}px;height:${h + 12}px;opacity:${ov * .9}"></div>`;
      html += `<div class="cursor ${p ? "click" : ""}" style="left:${cx}px;top:${cy}px;--p:${p}"></div>`;
    }
    if (b.banner) { const o = ease(clamp(dt / 0.5, 0, 1));
      html += `<div style="position:absolute;inset:0;background:rgba(5,8,4,${.72 * o})"></div><div class="card" style="background:none;opacity:${o};align-items:center;text-align:center"><svg style="width:120px;height:120px;color:var(--gold)"><use href="#i-scale"/></svg><div class="h1" style="color:var(--gold-2);margin-top:24px">${b.banner.head}</div><div class="lead" style="font-size:48px">${b.banner.text}</div></div>`; }
    if (b.stamp) { const o = ease(clamp((dt - 0.3) / 0.3, 0, 1)), r = toScreen(c, boxes.out || [700, 400, 400, 200]);
      html += `<div class="stamp ${b.stamp.tone}" style="left:${Math.max(40, r[0] - 600)}px;top:${r[1] + 30}px;opacity:${o};transform:rotate(-8deg) scale(${1.5 - .5 * o})">${b.stamp.text}${b.stamp.sub ? `<div style="font:600 30px/1.2 Roboto;letter-spacing:0;margin-top:10px;color:#fff">${b.stamp.sub}</div>` : ""}</div>`; }
    if (b.edit) { const o = ease(clamp(dt / 0.4, 0, 1)), typed = clamp((dt - 1.2) / 0.6, 0, 1);
      const val = typed < 0.5 ? b.edit.from : b.edit.to;
      html += `<div style="position:absolute;inset:0;background:rgba(5,8,4,${.75 * o})"></div>
        <div style="position:absolute;left:460px;top:250px;width:1000px;opacity:${o};background:#f4f1e6;color:#222;border-radius:10px;box-shadow:0 30px 80px rgba(0,0,0,.7);overflow:hidden">
          <div style="background:#d8d3c2;padding:10px 18px;font:500 22px Roboto">rapor-diubah.json — Notepad</div>
          <pre style="margin:0;padding:24px 30px;font:500 30px/1.5 'Roboto Mono'">{
  "trainee": { "nama": "${P.name}" },
  "total": <span style="background:${typed > 0 && typed < 1 ? "#ffe08a" : typed >= 1 ? "#ffd0d0" : "transparent"};color:${typed >= .5 ? "#c0161c" : "#222"};font-weight:700">${val}</span>,
  "verdict": "GO",
  ...
}</pre></div><div class="call red" style="left:1180px;top:560px;width:420px;opacity:${clamp((dt - 1.9) / .3, 0, 1)}"><small>Diubah di luar MUSUH</small>nilai ${b.edit.from} → ${b.edit.to}</div>`; }
  }
  showShots(shown); ovl.innerHTML = html;
  // Chrome: scene chip, step tracker, subtitle, progress.
  chip.innerHTML = sc.title && !b.card ? (sc.step != null ? `<b>${sc.step + 1}</b>` : "") + sc.title.replace(/^\d · /, "") : "";
  chip.style.display = chip.innerHTML ? "" : "none";
  steps.style.display = "none"; // the app's own stepper is visible in the footage
  const sb = P.subs.find(s => t >= s.t0 && t < s.t1); sub.textContent = sb ? sb.text : "";
  bar.style.width = `${100 * t / P.total}%`;
};
