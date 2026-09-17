function renderProgress(){
  const body = document.getElementById('workBody');
  const sel = selId ? TASKS.find(t=>t.id===selId) : null;
  // Roll-up "Recent updates across the project" now only shows when NOTHING
  // is selected (no task AND no group). If a group is selected the tab
  // renders a group-focused drill-in below; if a task is selected the
  // task drill-in further down.
  if(!sel && !selGroupKey){
    // Grab up to 8 most-recent activities across all tasks (rough: take
    // first from each task, take newest by daysAgo).
    const all = [];
    TASKS.forEach(t=>{
      activitiesFor(t).slice(0,1).forEach(a => all.push({...a, task:t}));
    });
    all.sort((x,y)=>x.daysAgo - y.daysAgo);
    const items = all.slice(0, 8);
    // Per-group sections. Uses the sidebar's current groupBy so users see
    // progress organized the same way they've organized the sidebar.
    const groups = (typeof groupTasks === 'function')
      ? groupTasks(TASKS)
      : ROOMS.map(r => ({key:r, name:r, items: TASKS.filter(t => t.room === r)}));
    // ── Scope-wide aggregates for the overview box ──
    const sCost   = TASKS.reduce((s,t)=>s+dollars(t.cost), 0);
    const sTotal  = (typeof __KAI_SCOPE_TOTAL_OVERRIDE !== 'undefined' && __KAI_SCOPE_TOTAL_OVERRIDE)
                    ? __KAI_SCOPE_TOTAL_OVERRIDE : money(sCost);
    const sGcs    = new Set(TASKS.map(t=>t.gc).filter(Boolean));
    const sMods   = TASKS.reduce((s,t)=>s+(t.mods||[]).length, 0);
    const sGroups = groups.filter(g=>g.items.length).length;
    const sDone   = TASKS.filter(t=>t.status === 'complete').length;
    const scopeHdr = `<div class="pgd-hdr-box">
      <div class="pgd-title-sec">
        <div class="pgd-title-top">
          <div class="pgd-title-l">
            <div class="pgd-subtitle">Scope <span class="pgd-subtitle-sep">·</span> ${TASKS.length} ${TASKS.length===1?'task':'tasks'} across ${sGroups} ${sGroups===1?'group':'groups'}</div>
            <div class="pgd-title-row">
              <div class="pgd-title">3484 South Main Street</div>
              <span class="pgd-code">${esc(currentVersionId || 'v3')}</span>
            </div>
          </div>
        </div>
      </div>
      <div class="pgd-details-sec">
        <div class="pgd-details-grid pgd-details-row pgd-details-row5">
          <div class="pgd-detail-item">
            <span class="pgd-detail-lbl">Tasks</span>
            <span class="pgd-detail-val">${TASKS.length} <span class="pgd-muted" style="font-weight:400">(${sDone} complete)</span></span>
          </div>
          <div class="pgd-detail-item">
            <span class="pgd-detail-lbl">Groups</span>
            <span class="pgd-detail-val">${sGroups}</span>
          </div>
          <div class="pgd-detail-item">
            <span class="pgd-detail-lbl">Contractors</span>
            <span class="pgd-detail-val">${sGcs.size ? sGcs.size : '<span class="pgd-muted">None assigned</span>'}</span>
          </div>
          <div class="pgd-detail-item">
            <span class="pgd-detail-lbl">Modifiers</span>
            <span class="pgd-detail-val">${sMods
              ? `${sMods} <span class="pgd-muted" style="font-weight:400">${sMods===1?'modifier':'modifiers'}</span>`
              : '<span class="pgd-muted">None</span>'}</span>
          </div>
          <div class="pgd-detail-item">
            <span class="pgd-detail-lbl">Total</span>
            <span class="pgd-detail-val pgd-accent">${sTotal}</span>
          </div>
        </div>
      </div>
    </div>`;
    // Default: only the first group expanded to keep the initial view scannable.
    if(progExpanded === null){
      progExpanded = new Set(groups.slice(0,1).map(g=>g.key));
    }
    const groupSectionsHtml = groups.map(g => {
      if(!g.items.length) return '';
      const isExpanded = progExpanded.has(g.key);
      const groupActivities = activitiesForGroup(g.key);
      const gPhotos = photosForGroupInProgress(g.key);
      return `<div class="prog-group-sec ${isExpanded?'is-open':''}">
        <button class="prog-group-head" onclick="toggleProgGroup('${g.key}')">
          <svg class="prog-group-caret" viewBox="0 0 12 12" fill="none"><path d="M3 4.5L6 7.5l3-3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
          <span class="prog-group-name">${g.name}</span>
          <span class="prog-group-meta">${g.items.length} ${g.items.length===1?'task':'tasks'} · ${groupActivities.length} ${groupActivities.length===1?'update':'updates'}${gPhotos.length?` · ${gPhotos.length} ${gPhotos.length===1?'photo':'photos'}`:''}</span>
        </button>
        ${isExpanded?`
          ${gPhotos.length?`<div class="prog-group-photos">${gPhotos.slice(0,10).map((p,i)=>`<div class="prog-card-photo" style="background:${_progPhotoBg(p.seed||i)}" title="${p.kind==='group'?g.name:'task photo'}"></div>`).join('')}</div>`:''}
          <div class="prog-list">${groupActivities.slice(0,6).map((a,i)=>progCardHtml(a, (g.key.length+i)*3)).join('')}</div>
        `:''}
      </div>`;
    }).join('');
    // ── Scope timeline: lifecycle milestones as the spine, with the task-level
    // work between them folded into collapsible rollups. Keeps the project
    // readable as a narrative instead of ~80 interleaved entries.
    let rows = scopeTimeline();
    if(actFilter === 'sc:ms'){
      rows = rows.filter(r => r.type === 'ms');                     // pure phase view
    } else if(actFilter === 'ev:note' || actFilter === 'ev:photos'){
      // Update filters drop the milestones and flatten the rollups so only the
      // matching entries show.
      const flat = rows.filter(r=>r.type==='roll').flatMap(r=>r.items)
        .filter(actPasses).sort((a,b)=>a.daysAgo-b.daysAgo);
      rows = flat.map(e => ({type:'flat', e}));
    }
    if(actSearch.trim()){
      rows = rows.filter(r => {
        if(r.type === 'ms')   return [r.label, r.sub, r.who].join(' ').toLowerCase().includes(actSearch.trim().toLowerCase());
        if(r.type === 'flat') return actMatchesText(r.e);
        if(r.type === 'roll') return r.items.some(actMatchesText);  // keep gaps with a hit
        return true;
      });
    }
    const msCount = rows.filter(r=>r.type==='ms').length;
    const timelineHtml = rows.map(r =>
      r.type === 'ms'   ? scopeMsHtml(r)
    : r.type === 'roll' ? scopeRollHtml(r)
    :                     tlxRowHtml(r.e, 0, rows.length, (r.e._task?.id||1))
    ).join('');
    // User-posted project updates (from the composer) — render at the top of
    // the timeline as tlx-rows so they slot into the same visual language as
    // the fixture rows below them. Newest-first (unshifted on post).
    const userUpdatesHtml = PROJECT_UPDATES.map(u => _projUpdateRowHtml(u)).join('');
    body.innerHTML = `<div class="pgd">
      ${actCtrlBarHtml(rows.length)}
      ${scopeHdr}
      <div class="pgd-details-sec">
        <div class="pgd-details-title">Job activity</div>
        ${_projComposerHtml()}
        <div class="tlx">${userUpdatesHtml}${timelineHtml || (userUpdatesHtml ? '' : `<div class="pgd-muted" style="padding:16px 0">No activity matches the current filter.</div>`)}</div>
      </div>
    </div>`;
    return;
  }
  // ── Group-focused drill-in ───────────────────────────────────────────
  // Selected via clicking the group name in the sidebar. Mirrors the task
  // drill-in shape (photo strip on top, actions, details, activities) but
  // is scoped to a whole room / contractor group.
  if(!sel && selGroupKey){
    body.innerHTML = _renderGroupPageHtml({includeActivity: true, taskOnClick: 'pgdGoto'});
    return;
  }
  // Task-focused view — ported from scope-review.html's task-detail modal
  // and adapted for the tab layout: photo strip on top, actions + details
  // in the middle, activity feed below.
  const feed = activitiesFor(sel);
  // ── Prev / next task navigation within the sidebar's current group ──
  const grpTasksArr = TASKS.filter(t => (groupBy === 'contractor')
    ? (t.gc || 'unassigned') === (sel.gc || 'unassigned')
    : t.room === sel.room);
  const idxInGrp = grpTasksArr.findIndex(t => t.id === sel.id);
  const prevTask = grpTasksArr[idxInGrp - 1] || null;
  const nextTask = grpTasksArr[idxInGrp + 1] || null;
  const groupLabel = (groupBy === 'contractor') ? (sel.gc || 'Unassigned') : sel.room;
  // ── Photo strip — task photos + first group photos, horizontal scroll ──
  if(typeof seedPhotos === 'function' && (!PHOTOS || !PHOTOS.length)) seedPhotos();
  const taskPhotos = (PHOTOS || []).filter(p => p.kind === 'task' && p.task === sel.code);
  const grpPhotos  = (PHOTOS || []).filter(p => p.kind === 'group' && p.room === sel.room).slice(0, 4);
  const allPhotos = [...taskPhotos, ...grpPhotos];
  const photoStripHtml = allPhotos.length
    ? `<div class="pgd-photos">${allPhotos.map((p,i) => {
        const bg = _photoBg(p, i);
        const kindCls = p.kind === 'group' ? ' pgd-photo-group' : '';
        const walk = (p.walk && typeof walkFor === 'function') ? walkFor(p.walk) : null;
        const walkTag = walk ? `<span class="pgd-photo-walk">${esc(walk.short)}</span>` : '';
        // A photo has no date of its own — its date IS its walk's date.
        const dateLbl = walk && walk.date ? `<span class="pgd-photo-date">${esc(walk.date)}</span>` : '';
        return `<figure class="pgd-photo-fig">
          <button class="pgd-photo${kindCls}" style="background:${bg}" onclick="openGalleryPhoto(${p.id||0})" title="${esc(p.kind === 'group' ? sel.room + ' · group' : sel.name + ' · task photo')}${walk ? ' · ' + esc(walk.label) : ''}">
            ${walkTag}
          </button>
          ${dateLbl}
        </figure>`;
      }).join('')}</div>`
    : `<div class="pgd-photos-empty">No photos yet for this task</div>`;
  // ── Details fields (derive from task shape) ──
  const total   = sel.cost || '$0';
  const qtyStr  = sel.qty || '—';
  const unitPr  = sel.rate || '—';
  // Highlighted fields. Contractor / product / modifiers only count as "set"
  // when they actually carry a value — an unassigned contractor or an
  // unselected product reads as a gap, not a value.
  const hasGc      = !!sel.gc;
  const hasProduct = !!sel.product && !/not selected/i.test(sel.product);
  const modsArr    = sel.mods || [];
  const modChips = modsArr.map(a => {
    const info = (typeof tagInfo === 'function') ? tagInfo(a) : {label:a};
    return `<span class="pgd-mod-chip">${esc(info.label || a)}</span>`;
  }).join('');
  // ── Action button state ──
  const isApproved = approved.has(sel.id);
  const isEditReq  = !!sel.editRequested;
  // ── Activity: same timeline as the group level, scoped to THIS task ──
  // Milestone: this task reached complete. System-detected, not a user action.
  const feedAll = [...feed];
  if(sel.status === 'complete'){
    feedAll.unshift({
      daysAgo:0, kind:'complete', ev:'milestone', status:'complete',
      _isMilestone:true, task:sel,
      title:`${sel.name} complete`,
      sub:`All work on this task is finished and signed off. Ready for closeout.`
    });
  }
  const tFeed = feedAll.filter(actPasses).filter(actMatchesText).slice(0, 14);
  const activityCards = tFeed.map((a,i) => tlxRowHtml(a, i, tFeed.length, sel.id)).join('');
  body.innerHTML = `<div class="pgd">
    <!-- Prev / Next task navigation floats in the bottom-right corner
         (see .shop-nav-float). The old inline text-link nav row was
         removed — the floating pair does the same job everywhere. -->
    <div class="shop-nav-float">
      <button class="shop-nav-btn" onclick="shopNav(-1)" ${shopNavHasPrev()?'':'disabled'} title="Previous task">${svgChevL()} Previous task</button>
      <button class="shop-nav-btn" onclick="shopNav(1)" ${shopNavHasNext()?'':'disabled'} title="Next task">Next task ${svgChevR()}</button>
    </div>
    <!-- Search bar, overview details card, and photo strip removed —
         task-focused Activity view now goes straight from prev/next
         nav → update composer → activity feed for a cleaner reading. -->

    ${(PROJ_MODE === 'work' || PROJ_MODE === 'closeout') ? (() => {
      // Task-scoped update composer — post a note + photos + optional
      // status change to this task's activity. Only surfaces in work
      // and closeout modes where progress updates are the whole point.
      const statusOptions = [
        {key:'', label:'Change status…'},
        {key:'not_started', label:'Mark as Not started'},
        {key:'in_progress', label:'Mark as In progress'},
        {key:'needs_rework', label:'Mark as Rework'},
        {key:'complete', label:'Mark as Completed'},
      ];
      const optHtml = statusOptions.map(o =>
        `<option value="${o.key}"${o.key===taskComposerStatus?' selected':''}>${o.label}</option>`
      ).join('');
      const photoTiles = taskComposerPhotos.map((p,i) => `<div class="tk-comp-photo" style="background:${_progPhotoBg(p.seed||i)}">
        <button class="tk-comp-photo-x" onclick="event.stopPropagation();taskComposerRemovePhoto(${i})" aria-label="Remove photo">×</button>
      </div>`).join('');
      const canPost = taskComposerNote.trim().length > 0 || taskComposerPhotos.length > 0 || (taskComposerStatus && taskComposerStatus !== sel.status);
      // Current status shown as a plain-text pill outside the dropdown;
      // the dropdown is the "change to…" control next to it.
      const curStatus = STATUS[sel.status] || STATUS.not_started;
      return `<div class="pgd-details-sec">
        <div class="pgd-details-title">Add an update</div>
        <div class="tk-composer">
          <textarea class="tk-comp-note" placeholder="Add an update" oninput="taskComposerSetNote(this.value)">${esc(taskComposerNote||'')}</textarea>
          <div class="tk-comp-controls">
            <label class="tk-comp-status">
              <span class="tk-comp-status-lbl">Status</span>
              <span class="tk-comp-status-current ${curStatus.cls||''}">${esc(curStatus.label)}</span>
              <span class="tk-comp-status-sel">
                <select onchange="taskComposerSetStatus(this.value)" aria-label="Change task status">${optHtml}</select>
                <svg class="tk-comp-status-caret" viewBox="0 0 12 12" fill="none"><path d="M3 4.5l3 3 3-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </span>
            </label>
            <button class="tk-comp-photobtn" onclick="event.stopPropagation();taskComposerAddPhoto()" title="Attach a photo">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="12" height="10"/><circle cx="6" cy="7" r="1.2"/><path d="M2 11l4-4 3 3 2-2 5 4"/></svg>
              Add photo
            </button>
            ${photoTiles ? `<div class="tk-comp-photos">${photoTiles}</div>` : ''}
            <button class="tk-comp-post${canPost?' is-active':''}" onclick="event.stopPropagation();postTaskUpdate(${sel.id})">Post update</button>
          </div>
        </div>
      </div>` ;
    })() : ''}
    <div class="pgd-details-sec">
      <div class="pgd-details-title">Task activity</div>
      <div class="tlx">${activityCards || `<div class="pgd-muted" style="padding:16px 0">${(actFilter==='all' && !actSearch) ? 'No activity yet.' : 'No activity matches the current filter.'}</div>`}</div>
    </div>
  </div>`;
}
/* Jump to the Pano tab, keeping the current selection. renderPano() already
   reads selId / sel.room, so a task lands on that task's photo stack and a
   group lands on the room — no extra plumbing needed. */
/* Prev/next nav handler for the Progress tab task drill-in view. */
function pgdGoto(id){
  selId = id;
  openIds.clear(); openIds.add(id);
  if(typeof renderSidebar === 'function') renderSidebar();
  if(typeof renderProgress === 'function') renderProgress();
}
// Sidebar "Update progress" button (work/closeout stages) — selects the task
// AND switches the right panel to the Progress tab so the user lands directly
// on the task's progress drill-in with its photo strip, action buttons, and
// activity feed.
function artOpenPhoto(code, idx){
  artLightbox = {code, idx};
  document.body.classList.add('art-lb-open');
  artRenderLightbox();
}
function artCloseLightbox(){
  document.body.classList.remove('art-lb-open');
  artLightbox = {code:null, idx:0};
}
function artStepPhoto(delta){
  const t = TASKS.find(x=>x.code===artLightbox.code); if(!t) return;
  const n = t.photos||0;
  if(!n) return;
  artLightbox.idx = (artLightbox.idx + delta + n) % n;
  artRenderLightbox();
}
function artRenderLightbox(){
  const box = document.getElementById('artLightbox');
  if(!box) return;
  const t = TASKS.find(x=>x.code===artLightbox.code);
  if(!t){ box.innerHTML=''; return; }
  const cap = ART_PHOTO_CAPS[artLightbox.idx] || `Photo ${artLightbox.idx+1}`;
  box.innerHTML = `
    <div class="art-lb-scrim" onclick="artCloseLightbox()"></div>
    <div class="art-lb-card">
      <div class="art-lb-hd">
        <div class="art-lb-hd-l">
          <div class="art-lb-eyebrow">${t.code} · ${t.room}</div>
          <div class="art-lb-title">${t.name}</div>
        </div>
        <button class="art-lb-x" onclick="artCloseLightbox()" aria-label="Close">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 4L16 16M16 4L4 16" stroke-linecap="round"/></svg>
        </button>
      </div>
      <div class="art-lb-stage">
        <button class="art-lb-nav prev" onclick="artStepPhoto(-1)" ${(t.photos||0)<2?'style="display:none"':''} aria-label="Previous">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M15 5l-7 7 7 7" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <div class="art-lb-photo">
          <svg viewBox="0 0 24 24" fill="none"><path d="M22.4286 1.4H1.4286V22.4H22.4286V1.4Z" stroke="currentColor" stroke-miterlimit="10"/><path d="M10.2707 9.4132L8.0602 10.7947L5.8497 9.4132V7.2026L8.0602 5.821L10.2707 7.2026V9.4132Z" stroke="currentColor" stroke-miterlimit="10"/><path d="M15.2444 9.1368L11.9286 14.6632L9.1654 13.5579L6.9549 16.8737H18.0075L15.2444 9.1368Z" stroke="currentColor" stroke-miterlimit="10"/></svg>
        </div>
        <button class="art-lb-nav next" onclick="artStepPhoto(1)" ${(t.photos||0)<2?'style="display:none"':''} aria-label="Next">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M9 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
      </div>
      <div class="art-lb-ft">
        <div class="art-lb-cap"><span class="art-lb-cap-k">Caption</span> ${cap}</div>
        <div class="art-lb-idx">${artLightbox.idx+1} / ${t.photos||0}</div>
      </div>
    </div>`;
}
document.addEventListener('keydown', e => {
  if(!document.body.classList.contains('art-lb-open')) return;
  if(e.key==='Escape') artCloseLightbox();
  if(e.key==='ArrowLeft') artStepPhoto(-1);
  if(e.key==='ArrowRight') artStepPhoto(1);
});

function isTenantTask(t){
  if(t.mods && t.mods.includes('tenant')) return true;
  // Regex fallback for demo tasks that carry "Resident install / supplied"
  // in their opt/product strings but weren't tagged with the mod.
  return /resident|tenant/i.test(t.opt||'') || /resident|tenant/i.test(t.product||'');
}

/* ── Artifact tab = Scope copies ────────────────────────────────────────
   No editing here anymore — copies are filterable snapshots that share a
   link with a recipient. The dispatcher branches on openCopyId: null
   renders the index of copies; anything else renders the doc view for
   that copy (breadcrumb + filter strip + paper). */
