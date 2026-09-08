/* ════════════════════════════════════════════════════════════════════
   OVERVIEW TAB
   The project's front page: what this job is, who is on it, and what has
   happened lately. It is the tab the panel opens on, because it is the only
   one that answers "what am I looking at" before you have chosen anything.
   The documents themselves live on the Artifact tab and are not restated here.

   Everything the prototype already knows is read, not written out again:
   the budget sums the visible tasks, the note and photo counts come off the
   same pools the drawers use, the contractor rollup is TASKS grouped by
   contractor, and the activity feed is built from Artifact 2's version ladder
   and sign-offs — the same records the scrubber and the state card read.

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
    <h3 class="ov-sec-h">${esc(label)}</h3>
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

/* The eight property facts as one line of text. Eight labelled cells was a
   box's worth of chrome around numbers nobody reads one at a time. */
function _ovSpecLine(){
  const g = k => ((OVERVIEW_SEED.property.find(r => r.k === k) || {}).v || '');
  return [
    g('Square feet') && g('Square feet') + ' sq ft',
    g('Beds')  && g('Beds')  + ' bd',
    g('Baths') && g('Baths') + ' ba',
    g('Acreage') && g('Acreage') + ' acres',
    g('Year built') && 'built ' + g('Year built'),
    g('Garage') === 'Yes' ? 'garage' : '',
    g('Market') && g('Market') + ' market',
    g('KT ID') && 'KT ' + g('KT ID'),
  ].filter(Boolean).join('  ·  ');
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

  /* The job and the people on it, in one list. Two columns of label-over-value
     at this width, so "Project manager" gets its own line and the name gets
     the room it needs. */
  const jobSec = _ovSec('The job', _ovFieldsHtml([
    {k:'Project ID',      v:S.projectId},
    {k:'Project type',    v:S.type},
    {k:'Project manager', v:people.manager},
    {k:'Field agent',     v:people.agent},
    {k:'Template',        v:S.template.name},
    {k:'Last updated',    v:S.updated},
  ]) + `<p class="ov-spec">${esc(_ovSpecLine())}</p>`, 'ov-job');

  /* Getting in and what to know once you are there are the same errand, so
     the codes and the dispatch note share a section. */
  const accessSec = _ovSec('Getting in', `
    <div class="ov-codes">${S.access.map(a => `
      <div class="ov-code"><span class="ov-code-k">${esc(a.k)}</span>
        <span class="ov-code-v">${esc(a.v)}</span></div>`).join('')}</div>
    ${S.dispatch ? `<p class="ov-dispatch">${esc(S.dispatch)}</p>`
                 : `<p class="ov-empty">Nothing for the crew yet.</p>`}`, 'ov-access');

  // Contractors, by the work actually assigned to them.
  const byGc = {};
  ((typeof TASKS !== 'undefined') ? TASKS : []).forEach(t => {
    const gc = t.gc || 'Unassigned';
    byGc[gc] = byGc[gc] || {n:0, cost:0};
    byGc[gc].n++;
    byGc[gc].cost += dollars(t.cost);
  });
  const gcRows = Object.keys(byGc).sort((a, b) => byGc[b].cost - byGc[a].cost);
  const gcSec = _ovSec('Contractors', `
    <div class="ov-gcs">${gcRows.map(gc => `
      <div class="ov-gc${gc === 'Unassigned' ? ' is-none' : ''}">
        <span class="ov-gc-n">${esc(gc)}</span>
        <span class="ov-gc-c">${byGc[gc].n} ${byGc[gc].n === 1 ? 'task' : 'tasks'}</span>
        <span class="ov-gc-m">${money(byGc[gc].cost)}</span>
      </div>`).join('')}</div>
    <p class="ov-note">Whoever is set here becomes the default contractor on new tasks.</p>`,
    'ov-gc-sec');

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

  body.innerHTML = `
  <div class="ov-root">
    <header class="ov-head">
      <div class="ov-head-l">
        <h2>${esc(S.address)}</h2>
        <div class="ov-head-sub">${esc(S.city)}</div>
      </div>
      <span class="ov-status">${esc(S.status)}</span>
    </header>
    ${stats}
    <div class="ov-cols">
      <div class="ov-main">${jobSec}${accessSec}${gcSec}</div>
      <aside class="ov-side">
        ${_ovSec('Activity', `<ul class="ov-acts">${feed}</ul>`, 'ov-act-sec')}
      </aside>
    </div>
  </div>`;
}
