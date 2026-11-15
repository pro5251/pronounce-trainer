// Generates public/audio/*.wav for every syllable and single sound in words.json (Windows only).
// Only missing files are rendered; files no longer used are deleted.
// Usage: node scripts/gen-audio.mjs [--force]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { allAudioIpas, audioPath, engineIpa } from '../public/js/core.js';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const pub = path.join(root, 'public');
const items = JSON.parse(fs.readFileSync(path.join(pub, 'words.json'), 'utf8')).items;
const force = process.argv.includes('--force');

const wanted = new Map(allAudioIpas(items).map(ipa => [path.join(pub, audioPath(ipa)), engineIpa(ipa)]));
fs.mkdirSync(path.join(pub, 'audio'), { recursive: true });

let removed = 0;
for (const f of fs.readdirSync(path.join(pub, 'audio'))) {
  const full = path.join(pub, 'audio', f);
  if (!wanted.has(full)) { fs.unlinkSync(full); removed++; }
}
const jobs = [...wanted].filter(([out]) => force || !fs.existsSync(out)).map(([out, ipa]) => ({ ipa, out }));
console.log(`需要 ${wanted.size} 個音檔，新產生 ${jobs.length} 個，刪除 ${removed} 個不再使用的`);
if (!jobs.length) process.exit(0);

if (process.platform !== 'win32') { console.error('產生音檔需要 Windows（使用內建語音引擎）'); process.exit(1); }
const list = path.join(os.tmpdir(), `gen-audio-${process.pid}.json`);
fs.writeFileSync(list, JSON.stringify(jobs));
const r = spawnSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(root, 'scripts', 'sapi-render.ps1'), list], { stdio: 'inherit' });
fs.unlinkSync(list);
for (const { out } of jobs) if (fs.existsSync(out)) trimSilence(out);
process.exit(r.status ?? 1);

/* Cut leading/trailing near-silence from a 16-bit mono PCM WAV, keeping a short pad. */
function trimSilence(file) {
  const buf = fs.readFileSync(file);
  let off = 12, fmt = null, data = null;
  while (off + 8 <= buf.length) {
    const id = buf.toString('ascii', off, off + 4), size = buf.readUInt32LE(off + 4);
    if (id === 'fmt ') fmt = { rate: buf.readUInt32LE(off + 12), bits: buf.readUInt16LE(off + 22), ch: buf.readUInt16LE(off + 10) };
    if (id === 'data') { data = buf.subarray(off + 8, off + 8 + size); break; }
    off += 8 + size + (size & 1);
  }
  if (!fmt || !data || fmt.bits !== 16 || fmt.ch !== 1) return;
  const n = data.length >> 1, th = 400, pad = Math.round(fmt.rate * 0.04);
  let a = 0, b = n - 1;
  while (a < n && Math.abs(data.readInt16LE(a * 2)) < th) a++;
  while (b > a && Math.abs(data.readInt16LE(b * 2)) < th) b--;
  if (a >= b) return;
  a = Math.max(0, a - pad); b = Math.min(n - 1, b + pad);
  const pcm = data.subarray(a * 2, (b + 1) * 2);
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8);
  h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(fmt.rate, 24); h.writeUInt32LE(fmt.rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34);
  h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
  fs.writeFileSync(file, Buffer.concat([h, pcm]));
}
