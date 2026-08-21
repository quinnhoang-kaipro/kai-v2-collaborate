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

/* Anywhere on a line opens it. The name keeps its hover affordance, but the
   whole row is the target — a document line is one object, and asking people
   to find the name inside it is a smaller hit area for no reason. Selection
   rides along so the two never disagree about which line is current: both
   toggle, so a second click on the same line clears both. Children that mean
   something else (the photo icon, and anything inside the opened block) stop
   the click before it gets here. */
function a2RowClick(code, ev){
  if(typeof selectRow === 'function') selectRow(code);   // sets selCode; renderDoc reapplies it
  a2ToggleExpand(code, ev);
}

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

/* The injected row. Reuses the Editor's modules against the LIVE task — so
   this is the task NOW, not as of the playhead. */
function a2ExpandRowHtml(t){
  const real = (typeof TASKS !== 'undefined') ? TASKS.find(x => x.code === t.code) : null;
  const mod = (fn, arg) => (typeof fn === 'function') ? fn(arg) : '';
  const inner = real
    ? mod(_shopEditNotesHtml, real) + a2XOptionsHtml(real)   // photos moved to the rail
    : `<div class="a2-x-empty">No live task matches ${a2Esc(t.code)} — this line only exists in the snapshot.</div>`;
  return `<tr class="a2-xrow" data-a2-expand="${a2Esc(t.code)}">
    <td colspan="6">
      <div class="a2-x">
        <button class="a2-x-collapse" type="button" title="Collapse" aria-label="Collapse"
                onclick="event.stopPropagation();a2ToggleExpand('${a2Esc(t.code)}')">
          <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 7.5 6 4l3.5 3.5"/></svg>
        </button>
        <div class="shop a2-x-shop">${inner}</div>
      </div>
    </td>
  </tr>`;
}

/* ── OPTIONS, read-only ───────────────────────────────────────────────
   The Editor's own _shopEditCardHtml is not reused here, deliberately. It is
   a working surface: steppers, live-committing inputs, Remove and + Modifier
   on every line, and every product an option carries whether or not anyone
   picked it. Inside a history document that is wrong twice over — it invites
   edits to the live task from a page about the past, and it spends about
   140px of height per product saying things nobody is reading here.

   So this renders the same data as a summary: what was chosen, how much of
   it, and what it came to. Numbers are text. Two filters do the trimming —
   options nobody added are dropped, and so is any product without a quantity
   or without a value (productIsPicked is exactly "has a quantity", and the
   catalogue alternatives that were never picked are the bulk of the height in
   the Editor's version).

   A product with a SKU still opens the Editor's product flyaway on click —
   that panel is pure reading (spec, photos, source listing), which is exactly
   what someone wants from a line they are trying to understand.

   Anything genuinely editable stays in the Editor tab, one click away on the
   line name's own affordance. */
function a2XOptionsHtml(t){
  if(typeof taskOptions !== 'function') return '';
  const num = v => {
    if(typeof _parseDollars === 'function') return _parseDollars(v);
    return parseFloat(String(v || '0').replace(/[^0-9.-]/g,'')) || 0;
  };
  const money = v => (typeof _fmtDollars === 'function') ? _fmtDollars(v) : ('$' + Math.round(v).toLocaleString());
  const worthShowing = p =>
    (typeof productIsPicked !== 'function' || productIsPicked(p)) &&
    (typeof productLineTotal !== 'function' || productLineTotal(p) > 0);

  const opts = taskOptions(t)
    .filter(o => typeof optionIsAdded !== 'function' || optionIsAdded(o))
    .map(o=>{
      const rows = (Array.isArray(o.products) ? o.products : []).filter(worthShowing).map(p=>{
        const meta = [];
        if(p.qty) meta.push(a2Esc(p.qty));
        if(num(p.parts)) meta.push('parts ' + a2Esc(String(p.parts)));
        if(num(p.labor)) meta.push('labor ' + a2Esc(String(p.labor)));
        const amt = (typeof productLineTotal === 'function') ? money(productLineTotal(p)) : '';
        // Catalogue products open the flyaway; a bare labor line has nothing
        // to show, so it stays inert rather than offering a dead target.
        const canOpen = !!p.sku && typeof openFly === 'function';
        const opener = canOpen
          ? ` onclick="event.stopPropagation();openFly(${t.id},'${a2Esc(p.sku)}',event)" title="View product details"`
          : '';
        return `<div class="a2-xp${canOpen ? ' is-catalog' : ''}"${opener}>
          <span class="a2-xp-name">${p.brand ? `<span class="a2-xp-brand">${a2Esc(p.brand)}</span>` : ''}${a2Esc(p.product || 'Untitled product')}</span>
          <span class="a2-xp-meta">${meta.join(' &middot; ')}</span>
          <span class="a2-xp-amt">${a2Esc(amt)}</span>
        </div>`;
      }).join('');
      return `<div class="a2-xo">
        <div class="a2-xo-hd">
          <span class="a2-xo-name">${a2Esc(o.name || 'Untitled option')}</span>
          <span class="a2-xo-total">${a2Esc(o.cost || '$0')}</span>
        </div>
        ${rows || `<div class="a2-xo-empty">Nothing priced on this option yet.</div>`}
      </div>`;
    }).join('');

  if(!opts) return `<div class="a2-xo-wrap"><div class="a2-xo-empty">No options added to this task yet.</div></div>`;
  return `<div class="a2-xo-wrap">
    <div class="a2-xo-lbl">Options</div>
    ${opts}
  </div>`;
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

   Which photo: the most recent one taken on or before the date the playhead
   is parked on, so scrubbing the history walks the evidence forward with it.
   A line whose photos were all taken after that date shows nothing — the
   column filling in as the project progresses is the point, not a gap.
   ════════════════════════════════════════════════════════════════════ */

function a2ScopeHidden(){ return document.body.classList.contains('sb-collapsed'); }

/* When a photo was taken, in ms — its walk's date. Photos with no walk were
   uploaded rather than captured and carry no date we can order by. */
function a2PhotoTime(p){
  const w = (p && p.walk && typeof walkFor === 'function') ? walkFor(p.walk) : null;
  const t = w ? Date.parse(w.date) : NaN;
  return isNaN(t) ? null : t;
}
/* One line's most recent photo as of the playhead's date, or null when the
   line has none yet at that point in the story. */
function a2PhotoAsOf(code){
  if(typeof PHOTOS === 'undefined' || !PHOTOS) return null;
  const asOf = (typeof a2AsOfDate === 'function') ? Date.parse(a2AsOfDate()) : NaN;
  const pool = PHOTOS.filter(p => p.kind === 'task' && p.task === code)
                     .map(p => ({p, t: a2PhotoTime(p)}))
                     .filter(x => x.t !== null)
                     .sort((a,b) => a.t - b.t);
  if(!pool.length) return null;
  if(isNaN(asOf)) return pool[pool.length-1].p;     // no playhead date to compare against
  const upTo = pool.filter(x => x.t <= asOf);
  return upTo.length ? upTo[upTo.length-1].p : null;
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
