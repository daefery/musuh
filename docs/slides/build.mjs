// Joins part*.html into slides.html, prints MUSUH-slides.pdf (1920x1080 pages) and a PNG per slide for review.
//   node docs/slides/build.mjs        (from the musuh folder; needs Chrome + test/node_modules)
import fs from 'node:fs'; import path from 'node:path';
import { launch } from '../../test/browser.mjs';
const here = path.dirname(new URL(import.meta.url).pathname);
const parts = fs.readdirSync(here).filter(f => /^part\d+\.html$/.test(f)).sort().map(f => fs.readFileSync(path.join(here, f), 'utf8')).join('\n');
fs.writeFileSync(path.join(here, 'slides.html'), `<!doctype html><html lang="id"><head><meta charset="utf-8"><title>MUSUH · slide</title><link rel="stylesheet" href="style.css"></head><body>\n${parts}\n</body></html>\n`);
const b = await launch(); const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
await p.goto('file://' + path.join(here, 'slides.html')); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
// Flag anything that overflows its slide (text or image running past the bottom).
const over = await p.evaluate(() => [...document.querySelectorAll('.slide')].map((s, i) => { const r = s.getBoundingClientRect(); const bad = [...s.querySelectorAll('*')].filter(e => { const q = e.getBoundingClientRect(); return q.height > 0 && q.bottom > r.bottom - 60 && !e.closest('.foot'); }); return bad.length ? `${i + 1}: ${bad.slice(0, 3).map(e => e.tagName + (e.className ? '.' + e.className : '')).join(', ')}` : null; }).filter(Boolean));
if (over.length) console.warn('OVERFLOW near bottom:', over.join(' | '));
await p.pdf({ path: path.join(here, 'MUSUH-slides.pdf'), width: '1920px', height: '1080px', printBackground: true });
const n = await p.locator('.slide').count();
for (let i = 0; i < n; i++) await p.locator('.slide').nth(i).screenshot({ path: `/tmp/slide-${i + 1}.png` });
await b.close(); console.log('pdf ok,', n, 'slides; previews /tmp/slide-N.png');
