function renderWork(){
  // Gallery, Floor plan, and Activity (internal id 'progress' — see the
  // WORK_MODES note above on label/id mismatches) are stubbed pending
  // Christine's files; wiped down to plain placeholder text unconditionally
  // — checked before the empty-scope branch below so it wins regardless of
  // task count, and before the real renderers so they never even run.
  if(workMode==='gallery'){ document.getElementById('workBody').innerHTML = `<div class="ph"><span class="ph-desc">Check Christine's files for Gallery tab</span></div>`; return; }
  if(workMode==='floorplan'){ document.getElementById('workBody').innerHTML = `<div class="ph"><span class="ph-desc">Check Christine's files for Floor Plan tab</span></div>`; return; }
  if(workMode==='progress'){ document.getElementById('workBody').innerHTML = `<div class="ph"><span class="ph-desc">Check Christine's files for Activity tab</span></div>`; return; }
  // Empty scope (Step 1 · Empty draft) — every remaining tab shows its own
  // empty state instead of an empty grid / strip. Sidebar handles its own
  // empty state separately.
  if(TASKS.length === 0){
    if(_renderTabEmptyIfNeeded(workMode)) return;
  }
  if(workMode==='shop'){ renderShop(); return; }
  if(workMode==='artifact'){ renderArtifact(); return; }
  if(workMode==='artifact2'){ renderArtifact2(); return; }
  if(workMode==='pano'){ renderPano(); return; }
  const sel=selId?TASKS.find(t=>t.id===selId):null;
  const modeLabel=WORK_MODES.find(m=>m.id===workMode).label;
  document.getElementById('workBody').innerHTML=`
    <div class="ph">
      <span class="ph-tag">${modeLabel}</span>
      <span class="ph-title">Placeholder</span>
      <span class="ph-desc">The ${modeLabel.toLowerCase()} view renders here.</span>
      ${sel?`<span class="ph-note">Selected · ${sel.name} (${sel.code})</span>`:''}
    </div>`;
}

/* ── PANO view: two-row photo strips (task + group) per room ─────────
   Compact visual summary. Per room: task-photos strip on top, group-photos
   strip below with an accent outline so the two scopes read distinctly.
   When a task is selected in the sidebar, the view zooms in on that task
   with its own strip + group context strip. */
function _panoTile(p, i){
  const cap = p.kind === 'group' ? `Group · ${i+1}` : p.kind === 'unsorted' ? `Unsorted · ${i+1}` : `Task · ${i+1}`;
  const groupCls = p.kind === 'group' ? ' pano-group' : '';
  const bg = _photoBg(p, i);
  const outlineColor = roomColor(p.room);
  const walk = p.walk ? walkFor(p.walk) : null;   // walkFor(null) => WALKS[0]
  const walkDot = walk ? `<span class="pano-tile-walk" style="background:${walk.color}" title="${walk.label} · ${walk.date}"></span>` : '';
  return `<div class="pano-tile${groupCls}" style="background:${bg};outline-color:${outlineColor}" data-pid="${p.id}" onclick="openGalleryPhoto(${p.id||0})" title="${p.room} · ${walk.label}">
    ${walkDot}
    <span class="pano-tile-cap">${cap}</span>
  </div>`;
}
function _panoStrip(lbl, photos){
  if(!photos.length) return `<div class="pano-strip"><span class="pano-strip-lbl">${lbl}</span><div class="pano-empty">No photos${selectedWalk!=='all'?' from this walk':''} yet</div></div>`;
  return `<div class="pano-strip">
    <span class="pano-strip-lbl">${lbl}<span class="ct">· ${photos.length}</span></span>
    <div class="pano-strip-scroll">${photos.map(_panoTile).join('')}</div>
  </div>`;
}
function _panoControls(rooms){
  const walkOptions = [
    `<option value="all"${selectedWalk==='all'?' selected':''}>All walks</option>`,
    ...WALKS.map(w => `<option value="${w.id}"${selectedWalk===w.id?' selected':''}>${w.label} · ${w.short === 'Change order' ? w.date : w.date}</option>`)
  ].join('');
  const legendItems = rooms.map(r => `<span class="pano-legend-item" style="color:${roomColor(r)}"><span class="pano-legend-swatch"></span><span style="color:var(--t2)">${r}</span></span>`).join('');
  return `<div class="pano-controls">
    <span class="pano-walk-lbl">Walk</span>
    <label class="pano-walk-sel">
      <span class="pano-walk-dot" style="background:${selectedWalk==='all'?'var(--t3)':walkFor(selectedWalk).color}"></span>
      <select onchange="setSelectedWalk(this.value)">${walkOptions}</select>
    </label>
    <span class="pano-legend">${legendItems}</span>
  </div>`;
}
/* ── PANO · closeout timeline-grid ────────────────────────────────────
   When PROJ_MODE === 'closeout' (Closeout submitted or Approved), the Pano
   tab switches to a compare-style timeline grid that mirrors the right
   panel of ProjectReview_Compare.html. Layout:

     [Walk dates] [prev task]  [current task]  [next task]  ← head
     [Walk A picker] [cell]    [cell (current)] [cell]      ← band A
     [Walk B picker] [cell]    [cell (current)] [cell]      ← band B
     [Scrub through groups and tasks ─────────────────────────]
     [Kitchen (12 tasks)][Living Room (15 tasks)][...]        ← group tabs

   Each row = a walk; each column = a task (or group overview). Cells with
   no photo render a diagonal-stripe placeholder tinted by the task's room
   color. Room color also paints a 6px top stripe on every real-photo cell.

   State lives in `__pcState` at module scope so scrubber position + walk
   picks persist across re-renders. */
let __pcState = null;
// "Only show tasks with photos" filter — checked by default. Hides task
// slots (not group-overview slots) with no photo on every currently
// visible walk date, so scrubbing through a mostly-unphotographed scope
// doesn't hit a wall of "No photo" cells.
let panoOnlyWithPhotos = true;
function setPanoOnlyWithPhotos(checked){
  panoOnlyWithPhotos = !!checked;
  const slots = _pcBuildSlots();
  if(__pcState) __pcState.currentIdx = Math.max(0, Math.min(__pcState.currentIdx, Math.max(0, slots.length - 1)));
  renderPanoCloseout();
}
// True when the seeded photo set includes any walk beyond the initial one.
// Used to decide whether the Pano defaults to two date rows (Band A + Band B)
// or just one — a project with only initial-walk photos has nothing to
// compare yet, so a second row would be empty and confusing.
function _pcHasPostInitialPhotos(){
  if(typeof PHOTOS === 'undefined' || !PHOTOS.length) return false;
  return PHOTOS.some(p => p.walk && p.walk !== 'initial');
}
// Which walks are pickable at the current project stage. The Progress
// (formerly Pano) tab is a real-time view of what has actually happened
// on site — the closeout walk doesn't exist until construction is done,
// and during scope review nothing has happened yet beyond the initial
// site walk.
//   review    → Initial only (single row, no "+ Add date")
//   work      → Initial, Progress 1/2, Change order (no Closeout yet)
//   closeout  → all five walks
function _pcAllowedWalks(){
  if(PROJ_MODE === 'review')  return WALKS.filter(w => w.id === 'initial');
  if(PROJ_MODE === 'work')    return WALKS.filter(w => w.id !== 'close_out');
  return WALKS;
}
function _pcInitState(){
  if(__pcState) return;
  // Scope-submitted stage — only the initial site walk has happened,
  // so pin the timeline to a single row on Initial.
  if(PROJ_MODE === 'review'){
    __pcState = { currentIdx: 0, walkA: 'initial', walkB: 'initial', bandBVisible: false };
    return;
  }
  const allowed = _pcAllowedWalks();
  const allowedIds = new Set(allowed.map(w => w.id));
  const hasProgress = _pcHasPostInitialPhotos() && allowed.length > 1;
  // Default compare = latest-vs-earlier when we can (Progress 1 vs the
  // latest allowed walk — Closeout in closeout stage, Progress 2 in
  // work stage). Fallback to a single Initial row when there's nothing
  // to compare yet.
  const defaultWalkA = hasProgress && allowedIds.has('progress_1') ? 'progress_1' : 'initial';
  const defaultWalkB = allowedIds.has('close_out')
    ? 'close_out'
    : allowed[allowed.length - 1].id;
  __pcState = {
    currentIdx: 0,
    walkA: defaultWalkA,
    walkB: defaultWalkB,
    bandBVisible: hasProgress,
  };
}
// Build the flat slot list: interleave a group slot before each room's
// tasks. Slot index is what the scrubber navigates through.
/* How many columns one task takes: the most photos it has on any single walk on
   show. Never zero — an unfiltered task with no photos still gets its column. */
function _pcTaskCols(task, walkIds){
  if(!walkIds || typeof PHOTOS === 'undefined' || !PHOTOS.length) return 1;
  let m = 0;
  walkIds.forEach(wid => {
    const n = PHOTOS.filter(p => p.kind === 'task' && p.task === task.code && p.walk === wid).length;
    if(n > m) m = n;
  });
  return Math.max(1, m);
}
function _pcBuildSlots(){
  const slots = [];
  const rooms = (typeof ROOMS !== 'undefined' && ROOMS.length) ? ROOMS : [...new Set(TASKS.map(t => t.room))];
  // Active walk date(s) for the photo filter — both bands when a second
  // date row is showing, so a task only drops out when it has no photo
  // on EITHER visible date, not just the first one.
  const walkIds = __pcState
    ? (__pcState.bandBVisible ? [__pcState.walkA, __pcState.walkB] : [__pcState.walkA])
    : null;
  const hasPhotoOnActiveWalks = (task) => {
    if(!walkIds || !PHOTOS || !PHOTOS.length) return true;
    return walkIds.some(wid => PHOTOS.some(p => p.kind === 'task' && p.task === task.code && p.walk === wid));
  };
  rooms.forEach(room => {
    const allRoomTasks = TASKS.filter(t => t.room === room);
    if(!allRoomTasks.length) return;
    // The group-overview slot always stays — it's the room, not a task,
    // and may carry its own group-level photos regardless of this filter.
    // Only individual task slots underneath it get filtered.
    const visibleTasks = panoOnlyWithPhotos ? allRoomTasks.filter(hasPhotoOnActiveWalks) : allRoomTasks;
    slots.push({type:'group', room, roomName: room});
    visibleTasks.forEach(task => {
      /* A column is a photo, not a task. A visit that took a wide and a detail
         of the same line has two things to show, and collapsing them to one
         column threw the second away — which is also what the nested task bar in
         the header measures itself against. Sized by the busiest visible walk so
         both date rows have somewhere to put every shot they hold. */
      for(let i = 0; i < _pcTaskCols(task, walkIds); i++){
        slots.push({type:'task', task, room, roomName: room, photoIdx:i, isExtra: i > 0});
      }
    });
  });
  return slots;
}
function _pcPhotoFor(slot, walkId){
  if(!slot || !PHOTOS || !PHOTOS.length) return null;
  if(slot.type === 'task'){
    const shots = PHOTOS.filter(p => p.kind === 'task' && p.task === slot.task.code && p.walk === walkId);
    return shots[slot.photoIdx || 0] || null;
  }
  return PHOTOS.find(p => p.kind === 'group' && p.room === slot.room && p.walk === walkId) || null;
}
function _pcNav(delta){
  const slots = _pcBuildSlots();
  const n = __pcState.currentIdx + delta;
  if(n < 0 || n >= slots.length) return;
  __pcState.currentIdx = n;
  renderPanoCloseout();
}
function _pcSetWalk(band, walkId){
  if(band === 'A') __pcState.walkA = walkId;
  else __pcState.walkB = walkId;
  renderPanoCloseout();
}
function _pcSetIdx(idx){
  const slots = _pcBuildSlots();
  __pcState.currentIdx = Math.max(0, Math.min(slots.length - 1, idx));
  renderPanoCloseout();
}
function _pcScrubClick(ev, wrap){
  const slots = _pcBuildSlots();
  const rect = wrap.getBoundingClientRect();
  const pct = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));
  _pcSetIdx(Math.round(pct * (slots.length - 1)));
}
function _pcRemoveBand(){
  __pcState.bandBVisible = false;
  renderPanoCloseout();
}
function _pcAddBand(){
  __pcState.bandBVisible = true;
  // Pick a default walkB that's actually allowed at this stage. Closeout
  // preferred (that's usually what people want to compare against), else
  // the latest allowed walk.
  const allowed = _pcAllowedWalks();
  const allowedIds = new Set(allowed.map(w => w.id));
  if(!allowedIds.has(__pcState.walkB)){
    __pcState.walkB = allowedIds.has('close_out') ? 'close_out' : allowed[allowed.length - 1].id;
  }
  renderPanoCloseout();
}
function _pcActiveGroupIdx(slots){
  for(let i = __pcState.currentIdx; i >= 0; i--){
    if(slots[i] && slots[i].type === 'group') return i;
  }
  return -1;
}
/* The strip shows one group at a time: its overview column and every photo
   column under it. Was a fixed three — the slot before, the slot at the cursor,
   and the slot after — so a room with four tasks read "Kitchen, Cabinets, Living
   Room" and the run a group heads was never visible.

   A whole run rather than a fixed width, because the group's bar has to span its
   columns and its label has to own the first one. A sliding window would sooner
   or later start mid-run, and then the nested task bars would sit on top of the
   group's name. */
/* Five. A group's run can be longer than that, but a photograph you cannot read
   is not evidence of anything — past five the columns get too narrow to see what
   is in them, so a long run clips and the arrows walk you through it. */
const PC_MAX_COLS = 5;
function _pcGroupRun(slots){
  const g = _pcActiveGroupIdx(slots);
  const start = g < 0 ? 0 : g;
  let end = start + 1;
  while(end < slots.length && slots[end] && slots[end].type !== 'group') end++;
  const cols = [];
  if(end - start <= PC_MAX_COLS){
    for(let k = start; k < end; k++) cols.push(k);
    return cols;
  }
  /* A run too long for the strip pages its task columns and keeps the group's
     own column pinned at the left. Sliding the whole run instead would sooner or
     later scroll that column away, and then the first task bar would be sitting
     on top of the group's name — the thing this window exists to prevent. */
  const per  = PC_MAX_COLS - 1;
  const cur  = Math.max(start + 1, __pcState.currentIdx);
  const from = start + 1 + Math.floor((cur - start - 1) / per) * per;
  cols.push(start);
  for(let k = from; k < Math.min(end, from + per); k++) cols.push(k);
  return cols;
}
/* Where the arrows go. Advancing the strip means the next column after the last
   one on show — which is the next group only once the run is exhausted, so a
   clipped run can still be walked to its end. */
function _pcStepTarget(slots, cols, dir){
  const g = _pcActiveGroupIdx(slots);
  if(dir > 0){
    const after = cols[cols.length - 1] + 1;
    if(slots[after] && slots[after].type !== 'group') return after;
    return _pcAdjacentGroup(slots, g, 1);
  }
  const firstTask = cols.length > 1 ? cols[1] : cols[0];
  if(firstTask - 1 > g) return firstTask - 1;
  return _pcAdjacentGroup(slots, g, -1);
}
/* Where each group and each task begins and how far it reaches, over the
   columns on show. One pass, used by the header's two tiers. */
function _pcRuns(slots, cols){
  const groups = [], tasks = [];
  cols.forEach((si, k) => {
    const slot = slots[si];
    if(!slot) return;
    const g = groups[groups.length - 1];
    if(g && g.room === slot.room) g.span++;
    else groups.push({room: slot.room, roomName: slot.roomName, at: k, span: 1,
                      hasOverview: slot.type === 'group'});
    if(slot.type !== 'task') return;
    const t = tasks[tasks.length - 1];
    if(t && t.task === slot.task) t.span++;
    else tasks.push({task: slot.task, at: k, span: 1});
  });
  return {groups, tasks};
}
function _pcHeadHtml(slots, idx){
  const cols = _pcGroupRun(slots);
  const {groups, tasks} = _pcRuns(slots, cols);
  const prevGroup = _pcStepTarget(slots, cols, -1);
  const nextGroup = _pcStepTarget(slots, cols, 1);
  const nav = (dir, target) => {
    const glyph = dir < 0 ? 'M7.5 2L3.5 6l4 4' : 'M4.5 2l4 4-4 4';
    const dis = target < 0 ? ' is-disabled' : '';
    const click = target < 0 ? '' : ` onclick="_pcSetIdx(${target})"`;
    return `<button type="button" class="tl-hnav${dis}"${click}
      aria-label="${dir < 0 ? 'Back' : 'Forward'}"
      title="${dir < 0 ? 'Back' : 'Forward'}"${target < 0 ? ' disabled' : ''}>
      <svg viewBox="0 0 12 12" fill="none"><path d="${glyph}" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </button>`;
  };
  const groupBars = groups.map(g => `<div class="tl-hgroup" style="grid-column:${g.at + 1} / span ${g.span};--room-tint:${roomColor(g.room)}">
      <span class="tl-hgroup-label">
        <span class="tl-hgroup-cap">Group</span>
        <span class="tl-hgroup-name">${esc(g.roomName)}</span>
      </span>
    </div>`).join('');
  /* Nested, not stacked: the task bar sits on the group's bar over the columns it
     owns, inset so the group's edge still reads around it. Same grid row, placed
     after, so it paints on top. */
  const taskBars = tasks.map(t => {
    const isCur = slots[idx] && slots[idx].type === 'task' && slots[idx].task === t.task;
    return `<div class="tl-htask${isCur ? ' current' : ''}" style="grid-column:${t.at + 1} / span ${t.span}"
        onclick="_pcSetIdx(${cols[t.at]})" role="button" tabindex="0" title="${esc(t.task.name)}">
        <span class="tl-htask-name">${esc(t.task.name)}</span>
        ${t.span > 1 ? `<span class="tl-htask-count">${t.span} photos</span>` : ''}
      </div>`;
  }).join('');
  // Columns belong to .tl-hgrid; .tl-head is the rail/grid/arrow frame and takes
  // its columns from the stylesheet. Setting them here too overrode that frame.
  return `<div class="tl-head">
    ${nav(-1, prevGroup)}
    <div class="tl-hgrid" style="grid-template-columns:repeat(${cols.length},1fr)">
      ${groupBars}${taskBars}
    </div>
    ${nav(1, nextGroup)}
  </div>`;
}
/* The group slot before or after this one, or -1 at either end. */
function _pcAdjacentGroup(slots, from, dir){
  for(let i = from + dir; i >= 0 && i < slots.length; i += dir){
    if(slots[i] && slots[i].type === 'group') return i;
  }
  return -1;
}
/* Every photo on this line or room, across all walks — what the corner pill
   counts. The strip only ever shows one walk per row, so "2 photos" is a pointer
   to the rest of them, not a description of this row. */
function _pcSlotShotCount(slot){
  if(!slot || typeof PHOTOS === 'undefined') return 0;
  return slot.type === 'task'
    ? PHOTOS.filter(p => p.kind === 'task' && p.task === slot.task.code).length
    : PHOTOS.filter(p => p.kind === 'group' && p.room === slot.room).length;
}
function _pcCellHtml(slot, walkId, isCurrent){
  if(!slot){
    return `<div class="tl-cell${isCurrent?' current':''}"><span class="tl-cell-empty">No slot</span></div>`;
  }
  const tint = roomColor(slot.room);
  const photo = _pcPhotoFor(slot, walkId);
  if(!photo){
    // Empty-cell path — diagonal stripe over room tint, no top stripe applied
    // (the empty background rule already carries the room color heavily).
    return `<div class="tl-cell${isCurrent?' current':''}" data-room-id="${slot.room}" style="--room-tint:${tint}">
      <span class="tl-cell-empty">No photo</span>
    </div>`;
  }
  const bg = _photoBg(photo, 0);
  /* No caption strip. The bar directly above the cell names the task, and the
     band's own row says which walk it is — the overlay restated both across
     every column and buried the photograph under a gradient. What it could not
     say is how many shots exist, so that is what the corner carries, once per
     task rather than on every column of it. */
  const shots = _pcSlotShotCount(slot);
  const countPill = (!slot.photoIdx && shots > 1)
    ? `<span class="tl-cell-count">${shots} photos</span>` : '';
  // Only show the approved-hexagon badge on cells whose task has been
  // approved by the admin. Group-level cells don't carry a task id, so
  // they never render the badge.
  const isApprovedCell = slot.type === 'task' && slot.task && (typeof approved !== 'undefined') && approved.has(slot.task.id);
  const statusBadge = isApprovedCell ? `<span class="tl-cell-status" title="Approved">
    <svg viewBox="0 0 24 24" fill="#2E9048" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"><path d="M21.5 18L11.5 23.5L1.5 18V7L11.5 1.5L21.5 7V18Z"/><path d="M6 12.5L10.5 16.5L17 8.5" fill="none" stroke-linecap="round"/></svg>
  </span>` : '';
  return `<div class="tl-cell${isCurrent?' current':''}" data-room-id="${slot.room}" style="--room-tint:${tint}" onclick="openGalleryPhoto(${photo.id||0})">
    <div class="tl-cell-img" style="background:${bg}"></div>
    ${statusBadge}
    ${countPill}
  </div>`;
}

// Calendar popover state — which band (A/B) has the calendar dropdown
// open, and which month the calendar is currently viewing. Only one
// popover is open at a time; opening B closes A and vice versa.
let __pcCalOpen = null;   // null | 'A' | 'B'
let __pcCalMonth = null;  // Date pointing at the 1st of the month in view
function _pcOpenCal(bandKey){
  if(__pcCalOpen === bandKey){ _pcCloseCal(); return; }
  __pcCalOpen = bandKey;
  // Default the calendar to the month of the currently-selected walk so
  // the walk dot is immediately visible when the dropdown opens.
  const walkId = bandKey === 'A' ? __pcState.walkA : __pcState.walkB;
  const w = walkFor(walkId);
  const d = new Date(w.date + ' 00:00:00');
  __pcCalMonth = new Date(d.getFullYear(), d.getMonth(), 1);
  renderPanoCloseout();
}
function _pcCloseCal(){ __pcCalOpen = null; renderPanoCloseout(); }
function _pcCalNavMonth(delta){
  const m = __pcCalMonth || new Date();
  __pcCalMonth = new Date(m.getFullYear(), m.getMonth() + delta, 1);
  renderPanoCloseout();
}
function _pcCalPickWalk(bandKey, walkId){
  _pcSetWalk(bandKey, walkId);   // triggers a re-render
  _pcCloseCal();
}
// Global click-outside handler to dismiss the calendar. Only installs once.
if(!window.__pcCalClickHandlerInstalled){
  window.__pcCalClickHandlerInstalled = true;
  document.addEventListener('click', e => {
    if(!__pcCalOpen) return;
    // Ignore clicks inside the picker itself or on its trigger button.
    if(e.target.closest('.tl-walk-picker')) return;
    _pcCloseCal();
  });
}
function _pcCalendarHtml(bandKey){
  const m = __pcCalMonth || new Date();
  const year = m.getFullYear();
  const month = m.getMonth();
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const currentWalk = bandKey === 'A' ? __pcState.walkA : __pcState.walkB;
  // Index the allowed walks by YYYY-MM-DD so the calendar cells can
  // dot-mark and enable only those dates.
  const walkByDate = {};
  _pcAllowedWalks().forEach(w => {
    const d = new Date(w.date + ' 00:00:00');
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    walkByDate[key] = w;
  });
  const cells = [];
  for(let i = 0; i < firstDow; i++) cells.push('<div class="tl-cal-day is-blank"></div>');
  for(let day = 1; day <= daysInMonth; day++){
    const key = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const w = walkByDate[key];
    if(w){
      const isSelected = w.id === currentWalk;
      cells.push(`<button class="tl-cal-day is-walk${isSelected?' is-selected':''}" onclick="event.stopPropagation();_pcCalPickWalk('${bandKey}','${w.id}')" title="${esc(w.label)} · ${esc(w.date)}">
        <span class="tl-cal-day-num">${day}</span>
        <span class="tl-cal-day-dot" style="background:${w.color}"></span>
      </button>`);
    } else {
      cells.push(`<div class="tl-cal-day is-empty"><span class="tl-cal-day-num">${day}</span></div>`);
    }
  }
  const monthLabel = m.toLocaleString('en-US', {month:'long', year:'numeric'});
  return `<div class="tl-cal-popover" onclick="event.stopPropagation()">
    <div class="tl-cal-hdr">
      <button class="tl-cal-nav" onclick="event.stopPropagation();_pcCalNavMonth(-1)" aria-label="Previous month">
        <svg viewBox="0 0 12 12" fill="none"><path d="M7.5 3l-3 3 3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
      <span class="tl-cal-month">${esc(monthLabel)}</span>
      <button class="tl-cal-nav" onclick="event.stopPropagation();_pcCalNavMonth(1)" aria-label="Next month">
        <svg viewBox="0 0 12 12" fill="none"><path d="M4.5 3l3 3-3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
    </div>
    <div class="tl-cal-dow"><span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span></div>
    <div class="tl-cal-grid">${cells.join('')}</div>
  </div>`;
}
function _pcWalksRowHtml(bandKey){
  const currentWalk = bandKey === 'A' ? __pcState.walkA : __pcState.walkB;
  const w = walkFor(currentWalk);
  const isOpen = __pcCalOpen === bandKey;
  const closeBtn = bandKey === 'B' ? `<button class="tl-walks-remove" onclick="event.stopPropagation();_pcRemoveBand()" aria-label="Remove date row" title="Remove date row"><svg viewBox="0 0 10 10" fill="none"><line x1="2" y1="2" x2="8" y2="8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><line x1="8" y1="2" x2="2" y2="8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button>` : '';
  return `<div class="tl-walks tl-walks-row" data-band="${bandKey}">
    <div class="tl-walk-picker">
      <button class="tl-walk-picker-btn${isOpen?' is-open':''}" onclick="event.stopPropagation();_pcOpenCal('${bandKey}')" aria-haspopup="true" aria-expanded="${isOpen}" aria-label="Walk ${bandKey} — ${esc(w.short)}, ${esc(w.date)}">
        <span class="tl-walk-picker-top">
          <span class="tl-walk-dot" style="background:${w.color}"></span>
          <span class="tl-walk-picker-name">${esc(w.short)}</span>
          <svg class="tl-walk-picker-caret" viewBox="0 0 12 12" fill="none"><path d="M3 4.5l3 3 3-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </span>
        <span class="tl-walk-picker-date">${esc(w.date)}</span>
      </button>
      ${isOpen ? _pcCalendarHtml(bandKey) : ''}
    </div>
    ${closeBtn}
  </div>`;
}

/* The date moved out of a row above the photos and into a rail beside them. As a
   row it was a header for the photos under it, which is a fair description of
   one row but not of two — with two dates on screen the thing you are comparing
   is left-to-right within a column, and the label belongs at the start of the
   row it names, not floating above it. */
function _pcBandHtml(bandKey, slots){
  const walkId = bandKey === 'A' ? __pcState.walkA : __pcState.walkB;
  const idx = __pcState.currentIdx;
  const cols = _pcGroupRun(slots);
  return `<div class="tl-band" data-band="${bandKey}">
    ${_pcWalksRowHtml(bandKey)}
    <div class="tl-cells" style="grid-template-columns:repeat(${cols.length},1fr)">
      ${cols.map(i => _pcCellHtml(slots[i] || null, walkId, i === idx)).join('')}
    </div>
  </div>`;
}

function _pcSliderHtml(slots){
  const idx = __pcState.currentIdx;
  const denom = Math.max(1, slots.length - 1);
  const pct = (idx / denom) * 100;
  const cur = slots[idx];
  const curLabel = cur
    ? (cur.type === 'group' ? `${esc(cur.roomName)} (group)` : `${esc(cur.task.name)} · ${esc(cur.roomName)}`)
    : '';
  const ticks = slots.map((s, i) => {
    if(s.type !== 'group') return '';
    const p = (i / denom) * 100;
    return `<div class="tl-nav-tick" style="left:${p}%" data-slot-idx="${i}" title="${esc(s.roomName)}"></div>`;
  }).join('');
  const groupIdxs = slots.map((s,i) => s.type==='group' ? i : -1).filter(i => i >= 0);
  const activeGroupIdx = _pcActiveGroupIdx(slots);
  const groupLabels = groupIdxs.map((gi, gArrIdx) => {
    const nextGi = (gArrIdx + 1 < groupIdxs.length) ? groupIdxs[gArrIdx + 1] : slots.length;
    const leftPct = (gi / denom) * 100;
    const rightPct = (gArrIdx + 1 < groupIdxs.length) ? (nextGi / denom) * 100 : 100;
    const widthPct = Math.max(0, rightPct - leftPct);
    const taskCount = Math.max(0, nextGi - gi - 1);
    const countStr = taskCount + (taskCount === 1 ? ' task' : ' tasks');
    const labelText = slots[gi].roomName + ' (' + countStr + ')';
    const isCur = activeGroupIdx === gi;
    return `<div class="tl-nav-group-label${isCur?' is-current':''}" data-slot-idx="${gi}" style="left:${leftPct}%;width:${widthPct}%" title="${esc(labelText)}" onclick="_pcSetIdx(${gi})">${esc(labelText)}</div>`;
  }).join('');
  return `<div class="tl-nav-slider">
    <div class="tl-nav-slider-hdr">
      <span class="tl-nav-slider-title">Scrub through groups and tasks</span>
      <span class="tl-nav-current-label">${curLabel}<span class="tl-nav-idx">${idx+1} / ${slots.length}</span></span>
    </div>
    <div class="tl-nav-range-wrap" onclick="_pcScrubClick(event, this)">
      <div class="tl-nav-track">
        <div class="tl-nav-track-fill" style="width:${pct}%"></div>
        ${ticks}
        <div class="tl-nav-thumb" style="left:${pct}%"></div>
      </div>
    </div>
    <div class="tl-nav-groups">${groupLabels}</div>
  </div>`;
}

