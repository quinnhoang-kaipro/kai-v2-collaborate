/* ════════════ SIDEBAR ════════════ */
function setGroupBy(g){
  groupBy=g; collapsedGrps=null;
  const rBtn=document.getElementById('grpRoom'); if(rBtn) rBtn.classList.toggle('active',g==='room');
  const cBtn=document.getElementById('grpContractor'); if(cBtn) cBtn.classList.toggle('active',g==='contractor');
  renderAll();
}

/* ── SCOPE EDIT MODE ────────────────────────────────────────────────
   User can flip the whole sidebar into an editable scope. This is a UI mock:
   the class toggle exposes all editable affordances that already exist inside
   task rows (contractor dropdown, expanded edit form, delete X), and shows an
   Add-task hint on group headers + a Submit-for-review footer. */
// SHOP-EDIT VARIANT: the sidebar is permanently READ-ONLY. Task editing
// happens in the Shop tab's editable task-detail card, not in the sidebar.
// scopeEditMode is locked to false — even the Edit toggle and draft-stage
// auto-enter are inert here.
let scopeEditMode = false;
// SHOP-EDIT VARIANT: in work AND closeout modes the scope has ALREADY been
// approved, so any field edits create a change order. Snapshot every task's
// current values at load so hasChanged() / wasIndicator() can render "Was
// $X" chips next to fields the user has since modified.
if(PROJ_MODE === 'work' || PROJ_MODE === 'closeout'){
  // Deferred to DOMContentLoaded so TASKS is fully seeded (per any preset
  // fixup that runs above) before we capture the snapshot.
  document.addEventListener('DOMContentLoaded', () => {
    TASKS.forEach(t => {
      __TASK_ORIGINALS[t.id] = {
        name:t.name, opt:t.opt, desc:t.desc, product:t.product,
        pcost:t.pcost, qty:t.qty, rate:t.rate, cost:t.cost,
        gc:t.gc, status:t.status,
        options:(typeof _snapshotOptions === 'function') ? _snapshotOptions(t) : [],
      };
    });
    // Add co-mode body class so the "CHANGE ORDER" pill CSS lights up on
    // any task whose fields diverge from its snapshot. Existing logic added
    // this class only for context=construction URL param; broadening here
    // so closeout mode gets the same treatment.
    document.body.classList.add('co-mode');
  });
}
// Which task descriptions are currently expanded (unfolded) in the Task
// tab card. Long descriptions collapse by default so the card stays
// compact — user clicks "Show more" to see the full text.
let __expandedDescTasks = new Set();
/* The details section — contractor and description — opens by default while
   the scope is being built and reviewed, and closes once work starts. By then
   the contractor is settled and the description is reference. A task the user
   has toggled keeps whatever they chose. */
function _taskDetailsOpen(t){
  if(__expandedDescTasks.has(t.id))  return true;
  if(__collapsedDescTasks.has(t.id)) return false;
  const mode = (typeof PROJ_MODE !== 'undefined') ? PROJ_MODE : 'draft';
  return mode === 'draft' || mode === 'review';
}
let __collapsedDescTasks = new Set();

function toggleDescExpanded(id){
  // Two sets, because the default depends on the stage: remembering only
  // "opened" couldn't express "closed at a stage that opens by default".
  const wasOpen = _taskDetailsOpen({id});
  __expandedDescTasks.delete(id);
  __collapsedDescTasks.delete(id);
  (wasOpen ? __collapsedDescTasks : __expandedDescTasks).add(id);
  if(typeof renderShop === 'function') renderShop();
}
// True when the task has any snapshot-tracked field differing from its
// original. Drives the .co-pending class on the task row → red accent bar
// + "CHANGE ORDER" pseudo-element.
function taskHasSnapshotChanges(t){
  const o = __TASK_ORIGINALS[t.id]; if(!o) return false;
  return ['desc','product','pcost','qty','rate','gc','name','opt'].some(f =>
    String(o[f] ?? '') !== String(t[f] ?? '')
  );
}
// True if ANY task in the scope has snapshot diffs. Drives the shell's
// top-bar CTA swap: when the user has staged change-order edits, the
// primary CTA becomes "Submit Change Order" (with a Cancel Change Order
// button next to it) instead of the stage's normal Submit/Approve.
function anyTaskHasSnapshotChanges(){
  return TASKS.some(t => taskHasSnapshotChanges(t));
}
// Debounced postMessage that mirrors the "change-order in progress" bit
// to the shell. Only fires when the state actually flips so we don't
// spam the shell listener on every keystroke.
let __coEditModeReported = false;
function _reportCoEditMode(){
  if(!IS_CHANGE_ORDER) return;
  const on = anyTaskHasSnapshotChanges();
  if(on === __coEditModeReported) return;
  __coEditModeReported = on;
  try{ parent.postMessage({type:'kai-edit-mode', on}, '*'); }catch(_){}
}
// Aggregate task-completion state for the shell. Gates the "Submit closeout"
// CTA in the top bar — the shell disables it (with an explaining tooltip)
// until every task in the scope is marked Completed.
let __allTasksCompleteReported = null;
function _reportAllTasksComplete(){
  const tasks = Array.isArray(TASKS) ? TASKS : [];
  const allComplete = tasks.length > 0 && tasks.every(t => {
    // A task counts as "complete" if it's approved OR its status is
    // explicitly the terminal `complete` value. Anything else (pending,
    // in_progress, in_review, needs_rework) is not-yet-done.
    if(approved && typeof approved.has === 'function' && approved.has(t.id)) return true;
    return t.status === 'complete';
  });
  if(allComplete === __allTasksCompleteReported) return;
  __allTasksCompleteReported = allComplete;
  try{ parent.postMessage({type:'kai-tasks-complete', allComplete}, '*'); }catch(_){}
}
// Revert every task's snapshot-tracked fields — the "Cancel Change
// Order" nuclear option. Called from the shell's Cancel button.
function cancelAllChangeOrders(){
  const ids = TASKS.filter(t => taskHasSnapshotChanges(t)).map(t => t.id);
  if(!ids.length) return;
  ids.forEach(id => {
    const o = __TASK_ORIGINALS[id];
    const t = TASKS.find(x => x.id === id);
    if(!o || !t) return;
    ['desc','product','pcost','qty','rate','gc','name','opt','cost','status'].forEach(f => {
      if(o[f] !== undefined) t[f] = o[f];
    });
  });
  _reportCoEditMode();
  if(typeof renderAll === 'function') renderAll();
  if(typeof toast === 'function') toast(`Change order cancelled · ${ids.length} task${ids.length===1?'':'s'} reverted`);
}
// Listen for shell → iframe Cancel-Change-Order request. Shell posts this
// when the user clicks the "Cancel change order" button in the top bar.
window.addEventListener('message', e => {
  if(!e || !e.data || typeof e.data !== 'object') return;
  if(e.data.type === 'kai-cancel-change-order') cancelAllChangeOrders();
});
// Revert every snapshot-tracked field on a task back to its captured
// original. Used by the "Undo changes" button on the task-detail card in
// the Task tab. Also recomputes t.cost (which the commit path had been
// live-updating from the delta) so it lines up with the reverted originals.
function undoTaskChanges(id){
  const o = __TASK_ORIGINALS[id];
  const t = TASKS.find(x => x.id === id);
  if(!o || !t) return;
  ['desc','product','pcost','qty','rate','gc','name','opt','cost','status'].forEach(f => {
    if(o[f] !== undefined) t[f] = o[f];
  });
  if(typeof _reportCoEditMode === 'function') _reportCoEditMode();
  if(typeof renderAll === 'function') renderAll();
  if(typeof toast === 'function') toast(`${t.name}: changes reverted`);
}
function toggleScopeEdit(){
  // When the scope has already been approved (Construction stage), the user
  // must confirm via a modal — editing forks a draft copy instead of mutating
  // the live version. In every other stage (draft / review), Edit toggles freely.
  if(!scopeEditMode && IS_CHANGE_ORDER){
    openEditConfirm();
    return;
  }
  enterEditMode(!scopeEditMode);
  if(typeof toast === 'function') toast(scopeEditMode ? 'Scope edit mode on' : 'Edit cancelled');
}
// Actually flip the edit-mode state + button label. Split out so the confirm
// modal can call it without re-running the gating logic in toggleScopeEdit.
function enterEditMode(on){
  scopeEditMode = !!on;
  document.body.classList.toggle('scope-edit-mode', scopeEditMode);
  const btn = document.getElementById('sbEditToggle');
  if(btn){
    btn.setAttribute('aria-pressed', String(scopeEditMode));
    const label = btn.querySelector('span');
    if(label) label.textContent = scopeEditMode ? 'Editing' : 'Edit';
  }
  // Track-changes snapshot: only for scopes that have ALREADY been approved
  // (i.e., not in draft). Snapshotting on edit-mode entry lets the UI show
  // "was $4,820" style indicators next to changed fields. Reset on exit.
  if(scopeEditMode && !IS_DRAFT_STAGE){
    __TASK_ORIGINALS = {};
    TASKS.forEach(t => {
      __TASK_ORIGINALS[t.id] = {
        name:t.name, opt:t.opt, desc:t.desc, product:t.product,
        pcost:t.pcost, qty:t.qty, rate:t.rate, cost:t.cost,
        gc:t.gc, status:t.status,
        options:(typeof _snapshotOptions === 'function') ? _snapshotOptions(t) : [],
      };
    });
  } else if(!scopeEditMode){
    __TASK_ORIGINALS = {};
  }
  // Refresh our sidebar state bar (mode label + copy + button depend on this).
  if(typeof renderStateBar === 'function') renderStateBar();
  // Re-render the sidebar so every expanded task detail switches between
  // its view-mode and edit-mode HTML (detailView reads scopeEditMode when
  // it builds the field markup — without a re-render, the currently-open
  // task keeps its stale view-mode UI even after the toggle flips).
  if(typeof renderSidebar === 'function') renderSidebar();
  // Also let the shell know — it still uses this for lock-modal context.
  try{ parent.postMessage({type:'kai-edit-mode', on:scopeEditMode}, '*'); }catch(_){}
}
// Snapshot of task values captured when scope-edit-mode is entered on an
// already-approved scope. Populated in enterEditMode(true), cleared on exit.
let __TASK_ORIGINALS = {};
function origVal(id, field){
  return __TASK_ORIGINALS[id] ? __TASK_ORIGINALS[id][field] : null;
}
function hasChanged(id, field, current){
  if(!__TASK_ORIGINALS[id]) return false;
  return String(__TASK_ORIGINALS[id][field] ?? '') !== String(current ?? '');
}
// "was $X" indicator rendered next to a changed field. Returns empty string
// when tracking is off (draft mode) or the field hasn't been touched.
function wasIndicator(id, field, current){
  if(!__TASK_ORIGINALS[id]) return '';
  if(!hasChanged(id, field, current)) return '';
  const was = __TASK_ORIGINALS[id][field];
  if(was == null || was === '') return `<span class="td-was td-was-new">Was empty</span>`;
  return `<span class="td-was">Was <span class="td-was-v">${esc(was)}</span></span>`;
}
function openEditConfirm(){
  document.getElementById('seModalScrim')?.classList.add('open');
  document.getElementById('seModal')?.classList.add('open');
}
function closeEditConfirm(){
  document.getElementById('seModalScrim')?.classList.remove('open');
  document.getElementById('seModal')?.classList.remove('open');
}
function confirmEditFromApproved(){
  closeEditConfirm();
  enterEditMode(true);
  if(typeof toast === 'function') toast('Draft copy created · edit and submit when ready');
}
document.addEventListener('keydown', e => {
  if(e.key === 'Escape' && document.getElementById('seModal')?.classList.contains('open')){
    closeEditConfirm();
  }
});
// The shell's state bar owns the Submit-for-review CTA now. When the user
// clicks it there, this listener fires the same handler the iframe's own
// approveBtn used to run so the resulting behavior is identical.
window.addEventListener('message', e => {
  if(!e.data || typeof e.data !== 'object') return;
  if(e.data.type === 'kai-submit-scope'){
    if(typeof approveAll === 'function') approveAll();
  }
  // Approved-scope "Duplicate & edit" from the shell's state bar. The bar
  // copy explains the fork, so we skip the confirm modal and enter edit mode
  // directly. Same downstream behavior as clicking Create draft & edit in the
  // (now-bypassed) modal — enterEditMode(true) also posts kai-edit-mode back
  // to the shell so the bar swaps to the Editing state automatically.
  /* Bulk review from the shell's CTA. Routed through apApproveScope() rather
     than looping tasks here, so the cascade, the toast wording and the
     progress report back to the shell all behave exactly as they do when the
     scope-level control is used in the sidebar. */
  if(e.data.type === 'kai-review-all'){
    if(typeof apApproveScope === 'function') apApproveScope();
  }
  if(e.data.type === 'kai-duplicate-edit'){
    if(typeof confirmEditFromApproved === 'function') confirmEditFromApproved();
  }
  /* The shell's take-the-turn dialogue was confirmed. Straight into edit mode:
     the confirm was the gate, so toggleScopeEdit's own gating would ask twice. */
  if(e.data.type === 'kai-enter-edit'){
    if(typeof enterEditMode === 'function') enterEditMode(true);
  }
  // Shell-triggered version switch (Return to current button, outdated-lock
  // modal). Route through switchVersion so all the local state updates + the
  // 'kai-version-changed' postMessage back to the shell all still fire.
  if(e.data.type === 'kai-set-version'){
    if(typeof switchVersion === 'function' && e.data.versionId){
      switchVersion(e.data.versionId);
    }
  }
  /* kai-set-group-by / kai-toggle-filters / kai-close-filters retired —
     those controls live inline in the iframe's work-hdr now. */
});
function submitScopeChanges(){
  scopeEditMode = false;
  document.body.classList.remove('scope-edit-mode');
  const btn = document.getElementById('sbEditToggle');
  if(btn){
    btn.setAttribute('aria-pressed','false');
    const label = btn.querySelector('span');
    if(label) label.textContent = 'Edit';
  }
  if(typeof toast === 'function') toast('Scope changes handed off for review');
}
function attDots(t){
  const keys=taskKeys(t);
  if(!keys.length) return '';
  return `<div class="task-att">`+keys.map(a=>{const i=tagInfo(a);return `<span class="att-dot ${i.cls}" title="${i.label}"></span>`;}).join('')+`</div>`;
}
/* Return the display-appropriate status for a task, based on the current
   project mode. Language table:
     draft   → "Missing details" (only when task lacks contractor/product)
     review  → "Approved" if approved.has(id), else "Edit Requested"
     work    → the underlying task.status label
     closeout→ "Approved" if task.status==='complete', else "Edit Requested"
*/
function taskStatusFor(t){
  // Edit requested overrides everything — if a user has explicitly asked
  // for admin review of this task, that state trumps any mode-driven pill.
  if(t.editRequested) return STATUS.edit_req;
  if(PROJ_MODE === 'draft'){
    const missing = !t.gc || !t.product || /not selected/i.test(t.product);
    return missing ? STATUS.missing : null;
  }
  if(PROJ_MODE === 'review'){
    // Draw variety from the task's underlying status so the sidebar mixes
    // Approved / Edit Requested / no pill instead of showing the same label on
    // every row: 'complete' or 'in_review' → Approved, 'pending' → Edit
    // Requested, everything else (in_progress, not_started) → no pill (still
    // being looked at by the reviewer).
    if(approved.has(t.id) || t.status === 'complete' || t.status === 'in_review') return STATUS.approved;
    if(t.status === 'pending') return STATUS.edit_req;
    return null;
  }
  // Work and Closeout modes: keep the underlying task status but map
  // 'in_review' → 'needs_rework' and 'pending' → 'not_started' so the
  // vocab matches the language table. Chip always renders — the sidebar
  // uses color as its progress signal.
  if(PROJ_MODE === 'work' || PROJ_MODE === 'closeout'){
    if(t.status === 'in_review') return STATUS.needs_rework;
    if(t.status === 'pending') return STATUS.not_started;
  }
  return STATUS[t.status] || STATUS.not_started;
}
function taskStatus(t){
  // The sidebar reads the same ladder as the task rows and the task
  // header: Pending until reviewed, Reviewed until approved, then the
  // work status once the scope is in construction. taskStatusFor is a
  // different question — it answered "what is this task missing", which
  // is where the Missing details chip came from.
  const s = (typeof _pgdRowStatusMeta === 'function')
    ? _pgdRowStatusMeta(t)
    : taskStatusFor(t);
  if(!s) return '';
  // SHOP-EDIT VARIANT: the sidebar is completely view-only. Every mode
  // renders the status as a static chip — no dropdown, no click handler.
  // In work / closeout mode we normalise the label to the work-mode
  // vocabulary (Not started / In progress / Rework / Completed) so
  // the pill still reads with the right label based on the underlying task
  // state (previously the dropdown handled this remap live).
  if(PROJ_MODE === 'work' || PROJ_MODE === 'closeout'){
    // Pick the work-mode label + color class for the current task state.
    let key;
    if(t.editRequested)                          key = 'needs_rework';
    else if(approved.has(t.id))                  key = 'complete';
    else if((t.flags||[]).includes('missing'))   key = 'not_started';
    else if(t.status === 'in_review')            key = 'needs_rework';
    else if(t.status === 'pending')              key = 'not_started';
    else if(STATUS[t.status])                    key = t.status;
    else                                         key = 'not_started';
    const st = STATUS[key];
    return `<span class="task-status ${st.cls}">${st.label}</span>`;
  }
  // Draft / review modes render the pill straight from taskStatusFor()'s
  // output (Missing details, Approved, Edit Requested, or nothing).
  return `<span class="task-status ${s.cls}">${s.label}</span>`;
}
// Update a task's status from the sidebar dropdown. Clears the derived
// overrides that used to lock the pill (edit-requested flag, missing flag),
// so the user's chosen status becomes the truth and the pill re-renders in
// that state immediately.
function setTaskStatus(id, newStatus){
  const t = TASKS.find(x => x.id === id);
  if(!t || !STATUS[newStatus]) return;
  t.status = newStatus;
  // Setting a status directly resolves any pending edit request — the user
  // is taking action rather than waiting on admin.
  if(t.editRequested){ t.editRequested = false; t.editRequestNote = ''; }
  // If they moved past "not started", any missing-details flag has been
  // implicitly addressed (they've decided the task can proceed).
  if(newStatus !== 'not_started' && Array.isArray(t.flags)){
    t.flags = t.flags.filter(f => f !== 'missing');
  }
  // Mirror the change-order-active bit to the shell too — status changes
  // during work/closeout stages count as staged edits.
  if(typeof _reportCoEditMode === 'function') _reportCoEditMode();
  if(typeof renderAll === 'function') renderAll();
  if(typeof toast === 'function') toast(`${t.name} → ${STATUS[newStatus].label}`);
}
function esc(s){ return String(s==null?'':s).replace(/"/g,'&quot;'); }

/* ── expanded detail: VIEW mode ── */
// LEGACY: rendered into the sidebar's expanded .task-detail before the flat row redesign. Unreachable from the ShopEdit variant now — the Editor tab card owns task detail.
function detailView(t){
  const st=STATUS[t.status]||STATUS.not_started;
  const productMuted=/not selected|pending/i.test(t.product||'');
  const thumb=`<div class="td-thumb${t.photos?'':' empty'}"><svg viewBox="0 0 24 24" fill="none"><path d="M22.4286 1.4H1.4286V22.4H22.4286V1.4Z" stroke="currentColor" stroke-miterlimit="10"/><path d="M10.2707 9.4132L8.0602 10.7947L5.8497 9.4132V7.2026L8.0602 5.821L10.2707 7.2026V9.4132Z" stroke="currentColor" stroke-miterlimit="10"/><path d="M15.2444 9.1368L11.9286 14.6632L9.1654 13.5579L6.9549 16.8737H18.0075L15.2444 9.1368Z" stroke="currentColor" stroke-miterlimit="10"/></svg></div>`;
  let att='';
  // Flags row removed : the two flags relevant here (missing / out of stock)
  // are both product-related and surface inline on the Product row below.
  // Modifiers zone now lives in a fixed row just above the Photos/Notes/History
  // links (see below), so it doesn't drift depending on whether any exist yet.
  const flagSet = new Set(t.flags||[]);
  const productBadge = flagSet.has('missing')
    ? `<span class="td-inline-flag missing"><span class="dot"></span>Missing product<button class="resolve" onclick="event.stopPropagation()">Select</button></span>`
    : flagSet.has('oos')
    ? `<span class="td-inline-flag oos"><span class="dot"></span>Out of stock<button class="resolve" onclick="event.stopPropagation()">Resolve</button></span>`
    : '';
  const isApproved=approved.has(t.id);
  // Modifier row : always renders in the same spot (above Photos/Notes/History)
  const modChips = (t.mods||[]).map(a=>{
    const i=tagInfo(a);
    return `<span class="td-mod ${i.modKind==='financial'?'fin':'disp'}">${i.label}
      <button class="td-mod-x" onclick="event.stopPropagation();removeMod(${t.id},'${a}')" title="Remove">×</button></span>`;
  }).join('');
  // SHOP-EDIT VARIANT: sidebar is view-only. Modifiers still surface as
  // read-only chips (with their remove × handlers stripped) so the user can
  // see what's on the task, but adding/removing happens in the Task tab.
  const modChipsRO = (t.mods || []).map(a => {
    const i = tagInfo(a);
    return `<span class="td-mod ${i.modKind==='financial'?'fin':'disp'}">${i.label}</span>`;
  }).join('');
  const modRowHtml = `<div class="td-zone td-mod-row${modChipsRO?'':' is-empty'}">
    <div class="td-zone-head" style="align-items:center">
      <span class="td-label">Modifiers${modChipsRO?'':' <span class="td-inline-none">· None</span>'}</span>
    </div>
    ${modChipsRO?`<div class="td-mods">${modChipsRO}</div>`:''}
  </div>`;
  // Notes pill sits inline next to the Contractor field (right side of the
  // same row). The Photos pill beside it went with the photo drawer — photos
  // are reached from the photo row's "View all & add" and its gear now.
  const attachPills = `<button class="td-pill" onclick="event.stopPropagation();openDrawer(${t.id},'notes')" title="Notes">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M15.5 23.5H0.5V1.5H22.5V16.5L15.5 23.5Z"/><path d="M15.5 23.5V16.5H22.5"/></svg>
    Notes${t.notes?`<span class="td-pill-n">${t.notes}</span>`:''}
  </button>`;
  // When the whole scope is in edit mode, render every field as a live
  // input so users can click to edit directly. Fields commit on blur via
  // commitTaskField — the top state bar's Cancel/Submit is the batch save.
  const editMode = !!scopeEditMode;
  // Track-changes: only fires when a snapshot exists (approved scope only).
  const isTracking = editMode && !!__TASK_ORIGINALS[t.id];
  const wDesc  = isTracking ? wasIndicator(t.id,'desc',   t.desc)    : '';
  const wProd  = isTracking ? wasIndicator(t.id,'product',t.product) : '';
  const wCost  = isTracking ? wasIndicator(t.id,'pcost',  t.pcost)   : '';
  const wQty   = isTracking ? wasIndicator(t.id,'qty',    t.qty)     : '';
  const wRate  = isTracking ? wasIndicator(t.id,'rate',   t.rate)    : '';
  const wGc    = isTracking ? wasIndicator(t.id,'gc',     t.gc)      : '';
  const descHtml = editMode
    ? `<textarea class="td-edit-field td-edit-desc${hasChanged(t.id,'desc',t.desc)?' is-changed':''}" onclick="event.stopPropagation()" oninput="commitTaskField(${t.id},'desc',this.value);requestRerenderDetail(${t.id})" placeholder="Add a description…">${esc(t.desc||'')}</textarea>${wDesc}`
    : `<p class="td-desc">${t.desc||':'}</p>`;
  // Product isn't a free-text field — even in edit mode, users pick from the
  // Shop tab so pricing/SKU stay consistent. Edit mode swaps in a "Browse"
  // button next to the current product name that opens the Shop for this task.
  const productChangedCls = hasChanged(t.id,'product',t.product) ? ' is-changed' : '';
  const productHtml = editMode
    ? `<div class="td-product-edit${productChangedCls}">
        <span class="td-product-current${productMuted?' muted':''}">${productMuted||!t.product?'No product selected yet':esc(t.product)}</span>
        <button class="td-product-browse" onclick="event.stopPropagation();browseProductForTask(${t.id})" title="${t.product?'Open Shop to change the selected product':'Open Shop to pick a product'}">
          <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 7h4M7 5v4" stroke-linecap="round"/><circle cx="7" cy="7" r="5.5"/></svg>
          ${t.product?'Change':'Browse'}
        </button>
      </div>${wProd}`
    : (productBadge || `<span class="td-value${productMuted?' muted':''}" style="min-height:0">${t.product||':'}</span>`);
  const qtyParts = parseQty(t.qty);
  const costLineHtml = editMode
    ? `<div class="td-costline is-editable">
        <div class="td-cost"><span class="td-label">Product cost</span>
          <input class="td-edit-field td-edit-cost${hasChanged(t.id,'pcost',t.pcost)?' is-changed':''}" value="${esc(t.pcost||'')}" placeholder="$0" onclick="event.stopPropagation()" oninput="commitTaskField(${t.id},'pcost',this.value);requestRerenderDetail(${t.id})">
          ${wCost}</div>
        <div class="td-cost"><span class="td-label">Quantity</span>
          <div class="td-edit-qty-wrap">
            <input class="td-edit-field td-edit-cost td-edit-qty-num${hasChanged(t.id,'qty',t.qty)?' is-changed':''}" type="number" step="any" value="${esc(qtyParts.num)}" placeholder="0" onclick="event.stopPropagation()" oninput="commitTaskQtyNum(${t.id},this.value);requestRerenderDetail(${t.id})">
            ${qtyParts.unit?`<span class="td-edit-qty-unit" title="Unit is locked in edit mode">${qtyParts.unit}</span>`:''}
          </div>
          ${wQty}</div>
        <div class="td-cost"><span class="td-label">Labor rate</span>
          <input class="td-edit-field td-edit-cost${hasChanged(t.id,'rate',t.rate)?' is-changed':''}" value="${esc(t.rate||'')}" placeholder="$0" onclick="event.stopPropagation()" oninput="commitTaskField(${t.id},'rate',this.value);requestRerenderDetail(${t.id})">
          ${wRate}</div>
      </div>`
    : `<div class="td-costline">
        <div class="td-cost"><span class="td-label">Product cost</span><span class="td-cost-v">${t.pcost||':'}</span></div>
        <div class="td-cost"><span class="td-label">Quantity</span><span class="td-cost-v">${t.qty||':'}</span></div>
        <div class="td-cost"><span class="td-label">Labor rate</span><span class="td-cost-v">${t.rate||':'}</span></div>
      </div>`;
  return `<div class="td-inner${editMode?' is-editable':''}">
    <div class="td-section">
      <div class="td-section-head">
        <span class="td-label">Description</span>
        <span class="td-code-inline">${t.code}</span>
      </div>
      ${descHtml}
    </div>

    <div class="td-section">
      <span class="td-label">Product</span>
      <div class="td-product-val">${thumb}<div style="display:flex;flex-direction:column;gap:6px;min-width:0;flex:1">${productHtml}</div></div>
    </div>

    <div class="td-row2 td-row-gc">
      <div class="td-field"><span class="td-label">Contractor</span>
        <div class="td-gc-picker">
          ${editMode
            ? `<select class="td-gc-select${t.gc?'':' un'} is-editable${hasChanged(t.id,'gc',t.gc)?' is-changed':''}" onclick="event.stopPropagation()" onchange="setTaskContractor(${t.id}, this.value);requestRerenderDetail(${t.id})">
                <option value=""${!t.gc?' selected':''}>Unassigned</option>
                ${CONTRACTORS.map(c=>`<option${c===t.gc?' selected':''}>${c}</option>`).join('')}
              </select>${wGc}`
            : `<span class="td-value${t.gc?'':' muted'}" style="min-height:0">${t.gc || 'Unassigned'}</span>`
          }
        </div>
      </div>
      <div class="td-attach-cell">${attachPills}</div>
    </div>

    ${costLineHtml}

    ${att}

    ${modRowHtml}

    ${PROJ_MODE === 'work'
      // SHOP-EDIT VARIANT: sidebar is view-only in work mode. No "Update
      // progress" CTA here — progress updates get logged from the Task tab
      // or the Progress tab's composer.
      ? ''
      : PROJ_MODE === 'closeout'
      // Closeout mode — admin is reviewing before sign-off. Approve + Request
      // edit stay in the sidebar because those are the meaningful "sign off"
      // actions during the closeout review — not scope edits.
      ? `<div class="actrow task-actrow">
        <button class="act approve${isApproved?' done':''}" onclick="event.stopPropagation();toggleApprove(${t.id})">
          <svg viewBox="0 0 24 24"><path d="M5 12l4 4 10-11"/></svg>
          ${isApproved ? approveDoneLabel() : approveActionLabel()}
        </button>
        <button class="act edit${t.editRequested?' done':''}" onclick="event.stopPropagation();openEditRequest(${t.id})">
          <svg viewBox="0 0 25 25" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M2.246 18.707L20.246 0.707L23.746 4.207L5.746 22.207L0.746 23.707L2.246 18.707Z"/><path d="M5.746 22.207L2.246 18.707"/></svg>
          ${t.editRequested?'Edit requested':'Request edit'}
        </button>
      </div>`
      : `<div class="actrow task-actrow">
        <button class="act approve${isApproved?' done':''}" onclick="event.stopPropagation();toggleApprove(${t.id})">
          <svg viewBox="0 0 24 24"><path d="M5 12l4 4 10-11"/></svg>
          ${isApproved ? approveDoneLabel() : approveActionLabel()}
        </button>
        <button class="act edit${t.editRequested?' done':''}" onclick="event.stopPropagation();openEditRequest(${t.id})">
          <svg viewBox="0 0 25 25" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M2.246 18.707L20.246 0.707L23.746 4.207L5.746 22.207L0.746 23.707L2.246 18.707Z"/><path d="M5.746 22.207L2.246 18.707"/></svg>
          ${t.editRequested?'Edit requested':'Request edit'}
        </button>
      </div>`
    }
    ${editRequestFor===t.id?`<div class="ereq-popover ereq-popover-compact" onclick="event.stopPropagation()">
      <textarea class="ereq-input" id="ereqText_${t.id}" placeholder="Add a note (optional)" rows="1" oninput="ereqDraft=this.value;ereqAutoGrow(this)" autofocus></textarea>
      <div class="ereq-actions">
        <button class="ereq-btn ereq-btn-ghost" onclick="closeEditRequest()">Cancel</button>
        <button class="ereq-btn ereq-btn-primary" onclick="sendEditRequest(${t.id})">Send request</button>
      </div>
    </div>`:''}
    ${t.editRequested && t.editRequestNote ? `<div class="ereq-existing">
      <span class="ereq-existing-lbl">Your request</span>
      <span class="ereq-existing-body">${esc(t.editRequestNote)}</span>
    </div>` : ''}
  </div>`;
}

/* ── expanded detail: EDIT mode ── */
function detailEdit(t){
  const d=editDraft;
  const optOpts=[...new Set([...OPTIONS, t.opt])].filter(Boolean)
    .map(o=>`<option ${o===d.opt?'selected':''}>${o}</option>`).join('');
  const gcOpts=`<option value="" ${!d.gc?'selected':''}>Unassigned</option>`+
    CONTRACTORS.map(c=>`<option ${c===d.gc?'selected':''}>${c}</option>`).join('');
  return `<div class="td-inner">
    <div class="td-head td-head-compact">
      <select class="td-select td-status-select" onchange="editField('status',this.value)">${
        Object.keys(STATUS).map(k=>`<option value="${k}" ${k===d.status?'selected':''}>${STATUS[k].label}</option>`).join('')
      }</select>
      <div class="td-actions">
        <button class="td-btn ghost" onclick="event.stopPropagation();cancelEdit(${t.id})">Cancel</button>
        <button class="td-btn primary" onclick="event.stopPropagation();saveEdit(${t.id})">Save</button>
      </div>
    </div>

    <div class="td-row2">
      <div class="td-field"><span class="td-label">Task name</span>
        <input class="td-input" value="${esc(d.name)}" oninput="editField('name',this.value)"></div>
      <div class="td-field"><span class="td-label">Option</span>
        <select class="td-select" onchange="editField('opt',this.value)">${optOpts}</select></div>
    </div>

    <div class="td-section">
      <div class="td-section-head">
        <span class="td-label">Description</span>
        <span class="td-code-inline">${t.code}</span>
      </div>
      <textarea class="td-input td-textarea" oninput="editField('desc',this.value)">${esc(d.desc)}</textarea>
    </div>

    <div class="td-section">
      <span class="td-label">Product</span>
      <input class="td-input" value="${esc(d.product)}" oninput="editField('product',this.value)">
    </div>

    <div class="td-row2">
      <div class="td-field"><span class="td-label">Contractor</span>
        <select class="td-select" onchange="editField('gc',this.value)">${gcOpts}</select></div>
    </div>

    <div class="td-costline">
      <div class="td-cost"><span class="td-label">Product cost</span>
        <input class="td-input" value="${esc(d.pcost)}" oninput="editField('pcost',this.value)"></div>
      <div class="td-cost"><span class="td-label">Quantity</span>
        <input class="td-input" value="${esc(d.qty)}" oninput="editField('qty',this.value)"></div>
      <div class="td-cost"><span class="td-label">Labor rate</span>
        <input class="td-input" value="${esc(d.rate)}" oninput="editField('rate',this.value)"></div>
    </div>

    <div class="td-section">
      <span class="td-label">Modifiers</span>
      <div class="td-mod-manage">${
        PROJECT_MODS.map(m=>{
          const on=(d.mods||[]).includes(m.id);
          return `<button class="td-mod-toggle${on?' on':''}" onclick="event.stopPropagation();toggleDraftMod('${m.id}')">
            <span class="tk">${on?'✓':'+'}</span>${m.label}<span class="mk">${m.kind==='financial'?'$':''}</span></button>`;
        }).join('')
      }</div>
    </div>
  </div>`;
}

function taskRow(t){
  const isApproved=approved.has(t.id);
  const needs = (typeof needsProduct==='function') && needsProduct(t);
  // "Change order" indicator on a task row lights up when either the legacy
  // co-mode staged-change path OR the SHOP-EDIT variant's snapshot diff has
  // any pending changes on this task.
  // Either side of the handoff: the row is red while a change is in
  // flight, and the pill only appears once it's been submitted.
  const hasCo = (typeof taskHasAnyChangeOrder === 'function') && taskHasAnyChangeOrder(t);
  // A $0 task hasn't been scoped yet (no option/product carries a real
  // cost) — read as "Missing details" instead of a literal $0, and dim the
  // whole row so it reads as not-yet-actionable.
  const isMissing = dollars(t.cost) === 0;
  // Modifier chips (abbreviated, mono) inline next to the contractor on the
  // flat row. Uses tagInfo(a).label so labels stay in sync with the mod defs.
  // Modifiers are set on products now, so this gathers them from the task's
  // picked products as well as t.mods. Same chip it always rendered — the
  // only change is where the list comes from.
  const _rowMods = (typeof taskProductMods === 'function')
    ? [...new Set([...(t.mods || []), ...taskProductMods(t)])]
    : (t.mods || []);
  const modChipsHtml = _rowMods.map(a => {
    const i = tagInfo(a);
    return `<span class="task-mod" title="${esc(i.label)}">${esc(i.label)}</span>`;
  }).join('');
  // The contractor is no longer shown here — the task card and the group
  // table's Contractor column both still carry it.
  const amtHtml = isMissing
    ? `<span class="task-amt">$--</span>`
    : `<span class="task-amt">${t.cost}</span>${deltaChipHtml(taskDelta(t))}`;
  return `<div class="task${selId===t.id?' sel':''}${isApproved?' approved':''}${needs?' needs-product':''}${hasCo?' co-pending':''}${(typeof __CO_REMOVED !== 'undefined' && __CO_REMOVED.has(t.id))?' co-removed':''}${isMissing?' is-missing':''}" data-tid="${t.id}">
    <div class="task-row" onclick="selectTask(${t.id})">
      <div class="task-mid">
        <div class="task-mid-top">
          ${typeof flagMarkHtml === 'function' ? flagMarkHtml(t, 'task-flag') : ''}<span class="task-name">${t.name}</span>
        </div>
        <div class="task-mid-status">${taskStatus(t)}${modChipsHtml}</div>
        ${(() => {
          // Only emitted when there's something in it. It used to always
          // render and lean on :empty to collapse, which never matched —
          // the newline inside the tag is a text node.
          const co = (typeof _coPillHtml === 'function') ? _coPillHtml(t) : '';
          return co ? `<div class="task-mid-meta">${co}</div>` : '';
        })()}
      </div>
      <div class="task-right">
        ${taskDecisionHtml(t)}
        <span class="task-amt-line">${amtHtml}</span>
      </div>
    </div>
  </div>`;
}
function renderSidebar(){
  // The white Scope bar is the scope-level nav target. Availability is
  // a body class (so CSS can drop the affordance entirely at the Edit
  // stage) and selection mirrors the group rows' is-selgrp treatment.
  const _sbHdr = document.getElementById('sbHdr');
  if(_sbHdr){
    document.body.classList.toggle('scope-nav', SCOPE_VIEW_ENABLED);
    _sbHdr.classList.toggle('is-selscope', SCOPE_VIEW_ENABLED && scopeView && !selId && !selGroupKey);
    _sbHdr.setAttribute('tabindex', SCOPE_VIEW_ENABLED ? '0' : '-1');
  }
  const tasks=visibleTasks();
  const scroll=document.getElementById('sbScroll');
  const groups=groupTasks(tasks);
  const ruCount=tasks.length;
  const ruCost=tasks.reduce((s,t)=>s+dollars(t.cost),0);
  // If the shell has pushed a version-specific scope total (via postMessage), show
  // that number instead of the summed task total — so versions read consistently
  // between the version dropdown and the sidebar rollup.
  const totalDisplay = (typeof __KAI_SCOPE_TOTAL_OVERRIDE !== 'undefined' && __KAI_SCOPE_TOTAL_OVERRIDE) ? __KAI_SCOPE_TOTAL_OVERRIDE : money(ruCost);
  const scopeDeltaChip = deltaChipHtml(scopeDelta());
  // The count sits left of the title now; the rollup keeps the money.
  const _hc = document.getElementById('sbHdrCount');
  if(_hc) _hc.textContent = `${ruCount} ${ruCount===1?'task':'tasks'}`;
  document.getElementById('sbRollup').innerHTML=
    `<span class="total">${totalDisplay}</span>${scopeDeltaChip}`;
  if(!groups.length){
    // Distinguish "the whole scope is empty" (Step 1 · Empty draft — offer
    // an add-your-first-group CTA) from "you filtered everything out"
    // (offer a clear-filters CTA instead).
    if(TASKS.length === 0){
      scroll.innerHTML = `<div class="ph" style="height:auto;padding:40px 20px;text-align:center">
        <div class="ph-title" style="font-size:15px;margin-bottom:6px">Empty scope</div>
        <div class="ph-desc" style="margin-bottom:16px">Duplicate an existing group to get started, then add tasks to it.</div>
      </div>`;
    } else {
      scroll.innerHTML=`<div class="ph" style="height:200px"><div class="ph-title" style="font-size:15px">No tasks match</div><div class="ph-desc">Clear the filter to see the full scope.</div></div>`;
    }
    return;
  }
  if(collapsedGrps===null) collapsedGrps=new Set(groups.slice(1).map(g=>g.key));
  scroll.innerHTML=groups.map(g=>{
    const cost=g.items.reduce((s,t)=>s+dollars(t.cost),0);
    const isCollapsed=collapsedGrps.has(g.key);
    const allApproved=g.items.every(t=>approved.has(t.id));
    // In draft mode we surface an "Add task" affordance INSIDE each group
    // (see draftAddTaskRow below) rather than a "+" button in the header —
    // the block-level dashed row matches the "+ New group" pattern at the
    // bottom of the sidebar so the two add-affordances read as one system.
    // Every stage but the last can take a new task: drafting, reviewing,
    // and during the work itself, where it lands as a change order. Only
    // closeout-approved is closed to it — that scope is signed off.
    const _canAddTask = PROJ_MODE !== 'closeout-approved';
    const draftAddTaskRow = _canAddTask ? `<button class="grp-new-task" onclick="event.stopPropagation();addTaskToGroup('${g.key}')" title="Add a task to ${g.name}">
      <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M7 3v8M3 7h8"/></svg>
      <span>New task</span>
    </button>` : '';
    // SHOP-EDIT VARIANT: sidebar is view-only. No "+ Update" affordance on
    // group headers — updates get posted from the Task / Progress tabs.
    const progressAdd = '';
    return `<div class="grp${g.pinned?' pinned':''}${isCollapsed?' collapsed':''}${approvedGroupsExplicit.has(g.key)?' allapproved':''}${selGroupKey===g.key?' is-selgrp':''}${g.items.length?'':' is-empty'}" data-grp="${g.key}">
      <div class="grp-hdr" onclick="selectGroup('${g.key}')">
        <button class="grp-caret-btn" onclick="event.stopPropagation();toggleGrp(this)" aria-label="Toggle group" title="Expand / collapse">
          <svg class="grp-caret" viewBox="0 0 12 12" fill="none"><path d="M3 4.5L6 7.5l3-3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <span class="grp-name">${g.name}</span>
        ${(()=>{
          // Plain task-count caption next to the group name. No more
          // "N / M tasks approved" — just the total, so the row reads
          // uniformly across every project stage.
          const n = g.items.length;
          return `<span class="grp-approve-caption" title="${n} ${n===1?'task':'tasks'}">${n} ${n===1?'task':'tasks'}</span>`;
        })()}
        <span class="grp-total">${money(cost)}</span>
        ${groupDecisionHtml(g)}
        ${deltaChipHtml(groupDelta(g.items))}
        ${(IS_DRAFT_STAGE && !g.pinned && sbToolsVisible)?`<button class="grp-dup" onclick="event.stopPropagation();duplicateGroup('${g.key}')" title="Duplicate ${esc(g.name)} group">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><rect x="8.5" y="8.5" width="11" height="11" rx="1"/><path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5"/></svg></button>`:''}
        ${progressAdd}
      </div>
      <div class="grp-body">
        ${addingTaskFor === g.key ? `<div class="ntp" onclick="event.stopPropagation()">
          <div class="ntp-search">
            <svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="7" cy="7" r="5" stroke="currentColor" stroke-width="1.4"/><path d="M11 11l3 3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
            <input type="text" id="ntpSearchInput" placeholder="Search tasks to add…" value="${esc(addTaskSearch)}" oninput="setAddTaskSearch(this.value)">
            <button class="ntp-close" onclick="event.stopPropagation();closeTaskPicker()" aria-label="Close">
              <svg viewBox="0 0 12 12" fill="none"><path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
            </button>
          </div>
          <div class="ntp-list" id="ntpList">${_ntpListRowsHtml()}</div>
        </div>` : draftAddTaskRow}
        ${g.items.map(taskRow).join('')}
      </div>
    </div>`;
  }).join('');
}
// Placeholder handlers for the draft-mode add affordances. They toast for now
// and can be wired to real task/group creation UIs when we build that flow out.
/* ── New Task picker ─────────────────────────────────────────────────
   Panel that opens INSIDE a group body when the user clicks "+ New task".
   Replaces the group's task list with a search input + a scrollable list of
   template tasks tagged by trade category. Picking a template appends a new
   task to the group and closes the picker. Only one picker can be open at a
   time (tracked via `addingTaskFor`). */
let addingTaskFor = null;    // group key of the currently-open picker
let addTaskSearch = '';      // live search query
// Curated catalog of common construction/renovation task templates. Categories
// mirror trades so the right-column tag reads as a scope label at a glance.
const NEW_TASK_TEMPLATES = [
  {name:'Kitchen and Dining Lighting',   cat:'Lighting'},
  {name:'Recessed Can Lighting',         cat:'Lighting'},
  {name:'Pendant Fixture',               cat:'Lighting'},
  {name:'Smoke and CO Detectors',        cat:'Safety'},
  {name:'GFCI Outlets',                  cat:'Electrical'},
  {name:'Switches and Outlets',          cat:'Electrical'},
  {name:'Electrical Panel Upgrade',      cat:'Electrical'},
  {name:'Ceiling Fan Installation',      cat:'Electrical'},
  {name:'Drywall Repair',                cat:'Drywall'},
  {name:'Full Drywall Replacement',      cat:'Drywall'},
  {name:'Wallpaper Removal',             cat:'Painting'},
  {name:'Interior Painting',             cat:'Painting'},
  {name:'Exterior Painting',             cat:'Painting'},
  {name:'Mouldings and Trim',            cat:'Interior Trim'},
  {name:'Baseboards',                    cat:'Interior Trim'},
  {name:'Crown Moulding',                cat:'Interior Trim'},
  {name:'Door Hardware',                 cat:'Hardware'},
  {name:'Cabinet Installation',          cat:'Cabinets'},
  {name:'Cabinet Refinishing',           cat:'Cabinets'},
  {name:'Vanity Installation',           cat:'Cabinets'},
  {name:'Countertop Installation',       cat:'Countertops'},
  {name:'Backsplash Installation',       cat:'Tile'},
  {name:'Tile Flooring',                 cat:'Tile'},
  {name:'Hardwood Flooring',             cat:'Flooring'},
  {name:'LVP Flooring',                  cat:'Flooring'},
  {name:'Carpet Installation',           cat:'Flooring'},
  {name:'Appliance Installation',        cat:'Appliances'},
  {name:'Bathroom Fixtures',             cat:'Plumbing'},
  {name:'Toilet Installation',           cat:'Plumbing'},
  {name:'Shower Installation',           cat:'Plumbing'},
  {name:'Tub Replacement',               cat:'Plumbing'},
  {name:'Water Heater Replacement',      cat:'Plumbing'},
  {name:'HVAC Service',                  cat:'HVAC'},
  {name:'Duct Cleaning',                 cat:'HVAC'},
  {name:'Attic Insulation',              cat:'Insulation'},
  {name:'Window Replacement',            cat:'Windows'},
  {name:'Door Replacement',              cat:'Doors'},
  {name:'Roof Repair',                   cat:'Roofing'},
  {name:'Gutter Cleaning',               cat:'Exterior'},
  {name:'Landscaping',                   cat:'Exterior'},
  {name:'Deck Repair',                   cat:'Exterior'},
];
function addTaskToGroup(key){
  addingTaskFor = key;
  addTaskSearch = '';
  // Make sure the group is expanded so the picker is visible.
  if(collapsedGrps) collapsedGrps.delete(key);
  if(typeof renderSidebar === 'function') renderSidebar();
  // Focus the search input on next paint.
  requestAnimationFrame(() => {
    const inp = document.getElementById('ntpSearchInput');
    if(inp) inp.focus();
  });
}
function closeTaskPicker(){
  addingTaskFor = null;
  addTaskSearch = '';
  if(typeof renderSidebar === 'function') renderSidebar();
}
function setAddTaskSearch(v){
  addTaskSearch = v;
  // Re-render just the list rows (not the whole sidebar) to preserve caret
  // position + focus in the input. The Manual-add row now lives inside
  // _ntpListRowsHtml() at the bottom, so its live "Add \"…\" as a custom
  // task" label is rebuilt automatically with the templates on each keystroke.
  const list = document.getElementById('ntpList');
  if(!list){
    if(typeof renderSidebar === 'function') renderSidebar();
    return;
  }
  list.innerHTML = _ntpListRowsHtml();
}
// Fallback for when no template matches (or the user has a task not in the
// catalog). Uses the current search value as the task name; if empty, drops
// in an "Untitled task" placeholder they can rename in the expanded detail.
function addCustomTask(){
  if(!addingTaskFor) return;
  const q = (addTaskSearch || '').trim();
  const name = q || 'Untitled task';
  pickTaskTemplate(addingTaskFor, name, 'Custom');
}
function _ntpListRowsHtml(){
  const q = (addTaskSearch || '').toLowerCase().trim();
  const items = NEW_TASK_TEMPLATES.filter(t =>
    !q || t.name.toLowerCase().includes(q) || t.cat.toLowerCase().includes(q)
  );
  const rows = items.length
    ? items.map(t => `<button class="ntp-row" onclick="event.stopPropagation();pickTaskTemplate('${addingTaskFor?String(addingTaskFor).replace(/'/g,'&#39;'):''}', ${JSON.stringify(t.name).replace(/"/g,'&quot;')}, ${JSON.stringify(t.cat).replace(/"/g,'&quot;')})">
      <span class="ntp-name">${t.name}</span>
      <span class="ntp-cat">${t.cat.toUpperCase()}</span>
    </button>`).join('')
    : `<div class="ntp-empty">No matching tasks</div>`;
  // Manual-add row now lives at the BOTTOM of the list rather than sticky at
  // the top. It always renders — even when nothing matches the search — so
  // the fallback affordance is always one scroll-down away, and the live label
  // still echoes whatever the user has typed.
  const customLbl = q ? `Add "${q}" as a custom task` : 'Manually add a non-standard task';
  const customBtn = `<button class="ntp-custom" onclick="event.stopPropagation();addCustomTask()">
    <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M7 3v8M3 7h8"/></svg>
    <span class="ntp-custom-l"><span class="ntp-custom-lbl">${esc(customLbl)}</span><span class="ntp-custom-sub">Use what you've typed, or add a blank task to name later</span></span>
    <span class="ntp-custom-cat">CUSTOM</span>
  </button>`;
  return rows + customBtn;
}
/* A task created after the scope was published has no snapshot to diff
   against, so it's recorded outright. */
function _coMarkAdded(id){
  if(typeof PROJ_MODE === 'undefined') return;
  if(PROJ_MODE === 'work' || PROJ_MODE === 'closeout') __CO_ADDED.add(id);
}
function pickTaskTemplate(groupKey, name, cat){
  // Derive room + code for the new task. In room-grouping mode the group key
  // IS the room name; in contractor mode we don't have a room, so fall back
  // to the first available room. Task code uses first 3 letters of the room
  // for readability.
  const room = (groupBy === 'room') ? groupKey : (ROOMS[0] || 'General');
  const codePrefix = String(room).replace(/[^A-Za-z]/g,'').slice(0,3).toUpperCase() || 'NEW';
  const rand = Math.random().toString(16).slice(2,6).toUpperCase();
  const code = `${codePrefix}-${rand}`;
  const nextId = TASKS.reduce((max,t) => Math.max(max, t.id), 0) + 1;
  const newTask = {
    id: nextId, code, room, name,
    opt: 'To be scoped',
    gc: (groupBy === 'contractor' ? groupKey : null),
    product: '(not selected)',
    qty: '—', rate: '—', cost: '$0',
    photos: 0, flags: ['missing'], mods: [], status: 'not_started',
    desc: '', pcost: '$0', notes: 0, _tag: cat,
  };
  TASKS.push(newTask);
  _coMarkAdded(newTask.id);   // past publish, a new task is a change order
  addingTaskFor = null;
  addTaskSearch = '';
  if(typeof renderAll === 'function') renderAll();
  if(typeof toast === 'function') toast(`Added ${name}`);
}
// Progress-stage placeholder handlers: attach a photo/note update to the
// group's or task's construction progress. Real flow (upload photo, add note,
// optionally tag contractors) can plug into these entry points later.
function addGroupUpdate(key){
  if(typeof toast === 'function') toast('Add progress update to ' + key + ' — upload photo & notes');
}
function addTaskUpdate(taskId){
  const t = TASKS.find(x => x.id === taskId);
  const name = t ? t.name : ('task #' + taskId);
  if(typeof toast === 'function') toast('Add progress update for ' + name + ' — upload photo & notes');
}
function toggleGrp(el){
  const grp=el.closest('.grp'); const key=grp.dataset.grp;
  grp.classList.toggle('collapsed');
  grp.classList.contains('collapsed')?collapsedGrps.add(key):collapsedGrps.delete(key);
}
// Select a group as the current focus for the Progress tab. Toggling the
// currently-selected group's name clears the selection. Selecting a group
// also clears any task selection so the two states remain mutually exclusive.
/* ── Scope selection ─────────────────────────────────────────────────
   Sits above selectGroup in the same hierarchy: scope → group → task.
   Clears any task or group selection and routes to the Editor tab, which
   is where the scope overview renders. */
function selectScope(){
  if(!SCOPE_VIEW_ENABLED) return;
  // Clicking the already-selected scope is a no-op — no deselect toggle,
  // same rule selectGroup follows.
  if(scopeView && !selId && !selGroupKey) return;
  scopeView = true;
  selId = null;
  selGroupKey = null;
  openIds.clear();
  if(workMode !== 'shop'){
    workMode = 'shop';
    document.body.classList.toggle('shop-mode', true);
  }
  if(typeof renderSidebar === 'function') renderSidebar();
  if(typeof renderWorkHdr === 'function') renderWorkHdr();
  if(typeof renderWork === 'function') renderWork();
}
/* The whole white bar is the click target, so its own controls — version
   chip, Edit toggle — have to opt out or they'd both fire. */
function onScopeBarClick(e){
  if(!SCOPE_VIEW_ENABLED) return;
  if(e.target.closest('button, input, select, a, label, .ver-chip')) return;
  selectScope();
}
function onScopeBarKey(e){
  if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); selectScope(); }
}

function selectGroup(key){
  groupApproveConfirmKey = null;   // don't carry a confirm across groups
  // Clicking the already-selected group is a no-op — no deselect toggle.
  // The group stays highlighted and its group page stays open on the
  // right. To move away, the user picks a different group or a task.
  if(selGroupKey === key && !selId) return;
  scopeView = false;   // drilling into a group leaves the scope view
  selGroupKey = key;
  selId = null;
  openIds.clear();
  // Make sure the group is expanded so the user sees its tasks under the
  // now-selected header.
  if(collapsedGrps) collapsedGrps.delete(key);
  // Editor renders a group page, so picking a group from any other tab
  // lands there. This used to route to Activity, which was the "browse
  // groups" surface until it was removed from the tab bar.
  const groupAwareTabs = ['shop'];
  if(!groupAwareTabs.includes(workMode)){
    workMode = 'shop';
    document.body.classList.toggle('shop-mode', true);
  } else if(workMode === 'shop'){
    // Ensure the shop-mode body class is on so any tab-specific styling holds.
    document.body.classList.toggle('shop-mode', true);
  }
  if(typeof renderSidebar === 'function') renderSidebar();
  if(typeof renderWorkHdr === 'function') renderWorkHdr();
  if(typeof renderWork === 'function') renderWork();
}

/* ════════════ APPROVAL (task / group / whole) ════════════ */
/* Review-stage wording. Two different acts share PROJ_MODE 'review': the
   admin read-through at Step 3, where the reviewer confirms they have seen
   the scope, and the manager's sign-off at Step 4, which is what actually
   publishes it. Only the stepper node tells them apart, hence STAGE_ID.
   Anything else — closeout — keeps the plain approval wording.

   Helpers rather than inline ternaries so the header, the sidebar detail and
   the status pill can't drift apart. An unknown STAGE_ID (the panel opened
   standalone) falls to the review wording, since that's the common case. */
function _isApprovalStage(){ return PROJ_MODE !== 'review' || STAGE_ID === 'awaiting-pub'; }
function approveActionLabel(){
  if(PROJ_MODE !== 'review') return 'Approve';
  return STAGE_ID === 'awaiting-pub' ? 'Approve Task' : 'Mark Reviewed';
}
function approveConfirmLabel(){ return _isApprovalStage() ? 'Confirm Approve' : 'Confirm Review'; }
function approveDoneLabel(){ return _isApprovalStage() ? 'Approved' : 'Reviewed'; }
/* The sidebar pill reads STATUS.approved, which taskStatusFor only ever
   returns in review — so it follows whichever act this stage performs. */
if(typeof STATUS !== 'undefined' && STATUS.approved) STATUS.approved.label = approveDoneLabel();
/* ── Review and approval ──────────────────────────────────────────────
   Two decisions, two sets. `approved` already existed and doubled as both,
   which is why step 4 used to infer "reviewed" from completeness rather than
   from anyone having reviewed anything. */
let reviewed = new Set();

/* Which decision the current stage is collecting. */
function _decisionSet(){
  // Step 4 and closeout both write approvals; step 3 writes reviews. Closeout
  // used to fall through to `reviewed`, which the closeout row doesn't read —
  // so ticking a task there changed nothing you could see.
  const st = (typeof STAGE_ID !== 'undefined') ? STAGE_ID : '';
  const mode = (typeof PROJ_MODE !== 'undefined') ? PROJ_MODE : '';
  return (st === 'awaiting-pub' || mode === 'closeout') ? approved : reviewed;
}
function _isDecisionStage(){
  return (typeof PROJ_MODE !== 'undefined' && PROJ_MODE === 'review')
      || (typeof PROJ_MODE !== 'undefined' && PROJ_MODE === 'closeout');
}
function _decisionVerb(){
  const st = (typeof STAGE_ID !== 'undefined') ? STAGE_ID : '';
  const mode = (typeof PROJ_MODE !== 'undefined') ? PROJ_MODE : '';
  if(st === 'awaiting-pub' || mode === 'closeout') return 'approve';
  /* The verb follows the viewer as well as the stage. A project manager approves
     wherever they are — it is the right they hold at any time — so a row offering
     them "Review" named somebody else's act. The manager who actually reviews
     still sees Review; they review and hand on, and cannot approve.

     USER_ROLE is the ?role= the shell passes in. Id note: 'manager' is the
     Project manager — see ROLES in shell.js. */
  if((typeof USER_ROLE !== 'undefined') && USER_ROLE === 'manager') return 'approve';
  return 'review';
}
/* Step 7 (closeout sign-off) drops the confirm/with-note menu: the approve
   control is a single button that commits on click, and a success modal
   offers the note afterwards. The review stages (steps 3 and 4) keep the
   two-item menu, so this is gated to closeout alone. */
function _decisionDirect(){
  return (typeof PROJ_MODE !== 'undefined') && PROJ_MODE === 'closeout';
}
/* Re-render after a decision. renderAll covers the task rows and group
   headers, but the scope-level control sits in the sidebar header, which
   only renderStateBar fills — without it the scope box or button keeps
   whatever state it had before the click. */
function _decisionRerender(){
  if(typeof renderAll === 'function') renderAll();
  if(typeof renderStateBar === 'function') renderStateBar();
}
/* toggleDecision / toggleGroupDecision / toggleScopeDecision and the
   _decisionBoxHtml checkbox they drew are gone: every decision stage uses
   the one-way control now, and a handler whose whole job is to un-decide
   has nothing left to do. */
/* Every task in scope for the decision — used by the group and scope boxes
   and by the gate on the stage CTA. */
function _decisionTasks(){
  return (typeof visibleTasks === 'function') ? visibleTasks() : (TASKS || []);
}
function _decisionCount(items){
  const set = _decisionSet();
  const list = items || _decisionTasks();
  return {done: list.filter(t => set.has(t.id)).length, total: list.length};
}
/* Empty, part-way, or done. The group and scope controls only distinguish
   'all' from the rest — with nothing reversible, a part-way group is simply
   not decided yet — but the three-way answer is what the count reads from. */
function _decisionState(items){
  const {done, total} = _decisionCount(items);
  if(!total) return 'none';
  if(done === 0) return 'none';
  return done === total ? 'all' : 'some';
}
/* ── Decision control ─────────────────────────────────────────────
   A decision is a signature, not a tick, so it gets a button with a menu and
   a solid done state it never leaves. Every decision stage uses it: step 3
   reviews, steps 4 and 7 approve. Only the wording changes — the shape, the
   cascade and the one-way behaviour are the same at all of them.

   One-way is the point, so nothing here removes. The old checkbox and its
   toggle* handlers are gone with it; they were the only way back out. */
/* Wording for the current stage. `done` is the state the control never
   leaves, so it reads as a fact rather than an action. */
function _decisionWords(){
  return _decisionVerb() === 'approve'
    ? {action:'Approve', confirm:'Confirm approve', note:'Approve with note', done:'Approved', past:'approved'}
    : {action:'Review',  confirm:'Confirm review',  note:'Review with note',  done:'Reviewed', past:'reviewed'};
}
/* Which approve menu is open, keyed so task/group/scope can't collide:
   'task:12', 'group:Kitchen', 'scope'. */
let apMenuKey = null;
function apToggleMenu(key){
  apMenuKey = (apMenuKey === key) ? null : key;
  _decisionRerender();
}
function apCloseMenu(){
  if(apMenuKey === null) return;
  apMenuKey = null;
  _decisionRerender();
}
/* Approving is add-only. Group and scope cascade to their tasks — the
   levels aren't separate records, a group is approved exactly when its
   tasks are. */
function apApproveTask(id){
  apMenuKey = null;
  _decisionSet().add(id);
  if(typeof toast === 'function') toast('Task ' + _decisionWords().past);
  _decisionRerender();
}
function apApproveGroup(key){
  apMenuKey = null;
  const g = (typeof groupTasks === 'function')
    ? groupTasks(_decisionTasks()).find(x => x.key === key) : null;
  if(!g) return;
  const set = _decisionSet();
  const n = g.items.filter(t => !set.has(t.id)).length;
  g.items.forEach(t => set.add(t.id));
  if(typeof toast === 'function') toast(`${key} ${_decisionWords().past} · ${n} task${n === 1 ? '' : 's'}`);
  _decisionRerender();
}
function apApproveScope(){
  apMenuKey = null;
  const list = _decisionTasks();
  const set = _decisionSet();
  const n = list.filter(t => !set.has(t.id)).length;
  list.forEach(t => set.add(t.id));
  if(typeof toast === 'function') toast(`Scope ${_decisionWords().past} · ${n} task${n === 1 ? '' : 's'}`);
  _decisionRerender();
}
/* "Approve with note" opens the notes drawer and hands it the approval to
   run on save, so the note is the record of why. Cancelling the composer
   leaves the task unapproved — the note IS the approval here, which is why
   it can't commit first. */
let apPendingApproval = null;   // () => void, run by dwSaveNote
function apApproveWithNote(kind, key){
  apMenuKey = null;
  if(kind === 'task'){
    apPendingApproval = () => apApproveTask(Number(key));
    if(typeof openDrawer === 'function') openDrawer(Number(key), 'notes');
  } else if(kind === 'group'){
    apPendingApproval = () => apApproveGroup(key);
    if(typeof openGroupDrawer === 'function') openGroupDrawer(key, 'notes');
  } else {
    apPendingApproval = () => apApproveScope();
    if(typeof openScopeDrawer === 'function') openScopeDrawer('notes');
  }
  /* A decision note is the reason the contractor is being told yes, so it
     goes out external. The composer still defaults to internal for ordinary
     notes; this overrides it, and it has to run after the open* helpers
     because each of them resets dwNoteHidden to true. The user can still
     flip it back before saving. */
  dwNoteHidden = false;
  if(typeof dwTab === 'function') dwTab('notes');   // repaint with the new default
  if(typeof toast === 'function') toast('Write a note to ' + _decisionWords().action.toLowerCase());
}
/* Abandoning the drawer abandons the approval with it. */
function apClearPendingApproval(){ apPendingApproval = null; }

/* ── Direct approve (step 7) ──────────────────────────────────────
   Closeout skips the menu: the button commits the approval outright. The
   per-level approve helpers already fire their own toast, so there's nothing
   more to do here. `kind` is 'task'|'group'|'scope' and `key` is the task id,
   group key, or '' for scope. */
function apApproveDirect(kind, key){
  apMenuKey = null;
  if(kind === 'task')      apApproveTask(Number(key));
  else if(kind === 'group')apApproveGroup(key);
  else                     apApproveScope();
}

/* The button. Unapproved it opens the menu; approved it is a label. In
   closeout (`onDirect` set + _decisionDirect) it commits on click instead. */
function _approveCtrlHtml(done, menuKey, onConfirm, onNote, doneTitle, onDirect){
  const w = _decisionWords();
  if(done){
    return `<span class="ap-ctrl is-done" title="${esc(doneTitle)}">
      <svg viewBox="0 0 14 14" aria-hidden="true"><path d="M2.5 7.5l3 3 6-7"/></svg>${w.done}
    </span>`;
  }
  if(_decisionDirect() && onDirect){
    return `<span class="ap-wrap">
      <button type="button" class="ap-ctrl" onclick="event.stopPropagation();${onDirect}">${w.action}</button>
    </span>`;
  }
  const open = apMenuKey === menuKey;
  return `<span class="ap-wrap">
    <button type="button" class="ap-ctrl${open ? ' is-open' : ''}" aria-haspopup="menu" aria-expanded="${open}"
      onclick="event.stopPropagation();apToggleMenu('${esc(menuKey)}')">${w.action}
      <svg class="ap-caret" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5l3 3 3-3"/></svg>
    </button>
    ${open ? `<div class="ap-menu" role="menu" onclick="event.stopPropagation()">
      <button type="button" class="ap-item" role="menuitem" onclick="event.stopPropagation();${onConfirm}">
        <svg class="ap-ico" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5l3.5 3.5L13 4"/></svg>${w.confirm}
      </button>
      <button type="button" class="ap-item" role="menuitem" onclick="event.stopPropagation();${onNote}">
        <svg class="ap-ico" viewBox="0 0 16 16" aria-hidden="true"><path d="M10 1.5H3.5v13h9V4z"/><path d="M9.5 1.5V4.5h3"/></svg>${w.note}
      </button>
    </div>` : ''}
  </span>`;
}

function taskDecisionHtml(t){
  if(!_isDecisionStage()) return '';
  return _approveCtrlHtml(_decisionSet().has(t.id), 'task:' + t.id,
    `apApproveTask(${t.id})`, `apApproveWithNote('task','${t.id}')`, _decisionWords().done,
    `apApproveDirect('task','${t.id}')`);
}
function groupDecisionHtml(g){
  if(!_isDecisionStage() || !g.items.length) return '';
  const total = g.items.length;
  const key = String(g.key).replace(/'/g, "\\'");
  // A group is decided exactly when its tasks are, so "some" isn't a state it
  // can rest in — the button stays live until the last one lands.
  return _approveCtrlHtml(_decisionState(g.items) === 'all', 'group:' + g.key,
    `apApproveGroup('${key}')`, `apApproveWithNote('group','${key}')`,
    `${total} task${total === 1 ? '' : 's'} ${_decisionWords().past}`,
    `apApproveDirect('group','${key}')`);
}
function scopeDecisionHtml(){
  if(!_isDecisionStage()) return '';
  const list = _decisionTasks();
  if(!list.length) return '';
  return _approveCtrlHtml(_decisionState(list) === 'all', 'scope',
    'apApproveScope()', `apApproveWithNote('scope','')`,
    `${list.length} task${list.length === 1 ? '' : 's'} ${_decisionWords().past}`,
    `apApproveDirect('scope','')`);
}
/* The stage CTA is a gate now, not the action: it can't fire until every task
   carries the decision, and it says how far along you are until then. */
function _reportDecisionProgress(){
  if(!_isDecisionStage()) return;
  const {done, total} = _decisionCount();
  try{
    parent.postMessage({type:'kai-decision-progress',
      verb: _decisionVerb(), done, total, ready: total > 0 && done === total}, '*');
  }catch(_){}
}

function toggleApprove(id){
  approved.has(id)?approved.delete(id):approved.add(id);
  renderAll();
}
// Approve confirmation flow (Editor tab task card). Clicking Approve
// swaps the row for Confirm Approve / Approve with Note / Cancel. Only
// one task can be in the confirmation state at a time.
let taskApproveConfirmId = null;
function showApproveConfirm(id){
  if(pgdBlockIfFlagged(id)) return;   // flags come first
  taskApproveConfirmId = id;
  renderAll();
}
function cancelApproveConfirm(){ taskApproveConfirmId = null; renderAll(); }
function confirmApprove(id){
  approved.add(id);
  taskApproveConfirmId = null;
  renderAll();
  const t = TASKS.find(x => x.id === id);
  if(typeof toast === 'function' && t) toast(`Approved · ${t.name}`);
}
function approveWithNote(id){
  approved.add(id);
  taskApproveConfirmId = null;
  const t = TASKS.find(x => x.id === id);
  if(typeof toast === 'function' && t) toast(`Approved · ${t.name}. Add a note below.`);
  // Re-render first so the actions row reverts, then open the notes drawer.
  renderAll();
  if(typeof openDrawer === 'function') openDrawer(id, 'notes');
}
// Bulk-approve every task in a group. Called from the Editor tab's
// group overview card in review-stage. Skips tasks already approved.
/* Which group is mid-confirm. Keyed rather than boolean so navigating to
   another group doesn't inherit a half-finished confirmation. */
let groupApproveConfirmKey = null;
/* Every one of these pins the view to the group before re-rendering.
   renderShop picks its branch from selId / selGroupKey / scopeView, so
   restating them here means a group action can only ever repaint the group
   page — it can't fall through to a task, whatever else has touched that
   state. The bulk action updates statuses; it is not navigation. */
function _stayOnGroup(key){
  selId = null;
  selGroupKey = key;
  scopeView = false;
  if(typeof openIds !== 'undefined' && openIds && openIds.clear) openIds.clear();
}
function askGroupApprove(key){
  if(pgdBlockGroupIfFlagged(key)) return;   // flags come first
  groupApproveConfirmKey = key;
  _stayOnGroup(key);
  renderAll();
}
function cancelGroupApprove(){
  groupApproveConfirmKey = null;
  if(selGroupKey) _stayOnGroup(selGroupKey);
  renderAll();
}
function confirmGroupApprove(key){
  groupApproveConfirmKey = null;
  _stayOnGroup(key);
  approveAllInGroup(key);   // marks every task in the group, then renders
}

function approveAllInGroup(key){
  const groups = groupTasks(typeof visibleTasks === 'function' ? visibleTasks() : TASKS);
  const g = groups.find(x => x.key === key); if(!g) return;
  const before = approved.size;
  g.items.forEach(t => approved.add(t.id));
  const n = approved.size - before;
  renderAll();
  if(typeof toast === 'function') toast(n ? `Approved ${n} task${n===1?'':'s'} in ${g.name}` : `All tasks in ${g.name} already approved`);
}
/* placeholder handlers for Request edit + Delete actions */
function deleteTask(id){
  const t=TASKS.find(x=>x.id===id); if(!t) return;
  // Change-order mode: stage a removal request instead of deleting the task.
  if(IS_CHANGE_ORDER){
    if(!confirm(`Propose removing "${t.name}"? This is staged as a change order — the job manager has to approve before the task actually goes away.`)) return;
    coAddChange({
      type: 'delete',
      taskId: t.id,
      taskCode: t.code,
      before: t.name,
      after: '(removed)',
      label: `Remove ${t.name}`,
    });
    toast(`Removal proposed · ${t.name}`);
    return;
  }
  // Past publish a delete is a change order: the task stays, struck
  // through, until the removal is approved.
  if(typeof PROJ_MODE !== 'undefined' && (PROJ_MODE === 'work' || PROJ_MODE === 'closeout')){
    __CO_REMOVED.add(id);
    if(typeof toast === 'function') toast(`Removal staged · ${t.name}`);
    if(typeof renderAll === 'function') renderAll();
    return;
  }
  const i=TASKS.findIndex(x=>x.id===id);
  if(i>=0) TASKS.splice(i,1);
  approved.delete(id); openIds.delete(id); if(selId===id) selId=null;
  toast(`${t.name} deleted`);
  renderAll();
}
function deleteGroup(key){
  const groups=groupTasks(TASKS);
  const g=groups.find(x=>x.key===key); if(!g) return;
  if(!confirm(`Delete the ${g.name} group? ${g.items.length} ${g.items.length===1?'task':'tasks'} will be removed.`)) return;
  const ids=new Set(g.items.map(t=>t.id));
  for(let i=TASKS.length-1;i>=0;i--){ if(ids.has(TASKS[i].id)) TASKS.splice(i,1); }
  ids.forEach(id=>{ approved.delete(id); openIds.delete(id); if(selId===id) selId=null; });
  toast(`${g.name} deleted`);
  renderAll();
}
// Name the duplicate of group `g` — increments a numeric suffix so
// "Kitchen" → "Kitchen 2" → "Kitchen 3", rather than "Kitchen 2 2".
function nextDuplicateGroupName(g){
  const groups = groupTasks(TASKS);
  const isRoom = groupBy === 'room';
  const baseName = g.name.replace(/ \d+$/, '');
  const taken = new Set(isRoom ? ROOMS : groups.map(x => x.name));
  let n = 2, newName = `${baseName} ${n}`;
  while(taken.has(newName)){ n++; newName = `${baseName} ${n}`; }
  return newName;
}
// Clone a whole group — every task in it, with fresh ids/codes — into a
// new sibling group. Lets a field agent split e.g. "Kitchen" into two
// distinct kitchen groups without re-entering every task by hand. Room
// mode creates a new room (pushed into ROOMS so it renders as its own
// group); contractor mode creates a new contractor bucket via t.gc since
// contractor groups have no backing array of their own.
function duplicateGroup(key){
  const groups=groupTasks(TASKS);
  const g=groups.find(x=>x.key===key); if(!g || g.pinned) return;
  const isRoom = groupBy === 'room';
  const newName = nextDuplicateGroupName(g);
  let nextId = TASKS.reduce((max,t) => Math.max(max, t.id), 0);
  const codePrefix = String(newName).replace(/[^A-Za-z]/g,'').slice(0,3).toUpperCase() || 'NEW';
  const clones = g.items.map(t => {
    nextId += 1;
    // Deep-clone so nested structures (t.options, t.extraProducts, etc.)
    // don't stay shared with the original task — editing one copy would
    // otherwise silently edit the other.
    const clone = (typeof structuredClone === 'function') ? structuredClone(t) : JSON.parse(JSON.stringify(t));
    clone.id = nextId;
    clone.code = `${codePrefix}-${Math.random().toString(16).slice(2,6).toUpperCase()}`;
    if(isRoom) clone.room = newName; else clone.gc = newName;
    return clone;
  });
  TASKS.push(...clones);
  if(isRoom){
    const idx = ROOMS.indexOf(g.key);
    ROOMS.splice(idx >= 0 ? idx + 1 : ROOMS.length, 0, newName);
  }
  selGroupKey = newName;
  if(collapsedGrps) collapsedGrps.delete(newName);
  renderAll();
  toast(`Duplicated ${g.name} → ${newName} · ${clones.length} ${clones.length===1?'task':'tasks'}`);
}
// User-attached group label (e.g. "Kitchen (including Pantry)") — shown
// on the group overview card in the Editor / Activity tabs. Purely a
// display annotation; doesn't touch the group's actual name/key.
function openGroupLabelEdit(key){
  editingGroupLabelFor = key;
  if(typeof renderWork === 'function') renderWork();
  requestAnimationFrame(() => {
    const inp = document.querySelector('.pgd-label-input');
    if(inp){ inp.focus(); inp.select(); }
  });
}
function closeGroupLabelEdit(){
  editingGroupLabelFor = null;
  if(typeof renderWork === 'function') renderWork();
}
function commitGroupLabel(key, value){
  const v = String(value||'').trim().slice(0, 40);
  if(v) groupLabels[key] = v; else delete groupLabels[key];
  editingGroupLabelFor = null;
  if(typeof renderWork === 'function') renderWork();
}
function requestGroupEdit(key){
  const groups=groupTasks(TASKS);
  const g=groups.find(x=>x.key===key); if(!g) return;
  toast(`Edit requested for ${g.name}`);
}
function approveGroup(key){
  const groups=groupTasks(TASKS);
  const g=groups.find(x=>x.key===key); if(!g) return;
  const alreadyExplicit = approvedGroupsExplicit.has(key);
  if(alreadyExplicit){
    // Toggle off — un-approve the group explicitly + clear per-task approvals
    approvedGroupsExplicit.delete(key);
    g.items.forEach(t => approved.delete(t.id));
    toast(`${g.name} approvals cleared`);
  } else {
    // Approve — mark the group explicitly + roll approvals up to every task
    approvedGroupsExplicit.add(key);
    g.items.forEach(t => approved.add(t.id));
    toast(`${g.name} approved`);
  }
  renderAll();
}
function approveAll(){
  const all=TASKS.every(t=>approved.has(t.id));
  if(all){ approved.clear(); toast('Approvals cleared'); }
  else { TASKS.forEach(t=>approved.add(t.id)); toast('Whole scope approved'); }
  renderAll();
}
function syncApproveBtn(){
  const btn=document.getElementById('approveBtn');
  const n=approved.size, total=TASKS.length;
  // Draft stages: the shell's state bar (#verNotice) now owns the
  // Submit-for-review CTA, so hide the toolbar duplicate entirely.
  if(IS_DRAFT_STAGE){
    btn.hidden = true;
    return;
  }
  btn.hidden = false;
  // At Construction stage, the CTA is "Submit closeout" — the button is
  // always enabled and doesn't gate on task-level approvals.
  if(window.__KAI_CONTEXT === 'construction'){
    btn.textContent = 'Submit closeout';
    return;
  }
  const _done = _isApprovalStage() ? 'Scope approved' : 'Review complete';
  const _verb = _isApprovalStage() ? 'Approve scope'  : 'Review complete';
  if(n===total){ btn.textContent = _done + ' ✓'; }
  else if(n>0){ btn.textContent = `${_verb} · ${n}/${total}`; }
  else { btn.textContent = _verb; }
}

/* ════════════ EXPAND / EDIT ════════════ */
// SHOP-EDIT VARIANT: the sidebar is now a flat list — no accordion, no
// expanded detail. Clicking a task row just selects it (the Editor card
// on the right owns task detail). openIds is kept in sync as a Set-of-one
// so downstream code that reads openIds still resolves to the active task.
/* opts.toEditor — route the right panel to the Editor as part of the
   selection. Passed by the search palette: a result is a destination, not a
   highlight, so landing on it beats leaving the user on whatever tab they
   searched from. Ordinary sidebar clicks don't pass it and keep their
   existing "select in place" behavior.

   Overview is the exception: it's the project's front page and renders
   nothing per task, so selecting one there left the sidebar highlighted
   against a pane that hadn't changed. Picking a task is a request to see
   it, so route to the Editor — the same rule selectGroup already follows
   for groups. */
function selectTask(id, opts){
  const toEditor = !!(opts && opts.toEditor) || workMode === 'overview';
  if(selId === id){
    // Re-clicking the selected task is otherwise a no-op, but from a search
    // result the click still means "show me this" — so honor the routing.
    if(toEditor && workMode !== 'shop' && typeof setWorkMode === 'function') setWorkMode('shop');
    return;
  }
  scopeView = false;   // drilling into a task leaves the scope view
  // Any pending approve-confirm state belongs to the previously selected
  // task — clear it so switching tasks doesn't carry a stale confirm.
  taskApproveConfirmId = null;
  selId = id;
  // Keep openIds in sync for downstream code that still reads it as
  // "which task is currently active in the right panel".
  openIds = new Set([id]);
  selGroupKey = null;
  // Switch before rendering so one pass paints the new tab and the new
  // selection together. Mirrors setWorkMode's own stale-content guard —
  // calling it outright would render the work surface twice.
  const _switching = toEditor && workMode !== 'shop';
  if(_switching){
    workMode = 'shop';
    document.body.classList.toggle('shop-mode', true);
    const _wb = document.getElementById('workBody');
    if(_wb) _wb.innerHTML = '';
  }
  if(typeof renderAll === 'function') renderAll();
  // renderAll leaves the tab bar alone, so the Editor tab wouldn't show as
  // active without this.
  if(_switching && typeof renderWorkHdr === 'function') renderWorkHdr();
  // Open at the top of the module stack. There's nothing to scroll *to*
  // when the pane renders a single task, and the old target (.sec-taskcard)
  // is the options module now, so aligning it to the top skipped the three
  // modules above it. rAF so it lands after renderAll has painted.
  if(workMode === 'shop'){
    requestAnimationFrame(() => {
      const wb = document.getElementById('workBody');
      if(wb) wb.scrollTop = 0;
    });
  }
}
function toggleOpen(id){
  let didOpen = false;
  if(openIds.has(id)){
    openIds.delete(id);
    if(editId===id){ editId=null; editDraft=null; }   // closing cancels edit
    if(selId===id) selId=null;
  } else {
    // Single-open behavior: close any other task before opening this one
    openIds.clear();
    if(editId && editId!==id){ editId=null; editDraft=null; }
    openIds.add(id);
    selId=id;   // opening a task selects it for the work surface
    selGroupKey = null;   // task selection wins over any active group selection
    didOpen = true;
    // SHOP-EDIT VARIANT: clicking a task in the sidebar routes editing to
    // the Shop tab's task-detail card. Switch the right panel there so the
    // user lands in the editing surface immediately.
    workMode = 'shop';
    document.body.classList.toggle('shop-mode', true);
  }
  renderSidebar();
  if(typeof renderWorkHdr === 'function') renderWorkHdr();
  renderWork();
  // Sidebar-initiated selection: bring the same task into view on the right.
  if(didOpen){
    // The Editor renders the one selected task, so there's nothing to
    // scroll *to* — syncScrollToTask would hunt the task's anchor and
    // leave you partway down, level with the photo strip. Start at the
    // top of the module stack instead. Other tabs list every task, so
    // there the sync still does the right thing.
    if(workMode === 'shop'){
      const wb = document.getElementById('workBody');
      if(wb) wb.scrollTop = 0;
    } else {
      syncScrollToTask(id, 'right');
    }
  }
}

/* Bidirectional scroll sync between the sidebar (left) and the artifact / work
   surface (right). Called with a source hint so we only scroll the target side. */
function syncScrollToTask(id, target){
  const t = TASKS.find(x=>x.id===id); if(!t) return;
  if(target === 'right' && workMode === 'artifact'){
    requestAnimationFrame(()=>{
      const row = document.querySelector(`.art-item-main[data-row-tid="${t.code}"]`);
      if(row) row.scrollIntoView({block:'center', behavior:'smooth'});
    });
  }
  if(target === 'left'){
    // Expand the task's group if it was collapsed so the row is actually visible
    const gkey = groupBy === 'contractor' ? (t.gc || 'unassigned') : t.room;
    if(collapsedGrps && collapsedGrps.has(gkey)){
      collapsedGrps.delete(gkey);
      renderSidebar();
    }
    requestAnimationFrame(()=>{
      const el = document.querySelector(`#sbScroll [data-tid="${id}"]`);
      if(el) el.scrollIntoView({block:'center', behavior:'smooth'});
    });
  }
}

/* Artifact-initiated selection: click a row → open + select the task on the
   left, expand its group if needed, and scroll the sidebar into view. */
function artClickRow(code){
  const t = TASKS.find(x=>x.code===code); if(!t) return;
  openIds.clear();
  openIds.add(t.id);
  if(editId && editId!==t.id){ editId=null; editDraft=null; }
  selId = t.id;
  renderSidebar();
  syncScrollToTask(t.id, 'left');
  renderArtifact();   // re-render for the selection highlight on the row
}
function startEdit(id){
  const t=TASKS.find(x=>x.id===id); if(!t) return;
  editId=id;
  editDraft={status:t.status, name:t.name, desc:t.desc||'', opt:t.opt, gc:t.gc||'', product:t.product, pcost:t.pcost, qty:t.qty, rate:t.rate, cost:t.cost, mods:[...(t.mods||[])]};
  renderSidebar();
}
function editField(k,v){ if(editDraft) editDraft[k]=v; }
/* Direct-commit field edit for the inline "always editable" mode used when
   body.scope-edit-mode is on. Bypasses the editDraft flow — the top state
   bar's Cancel/Submit handles rollback vs submission at the scope level. */
/* Re-render the sidebar so the "Was X" indicators + is-changed accents
   appear/disappear as the user types. Debounced with rAF so typing stays
   snappy — one render per animation frame max. */
let __rerenderPending = false;
function requestRerenderDetail(id){
  if(__rerenderPending) return;
  __rerenderPending = true;
  requestAnimationFrame(()=>{
    __rerenderPending = false;
    // Preserve focus + caret in the field the user is typing in.
    const active = document.activeElement;
    const activeSel = (active && active.tagName === 'TEXTAREA' || active && active.tagName === 'INPUT')
      ? {tag: active.tagName, name: active.name || '', value: active.value, start: active.selectionStart, end: active.selectionEnd, ph: active.placeholder}
      : null;
    if(typeof renderSidebar === 'function') renderSidebar();
    // Restore focus by matching input value + placeholder + tag inside the
    // currently-open task's detail. Not perfect, but good enough for the demo.
    if(activeSel){
      const detail = document.querySelector(`.task[data-tid="${id}"] .task-detail`);
      if(detail){
        const inputs = detail.querySelectorAll(activeSel.tag.toLowerCase());
        for(const el of inputs){
          if(el.placeholder === activeSel.ph){
            el.focus();
            try{ el.setSelectionRange(activeSel.start, activeSel.end); }catch(_){}
            break;
          }
        }
      }
    }
  });
}
// Browse / Change product: select the task + switch the right panel to the
// Shop tab. Bulletproofed to fix a bug where the workBody kept Artifact
// content after being switched. Now explicitly clears the workBody FIRST,
// then paints Shop content, so stale HTML can't survive the transition.
function browseProductForTask(id){
  selId = id;
  openIds.clear(); openIds.add(id);   // keep the task open in the sidebar
  workMode = 'shop';
  document.body.classList.add('shop-mode');
  document.body.classList.remove('art-lb-open');
  // Force-close any modal/flyout that might be sitting over the work area.
  if(typeof closeFly === 'function' && typeof flyState !== 'undefined' && flyState) closeFly();
  if(typeof closeCart === 'function' && typeof cartOpen !== 'undefined' && cartOpen) closeCart();
  // CRITICAL: clear the workBody BEFORE the tab bar re-render + renderShop.
  // This wipes out any lingering Artifact HTML from the previous tab. If
  // renderShop throws downstream, we at least land on a blank surface
  // instead of showing the previous tab's content.
  const wb = document.getElementById('workBody');
  if(wb) wb.innerHTML = '';
  // Rebuild the tab bar so the Shop tab reads as active.
  if(typeof renderWorkHdr === 'function') renderWorkHdr();
  // Call renderShop directly so we can't be intercepted by any workMode
  // routing bug. Wrapped in try/catch so a downstream error leaves the
  // empty workBody in place rather than reverting somehow.
  try {
    if(typeof renderShop === 'function'){
      renderShop();
    } else if(typeof renderWork === 'function'){
      renderWork();
    }
  } catch(err){
    console.error('browseProductForTask · renderShop failed', err);
    if(wb) wb.innerHTML = '<div class="shop-empty"><span class="shop-empty-title">Shop</span><span class="shop-empty-desc">Something went wrong loading products. Try re-selecting the task.</span></div>';
  }
  if(typeof renderSidebar === 'function') renderSidebar();
  // After Shop renders, scroll the "Currently selected on this task" row
  // into view. rAF twice to make sure layout has settled.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const sel = document.querySelector('.shop-product.is-selected');
      if(sel && typeof sel.scrollIntoView === 'function'){
        sel.scrollIntoView({behavior:'smooth', block:'center'});
      }
    });
  });
}
/* ── Edit request flow ─────────────────────────────────────────────
   Clicking "Request edit" on a task no longer toggles inline edit mode.
   Instead it opens a small popover under the task actions row where the
   user can type a note explaining what needs to change. Sending fires a
   toast and marks the task as "Edit requested". */
let editRequestFor = null;   // task id whose popover is open (null = closed)
let ereqDraft = '';           // note-in-progress
function openEditRequest(id){
  /* The field agent without the baton does not request — they take the turn.
     Their CTA reads "Request to edit" wherever it appears, and every one of
     them opens the shell's take-the-turn dialogue, which names whoever is
     holding the document. Asked of the shell because that is where the turn
     model and the modal live. */
  if(typeof USER_ROLE !== 'undefined' && USER_ROLE === 'field_agent_nr'){
    try{ window.parent.postMessage({type:'kai-take-turn'}, '*'); }catch(e){}
    return;
  }
  // Mark the task as edit-requested (so the sidebar chip + card button
  // reflect the state) and open the Notes drawer so the user can drop
  // context on what needs to change. The old inline ereq popover is
  // superseded by the drawer's built-in composer.
  const t = TASKS.find(x => x.id === id);
  if(t) t.editRequested = true;
  editRequestFor = null;
  ereqDraft = '';
  if(typeof toast === 'function' && t) toast(`Edit requested · ${t.name}. Add a note below.`);
  if(typeof renderAll === 'function') renderAll();
  if(typeof openDrawer === 'function') openDrawer(id, 'notes');
}
// Grow-with-content helper for the note textarea. Resets height to auto so
// scrollHeight reflects the actual content, then locks it back on. Capped at
// 6 lines' worth so a runaway note doesn't push the whole popover off-screen
// — beyond that the textarea scrolls internally.
function ereqAutoGrow(el){
  if(!el) return;
  const max = 132; // ~6 lines at line-height:1.4 + padding
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, max) + 'px';
  el.style.overflowY = el.scrollHeight > max ? 'auto' : 'hidden';
}
function closeEditRequest(){
  editRequestFor = null;
  ereqDraft = '';
  if(typeof renderSidebar === 'function') renderSidebar();
}
function sendEditRequest(id){
  const t = TASKS.find(x => x.id === id); if(!t) return;
  const ta = document.getElementById('ereqText_' + id);
  const note = (ta && ta.value ? ta.value : ereqDraft || '').trim();
  t.editRequested = true;
  t.editRequestNote = note;
  t.editRequestAt = new Date().toISOString();
  editRequestFor = null;
  ereqDraft = '';
  if(typeof renderSidebar === 'function') renderSidebar();
  if(typeof toast === 'function'){
    toast(`Edit request sent · ${t.name}${note ? ' — note attached' : ''}`);
  }
}
function commitTaskField(id, field, value){
  const t = TASKS.find(x => x.id === id); if(!t) return;
  const v = (typeof value === 'string') ? value.trim() : value;
  if(field === 'desc'){ t.desc = v; }
  else if(field === 'pcost'){ t.pcost = v; }
  else if(field === 'qty'){ t.qty = v; }
  else if(field === 'rate'){ t.rate = v; }
  else if(field === 'name'){ t.name = v; }
  else if(field === 'opt'){ t.opt = v; }
  else if(field === 'product'){ t.product = v; t.flags = (t.flags||[]).filter(f => f !== 'missing'); }
  // If pcost / qty / rate changed AND we're tracking against an original,
  // roll the recomputed delta into t.cost so the sidebar rollup and group
  // totals stay live with what the user is doing.
  if(['pcost','qty','rate'].includes(field) && __TASK_ORIGINALS[id]){
    t.cost = _fmtDollars(originalTaskCost(id) + computeCostDelta(t));
  }
  // Mirror change-order-active state up to the shell — drives the CTA swap
  // (Submit closeout → Submit Change Order + Cancel button).
  if(typeof _reportCoEditMode === 'function') _reportCoEditMode();
}
// ── Multi-product accessor (backwards-compatible) ────────────────────
// Return the task's products as a normalized array. Backwards-compatible
// with the single-product data model — the primary product is always
// index 0, and t.extraProducts (if present) is appended.
function taskProducts(t){
  const primary = {
    product: t.product || '',
    pcost:   t.pcost   || '',
    qty:     t.qty     || '',
    rate:    t.rate    || '',
    _primary: true,
  };
  return [primary, ...(t.extraProducts || [])];
}
function addProductToTask(id){
  const t = TASKS.find(x => x.id === id); if(!t) return;
  if(!t.extraProducts) t.extraProducts = [];
  t.extraProducts.push({product:'', pcost:'', qty:'', rate:''});
  if(typeof renderAll === 'function') renderAll();
}
function removeExtraProduct(id, idx){
  const t = TASKS.find(x => x.id === id); if(!t || !t.extraProducts) return;
  t.extraProducts.splice(idx, 1);
  if(typeof renderAll === 'function') renderAll();
}
function commitExtraProduct(id, idx, field, value){
  const t = TASKS.find(x => x.id === id); if(!t || !t.extraProducts || !t.extraProducts[idx]) return;
  const v = (typeof value === 'string') ? value.trim() : value;
  t.extraProducts[idx][field] = v;
  // Don't re-render on keystroke; the card's requestSecTaskcardRerender()
  // is fine to trigger from the onchange/oninput site.
}
// ── Multi-option accessors ───────────────────────────────────────────
// Every task always has t.options after the seedTaskOptions migration.
// The primary option (index 0) mirrors its qty/rate/cost back into the
// task-level fields so snapshot tracking + delta chips keep working.
function taskOptions(t){ return Array.isArray(t.options) ? t.options : []; }
// A product's own line total — qty × (parts rate + labor rate). Either
// rate can be blank (a product can carry Parts, Labor, or both).
function productLineTotal(p){
  const q = (typeof _parseQtyNum === 'function') ? _parseQtyNum(p.qty) : (parseFloat(String(p.qty || '0').replace(/[^0-9.-]/g,'')) || 0);
  const parts = (typeof _parseDollars === 'function') ? _parseDollars(p.parts) : (parseFloat(String(p.parts || '0').replace(/[^0-9.-]/g,'')) || 0);
  const labor = (typeof _parseDollars === 'function') ? _parseDollars(p.labor) : (parseFloat(String(p.labor || '0').replace(/[^0-9.-]/g,'')) || 0);
  return q * (parts + labor);
}
/* Per-line-item (product) delta vs the approved snapshot. Uses the options tree
   captured by _snapshotOptions so a single line's qty/parts/labor edit shows its
   own +/- amount, matching the task/group/scope rollups. Returns 0 when there's
   no snapshot (draft) or the line is unchanged, so deltaChipHtml renders nothing. */
function productLineDelta(t, o, p){
  const orig = (typeof __TASK_ORIGINALS !== 'undefined') ? __TASK_ORIGINALS[t && t.id] : null;
  if(!orig || !Array.isArray(orig.options)) return 0;
  const so = orig.options.find(x => x.id === o.id); if(!so) return 0;
  const sp = (so.products || []).find(x => x.id === p.id);
  if(!sp) return productLineTotal(p);   // line added since approval — the whole amount is new
  return productLineTotal(p) - productLineTotal(sp);
}
// Recompute one option's cost from the sum of its products' line totals,
// then roll every option's cost back up into the task total — same
// change-order / snapshot-delta plumbing commitTaskOption used to own.
function recomputeOptionFromProducts(t, opt){
  const total = (Array.isArray(opt.products) ? opt.products : []).reduce((sum, p) => sum + productLineTotal(p), 0);
  opt.cost = (typeof _fmtDollars === 'function') ? _fmtDollars(total) : '$' + total;
  const tTotal = (t.options||[]).reduce((sum, o) => {
    // Un-added options are candidates, not scope — their money doesn't
    // count until someone adds them.
    if(typeof optionIsAdded === 'function' && !optionIsAdded(o)) return sum;
    const c = (typeof _parseDollars === 'function') ? _parseDollars(o.cost) : (parseFloat(String(o.cost || '0').replace(/[^0-9.-]/g,'')) || 0);
    return sum + c;
  }, 0);
  t.cost = (typeof _fmtDollars === 'function') ? _fmtDollars(tTotal) : '$' + tTotal;
  if(typeof _reportCoEditMode === 'function') _reportCoEditMode();
}
function commitOptionProduct(id, oid, pid, field, value){
  const t = TASKS.find(x => x.id === id); if(!t) return;
  const opt = (t.options||[]).find(o => o.id === oid); if(!opt) return;
  const p = (opt.products||[]).find(x => x.id === pid); if(!p) return;
  p[field] = (typeof value === 'string') ? value.trim() : value;
  recomputeOptionFromProducts(t, opt);
}
function bumpProductQty(id, oid, pid, dir){
  const t = TASKS.find(x => x.id === id); if(!t) return;
  const opt = (t.options||[]).find(o => o.id === oid); if(!opt) return;
  const p = (opt.products||[]).find(x => x.id === pid); if(!p) return;
  const cur = parseFloat(String(p.qty || '0').replace(/[^0-9.-]/g,'')) || 0;
  p.qty = String(Math.max(0, cur + dir));
  recomputeOptionFromProducts(t, opt);
  if(typeof renderAll === 'function') renderAll();
}
/* ── Option add / remove ─────────────────────────────────────────────
   `added` defaults to on: undefined counts as added, so seeded options and
   the single option taskOptions() synthesizes for a task without an explicit
   set both behave as they always did, with no migration. Only an explicit
   false means un-added.

   The flag is honoured at every stage. Only the draft seed ever writes
   `added: false`, and the shell reloads the panel per stage, so options
   arrive at review and later with the flag unset — which reads as added.
   Past draft, un-adding one is a scope change, and the change-order banner
   at the top of the task already says so. */
function optionIsAdded(o){
  return !o || o.added !== false;
}
/* A product is in the scope once it has a quantity — that's the act of
   choosing it, so it's what the row's treatment keys off, at every stage.
   Not every product carries one: options seeded with a bare
   {product, pcost} pair have no quantity until someone sets one, so the
   contrast holds past draft rather than darkening the whole strip. */
/* ── Product modifiers ────────────────────────────────────────────
   Modifiers moved from the task to the product: a task can hold several
   products and only some of them are the tenant's, so the task was the wrong
   place to say it. Only a picked product (qty > 0) can carry one — an
   unselected option line isn't part of the job yet.

   Same PROJECT_MODS list and the same single-item-array shape t.mods used,
   so tagInfo, the filter dropdown and the sidebar dots all read it unchanged. */
let prodModFor = null;          // 'taskId:optId:prodId' of the open menu
function toggleProdMod(key){
  prodModFor = (prodModFor === key) ? null : key;
  if(typeof renderAll === 'function') renderAll();
}
function closeProdMod(){
  if(prodModFor === null) return;
  prodModFor = null;
  if(typeof renderAll === 'function') renderAll();
}
function setProdMod(taskId, optId, prodId, mid){
  prodModFor = null;
  const t = TASKS.find(x => x.id === taskId); if(!t) return;
  const o = (t.options || []).find(x => x.id === optId); if(!o) return;
  const p = (o.products || []).find(x => x.id === prodId); if(!p) return;
  p.mods = mid ? [mid] : [];
  if(typeof toast === 'function'){
    toast(mid ? `${tagInfo(mid).label} added` : 'Modifier removed');
  }
  if(typeof renderAll === 'function') renderAll();
}
/* Every modifier on a task's picked products. The sidebar dots, the filters
   and the group table's Modifier column all read the task, so they go
   through here rather than each walking the option tree themselves. */
function taskProductMods(t){
  const out = [];
  (t && t.options || []).forEach(o => {
    if(o.added === false) return;
    (o.products || []).forEach(p => {
      if(!productIsPicked(p)) return;
      (p.mods || []).forEach(m => { if(out.indexOf(m) === -1) out.push(m); });
    });
  });
  return out;
}
/* The control and the tag are the same element: quiet when unset, filled
   with the modifier's name when set. One thing to look at, one to click. */
function _prodModHtml(t, o, p){
  if(!productIsPicked(p)) return '';
  const key = `${t.id}:${o.id}:${p.id}`;
  const cur = (p.mods || [])[0] || '';
  const open = prodModFor === key;
  const label = cur ? tagInfo(cur).label : '+ Modifier';
  const opts = [{id:'', label:'None'}].concat(
    (typeof PROJECT_MODS !== 'undefined' ? PROJECT_MODS : []).map(m => ({id:m.id, label:m.label})));
  return `<span class="prod-mod${cur ? ' is-set' : ''}${open ? ' is-open' : ''}" onclick="event.stopPropagation()">
    <button type="button" class="prod-mod-btn" aria-haspopup="menu" aria-expanded="${open}"
      onclick="event.stopPropagation();toggleProdMod('${key}')">${esc(label)}</button>
    ${open ? `<div class="prod-mod-menu" role="menu">
      ${opts.map(m => `<button type="button" class="prod-mod-item${m.id === cur ? ' on' : ''}" role="menuitemradio"
        aria-checked="${m.id === cur}"
        onclick="event.stopPropagation();setProdMod(${t.id},'${esc(o.id)}','${esc(p.id)}','${esc(m.id)}')">
        <span class="tick">&#10003;</span>${esc(m.label)}</button>`).join('')}
    </div>` : ''}
  </span>`;
}

function productIsPicked(p){
  const q = (typeof _parseQtyNum === 'function')
    ? _parseQtyNum(p && p.qty)
    : (parseFloat(String((p && p.qty) || '0').replace(/[^0-9.-]/g,'')) || 0);
  return (q || 0) > 0;
}
function toggleOptionAdded(taskId, optId){
  const t = TASKS.find(x => x.id === taskId); if(!t) return;
  const o = (t.options || []).find(x => x.id === optId); if(!o) return;
  o.added = (o.added === false);
  // Recompute so the task total drops by exactly this option's amount — the
  // flag governs the money, not just what's on screen.
  if(typeof recomputeOptionFromProducts === 'function') recomputeOptionFromProducts(t, o);
  if(typeof renderAll === 'function') renderAll();
}
function addOptionToTask(id){
  const t = TASKS.find(x => x.id === id); if(!t) return;
  if(!t.options) t.options = [];
  t.options.push({
    id: 'opt_' + Math.random().toString(36).slice(2,7),
    name: 'New option',
    description: 'NEW OPTION',
    cost: '$0',
    products: [],
  });
  if(typeof renderAll === 'function') renderAll();
}
function removeOption(id, oid){
  const t = TASKS.find(x => x.id === id); if(!t || !t.options) return;
  // Primary option can't be removed (index 0). Guard.
  const idx = t.options.findIndex(o => o.id === oid);
  if(idx <= 0) return;
  t.options.splice(idx, 1);
  if(typeof renderAll === 'function') renderAll();
}
// ── Cost delta helpers (approved-scope editing only) ─────────────────
// Original values were captured in enterEditMode(true) when the scope was
// already approved. From there, every commit computes the running delta —
// task-level shows as a chip next to the amount, group- and scope-level
// aggregations sum those deltas so the user can see "you're currently
// spending $X more/less than the approved total" live as they type.
function _parseDollars(str){
  if(str == null) return 0;
  const m = String(str).replace(/,/g,'').match(/-?\d+(?:\.\d+)?/);
  return m ? parseFloat(m[0]) : 0;
}
function _parseQtyNum(str){
  if(str == null) return 0;
  const m = String(str).replace(/,/g,'').match(/-?\d+(?:\.\d+)?/);
  return m ? parseFloat(m[0]) : 0;
}
/* _fmtDollars / _fmtDelta moved to panel-helpers.js (loaded first) so
   data.js's eager seed code can call them at load time. */
function originalTaskCost(id){
  const o = __TASK_ORIGINALS[id]; if(!o) return 0;
  return _parseDollars(o.cost);
}
function computeCostDelta(t){
  const o = __TASK_ORIGINALS[t.id]; if(!o) return 0;
  // t.cost is the authoritative task total — recomputeOptionFromProducts rolls
  // every Option/Line-Item edit (incl. product quantity) into it, so diffing it
  // against the approved snapshot catches changes the old flat qty/rate/pcost
  // fields miss. Fall back to the flat-field math only if no snapshot cost.
  if(o.cost != null && o.cost !== ''){
    return _parseDollars(t.cost) - _parseDollars(o.cost);
  }
  const pDelta = _parseDollars(t.pcost) - _parseDollars(o.pcost);
  const qOld   = _parseQtyNum(o.qty), rOld = _parseDollars(o.rate);
  const qNew   = _parseQtyNum(t.qty), rNew = _parseDollars(t.rate);
  const laborDelta = (qNew * rNew) - (qOld * rOld);
  return pDelta + laborDelta;
}
// SHOP-EDIT VARIANT: gate delta rendering on snapshot presence (which is
// populated at load in work/closeout modes) instead of scopeEditMode — the
// latter is locked to false here since the sidebar is view-only. If a
// snapshot exists for the task, we're in change-order territory and the
// delta chip should surface.
function taskDelta(t){
  if(!__TASK_ORIGINALS[t.id]) return 0;
  return computeCostDelta(t);
}
function groupDelta(items){
  if(!items || !items.length) return 0;
  return items.reduce((s, t) => s + taskDelta(t), 0);
}
function scopeDelta(){
  return TASKS.reduce((s, t) => s + taskDelta(t), 0);
}
/* ── Change-order summary (work / closeout) ──────────────────────────────
   Once the scope is approved, edits to a task are a change order. These two
   helpers turn the diff against the approved snapshot into human-readable
   text — a per-field list (contractor / option / product / qty / rate / cost)
   plus the net movement in the task total — so the banner actually says what
   changed instead of just warning that changes create a change order. */
function _coTaskChanges(t){
  const clip = v => { const s = String(v == null ? '' : v); return s.length > 46 ? s.slice(0, 44) + '…' : s; };
  const out = [];
  // Direct edits, tracked against the approved snapshot (qty / rate / product /
  // option and, in the admin work stage, contractor).
  const o = (typeof __TASK_ORIGINALS !== 'undefined') ? __TASK_ORIGINALS[t.id] : null;
  if(o){
    const cmp = (field, label, fmt) => {
      if(String(o[field] ?? '') !== String(t[field] ?? '')){
        out.push({ label, from: clip(fmt ? fmt(o[field]) : o[field]), to: clip(fmt ? fmt(t[field]) : t[field]) });
      }
    };
    cmp('gc',      'Contractor',   v => v || 'Unassigned');
    cmp('opt',     'Option');
    cmp('product', 'Product',      v => v || '—');
    cmp('qty',     'Quantity');
    cmp('rate',    'Labor rate');
    cmp('pcost',   'Product cost');
  }
  // Staged change-order edits (construction context routes some edits — e.g. a
  // contractor reassignment — through pendingChanges instead of TASKS). Fold
  // them in so the summary is complete regardless of which path captured them.
  if(typeof pendingChanges !== 'undefined' && Array.isArray(pendingChanges)){
    const typeLabel = { contractor: 'Contractor', delete: 'Removal', edit: 'Edit' };
    pendingChanges.filter(c => c.taskId === t.id).forEach(c => {
      const label = typeLabel[c.type] || (c.type ? c.type[0].toUpperCase() + c.type.slice(1) : 'Change');
      if(out.some(x => x.label === label)) return;   // snapshot already has it
      out.push({ label, from: clip(c.before), to: clip(c.after) });
    });
  }
  // Option / Line-Item (product) diff — the Editor commits qty and cost on the
  // products, which the flat-field compare above never sees. Diff the snapshot's
  // options tree so those surface as change-order line items.
  if(o && Array.isArray(o.options)){
    const curOpts = Array.isArray(t.options) ? t.options : [];
    const qn = v => { const m = String(v == null ? '' : v).match(/-?\d+(?:\.\d+)?/); return m ? m[0] : String(v || ''); };
    curOpts.forEach(co => {
      const so = o.options.find(x => x.id === co.id);
      const oName = co.name || 'Option';
      if(!so){ if(co.added !== false) out.push({ label: 'Option added', from: '—', to: clip(oName) }); return; }
      (co.products || []).forEach(cp => {
        const sp = (so.products || []).find(x => x.id === cp.id);
        const pName = cp.product || 'Product';
        if(!sp){ if(_parseQtyNum(cp.qty) > 0) out.push({ label: clip(pName), from: 'not in scope', to: 'qty ' + qn(cp.qty) }); return; }
        if(String(sp.qty ?? '') !== String(cp.qty ?? '')) out.push({ label: 'Qty · ' + clip(pName), from: qn(sp.qty), to: qn(cp.qty) });
        if(String(sp.parts ?? '') !== String(cp.parts ?? '')) out.push({ label: 'Parts · ' + clip(pName), from: clip(sp.parts || '$0'), to: clip(cp.parts || '$0') });
        if(String(sp.labor ?? '') !== String(cp.labor ?? '')) out.push({ label: 'Labor · ' + clip(pName), from: clip(sp.labor || '$0'), to: clip(cp.labor || '$0') });
      });
      (so.products || []).forEach(sp => {
        if(!(co.products || []).some(cp => cp.id === sp.id) && _parseQtyNum(sp.qty) > 0)
          out.push({ label: clip(sp.product || 'Product'), from: 'qty ' + qn(sp.qty), to: 'removed' });
      });
    });
    o.options.forEach(so => {
      if(!curOpts.some(co => co.id === so.id) && so.added !== false)
        out.push({ label: 'Option removed', from: clip(so.name || 'Option'), to: '—' });
    });
  }
  return out;
}
/* _coChangeSummaryHtml (the itemized Change Order card) was removed — the
   Editor banner now shows a compact draft message instead. _coTaskChanges
   above is still used to detect whether a task has staged changes (which
   message to show); it no longer feeds a rendered summary. */
function deltaChipHtml(d){
  if(!d) return '';
  const cls = d > 0 ? 'is-over' : 'is-under';
  return `<span class="cost-delta ${cls}" title="${d > 0 ? 'Over' : 'Under'} approved by ${_fmtDelta(Math.abs(d))}">${_fmtDelta(d)}</span>`;
}
/* Quantity is split into number + unit — the number is editable but the
   unit stays locked (unit changes are a bigger structural decision that
   the sidebar's edit-mode doesn't grant). This helper re-assembles the
   qty string from a new number while preserving the existing unit. */
function parseQty(str){
  const m = String(str||'').match(/^\s*(-?\d+(?:\.\d+)?)\s*(.*)$/);
  if(m) return {num: m[1], unit: m[2].trim()};
  return {num: '', unit: String(str||'').trim()};
}
function commitTaskQtyNum(id, newNum){
  const t = TASKS.find(x => x.id === id); if(!t) return;
  const {unit} = parseQty(t.qty);
  const cleanNum = String(newNum||'').trim();
  t.qty = cleanNum + (unit ? ' ' + unit : '');
}
function cancelEdit(id){ editId=null; editDraft=null; renderSidebar(); }
/* Inline contractor reassignment from the expanded task detail. In normal
   modes this commits directly to TASKS. In change-order mode (Construction
   stage) the edit is staged into a pending change order for admin review —
   TASKS stays untouched until the admin approves. */
function setTaskContractor(id, gc){
  const t = TASKS.find(x=>x.id===id); if(!t) return;
  const prev = t.gc || 'Unassigned';
  const next = gc ? gc : null;
  const nextLabel = next || 'Unassigned';
  if(prev === nextLabel) return;

  if(IS_CHANGE_ORDER){
    // Stage the change instead of applying it. Sidebar re-renders show the pending marker.
    coAddChange({
      type: 'contractor',
      taskId: t.id,
      taskCode: t.code,
      before: prev,
      after: nextLabel,
      label: `Reassign ${t.name} from ${prev} to ${nextLabel}`,
    });
    toast(`Change staged · ${t.name} → ${nextLabel}`);
    return;
  }

  t.gc = next;
  t.flags = t.flags || [];
  if(t.gc) t.flags = t.flags.filter(a => a !== 'unassigned');
  else if(!t.flags.includes('unassigned')) t.flags.push('unassigned');
  toast(`${t.name} · reassigned to ${nextLabel}`);
  renderSidebar();
  if(workMode==='shop' || workMode==='artifact') renderWork();
}
function saveEdit(id){
  const t=TASKS.find(x=>x.id===id); if(!t||!editDraft) return;
  t.status=editDraft.status;
  t.name=editDraft.name;
  t.desc=editDraft.desc;
  t.opt=editDraft.opt;
  t.gc=editDraft.gc?editDraft.gc:null;
  t.product=editDraft.product;
  t.pcost=editDraft.pcost;
  t.qty=editDraft.qty;
  t.rate=editDraft.rate;
  t.cost=editDraft.cost;
  t.mods=[...(editDraft.mods||[])];
  // auto-resolve flags the edit fixes
  if(t.gc) t.flags=(t.flags||[]).filter(a=>a!=='unassigned');
  if(t.product && !/not selected/i.test(t.product)) t.flags=(t.flags||[]).filter(a=>a!=='missing');
  editId=null; editDraft=null;
  toast(`${t.name} updated`);
  renderAll();
}
/* resolve a system flag */
function resolveFlag(id,a){
  const t=TASKS.find(x=>x.id===id); if(!t) return;
  t.flags=(t.flags||[]).filter(x=>x!==a);
  toast(`${tagInfo(a).label} resolved`);
  renderAll();
}
/* toggle a modifier in the edit draft */
/* Task modifiers. PROJECT_MODS is a short list of financial treatments
   ('Tenant', 'Deferred') and t.mods is an array, so this keeps
   the array shape — writing [] or [id] — rather than swapping the model for a
   scalar. That leaves the chips, filters and taskKeys() reading it exactly as
   they did; a task simply never carries more than one from this control. */
function setTaskMod(id, mid){
  const t = TASKS.find(x => x.id === id); if(!t) return;
  t.mods = mid ? [mid] : [];
  if(typeof renderAll === 'function') renderAll();
}
function toggleDraftMod(mid){
  if(!editDraft) return;
  editDraft.mods=editDraft.mods||[];
  const i=editDraft.mods.indexOf(mid);
  if(i>=0) editDraft.mods.splice(i,1); else editDraft.mods.push(mid);
  renderSidebar();
}
/* remove a modifier directly (view mode) */
function removeMod(id,mid){
  const t=TASKS.find(x=>x.id===id); if(!t) return;
  t.mods=(t.mods||[]).filter(x=>x!==mid);
  toast(`${tagInfo(mid).label} removed`);
  renderAll();
}
/* quick-add modifier popover (view mode) */
let modAddFor=null;
function openModAdd(id,btn){
  modAddFor=id;
  closeModAdd();
  const t=TASKS.find(x=>x.id===id); if(!t) return;
  const avail=PROJECT_MODS.filter(m=>!(t.mods||[]).includes(m.id));
  const pop=document.createElement('div');
  pop.className='mod-pop'; pop.id='modPop';
  pop.onclick=e=>e.stopPropagation();
  pop.innerHTML=`<div class="mod-pop-head">Add modifier</div>`+
    (avail.length?avail.map(m=>`<button class="mod-pop-opt" onclick="addMod(${id},'${m.id}')">
        ${m.label}<span class="mk">${m.kind==='financial'?'Financial':'Display'}</span></button>`).join('')
      :`<div class="mod-pop-empty">All job modifiers applied</div>`)+
    `<div class="mod-pop-foot">${(PROJECT_MODS.length)}/5 job modifiers</div>`;
  document.body.appendChild(pop);
  const r=btn.getBoundingClientRect();
  pop.style.top=(r.bottom+6)+'px';
  pop.style.left=Math.min(r.left, window.innerWidth-pop.offsetWidth-12)+'px';
}
function addMod(id,mid){
  const t=TASKS.find(x=>x.id===id); if(!t) return;
  t.mods=t.mods||[];
  if(!t.mods.includes(mid)) t.mods.push(mid);
  closeModAdd();
  toast(`${tagInfo(mid).label} added`);
  renderAll();
}
function closeModAdd(){ const p=document.getElementById('modPop'); if(p) p.remove(); }
document.addEventListener('click',()=>closeModAdd());
// Outside click closes the product-modifier menu, like every other menu here.
document.addEventListener('click',()=>{ if(typeof closeProdMod==='function') closeProdMod(); });

/* ── Per-product modifier checklist (kebab menu on each option's product
   row) ── Unlike the single-pick task-level popover above, this one is a
   checklist: every click toggles a modifier and re-renders the popover in
   place so the user can apply more than one without reopening it. Closes
   on the next outside click, same as the task-level popover. */
let modAddForProduct=null; // {taskId, optId, prodId} of the currently-open popover
function _findProduct(taskId, optId, prodId){
  const t=TASKS.find(x=>x.id===taskId); if(!t) return {};
  const opt=(t.options||[]).find(o=>o.id===optId); if(!opt) return {t};
  const p=(opt.products||[]).find(x=>x.id===prodId); if(!p) return {t, opt};
  return {t, opt, p};
}
function _productModPopHtml(p){
  const applied = new Set(p.mods||[]);
  const rows = PROJECT_MODS.map(m => {
    const on = applied.has(m.id);
    return `<button class="mod-pop-opt${on?' is-on':''}" onclick="event.stopPropagation();toggleProductMod(${modAddForProduct.taskId},'${modAddForProduct.optId}','${modAddForProduct.prodId}','${m.id}')">
      <span class="mod-pop-opt-l"><span class="mod-pop-ck">${on?'<svg viewBox="0 0 12 12" fill="none"><path d="M2.5 6.5l2.5 2.5 4.5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>':''}</span>${esc(m.label)}</span>
      <span class="mk">${m.kind==='financial'?'Financial':'Display'}</span>
    </button>`;
  }).join('');
  return `<div class="mod-pop-head">Modifiers</div>${rows}<div class="mod-pop-foot">Select any that apply</div>`;
}
function openProductModAdd(taskId, optId, prodId, btn){
  closeModAdd(); closeProductModAdd();
  modAddForProduct={taskId, optId, prodId};
  const {p}=_findProduct(taskId, optId, prodId); if(!p) return;
  const pop=document.createElement('div');
  pop.className='mod-pop'; pop.id='prodModPop';
  pop.onclick=e=>e.stopPropagation();
  pop.innerHTML=_productModPopHtml(p);
  document.body.appendChild(pop);
  const r=btn.getBoundingClientRect();
  pop.style.top=(r.bottom+6)+'px';
  pop.style.left=Math.min(r.left, window.innerWidth-pop.offsetWidth-12)+'px';
}
function toggleProductMod(taskId, optId, prodId, modId){
  const {t, p}=_findProduct(taskId, optId, prodId); if(!t || !p) return;
  if(!Array.isArray(p.mods)) p.mods=[];
  const i=p.mods.indexOf(modId);
  if(i>=0) p.mods.splice(i,1); else p.mods.push(modId);
  renderAll();
  const pop=document.getElementById('prodModPop');
  if(pop) pop.innerHTML=_productModPopHtml(p);
}
function closeProductModAdd(){ modAddForProduct=null; const p=document.getElementById('prodModPop'); if(p) p.remove(); }
document.addEventListener('click',()=>closeProductModAdd());

/* ════════════ SIDE DRAWER (photos / notes / history) ════════════ */
let dwActiveTab='notes';
let dwCtx=null; // {type:'task', id} | {type:'room', room}
function openDrawer(id,tab){
  const t=TASKS.find(x=>x.id===id); if(!t) return;
  dwCtx={type:'task', id};
  dwNoteLevel = 'task';   // opened from a task — default the note to it
  dwNoteResetEditState();
  dwNoteHidden = true;
  dwActiveTab=tab||'notes';
  document.getElementById('dwTask').textContent=`${t.room} · ${t.code}`;
  document.getElementById('dwTitle').textContent=t.name;
  document.getElementById('drawer').classList.add('open');
  document.getElementById('drawer-scrim').classList.add('open');
  dwTab(dwActiveTab);
}
function openGroupDrawer(room,tab){
  const items=TASKS.filter(t=>t.room===room);
  dwCtx={type:'room', room};
  // Group drawers offer Scope and Group only, so a task-level choice
  // carried over from a task drawer has to be dropped here.
  dwNoteLevel = 'group';  // opened from a group — default the note to it
  dwNoteResetEditState();
  dwNoteHidden = true;
  dwActiveTab=tab||'notes';
  document.getElementById('dwTask').textContent=`Room · ${items.length} ${items.length===1?'task':'tasks'}`;
  document.getElementById('dwTitle').textContent=room;
  document.getElementById('drawer').classList.add('open');
  document.getElementById('drawer-scrim').classList.add('open');
  dwTab(dwActiveTab);
}
/* ── Media drawer (Photos + Notes) ───────────────────────────────────
   Artifact 2 opens the same #drawer as everything else, but as a two-tab
   media drawer rather than the notes-only one. `media` on dwCtx is what
   dwTab keys off: it renders the tab bar and allows the photos tab. No
   History tab — Artifact 2 IS the history, so a history tab inside it would
   answer a question the page already answered.

   `kind` is 'task' (key = a task code, which is what Artifact 2's snapshot
   carries instead of an id) or 'room' (key = the room name). */
function openMediaDrawer(kind, key, tab){
  if(kind === 'task'){
    const t = TASKS.find(x => x.code === key); if(!t) return;
    dwCtx = {type:'task', id:t.id, media:true};
    document.getElementById('dwTask').textContent = `${t.room} · ${t.code}`;
    document.getElementById('dwTitle').textContent = t.name;
  } else {
    const items = TASKS.filter(t => t.room === key);
    dwCtx = {type:'room', room:key, media:true};
    document.getElementById('dwTask').textContent = `Room · ${items.length} ${items.length===1?'task':'tasks'}`;
    document.getElementById('dwTitle').textContent = key;
  }
  // The composer is off in a media drawer, so none of its state applies —
  // but reset it anyway so reopening a normal drawer afterwards starts clean.
  dwNoteResetEditState();
  dwNoteHidden = true;
  dwTab(tab || 'photos');
  document.getElementById('drawer').classList.add('open');
  document.getElementById('drawer-scrim').classList.add('open');
}
function closeDrawer(){
  document.getElementById('drawer').classList.remove('open');
  document.getElementById('drawer-scrim').classList.remove('open');
  dwCtx=null;
  // Walking away from the composer walks away from the approval it was
  // going to carry — nothing is approved until the note is written.
  if(typeof apClearPendingApproval === 'function') apClearPendingApproval();
}
/* Notes only. The photo tab and everything behind it moved to the photo
   manager overlay, which owns viewing and adding at every level — so the
   drawer no longer has two things to switch between and the tab bar is gone
   with it. The `tab` argument is kept because a dozen call sites pass 'notes'
   and the state is still worth tracking if a second tab ever returns. */
function dwTab(tab){
  const media = !!(dwCtx && dwCtx.media);
  dwActiveTab = tab || (media ? 'photos' : 'notes');
  const tabs = document.getElementById('dwTabs');
  if(tabs) tabs.innerHTML = media ? dwTabBarHtml() : '';
  if(!dwCtx) return;
  const body = document.getElementById('dwBody');
  if(media && dwActiveTab === 'photos'){
    body.innerHTML = dwPhotos();
    return;
  }
  // A media drawer's notes tab is read-only: it hangs off a historical
  // document, and writing a note against a past version isn't a thing that
  // surface can honour.
  if(dwCtx.type === 'task'){
    const t = TASKS.find(x => x.id === dwCtx.id); if(!t) return;
    body.innerHTML = dwNotes(taskNotes(t), {readOnly:media});
  } else if(dwCtx.type === 'scope'){
    body.innerHTML = dwNotes(scopeNotesPool(), {readOnly:media});
  } else {
    body.innerHTML = dwNotes(groupNotesForRoom(dwCtx.room), {readOnly:media});
  }
}
/* Counts live on the tabs so you can see there's nothing behind one before
   paying a click for it. */
function dwTabBarHtml(){
  const pn = dwMediaPhotos().length;
  const nn = dwMediaNotes().length;
  const tab = (id, label, n) =>
    `<button class="dw-tab${dwActiveTab===id?' active':''}" data-dw="${id}" onclick="dwTab('${id}')">${label}${n?`<span class="n">${n}</span>`:''}</button>`;
  return tab('photos','Photos',pn) + tab('notes','Notes',nn);
}
/* The photos behind the current context: a task's own shots, or every shot
   filed against a room (its group scans plus each task's). */
function dwMediaPhotos(){
  if(!dwCtx || typeof PHOTOS === 'undefined') return [];
  if(dwCtx.type === 'task'){
    const t = TASKS.find(x => x.id === dwCtx.id);
    return t ? PHOTOS.filter(p => p.kind === 'task' && p.task === t.code) : [];
  }
  const room = dwCtx.room;
  return PHOTOS.filter(p => p.room === room && (p.kind === 'group' || p.kind === 'task'));
}
function dwMediaNotes(){
  if(!dwCtx) return [];
  if(dwCtx.type === 'task'){
    const t = TASKS.find(x => x.id === dwCtx.id);
    return t ? taskNotes(t) : [];
  }
  return (typeof groupNotesForRoom === 'function') ? groupNotesForRoom(dwCtx.room) : [];
}
/* Photo grid. Reuses _pgdPhotoFigHtml so a tile in the drawer is the same
   tile as everywhere else — same provenance chip, hover meta, and date. */
function dwPhotos(){
  const photos = dwMediaPhotos();
  if(!photos.length) return `<div class="dw-empty">No photos here yet.</div>`;
  const t = (dwCtx.type === 'task') ? TASKS.find(x => x.id === dwCtx.id) : null;
  // hideTag drops the chip that would only repeat the drawer's own title.
  const hideTag = t ? t.name : dwCtx.room;
  const cells = photos.map((p, i) => {
    const label = (p.kind === 'group') ? (p.room || 'Job')
                : (t ? t.name : ((TASKS.find(x => x.code === p.task) || {}).name || p.room));
    return _pgdPhotoFigHtml(p, i, label, hideTag);
  }).join('');
  return `<div class="dw-photo-grid">${cells}</div>`;
}

/* ── notes (shared, by list) ─────────────────────────────────────
   Also renders a composer at the bottom (textarea + Save note button)
   so users can drop a new note without leaving the drawer. */
let dwNoteDraft = '';
/* Composer state for the notes tab. Both reset on every drawer open so the
   note type always matches the surface you opened from, and visibility never
   silently inherits a choice made about a different note. */
let dwNoteLevel = 'task';   // 'scope' | 'group' | 'task' | 'option'
let dwNoteHidden = true;    // true = internal, hidden from the contractor
const DW_NOTE_LEVELS = [
  {id:'scope',  label:'Scope'},
  {id:'group',  label:'Group'},
  {id:'task',   label:'Task'},
  {id:'option', label:'Option'},
];
/* Which photo kinds the picker offers. From a group drawer an upload has no
   task to attach to, so Task isn't a choice it can honour — Group is the only
   one, and it's already the default. The control stays rather than
   disappearing: it says what will happen to the upload. */
/* Which levels the picker offers. A group drawer has no single task in
   context, so Task and Option aren't choices it can honour — offering them
   would let you file a note against nothing. */
function dwNoteLevelsFor(){
  const groupCtx = dwCtx && dwCtx.type !== 'task';
  return groupCtx
    ? DW_NOTE_LEVELS.filter(l => l.id === 'scope' || l.id === 'group')
    : DW_NOTE_LEVELS;
}

function dwNoteLevelLabel(){
  return (DW_NOTE_LEVELS.find(l => l.id === dwNoteLevel) || DW_NOTE_LEVELS[2]).label;
}

/* ── Note edit / delete ──────────────────────────────────────────────
   Scoped to USER_NOTES — the notes written in this session. Seeded notes
   are attributed to other people, so they carry no controls; editing
   someone else's note isn't a thing this surface should allow.
   Only one pending action at a time: opening an editor clears a pending
   delete and vice versa, so the list never shows two half-finished
   states at once. */
let dwNoteEditIdx = null;
let dwNoteEditDraft = '';
let dwNoteEditHidden = true;
let dwNoteDeleteIdx = null;
function _dwMyNotes(){
  return (dwCtx && dwCtx.type === 'task' && USER_NOTES[dwCtx.id]) ? USER_NOTES[dwCtx.id] : null;
}
// The drawer isn't the only place these notes show — the task view's notes
// module previews the newest one. Repaint it after any change, or a deleted
// note lingers there until something else forces a render.
function _dwNotesChanged(){
  if(typeof dwTab === 'function') dwTab('notes');
  if(typeof renderWork === 'function') renderWork();
}
function dwNoteResetEditState(){
  dwNoteEditIdx = null; dwNoteEditDraft = ''; dwNoteDeleteIdx = null;
}
function dwNoteEdit(i){
  const mine = _dwMyNotes();
  if(!mine || !mine[i]) return;
  dwNoteEditIdx = i;
  dwNoteEditDraft = mine[i].body || '';
  dwNoteEditHidden = !!mine[i].hidden;
  dwNoteDeleteIdx = null;
  if(typeof dwTab === 'function') dwTab('notes');
}
function dwNoteEditSetDraft(v){ dwNoteEditDraft = v; }
function dwNoteEditSetHidden(v){
  dwNoteEditHidden = !!v;
  document.querySelectorAll('.dw-note-evis').forEach(b => {
    b.classList.toggle('on', (b.dataset.evis === 'internal') === dwNoteEditHidden);
  });
}
function dwNoteEditCancel(){
  dwNoteEditIdx = null; dwNoteEditDraft = '';
  if(typeof dwTab === 'function') dwTab('notes');
}
function dwNoteEditSave(){
  const mine = _dwMyNotes();
  if(!mine || dwNoteEditIdx === null || !mine[dwNoteEditIdx]) return;
  const body = (dwNoteEditDraft || '').trim();
  // Emptying the box is a delete in disguise; say so rather than silently
  // storing a blank note.
  if(!body){ if(typeof toast === 'function') toast('A note can\'t be empty — delete it instead'); return; }
  const entry = mine[dwNoteEditIdx];
  entry.body = body;
  entry.hidden = dwNoteEditHidden;
  entry.edited = true;
  dwNoteEditIdx = null; dwNoteEditDraft = '';
  _dwNotesChanged();
  if(typeof toast === 'function') toast('Note updated');
}
function dwNoteDeleteAsk(i){
  dwNoteDeleteIdx = i; dwNoteEditIdx = null;
  if(typeof dwTab === 'function') dwTab('notes');
}
function dwNoteDeleteCancel(){
  dwNoteDeleteIdx = null;
  if(typeof dwTab === 'function') dwTab('notes');
}
function dwNoteDelete(i){
  const mine = _dwMyNotes();
  if(!mine || !mine[i]) return;
  mine.splice(i, 1);
  // Drop the empty array so the count logic elsewhere sees no key at all.
  if(!mine.length && dwCtx) delete USER_NOTES[dwCtx.id];
  dwNoteResetEditState();
  _dwNotesChanged();
  if(typeof toast === 'function') toast('Note deleted');
}
/* Overflow menu open/close. Follows the .pgd-filter pattern — an .open class
   on the wrapper reveals the menu — with one addition: the notes list scrolls
   and clips its overflow, so a menu on one of the last rows would be cut off.
   Measure the room below the trigger and flip upward when there isn't any. */
function toggleDwNoteMenu(i){
  const el = document.getElementById('dwNoteMenu-' + i);
  if(!el) return;
  const wasOpen = el.classList.contains('open');
  document.querySelectorAll('.dw-note-menu.open').forEach(m => m.classList.remove('open'));
  if(wasOpen) return;   // second click on the same trigger closes it
  const list = el.closest('.dw-notes-list');
  if(list){
    const room = list.getBoundingClientRect().bottom - el.getBoundingClientRect().bottom;
    el.classList.toggle('up', room < 84);
  }
  el.classList.add('open');
}
/* Header dropdowns. Same .open-class pattern as the other custom menus.
   Picking an option calls the field's existing setter, which re-renders the
   header — so unlike the note composer there's nothing to patch in place;
   the menu comes back closed on its own. */
function toggleHdrDd(id){
  const el = document.getElementById(id);
  if(!el) return;
  const wasOpen = el.classList.contains('open');
  document.querySelectorAll('.sec-hdr-dd.open').forEach(d => d.classList.remove('open'));
  if(!wasOpen) el.classList.add('open');
}
/* Builds one. `cur` is the value in effect, `opts` is [{value,label}], and
   `onPick` is a call template with __V__ standing in for the chosen value. */
function hdrDdHtml(id, cur, opts, onPick, extraCls){
  const sel = opts.find(o => o.value === cur) || opts[0];
  const items = opts.map(o =>
    `<button class="pgd-filter-item${o.value === cur ? ' on' : ''}" role="option" data-v="${esc(o.value)}"
       aria-selected="${o.value === cur}"
       onclick="event.stopPropagation();${onPick.replace('__V__', "'" + String(o.value).replace(/'/g, "\\'") + "'")}">
       <span class="pgd-filter-tick">&#10003;</span><span>${esc(o.label)}</span>
     </button>`).join('');
  return `<span class="pgd-filter sec-hdr-dd${extraCls ? ' ' + extraCls : ''}" id="${id}">
    <button type="button" class="pgd-filter-btn" aria-haspopup="listbox"
      onclick="event.stopPropagation();toggleHdrDd('${id}')">
      <span>${esc(sel ? sel.label : '')}</span>
      <svg viewBox="0 0 12 12"><path d="M3 4.5l3 3 3-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>
    </button>
    <div class="pgd-filter-menu" role="listbox" onclick="event.stopPropagation()">${items}</div>
  </span>`;
}
function toggleDwNoteLevel(){
  const d = document.getElementById('dwNoteLvlDd');
  if(d) d.classList.toggle('open');
}
function pickDwNoteLevel(v){
  dwNoteLevel = v;
  const d = document.getElementById('dwNoteLvlDd');
  if(!d) return;
  d.classList.remove('open');
  // Patch the button label and ticks in place instead of re-rendering the
  // tab — same reason as the visibility toggle: a re-render would rebuild
  // the textarea and drop whatever's half-written in it.
  const lbl = d.querySelector('.pgd-filter-btn .dw-note-lvl-cur');
  if(lbl) lbl.textContent = dwNoteLevelLabel();
  d.querySelectorAll('.pgd-filter-item').forEach(b => {
    const on = b.dataset.lvl === v;
    b.classList.toggle('on', on);
    b.setAttribute('aria-selected', String(on));
  });
}
function dwNoteSetHidden(v){
  dwNoteHidden = !!v;
  // Toggled in place rather than re-rendering the tab — a full re-render
  // would rebuild the textarea and drop the caret mid-sentence.
  document.querySelectorAll('.dw-note-vis-btn').forEach(b => {
    b.classList.toggle('on', (b.dataset.vis === 'internal') === dwNoteHidden);
    b.setAttribute('aria-pressed', String((b.dataset.vis === 'internal') === dwNoteHidden));
  });
  const hint = document.getElementById('dwNoteHint');
  if(hint) hint.textContent = dwNoteHidden
    ? 'Internal — visible to the job team only.'
    : 'External — the assigned contractor can see this note.';
}

let USER_NOTES = {}; // { taskId: [{who, role, when, body}, ...] }
function dwNoteSetDraft(v){ dwNoteDraft = v; }
function dwSaveNote(){
  const body = (dwNoteDraft||'').trim();
  if(!body){ if(typeof toast==='function') toast('Write something first'); return; }
  if(!dwCtx){ return; }
  // A note written to carry an approval is the record of a decision, not a
  // remark about one. Stamped here so the card can show it as such — read
  // before the entry is built, since the approval fires after the save.
  const _decisionNote = (typeof apPendingApproval !== 'undefined' && apPendingApproval)
    ? ((typeof _decisionVerb === 'function' && _decisionVerb() === 'approve') ? 'approval' : 'review')
    : null;
  const now = new Date();
  const when = now.toLocaleDateString('en-US',{month:'short',day:'numeric'}) + ' · ' +
               now.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'}).replace(' ','').toLowerCase();
  const entry = { who:'You', role:'Admin', when, body,
                  level: dwNoteLevel, hidden: dwNoteHidden,
                  kind: _decisionNote || undefined };
  if(dwCtx.type === 'task'){
    if(!USER_NOTES[dwCtx.id]) USER_NOTES[dwCtx.id] = [];
    USER_NOTES[dwCtx.id].unshift(entry);
  }
  dwNoteDraft = '';
  // Type and visibility deliberately persist after saving — consecutive
  // notes on the same surface are usually the same kind.
  _dwNotesChanged(); // re-render with the new note + clear draft
  if(typeof toast === 'function') toast('Note saved');
  // "Approve with note" parks the approval here so the note is what commits
  // it. Cleared first, so a failure below can't leave it primed to fire on
  // the next unrelated note.
  if(typeof apPendingApproval === 'function' || apPendingApproval){
    const run = apPendingApproval;
    apPendingApproval = null;
    if(typeof closeDrawer === 'function') closeDrawer();
    try{ run(); }catch(e){ console.error('approve-with-note failed', e); }
  }
}
function dwNotes(notes, opts){
  // Prepend any user-saved notes so freshly-added entries surface first.
  let all = notes || [];
  // The user's own notes are prepended, so any merged-list index below
  // mineCount maps straight onto USER_NOTES — no second lookup, and no
  // chance of offering Edit on someone else's note.
  const mineCount = (dwCtx && dwCtx.type === 'task' && USER_NOTES[dwCtx.id])
    ? USER_NOTES[dwCtx.id].length : 0;
  if(dwCtx && dwCtx.type === 'task' && USER_NOTES[dwCtx.id]){
    all = [...USER_NOTES[dwCtx.id], ...all];
  }
  const listHtml = all.length ? all.map((n,i)=>{
    const isMine = i < mineCount;
    const isSelf = IS_CONTRACTOR && n.who === MY_CONTRACTOR;
    const badge = IS_CONTRACTOR && !isSelf
      ? `<span class="dw-note-ext" title="Sent to you by the job team">External · Request</span>`
      : '';
    const role = n.role ? `<span class="dw-note-role">${n.role}</span>` : '';
    // Level and visibility only exist on notes written through this
    // composer; seeded notes predate them and stay unchipped rather
    // than being labelled with a guess.
    const lvl = n.level
      ? `<span class="dw-note-lvl">${esc((DW_NOTE_LEVELS.find(l=>l.id===n.level)||{}).label || n.level)}</span>`
      : '';
    const intBadge = n.hidden ? `<span class="dw-note-int" title="Internal — not visible to the contractor">Internal</span>` : '';
    const edited = n.edited ? `<span class="dw-note-edited">&middot; edited</span>` : '';
    /* An approval note gets the stripe the card already uses to say what kind
       of note something is, plus a tick on the author line. The tick echoes
       the APPROVED control the note was written from, so the two read as the
       same event rather than a note that happens to be green. */
    const isApproval = n.kind === 'approval' || n.kind === 'review';
    const apTick = isApproval
      ? `<span class="dw-note-aptick" title="Written to ${n.kind === 'review' ? 'review' : 'approve'}"><svg viewBox="0 0 14 14" aria-hidden="true"><path d="M2.5 7.5l3 3 6-7"/></svg></span>`
      : '';
    // Editing happens in place: the note keeps its position and its meta row,
    // so you can still see who wrote it and when while rewriting the body.
    if(isMine && dwNoteEditIdx === i){
      return `<div class="dw-note is-editing${n.hidden?' is-internal':''}${isApproval?' is-approval':''}">
        <div class="dw-note-meta">
          ${apTick}<span class="dw-note-who">${n.who}</span>${role}${lvl}
          <span class="dw-note-when">${n.when}</span>${edited}
        </div>
        <textarea class="dw-note-edit-input" oninput="dwNoteEditSetDraft(this.value)"
          aria-label="Edit note">${esc(dwNoteEditDraft)}</textarea>
        <div class="dw-note-edit-row">
          <div class="dw-note-vis" role="group" aria-label="Note visibility">
            <button type="button" class="dw-note-vis-btn dw-note-evis${dwNoteEditHidden?' on':''}" data-evis="internal"
              onclick="event.stopPropagation();dwNoteEditSetHidden(true)">Internal</button>
            <button type="button" class="dw-note-vis-btn dw-note-evis${dwNoteEditHidden?'':' on'}" data-evis="external"
              onclick="event.stopPropagation();dwNoteEditSetHidden(false)">External</button>
          </div>
          <div class="dw-note-edit-acts">
            <button type="button" class="dw-note-act" onclick="event.stopPropagation();dwNoteEditCancel()">Cancel</button>
            <button type="button" class="dw-note-act is-primary" onclick="event.stopPropagation();dwNoteEditSave()">Save</button>
          </div>
        </div>
      </div>`;
    }
    // Actions live in the overflow menu; deleting from it drops through to
    // the inline confirm below rather than firing straight from the menu.
    const acts = isMine ? `<span class="pgd-filter dw-note-menu" id="dwNoteMenu-${i}">
      <button type="button" class="dw-note-menu-btn" aria-haspopup="menu" aria-label="Note actions" title="Note actions"
        onclick="event.stopPropagation();toggleDwNoteMenu(${i})">
        <svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="3.4" r="1.35"/><circle cx="8" cy="8" r="1.35"/><circle cx="8" cy="12.6" r="1.35"/></svg>
      </button>
      <div class="pgd-filter-menu" role="menu" onclick="event.stopPropagation()">
        <button type="button" class="pgd-filter-item" role="menuitem" onclick="event.stopPropagation();dwNoteEdit(${i})">Edit</button>
        <button type="button" class="pgd-filter-item is-danger" role="menuitem" onclick="event.stopPropagation();dwNoteDeleteAsk(${i})">Delete</button>
      </div>
    </span>` : '';
    const confirmRow = (isMine && dwNoteDeleteIdx === i) ? `<div class="dw-note-acts">
      <button type="button" class="dw-note-act is-confirm" onclick="event.stopPropagation();dwNoteDelete(${i})">Confirm delete</button>
      <button type="button" class="dw-note-act" onclick="event.stopPropagation();dwNoteDeleteCancel()">Keep</button>
    </div>` : '';
    return `<div class="dw-note${IS_CONTRACTOR && !isSelf?' external':''}${n.hidden?' is-internal':''}${isApproval?' is-approval':''}${isMine?' has-menu':''}">
      <div class="dw-note-meta">
        ${apTick}<span class="dw-note-who">${n.who}</span>${role}${lvl}${intBadge}
        <span class="dw-note-when">${n.when}</span>${edited}
        ${badge}
      </div>
      <div class="dw-note-body">${n.body}</div>${confirmRow}${acts}</div>`;
  }).join('') : `<div class="dw-empty">No notes yet.</div>`;
  // Composer sits pinned at the bottom of the drawer body.
  const levelOpts = dwNoteLevelsFor().map(l =>
    `<button class="pgd-filter-item${l.id === dwNoteLevel ? ' on' : ''}" role="option" data-lvl="${l.id}"
       aria-selected="${l.id === dwNoteLevel}" onclick="event.stopPropagation();pickDwNoteLevel('${l.id}')">
       <span class="pgd-filter-tick">&#10003;</span><span>${l.label}</span>
     </button>`).join('');
  const composerHtml = `<div class="dw-note-composer">
    <div class="dw-note-opts">
      <div class="dw-note-opt">
        <span class="dw-note-opt-lbl">Note</span>
        <span class="pgd-filter dw-note-lvl-dd" id="dwNoteLvlDd">
          <button type="button" class="pgd-filter-btn" aria-haspopup="listbox"
            onclick="event.stopPropagation();toggleDwNoteLevel()">
            <span class="dw-note-lvl-cur">${dwNoteLevelLabel()}</span>
            <svg viewBox="0 0 12 12"><path d="M3 4.5l3 3 3-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
          <div class="pgd-filter-menu" role="listbox" onclick="event.stopPropagation()">${levelOpts}</div>
        </span>
      </div>
      <div class="dw-note-opt">
        <span class="dw-note-opt-lbl">Visibility</span>
        <div class="dw-note-vis" role="group" aria-label="Note visibility">
          <button type="button" class="dw-note-vis-btn${dwNoteHidden?' on':''}" data-vis="internal"
            aria-pressed="${dwNoteHidden}" onclick="event.stopPropagation();dwNoteSetHidden(true)">Internal</button>
          <button type="button" class="dw-note-vis-btn${dwNoteHidden?'':' on'}" data-vis="external"
            aria-pressed="${!dwNoteHidden}" onclick="event.stopPropagation();dwNoteSetHidden(false)">External</button>
        </div>
      </div>
    </div>
    <div class="dw-note-hint" id="dwNoteHint">${dwNoteHidden
      ? 'Internal — visible to the job team only.'
      : 'External — the assigned contractor can see this note.'}</div>
    <textarea class="dw-note-input" placeholder="Add a note about this task…" oninput="dwNoteSetDraft(this.value)">${esc(dwNoteDraft||'')}</textarea>
    <div class="dw-note-composer-actions">
      <button class="dw-note-save" onclick="event.stopPropagation();dwSaveNote()">Save note</button>
    </div>
  </div>`;
  const readOnly = !!(opts && opts.readOnly);
  return `<div class="dw-notes-wrap"><div class="dw-notes-list">${listHtml}</div>${readOnly ? '' : composerHtml}</div>`;
}
/* task notes : sized to t.notes count */
function taskNotes(t){
  const pool=[
    {who:'Greg Han', role:'Field agent', when:'Apr 18 · 9:42a', body:'Captured during initial scan. Existing condition worse than listing photos suggested — see the wide shot for context. Please confirm you can work around the plumbing stub on the east wall.'},
    {who:'Ada Novak', role:'Manager', when:'Apr 21 · 2:15p', body:'Flagged this line for you to confirm before we lock scope. Send back any concerns or a revised estimate and we\'ll adjust before publish.'},
    {who:'Or Weiss', role:'Job manager', when:'Apr 22 · 8:30a', body:'Homeowner has approved the allowance shown. You\'re clear to proceed once the product SKU is picked. Ping me if the pricing runs long.'},
    {who:'Apex Carpentry', role:'Contractor · you', when:'Apr 24 · 1:12p', body:'Measured on site. Will need an extra day for the return panel.'},
  ];
  return pool.slice(0, t.notes||0);
}
function roomPhotoCount(room){ return TASKS.filter(t=>t.room===room).reduce((s,t)=>s+(t.photos||0),0) ? Math.min(6, 2+TASKS.filter(t=>t.room===room).length) : 0; }
function roomNotes(room){
  // room-level notes are about the space as a whole
  const base=[
    {who:'Greg Han', role:'Field agent', when:'Apr 18 · 9:40a', body:`Whole-room scan of the ${room.toLowerCase()}. Walkthrough video shows access, plumbing, and existing conditions — please review before you start on any line items in here.`},
    {who:'Ada Novak', role:'Manager', when:'Apr 21 · 2:05p', body:'General notes about the space: nothing structural to flag, but please protect adjacent surfaces during work. Let us know if you need a dumpster staged.'},
  ];
  return base;
}
function dwHistory(t){
  const evt=[
    {when:'Apr 18 · 9:42a', what:'<b>Captured</b> by Field Agent during 1st scan'},
    {when:'Apr 19 · 11:03a', what:'<b>Added to scope</b> by Scope Builder'},
    {when:'Apr 21 · 2:15p', what:'<b>Status</b> set to ' + (STATUS[t.status]||STATUS.not_started).label},
  ];
  if(t.gc) evt.push({when:'Apr 21 · 2:20p', what:`<b>Contractor</b> assigned : ${t.gc}`});
  return `<div class="dw-hist">`+evt.map(e=>`<div class="dw-evt"><div class="dw-evt-when">${e.when}</div><div class="dw-evt-what">${e.what}</div></div>`).join('')+`</div>`;
}
function dwRoomHistory(room){
  const items=TASKS.filter(t=>t.room===room);
  const evt=[
    {when:'Apr 18 · 9:40a', what:`<b>Room captured</b> : ${items.length} ${items.length===1?'task':'tasks'} scoped`},
    {when:'Apr 19 · 11:00a', what:'<b>Added to scope</b> by Scope Builder'},
    {when:'Apr 21 · 2:05p', what:'<b>Entered review</b>'},
  ];
  return `<div class="dw-hist">`+evt.map(e=>`<div class="dw-evt"><div class="dw-evt-when">${e.when}</div><div class="dw-evt-what">${e.what}</div></div>`).join('')+`</div>`;
}
document.addEventListener('keydown',e=>{ if(e.key==='Escape') closeDrawer(); });

/* ════════════ WORK SURFACE ════════════ */
const _urlTab = new URLSearchParams(window.__KAI_QS || window.location.search).get('tab');
/* Overview is the default: it is the only tab that says what this project is
   before you have selected anything, which is what you want on arrival. Every
   other tab answers a question you have to bring with you. ?tab= still wins,
   so a link into the Editor or an artifact lands where it says. */
let workMode = ['overview','gallery','floorplan','shop','artifact','artifact2','progress','pano'].includes(_urlTab) ? _urlTab : 'overview';
// Tab ids intentionally kept as 'pano' / 'progress' (URL routing, body
// classes, and postMessage payloads all key off them). Only the display
// labels changed: Pano → "Progress" (compare-walks timeline is what the
// user cares about), Progress → "Activity" (task/group activity feed).
// Editor (shop) tab drops out in the terminal closeout-approved state —
// the project is complete, nothing left to edit. Everything else stays
// so the archived scope + activity + progress remain browsable.
/* Editor leads: it's the surface the panel exists for. The ids predate
   the labels — `pano` is the tab called Progress, and `progress` was the
   one called Activity, which is gone along with Gallery. Their render
   branches stay in place but are no longer reachable from the tab bar;
   photo tiles open the overlay directly rather than a gallery tab. */
const _WORK_MODES_ALL = [
  {id:'overview', label:'Overview'},   // the project's front page — js/overview.js
  {id:'shop',     label:'Editor'},
  {id:'floorplan',label:'Measurements'},   // id stays: it's the URL param and dispatch key
  {id:'pano',     label:'Progress'},
  {id:'artifact', label:'Artifact'},
  {id:'artifact2',label:'Artifact 2'},   // scope change history — js/a2/*.js
];
const _projModeParam = new URLSearchParams(window.__KAI_QS || window.location.search).get('projMode');
/* ?only=<id> — a host page that exists for one surface (see
   Artifact-Change-Order-View) keeps that tab and drops the rest, so the bar
   names where you are without offering seven places you did not come for. */
const _onlyTab = new URLSearchParams(window.__KAI_QS || window.location.search).get('only');
const WORK_MODES = _onlyTab
  ? _WORK_MODES_ALL.filter(m => m.id === _onlyTab)
  : (_projModeParam === 'closeout-approved'
      ? _WORK_MODES_ALL.filter(m => m.id !== 'shop')
      : _WORK_MODES_ALL);
// If the URL asked for the shop tab but the mode strips it out, fall
// back to Artifact (the natural "read the finished doc" surface).
if(_projModeParam === 'closeout-approved' && workMode === 'shop') workMode = 'artifact';
function setWorkMode(m){
  // Clicking the Artifact tab always lands on the two-section index —
  // even if the user was drilled into a doc view for a specific copy
  // or historical version. Reset the drill-in state before rendering.
  if(m === 'artifact'){
    openCopyId = null;
    openHistoricalId = null;
  }
  workMode=m;
  document.body.classList.toggle('shop-mode', m==='shop');
  // Clear workBody between tab transitions so stale content (like an
  // Artifact document) can't survive if the incoming render throws.
  const wb = document.getElementById('workBody');
  if(wb) wb.innerHTML = '';
  // Also close any overlays that could be sitting over the work area.
  if(typeof closeFly === 'function' && typeof flyState !== 'undefined' && flyState) closeFly();
  document.body.classList.remove('art-lb-open');
  renderWorkHdr();
  try { renderWork(); }
  catch(err){
    console.error('setWorkMode · renderWork failed', err);
    if(wb) wb.innerHTML = '<div class="shop-empty"><span class="shop-empty-title">'+m+'</span><span class="shop-empty-desc">Something went wrong rendering this view.</span></div>';
  }
  if(m==='shop') renderSidebar();   // re-render to apply needs-product highlights
}

/* ── Scope copies model ─────────────────────────────────────────────────
   Replaces the old audience-preset system. A "copy" is a frozen snapshot
   of a scope version plus a view/filter recipe. Copies are not editable —
   only filterable (dollar visibility, contractor slice, renter-only). Each
   copy carries its own shareable link. Not persisted; resets on reload,
   matching the rest of the prototype. */
// Nothing to share yet pre-approval (projMode=review) — copies get made
// from a stable, reviewed scope, not a submission still awaiting its
// first pass. Sample copies only seed once the scope is past that stage.
let SCOPE_COPIES = PROJ_MODE === 'review' ? [] : [
  {id:'sc_ap1', name:'Apex Carpentry — kitchen bid',
   description:'For Apex to price cabinet + counter scope only.',
   basedOnVersionId:'v3', createdAt:'2026-07-14', shareToken:'sc_ap1_ax9k2',
   expiresAt:'2026-08-14',
   filters:{showAmounts:true, contractor:'Apex Carpentry', renterOnly:false}},
  {id:'sc_own', name:'Owner walkthrough packet',
   description:'Full scope + pricing for owner review.',
   basedOnVersionId:'v3', createdAt:'2026-07-10', shareToken:'sc_own_m7q4b',
   expiresAt:'2026-09-01',
   filters:{showAmounts:true, contractor:null, renterOnly:false}},
  {id:'sc_ren', name:'Resident responsibilities',
   description:'Line items charged to the resident. Prices hidden.',
   basedOnVersionId:'v2', createdAt:'2026-06-28', shareToken:'sc_ren_p2w8j',
   expiresAt:'2026-07-15',   // expired vs "today" of 2026-07-16
   filters:{showAmounts:false, contractor:null, renterOnly:true}},
];
// Two coexisting drill-in states for the Artifact tab:
//   openHistoricalId → viewing a frozen historical version (v1/v2/v3 doc, no
//                       filters, no share — audit trail).
//   openCopyId       → viewing a user-created shareable copy (filters + share).
// Both null → the two-section index (historical artifacts + shareable copies).
let openCopyId = null;
let openHistoricalId = null;
function openCopy(id){ openHistoricalId = null; openCopyId = id; renderArtifact(); }
function closeCopy(){ openCopyId = null; renderArtifact(); }
function openHistorical(id){ openCopyId = null; openHistoricalId = id; renderArtifact(); }
function closeHistorical(){ openHistoricalId = null; renderArtifact(); }
function copyById(id){ return SCOPE_COPIES.find(c => c.id === id); }
function copyIsExpired(c){
  if(!c || !c.expiresAt) return false;
  return Date.parse(c.expiresAt) < Date.parse('2026-07-16');
}
function _copyToken(){ return 'sc_' + Math.random().toString(36).slice(2,8); }
function _copyId(){ return 'cp_' + Math.random().toString(36).slice(2,7); }
function _addDays(iso, days){
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0,10);
}
function _todayIso(){ return '2026-07-16'; }
function setCopyFilter(id, key, value){
  const c = copyById(id); if(!c) return;
  c.filters[key] = value;
  renderArtifact();
}

function renderWorkHdr(){
  const tabs = WORK_MODES.map(m=>
    `<button class="wmode${m.id===workMode?' active':''}" onclick="setWorkMode('${m.id}')">${m.label}</button>`
  ).join('');
  // Group by + Filter icon moved into the sidebar's compact utility row
  // (below sb-hdr). Progress (pano) tab gets its own tool here instead —
  // the photo filter lives in the tabs row rather than a standalone bar.
  const scopeTools = (workMode === 'pano' && TASKS.length !== 0)
    ? `<label class="copy-filter-chk wmode-tool">
        <span class="box-halo"><input type="checkbox" ${panoOnlyWithPhotos?'checked':''} onchange="setPanoOnlyWithPhotos(this.checked)"></span>
        <span class="copy-filter-chk-lbl">Only show tasks with photos</span>
      </label>`
    /* Artifact 2 gets its own filter in the same slot. DECOY — wired to
       nothing on purpose: it is here to see whether a reviewer working through
       a long change order reaches for it, before the hiding logic is built. */
    : (workMode === 'artifact2')
    ? `<label class="copy-filter-chk wmode-tool" title="Not wired up yet">
        <span class="box-halo"><input type="checkbox"></span>
        <span class="copy-filter-chk-lbl">Hide approved changes</span>
      </label>`
    : '';
  // Copies model owns its own Share affordances (per-copy Share button in the
  // doc-view crumb + per-card Share in the index), so the work-hdr is bare.
  // Sits ahead of the tabs and only shows while the sidebar is collapsed —
  // CSS-gated on body.sb-collapsed, since collapsing doesn't re-render this.
  const showScope = `<button class="sb-show-scope" onclick="expandSidebar()" title="Show the scope list" aria-label="Show scope">
    Show scope
    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 2.5 8 6l-3.5 3.5"/></svg>
  </button>`;
  document.getElementById('workHdr').innerHTML = `${showScope}<div class="wmode-tabs">${tabs}</div>${scopeTools}`;
  // Rebuild the af menu contents now that the button is back in the DOM.
  if(typeof renderFilter === 'function') renderFilter();
}

/* ── tasks that still need a product selection ── */
function needsProduct(t){
  // A product belongs to an option, so a task with nothing added isn't
  // waiting on a product yet — the next move there is adding an option.
  // Outside draft optionIsAdded is always true, so this can't suppress
  // the tag anywhere the user has no control to act on it.
  const _opts = Array.isArray(t.options) ? t.options : [];
  if(_opts.length && typeof optionIsAdded === 'function' && !_opts.some(optionIsAdded)) return false;
  if(!t.product) return true;
  return /not selected|pending|tbd|design pending/i.test(t.product);
}
function tasksNeedingProduct(){ return TASKS.filter(needsProduct); }


/* ── Cart state : taskId → { product, qty } ── */
const cart = {};   // taskId → { product, qty }
/* legacy alias so older code paths still resolve */
const selectedProduct = new Proxy({}, { get:(_,k)=>cart[k]?cart[k].product:undefined });

function defaultQty(t, p){
  const raw = parseFloat(t.qty) || 1;
  // If the product declares coverage per unit (e.g., a 60"x30" slab covering 12.5 SF, or
  // the user's convention of 5 SF per piece), divide the task quantity by that.
  if(p && p.coveragePerUnit){
    return Math.max(1, Math.ceil(raw / p.coveragePerUnit));
  }
  return raw;
}
function selectProduct(taskId, sku, ev){
  if(ev) ev.stopPropagation();
  const t=TASKS.find(x=>x.id===taskId); if(!t) return;
  let prod=productPool(t).find(p=>p.sku===sku);
  if(!prod){
    for(const otherId in cart){
      if(cart[otherId] && cart[otherId].product.sku===sku){ prod=cart[otherId].product; break; }
    }
  }
  if(!prod) return;
  // toggle: if already selected, remove from cart
  if(cart[taskId] && cart[taskId].product.sku===sku){
    delete cart[taskId];
    t.product=null;
    toast(`${prod.brand} ${prod.name} removed from task`);
  } else {
    // Pick up pending qty + unit from the pre-add inputs — either from the
    // flyout (if it's open on this product) or from the shop-product card
    // (per-card ids so each product's own inputs are used).
    let initQty = defaultQty(t, prod);
    let initUnit = prod.unit;
    // Flyout inputs take precedence when the flyout is anchored to this task.
    if(flyState && flyState.taskId===taskId && flyState.sku===sku){
      const qEl = document.getElementById('flyPendingQty');
      const uEl = document.getElementById('flyPendingUnit');
      if(qEl && qEl.value) initQty = Math.max(0.1, parseFloat(qEl.value)||initQty);
      if(uEl && uEl.value) initUnit = uEl.value.trim() || initUnit;
    } else {
      // Fall back to the per-card pending inputs.
      const cardQ = document.getElementById(`shopPendingQty_${taskId}_${sku}`);
      const cardU = document.getElementById(`shopPendingUnit_${taskId}_${sku}`);
      if(cardQ && cardQ.value) initQty = Math.max(0.1, parseFloat(cardQ.value)||initQty);
      if(cardU && cardU.value) initUnit = cardU.value.trim() || initUnit;
    }
    cart[taskId]={product:prod, qty:initQty, unit:initUnit};
    t.product=prod.brand+' '+prod.name;
    t.flags=(t.flags||[]).filter(f=>f!=='missing');
    toast(`${prod.brand} ${prod.name} added to task`);
  }
  if(flyState && flyState.taskId===taskId) flyState.sku=sku;
  renderAll();
  if(flyState) renderFly();
  if(cartOpen) renderCart();
}

function setCartQty(taskId, qty){
  if(!cart[taskId]) return;
  qty=Math.max(0.1, parseFloat(qty)||1);
  cart[taskId].qty=qty;
  renderShop();
  if(flyState) renderFly();
  if(cartOpen) renderCart();
}
function setCartUnit(taskId, unit){
  if(!cart[taskId]) return;
  cart[taskId].unit = (unit||'').trim() || cart[taskId].product.unit;
  renderShop();
  if(flyState) renderFly();
  if(cartOpen) renderCart();
}
/* Resolve the effective unit for a cart line : overridden value or the product default */
function cartUnit(taskId){
  const c = cart[taskId];
  if(!c) return '';
  return c.unit || c.product.unit;
}
const UNIT_SUGGESTIONS = ['each','ea','LF','SF','SY','gal','qt','kit','suite','set','box','pack','pallet','hour','day','bag','roll','sheet'];

/* Adjust the pre-add qty input in the flyaway footer */
function adjPending(delta){
  const el = document.getElementById('flyPendingQty');
  if(!el) return;
  const v = Math.max(0.1, (parseFloat(el.value)||1) + delta);
  el.value = v;
}
/* Adjust a per-card pending qty input in the shop grid (each product card has
   its own pre-add inputs so the user can review qty/unit before Add to task). */
function bumpPendingQty(inputId, delta){
  const el = document.getElementById(inputId);
  if(!el) return;
  const v = Math.max(0.1, (parseFloat(el.value)||1) + delta);
  el.value = v;
}
function bumpCartQty(taskId, delta){
  if(!cart[taskId]) return;
  setCartQty(taskId, (cart[taskId].qty||1)+delta);
}
function removeFromCart(taskId){
  if(!cart[taskId]) return;
  const t=TASKS.find(x=>x.id===taskId);
  delete cart[taskId];
  if(t) t.product=null;
  toast('Removed from task');
  renderAll();
  if(cartOpen) renderCart();
  if(flyState) renderFly();
}

/* ── Over budget detection : line total vs task budget ── */
function lineTotalForTask(taskId){
  const c=cart[taskId]; if(!c) return 0;
  return c.product.price * (c.qty||defaultQty(TASKS.find(x=>x.id===taskId)));
}
function isOverBudget(t, product, qty){
  const budget=dollars(t.cost||0);
  if(!budget) return false;
  const lineQty=qty!=null?qty:(cart[t.id]?cart[t.id].qty:defaultQty(t, product));
  return (product.price * lineQty) > budget;
}

/* ── category mapping (so we can find "same kind of task") ── */
function categoryOf(t){
  const base=(t.name||'').toLowerCase();
  if(/cabinet/.test(base)) return 'cabinet';
  if(/counter|quartz/.test(base)) return 'counter';
  if(/backsplash|tile/.test(base) && !/floor/.test(base)) return 'tile';
  if(/appliance/.test(base)) return 'appliance';
  if(/floor|lvp|carpet|hardwood/.test(base)) return 'floor';
  if(/paint/.test(base)) return 'paint';
  if(/vanity/.test(base)) return 'vanity';
  if(/shower/.test(base)) return 'shower';
  if(/toilet/.test(base)) return 'toilet';
  if(/\bopener\b/.test(base)) return 'mech';
  if(/closet/.test(base)) return 'storage';
  return 'generic';
}
/* products selected for sibling tasks in the same category */
/* ── Kai prefill: auto-select the team-recommended product for each task that needs one ── */
function kaiPrefillAll(){
  const need = tasksNeedingProduct();
  if(!need.length) return;
  if(!confirm(`Let Kai prefill ${need.length} ${need.length===1?'task':'tasks'} with the team-recommended product? You can still change any selection afterwards.`)) return;
  let count = 0;
  need.forEach(t=>{
    const pool = productPool(t);
    // Prefer team-recommended tier, fall back to similar, then any
    const pick = pool.find(p=>p.tier==='team') || pool.find(p=>p.tier==='similar') || pool[0];
    if(!pick) return;
    cart[t.id] = { product: pick, qty: defaultQty(t, pick) };
    t.product = pick.brand + ' ' + pick.name;
    t.flags = (t.flags||[]).filter(f=>f!=='missing');
    count++;
  });
  toast(`Kai prefilled ${count} ${count===1?'task':'tasks'} with recommended products`);
  renderAll();
}

// Flatten the sidebar's grouped task order into a single list — exact
// order the sidebar renders in, so Prev / Next in the Editor tab and
// the sidebar always agree.
function shopNavOrderedTasks(){
  const groups = groupTasks(visibleTasks());
  const out = [];
  groups.forEach(g => g.items.forEach(t => out.push(t)));
  return out;
}
/* ── Editor tab Prev / Next: walk the sidebar in order ─────────────── */
function shopNav(dir){
  const list = shopNavOrderedTasks();
  if(!list.length) return;
  let idx = list.findIndex(t => t.id === selId);
  // Fresh session with no selection: Next → first task, Prev → last.
  if(idx < 0) idx = dir > 0 ? -1 : list.length;
  const nextIdx = idx + dir;
  // Clamp at the ends instead of wrapping — matches the disabled state
  // the buttons show at first / last position, so behaviour agrees with
  // the affordance the user sees.
  if(nextIdx < 0 || nextIdx >= list.length) return;
  const next = list[nextIdx];
  if(!next) return;
  selId = next.id;
  openIds = new Set([next.id]);
  // Auto-expand the group holding the newly-selected task so the row is
  // actually visible in the sidebar (otherwise a collapsed group swallows
  // the highlight — that's the "left panel not highlighting" symptom).
  if(typeof collapsedGrps !== 'undefined' && collapsedGrps){
    const groups = groupTasks(visibleTasks());
    const grp = groups.find(g => g.items.some(t => t.id === next.id));
    if(grp) collapsedGrps.delete(grp.key);
  }
  if(typeof renderAll === 'function') renderAll();
  else { renderSidebar(); renderWork(); }
  // Scroll the sidebar row into view. rAF so the DOM's had a paint tick.
  requestAnimationFrame(() => {
    const row = document.querySelector(`[data-tid="${next.id}"]`);
    if(row) row.scrollIntoView({block:'center', behavior:'smooth'});
  });
}
// True if there's a task before / after selId in the sidebar's flat order.
// Drives the Prev / Next button disabled state so the affordance matches
// the ends of the list instead of gating on tasksNeedingProduct.
function shopNavHasPrev(){
  const list = shopNavOrderedTasks();
  const idx = list.findIndex(t => t.id === selId);
  return idx > 0;
}
function shopNavHasNext(){
  const list = shopNavOrderedTasks();
  const idx = list.findIndex(t => t.id === selId);
  return idx >= 0 && idx < list.length - 1;
}

/* ── photo placeholder svg (reused for shop + drawer) ── */
function svgPhoto(){
  return `<svg viewBox="0 0 24 24" fill="none"><path d="M22.4286 1.4H1.4286V22.4H22.4286V1.4Z" stroke="currentColor" stroke-miterlimit="10"/><path d="M10.2707 9.4132L8.0602 10.7947L5.8497 9.4132V7.2026L8.0602 5.821L10.2707 7.2026V9.4132Z" stroke="currentColor" stroke-miterlimit="10"/><path d="M15.2444 9.1368L11.9286 14.6632L9.1654 13.5579L6.9549 16.8737H18.0075L15.2444 9.1368Z" stroke="currentColor" stroke-miterlimit="10"/></svg>`;
}
function svgChevL(){ return `<svg viewBox="0 0 12 12" fill="none"><path d="M7.5 3L4.5 6l3 3" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/></svg>`; }
function svgChevR(){ return `<svg viewBox="0 0 12 12" fill="none"><path d="M4.5 3l3 3-3 3" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/></svg>`; }

/* ── render Shop right panel ── */
