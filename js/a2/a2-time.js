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
let C1 = 0;                             // count of Change Order 1 changes
let timeT = 0;                          // playhead position (0..ORDERED.length)
let CARDS = [];                         // {el, code, ch}
let SREFS = null;                       // cached scrubber nodes
let built = false;                      // has buildOrdered run
let selCode = null;                     // the selected line, or null
let tight = false;                      // compact type + gutter for a narrow panel
let SIZEW = null;                       // size-watch interval id
let lastW = 0;                          // last observed root width
const A2_TIGHT_UNDER = 1000;            // px of work-surface width below which we compact

/* Budget impact of one change (drives the running total). */
function budgetOf(ch){
  if(ch.ct === 'value')   { let s=0; ch.rows.forEach(r=>{ if(r.delta) s += parseMoney(r.delta); }); return s; }
  if(ch.ct === 'added')   { return parseMoney(ch.rows[0].wasAmount || '$0'); }
  if(ch.ct === 'removed') { return -parseMoney(ch.rows[0].wasAmount || '$0'); }
  return 0;
}
function buildOrdered(){
  if(built) return;
  ORDERED = [];
  SCOPE.forEach(g => g.tasks.forEach(t => t.changes.forEach(ch => {
    ch._task = t; ch._room = g.room; ORDERED.push(ch);
  })));
  // Stable sort by version rank preserves document order within a version.
  ORDERED.sort((a,b) => VER[a.ver].rank - VER[b.ver].rank);
  ORDERED.forEach((ch,i) => { ch._ord = i; ch._budget = budgetOf(ch); });
  C1 = ORDERED.filter(ch => ch.ver === 'co1').length;
  timeT = ORDERED.length;   // open at the present — every change shown
  built = true;
}
const revealed = ch => !!ch && ch._ord < timeT;
const findCt = (t,ct) => t.changes.find(c => c.ct === ct);
function asofVer(){ return timeT === 0 ? 'orig' : ORDERED[timeT-1].ver; }
function totalAsOf(){ let s = BASE_TOTAL; ORDERED.forEach(ch => { if(ch._ord < timeT) s += ch._budget; }); return s; }
function findTask(code){
  for(const g of SCOPE) for(const t of g.tasks) if(t.code === code) return t;
  return null;
}

/* Value of one field at the current playhead time. Returns the as-of value,
   whether a revealed change has touched it, and the type of the latest one. */
function valueAsOf(t, field, staticVal){
  const rows = [];
  t.changes.forEach(ch => (ch.rows||[]).forEach(r => {
    if(r.field === field && r.from !== undefined) rows.push({ord:ch._ord, from:r.from, to:r.to, ct:ch.ct});
  }));
  if(!rows.length) return {val:staticVal, changed:false, ct:null};
  rows.sort((a,b) => a.ord - b.ord);
  const rev = rows.filter(r => r.ord < timeT);
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
