// Builds site/en/simulator.html (English interface) from site/simulator.html (Arabic interface).
// The question bank is not translated here: it is already bilingual. The three JSON data blocks are copied
// byte-for-byte from the Arabic page into tools/simulator_en_shell.html (the English interface).
// Also adds the language links to both pages' top bars (idempotent).
// Usage: node tools/build-sim-en.js   (run after the simulator is regenerated or copied into site/)
const fs = require('fs'), path = require('path');
const SITE = path.join(__dirname, '..', 'site');
const AR = path.join(SITE, 'simulator.html'), EN = path.join(SITE, 'en', 'simulator.html');
const SHELL = path.join(__dirname, 'simulator_en_shell.html');

let ar = fs.readFileSync(AR, 'utf8');
let en = fs.readFileSync(SHELL, 'utf8');

const block = id => {
  const m = ar.match(new RegExp(`<script type="application/json" id="${id}">([\\s\\S]*?)</script>`));
  if (!m) throw new Error(`data block #${id} not found in site/simulator.html`);
  return m[1];
};
for (const [ph, id] of [['__BANK_DATA__', 'bank-data'], ['__REFS_DATA__', 'refs-data'], ['__BUILD_DATA__', 'build-data']]) {
  if (en.split(ph).length !== 2) throw new Error(`placeholder ${ph} must occur exactly once in the shell`);
  en = en.split(ph).join(block(id));          // split/join: no "$" substitution surprises
}

// language + site links in the (JS-rendered) top bar, after the tabs
const END = /<\/nav>(\r?\n)  <\/div><\/header>`;/g;
const link = (href, hreflang, text) => `<a class="btn sm" href="${href}" hreflang="${hreflang}" lang="${hreflang}" style="margin-inline-start:8px;text-decoration:none">${text}</a>`;
function addLinks(html, links, file){
  if (html.includes('data-lang-links')) return html;
  if ((html.match(END) || []).length !== 1) throw new Error(`top bar end marker not found exactly once in ${file}`);
  return html.replace(END, (m, nl) => `</nav>${nl}    <div class="row" data-lang-links>${links.replace(/\$/g, '$$$$')}</div>${nl}  </div></header>\`;`);
}
en = addLinks(en, link('index.html', 'en', 'Study site') + link('../simulator.html', 'ar', 'العربية'), 'English shell');
const arOut = addLinks(ar, link('index.html', 'ar', 'المنصة') + link('en/simulator.html', 'en', 'English'), 'site/simulator.html');

fs.mkdirSync(path.dirname(EN), {recursive: true});
fs.writeFileSync(EN, en);
if (arOut !== ar) fs.writeFileSync(AR, arOut);
console.log(`wrote site/en/simulator.html (${(en.length / 1e6).toFixed(2)} MB)${arOut !== ar ? '; added language links to site/simulator.html' : ''}`);
