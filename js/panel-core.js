/* ════════════ STATE ════════════ */
let groupBy = 'room';
let variant = 'gallery';
let activeFilters = new Set();
let selId = null;
// Selected group (mutually exclusive with selId). Set via clicking the group
// name in the sidebar; drives the Progress tab's group-focused view. When
// both selId and selGroupKey are null, the Progress tab shows the roll-up.
let selGroupKey = null;
// Scope-level selection — the level above groups. True when the user has
// clicked the white Scope bar and neither a task nor a group is selected.
let scopeView = false;
let collapsedGrps = null;
let groupLabels = {};           // { groupKey: user-typed label string }, e.g. "Kitchen (including Pantry)"
let editingGroupLabelFor = null; // group key currently showing the inline label input
// Group-row tools (duplicate icon) are hidden by default and revealed via
// the Settings icon next to the Group/Contractor toggle.
let sbToolsVisible = false;
function toggleSbTools(){
  sbToolsVisible = !sbToolsVisible;
  if(typeof renderStateBar === 'function') renderStateBar();
  if(typeof renderSidebar === 'function') renderSidebar();
}
// SHOP-EDIT VARIANT: auto-select the first task on load so the Task tab is
// populated with content immediately — teaches the "sidebar click → Task
// tab edit" pattern without an empty first paint. Deferred to
// DOMContentLoaded so TASKS is fully seeded (draft-stage truncates it).
document.addEventListener('DOMContentLoaded', () => {
  if(selId == null && TASKS.length){
    selId = TASKS[0].id;
    openIds.add(TASKS[0].id);
    // If the initial workMode is 'shop' (Task tab) — which is the default
    // for this variant — the just-set selection will paint on the next
    // renderAll (already scheduled by shell / init).
  }
});
let approved = new Set();   // task-level approvals
// Group-level approvals — tracks which groups the user has explicitly
// hit the "Approve group" button on. Kept separate from per-task approval
// state so the group CTA doesn't auto-flip to "Approved" just because
// every task inside happened to be individually checked.
let approvedGroupsExplicit = new Set();
let openIds = new Set();    // expanded task rows
let editId = null;          // task currently in edit mode
let editDraft = null;       // working copy of fields while editing

/* ════════════ DERIVED ════════════ */
function dollars(c){ return parseFloat(String(c).replace(/[$,]/g,''))||0; }
function money(n){ return '$'+n.toLocaleString(); }

/* unified lookup: a key may be a flag or a project modifier */
function tagInfo(k){
  if(FLAGS[k]) return {label:FLAGS[k].label, cls:FLAGS[k].cls, kind:'flag'};
  const m=PROJECT_MODS.find(x=>x.id===k);
  if(m) return {label:m.label, cls:'c-'+m.id, kind:'mod', modKind:m.kind};
  return {label:k, cls:'c-fin', kind:'mod'};
}
/* Tasks whose change order has been submitted and is waiting on the admin.
   Everything user-facing — the pill, the row flag, the filter, the approve
   action — keys off this rather than off the raw diff. */
let __CO_SUBMITTED = new Set();
/* Tasks added or staged for removal after the scope was published. A new task
   has no snapshot to diff against, and a removed one would otherwise just
   disappear, so both are recorded outright. */
let __CO_ADDED = new Set();
let __CO_REMOVED = new Set();

/* Changed, but nobody has been asked to look at it yet. */
function taskHasDraftChangeOrder(t){
  if(!t) return false;
  if(__CO_SUBMITTED.has(t.id)) return false;   // already handed over
  if(__CO_ADDED.has(t.id) || __CO_REMOVED.has(t.id)) return true;
  if(typeof taskHasSnapshotChanges === 'function' && taskHasSnapshotChanges(t)) return true;
  if(typeof coHasChange === 'function' && coHasChange(t.id)) return true;
  return false;
}
/* Submitted and awaiting a decision. */
function taskHasOpenChangeOrder(t){
  return !!t && __CO_SUBMITTED.has(t.id);
}
/* Anything in flight, either side of the handoff — used where the question is
   "has this task been touched since approval" rather than "who owes what". */
function taskHasAnyChangeOrder(t){
  return taskHasDraftChangeOrder(t) || taskHasOpenChangeOrder(t);
}
function _coDraftTasks(){
  return (typeof TASKS !== 'undefined' ? TASKS : []).filter(taskHasDraftChangeOrder);
}
/* Why a task is in a change order, for the pill's tooltip and the removal
   copy — "changed" is thin when the answer is "it's being deleted". */
function coReasonFor(t){
  if(!t) return '';
  if(__CO_REMOVED.has(t.id)) return 'Removal';
  if(__CO_ADDED.has(t.id)) return 'New task';
  return 'Changed';
}

/* Which task is mid-confirmation on its change order. One value, shared by
   the card and the row menu — two states would let the same task sit
   confirming on one surface and not the other. */
let coApproveConfirmId = null;
function askCoApprove(id){
  coApproveConfirmId = id;
  if(typeof renderAll === 'function') renderAll();
}
function cancelCoApprove(){
  coApproveConfirmId = null;
  if(typeof renderAll === 'function') renderAll();
}
function confirmCoApprove(id){
  coApproveConfirmId = null;
  approveChangeOrder(id);
}

function approveChangeOrder(id){
  const t = TASKS.find(x => x.id === id);
  if(!t) return;
  // An approved removal is the point at which the task actually goes.
  if(__CO_REMOVED.has(id)){
    const i = TASKS.findIndex(x => x.id === id);
    if(i >= 0) TASKS.splice(i, 1);
    __CO_REMOVED.delete(id); __CO_SUBMITTED.delete(id);
    approved.delete(id);
    if(typeof openIds !== 'undefined') openIds.delete(id);
    if(typeof selId !== 'undefined' && selId === id) selId = null;
    if(typeof toast === 'function') toast(`Removal approved · ${t.name}`);
    if(typeof renderAll === 'function') renderAll();
    return;
  }
  if(typeof __TASK_ORIGINALS !== 'undefined'){
    __TASK_ORIGINALS[t.id] = {
      name:t.name, opt:t.opt, desc:t.desc, product:t.product,
      pcost:t.pcost, qty:t.qty, rate:t.rate, cost:t.cost,
      gc:t.gc, status:t.status,
      options:(typeof _snapshotOptions === 'function') ? _snapshotOptions(t) : [],
    };
  }
  __CO_SUBMITTED.delete(id); __CO_ADDED.delete(id);
  if(typeof pendingChanges !== 'undefined'){
    pendingChanges = pendingChanges.filter(c => c.taskId !== id);
    if(typeof renderChangeOrderBar === 'function') renderChangeOrderBar();
  }
  if(typeof toast === 'function') toast(`Change order approved · ${t.name}`);
  if(typeof renderAll === 'function') renderAll();
}
/* The pill. Only once submitted — before that the change is the contractor's
   draft and the bar is where it lives. */
function _coPillHtml(t){
  if(!taskHasOpenChangeOrder(t)) return '';
  const why = coReasonFor(t);
  return `<span class="co-pill" title="${esc(why)} after approval — waiting on approval">${esc(why === 'Changed' ? 'Change order' : why)}</span>`;
}

function taskKeys(t){
  // Synth keys drive filter matching even when the underlying flag isn't
  // stored on the task explicitly.
  //   no_gc   → task has no contractor assigned
  //   edit_req→ task has an admin-requested edit outstanding
  //   co_open → task has snapshot-tracked change-order edits not yet submitted
  const synth = [];
  if(!t.gc) synth.push('no_gc');
  if(t.editRequested) synth.push('edit_req');
  // Either half: a diverged field, or a staged change (contractor swap,
  // delete). This only asked the first, so a staged change flagged nothing.
  if(typeof taskHasOpenChangeOrder === 'function' && taskHasOpenChangeOrder(t)) synth.push('co_open');
  // Modifiers live on products now, so they're gathered from there rather
  // than read off the task. t.mods stays in the list for seeded data.
  const pm = (typeof taskProductMods === 'function') ? taskProductMods(t) : [];
  const mods = [...new Set([...(t.mods||[]), ...pm])];
  return [...(t.flags||[]).filter(f => f !== 'missing'), ...mods, ...synth];
}
function hasAttention(t){ return taskKeys(t).length>0; }

function visibleTasks(){
  if(activeFilters.size===0) return TASKS.slice();
  return TASKS.filter(t => taskKeys(t).some(a => activeFilters.has(a)));
}
function attCounts(){
  const c={};
  // Seed every project modifier at zero so the dropdown can show a real
  // count rather than omitting the option.
  if(typeof PROJECT_MODS !== 'undefined') PROJECT_MODS.forEach(md => { c[md.id] = 0; });
  TASKS.forEach(t=>taskKeys(t).forEach(a=>{c[a]=(c[a]||0)+1;}));
  return c;
}
function groupTasks(tasks){
  // The sidebar used to take these in whatever order they arrived, while
  // the right panel banded them by state — so the same task sat in two
  // different places depending on which side you looked at.
  return _groupTasksRaw(tasks).map(g => ({...g, items: _pgdSortTasksForGroup(g.items)}));
}
function _groupTasksRaw(tasks){
  if(groupBy==='room'){
    const _all = ROOMS.map(r=>({key:r,name:r,pinned:false,items:tasks.filter(t=>t.room===r)}));
    // A draft is a scope being built, so every room stays on the board
    // before it has anything in it — an empty room is where you'd add the
    // first task, not noise. Past draft the scope is settled and a room
    // with nothing in it is just an empty header, so it drops out.
    if(typeof PROJ_MODE !== 'undefined' && PROJ_MODE === 'draft') return _all;
    return _all.filter(g=>g.items.length);
  }
  const un=tasks.filter(t=>!t.gc);
  const gcs=[...new Set(tasks.filter(t=>t.gc).map(t=>t.gc))].sort();
  const groups=[];
  if(un.length) groups.push({key:'__un',name:'Unassigned',pinned:true,items:un});
  gcs.forEach(g=>groups.push({key:g,name:g,pinned:false,items:tasks.filter(t=>t.gc===g)}));
  return groups;
}

/* ════════════ ATTENTION FILTER ════════════ */
function renderFilter(){
  const menu=_afMenuEl();
  // The af element is rendered inside the work-hdr now; if that container
  // hasn't been painted yet (first render pass), just skip — renderWorkHdr
  // will call us again once #afMenu exists.
  if(!menu) return;
  const counts=attCounts();
  // Flags are system-detected problems on a task — something is wrong and
  // wants resolving. Change orders aren't a problem, they're a step in the
  // process, so they sit in their own Workflow band between the flags and
  // the user-created modifiers.
  const flagOrder=['no_gc','oos'];
  const flowOrder=['co_open'];
  // These filters are meaningful even at count=0 (they're the "state"
  // filters an admin scans for regularly), so always surface them in the
  // dropdown even when nothing currently matches.
  const alwaysShow = new Set(['no_gc','co_open']);
  const modOrder=PROJECT_MODS.map(m=>m.id);
  function optHTML(k){
    const on=activeFilters.has(k); const info=tagInfo(k);
    const c = counts[k] || 0;
    return `<button class="af-opt${on?' on':''}${c===0?' is-empty':''}" onclick="toggleFilter('${k}')">
      <span class="dot ${info.cls}"></span><span class="lbl">${info.label}</span>
      <span class="n">${c}</span>
      <svg class="ck" viewBox="0 0 14 14" fill="none"><path d="M2.5 7.5l3 3 6-7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </button>`;
  }
  const flagOpts=flagOrder.filter(k=>counts[k]>0 || alwaysShow.has(k)).map(optHTML).join('');
  const flowOpts=flowOrder.filter(k=>counts[k]>0 || alwaysShow.has(k)).map(optHTML).join('');
  // Every project modifier is listed whether or not anything carries it.
  // Dropping the empty ones made the list change shape between steps,
  // which reads as the filter ignoring the step rather than reporting
  // it — a modifier nothing uses should say 0, like the flags do.
  const modOpts=modOrder.map(optHTML).join('');
  let body='';
  if(flagOpts) body+=`<div class="af-grouplabel">Flags</div>`+flagOpts;
  if(flowOpts) body+=`<div class="af-grouplabel">Workflow</div>`+flowOpts;
  if(modOpts) body+=`<div class="af-grouplabel">Modifiers</div>`+modOpts;
  if(!body) body=`<div class="af-grouplabel" style="padding:10px">No attention items in scope</div>`;
  const vis=visibleTasks().length;
  const showing=activeFilters.size?`Showing ${vis} of ${TASKS.length}`:`${TASKS.length} tasks`;
  menu.innerHTML=body+`<div class="af-foot"><span class="af-showing">${showing}</span>
    <button class="af-clear" onclick="clearFilter()" ${activeFilters.size?'':'disabled'}>Clear all</button></div>`;
  const af=document.getElementById('af');
  const total=[...activeFilters].reduce((s,k)=>s+(counts[k]||0),0);
  if(af) af.classList.toggle('active',activeFilters.size>0);
  const label = activeFilters.size?(activeFilters.size===1?tagInfo([...activeFilters][0]).label:`${activeFilters.size} filters`):'Filters';
  const countStr = activeFilters.size?total:'';
  // Legacy in-iframe label/count are hidden stubs now; keep updating them so
  // any code that reads back still works.
  const lbl=document.getElementById('afLabel'); if(lbl) lbl.textContent = label;
  const cnt=document.getElementById('afCount'); if(cnt) cnt.textContent = countStr;
  _afReopenIfPending();   // populated now, safe to show
}
/* A filter is a search, so its results have to be visible. The sidebar
   collapses all but the first group by default, which would hide the matches
   inside closed headers and make the result look emptier than it is.
   Deliberately does nothing when the last filter is cleared: re-collapsing
   would throw away whatever the user had opened while filtering. */
function _sbExpandForFilter(){
  if(typeof activeFilters === 'undefined' || !activeFilters.size) return;
  if(collapsedGrps) collapsedGrps.clear();
  else collapsedGrps = new Set();   // empty, so renderSidebar doesn't seed it collapsed
}

function toggleFilter(k){
  activeFilters.has(k) ? activeFilters.delete(k) : activeFilters.add(k);
  _sbExpandForFilter();
  renderAll();
}
function clearFilter(){ activeFilters.clear(); renderAll(); }

/* ════════════ SCOPE VERSION CHIP (sidebar header) ════════════ */
function toggleVersion(e){
  e.stopPropagation();
  const chip = document.getElementById('verChip');
  chip.classList.toggle('open');
  if(chip.classList.contains('open')){
    renderVersionMenu();
    // Fixed position so the dropdown escapes the sidebar's overflow:hidden.
    // Compute from the chip's rect on every open so scroll / resize stays fresh.
    const btn = chip.querySelector('.ver-chip-btn');
    const menu = document.getElementById('verMenu');
    if(btn && menu){
      const r = btn.getBoundingClientRect();
      menu.style.left = r.left + 'px';
      menu.style.top  = (r.bottom + 6) + 'px';
    }
  }
}
function renderVersionChip(){
  const v = VERSIONS.find(x => x.id === currentVersionId) || VERSIONS[0];
  const labelEl = document.getElementById('verChipLabel');
  const tagEl = document.getElementById('verChipTag');
  if(labelEl) labelEl.textContent = 'v' + v.num;
  if(tagEl){
    const {tag, tagCls} = versionTag(v);
    tagEl.textContent = tag;
    tagEl.className = 'ver-chip-tag ' + (tagCls || '');
  }
}
function renderVersionMenu(){
  const menu = document.getElementById('verMenu');
  if(!menu) return;
  menu.innerHTML = `<div class="ver-menu-h">Scope versions</div>` +
    VERSIONS.map(v => {
      const isCur = v.id === currentVersionId;
      const isLive = v.id === 'v3';
      const {tag, tagCls} = versionTag(v);
      const tagChip = tag ? `<span class="ver-item-badge ${tagCls}">${tag}</span>` : '';
      return `<button class="ver-item${isCur?' on':''}${isLive?' current':''}" onclick="switchVersion('${v.id}')">
        <div class="ver-item-node"><span class="ver-item-dot"></span></div>
        <div class="ver-item-l">
          <div class="ver-item-title">
            <span class="ver-item-num">${versionLabel(v)}</span>
            ${tagChip}
          </div>
          <div class="ver-item-meta">${versionMeta(v)}</div>
        </div>
        <div class="ver-item-r">${v.budget||''}</div>
      </button>`;
    }).join('');
}
function switchVersion(id){
  const changing = (id !== currentVersionId);
  currentVersionId = id;
  const verChipEl = document.getElementById('verChip');
  if(verChipEl) verChipEl.classList.remove('open');
  renderVersionChip();
  applyArchivedState();
  // Notify the shell about the Artifact tab's currently-viewed version.
  // Under the new mental model the sidebar is always v3, so we always
  // report `isArchived:false` — the shell must NOT treat an Artifact-side
  // version pick as an outdated scope. Budget echoes v3's live number.
  const liveV = VERSIONS.find(x => x.id === 'v3');
  try{
    parent.postMessage({
      type:'kai-version-changed',
      versionId:'v3',                       // sidebar's canonical version
      artifactVersionId:id,                 // Artifact's viewer version (new)
      budget:liveV ? liveV.budget : null,   // live budget, not archived one
      at:liveV ? liveV.at : null,
      isArchived:false,                     // sidebar is never archived now
      changing
    }, '*');
  }catch(_){}
}
// Applies visual muting / read-only treatment when viewing v1 or v2, and
// swaps the sidebar total to the archived version's budget. Uses the same
// __KAI_SCOPE_TOTAL_OVERRIDE hook the sidebar renderer already respects so
// the number sticks across re-renders.
function applyArchivedState(){
  // New mental model: the sidebar is always locked to v3. `currentVersionId`
  // now represents which version the Artifact tab is showing. We DON'T flip
  // the body's `viewing-archived` class anymore — that would dim the sidebar
  // and hide task actions, which is the opposite of what we want.
  //
  // Archived-view treatment used to live inside the Artifact area but the
  // copies model owns version routing directly (each copy pins its own
  // basedOnVersionId), so the artifact renderer no longer dims archived docs.
  //
  // Keep the budget override + shell notification wired so downstream code
  // that reads the currently-viewed version stays consistent.
  const v = VERSIONS.find(x => x.id === currentVersionId);
  __KAI_SCOPE_TOTAL_OVERRIDE = null; // sidebar always shows live budget
  // Re-render the artifact if it's the active tab so the version swap is
  // visible immediately; sidebar re-render is intentionally skipped.
  if(workMode === 'artifact' && typeof renderArtifact === 'function') renderArtifact();
  if(typeof renderStateBar === 'function') renderStateBar();
}
/* ── STATE BAR (in the sidebar) ─────────────────────────────────────────
   Sits directly under the sidebar header. Shows: current mode + copy +
   primary action for whatever stage the project is in. Version identifier
   is omitted — the version chip in the header already shows v3 · CURRENT.
   State priority: outdated > draft > edit-mode (change-order) > in-review >
   approved-view. */
/* ── Filter menu portal ──────────────────────────────────────────────
   The menu lives under <body> while open: the sidebar clips overflow, and
   the state bar it belongs to is rebuilt on every render. Both would
   otherwise snip the popover. */
function _afMenuEl(){
  // A copy under <body> is the portaled one; the in-sidebar copy is a fresh
  // shell from the last state-bar rebuild and is the one that gets clipped.
  return document.querySelector('body > .af-menu') || document.getElementById('afMenu');
}
function _openAfMenu(){
  const af = document.getElementById('af');
  const menu = _afMenuEl();
  if(!af || !menu) return;
  af.classList.add('open');
  if(menu.parentElement !== document.body) document.body.appendChild(menu);
  menu.classList.add('af-menu-portal');
  const btn = af.querySelector('.af-btn');
  if(btn){
    const r = btn.getBoundingClientRect();
    // Right edge under the button, so it drops down and to the left.
    menu.style.top  = (r.bottom + 6) + 'px';
    menu.style.left = Math.max(8, r.right - 280) + 'px';
  }
}
function _closeAfMenu(){
  document.querySelectorAll('.af.open').forEach(n => n.classList.remove('open'));
  // Strip the portal class wherever it is: it carries display:block !important,
  // so a copy left flagged would sit in the sidebar as an empty white box.
  document.querySelectorAll('.af-menu.af-menu-portal').forEach(n => n.classList.remove('af-menu-portal'));
  // Park the node back inside #af rather than deleting it. It holds the
  // rendered options, and renderFilter isn't guaranteed to run before the
  // next open — toggleSbTools and switchVersion both rebuild the state bar
  // on their own. Deleting it left the next open with nothing to show.
  const af = document.getElementById('af');
  document.querySelectorAll('body > .af-menu').forEach(n => {
    if(af && af !== n.parentElement) af.appendChild(n);
    else if(!af) n.remove();
  });
}
/* Called either side of the state bar's innerHTML rewrite. The rebuild
   recreates #afMenu, so the portaled copy has to go first or the id stops
   being unique — but the menu shouldn't shut just because the user picked a
   filter, so it reopens against the newly rendered button. */
function _afMenuWasOpen(){
  const open = !!document.querySelector('.af.open');
  _closeAfMenu();
  return open;
}
/* Set by renderStateBar, consumed by renderFilter once the options are in.
   Showing the menu before it's populated is what put an empty white box
   under the Filters button. */
let _afReopenPending = false;
function _afReopenIfPending(){
  if(!_afReopenPending) return;
  _afReopenPending = false;
  _openAfMenu();
}
function renderStateBar(){
  // The scope-level box lives in the sidebar header, which this function
  // doesn't own — fill it here so it tracks every decision.
  const _sd = document.getElementById('sbScopeDec');
  if(_sd) _sd.innerHTML = scopeDecisionHtml();
  _reportDecisionProgress();
  const bar = document.getElementById('sbStateBar');
  if(!bar) return;
  const _afOpen = _afMenuWasOpen();   // see above
  bar.className = 'sb-state-bar';
  bar.hidden = false;
  // Group by toggle + Filter icon are always present — they're the scoping
  // controls for the sidebar and belong at the top of every state.
  const groupBySeg = `<div class="sb-tools-seg" role="tablist" aria-label="Group scope by">
    <button id="grpRoom" class="${groupBy==='room'?'active':''}" onclick="setGroupBy('room')">Group</button>
    <button id="grpContractor" class="${groupBy==='contractor'?'active':''}" onclick="setGroupBy('contractor')">Contractor</button>
  </div>`;
  // Settings icon — reveals the per-group duplicate icon (draft stage only).
  // Keeps group rows clean by default; click to toggle the tool on/off.
  const settingsIcon = IS_DRAFT_STAGE ? `<button class="sb-tools-settings${sbToolsVisible?' active':''}" onclick="toggleSbTools()" title="Group tools" aria-label="Group tools">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82A1.65 1.65 0 0 0 3 13.09H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
  </button>` : '';
  const filterIcon = `<div class="af sb-tools-af" id="af">
    <button class="af-btn" onclick="toggleAf(event)" title="Filters" aria-label="Filters">
      <svg viewBox="0 0 24 24" fill="none"><path d="M19.5 3.5L11.5 13V23.5L8.5 21.5V13L0.5 3.5V1.5H19.5V3.5Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round"/></svg>
      <span class="af-btn-lbl">Filters</span>
      <span class="af-count" id="afCount"></span>
      <span id="afLabel" hidden></span>
    </button>
    <div class="af-menu" id="afMenu"></div>
  </div>`;
  // The sidebar is always view-only in this variant, so we no longer
  // surface an "Editing" / "View only" chip or the yellow draft-state
  // background. The only surviving state-bar action is the "Return to
  // current" affordance when the user is viewing an outdated version;
  // everything else is just the Room/Contractor toggle + filter icon.
  let actions = '';
  if(currentVersionId !== 'v3'){
    actions = `<button class="sb-state-bar-btn" onclick="switchVersion('v3')">Return to current</button>`;
  }
  // Gear sits at the far right, aligned with the per-group duplicate icon
  // column it toggles (those sit flush with the sidebar's right edge too).
  bar.innerHTML = `${groupBySeg}${filterIcon}<span class="sb-state-bar-sp"></span>${settingsIcon}${actions}`;
  // Remember for renderFilter, which fills the menu; reopening here
  // would show it before it has any options in it.
  _afReopenPending = _afOpen;
  // The rewrite above replaced #afMenu with an empty shell. Fill it now
  // rather than relying on the caller: toggleSbTools and switchVersion
  // call renderStateBar without a renderFilter after it.
  if(typeof renderFilter === 'function') renderFilter();
}
// State-bar button handlers.
function stateBarSubmitForReview(){
  // In change-order editing, submitting also ends the edit session — the
  // user is telling us "I'm done, send it". In draft, editing IS the mode,
  // so we just fire the same approveAll demo toast as before.
  const wasEditing = scopeEditMode;
  if(typeof approveAll === 'function') approveAll();
  if(wasEditing && !IS_DRAFT_STAGE && typeof enterEditMode === 'function'){
    enterEditMode(false);
    if(typeof toast === 'function') toast('Change order submitted for admin review');
  }
}
function stateBarDuplicateAndEdit(){
  if(typeof confirmEditFromApproved === 'function') confirmEditFromApproved();
}
function stateBarSendBackToDraft(){
  // Shell owns the projectStage — ask it to run its own sendBackToDraft flow
  // (opens confirm modal + setProjectStage('edit')).
  try{ parent.postMessage({type:'kai-send-back-to-draft'}, '*'); }catch(_){}
}
function stateBarCancelEdit(){
  if(typeof enterEditMode === 'function') enterEditMode(false);
  if(typeof toast === 'function') toast('Edit cancelled');
}
// Close the version menu when clicking outside.
document.addEventListener('click', e => {
  const chip = document.getElementById('verChip');
  if(chip && chip.classList.contains('open') && !chip.contains(e.target)){
    chip.classList.remove('open');
  }
});
// Initial paint after the DOM is ready. Fires applyArchivedState too so the
// sidebar total lands on v3's canonical budget from the start (matches the
// pre-refactor behavior when the shell used to push the total on load).
document.addEventListener('DOMContentLoaded', ()=>{
  renderVersionChip();
  applyArchivedState();
});
function toggleAf(e){
  e.stopPropagation();
  const af = document.getElementById('af');
  if(!af) return;
  if(af.classList.contains('open')) _closeAfMenu(); else _openAfMenu();
}
document.addEventListener('click',e=>{
  const af = document.getElementById('af');
  const menu = document.getElementById('afMenu');
  // With the menu portaled to <body> it's outside `af`, so a click on a
  // filter option would otherwise be treated as "outside". Guard against
  // that by also excluding the menu itself.
  if(af && !af.contains(e.target) && (!menu || !menu.contains(e.target))){
    _closeAfMenu();
  }
});

