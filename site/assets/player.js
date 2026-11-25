/* player: chapters -> scenes, rAF clock, speed, keyboard (RTL-mirrored arrows) */
(function(){
  const stage=document.getElementById('stage'); if(!stage) return;
  const EN=document.documentElement.lang==='en';
  const scenes=[...stage.querySelectorAll('.scene')];
  const segs=document.getElementById('segs'), now=document.getElementById('now'), tabs=document.getElementById('tabs'), playBtn=document.getElementById('play');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  let i=0,t=0,playing=false,full=reduced,last=null,segEls=[],curCh=null,userPaused=false;
  const chapters=[...new Set(scenes.map(s=>s.dataset.ch))];
  const tabEls=chapters.map(ch=>{
    const first=scenes.findIndex(s=>s.dataset.ch===ch), n=scenes.filter(s=>s.dataset.ch===ch).length;
    const b=document.createElement('button'); b.className='tab'; b.innerHTML=ch+'<small>'+n+'</small>';
    b.onclick=()=>show(first,!playing); tabs.appendChild(b); return b;
  });
  function buildSegs(ch){
    segs.innerHTML=''; segEls=[];
    scenes.forEach((s,k)=>{ if(s.dataset.ch!==ch) return;
      const b=document.createElement('button'); b.className='seg'; b.setAttribute('aria-label',(EN?'Scene ':'المشهد ')+(k+1)+': '+s.dataset.label);
      b.innerHTML='<i><b></b></i>'; b.onclick=()=>show(k,!playing); segs.appendChild(b); segEls.push([k,b.querySelector('b')]);
    });
  }
  function tickScene(ms){
    scenes[i].querySelectorAll('[data-from]').forEach(el=>{
      let p=Math.max(0,Math.min(1,(ms-+el.dataset.at)/+el.dataset.ms)); p=1-Math.pow(1-p,3);
      el.textContent=Math.round(+el.dataset.from+(+el.dataset.to-+el.dataset.from)*p);
    });
  }
  const SPEEDS=EN?[['Slow',2],['Normal',1.4],['Fast',1]]:[['بطيء',2],['عادي',1.4],['سريع',1]]; let sp=1;
  try{const v=localStorage.getItem('sdaia-speed'); if(v!==null&&SPEEDS[+v]) sp=+v}catch(e){}
  const speedBtn=document.getElementById('speed');
  const paintSpeed=()=>speedBtn.textContent=(EN?'Speed: ':'السرعة: ')+SPEEDS[sp][0];
  const dur=k=>+scenes[k].dataset.dur*SPEEDS[sp][1];
  speedBtn.onclick=()=>{const old=dur(i); sp=(sp+1)%SPEEDS.length; t=t*dur(i)/old; paintSpeed(); try{localStorage.setItem('sdaia-speed',sp)}catch(e){}};
  paintSpeed();
  function show(n,asFull){
    i=Math.max(0,Math.min(scenes.length-1,n)); t=0; full=!!asFull||reduced;
    scenes.forEach((s,k)=>{s.classList.remove('active','full'); s.setAttribute('aria-hidden',k!==i)});
    void stage.offsetWidth;
    scenes[i].classList.add('active'); if(full) scenes[i].classList.add('full');
    stage.classList.toggle('dark',scenes[i].classList.contains('chap'));
    const ch=scenes[i].dataset.ch; if(ch!==curCh){curCh=ch; buildSegs(ch)}
    tabEls.forEach((b,k)=>b.setAttribute('aria-current',chapters[k]===ch));
    tickScene(full?1e9:0); ui();
  }
  function setPlaying(p){
    playing=p; stage.classList.toggle('paused',!p);
    playBtn.textContent=p?(EN?'Pause':'إيقاف'):(i===scenes.length-1&&t>=dur(i)?(EN?'Replay':'إعادة'):(EN?'Play':'تشغيل'));
  }
  function ui(){
    segEls.forEach(([k,b])=>{b.style.width=(k<i?100:k>i?0:Math.min(100,(full&&!playing?100:t/dur(i)*100)))+'%'});
    now.innerHTML='<strong>'+String(i+1).padStart(2,'0')+'</strong><span class="t"> / '+scenes.length+'</span> · '+scenes[i].dataset.label;
  }
  function loop(ts){
    if(last==null) last=ts; const dt=Math.min(100,ts-last); last=ts;
    if(playing){ t+=dt;
      if(t>=dur(i)){ if(i<scenes.length-1) show(i+1,false); else { t=dur(i); setPlaying(false) } }
      if(!full) tickScene(t);
    }
    ui(); requestAnimationFrame(loop);
  }
  playBtn.onclick=()=>{
    if(!playing&&i===scenes.length-1&&t>=dur(i)){show(0,false);setPlaying(true);userPaused=false;return}
    userPaused=playing; setPlaying(!playing);
  };
  document.getElementById('prev').onclick=()=>show(i-1,!playing);
  document.getElementById('next').onclick=()=>show(i+1,!playing);
  document.addEventListener('keydown',e=>{
    if(!stage.closest('.player').contains(document.activeElement)) return;
    if(e.target.closest&&e.target.closest('button')&&(e.key===' '||e.key==='Enter')) return;
    if(e.key===' '){e.preventDefault(); playBtn.click()}
    if(e.key==='ArrowLeft') show(EN?i-1:i+1,!playing);
    if(e.key==='ArrowRight') show(EN?i+1:i-1,!playing);
  });
  // #tour-N opens scene N (1-based)
  const deep=(location.hash.match(/^#tour-(\d+)$/)||[])[1];
  show(deep?deep-1:0,reduced||!!deep); setPlaying(false); requestAnimationFrame(loop);
  if(deep) document.getElementById('tour').scrollIntoView();
  // play only while the player is on screen (it sits mid-page), unless the viewer paused it
  if(!reduced && 'IntersectionObserver' in window){
    let started=false;
    new IntersectionObserver(es=>es.forEach(e=>{
      if(e.isIntersecting){ if(!userPaused){ if(!started){started=true; if(!deep) show(0,false)} setPlaying(true) } }
      else if(playing) setPlaying(false);
    }),{threshold:.45}).observe(stage);
  }
})();
