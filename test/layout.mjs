// Task-based layout matrix (council round 4: B12). For each width x height x scale, the trainee must be
// able to select an alert, reach its action, open the confirmation and cancel it, with nothing sent.
// Run: node test/layout.mjs [binary]
import { spawn } from 'node:child_process'; import path from 'node:path';
import { launch } from './browser.mjs';
const BIN = path.resolve(process.argv[2] || 'target/debug/musuh'); const port = 8268;
const srv = spawn(BIN, ['--no-open', '--port', String(port)], { cwd: '/tmp', stdio: 'ignore' });
process.on('exit', () => { try { srv.kill(); } catch {} });
const wait = (ms) => new Promise(r => setTimeout(r, ms)); await wait(700);
const b = await launch();
let fails = 0;
const sizes = [[1093, 614], [1200, 700], [1200, 701], [1279, 700], [1280, 700], [1366, 768], [1440, 900], [1920, 1080]];
for (const [w, h] of sizes) for (const pres of [false, true]) {
  const p = await b.newPage({ viewport: { width: w, height: h } }); p.on('dialog', d => d.accept());
  const label = `${w}x${h}${pres ? ' presentasi' : ''}`;
  try {
    await p.goto(`http://127.0.0.1:${port}/`); await p.click('#gsb [data-go="siapkan"]'); await p.waitForSelector('.scn');
    await p.fill('#f-nama', 'Sertu Layout'); await p.click('[data-speed="10"]'); await p.click('button[type=submit]'); await p.waitForSelector('.ops');
    if (pres) await p.click('#t-present');
    await p.waitForFunction(() => app.view && app.view.alerts.length >= 3, null, { timeout: 40000 });
    // Paused, so the frame is stable while we measure. Selecting works while paused; actions are
    // disabled in a pause by design, so unpause right before reaching the action.
    await p.click('#t-pause'); await wait(300);
    const before = await p.evaluate(() => app.view.actions.length);
    var step = 'select alert';
    await p.locator('.alert').first().click({ timeout: 4000 });
    const selected = await p.evaluate(() => app.selAlert !== null);
    step = 'unpause'; await p.click('#t-pause'); await wait(200);
    step = 'reach action';
    await p.locator('.alert[aria-selected="true"] [data-act]').first().click({ timeout: 4000 });
    const confirmVisible = await p.locator('#confirm.on').isVisible();
    step = 'cancel';
    let actRequests = 0; const onReq = (r) => { if (r.url().includes('/api/act')) actRequests++; };
    p.on('request', onReq);
    await p.locator('#confirm-no').click({ timeout: 4000 });
    await wait(300);
    p.off('request', onReq);
    const after = await p.evaluate(() => app.view.actions.length);
    const panes = await p.evaluate(() => ['.queue', '.detail', '.log', '.assets'].map(s => Math.round(document.querySelector('.ops ' + s).getBoundingClientRect().height)));
    const srvActs = await p.evaluate(async () => (await (await fetch('/api/state')).json()).actions.length);
    const ok = selected && confirmVisible && after === before && actRequests === 0 && srvActs === before && panes.every(x => x >= 80);
    if (!ok) { fails++; console.log('FAIL', label, { selected, confirmVisible, sent: after - before, actRequests, srvActs, panes }); } else console.log('ok  ', label, 'panes', panes.join('/'));
  } catch (e) { fails++; console.log('FAIL', label, 'at', typeof step === 'undefined' ? '?' : step, e.message.split('\n')[0]); }
  await p.evaluate(() => fetch('/api/control', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ paused: false, abort: true }) })).catch(() => {});
  await p.close();
}
await b.close(); srv.kill(); console.log(fails ? `FAIL ${fails}` : 'ALL OK'); process.exit(fails ? 1 : 0);
