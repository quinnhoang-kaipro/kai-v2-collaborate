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
// Scope search. Unlike activeFilters this never touches what the sidebar
// shows — the query lives only in the floating palette the Search button
// opens, and picking a result navigates instead of narrowing. See the
// SCOPE SEARCH block below for why.
let sbQuery = '';
let sbSearchOpen = false;
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
  // A price moved through its options' line items — no flat field differs,
  // but the total does.
  if(typeof taskDelta === 'function' && Math.round(taskDelta(t))) return true;
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
/* One tag for every change after approval — a removal, a new task, an edit —
   whether the change order is still a draft or waiting on approval. What
   kind of change it is goes in the tooltip. */
function _coPillHtml(t){
  const open = taskHasOpenChangeOrder(t);
  if(!open && !(window.__KAI_SHOP && taskHasDraftChangeOrder(t))) return '';
  const why = coReasonFor(t);
  return `<span class="co-pill" title="${esc(why)} after approval — ${open ? 'waiting on approval' : 'change order in draft'}">${window.__KAI_SHOP ? 'Change' : 'Change order'}</span>`;
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
  //
  // Grouped by department the sidebar nests tasks under product lines, so
  // the order has to be line first and state within it; otherwise Prev /
  // Next in the Editor would hop between lines the sidebar shows apart.
  if(groupBy === 'dept'){
    return _groupTasksRaw(tasks).map(g => ({...g,
      items: deptLines(g.items).flatMap(l => _pgdSortTasksForGroup(l.items))}));
  }
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
  if(groupBy==='dept'){
    // Store order, not alphabetical — the same aisle sequence every time,
    // so a department sits in the same place whichever scope you open.
    return DEPARTMENTS.concat(NO_PRODUCT_DEPT)
      .map(d=>({key:d, name:d, pinned:false, items:tasks.filter(t=>taskDept(t)===d)}))
      .filter(g=>g.items.length);
  }
  const un=tasks.filter(t=>!t.gc);
  const gcs=[...new Set(tasks.filter(t=>t.gc).map(t=>t.gc))].sort();
  const groups=[];
  if(un.length) groups.push({key:'__un',name:'Unassigned',pinned:true,items:un});
  gcs.forEach(g=>groups.push({key:g,name:g,pinned:false,items:tasks.filter(t=>t.gc===g)}));
  return groups;
}

/* ════════════ DEPARTMENTS ════════════ */
/* The third way to slice a scope, for the person shopping it. Group says
   where in the property a task is and Contractor says who does it; Department
   says what has to be bought for it and where that sits in the catalogue,
   modelled on Lowe's department list.

   Two levels: department, then product line inside it — Bathroom › Toilets,
   Flooring › Carpet. A line gathers every task in the scope that needs that
   kind of product, whichever room it's in, so one product can be picked once
   and applied to all of them (one toilet model for both bathrooms). Rooms
   drop to the third level, as context on each task.

   A task's line is read from its name, option and product together, against
   the rules below in order — the first match wins, so specific rules sit
   above broad ones (a vanity's "undermount sinks" mustn't make it a sink).
   Someone can pin the department with t.dept; the line is then the first
   rule in that department that matches, or that department's catch-all.

   Tasks with nothing to buy — labour only, or the resident supplies the
   product — go to their own group at the bottom. In a shopping view they
   are noise, and in a catalogue department they'd be wrong. */
const DEPARTMENTS = [
  'Appliances',
  'Building Supplies & Lumber',
  'Bathroom',
  'Electrical',
  'Flooring',
  'Hardware',
  'Heating & Cooling',
  'Home Decor & Furniture',
  'Kitchen',
  'Lawn, Garden & Outdoor',
  'Lighting & Ceiling Fans',
  'Moulding & Millwork',
  'Paint',
  'Plumbing',
  'Smart Home & Security',
  'Storage & Organization',
  'Tools',
  'Windows & Doors',
  'Other',
];
const NO_PRODUCT_DEPT = 'No products needed';
const _LABOR_ONLY = /powerwash|pressure wash|haul away|haul-away|\bcutout\b|resident supplied|resident install|labor only|labour only/;
// [department, product line, pattern]
const _PRODUCT_LINES = [
  // Ahead of smart home: a "smart" garage door opener is still an opener.
  ['Windows & Doors',           'Garage door openers',        /door opener|garage door/],
  ['Smart Home & Security',     'Smart home hubs',            /\bsmart\b|wi-?fi|\bhub\b/],
  ['Smart Home & Security',     'Cameras & alarms',           /camera|alarm|security|doorbell/],
  ['Electrical',                'Smoke & CO detectors',       /smoke|detector/],
  ['Appliances',                'Range hoods',                /range hood|hood vent/],
  ['Appliances',                'Appliance suites',           /appliance|stainless suite/],
  ['Appliances',                'Refrigerators',              /refrigerator|fridge/],
  ['Appliances',                'Dishwashers',                /dishwasher/],
  ['Appliances',                'Washers & dryers',           /washer|dryer/],
  ['Bathroom',                  'Vanities',                   /vanity/],
  ['Bathroom',                  'Toilets',                    /toilet/],
  ['Bathroom',                  'Shower doors',               /shower door|glass door/],
  ['Bathroom',                  'Tubs',                       /\btub\b|bathtub/],
  ['Bathroom',                  'Mirrors',                    /mirror/],
  ['Heating & Cooling',         'Exhaust fans',               /exhaust fan/],
  ['Heating & Cooling',         'Thermostats',                /thermostat/],
  ['Heating & Cooling',         'HVAC equipment',             /hvac|furnace|heat pump|air condition/],
  ['Lighting & Ceiling Fans',   'Ceiling fans',               /ceiling fan/],
  ['Lighting & Ceiling Fans',   'Light fixtures',             /lighting|light fixture|pendant|sconce|recessed|chandelier|\blamp/],
  ['Kitchen',                   'Cabinets',                   /cabinet/],
  ['Kitchen',                   'Countertops',                /countertop|\bcounter\b|quartz|butcher block/],
  ['Kitchen',                   'Sinks & faucets',            /\bsinks?\b|faucet/],
  ['Kitchen',                   'Cabinet organizers',         /drawer insert|pull-out/],
  ['Hardware',                  'Cabinet hinges',             /hinge/],
  ['Hardware',                  'Door knobs & locks',         /knob|lever|\block|deadbolt|door hardware/],
  ['Flooring',                  'Tile',                       /\btiles?\b|backsplash|porcelain|ceramic/],
  ['Flooring',                  'Vinyl plank (LVP)',          /\blvp\b|vinyl plank|luxury vinyl/],
  ['Flooring',                  'Carpet',                     /carpet/],
  ['Flooring',                  'Hardwood',                   /hardwood/],
  ['Flooring',                  'Laminate',                   /laminate/],
  ['Paint',                     'Interior paint',             /paint|primer|repaint/],
  ['Moulding & Millwork',       'Interior doors',             /interior door|door slab|prehung|bi-?fold/],
  ['Moulding & Millwork',       'Baseboard & trim',           /baseboard|\btrim\b|moulding|molding|casing/],
  ['Windows & Doors',           'Blinds & shades',            /blind|shade/],
  ['Windows & Doors',           'Windows',                    /window/],
  ['Windows & Doors',           'Exterior doors',             /storm door|exterior door|\bdoors?\b/],
  ['Home Decor & Furniture',    'Curtains & rugs',            /curtain|\brug\b|wall art/],
  ['Storage & Organization',    'Closet systems',             /closet|shelv|shelf|hanging rod/],
  ['Plumbing',                  'Water heaters',              /water heater/],
  ['Plumbing',                  'Pipes & fittings',           /plumb|pipe|filtration|sump/],
  ['Lawn, Garden & Outdoor',    'Outdoor',                    /lawn|garden|landscap|patio|deck|fence|mulch/],
  ['Building Supplies & Lumber','Drywall',                    /drywall/],
  ['Building Supplies & Lumber','Insulation',                 /insulation/],
  ['Building Supplies & Lumber','Lumber & framing',           /framing|plywood|lumber|\bstuds?\b/],
  ['Building Supplies & Lumber','Roofing',                    /roof/],
  ['Tools',                     'Tools',                      /\btools?\b|ladder|compressor/],
];
function _taskShopText(t){
  return [t.name, t.opt, t.product].map(s => String(s || '')).join(' · ').toLowerCase();
}
// {dept, line} for a task, ignoring anything pinned on it — what the
// Department field offers as its suggestion.
function suggestTaskLine(t){
  if(!t) return {dept:'Other', line:'Other items'};
  const txt = _taskShopText(t);
  if(_LABOR_ONLY.test(txt)) return {dept:NO_PRODUCT_DEPT, line:'Labor only'};
  for(const [dept, line, re] of _PRODUCT_LINES) if(re.test(txt)){
    // Lowe's shelves sinks under Kitchen, but a bathroom sink is bought in
    // the Bathroom aisle beside the vanity it drops into.
    if(line === 'Sinks & faucets' && /bath/i.test(t.room || '')) return {dept:'Bathroom', line};
    return {dept, line};
  }
  return {dept:'Other', line:'Other items'};
}
function taskLine(t){
  if(t && t.dept && DEPARTMENTS.includes(t.dept)){
    const sug = suggestTaskLine(t);
    if(sug.dept === t.dept) return sug;
    const txt = _taskShopText(t);
    const hit = _PRODUCT_LINES.find(([d, , re]) => d === t.dept && re.test(txt));
    return {dept:t.dept, line: hit ? hit[1] : `${t.dept} items`};
  }
  return suggestTaskLine(t);
}
function taskDept(t){ return taskLine(t).dept; }
function suggestTaskDept(t){ return suggestTaskLine(t).dept; }

/* A department's tasks gathered into product lines, in rule order so a line
   sits in the same place every time. Each line carries what the shopper
   scans for: how many are needed, what the products cost, and whether one
   product covers the lot. */
function deptLines(items){
  const order = new Map(_PRODUCT_LINES.map(([d, l], i) => [`${d}|${l}`, i]));
  const byKey = new Map();
  items.forEach(t => {
    const {dept, line} = taskLine(t);
    const key = `${dept}|${line}`;
    if(!byKey.has(key)) byKey.set(key, {key, dept, name:line, items:[]});
    byKey.get(key).items.push(t);
  });
  return [...byKey.values()].sort((a, b) =>
    (order.has(a.key) ? order.get(a.key) : 1e9) - (order.has(b.key) ? order.get(b.key) : 1e9));
}
/* "2 scoped" when every task counts in each, "410 SF" when they share a
   unit, and a plain task count when the units don't add up. */
function deptLineNeed(items){
  const parsed = items.map(t => {
    const m = String(t.qty || '').match(/^\s*([\d.,]+)\s*(.*)$/);
    if(!m) return null;
    let unit = m[2].trim().toLowerCase();
    if(unit === 'each' || unit === '') unit = 'ea';
    return {n: parseFloat(m[1].replace(/,/g, '')) || 0, unit};
  });
  if(parsed.some(p => !p) || new Set(parsed.map(p => p.unit)).size !== 1){
    return `${items.length} ${items.length === 1 ? 'task' : 'tasks'}`;
  }
  const n = Math.round(parsed.reduce((s, p) => s + p.n, 0) * 100) / 100;
  const unit = parsed[0].unit;
  if(unit === 'ea') return `${n} scoped`;
  if(unit === 'sf' || unit === 'lf') return `${n.toLocaleString('en-US')} ${unit.toUpperCase()}`;
  // Countable units read as words, so they take a plural: "2 rooms".
  return `${n.toLocaleString('en-US')} ${unit}${n === 1 || /s$/.test(unit) ? '' : 's'}`;
}
/* The key of the sidebar group a task sits in under the current grouping —
   one answer for every "which group is this in" question, so a third
   grouping doesn't mean a third branch at every call site. */
function taskGroupKey(t){
  if(groupBy === 'contractor') return t.gc || '__un';
  if(groupBy === 'dept')       return taskDept(t);
  return t.room;
}
function taskGroupLabel(t){
  if(groupBy === 'contractor') return t.gc || 'Unassigned';
  if(groupBy === 'dept')       return taskDept(t);
  return t.room || '—';
}
function groupKindNoun(){
  return groupBy === 'contractor' ? 'contractor' : (groupBy === 'dept' ? 'department' : 'room');
}

/* ════════════ SCOPE SEARCH (floating palette) ════════════ */
/* Modelled on Jira's search: the Search button opens a panel floating over
   the work surface, results live IN that panel, and the panel goes away when
   you pick something or click off it. The sidebar is never filtered.

   The earlier version filtered the sidebar from an inline box, which left no
   honest moment to close: a still-narrowed scope list and an empty-looking
   box are the same picture, so the box had to stay open indefinitely. A
   palette has a natural end — you either take a result or you dismiss it. */

/* Every whitespace-separated word has to appear somewhere in the name, so
   "kitchen light" finds "Kitchen and Dining Lighting" without the user
   having to type the phrase exactly. */
function _sbQueryTerms(){
  const q = (sbQuery || '').trim().toLowerCase();
  return q ? q.split(/\s+/) : [];
}
function _sbNameHit(name, terms){
  const s = (name || '').toLowerCase();
  return terms.every(t => s.includes(t));
}
/* Bold the matched runs, the way Jira does. Walks the string once per term
   marking covered spans, so overlapping terms ("tile til") can't produce
   nested <b> tags — then escapes, because the marks are computed on indices
   of the raw string and have to survive escaping intact. */
function _sbMark(name, terms){
  const src = String(name || '');
  if(!terms.length) return esc(src);
  const lower = src.toLowerCase();
  const hit = new Array(src.length).fill(false);
  terms.forEach(t => {
    let i = lower.indexOf(t);
    while(i !== -1){
      for(let k = i; k < i + t.length; k++) hit[k] = true;
      i = lower.indexOf(t, i + 1);
    }
  });
  let out = '', run = '', on = false;
  const flush = () => { if(run) out += on ? `<b>${esc(run)}</b>` : esc(run); run = ''; };
  for(let i = 0; i < src.length; i++){
    if(hit[i] !== on){ flush(); on = hit[i]; }
    run += src[i];
  }
  flush();
  return out;
}

/* Groups before tasks — a group is the bigger target and the one a short
   query usually means. A matched group brings its tasks with it as child
   rows: "kitchen" means the kitchen, and its contents are the useful thing
   to show, so the user can jump straight to a task without a second search.
   Capped: past a couple of dozen rows the list stops being a shortcut.

   Searches the WHOLE scope, not visibleTasks() — an active filter must not
   decide what can be found. A search that silently inherited one would tell
   a user with a forgotten filter on that a task does not exist, and being
   wrong about that is worse than any tidiness gained. Picking a result the
   filters exclude drops them; see _sbqRevealForPick. */
const SBQ_LIMIT = 30;
function sbSearchResults(){
  const terms = _sbQueryTerms();
  if(!terms.length) return [];
  const groups = (typeof groupTasks === 'function') ? groupTasks(TASKS.slice()) : [];
  const out = [];
  const claimed = new Set();   // tasks already listed under their matched group
  groups.forEach(g => {
    if(!_sbNameHit(g.name, terms)) return;
    out.push({kind:'group', key:g.key, name:g.name, n:g.items.length,
              cost:g.items.reduce((a,t)=>a+dollars(t.cost),0)});
    g.items.forEach(t => {
      out.push({kind:'task', id:t.id, name:t.name, group:g.name, task:t, child:true});
      claimed.add(t.id);
    });
  });
  // Tasks matching on their own name. A task already shown under its group
  // is skipped — listing it twice would just pad the result.
  groups.forEach(g => {
    g.items.forEach(t => {
      if(claimed.has(t.id)) return;
      if(_sbNameHit(t.name, terms)) out.push({kind:'task', id:t.id, name:t.name, group:g.name, task:t});
    });
  });
  return out;
}

/* The template's tasks that are not in the scope yet, and so can be added
   from here. A task counts as in the scope when one in the same room carries
   its name. Nothing is offered once the scope is signed off — the same line
   the sidebar's "New task" draws. */
function _sbTemplateMisses(){
  if(typeof JOB_TEMPLATE === 'undefined') return [];
  if(typeof PROJ_MODE !== 'undefined' && PROJ_MODE === 'closeout-approved') return [];
  const key = (room, name) => `${String(room).toLowerCase()}|${String(name).toLowerCase()}`;
  const have = new Set(TASKS.map(t => key(t.room, t.name)));
  return JOB_TEMPLATE.tasks.filter(t => !have.has(key(t.room, t.name)));
}
/* Template results, after the scope's own. Matched on room and name
   together, so "kitchen" lists what the template still has for the kitchen
   and "kitchen paint" finds that one task. Capped on their own, so a broad
   query that fills the scope's share still shows what could be added. */
const SBQ_TPL_LIMIT = 8;
function sbTemplateResults(){
  const terms = _sbQueryTerms();
  if(!terms.length) return [];
  return _sbTemplateMisses()
    .filter(t => _sbNameHit(`${t.room} ${t.name}`, terms))
    .map(t => ({kind:'tpl', name:t.name, room:t.room, tpl:t}));
}

let _sbqRows = [];      // current results, index-aligned with the rendered rows
let _sbqActive = -1;    // keyboard cursor

function toggleSbSearch(open){
  const next = (open === undefined) ? !sbSearchOpen : !!open;
  if(next === sbSearchOpen){ if(next) _sbFocusSearch(); return; }
  sbSearchOpen = next;
  const pal = document.getElementById('sbq');
  const scrim = document.getElementById('sbqScrim');
  if(pal) pal.hidden = !sbSearchOpen;
  if(scrim) scrim.hidden = !sbSearchOpen;
  if(sbSearchOpen){
    _sbPositionPalette();
    renderSbResults();
    _sbFocusSearch();
  } else {
    // Dismissing is the end of the search — nothing about it survives.
    sbQuery = '';
    _sbqRows = []; _sbqActive = -1;
    const inp = document.getElementById('sbqInput');
    if(inp) inp.value = '';
  }
  if(typeof renderStateBar === 'function') renderStateBar();
}
function closeSbSearch(){ toggleSbSearch(false); }
function _sbFocusSearch(){
  requestAnimationFrame(()=>{
    const inp = document.getElementById('sbqInput');
    if(inp){ inp.focus(); inp.select(); }
  });
}
/* Anchored under the tools bar and aligned to the sidebar's left edge, so it
   reads as the scope's search while spilling over the work surface. Measured
   on open (and on resize) rather than positioned in CSS — the sidebar is
   user-resizable, so its edge isn't a constant. */
function _sbPositionPalette(){
  const pal = document.getElementById('sbq');
  const bar = document.getElementById('sbStateBar');
  if(!pal || !bar) return;
  const r = bar.getBoundingClientRect();
  const width = Math.min(620, window.innerWidth - 32);
  pal.style.top  = Math.round(r.bottom + 8) + 'px';
  pal.style.left = Math.round(Math.min(Math.max(16, r.left), window.innerWidth - width - 16)) + 'px';
  pal.style.width = width + 'px';
}
window.addEventListener('resize', () => { if(sbSearchOpen) _sbPositionPalette(); });

function setSbQuery(v){
  sbQuery = v || '';
  renderSbResults();
}
/* The × is always there, and always does the most useful thing available:
   empties a box with something in it, dismisses an empty one. A button that
   sits visible but inert in the empty state would be worse than no button,
   and a pure close-only × would make "clear and keep looking" a keyboard-only
   move. The tooltip says which of the two it currently is. */
function sbqClearOrClose(){
  if((sbQuery || '').trim()) clearSbQuery();
  else closeSbSearch();
}
function clearSbQuery(){
  const inp = document.getElementById('sbqInput');
  if(inp) inp.value = '';
  setSbQuery('');
  if(inp) inp.focus();
}
function renderSbResults(){
  const list = document.getElementById('sbqResults');
  const clr  = document.getElementById('sbqClear');
  if(clr){
    const label = (sbQuery || '').trim() ? 'Clear search' : 'Close search';
    clr.title = label;
    clr.setAttribute('aria-label', label);
  }
  if(!list) return;
  const terms = _sbQueryTerms();
  if(!terms.length){
    _sbqRows = []; _sbqActive = -1;
    list.innerHTML = '';   // :empty collapses the row — the placeholder says it
    return;
  }
  const all = sbSearchResults();
  const tpl = sbTemplateResults();
  const inScope = all.slice(0, SBQ_LIMIT);
  _sbqRows = inScope.concat(tpl.slice(0, SBQ_TPL_LIMIT));
  // Keep the first row armed so Enter always has an obvious target.
  _sbqActive = _sbqRows.length ? 0 : -1;
  if(!_sbqRows.length){
    list.innerHTML = `<div class="sbq-hint">No group or task named &ldquo;${esc(sbQuery.trim())}&rdquo;.</div>`;
    return;
  }
  const rows = _sbqRows.map((r,i) => r.kind === 'tpl'
    /* Not in the scope, so it has no price of its own yet; the right-hand
       column says what taking it does instead. A dashed box with a plus
       rather than the task icon, the same mark the sidebar's add rows use. */
    ? `${i === inScope.length ? `<div class="sbq-sec">Not in scope yet <span>· from ${esc(JOB_TEMPLATE.name)}</span></div>` : ''}
      <button class="sbq-row is-tpl${i===_sbqActive?' on':''}" data-i="${i}" onclick="sbqPick(${i})" onmousemove="sbqHover(${i})">
        <span class="sbq-ico is-add" aria-hidden="true"><svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M7 3.5v7M3.5 7h7"/></svg></span>
        <span class="sbq-txt"><span class="sbq-name">${_sbMark(r.name, terms)}</span><span class="sbq-sub">${esc(r.room)} · not in scope</span></span>
        <span class="sbq-add">Add task from template</span>
      </button>`
    : r.kind === 'group'
    ? `<button class="sbq-row${i===_sbqActive?' on':''}" data-i="${i}" onclick="sbqPick(${i})" onmousemove="sbqHover(${i})">
        <span class="sbq-ico" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="1.5" y="4.5" width="21" height="15"/><path d="M1.5 9.5h21"/></svg></span>
        <span class="sbq-txt"><span class="sbq-name">${_sbMark(r.name, terms)}</span><span class="sbq-sub">Group · ${r.n} ${r.n===1?'task':'tasks'}</span></span>
        <span class="sbq-amt">${money(r.cost)}</span>
      </button>`
    : `<button class="sbq-row${i===_sbqActive?' on':''}${r.child?' is-child':''}" data-i="${i}" onclick="sbqPick(${i})" onmousemove="sbqHover(${i})">
        ${r.child ? '' : `<span class="sbq-ico" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4.5 2.5h15v19h-15z"/><path d="M8 8h8M8 12h8M8 16h5"/></svg></span>`}
        <span class="sbq-txt"><span class="sbq-name">${_sbMark(r.name, terms)}</span>${r.child ? '' : `<span class="sbq-sub">${esc(r.group)}</span>`}</span>
        <span class="sbq-amt">${esc(r.task.cost || '')}</span>
      </button>`).join('');
  const hidden = (all.length + tpl.length) - _sbqRows.length;
  const more = hidden > 0
    ? `<div class="sbq-more">${hidden} more — keep typing to narrow</div>` : '';
  list.innerHTML = rows + more;
}
function sbqHover(i){
  if(i === _sbqActive) return;
  _sbqActive = i;
  _sbqPaintActive();
}
function _sbqPaintActive(){
  const list = document.getElementById('sbqResults');
  if(!list) return;
  list.querySelectorAll('.sbq-row').forEach(el => {
    el.classList.toggle('on', Number(el.dataset.i) === _sbqActive);
  });
  const el = list.querySelector('.sbq-row.on');
  if(el) el.scrollIntoView({block:'nearest'});
}
/* Search sees the whole scope, so a result can be something the sidebar is
   currently filtering out. Navigating to it would then select a task the
   scope list does not contain — the Editor showing one thing, the sidebar
   unable to show where it sits. Dropping the filters is the honest fix:
   the user asked to go here, so the list they land in has to contain it.
   Returns true when it cleared, so the caller can say so. */
function _sbqRevealForPick(r){
  if(typeof activeFilters === 'undefined' || !activeFilters.size) return false;
  const vis = new Set(visibleTasks().map(t => t.id));
  const g = r.kind === 'group'
    ? groupTasks(TASKS.slice()).find(x => x.key === r.key)
    : null;
  const needed = r.kind === 'group' ? (g ? g.items : []) : [r.task];
  // An empty matched group has nothing to hide, so the filters can stand.
  if(!needed.length || needed.every(t => vis.has(t.id))) return false;
  activeFilters.clear();   // the selection below repaints; no render needed here
  return true;
}
/* Taking a result closes the palette — that IS the moment the search is
   done, which is the whole reason for this shape. */
function sbqPick(i){
  const r = _sbqRows[i];
  if(!r) return;
  closeSbSearch();
  // A template task is not in the scope to go to; taking it adds it.
  if(r.kind === 'tpl'){
    if(typeof addTemplateTask === 'function') addTemplateTask(r.tpl);
    return;
  }
  const cleared = _sbqRevealForPick(r);
  if(r.kind === 'group'){
    if(typeof selectGroup === 'function') selectGroup(r.key);
  } else {
    if(typeof selectTask === 'function') selectTask(r.id, {toEditor:true});
  }
  if(cleared){
    // selectGroup doesn't run renderAll, so the Filters button would keep
    // showing a count for filters that are gone.
    if(typeof renderFilter === 'function') renderFilter();
    if(typeof renderStateBar === 'function') renderStateBar();
    if(typeof toast === 'function') toast('Filters cleared to show this result');
  }
}
function onSbSearchKey(e){
  if(e.key === 'Escape'){ e.stopPropagation(); closeSbSearch(); return; }
  if(e.key === 'ArrowDown' || e.key === 'ArrowUp'){
    if(!_sbqRows.length) return;
    e.preventDefault();
    const d = e.key === 'ArrowDown' ? 1 : -1;
    _sbqActive = (_sbqActive + d + _sbqRows.length) % _sbqRows.length;
    _sbqPaintActive();
    return;
  }
  if(e.key === 'Enter'){
    if(_sbqActive < 0) return;
    e.preventDefault();
    sbqPick(_sbqActive);
  }
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
  bar.className = 'sb-state-bar' + (IS_DRAFT_STAGE ? ' has-gear' : '');
  bar.hidden = false;
  // Group by toggle + Filter icon are always present — they're the scoping
  // controls for the sidebar and belong at the top of every state.
  /* Named for what each view is for: everything, by room (All), who is
     paid to do it (Labour, by contractor), what is bought for it
     (Materials, by department). The ids keep their old names. */
  const groupBySeg = `<div class="sb-tools-seg" role="tablist" aria-label="View scope by">
    <button id="grpRoom" class="${groupBy==='room'?'active':''}" onclick="setGroupBy('room')">All</button>
    <button id="grpContractor" class="${groupBy==='contractor'?'active':''}" onclick="setGroupBy('contractor')">Labor</button>
    <button id="grpDept" class="${groupBy==='dept'?'active':''}" onclick="setGroupBy('dept')">Materials</button>
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
  // Search trigger — sits with Filters because both narrow what the sidebar
  // shows. Rendered here rather than kept static like the input below it: a
  // button survives an innerHTML rewrite, an input mid-keystroke does not.
  const searchBtn = `<button class="sb-tools-search${sbSearchOpen?' active':''}" onclick="toggleSbSearch()" title="Search groups and tasks" aria-label="Search groups and tasks" aria-expanded="${sbSearchOpen?'true':'false'}">
    <svg viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="4.75" stroke="currentColor" stroke-width="1.5"/><path d="M10.6 10.6 14 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
    <span>Search</span>
  </button>`;
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
  // Hide scope gave way to Expand in the work surface's tab bar.
  bar.innerHTML = `${groupBySeg}${filterIcon}${searchBtn}<span class="sb-state-bar-sp"></span>${settingsIcon}${actions}`;
  _sbFitTools();
  // Remember for renderFilter, which fills the menu; reopening here
  // would show it before it has any options in it.
  _afReopenPending = _afOpen;
  // The rewrite above replaced #afMenu with an empty shell. Fill it now
  // rather than relying on the caller: toggleSbTools and switchVersion
  // call renderStateBar without a renderFilter after it.
  if(typeof renderFilter === 'function') renderFilter();
}
/* ── Do the tools still fit on one row? ─────────────────────────────────
   Asked of the layout rather than answered with a number. Every threshold
   guessed in advance was wrong: the bar's width is not the window's, the
   gear comes and goes with the stage, a container query measures the content
   box while the wrap point was measured on the border box, and the labels
   are set in whatever font actually loaded. So the labels go on, the row is
   measured, and they come off only if it broke — which is the rule as it was
   asked for, with nothing to keep in sync.

   Reading layout then writing one class, once per render: no loop, because
   the class changes the bar's height and the observer below watches the
   sidebar's width. */
function _sbFitTools(){
  const bar = document.getElementById('sbStateBar');
  if(!bar) return;
  bar.classList.remove('is-tight');
  const kids = [...bar.children].filter(e => {
    const r = e.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  });
  if(kids.length < 2) return;
  const top = Math.min(...kids.map(e => e.getBoundingClientRect().top));
  const wrapped = kids.some(e => e.getBoundingClientRect().top > top + 2);
  if(wrapped) bar.classList.add('is-tight');
}
/* The sidebar is dragged, not just laid out once, so the question has to be
   re-asked as it changes width — from more than one direction, because none
   of them alone is dependable. A ResizeObserver is delivered with the
   rendering steps, so a panel that is not being painted never hears from it;
   window resize catches the collapse and the window itself; and the drag
   writes flex-basis straight onto the sidebar, which fires neither, so it
   calls in from panel-init. */
let _sbFitRO = null;
function _sbWatchToolsFit(){
  if(_sbFitRO) return;
  const sb = document.querySelector('.sidebar');
  if(!sb) return;
  window.addEventListener('resize', _sbFitTools);
  if(typeof ResizeObserver !== 'undefined'){
    _sbFitRO = new ResizeObserver(() => _sbFitTools());
    _sbFitRO.observe(sb);
  } else {
    _sbFitRO = true;
  }
  _sbFitTools();
}
document.addEventListener('DOMContentLoaded', _sbWatchToolsFit);
/* Scripts load after the markup, so DOMContentLoaded may already be spent. */
if(document.readyState !== 'loading') _sbWatchToolsFit();

// State-bar button handlers.
function stateBarSubmitForReview(){
  // In change-order editing, submitting also ends the edit session — the
  // user is telling us "I'm done, send it". In draft, editing IS the mode,
  // so we just fire the same approveAll demo toast as before.
  const wasEditing = scopeEditMode;
  if(typeof approveAll === 'function') approveAll();
  if(wasEditing && !IS_DRAFT_STAGE && typeof enterEditMode === 'function'){
    enterEditMode(false);
    if(typeof toast === 'function') toast('Change order submitted for review');
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

