// Toolbar journeys (council round 3: B1/B11): real mouse clicks at 1093-1920 px, normal -> presentation -> normal,
// Latih 10x and Uji. Every required control (incl. LATIHAN SIMULASI) must be visible and hit-testable BEFORE each click.
// Run: node test/toolbar.mjs [binary]
import { spawn } from 'node:child_process';
import { launch } from './browser.mjs';
import path from 'node:path';
const BIN = path.resolve(process.argv[2] || 'target/debug/musuh');
const srv = spawn(BIN, ['--no-open', '--port', '8263'], { cwd: '/tmp', stdio: 'ignore' });
process.on('exit', () => { try { srv.kill(); } catch {} });
await new Promise(r => setTimeout(r, 700));
const b = await launch();
const REQ = ['#t-present', '#t-help', '#t-trainer', '#gsb-conn', '#clock', '#gsb .tag.sim', '#gsb [data-go="rapor"]'];
let fails = 0;
for (const [w, mode, speed] of [[1093, 'uji', 4], [1200, 'latih', 10], [1201, 'latih', 10], [1279, 'latih', 10], [1280, 'latih', 10], [1366, 'latih', 10], [1440, 'latih', 10], [1920, 'uji', 4]]) {
  const p = await b.newPage({ viewport: { width: w, height: 768 } }); p.on('dialog', d => d.accept());
  await p.goto('http://127.0.0.1:8263/'); await p.click('#gsb [data-go="siapkan"]'); await p.waitForSelector('.scn');
  await p.fill('#f-nama', 'Sertu Review'); await p.click(`[data-mode="${mode}"]`); if (mode === 'latih') await p.click(`[data-speed="${speed}"]`);
  await p.click('button[type=submit]'); await p.waitForSelector('.ops'); await p.waitForTimeout(1500);
  const check = async (label) => {
    const bad = await p.evaluate((REQ) => REQ.filter(sel => { const e = document.querySelector(sel); if (!e) return true; const r = e.getBoundingClientRect(); if (r.width === 0 || r.right > innerWidth + 0.5 || r.left < 0 || r.bottom > innerHeight) return true; const c = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !(c && (e === c || e.contains(c) || c.contains(e))); }), REQ);
    const ops = await p.evaluate(() => { const o = document.querySelector('.ops').getBoundingClientRect(); return o.height > 300; });
    if (bad.length || !ops) { fails++; console.log('FAIL', w, mode, label, JSON.stringify(bad), 'ops ok', ops); } else console.log('ok  ', w, mode, label);
  };
  await check('normal');
  { const c = await p.evaluate(() => { const r = document.querySelector('#t-present').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }); await p.mouse.click(c[0], c[1]); await p.waitForTimeout(400); }
  if (!(await p.evaluate(() => document.documentElement.classList.contains('presentasi')))) { fails++; console.log('FAIL', w, 'click did not enable presentasi'); }
  await check('presentasi');

  { const c = await p.evaluate(() => { const r = document.querySelector('#t-present').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }); await p.mouse.click(c[0], c[1]); await p.waitForTimeout(400); }
  await check('back to normal');

  await p.close();
}
await b.close(); srv.kill(); console.log(fails ? `FAIL ${fails}` : 'ALL OK'); process.exit(fails ? 1 : 0);
