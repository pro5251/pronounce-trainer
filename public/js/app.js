import * as C from './core.js';

/* ---------- persistent state (this browser) ---------- */
const KEY = 'pronounce-trainer-v1';
const store = (() => {
  let s = {};
  try { s = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { s = {}; }
  return { prog: s.prog || {}, settings: { newPerDay: 10, rate: 0.9, ...(s.settings || {}) } };
})();
function save() { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) {} }
const prog = store.prog;
const P = id => prog[id] || {};
function setProg(id, next) {
  const clean = Object.fromEntries(Object.entries(next).filter(([, v]) => v !== undefined && v !== null && v !== false));
  if (Object.keys(clean).length) prog[id] = clean; else delete prog[id];
  save();
}

let items = [];
let current = null, selSeg = null, filter = 'today';
let today = C.dayStr();
const $ = id => document.getElementById(id);

/* ---------- dom helper ---------- */
const put = (node, ...kids) => node.replaceChildren(...kids.flat(Infinity).filter(k => k != null && k !== false));
function el(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === 'class') e.className = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) e.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat()) if (k != null && k !== false) e.append(k.nodeType ? k : document.createTextNode(String(k)));
  return e;
}

/* ---------- speech synthesis ---------- */
const synth = window.speechSynthesis;
let voice = null;
function pickVoice() {
  if (!synth) return;
  const all = synth.getVoices();
  const us = all.filter(v => /^en[-_]US/i.test(v.lang));
  const pref = ['Google US English', 'Microsoft Aria', 'Microsoft Jenny', 'Samantha', 'Microsoft Zira'];
  voice = pref.map(p => us.find(v => v.name.includes(p))).find(Boolean) || us[0] || all.find(v => /^en/i.test(v.lang)) || null;
}
if (synth) { pickVoice(); synth.onvoiceschanged = pickVoice; }
let clip = null;
function stopAll() { if (clip) { clip.onended = clip.onerror = null; clip.pause(); clip = null; } if (synth) synth.cancel(); }
function speak(text, rate, onend) {
  if (!synth) return;
  stopAll();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US'; if (voice) u.voice = voice;
  u.rate = rate ?? store.settings.rate;
  if (onend) { u.onend = onend; u.onerror = onend; }
  synth.speak(u);
}
/* Play a pre-rendered IPA clip (audio/*.wav); fall back to browser speech of `fallback` if it is missing. */
function playIpa(ipa, fallback, onend) {
  stopAll();
  const a = new Audio(C.audioPath(ipa)); clip = a;
  let done = false;
  const finish = ok => { if (done) return; done = true; if (clip === a) clip = null; if (ok) onend && onend(); else speak(fallback, 0.7, onend); };
  a.onended = () => finish(true);
  a.onerror = () => finish(false);
  a.play().catch(() => finish(false));
}
const playSyl = (syl, onend) => playIpa(C.syllableIpa(syl), C.respell(syl), onend);
const playSound = (ph, then) => playIpa(ph, C.PH[ph]?.ex || ph, then);

/* ---------- speech recognition + recording ---------- */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let recog = null, practice = { id: null, result: null, audioUrl: null, recording: false };
function listen() {
  if (!SR || !current) return;
  if (recog) { recog.abort(); return; }
  const item = current;
  const r = new SR();
  r.lang = 'en-US'; r.interimResults = false; r.maxAlternatives = 5; r.continuous = false;
  recog = r; renderHead();
  r.onresult = e => {
    const alts = [...e.results[0]].map(a => a.transcript);
    const res = C.checkSpeech(item, alts);
    practice = { ...practice, id: item.id, result: res };
    if (res.ok && P(item.id).last !== today) applyGrade(item.id, 1, false);
  };
  r.onerror = e => {
    const msg = { 'not-allowed': '麥克風權限被拒絕，請在網址列的權限設定允許麥克風。', 'no-speech': '沒有聽到聲音，請靠近麥克風再試一次。', 'network': '語音辨識需要網路連線。', 'audio-capture': '找不到麥克風。' };
    practice = { ...practice, id: item.id, result: { error: msg[e.error] || ('辨識失敗：' + e.error) } };
  };
  r.onend = () => { recog = null; if (current && current.id === item.id) renderHead(); renderList(); };
  try { r.start(); } catch (e) { recog = null; renderHead(); }
}

let recorder = null;
async function toggleRecord() {
  if (recorder) { recorder.stop(); return; }
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) return;
  const item = current;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const chunks = [];
    recorder = new MediaRecorder(stream);
    recorder.ondataavailable = e => e.data.size && chunks.push(e.data);
    recorder.onstop = () => {
      stream.getTracks().forEach(t => t.stop());
      if (practice.audioUrl) URL.revokeObjectURL(practice.audioUrl);
      practice = { ...practice, id: item.id, audioUrl: URL.createObjectURL(new Blob(chunks, { type: recorder.mimeType })) };
      recorder = null; renderHead();
    };
    recorder.start();
    setTimeout(() => recorder && recorder.state === 'recording' && recorder.stop(), item.kind === 'sentence' ? 12000 : 5000);
    renderHead();
  } catch (e) {
    recorder = null;
    practice = { ...practice, id: item.id, result: { error: '無法使用麥克風錄音：' + (e.message || e.name) } };
    renderHead();
  }
}

/* ---------- review ---------- */
function applyGrade(id, g, advance) {
  setProg(id, C.grade(prog[id], g, today));
  renderList(); if (current && current.id === id) renderHead();
  if (advance && filter === 'today') setTimeout(goNext, 350);
}
function queueInfo() { return C.buildQueue(items, prog, today, store.settings.newPerDay); }
function goNext() {
  const { queue } = queueInfo();
  const pick = queue.find(w => !current || w.id !== current.id) || queue[0];
  if (pick) select(pick.id);
  else { $('todayTxt').textContent = '今天的都複習完了！'; }
}
function dueLabel(s) {
  if (!s || !s.last) return s?.f ? '' : '新';
  if (s.a) return '';
  if (s.f) return '';
  const d = C.daysBetween(today, s.due || today);
  return d <= 0 ? '到期' : d + ' 天後';
}

/* ---------- render: list + today ---------- */
function renderList() {
  const q = $('q').value.trim().toLowerCase();
  const { queue, done, active } = queueInfo();
  const qIds = new Set(queue.map(w => w.id));
  let list = items.filter(w => {
    const p = P(w.id);
    if (q && !(w.w.toLowerCase().includes(q) || w.zh.includes(q))) return false;
    if (filter === 'arch') return !!p.a;
    if (p.a) return false;
    if (filter === 'today') return qIds.has(w.id) || p.last === today;
    if (filter === 'flag') return !!p.f;
    if (filter === 'sentence') return w.kind === 'sentence';
    return true;
  });
  if (filter === 'today') {
    const order = new Map(queue.map((w, i) => [w.id, i]));
    list.sort((a, b) => (order.has(a.id) ? order.get(a.id) : 1e6) - (order.has(b.id) ? order.get(b.id) : 1e6));
  }
  const box = $('list'); put(box, );
  for (const w of list) {
    const p = P(w.id), rt = p.last === today;
    box.append(el('button', { class: 'item' + (p.a ? ' arch' : ''), role: 'listitem', 'aria-current': current && current.id === w.id ? 'true' : 'false', onclick: () => select(w.id) },
      el('span', { class: 'left' },
        el('span', { class: 'light' + (rt ? ' on' : ''), title: rt ? '今天已複習' : '今天還沒複習', 'aria-label': rt ? '今天已複習' : '今天還沒複習' }),
        p.f ? el('span', { class: 'flag', title: '需留意' }, '★') : null,
        el('span', { class: 'en' }, w.w),
        w.kind === 'sentence' ? el('span', { class: 'tag' }, '句') : null),
      el('span', { class: 'due' }, rt ? '' : dueLabel(p))));
  }
  const empty = { today: '今天的都複習完了！', flag: '還沒有標記需留意的項目。', arch: '沒有封存的項目。', sentence: '還沒有句子。在 words.json 加入句子即可。' };
  if (!list.length) box.append(el('div', { class: 'status' }, q ? '找不到符合的項目。' : (empty[filter] || '找不到符合的項目。')));
  $('count').textContent = '· ' + items.length + ' 個';
  const total = done.length + queue.length;
  $('todayBar').style.width = (total ? done.length / total * 100 : 100) + '%';
  $('todayTxt').textContent = queue.length ? `已完成 ${done.length}，還有 ${queue.length} 個到期` : `今天完成 ${done.length} 個，全部複習完了！`;
}

/* ---------- render: head ---------- */
function renderHead() {
  const w = current, head = $('head'); if (!w) return;
  const p = P(w.id), rt = p.last === today;
  const pr = practice.id === w.id ? practice : {};
  const controls = el('div', { class: 'controls' },
    el('button', { class: 'btn primary', type: 'button', onclick: () => speak(w.w) }, '▶ 播放'),
    el('button', { class: 'btn', type: 'button', onclick: () => speak(w.w, 0.5) }, '慢速'),
    el('button', { class: 'btn', type: 'button', onclick: playSyllables }, '逐音節'),
    el('label', { class: 'rate', for: 'rate' }, '語速',
      el('input', { type: 'range', id: 'rate', min: '0.5', max: '1.2', step: '0.05', value: String(store.settings.rate), oninput: e => { store.settings.rate = parseFloat(e.target.value); save(); } })));

  const prRow = el('div', { class: 'practice' }, el('span', { class: 'lbl' }, '練習'));
  if (SR) prRow.append(el('button', { class: 'btn' + (recog ? ' listening' : ''), type: 'button', onclick: listen }, recog ? '● 聆聽中…（點一下停止）' : '🎤 念念看'));
  if (navigator.mediaDevices?.getUserMedia && window.MediaRecorder)
    prRow.append(el('button', { class: 'btn' + (recorder ? ' listening' : ''), type: 'button', onclick: toggleRecord }, recorder ? '■ 停止錄音' : '錄音對照'));
  if (pr.audioUrl) prRow.append(el('audio', { controls: true, src: pr.audioUrl }), el('button', { class: 'btn', type: 'button', onclick: () => speak(w.w) }, '▶ 範例'));
  if (!SR) prRow.append(el('span', { class: 'hint', style: 'margin:0' }, '念念看需要 Chrome 或 Edge（Safari 也可）。'));
  if (pr.result) {
    const r = pr.result;
    if (r.error) prRow.append(el('p', { class: 'result bad' }, r.error));
    else if (r.ok) prRow.append(el('p', { class: 'result ok' }, `念對了！辨識結果：「${r.heard}」。` + (P(w.id).g === 1 && rt ? '已記為「普通」，覺得很熟可以改選。' : '')));
    else prRow.append(el('p', { class: 'result bad' }, `辨識成「${r.heard || '（沒聽清楚）'}」。`,
      r.missing.length && w.kind === 'sentence' ? ['沒聽到：', ...r.missing.flatMap((m, i) => [i ? '、' : '', el('span', { class: 'miss' }, m)])] : '先按「逐音節」聽，再念一次。'));
  }

  const grades = el('div', { class: 'grades' }, el('span', { class: 'lbl' }, rt ? '今天已複習，可改選：' : '這次感覺'),
    C.GRADES.map(({ g, label }) => {
      const preview = C.grade(prog[w.id], g, today).ivl;
      return el('button', { class: 'btn' + (rt && p.g === g ? ' chosen' : ''), type: 'button', onclick: () => applyGrade(w.id, g, !rt) },
        label, el('small', {}, preview + ' 天後'));
    }),
    el('button', { class: 'btn' + (p.f ? ' flagged' : ''), type: 'button', 'aria-pressed': p.f ? 'true' : 'false', onclick: () => { setProg(w.id, { ...p, f: !p.f }); renderList(); renderHead(); } }, p.f ? '★ 需留意' : '☆ 需留意'),
    el('button', { class: 'btn', type: 'button', onclick: () => { setProg(w.id, { ...p, a: !p.a }); renderList(); renderHead(); } }, p.a ? '取消封存' : '封存'),
    el('button', { class: 'btn', type: 'button', onclick: goNext }, '下一個 →'));

  put(head, 
    p.a ? el('p', { class: 'banner' }, '已封存：不列入每日複習，也不會出現在一般清單。') : null,
    el('p', { class: 'word' + (w.kind === 'sentence' ? ' sentence' : '') }, w.w),
    el('p', { class: 'meaning' }, w.zh),
    el('div', { class: 'trans' },
      el('span', {}, el('b', {}, 'IPA'), '/' + C.ipaOf(w, false) + '/'),
      el('span', {}, el('b', {}, 'KK'), '[' + C.ipaOf(w, true) + ']')),
    w.note ? el('p', { class: 'note' }, w.note) : null,
    controls, prRow, grades,
    synth ? null : el('p', { class: 'warn', style: 'margin-top:10px' }, '這個瀏覽器不支援語音合成，請改用 Chrome 或 Edge 開啟。'));
}

/* ---------- render: syllables + phoneme detail ---------- */
function renderTokens() {
  const box = $('tokens'); put(box, );
  current.tokens.forEach((tok, ti) => {
    const sylEls = tok.map((syl, si) => {
      const segs = syl.segs.map((seg, gi) => {
        const t = C.segType(seg), on = selSeg && selSeg.ti === ti && selSeg.si === si && selSeg.gi === gi;
        return el('button', { class: 'seg ' + t + (on ? ' on' : ''), type: 'button', title: seg.p ? `${seg.l} → /${seg.p}/` : `${seg.l} 不發音`,
          onclick: () => { selSeg = { ti, si, gi }; renderTokens(); renderDetail(true); } },
          el('span', { class: 'lt' }, seg.l), el('span', { class: 'ph' }, seg.p || '不發音'));
      });
      return el('div', { class: 'syl' + (syl.stress ? ' stress' + syl.stress : ''), 'data-k': ti + '-' + si },
        el('div', { class: 'sylhead' },
          el('span', {}, syl.stress === 1 ? '重音' : syl.stress === 2 ? '次重音' : '第 ' + (si + 1) + ' 音節'),
          el('button', { type: 'button', title: '聽這個音節', onclick: () => playSyl(syl) }, '▶')),
        el('div', { class: 'segs' }, segs));
    });
    box.append(el('div', { class: 'token' },
      el('span', { class: 'tokname' }, tok.map(s => s.segs.map(g => g.l).join('')).join(' · ') + '　' + tok.length + ' 個音節'),
      el('div', { class: 'syls' }, sylEls)));
  });
}

function sameSoundChips(ph) {
  const others = items.filter(w => w.id !== current.id && !P(w.id).a && C.phonemesOf(w).has(ph)).slice(0, 14);
  if (!others.length) return null;
  return el('div', {}, el('p', { class: 'sub2' }, `詞庫裡也有 /${ph}/ 的：`),
    el('div', { class: 'chips' }, others.map(w => el('button', { class: 'chip', type: 'button', onclick: () => select(w.id) }, w.w))));
}
function contrastBlock(ph) {
  const g = C.CONTRASTS.find(c => c.a === ph || c.b === ph); if (!g) return null;
  return el('div', {}, el('p', { class: 'sub2' }, `容易和 /${g.a === ph ? g.b : g.a}/ 搞混：${g.tip}`),
    el('div', { class: 'pairrow' }, g.pairs.slice(0, 3).flatMap(([a, b]) => [
      el('button', { class: 'chip', type: 'button', onclick: () => speak(a, 0.75) }, '▶ ' + a),
      el('span', { class: 'vs' }, 'vs'),
      el('button', { class: 'chip', type: 'button', onclick: () => speak(b, 0.75) }, '▶ ' + b)])));
}

function renderDetail(play) {
  const d = $('detail');
  if (!selSeg) { put(d, el('p', { class: 'hint', style: 'margin:0' }, '點上方任一個字母欄，這裡會說明那個音的發音方式。')); return; }
  const syl = current.tokens[selSeg.ti][selSeg.si], seg = syl.segs[selSeg.gi], t = C.segType(seg);
  if (!seg.p) {
    put(d, el('div', { class: 'detail' }, el('div', { class: 'bigph s' }, '不發音'),
      el('div', {}, el('p', { style: 'margin:0;font-size:1.05rem' }, `字母「${seg.l}」在這裡不發音。`),
        el('p', { class: 'hint' }, '常見的不發音字母：字尾的 e（write、date）、wr 開頭的 w（write）。'))));
    return;
  }
  const parts = C.splitPh(seg.p);
  const rows = parts.map(p => {
    const info = C.PH[p] || { zh: '（未收錄的符號）', ex: '' };
    return el('div', { class: 'phrow' },
      el('span', { class: 'sym' }, '/' + p + '/'),
      el('span', { class: 'kk' }, 'KK [' + (info.kk || p) + ']'),
      el('p', {}, info.zh),
      el('button', { class: 'btn', type: 'button', onclick: () => playSound(p) }, '▶ 單音'),
      info.ex ? el('button', { class: 'btn', type: 'button', onclick: () => speak(info.ex, 0.75) }, '▶ 例字 ' + info.ex) : null);
  });
  put(d, el('div', { class: 'detail' },
    el('div', { class: 'bigph ' + t }, seg.p),
    el('div', {},
      el('p', { style: 'margin:0 0 10px;font-size:1.05rem' }, `字母「${seg.l}」→ 讀 /${seg.p}/`, parts.length > 1 ? `（由 ${parts.map(p => '/' + p + '/').join(' + ')} 組成）` : ''),
      rows,
      parts.map(contrastBlock),
      sameSoundChips(parts[parts.length - 1]),
      el('div', { class: 'controls', style: 'margin-top:12px' },
        el('button', { class: 'btn', type: 'button', onclick: () => playSyl(syl) }, '▶ 所在音節「' + syl.segs.map(g => g.l).join('') + '」'),
        el('button', { class: 'btn', type: 'button', onclick: () => speak(current.w, 0.6) }, '▶ 整個（慢）')))));
  if (play) { const ex = C.PH[parts[0]]?.ex; playSound(parts[0], ex ? () => setTimeout(() => speak(ex, 0.75), 300) : null); }
}

function playSyllables() {
  const seq = []; current.tokens.forEach((tok, ti) => tok.forEach((syl, si) => seq.push({ k: ti + '-' + si, syl })));
  let i = 0;
  const step = () => {
    document.querySelectorAll('.syl.playing').forEach(e => e.classList.remove('playing'));
    if (i >= seq.length) { setTimeout(() => speak(current.w, 0.8), 250); return; }
    const it = seq[i++]; document.querySelector(`.syl[data-k="${it.k}"]`)?.classList.add('playing');
    playSyl(it.syl, () => setTimeout(step, 280));
  };
  step();
}

/* ---------- listening quiz ---------- */
let quiz = null, quizScore = { right: 0, total: 0 };
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
function newQuiz() {
  const pool = items.filter(w => !P(w.id).a);
  if (pool.length < 4) { quiz = null; renderQuiz(); return; }
  const { queue } = queueInfo();
  const src = queue.length && Math.random() < 0.7 ? queue : pool;
  const target = src[Math.floor(Math.random() * src.length)];
  const same = shuffle(pool.filter(w => w.id !== target.id && w.kind === target.kind));
  const distract = (same.length >= 3 ? same : shuffle(pool.filter(w => w.id !== target.id))).slice(0, 3);
  quiz = { target, options: shuffle([target, ...distract]), picked: null };
  renderQuiz(); speak(target.w);
}
function renderQuiz() {
  const box = $('quiz');
  if (!quiz) {
    put(box, el('p', { class: 'hint', style: 'margin:0 0 10px' }, '只聽聲音、不看字，選出聽到的是哪一個。優先出今天到期的項目。'),
      el('button', { class: 'btn primary', type: 'button', onclick: newQuiz }, '開始出題'),
      quizScore.total ? el('span', { class: 'hint', style: 'margin-left:10px' }, `本次 ${quizScore.right} / ${quizScore.total}`) : null);
    return;
  }
  const { target, options, picked } = quiz;
  put(box, 
    el('div', { class: 'controls', style: 'margin:0' },
      el('button', { class: 'btn primary', type: 'button', onclick: () => speak(target.w) }, '▶ 再聽一次'),
      el('button', { class: 'btn', type: 'button', onclick: () => speak(target.w, 0.55) }, '慢速'),
      el('span', { class: 'hint', style: 'margin:0' }, `本次 ${quizScore.right} / ${quizScore.total}`)),
    el('div', { class: 'opts' }, options.map(o => el('button', {
      class: 'opt' + (picked ? (o.id === target.id ? ' right' : o.id === picked ? ' wrong' : '') : ''), type: 'button', disabled: picked ? true : null,
      onclick: () => { quiz.picked = o.id; quizScore.total++; if (o.id === target.id) quizScore.right++; renderQuiz(); },
    }, el('b', {}, o.w), picked ? el('span', {}, o.zh) : null))),
    picked ? el('div', { class: 'controls' },
      el('p', { class: 'result ' + (picked === target.id ? 'ok' : 'bad'), style: 'margin:0' }, picked === target.id ? '答對了！' : `答案是「${target.w}」。`),
      el('button', { class: 'btn primary', type: 'button', onclick: newQuiz }, '下一題'),
      el('button', { class: 'btn', type: 'button', onclick: () => select(target.id) }, '看「' + target.w + '」的拆解'),
      picked !== target.id && !P(target.id).f ? el('button', { class: 'btn', type: 'button', onclick: () => { setProg(target.id, { ...P(target.id), f: true }); renderList(); renderQuiz(); if (current?.id === target.id) renderHead(); } }, '☆ 標記需留意') : null) : null);
}

/* ---------- minimal-pair trainer ---------- */
let pairSel = 0, pairQ = null, pairScore = { right: 0, total: 0 };
function renderPairs() {
  const g = C.CONTRASTS[pairSel];
  const box = $('pairs');
  put(box, 
    el('div', { class: 'chips', style: 'margin:0' }, C.CONTRASTS.map((c, i) => el('button', {
      class: 'chip', type: 'button', 'aria-pressed': i === pairSel ? 'true' : 'false',
      onclick: () => { pairSel = i; pairQ = null; pairScore = { right: 0, total: 0 }; renderPairs(); },
    }, `/${c.a}/ vs /${c.b}/`))),
    el('p', { class: 'note' }, g.tip),
    g.pairs.map(([a, b]) => el('div', { class: 'pairrow' },
      el('button', { class: 'chip', type: 'button', onclick: () => speak(a, 0.75) }, '▶ ' + a),
      el('span', { class: 'vs' }, `/${g.a}/ vs /${g.b}/`),
      el('button', { class: 'chip', type: 'button', onclick: () => speak(b, 0.75) }, '▶ ' + b))),
    el('p', { class: 'sub2' }, '考考我：播放其中一個，選出你聽到的。'),
    pairQ ? el('div', { class: 'pairrow' },
      el('button', { class: 'btn', type: 'button', onclick: () => speak(pairQ.ans, 0.75) }, '▶ 再聽'),
      pairQ.pair.map(x => el('button', {
        class: 'opt' + (pairQ.picked ? (x === pairQ.ans ? ' right' : x === pairQ.picked ? ' wrong' : '') : ''), type: 'button', disabled: pairQ.picked ? true : null,
        onclick: () => { pairQ.picked = x; pairScore.total++; if (x === pairQ.ans) pairScore.right++; renderPairs(); },
      }, el('b', {}, x))),
      pairQ.picked ? el('button', { class: 'btn primary', type: 'button', onclick: nextPair }, '下一題') : null,
      el('span', { class: 'hint', style: 'margin:0' }, `${pairScore.right} / ${pairScore.total}`))
      : el('button', { class: 'btn primary', type: 'button', onclick: nextPair, style: 'margin-top:8px' }, '開始'));
}
function nextPair() {
  const g = C.CONTRASTS[pairSel];
  const pair = g.pairs[Math.floor(Math.random() * g.pairs.length)];
  pairQ = { pair, ans: pair[Math.random() < 0.5 ? 0 : 1], picked: null };
  renderPairs(); speak(pairQ.ans, 0.75);
}

/* ---------- chart ---------- */
function renderChart() {
  const c = $('chart'); put(c, );
  for (const [k, v] of Object.entries(C.PH)) c.append(el('button', { class: 'pc ' + v.t, type: 'button', onclick: () => playSound(k, () => setTimeout(() => speak(v.ex, 0.75), 300)) },
    el('span', { class: 'sym' }, '/' + k + '/' + (v.kk ? '  KK [' + v.kk + ']' : '')),
    el('span', { class: 'ex' }, '▶ 單音＋' + v.ex),
    el('small', {}, v.zh)));
}

/* ---------- selection & wiring ---------- */
function select(id) {
  const w = items.find(x => x.id === id) || items[0]; if (!w) return;
  if (recog) recog.abort();
  current = w; selSeg = null;
  if (practice.id !== w.id) practice = { id: null, result: null, audioUrl: null };
  for (let ti = 0; ti < w.tokens.length && !selSeg; ti++) for (let si = 0; si < w.tokens[ti].length && !selSeg; si++) {
    if (w.tokens[ti][si].stress === 1) { const gi = w.tokens[ti][si].segs.findIndex(s => C.segType(s) === 'v'); if (gi >= 0) selSeg = { ti, si, gi }; }
  }
  if (location.hash !== '#' + w.id) history.replaceState(null, '', '#' + w.id);
  renderList(); renderHead(); renderTokens(); renderDetail(false);
}

$('q').addEventListener('input', renderList);
$('filters').addEventListener('click', e => {
  const b = e.target.closest('button[data-f]'); if (!b) return;
  filter = b.dataset.f;
  document.querySelectorAll('#filters button').forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
  renderList();
});
$('nextBtn').addEventListener('click', goNext);
window.addEventListener('hashchange', () => { const id = decodeURIComponent(location.hash.slice(1)); if (id && (!current || current.id !== id)) select(id); });
function checkDay() { const t = C.dayStr(); if (t !== today) { today = t; renderList(); if (current) renderHead(); } }
setInterval(checkDay, 60000);
document.addEventListener('visibilitychange', checkDay);

const npd = $('newPerDay');
npd.value = store.settings.newPerDay;
npd.addEventListener('change', () => { const n = Math.max(0, Math.min(100, parseInt(npd.value, 10) || 0)); npd.value = n; store.settings.newPerDay = n; save(); renderList(); });
$('exportBtn').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify({ app: 'pronounce-trainer', exported: new Date().toISOString(), ...store }, null, 1)], { type: 'application/json' });
  const a = el('a', { href: URL.createObjectURL(blob), download: `pronounce-progress-${today}.json` });
  document.body.append(a); a.click(); a.remove();
  $('setStatus').textContent = '已下載進度檔。';
});
$('importFile').addEventListener('change', async e => {
  const f = e.target.files[0]; if (!f) return;
  try {
    const data = JSON.parse(await f.text());
    if (!data || typeof data.prog !== 'object') throw new Error('不是這個網站匯出的進度檔');
    for (const k of Object.keys(prog)) delete prog[k];
    Object.assign(prog, data.prog);
    if (data.settings) Object.assign(store.settings, data.settings);
    save(); npd.value = store.settings.newPerDay;
    $('setStatus').textContent = `已匯入 ${Object.keys(prog).length} 筆進度。`;
    renderList(); if (current) renderHead();
  } catch (err) { $('setStatus').textContent = '匯入失敗：' + err.message; }
  e.target.value = '';
});

/* ---------- boot ---------- */
(async () => {
  try {
    const res = await fetch('words.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    items = data.items.map(C.makeItem);
  } catch (e) {
    $('head').replaceChildren(el('p', { class: 'warn' }, '讀不到 words.json（' + e.message + '）。請用網站伺服器開啟，不要直接雙擊 HTML 檔，例如執行 npm run dev。'));
    return;
  }
  renderChart(); renderQuiz(); renderPairs();
  const hid = decodeURIComponent(location.hash.slice(1));
  if (hid && items.some(w => w.id === hid)) select(hid);
  else { const { queue } = queueInfo(); select((queue[0] || items[0]).id); }
})();
