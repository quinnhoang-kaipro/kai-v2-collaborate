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

/* ════════════ RESIZE ════════════ */
(function(){
  const handle=document.getElementById('handle');
  const body=document.querySelector('.body');
  const sidebar=document.querySelector('.sidebar');
  const DEFAULT=38,MIN=24,MAX=60; let dragging=false;
  function setPct(p){ p=Math.min(MAX,Math.max(MIN,p)); sidebar.style.flexBasis=p+'%'; }
  function onMove(e){ if(!dragging)return; const r=body.getBoundingClientRect(); const x=(e.touches?e.touches[0].clientX:e.clientX)-r.left; setPct((x/r.width)*100); }
  function stop(){ if(!dragging)return; dragging=false; handle.classList.remove('dragging'); document.body.classList.remove('col-resizing'); }
  function start(e){ dragging=true; handle.classList.add('dragging'); document.body.classList.add('col-resizing'); e.preventDefault(); }
  handle.addEventListener('mousedown',start);
  handle.addEventListener('touchstart',start,{passive:false});
  window.addEventListener('mousemove',onMove);
  window.addEventListener('touchmove',onMove,{passive:false});
  window.addEventListener('mouseup',stop);
  window.addEventListener('touchend',stop);
  handle.addEventListener('dblclick',()=>{ sidebar.style.flexBasis=DEFAULT+'%'; });
})();

/* ════════════ INIT ════════════ */
document.body.classList.toggle('shop-mode', workMode==='shop');
renderWorkHdr();
renderAll();
