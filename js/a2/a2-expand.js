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
   PHOTO COLUMN  ·  EXPERIMENT (part 2)
   The photo lives in the table's last column, not in a lane beside it — so it
   aligns with its row by construction and there is no measured layout to keep
   honest. (An earlier version was an absolutely-positioned lane like the change
   cards; a table cell does the same job for free.)

   The column has two states, driven by whether the scope list is showing:
     · scope visible — just the small photo icon, as before
     · scope hidden  — the photo itself, with its date and a More link
   More opens the shared Photos + Notes drawer on that line.

   HONEST CAVEAT about "changes as you scrub". The seeded walks are dated
   Jan 8 – Mar 15 2026, but the change history runs Apr 12 – Apr 30 2026 — so
   every photo predates every version, and a true "latest photo on or before
   the playhead date" filter would return the same Mar 15 shot at every
   position. So the playhead's FRACTION through the change list selects how far
   through that line's chronological photos we are: park at the start and you
   see the initial walk, scrub to the present and you see the closeout. It reads
   exactly like the real thing, but it is a stand-in for date logic. Real fix is
   re-dating WALKS in data.js to straddle the change orders.
   ════════════════════════════════════════════════════════════════════ */

function a2ScopeHidden(){ return document.body.classList.contains('sb-collapsed'); }

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

/* What goes in the media cell. Returns '' when the line has no photos, so the
   column is simply empty rather than offering a door onto nothing. */
function a2MediaCellHtml(t){
  const n = a2TaskPhotoCount(t.code);
  if(!a2ScopeHidden()) return a2MediaBtn('task', t.code, n);   // icon only
  const p = a2PhotoAsOf(t.code);
  if(!p) return '';
  const walk = (p.walk && typeof walkFor === 'function') ? walkFor(p.walk) : null;
  const date = walk ? walk.date : '';
  const bg   = (typeof _photoBg === 'function') ? _photoBg(p, 0) : 'var(--stroke)';
  const open = (typeof openGalleryPhoto === 'function')
    ? `onclick="event.stopPropagation();openGalleryPhoto(${p.id})"` : '';
  const more = (typeof openMediaDrawer === 'function')
    ? `<button class="a2-pc-more" type="button" title="All photos and notes for this line"
         onclick="event.stopPropagation();openMediaDrawer('task','${a2Esc(t.code)}','photos')">More</button>` : '';
  return `<div class="a2-pc">
    <div class="a2-pc-img" style="background:${bg}" ${open} title="${a2Esc(walk ? walk.label : 'Photo')}"></div>
    <div class="a2-pc-foot">
      <span class="a2-pc-date">${a2Esc(date)}</span>
      ${more}
    </div>
  </div>`;
}

/* The cell's two states differ, so the table has to be rebuilt when the scope
   list opens or closes. panel-init.js dispatches a window resize on toggle,
   which is the only signal available — nothing else fires. */
let a2WasHidden = null;
window.addEventListener('resize', () => {
  const now = a2ScopeHidden();
  if(now === a2WasHidden) return;
  a2WasHidden = now;
  if(!document.getElementById('a2Root')) return;
  renderDoc();
  buildCards();
  requestAnimationFrame(layoutCards);
});
