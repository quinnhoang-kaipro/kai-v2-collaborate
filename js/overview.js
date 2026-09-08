/* ════════════════════════════════════════════════════════════════════
   OVERVIEW TAB
   The project's front page: what this job is, who is on it, which documents
   exist, and what has happened lately. It is the tab the panel opens on,
   because it is the only one that answers "what am I looking at" before you
   have chosen anything.

   Everything here that the prototype already knows is read, not restated:
   the budget sums the visible tasks, the documents come off VERSIONS, the
   note and photo counts come off the same pools the drawers use, the
   contractor rollup is TASKS grouped by contractor, and the activity feed is
   built from Artifact 2's version ladder and sign-offs — the same records the
   scrubber and the state card read.

   OVERVIEW_SEED below is only the part nothing else models: access codes,
   the property's own facts, the template, and the dispatch note.
   ════════════════════════════════════════════════════════════════════ */

/* The address is now in six places across this prototype (here, index.html's
   toolbar, artifact.js's paper, progress.js, measurements.js, the lightbox).
   Worth collapsing into one seed, but not from inside a new tab. */
const OVERVIEW_SEED = {
  address:  '3484 South Main Street',
  city:     'Atlanta, GA 30315',
  status:   'Active',
  projectId:'432A1A6B',
  type:     'Turn',
  endDate:  'May 22, 2026',
  scopeDue: 'Apr 12, 2026',
  updated:  'Apr 30, 2026 4:12pm',
  access:   [{k:'Gate code', v:'4321'}, {k:'Door code', v:'1234'}],
  property: [
    {k:'KT ID',       v:'1234'},   {k:'Square feet', v:'1,590'},
    {k:'Beds',        v:'3'},      {k:'Acreage',     v:'0.11'},
    {k:'Baths',       v:'3½'},{k:'Year built',  v:'2014'},
    {k:'Garage',      v:'Yes'},    {k:'Market',      v:'Atlanta'},
  ],
  template: {name:'ATL Metro Turn Template 01:09:26', version:'Apr 2, 2026'},
  dispatch: 'Lockbox is on the side gate, not the front door. Resident works nights — no entry before 10am.',
};

/* Who is on the job. Read from Artifact 2's roster where it overlaps, so the
   names and roles here cannot drift from the ones the sign-off log shows. */
function _ovPeople(){
  const roster = (typeof REVIEWERS !== 'undefined') ? REVIEWERS : [];
  const find = role => (roster.find(p => p.role.toLowerCase() === role) || {}).who;
  return {
    manager: find('project manager') || 'T. Okafor',
    agent:   find('field agent')     || 'M. Alvarez',
  };
}

/* The live scope total, by the same sum the sidebar rollup uses. */
function _ovBudget(){
  const tasks = (typeof visibleTasks === 'function') ? visibleTasks() : (TASKS || []);
  if(typeof __KAI_SCOPE_TOTAL_OVERRIDE !== 'undefined' && __KAI_SCOPE_TOTAL_OVERRIDE){
    return __KAI_SCOPE_TOTAL_OVERRIDE;
  }
  return money(tasks.reduce((s, t) => s + dollars(t.cost), 0));
}

/* ── the four document slots ─────────────────────────────────────────
   A turn produces four documents in order, and the overview's job is to say
   which of them exist yet. Scope always does; the rest depend on the stage,
   which is what STAGE_ID and the change-order track already tell us. */
function _ovDocs(){
  const st   = (typeof STAGE_ID !== 'undefined') ? STAGE_ID : 'edit';
  const mode = (typeof PROJ_MODE !== 'undefined') ? PROJ_MODE : '';
  const live = ['published', 'closeout', 'closeout-approved'].includes(st);
  /* A change order is a change against a published scope, so it cannot exist
     before the scope is live — a2-stage.js says the same thing when it trims
     the ladder. The live check matters because state.workTrack is not cleared
     by presets that do not set one, so a draft loaded after the change-order
     step still reports WORK_TRACK=change_order and this slot claimed a document
     that does not exist yet. */
  const co   = live && (typeof WORK_TRACK !== 'undefined') && WORK_TRACK === 'change_order';
  const cur  = (typeof VERSIONS !== 'undefined' && VERSIONS.length)
    ? (VERSIONS.find(v => v.id === currentVersionId) || VERSIONS[0]) : null;
  const scopeState = live ? 'Approved'
    : (st === 'edit' ? 'In draft' : 'In review');
  return [
    {key:'scope', name:'Scope', icon:'doc', on:true, state:scopeState,
     meta: live && cur ? `Approved ${cur.at}` : (st === 'edit' ? 'Not submitted yet' : 'Out for review'),
     cta:'View scope', go:"setWorkMode('artifact')"},
    {key:'co', name:'Change Order', icon:'tri', on: co || live,
     state: co ? 'In review' : (live ? 'Approved' : ''),
     meta: co ? 'Awaiting approval' : (live ? 'Two on record' : 'None yet'),
     cta:'View change order', go:"setWorkMode('artifact2')"},
    {key:'punch', name:'Punch List', icon:'circ', on:false, state:'',
     meta:'Opens once work is complete', cta:'', go:''},
    {key:'close', name:'Close Out', icon:'dia', on: mode === 'closeout' || st === 'closeout-approved',
     state: st === 'closeout-approved' ? 'Approved' : (mode === 'closeout' ? 'In review' : ''),
     meta: st === 'closeout-approved' ? 'Signed off' : (mode === 'closeout' ? 'Awaiting sign-off' : 'Not started'),
     cta:'View close out', go:"setWorkMode('artifact')"},
  ];
}

const _OV_ICONS = {
  doc:  '<path d="M4 2h6l3 3v9H4z"/><path d="M6.5 7.5h5M6.5 10h3.5"/>',
  tri:  '<path d="M8.5 3 14 13H3z"/>',
  circ: '<circle cx="8.5" cy="8" r="5.2"/><path d="M10.5 8H6.5"/>',
  dia:  '<path d="M8.5 2.6 13.9 8l-5.4 5.4L3.1 8z"/>',
};
function _ovIcon(k){
  return `<svg class="ov-doc-ico" viewBox="0 0 17 16" fill="none" stroke="currentColor"
    stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">${_OV_ICONS[k] || ''}</svg>`;
}

/* ── activity ────────────────────────────────────────────────────────
   Built from the version ladder and its sign-offs rather than a written-out
   feed, so it agrees with the scrubber and the state card by construction.
   Each version yields the events it actually generated: created when its
   first change landed, submitted when someone first signed it, approved on
   its approval date — except the one still pending, which has no approval. */
function _ovActivity(){
  if(typeof VER_ORDER === 'undefined' || typeof VER === 'undefined') return [];
  /* The version budgets are stamped by Artifact 2's time model, which builds
     lazily on that tab's first render — and this tab now opens first, so
     without this every amount reads $0. Guarded internally, so asking is free. */
  if(typeof buildOrdered === 'function') buildOrdered();
  const pending = (typeof A2_PENDING_VER !== 'undefined') ? A2_PENDING_VER : null;
  const revs = (typeof REVIEWS !== 'undefined') ? REVIEWS : [];
  const people = _ovPeople();
  const out = [];
  VER_ORDER.forEach((id, i) => {
    const m = VER[id] || {};
    const label = m.label || id;
    const signs = revs.filter(r => r.ver === id)
      .slice().sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
    /* `amount`, not `money` — that name is the panel's currency formatter, and
       a local const would have shadowed it for the rest of this function. */
    const amount = m.budget != null ? _fmtDollars(m.budget) : null;
    const prevM = i > 0 ? VER[VER_ORDER[i - 1]] : null;
    const was = prevM && prevM.budget != null ? _fmtDollars(prevM.budget) : null;
    out.push({what:`${label} created`, who:people.agent, when:m.opened || m.date, kind:'created'});
    if(signs.length){
      out.push({what:`${label} submitted`, who:people.agent, when:signs[0].date,
                kind:'submitted', amount:amount, was:was});
    }
    if(id !== pending){
      out.push({what:`${label} approved`, who:people.manager, when:m.date,
                kind:'approved', amount:amount, was:was});
    }
  });
  return out.sort((a, b) => (Date.parse(b.when) || 0) - (Date.parse(a.when) || 0));
}
/* "34d ago" against the project's own present rather than today's date — the
   demo's calendar is April 2026, and a real clock would render every event as
   months old. The latest thing that happened is the present. */
function _ovAgo(when, now){
  const t = Date.parse(when), n = Date.parse(now);
  if(isNaN(t) || isNaN(n)) return '';
  const d = Math.round((n - t) / 86400000);
  return d <= 0 ? 'today' : d === 1 ? 'yesterday' : d + 'd ago';
}

function _ovFieldsHtml(rows){
  return `<dl class="ov-fields">${rows.map(r => `
    <div class="ov-field"><dt>${esc(r.k)}</dt><dd>${esc(r.v)}</dd></div>`).join('')}</dl>`;
}
function _ovCard(title, body, opts){
  const o = opts || {};
  return `<section class="ov-card${o.cls ? ' ' + o.cls : ''}">
    <header class="ov-card-h">
      <h3>${esc(title)}</h3>
      ${o.actions || ''}
    </header>
    ${body}
  </section>`;
}
const _ovBtn = (label, go) =>
  `<button type="button" class="ov-btn"${go ? ` onclick="${go}"` : ' disabled'}>${esc(label)}</button>`;

function renderOverview(){
  const body = document.getElementById('workBody');
  if(!body) return;
  const S = OVERVIEW_SEED;
  const people = _ovPeople();
  const acts = _ovActivity();
  // The project's present: the most recent thing on record.
  const now = acts.length ? acts[0].when : S.updated;

  const notes = (typeof scopeNotesPool === 'function') ? scopeNotesPool() : [];
  // Photos seed lazily too, on the first tab that shows one. Same reason.
  if(typeof seedPhotos === 'function' && (typeof PHOTOS === 'undefined' || !PHOTOS.length)) seedPhotos();
  const photoCount = (typeof PHOTOS !== 'undefined') ? PHOTOS.length : 0;

  const details = _ovCard('Project details', _ovFieldsHtml([
    {k:'Project ID',      v:S.projectId},
    {k:'Project type',    v:S.type},
    {k:'Budget',          v:_ovBudget()},
    {k:'Scope due',       v:S.scopeDue},
    {k:'Project end',     v:S.endDate},
    {k:'Project manager', v:people.manager},
    {k:'Field agent',     v:people.agent},
    {k:'Last updated',    v:S.updated},
  ]), {cls:'ov-details'});

  const access = _ovCard('Access info', _ovFieldsHtml(S.access), {cls:'ov-access'});

  const notesCard = _ovCard('Notes and photos', `
    ${_ovFieldsHtml([
      {k:'Notes',      v:String(notes.length)},
      {k:'Photos',     v:String(photoCount)},
      {k:'Last note',  v:(notes[0] && notes[0].when) || '—'},
    ])}
    <div class="ov-row-acts">
      ${_ovBtn('See notes', "openScopeDrawer('notes')")}
      ${_ovBtn('See photos', "openScopeDrawer('photos')")}
    </div>`, {cls:'ov-notes'});

  const docs = _ovDocs();
  const docsCard = _ovCard('Current documents', `
    <div class="ov-docs">${docs.map(d => `
      <div class="ov-doc${d.on ? '' : ' is-off'}">
        <div class="ov-doc-t">${_ovIcon(d.icon)}<span>${esc(d.name)}</span></div>
        ${d.state ? `<span class="ov-doc-state ov-state-${d.state.toLowerCase().replace(/\s+/g,'-')}">${esc(d.state)}</span>` : ''}
        <div class="ov-doc-meta">${esc(d.meta)}</div>
        ${d.on && d.cta ? _ovBtn(d.cta, d.go) : ''}
      </div>`).join('')}</div>`, {cls:'ov-docs-card'});

  // Contractors, by the work actually assigned to them.
  const byGc = {};
  ((typeof TASKS !== 'undefined') ? TASKS : []).forEach(t => {
    const gc = t.gc || 'Unassigned';
    byGc[gc] = byGc[gc] || {n:0, cost:0};
    byGc[gc].n++;
    byGc[gc].cost += dollars(t.cost);
  });
  const gcRows = Object.keys(byGc).sort((a, b) => byGc[b].cost - byGc[a].cost);
  const gcCard = _ovCard('Contractor assignments', `
    <p class="ov-note">Assigned per trade. Whoever is set here becomes the default contractor on new tasks.</p>
    <div class="ov-gcs">${gcRows.map(gc => `
      <div class="ov-gc${gc === 'Unassigned' ? ' is-none' : ''}">
        <span class="ov-gc-n">${esc(gc)}</span>
        <span class="ov-gc-c">${byGc[gc].n} ${byGc[gc].n === 1 ? 'task' : 'tasks'}</span>
        <span class="ov-gc-m">${money(byGc[gc].cost)}</span>
      </div>`).join('')}</div>`, {cls:'ov-gc-card'});

  const propCard = _ovCard('Property info', _ovFieldsHtml(S.property), {cls:'ov-prop'});

  const dispatchCard = _ovCard('Dispatch notes',
    S.dispatch ? `<p class="ov-dispatch">${esc(S.dispatch)}</p>`
               : `<p class="ov-empty">Nothing for the crew yet.</p>`, {cls:'ov-dispatch-card'});

  // Historical documents: every version that is not the one on show.
  const hist = ((typeof VERSIONS !== 'undefined') ? VERSIONS : [])
    .filter(v => v.id !== currentVersionId);
  const histCard = _ovCard(`Historical documents (${hist.length})`,
    hist.length ? `<div class="ov-hist">${hist.map(v => `
      <div class="ov-hist-r">
        <div class="ov-hist-n">${esc(versionLabel(v))} <span class="ov-hist-tag">Outdated</span></div>
        <div class="ov-hist-d">Approved ${esc(v.at)}</div>
        ${_ovBtn('View', `openHistorical('${v.id}');setWorkMode('artifact')`)}
      </div>`).join('')}</div>`
    : `<p class="ov-empty">Nothing superseded yet.</p>`, {cls:'ov-hist-card'});

  const tplCard = _ovCard('Project template', `
    ${_ovFieldsHtml([{k:'Name', v:S.template.name}, {k:'Version', v:S.template.version}])}`,
    {cls:'ov-tpl'});

  const feed = acts.length ? acts.map(a => `
    <li class="ov-act ov-act-${a.kind}">
      <div class="ov-act-h">${_ovIcon('tri')}<span class="ov-act-w">${esc(a.what)}</span></div>
      <div class="ov-act-m"><span>${esc(a.who)}</span><span>${esc(_ovAgo(a.when, now))}</span></div>
      ${a.amount ? `<div class="ov-act-$">${esc(a.amount)}${
        a.was && a.was !== a.amount ? ` <span class="ov-act-was">was ${esc(a.was)}</span>` : ''}</div>` : ''}
    </li>`).join('') : `<li class="ov-empty">Nothing has happened yet.</li>`;

  body.innerHTML = `
  <div class="ov-root">
    <header class="ov-head">
      <div class="ov-head-l">
        <h2>${esc(S.address)}</h2>
        <div class="ov-head-sub">${esc(S.city)}</div>
      </div>
      <span class="ov-status">${esc(S.status)}</span>
    </header>
    <div class="ov-cols">
      <div class="ov-main">
        <div class="ov-grid">${details}${access}${notesCard}</div>
        ${docsCard}
        ${gcCard}
        <div class="ov-grid ov-grid-2">${propCard}${dispatchCard}</div>
        ${histCard}
        ${tplCard}
      </div>
      <aside class="ov-side">
        ${_ovCard('Activity', `<ul class="ov-acts">${feed}</ul>`, {cls:'ov-act-card'})}
      </aside>
    </div>
  </div>`;
}
