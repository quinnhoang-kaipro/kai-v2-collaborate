/* ════════════ RENDER ALL ════════════ */
function renderAll(){
  // renderSidebar() calls renderStateBar() which rebuilds the state-bar
  // innerHTML — that includes #afMenu. So renderFilter() must run AFTER the
  // sidebar re-render, otherwise the freshly-populated menu content gets
  // wiped by the state-bar rebuild and the dropdown opens empty.
  renderSidebar();
  renderFilter();
  syncApproveBtn();
  renderWork();
  // Ping shell with aggregate task-completion state (used to gate the
  // top-bar Submit Closeout CTA). Idempotent — only actually posts when
  // the value changes.
  if(typeof _reportAllTasksComplete === 'function') _reportAllTasksComplete();
}

/* ════════════ TOAST ════════════ */
let toastT;
function toast(msg){
  const el=document.getElementById('toast'); el.textContent=msg; el.classList.add('show');
  clearTimeout(toastT); toastT=setTimeout(()=>el.classList.remove('show'),2000);
}

/* ════════════ RESIZE ════════════
   The handle drags the sidebar between MIN and MAX. Drag it past the left
   edge (under COLLAPSE_UNDER) and the sidebar shuts entirely, leaving the
   .sb-reveal tab to pull it back to whatever width it had. The sidebar's own
   min-width means the pointer runs ahead of the visible edge on the way in —
   that gap is what makes "drag it all the way left" reachable. */
(function(){
  const handle=document.getElementById('handle');
  const body=document.querySelector('.body');
  const sidebar=document.querySelector('.sidebar');
  const DEFAULT=38,MIN=24,MAX=60,COLLAPSE_UNDER=16; let dragging=false;
  let lastOpen=DEFAULT;   // width to restore to when re-opened
  function collapsed(){ return document.body.classList.contains('sb-collapsed'); }
  function setCollapsed(on){
    if(on === collapsed()) return;
    document.body.classList.toggle('sb-collapsed', on);
    // The drag writes flex-basis inline, so the stylesheet can't shut the
    // sidebar on its own — JS owns the width in both directions.
    sidebar.style.flexBasis = on ? '0' : (lastOpen + '%');
    // Tabs that size themselves off the work surface (Artifact 2 stacks its
    // margin cards by measurement) need a nudge — nothing here fires resize.
    window.dispatchEvent(new Event('resize'));
  }
  function setPct(p){
    if(p < COLLAPSE_UNDER){ setCollapsed(true); return; }
    setCollapsed(false);
    p=Math.min(MAX,Math.max(MIN,p));
    lastOpen=p;
    sidebar.style.flexBasis=p+'%';
    // Writing flex-basis fires no resize event, and the tools bar has to
    // re-decide whether its labels still fit on one row.
    if(typeof _sbFitTools === 'function') _sbFitTools();
  }
  function onMove(e){ if(!dragging)return; const r=body.getBoundingClientRect(); const x=(e.touches?e.touches[0].clientX:e.clientX)-r.left; setPct((x/r.width)*100); }
  function stop(){ if(!dragging)return; dragging=false; handle.classList.remove('dragging'); document.body.classList.remove('col-resizing'); }
  function start(e){ dragging=true; handle.classList.add('dragging'); document.body.classList.add('col-resizing'); e.preventDefault(); }
  handle.addEventListener('mousedown',start);
  handle.addEventListener('touchstart',start,{passive:false});
  window.addEventListener('mousemove',onMove);
  window.addEventListener('touchmove',onMove,{passive:false});
  window.addEventListener('mouseup',stop);
  window.addEventListener('touchend',stop);
  handle.addEventListener('dblclick',()=>{ lastOpen=DEFAULT; setCollapsed(false); sidebar.style.flexBasis=DEFAULT+'%'; });
  // Called by the pull-out tab in the markup.
  window.expandSidebar=function(){ setCollapsed(false); };
  window.collapseSidebar=function(){ setCollapsed(true); };
})();

/* ════════════ INIT ════════════ */
/* ?sb=collapsed — open with the scope list shut. The pull-out tab brings it
   back, so this is a starting position rather than a missing panel. */
if(new URLSearchParams(window.__KAI_QS || window.location.search).get('sb') === 'collapsed'){
  window.collapseSidebar();
}
document.body.classList.toggle('shop-mode', workMode==='shop');
renderWorkHdr();
renderAll();

/* SCRATCH · flip between the sidebar look options in panel.css. sbOpt('a'),
   sbOpt('b'), sbOpt('c'), or sbOpt('') for the current look. Goes when the
   option is picked. */
window.sbOpt = function(k){
  document.body.classList.remove('sbopt-a','sbopt-b','sbopt-c');
  if(k) document.body.classList.add('sbopt-' + k);
  return k ? 'option ' + k.toUpperCase() : 'current look';
};

/* ── Sticky photos: room for the reel to reach the top ──────────────────
   The photo section on a task, room and scope page pins under the tab bar
   while the page scrolls (.pgd-mediasec.is-sticky). It only pins once the
   page can scroll far enough to bring it up to the top, and a short page
   ends before that, so the reel stops partway and reads as not sticking.
   The page gets a minimum height of one screen past the reel's own top, so
   the reel can always reach it. Pages already long enough are untouched. */
function kaiStickyRoom(){
  const wb = document.getElementById('workBody');
  if(!wb) return;
  wb.querySelectorAll('[data-sticky-room]').forEach(el => { el.style.minHeight = ''; el.removeAttribute('data-sticky-room'); });
  const m = wb.querySelector('.pgd-mediasec.is-sticky');
  if(!m || !m.parentElement) return;
  const page = m.parentElement;
  // Where the reel rests, not where it is while stuck: offsetTop ignores
  // sticky positioning.
  const reelTop = m.offsetTop - (m.offsetParent === page ? 0 : page.offsetTop);
  page.style.minHeight = Math.ceil(reelTop + wb.clientHeight) + 'px';
  page.setAttribute('data-sticky-room', '');
}
(function(){
  const wb = document.getElementById('workBody');
  if(!wb) return;
  let raf = 0;
  const kick = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(kaiStickyRoom); };
  new MutationObserver(kick).observe(wb, {childList:true});
  new ResizeObserver(kick).observe(wb);
  window.addEventListener('resize', kick);
  kick();
  /* Stuck or resting: once the page has scrolled the reel up to the tabs it
     turns into a compact bar across the whole panel — the name and figure
     of what you're looking at, and smaller photos — and goes back to a card
     when you scroll back up. offsetTop is the reel's resting place, which
     sticky positioning leaves alone, so the test can't flicker. */
  const syncStuck = () => {
    const m = wb.querySelector('.pgd-mediasec.is-sticky');
    if(!m) return;
    const stuck = wb.scrollTop > 0 && wb.scrollTop >= m.offsetTop - 1;
    if(m.classList.contains('is-stuck') === stuck) return;
    /* The stuck bar is shorter than the card. Left alone, everything under
       it moves up by the difference, the browser's scroll anchoring pulls
       the page back by the same amount, the reel drops below its pin line
       and unsticks — and round it goes, a flicker. A bottom margin of the
       difference keeps the reel's footprint the same in both states, so
       nothing below it moves. */
    if(stuck){
      const restH = m.offsetHeight;
      _stuckNav(m);
      m.classList.add('is-stuck');
      m.style.marginBottom = Math.max(0, restH - m.offsetHeight) + 'px';
      _stuckNavSync(m);
    } else {
      m.classList.remove('is-stuck');
      m.style.marginBottom = '';
    }
  };
  /* Stuck, the photos share the bar's row and page sideways with ‹ ›; a
     trackpad swipe scrolls the strip as it always has. The buttons are added
     once per reel and grey out at either end of the strip. */
  const _stuckNav = m => {
    if(m.querySelector(':scope > .pgd-media-nav')) return;
    const strip = m.querySelector(':scope > .pgd-photos');
    if(!strip) return;
    const mk = (dir, label, path) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'pgd-media-nav is-' + dir;
      b.setAttribute('aria-label', label);
      b.title = label;
      b.innerHTML = '<svg viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="' + path + '" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      b.addEventListener('click', e => {
        e.stopPropagation();
        const delta = (dir === 'prev' ? -1 : 1) * Math.max(120, strip.clientWidth * 0.8);
        const from = strip.scrollLeft;
        strip.scrollBy({left: delta, behavior: 'smooth'});
        // Where smooth scrolling doesn't run (a background tab, reduced
        // motion), jump instead so the button never does nothing.
        setTimeout(() => {
          if(Math.abs(strip.scrollLeft - from) < 2) strip.scrollTo({left: from + delta, behavior: 'instant'});
          _stuckNavSync(m);
        }, 400);
      });
      return b;
    };
    m.appendChild(mk('prev', 'Previous photos', 'M7.5 3L4.5 6l3 3'));
    m.appendChild(mk('next', 'Next photos', 'M4.5 3l3 3-3 3'));
    strip.addEventListener('scroll', () => _stuckNavSync(m), {passive:true});
  };
  const _stuckNavSync = m => {
    const strip = m.querySelector(':scope > .pgd-photos');
    const prev = m.querySelector(':scope > .pgd-media-nav.is-prev');
    const next = m.querySelector(':scope > .pgd-media-nav.is-next');
    if(!strip || !prev || !next) return;
    const over = strip.scrollWidth > strip.clientWidth + 2;
    m.classList.toggle('has-overflow', over);
    prev.disabled = strip.scrollLeft <= 1;
    next.disabled = strip.scrollLeft + strip.clientWidth >= strip.scrollWidth - 1;
  };
  wb.addEventListener('scroll', syncStuck, {passive:true});
  window.addEventListener('resize', () => { const m = wb.querySelector('.pgd-mediasec.is-stuck'); if(m) _stuckNavSync(m); });
  new MutationObserver(() => requestAnimationFrame(syncStuck)).observe(wb, {childList:true});
})();
