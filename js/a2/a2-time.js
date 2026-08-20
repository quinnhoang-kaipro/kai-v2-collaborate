/* ════════════════════════════════════════════════════════════════════
   ARTIFACT 2 · TIME MODEL · the playhead and everything derived from it
   Shared state the other modules read: where the playhead is, what the flat
   chronological change list looks like, and the as-of accessors that answer
   "what was this value at time T". Change this and every other module moves.

   Part of the Artifact 2 tab, split across js/a2/*.js. These are plain
   top-level declarations sharing one script scope, same as the rest of
   the panel — no IIFE, so any module can call any other.
   ════════════════════════════════════════════════════════════════════ */
/* ════════════ TIME MODEL ════════════
   Every change flattens into one chronological list (CO1 changes, then CO2).
   `timeT` is the playhead: 0 = original scope (nothing revealed), N = the
   present (everything revealed). A change is revealed once the playhead has
   passed it, so scrubbing forward accumulates redlines. */
let ORDERED = [];                       // flat, chronological list of changes
let VBOUNDS = [];                       // per-version [start,end) slice of ORDERED
let timeT = 0;                          // playhead position (0..ORDERED.length)
let CARDS = [];                         // {el, code, ch}
let SREFS = null;                       // cached scrubber nodes
let built = false;                      // has buildOrdered run
let selCode = null;                     // the selected line, or null
let tight = false;                      // compact type + gutter for a narrow panel
let SIZEW = null;                       // size-watch interval id
let lastW = 0;                          // last observed root width
const A2_TIGHT_UNDER = 1000;            // px of work-surface width below which we compact

function buildOrdered(){
  if(built) return;
  ORDERED = [];
  SCOPE.forEach(g => g.tasks.forEach(t => t.changes.forEach(ch => {
    ch._task = t; ch._room = g.room; ORDERED.push(ch);
  })));
  // Stable sort by version rank preserves document order within a version.
  ORDERED.sort((a,b) => VER[a.ver].rank - VER[b.ver].rank);
  ORDERED.forEach((ch,i) => { ch._ord = i; });
  buildBounds();
  timeT = ORDERED.length;   // open at the present — every change shown
  stampVersionBudgets();
  built = true;
}
/* ── which stretch of the timeline belongs to which version ───────────
   The Scope phase now carries changes of its own — the scope being built
   before it is first approved — so nothing can assume the run starts at
   Change Order 1. Each version owns the slice of ORDERED tagged with it,
   and `end` is the playhead position where that version is complete: the
   moment it was approved. Everything that used to count co1 changes by
   hand reads this instead. */
function buildBounds(){
  VBOUNDS = []; let m = 0;
  VER_ORDER.forEach(v=>{
    const k = ORDERED.filter(ch => ch.ver === v).length;
    VBOUNDS.push({ver:v, start:m, end:m + k});
    m += k;
  });
}
/* The playhead position at which `v` is fully applied — what its version
   card, its timeline band, and its budget all refer to. */
function verEnd(v){
  const b = VBOUNDS.find(x => x.ver === v);
  return b ? b.end : ORDERED.length;
}
const revealed = ch => !!ch && ch._ord < timeT;
const findCt = (t,ct) => t.changes.find(c => c.ct === ct);
function asofVer(){ return timeT === 0 ? 'orig' : ORDERED[timeT-1].ver; }

/* ── what the scope contains at a given time ──────────────────────────
   A line is in the document once its 'added' change has landed and until its
   'removed' change has. Lines with neither were in the original scope and
   stay. This is the one place that rule lives: the document, the running
   total, and the version-card budgets all ask it. */
function lineExistsAt(t, T){
  if(t.added){ const a = findCt(t,'added'); if(!a || a._ord >= T) return false; }
  return true;
}
function lineStruckAt(t, T){
  if(!t.removed) return false;
  const r = findCt(t,'removed');
  return !!r && r._ord < T;
}
/* The total is the scope you can actually see: every line present at T, at
   the amount it carried then. Derived rather than kept by hand, so adding a
   line to the snapshot above moves every figure that quotes it. */
function totalAt(T){
  let s = 0;
  SCOPE.forEach(g => g.tasks.forEach(t => {
    if(!lineExistsAt(t, T) || lineStruckAt(t, T)) return;
    s += parseMoney(valueAsOf(t, 'Amount', t.amount, T).val);
  }));
  return s;
}
function totalAsOf(){ return totalAt(timeT); }
/* Each version card quotes the scope as it stood at that version's last
   change — the same sum the paper's footer shows when you scrub there. */
function stampVersionBudgets(){
  VER_ORDER.forEach(v => { VER[v].budget = totalAt(verEnd(v)); });
}
function findTask(code){
  for(const g of SCOPE) for(const t of g.tasks) if(t.code === code) return t;
  return null;
}

/* Value of one field at a given time — the playhead unless told otherwise.
   Returns the as-of value, whether a revealed change has touched it, and the
   type of the latest one. */
function valueAsOf(t, field, staticVal, T){
  if(T === undefined) T = timeT;
  const rows = [];
  t.changes.forEach(ch => (ch.rows||[]).forEach(r => {
    if(r.field === field && r.from !== undefined) rows.push({ord:ch._ord, from:r.from, to:r.to, ct:ch.ct});
  }));
  if(!rows.length) return {val:staticVal, changed:false, ct:null};
  rows.sort((a,b) => a.ord - b.ord);
  const rev = rows.filter(r => r.ord < T);
  if(rev.length){ const last = rev[rev.length-1]; return {val:last.to, changed:true, ct:last.ct}; }
  return {val:rows[0].from, changed:false, ct:null};   // pre-change original value
}
/* Modifiers visible right now: the base set plus revealed additions. */
function modsAsOf(t){
  const out = (t.mods||[]).map(m => ({m, isNew:false}));
  t.changes.filter(c => c.ct === 'modifier').forEach(c => {
    if(revealed(c)) out.push({m:c.rows[0].add, isNew:true});
  });
  return out;
}
