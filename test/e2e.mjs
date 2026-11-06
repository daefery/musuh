// End-to-end journeys against the real binary (council round-1 required journeys included).
// Run: node test/e2e.mjs [width height] [binary]
import { spawn } from 'node:child_process';
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os';
import { launch } from './browser.mjs';
const W = +(process.argv[2] || 1440), H = +(process.argv[3] || 900);
const BIN = path.resolve(process.argv[4] || 'target/debug/musuh');
const port = 8100 + (W % 97);
const run = fs.mkdtempSync(path.join(os.tmpdir(), 'musuh-e2e-'));
const shots = path.resolve(`test/shots/${W}x${H}`); fs.mkdirSync(shots, { recursive: true });
let srv = spawn(BIN, ['--no-open', '--port', String(port)], { cwd: run, stdio: 'ignore' });
const cleanup = () => { try { srv.kill(); } catch {} };
process.on('exit', cleanup); process.on('uncaughtException', (e) => { console.error(e); cleanup(); process.exit(1); });
const wait = (ms) => new Promise(r => setTimeout(r, ms));
await wait(800);
const b = await launch();
const ctx = await b.newContext({ viewport: { width: W, height: H }, reducedMotion: 'reduce' });
const p = await ctx.newPage();
const errs = [], ext = [];
p.on('pageerror', e => errs.push(e.message));
p.on('console', m => { if (m.type() === 'error' && !/ERR_CONNECTION_REFUSED|net::ERR|EventSource|status of 400/.test(m.text())) errs.push(m.text()); });
p.on('request', r => { const u = r.url(); if (!u.startsWith(`http://127.0.0.1:${port}`) && !u.startsWith('data:') && !u.startsWith('blob:')) ext.push(u); });
p.on('dialog', d => d.accept());
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); else console.log('  ok  ' + m); };
const shot = (n) => p.screenshot({ path: `${shots}/${n}.png` });
const state = () => p.evaluate(() => app.view);
const until = async (fn, ms = 30000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await p.evaluate(fn)) return true; await wait(80); } return false; };
const BASE = `http://127.0.0.1:${port}/`;
async function start(scenario, mode, speed, nama = 'Peserta Satu', code = 'MSH-7Q2K') {
  await p.click('#gsb [data-go="siapkan"]').catch(() => {});
  await p.waitForSelector('.scn');
  await p.click(`.scn[data-id="${scenario}"]`);
  await p.fill('#f-nama', nama); await p.fill('#f-code', code);
  await p.click(`[data-mode="${mode}"]`);
  if (mode === 'latih' && speed) await p.click(`[data-speed="${speed}"]`);
  await p.click('button[type=submit]');
  await p.waitForSelector('.ops');
}

await p.goto(BASE);
await p.waitForSelector('#gsb [data-go="siapkan"]');
await p.click('#gsb [data-go="siapkan"]');
await p.waitForSelector('.scn');
ok(await p.locator('.scn').count() === 3, 'SIAPKAN lists 3 scenarios');
ok((await p.locator('.rekaan').first().innerText()).includes('rekaan berbasis insiden nyata'), 'scenarios labelled rekaan');
ok(await p.locator('#gsb .tag.sim').isVisible(), 'LATIHAN · SIMULASI app state always visible');
await shot('01-siapkan');

// J1: Latih run, domain scenario. Trainee view hides ground truth (R6).
await start('domain-takeover', 'latih', 10);
ok(await until(() => app.view && app.view.alerts.length >= 2), 'alerts arrive');
let v = await state();
ok(v.thoughts === undefined && v.moves === undefined && v.phases === undefined, 'trainee view has no enemy ground truth');
ok(v.assets.every(a => !a.truth), 'assets carry no foothold truth for the trainee');
ok(!v.assets.some(a => a.status === 'normal'), 'unknown state is never shown as green normal');
await p.locator('.alert').last().click();
const selBefore = await p.evaluate(() => app.selAlert);
// J2: concurrent alert arrival must not move the selection (R9).
await until(() => app.view.alerts.length >= 3);
ok(await p.evaluate(() => app.selAlert) === selBefore, 'new alerts do not change the selected alert');
// J3: typing with shortcuts: keys inside the log filter do not trigger actions.
await p.fill('#log-q', 'n1234');
ok(await p.locator('#confirm.on').count() === 0, 'typing in the filter triggers no command');
await p.fill('#log-q', '');
// J4: confirm strip shows verb + exact target; Esc cancels; Enter executes.
await p.locator('#scr-operasi').click({ position: { x: 5, y: 5 } }).catch(() => {});
await p.locator('.alert[aria-selected="true"]').click();
await p.keyboard.press('1');
ok(await p.locator('#confirm.on').isVisible(), 'key 1 opens the confirm strip');
const what = await p.locator('#confirm .what').innerText();
ok(/Isolasi host|Blokir IP|Reset akun/.test(what), 'confirm names verb + target: ' + what.trim());
await p.keyboard.press('Escape');
ok(await p.locator('#confirm.on').count() === 0, 'Esc cancels');
await shot('02-operasi');
// Block the proxy (enemy adapts to tunnel), then block the tunnel.
await until(() => app.view.seenIps.includes('198.51.100.23'));
await p.evaluate(() => ask('block', '198.51.100.23')); await p.keyboard.press('Enter');
ok(await until(() => app.view.blockedIps.includes('198.51.100.23')), 'block executes after Enter');
ok(await until(() => app.view.seenIps.includes('203.0.113.45'), 40000), 'MUSUH adapts: tunnel IP appears in telemetry');
await p.evaluate(() => ask('block', '203.0.113.45')); await p.keyboard.press('Enter');
await until(() => app.view.blockedIps.includes('203.0.113.45'));
await p.evaluate(() => ask('incident', null)); await p.keyboard.press('Enter');
await shot('03-operasi-tindakan');
// J5: refresh mid-run: the run continues, nothing is executed twice (R12).
const nActs = (await state()).actions.length;
await p.reload(); await p.waitForSelector('.ops');
ok((await state()).actions.length === nActs, 'reload keeps the run and does not repeat commands');
// J6: handover plays the remaining time; no early-stop GO (R1).
await p.click('#b-handover');
ok(await until(() => app.view && app.view.finished, 60000), 'handover runs to the natural end');
v = await state();
ok(v.rapor && v.rapor.handover_at != null, 'rapor records the handover time');
await p.waitForSelector('#scr-evaluasi.on .gauge', { timeout: 5000 });
ok(await p.locator('.lane').count() > 3, 'EVALUASI shows the swimlane replay');
await p.locator('.lane').nth(1).click();
ok(await p.locator('.lane[aria-expanded="true"] .ev a').count() >= 1, 'replay row shows its public source');
console.log('  score', v.score.total, v.score.verdict);
await shot('04-evaluasi');

// ---- build council round 1 journeys ----
// B9: rendered SigmaHQ links point at the pinned commit and a real rule path.
const sigmaHrefs = await p.$$eval('a[href*="SigmaHQ/sigma/blob/"]', as => as.map(a => a.href));
ok(sigmaHrefs.length > 0 && sigmaHrefs.every(h => h.includes('/blob/c68bb91abb1146b8a6a65caf6819b1836d97f09d/rules/')), 'Sigma links rendered and pinned (' + sigmaHrefs.length + ')');
// B2: keyboard-operable evidence rows: Tab reaches a closed row button, Enter opens THAT row.
await p.evaluate(() => $$('.lane').forEach(l => { l.setAttribute('aria-expanded', 'false'); const b = l.querySelector('button.open'); b && b.setAttribute('aria-expanded', 'false'); }));
await p.locator('#scr-evaluasi [data-go3="rapor"]').focus();
let reached = null; for (let i = 0; i < 60 && !reached; i++) { await p.keyboard.press('Tab'); reached = await p.evaluate(() => document.activeElement && document.activeElement.matches('.lane button.open') ? true : null); }
ok(reached === true, 'Tab reaches an evidence row button');
const wasOpen = await p.evaluate(() => document.activeElement.closest('.lane').getAttribute('aria-expanded'));
await p.keyboard.press('Enter');
ok(wasOpen === 'false' && await p.evaluate(() => document.activeElement.closest('.lane').getAttribute('aria-expanded')) === 'true', 'Enter opens the focused evidence row (closed -> open)');
// B7: footholds at the end of the run.
ok(/pijakan musuh di akhir latihan/i.test(await p.locator('#scr-evaluasi').innerText()) && /masih dikuasai MUSUH|Tidak ada pijakan/.test(await p.locator('#scr-evaluasi').innerText()), 'debrief lists final footholds');
// B7: debrief shows enemy phases and moves.
ok((await p.locator('#scr-evaluasi').innerText()).includes('Gerak MUSUH'), 'debrief shows enemy moves');

// J7: rapor + verification + forgery; CLI verify of the saved file.
// Reach RAPOR through the "Lihat rapor" button on EVALUASI (a shadowed go() once broke it).
await p.click('#gsb [data-go="evaluasi"]'); await p.waitForSelector('#scr-evaluasi.on [data-go3="rapor"]');
await p.locator('#scr-evaluasi [data-go3="rapor"]').click();
ok(await until(() => app.screen === 'rapor', 3000), '"Lihat rapor" opens the RAPOR screen');
await p.waitForSelector('.paper');
const paper = await p.locator('.paper').innerText();
ok(/bukan dokumen dinas/i.test(paper), 'rapor says simulation, not an official document, near the title');
ok(paper.includes('SigmaHQ') && paper.includes('attack.mitre.org'), 'rapor lists rule origins and scenario sources');
await p.click('#r-test');
ok(await until(() => document.querySelector('#r-out .vres.ok') !== null), 'genuine rapor verifies in the console');
// The console has no way to edit a value: no text box, no "change score" button.
ok(await p.locator('#scr-rapor textarea, #r-forge, #r-text').count() === 0, 'rapor screen offers no way to edit a value');
// Forgery is done outside MUSUH: edit the saved file on disk, then load it.
const files = fs.readdirSync(path.join(run, 'rapor')).filter(f => f.endsWith('.json'));
{
  const forged = JSON.parse(fs.readFileSync(path.join(run, 'rapor', files[0]), 'utf8'));
  forged.total = 98; forged.verdict = 'GO'; forged.grade = 'SANGAT BAIK';
  const fp = path.join(run, 'rapor-diubah.json'); fs.writeFileSync(fp, JSON.stringify(forged, null, 2));
  await p.setInputFiles('#r-file', fp);
  ok(await until(() => document.querySelector('#r-out .vres.bad') !== null), 'file edited to 98 outside MUSUH is rejected on load');
  ok((await p.locator('#r-out').innerText()).includes(String(v.score.total)), 'replay shows the real score');
}
await shot('05-rapor-palsu');
ok(files.length === 1, 'rapor saved atomically to ./rapor (' + files.join(',') + ')');
const { execFileSync } = await import('node:child_process');
let cliOut = ''; try { cliOut = execFileSync(BIN, ['verify', path.join(run, 'rapor', files[0])]).toString(); } catch (e) { cliOut = 'EXIT ' + e.status; }
ok(cliOut.startsWith('RAPOR SAH'), 'CLI: musuh verify -> RAPOR SAH');
{
  const good = JSON.parse(fs.readFileSync(path.join(run, 'rapor', files[0]), 'utf8'));
  for (const bad of ['', 'a', 'abcdefghijk\u00e9']) {
    const f = path.join(run, 'bad-hash.json'); fs.writeFileSync(f, JSON.stringify({ ...good, hash: bad }));
    let code = 0; try { execFileSync(BIN, ['verify', f], { stdio: 'ignore' }); } catch (e) { code = e.status; }
    ok(code === 1, `CLI rejects malformed hash ${JSON.stringify(bad)} without crashing (exit ${code})`);
    const api = await p.evaluate(async (body) => { const r = await fetch('/api/verify', { method: 'POST', headers: { 'content-type': 'application/json' }, body }); return [r.status, (await r.json()).ok]; }, JSON.stringify({ ...good, hash: bad }));
    ok(api[0] === 200 && api[1] === false, `API rejects malformed hash ${JSON.stringify(bad)}`);
  }
}

// B5: the console shows the real absolute save path.
ok((await p.locator('#scr-rapor').innerText()).includes(path.join(run, 'rapor')), 'rapor screen shows the real save path');

// J8: Uji mode: no recommendations, no pause, speed locked (R11).
await start('domain-takeover', 'uji', null, 'Peserta Dua', 'MSH-7Q2K');
await until(() => app.view.alerts.length >= 1, 40000);
v = await state();
ok(v.mode === 'uji' && v.speed === 4 && v.alerts.every(a => a.recs.length === 0), 'Uji: no suggestions, speed 4x');
ok(await p.locator('#t-pause').count() === 0, 'Uji: no pause control');
const r = await p.evaluate(async () => (await fetch('/api/control', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ paused: true }) })).status);
ok(r === 400, 'Uji: server refuses pause');
await p.evaluate(() => fetch('/api/control', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ abort: true }) }));
ok(await until(() => app.view && app.view.aborted), 'abort ends without rapor');
ok(!(await state()).rapor, 'aborted run has no rapor');

// B2: paced keyboard focus survives clock ticks (Latih run).
await start('domain-takeover', 'latih', 10, 'Peserta Fokus', 'MSH-0001');
await until(() => app.view.alerts.length >= 1, 30000);
await p.locator('#scr-operasi [data-asset="WEB-01"]').focus();
let kept = 0; for (let i = 0; i < 5; i++) { await wait(350); if (await p.evaluate(() => document.activeElement && document.activeElement.dataset.asset === 'WEB-01')) kept++; }
ok(kept === 5, 'focused control keeps focus across 5 ticks (' + kept + '/5)');
await p.keyboard.press('Enter');
ok(await p.evaluate(() => app.selAsset === 'WEB-01'), 'Enter on the focused asset selects it');
// B8: live Latih speed control changes the running speed.
await p.click('#gsb [data-speed="1"]');
ok(await until(() => app.view.speed === 1), 'live Latih speed control works');
ok(await p.locator('#gsb-conn').innerText() === 'Tersambung', 'GSB shows connection state');
// B1: every required GSB control is inside the viewport before any click (normal scale).
const offscreen = async () => p.evaluate(() => ['#t-present', '#t-help', '#t-trainer', '#gsb-conn', '#gsb [data-speed="10"]', '#clock'].filter(sel => { const e = document.querySelector(sel); if (!e) return true; const r = e.getBoundingClientRect(); return r.right > innerWidth || r.left < 0 || r.width === 0; }));
ok((await offscreen()).length === 0, 'GSB controls on screen at normal scale ' + JSON.stringify(await offscreen()));
// B1: presentation mode enlarges the task text.
const sizeOf = () => p.evaluate(() => ({ title: parseFloat(getComputedStyle(document.querySelector('.alert .ttl')).fontSize), meta: parseFloat(getComputedStyle(document.querySelector('.alert .meta')).fontSize), clock: parseFloat(getComputedStyle(document.querySelector('#clock')).fontSize) }));
const s1 = await sizeOf();
ok(s1.title >= 16 && s1.meta >= 13 && s1.clock >= 28, `type sizes ${JSON.stringify(s1)} meet 16/13/28`);
await p.click('#t-present'); await wait(200);
const s2 = await sizeOf();
ok(s2.title > s1.title * 1.15, `presentation enlarges text ${s1.title} -> ${s2.title}`);
ok((await offscreen()).length === 0, 'GSB controls on screen in presentation mode ' + JSON.stringify(await offscreen()));
await p.click('#t-present');
// B3 (real transport): hold a /api/state response, start a NEW run, then release the old response.
// The console must stay on the new run. Then: hold a response, cut the stream, reconnect, release it:
// the console must stay stale (no actions) until a response sent after the reconnect arrives.
{
  let held = []; let holding = true;
  await p.route('**/api/state*', async (route) => { if (holding) { held.push(route); } else { await route.continue(); } });
  await p.evaluate(() => { refresh(); }); await wait(300);
  ok(held.length >= 1, 'a state response is being held');
  holding = false;
  await start('listrik-markas', 'latih', 4, 'Peserta Baru', 'MSH-0002');
  const newRun = (await state()).runId;
  for (const r of held) await r.continue().catch(() => {});
  held = []; await wait(800);
  ok((await state()).runId === newRun && (await state()).scenario.id === 'listrik-markas', 'obsolete run response does not replace the new run');
  // Hold, then force a reconnect, then release the pre-reconnect response.
  holding = true;
  await p.evaluate(() => { refresh(); }); await wait(300);
  const preLoss = held.slice(); held = [];
  await p.evaluate(() => { app.connected = false; newGeneration(); renderConn(); app.connected = true; newGeneration(); renderConn(); });
  for (const r of preLoss) await r.continue().catch(() => {});
  await wait(500);
  ok(await p.evaluate(() => !live()), 'pre-reconnect response does not make the console live');
  const before = (await state()).actions.length;
  await p.keyboard.press('n'); await wait(150); await p.keyboard.press('Enter'); await wait(400);
  holding = false; await p.unroute('**/api/state*');
  for (const r of held) await r.continue().catch(() => {});
  await p.evaluate(() => refresh());
  ok(await until(() => live()), 'a fresh post-reconnect snapshot makes it live');
  const srvActs = await p.evaluate(async () => (await (await fetch('/api/state')).json()).actions.length);
  ok(srvActs === before, 'no action reached the server while stale');
  await p.evaluate(() => fetch('/api/control', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ abort: true }) }));
}
// B10: Enter on a focused "Batal" cancels; it never executes.
await start('domain-takeover', 'latih', 4, 'Peserta Batal', 'MSH-0003');
await until(() => app.view.alerts.length >= 1, 30000);
await p.locator('#scr-operasi').click({ position: { x: 3, y: 3 } }).catch(() => {});
await p.keyboard.press('n'); await wait(150);
await p.focus('#confirm-no'); await p.keyboard.press('Enter'); await wait(400);
ok((await state()).actions.length === 0, 'Enter on Batal does not execute');
await p.keyboard.press('n'); await wait(150);
await p.focus('#confirm-go'); await p.keyboard.press('Enter'); await wait(500);
ok((await state()).actions.length === 1, 'Enter on Jalankan executes exactly once');
// B2: focused Sigma source link keeps focus when another alert arrives.
await p.locator('.alert .meta a').first().focus();
await p.evaluate(() => { window.__n0 = app.view.alerts.length; });
await until(() => app.view.alerts.length > window.__n0, 40000);
await wait(300);
ok(await p.evaluate(() => document.activeElement && document.activeElement.tagName === 'A'), 'focused source link survives a new alert');
await p.evaluate(() => fetch('/api/control', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ abort: true }) }));
await p.evaluate(() => fetch('/api/control', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ abort: true }) }));

// J9: OT recovery in one place (R10).
await start('listrik-markas', 'latih', 10, 'Peserta Tiga', 'MSH-0001');
ok(await until(() => app.view && app.view.genset && !app.view.genset.running, 60000), 'genset stops when undefended');
// At 10x the run ends ~4.5 s after the genset stops; slow to 1x so the recovery steps are not racing the end.
await p.click('#gsb [data-speed="1"]'); await until(() => app.view.speed === 1);
await p.click('#scr-operasi [data-asset="PLC-GEN"]');
ok(await p.locator('.ot.down').isVisible(), 'PLC detail shows genset down');
await p.locator('.ot [data-act="genset-start"]').click(); await p.keyboard.press('Enter');
ok(await until(() => document.querySelector('.why-refused') !== null), 'restart refused with the interlock reason shown in place');
await p.locator('.ot [data-act="modbus-block"]').click(); await p.keyboard.press('Enter');
await until(() => app.view.modbusBlocked);
await p.locator('.ot [data-act="genset-start"]').click(); await p.keyboard.press('Enter');
ok(await until(() => app.view.genset.running), 'genset restored after blocking writes');
await shot('06-ot');

// J10: foreign origin cannot drive the console (R12).
const code = await p.evaluate(async (port) => { const r = await fetch(`http://127.0.0.1:${port}/api/act`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"kind":"incident"}' }); return r.status; }, port);
ok(code === 200 || code === 400, 'same-origin POST allowed');
const foreign = await new Promise(res => { import('node:http').then(http => { const rq = http.request({ host: '127.0.0.1', port, path: '/api/act', method: 'POST', headers: { origin: 'http://evil.example', 'content-type': 'application/json' } }, rs => res(rs.statusCode)); rq.end('{"kind":"incident"}'); }); });
ok(foreign === 403, 'foreign Origin rejected (403)');
const otherPort = await new Promise(res => { import('node:http').then(http => { const rq = http.request({ host: '127.0.0.1', port, path: '/api/control', method: 'POST', headers: { origin: 'http://127.0.0.1:9999', 'content-type': 'application/json' } }, rs => res(rs.statusCode)); rq.end('{}'); }); });
ok(otherPort === 403, 'another loopback port origin rejected (403)');

// J11: disconnect shows TERPUTUS and disables actions; reconnect restores.
srv.kill(); await wait(2500);
ok(await p.locator('#connbar').isVisible(), 'engine loss shows TERPUTUS');
srv = spawn(BIN, ['--no-open', '--port', String(port)], { cwd: run, stdio: 'ignore' });
ok(await until(() => !document.querySelector('#connbar'), 15000), 'reconnects after the engine restarts');

// B3: stream loss keeps actions disabled until a fresh snapshot arrives.
ok(await p.evaluate(() => typeof live === 'function' && live()), 'live after reconnect');
// B5: save failure is reported, not hidden. Run in a folder where "rapor" is a file.
const bad = fs.mkdtempSync(path.join(os.tmpdir(), 'musuh-bad-')); fs.writeFileSync(path.join(bad, 'rapor'), 'not a folder');
const port2 = port + 1;
const srv2 = spawn(BIN, ['--no-open', '--port', String(port2)], { cwd: bad, stdio: 'ignore' }); await wait(800);
const j = async (m, pth, body) => (await fetch(`http://127.0.0.1:${port2}${pth}`, m === 'GET' ? {} : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })).json();
await j('POST', '/api/start', { scenario: 'domain-takeover', code: 'MSH-0001', mode: 'latih', speed: 10, trainee: { nama: 'X', pangkat: 'Sertu', nrp: '', satuan: '' } });
await j('POST', '/api/control', { handover: true });
let st2; for (let i = 0; i < 60; i++) { st2 = await j('GET', '/api/state'); if (st2.finished && st2.saved) break; await wait(200); }
ok(st2.saved && st2.saved.ok === false && /rapor/.test(st2.saved.error), 'save failure reported: ' + (st2.saved && st2.saved.error));
srv2.kill();
ok(errs.length === 0, 'no page errors ' + JSON.stringify(errs));
ok(ext.length === 0, 'no external requests ' + JSON.stringify(ext));
console.log(fails.length ? `\nFAIL ${fails.length}:\n - ${fails.join('\n - ')}` : '\nALL OK');
await b.close(); srv.kill(); process.exit(fails.length ? 1 : 0);
