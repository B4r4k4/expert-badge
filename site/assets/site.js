/* shell behaviour: reveal, mobile menu, unit progress, reading bar, TOC scrollspy, glossary search */
(function(){
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const KEY = 'sdaia-done';
  const getDone = () => { try { return JSON.parse(localStorage.getItem(KEY)) || [] } catch(e){ return [] } };
  const setDone = v => { try { localStorage.setItem(KEY, JSON.stringify(v)) } catch(e){} };
  const EN = document.documentElement.lang === 'en';
  const ar = n => EN ? String(n) : String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);

  /* reveal on scroll */
  const els = $$('.rv');
  if (!('IntersectionObserver' in window)) els.forEach(e => e.classList.add('on'));
  else {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting){ e.target.classList.add('on'); io.unobserve(e.target) } }), {threshold:.12});
    els.forEach(e => io.observe(e));
  }

  /* mobile menu */
  const btn = $('#menuBtn'), nav = $('#nav');
  if (btn) {
    const set = open => { nav.classList.toggle('open', open); btn.setAttribute('aria-expanded', open) };
    btn.onclick = () => set(!nav.classList.contains('open'));
    nav.addEventListener('click', e => { if (e.target.closest('a')) set(false) });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') set(false) });
  }

  /* landing: completed units */
  const ledger = $('.ledger');
  if (ledger) {
    const done = getDone(), rows = $$('li[data-unit]', ledger);
    rows.forEach(li => li.classList.toggle('done', done.includes(+li.dataset.unit)));
    if (done.length) {
      $('#progress').hidden = false;
      $('#progressText').textContent = EN ? `${done.length} of ${rows.length} units completed` : `أنهيت ${ar(done.length)} من ${ar(rows.length)} وحدة`;
      requestAnimationFrame(() => $('#progressBar').style.width = (done.length / rows.length * 100) + '%');
    }
  }

  /* unit: "I finished this unit" */
  const doneBtn = $('#doneBtn');
  if (doneBtn) {
    const u = +doneBtn.dataset.unit;
    const paint = () => { const on = getDone().includes(u); doneBtn.setAttribute('aria-pressed', on); $('.lbl', doneBtn).textContent = on ? (EN ? 'Unit completed' : 'أنهيت هذه الوحدة') : (EN ? 'Mark unit as completed' : 'علّم الوحدة كمكتملة') };
    doneBtn.onclick = () => { const d = getDone(); setDone(d.includes(u) ? d.filter(x => x !== u) : [...d, u]); paint() };
    paint();
  }

  /* reading progress */
  const bar = $('#readBar'), prose = $('.prose');
  if (bar && prose) {
    const upd = () => {
      const r = prose.getBoundingClientRect(), total = r.height - innerHeight;
      bar.style.width = Math.max(0, Math.min(100, (-r.top / Math.max(1, total)) * 100)) + '%';
    };
    addEventListener('scroll', upd, {passive:true}); upd();
  }

  /* TOC scrollspy */
  const toc = $('#toc');
  if (toc && 'IntersectionObserver' in window) {
    const links = $$('a', toc), byId = new Map(links.map(a => [a.getAttribute('href').slice(1), a]));
    const targets = [...byId.keys()].map(id => document.getElementById(id)).filter(Boolean);
    let current = null;
    const activate = id => {
      if (id === current) return; current = id;
      links.forEach(a => a.classList.remove('on'));
      $$('li.open', toc).forEach(li => li.classList.remove('open'));
      const a = byId.get(id); if (!a) return;
      a.classList.add('on');
      let li = a.closest('li'); while (li) { li.classList.add('open'); const top = li.parentElement.closest('li'); if (top) top.querySelector(':scope > a').classList.add('on'); li = top }
    };
    const spy = () => {
      let best = targets[0];
      for (const t of targets) { if (t.getBoundingClientRect().top < innerHeight * .3) best = t; else break }
      if (best) activate(best.id);
    };
    addEventListener('scroll', spy, {passive:true}); spy();
  }

  /* glossary search */
  const q = $('#q');
  if (q) {
    const items = $$('.gi').map(el => ({el, dd: $('dd', el), b: $('dt b', el), s: $('dt span', el),
      raw: [$('dt b', el).textContent, $('dt span', el).textContent, $('dd', el).textContent]}));
    const norm = s => s.toLowerCase().replace(/[ً-ْـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي');
    const escR = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escH = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;');
    const hl = (text, term) => { if (!term) return escH(text); const i = norm(text).indexOf(norm(term)); return i < 0 ? escH(text) : escH(text.slice(0, i)) + '<mark>' + escH(text.slice(i, i + term.length)) + '</mark>' + escH(text.slice(i + term.length)) };
    const run = () => {
      const term = q.value.trim(); let n = 0;
      for (const it of items) {
        const hit = !term || it.raw.some(r => norm(r).includes(norm(term)));
        it.el.hidden = !hit; if (hit) n++;
        it.b.innerHTML = hl(it.raw[0], term); it.s.innerHTML = hl(it.raw[1], term); it.dd.innerHTML = hl(it.raw[2], term);
      }
      $('#gcount').textContent = term ? (EN ? `${n} result${n === 1 ? '' : 's'}` : `${ar(n)} نتيجة`) : (EN ? `${items.length} terms` : `${ar(items.length)} مصطلحًا`);
      $('#gempty').hidden = n > 0;
    };
    q.addEventListener('input', run);
    const fromUrl = new URLSearchParams(location.search).get('q'); if (fromUrl) { q.value = fromUrl; run() }
  }
})();

/* exam-style questions: pick an option, reveal the key and the explanation */
document.querySelectorAll('.mq').forEach(q => {
  const ans = +q.dataset.answer, opts = [...q.querySelectorAll('.opt')];
  opts.forEach(b => b.addEventListener('click', () => {
    opts.forEach(o => { o.disabled = true; if (+o.dataset.i === ans) o.classList.add('right'); });
    if (+b.dataset.i !== ans) b.classList.add('wrong');
    q.querySelector('.mq-exp').hidden = false;
  }));
});
