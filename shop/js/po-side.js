/* ════════════ PURCHASE ORDER BESIDE THE EDITOR ════════════
   ShopwithKai_layout.html only (window.__KAI_SHOP_LAYOUT). Reviewing an
   order is two documents at once: the order, and the task each line is for
   (its description, notes, photos). So here an order opens in the left
   panel, in place of the scope list, and the work surface stays the Editor.
   Every line, and every task under a line, opens that task on the right; the
   order stays where it is. "‹ Scope" puts the scope list back.

   One order, not the list: the one being worked — the draft, if there is
   one — else the latest approved. Older orders stay on the Record tab.

   The order is _poOrders()'s, the same one the Record tab lists, so the two
   never disagree. The pane sits over the sidebar rather than replacing its
   markup, so the scope list underneath keeps its scroll, filters and
   selection for when it comes back. */
const SHOP_LAYOUT = !!window.__KAI_SHOP_LAYOUT;
document.documentElement.classList.toggle('kai-shop-layout', SHOP_LAYOUT);

let poSide = null;   // null (scope list) | the order id on show

function openPoSide(){
  const id = _poFocusOrderId();
  if(!id) return;
  poSide = id;
  _renderPoSide();
  // The order lands on its first line's task, so both sides have something
  // to say from the first moment.
  poSel = null;
  if(workMode !== 'shop' && typeof setWorkMode === 'function') setWorkMode('shop');
  _poSyncFocus();
}
function closePoSide(){
  poSide = null;
  poSel = null;
  _renderPoSide();
  if(typeof renderSidebar === 'function') renderSidebar();
  _poSyncFocus();
}
/* A task from the order: open it in the Editor, keep the order on the left. */
/* A product from the order: its product line's page in the Editor — the
   same page the Departments view opens — which carries the product, every
   task it is for, and what each order is buying. Products live under
   Departments, so the scope list behind the order switches to it; closing
   the order shows the line selected there. */
let poSel = null;   // the order line (SKU key) picked in the left panel
function _poLineKeyOfTask(code){
  const t = TASKS.find(x => x.code === code);
  if(!t) return null;
  const tl = taskLine(t);
  return `${tl.dept}|${tl.line}`;
}
/* The product line an order line belongs to: through any task that buys
   the product (the whole line's tasks, not just this order's share), past
   tasks the Departments view files as labour only — a resident-installed
   fan still has a fan behind it. */
function _poProductLineKey(L){
  const codes = Object.keys(L.byTask || {}).concat(L.tasks);
  const keys = codes.map(_poLineKeyOfTask).filter(Boolean);
  return keys.find(k => k.split('|')[0] !== NO_PRODUCT_DEPT) || keys[0] || null;
}
function poSideProduct(key){
  const o = _poOrderById(poSide || _poFocusOrderId());
  const L = o && o.lines.find(x => _poLineKey(x) === key);
  const lk = L && _poProductLineKey(L);
  if(!lk) return;
  poSel = key;
  if(groupBy !== 'dept'){ groupBy = 'dept'; collapsedGrps = null; }
  if(selLineKey === lk && !selId){ if(workMode !== 'shop') setWorkMode('shop'); else renderWork(); }
  else selectLine(lk);
  _renderPoSide();
}
function poSideTask(code){
  const t = TASKS.find(x => x.code === code);
  if(!t) return;
  if(typeof selectTask === 'function') selectTask(t.id, {toEditor:true});
  if(workMode !== 'shop' && typeof setWorkMode === 'function') setWorkMode('shop');
  _renderPoSide();
}

/* The order's lines in the order the pane shows them: by category, then
   largest first. */
function _poSideLines(o){
  const rank = c => { const i = _PO_CATEGORY_ORDER.indexOf(c); return i < 0 ? 99 : i; };
  return o.lines.slice().sort((a, b) => rank(a.cat) - rank(b.cat) || a.cat.localeCompare(b.cat) || Math.abs(b.amt) - Math.abs(a.amt));
}
function _poSideEl(){
  const sb = document.querySelector('.sidebar');
  if(!sb) return null;
  let el = document.getElementById('poSide');
  if(!el){
    el = document.createElement('div');
    el.id = 'poSide';
    el.className = 'pos';
    sb.appendChild(el);
  }
  return el;
}
function _renderPoSide(){
  if(!SHOP_LAYOUT) return;
  const el = _poSideEl();
  if(!el) return;
  document.body.classList.toggle('pos-on', !!poSide);
  if(!poSide){ el.hidden = true; el.innerHTML = ''; return; }
  // Approving the draft can make a newer order the latest; follow it.
  poSide = _poFocusOrderId() || poSide;
  const keep = el.querySelector('.pos-scroll');
  const top = keep ? keep.scrollTop : 0;
  const wasId = el.dataset.view;
  el.hidden = false;
  el.innerHTML = _poSideOrderHtml(poSide);
  el.dataset.view = poSide;
  // Re-rendering for a new selection keeps the reader's place in the order.
  if(wasId === poSide){ const sc = el.querySelector('.pos-scroll'); if(sc) sc.scrollTop = top; }
}

const _POS_BACK = `<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7.5 2.5 4 6l3.5 3.5"/></svg>`;

/* One order, as a reviewer walks it: by category, each line with the tasks
   it is for, each task a way to its Editor page. */
function _poSideOrderHtml(id){
  const o = _poOrderById(id);
  if(!o) return '';
  const selCode = (workMode === 'shop' && typeof selId !== 'undefined' && selId != null) ? ((TASKS.find(x => x.id === selId) || {}).code || '') : '';
  const qtyTxt = L => (Math.round(Math.abs(L.qty) * 100) / 100).toLocaleString('en-US') + (L.unit ? ' ' + L.unit : '');
  const byCat = {};
  o.lines.forEach(L => { (byCat[L.cat] = byCat[L.cat] || []).push(L); });
  const rank = c => { const i = _PO_CATEGORY_ORDER.indexOf(c); return i < 0 ? 99 : i; };
  const cats = Object.keys(byCat).sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
  const taskChip = code => {
    const t = TASKS.find(x => x.code === code);
    const on = code === selCode;
    return `<button type="button" class="pos-task${on ? ' is-on' : ''}" onclick="event.stopPropagation();poSideTask('${esc(code)}')"
        title="Open ${esc(t ? t.name : code)} in the Editor"${on ? ' aria-current="true"' : ''}>
      <span class="pos-task-room">${esc(t ? t.room : '')}</span>
      <span class="pos-task-name">${esc(t ? t.name : code)}</span>
      <span class="pos-task-code">${esc(code)}</span>
    </button>`;
  };
  const body = cats.map(c => {
    const lines = byCat[c].sort((a, b) => Math.abs(b.amt) - Math.abs(a.amt));
    const sub = lines.reduce((x, L) => x + L.amt, 0);
    return `<div class="pos-cat"><span>${esc(c)}</span><span class="pos-cat-amt">${artMoney(sub)}</span></div>`
      + lines.map(L => {
        // Lit while its product line is the page on show, or its task is.
        const key = _poLineKey(L), jk = key.replace(/'/g, "\\'");
        const onLine = workMode === 'shop' && selId == null && selLineKey && selLineKey === _poProductLineKey(L);
        const on = onLine ? (poSel == null || poSel === key) : (workMode === 'shop' && L.tasks.indexOf(selCode) !== -1);
        return `<div class="pos-line${on ? ' is-on' : ''}" role="button" tabindex="0"
            onclick="poSideProduct('${esc(jk)}')" title="Open this product in the Editor"
            onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();poSideProduct('${esc(jk)}');}">
          <div class="pos-line-thumb sec-taskcard-product-thumb">${L.image
            ? `<img src="${esc(L.image)}" alt="" loading="lazy" onerror="this.replaceWith(document.createRange().createContextualFragment(_PO_THUMB_SVG))">`
            : _PO_THUMB_SVG}</div>
          <div class="pos-line-main">
            <div class="pos-line-top">
              <span class="pos-line-name">${esc([L.brand, L.product].filter(Boolean).join(' ').trim() || 'Product')}</span>
            </div>
            <div class="pos-line-sub">${o.cancel ? '−' : ''}${esc(qtyTxt(L))} × ${artMoney(L.price)}${L.sku ? ' · SKU ' + esc(L.sku) : ''}${L.tenantAmt > 0
              ? ' · <span class="pos-line-res">Resident responsible</span>' : ''}</div>
            <div class="pos-tasks">${L.tasks.map(taskChip).join('')}</div>
          </div>
          <!-- The decision sits where the scope list puts it: top right of
               the row, the figure under it. -->
          <div class="pos-line-r">
            ${o.draft ? `<div class="pos-line-ap" onclick="event.stopPropagation()">${_poLineCtrl(o, L)}</div>` : ''}
            <span class="pos-line-amt">${artMoney(L.amt)}</span>
          </div>
        </div>`;
      }).join('');
  }).join('');
  const orig = o.cancel ? _poOrderById(o.of) : null;
  return `<div class="pos-bar">
      <button type="button" class="pos-back" onclick="closePoSide()" title="Back to the scope list">${_POS_BACK}Scope</button>
      <span class="pos-bar-t">${o.draft ? 'Current purchase order' : 'Latest purchase order'} · ${esc(o.docId)}</span>
    </div>
    <div class="pos-scroll">
      <div class="pos-head">
        <div class="pos-eyebrow">${o.cancel ? 'Order cancellation' : 'Purchase order'}</div>
        <div class="pos-title">${esc(o.supName)}</div>
        <div class="pos-meta">
          ${o.draft ? '' : `<span class="po-status ${_poStatusCls(o.status)}">${esc(o.status)}</span>
          <span>Approved${o.approvedAt ? ' ' + esc(o.approvedAt) : ''}</span>`}
          <span>From ${esc(o.srcLabel)}</span>
          <span>Prepared ${esc(o.date)}</span>
        </div>
        <div class="pos-ship">Ship to: ${esc(_PO_SHIP_TO)}</div>
        ${orig ? `<div class="pos-note is-cancel">Cancels part of ${esc(orig.docId)} (${esc(orig.name)}).</div>` : ''}
        <div class="pos-note">Pick a product or a task to open it in the Editor.</div>
      </div>
      ${_poDraftBarHtml(o)}
      ${body}
      <div class="pos-foot">
        <span>Order amount<span class="pos-foot-sub">${o.lines.length} product${o.lines.length === 1 ? '' : 's'} · at cost</span></span>
        <span class="pos-foot-amt${o.amt < 0 ? ' is-neg' : ''}">${artMoney(o.amt)}</span>
      </div>
    </div>`;
}


