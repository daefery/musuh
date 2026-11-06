// Builds the MUSUH demo video with voice-over and burned-in subtitles.
//   1. node video/capture.mjs     stills from the real program (+ element boxes)
//   2. python video/tts.py        narration per sentence (+ word timings)
//   3. node video/render.mjs      timeline -> frames (stage.html) -> MP4 + SRT
// Output: video/out/MUSUH-demo.mp4, video/out/MUSUH-demo.srt
import fs from 'node:fs'; import path from 'node:path'; import { execFileSync, spawn } from 'node:child_process';
import { launch } from '../test/browser.mjs';
import { plan as mkPlan, STEP } from './plan.mjs';
const HERE = path.dirname(new URL(import.meta.url).pathname), OUT = path.join(HERE, 'out');
const N = JSON.parse(fs.readFileSync(path.join(HERE, 'narration.json'), 'utf8'));
const VO = JSON.parse(fs.readFileSync(path.join(OUT, 'vo/index.json'), 'utf8'));
const SH = JSON.parse(fs.readFileSync(path.join(OUT, 'shots/shots.json'), 'utf8'));
const FPS = 30, LEAD = 0.5, GAP = 0.32, TAIL = { default: 0.7, masalah: 0.9, solusi: 1.0, rapor: 1.6, genset: 1.4, penutup: 2.5 };
const PL = mkPlan(SH.realScore);

// 1. Timeline: sentence start times, beats, subtitles.
let t = 0; const scenes = [], beats = [], subs = [], clips = [];
for (const sc of N.scenes) {
  const t0 = t; t += LEAD; const starts = [];
  sc.lines.forEach((line, i) => {
    const v = VO[`${sc.id}-${i}`]; starts.push(t); clips.push([`${sc.id}-${i}`, t]);
    // subtitles: split at commas/colons into chunks of <= 58 chars, timed by character share
    // whole line when it fits (<= 64 chars), else break at sentence ends, then commas/colons, then length
    // Balanced chunks of <= 64 chars: n = ceil(len/60) pieces, each break placed at the word gap
    // nearest the ideal point, preferring gaps after . , : (no one-word orphans).
    const words = line.split(' '), n = Math.ceil(line.length / 60), parts = [];
    let from = 0;
    for (let piece = 1; piece < n; piece++) {
      const target = line.length * piece / n; let best = -1, bestCost = 1e9, pos = words.slice(0, from).join(' ').length;
      for (let k = from + 1; k < words.length; k++) {
        pos += (k === from + 1 && from === 0 ? 0 : 1) + words[k - 1].length;
        const cost = Math.abs(pos - target) - (/[.!?]$/.test(words[k - 1]) ? 14 : /[,:]$/.test(words[k - 1]) ? 9 : 0);
        if (words.slice(from, k).join(' ').length <= 64 && cost < bestCost) { bestCost = cost; best = k; }
      }
      parts.push(words.slice(from, best).join(' ')); from = best;
    }
    parts.push(words.slice(from).join(' '));
    const tot = parts.reduce((a, p) => a + p.length, 0); let at = t;
    parts.forEach(p => { const d = v.d * p.length / tot; subs.push({ t0: at, t1: at + d + (p === parts.at(-1) ? 0.25 : 0), text: p }); at += d; });
    t += v.d + GAP;
  });
  t += (TAIL[sc.id] ?? TAIL.default) - GAP;
  scenes.push({ id: sc.id, title: sc.title, step: STEP[sc.id] ?? null, t0, t1: t });
  (PL[sc.id] || []).forEach((b, k) => beats.push({ ...b, scene: sc.id, t: k === 0 ? t0 : starts[b.s] + (b.o || 0) }));
}
beats.sort((a, b) => a.t - b.t);
const total = Math.ceil(t * FPS) / FPS;
const shots = Object.fromEntries(Object.entries(SH.shots).map(([k, v]) => [k, { boxes: v.boxes }]));
fs.writeFileSync(path.join(OUT, 'plan.js'), `window.PLAN=${JSON.stringify({ fps: FPS, total, scenes, beats, subs, shots, name: SH.name })};`);
const ts = (x) => new Date(x * 1000).toISOString().slice(11, 23).replace('.', ',');
fs.writeFileSync(path.join(OUT, 'MUSUH-demo.srt'), subs.map((s, i) => `${i + 1}\n${ts(s.t0)} --> ${ts(s.t1)}\n${s.text}\n`).join('\n'));
console.log('timeline', total.toFixed(1), 's,', beats.length, 'beats,', subs.length, 'subtitles');
if (process.argv.includes('--plan-only')) process.exit(0);

// 2. Audio: every sentence placed at its start time, then loudness-normalised.
const ins = clips.flatMap(([k]) => ['-i', path.join(OUT, 'vo', k + '.wav')]);
const fc = clips.map(([, at], i) => `[${i}]adelay=${Math.round(at * 1000)}:all=1[a${i}]`).join(';') + ';' + clips.map((_, i) => `[a${i}]`).join('') + `amix=inputs=${clips.length}:normalize=0:dropout_transition=0,apad=whole_dur=${total},atrim=0:${total},loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000[out]`;
execFileSync('ffmpeg', ['-v', 'error', '-y', ...ins, '-filter_complex', fc, '-map', '[out]', '-ac', '2', '-c:a', 'pcm_s16le', path.join(OUT, 'voice.wav')]);

// 3. Frames: several browser pages in parallel, each piping JPEG frames of its time range to ffmpeg.
const frames = Math.round(total * FPS), W = Number(process.env.WORKERS || 6), per = Math.ceil(frames / W);
const b = await launch();
const work = Array.from({ length: W }, (_, w) => (async () => {
  const a = w * per, z = Math.min(frames, a + per); if (a >= z) return null;
  const part = path.join(OUT, `part-${w}.mp4`);
  const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(FPS), part], { stdio: ['pipe', 'inherit', 'inherit'] });
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  await p.goto('file://' + path.join(HERE, 'stage.html')); await p.evaluate(() => window.ready());
  for (let f = a; f < z; f++) {
    await p.evaluate((x) => window.seek(x), f / FPS);
    const buf = await p.screenshot({ type: 'jpeg', quality: 92 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (w === 0 && f % 150 === 0) console.log('  frame', f, '/', z);
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r)); await p.close(); return part;
})());
const parts = (await Promise.all(work)).filter(Boolean); await b.close();
fs.writeFileSync(path.join(OUT, 'parts.txt'), parts.map(p => `file '${p}'`).join('\n'));
execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', path.join(OUT, 'parts.txt'), '-i', path.join(OUT, 'voice.wav'),
  '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', path.join(OUT, 'MUSUH-demo.mp4')]);
parts.forEach(p => fs.unlinkSync(p)); fs.unlinkSync(path.join(OUT, 'parts.txt'));
console.log('written', path.join(OUT, 'MUSUH-demo.mp4'));
process.exit(0);
