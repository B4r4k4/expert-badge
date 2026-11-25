// Validates English content files against their Arabic originals (see content/EN_SPEC.md).
// Usage: node tools/check-en.js [relative paths under content/, e.g. units/02.json beginner/02.json]
//        (no args = every file that has an English version)
// Exit code 1 if any ERROR. WARN lines must be reviewed but do not fail.
const fs = require('fs'), path = require('path');
const SRC = path.join(__dirname, '..', 'content');
const EN = path.join(SRC, 'en');

const AR = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/;
const AR_PUNCT = /[«»،؛؟٪]/;
const toLatin = s => s.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/٫/g, '.').replace(/٬/g, ',');
const nums = s => (toLatin(s).match(/\d+(?:[.,]\d+)*/g) || []).map(n => n.replace(/,/g, ''));
const urls = s => s.match(/https?:\/\/[^\s)]+/g) || [];
const bolds = s => (s.match(/\*\*/g) || []).length;
// Arabic quoted as an example inside English text must be wrapped: [[ar:والمستشفيات]] (the build renders it RTL)
const stripAr = s => s.replace(/\[\[ar:[^\]]*\]\]/g, '');

let errors = 0, warns = 0;
const err = (f, p, m) => { errors++; console.log(`ERROR ${f} ${p}: ${m}`); };
const warn = (f, p, m) => { warns++; console.log(`WARN  ${f} ${p}: ${m}`); };

function cmp(f, a, e, p){
  const ta = Array.isArray(a) ? 'array' : typeof a, te = Array.isArray(e) ? 'array' : typeof e;
  if (ta !== te) return err(f, p, `type ${te}, expected ${ta}`);
  if (ta === 'array'){
    if (a.length !== e.length) err(f, p, `length ${e.length}, expected ${a.length}`);
    for (let i = 0; i < Math.min(a.length, e.length); i++) cmp(f, a[i], e[i], `${p}[${i}]`);
    return;
  }
  if (ta === 'object' && a !== null){
    const ka = Object.keys(a), ke = Object.keys(e);
    for (const k of ka) if (!(k in e)) err(f, p, `missing key "${k}"`);
    for (const k of ke) if (!(k in a)) err(f, p, `extra key "${k}"`);
    for (const k of ka) if (k in e) cmp(f, a[k], e[k], p ? `${p}.${k}` : k);
    return;
  }
  if (ta !== 'string'){ if (a !== e) err(f, p, `value ${JSON.stringify(e)}, expected ${JSON.stringify(a)}`); return; }
  // strings
  const key = p.split('.').pop();
  if (key === 'ar' || key === 'en'){ if (a !== e) err(f, p, `"${key}" field must stay unchanged`); return; }
  if (!AR.test(a)){ if (a !== e) err(f, p, `non-Arabic source string must be copied verbatim: ${JSON.stringify(a).slice(0, 80)}`); return; }
  const eb = stripAr(e);
  if (AR.test(eb)) err(f, p, `Arabic outside [[ar:…]] in translation: ${JSON.stringify(eb.match(/.{0,20}[؀-ۿ]+.{0,20}/)[0])}`);
  if (AR_PUNCT.test(eb)) err(f, p, 'Arabic punctuation («» ، ؛ ؟ ٪) left in translation');
  if (!e.trim()) err(f, p, 'empty translation');
  for (const u of urls(a)) if (!e.includes(u)) err(f, p, `URL dropped: ${u}`);
  const en = nums(e);
  // «50 ألف» may become "50,000"; «2 مليون» may become "2,000,000"
  const missing = nums(a).filter(n => !en.includes(n) && !(/^\d+$/.test(n) && (en.includes(String(+n * 1000)) || en.includes(String(+n * 1e6)))));
  if (missing.length) err(f, p, `numbers missing from translation: ${[...new Set(missing)].join(', ')}`);
  if (bolds(a) !== bolds(e)) warn(f, p, `bold markers ${bolds(e)}, source has ${bolds(a)}`);
  if (a.length > 160){ const r = e.length / a.length; if (r < 0.85 || r > 2.0) warn(f, p, `length ratio ${r.toFixed(2)} (possible omission/padding)`); }
  // section numbering must survive
  const m = a.match(/^(\d+\.\d+)\s/); if (m && key === 'title' && !e.startsWith(m[1] + ' ')) err(f, p, `title must start with "${m[1]} "`);
}

let files = process.argv.slice(2);
if (!files.length){
  const walk = d => fs.readdirSync(path.join(EN, d), {withFileTypes:true}).flatMap(x => x.isDirectory() ? walk(path.join(d, x.name)) : x.name.endsWith('.json') ? [path.join(d, x.name).replace(/\\/g, '/')] : []);
  files = fs.existsSync(EN) ? walk('') : [];
}
for (const rel of files){
  const fa = path.join(SRC, rel), fe = path.join(EN, rel);
  if (!fs.existsSync(fe)){ err(rel, '', 'English file missing: content/en/' + rel); continue; }
  let a, e;
  try { a = JSON.parse(fs.readFileSync(fa, 'utf8')); } catch (x){ err(rel, '', 'source JSON invalid'); continue; }
  try { e = JSON.parse(fs.readFileSync(fe, 'utf8')); } catch (x){ err(rel, '', 'English JSON invalid: ' + x.message); continue; }
  const before = errors; cmp(rel, a, e, '');
  console.log(`${errors === before ? 'OK   ' : 'FAIL '} ${rel}`);
}
console.log(`\n${files.length} file(s), ${errors} error(s), ${warns} warning(s)`);
process.exit(errors ? 1 : 0);
