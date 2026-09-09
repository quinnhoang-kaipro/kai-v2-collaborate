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
