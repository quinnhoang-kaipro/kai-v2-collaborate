/* ════════════════════════════════════════════════════════════════════
   OVERVIEW TAB
   The project's front page: what this job is, who is on it, and what has
   happened lately. It is the tab the panel opens on, because it is the only
   one that answers "what am I looking at" before you have chosen anything.
   The documents themselves live on the Artifact tab and are not restated here.

   Everything the prototype already knows is read, not written out again:
   the budget sums the visible tasks, the note and photo counts come off the
   same pools the drawers use, and the activity feed is built from Artifact 2's
   version ladder and sign-offs — the same records the scrubber and the state
   card read.

   The page has no cards. Sections are a mono label over their content with
   one hairline between them, and the activity feed hangs off a spine in the
   rail: the tiles were chrome around six short lists.

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
  /* The project's general contractor: the one set at the project level, which
     is what a new task is assigned to unless someone picks another. Tasks
     carry their own `gc` (see TASKS in data.js) and several here are with
     other trades — this is the default, not a claim about who holds the work. */
  gc:       'Stone Bros',
  access:   [{k:'Gate code', v:'4321'}, {k:'Door code', v:'1234'}],
  property: [
    {k:'KT ID',       v:'1234'},   {k:'Square feet', v:'1,590'},
    {k:'Beds',        v:'3'},      {k:'Acreage',     v:'0.11'},
    {k:'Baths',       v:'3½'},{k:'Year built',  v:'2014'},
    {k:'Garage',      v:'Yes'},    {k:'Market',      v:'Atlanta'},
  ],
  template: {name:'ATL Metro Turn Template 01:09:26', version:'Apr 2, 2026'},
  /* The closeout is the one document the version ladder does not model — it
     is not a scope, so it has no entry in VER. Its own three dates live here. */
  closeout: {opened:'May 18, 2026', handed:'May 20, 2026', approved:'May 22, 2026'},
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

/* ── the project's standing, in three parts ──────────────────────────
   One "Active" chip could not say which of a turn's phases the project was
   in, or whether the phase was moving. Three segments read left to right as
   programme, phase, state — the same order a person says it out loud: "the
   turn, in closeout, in progress".  */
function _ovStanding(){
  const st   = (typeof STAGE_ID !== 'undefined') ? STAGE_ID : 'edit';
  const mode = (typeof PROJ_MODE !== 'undefined') ? PROJ_MODE : '';
  const co   = ['published', 'closeout', 'closeout-approved'].includes(st)
            && (typeof WORK_TRACK !== 'undefined') && WORK_TRACK === 'change_order';
  const phase =
      st === 'closeout' || st === 'closeout-approved' ? 'Close out'
    : st === 'published' ? (co ? 'Change order' : 'Construction')
    : ['submitted', 'reviewing', 'review-done', 'awaiting-pub'].includes(st) ? 'Scope review'
    : 'Scoping';
  const state =
      st === 'closeout-approved' ? 'Complete'
    : st === 'closeout'  ? 'In review'
    : st === 'published' ? (co ? 'In review' : 'In progress')
    : st === 'edit'      ? 'In draft'
    : 'In review';
  return [
    {k:'programme', v:OVERVIEW_SEED.type},
    {k:'phase',     v:phase},
    {k:'state',     v:state},
  ];
}
function _ovStandingHtml(){
  return `<div class="ov-standing" role="group" aria-label="Project status">${
    _ovStanding().map(seg =>
      `<span class="ov-stand ov-stand-${seg.k}">${esc(seg.v)}</span>`).join('')}</div>`;
}

/* ── who has had this document ───────────────────────────────────────
   A project produces a run of documents — the scope, then a change order per
   revision, then the closeout — and each of them passes through several pairs
   of hands before it is approved. The ladder and the sign-off log already
   record both halves of that: REVIEWS says who signed and when, in order, so
   each signature is also the moment the document reached the next person.
   Read that way the log is a chain of hand-offs, which is what this shows. */
function _ovTrail(){
  if(typeof VER_ORDER === 'undefined' || typeof VER === 'undefined') return [];
  if(typeof buildOrdered === 'function') buildOrdered();
  const pending = (typeof A2_PENDING_VER !== 'undefined') ? A2_PENDING_VER : null;
  const revs    = (typeof REVIEWS !== 'undefined') ? REVIEWS : [];
  const people  = _ovPeople();
  const author  = {who:people.agent, role:'Field agent'};
  const out = [];

  VER_ORDER.forEach((id, i) => {
    const m = VER[id] || {};
    const prev = i > 0 ? VER[VER_ORDER[i - 1]] : null;
    const signs = revs.filter(r => r.ver === id)
      .slice().sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
    const evs = [{...author, act:'started it',
                  when: m.opened || (prev && prev.date) || m.date, kind:'start'}];
    /* Each signature is the point the document had reached that person, so
       the hand-off is from whoever held it before them. */
    let from = author;
    signs.forEach(sig => {
      evs.push({who:from.who, role:from.role, act:'handed off to ' + sig.who,
                when:sig.date, kind:'handoff'});
      from = sig;
    });
    if(id === pending){
      evs.push({who:from.who, role:from.role, act:'has it for approval',
                when:from.date, kind:'waiting'});
    } else {
      evs.push({who:people.manager, role:'Project manager', act:'approved it',
                when:m.date, kind:'approved'});
    }
    out.push({name:m.label || id, state: id === pending ? 'In review' : 'Approved', evs:evs});
  });

  /* The closeout, when the project has one. Not a scope, so not in VER. */
  const st   = (typeof STAGE_ID !== 'undefined') ? STAGE_ID : '';
  const mode = (typeof PROJ_MODE !== 'undefined') ? PROJ_MODE : '';
  if(mode === 'closeout' || st === 'closeout' || st === 'closeout-approved'){
    const C = OVERVIEW_SEED.closeout;
    const done = st === 'closeout-approved';
    out.push({name:'Closeout', state: done ? 'Approved' : 'In review', evs:[
      {...author, act:'started it', when:C.opened, kind:'start'},
      {...author, act:'handed off to ' + people.manager, when:C.handed, kind:'handoff'},
      done
        ? {who:people.manager, role:'Project manager', act:'approved it',
           when:C.approved, kind:'approved'}
        : {who:people.manager, role:'Project manager', act:'has it for approval',
           when:C.handed, kind:'waiting'},
    ]});
  }
  return out.reverse();   // newest document first, like the activity feed
}

const _OV_TICK = `<svg class="ov-tr-ck" viewBox="0 0 12 12" fill="none" stroke="currentColor"
  stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 6.5 5 9l4.5-5.5"/></svg>`;

function _ovTrailDocHtml(d){
  return `<div class="ov-tr-doc">
      <div class="ov-tr-h">
        <span class="ov-tr-n">${esc(d.name)}</span>
        <span class="ov-tr-st${d.state === 'Approved' ? ' is-done' : ''}">${esc(d.state)}</span>
      </div>
      ${d.evs.map(e => `
        <div class="ov-tr-r ov-tr-${e.kind}">
          <span class="ov-tr-mk">${e.kind === 'approved' ? _OV_TICK : ''}</span>
          <span class="ov-tr-who">${esc(e.who)}</span>
          <span class="ov-tr-role">${esc(e.role)}</span>
          <span class="ov-tr-act">${esc(e.act)}</span>
          <span class="ov-tr-d">${esc(e.when || '')}</span>
        </div>`).join('')}
    </div>`;
}

/* The current document is the one anyone came here to check; the ones before
   it are the audit trail, which is a different errand. So only the latest is
   open, and the rest are one click away with their number said up front —
   collapsed without saying how much is behind it would be a mystery box. */
function _ovTrailHtml(){
  const docs = _ovTrail();
  if(!docs.length) return `<p class="ov-empty">No documents yet.</p>`;
  const [current, ...earlier] = docs;
  if(!earlier.length) return `<div class="ov-trail">${_ovTrailDocHtml(current)}</div>`;
  return `<div class="ov-trail">
    ${_ovTrailDocHtml(current)}
    <div class="ov-trail-rest" id="ovTrailRest" hidden>
      ${earlier.map(_ovTrailDocHtml).join('')}
    </div>
    <button type="button" class="ov-more" id="ovTrailMore"
            aria-expanded="false" aria-controls="ovTrailRest"
            onclick="ovTrailToggle()"
            data-open="Hide earlier documents"
            data-shut="View all history (${earlier.length} earlier ${
              earlier.length === 1 ? 'document' : 'documents'})">View all history (${
              earlier.length} earlier ${earlier.length === 1 ? 'document' : 'documents'})</button>
  </div>`;
}
/* A class toggle rather than a re-render: renderOverview would rebuild the
   whole tab and lose the scroll position you were reading at. */
function ovTrailToggle(){
  const rest = document.getElementById('ovTrailRest');
  const btn  = document.getElementById('ovTrailMore');
  if(!rest || !btn) return;
  const open = rest.hidden;             // about to become open
  rest.hidden = !open;
  btn.textContent = open ? btn.dataset.open : btn.dataset.shut;
  btn.setAttribute('aria-expanded', String(open));
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

/* ── the page's parts ────────────────────────────────────────────────
   No cards. A section is a mono label over its content, separated from the
   next by one hairline, so the page reads as a document with headings
   rather than as a tray of tiles. */
function _ovSec(label, body, cls){
  return `<section class="ov-sec${cls ? ' ' + cls : ''}">
    ${label ? `<h3 class="ov-sec-h">${esc(label)}</h3>` : ''}
    ${body}
  </section>`;
}
function _ovFieldsHtml(rows){
  return `<dl class="ov-fields">${rows.filter(Boolean).map(r => `
    <div class="ov-field"><dt>${esc(r.k)}</dt><dd>${esc(r.v)}</dd></div>`).join('')}</dl>`;
}
/* A figure with its label under it, optionally a button. The counts are the
   way into the notes and photo drawers, so they are the control themselves
   rather than a number sitting next to one. */
function _ovStat(label, value, go){
  const inner = `<span class="ov-stat-v">${esc(value)}</span>
    <span class="ov-stat-k">${esc(label)}</span>`;
  return go
    ? `<button type="button" class="ov-stat is-link" onclick="${go}">${inner}</button>`
    : `<div class="ov-stat">${inner}</div>`;
}

/* The property's own facts, ordered the way someone reads a listing rather
   than the order the seed happens to hold them in. They join the field list
   above rather than running together as one line of text: unlabelled, the
   run had nothing to tell you which number was the acreage and which the
   year, and it sat under the labelled fields looking like a caption. */
function _ovPropFields(){
  const g = k => (OVERVIEW_SEED.property.find(r => r.k === k) || {}).v || '';
  return ['Square feet', 'Beds', 'Baths', 'Year built', 'Acreage', 'Garage', 'Market', 'KT ID']
    .map(k => ({k:k, v:g(k)}))
    .filter(r => r.v);
}

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

  /* The strip under the title: the five numbers someone opens this tab to
     check, at figure size, before any labelled list. */
  const stats = `<div class="ov-stats">
    ${_ovStat('Budget', _ovBudget())}
    ${_ovStat('Scope due', S.scopeDue)}
    ${_ovStat('Project end', S.endDate)}
    ${_ovStat('Notes', String(notes.length), "openScopeDrawer('notes')")}
    ${_ovStat('Photos', String(photoCount), "openScopeDrawer('photos')")}
  </div>`;

  /* The job, the people on it, and the property itself — one list of
     label-over-value fields, in as many columns as the width allows. */
  /* No heading: it is the block directly under the title, and "The job" only
     ever restated where you already were. */
  const jobSec = _ovSec('', _ovFieldsHtml([
    {k:'Project ID',      v:S.projectId},
    {k:'Project type',    v:S.type},
    {k:'Project manager', v:people.manager},
    {k:'Field agent',     v:people.agent},
    {k:'General contractor', v:S.gc},
    {k:'Template',        v:S.template.name},
    {k:'Last updated',    v:S.updated},
  ].concat(_ovPropFields())), 'ov-job');

  /* Getting in and what to know once you are there are the same errand, so
     the codes and the dispatch note share a section. */
  const accessSec = _ovSec('Getting in', `
    <div class="ov-codes">${S.access.map(a => `
      <div class="ov-code"><span class="ov-code-k">${esc(a.k)}</span>
        <span class="ov-code-v">${esc(a.v)}</span></div>`).join('')}</div>
    ${S.dispatch ? `<p class="ov-dispatch">${esc(S.dispatch)}</p>`
                 : `<p class="ov-empty">Nothing for the crew yet.</p>`}`, 'ov-access');


  /* The feed as a spine with dots on it, rather than rows in a panel. An
     approval is the mark worth finding at a glance, so it is the filled one. */
  const feed = acts.length ? acts.map(a => `
    <li class="ov-act ov-act-${a.kind}">
      <span class="ov-act-dot" aria-hidden="true"></span>
      <div class="ov-act-w">${esc(a.what)}
        ${a.amount ? `<span class="ov-act-sum">${esc(a.amount)}${
          a.was && a.was !== a.amount ? ` <span class="ov-act-was">from ${esc(a.was)}</span>` : ''}</span>` : ''}</div>
      <div class="ov-act-m">${esc(a.who)} <span class="ov-act-when">${esc(_ovAgo(a.when, now))}</span></div>
    </li>`).join('') : `<li class="ov-empty">Nothing has happened yet.</li>`;

  const trailSec = _ovSec('Documents and hand-offs', _ovTrailHtml(), 'ov-trail-sec');

  body.innerHTML = `
  <div class="ov-root">
    <header class="ov-head">
      <div class="ov-head-l">
        <h2>${esc(S.address)}</h2>
        <div class="ov-head-sub">${esc(S.city)}</div>
      </div>
      ${_ovStandingHtml()}
    </header>
    ${stats}
    <div class="ov-cols">
      <div class="ov-main">${jobSec}${accessSec}${trailSec}</div>
      <aside class="ov-side">
        ${_ovSec('Activity', `<ul class="ov-acts">${feed}</ul>`, 'ov-act-sec')}
      </aside>
    </div>
  </div>`;
}
