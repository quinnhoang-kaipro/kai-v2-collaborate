/* ════════════════════════════════════════════════════════════════════
   ARTIFACT 2 · INLINE EXPAND  ·  EXPERIMENT
   Instead of navigating to the Editor tab, bring the Editor's content to the
   line: clicking a line name drops that task's Editor modules in underneath
   it and fades the rest of the document back, so you never lose your place
   in the change history.

   The Editor's task view is five pure functions of a task
   (_shopTaskHeaderHtml / _shopPhotoSectionHtml / _shopEditNotesHtml /
   _shopEditCardHtml / _shopTaskActivityHtml, all in js/editor.js). This
   reuses three of them verbatim — the header is skipped because the
   Artifact 2 row above already IS the header.

   THROWAWAY: this file plus a2-expand.css are the whole experiment. Delete
   both, drop their two tags from index.html, and revert the two small hooks
   in a2-document.js / a2-media.js to remove it.
   ════════════════════════════════════════════════════════════════════ */

let a2Expanded = null;   // the expanded line's code, or null

function a2ToggleExpand(code, ev){
  if(ev) ev.stopPropagation();
  a2Expanded = (a2Expanded === code) ? null : code;
  renderDoc();
  buildCards();
  requestAnimationFrame(layoutCards);
  // Bring the opened block into view — it can be taller than the viewport,
  // so align its top rather than centring it.
  if(a2Expanded){
    requestAnimationFrame(() => {
      const row = document.querySelector('#a2Body tr[data-a2-code="' + a2Expanded + '"]');
      if(row) row.scrollIntoView({block:'start', behavior:'smooth'});
    });
  }
}

/* The injected row. Reuses the Editor's modules against the LIVE task, which
   is why the eyebrow says so: this is the task now, not as of the playhead. */
function a2ExpandRowHtml(t){
  const real = (typeof TASKS !== 'undefined') ? TASKS.find(x => x.code === t.code) : null;
  const mod = (fn, arg) => (typeof fn === 'function') ? fn(arg) : '';
  const inner = real
    ? mod(_shopEditNotesHtml, real) + mod(_shopEditCardHtml, real)   // photos moved to the rail
    : `<div class="a2-x-empty">No live task matches ${a2Esc(t.code)} — this line only exists in the snapshot.</div>`;
  return `<tr class="a2-xrow" data-a2-expand="${a2Esc(t.code)}">
    <td colspan="6">
      <div class="a2-x">
        <div class="a2-x-hd">
          <span class="a2-x-eyebrow">From the Editor &middot; live, not as of the playhead</span>
          <button class="a2-x-close" type="button" onclick="event.stopPropagation();a2ToggleExpand('${a2Esc(t.code)}')">Collapse</button>
        </div>
        <div class="shop a2-x-shop">${inner}</div>
      </div>
    </td>
  </tr>`;
}

/* ════════════════════════════════════════════════════════════════════
   PHOTO RAIL  ·  EXPERIMENT (part 2)
   A third lane, right of the paper, holding one photo per line — aligned to
   the line it belongs to, the same way the change cards align on the left.
   So a row reads left to right: what changed, the line itself, what it looks
   like. Only exists when the scope list is hidden; that's the width it spends.

   Positioning mirrors layoutCards exactly: offsets are rect deltas against
   the lane, and items stack downward so two photos never overlap. Which means
   a photo can drift below its row when the one above it is taller than the
   gap — same tradeoff the cards already make.

   HONEST CAVEAT about "changes as you scrub". The seeded walks are dated
   Jan 8 – Mar 15 2026, but the change history runs Apr 12 – Apr 30 2026 — so
   every photo predates every version, and a true "latest photo on or before
   the playhead date" filter would return the same Mar 15 shot at every
   position. The pane would look broken. So the playhead's FRACTION through the
   change list selects how far through that line's chronological photos we are:
   park at the start and you see the initial walk, scrub to the present and you
   see the closeout. It reads exactly like the real thing, but it is a stand-in
   for date logic. Real fix is re-dating WALKS in data.js to straddle the
   change orders.
   ════════════════════════════════════════════════════════════════════ */

/* Rank a photo by where its walk sits in the project's chronology. */
function a2WalkRank(p){
  if(typeof WALKS === 'undefined' || !p.walk) return 0;
  const i = WALKS.findIndex(x => x.id === p.walk);
  return i < 0 ? 0 : i;
}
/* One line's photo at the current playhead, or null when it has none. */
function a2PhotoAsOf(code){
  if(typeof PHOTOS === 'undefined' || !PHOTOS) return null;
  const pool = PHOTOS.filter(p => p.kind === 'task' && p.task === code)
                     .sort((a,b) => a2WalkRank(a) - a2WalkRank(b));
  if(!pool.length) return null;
  const denom = Math.max(1, (typeof ORDERED !== 'undefined' ? ORDERED.length : 1));
  const frac  = Math.min(1, Math.max(0, (typeof timeT !== 'undefined' ? timeT : 0) / denom));
  return pool[Math.min(pool.length - 1, Math.round(frac * (pool.length - 1)))];
}

function buildPhotoRail(){
  const rail = document.getElementById('a2PhotoRail');
  if(!rail) return;
  rail.innerHTML = '';
  document.querySelectorAll('#a2Body tr[data-a2-code]').forEach(row => {
    const code = row.dataset.a2Code;
    const p = a2PhotoAsOf(code);
    if(!p) return;
    const t = (typeof TASKS !== 'undefined') ? TASKS.find(x => x.code === code) : null;
    const el = document.createElement('div');
    el.className = 'a2-prow';
    el.dataset.code = code;
    el.innerHTML = (typeof _pgdPhotoFigHtml === 'function')
      ? _pgdPhotoFigHtml(p, 0, t ? t.name : (p.room || 'Project'), t ? t.name : null)
      : '';
    // Hovering a photo spotlights its line, same as hovering a card.
    el.addEventListener('mouseenter', () => spotRow(code, true, el));
    el.addEventListener('mouseleave', () => spotRow(code, false, el));
    // Recede with the document when another line is expanded.
    if(a2Expanded && a2Expanded !== code) el.classList.add('is-dim');
    rail.appendChild(el);
  });
  layoutPhotos();
}

function layoutPhotos(){
  const rail = document.getElementById('a2PhotoRail');
  if(!rail) return;
  const railTop = rail.getBoundingClientRect().top;
  const GAP = 10;
  let cursor = 0;
  rail.querySelectorAll('.a2-prow').forEach(el => {
    const row = document.querySelector('#a2Body tr[data-a2-code="' + el.dataset.code + '"]');
    if(!row){ el.style.display = 'none'; return; }
    el.style.display = '';
    const top = Math.max(row.getBoundingClientRect().top - railTop, cursor);
    el.style.top = top + 'px';
    cursor = top + el.offsetHeight + GAP;
  });
  // Absolutely-positioned children only, so the lane needs a height of its own.
  rail.style.minHeight = cursor ? cursor + 'px' : '';
}

/* renderDoc calls this after replacing the table. */
function renderA2Photo(){ buildPhotoRail(); }
