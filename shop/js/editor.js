function renderShop(){
  const body=document.getElementById('workBody');
  const sel=selId?TASKS.find(t=>t.id===selId):null;
  /* Shop with Kai: a task or room being taken out by a change order sits on
     grey paper, so it never reads as live scope. */
  if(window.__KAI_SHOP && typeof __CO_REMOVED !== 'undefined'){
    const rmGrp = !sel && selGroupKey && groupBy === 'room' && (() => { const it = TASKS.filter(t => t.room === selGroupKey); return it.length && it.every(t => __CO_REMOVED.has(t.id)); })();
    body.classList.toggle('is-co-removed', !!((sel && __CO_REMOVED.has(sel.id)) || rmGrp));
  }
  const need=tasksNeedingProduct();
  // No task, no group — auto-select the first group so the tab lands on
  // the group view by default rather than an empty "pick a task" state.
  // Because renderAll runs renderSidebar BEFORE renderWork, we need to
  // re-render the sidebar here so the newly-selected group picks up
  // its ink accent bar (otherwise it looks unselected on first paint).
  // Scope level wins over the auto-select below: the user asked for the
  // whole scope, so don't quietly drop them into the first group.
  if(!sel && scopeView){
    body.innerHTML = _renderScopePageHtml({taskOnClick: 'selectTask'});
    return;
  }
  // A product line from the Departments view — where its product is picked
  // once for every task in it.
  // ShopwithKai_materials.html: a product type opens on its department's
  // shopping list, that type's card open (materials-page.js). A department
  // itself keeps the group page every view has.
  if(!sel && groupBy === 'dept' && typeof SHOP_MATERIALS !== 'undefined' && SHOP_MATERIALS && selLineKey){
    const dept = selLineKey.split('|')[0];
    if(dept !== NO_PRODUCT_DEPT){ body.innerHTML = _renderMaterialsDeptHtml(dept); return; }
  }
  if(!sel && selLineKey && groupBy === 'dept'){
    body.innerHTML = _renderLinePageHtml();
    return;
  }
  if(!sel && !selGroupKey){
    const groups = (typeof groupTasks === 'function')
      ? groupTasks((typeof visibleTasks === 'function') ? visibleTasks() : TASKS)
      : [];
    if(groups.length){
      selGroupKey = groups[0].key;
      if(collapsedGrps) collapsedGrps.delete(groups[0].key);
      if(typeof renderSidebar === 'function') renderSidebar();
    }
  }
  // Group is selected but no task is — show the shared group page. Task
  // rows route through selectTask so the click lands in this same
  // Editor tab's task-detail card, not the Activity tab.
  if(!sel && selGroupKey){
    body.innerHTML = _renderGroupPageHtml({includeActivity: false, taskOnClick: 'selectTask'});
    return;
  }
  if(!sel){
    // SHOP-EDIT VARIANT empty state — the tab is the primary editing surface
    // now, so the empty copy tells the user how to get INTO it (pick a task
    // from the sidebar) rather than talking about "shopping for products".
    // The old "Select manually / Let Kai prefill" affordances are kept but
    // tucked under a hairline so the primary message stays clean when there's
    // work to do, and disappear entirely when the scope is fully speced.
    const totalCount = TASKS.length;
    const needCount = need.length;
    const needsWorkHtml = needCount ? `
      <div class="shop-empty-aux">
        <div class="shop-empty-aux-lbl">${needCount} of ${totalCount} ${needCount===1?'task still needs':'tasks still need'} a product</div>
        <div class="shop-empty-aux-actions">
          <button class="shop-nav-btn" onclick="shopNav(1)">Jump to first unspec'd task <svg viewBox="0 0 12 12" fill="none"><path d="M4.5 3l3 3-3 3" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
          <button class="shop-cart-btn" onclick="kaiPrefillAll()" style="border-color:var(--ink)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 3l2 5 5 .5-3.8 3.4 1.2 5.1-4.4-2.6-4.4 2.6 1.2-5.1L5 8.5l5-.5z"/></svg> Let Kai prefill all</button>
        </div>
      </div>` : `
      <div class="shop-empty-aux shop-empty-aux-done">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l4 4 10-11"/></svg>
        Every task has a product selected.
      </div>`;
    body.innerHTML=`
      <div class="shop-empty">
        <span class="shop-empty-icon">
          <svg viewBox="0 0 24 24"><path d="M4 5.5h13l-1 4H5z"/><path d="M4 12h13v6H4z"/><path d="M8 8v4"/></svg>
        </span>
        <span class="shop-empty-title">Pick a task to edit</span>
        <span class="shop-empty-desc">Click any task in the sidebar to see its info here — edit the contractor, cost, quantity, or pick a product from the suggested list.</span>
        ${needsWorkHtml}
      </div>`;
    return;
  }
  // Task-position caption for the shop-nav. Leads with the task name so
  // the primary identifier is what you scan first, then room context,
  // then the "N of M" position (tertiary — you know where you are, but
  // you might want to know how far through the group you've gotten).
  const grpArr = TASKS.filter(t => taskGroupKey(t) === taskGroupKey(sel));
  const grpIdx = grpArr.findIndex(t => t.id === sel.id);
  const grpLbl = taskGroupLabel(sel);
  const progress = `<span class="shop-nav-progress"><b>${esc(sel.name)}</b><span class="shop-nav-sep">·</span>${esc(grpLbl)}<span class="shop-nav-sep">·</span>Task <b>${grpIdx + 1}</b> of <b>${grpArr.length}</b></span>`;

  body.innerHTML=`
    <!-- Prev / Next task navigation floats in the top-right of the
         Editor tab, overlaying the content. Replaces the old full-width
         sticky bar with its "Task N of M" caption. -->
    <div class="shop-nav-float">
      <button class="shop-nav-btn" onclick="shopNav(-1)" ${shopNavHasPrev()?'':'disabled'} title="Previous task">${svgChevL()} Previous task</button>
      <button class="shop-nav-btn" onclick="shopNav(1)" ${shopNavHasNext()?'':'disabled'} title="Next task">Next task ${svgChevR()}</button>
    </div>
    <!-- Four peer modules: header, photos, notes, options. They used to
         be one card with photos and description nested inside it. -->
    <div class="shop">
      ${_shopTaskHeaderHtml(sel)}
      ${_shopPhotoSectionHtml(sel)}
      ${_shopEditNotesHtml(sel)}
      ${_shopEditCardHtml(sel)}
      ${_shopTaskActivityHtml(sel)}
    </div>`;
}
/* ── Task header module ──────────────────────────────────────────────
   Level 3 of the same header pattern: scope opens with the scope box, a
   group with the group box, a task with this. Three bands separated by
   hairlines — identity (group · ID over the title, total right), the
   contractor field, then the description. The inner rows are the card's
   original markup, so spacing and widths match what was there before the
   modules were split out; status still joins the contractor row on its own
   at work / closeout. */
function _shopTaskHeaderHtml(t){
  if(!t) return '';
  // Change-tracking is recomputed here rather than passed in, so the module
  // stands alone; all three inputs are globals.
  const isTracking = !!__TASK_ORIGINALS[t.id];
  const wDesc = isTracking ? wasIndicator(t.id,'desc', t.desc) : '';
  const wGc   = isTracking ? wasIndicator(t.id,'gc',   t.gc)   : '';
  const ch = (field, cur) => isTracking && hasChanged(t.id, field, cur) ? ' is-changed' : '';
  // Delete stays discreet up here only when the card's action row isn't
  // already showing one — same rule the original card header used.
  const isApprovedTask = approved.has(t.id);
  // The eyebrow names the group the user actually navigated through, so it
  // follows the sidebar's grouping rather than always reading the room.
  const grpLbl = (typeof taskGroupLabel === 'function') ? taskGroupLabel(t) : (t.room || '—');
  const descSection = (() => {
    /* Collapsed by default: the description is reference material, not the
       thing you came to this card to do, so it costs a click rather than
       vertical space. The expanded flag and its toggle are the pair that
       already backed the old character-count fold. */
    const descText = t.desc || '';
    const isExpanded = _taskDetailsOpen(t);
    const body = descText ? esc(descText) : `<span class="sec-taskcard-desc-empty">No description</span>`;
    return `<div class="sec-taskcard-section sec-taskdesc${isExpanded ? ' is-open' : ''}">
      <button class="sec-taskdesc-hd" type="button" aria-expanded="${isExpanded}"
        onclick="event.stopPropagation();toggleDescExpanded(${t.id})"
        title="${isExpanded ? 'Hide the description' : 'Read the description'}">
        <span class="sec-taskcard-lbl sec-taskdesc-title">Task info</span>
        <svg class="sec-taskdesc-caret" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5l3 3 3-3"/></svg>
      </button>
      ${isExpanded ? `<div class="sec-taskdesc-body">
        <div class="sec-taskdesc-gc">
        <span class="sec-taskcard-lbl">Contractor</span>
        ${hdrDdHtml('ddGc-' + t.id, t.gc || '', [{value:'', label:'Unassigned'}].concat(CONTRACTORS.map(c => ({value:c, label:c}))), 'setTaskContractor(' + t.id + ', __V__);requestSecTaskcardRerender()', (t.gc ? '' : 'is-un') + ch('gc', t.gc))}
        ${wGc}
        ${window.__KAI_SHOP_LAYOUT ? '' : `<span class="sec-taskcard-lbl sec-taskdesc-lbl2">Department</span>
        ${(() => {
          const sug = suggestTaskDept(t);
          const opts = [{value:'', label:`Suggested · ${sug}`}]
            .concat(DEPARTMENTS.map(d => ({value:d, label:d})));
          return hdrDdHtml('ddDept-' + t.id, t.dept || '', opts,
            'setTaskDept(' + t.id + ', __V__);requestSecTaskcardRerender()',
            t.dept ? '' : 'is-suggested');
        })()}`}
        </div>
        <div class="sec-taskdesc-copy"><span class="sec-taskcard-lbl">Description</span><div class="sec-taskcard-desc">${body}</div>${wDesc}</div>
      </div>` : ''}
    </div>`;
  })();
  /* Actions share the contractor's line. Delete sits here in every mode —
     draft included — so the icon has one home instead of moving between this
     line and the chips row above the price depending on stage and state.
     Approve only joins it where there's something to sign off: review and
     closeout, on a task that's actually scoped (a $0 task reads as "Missing
     details" in the sidebar and has nothing to approve yet). */
  // Review and approval both live in the sidebar now. The closeout sign-off
  // was the last one holding a spot in this header — a black Approve button
  // that appeared only at step 7 — and it's gone too, so the header reads and
  // never decides. Change-order approval below is a different decision on a
  // different object and stays.
  const _ckSvg = `<svg viewBox="0 0 24 24"><path d="M5 12l4 4 10-11"/></svg>`;
  // Delete lives in the group row's menu now — it's an odd thing to keep
  // beside a title, and the menu is where you act on a task anyway.
  const _trashBtn = '';
  let _actCls = '', _actBtns = '';
  // Two steps, and the same ink treatment as the task approval beside it.
  const _coOpen = (typeof taskHasOpenChangeOrder === 'function') && taskHasOpenChangeOrder(t);
  const _coConfirming = typeof coApproveConfirmId !== 'undefined' && coApproveConfirmId === t.id;
  // Approving a change order is the job manager's decision, not the field
  // agent's.
  const _coBtn = (!_coOpen || (typeof USER_ROLE !== 'undefined' && USER_ROLE === 'field_agent')) ? ''
    : _coConfirming
      ? `<button class="act cancel" onclick="event.stopPropagation();cancelCoApprove()">Cancel</button>`
        + `<button class="act approve" onclick="event.stopPropagation();confirmCoApprove(${t.id})">${_ckSvg} Confirm approve</button>`
      : `<button class="act approve" onclick="event.stopPropagation();askCoApprove(${t.id})">${_ckSvg} Approve change</button>`;
  const headerActions = `<div class="sec-taskhdr-acts${_actCls}">${_trashBtn}${_coBtn}${_actBtns}</div>`;
  /* Change-order warning, at the very top of the task. It's a statement
     about editing this task, so it leads the first module rather than
     sitting above the options list — which is now the last of four, and
     read as though only option edits carried the consequence.

     One string across every stage that shows it: work (steps 5 and 6) and
     closeout (step 7). The copy used to name a different trigger per mode —
     "the scope has been approved" vs "the closeout has been submitted" —
     but the consequence is identical either way, and naming the fields that
     carry it is more use than naming which gate you passed through. */
  const coApplies = PROJ_MODE === 'work' || PROJ_MODE === 'closeout';
  const _coChanges = coApplies ? _coTaskChanges(t) : [];
  // A task being taken out has no field to diff, but it is a change all the same.
  const _coDraft = _coChanges.length || (typeof __CO_REMOVED !== 'undefined' && __CO_REMOVED.has(t.id));
  const coBannerInner = coApplies ? `<div class="sec-taskcard-co-banner${_coDraft ? ' has-changes' : ''}">
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 1.5L14.5 5v6L8 14.5 1.5 11V5z"/><path d="M8 8v3.5M8 5.2v.2"/></svg>
    <span class="sec-taskcard-co-banner-body">${_coDraft && _coOpen
      ? `<b>Change order is in review.</b> It becomes part of the scope once it's approved.`
      : _coDraft
      ? `<b>Change order is in draft.</b> Submit it for review and approval before it's finalized and shareable to contractors.`
      : `Edits to the contractor, options or products will create a <b>Change Order</b> since the scope is approved.`}</span>
  </div>` : '';
  /* Status chip beside the task name. Every stage shows one, resolved by the
     same function the task rows and the sidebar use — Pending, Reviewed,
     Approved while the scope is being settled, then the work status once it
     is. Previously this was an approved-only chip that appeared at the
     construction stages and nowhere else. */
  const _hdrSt = (typeof _pgdRowStatusMeta === 'function') ? _pgdRowStatusMeta(t) : null;
  const approvedChip = '';
  if(window.__KAI_SHOP && !window.__KAI_SHOP_LAYOUT) return _tkhHtml(t, coBannerInner, _coOpen, _coConfirming, _ckSvg);
  return `<div class="pgd-hdr-box sec-taskhdr">
    ${coBannerInner}
    <div class="sec-taskcard-hdr">
      <div class="sec-taskcard-hdr-l">
        ${window.__KAI_SHOP_LAYOUT ? _taskCrumbsHtml(t) : `<span class="sec-taskcard-eyebrow">${esc(grpLbl)} <span class="sec-taskcard-sep">·</span> ${esc(t.code)}</span>`}
        <div class="sec-taskhdr-title-row">
          <div class="sec-taskcard-title">${esc(t.name)}</div>
      ${(()=>{
        // Task status shares this row (work/closeout only). Same
        // vocabulary + color mapping the sidebar chip uses.
        if(PROJ_MODE !== 'work' && PROJ_MODE !== 'closeout') return '';
        const opts = [
          {key:'not_started', label:'Not started'},
          {key:'in_progress', label:'In progress'},
          {key:'needs_rework', label:'Rework'},
          {key:'complete',    label:'Completed'},
        ];
        let curKey;
        if(t.editRequested)                          curKey = 'needs_rework';
        else if(approved.has(t.id))                  curKey = 'complete';
        else if((t.flags||[]).includes('missing'))   curKey = 'not_started';
        else if(t.status === 'in_review')            curKey = 'needs_rework';
        else if(t.status === 'pending')              curKey = 'not_started';
        else if(STATUS[t.status])                    curKey = t.status;
        else                                         curKey = 'not_started';
        const curCls = STATUS[curKey]?.cls || 's-notstarted';
        return `<div class="sec-taskhdr-status-inline">
            ${hdrDdHtml('ddStatus-' + t.id, curKey, opts.map(o => ({value:o.key, label:o.label})), 'setTaskStatus(' + t.id + ', __V__)', 'is-status ' + curCls)}
        </div>`;
      })()}
        <div class="sec-taskcard-hdr-chips">
          ${isTracking && taskHasSnapshotChanges(t) ? `<button class="sec-taskcard-undo" onclick="event.stopPropagation();undoTaskChanges(${t.id})" title="Revert every field on this task back to the approved snapshot">
            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a4 4 0 1 1 1.2 2.8"/><path d="M3 4v3h3"/></svg>
            Undo changes
          </button>` : ''}
        </div>
        <span class="sec-taskcard-amt-line">
          <span class="sec-taskcard-amt">${esc(t.cost || '$0')}</span>
          ${deltaChipHtml(taskDelta(t))}
        </span>
          ${approvedChip}${typeof _coPillHtml === 'function' ? _coPillHtml(t) : ''}
        </div>
      </div>
    </div>
    ${headerActions}
    ${descSection}
  </div>`;
}

/* ── Task header, Shop with Kai ───────────────────────────────────────
   Where the task sits as two breadcrumbs — scope › room, and scope ›
   department › product type — with its code on the right; the title with
   the total, and, under a change order, a warning mark and what the total
   moved by and from; the contractor with Change; the description on one line
   (more / less); and the actions — Undo change while the change order is a
   draft, Update progress always. */
function _tkhHtml(t, coBannerInner, coOpen, coConfirming, ckSvg){
  const q = v => esc(String(v)).replace(/'/g, "\\'");
  const tl = taskLine(t);
  const lk = _lineKeyArg(`${tl.dept}|${tl.line}`);
  const crumb = parts => parts.map(([lbl, on]) => on
    ? `<button type="button" class="tkh-crumb-a" onclick="${on}">${esc(lbl)}</button>`
    : `<span>${esc(lbl)}</span>`).join('<span class="tkh-crumb-sep" aria-hidden="true">›</span>');
  const removed = typeof __CO_REMOVED !== 'undefined' && __CO_REMOVED.has(t.id);
  const hasCo = (typeof taskHasAnyChangeOrder === 'function') && taskHasAnyChangeOrder(t);
  const draft = (typeof taskHasDraftChangeOrder === 'function') && taskHasDraftChangeOrder(t) && !coOpen;
  const tracked = !!__TASK_ORIGINALS[t.id];
  const was = tracked ? originalTaskCost(t.id) : dollars(t.cost);
  const now = removed ? 0 : dollars(t.cost);
  const delta = tracked ? now - was : 0;
  const fmt2 = v => '$' + Math.abs(v).toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2});
  const isMgr = typeof USER_ROLE === 'undefined' || USER_ROLE !== 'field_agent';
  const open = _taskDetailsOpen(t);
  const desc = t.desc || '';
  const warn = `<svg class="tkh-warn" viewBox="0 0 16 16" aria-label="Change order"><path d="M8 1.8 15 14H1z"/></svg>`;
  const acts = [
    draft ? `<button type="button" class="tkh-btn is-quiet" onclick="event.stopPropagation();undoTaskCo(${t.id})">Undo change</button>` : '',
    (coOpen && isMgr) ? (coConfirming
      ? `<button type="button" class="tkh-btn is-quiet" onclick="event.stopPropagation();cancelCoApprove()">Cancel</button><button type="button" class="tkh-btn" onclick="event.stopPropagation();confirmCoApprove(${t.id})">${ckSvg} Confirm approve</button>`
      : `<button type="button" class="tkh-btn is-quiet" onclick="event.stopPropagation();askCoApprove(${t.id})">${ckSvg} Approve change</button>`) : '',
    `<button type="button" class="tkh-btn" onclick="event.stopPropagation();tkhUpdateProgress(${t.id})">Update progress</button>`,
  ].join('');
  const gcOpts = [{value:'__keep', label:'Change'}, {value:'', label:'Unassigned'}].concat(CONTRACTORS.map(c => ({value:c, label:c})));
  return `<div class="pgd-hdr-box sec-taskhdr tkh${removed ? ' is-removed' : ''}">
    ${coBannerInner}
    <div class="tkh-top">
      <div class="tkh-crumbs">
        <div class="tkh-crumb">${crumb([['Scope', 'selectScope()'], [t.room, `goUpRoom('${q(t.room)}')`]])}<span class="tkh-crumb-sep" aria-hidden="true">›</span></div>
        <div class="tkh-crumb">${crumb([['Scope', 'selectScope()'], [tl.dept, `goUpMaterials('${q(tl.dept)}')`], [tl.line, `goUpMaterials('${q(tl.dept)}','${lk}')`]])}</div>
      </div>
      <span class="tkh-code">${esc(t.code)}</span>
    </div>
    <div class="tkh-title-row">
      <h2 class="tkh-title">${hasCo ? warn : ''}<span>${esc(t.name)}</span></h2>
      <div class="tkh-price">
        <div class="tkh-amt${removed ? ' is-struck' : ''}">${removed ? fmt2(was) : fmt2(now)}</div>
        ${tracked && Math.round(delta * 100) ? `<div class="tkh-delta"><span class="tkh-chg">change: <b>${delta > 0 ? '+' : '−'}${fmt2(delta)}</b></span><span class="tkh-was">was: <s>${fmt2(was)}</s></span></div>` : ''}
      </div>
    </div>
    <div class="tkh-row">
      <span class="tkh-lbl">Contractor</span>
      <span class="tkh-val">${esc(t.gc || 'Unassigned')}</span>
      ${hdrDdHtml('ddGc-' + t.id, '__keep', gcOpts, `tkhSetGc(${t.id}, __V__)`, 'tkh-change')}
    </div>
    <div class="tkh-row tkh-desc-row">
      <span class="tkh-lbl">Description</span>
      <div class="tkh-desc${open ? ' is-open' : ''}">${desc ? `<span class="tkh-desc-t">${esc(desc)}</span>` : '<span class="tkh-none">N/A</span>'}${desc ? ` <button type="button" class="tkh-more" onclick="event.stopPropagation();toggleDescExpanded(${t.id})">${open ? 'less ⌃' : 'more ⌄'}</button>` : ''}</div>
      <div class="tkh-acts">${acts}</div>
    </div>
  </div>`;
}
function tkhSetGc(id, v){
  if(v === '__keep'){ document.querySelectorAll('.sec-hdr-dd.open').forEach(d => d.classList.remove('open')); return; }
  setTaskContractor(id, v);
  if(typeof requestSecTaskcardRerender === 'function') requestSecTaskcardRerender();
}
// Update progress: the task's page on the Progress tab, where photos and the
// work status are posted.
function tkhUpdateProgress(id){
  selId = id;
  if(typeof setWorkMode === 'function') setWorkMode('pano');
}
/* Undo change: the task goes back to the approved scope — a removal taken
   back, its fields and its options' line items as they were. */
function undoTaskCo(id){
  const t = TASKS.find(x => x.id === id); if(!t) return;
  const o = __TASK_ORIGINALS[id];
  if(typeof __CO_REMOVED !== 'undefined') __CO_REMOVED.delete(id);
  if(o && Array.isArray(o.options)){
    o.options.forEach(so => {
      const opt = (t.options || []).find(x => x.id === so.id); if(!opt) return;
      opt.added = so.added;
      (so.products || []).forEach(sp => {
        const p = (opt.products || []).find(x => x.id === sp.id); if(!p) return;
        p.qty = sp.qty; p.parts = sp.parts; p.labor = sp.labor;
      });
    });
  }
  if(typeof pendingChanges !== 'undefined') pendingChanges = pendingChanges.filter(c => c.taskId !== id);
  if(o) undoTaskChanges(id);
  else { if(typeof renderAll === 'function') renderAll(); toast(`${t.name}: change undone`); }
}
/* ── Task activity ───────────────────────────────────────────────────
   The timeline a task has actually been through by this stage. There's no
   event log in the data, so it's derived: each stage adds the entries that
   stage implies, which is why the feed grows as you step through the demo.

   Ranked rather than switched, so an entry is written once with the stage it
   first appears at. Steps 3 and 4 are both PROJ_MODE 'review' and only
   STAGE_ID separates them — same split the approve wording uses. */
function _taskActStageRank(){
  if(typeof PROJ_MODE === 'undefined') return 0;
  if(PROJ_MODE === 'draft') return 0;
  if(PROJ_MODE === 'review') return (typeof STAGE_ID !== 'undefined' && STAGE_ID === 'awaiting-pub') ? 2 : 1;
  if(PROJ_MODE === 'work') return 3;
  if(PROJ_MODE === 'closeout') return 4;
  return 5;
}
function taskActivityFeed(t){
  if(!t) return [];
  const rank = _taskActStageRank();
  // Activity is always attributed to a person. Status changes used to credit
  // the task's contractor, which is a company — and read as "Unassigned" on
  // any task that hadn't got one. The field agents from PHOTO_PEOPLE stand in,
  // picked by task id so different tasks show different people.
  const _agents = (typeof PHOTO_PEOPLE !== 'undefined'
    ? PHOTO_PEOPLE.filter(x => x.role === 'Field Agent').map(x => x.who)
    : []);
  const agent = _agents.length ? _agents[(t.id || 0) % _agents.length] : 'J. Chen';
  const rows = [];
  // `type` is the card's eyebrow — what kind of thing happened. `tone` is
  // separate because it drives the mark's colour, and the two don't line up:
  // an approval and a completion are different types but both read as done.
  // `st` is the plain status name a Task status row lands on. The timeline
  // reads it to write "Marked In Progress" and the from → to line under it;
  // the older consumers still read `label`, so both travel together.
  const at = (minRank, type, label, when, who, tone, st) => {
    if(rank >= minRank) rows.push({type, label, when, who, tone: tone || '', st: st || ''});
  };
  // What the row says this task is. Status entries below are gated on it: a
  // feed that claims a transition the task never made is worse than a short
  // feed, and it contradicts the pill sitting next to it.
  const _ladder = ['Not started', 'In progress', 'Rework', 'Completed', 'Approved'];
  const _metaLbl = (typeof _pgdRowStatusMeta === 'function')
    ? ((_pgdRowStatusMeta(t) || {}).label || '') : '';
  // The row's label when it's a work status. At the review stages it reads
  // Pending or Reviewed — approval words that say nothing about the work — so
  // fall back to the task's own status there, and wherever the resolver
  // isn't in scope.
  const _cur = _ladder.indexOf(_metaLbl) >= 0 ? _metaLbl
    : ({not_started:'Not started', pending:'Not started', in_progress:'In progress',
        in_review:'Rework', complete:'Completed'}[t.status] || '');
  const _reached = lbl => {
    // 'Approved' is the closeout sign-off, which implies everything before it.
    const now = _ladder.indexOf(_cur);
    const want = _ladder.indexOf(lbl);
    if(now < 0 || want < 0) return false;
    return now >= want;
  };
  at(0, 'Event',           'Task created',                 'Jan 6, 2026',  'T. Okafor', 'decision');
  at(1, 'Event',           'Handed off for review',         'Jan 9, 2026',  'T. Okafor', 'decision');
  at(2, 'Approval status', 'Task reviewed',                'Jan 14, 2026', 'S. Patel',  'decision');
  at(3, 'Approval status', 'Task approved',                'Jan 16, 2026', 'T. Okafor', 'decision');
  at(3, 'Task status',     'Status → <b>Not started</b>',  'Jan 20, 2026', agent, '', 'Not started');
  if(_reached('In progress'))
    at(3, 'Task status',   'Status → <b>In progress</b>',  'Feb 3, 2026',  agent, 'progress', 'In progress');
  // Rework only appears on tasks that actually went back — otherwise every
  // task would claim a history it didn't have.
  if(t.editRequested || t.status === 'in_review'){
    at(3, 'Task status',   'Status → <b>Rework</b>', 'Feb 24, 2026', 'S. Patel', 'rework', 'Rework');
  }
  if(_reached('Completed'))
    at(3, 'Task status',   'Status → <b>Completed</b>',    'Mar 12, 2026', agent, 'done', 'Completed');
  // Closeout is signed off one task at a time, so this follows the task
  // rather than the stage.
  if(typeof approved !== 'undefined' && approved.has(t.id))
    at(4, 'Approval status', 'Closeout approved',          'Mar 18, 2026', 'T. Okafor', 'done');
  return rows;
}
/* Newest first. taskActivityFeed builds forward because that's how the
   stages accumulate; the reverse happens here, at the point of display.

   Drawn as a timeline rather than a stack of cards: a dated rail down the
   left, month rules breaking it into spans, and the event itself in two
   lines — what happened, then what changed. The date is a day, not a
   timestamp; the hour was precision the feed doesn't actually have. */
function _taskActOrd(n){
  const t = n % 100;
  if(t >= 11 && t <= 13) return 'th';
  return ({1:'st', 2:'nd', 3:'rd'})[n % 10] || 'th';
}
/* 'Jan 6, 2026' → the pieces the timeline sets separately: the month rule's
   label, the day stamp, and a key to group consecutive rows by. */
function _taskActWhen(when){
  const m = /^([A-Za-z]+)\s+(\d+),\s*(\d{4})$/.exec(String(when || '').trim());
  if(!m) return {month: '', day: String(when || ''), ord: '', key: String(when || '')};
  const [, mon, d, yr] = m;
  return {
    month: `${mon.toUpperCase()} ${yr}`,
    day: `${mon} ${d}`,
    ord: _taskActOrd(+d),
    key: `${mon} ${yr}`
  };
}
/* The mark's colour follows the status the row lands on, not the eyebrow:
   an approval and a completion are different kinds of event and both read
   as done. Rows with no status are the plain events on the rail. */
function _taskActTone(r){
  if(r.tone === 'rework' || r.st === 'Rework') return 'rework';
  if(r.tone === 'progress' || r.st === 'In progress') return 'progress';
  if(r.tone === 'done' || r.st === 'Completed' || r.st === 'Approved') return 'done';
  if(r.st === 'Not started') return 'idle';
  return 'event';
}
/* The feed's status names are sentence case because they're written into a
   "Status → x" sentence elsewhere. On the timeline they're the headline, so
   they're set as titles — and Rework says what it is: work sent back. */
const TASKACT_ST_LABEL = {
  'Not started': 'Not Started',
  'In progress': 'In Progress',
  'Rework': 'Needs Rework',
  'Completed': 'Complete',
  'Approved': 'Approved'
};
const _taskActSt = st => TASKACT_ST_LABEL[st] || st;
function _shopTaskActivityHtml(t){
  if(!t) return '';
  const feed = taskActivityFeed(t);
  const rows = feed.slice().reverse();
  let body;
  if(!rows.length){
    body = `<div class="pgd-photos-empty">No activity yet for this task.</div>`;
  } else {
    // Walking the feed forward gives each status row the one before it, so
    // the second line can say what it moved from. Built here and read back
    // on the reversed pass.
    const prev = {};
    let last = '';
    feed.forEach((r, i) => { if(r.st){ prev[i] = last; last = r.st; } });
    const idxOf = new Map(feed.map((r, i) => [r, i]));
    let month = '';
    const out = [];
    rows.forEach(r => {
      const w = _taskActWhen(r.when);
      if(w.key !== month){
        month = w.key;
        out.push(`<li class="sec-taskact-month"><span>${esc(w.month)}</span></li>`);
      }
      const from = prev[idxOf.get(r)] || '';
      const title = r.st ? `Marked ${esc(_taskActSt(r.st))}` : r.label;
      const sub = r.st
        ? (from ? `${esc(_taskActSt(from))} <i>&rarr;</i> ${esc(_taskActSt(r.st))}` : esc(r.type))
        : esc(r.type);
      out.push(`<li class="sec-taskact-row is-${_taskActTone(r)}">
        <div class="sec-taskact-date">${esc(w.day)}<sup>${w.ord}</sup></div>
        <span class="sec-taskact-mark"></span>
        <div class="sec-taskact-body">
          <div class="sec-taskact-title">${title}</div>
          <div class="sec-taskact-sub">${sub}</div>
        </div>
        <div class="sec-taskact-who">${esc(r.who)}</div>
      </li>`);
    });
    body = `<ol class="sec-taskact-list">${out.join('')}</ol>`;
  }
  return `<div class="pgd-details-sec sec-taskact">
    <div class="pgd-sec-hd">
      <div class="pgd-details-title">Task activity</div>
      <div class="sec-taskact-count">${rows.length} ${rows.length === 1 ? 'event' : 'events'}</div>
    </div>
    ${body}
  </div>`;
}

// Photo strip for a task's detail card — same visual language as the
// group-page strip (pgd-photos / pgd-photo / pgd-photo-fig): 170px tiles,
// no outline, "Group" corner chip on scope photos, date + milestone walk
// label below. Sits at the top of the card, title row carries "Add photos".
function _shopPhotoSectionHtml(t){
  if(!t) return '';
  const taskPhotos = (PHOTOS || []).filter(p => p.kind === 'task' && p.task === t.code);
  const roomGroupPhotos = (PHOTOS || []).filter(p => p.kind === 'group' && p.room === t.room);
  const stripPhotos = [...taskPhotos, ...roomGroupPhotos];
  // Same tile as the group and scope strips (_pgdPhotoFigHtml) — the
  // label names the photo's own context: the room for a group shot,
  // the task for a task shot.
  const photoStrip = stripPhotos.length
    ? `<div class="pgd-photos">${stripPhotos.map((p,i) => _pgdPhotoFigHtml(p, i, p.kind === 'group' ? (t.room || 'Job') : t.name, t.name)).join('')}</div>`
    : `<div class="pgd-photos-empty">No photos yet for this task</div>`;
  return `<div class="pgd-details-sec pgd-mediasec is-sticky">
    <div class="pgd-sec-hd">
      <div class="pgd-media-ctx" aria-hidden="true"><span class="pgd-media-ctx-name">${esc(t.room || '')} › ${esc(t.name)}</span><span class="pgd-media-ctx-amt">${esc(t.cost || '')}</span></div>
      <div class="pgd-details-title">Task Photos${stripPhotos.length ? ` <span class="sec-mod-count is-static">&bull; ${stripPhotos.length} total ${stripPhotos.length === 1 ? 'photo' : 'photos'}</span>` : ''}</div>
      <div class="pgd-sec-hd-r">
        <button class="sec-mod-add" onclick="event.stopPropagation();goToProgressPhotos()" title="View every photo in Progress and add more">View all &amp; add</button>
        <button class="sec-mod-gear" onclick="event.stopPropagation();openPhotoManager('task',${t.id})" title="Manage photos" aria-label="Manage photos"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82A1.65 1.65 0 0 0 3 13.09H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></button>
      </div>
    </div>
    ${photoStrip}
  </div>`;
}

/* ── Task notes module ───────────────────────────────────────────────
   Preview, not a surface: the newest note only. Full history and the
   composer live in the drawer, one highlight link away — the drawer
   already pins a composer to the bottom of its notes tab, so "view" and
   "add" are the same destination.

   Reads the drawer's own data (seeded taskNotes + user-added USER_NOTES)
   rather than the activity feed this module used to pull from. The feed
   was never the place notes were written to, so anything added in the
   drawer never showed up here.

   Sort: USER_NOTES is unshifted on save so it's already newest-first, but
   the seeded pool is chronological ascending and gets sliced from the
   front — hence the reverse, or "most recent" would surface the oldest. */
function _shopEditNotesHtml(t){
  if(!t) return '';
  const seeded = (typeof taskNotes === 'function') ? (taskNotes(t) || []) : [];
  const mine = (typeof USER_NOTES !== 'undefined' && USER_NOTES[t.id]) ? USER_NOTES[t.id] : [];
  const all = [...mine, ...seeded.slice().reverse()];
  const n = all.length;
  const latest = all[0];
  // Link picks up the section title's mono/caps treatment on top of pgd-up's
  // accent highlight, so the two ends of the header row read as a pair.
  // With nothing on file, "view all" promises a drawer that's empty — the
  // only thing to do here is write the first note.
  const linkTitle = latest ? 'Add a note' : 'Add the first note';
  // The count in the title is the way in — see countSuffix below. A separate
  // view-all link beside it stated the same destination twice.
  const addBtn = `<button class="sec-mod-add" onclick="event.stopPropagation();openDrawer(${t.id},'notes')" title="${linkTitle}">${latest ? 'View all &amp; add' : 'Add'}</button>`;
  // Nothing on file: one short row — the title, a word that it's empty, and
  // the way to write the first note.
  if(!latest) return `<div class="pgd-hdr-box sec-tasknotes is-empty">
    <div class="pgd-sec-hd">
      <div class="pgd-details-title">Notes<span class="sec-notes-none">No notes yet</span></div>
      <div class="pgd-sec-hd-r">${addBtn}</div>
    </div>
  </div>`;
  const body = latest
    ? `<div class="shop-notes-card">
        <div class="shop-notes-head">
          <span class="shop-notes-who"><b>${esc(latest.who || 'Someone')}</b>${latest.role ? ` · ${esc(latest.role)}` : ''}</span>
          <span class="shop-notes-time">${esc(latest.when || '')}</span>
        </div>
        <div class="shop-notes-body">${esc(latest.body || '')}</div>
      </div>`
    : `<div class="shop-notes-empty">No notes yet for this task.</div>`;
  // Title names what's actually shown — one note — with the full count
  // trailing it, so the module doesn't imply it's listing everything. With
  // nothing to preview, "most recent" would be a lie, so it falls back.
  const countSuffix = n
    ? ` <span class="sec-mod-count is-static">&bull; ${n} total ${n === 1 ? 'note' : 'notes'}</span>`
    : '';
  const title = `Notes${latest ? countSuffix : ''}`;
  return `<div class="pgd-hdr-box sec-tasknotes">
    <div class="pgd-sec-hd">
      <div class="pgd-details-title">${title}</div>
      <div class="pgd-sec-hd-r">
        ${addBtn}
      </div>
    </div>
    ${body}
  </div>`;
}

// Debounced re-render of the task-detail card — pipes through renderShop
// so the "Was $X" chips + is-changed accents update as the user types.
// rAF-throttled so fast keystrokes don't thrash.
let __secTaskcardRAF = 0;
function requestSecTaskcardRerender(){
  if(__secTaskcardRAF) return;
  __secTaskcardRAF = requestAnimationFrame(() => {
    __secTaskcardRAF = 0;
    // Preserve which field was focused so re-render doesn't yank the caret.
    const active = document.activeElement;
    const isCardField = active && active.closest && active.closest('.sec-taskcard');
    const fieldSel = isCardField ? (active.tagName + (active.className ? '.' + String(active.className).split(/\s+/).filter(c => c.startsWith('sec-taskcard-')).join('.') : '')) : null;
    const selStart = isCardField && 'selectionStart' in active ? active.selectionStart : null;
    const selEnd   = isCardField && 'selectionEnd' in active ? active.selectionEnd : null;
    if(typeof renderShop === 'function') renderShop();
    if(fieldSel){
      const next = document.querySelector('.sec-taskcard ' + fieldSel);
      if(next){
        try{ next.focus(); }catch(_){}
        if(selStart != null && 'setSelectionRange' in next){
          try{ next.setSelectionRange(selStart, selEnd); }catch(_){}
        }
      }
    }
  });
}

/* ── SHOP-EDIT VARIANT: editable task-detail card ─────────────────────
   Sits above the Shop's photo strip and product tiers. All the fields
   that used to be editable in the sidebar's expanded task detail — desc,
   product (Browse), contractor, product cost, quantity, labor rate,
   modifiers — live here now. The sidebar is read-only in this variant;
   this card is the single editing surface. */
/* A product row's quantity, number and unit apart. The box holds only the
   number; the unit goes up in the Qty label, as on the Departments line
   page. A row stated without a unit takes the catalogue's (KraftMaid sells
   by the LF), then its option's. */
function _prodQtySplit(o, p, t){
  const raw = String((p && p.qty) || '').trim();
  const num = (raw.match(/^-?[\d.,]+/) || [''])[0];
  const cat = (t && p && p.sku && typeof productPool === 'function') ? productPool(t).find(x => x.sku === p.sku) : null;
  const unit = raw.slice(num.length).trim() || (cat && cat.unit) || String((o && o.qtyUnit) || '').trim();
  return {num, unit};
}
// Put the unit back on what was typed, so editing the number keeps "LF".
function _prodQtyJoin(v, unit){
  const n = String(v || '').trim();
  return n && unit ? `${n} ${unit}` : n;
}
/* One product row, every field editable — the option card's row, and the
   condensed layout's row while it is being edited. */
function _prodRowFullHtml(t, o, p){
  const hasSku = !!p.sku;
  const thumb = p.image
    ? `<img src="${esc(p.image)}" alt="${esc(p.product||'')}" loading="lazy">`
    : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M4 5.5h13l-1 4H5z"/><path d="M4 12h13v6H4z"/><path d="M8 8v4"/></svg>`;
  // The chip is the control now — see _prodModHtml. It only
  // renders on a picked product, so an unselected option line
  // has nothing to set.
  const prodModsHtml = _prodModHtml(t, o, p);
  const qs = _prodQtySplit(o, p, t);
  return `<div class="sec-taskcard-product-row${hasSku?' is-catalog':''}${productIsPicked(p)?' is-picked':''}" data-prod="${p.id}" ${hasSku?`onclick="openFly(${t.id},'${esc(p.sku)}',event)" title="View product details"`:''}>
    <div class="sec-taskcard-product-thumb">${thumb}</div>
    <div class="sec-taskcard-product-name-block">
      ${p.brand ? `<span class="sec-taskcard-product-brand">${esc(p.brand)}</span>` : ''}
      <span class="sec-taskcard-product-name">${esc(p.product || 'Untitled product')}</span>
      ${p.sku ? `<span class="sec-taskcard-product-sku">SKU ${esc(p.sku)}</span>` : ''}

    </div>
    <div class="sec-taskcard-product-cell">
      <span class="sec-taskcard-lbl">Qty${qs.unit ? ` · ${esc(qs.unit)}` : ''}</span>
      <div class="opt-card-qty-stepper" onclick="event.stopPropagation()">
        <button class="opt-card-qty-btn" onclick="event.stopPropagation();bumpProductQty(${t.id},'${o.id}','${p.id}',-1)" aria-label="Decrease">
          <svg viewBox="0 0 12 12" fill="none"><path d="M3 6h6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
        </button>
        <input class="opt-card-qty-input" value="${esc(qs.num)}" inputmode="decimal" onclick="event.stopPropagation()" oninput="commitOptionProduct(${t.id},'${o.id}','${p.id}','qty',_prodQtyJoin(this.value,'${esc(qs.unit)}'));requestSecTaskcardRerender()">
        <button class="opt-card-qty-btn" onclick="event.stopPropagation();bumpProductQty(${t.id},'${o.id}','${p.id}',+1)" aria-label="Increase">
          <svg viewBox="0 0 12 12" fill="none"><path d="M6 3v6M3 6h6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
        </button>
      </div>
    </div>
    <div class="sec-taskcard-product-cell" onclick="event.stopPropagation()">
      <span class="sec-taskcard-lbl">Parts</span>
      <input class="sec-taskcard-field" value="${esc(p.parts || '')}" placeholder="$0.00" onclick="event.stopPropagation()" oninput="commitOptionProduct(${t.id},'${o.id}','${p.id}','parts',this.value);requestSecTaskcardRerender()">
    </div>
    <div class="sec-taskcard-product-cell" onclick="event.stopPropagation()">
      <span class="sec-taskcard-lbl">Labor</span>
      <input class="sec-taskcard-field" value="${esc(p.labor || '')}" placeholder="$0.00" onclick="event.stopPropagation()" oninput="commitOptionProduct(${t.id},'${o.id}','${p.id}','labor',this.value);requestSecTaskcardRerender()">
    </div>
    <div class="sec-taskcard-product-total">
      <span class="sec-taskcard-product-amt">${esc(_fmtDollars(productLineTotal(p)))}</span>
      ${(typeof productLineDelta === 'function' && typeof deltaChipHtml === 'function') ? deltaChipHtml(productLineDelta(t, o, p)) : ''}
      ${prodModsHtml}
    </div>
    ${p.sku ? supplierPickHtml(offersForSku(p.sku), rowSupplier(p),
      `setProductSupplier(${t.id},'${o.id}','${p.id}','__S__')`, `row:${p.id}`) : ''}
  </div>`;
}
/* ════════ Options, condensed (ShopwithKai_layout.html) ════════
   Read by default, open one option to change it, open one row to edit its
   numbers. Each option is a single line — what it buys, how many, what it
   costs — with anything that needs attention flagged on that line, so a
   closed option never hides a problem. Opening one shows its rows as read
   lines; a row opens to the full editing row. Alternatives nobody picked
   fold into one line, the catalogue search sits open under them, and
   a labour-only option is one row with its amount editable in place. */
const _optOpen = {};    // `${taskId}:${optId}` → true/false; unset = the default
const _altOpen = {};    // `${taskId}:${optId}` → alternatives shown in full
function _optKey(t, o){ return `${t.id}:${o.id}`; }
function _isLaborRow(p){ return !p.sku && /^labou?r$/i.test(String(p.product || '').trim()); }
/* An option wants a decision when it's part of the job and nothing it could
   buy has been bought — no rows at all, or a catalogue with nothing picked. */
function _optNeedsPick(o){
  if(!optionIsAdded(o)) return false;
  const ps = Array.isArray(o.products) ? o.products : [];
  if(!ps.length) return true;
  if(ps.every(_isLaborRow)) return false;
  return !ps.some(p => productIsPicked(p) && !_isLaborRow(p));
}
function _optIsOpen(t, o){
  const k = _optKey(t, o);
  if(k in _optOpen) return _optOpen[k];
  // By default only the first option that needs a decision opens; the rest
  // still carry their flag on the closed line.
  const first = taskOptions(t).find(x => !(_optKey(t, x) in _optOpen) && _optNeedsPick(x));
  return !!first && first.id === o.id && !taskOptions(t).some(x => _optOpen[_optKey(t, x)] === true);
}
function toggleOpt(taskId, optId){
  const t = TASKS.find(x => x.id === taskId); if(!t) return;
  const o = (t.options || []).find(x => x.id === optId); if(!o) return;
  const k = _optKey(t, o), open = !_optIsOpen(t, o);
  // One open at a time: opening this one closes the others on the task.
  if(open) taskOptions(t).forEach(x => { if(x.id !== optId) _optOpen[_optKey(t, x)] = false; });
  _optOpen[k] = open;
  requestSecTaskcardRerender();
}
function toggleOptAlt(key, show){ _altOpen[key] = show; requestSecTaskcardRerender(); }

function _rowStock(p){
  if(!p.sku || typeof offersForSku !== 'function') return null;
  const sup = typeof rowSupplier === 'function' ? rowSupplier(p) : null;
  const offers = offersForSku(p.sku) || [];
  const off = offers.find(x => x.supplier === sup) || offers[0];
  return off ? {sup:(typeof supplierName === 'function' ? supplierName(off.supplier) : off.supplier), stock:off.stock || 'in', price:off.price} : null;
}
const _stockTxt = s => s === 'out' ? 'Out of stock' : s === 'low' ? 'Low stock' : 'In stock';
const _CARET = `<svg viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M3 4.5L6 7.5l3-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const _THUMB = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M4 5.5h13l-1 4H5z"/><path d="M4 12h13v6H4z"/><path d="M8 8v4"/></svg>`;

function _optFlagsHtml(t, o){
  if(!optionIsAdded(o)) return '';
  const ps = Array.isArray(o.products) ? o.products : [];
  const flags = [];
  if(_optNeedsPick(o)) flags.push(['is-warn', 'No product picked']);
  ps.filter(productIsPicked).forEach(p => {
    const st = _rowStock(p);
    if(st && st.stock === 'out') flags.push(['is-warn', 'Out of stock']);
    else if(st && st.stock === 'low') flags.push(['', 'Low stock']);
  });
  const seen = new Set();
  return flags.filter(([, l]) => !seen.has(l) && seen.add(l))
    .map(([c, l]) => `<span class="optc-flag ${c}">${esc(l)}</span>`).join('');
}
/* The line's product, at a glance: its photo when the catalogue has one,
   the product placeholder when it doesn't, and an empty slot for a labour
   option, so every name starts at the same place. */
function _optThumbHtml(t, o){
  const p = optionIsAdded(o) ? (o.products || []).find(x => productIsPicked(x) && !_isLaborRow(x)) : null;
  if(!p) return '<span class="optc-thumb is-blank" aria-hidden="true"></span>';
  const cat = p.sku ? ((typeof productPool === 'function' ? (productPool(t) || []).find(c => c.sku === p.sku) : null)
                      || (typeof catalogFind === 'function' ? catalogFind(p.sku) : null)) : null;
  const img = p.image || (cat && cat.image) || '';
  return `<span class="optc-thumb" aria-hidden="true">${img
    ? `<img src="${esc(img)}" alt="" loading="lazy" onerror="this.replaceWith(document.createRange().createContextualFragment(_THUMB))">`
    : _THUMB}</span>`;
}
/* What the closed line says it buys. */
function _optSummary(t, o){
  if(!optionIsAdded(o)) return 'Not in the job';
  const ps = Array.isArray(o.products) ? o.products : [];
  const picked = ps.filter(productIsPicked);
  if(!picked.length) return ps.length && ps.every(_isLaborRow) ? 'Labor' : '';
  if(picked.every(_isLaborRow)) return 'Labor';
  const goods = picked.filter(p => !_isLaborRow(p));
  const first = goods[0];
  const qs = _prodQtySplit(o, first, t);
  const name = [first.brand, first.product].filter(Boolean).join(' ');
  return `${name}${qs.num ? ` · ${qs.num}${qs.unit ? ' ' + qs.unit : ''}` : ''}${goods.length > 1 ? ` + ${goods.length - 1} more` : ''}${picked.some(_isLaborRow) ? ' + labor' : ''}`;
}
/* Labor-only: one row, the amount editable where it sits. */
function _prodRowLaborHtml(t, o, p){
  const qs = _prodQtySplit(o, p, t);
  const q = parseFloat(qs.num) || 1;
  return `<div class="optc-row is-labor">
    <div class="optc-row-main"><div class="optc-row-name">Labor${q !== 1 ? ` <span class="optc-row-sub-in">× ${esc(qs.num)}${qs.unit ? ' ' + esc(qs.unit) : ''}</span>` : ''}</div></div>
    <span class="optc-mods">${_prodModHtml(t, o, p)}</span>
    <input class="sec-taskcard-field optc-labor-in" value="${esc(p.labor || '')}" placeholder="$0.00" aria-label="Labor amount"
      oninput="commitOptionProduct(${t.id},'${o.id}','${p.id}','labor',this.value);requestSecTaskcardRerender()">
    <div class="optc-row-amt">${esc(_fmtDollars(productLineTotal(p)))}</div>
    <span class="optc-edit is-blank"></span>
  </div>`;
}
function _shopEditCardCondensedHtml(t){
  const opts = taskOptions(t);
  const added = opts.filter(optionIsAdded);
  return `<div class="sec-taskcard optc">
    <div class="sec-taskcard-section">
      <div class="sec-taskcard-options-hdr optc-hdr">
        <span class="sec-taskcard-lbl">Options</span>
        <span class="optc-hdr-sum">${added.length} of ${opts.length} option${opts.length === 1 ? '' : 's'} · ${esc(t.cost || '$0')}</span>
      </div>
      <div class="optc-list">
        ${opts.map(o => {
          const k = _optKey(t, o);
          const open = _optIsOpen(t, o);
          const isAdded = optionIsAdded(o);
          const ps = Array.isArray(o.products) ? o.products : [];
          const picked = ps.filter(productIsPicked);
          const alts = ps.filter(p => !productIsPicked(p) && p.sku);
          // Remove is a quiet trash icon; a removed option keeps "+ Add" to bring it back.
          const toggle = isAdded
            ? `<button type="button" class="optc-trash" onclick="event.stopPropagation();toggleOptionAdded(${t.id},'${o.id}')" title="Remove this option from the job" aria-label="Remove ${esc(o.name || 'option')} from the job"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 4h11M6 4V2.5h4V4M4 4l.7 9.5h6.6L12 4M6.7 6.5v4.5M9.3 6.5v4.5"/></svg></button>`
            : `<button class="opt-card-toggle" onclick="event.stopPropagation();toggleOptionAdded(${t.id},'${o.id}')" title="Add this option to the job">+ Add</button>`;
          const head = `<div class="optc-head" role="button" tabindex="0" aria-expanded="${open}"
              onclick="toggleOpt(${t.id},'${o.id}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();toggleOpt(${t.id},'${o.id}');}">
            <span class="optc-caret${open ? ' is-open' : ''}">${_CARET}</span>
            ${_optThumbHtml(t, o)}
            <span class="optc-name">${esc(o.name || 'Untitled option')}</span>
            ${open ? '' : `<span class="optc-sum">${esc(_optSummary(t, o))}</span>`}
            <span class="optc-flags">${_optFlagsHtml(t, o)}</span>
            ${/* Modifiers stay in reach without opening the option: each picked
                 row's modifier, set or "+ Modifier", is the control itself. */
              isAdded && !open ? `<span class="optc-mods" onclick="event.stopPropagation()">${picked.map(p => _prodModHtml(t, o, p)).join('')}</span>` : ''}
            ${isAdded ? `<span class="optc-total">${esc(o.cost || '$0')}</span>` : ''}
            <span class="optc-act" onclick="event.stopPropagation()">${toggle}</span>
          </div>`;
          if(!open) return `<div class="optc-opt${isAdded ? '' : ' is-unadded'}">${head}</div>`;
          // The option's own thumbnail (in its header, larger now it's open)
          // already shows its first product, so that row doesn't repeat it.
          const headProd = picked.find(p => !_isLaborRow(p));
          const rows = picked.map(p => {
            if(_isLaborRow(p)) return _prodRowLaborHtml(t, o, p);
            // Opening an option opens its products for editing straight away;
            // Done closes the option. The header's thumbnail stands for the
            // first product, so its row doesn't show it again.
            return `<div class="optc-editing${p === headProd ? ' is-head' : ''}">${_prodRowFullHtml(t, o, p)}<div class="optc-editing-ft"><button type="button" class="optc-done" onclick="toggleOpt(${t.id},'${o.id}')">Done</button></div></div>`;
          }).join('');
          // Nothing picked yet: the alternatives are the choice, so they show.
          const altShown = k in _altOpen ? _altOpen[k] : !picked.some(p => !_isLaborRow(p));
          const altLine = alts.length ? (altShown
            ? `<div class="optc-alts-full">${alts.map(p => _prodRowFullHtml(t, o, p)).join('')}
                 <button type="button" class="optc-link" onclick="toggleOptAlt('${k}', false)">Hide alternatives</button></div>`
            : `<button type="button" class="optc-alt" onclick="toggleOptAlt('${k}', true)">
                 <span>${alts.length} alternative${alts.length === 1 ? '' : 's'}</span>
                 <span class="optc-alt-names">${alts.slice(0, 2).map(p => `${esc([p.brand, p.product].filter(Boolean).join(' '))} ${esc(_fmtDollars(_parseDollars(p.parts) || 0))}`).join(' · ')}${alts.length > 2 ? ' · …' : ''}</span>
               </button>`) : '';
          // The catalogue search is always there, no link to open it.
          const add = `<div class="optc-search">${prodSearchHtml(`opt:${t.id}:${o.id}`)}</div>`;
          return `<div class="optc-opt is-open${isAdded ? '' : ' is-unadded'}">${head}
            ${isAdded ? `<div class="optc-body">
              ${rows}
              ${altLine}
              ${add}
            </div>` : ''}
          </div>`;
        }).join('')}
      </div>
    </div>
  </div>`;
}

function _shopEditCardHtml(t){
  if(!t) return '';
  if(window.__KAI_SHOP_LAYOUT) return _shopEditCardCondensedHtml(t);
  const productMuted = /not selected|pending/i.test(t.product||'');
  const qtyParts = parseQty(t.qty);
  // Track-changes: only fires when a snapshot exists — populated at load
  // time when PROJ_MODE === 'closeout' (see the snapshot block above the
  // taskStatus function). Renders a "Was $X" chip next to every field
  // whose current value differs from its snapshot.
  const isTracking = !!__TASK_ORIGINALS[t.id];
  const wDesc  = isTracking ? wasIndicator(t.id,'desc',   t.desc)    : '';
  const wProd  = isTracking ? wasIndicator(t.id,'product',t.product) : '';
  const wGc    = isTracking ? wasIndicator(t.id,'gc',     t.gc)      : '';
  const wCost  = isTracking ? wasIndicator(t.id,'pcost',  t.pcost)   : '';
  const wQty   = isTracking ? wasIndicator(t.id,'qty',    t.qty)     : '';
  const wRate  = isTracking ? wasIndicator(t.id,'rate',   t.rate)    : '';
  const ch = (field, cur) => isTracking && hasChanged(t.id, field, cur) ? ' is-changed' : '';
  return `<div class="sec-taskcard">
    <div class="sec-taskcard-section">
      <div class="sec-taskcard-options-hdr">
        <span class="sec-taskcard-lbl">Options</span>
      </div>
      <div class="sec-taskcard-options">
        ${taskOptions(t).map((o, i) => {
          const isPrimary = i === 0;
          const eyebrow = o.description || (o.name || '').toUpperCase();
          // Delta indicator: green when this option's cost has changed from
          // the snapshot (primary only — non-primary options have no
          // snapshot yet, so treat as baseline).
          const primaryChanged = isPrimary && isTracking && hasChanged(t.id, 'cost', t.cost);
          const changedCls = primaryChanged ? ' is-changed' : '';
          const totalCls   = primaryChanged ? '' : ' is-baseline';
          const products = Array.isArray(o.products) ? o.products : [];
          // Every stage offers the toggle: the scope gets built in draft and
          // amended afterwards, and an amendment is exactly what the change-
          // order banner at the top of the task is warning about.
          const optAdded = optionIsAdded(o);
          const optToggle = `<button class="opt-card-toggle${optAdded ? ' is-on' : ''}" onclick="event.stopPropagation();toggleOptionAdded(${t.id},'${o.id}')" title="${optAdded ? 'Remove this option from the job' : 'Add this option to the job'}">${optAdded ? 'Remove' : '+ Add'}</button>`;
          return `<div class="opt-card${changedCls}${isPrimary?'':' is-extra'}${optAdded ? '' : ' is-unadded'}">
            <div class="opt-card-body">
              <div class="opt-card-name-row">
                <div class="opt-card-name">${esc(o.name || 'Untitled option')}</div>
                ${optAdded ? `<div class="opt-card-total${totalCls}">${esc(o.cost || '$0')}</div>` : ''}
                <div class="opt-card-menu">
                  ${optToggle}
                </div>
              </div>
              ${optAdded ? `<div class="sec-taskcard-products">
                ${products.map(p => _prodRowFullHtml(t, o, p)).join('') || `<div class="sec-taskcard-product-empty">No products for this option.</div>`}
              </div>
              ${prodSearchHtml(`opt:${t.id}:${o.id}`)}` : ''}
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>
  </div>`;
}

/* ── Synthesize rich detail content from a product (placeholder copy,
   shaped like a real Home Depot listing). In production this comes from
   the supplier feed. ── */
function productDetail(p, t){
  const cat=categoryOf(t);
  const unitWord=p.unit==='ea'?'unit':p.unit==='LF'?'linear foot':p.unit==='SF'?'square foot':p.unit==='gal'?'gallon':p.unit==='SY'?'square yard':p.unit;
  const aboutBy={
    cabinet:`The ${p.brand} ${p.name} is a soft-close stock cabinet line designed for fast lead times and predictable install. Frame is plywood, doors are solid maple with a ${p.name.toLowerCase().includes('shaker')?'shaker':'flat'} profile. Sized per ${p.unit}; price is per ${unitWord} installed.`,
    counter:`${p.name} is a quartz slab engineered for high-traffic kitchens. Non-porous surface resists stains and bacteria; templated to your space and fabricated with a standard 1.25" edge profile. Includes one undermount cutout per slab.`,
    tile:`${p.brand} ${p.name} is a glazed wall tile suitable for kitchen backsplashes and dry-area wall installations. Rectified edges allow tight grout joints. Sold per ${unitWord}; coverage assumes 10% waste factor.`,
    appliance:`${p.brand} ${p.name} is a coordinated appliance suite in a stainless finish. Standard counter-depth dimensions. Includes manufacturer warranty and white-glove delivery on most metros.`,
    floor:`${p.brand} ${p.name} is a luxury vinyl plank with a wear layer rated for residential and light commercial use. Click-lock install over an approved underlayment.`,
    paint:`${p.brand} ${p.name} is a self-priming interior latex paint. Low-VOC formula. One gallon covers approximately 350-400 SF on smooth walls; two coats recommended over previously painted surfaces.`,
    vanity:`${p.brand} ${p.name} is a freestanding bathroom vanity with a pre-cut top and pre-drilled holes for a standard 8" widespread faucet. Soft-close drawers and doors. Faucet sold separately.`,
    shower:`${p.brand} ${p.name} is a porcelain tile for shower walls and floors. Mosaic floor tiles are sheet-mounted for slope-friendly installation; large-format wall tiles require a notched trowel and back-buttering for full coverage.`,
    toilet:`${p.brand} ${p.name} is a comfort-height elongated toilet with a 1.28 GPF flush. Includes tank, bowl, hardware, and wax ring. Seat sold separately.`,
    mech:`${p.brand} ${p.name} is a smart, app-enabled garage door opener with battery backup and motion-activated lighting. Compatible with standard 7' single and double doors.`,
    storage:`${p.brand} ${p.name} is a wire shelving kit that adjusts to most reach-in closets. Includes tracks, brackets, shelves, and a hanging rod.`,
    generic:`${p.brand} ${p.name} is the supplier's standard SKU for this scope item. Info copy loads from the catalog feed when wired.`,
  };
  const highlightsBy={
    cabinet:[
      'Plywood box, solid maple door',
      'Soft-close hinges and drawer glides included',
      'Toe-kick and matching filler strips sized to job',
      'Lead time 2-3 weeks from order confirmation',
      'Includes manufacturer 5-year limited warranty',
    ],
    counter:[
      'Non-porous quartz, no sealing required',
      'Standard 1.25" eased edge profile',
      'Templated and fabricated to job site dimensions',
      'Includes one undermount sink cutout per slab',
      'Stain and scratch resistant',
    ],
    tile:[
      'Glazed ceramic, rectified edges',
      'Suitable for residential walls in wet areas',
      'Sold per square foot with 10% waste factored',
      'Color-matched grout and silicone available',
      'Made in USA',
    ],
    appliance:[
      'ENERGY STAR rated where applicable',
      'Counter-depth fit for most kitchens',
      'Stainless steel finish with fingerprint-resistant coating',
      'Includes white-glove delivery on most metros',
      'Manufacturer 1-year limited warranty',
    ],
    floor:[
      'Luxury vinyl plank with attached underlayment',
      'Waterproof core, suitable for kitchens and baths',
      'Click-lock installation, no glue required',
      'Low-VOC, FloorScore certified',
      'Residential lifetime / light commercial 10-year warranty',
    ],
    paint:[
      'Self-priming on most previously painted surfaces',
      'Low-VOC, low-odor formula',
      'Satin sheen, scrubbable',
      'Coverage 350-400 SF per gallon',
      'Two coats recommended',
    ],
    vanity:[
      'Soft-close drawers and doors',
      'Pre-installed quartz or marble-look top',
      'Pre-drilled for 8" widespread faucet (sold separately)',
      'Hardware included',
      'Standard plumbing rough-in dimensions',
    ],
    shower:[
      'Porcelain, suitable for wet-area floors and walls',
      'Slip-rated for shower floors',
      'Trim and Schluter edge profiles sold separately',
      'Compatible with standard liquid waterproofing membranes',
      'Made in USA / Italy depending on series',
    ],
    toilet:[
      'Comfort-height elongated bowl',
      '1.28 GPF WaterSense certified',
      'Includes tank, bowl, wax ring, hardware',
      'Seat sold separately',
      'Manufacturer 5-year limited warranty on porcelain',
    ],
    mech:[
      'App-enabled with iOS and Android support',
      'Battery backup for power outages',
      'Motion-activated LED lighting on motor head',
      'Compatible with 7\' single and double doors',
      'Compatible with most existing rails',
    ],
    storage:[
      'Adjustable wire shelving with tracks',
      'Closet rod for hanging clothes',
      'Sized for closets 5-8 ft wide',
      'White vinyl-coated steel',
      'Hardware included',
    ],
    generic:[
      'Supplier-spec catalog item',
      'Sold per ' + p.unit,
      'Lead time per supplier feed',
    ],
  };
  const includesBy={
    cabinet:'(1) cabinet box per LF, (2) doors per LF (where applicable), soft-close hardware, toe-kick strip, mounting screws',
    counter:'Templated and fabricated quartz slab(s), one undermount sink cutout, standard 1.25" edge, install hardware',
    tile:'Tile boxes sized to job SF (10% waste factored), separately sold grout and edge trim',
    appliance:'(1) Range, (1) Over-the-range microwave, (1) Dishwasher, (1) Counter-depth refrigerator',
    floor:'Planks sized to job SF, attached underlayment, transition strips ordered separately',
    paint:'(1) Gallon per ' + p.unit + ', tinted to color, two-coat coverage',
    vanity:'(1) Vanity cabinet, (1) Pre-cut top with backsplash, hardware, mounting brackets',
    shower:'Tile sized to job SF (10% waste factored), no trim or membrane',
    toilet:'(1) Tank, (1) Bowl, (1) Wax ring, (1) Set of hardware. Seat sold separately',
    mech:'(1) Motor, (1) Rail kit, (1) Remote, (1) Keypad, (1) Wall control, (1) Smart hub',
    storage:'(1) Track set, brackets, wire shelves, closet rod, mounting hardware',
    generic:'(1) Unit per ' + p.unit,
  };
  const specsBy={
    cabinet:{Material:'Plywood box / maple door',Finish:p.name.includes('White')?'White satin':'See catalog',Hinges:'Concealed, soft-close',Box:'Plywood, 3/4"',Door:'Solid maple',Warranty:'5-year limited'},
    counter:{Material:'Quartz composite',Thickness:'2cm slab + buildup edge',Edge:'1.25" eased',Finish:'Polished',Origin:'Imported',Warranty:'15-year limited'},
    tile:{Material:'Glazed ceramic',Size:'3" × 6"',Finish:p.name.includes('Matte')?'Matte':'Glossy',Edge:'Rectified',Color:p.name.split(' ').find(w=>/white|black|grey|gray/i.test(w))||'Per catalog',Coverage:'~12 SF per box'},
    appliance:{Finish:'Stainless steel',Style:'Counter-depth',Depth:'25"',Energy:'ENERGY STAR',Warranty:'1 year / 5 year sealed system',Delivery:'White-glove included'},
    floor:{Material:'Luxury vinyl plank',Wear:'20 mil',Width:'7" - 9"',Length:'48" - 60"',Install:'Click-lock floating',Warranty:'Lifetime residential'},
    paint:{Sheen:'Satin',Coverage:'350-400 SF / gal',Coats:'2 recommended',VOC:'<50 g/L',Cleanup:'Water',Container:'1 gallon'},
    vanity:{Material:'Solid wood frame, MDF panels',Finish:p.name.split(' ').slice(-2).join(' '),Top:'Pre-cut quartz',Drawers:'Soft-close',Faucet:'Sold separately',Plumbing:'Standard rough-in'},
    shower:{Material:'Porcelain',Size:'Per catalog',Finish:p.name.includes('Honed')?'Honed':'Polished',Slip:'Suitable for shower floors',Edge:'Rectified',Origin:'Imported'},
    toilet:{Style:'Elongated',Height:'Comfort (17")',Flush:'1.28 GPF',Color:'White',Includes:'Tank, bowl, hardware',Seat:'Sold separately'},
    mech:{Drive:'Belt drive',Power:'¾ HP',Connectivity:'Wi-Fi + Bluetooth',Battery:'Backup included',Compatibility:'Standard 7\' doors',Warranty:'Motor lifetime'},
    storage:{Material:'Vinyl-coated steel wire',Color:'White',Size:'5-8 ft adjustable',Includes:'Tracks, brackets, rod',Install:'Wall-mount, no track required at floor'},
    generic:{Unit:p.unit,'Brand':p.brand,'SKU':p.sku},
  };
  // Per-SKU override: real product records can carry their own detail copy.
  return {
    about: p.about || aboutBy[cat] || aboutBy.generic,
    highlights: p.highlights || highlightsBy[cat] || highlightsBy.generic,
    includes: p.includes || includesBy[cat] || includesBy.generic,
    specs: p.specs || specsBy[cat] || specsBy.generic,
  };
}

/* ── Product detail flyaway ── */
let flyState=null; // { taskId, sku }
// Swap the hero image when a thumbnail in the fly-thumbs strip is clicked.
function setFlyPhoto(btn, url){
  const img = document.getElementById('flyHeroImg');
  if(img){ img.src = url; img.style.opacity = 1; }
  const strip = btn.parentElement;
  if(strip){ strip.querySelectorAll('.fly-thumb').forEach(b => b.classList.toggle('active', b === btn)); }
}
// Build the thumbnail strip HTML — pulled out of the flyout template so nested
// backtick literals don't collide with each other during string interpolation.
// Uses plain concatenation (no template literals) so the html is always well-formed.
function flyThumbStrip(p){
  if(!p.photos || p.photos.length < 2) return '';
  const rest = p.photos.filter(function(u){ return u !== p.image; });
  if(!rest.length) return '';
  var out = '<div class="fly-thumbs">';
  for(var i = 0; i < rest.length; i++){
    var u = rest[i];
    out += '<button class="fly-thumb" onclick="setFlyPhoto(this,\'' + u + '\')" title="' + u + '"><img src="' + u + '" loading="lazy"></button>';
  }
  out += '</div>';
  return out;
}
function openFly(taskId, sku, ev){
  if(ev) ev.stopPropagation();
  flyState={taskId, sku};
  renderFly();
  document.getElementById('fly-scrim').classList.add('open');
  document.getElementById('fly').classList.add('open');
}
function closeFly(){
  flyState=null;
  document.getElementById('fly-scrim').classList.remove('open');
  document.getElementById('fly').classList.remove('open');
}

/* ── Cart drawer ── */
let cartOpen=false;
function openCart(){
  cartOpen=true;
  renderCart();
  document.getElementById('cart-scrim').classList.add('open');
  document.getElementById('cart').classList.add('open');
}
function closeCart(){
  cartOpen=false;
  document.getElementById('cart-scrim').classList.remove('open');
  document.getElementById('cart').classList.remove('open');
}
function gotoTaskFromCart(taskId){
  const t=TASKS.find(x=>x.id===taskId); if(!t) return;
  selId=t.id;
  openIds.add(t.id);
  closeCart();
  renderSidebar(); renderWork();
  const row=document.querySelector(`[data-tid="${t.id}"]`);
  if(row) row.scrollIntoView({block:'center', behavior:'smooth'});
}

/* The header's quantity says it's the line's total — "140 SF total",
   "8 scoped in total" — since each task row below carries its own. A line
   whose units don't add up falls back to its task count. */
function _lineHdrNeed(l, isLabor){
  const n = l.items.length;
  if(isLabor) return `${n} ${n === 1 ? 'task' : 'tasks'}`;
  const need = deptLineNeed(l.items);
  if(/ tasks?$/.test(need)) return need;
  if(n === 1) return need;
  return / scoped$/.test(need) ? `${need} in total` : `${need} total`;
}
/* ── Product line page (Departments view) ───────────────────────────
   Opened from a product line in the sidebar. The tasks lead, each with its
   own quantity and a dropdown for its own product. Under them, the line's
   catalogue section, where Apply puts a product on every task — the common
   case, one toilet for both bathrooms, is one press; the odd one out is
   then changed from its row. */
/* A product line's photos: every photo of the tasks in it, the same reel
   the task and room pages carry — pinned under the tabs while the page
   scrolls, a compact bar with the line's name and figure once it is. */
function _linePhotoSectionHtml(l, amt){
  const codes = new Set(l.items.map(t => t.code));
  const photos = (typeof PHOTOS !== 'undefined' ? PHOTOS : []).filter(p => p.kind === 'task' && codes.has(p.task));
  const strip = photos.length
    ? `<div class="pgd-photos">${photos.map((p, i) => _pgdPhotoFigHtml(p, i, null, null)).join('')}</div>`
    : `<div class="pgd-photos-empty">No photos yet for the tasks in this line</div>`;
  return `<div class="pgd-details-sec pgd-mediasec is-sticky">
    <div class="pgd-sec-hd">
      <div class="pgd-media-ctx" aria-hidden="true"><span class="pgd-media-ctx-name">${esc(l.name)}</span><span class="pgd-media-ctx-amt">${esc(amt)}</span><span class="pgd-media-ctx-n">${l.items.length} ${l.items.length === 1 ? 'task' : 'tasks'}</span></div>
      <div class="pgd-details-title">Task Photos <span class="sec-mod-count is-static">(${l.items.length} ${l.items.length === 1 ? 'task' : 'tasks'} - ${photos.length} ${photos.length === 1 ? 'photo' : 'photos'})</span></div>
      <div class="pgd-sec-hd-r">
        <button class="sec-mod-add" onclick="event.stopPropagation();goToProgressPhotos()" title="View every photo in Progress and add more">View all &amp; add</button>
      </div>
    </div>
    ${strip}
  </div>`;
}
/* ════════ Product line, condensed (ShopwithKai_layout.html) ════════
   The page is one decision — which product these tasks get — so it reads as
   one card: the chosen product with its price and supplier, the tasks it goes
   on with their quantities and costs, and the total. The product isn't
   repeated per task while every task shares it; a task that needs another
   says "Change" for its own dropdown, and tasks that already differ show
   theirs. Alternatives fold into one line (open when nothing is chosen),
   and the catalogue search sits behind "+ Search the catalog". */
const _lnpAltOpen = {};   // line key → alternatives shown
const _lnpChange = {};    // task id → its own product dropdown shown
const _lnpEdit = {};      // task id → its row opened for editing
function lnpToggle(map, key, show){ ({alt:_lnpAltOpen, change:_lnpChange, edit:_lnpEdit})[map][key] = show; if(typeof renderShop === 'function') renderShop(); }
function _lnpOffer(l, cat){
  const offers = (typeof catalogOffers === 'function') ? catalogOffers(Object.assign({section:(catalogFind(cat.sku) || {}).section}, cat)) : [];
  const sup = lineSupplierFor(l, cat.sku);
  return {offers, sup, offer:offers.find(o => o.supplier === sup) || offers[0] || {price:cat.price, stock:cat.stock}};
}
const _LNP_THUMB = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M4 5.5h13l-1 4H5z"/><path d="M4 12h13v6H4z"/><path d="M8 8v4"/></svg>`;
/* ShopwithKai_layout: a task's eyebrow is two breadcrumbs, each a way up —
   where it is (room · its code), and what it buys (department › product
   type). */
function _taskCrumbsHtml(t){
  const tl = taskLine(t);
  const lk = _lineKeyArg(`${tl.dept}|${tl.line}`);
  const q = v => esc(String(v)).replace(/'/g, "\\'");
  return `<span class="sec-taskcard-eyebrow task-crumbs">
    <span class="page-kind">Task</span>
    <nav class="task-crumb" aria-label="Room">
      <button type="button" class="task-crumb-a" onclick="goUpRoom('${q(t.room)}')" title="Open ${esc(t.room)}">${esc(t.room)}</button>
      <span class="sec-taskcard-sep" aria-hidden="true">·</span><span>${esc(t.code)}</span>
    </nav>
    <span class="task-crumbs-div" aria-hidden="true"></span>
    <span class="page-kind">Product type</span>
    <nav class="task-crumb" aria-label="Product type">
      <button type="button" class="task-crumb-a" onclick="goUpMaterials('${q(tl.dept)}')" title="Open ${esc(tl.dept)} under Materials">${esc(tl.dept)}</button>
      <span class="sec-taskcard-sep" aria-hidden="true">›</span>
      <button type="button" class="task-crumb-a" onclick="goUpMaterials('${q(tl.dept)}','${lk}')" title="Open ${esc(tl.line)}">${esc(tl.line)}</button>
    </nav>
  </span>`;
}
// Up to the task's room, under All.
function goUpRoom(room){
  if(groupBy !== 'room') setGroupBy('room');
  selLineKey = null; selId = null;
  selectGroup(room);
  if(workMode !== 'shop') setWorkMode('shop');
  if(typeof renderAll === 'function') renderAll();
}
/* Up the Materials tree from a task: its department, or its product type
   (key). Switches the scope list to Materials so the sidebar shows where. */
function goUpMaterials(dept, key){
  if(groupBy !== 'dept') setGroupBy('dept');
  if(key) selectLine(key); else { selLineKey = null; selId = null; selectGroup(dept); }
  if(workMode !== 'shop') setWorkMode('shop');
  if(typeof renderAll === 'function') renderAll();
}
/* The tasks at a glance, in the header card: each with its product, quantity
   and cost, read-only. Clicking it goes down to the chosen products, where
   each task's product and quantity are edited. */
function _lnpTaskSummaryHtml(l){
  // One row per task and product: a task buying two products gets two rows,
  // its name on the first, so each quantity is one product's.
  const fmtQ = v => (Math.round(v * 100) / 100).toLocaleString('en-US');
  const row = (t, first, prod, qty, amt, none) => `<span class="lnps-row${first ? '' : ' is-cont'}">
      <span class="lnps-task">${first ? `<span class="task-ctx">${esc(t.room)} ›</span> ${esc(t.name)}` : ''}</span>
      <span class="lnps-prod${none ? ' is-none' : ''}">${esc(prod)}</span>
      <span class="lnps-qty">${qty}</span>
      <span class="lnps-amt">${money(Math.round(amt))}</span>
    </span>`;
  const rows = l.items.map(t => {
    const pk = _lineTaskPicked(l, t);
    if(!pk.length) return row(t, true, 'No product yet', '—', taskLineCost(l, t), true);
    if(pk.length === 1) return row(t, true, [pk[0].p.brand, pk[0].p.product].filter(Boolean).join(' '), fmtQ(_num(pk[0].p.qty)), taskLineCost(l, t));
    return pk.map((h, i) => row(t, i === 0, [h.p.brand, h.p.product].filter(Boolean).join(' '),
      fmtQ(_num(h.p.qty)), _num(h.p.qty) * _parseDollars(h.p.parts))).join('');
  }).join('');
  return `<button type="button" class="lnps" onclick="lnpJumpToProducts()" title="Edit each task's product and quantity">
    <span class="lnps-head"><span>Task</span><span>Product</span><span>Qty</span><span>Cost</span></span>${rows}
    <span class="lnps-edit">Edit products and quantities ↓</span>
  </button>`;
}
function lnpJumpToProducts(){
  const el = document.getElementById('lnpProducts');
  const wb = document.getElementById('workBody');
  if(!el || !wb) return;
  // Clear of the photo bar that sticks at the top once scrolled.
  const top = wb.scrollTop + el.getBoundingClientRect().top - wb.getBoundingClientRect().top - 175;
  wb.scrollTo({top, behavior:'smooth'});
  setTimeout(() => { if(Math.abs(wb.scrollTop - top) > 4) wb.scrollTo({top, behavior:'instant'}); }, 450);
  el.classList.remove('is-flash'); void el.offsetWidth; el.classList.add('is-flash');
}
function _lnpCondensedHtml(l, c){
  const {k, n, qtys, sharedUnit, pool, needSum, boxSum, status, statusCls, svgMinus, svgPlus, anyPicked} = c;
  const lk = esc(l.key).replace(/'/g, "\\'");
  const picked = deptLinePicked(l);
  // Every product the line buys, in the order its tasks carry them — a line
  // can buy more than one; each is added or removed on its own.
  const added = [...new Set(l.items.flatMap(t => _lineTaskPicked(l, t).map(h => h.p.sku)))]
    .map(s => pool.find(x => x.sku === s) || (typeof catalogFind === 'function' ? catalogFind(s) : null)).filter(Boolean);
  const cat = picked.state === 'one' ? added[0] || null : null;
  const sku = cat ? cat.sku : null;
  const mixed = picked.state === 'mixed';
  const fmtN = v => (Math.round(v * 100) / 100).toLocaleString('en-US');
  const stockTxt = st => st === 'out' ? 'Out of stock' : st === 'low' ? 'Low stock' : 'In stock';
  /* Chosen products as one table: the total on top, one column header, then
     each product as a group — product on the left (pencil to change it,
     trash to take it off), the tasks it goes on beside it, where it's bought
     under both. Groups keep the order of the line's tasks, so taking a
     product off leaves its tasks where they were, under "No product yet". */
  const trashSvg = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 4h11M6 4V2.5h4V4M4 4l.7 9.5h6.6L12 4M6.7 6.5v4.5M9.3 6.5v4.5"/></svg>`;
  const penSvg = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.8 2.7l2.5 2.5L5.6 12.9l-3.1.6.6-3.1z"/><path d="M9.3 4.2l2.5 2.5"/></svg>`;
  const qtyOf = (t, sku) => _lineTaskPicked(l, t).filter(h => h.p.sku === sku).reduce((a, h) => a + _num(h.p.qty), 0);
  const costOf = (t, sku) => _lineTaskPicked(l, t).filter(h => h.p.sku === sku).reduce((a, h) => a + _num(h.p.qty) * _parseDollars(h.p.parts), 0);
  /* A row is one option of one task — where the product actually sits (the
     task's Editor page picks products inside an option) — named Group ›
     Task › Option. h: that option's product row. */
  const taskRow = (t, sku, h) => {
    const q = qtys.get(t.id);
    const pk = _lineTaskPicked(l, t);
    const qNum = h ? fmtN(_num(h.p.qty)) : q.num;
    const amt = h ? _num(h.p.qty) * _parseDollars(h.p.parts) : taskLineCost(l, t);
    const skuArg = h ? `,'${esc(sku)}','${esc(h.o.id)}'` : '';
    const o = h ? h.o : (typeof _lineOption === 'function' ? _lineOption(t) : null);
    const optName = o ? (o.name || 'Option') : '';
    const mods = new Set([...(t.mods || []), ...pk.flatMap(h => h.p.mods || [])]);
    return `<div class="lnpg-task">
      <span class="lnpt-task">
        <button class="lnpc-task-name" onclick="selectTask(${t.id})" title="Open ${esc(t.name)}"><span class="task-ctx">${esc(t.room)} ›</span> ${esc(t.name)}</button>
        ${optName ? `<span class="lnpg-opt" title="${esc(optName)}"><span class="task-ctx">›</span> ${esc(optName)}</span>` : ''}
        ${[...mods].map(m => `<span class="optc-flag">${esc(typeof tagInfo === 'function' ? tagInfo(m).label : m)}</span>`).join('')}
      </span>
      <span class="lnpt-qty">
        <span class="opt-card-qty-stepper lnpt-step">
          <button class="opt-card-qty-btn" onclick="bumpLineTaskQty('${k}',${t.id},-1${skuArg})" aria-label="One fewer for this task">${svgMinus}</button>
          <input class="opt-card-qty-input" value="${esc(qNum || '—')}" readonly tabindex="-1">
          <button class="opt-card-qty-btn" onclick="bumpLineTaskQty('${k}',${t.id},+1${skuArg})" aria-label="One more for this task">${svgPlus}</button>
        </span>
      </span>
      <span class="lnpc-task-amt">${money(Math.round(amt))}</span>
    </div>`;
  };
  // The pencil: a short menu of the line's other products. On a product it
  // swaps that product on every task beside it; on "No product yet" it puts
  // the pick on those tasks.
  const penMenu = (choices, act, label, head) => `<details class="lnpg-pen">
      <summary title="${esc(label)}" aria-label="${esc(label)}">${penSvg}</summary>
      <div class="lnpg-pen-menu"><div class="lnpg-pen-hd">${esc(head)}</div>${choices.map(x => `<button type="button" onclick="${act.replace('__V__', esc(x.sku))}"><span class="lnpc-brand">${esc(x.brand || '')}</span>${esc(x.name)}</button>`).join('') || '<span class="lnpg-pen-none">No other products</span>'}</div>
    </details>`;
  // Groups in the order the line's tasks first reach them; '' is no product.
  const order = [];
  l.items.forEach(t => {
    const pk = _lineTaskPicked(l, t);
    (pk.length ? [...new Set(pk.map(h => h.p.sku))] : ['']).forEach(sku => { if(!order.includes(sku)) order.push(sku); });
  });
  const groups = order.map(sku => {
    if(!sku){
      const bare = l.items.filter(t => !_lineTaskPicked(l, t).length);
      const ids = bare.map(t => t.id).join(',');
      return `<div class="lnpg is-bare">
        <div class="lnpg-body">
          <div class="lnpg-prod">
            <span class="lnpg-prod-l is-none"><span class="lnpc-thumb is-sm">${_LNP_THUMB}</span>
              <span class="lnpg-prod-n"><span class="lnpg-bare-t">No product yet</span>
                <span class="lnpg-acts">${penMenu(pool, `addLineProduct('${k}','__V__',[${ids}])`, 'Pick a product for these tasks', 'Select a product from template')}</span></span></span>
          </div>
          <div class="lnpg-tasks">${bare.map(t => taskRow(t)).join('')}</div>
        </div>
      </div>`;
    }
    const cat = added.find(x => x.sku === sku); if(!cat) return '';
    const o = _lnpOffer(l, cat);
    const on = l.items.filter(t => _lineTaskPicked(l, t).some(h => h.p.sku === cat.sku));
    return `<div class="lnpg">
      <div class="lnpg-body">
        <div class="lnpg-prod">
          <!-- Change and remove sit under the name; the task costs carry the money. -->
          <span class="lnpg-prod-l">
            <span class="lnpc-thumb is-sm lnpg-open" onclick="openFly(${l.items[0].id},'${esc(cat.sku)}',event)" title="View product details">${cat.image ? `<img src="${esc(cat.image)}" alt="" loading="lazy">` : _LNP_THUMB}</span>
            <span class="lnpg-prod-n">
              <span class="lnpg-open" onclick="openFly(${l.items[0].id},'${esc(cat.sku)}',event)" title="View product details"><span class="lnpc-brand">${esc(cat.brand || '')}</span><span class="lnpc-name">${esc(cat.name)}</span></span>
              <span class="lnpg-acts">
                ${penMenu(pool.filter(x => x.sku !== cat.sku), `swapLineProduct('${k}','${esc(cat.sku)}','__V__')`, 'Change this product', 'Select another product from template')}
                <button type="button" class="optc-trash" onclick="event.stopPropagation();removeLineProduct('${k}','${esc(cat.sku)}')" title="Take this product off its tasks" aria-label="Remove ${esc(cat.brand)} ${esc(cat.name)}">${trashSvg}</button>
              </span>
            </span>
          </span>
        </div>
        <div class="lnpg-tasks">${on.flatMap(t => _lineTaskPicked(l, t).filter(h => h.p.sku === cat.sku).map(h => taskRow(t, cat.sku, h))).join('')}</div>
      </div>
      ${supplierPickHtml(o.offers, o.sup, `setLineSupplier('${k}','${esc(cat.sku)}','__S__')`, `line:${l.key}|${cat.sku}`)}
    </div>`;
  }).join('');
  const bareHtml = '';
  const total = `<div class="lnpc-foot lnpg-total">
    ${(() => { const u = sharedUnit && sharedUnit !== 'ea' ? ' ' + esc(sharedUnit) : '';
      // "Total" unless the quantities don't meet what's scoped — then say how.
      return `<span class="lnpc-foot-l">Total${status ? `<span class="lnp-total-status ${statusCls}">${esc(status)}</span>` : ''}${u && sharedUnit !== null ? `<span class="lnpc-foot-q">${fmtN(boxSum)}${u}</span>` : ''}</span>`; })()}
    <span class="lnpc-foot-amt">${money(Math.round(deptLineCost(l)))}</span>
  </div>`;
  const colHead = `<div class="lnpg-head"><span>Product</span><span class="lnpg-head-t"><span>Group › Task › Option</span><span>Qty</span><span class="num">Cost</span></span></div>`;
  const head = total + colHead + (groups || `<div class="lnpg-empty">${n} ${n === 1 ? 'task needs' : 'tasks need'} a product. Pick one below.</div>`) + bareHtml;
  const foot = '';
  // The choice: what else this line could buy.
  const alts = pool.filter(x => !added.some(a => a.sku === x.sku));
  const priced = alts.map(x => ({x, o:_lnpOffer(l, x)}));
  const low = priced.length ? Math.min(...priced.map(p => p.o.offer.price)) : null;
  // Open by default; Hide folds them for this line.
  const altOpen = l.key in _lnpAltOpen ? _lnpAltOpen[l.key] : true;
  const altHtml = !alts.length ? '' : altOpen
    ? `<div class="lnpc-alts">
        <div class="lnpc-alts-hd"><span>${added.length ? 'Alternatives' : 'Pick a product'}</span>${added.length ? `<button type="button" class="optc-link" onclick="lnpToggle('alt','${lk}',false)">Hide</button>` : ''}</div>
        ${priced.map(({x, o}) => {
          // Each alternative says where it would be bought from, and can be
          // switched before it's added — the same strip the chosen product has.
          return `<div class="lnpc-alt"><div class="lnpc-alt-row">
            <div class="lnpc-thumb is-sm">${x.image ? `<img src="${esc(x.image)}" alt="" loading="lazy">` : _LNP_THUMB}</div>
            <div class="lnpc-alt-main" onclick="openFly(${l.items[0].id},'${esc(x.sku)}',event)" title="View product details">
              <span class="lnpc-brand">${esc(x.brand || '')}</span>
              <span class="lnpc-alt-name">${esc(x.name)}</span>
            </div>
            ${o.offer.price === low && priced.length > 1 ? '<span class="lnpc-alt-sup"><span class="lnpc-low">Lowest</span></span>' : ''}
            <span class="lnpc-alt-price">${money(Math.round(o.offer.price))}<span> / ${esc(x.unit || 'ea')}</span></span>
            ${(() => { const open = _lnpSel && _lnpSel.line === l.key && _lnpSel.sku === x.sku;
              return `<button type="button" class="lnp-apply lnp-select${open ? ' is-on' : ''}" aria-expanded="${open}" onclick="event.stopPropagation();lnpSelStart('${k}','${esc(x.sku)}')">${open ? 'Cancel' : 'Select'}</button>`; })()}
          </div>
          ${supplierPickHtml(o.offers, o.sup, `setLineSupplier('${k}','${esc(x.sku)}','__S__')`, `line:${l.key}|${x.sku}`)}
          ${_lnpSelHtml(l, x)}</div>`;
        }).join('')}
      </div>`
    : `<button type="button" class="optc-alt" onclick="lnpToggle('alt','${lk}',true)">
        <span>${alts.length} alternative${alts.length === 1 ? '' : 's'}</span>
        <span class="optc-alt-names">${priced.slice(0, 2).map(({x, o}) => `${esc(x.brand)} ${esc(x.name)} ${money(Math.round(o.offer.price))}`).join(' · ')}${priced.length > 2 ? ' · …' : ''}</span>
      </button>`;
  // The catalogue search is always there, under the alternatives.
  const search = `<div class="optc-search">${prodSearchHtml('line:' + l.key)}</div>`;
  return `<div class="pgd-details-sec lnpc">
    <!-- Each product with the tasks it goes on, editable; the total under
         them all. The header card above carries the read-only summary. -->
    <div class="pgd-details-title lnpc-prod-t">${added.length > 1 ? `Chosen products · ${added.length}` : added.length ? 'Chosen product' : 'Product'}</div>
    <div class="lnpc-card lnpc-card-prod" id="lnpProducts">${head}${foot}</div>
    ${altHtml}
    ${search}
  </div>`;
}
/* ════════ Alternatives: Select, then Replace or Add, then which tasks ════════
   Select opens a panel under the product. First: Replace what a task has in
   this line, or Add beside it. Then tick the tasks — all, or some. A task
   that already has just this product (Replace) or already carries it (Add)
   has nothing to change and stays unticked. */
let _lnpSel = null;   // {line, sku, mode:'replace'|'add', on:Set(taskIds), qty:{taskId:n}}
// How many each task starts with: on Replace, what it has now in the line;
// on Add, what the task itself calls for.
function _lnpSelQtys(l, sku, mode){
  const cat = _lineCat(l, sku);
  const out = {};
  l.items.forEach(t => {
    const pk = _lineTaskPicked(l, t);
    const now = pk.length ? _num(pk[0].p.qty) : 0;
    out[t.id] = (mode === 'replace' && now) ? now : _num(_taskNeedQty(t, cat)) || 1;
  });
  return out;
}
function lnpSelQty(id, dir){
  if(!_lnpSel) return;
  _lnpSel.qty[id] = Math.max(1, (_lnpSel.qty[id] || 1) + dir);
  _lnpSel.on.add(id);
  renderShop();
}
function _lnpSelFree(l, sku, mode){
  return l.items.filter(t => {
    const pk = _lineTaskPicked(l, t);
    const has = pk.some(h => h.p.sku === sku);
    return mode === 'add' ? !has : !(has && pk.length === 1);
  });
}
function lnpSelStart(key, sku){
  if(_lnpSel && _lnpSel.line === key && _lnpSel.sku === sku){ _lnpSel = null; renderShop(); return; }
  const l = deptLineByKey(key); if(!l) return;
  const anyChosen = l.items.some(t => _lineTaskPicked(l, t).length);
  const mode = anyChosen ? 'replace' : 'add';
  _lnpSel = {line:key, sku, mode, on:new Set(_lnpSelFree(l, sku, mode).map(t => t.id)), qty:_lnpSelQtys(l, sku, mode)};
  renderShop();
}
function lnpSelMode(mode){
  if(!_lnpSel) return;
  const l = deptLineByKey(_lnpSel.line); if(!l) return;
  _lnpSel.mode = mode;
  _lnpSel.on = new Set(_lnpSelFree(l, _lnpSel.sku, mode).map(t => t.id));
  _lnpSel.qty = _lnpSelQtys(l, _lnpSel.sku, mode);
  renderShop();
}
function lnpSelToggle(id){ if(!_lnpSel) return; _lnpSel.on.has(id) ? _lnpSel.on.delete(id) : _lnpSel.on.add(id); renderShop(); }
function lnpSelAll(all){
  if(!_lnpSel) return;
  const l = deptLineByKey(_lnpSel.line); if(!l) return;
  _lnpSel.on = new Set(all ? _lnpSelFree(l, _lnpSel.sku, _lnpSel.mode).map(t => t.id) : []);
  renderShop();
}
function lnpSelApply(){
  if(!_lnpSel) return;
  const {line, sku, mode, on, qty} = _lnpSel;
  _lnpSel = null;
  const l = deptLineByKey(line); if(!l){ renderShop(); return; }
  const ids = [...on];
  if(!ids.length){ renderShop(); return; }
  if(mode === 'add'){ addLineProduct(line, sku, ids, qty); return; }
  const cat = _lineCat(l, sku); if(!cat){ renderShop(); return; }
  const targets = l.items.filter(t => on.has(t.id));
  _applyLineProductTo(l, cat, targets);
  // Then each task's chosen amount.
  targets.forEach(t => {
    _lineTaskPicked(l, t).filter(h => h.p.sku === sku).forEach(h => { h.p.qty = String(qty[t.id]); recomputeOptionFromProducts(t, h.o); });
    _syncTaskProduct(t);
  });
  toast(targets.length === 1
    ? `${targets[0].room} › ${targets[0].name} now on ${cat.brand} ${cat.name}`
    : `${cat.brand} ${cat.name} replaces what ${targets.length} tasks had`);
  renderAll();
}
function _lnpSelHtml(l, cat){
  if(!_lnpSel || _lnpSel.line !== l.key || _lnpSel.sku !== cat.sku) return '';
  const {mode, on} = _lnpSel;
  const anyChosen = l.items.some(t => _lineTaskPicked(l, t).length);
  const free = _lnpSelFree(l, cat.sku, mode);
  const allOn = free.length && free.every(t => on.has(t.id));
  const nOn = on.size;
  const price = _lnpOffer(l, cat).offer.price;
  const unit = esc(cat.unit || 'ea');
  const sumOn = l.items.filter(t => on.has(t.id)).reduce((a, t) => a + (_lnpSel.qty[t.id] || 0) * price, 0);
  const minus = `<svg viewBox="0 0 12 12" fill="none"><path d="M3 6h6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`;
  const plus = `<svg viewBox="0 0 12 12" fill="none"><path d="M6 3v6M3 6h6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`;
  const rows = l.items.map(t => {
    const pk = _lineTaskPicked(l, t);
    const ok = free.includes(t);
    const now = pk.length ? pk.map(h => [h.p.brand, h.p.product].filter(Boolean).join(' ')).join(' + ') : 'No product yet';
    const note = !ok ? (mode === 'add' ? 'Already has it' : 'Already on just this')
      : (mode === 'replace' && pk.length ? `Replaces ${now}` : now);
    const q = _lnpSel.qty[t.id] || 1;
    const live = ok && on.has(t.id);
    return `<label class="lnp-sel-row${ok ? '' : ' is-locked'}${live ? '' : ' is-off'}">
      <input type="checkbox" ${live ? 'checked' : ''} ${ok ? '' : 'disabled'} onchange="lnpSelToggle(${t.id})">
      <span class="lnp-sel-l">
        <span class="lnp-sel-task"><span class="task-ctx">${esc(t.room)} ›</span> ${esc(t.name)}</span>
        <span class="lnp-sel-now" title="${esc(note)}">${esc(note)}</span>
      </span>
      ${ok ? `<span class="opt-card-qty-stepper lnp-sel-step" onclick="event.preventDefault();event.stopPropagation()">
        <button type="button" class="opt-card-qty-btn" onclick="lnpSelQty(${t.id},-1)" aria-label="One fewer">${minus}</button>
        <input class="opt-card-qty-input" value="${q.toLocaleString('en-US')}" readonly tabindex="-1">
        <button type="button" class="opt-card-qty-btn" onclick="lnpSelQty(${t.id},1)" aria-label="One more">${plus}</button>
      </span>` : '<span></span>'}
      <span class="lnp-sel-amt">${ok ? `${money(Math.round(q * price))}<span class="lnp-sel-unit">${q.toLocaleString('en-US')} ${unit} × ${money(Math.round(price))}</span>` : ''}</span>
    </label>`;
  }).join('');
  const seg = m => `<button type="button" class="${mode === m ? 'on' : ''}" onclick="lnpSelMode('${m}')">${m === 'replace' ? 'Replace' : '+ Add'}</button>`;
  return `<div class="lnp-sel" onclick="event.stopPropagation()">
    <div class="lnp-sel-hd">
      ${anyChosen ? `<span class="lnp-sel-seg" role="group" aria-label="Replace or add">${seg('replace')}${seg('add')}</span>` : ''}
      <span class="lnp-sel-what">${mode === 'replace' ? 'Swap it in on' : 'Add it to'}</span>
      ${free.length > 1 ? `<label class="lnp-sel-all"><input type="checkbox" ${allOn ? 'checked' : ''} onchange="lnpSelAll(this.checked)"> All ${free.length} tasks</label>` : ''}
    </div>
    <div class="lnp-sel-list">${rows}</div>
    <div class="lnp-sel-ft">
      <button type="button" class="optc-link" onclick="lnpSelStart('${_lineKeyArg(l.key)}','${esc(cat.sku)}')">Cancel</button>
      <button type="button" class="lnp-pick-go" ${nOn ? '' : 'disabled'} onclick="lnpSelApply()">${nOn ? `${mode === 'replace' ? 'Replace on' : 'Add to'} ${nOn} task${nOn === 1 ? '' : 's'} · ${money(Math.round(sumOn))}` : 'Choose a task'}</button>
    </div>
  </div>`;
}
/* ════════ Select, then choose the tasks ════════
   Picking a product for a line is two steps: Select it, then tick the tasks
   it goes on — all of them, or only some. A task says when it has no
   product yet, or already has this one; no confirm box follows. A line of
   one task has nothing to choose, so Select applies straight away. */
let _lnpPick = null;   // {line, sku, on:Set(taskIds)} while choosing
function _lnpSelectBtnHtml(l, sku){
  const k = _lineKeyArg(l.key);
  const open = _lnpPick && _lnpPick.line === l.key && _lnpPick.sku === sku;
  return `<button type="button" class="lnp-apply${open ? ' is-on' : ''}" aria-expanded="${open}"
    onclick="event.stopPropagation();lnpPickStart('${k}','${esc(sku)}')">Select</button>`;
}
function lnpPickStart(key, sku){
  const l = deptLineByKey(key); if(!l) return;
  if(_lnpPick && _lnpPick.line === key && _lnpPick.sku === sku){ _lnpPick = null; renderShop(); return; }
  if(l.items.length === 1){ applyLineProduct(key, sku, 'replace'); return; }
  // Ticked to start: every task not already on this product.
  const on = new Set(l.items.filter(t => !_lineTaskPicked(l, t).some(h => h.p.sku === sku)).map(t => t.id));
  _lnpPick = {line:key, sku, on};
  renderShop();
}
function lnpPickToggle(id){ if(!_lnpPick) return; _lnpPick.on.has(id) ? _lnpPick.on.delete(id) : _lnpPick.on.add(id); renderShop(); }
function lnpPickAll(all){
  if(!_lnpPick) return;
  const l = deptLineByKey(_lnpPick.line); if(!l) return;
  _lnpPick.on = new Set(all ? l.items.filter(t => !_lineTaskPicked(l, t).some(h => h.p.sku === _lnpPick.sku)).map(t => t.id) : []);
  renderShop();
}
function lnpPickCancel(){ _lnpPick = null; renderShop(); }
function lnpPickApply(){
  if(!_lnpPick) return;
  const l = deptLineByKey(_lnpPick.line); if(!l){ _lnpPick = null; return; }
  const cat = _lineCat(l, _lnpPick.sku);
  const targets = l.items.filter(t => _lnpPick.on.has(t.id));
  _lnpPick = null;
  if(!cat || !targets.length){ renderShop(); return; }
  _applyLineProductTo(l, cat, targets);
  if(typeof toast === 'function') toast(targets.length === 1
    ? `${cat.brand} ${cat.name} → ${targets[0].room} › ${targets[0].name}`
    : `${cat.brand} ${cat.name} applied to ${targets.length} tasks`);
  renderAll();
}
function _lnpPickHtml(l, cat){
  if(!_lnpPick || _lnpPick.line !== l.key || _lnpPick.sku !== cat.sku) return '';
  const free = l.items.filter(t => !_lineTaskPicked(l, t).some(h => h.p.sku === cat.sku));
  const allOn = free.length && free.every(t => _lnpPick.on.has(t.id));
  const nOn = _lnpPick.on.size;
  const rows = l.items.map(t => {
    const pk = _lineTaskPicked(l, t);
    const already = pk.some(h => h.p.sku === cat.sku);
    const on = already || _lnpPick.on.has(t.id);
    const now = already ? 'Already on this product' : pk.length ? '' : 'No product yet';
    return `<label class="lnp-pick-row${already ? ' is-locked' : ''}">
      <input type="checkbox" ${on ? 'checked' : ''} ${already ? 'disabled' : ''} onchange="lnpPickToggle(${t.id})">
      <span class="lnp-pick-task"><span class="task-ctx">${esc(t.room)} ›</span> ${esc(t.name)}</span>
      ${now ? `<span class="lnp-pick-now">${now}</span>` : ''}
    </label>`;
  }).join('');
  return `<div class="lnp-pick" onclick="event.stopPropagation()">
    <div class="lnp-pick-hd">
      <span>Apply <b>${esc(cat.brand)} ${esc(cat.name)}</b> to</span>
      ${free.length > 1 ? `<label class="lnp-pick-all"><input type="checkbox" ${allOn ? 'checked' : ''} onchange="lnpPickAll(this.checked)"> All ${free.length} tasks</label>` : ''}
    </div>
    <div class="lnp-pick-list">${rows}</div>
    <div class="lnp-pick-ft">
      <button type="button" class="optc-link" onclick="lnpPickCancel()">Cancel</button>
      <button type="button" class="lnp-pick-go" ${nOn ? '' : 'disabled'} onclick="lnpPickApply()">${nOn ? `Apply to ${nOn} task${nOn === 1 ? '' : 's'}` : 'Choose a task'}</button>
    </div>
  </div>`;
}
function _renderLinePageHtml(){
  const lines = allDeptLines();
  const idx = lines.findIndex(l => l.key === selLineKey);
  const l = lines[idx];
  if(!l) return `<div class="pgd"><div class="pgd-muted" style="padding:24px 0">This product line is no longer in the scope. Pick another from the sidebar.</div></div>`;
  const prevL = lines[idx - 1] || null;
  const nextL = lines[idx + 1] || null;
  const n = l.items.length;
  const isLabor = l.dept === NO_PRODUCT_DEPT;
  const k = _lineKeyArg(l.key);
  const rooms = [...new Set(l.items.map(t => t.room))];
  const svgMinus = `<svg viewBox="0 0 12 12" fill="none"><path d="M3 6h6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`;
  const svgPlus  = `<svg viewBox="0 0 12 12" fill="none"><path d="M6 3v6M3 6h6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`;
  const svgTick  = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l4 4 10-11"/></svg>`;

  // Quantity as number and unit apart: the box holds the number, the unit
  // goes up in the column heading when every task shares it ("Qty · SF"),
  // and beside each box only when they don't.
  const qtyOf = t => {
    const raw = String(lineTaskQtyLabel(l, t) || '');
    const num = (raw.match(/[\d.,]+/) || [''])[0];
    const unit = raw.replace(/^[\s\d.,-]+/, '').trim() || String(t.qty || '').replace(/^[\s\d.,-]+/, '').trim();
    return {num, unit};
  };
  const qtys = new Map(l.items.map(t => [t.id, qtyOf(t)]));
  const unitSet = [...new Set([...qtys.values()].map(q => q.unit).filter(Boolean))];
  const sharedUnit = unitSet.length <= 1 ? (unitSet[0] || '') : null;
  const taskHead = isLabor ? '' : `<div class="lnp-task lnp-task-head">
      <span>Task</span><span>Qty${sharedUnit ? ` · ${esc(sharedUnit)}` : ''}</span><span>Product</span><span class="num">Cost</span>
    </div>`;
  /* Total row, under the headings: what the boxes add up to against what
     the tasks call for. "Needed" is each task's own measured quantity
     (t.qty) — the boxes are what's being bought for it — so the row shows
     at a glance whether the line is short, covered or over. Compared only
     when every task states a need in the same unit; otherwise it just sums. */
  const fmtN = v => (Math.round(v * 100) / 100).toLocaleString('en-US');
  const unitOf = str => String(str || '').replace(/^[\s\d.,-]+/, '').trim();
  const boxSum = l.items.reduce((a, t) => a + (_num(qtys.get(t.id).num) || 0), 0);
  const notPicked = l.items.filter(t => !_lineTaskPicked(l, t).length).length;
  const needKnown = sharedUnit !== null && l.items.every(t => _num(t.qty) > 0 && (!unitOf(t.qty) || unitOf(t.qty) === (sharedUnit || unitOf(t.qty))));
  const needSum = needKnown ? l.items.reduce((a, t) => a + _num(t.qty), 0) : null;
  const uTxt = sharedUnit && sharedUnit !== 'ea' ? ' ' + sharedUnit : '';
  let status = '', statusCls = '';
  if(needSum !== null){
    const diff = Math.round((boxSum - needSum) * 100) / 100;
    if(notPicked){ status = `${notPicked} ${notPicked === 1 ? 'task' : 'tasks'} still to pick`; statusCls = 'is-short'; }
    else if(diff < 0){ status = `${fmtN(-diff)}${uTxt} short`; statusCls = 'is-short'; }
    else if(diff > 0){ status = `${fmtN(diff)}${uTxt} over`; statusCls = 'is-over'; }
    // Covered says nothing the quantity doesn't — "140 of 140 scoped" — so
    // only a shortfall or an overage gets a word.
    else { status = ''; statusCls = ''; }
  } else if(notPicked){
    status = `${notPicked} ${notPicked === 1 ? 'task' : 'tasks'} still to pick`; statusCls = 'is-short';
  }
  const taskTotal = (isLabor || n < 2) ? '' : `<div class="lnp-task lnp-task-total">
      <span class="lnp-total-lead"><span class="lnp-total-lbl">Total</span>${status ? `<span class="lnp-total-status ${statusCls}">${statusCls === 'is-ok' ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l4 4 10-11"/></svg>' : ''}${esc(status)}</span>` : ''}</span>
      <span class="lnp-total-qty"><b>${sharedUnit === null ? '—' : fmtN(boxSum)}</b>${needSum !== null ? `<span> of ${fmtN(needSum)} scoped</span>` : ''}</span>
      ${(() => {
        // The product, when it's one product across the whole line;
        // nothing when the tasks differ — the rows below already say which.
        const one = deptLinePicked(l);
        return one.state === 'one'
          ? `<span class="lnp-total-prod" title="${esc(one.product)}">${esc(one.product)}</span>`
          : '<span></span>';
      })()}
      <span class="lnp-task-amt">${money(Math.round(deptLineCost(l)))}</span>
    </div>`;
  const pool = isLabor ? [] : deptLinePool(l);
  const taskRows = l.items.map(t => {
    const pk = taskPickedProducts(t);
    const q = qtys.get(t.id);
    return `<div class="lnp-task">
      <button class="lnp-task-name" onclick="selectTask(${t.id})" title="Open ${esc(t.name)}"><span class="task-ctx">${esc(t.room)} ›</span> ${esc(t.name)}</button>
      ${isLabor ? '<span></span>' : `<div class="lnp-task-qtycell"><div class="opt-card-qty-stepper lnp-task-qty">
        <button class="opt-card-qty-btn" onclick="bumpLineTaskQty('${k}',${t.id},-1)" aria-label="One fewer for this task">${svgMinus}</button>
        <input class="opt-card-qty-input" value="${esc(q.num || '—')}" readonly tabindex="-1" title="This task's quantity${q.unit ? ` (${esc(q.unit)})` : ''}">
        <button class="opt-card-qty-btn" onclick="bumpLineTaskQty('${k}',${t.id},+1)" aria-label="One more for this task">${svgPlus}</button>
      </div>${sharedUnit === null && q.unit ? `<span class="lnp-task-unit">${esc(q.unit)}</span>` : ''}</div>`}
      ${isLabor ? `<span class="lnp-task-prod is-none">Nothing to buy</span>` : (() => {
        // The task's own pick, straight from its row. Shows the line's
        // catalogue; a task carrying something from outside it (or two
        // things) says so in the button until it's re-picked.
        const picked = _lineTaskPicked(l, t);
        const cur = picked.length === 1 ? picked[0].p.sku : '';
        const inPool = cur && pool.some(c => c.sku === cur);
        const opts = [{value:'', label: pk.length && !inPool ? pk.join(' + ') : 'Not picked'}]
          .concat(pool.map(c => ({value:c.sku, label:`${c.brand} ${c.name}`})));
        return `<div class="lnp-task-pick">${hdrDdHtml('ddLnp-' + t.id, inPool ? cur : '', opts,
          `setLineTaskProduct('${k}',${t.id},__V__)`, 'lnp-task-dd' + (pk.length ? '' : ' is-unset'))}</div>`;
      })()}
      <span class="lnp-task-amt">${isLabor ? '' : money(Math.round(taskLineCost(l, t)))}</span>
    </div>`;
  }).join('');

  const prodRows = (isLabor ? [] : deptLinePool(l)).map(cat => {
    const users = lineProductUsers(l, cat.sku);
    const sku = esc(cat.sku);
    const allHave = users.length === n;
    // The supplier this line buys the product from, and that supplier's price.
    const offers = (typeof catalogOffers === 'function') ? catalogOffers(Object.assign({section: (catalogFind(cat.sku) || {}).section}, cat)) : [];
    const sup = lineSupplierFor(l, cat.sku);
    const offer = offers.find(o => o.supplier === sup) || offers[0] || {price: cat.price};
    const thumb = cat.image
      ? `<img src="${esc(cat.image)}" alt="${esc(cat.name)}" loading="lazy">`
      : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M4 5.5h13l-1 4H5z"/><path d="M4 12h13v6H4z"/><path d="M8 8v4"/></svg>`;
    const act = allHave
      ? `<span class="lnp-applied">${svgTick}Applied</span>`
      : _lnpSelectBtnHtml(l, cat.sku);
    return `<div class="sec-taskcard-product-row is-catalog lnp-prod${users.length ? ' is-picked' : ''}" onclick="openFly(${l.items[0].id},'${sku}',event)" title="View product details">
      <div class="sec-taskcard-product-thumb">${thumb}</div>
      <div class="sec-taskcard-product-name-block">
        <span class="sec-taskcard-product-brand">${esc(cat.brand)}</span>
        <span class="sec-taskcard-product-name">${esc(cat.name)}</span>
        <span class="sec-taskcard-product-sku">SKU ${sku}</span>
      </div>
      <div class="lnp-prod-price">$${Number(offer.price).toLocaleString('en-US')}<span>/ ${esc(cat.unit)}</span></div>
      <div class="lnp-prod-use">${users.length ? `On ${users.length} of ${n}` : ''}</div>
      <div class="lnp-prod-act" onclick="event.stopPropagation()">${act}</div>
      ${supplierPickHtml(offers, sup, `setLineSupplier('${k}','${sku}','__S__')`, `line:${l.key}|${cat.sku}`)}
    </div>${_lnpPickHtml(l, cat)}`;
  }).join('');

  const anyPicked = l.items.some(t => _lineTaskPicked(l, t).length);
  // ShopwithKai_layout.html: the chosen product, its tasks and the choice
  // in one card, in place of the two sections below.
  const condensed = (window.__KAI_SHOP_LAYOUT && !isLabor)
    ? _lnpCondensedHtml(l, {k, n, qtys, sharedUnit, pool, needSum, boxSum, status, statusCls, svgMinus, svgPlus, anyPicked})
    : '';
  return `<div class="pgd lnp">
    <div class="pgd-hdr-box">
      <div class="sec-taskcard-hdr">
        <div class="sec-taskcard-hdr-l">
          ${window.__KAI_SHOP_LAYOUT ? (() => {
            /* Breadcrumbs, as on a task: the department above it (a way up),
               then the rooms — the groups — its tasks are in. */
            const q = v => esc(String(v)).replace(/'/g, "\\'");
            return `<div class="lnp-eyebrow"><span class="sec-taskcard-eyebrow task-crumbs">
              <span class="page-kind">Product type</span>
              <nav class="task-crumb" aria-label="Department">
                <button type="button" class="task-crumb-a" onclick="goUpMaterials('${q(l.dept)}')" title="Open ${esc(l.dept)}">${esc(l.dept)}</button>
                <span class="sec-taskcard-sep" aria-hidden="true">›</span><span>${esc(l.name)}</span>
              </nav>
              <span class="task-crumbs-div" aria-hidden="true"></span>
              <span class="page-kind">${rooms.length === 1 ? 'Room' : 'Rooms'}</span>
              <nav class="task-crumb" aria-label="Rooms">${rooms.map((r, i) => `${i ? '<span class="sec-taskcard-sep" aria-hidden="true">·</span>' : ''}<button type="button" class="task-crumb-a" onclick="goUpRoom('${q(r)}')" title="Open ${esc(r)}">${esc(r)}</button>`).join('')}</nav>
            </span></div>`;
          })() : `<div class="lnp-eyebrow">${esc(l.dept)}</div>`}
          <div class="pgd-title">${esc(l.name)}</div>
          <div class="pgd-grp-meta">${esc(_lineHdrNeed(l, isLabor))}<span class="sep">&middot;</span>${rooms.length} ${rooms.length === 1 ? 'room' : 'rooms'}</div>
        </div>
        <div class="sec-taskcard-hdr-r">
          ${isLabor ? '' : `<span class="sec-taskcard-amt-line"><span class="sec-taskcard-amt">${money(Math.round(deptLineCost(l)))}</span></span>`}
          ${isLabor || !window.__KAI_SHOP ? '' : `<button type="button" class="lnp-po-link" onclick="openPurchaseOrder()">View purchase order &rarr;</button>`}
        </div>
      </div>
      ${window.__KAI_SHOP_LAYOUT && !isLabor ? _lnpTaskSummaryHtml(l) : ''}
    </div>
    ${_linePhotoSectionHtml(l, isLabor ? '' : money(Math.round(deptLineCost(l))))}
    ${condensed || `<div class="pgd-details-sec">
      <div class="pgd-sec-hd">
        <div class="pgd-details-title">Tasks in this line</div>
        ${isLabor || !anyPicked ? '' : `<div class="pgd-sec-hd-r">
          <button class="sec-mod-add" onclick="clearLineProduct('${k}')">${n > 1 ? 'Clear all products' : 'Clear product'}</button>
        </div>`}
      </div>
      <div class="lnp-task-list${isLabor ? ' is-labor' : ''}">${taskHead}${taskTotal}${taskRows}</div>
    </div>
    ${isLabor ? `<div class="pgd-details-sec">
      <div class="pgd-details-title">Nothing to buy</div>
      <div class="pgd-muted">These tasks are labor only, or the resident supplies the product.</div>
    </div>` : `<div class="pgd-details-sec">
      <div class="pgd-details-title">Products</div>
      ${prodSearchHtml('line:' + l.key)}
      <div class="sec-taskcard-products lnp-products">${prodRows || '<div class="sec-taskcard-product-empty">No catalogue products for this line yet.</div>'}</div>
    </div>`}`}
    <div class="shop-nav-float">
      <button class="shop-nav-btn" ${prevL ? '' : 'disabled'} onclick="${prevL ? `selectLine('${_lineKeyArg(prevL.key)}')` : ''}" title="${prevL ? esc(prevL.name) : 'No previous line'}">${svgChevL()} Previous line</button>
      <button class="shop-nav-btn" ${nextL ? '' : 'disabled'} onclick="${nextL ? `selectLine('${_lineKeyArg(nextL.key)}')` : ''}" title="${nextL ? esc(nextL.name) : 'No next line'}">Next line ${svgChevR()}</button>
    </div>
  </div>`;
}

/* ── Product search (Editor) ─────────────────────────────────────────
   A search box under the product rows that reaches the whole catalogue,
   not just the products seeded on the option. Results drop down under the
   box; each one's action depends on where the box is:
     opt:<taskId>:<optId>  — add the product to that option (qty 0, so it's
                             listed and ready to pick, like the others)
     line:<lineKey>        — apply it to every task in a product line
   Typing only redraws the result list, so the caret never jumps. */
let prodSearchCtx = null;   // which box the results belong to
let prodSearchQ = '';
function prodSearchHtml(ctx){
  const open = prodSearchCtx === ctx;
  const id = 'ps-' + ctx.replace(/[^a-z0-9]/gi, '_');
  return `<div class="prod-search${open && prodSearchQ ? ' has-results' : ''}" id="${id}" onclick="event.stopPropagation()">
    <div class="prod-search-box">
      <svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="7" cy="7" r="4.5" stroke="currentColor" stroke-width="1.4"/><path d="M10.5 10.5L14 14" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
      <input type="search" class="prod-search-input" placeholder="Search the catalog — brand, product or SKU"
        value="${open ? esc(prodSearchQ) : ''}" autocomplete="off"
        onfocus="prodSearchFocus('${esc(ctx).replace(/'/g, "\\'")}', this)"
        oninput="prodSearchInput('${esc(ctx).replace(/'/g, "\\'")}', this.value)"
        onkeydown="if(event.key==='Escape'){this.value='';prodSearchInput('${esc(ctx).replace(/'/g, "\\'")}','');this.blur();}">
    </div>
    <div class="prod-search-results" role="listbox">${open ? _prodSearchResultsHtml(ctx) : ''}</div>
  </div>`;
}
function _prodSearchEl(ctx){ return document.getElementById('ps-' + ctx.replace(/[^a-z0-9]/gi, '_')); }
function prodSearchFocus(ctx, el){
  if(prodSearchCtx !== ctx){ prodSearchCtx = ctx; prodSearchQ = el.value || ''; }
}
function prodSearchInput(ctx, v){
  prodSearchCtx = ctx; prodSearchQ = v;
  const box = _prodSearchEl(ctx); if(!box) return;
  box.classList.toggle('has-results', !!v.trim());
  box.querySelector('.prod-search-results').innerHTML = _prodSearchResultsHtml(ctx);
}
function _prodSearchHas(ctx, sku){
  const [kind, a, b] = ctx.split(':');
  if(kind === 'opt'){
    const t = TASKS.find(x => x.id === +a);
    const o = t && (t.options || []).find(x => x.id === b);
    return !!(o && (o.products || []).some(p => p.sku === sku));
  }
  if(kind === 'line' && typeof deptLineByKey === 'function'){
    const l = deptLineByKey(ctx.slice(5));
    return !!(l && lineProductUsers(l, sku).length === l.items.length);
  }
  return false;
}
function _prodSearchResultsHtml(ctx){
  const q = (prodSearchQ || '').trim();
  if(!q) return '';
  const hits = catalogSearch(q, 8);
  if(!hits.length) return `<div class="prod-search-empty">No products match “${esc(q)}”.</div>`;
  const isLine = ctx.startsWith('line:');
  const line = isLine && typeof deptLineByKey === 'function' ? deptLineByKey(ctx.slice(5)) : null;
  const n = line ? line.items.length : 0;
  const c = esc(ctx).replace(/'/g, "\\'");
  return hits.map(p => {
    const has = _prodSearchHas(ctx, p.sku);
    const btn = has
      ? `<span class="prod-search-added">${isLine ? 'Applied' : 'Added'}</span>`
      : `<button type="button" class="prod-search-add" onclick="event.stopPropagation();prodSearchPick('${c}','${esc(p.sku)}')">${isLine ? (n > 1 ? `Apply to all ${n}` : 'Apply') : '+ Add'}</button>`;
    // Same thumbnail as the product rows: the photo when the catalogue has
    // one, the product glyph otherwise.
    const thumb = p.image
      ? `<img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy">`
      : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M4 5.5h13l-1 4H5z"/><path d="M4 12h13v6H4z"/><path d="M8 8v4"/></svg>`;
    return `<div class="prod-search-row" role="option">
      <div class="sec-taskcard-product-thumb prod-search-thumb">${thumb}</div>
      <div class="prod-search-main">
        <span class="prod-search-brand">${esc(p.brand)}<span class="sep">·</span>${esc(CATALOG_SECTION_LABEL[p.section] || '')}</span>
        <span class="prod-search-name">${esc(p.name)}</span>
        <span class="prod-search-sku">SKU ${esc(p.sku)}</span>
      </div>
      ${(() => {
        // Lowest price across the suppliers that carry it, and how many do.
        const offers = catalogOffers(p);
        const low = offers.length ? offers[0].price : p.price;
        return `<span class="prod-search-price">${offers.length > 1 ? '<span class="from">from</span>' : ''}$${Number(low).toLocaleString('en-US')}<span>/ ${esc(p.unit)}</span>${offers.length > 1 ? `<em>${offers.length} suppliers</em>` : offers.length ? `<em>${esc(supplierName(offers[0].supplier))}</em>` : ''}</span>`;
      })()}
      ${btn}
    </div>`;
  }).join('');
}
function prodSearchPick(ctx, sku){
  const cat = catalogFind(sku); if(!cat) return;
  const [kind, a, b] = ctx.split(':');
  if(kind === 'opt'){
    const t = TASKS.find(x => x.id === +a);
    const o = t && (t.options || []).find(x => x.id === b);
    if(!o) return;
    o.products = o.products || [];
    if(!o.products.some(p => p.sku === sku)){
      o.products.push({id:'prod_' + Math.random().toString(36).slice(2,7), sku:cat.sku, brand:cat.brand,
        product:cat.name, qty:'0', parts:_fmtDollars(cat.price), labor:''});
    }
    toast(`${cat.brand} ${cat.name} added to ${t.name} — set a quantity to pick it`);
  } else if(kind === 'line'){
    applyLineProduct(ctx.slice(5), sku);
  }
  prodSearchCtx = null; prodSearchQ = '';
  renderAll();
}
// Clicking elsewhere closes the results.
document.addEventListener('click', () => {
  if(!prodSearchCtx) return;
  const box = _prodSearchEl(prodSearchCtx);
  if(box) box.classList.remove('has-results');
});

/* ── Supplier picker ─────────────────────────────────────────────────
   One product, several places to buy it. A strip across the bottom of the
   product row names where it's buying from — supplier, price, stock, how
   many carry it — and opens to every supplier, one per line, each with its
   own price and stock and the cheapest marked. Click one to buy from it:
   that sets the row's Parts rate; quantity and the rest stay as they are.
   A product only one supplier carries just names it. `pick` is a handler
   with __S__ for the supplier id; `key` remembers which strips are open. */
let supOpen = new Set();
const _supStock = s => s === 'out' ? 'Out of stock' : s === 'low' ? 'Low stock' : 'In stock';
/* How soon the product can be in hand from a supplier: store pickup and
   delivery. Prototype mock, by supplier and stock; in production these come
   from the supplier's own availability feed for the job's ship-to address. */
const _SUP_LOGI = {
  hd:  {in:['Pick up in 6 hours', 'Delivery in 2 days'],   low:['Pick up tomorrow', 'Delivery in 3–5 days']},
  low: {in:['Pick up in 4 hours', 'Delivery in 2 days'],   low:['Pick up tomorrow', 'Delivery in 4 days']},
  fd:  {in:['Pick up tomorrow', 'Delivery in 3 days'],     low:['Pick up in 2 days', 'Delivery in 5 days']},
  fer: {in:['Branch pickup tomorrow', 'Delivery in 2–3 days'], low:['Branch pickup in 3 days', 'Delivery in 5 days']},
};
function _supLogi(supplier, stock){
  if(stock === 'out') return ['No pickup', 'Delivery in 7–10 days'];
  const row = _SUP_LOGI[supplier] || _SUP_LOGI.hd;
  return row[stock === 'low' ? 'low' : 'in'];
}
const _supLogiHtml = (supplier, stock) => {
  const [pick, ship] = _supLogi(supplier, stock);
  return `<span class="sup-logi"><span class="sup-logi-i">${esc(pick)}</span><span class="sup-logi-sep" aria-hidden="true">·</span><span class="sup-logi-i">${esc(ship)}</span></span>`;
};
const _supPrice = n => '$' + Number(n).toLocaleString('en-US');
function supplierPickHtml(offers, cur, pick, key){
  if(!offers || !offers.length) return '';
  const low = offers[0].price;
  const curOffer = offers.find(o => o.supplier === cur) || offers[0];
  const stockCls = st => st === 'out' ? ' is-out' : st === 'low' ? ' is-low' : '';
  const k = esc(key).replace(/'/g, "\\'");
  if(offers.length === 1){
    return `<div class="sup-strip is-single" onclick="event.stopPropagation()">
      <span class="sup-strip-k">Sold by</span><b>${esc(supplierName(curOffer.supplier))}</b>
      <span class="sup-stock${stockCls(curOffer.stock)}">${_supStock(curOffer.stock)}</span>
      ${_supLogiHtml(curOffer.supplier, curOffer.stock)}
    </div>`;
  }
  const open = supOpen.has(key);
  const list = offers.map(o => {
    const on = o.supplier === curOffer.supplier;
    return `<button type="button" class="sup-opt${on ? ' on' : ''}" role="option" aria-selected="${on}"
        onclick="event.stopPropagation();${on ? '' : pick.replace('__S__', esc(o.supplier))}">
      <span class="sup-radio" aria-hidden="true"></span>
      <span class="sup-opt-who">
        <span class="sup-opt-name">${esc(supplierName(o.supplier))}</span>
        ${_supLogiHtml(o.supplier, o.stock)}
      </span>
      <span class="sup-stock${stockCls(o.stock)}">${_supStock(o.stock)}</span>
      ${o.price === low ? '<span class="sup-tag">Lowest</span>' : `<span class="sup-diff">+${_supPrice(o.price - low)}</span>`}
      <span class="sup-opt-price">${_supPrice(o.price)}</span>
    </button>`;
  }).join('');
  return `<div class="sup-strip${open ? ' open' : ''}" data-sup="${esc(key)}" onclick="event.stopPropagation()">
    <button type="button" class="sup-strip-hd" aria-expanded="${open}" onclick="event.stopPropagation();toggleSupStrip('${k}')">
      <span class="sup-strip-k">Buying from</span><b>${esc(supplierName(curOffer.supplier))}</b>
      <span class="sup-strip-price">${_supPrice(curOffer.price)}</span>
      <span class="sup-stock${stockCls(curOffer.stock)}">${_supStock(curOffer.stock)}</span>
      ${_supLogiHtml(curOffer.supplier, curOffer.stock)}
      ${curOffer.price === low ? '<span class="sup-tag">Lowest</span>' : ''}
      <span class="sup-strip-n">${offers.length} suppliers</span>
      <svg class="sup-strip-chev" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 4.5L6 8l3.5-3.5"/></svg>
    </button>
    <div class="sup-list" role="listbox">${list}</div>
  </div>`;
}
// Opened and closed in place: a redraw would lose the user's scroll spot.
function toggleSupStrip(key){
  if(supOpen.has(key)) supOpen.delete(key); else supOpen.add(key);
  document.querySelectorAll('.sup-strip').forEach(el => {
    if(el.dataset.sup === key){
      el.classList.toggle('open', supOpen.has(key));
      const hd = el.querySelector('.sup-strip-hd'); if(hd) hd.setAttribute('aria-expanded', String(supOpen.has(key)));
    }
  });
}
function setProductSupplier(taskId, optId, prodId, supplier){
  const t = TASKS.find(x => x.id === taskId); if(!t) return;
  const o = (t.options || []).find(x => x.id === optId); if(!o) return;
  const p = (o.products || []).find(x => x.id === prodId); if(!p) return;
  const offer = offersForSku(p.sku).find(x => x.supplier === supplier); if(!offer) return;
  p.supplier = supplier;
  p.parts = _fmtDollars(offer.price);
  recomputeOptionFromProducts(t, o);
  toast(`${p.product} · buying from ${supplierName(supplier)} at ${_fmtDollars(offer.price)}`);
  renderAll();
}
