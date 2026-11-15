// Checks public/words.json: every letter mapped once, known IPA symbols, no duplicate ids.
// Usage: node scripts/validate-words.mjs
import fs from 'node:fs';
import { validateEntry, slug } from '../public/js/core.js';

const file = new URL('../public/words.json', import.meta.url);
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
let bad = 0;
const ids = new Map();
(data.items || []).forEach((it, i) => {
  const errs = validateEntry(it);
  const id = it.id || slug(it.w || '');
  if (ids.has(id)) errs.push(`id「${id}」和第 ${ids.get(id) + 1} 筆重複`);
  ids.set(id, i);
  if (errs.length) {
    bad++;
    console.error(`✗ #${i + 1} ${it.w}`);
    for (const e of errs) console.error('    ' + e);
  }
});
const total = (data.items || []).length;
if (bad) { console.error(`\n${bad} / ${total} 筆有問題`); process.exit(1); }
console.log(`✓ ${total} 筆全部通過`);
