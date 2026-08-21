/* ════════════════════════════════════════════════════════════════════
   ARTIFACT 2 · INIT · entry point, responsive watch, and public surface
   renderArtifact2() is what focused-content.js calls. The size watch keeps
   the measured card layout honest as the panel resizes. Everything the
   inline onclick handlers in the other modules call is exported here.
   Loads last: it references functions the other modules declare.

   Part of the Artifact 2 tab, split across js/a2/*.js. These are plain
   top-level declarations sharing one script scope, same as the rest of
   the panel — no IIFE, so any module can call any other.
   ════════════════════════════════════════════════════════════════════ */
/* ── keep the measured layout honest as the work surface changes width ──
   Card stacking is measured, so it has to be redone whenever the panel
   resizes: window resize, or a sidebar drag (which only sets flex-basis and
   fires no event of its own). ResizeObserver would be the natural hook but
   never fires inside the shell's srcdoc iframe, so this polls the root width
   and only does work when it actually moved. */
function checkSize(){
  const root = document.getElementById('a2Root');
  if(!root){ stopWatch(); return; }
  const w = root.clientWidth;
  if(w === lastW) return;
  lastW = w;
  syncTight();
  layoutCards();
}
function stopWatch(){ if(SIZEW){ clearInterval(SIZEW); SIZEW = null; } }
function startWatch(){
  stopWatch();
  const root = document.getElementById('a2Root');
  lastW = root ? root.clientWidth : 0;
  SIZEW = setInterval(checkSize, 220);
}
window.addEventListener('resize', checkSize);

/* Below the threshold the panel can't carry the document's full type scale
   and a roomy gutter, so both step down a size. */
function syncTight(){
  const root = document.getElementById('a2Root');
  if(!root) return false;
  const next = root.clientWidth < A2_TIGHT_UNDER;
  if(next === tight) return false;
  tight = next;
  root.classList.toggle('is-tight', tight);
  return true;
}

/* ════════════ ENTRY POINT ════════════ */
function renderArtifact2(){
  const body = document.getElementById('workBody');
  if(!body) return;
  // This rebuilds the whole tab, and renderAll() calls it for any edit made
  // anywhere in the panel — including from the Editor modules embedded in an
  // expanded line. Losing the reader's scroll position on every keystroke made
  // the surface feel broken, so carry it across the rebuild.
  const prevScroll = (document.getElementById('a2Scroll') || {}).scrollTop || 0;
  buildOrdered();
  body.innerHTML = shellHtml();
  const root = document.getElementById('a2Root');
  tight = root.clientWidth < A2_TIGHT_UNDER;
  root.classList.toggle('is-tight', tight);
  buildScrubber();
  renderDoc();
  buildCards();
  updateScrubber();
  updateAsof();
  requestAnimationFrame(layoutCards);
  startWatch();
  if(prevScroll){
    const sc = document.getElementById('a2Scroll');
    if(sc){ sc.scrollTop = prevScroll; requestAnimationFrame(() => { sc.scrollTop = prevScroll; }); }
  }
  // A font swap changes card heights, so the stack has to settle again.
  if(document.fonts && document.fonts.ready) document.fonts.ready.then(()=>{ if(document.getElementById('a2Root')) layoutCards(); });
}

/* Arrow keys step the playhead while this tab is the active surface. */
document.addEventListener('keydown', e=>{
  if(typeof workMode !== 'undefined' && workMode !== 'artifact2') return;
  if(!document.getElementById('a2Root')) return;
  const tag = (e.target && e.target.tagName || '').toLowerCase();
  if(tag === 'input' || tag === 'textarea' || tag === 'select') return;
  // Step stop to stop — week by week — matching what a drag snaps to. Falls
  // back to single changes if the scrubber module isn't loaded.
  const step = (typeof a2StepStop === 'function') ? a2StepStop : d => setT(timeT + d);
  if(e.key === 'ArrowLeft'){ step(-1); e.preventDefault(); }
  if(e.key === 'ArrowRight'){ step(1); e.preventDefault(); }
});

/* Globals the inline handlers in the markup above call. */
window.a2OpenInEditor = function(id){
  if(typeof setWorkMode === 'function') setWorkMode('shop');
  if(typeof selectTask === 'function') selectTask(id);
};
window.renderArtifact2 = renderArtifact2;
window.a2SetT = setT;
window.a2Select = selectRow;
window.a2JumpVer = function(v){ setT(verEnd(v)); };   // land on that version as approved
/* Read by the shell's hand-off modal, which lives outside this iframe and so
   cannot see REVIEWS/REVIEWERS directly. Defaults to the version being worked
   on — the first in the ladder, which a2-stage.js keeps in the draft stages. */
window.a2ReviewState = function(v){ return reviewStateOf(v || VER_ORDER[0]); };
