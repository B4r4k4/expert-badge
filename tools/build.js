// Builds the static study site in ../site from the JSON content in ../content.
// Two editions: Arabic (RTL) at site/ from content/, English (LTR) at site/en/ from content/en/ (see content/EN_SPEC.md).
// Assets, fonts, downloads and the (bilingual) simulator are shared.
// Usage: node tools/build.js   (no dependencies)
const fs = require('fs'), path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'content');
const OUT = path.join(ROOT, 'site');
const BANK = path.join(ROOT, '..', 'Exam_Simulator', 'question_bank.json');

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
    : esc(part).replace(/(\d[\d.,]*\s?[%٪])/g, '<span dir="ltr">$1</span>')).join('').replace(/\[\[ar:([^\]]*)\]\]/g, '<span lang="ar" dir="rtl">$1</span>').replace(/\*\*(.+?)\*\*/gs, '<strong>$1</strong>').replace(/\n/g, '<br>');
}

function table(rows){
  const [head, ...rest] = rows;
  return `<div class="table-wrap"><table><thead><tr>${head.map(c=>`<th>${inline(stripBold(c))}</th>`).join('')}</tr></thead>
<tbody>${rest.map(r=>`<tr>${r.map(c=>`<td>${inline(c)}</td>`).join('')}</tr>`).join('\n')}</tbody></table></div>`;
}

// One content block -> html (see content/SPEC.md).
// A `p` with no Arabic is a formula line; in the English edition such lines are pre-marked `formula` (markFormulas).
function block(b, listClass = ''){
  const cls = listClass ? ` class="${listClass}"` : '';
  if (b.p != null) return b.en || hasArabic(b.p) ? `<p>${inline(b.p)}</p>` : `<p class="formula" dir="ltr">${inline(b.p)}</p>`;
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

// English blocks: a `p` is prose unless its Arabic twin has no Arabic (then it is a formula line).
function markFormulas(arBlocks, enBlocks){
  (enBlocks || []).forEach((b, i) => {
    if (b.p == null) return;
    const a = arBlocks && arBlocks[i];
    if (a && a.p != null && !hasArabic(a.p)) { b.formula = b.p; delete b.p; } else b.en = true;
  });
}

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

/* ================= strings ================= */

const DOMAIN_W = [
  {n:1, w:17.3, units:[2,3]}, {n:2, w:16.7, units:[4,5]}, {n:3, w:14.0, units:[6]}, {n:4, w:18.0, units:[7]},
  {n:5, w:12.7, units:[8]}, {n:6, w:14.7, units:[9,10]}, {n:7, w:6.7, units:[11]},
];
const PART_RANGES = [[0,0],[1,1],[2,5],[6,8],[9,12]];

const T = {
ar: {
  lang:'ar', dir:'rtl', other:'en', otherName:'English',
  series:'التحضير لشارة مهندس الذكاء الاصطناعي الخبير', author:'محمد المبارك',
  num: arDigits, arrow:'↖', letters:'أبجد',
  diff:{easy:'سهل', medium:'متوسط', hard:'صعب', very_hard:'صعب جدًا'},
  fonts:'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500&family=IBM+Plex+Sans+Arabic:wght@400;600&family=Noto+Naskh+Arabic:wght@700&display=swap',
  start0:'ابدأ من الصفر', start1:'ابدأ الوحدة الأولى',
  nav:['الوحدات','جولة المنصة','دليل الامتحان','المسرد','المحاكي'], navAria:'القائمة الرئيسية', menu:'القائمة', skip:'تخطَّ إلى المحتوى',
  logo:'شارة مهندس الذكاء الاصطناعي', rights: a => `© ${arDigits(2026)} ${esc(a)}. جميع الحقوق محفوظة.`,
  domains:['البيانات وأسس تعلّم الآلة وتقييم النماذج','أساسيات الذكاء الاصطناعي والتعلّم العميق والتوليدي','هندسة برمجيات الذكاء الاصطناعي والتكامل','العمليات والنشر والاعتمادية (MLOps/LLMOps)','المعمارية والبنية التحتية والأداء والتوسّع','الذكاء الاصطناعي المسؤول والأمن والحوكمة','الأعمال والممارسة المهنية والتعاون'],
  domainN: n => `المحور ${n}`, domainNd: n => `المحور ${arDigits(n)}`, pct: w => `${arDigits(w.toFixed(1))}٪`,
  parts:[['التمهيد','للمبتدئين: البيانات والنماذج والمقاييس والنماذج اللغوية والأنظمة، من الصفر.'],['المنهجية','إجراء الإجابة، استخراج المتطلبات، وحسابات الكمون والسعة والتكلفة.'],['البيانات والنماذج','من التقسيم والمقاييس والانحراف إلى المحوّلات والوكلاء وتقييم النماذج التوليدية.'],['الهندسة والتشغيل','RAG والتكامل، ثم النشر والمراقبة، ثم البنية التحتية والتحجيم.'],['المسؤولية والقرار','الأمن والحوكمة السعودية والأعمال والتكاليف، ثم دراسات الحالة.']],
  partN: n => `الجزء ${n}`,
  unitN: k => `الوحدة ${k}`, chapterN: i => 'الفصل ' + ['الأول','الثاني','الثالث','الرابع','الخامس','السادس','السابع','الثامن'][i],
  // reader / unit
  simple:'الفكرة ببساطة', example:'مثال من الواقع', terms:'تعريفات هذا القسم', deep:'التفاصيل التي يختبرها الامتحان',
  intro:'مقدمة الوحدة', before:'قبل أن تبدأ', outcomes:'مخرجات التعلم', outcomesLead:'بنهاية هذه الوحدة، ستكون قادرًا على:', method:'طريقة الدراسة',
  lab:'التطبيق العملي', scenario:'السيناريو', steps:'خطوات الحل', traps:'فخاخ الامتحان', must:'ما يجب أن تتقنه',
  review:'تمارين ومراجعة الوحدة', reviewHint:'حاول الإجابة بنفسك أولًا، ثم افتح السؤال لترى الإجابة المشروحة.', answer:'الإجابة',
  mcqTitle:'أسئلة بنمط الامتحان', mcqHint:(n, total, href) => `اختر إجابة لترى الصحيحة وشرحها. هذه ${arDigits(n)} أسئلة من ${arDigits(total)} سؤالًا مخصصًا لهذه الوحدة في <a href="${href}">محاكي الامتحان</a>.`,
  explanation:'الشرح', summary:'خلاصة الوحدة',
  tocAria:'محتويات الصفحة', tocTitle:'في هذه الصفحة', doneLbl:'أنهيت هذه الوحدة', pagerAria:'التنقل بين الوحدات', prevUnit:'الوحدة السابقة', nextUnit:'الوحدة التالية',
  byline:(a, href) => `إعداد ${esc(a)} · <a href="${href}" download>المذكرة الشاملة PDF</a>`,
  unitLabel:(k, d) => `الوحدة ${k} · ${d}`, unitTitle:(k, t, s) => `الوحدة ${k}: ${t} — ${s}`,
  guideLabel:'دليل الامتحان', guideIntro:'فكرة المنصة',
  // glossary
  gEyebrow:'مرجع سريع', gTitle:'المسرد ثنائي اللغة', gAlt:'Bilingual Glossary', gAltLang:'en', gSearch:'ابحث في المسرد',
  gPlaceholder:'ابحث بالعربية أو الإنجليزية… مثل: الاستدعاء، RAG، PDPL', gCount: n => `${arDigits(n)} مصطلحًا`,
  gUnit: k => `يُشرح في الوحدة ${k}`, gEmpty:'لا يوجد مصطلح مطابق. جرّب كلمة أقصر.',
  // landing
  groups:[
    ['افهم وقرّر بالأرقام', ['استخراج المتطلبات الصارمة والمرنة من نص السيناريو قبل قراءة الخيارات.', 'حساب الكمون والسعة وعدد النسخ والتكلفة المتوقعة للعتبات.', 'اختيار المقياس الذي يناسب كلفة الخطأ، لا الدقة الكلية.']],
    ['ابنِ وشغّل', ['تصميم RAG يبقى حديثًا، وواجهات خدمة مرنة وآمنة.', 'اختيار استراتيجية النشر والمراقبة وإعادة التدريب المناسبة.', 'تحجيم الخدمة على وحدات المعالجة الرسومية داخل المملكة.']],
    ['احكم والتزم', ['تسمية مبدأ سدايا أو التزام نظام حماية البيانات المخالَف بدقة.', 'اكتشاف الهدر في فاتورة وتقديم البديل الأرخص الكافي.', 'الوصول إلى قرار متكامل في دراسات حالة من بيئة العمل السعودية.']],
  ],
  heroEyebrow: a => `منصة تحضير من ${esc(a)}`,
  heroH1:'الامتحان لا يسأل عن التعريف.<br>يسأل عن القرار الصحيح تحت القيد.',
  heroMeta: n => ['وحدة تمهيدية للمبتدئين + ١٢ وحدة تغطي المحاور السبعة','شرح مبسط وتعريفات قبل التفاصيل في كل قسم','سيناريو تطبيقي وأسئلة في كل وحدة',`محاكي بـ${arDigits(n)} سؤال`],
  valuesH2:'من قراءة السيناريو إلى اختيار الحل الكافي الأرخص.',
  unitsH2:'ابدأ من الصفر، ثم اثنتا عشرة وحدة على محاور الامتحان.',
  unitsSub:'كل قسم يبدأ بالفكرة ببساطة ومثال من الواقع وتعريفات مصطلحاته، ثم التفاصيل التي يختبرها الامتحان. وفي آخر كل وحدة سيناريو تطبيقي وفخاخ الامتحان وأسئلة بإجابات مشروحة.',
  doneBadge:'مكتملة', tourH2:'جولة في المنصة', tourSub:'شغّل العرض أو تنقّل بين المشاهد بالسرعة التي تناسبك.',
  tourCount: a => `تمهيد + ١٢ وحدة · ${esc(a)}`, tabsAria:'أجزاء الجولة', prev:'السابق', next:'التالي', prevGlyph:'›', nextGlyph:'‹', pause:'إيقاف',
  assessH2:'سبعة محاور، وكل محور له وحدته.',
  assessNote:'الأوزان تطابق مخططًا من ١٥٠ سؤالًا. المحاور ٣ و٤ و٥ معًا ٤٤٫٧٪، وجزء كبير من المحور ٦ تشغيلي أيضًا. الوحدتان ٠١ و١٢ تخدمان كل المحاور.',
  simH3:'محاكي الامتحان', simP: n => `${arDigits(n)} سؤال اختيار من متعدد بالعربية والإنجليزية، كلها راجعناها، وموزعة على المحاور السبعة بأوزانها الرسمية وبمستويات صعوبة مختلفة. كل سؤال معه شرح للإجابة الصحيحة وسبب استبعاد كل خيار.`, simLink:'افتح المحاكي',
  guideH3:'دليل الامتحان', guideP:'شكل الامتحان، وأنماط الأسئلة الأربعة، وعائلات المشتتات، وإدارة الوقت بثلاث جولات، وخطة مذاكرة حسب الأيام المتبقية.', guideLink:'اقرأ الدليل',
  closingH2:'لا تكتفِ بالقراءة. حلّ السيناريو.',
  closingP:'إن كنت مبتدئًا فابدأ بالوحدة التمهيدية 00. اقرأ في كل قسم «الفكرة ببساطة» والتعريفات أولًا، ثم التفاصيل. اقرأ الوحدات بالترتيب، ثم غطِّ القرار في السيناريو التطبيقي وأعد بناءه من المتطلبات. بعدها افتح أسئلة نمط الامتحان، ولا تنتقل حتى تعرف لماذا سقط كل خيار خاطئ.',
  closingSmall:'هذه مادة تحضيرية وليست منهجًا رسميًا صادرًا عن سدايا. ما يخص بنية الامتحان مصدره تقارير المختبَرين، فتحقّق منه في بوابة أذكى X قبل التقديم.',
  downloads:(m, s) => `تفضّل القراءة في PDF؟ <a href="${m}" download>نزّل المذكرة الشاملة</a> أو <a href="${s}" download>مذكرة السيناريوهات</a>.`,
  // tour scenes
  sc:{
    ch:'المنصة', cover:'الغلاف', coverEyebrow:'منصة تحضير · تمهيد + ١٢ وحدة · ٧ محاور', coverH1:'الامتحان لا يسأل عن التعريف. يسأل عن <mark>القرار الصحيح</mark>.',
    measured:'ما يُقاس', measuredH2:'المفاضلة بين حلّين معقولين بـ<mark>أربعة قيود معًا</mark>.',
    steps:[['التكلفة','الحل الكافي الأرخص.'],['الكمون','p95 و p99 ومهلة الاستجابة.'],['الدقة','المقياس الذي يناسب كلفة الخطأ.'],['الامتثال','نظام حماية البيانات ومبادئ سدايا.']],
    patterns:'أنماط الأسئلة', patternsH2:'أربعة أنماط تتكرر في معظم الأسئلة.',
    cards:[['الأكبر','مشكلة ← أنسب حل'],['الأصعب','مطابقة المتطلبات بالمواصفات'],['متكرر','تحليل التكاليف والحوكمة']],
    patternsLead:'الوحدة الأولى تعلّمك إجراءً واحدًا تطبّقه على كل سؤال.',
    weights:'أوزان المحاور', weightsH2:'الكتلة <mark>التشغيلية</mark> أثقل مما تتوقع.',
    unitEyebrow: u => `الوحدة <span class="unum">${pad2(u.num)}</span> · <span dir="ltr">${esc(u.english)}</span>`,
    day:'يوم الامتحان', dayH2:'سيناريو طويل، اختيار من متعدد', dayNum:'١٤٠<span>–</span>١٥٠',
    time:'إدارة الوقت', passes:'ثلاث جولات', passesH2:'ثلاث جولات، لا جولة واحدة.',
    passList:[[60,'الجولة الأولى: كل ما يُحسم في ٩٠ ثانية'],[30,'الجولة الثانية: جداول المطابقة والتكاليف'],[10,'الجولة الثالثة: المعلَّم فقط']],
    distr:'المشتتات', distrEyebrow:'عائلات المشتتات', distrH2:'الخيار الأكبر ليس الخيار الأصح.', distrLab:'مشتت', rightLab:'الصحيح',
    distr1:'أعد التدريب، أو استخدم نموذجًا أكبر ووحدات معالجة أكثر', distr2:'حل صحيح تقنيًا لكنه يخالف نظام حماية البيانات',
    right:'السبب الجذري أولًا، ثم <mark>أقل حل كافٍ</mark> يحقق كل المتطلبات الصارمة',
    sum:'الخلاصة', sumH2:'سؤال مراجَع في المحاكي، موزعة على المحاور بأوزانها.',
  },
},
en: {
  lang:'en', dir:'ltr', other:'ar', otherName:'العربية',
  series:'Preparing for the SDAIA Expert AI Engineer Badge', author:'Mohamed Elmubarak',
  num: String, arrow:'↗', letters:'ABCD',
  diff:{easy:'Easy', medium:'Medium', hard:'Hard', very_hard:'Very hard'},
  fonts:'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500&family=IBM+Plex+Sans:wght@400;600;700&family=IBM+Plex+Sans+Arabic:wght@400;600&family=Source+Serif+4:opsz,wght@8..60,600;8..60,700&display=swap',
  start0:'Start from zero', start1:'Start Unit 01',
  nav:['Units','Platform tour','Exam guide','Glossary','Simulator'], navAria:'Main menu', menu:'Menu', skip:'Skip to content',
  logo:'Expert AI Engineer Badge', rights: a => `© 2026 ${esc(a)}. All rights reserved.`,
  domains:['Data, ML Foundations & Model Evaluation','Core AI, Deep Learning & Generative AI','AI Software Engineering & Integration','MLOps, LLMOps, Deployment & Reliability','Architecture, Infrastructure, Performance & Scalability','Responsible AI, Security & Governance','Business, Professional Practice & Collaboration'],
  domainN: n => `Domain ${n}`, domainNd: n => `Domain ${n}`, pct: w => `${w.toFixed(1)}%`,
  parts:[['Primer','For beginners: data, models, metrics, language models and systems, from zero.'],['Method','The answering procedure, requirement extraction, and latency, capacity and cost calculations.'],['Data & Models','From splits, metrics and drift to transformers, agents and the evaluation of generative models.'],['Engineering & Operations','RAG and integration, then deployment and monitoring, then infrastructure and scaling.'],['Responsibility & Decisions','Security, Saudi governance, business and costs, then the case studies.']],
  partN: n => `Part ${n}`,
  unitN: k => `Unit ${k}`, chapterN: i => `Chapter ${i + 1}`,
  simple:'In Plain Terms', example:'Real-World Example', terms:'Key Terms', deep:'What the Exam Tests',
  intro:'Unit Introduction', before:'Before You Start', outcomes:'Learning Outcomes', outcomesLead:'By the end of this unit, you will be able to:', method:'How to Study This Unit',
  lab:'Applied Scenario', scenario:'The Scenario', steps:'Solution Steps', traps:'Exam Traps', must:'What You Must Master',
  review:'Exercises & Unit Review', reviewHint:'Try to answer on your own first, then open the question to see the worked answer.', answer:'Answer',
  mcqTitle:'Exam-Style Questions', mcqHint:(n, total, href) => `Choose an answer to see the correct one and its explanation. These ${n} questions are drawn from the ${total} questions assigned to this unit in the <a href="${href}">exam simulator</a>.`,
  explanation:'Explanation', summary:'Unit Summary',
  tocAria:'Page contents', tocTitle:'On this page', doneLbl:'Mark unit as completed', pagerAria:'Unit navigation', prevUnit:'Previous unit', nextUnit:'Next unit',
  byline:(a, href) => `By ${esc(a)} · <a href="${href}" download>Comprehensive memo (PDF)</a>`,
  unitLabel:(k, d) => `Unit ${k} · ${d}`, unitTitle:(k, t, s) => `Unit ${k}: ${t} — ${s}`,
  guideLabel:'Exam Guide', guideIntro:'About the Platform',
  gEyebrow:'Quick reference', gTitle:'Bilingual Glossary', gAlt:'المسرد ثنائي اللغة', gAltLang:'ar', gSearch:'Search the glossary',
  gPlaceholder:'Search in English or Arabic… e.g. recall, RAG, PDPL', gCount: n => `${n} terms`,
  gUnit: k => `Explained in Unit ${k}`, gEmpty:'No matching term. Try a shorter word.',
  groups:[
    ['Understand and decide with numbers', ['Extract the hard and soft requirements from the scenario text before reading the options.', 'Calculate latency, capacity, replica count and the expected cost of a threshold.', 'Choose the metric that fits the cost of error, not overall accuracy.']],
    ['Build and operate', ['Design RAG that stays fresh, and serving interfaces that are resilient and secure.', 'Choose the right deployment, monitoring and retraining strategy.', 'Scale a service on GPUs inside the Kingdom.']],
    ['Govern and comply', ['Name precisely the SDAIA principle or PDPL obligation that was violated.', 'Spot the waste in a bill and propose the cheapest sufficient alternative.', 'Reach an integrated decision in case studies drawn from the Saudi workplace.']],
  ],
  heroEyebrow: a => `A prep platform by ${esc(a)}`,
  heroH1:'The exam does not ask for the definition.<br>It asks for the right decision under constraints.',
  heroMeta: n => ['A beginner primer + 12 units covering all seven domains','A plain-language explanation and definitions before the detail, in every section','An applied scenario and questions in every unit',`A ${n}-question simulator`],
  valuesH2:'From reading the scenario to choosing the cheapest sufficient solution.',
  unitsH2:'Start from zero, then twelve units across the exam domains.',
  unitsSub:'Every section opens with the idea in plain terms, a real-world example and the definitions of its terms, then the detail the exam tests. Every unit ends with an applied scenario, the exam traps, and questions with worked answers.',
  doneBadge:'Completed', tourH2:'Platform tour', tourSub:'Play the tour, or move between scenes at your own pace.',
  tourCount: a => `Primer + 12 units · ${esc(a)}`, tabsAria:'Tour parts', prev:'Previous', next:'Next', prevGlyph:'‹', nextGlyph:'›', pause:'Pause',
  assessH2:'Seven domains, each with its own units.',
  assessNote:'The weights fit a 150-question blueprint. Domains 3, 4 and 5 together account for 44.7%, and much of Domain 6 is operational too. Units 01 and 12 serve every domain.',
  simH3:'Exam simulator', simP: n => `${n} multiple-choice questions in Arabic and English, all reviewed and distributed across the seven domains by their official weights, at varying levels of difficulty. Every question comes with an explanation of the correct answer and of why each option is ruled out.`, simLink:'Open the simulator',
  guideH3:'Exam guide', guideP:'The exam format, the four question patterns, the distractor families, time management in three passes, and a study plan based on the days you have left.', guideLink:'Read the guide',
  closingH2:'Don’t just read. Solve the scenario.',
  closingP:'If you are a beginner, start with the primer, Unit 00. In every section, read “In Plain Terms” and the definitions first, then the detail. Work through the units in order, then cover the decision in the applied scenario and rebuild it from the requirements. After that, open the exam-style questions, and do not move on until you know why each wrong option fails.',
  closingSmall:'This is preparation material, not an official curriculum issued by SDAIA. Information on the exam structure comes from candidates’ reports, so verify it on the official SDAIA badge portal before you apply.',
  downloads:(m, s) => `Prefer reading a PDF? <a href="${m}" download>Download the comprehensive memo</a> or <a href="${s}" download>the scenarios memo</a> (both bilingual).`,
  sc:{
    ch:'Platform', cover:'Cover', coverEyebrow:'Prep platform · Primer + 12 units · 7 domains', coverH1:'The exam does not ask for the definition. It asks for <mark>the right decision</mark>.',
    measured:'What is measured', measuredH2:'Choosing between two reasonable solutions under <mark>four constraints at once</mark>.',
    steps:[['Cost','The cheapest sufficient solution.'],['Latency','p95, p99 and the response timeout.'],['Accuracy','The metric that fits the cost of error.'],['Compliance','The PDPL and SDAIA’s principles.']],
    patterns:'Question patterns', patternsH2:'Four patterns recur across most questions.',
    cards:[['Largest','Problem → best fix'],['Hardest','Matching requirements to specs'],['Recurring','Cost analysis & governance']],
    patternsLead:'Unit 01 teaches you one procedure to apply to every question.',
    weights:'Domain weights', weightsH2:'The <mark>operational</mark> block is heavier than you expect.',
    unitEyebrow: u => `Unit <span class="unum">${pad2(u.num)}</span>`,
    day:'Exam day', dayH2:'Long scenarios, multiple choice', dayNum:'140<span>–</span>150',
    time:'Time management', passes:'Three passes', passesH2:'Three passes, not one.',
    passList:[[60,'Pass 1: everything you can decide in 90 seconds'],[30,'Pass 2: spec-matching tables and costs'],[10,'Pass 3: flagged items only']],
    distr:'Distractors', distrEyebrow:'Distractor families', distrH2:'The biggest option is not the right one.', distrLab:'Distractor', rightLab:'Correct',
    distr1:'Retrain, or use a bigger model and more GPUs', distr2:'A technically correct solution that violates the PDPL',
    right:'Root cause first, then the <mark>minimal sufficient solution</mark> that meets every hard requirement',
    sum:'Summary', sumH2:'reviewed questions in the simulator, distributed across the domains by weight.',
  },
},
};

/* ================= load content ================= */

const readJson = f => JSON.parse(fs.readFileSync(f, 'utf8'));
function loadContent(dir){
  const guide = readJson(path.join(dir, 'guide.json'));
  const gf = path.join(dir, 'glossary.json');
  const glossary = fs.existsSync(gf) ? readJson(gf) : {intro:'', terms:[]};
  const units = fs.readdirSync(path.join(dir, 'units')).filter(f => /^\d\d\.json$/.test(f)).sort().map(f => {
    const u = readJson(path.join(dir, 'units', f));
    u.key = f.slice(0, 2); u.num = +u.key;
    // beginner layer (content/beginner/NN.json, see content/BEGINNER_SPEC.md)
    const bf = path.join(dir, 'beginner', f);
    u.beginner = fs.existsSync(bf) ? readJson(bf) : null;
    return u;
  });
  return {guide, glossary, units};
}

/* ================= one edition ================= */

function edition(t, C, outDir, otherPrefix){
  const {guide, glossary, units} = C;
  const FIRST = units[0];
  const START = FIRST.num === 0 ? t.start0 : t.start1;
  const N = t.num;
  const AUTHOR = t.author, SERIES = t.series;
  const DOMAINS = DOMAIN_W.map((d, k) => ({...d, name:t.domains[k]}));
  const PARTS = PART_RANGES.map(([from, to], k) => ({from, to, name:t.parts[k][0], line:t.parts[k][1]}));
  const unitChapters = u => u.chapters.map(c => c.title);
  const termName = x => t.lang === 'ar' ? x.ar : x.en;     // primary name of a bilingual term
  const termAlt = x => t.lang === 'ar' ? x.en : x.ar;
  const altAttrs = t.lang === 'ar' ? 'dir="ltr"' : 'lang="ar" dir="rtl"';

  function mcqHtml(qs, L){
    return `<ol class="mcq">${qs.map((q, k) => `<li class="mq" data-answer="${q.answer}">
  <p class="mq-meta"><span class="qn">${k+1}</span><span>${esc(q.topic[L])}</span><em>${t.diff[q.difficulty] || ''}</em></p>
  <p class="mq-stem">${inline(q.stem[L])}</p>
  ${q.table ? table([q.table.headers[L], ...q.table.rows[L]]) : ''}
  <div class="opts">${q.options.map((o, j) => `<button type="button" class="opt" data-i="${j}"><span class="ol">${t.letters[j]}</span><span>${inline(o[L])}</span></button>`).join('')}</div>
  <div class="mq-exp" hidden><span class="tag">${t.explanation}</span><p>${inline(q.explanation[L])}</p></div>
</li>`).join('\n')}</ol>`;
  }

  // plain-language explanation, example and definitions shown before a section's exam detail
  function simpleLayer(b){
    if (!b) return '';
    return `<div class="simple"><span class="tag">${t.simple}</span>${b.simple.map(p => `<p>${inline(p)}</p>`).join('')}</div>
${b.example ? `<div class="example"><span class="tag">${t.example}</span><p>${inline(b.example)}</p></div>` : ''}
${b.terms && b.terms.length ? `<div class="terms"><span class="tag">${t.terms}</span><dl>${b.terms.map(x => `<div><dt><b>${inline(termName(x))}</b><span ${altAttrs}>${esc(termAlt(x))}</span></dt><dd>${inline(x.def)}</dd></div>`).join('')}</dl></div>` : ''}
<p class="deep-label"><span>${t.deep}</span></p>
`;
  }

  // unit json -> reader sections (same sequence as the reference course)
  function unitSections(u){
    const S = [];
    const add = s => { s.id = 's' + (S.length + 1); S.push(s); return s; };
    const B = u.beginner;
    add({kind:'intro', title:t.intro, subs:[], html:
      `<p>${inline(u.intro)}</p>
${B && B.before ? `<div class="simple before"><span class="tag">${t.before}</span>${B.before.map(p => `<p>${inline(p)}</p>`).join('')}</div>` : ''}
<div class="outcomes"><h3>${t.outcomes}</h3><p>${t.outcomesLead}</p>
<ul class="checks">${u.outcomes.map(x => `<li>${inline(x)}</li>`).join('')}</ul>
</div>
<h3 id="s1-1">${t.method}</h3>
<p>${inline(u.method)}</p>
`});
    u.chapters.forEach((c, ci) => {
      const s = add({kind:'chapter', label:t.chapterN(ci), title:c.title, subs:[]});
      s.html = c.sections.map((x, k) => {
        const id = `${s.id}-${k+1}`;
        s.subs.push({id, title:x.title});
        const num = x.title.match(/^(\d+\.\d+)/)[1];
        return `<h3 id="${id}">${inline(x.title)}</h3>\n` + simpleLayer(B && B.sections[num]) + blocks(x.blocks);
      }).join('');
    });
    const L = u.lab;
    add({kind:'lab', title:t.lab, subs:[], html:
      `<p>${inline(L.purpose)}</p>
<h3>${t.scenario}</h3>
${L.scenario.map(p => `<p>${inline(p)}</p>`).join('\n')}
<h3>${t.steps}</h3>
<ol>${L.steps.map(x => `<li>${inline(x)}</li>`).join('')}</ol>
<div class="safety"><h3>${t.traps}</h3><ul>${L.traps.map(x => `<li>${inline(x)}</li>`).join('')}</ul>
</div>
<div class="deliverable"><span class="tag">${t.must}</span><p>${inline(L.deliverable)}</p>
</div>
`});
    const {picked, total} = pickQuestions(u.num);
    const review = add({kind:'review', title:t.review, subs:[]});
    review.html = `<p class="qa-hint">${t.reviewHint}</p>
<ol class="qa">${u.review.map((q, k) => `<li><details><summary><span class="qn">${k+1}</span><span class="qt">${inline(q.q)}</span><span class="plus" aria-hidden="true"></span></summary><div class="ans"><span class="tag">${t.answer}</span><p>${inline(q.a)}</p></div></details></li>`).join('\n')}</ol>
` + (picked.length ? `<h3 id="${review.id}-mcq">${t.mcqTitle}</h3>
<p class="qa-hint">${t.mcqHint(picked.length, total, SIM('../'))}</p>
${mcqHtml(picked, t.lang)}
` : '');
    add({kind:'summary', title:t.summary, subs:[], html:`<p>${inline(u.summary)}</p>\n`});
    return S;
  }

  /* ---------- page shell ---------- */
  // base = this edition's root (relative), abase = shared site root (assets, fonts, downloads, simulator)
  const ABASE = base => otherPrefix ? base : base + '../';         // English pages live one level down
  const SIM = base => base + 'simulator.html';   // site/simulator.html and site/en/simulator.html (tools/build-sim-en.js)
  const dl = (f, base) => `${ABASE(base)}downloads/${encodeURIComponent(f)}`;

  function page({rel, title, desc, base, body, active, playerCss = false, playerJs = false, bodyClass = ''}){
    const abase = ABASE(base);
    const nav = [['index.html#units',t.nav[0],'units'],['index.html#tour',t.nav[1],'tour'],['guide.html',t.nav[2],'guide'],['glossary.html',t.nav[3],'glossary']];
    const altHref = t.lang === 'ar' ? `${base}en/${rel}` : `${abase}${rel}`;
    const arHref = t.lang === 'ar' ? rel : rel, enHref = 'en/' + rel;
    const sw = `<a class="lang-switch" href="${altHref}" hreflang="${t.other}" lang="${t.other}">${t.otherName}</a>`;
    return `<!doctype html>
<html lang="${t.lang}" dir="${t.dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="alternate" hreflang="ar" href="${abase}${arHref}">
<link rel="alternate" hreflang="en" href="${abase}${enHref}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${abase}fonts/thmanyah.css" rel="stylesheet">
<link href="${t.fonts}" rel="stylesheet">
<link href="${abase}assets/site.css" rel="stylesheet">
<link href="${abase}assets/exam.css" rel="stylesheet">
${playerCss ? `<link href="${abase}assets/player.css" rel="stylesheet">\n` : ''}</head>
<body class="${bodyClass}">
<a class="skip" href="#main">${t.skip}</a>
<header class="site-head"><div class="in">
  <a class="logo rv" href="${base}index.html">${t.logo}<small>SDAIA · EXPERT AI ENGINEER</small></a>
  <nav class="nav rv" style="--rd:.4s" id="nav" aria-label="${t.navAria}">
    ${nav.map(([h,x,k]) => `<a href="${base}${h}"${k===active?' aria-current="page"':''}>${x}</a>`).join('')}<a href="${SIM(base)}"${active==='sim'?' aria-current="page"':''}>${t.nav[4]}</a>
    ${sw}
    <a class="pill-outline nav-pill" href="${base}units/${FIRST.key}.html">${START}</a>
  </nav>
  <a class="pill-outline rv head-pill" style="--rd:.4s" href="${base}units/${FIRST.key}.html">${START}</a>
  <button class="menu-btn" id="menuBtn" aria-expanded="false" aria-controls="nav" aria-label="${t.menu}"><i></i><i></i></button>
</div></header>
<main id="main">
${body}
</main>
<footer class="site-foot">
  <b>${esc(AUTHOR)}</b>
  <p>${esc(SERIES)}</p>
  <small>${t.rights(AUTHOR)}</small>
</footer>
<script src="${abase}assets/site.js"></script>
${playerJs ? `<script src="${abase}assets/player.js"></script>\n` : ''}</body>
</html>
`;
  }

  const arrow = `<i aria-hidden="true">${t.arrow}</i>`;

  /* ---------- landing page ---------- */
  function scenesHtml(){
    const sc = t.sc;
    let s = `
      <section class="scene chap" data-ch="${sc.ch}" data-dur="8000" data-label="${sc.cover}">
        <p class="eyebrow a" style="--d:.3s">${sc.coverEyebrow}</p>
        <h1 class="a" style="--d:.5s">${sc.coverH1}</h1>
        <p class="lead a" style="--d:1.2s">${esc(stripBold(guide.about).split('. ')[0])}.</p>
      </section>

      <section class="scene" data-ch="${sc.ch}" data-dur="10000" data-label="${sc.measured}">
        <div class="head"><p class="eyebrow a" style="--d:.1s">${sc.measured}</p><h2 class="a" style="--d:.25s">${sc.measuredH2}</h2></div>
        <ol class="steps">
${sc.steps.map(([b, sm], k) => `          <li class="a" style="--d:${['.8s','1.9s','3s','4.1s'][k]}"><span class="num">${k+1}</span><b>${b}</b><small>${sm}</small></li>`).join('\n')}
        </ol>
      </section>

      <section class="scene" data-ch="${sc.ch}" data-dur="9000" data-label="${sc.patterns}">
        <div class="head"><p class="eyebrow a" style="--d:.1s">${sc.patterns}</p><h2 class="a" style="--d:.25s">${sc.patternsH2}</h2></div>
        <div class="grid g3">
          <div class="card a" style="--d:.8s"><span class="tagline">${sc.cards[0][0]}</span><h3>${sc.cards[0][1]}</h3></div>
          <div class="card hi a pop" style="--d:1.8s"><span class="tagline">${sc.cards[1][0]}</span><h3>${sc.cards[1][1]}</h3></div>
          <div class="card a" style="--d:2.8s"><span class="tagline">${sc.cards[2][0]}</span><h3>${sc.cards[2][1]}</h3></div>
        </div>
        <p class="lead a" style="--d:4s">${sc.patternsLead}</p>
      </section>

      <section class="scene" data-ch="${sc.ch}" data-dur="12000" data-label="${sc.weights}">
        <div class="head"><p class="eyebrow a" style="--d:.1s">${sc.weights}</p><h2 class="a" style="--d:.25s">${sc.weightsH2}</h2></div>
        <div class="weights">
          ${DOMAINS.slice().sort((a, b) => b.w - a.w).slice(0, 4).map((d, k) => `<div class="w a" style="--d:${(.8 + k * 1.1).toFixed(1)}s;--p:${Math.round(d.w * 5)}"><b><span data-from="0" data-to="${Math.round(d.w)}" data-at="${800 + k * 1100}" data-ms="1200">0</span>%</b><i><u></u></i><small>${t.domainN(d.n)} · ${esc(d.name)}</small></div>`).join('\n          ')}
        </div>
      </section>
`;
    PARTS.forEach((p, pi) => {
      const us = units.filter(u => u.num >= p.from && u.num <= p.to);
      s += `
      <section class="scene chap" data-ch="${p.name}" data-dur="6000" data-label="${t.partN(pi+1)}">
        <p class="daynum a pop" style="--d:.2s">${t.partN(`<span>${pi+1}</span>`)}</p>
        <h2 class="a" style="--d:.8s">${esc(p.name)}</h2>
        <p class="lead a" style="--d:1.2s">${esc(p.line)}</p>
        <div class="pillars a" style="--d:1.8s">${us.map(u => `<span>${t.unitN(pad2(u.num))}</span>`).join('')}</div>
      </section>
`;
      for (const u of us){
        const chs = unitChapters(u).slice(0, 4);
        s += `
      <section class="scene" data-ch="${p.name}" data-dur="${8000 + chs.length * 900}" data-label="${esc(u.title)}">
        <div class="head"><p class="eyebrow a" style="--d:.1s">${sc.unitEyebrow(u)}</p><h2 class="a" style="--d:.25s">${esc(u.title)}</h2></div>
        <ol class="nlist">
          ${chs.map((c, k) => `<li class="a slide" style="--d:${(.8 + k * 1.1).toFixed(1)}s"><span class="n">${k+1}</span><span>${inline(stripBold(c))}</span></li>`).join('\n          ')}
        </ol>
        <div class="deliv a" style="--d:${(1 + chs.length * 1.1).toFixed(1)}s"><span class="lab">${inline(u.domain)}</span><p>${inline(stripBold(u.deliverable))}</p></div>
      </section>
`;
      }
    });
    s += `
      <section class="scene chap" data-ch="${sc.day}" data-dur="5500" data-label="${sc.day}">
        <p class="daynum a pop" style="--d:.2s">${sc.dayNum}</p>
        <h2 class="a" style="--d:.8s">${sc.dayH2}</h2>
      </section>

      <section class="scene" data-ch="${sc.day}" data-dur="10000" data-label="${sc.passes}">
        <div class="head"><p class="eyebrow a" style="--d:.1s">${sc.time}</p><h2 class="a" style="--d:.25s">${sc.passesH2}</h2></div>
        <div class="weights">
          ${sc.passList.map(([p, x], k) => `<div class="w a" style="--d:${(.8 + k * 1.1).toFixed(1)}s;--p:${p}"><b><span data-from="0" data-to="${p}" data-at="${800 + k * 1100}" data-ms="1200">0</span>%</b><i><u></u></i><small>${x}</small></div>`).join('\n          ')}
        </div>
      </section>

      <section class="scene" data-ch="${sc.day}" data-dur="10000" data-label="${sc.distr}">
        <div class="head"><p class="eyebrow a" style="--d:.1s">${sc.distrEyebrow}</p><h2 class="a" style="--d:.25s">${sc.distrH2}</h2></div>
        <div class="exrow weak a" style="--d:1s"><span class="lab">${sc.distrLab}</span><p><span class="strike" style="--s:2s">${sc.distr1}</span></p></div>
        <div class="exrow weak a" style="--d:2.6s"><span class="lab">${sc.distrLab}</span><p><span class="strike" style="--s:3.6s">${sc.distr2}</span></p></div>
        <div class="exrow strong a" style="--d:4.8s"><span class="lab">${sc.rightLab}</span><p>${sc.right}</p></div>
      </section>

      <section class="scene" data-ch="${sc.day}" data-dur="8000" data-label="${sc.sum}">
        <p class="eyebrow a" style="--d:.1s">${sc.sum}</p>
        <p class="big a pop" style="--d:.4s"><span data-from="0" data-to="${bank.length}" data-at="600" data-ms="1800">0</span></p>
        <h2 class="a" style="--d:1.4s">${sc.sumH2}</h2>
      </section>
`;
    return s;
  }

  function landing(){
    const body = `
<section class="hero"><div class="in">
  <p class="eyebrow-g rv">${t.heroEyebrow(AUTHOR)}</p>
  <h1 class="rv" style="--rd:.1s">${t.heroH1}</h1>
  <p class="lead rv" style="--rd:.2s">${inline(guide.about)}</p>
  <a class="cta rv" style="--rd:.3s" href="units/${FIRST.key}.html">${arrow}${START}</a>
  <p class="hero-meta rv" style="--rd:.4s">${t.heroMeta(bank.length).map(x => `<span>${x}</span>`).join('')}</p>
</div></section>

<section class="values"><div class="in">
  <h2 class="rv">${t.valuesH2}</h2>
  <p class="sub rv" style="--rd:.1s">${inline(guide.audience)}</p>
  <div class="cards">
    ${t.groups.map(([x, items], k) => `<article class="vcard rv" style="--rd:${(k+1)/10}s"><span class="vnum">${N(k+1)}</span><h3>${x}</h3><ul>${items.map(y => `<li>${inline(y)}</li>`).join('')}</ul></article>`).join('\n    ')}
  </div>
</div></section>

<section class="units" id="units"><div class="in">
  <div class="units-head">
    <div>
      <h2 class="rv">${t.unitsH2}</h2>
      <p class="sub rv" style="--rd:.1s">${t.unitsSub}</p>
    </div>
    <div class="progress rv" style="--rd:.2s" id="progress" hidden>
      <span id="progressText"></span><i><u id="progressBar"></u></i>
    </div>
  </div>
  <ol class="ledger">
    ${units.map(u => `<li class="rv" data-unit="${u.num}"><a href="units/${u.key}.html">
      <span class="lnum">${pad2(u.num)}</span>
      <span class="ltitle"><b>${esc(u.title)}</b><small ${t.lang === 'ar' ? 'dir="ltr"' : 'lang="ar" dir="rtl"'}>${esc(t.lang === 'ar' ? u.english : u.alt)}</small></span>
      <span class="ldel"><em>${inline(u.domain)}</em>${inline(u.deliverable)}</span>
      <span class="lgo"><span class="done-badge">${t.doneBadge}</span><i aria-hidden="true">${t.arrow}</i></span>
    </a></li>`).join('\n    ')}
  </ol>
</div></section>

<section class="band" id="tour"><div class="in">
  <h2 class="rv">${t.tourH2}</h2>
  <p class="sub rv" style="--rd:.1s">${t.tourSub}</p>
  <div class="player" dir="${t.dir}">
    <header class="topbar"><span class="mark" aria-hidden="true"></span><div><b>${esc(SERIES)}</b><a href="#units">${t.tourCount(AUTHOR)}</a></div></header>
    <nav class="tabs" id="tabs" aria-label="${t.tabsAria}"></nav>
    <div class="stage" id="stage" aria-live="polite">
      <div class="brandbug" aria-hidden="true">SDAIA · Expert AI Engineer</div>
${scenesHtml()}
    </div>
    <div class="bar-ui">
      <button class="btn" id="prev" aria-label="${t.prev}">${t.prevGlyph}</button>
      <button class="btn primary" id="play">${t.pause}</button>
      <button class="btn" id="next" aria-label="${t.next}">${t.nextGlyph}</button>
      <button class="btn" id="speed"></button>
      <div class="segs" id="segs"></div>
      <div class="now" id="now"></div>
    </div>
  </div>
</div></section>

<section class="assess" id="assessment"><div class="in">
  <h2 class="rv">${t.assessH2}</h2>
  <div class="weights-row domains">
    ${DOMAINS.map((d, k) => `<div class="wt rv" style="--rd:${k/20}s"><b>${t.pct(d.w)}</b><p><span class="dn">${t.domainNd(d.n)}</span>${esc(d.name)}</p><p class="du">${d.units.map(n => `<a href="units/${pad2(n)}.html">${t.unitN(pad2(n))}</a>`).join(' · ')}</p></div>`).join('\n    ')}
  </div>
  <p class="note rv">${t.assessNote}</p>

  <div class="two">
    <article class="rv">
      <h3>${t.simH3}</h3>
      <p>${t.simP(bank.length)}</p>
      <a class="text-link" href="${SIM('')}">${t.simLink}</a>
    </article>
    <article class="rv" style="--rd:.1s">
      <h3>${t.guideH3}</h3>
      <p>${t.guideP}</p>
      <a class="text-link" href="guide.html">${t.guideLink}</a>
    </article>
  </div>
</div></section>

<section class="closing"><div class="in">
  <h2 class="rv">${t.closingH2}</h2>
  <p class="rv" style="--rd:.1s">${t.closingP}</p>
  <p class="small rv" style="--rd:.2s">${t.closingSmall}</p>
  <div class="act rv" style="--rd:.25s"><a class="cta" href="units/${FIRST.key}.html">${arrow}${START}</a></div>
  <p class="downloads rv" style="--rd:.3s">${t.downloads(dl(MEMO, ''), dl(SCEN, ''))}</p>
</div></section>`;
    return page({rel:'index.html', title:`${SERIES} — ${AUTHOR}`, desc:stripBold(guide.about), base:'', body, playerCss:true, playerJs:true, active:'', bodyClass:'home'});
  }

  /* ---------- reader pages ---------- */
  function reader({meta, sections, base, prev, next, unitNum}){
    const toc = sections.filter(s => s.title).map(s => `<li><a href="#${s.id}">${s.label ? `<small>${esc(s.label)}</small>` : ''}${inline(s.title)}</a>${
      s.kind === 'chapter' && s.subs.length ? `<ol>${s.subs.map(x => `<li><a href="#${x.id}">${inline(x.title)}</a></li>`).join('')}</ol>` : ''}</li>`).join('\n');
    const secs = sections.map(s => {
      const head = s.kind === 'chapter'
        ? `<header class="chap-head"><span>${esc(s.label)}</span><h2>${inline(s.title)}</h2></header>`
        : s.title ? `<h2 class="sec-title">${esc(s.title)}</h2>` : '';
      return `<section id="${s.id}" class="sec sec-${s.kind}">${head}\n${s.html}</section>`;
    }).join('\n');
    const pn = (u, rel) => u ? `<a class="pn ${rel}" href="${u.key}.html"><small>${rel === 'prev' ? t.prevUnit : t.nextUnit}</small><b>${pad2(u.num)} · ${esc(u.title)}</b></a>` : '<span></span>';
    return `
<div class="read-bar" aria-hidden="true"><u id="readBar"></u></div>
<section class="unit-hero"><div class="in">
  <p class="eyebrow-g rv">${inline(meta.label)}</p>
  <h1 class="rv" style="--rd:.1s">${esc(meta.title)}</h1>
  <p class="en rv" ${t.lang === 'ar' ? 'dir="ltr"' : 'lang="ar" dir="rtl"'} style="--rd:.15s">${esc(meta.english)}</p>
  <p class="lead rv" style="--rd:.2s">${esc(meta.subtitle)}</p>
  <p class="byline rv" style="--rd:.25s">${t.byline(AUTHOR, dl(MEMO, base))}</p>
</div></section>

<div class="reader in">
  <aside class="toc" aria-label="${t.tocAria}">
    <div class="toc-inner">
      <p class="toc-title">${t.tocTitle}</p>
      <ol id="toc">${toc}</ol>
      ${unitNum ? `<button class="done-btn" id="doneBtn" data-unit="${unitNum}" aria-pressed="false"><span class="box" aria-hidden="true"></span><span class="lbl">${t.doneLbl}</span></button>` : ''}
    </div>
  </aside>
  <article class="prose">
${secs}
    ${unitNum ? `<nav class="pager" aria-label="${t.pagerAria}">${pn(prev, 'prev')}${pn(next, 'next')}</nav>` : ''}
  </article>
</div>`;
  }

  function unitPage(u, i){
    // the line under the title shows the other language's title
    const meta = {label:t.unitLabel(u.key, u.domain), title:u.title, english:t.lang === 'ar' ? u.english : u.alt, subtitle:u.subtitle};
    const body = reader({meta, sections:unitSections(u), base:'../', prev:units[i-1], next:units[i+1], unitNum:u.num});
    return page({rel:`units/${u.key}.html`, title:t.unitTitle(u.key, u.title, SERIES), desc:u.subtitle, base:'../', body, active:'units', bodyClass:'unit'});
  }

  function guidePage(){
    const sections = [{kind:'intro', title:t.guideIntro, subs:[], html:`<p>${inline(guide.about)}</p>\n<p>${inline(guide.audience)}</p>\n`}];
    guide.sections.forEach(s => sections.push({kind:'plain', title:s.title, subs:[], html:blocks(s.blocks)}));
    sections.forEach((s, k) => s.id = 's' + (k + 1));
    // the unit table's first column becomes links
    for (const s of sections) s.html = s.html.replace(/<tr><td>(\d\d)<\/td><td>([^<]+)<\/td>/g, (m, num, x) => `<tr><td>${num}</td><td><a href="units/${num}.html">${x}</a></td>`);
    const meta = {label:t.guideLabel, title:guide.title, english:t.lang === 'ar' ? guide.english : guide.alt, subtitle:guide.subtitle};
    const body = reader({meta, sections, base:''});
    return page({rel:'guide.html', title:`${guide.title} — ${SERIES}`, desc:guide.subtitle, base:'', body, active:'guide', bodyClass:'unit'});
  }

  function glossaryPage(){
    const seen = new Set(glossary.terms.map(x => x.en.toLowerCase().trim()));
    const rows = glossary.terms.slice();
    for (const u of units){
      const add = x => { const k = x.en.toLowerCase().trim(); if (!k || seen.has(k)) return; seen.add(k); rows.push({...x, unit:u.key}); };
      if (u.beginner) Object.values(u.beginner.sections).forEach(s => (s.terms || []).forEach(add));
    }
    const body = `
<section class="unit-hero"><div class="in">
  <p class="eyebrow-g rv">${t.gEyebrow}</p>
  <h1 class="rv" style="--rd:.1s">${t.gTitle}</h1>
  <p class="en rv" ${t.gAltLang === 'en' ? 'dir="ltr"' : 'lang="ar" dir="rtl"'} style="--rd:.15s">${t.gAlt}</p>
  <p class="lead rv" style="--rd:.2s">${inline(glossary.intro)}</p>
</div></section>
<section class="gloss"><div class="in">
  <div class="gsearch">
    <label for="q" class="sr">${t.gSearch}</label>
    <input id="q" type="search" placeholder="${t.gPlaceholder}" autocomplete="off">
    <span id="gcount" aria-live="polite">${t.gCount(rows.length)}</span>
  </div>
  <dl class="glist" id="glist">
    ${rows.map(r => `<div class="gi"><dt><b>${esc(termName(r))}</b><span ${altAttrs}>${esc(termAlt(r))}</span></dt><dd>${inline(stripBold(r.def))}</dd>${r.unit ? `<small class="gu"><a href="units/${r.unit}.html">${t.gUnit(r.unit)}</a></small>` : ''}</div>`).join('\n    ')}
  </dl>
  <p class="gempty" id="gempty" hidden>${t.gEmpty}</p>
</div></section>`;
    return page({rel:'glossary.html', title:`${t.gTitle} — ${SERIES}`, desc:glossary.intro, base:'', body, active:'glossary', bodyClass:'glossary'});
  }

  /* ---------- write ---------- */
  const write = (rel, html) => { fs.mkdirSync(path.dirname(path.join(outDir, rel)), {recursive:true}); fs.writeFileSync(path.join(outDir, rel), html); };
  write('index.html', landing());
  write('guide.html', guidePage());
  write('glossary.html', glossaryPage());
  units.forEach((u, i) => write(`units/${u.key}.html`, unitPage(u, i)));
  return {units, glossary};
}

/* ================= build both editions ================= */

const AR = loadContent(SRC);
const arRes = edition(T.ar, AR, OUT, true);
console.log(`[ar] built ${AR.units.length} units + index, guide, glossary (${AR.glossary.terms.length} terms)`);
for (const u of AR.units){
  const secs = u.chapters.reduce((n, c) => n + c.sections.length, 0);
  console.log(` ${u.key} ${u.title} — ${u.chapters.length} chapters, ${secs} sections, ${u.review.length} review, ${pickQuestions(u.num).picked.length} mcq; beginner ${u.beginner ? Object.keys(u.beginner.sections).length : '-'}/${secs}; coverage ${u.coverage.join(' ')}`);
  if (u.beginner){ const want = u.chapters.flatMap(c => c.sections.map(x => x.title.match(/^(\d+\.\d+)/)[1])); const miss = want.filter(k => !u.beginner.sections[k]); if (miss.length) console.log('   ! beginner layer missing:', miss.join(' ')); }
}

// English edition: only when every English file exists (validate first with tools/check-en.js)
const ENDIR = path.join(SRC, 'en');
const need = ['guide.json', 'glossary.json', ...AR.units.map(u => `units/${u.key}.json`), ...AR.units.filter(u => u.beginner).map(u => `beginner/${u.key}.json`)];
const missing = need.filter(f => !fs.existsSync(path.join(ENDIR, f)));
if (missing.length){
  console.log(`[en] skipped — ${missing.length} English file(s) missing: ${missing.join(', ')}`);
} else {
  const EN = loadContent(ENDIR);
  EN.units.forEach((u, i) => {
    const a = AR.units[i];
    u.alt = a.title;
    u.chapters.forEach((c, ci) => c.sections.forEach((x, k) => markFormulas(a.chapters[ci].sections[k].blocks, x.blocks)));
  });
  EN.guide.alt = AR.guide.title;
  EN.guide.sections.forEach((s, k) => markFormulas(AR.guide.sections[k].blocks, s.blocks));
  edition(T.en, EN, path.join(OUT, 'en'), false);
  console.log(`[en] built ${EN.units.length} units + index, guide, glossary (${EN.glossary.terms.length} terms) in site/en/`);
}
