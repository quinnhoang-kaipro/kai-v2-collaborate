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
   Hiding the scope list frees ~300px on the right. Spend it on the task's
   photo, and the photo strip inside the expanded block becomes redundant —
   so it's dropped from there (see a2ExpandRowHtml above).

   Which photo: the expanded line's task if a line is open, otherwise the most
   recent task photo in the scope, so the rail is never dead.

   HONEST CAVEAT about "changes as you scrub". The seeded walks are dated
   Jan 8 – Mar 15 2026, but the change history runs Apr 12 – Apr 30 2026 — so
   every photo predates every version, and a true "latest photo on or before the
   playhead date" filter would return the same Mar 15 shot at every position.
   The pane would look broken. So the playhead's FRACTION through the change
   list selects how far through the task's chronological photos we are: park
   at the start and you see the initial walk, scrub to the present and you see
   the closeout. It reads exactly like the real thing and it's the only way to
   feel the interaction on this data — but it is a stand-in, not date logic.
   Real fix is re-dating WALKS in data.js so they straddle the change orders.
   ════════════════════════════════════════════════════════════════════ */

/* The task's photos, oldest first by walk date. */
function a2PhotoSequence(){
  if(typeof PHOTOS === 'undefined' || !PHOTOS) return {photos:[], task:null};
  const walkRank = (p) => {
    if(typeof WALKS === 'undefined' || !p.walk) return 0;
    const i = WALKS.findIndex(x => x.id === p.walk);
    return i < 0 ? 0 : i;
  };
  let task = null, pool = [];
  if(a2Expanded && typeof TASKS !== 'undefined'){
    task = TASKS.find(x => x.code === a2Expanded) || null;
    if(task) pool = PHOTOS.filter(p => p.kind === 'task' && p.task === task.code);
  }
  if(!pool.length) pool = PHOTOS.filter(p => p.kind === 'task');
  return {photos: pool.slice().sort((a,b) => walkRank(a) - walkRank(b)), task};
}

function renderA2Photo(){
  const rail = document.getElementById('a2PhotoRail');
  if(!rail) return;
  const {photos, task} = a2PhotoSequence();
  if(!photos.length){ rail.innerHTML = ''; return; }
  // Playhead fraction -> position in the photo sequence. See the caveat above.
  const denom = Math.max(1, (typeof ORDERED !== 'undefined' ? ORDERED.length : 1));
  const frac  = Math.min(1, Math.max(0, (typeof timeT !== 'undefined' ? timeT : 0) / denom));
  const idx   = Math.min(photos.length - 1, Math.round(frac * (photos.length - 1)));
  const p     = photos[idx];
  const walk  = (p.walk && typeof walkFor === 'function') ? walkFor(p.walk) : null;
  const fig   = (typeof _pgdPhotoFigHtml === 'function')
    ? _pgdPhotoFigHtml(p, idx, task ? task.name : (p.room || 'Project'), task ? task.name : null)
    : '';
  rail.innerHTML = `<div class="a2-pr">
    <div class="a2-pr-hd">
      <span class="a2-pr-lbl">${a2Esc(task ? task.name : 'Scope')}</span>
      <span class="a2-pr-n">${idx + 1}/${photos.length}</span>
    </div>
    <div class="a2-pr-fig">${fig}</div>
    <div class="a2-pr-meta">
      ${walk ? `<span class="a2-pr-walk"><span class="a2-pr-dot" style="--mk:${walk.color||'var(--t3)'}"></span>${a2Esc(walk.label)}</span>` : ''}
      ${walk ? `<span class="a2-pr-date">${a2Esc(walk.date)}</span>` : ''}
    </div>
  </div>`;
}
