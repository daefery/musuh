// Assembles dist/video/MUSUH-demo.mp4 from the slide stills and the screen recording (test/record.mjs),
// timing every scene to its narration in docs/VIDEO-SCRIPT.md (about 2.3 words per second plus 1.5 s air).
// Scenes shorter than their narration hold their last frame; the long genset scene is sped up.
import fs from 'node:fs'; import path from 'node:path'; import { execFileSync } from 'node:child_process';
const dir = path.resolve('dist/video');
const marks = Object.fromEntries(JSON.parse(fs.readFileSync(path.join(dir, 'scene-marks.json'), 'utf8')));
const rows = fs.readFileSync('docs/VIDEO-SCRIPT.md', 'utf8').split('\n').filter(l => /^\| \d+ \|/.test(l)).map(l => l.split('|').map(c => c.trim()));
const words = (n) => rows[n - 1][4].replace(/"/g, '').split(/\s+/).length;
const need = (n) => Math.ceil(words(n) / 2.3 + 1.5);
const scenes = [
  { n: 1, still: 'vslide-1.png' }, { n: 2, still: 'vslide-2.png' },
  { n: 3, from: 'siapkan', to: 'operasi' }, { n: 4, from: 'operasi', to: 'adaptasi' },
  { n: 5, from: 'adaptasi', to: 'serahkan' }, { n: 6, from: 'serahkan', to: 'evaluasi' },
  { n: 7, from: 'evaluasi', to: 'rapor' }, { n: 8, from: 'rapor', to: 'genset' },
  { n: 9, from: 'genset', to: 'end' }, { n: 10, still: 'vslide-10.png' },
];
const src = path.join(dir, 'MUSUH-demo-layar.mp4');
const parts = []; let t = 0; const timeline = [];
for (const s of scenes) {
  const want = need(s.n), out = path.join(dir, `part-${s.n}.mp4`);
  const enc = ['-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-r', '30', '-an', out];
  let len;
  if (s.still) { len = want; execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-loop', '1', '-t', String(len), '-i', path.join(dir, s.still), '-vf', 'scale=1920:1080,fade=in:0:12', ...enc]); }
  else {
    const a = marks[s.from], b = marks[s.to], foot = b - a;
    const speed = foot > want * 1.6 ? foot / want : 1;       // long footage: speed up to fit
    const hold = Math.max(0, want - foot / speed);          // short footage: hold the last frame
    len = foot / speed + hold;
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(a), '-t', String(foot), '-i', src, '-vf', `setpts=PTS/${speed.toFixed(3)},tpad=stop_mode=clone:stop_duration=${hold.toFixed(2)}`, ...enc]);
  }
  parts.push(out); timeline.push(`${s.n}\t${fmt(t)}-${fmt(t + len)}\t${len.toFixed(1)} s\t${words(s.n)} kata`); t += len;
}
function fmt(x) { return `${Math.floor(x / 60)}:${String(Math.round(x % 60)).padStart(2, '0')}`; }
fs.writeFileSync(path.join(dir, 'parts.txt'), parts.map(p => `file '${p}'`).join('\n'));
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(dir, 'parts.txt'), '-c', 'copy', path.join(dir, 'MUSUH-demo.mp4')]);
parts.forEach(p => fs.unlinkSync(p)); fs.unlinkSync(path.join(dir, 'parts.txt'));
fs.writeFileSync(path.join(dir, 'timeline.txt'), 'Adegan\tWaktu\tPanjang\tNarasi\n' + timeline.join('\n') + '\n');
console.log(timeline.join('\n')); console.log('total', fmt(t), '->', path.join(dir, 'MUSUH-demo.mp4'));
