// Prints a JSON array of the `w` values present in the new words.json but not the old one.
// Usage: node scripts/diff-words.mjs <old.json> <new.json>
import fs from 'node:fs';
import { slug } from '../public/js/core.js';

const [oldFile, newFile] = process.argv.slice(2);
const ids = f => new Map(JSON.parse(fs.readFileSync(f, 'utf8')).items.map(it => [it.id || slug(it.w), it.w]));
const before = ids(oldFile), after = ids(newFile);
console.log(JSON.stringify([...after].filter(([id]) => !before.has(id)).map(([, w]) => w)));
