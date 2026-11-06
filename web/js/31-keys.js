// Keyboard (R9): ignored inside inputs/selects/dialogs and on key repeat. Selection never moves by itself.
document.addEventListener("keydown", (e) => {
  if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
  const tgt = e.target;
  if (tgt.closest && (tgt.closest("input, select, textarea, [contenteditable], dialog"))) return;
  if (e.key === "?") { e.preventDefault(); return openHelp(); }
  if (app.screen !== "operasi" || !app.view) return;
  const v = app.view;
  if (app.pending) {
    // B10: a focused button (Batal, Jalankan, or any other) handles its own Enter/Space natively.
    if ((e.key === "Enter" || e.key === " ") && tgt.closest && tgt.closest("button, a, [role=button]")) return;
    if (e.key === "Enter") { e.preventDefault(); return doPending(); }
    if (e.key === "Escape") { e.preventDefault(); app.pending = null; return renderConfirm(); }
    return;
  }
  if (e.key === " " && v.mode === "latih" && !v.finished) { e.preventDefault(); return control({ paused: !v.paused }); }
  if (v.finished || v.handedOver) return;
  const list = [...v.alerts].reverse();
  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    e.preventDefault();
    if (!list.length) return;
    let i = list.findIndex(a => a.n === app.selAlert);
    i = i < 0 ? 0 : Math.max(0, Math.min(list.length - 1, i + (e.key === "ArrowDown" ? 1 : -1)));
    app.selAlert = list[i].n; app.selAsset = list[i].host; renderOps();
    const el = $(`[data-alert="${app.selAlert}"]`); el && el.scrollIntoView({ block: "nearest" });
    return;
  }
  if (/^[1-4]$/.test(e.key)) {
    const a = v.alerts.find(x => x.n === app.selAlert); if (!a) return toast("Pilih satu peringatan dulu (↑ ↓)", true);
    const r = alertActions(v, a)[Number(e.key) - 1]; if (r) { e.preventDefault(); ask(r.kind, r.arg); }
    return;
  }
  if (e.key === "n" || e.key === "N") { if (v.incidentAt == null) { e.preventDefault(); ask("incident", null); } }
});
