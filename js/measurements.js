function renderPanoCloseout(){
  _pcInitState();
  const body = document.getElementById('workBody');
  if(typeof seedPhotos === 'function' && (!PHOTOS || !PHOTOS.length)) seedPhotos();
  const slots = _pcBuildSlots();
  const idx = __pcState.currentIdx;
  // Two tiers now — a bar for the group, nested bars for the tasks in it. See
  // _pcHeadHtml.
  const head = _pcHeadHtml(slots, idx);
  const bandA = _pcBandHtml('A', slots);
  // Scope-review stage has nothing to compare against — only the initial
  // walk exists, so we hide the "+ Add date" affordance entirely.
  const bandB = __pcState.bandBVisible
    ? _pcBandHtml('B', slots)
    : (PROJ_MODE === 'review' ? '' :
      `<button class="tl-add-band" onclick="_pcAddBand()"><span style="font-size:14px;line-height:1">+</span> Add date</button>`);
  // "Only show tasks with photos" now lives in the tabs row (see
  // renderWorkHdr's scopeTools), not as a standalone bar here.
  body.innerHTML = `<div class="tl-root">
    <div class="tl-hilite" id="tlHilite" hidden></div>
    ${head}
    <div class="tl-body">${bandA}${bandB}</div>
    ${_pcSliderHtml(slots)}
  </div>`;
  // The column count is a function of width, and the width can move without
  // anything re-rendering this tab. _pcWatchSize explains why it is a poll.
  if(typeof _pcWatchSize === 'function') _pcWatchSize();
  /* Straight away, not on a frame callback. Reading a rect forces layout, so the
     measurement is correct the moment the markup is in — and requestAnimationFrame
     does not reliably fire for this iframe anyway, the same way ResizeObserver
     does not. */
  if(typeof _pcPlaceHilite === 'function') _pcPlaceHilite();
}

function renderPano(){
  // Pano now uses the compare-walks timeline grid across every project
  // stage — same layout in draft, review, work, and closeout. When the
  // scope hasn't left the initial walk yet (no progress / change-order /
  // close-out photos seeded), _pcInitState() opens with just Band A on
  // the initial walk so the tab reads as "one walk so far" instead of a
  // half-empty compare view.
  //
  // Note: since auto-select-first-task, `selId` is effectively always
  // set — the old task-scoped strips layout below is unreachable and
  // kept only as a fallback reference. Always route to the timeline.
  renderPanoCloseout();
  return;
  const body = document.getElementById('workBody');
  const sel = selId ? TASKS.find(t => t.id === selId) : null;
  if(typeof seedPhotos === 'function' && typeof PHOTOS !== 'undefined' && !PHOTOS.length) seedPhotos();
  const allRooms = (typeof ROOMS !== 'undefined' && ROOMS.length) ? ROOMS : [...new Set(TASKS.map(t => t.room))];
  const controlsHtml = _panoControls(allRooms);
  if(sel){
    const taskPhotos_  = filterByWalk((typeof PHOTOS !== 'undefined') ? PHOTOS.filter(p => p.kind==='task'  && p.task === sel.code) : []);
    const groupPhotos_ = filterByWalk((typeof PHOTOS !== 'undefined') ? PHOTOS.filter(p => p.kind==='group' && p.room === sel.room) : []);
    body.innerHTML = `<div class="pano">
      ${controlsHtml}
      <div class="pano-taskhead" style="border-color:${roomColor(sel.room)}">
        <div class="pano-taskhead-l">
          <div class="eyebrow" style="color:${roomColor(sel.room)}">${sel.room} · ${sel.code}</div>
          <div class="name">${sel.name}</div>
        </div>
        <div class="pano-taskhead-r">
          ${taskPhotos_.length} task photos<br>
          ${groupPhotos_.length} group photos
        </div>
      </div>
      <div class="pano-sec">
        ${_panoStrip('Task photos · ' + sel.name, taskPhotos_)}
        ${_panoStrip('Group photos · ' + sel.room, groupPhotos_)}
      </div>
    </div>`;
    return;
  }
  const sectionsHtml = allRooms.map(room => {
    const roomTasks = TASKS.filter(t => t.room === room);
    if(!roomTasks.length) return '';
    const taskCodes = new Set(roomTasks.map(t => t.code));
    const taskPhotos_  = filterByWalk((typeof PHOTOS !== 'undefined') ? PHOTOS.filter(p => p.kind==='task'  && taskCodes.has(p.task)) : []);
    const groupPhotos_ = filterByWalk((typeof PHOTOS !== 'undefined') ? PHOTOS.filter(p => p.kind==='group' && p.room === room)      : []);
    const total = taskPhotos_.length + groupPhotos_.length;
    const color = roomColor(room);
    return `<div class="pano-sec" style="border-left:3px solid ${color}">
      <div class="pano-sec-hdr">
        <span class="pano-sec-name" style="color:${color}">${room}</span>
        <span class="pano-sec-meta">${roomTasks.length} ${roomTasks.length===1?'task':'tasks'} · ${total} ${total===1?'photo':'photos'}</span>
        <span class="pano-sec-rule"></span>
      </div>
      ${_panoStrip('Task photos', taskPhotos_)}
      ${_panoStrip('Group photos', groupPhotos_)}
    </div>`;
  }).join('');
  body.innerHTML = `<div class="pano">${controlsHtml}${sectionsHtml}</div>`;
}

/* ── PROGRESS view: task activity feed ─────────────────────────────
   Chronological cards of "progress walks" per task — notes + status +
   photos, timestamped. Real data would come from field-agent uploads;
   here we synthesize a plausible feed from each task's shape (photos,
   status, gc) so every task has something to show. */
const PROGRESS_PEOPLE = [
  {who:'Shane D.',   role:'Contractor'},
  {who:'R. Garcia',  role:'Contractor'},
  {who:'M. Alvarez', role:'Field agent'},
  {who:'Eric L.',    role:'Field agent'},
  {who:'T. Okafor',  role:'Project manager'},
];
// User-posted updates land at the top of the appropriate feed. Empty by
// default — the Progress tab's activitiesFor / activitiesForGroup guard on
// `typeof USER_EVENTS !== 'undefined'`, so it's safe to keep them declared
// here even if no update-panel wiring is present.
let USER_EVENTS = {};        // taskId  → [events]
let USER_GROUP_EVENTS = {};  // groupKey → [events]
let PROJECT_UPDATES = [];    // scope-level user updates (from the composer)
// Project-activity composer state — text + photo queue + attach target,
// cleared on Save. Target values: 'scope' | `grp:${key}` | `task:${id}`.
let projComposerNote = '';
let projComposerPhotos = [];
let projComposerTarget = 'scope';
function projComposerSetNote(v){ projComposerNote = v; }
function projComposerSetTarget(v){ projComposerTarget = v || 'scope'; }
function projComposerAddPhoto(){
  projComposerPhotos.push({ seed:(projComposerPhotos.length+1)*11 + (Date.now()%37) });
  if(typeof renderProgress === 'function') renderProgress();
}
function projComposerRemovePhoto(i){
  projComposerPhotos.splice(i,1);
  if(typeof renderProgress === 'function') renderProgress();
}
function projComposerClear(){ projComposerNote = ''; projComposerPhotos = []; projComposerTarget = 'scope'; }
// ── Task-scoped update composer (Activity tab, work/closeout only) ──
// Lives on top of the Task Activity list in a task drill-in. Lets a user
// post a new note + photo(s) and optionally advance the task status.
let taskComposerNote = '';
let taskComposerPhotos = [];
let taskComposerStatus = ''; // '' = no change; otherwise a STATUS key
function taskComposerSetNote(v){ taskComposerNote = v; }
function taskComposerSetStatus(v){ taskComposerStatus = v; }
function taskComposerAddPhoto(){
  taskComposerPhotos.push({ seed: (taskComposerPhotos.length + 1) * 17 + (Date.now() % 41) });
  if(typeof renderProgress === 'function') renderProgress();
}
function taskComposerRemovePhoto(i){
  taskComposerPhotos.splice(i, 1);
  if(typeof renderProgress === 'function') renderProgress();
}
function taskComposerClear(){ taskComposerNote = ''; taskComposerPhotos = []; taskComposerStatus = ''; }
function postTaskUpdate(tid){
  const t = TASKS.find(x => x.id === tid); if(!t) return;
  const note = (taskComposerNote||'').trim();
  const statusChange = taskComposerStatus && taskComposerStatus !== t.status ? taskComposerStatus : '';
  if(!note && !taskComposerPhotos.length && !statusChange){
    if(typeof toast === 'function') toast('Add a note, photo, or status change first');
    return;
  }
  // Capture the OLD status before applying the change, then update the
  // task so the sidebar chip + card dropdown reflect the new state.
  const oldStatus = t.status;
  if(statusChange){
    t.status = statusChange;
    if(statusChange !== 'not_started' && Array.isArray(t.flags)){
      t.flags = t.flags.filter(f => f !== 'missing');
    }
  }
  if(!USER_EVENTS[t.id]) USER_EVENTS[t.id] = [];
  USER_EVENTS[t.id].unshift({
    id: `usr-${Date.now()}`,
    daysAgo: 0,
    kind: 'progress',
    ev: statusChange ? 'status' : 'note',
    person: { who: 'You', role: 'Admin' },
    note,
    photoCount: taskComposerPhotos.length,
    status: statusChange || t.status,
    statusFrom: statusChange ? oldStatus : undefined,
  });
  taskComposerClear();
  if(typeof renderAll === 'function') renderAll();
  if(typeof toast === 'function') toast(`Update posted to ${t.name}`);
}
function postProjectUpdate(){
  const note = (projComposerNote||'').trim();
  if(!note && !projComposerPhotos.length){
    if(typeof toast === 'function') toast('Add a note or a photo first');
    return;
  }
  const target = projComposerTarget || 'scope';
  const photoCount = projComposerPhotos.length;
  const commonEvt = {
    id: `usr-${Date.now()}`,
    daysAgo: 0,
    kind: 'progress',
    ev: 'note',
    person: { who:'You', role:'Admin' },
    note,
    photoCount,
    status: 'in_progress',
  };
  let targetLabel = 'the project';
  if(target === 'scope'){
    // Scope-level → stack at the top of the Project activity timeline
    PROJECT_UPDATES.unshift({
      id: `proj-${Date.now()}`,
      when: 'Just now',
      who:  'You',
      role: 'Admin',
      note,
      photos: [...projComposerPhotos],
    });
    targetLabel = 'the scope';
  } else if(target.startsWith('grp:')){
    const key = target.slice(4);
    if(!USER_GROUP_EVENTS[key]) USER_GROUP_EVENTS[key] = [];
    USER_GROUP_EVENTS[key].unshift({ ...commonEvt, _isGroup:true, group:key });
    targetLabel = key;
  } else if(target.startsWith('task:')){
    const tid = parseInt(target.slice(5), 10);
    const t = TASKS.find(x => x.id === tid);
    if(t){
      if(!USER_EVENTS[t.id]) USER_EVENTS[t.id] = [];
      USER_EVENTS[t.id].unshift({ ...commonEvt });
      targetLabel = t.name;
    }
  }
  projComposerClear();
  if(typeof renderProgress === 'function') renderProgress();
  if(typeof toast === 'function') toast(`Update saved to ${targetLabel}`);
}
// Build the nested "attach to" options list — Scope first, then each group
// with its tasks nested under it (via <optgroup>) so the picker reads as a
// scope → group → task hierarchy.
function _projComposerTargetOptions(){
  const groups = (typeof groupTasks === 'function')
    ? groupTasks(TASKS)
    : ROOMS.map(r => ({key:r, name:r, items: TASKS.filter(t => t.room === r)}));
  const scopeOpt = `<option value="scope"${projComposerTarget==='scope'?' selected':''}>Scope</option>`;
  const grpOpts = groups.filter(g => g.items.length).map(g => {
    const gVal = `grp:${g.key}`;
    const gSel = projComposerTarget === gVal ? ' selected' : '';
    const tasks = g.items.map(t => {
      const tVal = `task:${t.id}`;
      const tSel = projComposerTarget === tVal ? ' selected' : '';
      return `<option value="${tVal}"${tSel}>&nbsp;&nbsp;&nbsp;&nbsp;${esc(t.name)}</option>`;
    }).join('');
    return `<optgroup label="${esc(g.name)}">
      <option value="${gVal}"${gSel}>${esc(g.name)} group</option>
      ${tasks}
    </optgroup>`;
  }).join('');
  return scopeOpt + grpOpts;
}
// HTML for a single posted project update — reuses the tlx-row visual language
// so it slots naturally at the top of the timeline as if it were another entry.
function _projUpdateRowHtml(u){
  const photos = u.photos && u.photos.length
    ? `<div class="tlx-photos">${u.photos.map(p =>
        `<div class="tlx-photo" style="background:${_progPhotoBg(p.seed||0)}" title="Attached photo"></div>`
      ).join('')}</div>`
    : '';
  const noteHtml = u.note ? `<div class="tlx-note"><span class="tlx-note-lbl">Note</span>&ldquo;${esc(u.note)}&rdquo;</div>` : '';
  const bodyBox  = noteHtml ? `<div class="tlx-body">${noteHtml}</div>` : '';
  return `<div class="tlx-row is-user">
    <div class="tlx-rail">
      <div class="tlx-line top"></div>
      <div class="tlx-node is-user"></div>
      <div class="tlx-line bot"></div>
    </div>
    <div class="tlx-card">
      <div class="tlx-hd">
        <div class="tlx-hd-l">
          <span class="tlx-task">Project</span>
          <span class="tlx-who"><b>${esc(u.who)}</b><span class="tlx-verb">posted an update</span></span>
        </div>
        <div class="tlx-hd-r">
          <span class="tlx-time">${esc(u.when)}</span>
        </div>
      </div>
      ${bodyBox}
      ${photos}
    </div>
  </div>`;
}
// Composer card at the top of the Project activity list. Free-form note +
// optional photo attachments + a nested "attach to" picker + Save button.
function _projComposerHtml(){
  const photosPrev = projComposerPhotos.length
    ? `<div class="proj-comp-photos">${projComposerPhotos.map((p,i)=>`<div class="proj-comp-photo" style="background:${_progPhotoBg(p.seed||i)}"><button class="proj-comp-photo-x" onclick="event.stopPropagation();projComposerRemovePhoto(${i})" aria-label="Remove photo">×</button></div>`).join('')}</div>`
    : '';
  return `<div class="proj-composer" onclick="event.stopPropagation()">
    <textarea class="proj-comp-note" placeholder="Add an update" oninput="projComposerSetNote(this.value)">${esc(projComposerNote)}</textarea>
    ${photosPrev}
    <div class="proj-comp-actions">
      <button class="proj-comp-attach" onclick="event.stopPropagation();projComposerAddPhoto()">
        <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="10" height="8" rx="1"/><circle cx="5" cy="6" r="1"/><path d="M2 9l3-3 3 3 2-2 2 2"/></svg>
        Add photo
      </button>
      <label class="proj-comp-target">
        <span class="proj-comp-target-lbl">Attach to</span>
        <span class="proj-comp-target-sel">
          <select onchange="projComposerSetTarget(this.value)" aria-label="Attach update to">
            ${_projComposerTargetOptions()}
          </select>
          <svg class="proj-comp-target-caret" viewBox="0 0 12 12" fill="none"><path d="M3 4.5l3 3 3-3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </span>
      </label>
      <span class="proj-comp-spacer"></span>
      <button class="proj-comp-post" onclick="event.stopPropagation();postProjectUpdate()">Save update</button>
    </div>
  </div>`;
}
function _progPerson(seed){ return PROGRESS_PEOPLE[seed % PROGRESS_PEOPLE.length]; }
function _progDate(daysAgo){
  const d = new Date(2026, 6, 4);
  d.setDate(d.getDate() - daysAgo);
  const M=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const h=String((10+daysAgo*3)%24).padStart(2,'0');
  const m=String((15+daysAgo*7)%60).padStart(2,'0');
  return `${M[d.getMonth()]} ${d.getDate()} · ${h}:${m}`;
}
// Build a plausible activity feed for a task based on its underlying shape.
// Cards are returned newest → oldest.
/* ── ACTIVITY : change events ──────────────────────────────────────────
   Each entry is ONE event = one thing that changed. An event may carry
   attachments (photos and/or a note), but it never bundles two changes.

   Shape:
     {daysAgo, kind, ev, task, person, field, from, to, status,
      note, photoCount}
     ev    : 'status' | 'contractor' | 'photos' | 'note' | 'product' | 'cost'
     from/to : the delta. Rendered as  from → to.
     status  : resulting task status AFTER this event (drives the node pill).
   The old generator wrote finished prose ("Materials arrived on site…")
   and mixed changes with current-values ("Contractor: Apex Carpentry" —
   which is a state, not a change). This emits deltas only. */
function activitiesFor(t){
  const feed = [];
  const seed  = t.id;
  const gc    = t.gc || 'Unassigned';
  const photos = t.photos || 0;
  const cost  = t.cost || '$0';
  // Era offset: spread each task's history across the project's real span so
  // events fall into plausible phases (between the lifecycle milestones).
  const ERA = [0, 12, 26, 41, 58, 74, 96, 118, 131][t.id % 9];
  const push = (o) => feed.push({task:t, ...o, daysAgo:(o.daysAgo||0) + ERA});
  // Updates the user posted this session land at the top of the feed.
  const mine = (typeof USER_EVENTS !== 'undefined' && USER_EVENTS[t.id]) || [];
  mine.forEach(e => feed.push({task:t, ...e}));

  // Task statuses are ONLY: not_started · in_progress · needs_rework · complete
  if(t.status === 'complete'){
    push({daysAgo:1, kind:'complete', ev:'status', person:_progPerson(seed),
      field:'Status', from:STATUS.in_progress.label, to:STATUS.complete.label, status:'complete',
      note:'Finished ahead of schedule. Signed off at walkthrough.',
      photoCount:Math.min(4, photos||2)});
    push({daysAgo:5, kind:'progress', ev:'photos', person:_progPerson(seed+2),
      status:'in_progress', photoCount:Math.min(3, Math.max(1, photos-1))});
    push({daysAgo:6, kind:'progress', ev:'note', person:_progPerson(seed+4),
      status:'in_progress',
      note:'Punch list walked with the GC. Two minor touch-ups noted, nothing blocking.'});
    push({daysAgo:8, kind:'progress', ev:'status', person:_progPerson(seed+1),
      field:'Status', from:STATUS.not_started.label, to:STATUS.in_progress.label, status:'in_progress'});

  } else if(t.status === 'in_progress'){
    // Photo-only: mid-work shots. Status does NOT change.
    push({daysAgo:1, kind:'progress', ev:'photos', person:_progPerson(seed),
      status:'in_progress', photoCount:Math.min(3, photos||2)});
    push({daysAgo:2, kind:'progress', ev:'note', person:_progPerson(seed+3),
      status:'in_progress',
      note:'Homeowner asked to keep the existing hardware. Confirmed with designer — no cost impact.'});
    push({daysAgo:3, kind:'progress', ev:'status', person:_progPerson(seed+1),
      field:'Status', from:STATUS.not_started.label, to:STATUS.in_progress.label, status:'in_progress'});
    push({daysAgo:4, kind:'delivered', ev:'contractor', person:_progPerson(seed+2),
      field:'Contractor', from:'Unassigned', to:gc, status:'not_started'});

  } else if(t.status === 'needs_rework'){
    push({daysAgo:1, kind:'flagged', ev:'status', person:_progPerson(seed),
      field:'Status', from:STATUS.in_progress.label, to:STATUS.needs_rework.label, status:'needs_rework',
      note:'Failed inspection. Reverse-panel gaps need to be re-cut.',
      photoCount:Math.min(3, photos||2)});
    push({daysAgo:2, kind:'progress', ev:'photos', person:_progPerson(seed+5),
      status:'needs_rework', photoCount:3});
    push({daysAgo:5, kind:'progress', ev:'note', person:_progPerson(seed+3),
      status:'in_progress',
      note:'Measured twice before the re-cut. Template is off by about an eighth on the left run.'});
    push({daysAgo:7, kind:'progress', ev:'status', person:_progPerson(seed+1),
      field:'Status', from:STATUS.not_started.label, to:STATUS.in_progress.label, status:'in_progress'});

  } else {
    push({daysAgo:2, kind:'delivered', ev:'contractor', person:_progPerson(seed),
      field:'Contractor', from:'Unassigned', to:gc, status:'not_started',
      note:`Kickoff scheduled next week.`});
    push({daysAgo:5, kind:'progress', ev:'note', person:_progPerson(seed+2),
      status:'not_started',
      note:'Owner still deciding on the finish. Waiting on a call back before we start.'});
    push({daysAgo:7, kind:'progress', ev:'cost', person:_progPerson(seed+1),
      field:'Cost', from:'—', to:cost, status:'not_started'});
  }
  return feed;
}

/* A photo's fill. Uploads made through the manager carry the actual file as
   an object URL, so they render as themselves; everything seeded falls back
   to the colour-blocked placeholder. The surfaces that draw a photo at any
   size go through here so the two kinds can't diverge. */
function _photoBg(p, i){
  // Single quotes: this lands inside style="..." in a template string, and
  // double quotes here close the HTML attribute early — the browser then
  // parses the fill as url("") and the tile renders blank.
  if(p && p.src) return `url('${p.src}') center/cover no-repeat`;
  const seed = (p && p.seed) || i || 0;
  return (typeof _progPhotoBg === 'function') ? _progPhotoBg(seed) : 'var(--stroke)';
}
function _progPhotoBg(seed){
  // Colour-blocked SVG placeholders so the surrounding chrome (light tan
  // strip, white detail panel, dark hero backdrop) can be judged against
  // realistic photo content. Palettes are muted renovation tones — wood,
  // stone, sage, dusty blue, terracotta, plaster — with a "floor band" +
  // "cabinet edge" + accent shape so each thumbnail reads as an interior.
  const palettes = [
    {bg:'#C9B79A', floor:'#8F7A5C', wall:'#E4D6BE', acc:'#5A4A38'}, // warm wood
    {bg:'#A9B4A6', floor:'#6B7A6E', wall:'#D5DBD1', acc:'#3E4F44'}, // sage stone
    {bg:'#B0BFC9', floor:'#5F7684', wall:'#D9E1E7', acc:'#334654'}, // dusty blue
    {bg:'#D2A98A', floor:'#8A5B3E', wall:'#EAD3BC', acc:'#5C3822'}, // terracotta
    {bg:'#D6D0C4', floor:'#8E8674', wall:'#EDE7DA', acc:'#4A4438'}, // plaster
    {bg:'#B8A9C2', floor:'#736380', wall:'#E1D6E5', acc:'#3E3448'}, // dusk lilac
  ];
  const p = palettes[Math.abs(seed) % palettes.length];
  // Vary composition a bit per seed (band height, accent x-position, size).
  const bandY = 62 + ((seed*13) % 12);      // 62-73
  const accX = 20 + ((seed*7) % 60);         // 20-79
  const accW = 14 + ((seed*5) % 18);         // 14-31
  const accH = 22 + ((seed*11) % 24);        // 22-45
  const edgeX = 30 + ((seed*17) % 40);       // 30-69
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='xMidYMid slice'>
    <rect width='100' height='100' fill='${p.wall}'/>
    <rect y='${bandY}' width='100' height='${100-bandY}' fill='${p.floor}'/>
    <rect x='${edgeX}' width='0.6' height='${bandY}' fill='${p.acc}' opacity='.35'/>
    <rect x='${accX}' y='${bandY-accH}' width='${accW}' height='${accH}' fill='${p.bg}'/>
    <rect x='${accX}' y='${bandY-accH}' width='${accW}' height='2.5' fill='${p.acc}' opacity='.5'/>
  </svg>`;
  const url = 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  return `${p.wall} url("${url}") center/cover no-repeat`;
}
// Aggregate activities for every task in a group + synthesize a couple of
// group-level activities (walkthrough, materials arriving, punch list, etc.)
// so the group view has group-scoped context alongside its task-scoped feed.
/* ── ACTIVITY tab · filter + search state ─────────────────────────────
   actFilter narrows the activity feed by kind (progress/complete/
   delivered/flagged). actSearch is a typeahead over the TASKS in the
   current level — picking a result drills into that task. */
let actFilter = 'all';
let actSearch = '';
/* Filter has two axes, so values are prefixed:
     st:<key>  → entries whose RESULTING status is <key>
     ev:<kind> → entries that are ONLY a note, or ONLY photos
   Status filters answer "where did things land"; update-type filters answer
   "show me just the notes / just the photo drops". */
const ACT_FILTERS = [
  {v:'all', label:'All activity'},
  {group:'Status', items:[
    // Only the four statuses a TASK can hold. "In review" / "Pending review"
    // are scope-level statuses — filtering tasks by them would always be empty.
    {v:'st:not_started', label:'Not started'},
    {v:'st:in_progress', label:'In progress'},
    {v:'st:needs_rework',label:'Rework'},
    {v:'st:complete',    label:'Completed'},
  ]},
  {group:'Updates', items:[
    {v:'ev:note',   label:'Notes only'},
    {v:'ev:photos', label:'Photos only'},
  ]},
];
// Task level has ONE status, so a Status section would be meaningless there.
// It filters by update type only.
const ACT_FILTERS_TASK = [
  {v:'all', label:'All activity'},
  {group:'Updates', items:[
    {v:'ev:note',   label:'Notes only'},
    {v:'ev:photos', label:'Photos only'},
  ]},
];
// Scope level is a lifecycle narrative — its filter is about phase, not task
// status. "Milestones only" collapses every rollup for a pure phase view.
const ACT_FILTERS_SCOPE = [
  {v:'all', label:'All activity'},
  {group:'View', items:[
    {v:'sc:ms', label:'Milestones only'},
  ]},
  {group:'Updates', items:[
    {v:'ev:note',   label:'Notes only'},
    {v:'ev:photos', label:'Photos only'},
  ]},
];
// Which filter list applies at the current level?
function actFilterList(){
  if(selId) return ACT_FILTERS_TASK;
  if(selGroupKey) return ACT_FILTERS;
  return ACT_FILTERS_SCOPE;
}
// Flat lookup for labels (used by the empty state + trigger button).
const ACT_FILTER_LABEL = (v) => {
  if(v === 'all') return 'All activity';
  for(const list of [ACT_FILTERS, ACT_FILTERS_SCOPE]){
    for(const f of list){
      if(f.items){ const hit = f.items.find(i => i.v === v); if(hit) return hit.label; }
    }
  }
  return '';
};
// Does an entry pass the current filter?
//  st:  match on resulting status.
//  ev:  entry must be ONLY that thing — a note with no change and no photos,
//       or photos with no change and no note.
function actPasses(a){
  if(actFilter === 'all') return true;
  // Milestones are system markers, not updates. They stay visible under status
  // filters that match, but are never "notes only" or "photos only".
  if(a.ev === 'milestone') return actFilter.startsWith('st:') && a.status === actFilter.slice(3);
  if(actFilter.startsWith('st:')) return a.status === actFilter.slice(3);
  if(actFilter === 'ev:note')   return !!a.note && !a.photoCount && a.from === undefined;
  if(actFilter === 'ev:photos') return !!a.photoCount && !a.note && a.from === undefined;
  return true;
}
function setActFilter(v){ actFilter = v; renderWork(); }
// Custom dropdown open/close. Follows the .ver-chip pattern: an .open class
// on the wrapper reveals the menu.
function toggleActFilter(){
  const f = document.getElementById('pgdFilter');
  if(f) f.classList.toggle('open');
}
function pickActFilter(v){
  actFilter = v;
  const f = document.getElementById('pgdFilter');
  if(f) f.classList.remove('open');
  renderWork();
}
// Typeahead: matches tasks in the given group by name / contractor / code.
function actSearchMatches(groupKey){
  const q = (actSearch||'').trim().toLowerCase();
  if(!q) return [];
  // At scope level there is no group — search every task in the project.
  const pool = !groupKey
    ? TASKS
    : (groupKey === '__un'
        ? TASKS.filter(t => !t.gc)
        : (groupBy === 'contractor' ? TASKS.filter(t => t.gc === groupKey) : TASKS.filter(t => t.room === groupKey)));
  return pool.filter(t =>
    (t.name||'').toLowerCase().includes(q) ||
    (t.gc||'').toLowerCase().includes(q) ||
    (t.code||'').toLowerCase().includes(q)
  ).slice(0, 8);
}
function _actHl(text, q){
  if(!q) return esc(text);
  const i = (text||'').toLowerCase().indexOf(q.toLowerCase());
  if(i < 0) return esc(text);
  return esc(text.slice(0,i)) + '<mark>' + esc(text.slice(i, i+q.length)) + '</mark>' + esc(text.slice(i+q.length));
}
// Live typeahead — repaints only the dropdown so the input keeps focus.
function onActSearch(val){
  actSearch = val;
  // At SCOPE level the search also narrows the timeline itself, so we need a
  // full re-render (then restore focus + caret). At group level the timeline
  // isn't search-filtered, so we repaint only the dropdown and keep focus.
  if(!selGroupKey && !selId){
    renderWork();
    const i2 = document.getElementById('pgdSearchInput');
    if(i2){ i2.focus(); i2.setSelectionRange(i2.value.length, i2.value.length); }
  }
  const wrap = document.getElementById('pgdSearchWrap');
  const ta   = document.getElementById('pgdTa');
  if(wrap) wrap.classList.toggle('has-val', !!val);
  if(!ta) return;
  const q = (val||'').trim();
  if(!q){ ta.classList.remove('open'); ta.innerHTML=''; return; }
  const hits = actSearchMatches(selGroupKey);
  ta.innerHTML = hits.length
    ? hits.map(t => `<button class="pgd-ta-item" onclick="actPickTask(${t.id})">
        <span class="pgd-ta-name">${_actHl(t.name, q)}</span>
        <span class="pgd-ta-gc">${esc(t.gc || 'Unassigned')}</span>
        <span class="pgd-ta-cost">${esc(t.cost || '$0')}</span>
      </button>`).join('')
    : `<div class="pgd-ta-empty">No tasks match "${esc(q)}"</div>`;
  ta.classList.add('open');
}
function actClearSearch(){
  actSearch = '';
  const inp = document.getElementById('pgdSearchInput');
  if(inp){ inp.value = ''; }
  if(selId){ renderWork(); const i2=document.getElementById('pgdSearchInput'); if(i2) i2.focus(); }
  else { if(inp) inp.focus(); onActSearch(''); }
}
// Selection changed level → a filter from the other level may not apply
// (e.g. a st:* status filter is meaningless on a single task). Reset both
// filter and search so each level opens clean.
function actResetControls(){ actFilter = 'all'; actSearch = ''; }
// Picking a typeahead result drills into that task (task level).
function actPickTask(id){
  actResetControls();
  selId = id; selGroupKey = null;
  if(openIds){ openIds.clear(); openIds.add(id); }
  if(typeof renderSidebar === 'function') renderSidebar();
  if(typeof renderWork === 'function') renderWork();
}
// The tan control bar. Shared primitive — scope + task levels will reuse it.
function actCtrlBarHtml(matchCount){
  const isTask = !!selId;
  const menu = actFilterList().map(f => {
    if(f.items){
      return `<div class="pgd-filter-h">${esc(f.group)}</div>` + f.items.map(i =>
        `<button class="pgd-filter-item${actFilter===i.v?' on':''}" onclick="event.stopPropagation();pickActFilter('${i.v}')">
          <span class="pgd-filter-tick">✓</span><span>${esc(i.label)}</span>
        </button>`).join('');
    }
    return `<button class="pgd-filter-item${actFilter===f.v?' on':''}" onclick="event.stopPropagation();pickActFilter('${f.v}')">
      <span class="pgd-filter-tick">✓</span><span>${esc(f.label)}</span>
    </button>`;
  }).join('');
  // Search means different things per level. At group level it's a typeahead
  // that finds TASKS. At task level there's only one task, so it filters this
  // task's activity text instead — no dropdown, just a live narrow.
  const searchLbl = isTask ? 'Search activity' : 'Search tasks';
  const searchPh  = isTask ? 'Find a note or update…'
                   : (selGroupKey ? 'Find a task in this group…' : 'Find a task or milestone…');
  return `<div class="pgd-ctrl-bar">
    <div class="pgd-ctrl-cell grow">
      <span class="pgd-ctrl-lbl">${searchLbl}</span>
      <span class="pgd-search${actSearch?' has-val':''}" id="pgdSearchWrap">
        <svg viewBox="0 0 14 14" stroke-width="1.6" stroke-linecap="round"><circle cx="6" cy="6" r="4.2"/><path d="M9.2 9.2L12.5 12.5"/></svg>
        <input id="pgdSearchInput" type="text" placeholder="${esc(searchPh)}"
               value="${esc(actSearch)}" autocomplete="off"
               oninput="${isTask ? 'onActSearchTask(this.value)' : 'onActSearch(this.value)'}" onclick="event.stopPropagation()"/>
        <button class="pgd-search-clear" onclick="event.stopPropagation();actClearSearch()" aria-label="Clear search">×</button>
        ${isTask ? '' : '<div class="pgd-ta" id="pgdTa"></div>'}
      </span>
    </div>
    <div class="pgd-ctrl-cell">
      <span class="pgd-ctrl-lbl">Activity type</span>
      <span class="pgd-filter" id="pgdFilter">
        <button class="pgd-filter-btn" onclick="event.stopPropagation();toggleActFilter()" aria-haspopup="listbox">
          <span>${esc(ACT_FILTER_LABEL(actFilter))}</span>
          <svg viewBox="0 0 12 12" fill="none"><path d="M3 4.5l3 3 3-3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <div class="pgd-filter-menu" role="listbox" onclick="event.stopPropagation()">${menu}</div>
      </span>
    </div>
    <span class="pgd-ctrl-count">${matchCount} ${matchCount===1?'update':'updates'}</span>
  </div>`;
}
// Task-level search: narrows this task's activity by note text / person / verb.
// Re-renders the whole panel (no dropdown to preserve focus for), so we restore
// the caret afterwards.
function onActSearchTask(val){
  actSearch = val;
  renderWork();
  const inp = document.getElementById('pgdSearchInput');
  if(inp){ inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }
}
// Does an entry match the task-level search text?
function actMatchesText(a){
  const q = (actSearch||'').trim().toLowerCase();
  if(!q) return true;
  const hay = [
    a.note || '',
    a.person?.who || '',
    TLX_VERB[a.ev] || '',
    a.field || '', a.from || '', a.to || '',
    a.title || '', a.sub || ''
  ].join(' ').toLowerCase();
  return hay.includes(q);
}
// Close the typeahead + filter menu + status dropdown on any outside click.
document.addEventListener('click', () => {
  if(typeof apMenuKey !== 'undefined' && apMenuKey !== null) apCloseMenu();
  const ta = document.getElementById('pgdTa');
  if(ta) ta.classList.remove('open');
  const f = document.getElementById('pgdFilter');
  if(f) f.classList.remove('open');
  const d = document.getElementById('updDd');
  if(d) d.classList.remove('open');
  const dn = document.getElementById('dwNoteLvlDd');
  if(dn) dn.classList.remove('open');
  document.querySelectorAll('.dw-note-menu.open').forEach(m => m.classList.remove('open'));
  document.querySelectorAll('.sec-hdr-dd.open').forEach(d => d.classList.remove('open'));
});

/* ── SCOPE LIFECYCLE MILESTONES ───────────────────────────────────────
   The scope timeline is a NARRATIVE, not a firehose. Its spine is the set of
   lifecycle milestones below — phase transitions the system records. All the
   task-level churn that happened BETWEEN two milestones is folded into a
   single collapsed rollup, so the page reads as the project's story with the
   detail available on demand rather than dumped inline.
   ms  : milestone kind → drives the tag copy
   who : the person who triggered it (lifecycle events are user-driven;
         completion thresholds are system-detected — see _sys) */
const SCOPE_MILESTONES = [
  {daysAgo:186, ms:'created',    label:'Project created',        who:'Or Ben-David', role:'Admin',
   sub:'Single-family renovation · 3484 South Main Street. Origination from Invitation Homes.'},
  {daysAgo:180, ms:'scope',      label:'Scope created',          who:'Sarah M.', role:'Field agent',
   sub:'Initial walk completed. 14 tasks captured across 6 groups.'},
  {daysAgo:171, ms:'pending',    label:'Scope pending review',   who:'Sarah M.', role:'Field agent',
   sub:'Submitted to admin for pricing and approval.'},
  {daysAgo:164, ms:'approved',   label:'Scope approved',         who:'Or Ben-David', role:'Admin',
   sub:'v1 approved at $24,180. Distributed to 4 contractors.'},
  {daysAgo:146, ms:'co',         label:'Change order created',   who:'Diana R.', role:'Field agent',
   sub:'Change-order walk found rot behind the master bath vanity. 2 tasks added.'},
  {daysAgo:143, ms:'co_pending', label:'Change order pending review', who:'Diana R.', role:'Field agent',
   sub:'Submitted for approval. Adds $3,490 to the scope.'},
  {daysAgo:139, ms:'co_approved',label:'Change order approved',  who:'Or Ben-David', role:'Admin',
   sub:'v3 approved at $27,670. Contractors notified of the revised scope.'},
  {daysAgo:112, ms:'started',    label:'Construction started',   who:'Kai', role:'System', _sys:true,
   sub:'First task moved to In progress. 4 contractors mobilized on site.'},
  {daysAgo:64,  ms:'half',       label:'Halfway — 50% of tasks complete', who:'Kai', role:'System', _sys:true,
   sub:'8 of 16 tasks marked complete. Project tracking on schedule.'},
  {daysAgo:22,  ms:'walk',       label:'Closeout walk completed', who:'Sarah M.', role:'Field agent',
   sub:'All groups walked. Punch list captured for the remaining items.'},
  {daysAgo:9,   ms:'close',      label:'Closeout created',       who:'Sarah M.', role:'Field agent',
   sub:'Closeout walk completed. Punch list captured for remaining items.'},
  {daysAgo:4,   ms:'close_pending', label:'Closeout pending review', who:'Sarah M.', role:'Field agent',
   sub:'Submitted to admin for final sign-off.'},
];
// Milestone tag copy per kind.
const MS_TAG = {
  created:'Project', scope:'Scope', pending:'Review', approved:'Approved',
  co:'Change order', co_pending:'Review', co_approved:'Approved',
  close:'Closeout', close_pending:'Review', close_approved:'Approved',
  started:'Construction', half:'Progress', walk:'Walkthrough',
  complete:'Milestone',
};
/* Build the scope timeline: milestones in chronological order (newest first),
   with every task-level event that fell BETWEEN two milestones folded into a
   rollup entry. Returns a flat list of {type:'ms'|'roll'} rows. */
function scopeTimeline(){
  // All task events across the project.
  const events = [];
  TASKS.forEach(t => activitiesFor(t).forEach(a => events.push({...a, _task:t})));
  // Milestones newest-first.
  const ms = [...SCOPE_MILESTONES].sort((a,b) => a.daysAgo - b.daysAgo);
  const rows = [];
  ms.forEach((m, i) => {
    rows.push({type:'ms', ...m});
    // Events strictly between this milestone and the NEXT-older one belong in
    // the gap beneath it.
    const older = ms[i+1];
    const lo = m.daysAgo;
    const hi = older ? older.daysAgo : Infinity;
    const inGap = events.filter(e => e.daysAgo >= lo && e.daysAgo < hi);
    if(inGap.length){
      rows.push({type:'roll', key:`gap${i}`, items:inGap,
                 after:m.label, before:older ? older.label : null});
    }
  });
  return rows;
}
// Which rollups are expanded.
let scopeRollOpen = new Set();
function toggleScopeRoll(key){
  scopeRollOpen.has(key) ? scopeRollOpen.delete(key) : scopeRollOpen.add(key);
  renderWork();
}
/* A collapsed rollup: the task-level work that happened between two
   milestones. Just a dropdown — click to reveal the individual timeline rows,
   which use the same renderer as group / task level. */
function scopeRollHtml(r){
  const open = scopeRollOpen.has(r.key);
  const groups = new Set(r.items.map(e => e._task?.room).filter(Boolean));
  const sorted = [...r.items].sort((a,b)=>a.daysAgo-b.daysAgo);
  return `<div class="tlx-row is-roll">
    <div class="tlx-rail">
      <div class="tlx-line top"></div>
      <div class="tlx-node is-roll"></div>
      <div class="tlx-line bot"></div>
    </div>
    <div class="tlx-roll${open?' open':''}">
      <button class="tlx-roll-hd" onclick="toggleScopeRoll('${r.key}')">
        <svg class="tlx-roll-caret" viewBox="0 0 12 12" fill="none"><path d="M4.5 3l3 3-3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <span class="tlx-roll-n">${open ? 'Hide' : 'Show'} ${r.items.length} ${r.items.length===1?'update':'updates'} across ${groups.size} ${groups.size===1?'group':'groups'}</span>
      </button>
      ${open ? `<div class="tlx-roll-body"><div class="tlx">${
        sorted.map((a,i)=>tlxRowHtml(a, i, sorted.length, (a._task?.id||1))).join('')
      }</div></div>` : ''}
    </div>
  </div>`;
}
/* Milestone row for the scope timeline. Lifecycle milestones are user-driven,
   so unlike the completion milestones they name a person. */
function scopeMsHtml(m){
  const when = _progDate(m.daysAgo);
  return `<div class="tlx-row is-ms">
    <div class="tlx-rail">
      <div class="tlx-line top"></div>
      <div class="tlx-node is-ms"></div>
      <div class="tlx-line bot"></div>
    </div>
    <div class="tlx-ms">
      <div class="tlx-ms-hd">
        <span class="tlx-ms-tag">
          <svg viewBox="0 0 12 12" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 6.5l2.5 2.5 4.5-5.5"/></svg>
          ${esc(MS_TAG[m.ms] || 'Milestone')}
        </span>
        <span class="tlx-ms-time">${esc(when)}</span>
      </div>
      <div class="tlx-ms-title">${esc(m.label)}</div>
      ${m.sub ? `<div class="tlx-ms-sub">${esc(m.sub)}</div>` : ''}
      ${m._sys
        ? `<div class="tlx-ms-sys">Detected automatically by Kai</div>`
        : `<div class="tlx-ms-who"><b>${esc(m.who)}</b><span class="tlx-verb">${esc(m.role)}</span></div>`}
    </div>
  </div>`;
}

/* ── ACTIVITY TIMELINE renderer ───────────────────────────────────────
   Renders ONE change event as a timeline row: [rail | card].
   The card leads with the resulting status (the scannable thing), then the
   task, then who/when, then the change module (from → to), then any
   attachments (note and/or photos). Shared — scope + task levels reuse it. */
const TLX_VERB = {
  status:     'changed status',
  contractor: 'changed contractor',
  product:    'changed product',
  cost:       'changed cost',
  photos:     'added photos',
  note:       'added a note',
};
function tlxRowHtml(a, i, total, seedBase){
  const st  = STATUS[a.status] || STATUS.not_started;
  const p   = a.person || {};
  const when = (typeof _progDate === 'function') ? _progDate(a.daysAgo || 0) : '';
  // ── Milestone: system-generated. No person, no change module. ──
  if(a.ev === 'milestone'){
    return `<div class="tlx-row is-ms">
      <div class="tlx-rail">
        <div class="tlx-line top"></div>
        <div class="tlx-node is-ms"></div>
        <div class="tlx-line bot"></div>
      </div>
      <div class="tlx-ms">
        <div class="tlx-ms-hd">
          <span class="tlx-ms-tag">
            <svg viewBox="0 0 12 12" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 6.5l2.5 2.5 4.5-5.5"/></svg>
            Milestone
          </span>
          <span class="tlx-ms-time">${esc(when)}</span>
        </div>
        <div class="tlx-ms-title">${esc(a.title || '')}</div>
        ${a.sub ? `<div class="tlx-ms-sub">${esc(a.sub)}</div>` : ''}
        <div class="tlx-ms-sys">Detected automatically by Kai</div>
      </div>
    </div>`;
  }
  const label = a._isGroup ? (a.group || 'Group') : (a.task ? a.task.name : (a._task ? a._task.name : ''));
  const verb  = TLX_VERB[a.ev] || 'updated';
  // Change, written as a sentence rather than a keyed chip.
  const chg = (a.from !== undefined && a.to !== undefined) ? `<div class="tlx-chg">
      <span class="f">${esc(a.field || '')}</span> changed from
      <span class="from">${esc(a.from)}</span><span class="arw">→</span><span class="to">${esc(a.to)}</span>
    </div>` : '';
  // Note reads as someone's words: quoted + italic on a rule.
  const note = a.note ? `<div class="tlx-note">
      <span class="tlx-note-lbl">Note</span>&ldquo;${esc(a.note)}&rdquo;
    </div>` : '';
  // Tan box only renders if there's something to say.
  const bodyBox = (chg || note) ? `<div class="tlx-body">${chg}${note}</div>` : '';
  const photos = a.photoCount ? `<div class="tlx-photos">${Array.from({length:a.photoCount}).map((_,k)=>
      `<div class="tlx-photo" style="background:${_progPhotoBg((seedBase + (a.daysAgo||0) + k) * 3)}" title="Photo ${k+1}"></div>`
    ).join('')}</div>` : '';
  const photoCt = a.photoCount
    ? `<div class="tlx-att">+${a.photoCount} ${a.photoCount===1?'photo':'photos'}</div>` : '';
  return `<div class="tlx-row">
    <div class="tlx-rail">
      <div class="tlx-line top"></div>
      <div class="tlx-node ${st.cls}"></div>
      <div class="tlx-line bot"></div>
    </div>
    <div class="tlx-card">
      <div class="tlx-hd">
        <div class="tlx-hd-l">
          <span class="tlx-task">${esc(label)}</span>
          <span class="tlx-who"><b>${esc(p.who || 'Someone')}</b><span class="tlx-verb">${esc(verb)}</span></span>
        </div>
        <div class="tlx-hd-r">
          <span class="tlx-status ${st.cls}">${esc(st.label)}</span>
          <span class="tlx-time">${esc(when)}</span>
        </div>
      </div>
      ${bodyBox}
      ${photoCt}
      ${photos}
    </div>
  </div>`;
}
// Aggregate activities for every task in a group + synthesize a couple of
// group-level activities (walkthrough, materials arriving, punch list, etc.)
// so the group view has group-scoped context alongside its task-scoped feed.
function activitiesForGroup(groupKey){
  const tasks = groupKey === '__un'
    ? TASKS.filter(t => !t.gc)
    : (groupBy === 'contractor' ? TASKS.filter(t => t.gc === groupKey) : TASKS.filter(t => t.room === groupKey));
  const groupSeed = groupKey.length + (tasks[0]?.id || 1);
  // Updates the user posted to this group land at the top of its feed.
  const mine = (typeof USER_GROUP_EVENTS !== 'undefined' && USER_GROUP_EVENTS[groupKey]) || [];
  // Group-scoped events. Also change events — a walkthrough is a note event
  // against the group, materials staging is a note event. They carry no task.
  const groupLevel = [
    {daysAgo:0, kind:'complete', ev:'note', person:_progPerson(groupSeed), status:'complete',
     group:groupKey, _isGroup:true, photoCount:3,
     note:`Walkthrough completed. ${tasks.length} ${tasks.length===1?'task':'tasks'} reviewed, notes captured per line item.`},
    {daysAgo:6, kind:'delivered', ev:'note', person:_progPerson(groupSeed+2), status:'in_progress',
     group:groupKey, _isGroup:true, photoCount:2,
     note:`Bulk materials staged for ${groupKey.toLowerCase()}. Contractor confirmed receipt.`},
  ];
  // ── Milestone: every task in the group is complete. System-generated —
  // Kai detects the threshold, no user action produced it. Only emitted when
  // the condition actually holds, so it isn't decorative.
  const allDone = tasks.length > 0 && tasks.every(t => t.status === 'complete');
  if(allDone){
    groupLevel.unshift({
      daysAgo:0, kind:'complete', ev:'milestone', status:'complete',
      _isGroup:true, _isMilestone:true, group:groupKey,
      title:`All tasks complete in ${groupKey}`,
      sub:`${tasks.length} of ${tasks.length} tasks marked complete. This group is ready for closeout review.`
    });
  }
  // Task events flow up unchanged — the timeline renderer reads a.task for the
  // title, so no string-mangling of the title is needed any more.
  const taskActivities = [];
  tasks.forEach(t => {
    activitiesFor(t).forEach(a => taskActivities.push({...a, _task: t}));
  });
  // Combine + sort newest first (smaller daysAgo). Milestones sort to the top
  // of their day so the threshold reads as the culmination of that day's work.
  return [...mine, ...groupLevel, ...taskActivities].sort((x,y)=>
    (x.daysAgo - y.daysAgo) || ((y._isMilestone?1:0) - (x._isMilestone?1:0)));
}
// Photos for a group: pulls from the flat PHOTOS store (group photos + any
// task photos in the group's tasks). Falls back to synthesized swatches if
// PHOTOS hasn't been seeded.
function photosForGroupInProgress(groupKey){
  if(typeof PHOTOS === 'undefined' || !PHOTOS.length) return [];
  const tasks = groupKey === '__un'
    ? TASKS.filter(t => !t.gc)
    : (groupBy === 'contractor' ? TASKS.filter(t => t.gc === groupKey) : TASKS.filter(t => t.room === groupKey));
  const taskCodes = new Set(tasks.map(t=>t.code));
  // Group photos for that room (only when grouping by room), plus any task
  // photos whose task code lands in this group.
  const rooms = groupBy === 'room' ? [groupKey] : [];
  return PHOTOS.filter(p =>
    (p.kind === 'group' && rooms.includes(p.room)) ||
    (p.kind === 'task' && taskCodes.has(p.task))
  );
}
// Track which per-group sections in the project view are expanded. First one
// opens by default; the rest collapse to keep the page scannable.
let progExpanded = null;
function toggleProgGroup(key){
  if(!progExpanded) progExpanded = new Set();
  progExpanded.has(key) ? progExpanded.delete(key) : progExpanded.add(key);
  renderProgress();
}
function progCardHtml(a, seedBase){
  const detailsHtml = (a.details||[]).map(([k,v,cls]) => `<div class="prog-card-detail"><span>${k}</span><span class="val ${cls||''}">${v}</span></div>`).join('');
  const photosHtml = a.photoCount ? `<div class="prog-card-photos">${Array.from({length:a.photoCount}).map((_,i)=>`<div class="prog-card-photo" style="background:${_progPhotoBg(seedBase+i)}" title="Progress photo ${i+1}"></div>`).join('')}</div>` : '';
  return `<div class="prog-card">
    <div class="prog-card-head">
      <div class="prog-card-title">${a.title}</div>
      <div class="prog-card-time">${_progDate(a.daysAgo)}</div>
    </div>
    <div class="prog-card-author">${a.person.who} <span class="role">· ${a.person.role}</span></div>
    ${a.notes?`<div class="prog-card-notes">${a.notes}</div>`:''}
    ${detailsHtml?`<div class="prog-card-details">${detailsHtml}</div>`:''}
    ${photosHtml}
  </div>`;
}
// Shared group-page renderer used by both the Activity tab (renderProgress)
// and the Editor tab (renderShop) when a group is selected in the sidebar.
// Returns the HTML string; the caller assigns it to workBody.
//   opts.includeActivity — true (Activity tab) renders the group activity
//     feed at the bottom + the activity control bar at the top. Editor
//     omits both — it just shows the overview card + photos + tasks list.
//   opts.taskOnClick — name of the global function to invoke when a task
//     row in the list is clicked. Activity uses 'pgdGoto'; Editor uses
//     'selectTask' so the click lands in the Editor task detail card.

/* Task row for the group page and the scope page. Extracted so the two
   render identical rows — same status vocabulary, same truncation, same
   click routing. */
/* Column labels above the task rows. */
/* ── Row actions ─────────────────────────────────────────────────────
   One menu open at a time, keyed by task. Delete asks a second time inside
   the menu rather than in a browser dialog — same two-step the task card and
   the group action use, and it keeps a destructive choice on the surface
   that raised it. */
/* The row opens the task, but it now contains real controls — the files count
   and the actions menu. Those call stopPropagation, and this guard backs it
   up: any click that started inside a control is the control's, not the
   row's. Same closest() shape as onScopeBarClick, and it holds even if a
   handler somewhere re-dispatches or a child forgets to stop the event. */
function pgdRowOpen(e, id, fn){
  if(!e) return;
  // First pass: the click started inside a control.
  if(e.target && e.target.closest &&
     e.target.closest('.pgd-tk-files, .se-modal, .se-modal-scrim')) return;
  // The cell is a sibling of the row now, so look in the wrapper.
  const row = e.currentTarget;
  const wrap = row && row.parentElement ? row.parentElement : null;
  const go = (typeof window !== 'undefined') ? window[fn] : null;
  if(typeof go === 'function') go(id);
}
/* ── Flagged tasks can't be signed off ────────────────────────────────
   Same flag set the gutter marker and the sort use: something wrong with an
   otherwise specified task. A missing contractor isn't one of these — it's
   incompleteness, not a problem, and it blocks nothing. Edit requests used to
   be in this set; that feature is gone. */
function _pgdFlagLabels(t){
  const keys = (typeof taskKeys === 'function') ? taskKeys(t) : [];
  const list = ['oos','co_open'].filter(k => keys.includes(k));
  return list.map(k => (typeof tagInfo === 'function' ? (tagInfo(k).label || k) : k));
}
function pgdCloseFlagBlock(){
  document.querySelectorAll('.pgd-flagblock').forEach(n => n.remove());
}
/* Built and appended rather than rendered: three different surfaces raise it,
   none of them owns it, and it survives the re-render each of them triggers. */
function pgdShowFlagBlock(tasks){
  pgdCloseFlagBlock();
  if(!tasks || !tasks.length) return;
  const verb = (typeof approveDoneLabel === 'function') ? approveDoneLabel().toLowerCase() : 'approved';
  const many = tasks.length > 1;
  const rows = tasks.map(t =>
    `<li><span class="pgd-fb-task">${esc(t.name)}</span>
       <span class="pgd-fb-flags">${esc(_pgdFlagLabels(t).join(', ') || 'Needs attention')}</span></li>`).join('');
  const wrap = document.createElement('div');
  wrap.className = 'pgd-flagblock';
  wrap.innerHTML = `<div class="se-modal-scrim open" onclick="pgdCloseFlagBlock()"></div>
    <div class="se-modal open pgd-fb-modal" role="dialog" aria-modal="true" aria-label="Cannot approve">
      <div class="se-modal-cap">Action blocked</div>
      <div class="se-modal-title">${many ? `${tasks.length} tasks have open flags` : 'This task has an open flag'}</div>
      <div class="se-modal-body">
        Nothing can be marked ${verb} while there's an unresolved flag on it.
        Clear ${many ? 'these' : 'this'} first, then try again.
        <ul class="pgd-fb-list">${rows}</ul>
      </div>
      <div class="se-modal-actions">
        <button class="se-btn se-btn-primary" onclick="pgdCloseFlagBlock()">Got it</button>
      </div>
    </div>`;
  document.body.appendChild(wrap);
}
/* The three entry points. Each returns true when it has blocked, so the
   caller can bail. */
function pgdBlockIfFlagged(id){
  const t = TASKS.find(x => x.id === id);
  if(!t || !_pgdTaskIsFlagged(t)) return false;
  pgdShowFlagBlock([t]);
  return true;
}
function pgdBlockGroupIfFlagged(key){
  const groups = groupTasks(typeof visibleTasks === 'function' ? visibleTasks() : TASKS);
  const g = groups.find(x => x.key === key);
  if(!g) return false;
  // Only the ones that would actually be swept up — already-approved tasks
  // aren't being decided again.
  const blocked = g.items.filter(t => !approved.has(t.id) && _pgdTaskIsFlagged(t));
  if(!blocked.length) return false;
  pgdShowFlagBlock(blocked);
  return true;
}

/* The row's ⋮ menu is gone. It held task approval, closeout sign-off,
   change-order approval and delete; approval now lives in the decision
   control on the sidebar row, and the change-order approve is still on the
   task header. Its state, its handlers and the delete modal it opened went
   with it — nothing else could reach them. */
/* Photo and note counts for the row. Opens the notes drawer — the drawer is
   notes-only now, and the photo half of the count is reached from the photo
   row's "View all & add" or its gear instead. */
function _pgdRowFilesHtml(t){
  const {photos, notes} = _pgdRowCounts(t);
  return `<button class="pgd-tk-files" title="${photos} photo${photos === 1 ? '' : 's'} &middot; ${notes} note${notes === 1 ? '' : 's'}"
    onclick="event.stopPropagation();openDrawer(${t.id},'notes')"
    ><span class="${photos ? '' : 'is-none'}">${photos}</span><span class="sep">/</span
    ><span class="${notes ? '' : 'is-none'}">${notes}</span></button>`;
}

function _pgdTaskHeadHtml(){
  return `<div class="pgd-tk-head">
    <span>Task</span>
    <span>Status</span>
    <span>Contractor</span>
    <span>Modifier</span>
    <span>Product</span>
    <span class="num">Qty</span>
    <span class="num">Rate</span>
    <span class="num"><span class="files-lgd"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 4.5h2.4l1-1.6h5.2l1 1.6H14v8H2z"/><circle cx="8" cy="8.4" r="2.2"/></svg>/<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 2.5h10v11H3z"/><path d="M5.5 6h5M5.5 8.5h5M5.5 11h3"/></svg></span></span>
    <span class="num">Amount</span>
  </div>`;
}

/* Row status. Approval comes first — a task is Pending until someone reviews
   it, Reviewed until it's approved, Approved after that. Once the scope is in
   construction approval is settled, so the column switches to the work status
   instead. Deliberately not _pgdTaskStatusMeta: that one answers "what does
   this task's pill say at this stage", which mixes the two ladders together,
   and it surfaced "Missing details" — a draft concern that doesn't belong in
   a row this detailed. */
/* How far along a task is, independent of whether anyone has decided on it.
   Commercial detail (contractor, modifier, product, cost) is what makes a
   task ready to price; photos and notes alone mean someone has started. */
function _pgdRowCounts(t){
  const photos = (typeof PHOTOS !== 'undefined' && PHOTOS)
    ? PHOTOS.filter(p => p.kind === 'task' && p.task === t.code).length
    : (t.photos || 0);
  const seeded = (typeof taskNotes === 'function') ? (taskNotes(t) || []).length : (t.notes || 0);
  const mine = (typeof USER_NOTES !== 'undefined' && USER_NOTES[t.id]) ? USER_NOTES[t.id].length : 0;
  return {photos, notes: seeded + mine};
}
/* A product wrapped in parentheses is a note about the absence of one —
   "(not selected)", "(selection at walkthrough)", "(design pending : …)".
   One test rather than a list, so a new placeholder phrasing can't slip
   through and read as a real product. */
function _pgdHasProduct(t){
  return !!(t && t.product && !/^\s*\(/.test(t.product));
}
function _pgdRowCompleteness(t){
  // Ready means the task can be priced: it names a product or carries a cost.
  // A contractor on its own isn't enough — Interior Doors has one and nothing
  // else, and reading that as ready let it show up as Reviewed at step 4.
  const hasCost = (typeof dollars === 'function') ? dollars(t.cost) > 0 : false;
  if(_pgdHasProduct(t) || hasCost) return 'ready';
  const {photos, notes} = _pgdRowCounts(t);
  // Started: somebody has touched it — a photo, a note, a contractor, a
  // modifier — but there's still nothing to price.
  if(photos || notes || t.gc || (t.mods || []).length) return 'started';
  return 'empty';
}
const _PGD_COMPLETENESS = {
  empty:   {label:'New',     cls:'s-empty'},
  started: {label:'Started', cls:'s-started'},
  ready:   {label:'Pending', cls:'s-ready'},   // s-ready: distinct fill from the approval s-pending
};

const _PGD_APPROVAL = {
  pending:  {label:'Pending',  cls:'s-pending'},
  reviewed: {label:'Reviewed', cls:'s-reviewed'},
  approved: {label:'Approved', cls:'s-complete'},
};
function _pgdRowStatusMeta(t){
  const mode = (typeof PROJ_MODE !== 'undefined') ? PROJ_MODE : 'draft';
  if(mode === 'work' || mode === 'closeout' || mode === 'closeout-approved'){
    // Closeout signs off task by task: until then the row reads Completed,
    // which is a statement about the work, not about anyone approving it.
    if(mode === 'closeout' && approved.has(t.id)) return _PGD_APPROVAL.approved;
    let key;
    if(t.editRequested)                              key = 'needs_rework';
    else if(approved.has(t.id))                      key = 'complete';
    else if(t.status === 'in_review')                key = 'needs_rework';
    else if(STATUS[t.status] && t.status !== 'pending') key = t.status;
    // 'pending' is a review-era status — it says nothing about the work. A
    // task carrying it into construction is under way if it has a contractor,
    // product and price, and hasn't started if it doesn't. The old mapping
    // sent all of them to Not started, so Countertops and Backsplash read as
    // untouched despite being fully specified. The 'missing' flag used to
    // force the same thing and is gone with it: completeness is computed now,
    // not flagged.
    else key = (_pgdRowCompleteness(t) === 'ready') ? 'in_progress' : 'not_started';
    return STATUS[key];
  }
  const atApproval = mode === 'review'
    && typeof STAGE_ID !== 'undefined' && STAGE_ID === 'awaiting-pub';
  if(atApproval){
    if(approved.has(t.id)) return _PGD_APPROVAL.approved;
    // What step 3 actually decided. This used to infer it from whether the
    // task had a product and a price, so a task nobody had looked at still
    // read Reviewed — and there was nothing left for step 4 to do.
    return reviewed.has(t.id) ? _PGD_APPROVAL.reviewed : _PGD_APPROVAL.pending;
  }
  if(mode === 'review') return reviewed.has(t.id) ? _PGD_APPROVAL.reviewed : _PGD_APPROVAL.pending;
  // Draft: nothing has been decided yet, so the column reports how far
  // along the task is instead of printing PENDING on every row.
  return _PGD_COMPLETENESS[_pgdRowCompleteness(t)];
}
/* Where a task sits in the group page's running order. Lower ranks first.

   Status is the primary key: every task of one status sits with the others,
   in an unbroken band. Flags order rows *within* a band rather than forming
   one of their own — a flagged In progress task belongs at the top of the In
   progress rows, not above the Not started ones. Rank is band*10 + 0|1, so
   the two keys can't interleave. */
/* Something wrong with an otherwise specified task: a product out of stock, or
   unsubmitted change-order edits. Deliberately not the missing-contractor key,
   which every unfinished task carries. */
function _pgdTaskIsFlagged(t){
  const keys = (typeof taskKeys === 'function') ? taskKeys(t) : [];
  return ['oos','co_open'].some(k => keys.includes(k));
}
/* One definition of the flag mark and of what earns it. The sidebar row and
   the group table's gutter both draw the same marker, so the artwork and the
   flag set live here rather than being pasted at each call site — they were
   already drifting once. */
function _flagIconSvg(){
  return '<svg viewBox="-1.6 -1.6 25.2 29.2" aria-hidden="true">'
    + '<path d="M0.5 0V26"/><path d="M20.5 9.63135L0.5 17V1L20.5 9.63135Z"/></svg>';
}
function _taskFlagKeys(t){
  if(!t || !_pgdTaskIsFlagged(t)) return [];
  return (typeof taskKeys === 'function' ? taskKeys(t) : [])
    .filter(k => ['oos','co_open'].includes(k));
}
/* Named rather than "needs attention": the label is the whole point of the
   marker, and tagInfo already holds the wording the filter dropdown uses. */
function _taskFlagTitle(t){
  return _taskFlagKeys(t)
    .map(k => (typeof tagInfo === 'function' ? tagInfo(k).label : k))
    .join(', ');
}
/* `cls` lets each surface size the mark to its own type without a second
   copy of the SVG. Returns '' for a clean task, so it drops out inline. */
function flagMarkHtml(t, cls){
  const label = _taskFlagTitle(t);
  if(!label) return '';
  return `<span class="${cls || 'pgd-tk-flag'}" title="${esc(label)}">${_flagIconSvg()}</span>`;
}
function _pgdTaskSortBand(t){
  const mode = (typeof PROJ_MODE !== 'undefined') ? PROJ_MODE : 'draft';
  const flagged = _pgdTaskIsFlagged(t);
  if(mode === 'draft'){
    const fill = _pgdRowCompleteness(t);
    if(fill === 'empty') return 0;
    if(fill === 'started') return 1;
    return flagged ? 2 : 3;
  }
  const st = _pgdRowStatusMeta(t) || {};
  if(mode === 'review'){
    if(flagged) return 0;
    if(st.cls === 's-pending')  return 1;
    if(st.cls === 's-reviewed') return 2;
    return 3;                                    // approved
  }
  // Work and closeout. Flagged sits directly under Rework: a problem outranks
  // a status, so a flagged task leaves its status band rather than leading it.
  if(st.cls === 's-rework')     return 0;
  if(flagged)                   return 1;
  if(st.cls === 's-notstarted') return 2;
  if(st.cls === 's-inprogress') return 3;
  return 4;                                      // completed
}
function _pgdTaskSortRank(t){
  return _pgdTaskSortBand(t);
}
/* Stable: Array.prototype.sort has been stable since ES2019, so tasks keep
   the room's authored order inside a band. Copies the array — g.items is
   the live group list and the sidebar reads from the same tasks. */
/* A task the user just added leads its group: it's the one being worked
   on, and it has nothing in it yet to rank by. */
function _taskIsNew(t){
  return (typeof _pgdRowCompleteness === 'function') && _pgdRowCompleteness(t) === 'empty';
}
/* The sidebar and the group and scope pages all order through here, so a
   task sits in the same place wherever you're looking at it. Stable, so
   equal ranks keep the order the template gave them. */
function _pgdSortTasksForGroup(items){
  return (items || [])
    .map((t, i) => ({t, i, r: _taskIsNew(t) ? -1 : _pgdTaskSortRank(t)}))
    .sort((a, b) => a.r - b.r || a.i - b.i)
    .map(x => x.t);
}

function _pgdTaskRowHtml(t, taskOnClick){
    const _st = _pgdRowStatusMeta(t);
    const statusPill = _st ? `<span class="pgd-tk-status task-status ${_st.cls||''}">${esc(_st.label)}</span>` : '<span></span>';
    // Gutter marks, left of the name.
    //   flag  — something's wrong with this task. The funnel matches the
    //           Filters control that surfaces exactly these rows.
    //   tick  — approved. Solid from step 5 on, where the status column
    //           has moved to the work ladder and nothing else records it.
    //           Not at step 4: the column says APPROVED there already.
    //   light tick — reviewed, part-way to approved.
    const _mode = (typeof PROJ_MODE !== 'undefined') ? PROJ_MODE : 'draft';
    // Steps 5-6: the scope was approved at publish, so every task carries
    // the tick. Step 8: signed off, same. Step 7 is the sign-off itself —
    // the tick is earned per task, not granted by the stage.
    const _atWork = _mode === 'work' || _mode === 'closeout-approved';
    const _signedOff = _mode === 'closeout' && approved.has(t.id);
    const _coDirty = typeof taskHasSnapshotChanges === 'function' && taskHasSnapshotChanges(t);
    // Name the flags rather than saying 'needs attention': the label is
    // the whole point of the marker, and tagInfo already holds the same
    // wording the filter dropdown uses.
    const flg = (typeof flagMarkHtml === 'function') ? flagMarkHtml(t, 'pgd-tk-flag') : '';
    // A flagged task hasn't been approved — the flag has to be cleared
    // first — so the two markers are mutually exclusive rather than
    // stacking in the gutter.
    // The tick means approved and nothing else. Reviewed doesn't earn one
    // — the status column already says so, and a second mark for a
    // half-way state just competes with the real one.
    const chk = (!flg && ((_atWork && !_coDirty) || _signedOff))
      ? '<span class="pgd-tk-chk" title="Approved">✓</span>' : '';
    // Character budgets, tightened to match the responsive column widths: at
    // the narrow end a 50-character name had nowhere to go and the CSS
    // ellipsis did all the work, which made the cut point vary by pane width.
    // Fixed budgets cut in the same place every time; the tooltip carries the
    // rest either way.
    const fullName = t.name || '';
    const displayName = fullName.length > 20 ? fullName.slice(0, 20).trimEnd() + '…' : fullName;
    // Same test as the completeness resolver: a parenthesised product is a
    // note about not having one, so the cell shows a dash instead.
    const fullProd = (typeof _pgdHasProduct === 'function' ? _pgdHasProduct(t)
      : (t.product && !/not selected/i.test(t.product))) ? t.product : '';
    const prodName = fullProd.length > 12 ? fullProd.slice(0, 12).trimEnd() + '…' : fullProd;
    // Quantity is a count; the unit belongs to the product. "14 LF" reads as
    // two facts in a 26px column, and the units vary by trade (LF, SF, ea,
    // Suite) so they never line up down the column either. Leading figure only.
    const qtyNum = (String(t.qty || '').match(/[\d.,]+/) || [''])[0];
    // Plain text, read from the task's picked products — the column used to
    // read t.mods, which nothing sets any more.
    const _modIds = (typeof taskProductMods === 'function')
      ? [...new Set([...(t.mods || []), ...taskProductMods(t)])]
      : (t.mods || []);
    const modFull = _modIds.map(m => tagInfo(m).label).join(', ');
    // 64px holds one word, so a multi-word label is cut to its first.
    // The cell's tooltip and the actions menu carry the full label.
    const modLbl = modFull ? modFull.split(' ')[0] : '';
    // Titles sit on the cells rather than the row: a child's tooltip wins over
    // its parent's, so with only a row-level one the contractor and product
    // cells reported the task's name instead of their own. The row keeps one
    // for the cells that don't carry a value worth expanding.
    const _coRemoved = (typeof __CO_REMOVED !== 'undefined' && __CO_REMOVED.has(t.id))
      ? ' is-co-removed' : '';
    const _draft = (typeof PROJ_MODE !== 'undefined' && PROJ_MODE === 'draft');
    const _fill = _draft ? _pgdRowCompleteness(t) : 'ready';
    const _unready = (_fill !== 'ready' ? ' is-unready' : '')
      + (_fill === 'empty' ? ' is-new' : '') + _coRemoved;
    // A div, not a button. The row carries real controls now — the files
    // count and the actions menu — and a <button> may not contain another:
    // the parser closes the outer one at the inner tag, which threw the
    // last three cells out of the grid and onto their own lines. role +
    // tabindex + Enter/Space keep it operable from the keyboard.
    return `<div class="pgd-tk-rowwrap"><div class="pgd-tk-row${_unready}" data-tid="${t.id}" role="button" tabindex="0" onclick="pgdRowOpen(event,${t.id},'${esc(taskOnClick)}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click();}" title="${esc(fullName)}">
      <span class="pgd-tk-name" title="${esc(fullName)}">${flg}${chk}<span style="min-width:0;overflow:hidden;text-overflow:ellipsis;flex:1">${esc(displayName)}</span></span>
      ${statusPill}
      <span class="pgd-tk-gc${t.gc ? '' : ' is-none'}" title="${esc(t.gc || 'Unassigned')}">${esc(t.gc || 'Unassigned')}</span>
      <span class="pgd-tk-mod${modLbl ? '' : ' is-none'}" title="${esc(modFull || 'No modifier')}">${esc(modLbl || '—')}</span>
      <span class="pgd-tk-prod${prodName ? '' : ' is-none'}" title="${esc(fullProd)}">${esc(prodName || '—')}</span>
      <span class="pgd-tk-qty" title="${esc(t.qty || '')}">${prodName && qtyNum ? esc(qtyNum) : '—'}</span>
      <span class="pgd-tk-rate">${prodName ? esc(t.rate || '—') : '—'}</span>
      ${_pgdRowFilesHtml(t)}
      <span class="pgd-tk-cost">${esc(t.cost || '$0')}</span>
    </div></div>`;
}

/* One photo tile — 170px, GROUP chip on group-scope shots, date and
   milestone walk underneath. Shared by the group page and the scope
   page so the two strips stay identical. `labelName` is what the
   tooltip names the tile's context: the group on the group page, the
   photo's own room in the scope-wide strip. */
/* ── Photo manager ───────────────────────────────────────────────────
   A modal over the page rather than a route: closing puts you back exactly
   where you were, with nothing to restore. */
/* Which photo is open, or null for the grid. */
/* Move and Copy share a target list; this is which verb is armed. */
let pmMoveMode = 'move';
let pmMenuOpen = false;
let pmDeleteConfirm = false;

function pmToggleMenu(){
  pmMenuOpen = !pmMenuOpen;
  pmDeleteConfirm = false;
  renderPhotoManager();
}
function pmSetMoveMode(mode){
  pmMoveMode = mode;
  renderPhotoManager();
}
function pmAskDelete(){
  pmDeleteConfirm = true;
  pmMenuOpen = false;
  renderPhotoManager();
}
function pmCancelDelete(){
  pmDeleteConfirm = false;
  renderPhotoManager();
}
/* The per-task count the Files column and the completeness states read is
   held on the task, not derived from PHOTOS — so it has to be brought back
   into line after anything that moves photos around. */
function pmSyncTaskCounts(){
  if(typeof TASKS === 'undefined') return;
  TASKS.forEach(t => {
    t.photos = (typeof PHOTOS !== 'undefined' ? PHOTOS : [])
      .filter(p => p.kind === 'task' && p.task === t.code).length;
  });
}
function pmDeleteSelected(){
  const ids = new Set(pmSel);
  if(!ids.size) return;
  PHOTOS = PHOTOS.filter(p => !ids.has(p.id));
  pmSel = new Set();
  pmDeleteConfirm = false;
  pmSyncTaskCounts();
  if(typeof toast === 'function') toast(`${ids.size} photo${ids.size === 1 ? '' : 's'} deleted`);
  if(typeof renderAll === 'function') renderAll();
  renderPhotoManager();
}
/* One entry point for both verbs. target is {kind:'unsorted'},
   {kind:'group', room} or {kind:'task', room, task}. */
function pmApplySelectionTo(target){
  const chosen = PHOTOS.filter(p => pmSel.has(p.id));
  if(!chosen.length) return;
  const stamp = p => {
    p.kind = target.kind;
    p.room = target.kind === 'unsorted' ? 'Project' : target.room;
    p.task = target.kind === 'task' ? target.task : null;
  };
  if(pmMoveMode === 'copy'){
    // A copy keeps the seed so it renders as the same picture, and takes a
    // fresh id so the two can be selected and deleted independently.
    let nextId = PHOTOS.reduce((n, p) => Math.max(n, p.id || 0), 0);
    chosen.forEach(p => {
      const c = {...p, id: ++nextId};
      stamp(c);
      PHOTOS.push(c);
    });
  } else {
    chosen.forEach(stamp);
  }
  const n = chosen.length;
  pmSel = new Set();
  pmMenuOpen = false;
  pmSyncTaskCounts();
  if(typeof toast === 'function')
    toast(`${n} photo${n === 1 ? '' : 's'} ${pmMoveMode === 'copy' ? 'copied' : 'moved'}`);
  if(typeof renderAll === 'function') renderAll();
  renderPhotoManager();
}
/* Every place a photo can live, in the order the sidebar lists them. */
function _pmTargetsHtml(){
  const rooms = [...new Set((typeof TASKS !== 'undefined' ? TASKS : []).map(t => t.room))];
  const row = (target, label, sub, cls) =>
    `<button type="button" class="pm-tg${cls ? ' ' + cls : ''}" onclick="pmApplySelectionTo(${esc(JSON.stringify(target))})">
       <span class="pm-tg-l">${esc(label)}</span>
       ${sub ? `<span class="pm-tg-sub">${esc(sub)}</span>` : ''}
     </button>`;
  const unsorted = row({kind:'unsorted'}, 'Unsorted',
    pmMoveMode === 'copy' ? 'add a copy' : 'remove from task', 'is-unsorted');
  const body = rooms.map(r => {
    const tasks = TASKS.filter(t => t.room === r);
    return row({kind:'group', room:r}, r, 'group photos', 'is-group')
      + tasks.map(t => row({kind:'task', room:r, task:t.code}, t.name, '', 'is-task')).join('');
  }).join('');
  return unsorted + body;
}

let pmPhoto = null;

/* Everything on screen, flattened in display order — prev/next run through
   the lot rather than dead-ending at each section. */
function _pmFlat(){
  const out = [];
  _pmSections().forEach(s => s.photos.forEach(p => out.push({photo:p, section:s.title})));
  return out;
}
function pmOpenPhoto(id){
  pmPhoto = id;
  renderPhotoManager();
}
function pmBackToGrid(){
  const from = pmPhoto;
  pmPhoto = null;
  renderPhotoManager();
  // Land on the tile you came from rather than the top of the list — after a
  // few steps through the sections it's nowhere near where you started.
  const el = (from !== null && document.querySelector)
    ? document.querySelector(`.pm-tile[data-pm-id="${from}"]`) : null;
  if(el && el.scrollIntoView) el.scrollIntoView({block:'center'});
}
function pmStep(delta){
  const flat = _pmFlat();
  const i = flat.findIndex(x => x.photo.id === pmPhoto);
  if(i < 0) return;
  const next = flat[(i + delta + flat.length) % flat.length];
  pmPhoto = next.photo.id;
  renderPhotoManager();
}
/* The detail pane, built from the lightbox's own renderers. They write into
   #poLeft / #poDetail / #poFooter, so those ids have to exist before the
   calls — hence the two-step: markup in, then fill. */
function _pmPhotoModeHtml(){
  const flat = _pmFlat();
  const i = flat.findIndex(x => x.photo.id === pmPhoto);
  if(i < 0) return '';
  const cur = flat[i];
  // No bar of its own: back sits in the header, the hero counts the set, and
  // the section name was repeating the title beside it.
  return `<div class="pm-photo-stage">
      <div class="pm-photo-panes po-card-body">
        <div class="po-left" id="poLeft"></div>
        <div class="po-right" id="poRight">
          <div class="po-detail" id="poDetail"></div>
          <div class="po-footer" id="poFooter"></div>
        </div>
      </div>
    </div>`;
}
/* The lightbox derives its nav, its "N of M" and its filmstrip from
   _poSiblingsFor. Pointing that at the takeover's flat list while the manager
   is open makes all three agree with the sections on screen — otherwise the
   hero pages through one task while the header counts eighteen. */
if(typeof _poSiblingsFor === 'function' && !window.__kaiPoSibsWrapped){
  window.__kaiPoSibsWrapped = true;
  const _poSibsOrig = _poSiblingsFor;
  _poSiblingsFor = function(photo){
    if(pmCtx && pmPhoto !== null) return _pmFlat().map(x => x.photo);
    return _poSibsOrig(photo);
  };
}
/* Its arrows call openGalleryPhoto, which would raise the popup on top of the
   takeover. Inside the manager they move the manager instead. */
if(typeof openGalleryPhoto === 'function' && !window.__kaiPoOpenWrapped){
  window.__kaiPoOpenWrapped = true;
  const _poOpenOrig = openGalleryPhoto;
  openGalleryPhoto = function(pid){
    if(pmCtx){ pmOpenPhoto(pid); return; }
    return _poOpenOrig(pid);
  };
}
function _pmFillPhotoPanes(){
  if(pmPhoto === null) return;
  const photo = (typeof PHOTOS !== 'undefined' ? PHOTOS : []).find(p => p.id === pmPhoto);
  if(!photo) return;
  const task = photo.kind === 'task'
    ? TASKS.find(t => t.code === photo.task)
    : (photo.kind === 'group' ? TASKS.find(t => t.room === photo.room) : null);
  if(typeof _poRenderLeft === 'function') _poRenderLeft(photo, task);
  if(typeof _poRenderRight === 'function') _poRenderRight(photo, task);
}

let pmCtx = null;              // {scope:'group'|'task', room, taskId}
let pmSel = new Set();

function openPhotoManager(scope, key){
  pmCtx = (scope === 'task') ? {scope:'task', taskId: key}
    : (scope === 'scope') ? {scope:'scope'}
    : {scope:'group', room: key};
  pmSel = new Set();
  pmPhoto = null;
  pmMenuOpen = false;
  pmDeleteConfirm = false;
  renderPhotoManager();
}
function closePhotoManager(){
  pmCtx = null;
  pmSel = new Set();
  pmPhoto = null;
  pmMenuOpen = false;
  pmDeleteConfirm = false;
  const el = document.getElementById('pmOverlay');
  if(el) el.remove();
  document.body.classList.remove('pm-open');
}
function pmToggleSel(id){
  if(pmSel.has(id)) pmSel.delete(id); else pmSel.add(id);
  renderPhotoManager();
}
function pmClearSel(){
  pmSel = new Set();
  pmMenuOpen = false;
  pmDeleteConfirm = false;
  renderPhotoManager();
}
/* Newest first. A photo's date is its walk's date, so this sorts by walk and
   the batches stack in the order they were taken. Photos with no resolvable
   walk keep their seed order at the end rather than jumping to the top. */
function _pmSortNewest(list){
  return (list || []).map((p, i) => {
    /* Guard on p.walk before asking: walkFor falls back to WALKS[0] for any
       id it doesn't know, null included, so an unguarded call hands a
       walk-less photo the first walk's date and sorts it as three months
       old the moment it's added. */
    const w = (p.walk && typeof walkFor === 'function') ? walkFor(p.walk) : null;
    /* Walk date when there is a walk; otherwise the moment it was added.
       Without the fallback an upload sorts as undated and sinks to the end
       of its section, which is where you least want the thing you just put
       there. */
    const t = w && w.date ? Date.parse(w.date) : (p.addedAt || NaN);
    return {p, i, t};
  }).sort((a, b) => {
    if(isNaN(a.t) && isNaN(b.t)) return a.i - b.i;
    if(isNaN(a.t)) return 1;
    if(isNaN(b.t)) return -1;
    return b.t - a.t || a.i - b.i;
  }).map(x => x.p);
}
/* What's on screen, in order. The group's own photos lead — they're the
   room-level record — then a section per task that has any. From a task it's
   that task first and the room's below, as context. */
/* Sections carry `dest` — the photo fields an upload landing here would take.
   That's what lets a drop or an add-tile skip a destination picker entirely:
   the section you dropped into IS the answer. */
function _pmSections(){
  if(!pmCtx) return [];
  const all = (typeof PHOTOS !== 'undefined') ? PHOTOS : [];
  /* Synthetic buckets, not places you can put a photo. Curbside belongs to
     the property and Unsorted is the absence of a destination, so both stay
     hidden when empty and neither accepts an add. */
  const bucket = s => (s.photos.length ? [s] : []);
  if(pmCtx.scope === 'task'){
    const t = TASKS.find(x => x.id === pmCtx.taskId);
    if(!t) return [];
    return [
      {key:'task', title: t.name, kind:'task', dest:{kind:'task', room:t.room, task:t.code},
       photos: _pmSortNewest(all.filter(p => p.kind === 'task' && p.task === t.code))},
      {key:'group', title: t.room, kind:'group', dest:{kind:'group', room:t.room, task:null},
       photos: _pmSortNewest(all.filter(p => p.kind === 'group' && p.room === t.room))},
    ];
  }
  // Scope: the whole project. Curbside leads — it's the property rather
  // than any room — then every group with its tasks, Unsorted last.
  if(pmCtx.scope === 'scope'){
    const secs = [...bucket({key:'curb', title:'Curbside', kind:'group', dest:null,
                   photos: _pmSortNewest(all.filter(p => p.kind === 'curbside'))})];
    [...new Set(TASKS.map(t => t.room))].forEach(r => {
      secs.push({key:'g' + r, title: r, kind:'group', dest:{kind:'group', room:r, task:null},
                 photos: _pmSortNewest(all.filter(p => p.kind === 'group' && p.room === r))});
      TASKS.filter(t => t.room === r).forEach(t => {
        secs.push({key:'t' + t.id, title: t.name, kind:'task', dest:{kind:'task', room:r, task:t.code},
                   photos: _pmSortNewest(all.filter(p => p.kind === 'task' && p.task === t.code))});
      });
    });
    secs.push(...bucket({key:'unsorted', title:'Unsorted', kind:'group', dest:null,
               photos: _pmSortNewest(all.filter(p => p.kind === 'unsorted'))}));
    return secs;
  }
  const room = pmCtx.room;
  const out = [{key:'group', title: room, kind:'group', dest:{kind:'group', room, task:null},
                photos: _pmSortNewest(all.filter(p => p.kind === 'group' && p.room === room))}];
  TASKS.filter(t => t.room === room).forEach(t => {
    out.push({key:'t' + t.id, title: t.name, kind:'task', dest:{kind:'task', room, task:t.code},
              photos: _pmSortNewest(all.filter(p => p.kind === 'task' && p.task === t.code))});
  });
  // Unsorted is a scope-level section only: a photo nobody has assigned
  // isn't this room's, and listing it here would say it was.
  return out;
}
/* Sections keyed for lookup, so a drop or an add-tile can resolve its
   destination from the key alone without threading it through the DOM. */
function _pmSecByKey(k){ return _pmSections().find(s => s.key === k) || null; }

/* The photo row's CTA. It used to open the photo drawer to add; it now hands
   off to Progress, which is the surface that holds the whole photo history —
   so the button promises what you land on ("View all & add") rather than the
   narrower thing it used to do. Kept as a helper because scope, group and
   task all render this same button and had drifted before. */
function goToProgressPhotos(){
  if(typeof setWorkMode === 'function') setWorkMode('pano');   // 'pano' is the Progress tab
}

/* ── adding photos ────────────────────────────────────────────────
   The overlay owns the whole add path now. Two ways in, one code path:
   an add tile at the end of every section (B), and dropping files onto a
   section (C). Both resolve their destination from the section itself, so
   there is no "which task is this for?" picker anywhere — the answer is
   where you dropped it.

   A photo is an event, not a loose file: every one written here carries a
   person, a source and a timestamp, the same shape the seeded uploads have.
   Nothing lands without a destination. */

/* Whoever is adding. The demo has no session, so this reads the role off the
   shell's stored state and picks a matching person out of PHOTO_PEOPLE — the
   roster the activity feed already attributes to. Reusing it means an upload
   is credited to someone who appears elsewhere in the product rather than to
   a name invented for this one surface. */
function _pmMe(){
  let r = 'admin';
  try{
    const st = JSON.parse(localStorage.getItem('kai_comp_state') || '{}');
    if(st && st.role) r = String(st.role).toLowerCase();
  }catch(e){}
  const want = (r === 'contractor' || r === 'field') ? 'Field Agent'
             : (r === 'ops') ? 'Ops' : 'Manager';
  const pool = (typeof PHOTO_PEOPLE !== 'undefined')
    ? PHOTO_PEOPLE.filter(x => x.role === want) : [];
  if(pool.length) return pool[0].who;
  return (typeof PHOTO_PEOPLE !== 'undefined' && PHOTO_PEOPLE[0]) ? PHOTO_PEOPLE[0].who : 'Field agent';
}

/* The plus that closes every grid (B). Sized by the same track as the tiles
   around it, so a group section's add tile is small and a task's is large —
   it reads as one more slot in that section rather than a control bolted on. */
function _pmAddTileHtml(s){
  if(!s.dest) return '';
  // Both routes named, but tersely — a group section's tile is ~128px wide
  // and a sentence won't sit in it. The strip carries the full explanation.
  return `<button type="button" class="pm-add-tile" onclick="pmBrowse('${esc(s.key)}')"
            title="Drag photos onto ${esc(s.title)}, or click to browse your computer">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
            <span>Drop or browse</span>
          </button>`;
}

/* A section with nothing in it still has to be somewhere you can put a photo,
   which is the whole reason empty sections render at all now. It collapses to
   a single strip rather than an empty grid — 25+ sections in scope view, most
   of them empty early on, and a full-height void each would bury the ones
   that have content. */
function _pmAddStripHtml(s){
  if(!s.dest) return `<div class="pm-empty">No photos here yet.</div>`;
  // The strip has the width to say both routes properly, so it does: drag
  // from the desktop, or click to open the file dialog.
  return `<button type="button" class="pm-add-strip" onclick="pmBrowse('${esc(s.key)}')"
            title="Drag photos onto ${esc(s.title)}, or click to browse your computer">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
            <span>Drag photos here from your computer, or <b>browse</b> to choose files</span>
          </button>`;
}

let pmDropKey = null;      // section currently under a drag
let pmJustAdded = [];      // ids to flash, so you can see what landed

/* The hidden input that fronts the OS file dialog. One element reused for
   every section — the destination rides in the onchange closure, not in the
   input — so the DOM doesn't collect one of these per section. */
function _pmFileInput(){
  let el = document.getElementById('pmFile');
  if(!el){
    el = document.createElement('input');
    el.type = 'file'; el.id = 'pmFile'; el.multiple = true; el.accept = 'image/*';
    el.style.display = 'none';
    document.body.appendChild(el);
  }
  return el;
}

/* Browsing opens the real file dialog. Nothing is written until files come
   back, so cancelling out adds nothing — which is the point: the click is the
   start of a choice, not the choice itself. */
function pmBrowse(key){
  const sec = _pmSecByKey(key);
  if(!sec || !sec.dest) return;
  const inp = _pmFileInput();
  inp.value = '';
  /* Copy the list out before resetting the input. inp.files is live, so
     clearing value first empties the very FileList we're about to read — the
     reset has to come after, and it has to come at all, or picking the same
     file twice in a row fires no change event. */
  inp.onchange = () => {
    const fs = Array.prototype.slice.call(inp.files || []);
    inp.value = '';
    pmIngest(key, fs);
  };
  inp.click();
}

/* Reads a File into a data URL, downscaled. Two reasons not to use
   URL.createObjectURL: the panel runs in a srcdoc iframe, so its origin is
   null and CSS refuses to fetch blob:null/... (the <img> hero resolves it,
   the tile's background-image silently doesn't) — and a phone photo dropped
   straight in is several megabytes held per tile. Longest edge is capped so
   the grid stays responsive with a real camera roll in it. */
function _pmReadImage(file, maxEdge){
  return new Promise(resolve => {
    const fr = new FileReader();
    fr.onerror = () => resolve(null);
    fr.onload = () => {
      const img = new Image();
      img.onerror = () => resolve(fr.result);      // unreadable: keep the original
      img.onload = () => {
        const cap = maxEdge || 1400;
        const long = Math.max(img.width, img.height);
        if(long <= cap) return resolve(fr.result);
        const k = cap / long;
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * k);
        c.height = Math.round(img.height * k);
        try{
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          resolve(c.toDataURL('image/jpeg', 0.82));
        }catch(e){ resolve(fr.result); }
      };
      img.src = fr.result;
    };
    fr.readAsDataURL(file);
  });
}

/* Takes real File objects — from the dialog or from a drop — and writes one
   photo per image. The file itself is rendered, so what you dropped is what
   you see rather than a placeholder standing in for it. Non-images are
   skipped and counted rather than silently swallowed. */
function pmIngest(key, fileList){
  const sec = _pmSecByKey(key);
  if(!sec || !sec.dest) return 0;
  if(typeof PHOTOS === 'undefined') return 0;
  const files = Array.prototype.slice.call(fileList || []);
  if(!files.length) return 0;
  const imgs = files.filter(f => /^image\//.test(f.type || ''));
  const skipped = files.length - imgs.length;
  if(!imgs.length){
    if(typeof toast === 'function') toast('Only image files can be added');
    return 0;
  }
  const me = _pmMe();
  const now = Date.now();
  // Reading is async, so the writes are held until every file is in hand —
  // otherwise photos appear one at a time in whatever order decoding finishes.
  Promise.all(imgs.map(f => _pmReadImage(f))).then(srcs => {
    const ids = [];
    imgs.forEach((f, i) => {
      if(!srcs[i]) return;
      const id = PHOTOS.reduce((m, p) => Math.max(m, p.id || 0), 0) + 1;
      PHOTOS.unshift({
        id, seed: 1400 + id, room: sec.dest.room, kind: sec.dest.kind,
        task: sec.dest.task, walk: null, source: 'uploaded', by: me,
        addedAt: now + i,                  // newest-first sort has something to bite on
        src: srcs[i],
        fileName: f.name || ''
      });
      ids.push(id);
    });
    if(!ids.length){
      if(typeof toast === 'function') toast('Could not read those files');
      return;
    }
    pmJustAdded = ids;
    setTimeout(() => { pmJustAdded = []; if(pmCtx) renderPhotoManager(); }, 1600);
    if(typeof renderAll === 'function') renderAll();   // strips outside the overlay follow
    if(pmCtx) renderPhotoManager();
    if(typeof toast === 'function'){
      toast(ids.length + ' photo' + (ids.length === 1 ? '' : 's') + ' added to ' + sec.title
        + (skipped ? ' \u00b7 ' + skipped + ' non-image file' + (skipped === 1 ? '' : 's') + ' skipped' : ''));
    }
  });
  return imgs.length;
}

/* ── drop (C) ── every section is a target; the one under the cursor lights.
   dragenter/leave fire per descendant, so this tracks by key rather than
   counting enters, which is what makes the highlight stable across children. */
function pmDragOver(e, key){
  const sec = _pmSecByKey(key);
  if(!sec || !sec.dest) return;                      // no destination, no drop
  e.preventDefault();
  if(e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
  if(pmDropKey !== key){
    pmDropKey = key;
    _pmPaintDrop();
  }
}
function pmDragLeave(e, key){
  // Only clear when the pointer has actually left the section, not merely
  // crossed onto one of its tiles.
  if(e.currentTarget.contains(e.relatedTarget)) return;
  if(pmDropKey === key){ pmDropKey = null; _pmPaintDrop(); }
}
function pmDrop(e, key){
  e.preventDefault();
  pmDropKey = null;
  _pmPaintDrop();
  // Only a drag carrying files does anything. Dragging something from inside
  // the page lands here too, and should be a no-op rather than an add.
  const files = (e.dataTransfer && e.dataTransfer.files) ? e.dataTransfer.files : null;
  if(files && files.length) pmIngest(key, files);
}
/* Repaint the highlight directly rather than re-rendering: a full render
   during a drag tears down the element the drag is over and the drop is lost. */
function _pmPaintDrop(){
  document.querySelectorAll('.pm-sec').forEach(el => {
    el.classList.toggle('is-drop', el.dataset.k === pmDropKey);
  });
}
function _pmTitle(){
  if(!pmCtx) return '';
  if(pmCtx.scope === 'scope') return 'Scope';
  if(pmCtx.scope === 'task'){
    const t = TASKS.find(x => x.id === pmCtx.taskId);
    return t ? t.name : 'Photos';
  }
  return pmCtx.room || 'Photos';
}
function renderPhotoManager(){
  let el = document.getElementById('pmOverlay');
  if(!pmCtx){ if(el) el.remove(); document.body.classList.remove('pm-open'); return; }
  if(!el){
    el = document.createElement('div');
    el.id = 'pmOverlay';
    document.body.appendChild(el);
    document.body.classList.add('pm-open');
  }
  const secs = _pmSections();
  const total = secs.reduce((n, s) => n + s.photos.length, 0);
  // hideTag: every section header already names what its photos belong to,
  // so the tile's own corner tag would repeat it — "Cabinets" under a heading
  // that reads Cabinets.
  const tile = (p, i) => {
    const on = pmSel.has(p.id);
    const fresh = (typeof pmJustAdded !== 'undefined') && pmJustAdded.indexOf(p.id) !== -1;
    return `<div class="pm-tile${on ? ' is-sel' : ''}${fresh ? ' is-new' : ''}" data-pm-id="${p.id}">
      <div class="pm-tile-open" onclick="pmOpenPhoto(${p.id})">${_pgdPhotoFigHtml(p, i, '', true)}</div>
      <button type="button" class="pm-check" role="checkbox" aria-checked="${on}"
        aria-label="Select photo" onclick="event.stopPropagation();pmToggleSel(${p.id})">
        <svg viewBox="0 0 14 14" aria-hidden="true"><path d="M2.5 7.5l3 3 6-7"/></svg>
      </button>
    </div>`;
  };
  const body = secs.length
    ? secs.map(s => `<section class="pm-sec is-${s.kind === 'task' ? 'task' : 'group'}${s.photos.length ? '' : ' is-vacant'}" data-k="${esc(s.key)}"${s.dest
        ? ` ondragover="pmDragOver(event,'${esc(s.key)}')" ondragleave="pmDragLeave(event,'${esc(s.key)}')" ondrop="pmDrop(event,'${esc(s.key)}')"`
        : ''}>
        <div class="pm-sec-hd">
          <span class="pm-sec-name is-${s.kind === 'task' ? 'task' : 'group'}">${esc(s.title)}</span>
          ${s.kind === 'task' ? '' : `<span class="pm-sec-kind">group</span>`}
          <span class="pm-sec-n">${s.photos.length} ${s.photos.length === 1 ? 'photo' : 'photos'}</span>
        </div>
        ${s.photos.length
          ? `<div class="pm-grid">${s.photos.map(tile).join('')}${_pmAddTileHtml(s)}</div>`
          : _pmAddStripHtml(s)}
      </section>`).join('')
    : `<div class="pm-empty">No photos here yet.</div>`;
  const _n = pmSel.size;
  // Delete confirms in the bar rather than a modal: the takeover is dark
  // and full-screen, and .se-modal is a white card that would fight it.
  const _barActs = pmDeleteConfirm
    ? `<div class="pm-bar-confirm">
         <span class="pm-bar-warn">Delete ${_n} photo${_n === 1 ? '' : 's'}?</span>
         <button type="button" class="pm-bar-btn" onclick="pmCancelDelete()">Cancel</button>
         <button type="button" class="pm-bar-btn is-danger" onclick="pmDeleteSelected()">Delete</button>
       </div>`
    : `<div class="pm-bar-acts">
         <button type="button" class="pm-bar-btn is-danger" onclick="pmAskDelete()">Delete</button>
         <span class="pm-menu-wrap">
           <button type="button" class="pm-bar-btn is-primary" onclick="pmToggleMenu()">Move or copy</button>
           ${pmMenuOpen ? `<div class="pm-menu" onclick="event.stopPropagation()">
             <div class="pm-menu-hd">
               <span class="pm-seg">
                 <button type="button" class="${pmMoveMode === 'move' ? 'on' : ''}" onclick="pmSetMoveMode('move')">Move</button>
                 <button type="button" class="${pmMoveMode === 'copy' ? 'on' : ''}" onclick="pmSetMoveMode('copy')">Copy</button>
               </span>
               <div class="pm-menu-lbl">${_n} photo${_n === 1 ? '' : 's'} to</div>
             </div>
             ${_pmTargetsHtml()}
           </div>` : ''}
         </span>
         <span class="pm-bar-div"></span>
         <button type="button" class="pm-bar-btn" onclick="pmClearSel()">Deselect</button>
       </div>`;
  const bar = _n
    ? `<div class="pm-bar">
         <span class="pm-bar-n">${_n} selected</span>
         <span class="pm-bar-sp"></span>
         ${_barActs}
       </div>`
    : '';
  el.innerHTML = `<div class="pm-scrim"></div>
    <div class="pm-panel" role="dialog" aria-modal="true" aria-label="Photos">
      <header class="pm-hd">
        <div class="pm-hd-l">
          <div class="pm-title-row">
            ${pmPhoto !== null
              ? `<button type="button" class="pm-back" onclick="pmBackToGrid()"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3L5 8l5 5"/></svg>All photos</button>`
              : ''}
            <div class="pm-title">${esc(_pmTitle())}</div>
            <div class="pm-count">${total} photo${total === 1 ? '' : 's'}</div>
          </div>
        </div>
        <button type="button" class="pm-close" onclick="closePhotoManager()" aria-label="Close">
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 3l10 10M13 3L3 13"/></svg>
        </button>
      </header>
      <div class="pm-body${pmPhoto !== null ? ' is-photo' : ''}">${pmPhoto !== null ? _pmPhotoModeHtml() : body}</div>
      ${bar}
    </div>`;
  _pmFillPhotoPanes();
}
/* Escape closes it, ahead of anything else listening. */
if(typeof window !== 'undefined' && !window.__kaiPmBound){
  window.__kaiPmBound = true;
  document.addEventListener('keydown', e => {
    if(!pmCtx) return;
    // Escape unwinds one level at a time: photo → grid → closed.
    if(e.key === 'Escape'){ e.stopPropagation(); pmPhoto !== null ? pmBackToGrid() : closePhotoManager(); }
    else if(pmPhoto !== null && e.key === 'ArrowLeft'){ e.stopPropagation(); pmStep(-1); }
    else if(pmPhoto !== null && e.key === 'ArrowRight'){ e.stopPropagation(); pmStep(1); }
  }, true);
}

function _pgdPhotoFigHtml(p, i, labelName, hideTag){
  const bg = _photoBg(p, i);
  const kindCls = p.kind === 'group' ? ' pgd-photo-group' : '';
  // Guarded on p.walk: walkFor(null) returns WALKS[0], which would caption an
  // uploaded photo with a walk it was never part of.
  const walk = (p.walk && typeof walkFor === 'function') ? walkFor(p.walk) : null;
  /* Corner tag names what the shot belongs to. A task shot is tagged with the
     task's name rather than its code — the code means nothing at a glance —
     capped at 18 characters so it can't push past the source badge. hideTag
     suppresses a tag that would only repeat the page you're already on. */
  const taskName = (p.kind === 'task' && p.task && typeof TASKS !== 'undefined')
    ? ((TASKS.find(x => x.code === p.task) || {}).name || p.task)
    : null;
  const clip = (str) => String(str).length > 18 ? String(str).slice(0, 17) + '…' : String(str);
  const tag = p.kind === 'group' ? (p.room || 'Group')
            : p.kind === 'task'  ? clip(taskName || 'Task')
            : 'Project';
  const tagChip = (hideTag && (tag === hideTag || taskName === hideTag))
    ? ''
    : `<span class="pgd-photo-groupbadge">${esc(tag)}</span>`;
  /* Source glyph: camera for captured on site, up-arrow for uploaded after.
     It lives in the hover overlay rather than on the image, so it appears
     with the rest of the provenance instead of competing with the tag. */
  const isUploaded = p.source === 'uploaded';
  const srcIcon = p.source
    ? `<svg class="pgd-photo-src" viewBox="0 0 16 16" aria-hidden="true">${isUploaded
        ? `<path d="M8 10.5V2.8M5.2 5.6L8 2.8l2.8 2.8"/><path d="M2.6 9.8v3.4h10.8V9.8"/>`
        : `<path d="M2.4 5.4h2.4l1-1.6h4.4l1 1.6h2.4v7.4H2.4z"/><circle cx="8" cy="8.9" r="2.1"/>`}</svg>`
    : '';
  /* Date is the only thing under the tile. The walk name used to sit inline
     with it; it's in the tooltip now along with the author. A photo added in
     the manager has no walk to date it, so it falls back to when it landed —
     otherwise its caption is blank and the tile sits shorter than its
     neighbours. */
  const _added = p.addedAt
    ? new Date(p.addedAt).toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'})
    : '';
  const dateLbl = walk && walk.date
    ? `<span class="pgd-photo-date">${esc(walk.date)}</span>`
    : (_added ? `<span class="pgd-photo-date">${esc(_added)}</span>` : '');
  /* Drawn into the tile on hover rather than left to the browser's title
     tooltip, which lags a second and looks like nothing else in the product.
     The same string still rides along as aria-label so it reaches screen
     readers — but not as title, or the OS tooltip would fire on top of this. */
  const metaOverlay = (walk || p.by || srcIcon) ? `<span class="pgd-photo-meta">
            ${walk ? `<span class="pgd-photo-meta-walk">${esc(walk.short || walk.label)}</span>` : ''}
            <span class="pgd-photo-meta-row">
              <span class="pgd-photo-meta-by">${p.by ? `${isUploaded ? 'Uploaded' : 'Captured'} &middot; ${esc(p.by)}` : ''}</span>
              ${srcIcon}
            </span>
          </span>` : '';
  const tip = [
    esc(labelName),
    walk ? esc(walk.label) : '',
    p.by ? `${isUploaded ? 'Uploaded' : 'Captured on site'} by ${esc(p.by)}` : '',
  ].filter(Boolean).join(' · ');
  return `<figure class="pgd-photo-fig">
          <button class="pgd-photo${kindCls}" style="background:${bg}" onclick="openGalleryPhoto(${p.id||0})" aria-label="${tip}">${tagChip}${metaOverlay}</button>
          ${dateLbl}
        </figure>`;
}

/* ── Whole-scope overview ────────────────────────────────────────────
   Every task in the scope on one page, still organised by group. Each
   group gets its own name as the section header — the group page's
   generic "Tasks in this group" caption only makes sense when you're
   already inside one group; here it would repeat down the page and tell
   you nothing. Rows reuse _pgdTaskRowHtml so they're identical to the
   group page's, and group headers drill into that group.

   Tasks come from visibleTasks() rather than TASKS so the page always
   agrees with the sidebar the user is reading it next to (an active
   filter hides the same rows in both). */
/* ── Scope-level sources ──────────────────────────────────────────────
   Every note in the project, newest first, however it was filed: the user's
   own, each room's, and each task's. */
function scopeNotesPool(){
  const out = [];
  if(typeof USER_NOTES !== 'undefined'){
    Object.keys(USER_NOTES).forEach(k => out.push(...(USER_NOTES[k] || [])));
  }
  /* Ahead of the room and task notes: these are about the document as a whole,
     which is the level this drawer is opened at, and the newest of them is the
     most recent note in the project. */
  if(typeof _histSubmissionNotes === 'function') out.push(..._histSubmissionNotes());
  const rooms = [...new Set((typeof TASKS !== 'undefined' ? TASKS : []).map(t => t.room))];
  rooms.forEach(r => {
    if(typeof roomNotes === 'function') out.push(...(roomNotes(r) || []));
  });
  (typeof TASKS !== 'undefined' ? TASKS : []).forEach(t => {
    if(typeof taskNotes === 'function') out.push(...(taskNotes(t) || []));
  });
  return out;
}
/* The drawer, opened against the whole project. dwCtx gains a third type;
   everything that branches on it already treats non-task as group-shaped,
   which is the right default for scope too. */
function openScopeDrawer(tab){
  dwCtx = {type:'scope'};
  dwNoteLevel = 'scope';   // opened from the scope — default the note to it
  dwNoteResetEditState();
  dwNoteHidden = true;
  dwActiveTab = tab || 'notes';
  const n = (typeof TASKS !== 'undefined') ? TASKS.length : 0;
  document.getElementById('dwTask').textContent = `Scope · ${n} ${n === 1 ? 'task' : 'tasks'}`;
  document.getElementById('dwTitle').textContent = 'All notes';
  document.getElementById('drawer').classList.add('open');
  document.getElementById('drawer-scrim').classList.add('open');
  dwTab(dwActiveTab);
}
/* Activity across the whole project, rolled up by group. A scope entry that
   listed all sixteen task names wouldn't be a summary of anything. */
function _pgdScopeActivity(){
  const byKey = new Map();
  const out = [];
  const rooms = [...new Set(TASKS.map(t => t.room))];
  rooms.forEach(room => {
    const items = TASKS.filter(t => t.room === room);
    (typeof _pgdGroupActivity === 'function' ? _pgdGroupActivity({key:room, items}) : [])
      .forEach(e => {
        const key = `${e.type}|${e.label}|${e.when}`;
        const seen = byKey.get(key);
        if(seen){ if(!seen.groups.includes(room)) seen.groups.push(room); return; }
        const entry = {...e, groups: e.tasks && e.tasks.length ? [room] : []};
        byKey.set(key, entry);
        out.push(entry);
      });
  });
  return out
    .map((r, i) => ({r, i, t: Date.parse(r.when)}))
    .sort((a, b) => {
      if(isNaN(a.t) && isNaN(b.t)) return a.i - b.i;
      if(isNaN(a.t)) return -1;
      if(isNaN(b.t)) return 1;
      return a.t - b.t || a.i - b.i;
    })
    .map(x => x.r);
}
function _pgdScopeActivityHtml(){
  const rows = _pgdScopeActivity().slice().reverse();
  if(!rows.length){
    return `<div class="pgd-details-sec sec-taskact">
      <div class="pgd-sec-hd"><div class="pgd-details-title">Scope activity</div></div>
      <div class="pgd-photos-empty">No activity yet.</div>
    </div>`;
  }
  const cap = 8;
  const shown = pgdActAllOpen ? rows : rows.slice(0, cap);
  const card = r => {
    const g = r.groups || [];
    const names = g.length
      ? `<div class="sec-taskact-tasks">${g.length > 1 ? `<span class="sec-taskact-n">${g.length} groups</span>` : ''}${esc(g.join(', '))}</div>`
      : '';
    return `<li class="sec-taskact-row${r.tone ? ' is-' + r.tone : ''}">
      <span class="sec-taskact-mark"></span>
      <div class="sec-taskact-card">
        <div class="sec-taskact-main">
          <div class="sec-taskact-kind">${esc(r.type)}</div>
          <div class="sec-taskact-label">${r.label}</div>
          ${names}
        </div>
        <div class="sec-taskact-meta">
          <div class="sec-taskact-when">${esc(r.when)}</div>
          <div class="sec-taskact-who">${esc(r.who)}</div>
        </div>
      </div>
    </li>`;
  };
  const more = rows.length > cap
    ? `<button class="sec-mod-add pgd-act-more" onclick="event.stopPropagation();pgdActToggleAll()">${
        pgdActAllOpen ? 'Show less' : `Show all ${rows.length}`}</button>`
    : '';
  return `<div class="pgd-details-sec sec-taskact">
    <div class="pgd-sec-hd">
      <div class="pgd-details-title">Scope activity</div>
      <div class="pgd-sec-hd-r">${more}</div>
    </div>
    <ol class="sec-taskact-list">${shown.map(card).join('')}</ol>
  </div>`;
}
/* The notes module, scope-scoped. Same shape as the group's — a preview of
   the latest, a count that opens the drawer. */
function _scopeNotesHtml(){
  const all = scopeNotesPool();
  const n = all.length;
  const latest = all[0];
  const countSuffix = n
    ? ` <span class="sec-mod-count is-static">&bull; ${n} total ${n === 1 ? 'note' : 'notes'}</span>`
    : '';
  const body = latest
    ? `<div class="shop-notes-card">
         <div class="shop-notes-head">
           <span class="shop-notes-who"><b>${esc(latest.who || 'Team')}</b></span>
           <span class="shop-notes-time">${esc(latest.when || '')}</span>
         </div>
         <div class="shop-notes-body">${esc(latest.body || '')}</div>
       </div>`
    : `<div class="shop-notes-empty">No notes on this scope yet.</div>`;
  return `<div class="pgd-hdr-box sec-tasknotes pgd-groupnotes">
    <div class="pgd-sec-hd">
      <div class="pgd-details-title">Notes${countSuffix}</div>
      <div class="pgd-sec-hd-r">
        <button class="sec-mod-add" onclick="event.stopPropagation();openScopeDrawer('notes')" title="View every note and add one">View all &amp; add</button>
      </div>
    </div>
    ${body}
  </div>`;
}

function _renderScopePageHtml(opts){
  opts = opts || {};
  const taskOnClick = opts.taskOnClick || 'selectTask';
  if(typeof seedPhotos === 'function' && (!PHOTOS || !PHOTOS.length)) seedPhotos();
  const tasks  = (typeof visibleTasks === 'function') ? visibleTasks() : TASKS;
  const groups = (typeof groupTasks === 'function') ? groupTasks(tasks) : [];
  if(!groups.length){
    return `<div class="pgd"><div class="pgd-muted" style="padding:24px 0">
      ${TASKS.length ? 'No tasks match the current filter.' : 'Nothing in this scope yet.'}
    </div></div>`;
  }
  const byContractor = groupBy === 'contractor';
  const total       = tasks.reduce((s,t) => s + dollars(t.cost), 0);
  const contractors = new Set(tasks.map(t => t.gc).filter(Boolean));
  const rooms       = new Set(tasks.map(t => t.room).filter(Boolean));
  const nApproved   = tasks.filter(t => approved.has(t.id)).length;
  // Same override the sidebar rollup honours, so the scope total reads the
  // same in both places when the shell has pushed a version-specific number.
  const totalDisplay = (typeof __KAI_SCOPE_TOTAL_OVERRIDE !== 'undefined' && __KAI_SCOPE_TOTAL_OVERRIDE)
    ? __KAI_SCOPE_TOTAL_OVERRIDE : money(total);

  /* Photo strip — same tiles the group page uses (_pgdPhotoFigHtml), just
     widened to the whole scope: every group shot from the rooms currently
     in view, in sidebar order, then the project-level shots that aren't
     pinned to any one room. Rooms come from the visible tasks, so a filter
     that hides a room hides its photos too and the strip keeps agreeing
     with the sections below it. */
  const _roomOrder = (typeof ROOMS !== 'undefined' ? ROOMS : []).filter(r => rooms.has(r));
  // Anything the canonical ROOMS list doesn't know about still gets shown,
  // appended after the known rooms rather than dropped on the floor.
  const _extraRooms = [...rooms].filter(r => !_roomOrder.includes(r));
  const scopePhotos = [
    ..._roomOrder.concat(_extraRooms)
        .flatMap(r => (PHOTOS || []).filter(p => p.kind === 'group' && p.room === r)),
    ...(PHOTOS || []).filter(p => p.kind === 'unsorted'),
  ];
  const photoStripHtml = scopePhotos.length
    ? `<div class="pgd-photos">${scopePhotos.map((p,i) => _pgdPhotoFigHtml(p, i, p.room || 'Project')).join('')}</div>`
    : `<div class="pgd-photos-empty">No photos yet in this scope</div>`;

  const sections = groups.map(g => {
    const n = g.items.length;
    const gCost = g.items.reduce((s,t) => s + dollars(t.cost), 0);
    const key = String(g.key).replace(/'/g, "\\'");
    const rows = g.items.map(t => _pgdTaskRowHtml(t, taskOnClick)).join('');
    return `<div class="pgd-details-sec">
      <div class="pgd-sec-hd">
        <button class="pgd-scope-grp" onclick="selectGroup('${key}')" title="Open ${esc(g.name)}">
          <span class="pgd-scope-grp-name">${esc(g.name)}</span>
          <span class="pgd-scope-grp-go" aria-hidden="true">&rsaquo;</span>
        </button>
        <span class="pgd-scope-grp-meta">${n} ${n===1?'task':'tasks'}<span class="pgd-scope-dot">&middot;</span>${money(gCost)}</span>
      </div>
      <div class="pgd-tk-list">${_pgdTaskHeadHtml()}${rows}</div>
    </div>`;
  }).join('');

  return `<div class="pgd">
    <div class="pgd-hdr-box">
      <div class="sec-taskcard-hdr">
        <div class="sec-taskcard-hdr-l">
          <div class="pgd-title">Scope</div>
          <div class="pgd-grp-meta">${tasks.length} task${tasks.length === 1 ? '' : 's'}<span class="sep">&middot;</span>${groups.length} ${byContractor ? 'contractor' : 'group'}${groups.length === 1 ? '' : 's'}${PROJ_MODE === 'review' ? `<span class="sep">&middot;</span>${nApproved} approved` : ''}</div>
        </div>
        <div class="sec-taskcard-hdr-r">
          <span class="sec-taskcard-amt-line"><span class="sec-taskcard-amt">${totalDisplay}</span></span>
        </div>
      </div>
    </div>
    <div class="pgd-details-sec">
      <div class="pgd-sec-hd">
        <div class="pgd-details-title">Group and Task Photos${scopePhotos.length ? ` <span class="sec-mod-count is-static">&bull; ${scopePhotos.length} total ${scopePhotos.length === 1 ? 'photo' : 'photos'}</span>` : ''}</div>
        <div class="pgd-sec-hd-r">
          <button class="sec-mod-add" onclick="event.stopPropagation();goToProgressPhotos()" title="View every photo in Progress and add more">View all &amp; add</button>
          <button class="sec-mod-gear" onclick="event.stopPropagation();openPhotoManager('scope')" title="Manage photos" aria-label="Manage photos"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82A1.65 1.65 0 0 0 3 13.09H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></button>
        </div>
      </div>
      ${photoStripHtml}
    </div>
    ${_scopeNotesHtml()}
    ${sections}
    ${_pgdScopeActivityHtml()}
  </div>`;
}

/* ── Group notes ─────────────────────────────────────────────────────
   Everything written anywhere in this group: the room's own notes, plus the
   notes on each of its tasks — seeded and user-added alike. One preview and
   a count, same as the task module; the drawer holds the rest.

   Ordering is best-effort. USER_NOTES is unshifted on save so it's genuinely
   newest-first, but the seeded pools carry display dates rather than
   sortable ones, so those are reversed (they're authored oldest-first) and
   appended. Good enough to put a real "most recent" at the top. */
function _groupNotesPool(room, tasks){
  const mine = [], seeded = [];
  if(room && typeof roomNotes === 'function'){
    seeded.push(...(roomNotes(room) || []).slice().reverse());
  }
  (tasks || []).forEach(t => {
    if(typeof USER_NOTES !== 'undefined' && USER_NOTES[t.id]) mine.push(...USER_NOTES[t.id]);
    if(typeof taskNotes === 'function') seeded.push(...(taskNotes(t) || []).slice().reverse());
  });
  return [...mine, ...seeded];
}
function _groupNotesAll(g){
  const room = (typeof groupBy !== 'undefined' && groupBy === 'contractor') ? null : (g && g.key);
  return _groupNotesPool(room, (g && g.items) ? g.items : []);
}
/* The drawer opens on a room rather than a group object, so it rebuilds the
   same pool from the room. Tasks come from visibleTasks() — the same set the
   module counts — so the drawer can't list fewer notes than the count that
   sent you there. */
function groupNotesForRoom(room){
  const tasks = (typeof visibleTasks === 'function' ? visibleTasks() : (typeof TASKS !== 'undefined' ? TASKS : []))
    .filter(t => t.room === room);
  return _groupNotesPool(room, tasks);
}
function _groupNotesHtml(g){
  if(!g) return '';
  const all = _groupNotesAll(g);
  const n = all.length;
  const latest = all[0];
  // openGroupDrawer keys off a room, which only holds when that's what we're
  // grouping by — grouped by contractor it would open an empty drawer, so the
  // control says so rather than misfiring.
  const canOpen = (typeof groupBy === 'undefined' || groupBy !== 'contractor');
  const open = canOpen
    ? `openGroupDrawer('${String(g.key).replace(/'/g, "\\'")}','notes')`
    : `toast('Group notes open from a room group')`;
  // Same as the task module: the count is the link, no separate view-all.
  const countSuffix = n
    ? ` <span class="sec-mod-count is-static">&bull; ${n} total ${n === 1 ? 'note' : 'notes'}</span>`
    : '';
  const title = `Notes${latest ? countSuffix : ''}`;
  const addBtn = `<button class="sec-mod-add" onclick="event.stopPropagation();${open}" title="${latest ? 'View every note and add one' : 'Add the first note'}">${latest ? 'View all &amp; add' : 'Add'}</button>`;
  const body = latest
    ? `<div class="shop-notes-card">
        <div class="shop-notes-head">
          <span class="shop-notes-who"><b>${esc(latest.who || 'Someone')}</b>${latest.role ? ` &middot; ${esc(latest.role)}` : ''}</span>
          <span class="shop-notes-time">${esc(latest.when || '')}</span>
        </div>
        <div class="shop-notes-body">${esc(latest.body || '')}</div>
      </div>`
    : `<div class="shop-notes-empty">No notes yet in this group.</div>`;
  return `<div class="pgd-hdr-box sec-tasknotes pgd-groupnotes">
    <div class="pgd-sec-hd">
      <div class="pgd-details-title">${title}</div>
      <div class="pgd-sec-hd-r">
        ${addBtn}
      </div>
    </div>
    ${body}
  </div>`;
}

/* Which columns a stage shows. Every entry names a status label the row pills
   use, so a rollup and the column beneath it can never disagree. */
function _pgdRollupCols(){
  const mode = (typeof PROJ_MODE !== 'undefined') ? PROJ_MODE : 'draft';
  const stage = (typeof STAGE_ID !== 'undefined') ? STAGE_ID : '';
  if(mode === 'draft')  return ['New','Started','Pending'];
  // Reviewed belongs at step 3 too: marking tasks reviewed is what that step
  // is for, and without the column those tasks drop out of the tally and the
  // numbers stop summing to the group's task count.
  if(mode === 'review') return stage === 'awaiting-pub'
    ? ['New','Started','Pending','Reviewed','Approved']
    : ['New','Started','Pending','Reviewed'];
  if(mode === 'closeout' || mode === 'closeout-approved')
    return ['New','Not started','In progress','Rework','Completed','Approved'];
  return ['New','Not started','In progress','Rework','Completed'];
}
/* Tally by the label the row itself would show, so the numbers add up to what
   you can see. Counts every task in the group. */
function _pgdRollupHtml(items){
  const cols = _pgdRollupCols();
  const tally = {};
  (items || []).forEach(t => {
    const meta = _pgdRowStatusMeta(t) || {};
    const k = meta.label || '';
    tally[k] = (tally[k] || 0) + 1;
  });
  const cells = cols.map(c =>
    `<div class="pgd-grp-roll"><span class="sec-taskcard-lbl">${esc(c)}</span>
      <span class="pgd-grp-roll-n${tally[c] ? '' : ' is-zero'}">${tally[c] || 0}</span></div>`).join('');
  return `<div class="pgd-grp-rolls">${cells}</div>`;
}

/* Merged group feed. Each entry keeps the task it came from so the card can
   name it; entries that are the same thing on the same day across several
   tasks become one row carrying all their names. */
function _pgdGroupActivity(g){
  if(!g || !g.items) return [];
  const rows = [];
  g.items.forEach(t => {
    (typeof taskActivityFeed === 'function' ? taskActivityFeed(t) : []).forEach((e, i) => {
      rows.push({...e, task: t.name, _seq: i});
    });
  });
  // Group-level notes sit in the same stream. They belong to the room, so
  // they never collapse into a task rollup.
  const room = g.items[0] ? g.items[0].room : null;
  if(room && typeof roomNotes === 'function'){
    (roomNotes(room) || []).forEach(n => {
      rows.push({type:'Group note', label: esc(n.body || '').slice(0, 90),
                 when: n.when || '', who: n.who || '', tone: '', task: null, _seq: 99});
    });
  }
  // Collapse by what happened + when. Task identity is deliberately not part
  // of the key — that's the whole point.
  const byKey = new Map();
  const out = [];
  rows.forEach(r => {
    if(!r.task){ out.push({...r, tasks: []}); return; }
    const key = `${r.type}|${r.label}|${r.when}`;
    const seen = byKey.get(key);
    if(seen){ seen.tasks.push(r.task); return; }
    const entry = {...r, tasks: [r.task]};
    byKey.set(key, entry);
    out.push(entry);
  });
  // Sort by date. The per-task feeds are each built chronologically, but
   // merging several plus the room's notes doesn't preserve that — a group
   // note landed after everything regardless of when it was written.
  // Unparseable dates keep their build order rather than jumping to the top.
  return out
    .map((r, i) => ({r, i, t: Date.parse(r.when)}))
    .sort((a, b) => {
      if(isNaN(a.t) && isNaN(b.t)) return a.i - b.i;
      if(isNaN(a.t)) return -1;
      if(isNaN(b.t)) return 1;
      return a.t - b.t || a.i - b.i;
    })
    .map(x => x.r);
}
/* Cards mirror the task feed's, plus a line naming the task — or, on a
   collapsed row, every task it covers. */
function _pgdGroupActivityHtml(g){
  const rows = _pgdGroupActivity(g).slice().reverse();
  if(!rows.length){
    return `<div class="pgd-details-sec sec-taskact">
      <div class="pgd-sec-hd"><div class="pgd-details-title">Group activity</div></div>
      <div class="pgd-photos-empty">No activity yet in this group.</div>
    </div>`;
  }
  const cap = 8;
  const shown = pgdActAllOpen ? rows : rows.slice(0, cap);
  const card = r => {
    const n = (r.tasks || []).length;
    const names = n
      ? `<div class="sec-taskact-tasks">${n > 1 ? `<span class="sec-taskact-n">${n} tasks</span>` : ''}${esc(r.tasks.join(', '))}</div>`
      : '';
    return `<li class="sec-taskact-row${r.tone ? ' is-' + r.tone : ''}">
      <span class="sec-taskact-mark"></span>
      <div class="sec-taskact-card">
        <div class="sec-taskact-main">
          <div class="sec-taskact-kind">${esc(r.type)}</div>
          <div class="sec-taskact-label">${r.label}</div>
          ${names}
        </div>
        <div class="sec-taskact-meta">
          <div class="sec-taskact-when">${esc(r.when)}</div>
          <div class="sec-taskact-who">${esc(r.who)}</div>
        </div>
      </div>
    </li>`;
  };
  const more = rows.length > cap
    ? `<button class="sec-mod-add pgd-act-more" onclick="event.stopPropagation();pgdActToggleAll()">${
        pgdActAllOpen ? 'Show less' : `Show all ${rows.length}`}</button>`
    : '';
  return `<div class="pgd-details-sec sec-taskact">
    <div class="pgd-sec-hd">
      <div class="pgd-details-title">Group activity</div>
      <div class="pgd-sec-hd-r">${more}</div>
    </div>
    <ol class="sec-taskact-list">${shown.map(card).join('')}</ol>
  </div>`;
}
let pgdActAllOpen = false;
function pgdActToggleAll(){
  pgdActAllOpen = !pgdActAllOpen;
  if(typeof renderAll === 'function') renderAll();
}

function _renderGroupPageHtml(opts){
  opts = opts || {};
  const includeActivity = !!opts.includeActivity;
  const taskOnClick = opts.taskOnClick || 'selectTask';
  if(typeof seedPhotos === 'function' && (!PHOTOS || !PHOTOS.length)) seedPhotos();
  const groups = (typeof groupTasks === 'function')
    ? groupTasks(TASKS)
    : ROOMS.map(r => ({key:r, name:r, items: TASKS.filter(t => t.room === r)}));
  const gIdx = groups.findIndex(g => g.key === selGroupKey);
  const g = groups[gIdx];
  if(!g) return `<div class="pgd"><div class="pgd-muted" style="padding:24px 0">Group not found. Pick another from the sidebar.</div></div>`;
  const prevG = groups[gIdx - 1] || null;
  const nextG = groups[gIdx + 1] || null;
  // Photos: group photos for the room + first task photo from each task.
  const groupPhotos = (groupBy === 'room')
    ? (PHOTOS || []).filter(p => p.kind === 'group' && p.room === g.key)
    : [];
  const firstTaskPhotos = g.items.slice(0, 6).flatMap(t => (PHOTOS || []).filter(p => p.kind === 'task' && p.task === t.code).slice(0, 1));
  const allGroupPhotos = [...groupPhotos, ...firstTaskPhotos];
  // Tile markup lives in _pgdPhotoFigHtml, shared with the scope page.
  const photoStripHtml = allGroupPhotos.length
    ? `<div class="pgd-photos">${allGroupPhotos.map((p,i) => _pgdPhotoFigHtml(p, i, g.name)).join('')}</div>`
    : `<div class="pgd-photos-empty">No photos yet for this group</div>`;
  // Aggregate details (Modifiers intentionally excluded from the overview).
  const gCost = g.items.reduce((s,t)=>s+dollars(t.cost), 0);
  const nApproved = g.items.filter(t => approved.has(t.id)).length;
  const contractorsSet = new Set(g.items.map(t => t.gc).filter(Boolean));
  // Task rows — mini cards that route into the task drill-in on click.
  // Row markup lives in _pgdTaskRowHtml, shared with the scope page.
  const taskRowsHtml = _pgdSortTasksForGroup(g.items)
    .map(t => _pgdTaskRowHtml(t, taskOnClick)).join('');
  // Activity below the tasks. The Activity tab has its own feed with the
  // filter bar; this is the Editor's, merged and rolled up.
  const groupActHtml = includeActivity ? '' : _pgdGroupActivityHtml(g);
  // Activity feed — Activity tab only.
  let activitySectionHtml = '';
  let ctrlBarHtml = '';
  if(includeActivity){
    const gFeedAll = (typeof activitiesForGroup === 'function') ? activitiesForGroup(g.key) : [];
    const gFeed = gFeedAll.filter(actPasses).slice(0, 14);
    const activityCardsHtml = gFeed.map((a,i) =>
      tlxRowHtml(a, i, gFeed.length, g.key.length)).join('');
    ctrlBarHtml = actCtrlBarHtml(gFeed.length);
    activitySectionHtml = `<div class="pgd-details-sec">
      <div class="pgd-details-title">Group activity</div>
      <div class="tlx">${activityCardsHtml || `<div class="pgd-muted" style="padding:16px 0">${actFilter==='all' ? 'No activity yet.' : `No “${esc(ACT_FILTER_LABEL(actFilter))}” activity in this group.`}</div>`}</div>
    </div>`;
  }
  return `<div class="pgd">
    ${ctrlBarHtml}
    <div class="pgd-hdr-box">
      <div class="sec-taskcard-hdr">
        <div class="sec-taskcard-hdr-l">
          <div class="pgd-title-l">
            <div class="pgd-title">${esc(g.name)}</div>
          ${editingGroupLabelFor === g.key
            ? `<input class="pgd-label-input" maxlength="40" value="${esc(groupLabels[g.key]||'')}" placeholder="e.g. Kitchen (including Pantry)"
                 onclick="event.stopPropagation()"
                 onkeydown="event.stopPropagation();if(event.key==='Enter'){event.preventDefault();commitGroupLabel('${g.key}',this.value);}else if(event.key==='Escape'){event.preventDefault();closeGroupLabelEdit();}"
                 onblur="if(editingGroupLabelFor==='${g.key}')commitGroupLabel('${g.key}',this.value)">`
            : `<button class="pgd-label-btn" onclick="event.stopPropagation();openGroupLabelEdit('${g.key}')" title="${groupLabels[g.key] ? 'Edit label' : 'Add label'}">
                 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"><path d="M22.5 1.5H13L0.5 14L10 23.5L22.5 11V1.5Z"/><path d="M20.501 3.5H17.501V6.5H20.501V3.5Z"/></svg>
               </button>
               ${groupLabels[g.key] ? `<span class="pgd-label-chip" onclick="event.stopPropagation();openGroupLabelEdit('${g.key}')" title="Edit label">${esc(groupLabels[g.key])}</span>` : ''}`
          }
          </div>
          <div class="pgd-grp-meta">Group ${gIdx + 1} of ${groups.length}<span class="sep">&middot;</span>${g.items.length} ${g.items.length === 1 ? 'task' : 'tasks'}</div>
        </div>
        <div class="sec-taskcard-hdr-r">
          <span class="sec-taskcard-amt-line">
            <span class="sec-taskcard-amt">${money(gCost)}</span>
          </span>
        </div>
      </div>
    </div>
    <div class="pgd-details-sec">
      <div class="pgd-sec-hd">
        <div class="pgd-details-title">Group and Task Photos${allGroupPhotos.length ? ` <span class="sec-mod-count is-static">&bull; ${allGroupPhotos.length} total ${allGroupPhotos.length === 1 ? 'photo' : 'photos'}</span>` : ''}</div>
        <div class="pgd-sec-hd-r">
          <button class="sec-mod-add" onclick="event.stopPropagation();goToProgressPhotos()" title="View every photo in Progress and add more">View all &amp; add</button>
          <button class="sec-mod-gear" onclick="event.stopPropagation();${(typeof groupBy === 'undefined' || groupBy !== 'contractor') ? `openPhotoManager('group','${String(g.key).replace(/'/g, "\\'")}')` : `toast('Group photos open from a room group')`}" title="Manage photos" aria-label="Manage photos"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82A1.65 1.65 0 0 0 3 13.09H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></button>
        </div>
      </div>
      ${photoStripHtml}
    </div>
    ${_groupNotesHtml(g)}
    <div class="pgd-details-sec">
      <div class="pgd-details-title">Tasks in this ${groupBy === 'contractor' ? 'contractor' : 'group'}</div>
      <div class="pgd-tk-list">${_pgdTaskHeadHtml()}${taskRowsHtml || '<div class="pgd-muted" style="padding:14px 0">No tasks in this group yet.</div>'}</div>
    </div>
    ${activitySectionHtml}
    ${groupActHtml}
    <div class="shop-nav-float">
      <button class="shop-nav-btn" ${prevG ? '' : 'disabled'} onclick="${prevG ? `selectGroup('${prevG.key}')` : ''}" title="${prevG ? esc(prevG.name) : 'No previous group'}">${svgChevL()} Previous group</button>
      <button class="shop-nav-btn" ${nextG ? '' : 'disabled'} onclick="${nextG ? `selectGroup('${nextG.key}')` : ''}" title="${nextG ? esc(nextG.name) : 'No next group'}">Next group ${svgChevR()}</button>
    </div>
  </div>`;
}
