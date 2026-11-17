// Builds the static study site in ../site from the JSON content in ../content.
// Same page structure and assets as the Secure-RAG course site; content is the SDAIA expert AI-engineer exam.
// Usage: node tools/build.js   (no dependencies)
const fs = require('fs'), path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'content');
const OUT = path.join(ROOT, 'site');
const BANK = path.join(ROOT, '..', 'Exam_Simulator', 'question_bank.json');

const SERIES = 'التحضير لشارة مهندس الذكاء الاصطناعي الخبير';
const AUTHOR = 'محمد المبارك';
const MEMO = 'المذكرة_الشاملة_ثنائية_اللغة_مهندس_الذكاء_الاصطناعي_الخبير_v4.pdf';
const SCEN = 'مذكرة_السيناريوهات_ثنائية_اللغة_مهندس_الذكاء_الاصطناعي_الخبير_v3.pdf';
const MCQ_PER_UNIT = 10;

/* ================= html helpers ================= */

const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const hasArabic = s => /\p{Script=Arabic}/u.test(s);
const stripBold = s => String(s).replace(/\*\*/g, '');
const pad2 = n => String(n).padStart(2, '0');
const arDigits = s => String(s).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
function inline(raw){
  return String(raw).split(/(https?:\/\/[^\s)]+)/).map((part, i) => i % 2
    ? `<a class="ext" href="${esc(part)}" title="${esc(part)}" dir="ltr" target="_blank" rel="noopener">${esc(new URL(part).hostname.replace(/^www\./, ''))} ↗</a>`
    : esc(part).replace(/(\d[\d.,]*\s?[%٪])/g, '<span dir="ltr">$1</span>')).join('').replace(/\*\*(.+?)\*\*/gs, '<strong>$1</strong>').replace(/\n/g, '<br>');
}

function table(rows){
  const [head, ...rest] = rows;
  return `<div class="table-wrap"><table><thead><tr>${head.map(c=>`<th>${inline(stripBold(c))}</th>`).join('')}</tr></thead>
<tbody>${rest.map(r=>`<tr>${r.map(c=>`<td>${inline(c)}</td>`).join('')}</tr>`).join('\n')}</tbody></table></div>`;
}

// One content block -> html (see content/SPEC.md).
function block(b, listClass = ''){
  const cls = listClass ? ` class="${listClass}"` : '';
  if (b.p != null) return hasArabic(b.p) ? `<p>${inline(b.p)}</p>` : `<p class="formula" dir="ltr">${inline(b.p)}</p>`;
  if (b.ul) return `<ul${cls}>${b.ul.map(x => `<li>${inline(x)}</li>`).join('')}</ul>`;
  if (b.ol) return `<ol${cls}>${b.ol.map(x => `<li>${inline(x)}</li>`).join('')}</ol>`;
  if (b.table) return table(b.table);
  if (b.formula != null) return `<p class="formula" dir="ltr">${inline(b.formula)}</p>`;
  if (b.quote != null) return `<blockquote>${inline(b.quote)}</blockquote>`;
  if (b.code != null) return `<pre dir="ltr"><code>${esc(b.code)}</code></pre>`;
  if (b.h != null) return `<h4>${inline(b.h)}</h4>`;
  throw new Error('unknown block: ' + JSON.stringify(b).slice(0, 80));
}
const blocks = bs => (bs || []).map(b => block(b)).join('\n') + '\n';

/* ================= question bank -> units ================= */

const SEC_UNIT = q => {
  const s = String(q.section);
  const c = s.match(/^Case\s*(\d+)/); if (c) return 12;
  const [ch, n] = s.split('.').map(Number);
  if (ch === 1) return 1;
  if (ch === 2) return n <= 11 ? 2 : 3;
  if (ch === 3) return n <= 15 ? 4 : 5;
  if (ch === 4) return 6;
  if (ch === 5) return 7;
  if (ch === 6) return 8;
  if (ch === 7) return [4,5,6,14,15,16,17,19,20,21].includes(n) ? 9 : 10;
  if (ch === 8 || ch === 9) return 11;
  return 0;
};
const bank = fs.existsSync(BANK) ? JSON.parse(fs.readFileSync(BANK, 'utf8')).questions : [];
// spread the picks over sections and difficulty, deterministically
function pickQuestions(num){
  const pool = bank.filter(q => SEC_UNIT(q) === num).sort((a, b) => a.id.localeCompare(b.id));
  const bySec = new Map();
  for (const q of pool) { const k = q.section; if (!bySec.has(k)) bySec.set(k, []); bySec.get(k).push(q); }
  const order = ['hard', 'medium', 'very_hard', 'easy'];
  for (const list of bySec.values()) list.sort((a, b) => order.indexOf(a.difficulty) - order.indexOf(b.difficulty));
  const out = [], lists = [...bySec.values()];
  for (let round = 0; out.length < MCQ_PER_UNIT && lists.some(l => l[round]); round++)
    for (const l of lists) if (l[round] && out.length < MCQ_PER_UNIT) out.push(l[round]);
  return {picked: out, total: pool.length};
}
const DIFF = {easy:'سهل', medium:'متوسط', hard:'صعب', very_hard:'صعب جدًا'};
function mcqHtml(qs){
  return `<ol class="mcq">${qs.map((q, k) => `<li class="mq" data-answer="${q.answer}">
  <p class="mq-meta"><span class="qn">${k+1}</span><span>${esc(q.topic.ar)}</span><em>${DIFF[q.difficulty] || ''}</em></p>
  <p class="mq-stem">${inline(q.stem.ar)}</p>
  ${q.table ? table([q.table.headers.ar, ...q.table.rows.ar]) : ''}
  <div class="opts">${q.options.map((o, j) => `<button type="button" class="opt" data-i="${j}"><span class="ol">${'أبجد'[j]}</span><span>${inline(o.ar)}</span></button>`).join('')}</div>
  <div class="mq-exp" hidden><span class="tag">الشرح</span><p>${inline(q.explanation.ar)}</p></div>
</li>`).join('\n')}</ol>`;
}

/* ================= load content ================= */

const readJson = f => JSON.parse(fs.readFileSync(path.join(SRC, f), 'utf8'));
const guide = readJson('guide.json');
const glossary = fs.existsSync(path.join(SRC, 'glossary.json')) ? readJson('glossary.json') : {intro:'', terms:[]};
const units = fs.readdirSync(path.join(SRC, 'units')).filter(f => /^\d\d\.json$/.test(f)).sort().map(f => {
  const u = readJson('units/' + f);
  u.key = f.slice(0, 2); u.num = +u.key;
  // beginner layer (content/beginner/NN.json, see content/BEGINNER_SPEC.md)
  const bf = path.join(SRC, 'beginner', f);
  u.beginner = fs.existsSync(bf) ? JSON.parse(fs.readFileSync(bf, 'utf8')) : null;
  return u;
});
const FIRST = units[0];

const START = FIRST.num === 0 ? 'ابدأ من الصفر' : 'ابدأ الوحدة الأولى';
const N_UNITS = units.filter(u => u.num > 0).length;
const ORD = ['الأول','الثاني','الثالث','الرابع','الخامس','السادس','السابع','الثامن'];

// plain-language explanation, example and definitions shown before a section's exam detail
function simpleLayer(b){
  if (!b) return '';
  return `<div class="simple"><span class="tag">الفكرة ببساطة</span>${b.simple.map(p => `<p>${inline(p)}</p>`).join('')}</div>
${b.example ? `<div class="example"><span class="tag">مثال من الواقع</span><p>${inline(b.example)}</p></div>` : ''}
${b.terms && b.terms.length ? `<div class="terms"><span class="tag">تعريفات هذا القسم</span><dl>${b.terms.map(t => `<div><dt><b>${inline(t.ar)}</b><span dir="ltr">${esc(t.en)}</span></dt><dd>${inline(t.def)}</dd></div>`).join('')}</dl></div>` : ''}
<p class="deep-label"><span>التفاصيل التي يختبرها الامتحان</span></p>
`;
}

// unit json -> reader sections (same sequence as the reference course)
function unitSections(u){
  const S = [];
  const add = s => { s.id = 's' + (S.length + 1); S.push(s); return s; };
  const B = u.beginner;
  add({kind:'intro', title:'مقدمة الوحدة', subs:[], html:
    `<p>${inline(u.intro)}</p>
${B && B.before ? `<div class="simple before"><span class="tag">قبل أن تبدأ</span>${B.before.map(p => `<p>${inline(p)}</p>`).join('')}</div>` : ''}
<div class="outcomes"><h3>مخرجات التعلم</h3><p>بنهاية هذه الوحدة، ستكون قادرًا على:</p>
<ul class="checks">${u.outcomes.map(x => `<li>${inline(x)}</li>`).join('')}</ul>
</div>
<h3 id="s1-1">طريقة الدراسة</h3>
<p>${inline(u.method)}</p>
`});
  u.chapters.forEach((c, ci) => {
    const s = add({kind:'chapter', label:'الفصل ' + ORD[ci], title:c.title, subs:[]});
    s.html = c.sections.map((x, k) => {
      const id = `${s.id}-${k+1}`;
      s.subs.push({id, title:x.title});
      const num = x.title.match(/^(\d+\.\d+)/)[1];
      return `<h3 id="${id}">${inline(x.title)}</h3>\n` + simpleLayer(B && B.sections[num]) + blocks(x.blocks);
    }).join('');
  });
  const L = u.lab;
  add({kind:'lab', title:'التطبيق العملي', subs:[], html:
    `<p>${inline(L.purpose)}</p>
<h3>السيناريو</h3>
${L.scenario.map(p => `<p>${inline(p)}</p>`).join('\n')}
<h3>خطوات الحل</h3>
<ol>${L.steps.map(x => `<li>${inline(x)}</li>`).join('')}</ol>
<div class="safety"><h3>فخاخ الامتحان</h3><ul>${L.traps.map(x => `<li>${inline(x)}</li>`).join('')}</ul>
</div>
<div class="deliverable"><span class="tag">ما يجب أن تتقنه</span><p>${inline(L.deliverable)}</p>
</div>
`});
  const {picked, total} = pickQuestions(u.num);
  const review = add({kind:'review', title:'تمارين ومراجعة الوحدة', subs:[]});
  review.html = `<p class="qa-hint">حاول الإجابة بنفسك أولًا، ثم افتح السؤال لترى الإجابة المشروحة.</p>
<ol class="qa">${u.review.map((q, k) => `<li><details><summary><span class="qn">${k+1}</span><span class="qt">${inline(q.q)}</span><span class="plus" aria-hidden="true"></span></summary><div class="ans"><span class="tag">الإجابة</span><p>${inline(q.a)}</p></div></details></li>`).join('\n')}</ol>
` + (picked.length ? `<h3 id="${review.id}-mcq">أسئلة بنمط الامتحان</h3>
<p class="qa-hint">اختر إجابة لترى الصحيحة وشرحها. هذه ${arDigits(picked.length)} أسئلة من ${arDigits(total)} سؤالًا مخصصًا لهذه الوحدة في <a href="../simulator.html">محاكي الامتحان</a>.</p>
${mcqHtml(picked)}
` : '');
  add({kind:'summary', title:'خلاصة الوحدة', subs:[], html:`<p>${inline(u.summary)}</p>\n`});
  return S;
}

/* ================= page shell ================= */

const dl = (f, base) => `${base}downloads/${encodeURIComponent(f)}`;

function page({title, desc, base, body, active, playerCss = false, playerJs = false, bodyClass = ''}){
  const nav = [['index.html#units','الوحدات','units'],['index.html#tour','جولة المنصة','tour'],['guide.html','دليل الامتحان','guide'],['glossary.html','المسرد','glossary'],['simulator.html','المحاكي','sim']];
  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${base}fonts/thmanyah.css" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500&family=IBM+Plex+Sans+Arabic:wght@400;600&family=Noto+Naskh+Arabic:wght@700&display=swap" rel="stylesheet">
<link href="${base}assets/site.css" rel="stylesheet">
<link href="${base}assets/exam.css" rel="stylesheet">
${playerCss ? `<link href="${base}assets/player.css" rel="stylesheet">\n` : ''}</head>
<body class="${bodyClass}">
<a class="skip" href="#main">تخطَّ إلى المحتوى</a>
<header class="site-head"><div class="in">
  <a class="logo rv" href="${base}index.html">شارة مهندس الذكاء الاصطناعي<small>SDAIA · EXPERT AI ENGINEER</small></a>
  <nav class="nav rv" style="--rd:.4s" id="nav" aria-label="القائمة الرئيسية">
    ${nav.map(([h,t,k]) => `<a href="${base}${h}"${k===active?' aria-current="page"':''}>${t}</a>`).join('')}
    <a class="pill-outline nav-pill" href="${base}units/${FIRST.key}.html">${START}</a>
  </nav>
  <a class="pill-outline rv head-pill" style="--rd:.4s" href="${base}units/${FIRST.key}.html">${START}</a>
  <button class="menu-btn" id="menuBtn" aria-expanded="false" aria-controls="nav" aria-label="القائمة"><i></i><i></i></button>
</div></header>
<main id="main">
${body}
</main>
<footer class="site-foot">
  <b>${esc(AUTHOR)}</b>
  <p>${esc(SERIES)}</p>
  <small>© ${arDigits(2026)} ${esc(AUTHOR)}. جميع الحقوق محفوظة.</small>
</footer>
<script src="${base}assets/site.js"></script>
${playerJs ? `<script src="${base}assets/player.js"></script>\n` : ''}</body>
</html>
`;
}

const arrow = '<i aria-hidden="true">↖</i>';

/* ================= landing page ================= */

// exam domains (weights from the official blueprint, see content/guide.json)
const DOMAINS = [
  {n:1, name:'البيانات وأسس تعلّم الآلة وتقييم النماذج', w:17.3, units:[2,3]},
  {n:2, name:'أساسيات الذكاء الاصطناعي والتعلّم العميق والتوليدي', w:16.7, units:[4,5]},
  {n:3, name:'هندسة برمجيات الذكاء الاصطناعي والتكامل', w:14.0, units:[6]},
  {n:4, name:'العمليات والنشر والاعتمادية (MLOps/LLMOps)', w:18.0, units:[7]},
  {n:5, name:'المعمارية والبنية التحتية والأداء والتوسّع', w:12.7, units:[8]},
  {n:6, name:'الذكاء الاصطناعي المسؤول والأمن والحوكمة', w:14.7, units:[9,10]},
  {n:7, name:'الأعمال والممارسة المهنية والتعاون', w:6.7, units:[11]},
];
const PARTS = [
  {name:'التمهيد', from:0, to:0, line:'للمبتدئين: البيانات والنماذج والمقاييس والنماذج اللغوية والأنظمة، من الصفر.'},
  {name:'المنهجية', from:1, to:1, line:'إجراء الإجابة، استخراج المتطلبات، وحسابات الكمون والسعة والتكلفة.'},
  {name:'البيانات والنماذج', from:2, to:5, line:'من التقسيم والمقاييس والانحراف إلى المحوّلات والوكلاء وتقييم النماذج التوليدية.'},
  {name:'الهندسة والتشغيل', from:6, to:8, line:'RAG والتكامل، ثم النشر والمراقبة، ثم البنية التحتية والتحجيم.'},
  {name:'المسؤولية والقرار', from:9, to:12, line:'الأمن والحوكمة السعودية والأعمال والتكاليف، ثم دراسات الحالة.'},
];
const unitChapters = u => u.chapters.map(c => c.title);

function scenesHtml(){
  let s = `
      <section class="scene chap" data-ch="المنصة" data-dur="8000" data-label="الغلاف">
        <p class="eyebrow a" style="--d:.3s">منصة تحضير · تمهيد + ١٢ وحدة · ٧ محاور</p>
        <h1 class="a" style="--d:.5s">الامتحان لا يسأل عن التعريف. يسأل عن <mark>القرار الصحيح</mark>.</h1>
        <p class="lead a" style="--d:1.2s">${esc(stripBold(guide.about).split('. ')[0])}.</p>
      </section>

      <section class="scene" data-ch="المنصة" data-dur="10000" data-label="ما يُقاس">
        <div class="head"><p class="eyebrow a" style="--d:.1s">ما يُقاس</p><h2 class="a" style="--d:.25s">المفاضلة بين حلّين معقولين بـ<mark>أربعة قيود معًا</mark>.</h2></div>
        <ol class="steps">
          <li class="a" style="--d:.8s"><span class="num">1</span><b>التكلفة</b><small>الحل الكافي الأرخص.</small></li>
          <li class="a" style="--d:1.9s"><span class="num">2</span><b>الكمون</b><small>p95 و p99 ومهلة الاستجابة.</small></li>
          <li class="a" style="--d:3s"><span class="num">3</span><b>الدقة</b><small>المقياس الذي يناسب كلفة الخطأ.</small></li>
          <li class="a" style="--d:4.1s"><span class="num">4</span><b>الامتثال</b><small>نظام حماية البيانات ومبادئ سدايا.</small></li>
        </ol>
      </section>

      <section class="scene" data-ch="المنصة" data-dur="9000" data-label="أنماط الأسئلة">
        <div class="head"><p class="eyebrow a" style="--d:.1s">أنماط الأسئلة</p><h2 class="a" style="--d:.25s">أربعة أنماط تتكرر في معظم الأسئلة.</h2></div>
        <div class="grid g3">
          <div class="card a" style="--d:.8s"><span class="tagline">الأكبر</span><h3>مشكلة ← أنسب حل</h3></div>
          <div class="card hi a pop" style="--d:1.8s"><span class="tagline">الأصعب</span><h3>مطابقة المتطلبات بالمواصفات</h3></div>
          <div class="card a" style="--d:2.8s"><span class="tagline">متكرر</span><h3>تحليل التكاليف والحوكمة</h3></div>
        </div>
        <p class="lead a" style="--d:4s">الوحدة الأولى تعلّمك إجراءً واحدًا تطبّقه على كل سؤال.</p>
      </section>

      <section class="scene" data-ch="المنصة" data-dur="12000" data-label="أوزان المحاور">
        <div class="head"><p class="eyebrow a" style="--d:.1s">أوزان المحاور</p><h2 class="a" style="--d:.25s">الكتلة <mark>التشغيلية</mark> أثقل مما تتوقع.</h2></div>
        <div class="weights">
          ${DOMAINS.slice().sort((a, b) => b.w - a.w).slice(0, 4).map((d, k) => `<div class="w a" style="--d:${(.8 + k * 1.1).toFixed(1)}s;--p:${Math.round(d.w * 5)}"><b><span data-from="0" data-to="${Math.round(d.w)}" data-at="${800 + k * 1100}" data-ms="1200">0</span>%</b><i><u></u></i><small>المحور ${d.n} · ${esc(d.name)}</small></div>`).join('\n          ')}
        </div>
      </section>
`;
  PARTS.forEach((p, pi) => {
    const us = units.filter(u => u.num >= p.from && u.num <= p.to);
    s += `
      <section class="scene chap" data-ch="${p.name}" data-dur="6000" data-label="الجزء ${pi+1}">
        <p class="daynum a pop" style="--d:.2s">الجزء <span>${pi+1}</span></p>
        <h2 class="a" style="--d:.8s">${esc(p.name)}</h2>
        <p class="lead a" style="--d:1.2s">${esc(p.line)}</p>
        <div class="pillars a" style="--d:1.8s">${us.map(u => `<span>الوحدة ${pad2(u.num)}</span>`).join('')}</div>
      </section>
`;
    for (const u of us){
      const chs = unitChapters(u).slice(0, 4);
      s += `
      <section class="scene" data-ch="${p.name}" data-dur="${8000 + chs.length * 900}" data-label="${esc(u.title)}">
        <div class="head"><p class="eyebrow a" style="--d:.1s">الوحدة <span class="unum">${pad2(u.num)}</span> · <span dir="ltr">${esc(u.english)}</span></p><h2 class="a" style="--d:.25s">${esc(u.title)}</h2></div>
        <ol class="nlist">
          ${chs.map((c, k) => `<li class="a slide" style="--d:${(.8 + k * 1.1).toFixed(1)}s"><span class="n">${k+1}</span><span>${inline(stripBold(c))}</span></li>`).join('\n          ')}
        </ol>
        <div class="deliv a" style="--d:${(1 + chs.length * 1.1).toFixed(1)}s"><span class="lab">${inline(u.domain)}</span><p>${inline(stripBold(u.deliverable))}</p></div>
      </section>
`;
    }
  });
  s += `
      <section class="scene chap" data-ch="يوم الامتحان" data-dur="5500" data-label="يوم الامتحان">
        <p class="daynum a pop" style="--d:.2s">١٤٠<span>–</span>١٥٠</p>
        <h2 class="a" style="--d:.8s">سيناريو طويل، اختيار من متعدد</h2>
      </section>

      <section class="scene" data-ch="يوم الامتحان" data-dur="10000" data-label="ثلاث جولات">
        <div class="head"><p class="eyebrow a" style="--d:.1s">إدارة الوقت</p><h2 class="a" style="--d:.25s">ثلاث جولات، لا جولة واحدة.</h2></div>
        <div class="weights">
          ${[[60,'الجولة الأولى: كل ما يُحسم في ٩٠ ثانية'],[30,'الجولة الثانية: جداول المطابقة والتكاليف'],[10,'الجولة الثالثة: المعلَّم فقط']].map(([p, t], k) => `<div class="w a" style="--d:${(.8 + k * 1.1).toFixed(1)}s;--p:${p}"><b><span data-from="0" data-to="${p}" data-at="${800 + k * 1100}" data-ms="1200">0</span>%</b><i><u></u></i><small>${t}</small></div>`).join('\n          ')}
        </div>
      </section>

      <section class="scene" data-ch="يوم الامتحان" data-dur="10000" data-label="المشتتات">
        <div class="head"><p class="eyebrow a" style="--d:.1s">عائلات المشتتات</p><h2 class="a" style="--d:.25s">الخيار الأكبر ليس الخيار الأصح.</h2></div>
        <div class="exrow weak a" style="--d:1s"><span class="lab">مشتت</span><p><span class="strike" style="--s:2s">أعد التدريب، أو استخدم نموذجًا أكبر ووحدات معالجة أكثر</span></p></div>
        <div class="exrow weak a" style="--d:2.6s"><span class="lab">مشتت</span><p><span class="strike" style="--s:3.6s">حل صحيح تقنيًا لكنه يخالف نظام حماية البيانات</span></p></div>
        <div class="exrow strong a" style="--d:4.8s"><span class="lab">الصحيح</span><p>السبب الجذري أولًا، ثم <mark>أقل حل كافٍ</mark> يحقق كل المتطلبات الصارمة</p></div>
      </section>

      <section class="scene" data-ch="يوم الامتحان" data-dur="8000" data-label="الخلاصة">
        <p class="eyebrow a" style="--d:.1s">الخلاصة</p>
        <p class="big a pop" style="--d:.4s"><span data-from="0" data-to="${bank.length}" data-at="600" data-ms="1800">0</span></p>
        <h2 class="a" style="--d:1.4s">سؤال مراجَع في المحاكي، موزعة على المحاور بأوزانها.</h2>
      </section>
`;
  return s;
}

function landing(){
  const groups = [
    ['افهم وقرّر بالأرقام', ['استخراج المتطلبات الصارمة والمرنة من نص السيناريو قبل قراءة الخيارات.', 'حساب الكمون والسعة وعدد النسخ والتكلفة المتوقعة للعتبات.', 'اختيار المقياس الذي يناسب كلفة الخطأ، لا الدقة الكلية.']],
    ['ابنِ وشغّل', ['تصميم RAG يبقى حديثًا، وواجهات خدمة مرنة وآمنة.', 'اختيار استراتيجية النشر والمراقبة وإعادة التدريب المناسبة.', 'تحجيم الخدمة على وحدات المعالجة الرسومية داخل المملكة.']],
    ['احكم والتزم', ['تسمية مبدأ سدايا أو التزام نظام حماية البيانات المخالَف بدقة.', 'اكتشاف الهدر في فاتورة وتقديم البديل الأرخص الكافي.', 'الوصول إلى قرار متكامل في دراسات حالة من بيئة العمل السعودية.']],
  ];
  const body = `
<section class="hero"><div class="in">
  <p class="eyebrow-g rv">منصة تحضير من ${esc(AUTHOR)}</p>
  <h1 class="rv" style="--rd:.1s">الامتحان لا يسأل عن التعريف.<br>يسأل عن القرار الصحيح تحت القيد.</h1>
  <p class="lead rv" style="--rd:.2s">${inline(guide.about)}</p>
  <a class="cta rv" style="--rd:.3s" href="units/${FIRST.key}.html">${arrow}${START}</a>
  <p class="hero-meta rv" style="--rd:.4s"><span>وحدة تمهيدية للمبتدئين + ١٢ وحدة تغطي المحاور السبعة</span><span>شرح مبسط وتعريفات قبل التفاصيل في كل قسم</span><span>سيناريو تطبيقي وأسئلة في كل وحدة</span><span>محاكي بـ${arDigits(bank.length)} سؤال</span></p>
</div></section>

<section class="values"><div class="in">
  <h2 class="rv">من قراءة السيناريو إلى اختيار الحل الكافي الأرخص.</h2>
  <p class="sub rv" style="--rd:.1s">${inline(guide.audience)}</p>
  <div class="cards">
    ${groups.map(([t, items], k) => `<article class="vcard rv" style="--rd:${(k+1)/10}s"><span class="vnum">${arDigits(k+1)}</span><h3>${t}</h3><ul>${items.map(x => `<li>${inline(x)}</li>`).join('')}</ul></article>`).join('\n    ')}
  </div>
</div></section>

<section class="units" id="units"><div class="in">
  <div class="units-head">
    <div>
      <h2 class="rv">ابدأ من الصفر، ثم اثنتا عشرة وحدة على محاور الامتحان.</h2>
      <p class="sub rv" style="--rd:.1s">كل قسم يبدأ بالفكرة ببساطة ومثال من الواقع وتعريفات مصطلحاته، ثم التفاصيل التي يختبرها الامتحان. وفي آخر كل وحدة سيناريو تطبيقي وفخاخ الامتحان وأسئلة بإجابات مشروحة.</p>
    </div>
    <div class="progress rv" style="--rd:.2s" id="progress" hidden>
      <span id="progressText"></span><i><u id="progressBar"></u></i>
    </div>
  </div>
  <ol class="ledger">
    ${units.map(u => `<li class="rv" data-unit="${u.num}"><a href="units/${u.key}.html">
      <span class="lnum">${pad2(u.num)}</span>
      <span class="ltitle"><b>${esc(u.title)}</b><small dir="ltr">${esc(u.english)}</small></span>
      <span class="ldel"><em>${inline(u.domain)}</em>${inline(u.deliverable)}</span>
      <span class="lgo"><span class="done-badge">مكتملة</span><i aria-hidden="true">↖</i></span>
    </a></li>`).join('\n    ')}
  </ol>
</div></section>

<section class="band" id="tour"><div class="in">
  <h2 class="rv">جولة في المنصة</h2>
  <p class="sub rv" style="--rd:.1s">شغّل العرض أو تنقّل بين المشاهد بالسرعة التي تناسبك.</p>
  <div class="player" dir="rtl">
    <header class="topbar"><span class="mark" aria-hidden="true"></span><div><b>${esc(SERIES)}</b><a href="#units">تمهيد + ١٢ وحدة · ${esc(AUTHOR)}</a></div></header>
    <nav class="tabs" id="tabs" aria-label="أجزاء الجولة"></nav>
    <div class="stage" id="stage" aria-live="polite">
      <div class="brandbug" aria-hidden="true">SDAIA · Expert AI Engineer</div>
${scenesHtml()}
    </div>
    <div class="bar-ui">
      <button class="btn" id="prev" aria-label="السابق">›</button>
      <button class="btn primary" id="play">إيقاف</button>
      <button class="btn" id="next" aria-label="التالي">‹</button>
      <button class="btn" id="speed"></button>
      <div class="segs" id="segs"></div>
      <div class="now" id="now"></div>
    </div>
  </div>
</div></section>

<section class="assess" id="assessment"><div class="in">
  <h2 class="rv">سبعة محاور، وكل محور له وحدته.</h2>
  <div class="weights-row domains">
    ${DOMAINS.map((d, k) => `<div class="wt rv" style="--rd:${k/20}s"><b>${arDigits(d.w.toFixed(1))}٪</b><p><span class="dn">المحور ${arDigits(d.n)}</span>${esc(d.name)}</p><p class="du">${d.units.map(n => `<a href="units/${pad2(n)}.html">الوحدة ${pad2(n)}</a>`).join(' · ')}</p></div>`).join('\n    ')}
  </div>
  <p class="note rv">الأوزان تطابق مخططًا من ١٥٠ سؤالًا. المحاور ٣ و٤ و٥ معًا ٤٤٫٧٪، وجزء كبير من المحور ٦ تشغيلي أيضًا. الوحدتان ٠١ و١٢ تخدمان كل المحاور.</p>

  <div class="two">
    <article class="rv">
      <h3>محاكي الامتحان</h3>
      <p>${arDigits(bank.length)} سؤال اختيار من متعدد بالعربية والإنجليزية، كلها راجعناها، وموزعة على المحاور السبعة بأوزانها الرسمية وبمستويات صعوبة مختلفة. كل سؤال معه شرح للإجابة الصحيحة وسبب استبعاد كل خيار.</p>
      <a class="text-link" href="simulator.html">افتح المحاكي</a>
    </article>
    <article class="rv" style="--rd:.1s">
      <h3>دليل الامتحان</h3>
      <p>شكل الامتحان، وأنماط الأسئلة الأربعة، وعائلات المشتتات، وإدارة الوقت بثلاث جولات، وخطة مذاكرة حسب الأيام المتبقية.</p>
      <a class="text-link" href="guide.html">اقرأ الدليل</a>
    </article>
  </div>
</div></section>

<section class="closing"><div class="in">
  <h2 class="rv">لا تكتفِ بالقراءة. حلّ السيناريو.</h2>
  <p class="rv" style="--rd:.1s">إن كنت مبتدئًا فابدأ بالوحدة التمهيدية 00. اقرأ في كل قسم «الفكرة ببساطة» والتعريفات أولًا، ثم التفاصيل. اقرأ الوحدات بالترتيب، ثم غطِّ القرار في السيناريو التطبيقي وأعد بناءه من المتطلبات. بعدها افتح أسئلة نمط الامتحان، ولا تنتقل حتى تعرف لماذا سقط كل خيار خاطئ.</p>
  <p class="small rv" style="--rd:.2s">هذه مادة تحضيرية وليست منهجًا رسميًا صادرًا عن سدايا. ما يخص بنية الامتحان مصدره تقارير المختبَرين، فتحقّق منه في بوابة أذكى X قبل التقديم.</p>
  <div class="act rv" style="--rd:.25s"><a class="cta" href="units/${FIRST.key}.html">${arrow}${START}</a></div>
  <p class="downloads rv" style="--rd:.3s">تفضّل القراءة في PDF؟ <a href="${dl(MEMO, '')}" download>نزّل المذكرة الشاملة</a> أو <a href="${dl(SCEN, '')}" download>مذكرة السيناريوهات</a>.</p>
</div></section>`;
  return page({title:`${SERIES} — ${AUTHOR}`, desc:stripBold(guide.about), base:'', body, playerCss:true, playerJs:true, active:'', bodyClass:'home'});
}

/* ================= reader pages ================= */

function reader({meta, sections, base, prev, next, unitNum}){
  const toc = sections.filter(s => s.title).map(s => `<li><a href="#${s.id}">${s.label ? `<small>${esc(s.label)}</small>` : ''}${inline(s.title)}</a>${
    s.kind === 'chapter' && s.subs.length ? `<ol>${s.subs.map(x => `<li><a href="#${x.id}">${inline(x.title)}</a></li>`).join('')}</ol>` : ''}</li>`).join('\n');
  const secs = sections.map(s => {
    const head = s.kind === 'chapter'
      ? `<header class="chap-head"><span>${esc(s.label)}</span><h2>${inline(s.title)}</h2></header>`
      : s.title ? `<h2 class="sec-title">${esc(s.title)}</h2>` : '';
    return `<section id="${s.id}" class="sec sec-${s.kind}">${head}\n${s.html}</section>`;
  }).join('\n');
  const pn = (u, rel) => u ? `<a class="pn ${rel}" href="${u.key}.html"><small>${rel === 'prev' ? 'الوحدة السابقة' : 'الوحدة التالية'}</small><b>${pad2(u.num)} · ${esc(u.title)}</b></a>` : '<span></span>';
  return `
<div class="read-bar" aria-hidden="true"><u id="readBar"></u></div>
<section class="unit-hero"><div class="in">
  <p class="eyebrow-g rv">${inline(meta.label)}</p>
  <h1 class="rv" style="--rd:.1s">${esc(meta.title)}</h1>
  <p class="en rv" dir="ltr" style="--rd:.15s">${esc(meta.english)}</p>
  <p class="lead rv" style="--rd:.2s">${esc(meta.subtitle)}</p>
  <p class="byline rv" style="--rd:.25s">إعداد ${esc(AUTHOR)} · <a href="${dl(MEMO, base)}" download>المذكرة الشاملة PDF</a></p>
</div></section>

<div class="reader in">
  <aside class="toc" aria-label="محتويات الصفحة">
    <div class="toc-inner">
      <p class="toc-title">في هذه الصفحة</p>
      <ol id="toc">${toc}</ol>
      ${unitNum ? `<button class="done-btn" id="doneBtn" data-unit="${unitNum}" aria-pressed="false"><span class="box" aria-hidden="true"></span><span class="lbl">أنهيت هذه الوحدة</span></button>` : ''}
    </div>
  </aside>
  <article class="prose">
${secs}
    ${unitNum ? `<nav class="pager" aria-label="التنقل بين الوحدات">${pn(prev, 'prev')}${pn(next, 'next')}</nav>` : ''}
  </article>
</div>`;
}

function unitPage(u, i){
  const meta = {label:`الوحدة ${u.key} · ${u.domain}`, title:u.title, english:u.english, subtitle:u.subtitle};
  const body = reader({meta, sections:unitSections(u), base:'../', prev:units[i-1], next:units[i+1], unitNum:u.num});
  return page({title:`الوحدة ${u.key}: ${u.title} — ${SERIES}`, desc:u.subtitle, base:'../', body, active:'units', bodyClass:'unit'});
}

function guidePage(){
  const sections = [{kind:'intro', title:'فكرة المنصة', subs:[], html:`<p>${inline(guide.about)}</p>\n<p>${inline(guide.audience)}</p>\n`}];
  guide.sections.forEach(s => sections.push({kind:'plain', title:s.title, subs:[], html:blocks(s.blocks)}));
  sections.forEach((s, k) => s.id = 's' + (k + 1));
  // the unit table's first column becomes links
  for (const s of sections) s.html = s.html.replace(/<tr><td>(\d\d)<\/td><td>([^<]+)<\/td>/g, (m, num, t) => `<tr><td>${num}</td><td><a href="units/${num}.html">${t}</a></td>`);
  const meta = {label:'دليل الامتحان', title:guide.title, english:guide.english, subtitle:guide.subtitle};
  const body = reader({meta, sections, base:''});
  return page({title:`${guide.title} — ${SERIES}`, desc:guide.subtitle, base:'', body, active:'guide', bodyClass:'unit'});
}

function glossaryPage(){
  const seen = new Set(glossary.terms.map(t => t.en.toLowerCase().trim()));
  const rows = glossary.terms.slice();
  for (const u of units){
    const add = t => { const k = t.en.toLowerCase().trim(); if (!k || seen.has(k)) return; seen.add(k); rows.push({...t, unit:u.key}); };
    if (u.beginner) Object.values(u.beginner.sections).forEach(s => (s.terms || []).forEach(add));
  }
  const body = `
<section class="unit-hero"><div class="in">
  <p class="eyebrow-g rv">مرجع سريع</p>
  <h1 class="rv" style="--rd:.1s">المسرد ثنائي اللغة</h1>
  <p class="en rv" dir="ltr" style="--rd:.15s">Bilingual Glossary</p>
  <p class="lead rv" style="--rd:.2s">${inline(glossary.intro)}</p>
</div></section>
<section class="gloss"><div class="in">
  <div class="gsearch">
    <label for="q" class="sr">ابحث في المسرد</label>
    <input id="q" type="search" placeholder="ابحث بالعربية أو الإنجليزية… مثل: الاستدعاء، RAG، PDPL" autocomplete="off">
    <span id="gcount" aria-live="polite">${arDigits(rows.length)} مصطلحًا</span>
  </div>
  <dl class="glist" id="glist">
    ${rows.map(r => `<div class="gi"><dt><b>${esc(r.ar)}</b><span dir="ltr">${esc(r.en)}</span></dt><dd>${esc(stripBold(r.def))}</dd>${r.unit ? `<small class="gu"><a href="units/${r.unit}.html">يُشرح في الوحدة ${r.unit}</a></small>` : ''}</div>`).join('\n    ')}
  </dl>
  <p class="gempty" id="gempty" hidden>لا يوجد مصطلح مطابق. جرّب كلمة أقصر.</p>
</div></section>`;
  return page({title:`المسرد ثنائي اللغة — ${SERIES}`, desc:glossary.intro, base:'', body, active:'glossary', bodyClass:'glossary'});
}

/* ================= write ================= */

const write = (rel, html) => { fs.mkdirSync(path.dirname(path.join(OUT, rel)), {recursive:true}); fs.writeFileSync(path.join(OUT, rel), html); };
write('index.html', landing());
write('guide.html', guidePage());
write('glossary.html', glossaryPage());
units.forEach((u, i) => write(`units/${u.key}.html`, unitPage(u, i)));
console.log(`built ${units.length} units + index, guide, glossary (${glossary.terms.length} terms)`);
for (const u of units){
  const secs = u.chapters.reduce((n, c) => n + c.sections.length, 0);
  console.log(` ${u.key} ${u.title} — ${u.chapters.length} chapters, ${secs} sections, ${u.review.length} review, ${pickQuestions(u.num).picked.length} mcq; beginner ${u.beginner ? Object.keys(u.beginner.sections).length : '-'}/${secs}; coverage ${u.coverage.join(' ')}`);
  if (u.beginner){ const want = u.chapters.flatMap(c => c.sections.map(x => x.title.match(/^(\d+\.\d+)/)[1])); const miss = want.filter(k => !u.beginner.sections[k]); if (miss.length) console.log('   ! beginner layer missing:', miss.join(' ')); }
}
