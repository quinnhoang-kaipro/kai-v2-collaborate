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
  /* ── Who does the work ──
     Three tiers, strongest last: the General Contractor covers everything,
     a trade's own contractor covers that trade, and a task can override both.
     `who` absent on a trade means nobody is set for it — it inherits, which
     is the case the whole model exists for and the one the UI has to show
     rather than leave the reader to infer from a name repeated in two rows.
     `over` is the per-task exception, nested under the trade it departs from
     so precedence reads as depth. */
  general: {who:'General Contractor Company', amount:'$5,000', tasks:50},
  /* Every trade carries what its work is worth. A row with tasks and no
     figure read as unpriced rather than unlisted, and the column it left
     blank is the one the money is scanned down. */
  trades: [
    {trade:'Electrical',   who:"It's Electric!",         tasks:9,  amount:'$3,200'},
    {trade:'HVAC',         who:'Breeze Bros',            tasks:4,  amount:'$1,800',
      over:[{who:'Apex Heating & Air', tasks:1, amount:'$640'}]},
    {trade:'Plumbing',     who:'Doctor Drain',           tasks:12, amount:'$2,000'},
    {trade:'Flooring',     who:'HomeStride',             tasks:12, amount:'$2,000'},
    {trade:'Paint',        who:'Roll With It Painting',  tasks:12, amount:'$1,600'},
    {trade:'Landscaping',  who:'Grass Gurus',            tasks:35, amount:'$2,000'},
    {trade:'Appliances',   who:'American Appliance Co.', tasks:5,  amount:'$2,400'},
    {trade:'Drywall',      tasks:6,  amount:'$900'},
    {trade:'Roofing',      tasks:2,  amount:'$1,400'},
    /* Staffed but unscoped: the contractor is set and no work has landed on
       the trade. It belongs in the list — the assignment is real — but with
       nothing to price, so the money reads as a dash rather than $0, which
       would claim the work exists and costs nothing. */
    {trade:'Masonry',      who:'Old Town Masonry',      tasks:0},
  ],
  /* The market the property sits in, and the few defaults a market carries
     into every job on it. Held here rather than derived: nothing else in the
     prototype models a market, and the Market field needs somewhere to go. */
  market: {
    name:        'Atlanta',
    zips:        ['30315', '30316'],
    template:    'ATL Metro Turn Template 01:09:26',
    managers:    ['T. Okafor'],
    contractors: ['Stone Bros', 'Apex Carpentry'],
    users:       ['M. Alvarez', 'S. Patel']
  },
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
    manager: find('job manager') || 'T. Okafor',
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
  return `<div class="ov-standing" role="group" aria-label="Job status">${
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
/* What one person changed in one version. SCOPE's change records carry both
   `ver` and `who`, so the edits can be attributed rather than pooled — which
   is the whole difference between "7 tasks changed in Change Order 2" and
   "Diego R. edited 3 tasks". Grouped by room so the list opens the way every
   other change list in the tab does. */
function _ovRowMoney(r){
  if(r.field === 'Line added')   return  _ovMoney(r.wasAmount);
  if(r.field === 'Line removed') return -_ovMoney(r.wasAmount);
  if(r.delta) return _ovMoney(r.delta) * (/^\s*[-\u2212]/.test(r.delta) ? -1 : 1);
  if(/^amount$/i.test(r.field) && r.from != null && r.to != null)
    return _ovMoney(r.to) - _ovMoney(r.from);
  return 0;
}
function _ovEditsBy(verId, who){
  if(typeof SCOPE === 'undefined') return null;
  const groups = [];
  let tasks = 0, money = 0;
  SCOPE.forEach(g => {
    const hit = g.tasks.filter(t =>
      (t.changes || []).some(ch => ch.ver === verId && ch.who === who));
    if(!hit.length) return;
    hit.forEach(t => (t.changes || [])
      .filter(ch => ch.ver === verId && ch.who === who)
      .forEach(ch => (ch.rows || []).forEach(r => { money += _ovRowMoney(r); })));
    groups.push({room:g.room, tasks:hit.map(t => ({
      code:t.code, name:t.name, what:_ovTaskChangeSummary(t, verId)}))});
    tasks += hit.length;
  });
  return tasks ? {tasks, groups:groups.length, detail:groups, money} : null;
}
/* How a tenure reads. The timeline wants a phrase for its What column; the
   sentence feed wants a verb it can put a document name after, and sometimes
   a tail to follow it. Both come from the same three facts — did they edit,
   did they approve, are they still holding it. */
function _ovTenureWords(ed, approved, opened, holding){
  const n = ed
    ? (ed.tasks === 1
        ? '1 task'
        : `${ed.tasks} tasks, ${ed.groups} group${ed.groups === 1 ? '' : 's'}`)
    : '';
  if(holding) return ed
    ? {what:`Edited ${n} so far`, verb:'has', tail:'open', act:`editing ${n} in`}
    : {what:'Holding', verb:'has', tail:'open', act:'holding'};
  /* Creating the draft and editing it are one stretch of work, not two rows —
     the person who opens a change order is usually the one who fills it in. */
  if(ed && opened)   return {what:`Created draft and edited ${n}`,
                             verb:'created', tail:`and edited ${n}`, act:'created'};
  if(ed && approved) return {what:`Edited ${n} · approved`, verb:`edited ${n} in`,
                             tail:'and approved it', act:`edited ${n} in`};
  if(ed)             return {what:`Edited ${n}`, verb:`edited ${n} in`, act:`edited ${n} in`};
  if(approved)       return {what:'Approved', verb:'approved', act:'approved'};
  if(opened)         return {what:'Created draft', verb:'created', act:'created'};
  return {what:'Reviewed', verb:'reviewed', act:'reviewed'};
}
function _ovTrail(){
  _OV_TENURE_NOTES = [];
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
    /* The document's worth belongs to the document, so it is stated once, on
       its title line. It used to ride on whichever event settled it, which
       put the same figure in a different row depending on whether the thing
       had been approved yet — and made the header, the one line that names
       what you are looking at, the only line that didn't say what it cost. */
    const amount = m.budget != null ? _fmtDollars(m.budget) : null;
    const was = (prev && prev.budget != null && prev.budget !== m.budget)
      ? _fmtDollars(prev.budget) : null;
    /* A verb and, where there is one, who it went to — the sentence is
       composed at render time so it can name the document inside itself.
       "started it" only worked while a header above the row said what "it"
       was, and that header is what made the rows under it look owned. */
    /* One row per person who held the document, not one per event. A
       hand-off is not news on its own — what matters is what the person did
       with it while they had it, and the hand-off is just where one row ends
       and the next begins. Each holder's window runs from the moment it
       reached them to the moment they passed it on.

       The chain: the field agent opens it, then each reviewer in signing
       order, and the last of them is the one who approves. */
    const opened = m.opened || (prev && prev.date) || m.date;
    const openedT = m.openedTime || (prev && prev.time) || m.time;
    const chain = [{who:author.who, role:author.role, from:opened, fromTime:openedT}];
    signs.forEach((sig, k) => {
      chain[k].to = sig.date; chain[k].toTime = sig.time;
      chain.push({who:sig.who, role:sig.role, from:sig.date, fromTime:sig.time});
    });
    const last = chain[chain.length - 1];
    const isPending = id === pending;
    /* A pending document's last holder still has it: no end, and no approval
       under them yet. */
    if(!isPending){ last.to = m.date; last.toTime = m.time; last.approved = true; }

    /* Each tenure starts where the one before it finished, and the walk is
       anchored so the last one lands on what the document is actually worth.
       The anchor is not simply the previous version's budget: a scope contains
       lines nobody is recorded as having added — they were there when the
       document began — and starting from the previous budget would leave the
       chain short by exactly those. So the opening balance is the document's
       own worth less everything the chain accounts for, which makes the last
       tenure land on the figure the Register also reports. */
    const edits = chain.map(h => _ovEditsBy(id, h.who));
    const attributed = edits.reduce((sum, e) => sum + (e ? e.money : 0), 0);
    let running = (m.budget != null ? m.budget : attributed) - attributed;
    const evs = chain.map((h, k) => {
      const ed = edits[k];
      const holding = !h.to;
      const w = _ovTenureWords(ed, !!h.approved, k === 0, holding);
      /* What they wrote while they had it. One note per tenure, so the column
         has something on nearly every row and each one is a distinct entry the
         drawer can be scrolled to. */
      const moved = ed ? ed.money : 0;
      const before = running;
      running += moved;
      const body = _ovLorem(`${id}|${h.who}|${k}`);
      _OV_TENURE_NOTES.push({who:h.who, role:h.role, when:(h.to || h.from),
                             body, level:(m.label || id), hidden:true});
      const nextHolder = chain[k + 1] ? chain[k + 1].who : null;
      return {
        note: body,
        handedTo: nextHolder,
        /* Their own movement and where it left the job. A tenure that changed
           no money carries neither — an unchanged total repeated down the
           column would read as three separate confirmations of one figure. */
        amount: moved ? _fmtDollars(running) : null,
        was:    moved ? _fmtDollars(before)  : null,
        who:h.who, role:h.role, kind: h.approved ? 'approved' : (k === 0 ? 'start' : 'handoff'),
        verb:w.verb, tail:w.tail, act:w.act, what:w.what,
        /* A tenure covers days, so it is dated by the day it ended — the day
           it stopped being that person's problem. One still open is dated by
           the day it started, which is the only date it has. */
        when: h.to ? _ovDateRange(h.from, h.to) : h.from,
        time: h.to ? h.toTime : h.fromTime,
        at: Date.parse(h.to || h.from) || 0,
        /* The rail shows the span where there is one, and the clock only
           where the row is a single moment — a time against a range would be
           claiming a precision the row does not have. */
        railDay: (h.to && _ovRailRange(h.from, h.to)) || null,
        /* Unique per tenure: several of them share a version, and the expand
           targets are keyed by this. */
        ver: `${id}~${k}`,
        detail: ed ? ed.detail : null,
        /* The document's worth belongs on the row that settled it. Where
           nothing has settled it yet, the newest tenure carries it. */
        settles: h.approved || (isPending && k === chain.length - 1),
        current: holding,
      };
    });
    /* Newest first, like the documents themselves. The chain is built in the
       order it happened, so reversing it is exact — including the two events
       that share a date, where sorting on the date alone would have put them
       in whichever order the comparison happened to settle on. */
    out.push({name:m.label || id, state: isPending ? 'Draft' : 'Approved',
              amount:amount, was:was, evs:evs.reverse()});
  });

  /* The closeout, when the project has one. Not a scope, so not in VER. */
  const st   = (typeof STAGE_ID !== 'undefined') ? STAGE_ID : '';
  const mode = (typeof PROJ_MODE !== 'undefined') ? PROJ_MODE : '';
  if(mode === 'closeout' || st === 'closeout' || st === 'closeout-approved'){
    const C = OVERVIEW_SEED.closeout;
    const done = st === 'closeout-approved';
    out.push({name:'Closeout', state: done ? 'Approved' : 'Draft', evs:[
      {...author, verb:'started', when:C.opened, kind:'start'},
      {...author, verb:'handed off', to:people.manager, when:C.handed, kind:'handoff'},
      ...(done
        ? [{who:people.manager, role:'Job manager', verb:'approved',
            when:C.approved, kind:'approved'}]
        : []),
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
   full.

   Only three kinds of row survive the trip here: money, contractor, and
   modifiers. The rest were prose — "Added · Add shelving to master closet",
   "Removed · resident handling separately" — a scope note restated beside a
   task whose name already says what it is, and long enough to push the rows
   that carry a figure out of view. A line that appeared still says so, with
   what it was worth; what it was for is in the task, one click away. */
function _ovTaskChangeSummary(task, verId){
  /* Money is recognised by the figure, not by a list of field names: Amount,
     Labor and Cost all read as money and a new field that does will too,
     while Product and Qty — the value changes that carry no figure — fall out
     on the same test. */
  const isMoney = v => /\$/.test(String(v == null ? '' : v));
  const keep = r => /contractor/i.test(r.field) || /modifier/i.test(r.field)
    || isMoney(r.from) || isMoney(r.to) || isMoney(r.wasAmount);
  /* "$0" is what a line removed from an unpriced task is worth. Saying it
     adds a figure to read and no fact. */
  const worth = v => (isMoney(v) && !/^\$0(\.00)?$/.test(String(v))) ? ' · ' + v : '';
  const parts = [];
  (task.changes || []).filter(ch => ch.ver === verId).forEach(ch => {
    (ch.rows || []).filter(keep).forEach(r => {
      if(r.field === 'Line added')     { parts.push('Added task' + worth(r.wasAmount)); return; }
      if(r.field === 'Line removed')   { parts.push('Removed task' + worth(r.wasAmount)); return; }
      if(r.field === 'Modifier added') { parts.push('Modifier · ' + r.add); return; }
      if(r.add)          { parts.push(r.field + ' · ' + r.add); return; }
      if(r.from && r.to) { parts.push(`${r.field} ${r.from} → ${r.to}`); return; }
      if(r.to)           { parts.push(`${r.field} → ${r.to}`); }
    });
  });
  if(!parts.length) return '';
  /* Two is as much as fits beside the name without the line becoming the
     paragraph this summary exists instead of. */
  const shown = parts.slice(0, 2).join('  ·  ');
  return parts.length > 2 ? `${shown}  ·  +${parts.length - 2} more` : shown;
}

/* What a version changed in total, pooled across everyone who touched it.
   The Activity does not ask this any more — it reports per person, holder by
   holder — but the Register's ledger does: a change order's own row is about
   the document, not about who was carrying it. */
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
/* Shut by default, and it stays however the reader left it for the session:
   someone on their way to the property opens it once and wants it open while
   they are still standing outside. */
let _ovAccessOpen = false;

/* ── Contractor assignments ──────────────────────────────────────────
   The rule this section has to teach: a task takes its trade's contractor;
   a trade with nobody set takes the General Contractor; a single task can
   override either. It is a cascade, and a flat two-column list of names —
   which is what this was — states none of it. Every row shows the same
   thing, so nothing says that Hammer Time is the floor under the others
   rather than one more trade beside them.

   So the section is drawn as what it is: the General Contractor at the
   root, the trades hanging off a rail beneath it, and a task override
   nested one step further under the trade it departs from. Depth is
   precedence — the further in, the more specific, the more it wins.

   A trade with no contractor of its own is the case the model exists for,
   so it is not left blank: it shows the name it inherits, greyed and
   marked FROM GENERAL, so the reader sees the fallback happening rather
   than being told about it. */
/* The whole header bar opens the list — a caret is a small target for
   something the entire line is about. Edit opts out, and the caret keeps its
   own handler so it stays the real focusable control: a div carrying
   role="button" around two nested buttons is invalid nesting, and the bar is
   a convenience target rather than the accessible one. */
function ovCrewHdClick(e){
  if(e.target.closest('.ov-crew-edit')) return;
  ovCrewToggle(document.querySelector('.ov-crew-fold'));
}
/* Collapsed by default. Eleven trades is a page of rows that mostly say the
   same thing — a trade, its default contractor, a figure — and the two facts
   worth the space are the ones the list is an exception to: who the general
   is, and what still has nobody on it. Those stay; the list folds behind a
   line that counts it. */
let _ovCrewOpen = false;
function ovCrewToggle(btn){
  _ovCrewOpen = !_ovCrewOpen;
  const list = document.getElementById('ovCrewList');
  const sum  = document.getElementById('ovCrewSum');
  const note = document.getElementById('ovCrewNote');
  if(list) list.hidden = !_ovCrewOpen;
  if(sum)  sum.hidden  = _ovCrewOpen;
  if(note) note.hidden = !_ovCrewOpen;
  /* Both the header caret and the summary line drive the same state, so
     whichever was not clicked has to be told too. */
  document.querySelectorAll('.ov-crew-fold,.ov-cw-sum').forEach(b =>
    b.setAttribute('aria-expanded', String(_ovCrewOpen)));
  if(btn) btn.setAttribute('aria-expanded', String(_ovCrewOpen));
}
/* The strip is the count of what the cascade cannot reach, so it goes to
   them: the same flag filter the toolbar carries, switched on, which narrows
   the sidebar to the tasks with no contractor. The Editor is where one gets
   assigned, so the scope has to be showing them before the number means
   anything to act on.

   'no_gc' is the filter key; tasks carry the flag as 'unassigned', and
   taskKeys() maps one to the other. */
function ovShowUnassigned(){
  if(typeof activeFilters === 'undefined') return;
  activeFilters.clear();
  activeFilters.add('no_gc');
  if(typeof _sbExpandForFilter === 'function') _sbExpandForFilter();
  if(typeof renderAll === 'function') renderAll();
  if(typeof toast === 'function') toast('Filtered to tasks with no contractor');
}
/* Assignments are changed on the work itself, not here — this is the
   readout. Grouping the sidebar by contractor is the surface where that is
   actually done, so Edit goes there rather than opening a second editor. */
function ovCrewEdit(){
  if(typeof setGroupBy === 'function') setGroupBy('contractor');
  if(typeof toast === 'function') toast('Scope grouped by contractor — assign from any task row');
}
/* Which trades have their exceptions showing. Shut by default: an override
   is the rare case, and leaving it open put a second contractor under a
   trade on every read of the list — the trade row says one is there and
   how many, which is enough until someone asks. */
let _ovCrewOverOpen = {};
function ovCrewOverToggle(trade, btn){
  _ovCrewOverOpen[trade] = !_ovCrewOverOpen[trade];
  const on = !!_ovCrewOverOpen[trade];
  const list = btn && btn.closest('.ov-cw-list');
  if(list) list.querySelectorAll(`[data-over="${CSS.escape(trade)}"]`)
    .forEach(el => { el.hidden = !on; });
  if(btn) btn.setAttribute('aria-expanded', String(on));
}
function _ovCrewRowHtml(r, gc){
  const n = k => `${k} ${k === 1 ? 'task' : 'tasks'}`;
  const inherits = !r.who;
  const idle = !r.tasks;
  const src = inherits
    ? `<span class="ov-cw-src is-inherit">From general</span>`
    : `<span class="ov-cw-src">Trade default</span>`;
  const who = inherits
    ? `<span class="ov-cw-who is-inherit">${esc(gc)}</span>`
    : `<span class="ov-cw-who">${esc(r.who)}</span>`;
  const overs = r.over || [];
  const open = !!_ovCrewOverOpen[r.trade];
  /* The count is the control: "1 override" says what is hidden and opens it,
     where a bare caret would only say that something is. */
  const overBtn = overs.length
    ? `<button type="button" class="ov-cw-more" aria-expanded="${open}"
         onclick="ovCrewOverToggle('${esc(r.trade).replace(/'/g, "\\'")}', this)"
         >${overs.length} override${overs.length === 1 ? '' : 's'}
         <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5l3 3 3-3"/></svg></button>`
    : '';
  const over = overs.map(o => `
    <li class="ov-cw-row is-over" data-over="${esc(r.trade)}"${open ? '' : ' hidden'}>
      <span class="ov-cw-trade">${esc(r.trade)}</span>
      <span class="ov-cw-by"><span class="ov-cw-src is-over">Task override</span>
        <span class="ov-cw-who">${esc(o.who)}</span></span>
      <span class="ov-cw-amt">${esc(o.amount || '')}</span>
      <span class="ov-cw-n">${esc(n(o.tasks))}</span>
    </li>`).join('');
  return `<li class="ov-cw-row${inherits ? ' is-inherit' : ''}${idle ? ' is-idle' : ''}">
      <span class="ov-cw-trade">${esc(r.trade)}</span>
      <span class="ov-cw-by">${src}${who}${overBtn}</span>
      <span class="ov-cw-amt">${r.amount ? esc(r.amount) : '&mdash;'}</span>
      <span class="ov-cw-n">${esc(n(r.tasks))}</span>
    </li>${over}`;
}
/* What the folded list adds up to. The breakdown names the two things the
   rows would have told you — how many trades are covered by the general, and
   how many tasks override their trade's default — because those are the only
   lines in the list anyone scans for. */
function _ovCrewSumHtml(S, inheriting){
  const ts = S.trades || [];
  if(!ts.length) return '';
  const money = ts.reduce((k, t) => k + _ovMoney(t.amount || ''), 0);
  const tasks = ts.reduce((k, t) => k + (t.tasks || 0), 0);
  const overs = ts.reduce((k, t) => k + ((t.over || []).length), 0);
  const bits = [
    `${ts.length - inheriting} assigned`,
    inheriting ? `${inheriting} from general` : '',
    overs ? `${overs} override${overs === 1 ? '' : 's'}` : '',
  ].filter(Boolean).join(' \u00b7 ');
  return `<button type="button" class="ov-cw-sum" id="ovCrewSum"${_ovCrewOpen ? ' hidden' : ''}
      aria-expanded="${_ovCrewOpen}" aria-controls="ovCrewList" onclick="ovCrewToggle(this)">
    <span class="ov-cw-sumk">${ts.length} trade${ts.length === 1 ? '' : 's'}
      <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5l3 3 3-3"/></svg></span>
    <span class="ov-cw-sumd">${esc(bits)}</span>
    <span class="ov-cw-amt">${money ? esc(_fmtDollars(money)) : '&mdash;'}</span>
    <span class="ov-cw-n">${tasks} ${tasks === 1 ? 'task' : 'tasks'}</span>
  </button>`;
}
function _ovCrewHtml(){
  const S = OVERVIEW_SEED;
  const g = S.general || {};
  const n = k => `${k} ${k === 1 ? 'task' : 'tasks'}`;
  const inheriting = (S.trades || []).filter(t => !t.who).length;
  /* Counted off the scope, not seeded. The strip is a control now — it
     filters the sidebar to these tasks — so a number that disagreed with what
     the filter then showed was the strip lying about its own destination. At
     the stages where every task has a contractor there is nothing to count,
     and the strip does not appear. */
  const _none = (typeof TASKS !== 'undefined') ? TASKS.filter(t => !t.gc) : [];
  const _worth = _none.reduce((k, t) => k + _ovMoney(t.cost), 0);
  const u = _none.length
    ? {tasks:_none.length,
       /* A dash, not $0, when the tasks are not priced yet — the same rule the
          idle trade row follows, and for the same reason: $0 claims the work
          is free rather than unpriced. */
       amount:_worth ? _fmtDollars(_worth) : ''}
    : null;
  return `<section class="ov-mod ov-crew">
    <div class="ov-crew-hd" onclick="ovCrewHdClick(event)">
      <h3 class="ov-crew-h">Contractor assignments</h3>
      <button type="button" class="ov-crew-edit" onclick="event.stopPropagation();ovCrewEdit()">Edit</button>
      <button type="button" class="ov-crew-fold" aria-expanded="${_ovCrewOpen}"
              aria-controls="ovCrewList" aria-label="Show or hide the trade list"
              onclick="event.stopPropagation();ovCrewToggle(this)">
        <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5l3 3 3-3"/></svg>
      </button>
    </div>
    <div class="ov-crew-body" id="ovCrewBody">
      <div class="ov-cw-root">
        <div class="ov-cw-rootbar">
          <span class="ov-cw-rootk">General contractor</span>
          <span class="ov-cw-rootv">${esc(g.who || 'Unassigned')}</span>
          <span class="ov-cw-amt">${esc(g.amount || '')}</span>
          <span class="ov-cw-n">${esc(n(g.tasks || 0))}</span>
        </div>
        <p class="ov-cw-rootnote" id="ovCrewNote"${_ovCrewOpen ? '' : ' hidden'}>${inheriting
          ? `Fallback for <b>${inheriting} ${inheriting === 1 ? 'trade' : 'trades'}</b> with no assigned trade contractor`
          : 'Fallback for any trade with no assigned trade contractor'}</p>
      </div>

      ${_ovCrewSumHtml(S, inheriting)}
      <ul class="ov-cw-list" id="ovCrewList"${_ovCrewOpen ? '' : ' hidden'}>
        ${(S.trades || []).map(r => _ovCrewRowHtml(r, g.who)).join('')}
      </ul>

      ${u ? `<button type="button" class="ov-cw-none" onclick="ovShowUnassigned()"
        title="Filter the scope to tasks with no contractor">
        ${typeof _flagIconSvg === 'function' ? _flagIconSvg() : ''}
        <span class="ov-cw-nonek">Unassigned contractors</span>
        <span class="ov-cw-amt">${u.amount ? esc(u.amount) : '&mdash;'}</span>
        <span class="ov-cw-n">${esc(n(u.tasks))}</span>
      </button>` : ''}
    </div>
  </section>`;
}
function ovAccessToggle(btn){
  _ovAccessOpen = !_ovAccessOpen;
  const box = document.getElementById('ovAccessBody');
  if(box) box.hidden = !_ovAccessOpen;
  if(btn){
    btn.setAttribute('aria-expanded', String(_ovAccessOpen));
    /* The label names what the click does, so it has to turn over with the
       state — a caret alone left "See access details" sitting above the
       details it had already shown. */
    const t = btn.querySelector('.ov-access-cta-t');
    if(t) t.textContent = _ovAccessOpen ? 'Hide access info' : 'See access info';
  }
}
/* Called from the caret and from the row around it, so the caret is found
   rather than passed: whichever of them was clicked, the one that carries the
   state is the control pointing at this list. */
function ovToggleChanges(verId){
  _ovOpenChanges[verId] = !_ovOpenChanges[verId];
  const on = !!_ovOpenChanges[verId];
  const box = document.getElementById('ovCh-' + verId);
  if(box) box.hidden = !on;
  const btn = document.querySelector(`[aria-controls="ovCh-${verId}"]`);
  if(btn) btn.setAttribute('aria-expanded', String(on));
}
/* A tenure covers a span of days, so it is labelled with one. Lives here
   now that the site rows it was written for are gone — the tenures use it for
   the same reason those did. */
function _ovDateRange(a, b){
  const da = Date.parse(a), db = Date.parse(b);
  if(isNaN(da) && isNaN(db)) return '';
  if(isNaN(da)) return b;
  if(isNaN(db)) return a;
  const [lo, hi] = da <= db ? [new Date(da), new Date(db)] : [new Date(db), new Date(da)];
  const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const day = d => `${M[d.getMonth()]} ${d.getDate()}`;
  if(lo.getTime() === hi.getTime()) return `${day(hi)}, ${hi.getFullYear()}`;
  if(lo.getFullYear() !== hi.getFullYear())
    return `${day(lo)}, ${lo.getFullYear()} \u2013 ${day(hi)}, ${hi.getFullYear()}`;
  if(lo.getMonth() !== hi.getMonth())
    return `${day(lo)} \u2013 ${day(hi)}, ${hi.getFullYear()}`;
  return `${day(lo)} \u2013 ${hi.getDate()}, ${hi.getFullYear()}`;
}

const _OV_TICK = `<svg class="ov-tr-ck" viewBox="0 0 12 12" fill="none" stroke="currentColor"
  stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 6.5 5 9l4.5-5.5"/></svg>`;

/* Four columns, shared by every row in the document so they line up: what
   happened, what it is worth, what that moved by, and when. The roles are
   gone from the event — the names are the roster's, and a title beside each
   one was three words of the same answer on every line. */
/* ── one feed, no containers ──────────────────────────────────────────
   The trail used to be a stack of document blocks: a big bold title, then
   the events under it. Two things went wrong with that. The site activity
   between two documents sat directly under a title it had nothing to do
   with, so weeks of photos read as part of Change Order 1. And inside a
   block the rows said "approved it" — "it" being whatever the header said,
   which is exactly the dependency that made everything below the header
   look owned by it.

   So there are no headers. Every row is a sentence that names its own
   subject: "T. Okafor approved Change Order 1". Nothing can be mistaken for
   belonging to the row above it, because nothing contains anything.

   Bold now means one thing and means it everywhere: a document is involved.
   A site row has no bold text in it at all, which is the signal that it is
   not about a document — it is what happened on the property in between. */
/* What a document moved by, and where that left it — the one derivation the
   feed row, the hover card and the timeline's Difference/Total columns all
   read from. Returns null when there is nothing to compare against, which is
   the original scope: it has an amount but no movement. */
function _ovDelta(d){
  if(!d || !d.amount || !d.was) return null;
  const n = dollars(d.amount) - dollars(d.was);
  return {n, cls: n > 0 ? 'is-up' : n < 0 ? 'is-dn' : '',
          text: (n > 0 ? '+' : n < 0 ? '\u2212' : '')
              + '$' + Math.abs(n).toLocaleString('en-US'),
          title: `${d.was} \u2192 ${d.amount}`};
}
/* What it moved by, then where that left it. This used to strike the old
   figure and print the new one, which made the reader subtract to find the one
   fact the row is actually reporting — a change order's whole point is its
   amount. The struck figure has not gone far: it is the title, for anyone
   checking what the difference is a difference from. */
function _ovMoneyHtml(d){
  if(!d.amount) return '';
  const now = `<span class="ov-tr-now">${esc(d.amount)}</span>`;
  const dl = _ovDelta(d);
  if(!dl) return `<span class="ov-tr-money">${now}</span>`;
  return `<span class="ov-tr-money" title="${esc(dl.title)}"
    ><span class="ov-tr-delta ${dl.cls}">${esc(dl.text)}</span
    ><span class="ov-tr-arrow" aria-hidden="true">\u2192</span>${now}</span>`;
}
/* A document's name is the way to the document: the Register, opened on that
   document, which is exactly where its card in Historical artifacts leads.
   It used to go to Artifact 2 — the tab about change history in general —
   which answered a question the reader had not asked. */
function ovOpenDoc(name){
  const v = (typeof VERSIONS !== 'undefined' && typeof versionLabel === 'function')
    ? VERSIONS.find(x => versionLabel(x) === name) : null;
  if(!v){
    if(typeof toast === 'function') toast(`${name} isn't in this job's documents`);
    return;
  }
  /* Mode first, then the drill-in: setWorkMode renders the Register's index,
     and openHistorical re-renders it on the document — the other order paints
     the document and then throws it away. */
  if(typeof setWorkMode === 'function') setWorkMode('artifact');
  if(typeof openHistorical === 'function') openHistorical(v.id);
}

/* ── the feed, in the order things happened ──────────────────────────
   Site work is not something that happens *between* documents. A change
   order is opened, passed around and approved over a couple of weeks, and
   the property is being worked on the whole time — tasks were being marked
   complete while Change Order 2 was still being handed around. Filing the
   site activity after a document's block said the opposite.

   So the feed is one list in true date order, documents and site runs
   interleaved wherever they actually fall, and the blocks are months rather
   than documents. A month is a real boundary; a document is not, because
   two of them overlap. */
function _ovFeedEntries(docs){
  const out = [];
  /* The change count is not rendered as a row — it said how much moved
     without saying what, and the document's own preview lists the tasks. It
     stays on the document so the hover card can still read it, and
     index-activity.html puts it back on the feed. */
  docs.forEach(d => d.evs.forEach(e => out.push({
    kind:'doc', doc:d, ev:e, lead: !!e.settles,
    at: e.at || Date.parse(e.when) || 0
  })));
  /* Newest first. Two things can land on one day, so the tie-break is the
     order they must have happened in: a document is approved, and only then
     is the next one started. Site runs come last — a run is filed under the
     last day of its span, and a document event that day is the sharper fact.

     (This also fixes a comparator that returned -1 for every doc-vs-doc
     comparison, which is not an ordering and left same-day rows wherever the
     sort happened to drop them.) */
  const rank = en => ({approved:0, handoff:1, start:3})[en.ev.kind] ?? 4;
  return out.sort((a, b) => (b.at - a.at) || (rank(a) - rank(b)));
}
/* One row of a document's chain. `lead` is the document's newest event, and
   only that row carries the money: it is where the document currently
   stands, so it is the honest place for it. */
function _ovDocRowHtml(d, e, lead){
  /* The name goes to the document, the row opens the list — so the name has
     to stop the click reaching the row, or following a link would expand
     something on the way out. */
  const nm = `<button type="button" class="ov-tr-doc-n" data-hv-doc="${esc(d.name)}"
      onclick="event.stopPropagation();ovOpenDoc('${esc(d.name).replace(/'/g, "\\'")}')">${esc(d.name)}</button>`;
  /* "Diego R. edited 3 tasks in Change Order 1 and approved it" — the tail is
     what follows the document's name, which a verb alone cannot reach. */
  const sentence = e.verb
    ? `${e.who ? `<span class="ov-tr-who">${esc(e.who)}</span> ` : ''}${esc(e.verb)} ${nm}${
        e.to ? ` to <span class="ov-tr-who2">${esc(e.to)}</span>` : ''}${
        e.tail ? ` ${esc(e.tail)}` : ''}`
    : `${esc(e.act)} in ${nm}`;
  /* The count opens its own list, so that row is a button — but the document
     name inside it is a link of its own, which a button cannot contain. The
     caret is the control instead, sitting after the sentence. */
  const body = e.detail
    ? `<span class="ov-tr-act">${sentence}
         <button type="button" class="ov-tr-open" aria-label="Show the tasks that changed"
           aria-expanded="${!!_ovOpenChanges[e.ver]}" aria-controls="ovCh-${e.ver}"
           onclick="event.stopPropagation();ovToggleChanges('${e.ver}')"
           ><svg class="ov-tr-car" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5l3 3 3-3"/></svg></button>
       </span>`
    : `<span class="ov-tr-act">${sentence}</span>`;
  /* A row that opens is clickable across its whole width — a caret is a small
     target for something the entire line is about. The row is display:contents
     and has no box of its own to carry the handler, so each cell takes it. The
     caret stays, for the keyboard and for saying the row does anything. */
  const tap = e.detail ? ` onclick="ovToggleChanges('${e.ver}')"` : '';
  return `<div class="ov-tr-r ov-tr-${e.kind}${e.detail ? ' is-tappable' : ''}">
      <span class="ov-tr-d"${tap}>${esc(e.when || '')}</span>
      <span class="ov-tr-ev"${tap}>
        <span class="ov-tr-mk">${e.kind === 'approved' ? _OV_TICK : ''}</span>
        ${body}
      </span>
      <span class="ov-tr-sum"${tap}>${_ovMoneyHtml(e)}</span>
    </div>
    ${e.detail ? `<div class="ov-tr-detail" id="ovCh-${e.ver}"${_ovOpenChanges[e.ver] ? '' : ' hidden'} onclick="event.stopPropagation()">
      ${e.detail.map(g => `<div class="ov-ch-g">
        <button type="button" class="ov-ch-grp" data-hv-room="${esc(g.room)}" onclick="ovGoGroup('${esc(g.room).replace(/'/g, "\\'")}')">${esc(g.room)}</button>
        <div class="ov-ch-ts">${g.tasks.map(t => `
          <button type="button" class="ov-ch-task"
            data-hv-code="${esc(t.code)}" data-hv-room="${esc(g.room)}" data-hv-name="${esc(t.name)}"
          onclick="ovGoTask('${esc(t.code)}', '${esc(g.room).replace(/'/g, "\\'")}', '${esc(t.name).replace(/'/g, "\\'")}')">
            <span class="ov-ch-code">${esc(t.code)}</span>
            <span class="ov-ch-name">${esc(t.name)}</span>
            ${t.what ? `<span class="ov-ch-what">${esc(t.what)}</span>` : ''}</button>`).join('')}</div>
      </div>`).join('')}
    </div>` : ''}`;
}

/* Consecutive document rows share one grid so their columns line up; a site
   run or a month rule closes the grid and the next run of rows opens a new
   one. The column tracks are fixed, so blocks still align with each other. */
function _ovSentenceFeedHtml(entries, state){
  let html = '', open = false;
  const close = () => { if(open){ html += '</div>'; open = false; } };
  entries.forEach(en => {
    const wk = _ovWeekLabel(en.at);
    if(wk && wk !== state.w){
      state.w = wk;
      close();
      html += `<div class="ov-tr-rule"><span>${esc(wk)}</span></div>`;
    }
    if(!open){ html += '<div class="ov-tr-rows">'; open = true; }
    html += _ovDocRowHtml(en.doc, en.ev, en.lead);
  });
  close();
  return html;
}

/* ── the timeline ────────────────────────────────────────────────────
   A dated rail with a marker per event, ruled off into weeks. The columns
   answer six questions in the order they get asked: who acted, how long they
   had held the job before they did, which document they were in, what they
   did, anything recorded with it, and what it did to the money.

   Weeks rather than months. A month is too coarse a rule for a document that
   is opened, passed round and approved inside three of them — the rule is
   there to say "this was a different stretch of work", and at month scale it
   almost never falls where that changes. */
const _OV_MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function _ovWeekLabel(ts){
  const d = new Date(ts);
  if(isNaN(d.getTime())) return '';
  d.setHours(0,0,0,0);
  d.setDate(d.getDate() - d.getDay());          // back to the Sunday
  return `Week of ${_OV_MON[d.getMonth()]} ${d.getDate()}`;
}
function _ovOrd(n){
  const s = ['th','st','nd','rd'], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
/* "Apr 22 – 28" for a tenure that spans days. The rail is 88px, so the month
   is said once when both ends share it. */
function _ovRailRange(a, b){
  const d1 = new Date(a), d2 = new Date(b);
  if(isNaN(d1.getTime()) || isNaN(d2.getTime())) return '';
  if(d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate()) return '';
  return d1.getMonth() === d2.getMonth()
    ? `${_OV_MON[d1.getMonth()]} ${d1.getDate()} – ${d2.getDate()}`
    : `${_OV_MON[d1.getMonth()]} ${d1.getDate()} – ${_OV_MON[d2.getMonth()]} ${d2.getDate()}`;
}
function _ovDayLabel(ts){
  const d = new Date(ts);
  return isNaN(d.getTime()) ? '' : `${_OV_MON[d.getMonth()]} ${_ovOrd(d.getDate())}`;
}
/* Day granularity is all the records carry — inventing a clock time to fill
   the rail would be inventing evidence. The year sits under the date instead,
   which is the fact a reader actually wants on an audit trail. */
function _ovYearLabel(ts){
  const d = new Date(ts);
  return isNaN(d.getTime()) ? '' : String(d.getFullYear());
}
/* '4:40pm' -> minutes past midnight. The seed writes times the way a person
   would, so they are parsed here rather than stored as numbers nobody can
   read in the data file. */
function _ovClockMins(t){
  const m = String(t || '').trim().match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);
  if(!m) return null;
  let h = +m[1] % 12;
  if(/pm/i.test(m[3])) h += 12;
  return h * 60 + (+m[2]);
}
/* An event's moment, to the minute where the record has one. */
function _ovEventAt(e){
  const day = Date.parse(e.when);
  if(isNaN(day)) return e.at || 0;
  const mins = _ovClockMins(e.time);
  return mins == null ? day : day + mins * 60000;
}
function _ovHumanSpan(ms){
  if(!(ms > 0)) return 'Under a minute';
  const mins = Math.round(ms / 60000);
  if(mins < 60) return `${mins} minute${mins === 1 ? '' : 's'}`;
  const days = Math.round(ms / 864e5);
  if(days < 1){
    const h = Math.round(ms / 36e5);
    return `${h} hour${h === 1 ? '' : 's'}`;
  }
  if(days === 1) return '1 day';
  if(days < 30) return `${days} days`;
  const mo = Math.round(days / 30);
  return mo === 1 ? '1 month' : `${mo} months`;
}
/* How long the person had the job before this event — measured from whatever
   last happened to the document, which is the moment it became theirs. The
   first event has nothing before it, so it has no duration rather than a
   made-up zero. Keyed by event object: the same person can hold the same
   document twice. */
const _ovDurCache = new WeakMap();
function _ovDurations(d){
  if(_ovDurCache.has(d)) return _ovDurCache.get(d);
  const chrono = d.evs.slice().reverse();        // evs are newest-first
  const out = new Map();
  const at = e => e.at || _ovEventAt(e);   // 'changed' carries a span, not a date
  chrono.forEach((e, i) => {
    if(!i) return;
    const a = at(chrono[i - 1]), b = at(e);
    if(a && b) out.set(e, _ovHumanSpan(b - a));
  });
  _ovDurCache.set(d, out);
  return out;
}
/* What the action did to the job total, as the difference it made. The pair
   it is read from — what the document was worth before and after — stays in
   the tooltip, so the column can be one signed figure without hiding what it
   came from. */
function _ovTotalHtml(d){
  if(!d.amount) return '';
  const from = _ovDelta(d) ? '<span class="ov-tl-arrow" aria-hidden="true">\u2192</span>' : '';
  return `${from}<span class="ov-tl-tot">${esc(d.amount)}</span>`;
}
function _ovDiffHtml(d){
  const dl = _ovDelta(d);
  if(!dl) return '';
  return `<span class="ov-tl-delta ${dl.cls}" title="${esc(dl.title)}">${esc(dl.text)}</span>`;
}

/* Duration is parked, not removed: the hours inside a day are derived rather
   than measured (see _ovHoursFor), so the column is off until the events
   carry real timestamps. Flip this back to true and the header cell, the row
   cell and the grid track all come back together — which is why all three
   read the one flag instead of being commented out separately. */
const OV_SHOW_DURATION = false;
const _OV_COLS = [
  ...(OV_SHOW_DURATION ? [['Duration', 'How long this person had the job before they acted on it']] : []),
  ['Who',        'The person who acted'],
  ['What',       'What they did — a count opens the list it counts'],
  ['Artifact',   'The document the action happened in'],
  ['Note',       'Anything recorded alongside the action'],
  ['Difference', 'What the action did to the job total', 'num'],
  ['Total',      'What the job was worth once the action had landed', 'num'],
];
function _ovTlHead(){
  return `<div class="ov-tl-hd">
    <span class="ov-tl-when"></span><span class="ov-tl-rail"></span>
    ${_OV_COLS.map(([l, t, a]) =>
      `<span class="ov-tl-h${a === 'num' ? ' is-num' : ''}" title="${esc(t)}">${esc(l)}</span>`).join('')}
  </div>`;
}
function _ovTlDetail(groups){
  return (groups || []).map(g => `<div class="ov-ch-g">
    <button type="button" class="ov-ch-grp" data-hv-room="${esc(g.room)}"
      onclick="ovGoGroup('${esc(g.room).replace(/'/g, "\\'")}')">${esc(g.room)}</button>
    <div class="ov-ch-ts">${g.tasks.map(t => `
      <button type="button" class="ov-ch-task"
        data-hv-code="${esc(t.code)}" data-hv-room="${esc(g.room)}" data-hv-name="${esc(t.name)}"
        onclick="ovGoTask('${esc(t.code)}', '${esc(g.room).replace(/'/g, "\\'")}', '${esc(t.name).replace(/'/g, "\\'")}')">
        <span class="ov-ch-code">${esc(t.code)}</span>
        <span class="ov-ch-name">${esc(t.name)}</span>
        ${t.what ? `<span class="ov-ch-what">${esc(t.what)}</span>` : ''}</button>`).join('')}</div>
  </div>`).join('');
}
const _OV_DASH = '<span class="ov-tl-dash">\u2014</span>';
/* Where the rest of a note lives. The events carry no note of their own yet
   (see _OV_LOREM), so this goes to the scope's notes — the drawer this column
   will read from once hand-off notes are stored on the event. */
function ovOpenNote(body){
  if(typeof openScopeDrawer !== 'function'){
    if(typeof toast === 'function') toast('Notes drawer unavailable here');
    return;
  }
  openScopeDrawer('notes');
  if(!body) return;
  /* setTimeout rather than rAF: the drawer's panel does not always get frames
     (a backgrounded panel drops them), and a queued highlight that never runs
     is worse than one a tick late. Matched on the opening of the body — the
     drawer renders the same string, so a prefix is enough to find it and short
     enough to survive any wrapping the card does. */
  const key = String(body).slice(0, 40);
  setTimeout(() => {
    const hit = [...document.querySelectorAll('.dw-note')]
      .find(n => n.textContent.includes(key));
    if(!hit) return;
    document.querySelectorAll('.dw-note.is-hit').forEach(n => n.classList.remove('is-hit'));
    hit.classList.add('is-hit');
    hit.scrollIntoView({block:'center'});
    /* The highlight is a pointer, not a state: it says "this one" and then
       gets out of the way. */
    setTimeout(() => hit.classList.remove('is-hit'), 2400);
  }, 60);
}
/* "Tara O." rather than "T. Okafor". The Activity names the same four people
   on every row, so a surname is doing no work — the first name is how anyone
   on the job actually refers to them, and the last initial is there for the
   day two Taras are on it. Falls back to the stored name for anyone off the
   roster, which is the honest failure: a name we cannot shorten is still a
   name. */
function _ovWhoShort(who){
  const n = String(who || '').trim();
  if(!n) return '';
  const roster = (typeof REVIEWERS !== 'undefined') ? REVIEWERS : [];
  const p = roster.find(r => r.who === n);
  if(!p || !p.first) return n;
  const last = n.split(/\s+/).pop() || '';
  return last ? `${p.first} ${last[0]}.` : p.first;
}
/* Placeholder copy for Note. The events carry no note of their own yet — the
   hand-off dialogue collects one but does not keep it on the event — so this
   stands in to show the column at its real width. Picked by hash, not at
   random, so a row keeps the same note between renders. Replace the whole
   thing the moment hand-off notes are stored. */
/* Long enough to run past two lines, because a note that fits is a note with
   nothing behind it — the column has to show that there is more to read
   before the click that opens it means anything. */
const _OV_LOREM = [
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip.',
  'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur, excepteur sint occaecat.',
  'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit.',
  'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium.',
  'Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia.',
];
/* The notes the Activity shows are real entries, not decoration: they are
   collected here as the trail is built and handed to the notes drawer through
   scopeNotesPool, so clicking one in the feed can land on the same note in the
   drawer. Rebuilt whenever the trail is. */
let _OV_TENURE_NOTES = [];
function ovTenureNotes(){ return _OV_TENURE_NOTES; }
function _ovLorem(seed){
  const t = String(seed || '');
  let h = 0;
  for(let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) >>> 0;
  return _OV_LOREM[h % _OV_LOREM.length];
}
/* Rows are display:contents so every cell is a grid item of the one timeline
   grid — that is what keeps the columns true across weeks and across the
   collapsed block below. Which also means the row has no box to hang a click
   handler on, so each cell takes it. */
function _ovTlRow(o){
  const tap = o.detailId ? ` onclick="ovToggleChanges('${o.detailId}')"` : '';
  /* Earlier history is hidden cell by cell rather than by hiding a row box —
     there isn't one. Which is also why it stays in the same grid as the rows
     above it: two grids size their fr tracks to their own content, so the
     columns drifted across the seam the moment you expanded it. */
  const L = o.later ? ' is-later' : '';
  const caret = o.detailId
    ? `<button type="button" class="ov-tl-car" aria-label="Show what this covers"
         aria-expanded="${!!_ovOpenChanges[o.detailId]}" aria-controls="ovCh-${o.detailId}"
         onclick="event.stopPropagation();ovToggleChanges('${o.detailId}')"
         ><svg viewBox="0 0 10 10" aria-hidden="true"><path d="M1.2 3.4h7.6L5 8.2z"/></svg></button>`
    : '';
  return `<div class="ov-tl-r ov-tl-${o.kind}${o.detailId ? ' is-tappable' : ''}${o.wkFirst ? ' is-wkfirst' : ''}${o.alt ? ' is-alt' : ''}${o.current ? ' is-current' : ''}">
    <span class="ov-tl-when${L}"${tap}><b>${esc(o.day)}</b><i>${esc(o.sub || '')}</i></span>
    <span class="ov-tl-rail${L}"${tap}><span class="ov-tl-mk"></span></span>
    ${OV_SHOW_DURATION ? `<span class="ov-tl-dur${L}"${tap}>${o.dur ? esc(o.dur) : _OV_DASH}</span>` : ''}
    <span class="ov-tl-who${L}"${tap}>${o.who ? esc(o.who) : _OV_DASH}</span>
    <span class="ov-tl-what${L}"${tap}><span class="ov-tl-what-t">${o.what || ''}${caret}</span>${o.handoff || ''}</span>
    <span class="ov-tl-where${L}"${tap}>${o.where || ''}</span>
    <span class="ov-tl-note${L}"${tap}>${o.note
      ? `<button type="button" class="ov-tl-note-t" title="Open this note in the notes drawer"
           onclick="event.stopPropagation();ovOpenNote(this.textContent)">${esc(o.note)}</button>`
      : _OV_DASH}</span>
    <span class="ov-tl-diff${L}"${tap}>${o.diff || ''}</span>
    <span class="ov-tl-total${L}"${tap}>${o.total || ''}</span>
  </div>${o.detailId ? `<div class="ov-tl-detail${L}" id="ovCh-${o.detailId}"${
    _ovOpenChanges[o.detailId] ? '' : ' hidden'} onclick="event.stopPropagation()"
    >${_ovTlDetail(o.detail)}</div>` : ''}`;
}
/* One entry point, two shapes. Everything above this — the entries, their
   order, the change detail they open — is shared; only the row markup differs. */
function _ovFeedHtml(entries, state, later){
  return OV_SENTENCES ? _ovSentenceFeedHtml(entries, state)
                      : _ovTimelineFeedHtml(entries, state, later);
}
function _ovTimelineFeedHtml(entries, weekState, later){
  let html = '';
  const L = later ? ' is-later' : '';
  let band = 0;
  entries.forEach(en => {
    const wk = _ovWeekLabel(en.at);
    let wkFirst = false;
    if(wk && wk !== weekState.w){
      weekState.w = wk; wkFirst = true; band = 0;
      html += `<div class="ov-tl-wk${L}"><span>${esc(wk)}</span></div>`;
    }
    const d = en.doc, e = en.ev;
    const what = esc(e.what || '');
    /* Under the action, not beside it: the What cell already wraps, and a
       hand-off tacked onto the end of a wrapping phrase reads as part of it. */
    const handoff = e.handedTo
      ? `<span class="ov-tl-handoff">Handed off to <b>${esc(_ovWhoShort(e.handedTo))}</b></span>`
      : '';
    const where = `<button type="button" class="ov-tl-doc" data-hv-doc="${esc(d.name)}"
        onclick="event.stopPropagation();ovOpenDoc('${esc(d.name).replace(/'/g, "\\'")}')"
        ><span class="ov-tl-doc-n">${esc(d.name)}</span></button
      ><span class="ov-tl-state">${esc(d.state || '')}</span>`;
    html += _ovTlRow({
      kind:e.kind, handoff,
      day: e.railDay || _ovDayLabel(en.at),
      sub: e.railDay ? _ovYearLabel(en.at) : (e.time || _ovYearLabel(en.at)),
      who:_ovWhoShort(e.who), dur:_ovDurations(d).get(e), where, what,
      note:e.note || '',
      diff: _ovDiffHtml(e),
      total: _ovTotalHtml(e),
      detailId: e.detail ? e.ver : null, detail:e.detail, wkFirst, later,
      alt: (band++ % 2) === 1, current: !!e.current,
    });
  });
  return html;
}
/* Who is holding the newest document, said once at the top. It used to be an
   event row — "S. Patel has it for approval" — which restated the hand-off
   directly above it. As a standing it is not a restatement: the row says a
   hand-off happened, this says nothing has happened since, which is why it
   reads as work in progress rather than as a queue. */
function _ovStandingLineHtml(docs){
  const d = docs[0];
  if(!d || d.state === 'Approved') return '';
  const ev = d.evs[0] || {};
  const who = ev.to || ev.who;
  if(!who) return '';
  return `<div class="ov-tr-now-line">
    <span class="ov-tr-now-v"><b>${esc(OV_SENTENCES ? who : _ovWhoShort(who))}</b> is working on <b>${esc(d.name)}</b></span>
    <span class="ov-tr-now-d">since ${esc(ev.when || '')}</span>
  </div>`;
}

/* Who is holding the newest document, for the shell. The toolbar's turn chip
   used to name the role that owes the move — "Your move", or the role person
   behind it — while the Activity two panes down named the person actually
   holding the document. Same question, two answers. The Activity's answer is
   the one built from the document's own hand-offs, so it is the one that
   travels: the shell reads this and says the same name. */
window.a2CurrentHolder = function(){
  try{
    const docs = _ovTrail();
    const d = docs && docs[0];
    if(!d || d.state === 'Approved') return null;
    const ev = d.evs[0] || {};
    const who = ev.to || ev.who;
    return who ? {name: who, short: _ovWhoShort(who), doc: d.name} : null;
  }catch(e){ return null; }
};

/* The current document's run is what anyone came here to check; everything
   older is the audit trail, which is a different errand. So the feed is cut
   at the day the newest document was opened — everything from there on is
   open, the rest is one click away with its size said up front. */
function _ovTrailHtml(){
  const docs = _ovTrail();
  if(!docs.length) return `<p class="ov-empty">No documents yet.</p>`;
  const entries = _ovFeedEntries(docs);
  const current = docs[0];
  const startedAt = Math.min(...current.evs.map(e => Date.parse(e.when) || Infinity));
  let cut = entries.findIndex(en => en.at < startedAt);
  if(cut < 0) cut = entries.length;
  const state = {w:'', m:''};   // week for the timeline, month for the sentences
  const head = _ovFeedHtml(entries.slice(0, cut), state);
  /* No standing line. "Sana P. is working on Change Order 2 since Apr 28" was
     a sentence restating the top row of the table under it — the row already
     names the person, the document and the date. It is marked instead. */
  const standing = '';
  /* The earlier block is a second grid rather than a hidden part of the first:
     a display:contents row cannot be hidden (the [hidden] rule has nothing to
     hide, the cells are still grid items of the parent). Two grids inside one
     scroller share a width, so the columns still line up across the seam. */
  /* Sentences stack as plain blocks; the timeline has to live in its grid,
     with the header row and the earlier stretch inside the same one. */
  const wrap = body => OV_SENTENCES ? body
    : `<div class="ov-tl-scroll"><div class="ov-tl${OV_SHOW_DURATION ? ' has-dur' : ''}">${_ovTlHead()}${body}</div></div>`;
  if(cut >= entries.length) return `<div class="ov-trail">${standing}${wrap(head)}</div>`;
  const rest = _ovFeedHtml(entries.slice(cut), state, true);
  const n = entries.length - cut;
  const lbl = `View all history (${n} earlier ${n === 1 ? 'entry' : 'entries'})`;
  return `<div class="ov-trail">
    ${standing}
    ${OV_SENTENCES
      ? `${head}<div class="ov-trail-rest" id="ovTrailRest" hidden>${rest}</div>`
      : `<div class="ov-tl-scroll">
           <div class="ov-tl is-shut${OV_SHOW_DURATION ? ' has-dur' : ''}" id="ovTrailRest">${_ovTlHead()}${head}${rest}</div>
         </div>`}
    <button type="button" class="ov-more" id="ovTrailMore"
            aria-expanded="false" aria-controls="ovTrailRest"
            onclick="ovTrailToggle()"
            data-open="Hide earlier activity"
            data-shut="${lbl}">${lbl}</button>
  </div>`;
}
/* A class toggle rather than a re-render: renderOverview would rebuild the
   whole tab and lose the scroll position you were reading at. */
function ovTrailToggle(){
  const el  = document.getElementById('ovTrailRest');
  const btn = document.getElementById('ovTrailMore');
  if(!el || !btn) return;
  /* Two shapes, two ways of hiding: the timeline's rows are display:contents
     and have no box to hide, so its earlier stretch goes behind a class on
     the grid; the sentence block is an ordinary div. */
  const isGrid = el.classList.contains('ov-tl');
  const open = isGrid ? el.classList.contains('is-shut') : el.hidden;
  if(isGrid) el.classList.toggle('is-shut', !open);
  else el.hidden = !open;
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
/* `action` is the control in the section's top-right corner — Edit, on the
   blocks that have something to edit. It shares the heading's line rather
   than sitting above or below it, the same arrangement Contractor
   assignments uses, so every section header in the tab reads alike. */
function _ovSec(label, body, cls, action){
  const head = (label || action)
    ? `<div class="ov-sec-hd-row">
        ${label ? `<h3 class="ov-sec-h">${esc(label)}</h3>` : '<span></span>'}
        ${action || ''}
      </div>`
    : '';
  return `<section class="ov-mod${cls ? ' ' + cls : ''}">
    ${head}
    ${body}
  </section>`;
}
/* A row's value is escaped text unless it carries `html`, which is markup the
   caller built — the template field is a link, and a link cannot survive
   being escaped. */
function _ovFieldsHtml(rows){
  return `<dl class="ov-fields">${rows.filter(Boolean).map(r => `
    <div class="ov-field${r.cls ? ' ' + r.cls : ''}"><dt>${r.klink
      ? `<a class="ov-field-link" href="#" onclick="event.preventDefault();ovMarketOpen()">${esc(r.k)}</a>`
      : esc(r.k)}</dt><dd>${r.html || esc(r.v)}</dd></div>`).join('')}</dl>`;
}
/* The corner control. Nothing in the prototype edits these fields, so it says
   where the change would be made rather than pretending to open a form. */
function ovInfoEdit(which){
  if(typeof toast === 'function')
    toast(`${which} info is edited in the property record`);
}
/* Templates are their own thing elsewhere in the product — the name is the
   way to it, so it is a link rather than a line of text that happens to name
   one. No destination in the prototype. */
function ovOpenTemplate(name){
  if(typeof toast === 'function') toast(`Opening ${name}`);
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
    .filter(r => r.v)
    /* Market is the one property fact that is a thing of its own rather than a
       measurement, so both halves of the row go to it — the label and the
       name, the way the property page does it. */
    .map(r => r.k !== 'Market' ? r : {k:r.k, v:r.v, klink:true, html:
      `<a class="ov-field-link" href="#" onclick="event.preventDefault();ovMarketOpen()"
        >${esc(MARKET.name || r.v)}</a>`});
}

/* ── the activity feed, on a switch ──────────────────────────────────
   Whether the Overview carries a history at all is still being decided, so
   the shell's demo panel holds a toggle for it and this is the flag it sets.
   Default off: the tab reads as the job's facts without it. */
/* index-activity.html sets this on the host page and the shell passes it into
   the panel. It restores one kind of row the tab dropped: the change-order
   counts — "5 groups · 7 tasks changed in Change Order 2". The capture counts
   it used to carry as well are gone outright; they measured how much was
   recorded rather than what happened to the work. */
const OV_FULL = (typeof window !== 'undefined') && !!window.__KAI_ACTIVITY_FULL;
/* index-activity.html keeps the Activity as it read before the timeline: one
   sentence per row that names its own subject — "T. Okafor approved Change
   Order 1" — rather than a grid of columns. Both renderers are live; this
   chooses between them, and index.html leaves it unset so it gets the
   timeline. The two answer different questions: a sentence reads as a story,
   a column reads as a comparison, and the page that exists to compare the
   full feed against the pared one wants the first. */
const OV_SENTENCES = (typeof window !== 'undefined') && !!window.__KAI_ACTIVITY_SENTENCES;
function renderOverview(){
  const body = document.getElementById('workBody');
  if(!body) return;
  // Idempotent — binds once, on the first render that puts links on screen.
  if(typeof _ovHoverBind === 'function') _ovHoverBind();
  if(typeof _ovHoverHide === 'function') _ovHoverHide();
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
    ${_ovStat('Job end', S.endDate)}
    ${_ovStat('Notes', String(notes.length), "openScopeDrawer('notes')")}
    ${_ovStat('Photos', String(photoCount), "openScopeDrawer('photos')")}
  </div>`;

  /* Getting in, folded into the property module rather than standing beside
     it. It is the same errand as the fields above — what this place is and
     how you get into it — and as its own module it was a framed box holding
     one line, drawing more attention than a set of codes read once a project
     deserves.

     Shut it is the title and nothing else. The codes were on the bar until
     now; they are behind the click with the note, because two people in ten
     open this at all and the row above it is the property, not the visit. */
  const accessDetail = `
    <div class="ov-access">
      <button type="button" class="ov-access-bar" aria-expanded="${_ovAccessOpen}"
              aria-controls="ovAccessBody" onclick="ovAccessToggle(this)">
        <span class="ov-sec-h">Getting in</span>
        <span class="ov-access-cta">
          <span class="ov-access-cta-t">${_ovAccessOpen ? 'Hide access info' : 'See access info'}</span>
          <svg class="ov-access-car" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5l3 3 3-3"/></svg>
        </span>
      </button>
      <div class="ov-access-body" id="ovAccessBody"${_ovAccessOpen ? '' : ' hidden'}>
        <div class="ov-access-codes">
          ${S.access.map(a => `<span class="ov-acc-pair"><span class="ov-acc-k">${esc(a.k)}</span
            ><span class="ov-acc-v">${esc(a.v)}</span></span>`).join('')}
        </div>
        <div class="ov-access-note">
          <span class="ov-code-k">On arrival</span>
          ${S.dispatch ? `<p class="ov-dispatch">${esc(S.dispatch)}</p>`
                       : `<p class="ov-empty">Nothing for the crew yet.</p>`}
        </div>
      </div>
    </div>`;

  /* Property info stays its own block — it answers a different question (what
     the building is, not who is running the job). Job info does not: it folds
     into the head, under the figures, because every field left in it is about
     the same thing the head already names.

     Three fields came out on the way in. Job name repeated the title directly
     above it; Job type is the TURN chip on that title's line; General
     contractor is the subject of the whole Contractor assignments block below.
     Each was a second place to read something already on the page — tolerable
     while this was a separate section, not once it sits inches from the
     original. */
  const _editBtn = which =>
    `<button type="button" class="ov-sec-edit" onclick="ovInfoEdit('${which}')">Edit</button>`;
  const _tplName = S.template.name;
  const jobFields = `<div class="ov-head-fields">
    ${_ovFieldsHtml([
      {k:'Job ID',       v:S.projectId},
      {k:'Job manager',  v:people.manager},
      {k:'Field agent',  v:people.agent},
      {k:'Template',     cls:'is-tpl', html:`<a class="ov-field-link" href="#"
          onclick="event.preventDefault();ovOpenTemplate('${esc(_tplName).replace(/'/g, "\\'")}')"
          >${esc(_tplName)}</a>`},
      {k:'Last updated', v:S.updated},
    ])}
    ${_editBtn('Job')}
  </div>`;
  const propSec = _ovSec('Property info',
    _ovFieldsHtml(_ovPropFields()) + accessDetail, 'ov-job ov-prop', _editBtn('Property'));

  /* Part of the tab. It was behind a demo switch while it was being decided
     whether the Overview carried a feed at all; it does, so the switch is
     gone and this is built on every render like everything above it. */
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
          <!-- No eyebrow: the id and the project type are both fields in the
               block directly below, and the title's job is the address. -->
          <h2>${esc(S.address)}</h2>
          <div class="ov-head-sub">${esc(S.city)}</div>
        </div>
        ${_ovStandingHtml()}
      </header>
      ${stats}
      </div>
      ${jobFields}
    </section>
    ${propSec}${_ovCrewHtml()}${trailSec}
  </div>`;
}

/* ── hover preview for the task and group links ──────────────────────
   The activity list names work by code and label — "KIT-79B1 Cabinets" —
   which is enough to find it again and not enough to recognise it. Opening
   the task to remember what it is costs the place you were reading. So the
   name carries a preview: the last photo of it, what the scope says it is,
   and what was specified. A peek, not a destination — the click still goes
   to the Editor.

   One card, built once and moved, rather than one per link: there are
   thirty-odd links in an expanded trail and only ever one pointed at. */
let _ovHoverEl = null, _ovHoverTimer = null, _ovHoverFor = null;

/* Latest first, by the date of the walk the shot belongs to. An uploaded
   photo has no walk, so it sorts last rather than throwing the order off. */
function _ovLatestPhoto(match){
  if(typeof seedPhotos === 'function' && (typeof PHOTOS === 'undefined' || !PHOTOS.length)) seedPhotos();
  const all = (typeof PHOTOS !== 'undefined') ? PHOTOS : [];
  const when = p => {
    const w = (p.walk && typeof walkFor === 'function') ? walkFor(p.walk) : null;
    return w ? (Date.parse(w.date) || 0) : 0;
  };
  return all.filter(match).sort((a, b) => when(b) - when(a))[0] || null;
}
/* What the card says about one link. Tasks and groups are different things,
   so they answer different questions — a group has no description or
   product, and saying so with two empty rows would be worse than not
   asking. */
function _ovHoverData(el){
  const prod = el.getAttribute('data-hv-product') || '';
  if(prod){
    const code = el.getAttribute('data-hv-code') || '';
    const room = el.getAttribute('data-hv-room') || '';
    let t = null;
    if(typeof SCOPE !== 'undefined'){
      SCOPE.forEach(g => g.tasks.forEach(x => { if(x.code === code) t = x; }));
    }
    return {kind:'product', title:prod, code, room,
            /* The scope note is what the job says about this product — there
               is no catalogue copy behind these, and inventing some would be
               describing a thing rather than reporting it. */
            desc: t ? (t.desc || '') : '',
            qty: t ? (t.qty || '') : '', amount: t ? (t.amount || '') : '',
            gc: t ? (t.gc || '') : ''};
  }
  /* A document's preview answers a different question than a task's: not
     "which one is this" but "what did it do" — what it is worth, what it
     moved, and where it got to. */
  const doc = el.getAttribute('data-hv-doc') || '';
  if(doc){
    const d = (_ovTrail() || []).find(x => x.name === doc);
    if(!d) return null;
    const changed = d.evs.find(e => e.detail);
    const groups = changed ? changed.detail : [];
    return {kind:'doc', title:d.name, state:d.state, amount:d.amount, was:d.was,
            /* The names, not the tally — the same reason the feed stopped
               carrying the count, and restored on the same flag. */
            meta: (OV_FULL && groups.length)
              ? `${groups.length} group${groups.length === 1 ? '' : 's'} \u00b7 `
                + `${groups.reduce((k, g) => k + g.tasks.length, 0)} tasks changed`
              : '',
            tasks: groups.flatMap(g => g.tasks.map(t => t.name)).slice(0, 4),
            /* People-events only: the change-count row is already summarised
               two lines above as "5 groups · 7 tasks changed", and with no
               name on it the mini list rendered a blank where a person goes. */
            evs: d.evs.filter(e => e.who).slice(0, 3).map(e => ({
              who: e.who || '',
              what: e.verb ? `${e.verb}${e.to ? ' to ' + e.to : ''}` : e.act,
              when: e.when
            }))};
  }
  const code = el.getAttribute('data-hv-code') || '';
  const room = el.getAttribute('data-hv-room') || '';
  const name = el.getAttribute('data-hv-name') || '';
  const all  = (typeof TASKS !== 'undefined') ? TASKS : [];
  if(code || name){
    const t = all.find(x => x.code === code)
           || all.find(x => name && String(x.name).toLowerCase() === String(name).toLowerCase());
    if(t){
      /* A task with no photo of its own falls back to its room's — the group
         shot is still a picture of where the work is. */
      const photo = _ovLatestPhoto(p => p.kind === 'task' && p.task === t.code)
                 || _ovLatestPhoto(p => p.room === t.room && p.kind === 'group');
      return {kind:'task', photo, code:t.code, title:t.name, room:t.room,
              desc:t.desc || '', product:t.product || '',
              cost:t.cost || ''};
    }
  }
  if(room){
    const items = all.filter(x => x.room === room);
    const photo = _ovLatestPhoto(p => p.room === room && p.kind === 'group')
               || _ovLatestPhoto(p => p.room === room);
    const total = items.reduce((n, x) => n + (_ovMoney(x.cost) || 0), 0);
    return {kind:'group', photo, title:room,
            meta:[`${items.length} task${items.length === 1 ? '' : 's'}`,
                  total ? _fmtDollars(total) : ''].filter(Boolean).join('  ·  '),
            tasks:items.slice(0, 4).map(x => x.name)};
  }
  return null;
}
/* "$10,078" → 10078. The scope keeps money as formatted strings. */
function _ovMoney(s){
  const n = parseFloat(String(s == null ? '' : s).replace(/[^0-9.\-]/g, ''));
  return isNaN(n) ? 0 : n;
}
function _ovHoverHtml(d){
  /* The fill is assigned as a property after the card is in the DOM, not
     written into a style attribute: _photoBg returns url("…") with double
     quotes, which closes the attribute early and drops the image. */
  const row = (lbl, val, cls) => val
    ? `<div class="ov-hv-row"><span class="ov-hv-lbl">${lbl}</span
       ><span class="ov-hv-val${cls ? ' ' + cls : ''}">${esc(val)}</span></div>`
    : '';
  const shot = d.photo
    ? `<div class="ov-hv-img"></div>`
    : `<div class="ov-hv-img is-none">No photo yet</div>`;
  if(d.kind === 'doc'){
    const _dl = _ovDelta(d);
    const money = d.amount
      ? `<span class="ov-hv-money"${_dl ? ` title="${esc(_dl.title)}"` : ''}>${
          _dl ? `<i class="ov-hv-delta ${_dl.cls}">${esc(_dl.text)}</i>` : ''
        }<b>${esc(d.amount)}</b></span>`
      : '';
    return `<div class="ov-hv-body">
        <div class="ov-hv-kind">Document${d.state ? ` \u00b7 ${esc(d.state)}` : ''}</div>
        <div class="ov-hv-title">${esc(d.title)}</div>
        ${money}
        ${d.meta ? `<div class="ov-hv-meta">${esc(d.meta)}</div>` : ''}
        ${d.tasks.length ? `<div class="ov-hv-list">${d.tasks.map(n => esc(n)).join(' \u00b7 ')}</div>` : ''}
        ${d.evs.length ? `<ul class="ov-hv-evs">${d.evs.map(e => `<li><b>${esc(e.who)}</b> ${esc(e.what)}
          <span>${esc(e.when)}</span></li>`).join('')}</ul>` : ''}
      </div>`;
  }
  if(d.kind === 'product'){
    return `<div class="ov-hv-img is-prod" aria-hidden="true"></div>
      <div class="ov-hv-body">
        <div class="ov-hv-kind">Product${d.room ? ` \u00b7 ${esc(d.room)}` : ''}</div>
        <div class="ov-hv-title">${esc(d.title)}</div>
        ${d.desc ? `<p class="ov-hv-desc">${esc(d.desc)}</p>` : ''}
        ${row('Quantity', d.qty)}
        ${row('Contractor', d.gc)}
        ${row('Amount', d.amount, 'is-amt')}
      </div>`;
  }
  if(d.kind === 'group'){
    return `${shot}
      <div class="ov-hv-body">
        <div class="ov-hv-kind">Group</div>
        <div class="ov-hv-title">${esc(d.title)}</div>
        <div class="ov-hv-meta">${esc(d.meta)}</div>
        ${d.tasks.length ? `<div class="ov-hv-list">${d.tasks.map(n => esc(n)).join(' · ')}</div>` : ''}
      </div>`;
  }
  return `${shot}
    <div class="ov-hv-body">
      <div class="ov-hv-kind">${esc(d.code)}${d.room ? ` · ${esc(d.room)}` : ''}</div>
      <div class="ov-hv-title">${esc(d.title)}</div>
      ${d.desc ? `<p class="ov-hv-desc">${esc(d.desc)}</p>` : ''}
      ${row('Product', d.product)}
      ${row('Amount', d.cost, 'is-amt')}
    </div>`;
}
/* Fixed to the viewport, beside the link and flipped to whichever side has
   room. The trail scrolls inside a pane, so anything anchored to the page
   would drift away from the thing it describes. */
function _ovHoverPlace(el){
  const card = _ovHoverEl, r = el.getBoundingClientRect();
  const w = card.offsetWidth, h = card.offsetHeight, pad = 10;
  let top = r.bottom + 8;
  if(top + h > window.innerHeight - pad) top = Math.max(pad, r.top - h - 8);
  let left = r.left;
  if(left + w > window.innerWidth - pad) left = Math.max(pad, window.innerWidth - w - pad);
  card.style.top = top + 'px';
  card.style.left = left + 'px';
}
function _ovHoverShow(el){
  const d = _ovHoverData(el);
  if(!d) return;
  if(!_ovHoverEl){
    _ovHoverEl = document.createElement('div');
    _ovHoverEl.className = 'ov-hv';
    _ovHoverEl.setAttribute('role', 'tooltip');
    document.body.appendChild(_ovHoverEl);
  }
  _ovHoverFor = el;
  _ovHoverEl.innerHTML = _ovHoverHtml(d);
  const img = (d.photo && d.kind !== 'product') ? _ovHoverEl.querySelector('.ov-hv-img') : null;
  /* A real photograph when there is one; otherwise a flat neutral rather than
     _progPhotoBg's drawn interior. Those blocks read as a picture of the room
     at a glance — a wall, a floor, a cabinet edge — which is a claim about
     what the task looks like that the prototype has no basis for. A plain
     field says "image goes here" and says nothing else. */
  if(img) img.style.background = d.photo.src
    ? `url('${d.photo.src}') center/cover no-repeat`
    : 'var(--stroke)';
  _ovHoverEl.classList.add('is-on');
  _ovHoverPlace(el);
}
function _ovHoverHide(){
  clearTimeout(_ovHoverTimer);
  _ovHoverFor = null;
  if(_ovHoverEl) _ovHoverEl.classList.remove('is-on');
}
/* Delegated, because renderOverview replaces the whole tab on every state
   change and per-element listeners would go with it. */
function _ovHoverBind(){
  if(document.body.dataset.ovHoverBound) return;
  document.body.dataset.ovHoverBound = '1';
  const hit = e => e.target && e.target.closest
    ? e.target.closest('.ov-ch-task, .ov-ch-grp, .ov-tr-doc-n, [data-hv-product], .reg-task-name') : null;
  document.addEventListener('mouseover', e => {
    const el = hit(e);
    if(!el || el === _ovHoverFor) return;
    clearTimeout(_ovHoverTimer);
    _ovHoverTimer = setTimeout(() => _ovHoverShow(el), 140);
  });
  document.addEventListener('mouseout', e => {
    const el = hit(e);
    if(el && el === _ovHoverFor) _ovHoverHide();
    else if(el) clearTimeout(_ovHoverTimer);
  });
  // Keyboard reaches these links too, so the preview has to follow focus.
  document.addEventListener('focusin', e => { const el = hit(e); if(el) _ovHoverShow(el); });
  document.addEventListener('focusout', e => { if(hit(e)) _ovHoverHide(); });
  // Anything that moves the link out from under the card retires it.
  document.addEventListener('scroll', _ovHoverHide, true);
  document.addEventListener('click', _ovHoverHide, true);
  window.addEventListener('resize', _ovHoverHide);
  document.addEventListener('keydown', e => { if(e.key === 'Escape') _ovHoverHide(); });
}

/* ── the market, from the side ───────────────────────────────────────
   The property page has this drawer; the Overview tab's Market field goes to
   the same place, so it has the same one. Built here rather than in the
   panel's markup because it is the only thing that opens it, and a second
   permanent drawer in panel-doc.js would sit in every page that loads the
   panel whether or not it has a market to show.

   It reuses the panel's own drawer chrome — #drawer's shell, head and close —
   rather than inventing a second one; only the fields inside are new. The
   task drawer keeps its element, since openDrawer() owns that one's state. */
const MARKET = (typeof OVERVIEW_SEED !== 'undefined' && OVERVIEW_SEED.market) || {};
/* Rosters the pickers draw from. Read off the data the rest of the prototype
   already uses, so the names in here are names that appear elsewhere. */
function _mktRoster(key){
  if(key === 'contractors') return (typeof CONTRACTORS !== 'undefined') ? CONTRACTORS : [];
  const people = (typeof REVIEWERS !== 'undefined') ? REVIEWERS.map(r => r.who) : [];
  const agents = (typeof PHOTO_PEOPLE !== 'undefined') ? PHOTO_PEOPLE.map(p => p.who) : [];
  const all = [...new Set([...people, ...agents])];
  return key === 'managers'
    ? all.filter(n => (REVIEWERS || []).some(r => r.who === n && /manager/i.test(r.role)))
        .concat(all).filter((n, i, a) => a.indexOf(n) === i)
    : all;
}
const _MKT_FIELDS = [
  {key:'managers',    label:'Job managers',  add:'Add a manager'},
  {key:'contractors', label:'Contractors',   add:'Add a contractor'},
  {key:'users',       label:'Users',         add:'Add a user'}
];
function _mktChipsHtml(key){
  return (MARKET[key] || []).map(v => `<span class="mkt-chip">${esc(v)}
    <button type="button" onclick="ovMarketDrop('${esc(key)}','${esc(v).replace(/'/g, "\\'")}')"
      aria-label="Remove ${esc(v)}"><svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 3l6 6M9 3l-6 6"/></svg></button>
  </span>`).join('');
}
function _mktPickerHtml(f){
  const taken = MARKET[f.key] || [];
  const opts = _mktRoster(f.key).filter(n => taken.indexOf(n) < 0)
    .map(n => `<option>${esc(n)}</option>`).join('');
  return `<div class="mkt-f">
    <label for="mkt-${f.key}">${esc(f.label)} <span class="opt">optional</span></label>
    <select id="mkt-${f.key}" onchange="ovMarketAdd('${f.key}', this)">
      <option value="">${esc(f.add)}&hellip;</option>${opts}
    </select>
    <div class="mkt-chips" id="mktChips-${f.key}">${_mktChipsHtml(f.key)}</div>
  </div>`;
}
function _mktBodyHtml(){
  const tpl = ['ATL Metro Turn Template 01:09:26', 'ATL Acquisition Inspection 04:22:26',
               'Maintenance — Standard'];
  return `<div class="mkt-sec">
      <div class="mkt-f">
        <label for="mkt-name">Name</label>
        <input id="mkt-name" value="${esc(MARKET.name || '')}">
      </div>
      <div class="mkt-f">
        <label for="mkt-zip">Zip codes</label>
        <input id="mkt-zip" inputmode="numeric" placeholder="Type a zip code, then Enter"
               onkeydown="ovMarketZip(event)">
        <div class="mkt-chips" id="mktChips-zips">${_mktChipsHtml('zips')}</div>
      </div>
    </div>
    <div class="mkt-sec">
      <div class="mkt-sec-h">Defaults for new jobs</div>
      <div class="mkt-f">
        <label for="mkt-template">Job template <span class="opt">optional</span></label>
        <select id="mkt-template">
          <option value="">No template</option>
          ${tpl.map(t => `<option${t === MARKET.template ? ' selected' : ''}>${esc(t)}</option>`).join('')}
        </select>
      </div>
      ${_mktPickerHtml(_MKT_FIELDS[0])}
    </div>
    <div class="mkt-sec">
      <div class="mkt-sec-h">Who works here</div>
      ${_mktPickerHtml(_MKT_FIELDS[1])}
      ${_mktPickerHtml(_MKT_FIELDS[2])}
    </div>`;
}
let _mktEl = null, _mktScrim = null;
function ovMarketOpen(){
  if(!_mktEl){
    _mktScrim = document.createElement('div');
    _mktScrim.id = 'mkt-scrim';
    _mktScrim.onclick = ovMarketClose;
    _mktEl = document.createElement('aside');
    _mktEl.id = 'mkt-drawer';
    _mktEl.setAttribute('role', 'dialog');
    _mktEl.setAttribute('aria-modal', 'true');
    _mktEl.setAttribute('aria-label', 'Market');
    document.body.appendChild(_mktScrim);
    document.body.appendChild(_mktEl);
    document.addEventListener('keydown', e => {
      if(e.key === 'Escape' && _mktEl && _mktEl.classList.contains('open')) ovMarketClose();
    });
  }
  _mktEl.innerHTML = `<div class="dw-head"><div class="dw-top">
      <div>
        <div class="dw-task">Market</div>
        <div class="dw-title" id="mktTitle">${esc(MARKET.name || '')}</div>
      </div>
      <button class="dw-close" onclick="ovMarketClose()" aria-label="Close"><svg viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" stroke-linecap="round"/></svg></button>
    </div></div>
    <div class="dw-body mkt-body">${_mktBodyHtml()}</div>
    <div class="mkt-acts">
      <button class="mkt-btn" type="button" onclick="ovMarketClose()">Cancel</button>
      <button class="mkt-btn is-primary" type="button" onclick="ovMarketSave()">Update market</button>
    </div>`;
  /* Reflow, then open, both synchronously. Deferring the class to a frame
     later meant the first click after the drawer is built could land before
     that frame ran and leave it closed with its content already in it — the
     second click worked, which is the worst kind of bug to meet first.
     Reading offsetWidth gives the transition a start it can animate from,
     which is the only thing the frame was there for. */
  void _mktEl.offsetWidth;
  _mktScrim.classList.add('open');
  _mktEl.classList.add('open');
  const n = document.getElementById('mkt-name');
  if(n) n.focus();
}
function ovMarketClose(){
  if(!_mktEl) return;
  _mktEl.classList.remove('open');
  _mktScrim.classList.remove('open');
}
/* Only the field that changed is redrawn — rebuilding the whole body would
   throw away whatever is half-typed in the name. */
function _mktSync(key){
  const box = document.getElementById('mktChips-' + key);
  if(box) box.innerHTML = _mktChipsHtml(key);
  const sel = document.getElementById('mkt-' + key);
  const f = _MKT_FIELDS.find(x => x.key === key);
  if(sel && f){
    const taken = MARKET[key] || [];
    sel.innerHTML = `<option value="">${esc(f.add)}&hellip;</option>`
      + _mktRoster(key).filter(n => taken.indexOf(n) < 0)
          .map(n => `<option>${esc(n)}</option>`).join('');
  }
}
function ovMarketAdd(key, sel){
  if(sel.value && (MARKET[key] || []).indexOf(sel.value) < 0) MARKET[key].push(sel.value);
  _mktSync(key);
}
function ovMarketDrop(key, v){
  MARKET[key] = (MARKET[key] || []).filter(x => x !== v);
  _mktSync(key);
}
/* Zip codes have no roster, so they are typed. Enter commits, and so does a
   comma — that is how anyone pastes a list of them. */
function ovMarketZip(e){
  if(e.key !== 'Enter' && e.key !== ',') return;
  e.preventDefault();
  const v = e.target.value.trim().replace(/,$/, '');
  if(/^\d{5}$/.test(v) && MARKET.zips.indexOf(v) < 0) MARKET.zips.push(v);
  e.target.value = '';
  _mktSync('zips');
}
function ovMarketSave(){
  const el = document.getElementById('mkt-name');
  const name = (el && el.value.trim()) || MARKET.name;
  MARKET.name = name;
  const tpl = document.getElementById('mkt-template');
  if(tpl) MARKET.template = tpl.value;
  /* The Market field reads MARKET.name, so the tab has to repaint for the
     rename to show. */
  if(typeof renderOverview === 'function' && typeof workMode !== 'undefined'
     && workMode === 'overview') renderOverview();
  if(typeof toast === 'function') toast(`${name} updated`);
  ovMarketClose();
}
