import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  validateEntry, makeItem, ipaOf, respell, parseToken, checkSpeech,
  grade, isDue, buildQueue, addDays, daysBetween,
} from '../public/js/core.js';

const words = JSON.parse(fs.readFileSync(new URL('../public/words.json', import.meta.url), 'utf8')).items;

test('every entry in words.json is valid', () => {
  for (const w of words) assert.deepEqual(validateEntry(w), [], w.w);
});

test('validator catches missing letters and unknown symbols', () => {
  assert.ok(validateEntry({ w: 'cat', zh: '貓', tokens: ['ˈc:k a:æ'] }).length);
  assert.ok(validateEntry({ w: 'cat', zh: '貓', tokens: ['ˈc:k a:Q t:t'] }).some(e => e.includes('Q')));
  assert.deepEqual(validateEntry({ w: 'The cat.', zh: '那隻貓', tokens: ['th:ð e:ə', 'ˈc:k a:æ t:t'] }), []);
});

test('IPA and KK rendering', () => {
  const it = makeItem({ w: 'integration', zh: 'x', tokens: ['ˌi:ɪ n:n | t:t e:ə | ˈg:ɡ r:r a:eɪ | t:ʃ io:ə n:n'] });
  assert.equal(ipaOf(it, false), 'ˌɪn.təˈɡreɪ.ʃən');
  assert.equal(ipaOf(it, true), 'ˏɪntəˋɡreʃən'.replace('ɡ', 'g'));
});

test('respelling of syllables', () => {
  const syl = s => parseToken(s)[0];
  assert.equal(respell(syl('ˈg:ɡ r:r a:eɪ')), 'gray');
  assert.equal(respell(syl('t:ʃ io:ə n:n')), 'shun');
  assert.equal(respell(syl('ˈt:t a:ɑ r:r')), 'tar');
});

test('speech check: words ignore spacing/case, accept list, sentences tolerate one miss', () => {
  const pd = makeItem({ w: 'PagerDuty', zh: 'x', tokens: ['ˈP:p a:eɪ | g:dʒ er:ɚ | ˌD:d u:u | t:t y:i'] });
  assert.equal(checkSpeech(pd, ['pager duty']).ok, true);
  assert.equal(checkSpeech(pd, ['paper duty']).ok, false);
  const js = makeItem(words.find(w => w.w === 'JSON layout'));
  assert.equal(checkSpeech(js, ['Jason layout']).ok, true);
  const s = makeItem({ w: 'The alert has been firing for five minutes now.', zh: 'x', tokens: [] });
  s.tokens = [];
  assert.equal(checkSpeech(s, ['the alert has been firing for five minutes now']).ok, true);
  assert.equal(checkSpeech(s, ['the alert has been firing for minutes now']).ok, true);
  const r = checkSpeech(s, ['the alert firing minutes']);
  assert.equal(r.ok, false);
  assert.deepEqual(r.missing, ['has', 'been', 'for', 'five', 'now']);
});

test('spaced repetition intervals grow and same-day regrade replaces', () => {
  const d0 = '2026-11-15';
  let s = grade(undefined, 1, d0);
  assert.equal(s.ivl, 2); assert.equal(s.due, '2026-11-17'); assert.equal(s.first, d0);
  s = grade(s, 2, d0);                       // changed mind the same day
  assert.equal(s.ivl, 5); assert.equal(s.n, 1);
  s = grade(s, 2, s.due);
  assert.equal(s.ivl, 13);
  s = grade(s, 0, s.due);
  assert.equal(s.ivl, 1);
  assert.equal(daysBetween('2026-12-30', addDays('2026-12-30', 3)), 3);
});

test('due rules: flagged daily, archived never, done today not due', () => {
  const t = '2026-11-15';
  assert.equal(isDue(undefined, t), true);
  assert.equal(isDue({ due: '2026-11-20', last: '2026-11-10' }, t), false);
  assert.equal(isDue({ due: '2026-11-20', last: '2026-11-14', f: true }, t), true);
  assert.equal(isDue({ due: '2026-11-01', a: true }, t), false);
  assert.equal(isDue({ due: '2026-11-01', last: t }, t), false);
});

test('queue limits new items per day and puts flagged first', () => {
  const t = '2026-11-15';
  const items = Array.from({ length: 20 }, (_, i) => ({ id: 'w' + i }));
  const prog = { w5: { last: '2026-11-10', due: '2026-11-12' }, w6: { last: '2026-11-14', due: '2026-11-20', f: true }, w7: { a: true } };
  const { queue, active } = buildQueue(items, prog, t, 3);
  assert.equal(active.length, 19);
  assert.deepEqual(queue.map(x => x.id), ['w6', 'w5', 'w0', 'w1', 'w2']);
});
