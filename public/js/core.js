// Pure logic shared by the browser app and the Node tests/validator. No DOM here.

export const PH = {
  'i':{t:'v',zh:'長音「ㄧ」，嘴角往兩旁拉、拉長。',ex:'see'},
  'ɪ':{t:'v',zh:'短而放鬆的「ㄧ」，介於ㄧ和ㄝ之間，不拉長。',ex:'sit'},
  'ɛ':{t:'v',zh:'「ㄝ」，嘴巴半開。',ex:'bed'},
  'æ':{t:'v',zh:'嘴巴張大、嘴角往兩旁拉的「ㄝ」，像「ㄝ＋ㄚ」混在一起。',ex:'cat'},
  'ɑ':{t:'v',zh:'「ㄚ」，嘴巴張大、舌頭放低。',ex:'hot'},
  'ʌ':{t:'v',zh:'短促有力的「ㄜ／ㄚ」之間，出現在重音節。',ex:'cup'},
  'ə':{t:'v',zh:'弱讀的「ㄜ」，又輕又短，只在非重音節（schwa，英文最常見的音）。',ex:'about'},
  'ɚ':{t:'v',zh:'弱讀的捲舌「ㄦ」，非重音節。',ex:'water'},
  'ɝ':{t:'v',zh:'重讀的捲舌「ㄦ」，比 ɚ 長而清楚。',ex:'bird'},
  'u':{t:'v',zh:'長音「ㄨ」，嘴唇圓而往前突。',ex:'food'},
  'ʊ':{t:'v',zh:'短而放鬆的「ㄨ」。',ex:'book'},
  'ɔ':{t:'v',zh:'「ㄛ」，嘴唇略圓（很多美國人讀得接近 ɑ）。',ex:'law'},
  'eɪ':{t:'v',zh:'「ㄟ」，從ㄝ滑到ㄧ。',ex:'day',kk:'e'},
  'oʊ':{t:'v',zh:'「ㄡ」，從ㄛ滑到ㄨ。',ex:'go',kk:'o'},
  'aɪ':{t:'v',zh:'「ㄞ」。',ex:'my'},
  'aʊ':{t:'v',zh:'「ㄠ」。',ex:'now'},
  'ɔɪ':{t:'v',zh:'「ㄛ＋ㄧ」。',ex:'boy'},
  'p':{t:'c',zh:'「ㄆ」，雙唇爆開，聲帶不振動。',ex:'pen'},
  'b':{t:'c',zh:'「ㄅ」，聲帶振動。',ex:'bad'},
  't':{t:'c',zh:'「ㄊ」。美式在兩個母音之間常變成輕彈的「ㄉ」（如 fatal、critical）。',ex:'ten'},
  'd':{t:'c',zh:'「ㄉ」，聲帶振動。',ex:'dog'},
  'k':{t:'c',zh:'「ㄎ」。',ex:'key'},
  'ɡ':{t:'c',zh:'「ㄍ」，聲帶振動。',ex:'go',kk:'g'},
  'f':{t:'c',zh:'「ㄈ」，上齒輕碰下唇吹氣。',ex:'fish'},
  'v':{t:'c',zh:'嘴型同 f，但聲帶振動，下唇會麻麻的。中文沒有這個音。',ex:'very'},
  'θ':{t:'c',zh:'舌尖輕放上下齒之間吹氣，聲帶不振動。不要讀成ㄙ。',ex:'think'},
  'ð':{t:'c',zh:'嘴型同 θ，但聲帶振動。',ex:'this'},
  's':{t:'c',zh:'「ㄙ」。',ex:'see'},
  'z':{t:'c',zh:'振動聲帶的ㄙ，像蜜蜂的嗡嗡聲。複數 -s 在有聲音後常讀這個音。',ex:'zoo'},
  'ʃ':{t:'c',zh:'像「ㄒ」但嘴唇噘起。-tion 的 t 就是這個音。',ex:'she'},
  'ʒ':{t:'c',zh:'嘴型同 ʃ，但聲帶振動。',ex:'vision'},
  'tʃ':{t:'c',zh:'像「ㄑ」但嘴唇噘起。',ex:'chair'},
  'dʒ':{t:'c',zh:'像「ㄐ」但嘴唇噘起、聲帶振動。',ex:'job'},
  'm':{t:'c',zh:'「ㄇ」，字尾時雙唇要閉上。',ex:'man'},
  'n':{t:'c',zh:'「ㄋ」，字尾時舌尖頂住上牙齦（前鼻音ㄣ）。',ex:'no'},
  'ŋ':{t:'c',zh:'後鼻音，像「ㄥ」的尾巴，舌根抬起，不要加出ㄍ。',ex:'sing'},
  'l':{t:'c',zh:'「ㄌ」。在字尾或子音前（health、level）舌尖頂住上牙齦，聲音偏暗，聽起來像輕輕的「ㄡ」。',ex:'leg'},
  'r':{t:'c',zh:'捲舌，舌尖不碰上顎，嘴唇微圓。',ex:'red'},
  'w':{t:'c',zh:'嘴唇圓起的「ㄨ」開頭，快速滑到下一個母音。',ex:'we'},
  'h':{t:'c',zh:'輕輕吐氣的「ㄏ」，比中文的ㄏ更輕，喉嚨不摩擦。',ex:'hat'},
  'j':{t:'c',zh:'「ㄧ」開頭，快速滑到下一個母音。',ex:'yes'},
};
const PH_KEYS = Object.keys(PH).sort((a,b)=>b.length-a.length);
export const VOWELS = new Set(Object.keys(PH).filter(k=>PH[k].t==='v'));

/* Sounds Mandarin speakers commonly merge, with minimal pairs to train the difference. */
export const CONTRASTS = [
  {a:'θ',b:'s',tip:'θ 舌尖伸到上下齒之間；s 舌尖留在牙齒後面。',pairs:[['think','sink'],['thick','sick'],['math','mass'],['path','pass']]},
  {a:'v',b:'b',tip:'v 上齒輕碰下唇、持續振動；b 雙唇閉合再爆開。',pairs:[['vest','best'],['very','berry'],['vote','boat'],['van','ban']]},
  {a:'ɪ',b:'i',tip:'ɪ 短而放鬆；i 長，嘴角拉開。',pairs:[['sit','seat'],['ship','sheep'],['fill','feel'],['live','leave']]},
  {a:'æ',b:'ɛ',tip:'æ 下巴往下、嘴巴張更大；ɛ 只半開。',pairs:[['bad','bed'],['man','men'],['sad','said'],['pan','pen']]},
  {a:'n',b:'ŋ',tip:'n 舌尖頂上牙齦；ŋ 舌根抬起，舌尖不動。',pairs:[['sin','sing'],['thin','thing'],['ban','bang'],['ran','rang']]},
  {a:'l',b:'r',tip:'l 舌尖碰上牙齦；r 舌尖不碰任何地方，往後捲。',pairs:[['light','right'],['lead','read'],['collect','correct'],['fly','fry']]},
  {a:'ʌ',b:'ɑ',tip:'ʌ 短，嘴型較小；ɑ 嘴巴張大，較長。',pairs:[['cut','cot'],['luck','lock'],['duck','dock'],['hut','hot']]},
  {a:'ʃ',b:'s',tip:'ʃ 嘴唇噘起、舌面較寬；s 嘴角平、氣流細。',pairs:[['she','see'],['shine','sign'],['ship','sip'],['shell','sell']]},
];

export function splitPh(s){
  s = String(s||'').replace(/g/g,'ɡ');
  const out=[]; let i=0;
  while(i<s.length){
    const k = PH_KEYS.find(k=>s.startsWith(k,i));
    if(k){out.push(k); i+=k.length;} else {out.push(s[i]); i++;}
  }
  return out;
}

export function slug(w){
  let s=String(w).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'word';
  if(s.length>60){let h=0;for(const c of s)h=(h*31+c.charCodeAt(0))>>>0;s=s.slice(0,50).replace(/-$/,'')+'-'+h.toString(36)}
  return s;
}

/* Token notation: syllables split by "|", segments "letters:ipa", empty ipa = silent,
   ˈ / ˌ at the start of a syllable marks primary / secondary stress. */
export function parseToken(str){
  return String(str).split('|').map(s=>{
    s=s.trim(); let stress=0;
    if(s[0]==='ˈ'){stress=1;s=s.slice(1).trim()} else if(s[0]==='ˌ'){stress=2;s=s.slice(1).trim()}
    const segs=s.split(/\s+/).filter(Boolean).map(p=>{const i=p.indexOf(':');return i<0?{l:p,p:null}:{l:p.slice(0,i),p:p.slice(i+1).replace(/g/g,'ɡ')}});
    return {stress,segs};
  });
}

export function guessKind(w){
  const t=String(w).trim();
  return t.split(/\s+/).length>=4||/[.?!,]$/.test(t)?'sentence':'word';
}

export function makeItem(raw){
  const w=String(raw.w);
  return {
    id: raw.id||slug(w), w, zh:raw.zh||'', note:raw.note||'',
    kind: raw.kind==='sentence'||raw.kind==='word'?raw.kind:guessKind(w),
    accept: Array.isArray(raw.accept)?raw.accept.map(String):[],
    tokens: raw.tokens.map(parseToken),
  };
}

export function segType(seg){
  if(!seg.p) return 's';
  return splitPh(seg.p).some(x=>VOWELS.has(x))?'v':'c';
}

export function phonemesOf(item){
  const set=new Set();
  for(const tok of item.tokens) for(const syl of tok) for(const g of syl.segs) for(const p of splitPh(g.p)) set.add(p);
  return set;
}

export function ipaOf(item,kk){
  return item.tokens.map(tok=>tok.map((syl,i)=>{
    const mark = syl.stress===1?(kk?'ˋ':'ˈ'):syl.stress===2?(kk?'ˏ':'ˌ'):(i>0&&!kk?'.':'');
    let ph = syl.segs.map(s=>s.p||'').join('');
    if(kk) ph = splitPh(ph).map(x=>PH[x]?.kk||x).join('');
    return mark+ph;
  }).join('')).join(' ');
}

/* Approximate English respelling so speech synthesis can voice a single syllable. */
const CONS={p:'p',b:'b',t:'t',d:'d',k:'k','ɡ':'g',f:'f',v:'v','θ':'th','ð':'th',s:'s',z:'z','ʃ':'sh','ʒ':'zh','tʃ':'ch','dʒ':'j',m:'m',n:'n','ŋ':'ng',l:'l',r:'r',w:'w',h:'h',j:'y'};
const VOPEN={i:'ee','ɪ':'ih','ɛ':'eh','æ':'aa','ɑ':'ah','ʌ':'uh','ə':'uh','ɚ':'er','ɝ':'er',u:'oo','ʊ':'oo','ɔ':'aw','eɪ':'ay','oʊ':'oh','aɪ':'eye','aʊ':'ow','ɔɪ':'oy'};
const VCLOSED={i:'ee','ɪ':'i','ɛ':'e','æ':'a','ɑ':'o','ʌ':'u','ə':'u','ɚ':'er','ɝ':'er',u:'oo','ʊ':'oo','ɔ':'aw','aʊ':'ow','ɔɪ':'oy'};
const VSPLIT={'eɪ':'a','oʊ':'o','aɪ':'i'};
export function respell(syl){
  const phs=splitPh(syl.segs.map(s=>s.p||'').join(''));
  const vi=phs.findIndex(x=>VOWELS.has(x));
  if(vi<0) return phs.map(x=>CONS[x]||x).join('');
  const on=phs.slice(0,vi).map(x=>CONS[x]||x).join('');
  const v=phs[vi];
  const coda=phs.slice(vi+1).map(x=>VOWELS.has(x)?VOPEN[x]:(CONS[x]||x)).join('');
  if(!coda) return on+(v==='aɪ'&&on?'y':VOPEN[v]);
  if(v==='ɑ'&&coda[0]==='r') return on+'a'+coda;
  if(VSPLIT[v]) return on+VSPLIT[v]+coda+'e';
  return on+(VCLOSED[v]||VOPEN[v])+coda;
}

/* ---------- pre-rendered audio (generated from IPA by scripts/gen-audio.mjs) ---------- */
export function syllableIpa(syl){
  return (syl.stress===1?'ˈ':syl.stress===2?'ˌ':'')+syl.segs.map(s=>s.p||'').join('');
}
/* The Windows speech engine needs plain g and has no r-colored vowel symbols. */
export function engineIpa(ipa){
  return String(ipa).replace(/ɡ/g,'g').replace(/ɚ/g,'ər').replace(/ɝ/g,'ɜr');
}
/* Content-addressed file name, so edited IPA never plays stale audio. */
export function audioPath(ipa){
  const bytes=new TextEncoder().encode(engineIpa(ipa));
  return 'audio/'+[...bytes].map(b=>b.toString(16).padStart(2,'0')).join('')+'.wav';
}
export function allAudioIpas(rawItems){
  const set=new Set(Object.keys(PH));
  for(const raw of rawItems) for(const t of raw.tokens) for(const syl of parseToken(t)) set.add(syllableIpa(syl));
  return [...set];
}

/* Returns a list of problems; empty means the entry is valid. */
export function validateEntry(raw){
  const errs=[];
  if(!raw||typeof raw.w!=='string'||!raw.w.trim()) return ['缺少 w（英文）'];
  if(typeof raw.zh!=='string'||!raw.zh.trim()) errs.push('缺少 zh（中文）');
  if(!Array.isArray(raw.tokens)||!raw.tokens.length) return errs.concat('缺少 tokens');
  const want=raw.w.toLowerCase().split(/\s+/).map(x=>x.replace(/[^a-z]/g,'')).filter(Boolean);
  if(want.length!==raw.tokens.length) errs.push(`字數 ${want.length} 和 tokens 數 ${raw.tokens.length} 不同`);
  raw.tokens.forEach((t,i)=>{
    const syls=parseToken(t);
    const letters=syls.map(s=>s.segs.map(g=>g.l).join('')).join('').toLowerCase().replace(/[^a-z]/g,'');
    if(want[i]!==undefined&&letters!==want[i]) errs.push(`第 ${i+1} 個字字母是「${letters}」，應為「${want[i]}」`);
    for(const s of syls){
      if(!s.segs.length) errs.push(`第 ${i+1} 個字有空的音節`);
      for(const g of s.segs){
        if(g.p===null) errs.push(`「${g.l}」少了冒號（不發音請寫 ${g.l}:）`);
        for(const p of splitPh(g.p)) if(!PH[p]) errs.push(`未收錄的音標「${p}」（在 ${g.l}:${g.p}）`);
      }
    }
    if(syls.filter(s=>s.stress===1).length>1) errs.push(`第 ${i+1} 個字有多個主重音`);
  });
  return errs;
}

/* ---------- speech-recognition matching ---------- */
const norm=s=>String(s).toLowerCase().replace(/[^a-z]/g,'');
const words=s=>String(s).toLowerCase().replace(/[^a-z\s']/g,' ').split(/\s+/).map(x=>x.replace(/'/g,'')).filter(Boolean);
export function checkSpeech(item, alternatives){
  const alts=(alternatives||[]).map(String).filter(Boolean);
  if(item.kind!=='sentence'){
    const targets=[item.w,...item.accept].map(norm);
    const ok=alts.some(a=>targets.includes(norm(a)));
    return {ok, heard:alts[0]||'', missing:[]};
  }
  // sentence: best alternative by share of target words heard
  const target=words(item.w); let best={ok:false,heard:alts[0]||'',missing:target};
  for(const a of alts){
    const got=new Set(words(a));
    const missing=target.filter(t=>!got.has(t));
    if(missing.length<best.missing.length) best={heard:a,missing};
  }
  best.ok = best.missing.length<=Math.floor(target.length*0.15);
  return best;
}

/* ---------- spaced repetition ---------- */
export function dayStr(d=new Date()){
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
export function addDays(day,n){
  const [y,m,d]=day.split('-').map(Number);
  return dayStr(new Date(y,m-1,d+n));
}
export function daysBetween(a,b){
  const p=s=>{const [y,m,d]=s.split('-').map(Number);return Date.UTC(y,m-1,d)};
  return Math.round((p(b)-p(a))/86400000);
}
export const GRADES=[{g:0,label:'不熟'},{g:1,label:'普通'},{g:2,label:'很熟'}];
/* Grade a review. Re-grading on the same day recomputes from the interval before today's first grade. */
export function grade(state, g, today){
  const s={...(state||{})};
  const base = s.last===today ? (s.base||0) : (s.ivl||0);
  let ivl;
  if(g===0) ivl=1;
  else if(g===1) ivl = base ? Math.max(2,Math.round(base*1.6)) : 2;
  else ivl = base ? Math.max(4,Math.round(base*2.5)) : 5;
  ivl=Math.min(ivl,180);
  if(s.last!==today){ s.n=(s.n||0)+1; if(!s.first) s.first=today; }
  Object.assign(s,{base,ivl,g,last:today,due:addDays(today,ivl)});
  return s;
}
/* Flagged items come back every day; archived never. A never-seen item is "new". */
export function isDue(s,today){
  if(!s) return true;
  if(s.a) return false;
  if(s.last===today) return false;
  if(s.f) return true;
  return !s.due||s.due<=today;
}
export function buildQueue(items, prog, today, newPerDay){
  const active=items.filter(it=>!prog[it.id]?.a);
  const done=active.filter(it=>prog[it.id]?.last===today);
  const introducedToday=active.filter(it=>prog[it.id]?.first===today).length;
  const seen=s=>!!(s&&(s.last||s.f));
  const reviews=active.filter(it=>seen(prog[it.id])&&isDue(prog[it.id],today));
  reviews.sort((x,y)=>(prog[y.id].f?1:0)-(prog[x.id].f?1:0)||(prog[x.id].due||'').localeCompare(prog[y.id].due||''));
  const fresh=active.filter(it=>!seen(prog[it.id])).slice(0,Math.max(0,newPerDay-introducedToday));
  return {queue:reviews.concat(fresh), done, active};
}
