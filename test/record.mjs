// Records the demo footage for docs/VIDEO-SCRIPT.md from the real release binary.
// Output: dist/video/MUSUH-demo.mp4 (1920x1080, silent; Fery adds the narration).
// Run: node test/record.mjs   (needs ffmpeg; NAMA=... to change the trainee name)
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os';
import { launch } from './browser.mjs';
const out = path.resolve('dist/video'); fs.mkdirSync(out, { recursive: true });
const raw = fs.mkdtempSync(path.join(os.tmpdir(), 'musuh-rec-'));
const run = fs.mkdtempSync(path.join(os.tmpdir(), 'musuh-rec-run-'));
const port = 8290, NAMA = process.env.NAMA || 'Peserta Satu';
const srv = spawn(path.resolve('target/release/musuh'), ['--no-open', '--port', String(port)], { cwd: run, stdio: 'ignore' });
process.on('exit', () => { try { srv.kill(); } catch {} });
const wait = (ms) => new Promise(r => setTimeout(r, ms));
await wait(800);
const b = await launch();
const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 }, recordVideo: { dir: raw, size: { width: 1920, height: 1080 } } });
const p = await ctx.newPage(); p.on('dialog', d => d.accept());
const until = async (fn, ms = 90000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await p.evaluate(fn)) return; await wait(80); } };
// A visible cursor so viewers can follow the clicks.
await p.addInitScript(() => { addEventListener('DOMContentLoaded', () => { const c = document.createElement('div'); c.id = '__cur'; c.style.cssText = 'position:fixed;z-index:99999;width:22px;height:22px;border-radius:50%;border:3px solid #f0d27a;background:rgba(240,210,122,.25);pointer-events:none;transform:translate(-50%,-50%);transition:left .35s,top .35s;left:-50px;top:-50px'; document.body.appendChild(c); addEventListener('mousemove', e => { c.style.left = e.clientX + 'px'; c.style.top = e.clientY + 'px'; }, true); }); });
const marks = []; const t0 = Date.now(); const mark = (name) => marks.push([name, (Date.now() - t0) / 1000]);
const move = async (sel) => { const bx = await p.locator(sel).first().boundingBox(); if (bx) { await p.mouse.move(bx.x + bx.width / 2, bx.y + bx.height / 2, { steps: 12 }); await wait(350); } };
const click = async (sel) => { await move(sel); await p.locator(sel).first().click(); };

// Scene 3: SIAPKAN
mark('siapkan');
await p.goto(`http://127.0.0.1:${port}/`); await p.click('#gsb [data-go="siapkan"]'); await p.waitForSelector('.scn');
await wait(4000);
await p.evaluate(() => document.querySelector('.mini').scrollIntoView({ behavior: 'smooth', block: 'center' })); await wait(4500);
await p.evaluate(() => document.querySelector('.scroll').scrollTo({ top: 0, behavior: 'smooth' })); await wait(1500);
await click('#f-nama'); await p.keyboard.type(NAMA, { delay: 70 }); await wait(600);
await click('[data-speed="4"]'); await wait(800);
await click('button[type=submit]');
// Scene 4: OPERASI, first alerts, select, block the proxy
mark('operasi');
await until(() => app.view && app.view.alerts.length >= 2); await wait(2500);
await click('.alert:last-child'); await wait(2000);
await until(() => app.view.seenIps.includes('198.51.100.23'));
await click('#scr-operasi .alert'); await wait(1200);
const blk = p.locator('.alert[aria-selected="true"] [data-act="block"]');
if (await blk.count()) { await move('.alert[aria-selected="true"] [data-act="block"]'); await blk.first().click(); }
else { await click('#detail [data-act="block"]'); }
await wait(1800); await p.keyboard.press('Enter'); await wait(1500);
// Scene 5: trainer view, MUSUH adapts
mark('adaptasi');
await click('#t-trainer'); await wait(1000);
await until(() => app.view.seenIps.includes('203.0.113.45'));
await wait(6000);
// Scene 6: block the tunnel, declare incident, hand over
mark('serahkan');
await click('#detail [data-act="block"]'); await wait(1500); await p.keyboard.press('Enter'); await wait(1500);
await click('#b-incident'); await wait(1200); await p.keyboard.press('Enter'); await wait(1500);
await click('#t-trainer'); await wait(800);
await click('#b-handover'); await wait(500);
await until(() => app.view.finished && app.screen === 'evaluasi');
// Scene 7: EVALUASI
mark('evaluasi');
await wait(5000);
await p.evaluate(() => document.querySelector('#scr-evaluasi .scroll').scrollTo({ top: 600, behavior: 'smooth' })); await wait(4000);
await click('.lane button.open:not([disabled])'); await wait(4000);
await p.evaluate(() => document.querySelector('#scr-evaluasi .scroll').scrollTo({ top: 0, behavior: 'smooth' })); await wait(1500);
// Scene 8: RAPOR, verify genuine, then a file edited outside MUSUH
mark('rapor');
await click('#scr-evaluasi [data-go3="rapor"]'); await p.waitForSelector('.paper'); await wait(3500);
await click('#r-test'); await until(() => document.querySelector('#r-out .vres.ok')); await wait(4000);
const r = await p.evaluate(() => app.view.rapor); r.total = 98; r.verdict = 'GO'; r.grade = 'SANGAT BAIK';
const fp = path.join(run, 'rapor-diubah.json'); fs.writeFileSync(fp, JSON.stringify(r, null, 2));
await move('label.btn.primary'); await p.setInputFiles('#r-file', fp);
await until(() => document.querySelector('#r-out .vres.bad')); await p.locator('#r-out').scrollIntoViewIfNeeded(); await wait(6000);
// Scene 9: OT genset
mark('genset');
await click('#gsb [data-go="siapkan"]'); await p.waitForSelector('.scn');
await click('.scn[data-id="listrik-markas"]'); await p.fill('#f-code', 'MSH-0001'); await click('[data-speed="10"]'); await click('button[type=submit]');
await until(() => app.view && app.view.genset && !app.view.genset.running);
await click('#gsb [data-speed="1"]'); await click('#scr-operasi [data-asset="PLC-GEN"]'); await wait(2500);
await click('.ot [data-act="genset-start"]'); await p.keyboard.press('Enter'); await wait(3000);
await click('.ot [data-act="modbus-block"]'); await p.keyboard.press('Enter'); await wait(1500);
await click('.ot [data-act="genset-start"]'); await p.keyboard.press('Enter'); await wait(4000);
mark('end');
const video = p.video(); await ctx.close(); const webm = await video.path(); await b.close(); srv.kill();
fs.writeFileSync(path.join(out, 'scene-marks.json'), JSON.stringify(marks, null, 1));
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', webm, '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-r', '30', path.join(out, 'MUSUH-demo-layar.mp4')]);
console.log('written', path.join(out, 'MUSUH-demo-layar.mp4'), marks.map(m => `${m[0]}@${m[1].toFixed(1)}s`).join(' '));
