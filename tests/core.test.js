import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  validateEntry, makeItem, ipaOf, respell, parseToken, checkSpeech,
  grade, isDue, buildQueue, addDays, daysBetween, extractWords,
  recordHistory, seedHistoryFromProg, wordHistory, computeStats,
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

test('engine IPA mapping and audio file names', async () => {
  const { engineIpa, audioPath } = await import('../public/js/core.js');
  assert.equal(engineIpa('dɪˈskʌvɚ'), 'dɪˈskʌvər');
  assert.equal(engineIpa('ˈtɝmz'), 'ˈtɜrmz');
  assert.equal(engineIpa('ˈɡreɪ'), 'ˈgreɪ');
  assert.equal(audioPath('ˈɡreɪ'), audioPath('ˈgreɪ'));
  assert.match(audioPath('ʃən'), /^audio\/[0-9a-f]+\.wav$/);
});

test('every syllable and sound has a generated audio file', async () => {
  const { allAudioIpas, audioPath } = await import('../public/js/core.js');
  const missing = allAudioIpas(words).filter(ipa => !fs.existsSync(new URL('../public/' + audioPath(ipa), import.meta.url)));
  assert.deepEqual(missing, [], '缺少音檔，請在 Windows 執行 node scripts/gen-audio.mjs');
});

test('extractWords pulls clean words from OCR text', () => {
  assert.deepEqual(
    extractWords('Alert firing, CPU 95% on host-01.prod.local\nFiring "threshold" don\'t read-only a x=1 https://x.io/a'),
    ['alert', 'firing', 'CPU', 'on', 'threshold', "don't", 'read-only']);
  assert.deepEqual(extractWords('Pending… (evaluation) — don’t'), ['pending', 'evaluation', "don't"]);
  assert.deepEqual(extractWords('[FIRING:1] Summary: latency exceeded. HighLatency KubePodCrashLooping'),
    ['FIRING', 'summary', 'latency', 'exceeded', 'high', 'kube', 'pod', 'crash', 'looping']);
  assert.deepEqual(extractWords(''), []);
  assert.deepEqual(extractWords('123 4.5 = /'), []);
});

test('daily history records reviews, replaces same-day regrade, and preserves isNew', () => {
  let h = {};
  h = recordHistory(h, 'threshold', 0, '2026-11-22', true);
  h = recordHistory(h, 'threshold', 2, '2026-11-22', false); // re-graded same day
  assert.deepEqual(h['2026-11-22'].items.threshold, { g: 2, isNew: true });
  h = recordHistory(h, 'threshold', 1, '2026-11-24', false);
  const wh = wordHistory(h, 'threshold');
  assert.deepEqual(wh, [
    { day: '2026-11-24', g: 1, isNew: false },
    { day: '2026-11-22', g: 2, isNew: true },
  ]);
});

test('seedHistoryFromProg backfills latest review dates for existing progress', () => {
  const prog = {
    a: { last: '2026-11-20', first: '2026-11-20', g: 2, n: 1 },
    b: { last: '2026-11-20', first: '2026-11-18', g: 0, n: 3 },
    c: { f: true },
  };
  const h = seedHistoryFromProg(prog);
  assert.deepEqual(h['2026-11-20'].items, {
    a: { g: 2, isNew: true },
    b: { g: 0 },
  });
});

test('computeStats calculates streaks, daily breakdowns, mastery, and 28-day window', () => {
  const items = [{ id: 'w1' }, { id: 'w2' }, { id: 'w3' }, { id: 'w4' }];
  const prog = {
    w1: { last: '2026-11-24', first: '2026-11-22', g: 2, n: 3 },
    w2: { last: '2026-11-23', first: '2026-11-23', g: 0, n: 1 },
    w4: { a: true, last: '2026-11-20', g: 2, n: 1 },
  };
  let h = {};
  h = recordHistory(h, 'w1', 1, '2026-11-18', false);
  h = recordHistory(h, 'w1', 1, '2026-11-19', false);
  h = recordHistory(h, 'w1', 1, '2026-11-20', false);
  h = recordHistory(h, 'w1', 1, '2026-11-21', false);
  h = recordHistory(h, 'w1', 1, '2026-11-23', false);
  h = recordHistory(h, 'w2', 0, '2026-11-23', true);
  h = recordHistory(h, 'w1', 2, '2026-11-24', false);

  const st = computeStats(items, prog, h, '2026-11-24');
  assert.equal(st.streak, 2);
  assert.equal(st.longestStreak, 4);
  assert.equal(st.totalDays, 6);
  assert.equal(st.totalReviews, 7);
  assert.equal(st.learnedCount, 2);
  assert.equal(st.activeCount, 3);
  assert.deepEqual(st.mastery, [1, 0, 1]);
  assert.deepEqual(st.todaySummary, { total: 1, isNew: 0, grades: [0, 0, 1] });
  assert.equal(st.recent28.length, 28);
  assert.equal(st.recent28[27].day, '2026-11-24');
  assert.equal(st.recent28[27].count, 1);

  // Streak still holds on the next day before studying today
  const nextDay = computeStats(items, prog, h, '2026-11-25');
  assert.equal(nextDay.streak, 2);
  assert.equal(nextDay.todaySummary.total, 0);
});
