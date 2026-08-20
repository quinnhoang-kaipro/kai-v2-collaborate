/* ════════════════════════════════════════════════════════════════════
   ARTIFACT 2 · TRACK-CHANGES CARDS · the annotations in the right margin
   One card per change, parked beside the line it annotates and stacked down
   the lane so two never overlap. Card visibility follows the playhead;
   positions are measured, so layoutCards() reruns on any width change.

   Part of the Artifact 2 tab, split across js/a2/*.js. These are plain
   top-level declarations sharing one script scope, same as the rest of
   the panel — no IIFE, so any module can call any other.
   ════════════════════════════════════════════════════════════════════ */
/* ── one margin card ── */
function cardHtml(t, ch){
  const ct = CT[ch.ct], ver = VER[ch.ver];
  const rowsHtml = ch.rows.map(r=>{
    if(r.add !== undefined){
      if(r.field === 'Line added'){
        return `<div class="a2-mc-change"><span class="a2-mc-add"><span class="a2-mc-badge is-added">Added</span>${a2Esc(r.add)}${r.wasAmount?` · <b>${a2Esc(r.wasAmount)}</b>`:''}</span></div>`;
      }
      return `<div class="a2-mc-change"><span class="a2-mc-field">${a2Esc(r.field)}</span><span class="a2-mc-add">${a2Esc(r.add)}</span></div>`;
    }
    if(r.remove !== undefined){
      return `<div class="a2-mc-change"><span class="a2-mc-remove"><span class="a2-mc-badge is-removed">Removed</span><span class="a2-strike">${a2Esc(r.remove)}</span></span></div>`;
    }
    const deltaTxt = r.delta ? ` <span class="a2-mc-new is-pos">(${a2Esc(r.delta)})</span>` : '';
    return `<div class="a2-mc-change"><span class="a2-mc-field">${a2Esc(r.field)}</span>
      <span class="a2-mc-old">${a2Esc(r.from)}</span><span class="a2-mc-arrow">→</span><span class="a2-mc-new ${r.delta?'is-pos':''}">${a2Esc(r.to)}</span>${deltaTxt}</div>`;
  }).join('');
  return `
    <div class="a2-mc-head">
      <span class="a2-mc-ct"><span class="a2-swatch"></span>${ct.label}</span>
      <span class="a2-mc-when">${a2Esc(ver.date)}</span>
    </div>
    <div class="a2-mc-task"><b>${a2Esc(t.name)}</b> <span class="a2-tid">· ${a2Esc(t.code)}</span></div>
    ${rowsHtml}
    <div class="a2-mc-who"><span class="a2-mc-av">${initials(ch.who)}</span><b>${a2Esc(ch.who)}</b> · ${a2Esc(ver.label)}<span class="a2-role">${a2Esc(ch.role)}</span></div>`;
}
function buildCards(){
  const lane = document.getElementById('a2Margin');
  if(!lane) return;
  lane.innerHTML = ''; CARDS = [];
  ORDERED.forEach(ch=>{
    const t = ch._task;
    const el = document.createElement('div');
    el.className = 'a2-card';
    el.style.setProperty('--mk', CT[ch.ct].color);
    el.innerHTML = cardHtml(t, ch);
    lane.appendChild(el);
    CARDS.push({el, code:t.code, ch});
    el.addEventListener('mouseenter', ()=>spotRow(t.code, true, el));
    el.addEventListener('mouseleave', ()=>spotRow(t.code, false, el));
  });
  applyCardVisibility();
}
/* A card shows once the playhead has passed its change; a changed line dims
   until then. */
function applyCardVisibility(){
  CARDS.forEach(c=> c.el.classList.toggle('is-hidden', c.ch._ord >= timeT));
  document.querySelectorAll('#a2Body tr[data-a2-code]').forEach(row=>{
    const t = findTask(row.dataset.a2Code); if(!t) return;
    const anyVis = t.changes.some(ch => ch._ord < timeT);
    row.classList.toggle('is-dim', t.changes.length > 0 && !anyVis);
  });
}

/* ── park each card beside the row it annotates, stacking down the lane so
   two cards never overlap. Offsets are rect deltas against the lane, so they
   hold at any scroll position (the standalone page added window.scrollY;
   here the cards live inside the scroller and move with it). ── */
function layoutCards(){
  const lane = document.getElementById('a2Margin');
  if(!lane) return;
  const laneTop = lane.getBoundingClientRect().top;
  const GAP = 12;
  const want = [];
  CARDS.forEach(c=>{
    if(c.el.classList.contains('is-hidden')) return;
    const row = document.querySelector(`#a2Body tr[data-a2-code="${c.code}"]`);
    if(!row) return;
    want.push({c, at: row.getBoundingClientRect().top - laneTop});
  });
  let cursor = 0;
  want.sort((a,b)=>a.at-b.at).forEach(item=>{
    const top = Math.max(item.at, cursor);
    item.c.el.style.top = top + 'px';
    cursor = top + item.c.el.offsetHeight + GAP;
  });
  // The lane is absolutely-positioned children only, so it has no height of
  // its own — give it one so a long card stack can't spill past the page.
  lane.style.minHeight = cursor ? cursor + 'px' : '';
  // EXPERIMENT (a2-expand.js): the photo lane is measured the same way, so it
  // has to settle whenever the card lane does.
  if(typeof layoutPhotos === 'function') layoutPhotos();
}

/* ── highlight the row a card points to, and vice versa ── */
function spotRow(code, on, cardEl){
  [`#a2Body tr[data-a2-code="${code}"]`, `#a2Body tr[data-a2-detail="${code}"]`].forEach(sel=>{
    const r = document.querySelector(sel);
    if(r) r.classList.toggle('is-spot', on);
  });
  if(cardEl) cardEl.classList.toggle('is-spot', on);
}
