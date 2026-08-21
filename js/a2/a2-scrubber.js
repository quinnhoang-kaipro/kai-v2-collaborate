/* ════════════════════════════════════════════════════════════════════
   ARTIFACT 2 · SCRUBBER · the timeline bar pinned to the bottom
   Built once so a pointer-drag survives the re-render of everything else;
   only the dynamic bits update as the playhead moves. setT() is the single
   way the playhead moves — it repaints the doc, the cards and the bar.

   Part of the Artifact 2 tab, split across js/a2/*.js. These are plain
   top-level declarations sharing one script scope, same as the rest of
   the panel — no IIFE, so any module can call any other.
   ════════════════════════════════════════════════════════════════════ */

/* ════════════ WHEN THINGS ACTUALLY HAPPENED ════════════
   A scope is not edited on a metronome. A change order is drafted over days,
   at whatever pace the job throws up questions, and becomes real the moment
   it is approved. Ticks spread at even intervals tell the opposite story —
   one edit per beat — so they are placed on the calendar instead.

   ORDERED only records which version a change belongs to, and a2-time.js is
   shared, so there are no per-change timestamps to read. They are derived
   here: each version's changes scatter across the window that closes on its
   approval date, and the last change of a version is pinned to that date —
   it is the change that closed the order. So exactly three positions are
   approvals (the Scope at 0, then each change order), and those are the same
   three the version bands jump to. The scatter is hashed off each change's
   own identity rather than drawn at random, so the timeline is irregular but
   comes out identical on every render. */
const A2_LEAD = .18;          // nothing moves the instant a version is approved

/* A stable 0..1 from a string (FNV-1a). Deterministic, so the ticks never
   reshuffle between renders the way Math.random would. */
function a2Jit(s){
  let h = 2166136261;
  for(let i=0;i<s.length;i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 10000) / 10000;
}

let POS  = [];   // POS[m] = where playhead position m sits on the bar, 0..100
let APPR = {};   // APPR[m] = the version approved at m, for the milestone ticks
let TSPAN = null;// {T0, span} — the calendar the bar is drawn on, for dated marks
/* ── weekly stops ─────────────────────────────────────────────────────
   A change a day makes 24 near-identical stops, and landing on one tells you
   about one line. Real scopes move in weeks: a batch of edits, then a decision.
   So the playhead rests on WEEKS, and the caption summarises the batch.

   The trick that keeps this cheap: a stop is still expressed as a change INDEX
   (the m just past the week's last change), so timeT keeps its meaning and
   everything reading it — revealed(), lineExistsAt(), the photo column's as-of
   lookup, the margin cards — is untouched. Weeks change where you can land,
   not what landing means.

   Approval moments stay in A2_STOPS even when they fall mid-week: they are the
   points on this bar most worth reaching. */
let WEEKS = [];    // {k, from, to, m, count, t0, t1}
let A2_STOPS = []; // ascending playhead positions the drag and the arrows snap to

/* a2-stage.js sets this when the scope on screen has not been approved yet.
   Guarded so the scrubber still works if that module isn't loaded. */
function a2Unapproved(){
  return (typeof A2_SCOPE_UNAPPROVED !== 'undefined') && A2_SCOPE_UNAPPROVED;
}
/* One version awaiting a decision, rather than the whole document being
   pre-approval. Set by a2-stage.js at the change-order-review step. */
function a2VerPending(ver){
  if(a2Unapproved()) return true;
  return (typeof A2_PENDING_VER !== 'undefined') && A2_PENDING_VER === ver;
}

function buildTimePos(){
  const N = ORDERED.length;
  POS = new Array(N+1).fill(0);
  APPR = {};
  const at = v => Date.parse(VER[v].date);
  // The bar opens the day the scope was first walked, not the day it was
  // approved: the Scope phase has changes of its own now, and they need a
  // window to spread across. VER.orig.opened is that day.
  const T0 = Date.parse(VER[VER_ORDER[0]].opened || VER[VER_ORDER[0]].date);
  const TN = at(VER_ORDER[VER_ORDER.length-1]), span = TN - T0;
  TSPAN = (span > 0) ? {T0, span} : null;
  if(!(span > 0)){                     // unparseable dates — fall back to even spacing
    for(let m=0; m<=N; m++) POS[m] = (m/Math.max(1,N))*100;
    ORDERED.forEach(ch => { ch._when = null; });   // a2When() falls back to the version date
    if(N) APPR[N] = ORDERED[N-1].ver;
    buildWeeks();
    return;
  }
  // Position 0 is the empty scope on day one — nothing is approved there.
  // Every approval is the last change of its version, stamped in the loop.
  let from = T0, m = 1;
  VER_ORDER.forEach(v=>{
    const rows = ORDERED.filter(ch => ch.ver === v);
    if(!rows.length) return;           // a version nothing was changed under
    const to = at(v), win = to - from, k = rows.length;
    rows.forEach((ch,j)=>{
      // Each change owns a slice of the window and sits at a hashed point
      // inside it, so the cadence is uneven but two never land on top of one
      // another. The last one is pinned to the approval date.
      const slice = (j + .3 + .55*a2Jit(v+'|'+(ch._task?ch._task.code:'')+'|'+ch.ct+'|'+j)) / k;
      const f = (j === k-1) ? 1 : A2_LEAD + (1-A2_LEAD)*slice;
      ch._when = from + f*win;         // the day it landed — every surface reads this
      POS[m++] = Math.max(0, Math.min(100, (ch._when - T0) / span * 100));
    });
    APPR[m-1] = v;                     // the change that closed this order
    from = to;
  });
  buildWeeks();
}

/* ── the date a change landed ──
   Reading VER[ch.ver].date instead would stamp every change in a version with
   that version's approval date: eleven Scope changes spread across ten days on
   the bar, all claiming to have happened on the day the scope was approved.
   The tick already knows better, so everything that prints a change's date
   asks here and the surfaces can't contradict each other. Falls back to the
   version date if the timeline has not been built yet. */
const A2_MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function a2When(ch){
  if(!ch) return '';
  if(ch._when == null) return VER[ch.ver] ? VER[ch.ver].date : '';
  const d = new Date(ch._when);
  return `${A2_MON[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}
/* The date the playhead is parked on: the day the change under it landed, or
   the day the scope was opened at position 0. The scrubber label and the
   paper's footer both print this, so the two cannot drift apart. */
function a2AsOfDate(){
  if(timeT === 0) return VER[VER_ORDER[0]].opened || VER[VER_ORDER[0]].date;
  return a2When(ORDERED[timeT-1]);
}

/* Bucket the changes into 7-day windows from the day the scope opened. */
function buildWeeks(){
  WEEKS = []; A2_STOPS = [0];
  const N = ORDERED.length;
  if(N && TSPAN){
    const DAY = 864e5, W = 7 * DAY, T0 = TSPAN.T0;
    /* Bucketed by version AND week, not week alone. A week that straddles an
       approval would otherwise produce a stop whose label starts before the
       approval it comes after — walking the bar read Apr 4-8, Apr 12, Apr 9-14.
       Splitting at the boundary keeps the stops in date order, and it is truer
       anyway: edits either side of an approval are separate batches. */
    ORDERED.forEach((ch, i) => {
      const t = (ch._when != null) ? ch._when : T0;
      const k = ch.ver + '|' + Math.max(0, Math.floor((t - T0) / W));
      let wk = WEEKS.find(x => x.k === k);
      if(!wk){ wk = {k, from:i, to:i, count:0, t0:t, t1:t}; WEEKS.push(wk); }
      wk.to = i; wk.count++;
      if(t < wk.t0) wk.t0 = t;
      if(t > wk.t1) wk.t1 = t;
    });
    WEEKS.sort((a,b) => a.from - b.from);
    WEEKS.forEach(wk => { wk.m = wk.to + 1; A2_STOPS.push(wk.m); });
  }
  // An approval is always reachable, even mid-week.
  Object.keys(APPR).forEach(m => { const n = +m; if(A2_STOPS.indexOf(n) === -1) A2_STOPS.push(n); });
  A2_STOPS.sort((a,b) => a - b);
}
/* The week a playhead position closes, or null when it sits on a lone change. */
function weekAt(m){ return WEEKS.find(w => w.m === m) || null; }
/* "Apr 13–19", or "Apr 28 – May 2" when the week straddles a month. */
function weekLabel(wk){
  const a = new Date(wk.t0), b = new Date(wk.t1);
  const same = a.getMonth() === b.getMonth();
  const l = d => `${A2_MON[d.getMonth()]} ${d.getDate()}`;
  if(wk.t0 === wk.t1) return l(a);
  return same ? `${l(a)}\u2013${b.getDate()}` : `${l(a)} \u2013 ${l(b)}`;
}
/* Nearest stop to a playhead position — used by the arrows to step week by
   week instead of change by change. */
function a2StepStop(dir){
  if(!A2_STOPS.length) return setT(timeT + dir);
  const here = A2_STOPS.indexOf(timeT);
  if(here !== -1){
    const nxt = A2_STOPS[here + dir];
    return setT(nxt == null ? timeT : nxt);
  }
  // Parked between stops (a card click can do that) — move to the first stop
  // in the direction of travel.
  const next = dir > 0 ? A2_STOPS.find(m => m > timeT)
                       : [...A2_STOPS].reverse().find(m => m < timeT);
  return setT(next == null ? timeT : next);
}

/* ── sign-offs ──
   Where a calendar date falls on the bar, 0..100 — null if the timeline has
   not been built or the date sits outside it. Changes are placed by their
   position in ORDERED; a review has no position in that list, only a day, so
   it needs the calendar directly. */
function a2PctOf(dateStr){
  if(!TSPAN) return null;
  const t = Date.parse(dateStr);
  if(!(t >= TSPAN.T0 && t <= TSPAN.T0 + TSPAN.span)) return null;
  return ((t - TSPAN.T0) / TSPAN.span) * 100;
}
/* The sign-offs that belong on the bar. The version filter does the work: for
   the pre-approval stages a2-stage.js trims VER_ORDER in place, so a review of
   a change order that does not exist yet drops out on its own.

   Deliberately not gated on a2Unapproved(). The Approved chip is suppressed in
   draft because it asserts the thing the stage is still waiting for, but a
   review asserts nothing about approval — and a2-stage.js keeps the Scope
   phase's own authoring history for exactly this reason: those things really
   did happen while the scope was being written. Its reviews did too. */
function a2Signoffs(){
  if(typeof REVIEWS === 'undefined') return [];
  return REVIEWS.filter(r => VER[r.ver] && VER_ORDER.indexOf(r.ver) !== -1 && a2PctOf(r.date) != null);
}

/* Who has signed a version and who still owes it. REVIEWERS is the roster the
   scope goes out to; REVIEWS records only the people who actually signed, so
   the ones missing from it are the outstanding ones. Both halves are needed
   together — "two of four" is the useful fact, and neither list says it alone.
   The shell's hand-off modal reads this through window.a2ReviewState.

   Named differently from that export on purpose: a top-level `function` in a
   classic script becomes a window property, so exporting a wrapper under the
   same name would overwrite this one and the wrapper would call itself. */
function reviewStateOf(ver){
  const roster = (typeof REVIEWERS === 'undefined') ? [] : REVIEWERS;
  const done   = (typeof REVIEWS   === 'undefined') ? [] : REVIEWS.filter(r => r.ver === ver);
  const signed = roster.map(p => {
    const hit = done.find(r => r.who === p.who);
    return hit ? {who:p.who, role:p.role, date:hit.date} : null;
  }).filter(Boolean);
  const pending = roster.filter(p => !done.some(r => r.who === p.who));
  return {ver, label:(VER[ver]||{}).label || ver, signed, pending, total:roster.length};
}

/* ── the sign-off popover ──
   A check is small and the lane is unlabelled, so on its own it does not say
   what it is. Pressing one opens the full sentence anchored underneath it.
   Clamped to the wrap so a check at either end of the bar still reads. */
function closeSignPop(){
  const p = document.getElementById('a2SignPop');
  if(p) p.hidden = true;
  document.querySelectorAll('#a2Scrub .a2-tl-sign.is-open').forEach(s => s.classList.remove('is-open'));
}
function openSignPop(sg){
  const pop = document.getElementById('a2SignPop');
  if(!pop || !SREFS) return;
  const wasOpen = sg.classList.contains('is-open');
  closeSignPop();
  if(wasOpen) return;                 // pressing the open one closes it again
  const d = sg.dataset;
  pop.innerHTML = `<span class="a2-sp-av">${a2Esc(d.init)}</span>`
    + `<span class="a2-sp-txt"><span class="a2-sp-who"><b>${a2Esc(d.who)}</b><span class="a2-sp-role">${a2Esc(d.role)}</span></span>`
    + `<span class="a2-sp-act">Marked ${a2Esc(d.ver)} as reviewed</span></span>`
    + `<span class="a2-sp-date">${a2Esc(d.date)}</span>`;
  pop.hidden = false;
  sg.classList.add('is-open');
  const wrapW = SREFS.wrap.clientWidth, popW = pop.offsetWidth;
  const centre = (+d.p / 100) * wrapW;
  const left = Math.max(0, Math.min(Math.max(0, wrapW - popW), centre - popW/2));
  pop.style.left = left + 'px';
  pop.style.setProperty('--a2-arrow', (centre - left) + 'px');
}
/* Registered once at load, not per build: buildScrubber runs on every render
   and would otherwise stack a listener each time. */
document.addEventListener('pointerdown', e=>{
  if(!e.target || !e.target.closest) return;
  if(e.target.closest('.a2-tl-sign') || e.target.closest('.a2-sign-pop')) return;
  closeSignPop();
});
document.addEventListener('keydown', e=>{ if(e.key === 'Escape') closeSignPop(); });

/* ════════════ SCRUBBER ════════════
   Built once so a pointer-drag survives the re-render of everything else;
   only the dynamic bits update as the playhead moves. */
function buildScrubber(){
  buildTimePos();
  const N = ORDERED.length;
  let ticks = '';
  for(let m=0; m<=N; m++){
    const ch  = m ? ORDERED[m-1] : null;
    const ap  = APPR[m];
    const mk  = ch ? CT[ch.ct].color : 'var(--t2)';
    // An approval milestone is only celebrated once it IS one. At the
    // change-order-review step the last version is submitted and awaiting a
    // decision, so its marker stays neutral rather than going green on
    // something that hasn't happened.
    const apCls = ap ? (a2VerPending(ap) ? ' is-appr is-appr-pending' : ' is-appr') : '';
    // Per-change ticks stay — they are the texture that shows where the work
    // clustered. A stop gets a taller mark so the places you can actually land
    // are legible against them.
    const stopCls = (A2_STOPS.indexOf(m) !== -1 && !ap) ? ' is-stop' : '';
    ticks += `<div class="a2-tl-tick${apCls}${stopCls}" data-m="${m}" style="left:${POS[m].toFixed(3)}%;--mk:${mk}"></div>`;
  }
  // Each sign-off sits on the day it was signed, in its own lane under the
  // rail. Placed by date rather than by playhead position: a review is not a
  // change, so it has no slot in ORDERED to hang off.
  const signs = a2Signoffs().map(r=>{
    const pct = a2PctOf(r.date);
    const ttl = `${r.who} · ${r.role} marked ${VER[r.ver].label} as reviewed · ${r.date}`;
    return `<button class="a2-tl-sign" type="button" data-p="${pct.toFixed(3)}" data-who="${a2Esc(r.who)}"
      data-role="${a2Esc(r.role)}" data-ver="${a2Esc(VER[r.ver].label)}" data-date="${a2Esc(r.date)}"
      data-init="${a2Esc(initials(r.who))}" style="left:${pct.toFixed(3)}%" title="${a2Esc(ttl)}" aria-label="${a2Esc(ttl)}"
      ><svg viewBox="0 0 10 10" aria-hidden="true"><path d="M2.2 5.3 4.2 7.3 7.8 3.2"/></svg></button>`;
  }).join('');
  // Bands come from the version bounds, so the Scope band covers the run of
  // changes that built the scope rather than collapsing to a point at 0.
  const segs = VBOUNDS;
  const groups = segs.map((s,i)=>{
    const left  = POS[Math.min(s.start, N)] || 0;
    const right = (i+1 < segs.length) ? (POS[Math.min(segs[i+1].start, N)] || 0) : 100;
    const jump  = s.end;
    return `<button class="a2-tl-group" type="button" data-ver="${s.ver}" style="left:${left.toFixed(3)}%;width:${Math.max(0,right-left).toFixed(3)}%"
      onclick="a2SetT(${jump})" title="${a2Esc(VER[s.ver].label)} · ${a2Unapproved() ? 'in draft — not approved yet'
        : a2VerPending(s.ver) ? `submitted ${a2Esc(VER[s.ver].date)} — awaiting approval`
        : `approved ${a2Esc(VER[s.ver].date)}`}">${a2Esc(VER[s.ver].label)}</button>`;
  }).join('');
  document.getElementById('a2Scrub').innerHTML = `
    <!-- No header row. The title said what the control obviously is, and the
         caption was pinned to the far right — you read the change in one corner
         while looking at the playhead in another. It rides the playhead now.
         Stepping is still on the arrow keys (see a2-init.js). -->
    <div class="a2-tl-wrap" id="a2TlWrap">
      <span class="a2-tl-label" id="a2TlLabel"></span>
      <div class="a2-tl-track">
        <div class="a2-tl-fill" id="a2TlFill"></div>
        ${ticks}
        ${signs}
        <div class="a2-tl-thumb" id="a2TlThumb"></div>
      </div>
      <div class="a2-sign-pop" id="a2SignPop" hidden></div>
    </div>
    <div class="a2-tl-groups">${groups}</div>`;
  SREFS = {
    wrap:  document.getElementById('a2TlWrap'),
    fill:  document.getElementById('a2TlFill'),
    thumb: document.getElementById('a2TlThumb'),
    label: document.getElementById('a2TlLabel'),
    prev:  document.getElementById('a2Prev'),
    next:  document.getElementById('a2Next'),
    ticks: [...document.querySelectorAll('#a2Scrub .a2-tl-tick')],
    signs: [...document.querySelectorAll('#a2Scrub .a2-tl-sign')],
    groups:[...document.querySelectorAll('#a2Scrub .a2-tl-group')],
  };
  // The step buttons went with the header row; the arrow keys still step (see
  // a2-init.js). Guarded rather than deleted so a future control can re-appear
  // under the same ids without this needing to change.
  if(SREFS.prev) SREFS.prev.onclick = ()=>setT(timeT-1);
  if(SREFS.next) SREFS.next.onclick = ()=>setT(timeT+1);
  let dragging = false;
  /* Ticks no longer sit at even intervals, so a drag snaps to the nearest
     real moment rather than dividing the width into equal steps. */
  const toM = clientX => {
    const r = SREFS.wrap.getBoundingClientRect();
    const p = Math.max(0, Math.min(1, (clientX - r.left) / r.width)) * 100;
    // Snap to the stops — weeks, plus every approval — rather than to all 24
    // changes. Scrubbing lands on a batch you can read, not on one edit.
    const stops = A2_STOPS.length ? A2_STOPS : POS.map((_,m)=>m);
    let best = stops[0], bd = Infinity;
    stops.forEach(m => { const d = Math.abs((POS[m]||0) - p); if(d < bd){ bd = d; best = m; } });
    return best;
  };
  SREFS.wrap.addEventListener('pointerdown', e=>{
    // A check is a thing to open, not a place to scrub to. It sits in its own
    // lane below the rail, so pressing one is never an attempt to move the
    // playhead — swallow it and show who signed instead.
    const sg = e.target.closest && e.target.closest('.a2-tl-sign');
    if(sg){ openSignPop(sg); return; }
    closeSignPop();
    dragging = true;
    try{ SREFS.wrap.setPointerCapture(e.pointerId); }catch(_){}
    const m = toM(e.clientX); (m !== timeT) ? setT(m) : updateScrubber();
  });
  SREFS.wrap.addEventListener('pointermove', e=>{
    if(!dragging) return;
    const m = toM(e.clientX); if(m !== timeT) setT(m);
  });
  const end = e=>{ dragging = false; try{ SREFS.wrap.releasePointerCapture(e.pointerId); }catch(_){} };
  SREFS.wrap.addEventListener('pointerup', end);
  SREFS.wrap.addEventListener('pointercancel', end);
}
function updateScrubber(){
  if(!SREFS || !document.getElementById('a2TlWrap')) return;
  const N = ORDERED.length, pct = POS[Math.max(0, Math.min(N, timeT))] || 0;
  SREFS.fill.style.width = pct + '%';
  SREFS.thumb.style.left = pct + '%';
  SREFS.ticks.forEach(tk=>{
    const m = +tk.dataset.m;
    tk.classList.toggle('is-revealed', m <= timeT);
    tk.classList.toggle('is-current', m === timeT);
  });
  // A check fills in once the playhead reaches the day it was signed.
  SREFS.signs.forEach(s => s.classList.toggle('is-revealed', +s.dataset.p <= pct + 1e-6));
  const ver = asofVer();
  SREFS.groups.forEach(g=> g.classList.toggle('is-current', g.dataset.ver === ver));
  let dot, txt, date;
  // Position 0 is the first walk, not an empty document — whatever the agent
  // caught on the way through the door is already on the page.
  const wk = weekAt(timeT);
  if(timeT === 0){ dot='var(--t3)'; txt='First walk'; date='Apr 2'; }
  else if(wk){
    /* Parked on a week: summarise the batch rather than naming its last edit.
       The lines touched is the more useful number than the change count — four
       changes across one line is a different week from four across four. */
    const seen = new Set();
    for(let i=wk.from; i<=wk.to; i++) seen.add(ORDERED[i]._task.code);
    dot = 'var(--ink)';
    txt = `${wk.count} change${wk.count===1?'':'s'} · ${seen.size} line${seen.size===1?'':'s'}`;
    date = weekLabel(wk);
  } else {
    const ch = ORDERED[timeT-1];
    dot = CT[ch.ct].color;
    // Landed on one change — from a margin card, or an approval mid-week.
    txt = `${ch._task.name} · ${CT[ch.ct].label.toLowerCase()}`;
    date = a2AsOfDate().replace(/,\s*\d{4}$/, '');
  }
  // Sitting on one of the three approvals is worth saying out loud.
  // The milestone chip marks the change that closed a version — but only once
  // that version has actually been approved. In draft it would be asserting the
  // thing the stage is still waiting for.
  const appr = (APPR[timeT] && !a2VerPending(APPR[timeT]))
    ? `<span class="a2-cl-appr">Approved</span>`
    : (APPR[timeT] && !a2Unapproved() ? `<span class="a2-cl-appr is-pending">Submitted</span>` : '');
  SREFS.label.innerHTML = `<span class="a2-cl-dot" style="--mk:${dot}"></span><span class="a2-cl-date">${a2Esc(date)}</span><span class="a2-cl-txt">${a2Esc(txt)}</span>${appr}`;
  /* Ride the playhead. Centred on it, except near the ends where centring would
     hang the caption off the panel — there it anchors to the edge instead. */
  const lab = SREFS.label;
  lab.classList.toggle('at-start', pct < 14);
  lab.classList.toggle('at-end',   pct > 86);
  lab.style.left = (pct < 14 ? 0 : pct > 86 ? 100 : pct) + '%';
  if(SREFS.prev) SREFS.prev.disabled = timeT <= 0;
  if(SREFS.next) SREFS.next.disabled = timeT >= N;
}
/* Ring the version card the playhead currently sits in. */
function updateAsof(){
  const ver = asofVer();
  document.querySelectorAll('#a2Vers .hist-card').forEach(c=> c.classList.toggle('is-asof', c.dataset.ver === ver));
}

/* The single entry point for moving the playhead. */
function setT(v){
  if(!document.getElementById('a2Root')) return;
  timeT = Math.max(0, Math.min(ORDERED.length, v));
  renderDoc();
  buildCards();
  updateScrubber();
  updateAsof();
  requestAnimationFrame(layoutCards);
}
