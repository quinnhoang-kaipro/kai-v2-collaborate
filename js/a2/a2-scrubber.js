/* ════════════════════════════════════════════════════════════════════
   ARTIFACT 2 · SCRUBBER · the timeline bar pinned to the bottom
   Built once so a pointer-drag survives the re-render of everything else;
   only the dynamic bits update as the playhead moves. setT() is the single
   way the playhead moves — it repaints the doc, the cards and the bar.

   Part of the Artifact 2 tab, split across js/a2/*.js. These are plain
   top-level declarations sharing one script scope, same as the rest of
   the panel — no IIFE, so any module can call any other.
   ════════════════════════════════════════════════════════════════════ */
/* ════════════ SCRUBBER ════════════
   Built once so a pointer-drag survives the re-render of everything else;
   only the dynamic bits update as the playhead moves. */
function buildScrubber(){
  const N = ORDERED.length, denom = Math.max(1, N);
  const ticks = ORDERED.map((ch,i)=>
    `<div class="a2-tl-tick" data-m="${i+1}" style="left:${((i+1)/denom)*100}%;--mk:${CT[ch.ct].color}"></div>`
  ).join('');
  const segs = [{ver:'orig',m:0},{ver:'co1',m:1},{ver:'co2',m:C1+1}];
  const groups = segs.map((s,i)=>{
    const left = (s.m/denom)*100;
    const right = (i+1 < segs.length) ? (segs[i+1].m/denom)*100 : 100;
    const jump = s.ver==='orig' ? 0 : s.ver==='co1' ? C1 : N;
    return `<button class="a2-tl-group" type="button" data-ver="${s.ver}" style="left:${left}%;width:${Math.max(0,right-left)}%"
      onclick="a2SetT(${jump})" title="${a2Esc(VER[s.ver].label)} · ${a2Esc(VER[s.ver].date)}">${a2Esc(VER[s.ver].label)}</button>`;
  }).join('');
  document.getElementById('a2Scrub').innerHTML = `
    <div class="a2-tl-hdr">
      <span class="a2-tl-title">
        <span class="a2-steps">
          <button class="a2-step-btn" id="a2Prev" type="button" title="Step earlier"><svg viewBox="0 0 12 12"><path d="M7.5 2.5 4 6l3.5 3.5"/></svg></button>
          <button class="a2-step-btn" id="a2Next" type="button" title="Step later"><svg viewBox="0 0 12 12"><path d="M4.5 2.5 8 6l-3.5 3.5"/></svg></button>
        </span>
        Scrub through time
      </span>
      <span class="a2-tl-label" id="a2TlLabel"></span>
    </div>
    <div class="a2-tl-wrap" id="a2TlWrap">
      <div class="a2-tl-track">
        <div class="a2-tl-fill" id="a2TlFill"></div>
        ${ticks}
        <div class="a2-tl-thumb" id="a2TlThumb"></div>
      </div>
    </div>
    <div class="a2-tl-groups">${groups}</div>`;
  SREFS = {
    wrap:  document.getElementById('a2TlWrap'),
    fill:  document.getElementById('a2TlFill'),
    thumb: document.getElementById('a2TlThumb'),
    label: document.getElementById('a2TlLabel'),
    prev:  document.getElementById('a2Prev'),
    next:  document.getElementById('a2Next'),
    ticks: [...document.querySelectorAll('#a2Scrub .a2-tl-tick')],
    groups:[...document.querySelectorAll('#a2Scrub .a2-tl-group')],
  };
  SREFS.prev.onclick = ()=>setT(timeT-1);
  SREFS.next.onclick = ()=>setT(timeT+1);
  let dragging = false;
  const toM = clientX => {
    const r = SREFS.wrap.getBoundingClientRect();
    return Math.round(Math.max(0, Math.min(1, (clientX - r.left) / r.width)) * N);
  };
  SREFS.wrap.addEventListener('pointerdown', e=>{
    dragging = true;
    try{ SREFS.wrap.setPointerCapture(e.pointerId); }catch(_){}
    const m = toM(e.clientX); (m !== timeT) ? setT(m) : updateScrubber();
  });
  SREFS.wrap.addEventListener('pointermove', e=>{
    if(!dragging) return;
    const m = toM(e.clientX); if(m !== timeT) setT(m);
  });
  const end = e=>{ dragging = false; try{ SREFS.wrap.releasePointerCapture(e.pointerId); }catch(_){} };
  SREFS.wrap.addEventListener('pointerup', end);
  SREFS.wrap.addEventListener('pointercancel', end);
}
function updateScrubber(){
  if(!SREFS || !document.getElementById('a2TlWrap')) return;
  const N = ORDERED.length, pct = (timeT/Math.max(1,N))*100;
  SREFS.fill.style.width = pct + '%';
  SREFS.thumb.style.left = pct + '%';
  SREFS.ticks.forEach(tk=>{
    const m = +tk.dataset.m;
    tk.classList.toggle('is-revealed', m <= timeT);
    tk.classList.toggle('is-current', m === timeT);
  });
  const ver = asofVer();
  SREFS.groups.forEach(g=> g.classList.toggle('is-current', g.dataset.ver === ver));
  let dot, txt, date;
  if(timeT === 0){ dot='var(--t3)'; txt='Original scope — baseline'; date=VER.orig.date; }
  else {
    const ch = ORDERED[timeT-1];
    dot = CT[ch.ct].color;
    txt = `${VER[ch.ver].label} · ${ch._task.name} — ${CT[ch.ct].label.toLowerCase()}`;
    date = VER[ch.ver].date;
  }
  SREFS.label.innerHTML = `<span class="a2-cl-dot" style="--mk:${dot}"></span><span class="a2-cl-txt">${a2Esc(txt)}</span><span class="a2-cl-date">${a2Esc(date)}</span><span class="a2-tl-idx">${timeT} / ${N}</span>`;
  SREFS.prev.disabled = timeT <= 0;
  SREFS.next.disabled = timeT >= N;
}
/* Ring the version card the playhead currently sits in. */
function updateAsof(){
  const ver = asofVer();
  document.querySelectorAll('#a2Vers .hist-card').forEach(c=> c.classList.toggle('is-asof', c.dataset.ver === ver));
}

/* The single entry point for moving the playhead. */
function setT(v){
  if(!document.getElementById('a2Root')) return;
  timeT = Math.max(0, Math.min(ORDERED.length, v));
  renderDoc();
  buildCards();
  updateScrubber();
  updateAsof();
  requestAnimationFrame(layoutCards);
}
