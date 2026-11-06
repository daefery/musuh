// MUSUH console core: state, server connection, commands. No framework, no network beyond 127.0.0.1.
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const ico = (id, cls = "i") => `<svg class="${cls}" aria-hidden="true"><use href="#i-${id}"/></svg>`;
const st = (status, label) => `<svg class="st" role="img" aria-label="${esc(label || status)}"><use href="#s-${status}"/></svg>`;
const STATUS_TEXT = { critical: "Kritis", serious: "Serius", caution: "Waspada", normal: "Normal", standby: "Dipantau", off: "Mati" };
const fmtJ = (t) => "J+" + String(Math.floor(t / 60)).padStart(2, "0") + ":" + String(t % 60).padStart(2, "0");
const HOST_ICON = (h) => h.seg === "OT" ? (/PLC/.test(h.id) ? "plc" : "hmi") : /^DC/.test(h.id) ? "dc" : /^WEB/.test(h.id) ? "web" : /^VPN/.test(h.id) ? "vpn" : /^HV/.test(h.id) ? "hv" : /^(FS|SRV|BAK|DB|JUMP)/.test(h.id) ? "server" : "pc";
const SIGMA_PIN = "https://github.com/SigmaHQ/sigma/blob/c68bb91abb1146b8a6a65caf6819b1836d97f09d/";

const app = {
  lib: null, view: null, screen: "siapkan", selAlert: null, selAsset: null, reveal: false,
  connected: false, stale: false, lastSeq: 0, seenAlerts: new Set(), pending: null,
};

function toast(msg, err = false) {
  const t = $("#toast"); t.textContent = msg; t.className = "toast" + (err ? " err" : ""); t.hidden = false;
  clearTimeout(toast.h); toast.h = setTimeout(() => (t.hidden = true), 3200);
}

async function api(path, body) {
  const opt = body === undefined ? {} : { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) };
  const r = await fetch(path, opt);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || r.statusText);
  return j;
}

// R12/B3: the server owns state. One snapshot request at a time; an older snapshot (lower seq for the
// same run) never replaces a newer one; after any stream loss the view stays stale, with commands
// disabled, until a fresh snapshot has actually arrived.
// B3: every request is stamped with the generation current when it was SENT. A connection loss,
// a reconnect or a run started here bumps the generation, so any response sent before that point
// is discarded: it can never clear `stale` and never replace the newly started run.
app.gen = 0; app.runId = null;
function newGeneration() { app.gen += 1; app.stale = true; }
let inflight = false, again = false;
async function refresh() {
  if (inflight) { again = true; return; }
  inflight = true;
  const gen = app.gen;
  try {
    const v = await api("/api/state" + (app.reveal ? "?reveal=true" : ""));
    if (gen !== app.gen) { again = true; }                         // sent before a reconnect or a new start: discard
    else if (v.idle) { app.view = null; app.runId = null; app.stale = false; render(); }
    else if (!app.view || v.runId !== app.view.runId || v.seq >= app.view.seq) {
      // Same generation: the server holds exactly one run, so a different runId here is the
      // current run (for example started from another tab), never an obsolete one.
      app.runId = v.runId; app.view = v; app.stale = false; render();
    } else { app.stale = false; render(); }                         // older seq in this generation: keep newer view
  } catch { app.stale = true; renderConn(); }
  inflight = false;
  if (again && app.connected) { again = false; setTimeout(refresh, 50); }
}
let refreshQueued = false;
function queueRefresh() { if (refreshQueued) return; refreshQueued = true; requestAnimationFrame(() => { refreshQueued = false; refresh(); }); }

function connect() {
  const es = new EventSource("/api/events");
  es.onopen = () => { app.connected = true; newGeneration(); renderConn(); refresh(); };
  es.onmessage = () => queueRefresh();
  es.onerror = () => { app.connected = false; newGeneration(); renderConn(); es.close(); setTimeout(connect, 1500); };
}
const live = () => app.connected && !app.stale;
function renderConn() {
  let bar = $("#connbar");
  const lost = !live();
  const c = $("#gsb-conn");
  if (c) c.innerHTML = lost ? `${st("critical", "terputus")}<span>${app.connected ? "Menyegarkan…" : "TERPUTUS"}</span>` : `${st("normal", "tersambung")}<span>Tersambung</span>`;
  $$("#scr-operasi [data-act], #b-incident, #b-handover, #b-abort, #confirm-go, #gsb [data-speed], #t-pause").forEach(b => { if (lost) { b.dataset.wasDisabled ??= b.disabled; b.disabled = true; } else if (b.dataset.wasDisabled !== undefined) { b.disabled = b.dataset.wasDisabled === "true"; delete b.dataset.wasDisabled; } });
  if (lost && !bar) { bar = document.createElement("div"); bar.id = "connbar"; bar.className = "conn-lost"; bar.textContent = "TERPUTUS dari mesin MUSUH. Tindakan dinonaktifkan sampai tersambung lagi."; document.body.appendChild(bar); }
  if (!lost && bar) bar.remove();
  document.body.classList.toggle("disconnected", lost);
}

// Commands carry a client id so a retry never executes twice (R12).
let cmdN = 0;
async function command(kind, arg) {
  if (!live()) return toast("Tidak tersambung. Tindakan tidak dikirim.", true);
  const id = Date.now().toString(36) + "-" + (++cmdN);
  try {
    const r = await api("/api/act", { kind, arg: arg ?? null, id });
    toast(r.msg, !r.ok);
  } catch (e) { toast(e.message, true); }
}
async function control(body) { if (!live()) return toast("Tidak tersambung.", true); try { await api("/api/control", body); } catch (e) { toast(e.message, true); } }

// B2: replace a container's HTML only when it changed, and keep keyboard focus on the element with
// the same data-key (or id) after the swap. Clock ticks therefore never steal focus.
function patch(el, html) {
  if (!el || el._html === html) return false;
  const a = document.activeElement;
  const key = a && el.contains(a) ? (a.dataset.key || a.id || null) : null;
  el.innerHTML = html; el._html = html;
  if (key) { const n = el.querySelector(`[data-key="${CSS.escape(key)}"]`) || document.getElementById(key); n && n.focus({ preventScroll: true }); }
  return true;
}

function go(screen) { app.screen = screen; app.forceScreen = true; render(); }

function render() {
  renderGsb();
  for (const s of ["siapkan", "operasi", "evaluasi", "rapor"]) $("#scr-" + s).classList.toggle("on", s === app.screen);
  // B2: SIAPKAN and RAPOR hold forms; rebuild them only when entering the screen, not on ticks.
  const enter = app.forceScreen || app.lastScreen !== app.screen; app.forceScreen = false; app.lastScreen = app.screen;
  if (app.screen === "siapkan" && enter) renderSetup();
  if (app.screen === "operasi") renderOps();
  if (app.screen === "evaluasi" && (renderEval.needs(app.view) || enter)) renderEval();
  if (app.screen === "rapor" && (renderRapor.needs(app.view) || enter)) renderRapor();
  renderConn();
  fitGsb(); // last: the connection label and counters have their final widths now
}
