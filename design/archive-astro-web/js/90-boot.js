// Boot: load the library, connect to the engine stream, show SIAPKAN (or OPERASI if a run is live).
(async function boot() {
  try { app.lib = await api("/api/library"); } catch { document.body.innerHTML = "<p style='padding:2rem'>Mesin MUSUH tidak menjawab. Jalankan program musuh lalu muat ulang halaman ini.</p>"; return; }
  const s = await api("/api/state").catch(() => ({ idle: true }));
  if (!s.idle) { app.view = s; app.runId = s.runId; app.screen = s.finished ? "evaluasi" : "operasi"; }
  render();
  connect();
})();
