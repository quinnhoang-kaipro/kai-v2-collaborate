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
   Read that way the log is a chain of hand-offs, which is what this shows.

   This was two sections for a while — a hand-off chain here and an activity
   feed in a rail beside it, both built from the same ladder and the same
   sign-offs, saying "Change Order 2 submitted" in one place and "M. Alvarez
   handed off to S. Patel" in the other about the same event on the same day.
   The feed's one piece of extra information was the money, so the money moved
   onto the rows that carry it: what a document was worth when it was sent, and
   what it was worth when it was settled. */
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
    /* What the document is worth, and what it moved by. Said once, on the
       line that settles it — the submission carried the same pair a row above,
       which read as two different figures until you compared them. */
    const amount = m.budget != null ? _fmtDollars(m.budget) : null;
    const delta = prev ? _ovDelta(m.budget, prev.budget) : '';
    const evs = [{...author, act:'started it',
                  when: m.opened || (prev && prev.date) || m.date, kind:'start'}];
    /* Each signature is the point the document had reached that person, so
       the hand-off is from whoever held it before them. */
    /* What the editing came to, as its own event: it is the answer to "what
       does this change order actually change", and it belongs in the run of
       events rather than in a note about them. Only where there is a previous
       version to have changed from — the first scope is not a revision. */
    const counts = prev ? _ovChangeCounts(id) : null;
    if(counts){
      evs.push({who:'', role:'', kind:'changed', ver:id, detail:counts.detail,
                act:`${counts.groups} group${counts.groups === 1 ? '' : 's'} \u00b7 `
                  + `${counts.tasks} task${counts.tasks === 1 ? '' : 's'} changed`,
                when: (signs[0] && signs[0].date) || m.date});
    }
    let from = author;
    signs.forEach(sig => {
      evs.push({who:from.who, role:from.role, act:'handed off to ' + sig.who,
                when:sig.date, kind:'handoff'});
      from = sig;
    });
    if(id === pending){
      evs.push({who:from.who, role:from.role, act:'has it for approval',
                when:from.date, kind:'waiting', amount:amount, delta:delta});
    } else {
      evs.push({who:people.manager, role:'Project manager', act:'approved it',
                when:m.date, kind:'approved', amount:amount, delta:delta});
    }
    /* Newest first, like the documents themselves. The chain is built in the
       order it happened, so reversing it is exact — including the two events
       that share a date, where sorting on the date alone would have put them
       in whichever order the comparison happened to settle on. */
    out.push({name:m.label || id, state: id === pending ? 'In review' : 'Approved',
              evs:evs.reverse()});
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
    ].reverse()});
  }
  return out.reverse();   // newest document first, like the activity feed
}

/* How much of the scope a version actually touched. A change order is rarely
   the whole document, and "Change Order 2" on its own does not say whether it
   moved one task or twenty. Counted off SCOPE, the same records the scrubber
   walks, so it cannot disagree with what the Artifact 2 tab shows. */
/* What actually happened to one task in one version, in a line. The change
   records hold rows of {field, from, to} — or an `add` / `remove` sentence for
   a line that appeared or went — and the Artifact 2 tab renders all of them in
   full. Here it is a summary, so each row comes down to its shortest true form
   and the amount rows are dropped: the money is already in its own column two
   cells to the right, and repeating it here would be the same figure twice on
   one line. */
function _ovTaskChangeSummary(task, verId){
  /* A line added or removed is written as "Countertops \u2014 laminate is
     delaminating at the sink": the half before the dash is the task's own name,
     which is already the first thing on this row, so the half after it is the
     part worth saying. */
  const why = t => {
    const bits = String(t).split(' \u2014 ');
    return bits.length > 1 ? bits.slice(1).join(' \u2014 ') : bits[0];
  };
  const parts = [];
  (task.changes || []).filter(ch => ch.ver === verId).forEach(ch => {
    (ch.rows || []).forEach(r => {
      if(r.field === 'Line added')     { parts.push('Added \u00b7 ' + why(r.add)); return; }
      if(r.field === 'Line removed')   { parts.push('Removed \u00b7 ' + why(r.remove)); return; }
      if(r.field === 'Modifier added') { parts.push('Modifier \u00b7 ' + r.add); return; }
      if(r.add)          { parts.push(r.field + ' \u00b7 ' + why(r.add)); return; }
      if(r.from && r.to) { parts.push(`${r.field} ${r.from} \u2192 ${r.to}`); return; }
      if(r.to)           { parts.push(`${r.field} \u2192 ${r.to}`); }
    });
  });
  if(!parts.length) return '';
  /* Two is as much as fits beside the name without the line becoming the
     paragraph this summary exists instead of. */
  const shown = parts.slice(0, 2).join('  \u00b7  ');
  return parts.length > 2 ? `${shown}  \u00b7  +${parts.length - 2} more` : shown;
}

function _ovChangeCounts(verId){
  if(typeof SCOPE === 'undefined') return null;
  /* The groups it touched, each with the tasks inside it that moved — the
     count is the headline and this is what the headline is a count of. */
  const groups = [];
  let tasks = 0;
  SCOPE.forEach(g => {
    const hit = g.tasks.filter(t => (t.changes || []).some(ch => ch.ver === verId));
    if(hit.length){
      groups.push({room:g.room, tasks:hit.map(t => ({
        code:t.code, name:t.name, what:_ovTaskChangeSummary(t, verId)}))});
      tasks += hit.length;
    }
  });
  if(!tasks) return null;
  return {groups:groups.length, tasks:tasks, detail:groups};
}
/* ── from the count to the thing itself ──────────────────────────────
   A count you cannot open is a dead end: "7 tasks changed" is the beginning
   of the question, and the answer is which seven. Each name goes to the
   Editor at its own level, which is where you would act on it. */
function ovGoGroup(room){
  if(typeof setGroupBy === 'function' && typeof groupBy !== 'undefined' && groupBy !== 'room'){
    // The group keys are room names only while the sidebar is grouped by room.
    setGroupBy('room');
  }
  if(typeof selectGroup === 'function') selectGroup(room);
}
function ovGoTask(code, room, name){
  /* SCOPE (Artifact 2's records) and TASKS (the sidebar's) are two lists of
     the same work, seeded separately, and they do not agree line for line —
     three of Change Order 2's twelve lines have no match here. Try the code,
     then the name, then fall back to the group, which always exists: landing
     one level up beats a link that does nothing. */
  const all = (typeof TASKS !== 'undefined') ? TASKS : [];
  const t = all.find(x => x.code === code)
         || all.find(x => name && String(x.name).toLowerCase() === String(name).toLowerCase());
  if(!t){
    if(typeof toast === 'function') toast(`${name || code} isn't in the current scope — showing ${room}`);
    ovGoGroup(room);
    return;
  }
  if(typeof selectTask === 'function') selectTask(t.id);
  if(typeof setWorkMode === 'function') setWorkMode('shop');
}
let _ovOpenChanges = {};   // which documents have their change list open
function ovToggleChanges(verId, btn){
  _ovOpenChanges[verId] = !_ovOpenChanges[verId];
  const box = document.getElementById('ovCh-' + verId);
  if(box) box.hidden = !_ovOpenChanges[verId];
  if(btn) btn.setAttribute('aria-expanded', String(!!_ovOpenChanges[verId]));
}
/* "+$4,100" / "-$820". The previous total is one subtraction away and the
   direction is the thing people read a change order for. */
function _ovDelta(now, before){
  if(now == null || before == null || now === before) return '';
  const d = now - before;
  return (d > 0 ? '+' : '\u2212') + _fmtDollars(Math.abs(d));
}

const _OV_TICK = `<svg class="ov-tr-ck" viewBox="0 0 12 12" fill="none" stroke="currentColor"
  stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 6.5 5 9l4.5-5.5"/></svg>`;

/* Four columns, shared by every row in the document so they line up: what
   happened, what it is worth, what that moved by, and when. The roles are
   gone from the event — the names are the roster's, and a title beside each
   one was three words of the same answer on every line. */
function _ovTrailDocHtml(d){
  return `<div class="ov-tr-doc">
      <div class="ov-tr-h">
        <span class="ov-tr-n">${esc(d.name)}</span>
        <span class="ov-tr-st${d.state === 'Approved' ? ' is-done' : ''}">${esc(d.state)}</span>
      </div>
      <div class="ov-tr-rows">
      ${d.evs.map(e => `
        <div class="ov-tr-r ov-tr-${e.kind}">
          <span class="ov-tr-ev">
            <span class="ov-tr-mk">${e.kind === 'approved' ? _OV_TICK : ''}</span>
            ${e.who ? `<span class="ov-tr-who">${esc(e.who)}</span>` : ''}
            ${e.detail
              ? `<button type="button" class="ov-tr-act ov-tr-open"
                   aria-expanded="${!!_ovOpenChanges[e.ver]}" aria-controls="ovCh-${e.ver}"
                   onclick="ovToggleChanges('${e.ver}', this)">${esc(e.act)}
                   <svg class="ov-tr-car" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5l3 3 3-3"/></svg>
                 </button>`
              : `<span class="ov-tr-act">${esc(e.act)}</span>`}
          </span>
          <span class="ov-tr-sum">${e.amount ? esc(e.amount) : ''}</span>
          <span class="ov-tr-delta${(e.delta || '').charAt(0) === '+' ? ' is-up' : ' is-down'}">${esc(e.delta || '')}</span>
          <span class="ov-tr-d">${esc(e.when || '')}</span>
        </div>
        ${e.detail ? `<div class="ov-tr-detail" id="ovCh-${e.ver}"${_ovOpenChanges[e.ver] ? '' : ' hidden'}>
          ${e.detail.map(g => `<div class="ov-ch-g">
            <button type="button" class="ov-ch-grp" onclick="ovGoGroup('${esc(g.room).replace(/'/g, "\\'")}')">${esc(g.room)}</button>
            <div class="ov-ch-ts">${g.tasks.map(t => `
              <button type="button" class="ov-ch-task"
                onclick="ovGoTask('${esc(t.code)}', '${esc(g.room).replace(/'/g, "\\'")}', '${esc(t.name).replace(/'/g, "\\'")}')">
                <span class="ov-ch-code">${esc(t.code)}</span>
                <span class="ov-ch-name">${esc(t.name)}</span>
                ${t.what ? `<span class="ov-ch-what">${esc(t.what)}</span>` : ''}</button>`).join('')}</div>
          </div>`).join('')}
        </div>` : ''}`).join('')}
      </div>
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

/* ── the page's parts ────────────────────────────────────────────────
   No cards. A section is a mono label over its content, separated from the
   next by one hairline, so the page reads as a document with headings
   rather than as a tray of tiles. */
/* A section is one of the Editor's modules: white, bordered once, sitting on
   the app's tan with the ground showing between them. Same shape the property
   overview uses, so the two pages are read the same way. */
function _ovSec(label, body, cls){
  return `<section class="ov-mod${cls ? ' ' + cls : ''}">
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
  /* The codes and the note on one row. The note under them made the module
     twice as tall for a sentence, and the width was there. */
  const accessSec = _ovSec('Getting in', `
    <div class="ov-codes">
      ${S.access.map(a => `
      <div class="ov-code"><span class="ov-code-k">${esc(a.k)}</span>
        <span class="ov-code-v">${esc(a.v)}</span></div>`).join('')}
      <div class="ov-code ov-code-note">
        <span class="ov-code-k">On arrival</span>
        ${S.dispatch ? `<p class="ov-dispatch">${esc(S.dispatch)}</p>`
                     : `<p class="ov-empty">Nothing for the crew yet.</p>`}
      </div>
    </div>`, 'ov-access');


  const trailSec = _ovSec('Activity', _ovTrailHtml(), 'ov-trail-sec');

  /* The title and the figures are one module, split by a rule: the eyebrow
     names the project, the title names the property, and the standing sits on
     the title's line — the same head a task carries in the Editor. */
  body.innerHTML = `
  <div class="ov-root">
    <section class="ov-mod ov-mod-head">
      <!-- The property, photographed. The prototype has no property
           photography, so the slot holds the tan rather than an illustration
           pretending to be one — the same slot the property overview page
           carries, in the same place. -->
      <figure class="ov-photo"><figcaption>Street view</figcaption></figure>
      <div class="ov-head-r">
      <header class="ov-head">
        <div class="ov-head-l">
          <div class="ov-eyebrow">${esc(S.projectId)}<span class="sep">&middot;</span>${esc(S.type)}</div>
          <h2>${esc(S.address)}</h2>
          <div class="ov-head-sub">${esc(S.city)}</div>
        </div>
        ${_ovStandingHtml()}
      </header>
      ${stats}
      </div>
    </section>
    ${jobSec}${accessSec}${trailSec}
  </div>`;
}
