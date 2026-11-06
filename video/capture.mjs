// Drives the real MUSUH release binary through the demo and saves a sharp still (3840x2160, DPR 2)
// at every beat, plus the on-screen box of each element the video points at.
// Output: video/out/shots/<name>.png and video/out/shots/shots.json { name: { boxes: { key: [x,y,w,h] } } }
//   node video/capture.mjs        (run from the musuh folder, after cargo build --release)
import { spawn } from 'node:child_process';
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os';
import { launch } from '../test/browser.mjs';
const OUT = path.resolve('video/out/shots'); fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
const run = fs.mkdtempSync(path.join(os.tmpdir(), 'musuh-cap-'));
const port = 8293, NAMA = process.env.NAMA || 'Peserta Satu';
const srv = spawn(path.resolve('target/release/musuh'), ['--no-open', '--port', String(port)], { cwd: run, stdio: 'ignore' });
process.on('exit', () => { try { srv.kill(); } catch {} });
const wait = (ms) => new Promise(r => setTimeout(r, ms));
await wait(800);
const b = await launch();
const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 });
const p = await ctx.newPage(); p.on('dialog', d => d.accept());
const until = async (fn, ms = 90000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await p.evaluate(fn)) return true; await wait(100); } throw new Error('timeout: ' + fn); };
const meta = {};
// Save a still and the boxes of the named targets (CSS px in the 1920x1080 viewport).
async function snap(name, targets = {}) {
  await p.mouse.move(-10, -10); await wait(350);
  const boxes = {};
  for (const [k, sel] of Object.entries(targets)) {
    const loc = p.locator(sel).first();
    if (!(await loc.count())) { console.warn('  missing', name, k, sel); continue; }
    const bx = await loc.boundingBox(); if (bx) boxes[k] = [bx.x, bx.y, bx.width, bx.height].map(v => Math.round(v));
  }
  await p.screenshot({ path: path.join(OUT, name + '.png') });
  meta[name] = { boxes }; console.log('snap', name, Object.keys(boxes).join(' '));
}
const go = async (sel) => { await p.locator(sel).first().click(); };

// SIAPKAN
await p.goto(`http://127.0.0.1:${port}/`); await go('#gsb [data-go="siapkan"]'); await p.waitForSelector('.scn');
await snap('siapkan', { scn1: '.scn >> nth=0', scn2: '.scn >> nth=1', scn3: '.scn >> nth=2', nama: '#f-nama', mulai: 'button[type=submit]', form: '#f-nama >> xpath=ancestor::section[1]' });
await p.fill('#f-nama', NAMA); await go('[data-speed="4"]');
await snap('siapkan-isi', { nama: '#f-nama', mulai: 'button[type=submit]', speed: '[data-speed="4"]' });
await go('button[type=submit]');

// OPERASI: first alerts, select the proxy alert, block 198.51.100.23
await until(() => app.view && app.view.alerts.length >= 2); await wait(1200);
await snap('ops-awal', { map: '#assets', queue: '#queue', log: '#scr-operasi .log', web: '#assets [data-asset="WEB-01"]', tline: '#tline' });
await until(() => app.view.seenIps.includes('198.51.100.23')); await wait(600);
await go('#scr-operasi .alert'); await wait(700);
await snap('ops-pilih', { alert: '.alert[aria-selected="true"]', sigma: '.alert[aria-selected="true"] a', detail: '#detail', block: '.alert[aria-selected="true"] [data-act="block"]', ip: '#assets g.mnode:has(text:text-is("198.51.100.23"))' });
const blk = p.locator('.alert[aria-selected="true"] [data-act="block"]');
if (await blk.count()) await blk.first().click(); else await go('#detail [data-act="block"]');
await wait(500);
await snap('ops-konfirmasi', { confirm: '#confirm', go: '#confirm-go' });
await p.keyboard.press('Enter'); await wait(1200);
await snap('ops-blokir', { map: '#assets', ip: '#assets g.mnode:has(text:text-is("198.51.100.23"))', log: '#scr-operasi .log' });

// ADAPTASI: trainer view, MUSUH opens a backup tunnel
await go('#t-trainer'); await wait(700);
await until(() => app.view.seenIps.includes('203.0.113.45')); await wait(1500);
await snap('adaptasi', { trainer: '#trainer', map: '#assets', tunnel: '#assets g.mnode:has(text:text-is("203.0.113.45"))', ip: '#assets g.mnode:has(text:text-is("198.51.100.23"))', eye: '#t-trainer' });

// SERAHKAN: block the tunnel, declare incident, hand over
await go('#detail [data-act="block"]'); await wait(500); await p.keyboard.press('Enter'); await wait(900);
await go('#b-incident'); await wait(500); await p.keyboard.press('Enter'); await wait(900);
await snap('serahkan', { map: '#assets', ips: '#assets .mapzone:has-text("Luar"), #assets svg', ip1: '#assets g.mnode:has(text:text-is("203.0.113.45"))', ip2: '#assets g.mnode:has(text:text-is("198.51.100.23"))', chip: '#ops-brief .chip', handover: '#b-handover', incident: '#b-incident' });
await go('#t-trainer'); await wait(300);
await go('#b-handover'); await wait(800);
await snap('diserahkan', { chip: '#ops-brief .chip', tline: '#tline' });
await until(() => app.view.finished && app.screen === 'evaluasi'); await wait(1500);

// EVALUASI
await snap('eval-atas', { score: '.scoreviz', parts: '.parts', obj: '.objgrid', chain: '#scr-evaluasi section:has(h2:has-text("Rantai serangan"))' });
await p.evaluate(() => { const s = document.querySelector('#scr-evaluasi .scroll'); const t = document.querySelector('#scr-evaluasi .tlwrap'); s.scrollTo(0, t.getBoundingClientRect().top + s.scrollTop - 140); }); await wait(600);
await snap('eval-waktu', { tline: '#scr-evaluasi .tlwrap', map: '#scr-evaluasi .mapwrap', chain: '#scr-evaluasi section:has(h2:has-text("Rantai serangan"))' });
await p.evaluate(() => { const s = document.querySelector('#scr-evaluasi .scroll'); const t = document.querySelector('#lanes'); s.scrollTo(0, t.getBoundingClientRect().top + s.scrollTop - 200); }); await wait(500);
await go('.lane button.open:not([disabled])'); await wait(800);
await snap('eval-sumber', { lanes: '#lanes', open: '.lane .ev', btn: '.lane button.open:not([disabled])' });

// RAPOR: paper, genuine verify, file edited to 98
await p.evaluate(() => document.querySelector('#scr-evaluasi .scroll').scrollTo(0, 0)); await wait(300);
await go('#scr-evaluasi [data-go3="rapor"]'); await p.waitForSelector('.paper'); await wait(800);
await snap('rapor', { paper: '.paper', title: '.paper h1, .paper .title', test: '#r-test', hasil: '.paper table >> nth=0' });
await go('#r-test'); await until(() => document.querySelector('#r-out .vres.ok')); await wait(800);
await snap('rapor-sah', { out: '#r-out', flow: '#scr-rapor .vflow', test: '#r-test' });
const r = await p.evaluate(() => app.view.rapor); r.total = 98; r.verdict = 'GO'; r.grade = 'SANGAT BAIK';
const fp = path.join(run, 'rapor-diubah.json'); fs.writeFileSync(fp, JSON.stringify(r, null, 2));
await p.setInputFiles('#r-file', fp); await until(() => document.querySelector('#r-out .vres.bad'));
await p.locator('#r-out').scrollIntoViewIfNeeded(); await wait(800);
await snap('rapor-palsu', { out: '#r-out', flow: '#scr-rapor .vflow', file: '#r-file >> xpath=..' });
const realScore = await p.evaluate(() => app.view.score.total);

// GENSET (OT scenario)
await go('#gsb [data-go="siapkan"]'); await p.waitForSelector('.scn');
await go('.scn[data-id="listrik-markas"]'); await p.fill('#f-code', 'MSH-0001'); await go('[data-speed="10"]'); await go('button[type=submit]');
await until(() => app.view && app.view.genset && !app.view.genset.running);
await go('#gsb [data-speed="1"]'); await go('#scr-operasi [data-asset="PLC-GEN"]'); await wait(900);
await snap('genset-mati', { plc: '#assets [data-asset="PLC-GEN"]', ot: '#detail .ot', queue: '#queue', start: '.ot [data-act="genset-start"]' });
await go('.ot [data-act="genset-start"]'); await p.keyboard.press('Enter'); await wait(1200);
await snap('genset-tolak', { why: '.why-refused', start: '.ot [data-act="genset-start"]', mb: '.ot [data-act="modbus-block"]', ot: '#detail .ot' });
await go('.ot [data-act="modbus-block"]'); await p.keyboard.press('Enter'); await wait(1000);
await snap('genset-blokir', { mb: '.ot [data-act="modbus-block"]', start: '.ot [data-act="genset-start"]', ot: '#detail .ot' });
await go('.ot [data-act="genset-start"]'); await p.keyboard.press('Enter'); await wait(1500);
await snap('genset-nyala', { ot: '#detail .ot', plc: '#assets [data-asset="PLC-GEN"]', log: '#scr-operasi .log' });

fs.writeFileSync(path.join(OUT, 'shots.json'), JSON.stringify({ realScore, name: NAMA, shots: meta }, null, 1));
await b.close(); srv.kill(); console.log('done', Object.keys(meta).length, 'shots; real score', realScore); process.exit(0);
