/* ════════════ SHOPPING CART ════════════
   ShopwithKai_Cart.html only (window.__KAI_SHOP_CART). Ported from the cart
   drawer in ProjectReview_ScopePanel_ShopEdit.html, adapted to the MVP's
   product types: every product row — the one a type has chosen, and each of
   its other products — carries "Add to cart". The cart button in the work
   header opens a drawer on the right listing what's in it, grouped by
   department, with quantity, unit price, supplier and stock, a way back to
   the product type, and the total.

   A cart line is a snapshot taken when it's added (name, price, supplier,
   quantity, where it's for), so the drawer reads the same whatever the scope
   list is grouped by. Kept in localStorage so a reload doesn't empty it. */
const SHOP_CART = !!window.__KAI_SHOP_CART;
document.documentElement.classList.toggle('kai-shop-cart', SHOP_CART);

const _CART_KEY = 'kai.shopCart.v1';
let _scLines = [];          // [{key, sku, brand, name, img, unit, price, supplier, stock, qty, dept, line, lineKey, taskIds}]
let _scOpen = false;
const _cartSnap = {};        // key → the snapshot a row would add, filled as rows render

(function(){
  if(!SHOP_CART) return;
  try { const v = JSON.parse(localStorage.getItem(_CART_KEY) || '[]'); if(Array.isArray(v)) _scLines = v; } catch(e){}
})();
function _cartSave(){ try { localStorage.setItem(_CART_KEY, JSON.stringify(_scLines)); } catch(e){} }
function _cartArg(s){ return esc(String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")); }
function _cartFind(key){ return _scLines.find(c => c.key === key); }
function shopCartCount(){ return _scLines.length; }
function shopCartTotal(){ return _scLines.reduce((a, c) => a + c.qty * c.price, 0); }
const _cartRound = n => Math.round(n * 100) / 100;

/* What adding product x from line l would put in the cart. The chosen
   product brings the quantity its tasks already carry; another product
   brings what the type's tasks need between them (whatever is picked now),
   so it can stand in for the chosen one. */
function _cartSnapshot(l, x, chosen){
  let price = x.price || 0, supplier = '', stock = 'in';
  try { const o = _lnpOffer(l, x).offer; price = o.price; supplier = o.supplier || ''; stock = o.stock || 'in'; } catch(e){}
  const rows = l.items.flatMap(t => _lineTaskPicked(l, t).map(h => ({t, h})));
  const mine = rows.filter(r => r.h.p.sku === x.sku);
  const use = chosen && mine.length ? mine : rows;
  const qty = _cartRound(use.reduce((a, r) => a + _num(r.h.p.qty), 0)) || 1;
  // The chosen product costs what its tasks carry it at — the rate its row
  // shows — so the cart agrees with the materials cost above it.
  if(chosen && mine.length){
    const cost = mine.reduce((a, r) => a + _num(r.h.p.qty) * _num(r.h.p.parts), 0);
    if(qty && cost) price = cost / qty;
  }
  const taskIds = [...new Set((chosen && mine.length ? mine.map(r => r.t) : l.items).map(t => t.id))];
  return {
    key: `${l.key}|${x.sku}`, sku: x.sku, brand: x.brand || '', name: x.name || x.sku,
    img: (typeof shopProductImg === 'function' && shopProductImg(x)) || '', unit: x.unit || 'ea',
    price, supplier, stock, qty, dept: l.dept, line: l.name || String(l.key).split('|').pop(),
    lineKey: l.key, taskIds
  };
}

/* The link under a product's name. In the cart already: says so, and opens it. */
function shopCartLinkHtml(l, x, chosen){
  if(!SHOP_CART || !l || !x) return '';
  const snap = _cartSnapshot(l, x, chosen);
  _cartSnap[snap.key] = snap;
  const k = _cartArg(snap.key);
  const bag = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 5h11l-1 9h-9z"/><path d="M5.5 7V4.5a2.5 2.5 0 0 1 5 0V7"/></svg>';
  if(_cartFind(snap.key)){
    return `<button type="button" class="sc-add is-in" onclick="event.stopPropagation();shopCartOpen()" title="Open the cart">${bag}In cart</button>`;
  }
  return `<button type="button" class="sc-add" onclick="event.stopPropagation();shopCartAdd('${k}')" title="Add ${esc(snap.brand)} ${esc(snap.name)} to the cart">${bag}Add to cart</button>`;
}

function shopCartAdd(key){
  const snap = _cartSnap[key]; if(!snap) return;
  const have = _cartFind(key);
  if(have) have.qty = _cartRound(have.qty + snap.qty);
  else _scLines.push(Object.assign({}, snap));
  _cartSave();
  _cartRefresh(true);
  if(typeof toast === 'function') toast(`Added ${snap.brand ? snap.brand + ' ' : ''}${snap.name} to the cart`);
}
function shopCartRemove(key){
  const i = _scLines.findIndex(c => c.key === key); if(i < 0) return;
  _scLines.splice(i, 1);
  _cartSave();
  _cartRefresh();
}
function shopCartSetQty(key, v){
  const c = _cartFind(key); if(!c) return;
  const n = _cartRound(parseFloat(String(v).replace(/[^0-9.]/g, '')));
  if(!(n > 0)){ shopCartRemove(key); return; }
  c.qty = n;
  _cartSave();
  _cartRefresh();
}
function shopCartBump(key, d){
  const c = _cartFind(key); if(!c) return;
  // Whole steps: 13.5 goes up to 14 and down to 13.
  shopCartSetQty(key, d > 0 ? Math.floor(c.qty) + 1 : Math.ceil(c.qty) - 1);
}
function shopCartClear(){ _scLines = []; _cartSave(); _cartRefresh(); }

// Every chosen product in the job, in one go — the empty cart's shortcut.
function _cartChosenAll(){
  if(typeof groupTasks !== 'function' || typeof deptLines !== 'function') return [];
  const out = [];
  groupTasks(TASKS).forEach(g => deptLines(g.items).forEach(l => {
    const skus = [...new Set(l.items.flatMap(t => _lineTaskPicked(l, t)).map(h => h.p.sku).filter(Boolean))];
    skus.forEach(s => {
      const x = (typeof deptLinePool === 'function' && deptLinePool(l).find(p => p.sku === s)) || (typeof catalogFind === 'function' ? catalogFind(s) : null);
      if(x) out.push(_cartSnapshot(l, x, true));
    });
  }));
  return out;
}
function shopCartAddAllChosen(){
  const all = _cartChosenAll().filter(s => !_cartFind(s.key));
  all.forEach(s => _scLines.push(s));
  _cartSave();
  _cartRefresh();
  if(typeof toast === 'function') toast(all.length ? `Added ${all.length} chosen product${all.length === 1 ? '' : 's'} to the cart` : 'Every chosen product is already in the cart');
}

// Back to where a line came from: its product type under Materials.
function shopCartGoto(key){
  const c = _cartFind(key); if(!c) return;
  shopCartClose();
  if(typeof goUpMaterials === 'function') goUpMaterials(c.dept, c.lineKey);
}
function shopCartCheckout(){
  if(!_scLines.length) return;
  const n = _scLines.length, sup = new Set(_scLines.map(c => c.supplier).filter(Boolean)).size;
  shopCartClear();
  shopCartClose();
  if(typeof toast === 'function') toast(`Purchase order drafted · ${n} product${n === 1 ? '' : 's'} from ${sup} supplier${sup === 1 ? '' : 's'}`);
}

/* ── Drawer ── */
function _cartHost(){
  let el = document.getElementById('shopCart');
  if(el) return el;
  const scrim = document.createElement('div');
  scrim.id = 'shopCartScrim';
  scrim.onclick = shopCartClose;
  el = document.createElement('aside');
  el.id = 'shopCart';
  el.setAttribute('aria-label', 'Shopping cart');
  document.body.appendChild(scrim);
  document.body.appendChild(el);
  return el;
}
function shopCartOpen(){
  if(!SHOP_CART) return;
  _scOpen = true;
  const el = _cartHost();
  shopCartRender();
  void el.offsetWidth;
  document.getElementById('shopCartScrim').classList.add('open');
  el.classList.add('open');
}
function shopCartClose(){
  _scOpen = false;
  const s = document.getElementById('shopCartScrim'), el = document.getElementById('shopCart');
  if(s) s.classList.remove('open');
  if(el) el.classList.remove('open');
}
document.addEventListener('keydown', e => { if(_scOpen && e.key === 'Escape') shopCartClose(); });

const _CART_X = '<svg viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" stroke-linecap="round"/></svg>';
const _CART_BAG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M4 7.5h16l-1.5 13h-13z"/><path d="M8.5 10V6.5a3.5 3.5 0 0 1 7 0V10"/></svg>';
const _CART_THUMB = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><rect x="3.5" y="4.5" width="17" height="15"/><circle cx="9" cy="10" r="1.8"/><path d="M4 17l5-4.5 3.5 3 3-2.5L20 17"/></svg>';
const _cartMinus = '<svg viewBox="0 0 12 12" fill="none"><path d="M3 6h6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
const _cartPlus = '<svg viewBox="0 0 12 12" fill="none"><path d="M6 3v6M3 6h6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';

function shopCartRender(){
  if(!_scOpen) return;
  const el = _cartHost();
  const money = n => typeof shopMoney === 'function' ? shopMoney(n) : '$' + n.toFixed(2);
  if(!_scLines.length){
    const chosen = _cartChosenAll().length;
    el.innerHTML = `
      <div class="sc-head">
        <div><div class="sc-eyebrow">Shopping cart</div><div class="sc-title">Your cart is empty</div></div>
        <button class="fly-close" onclick="shopCartClose()" aria-label="Close">${_CART_X}</button>
      </div>
      <div class="sc-empty">
        ${_CART_BAG}
        <div>Add products from a product type — its chosen product, or any of the other products it could be.</div>
        ${chosen ? `<button type="button" class="sc-btn" onclick="shopCartAddAllChosen()">Add all ${chosen} chosen products</button>` : ''}
      </div>`;
    return;
  }
  const total = shopCartTotal();
  const sups = [...new Set(_scLines.map(c => c.supplier).filter(Boolean))];
  const depts = [];
  _scLines.forEach(c => { if(!depts.includes(c.dept)) depts.push(c.dept); });
  const stockTxt = c => typeof _supStockFor === 'function' ? _supStockFor(c.supplier, c.stock) : (c.stock === 'out' ? 'Out of stock' : c.stock === 'low' ? 'Low stock' : 'In stock');
  const supName = id => typeof supplierName === 'function' ? supplierName(id) : id;
  const item = c => {
    const k = _cartArg(c.key);
    return `<div class="sc-item${c.stock === 'out' ? ' is-out' : ''}">
      <div class="sc-item-thumb">${c.img ? `<img src="${esc(c.img)}" alt="" loading="lazy">` : _CART_THUMB}</div>
      <div class="sc-item-mid">
        <span class="sc-item-brand">${esc(c.brand)}</span>
        <span class="sc-item-name" title="${esc(c.name)}">${esc(c.name)}</span>
        <span class="sc-item-meta">${money(c.price)} / ${esc(c.unit)}${c.supplier ? ` · ${esc(supName(c.supplier))}` : ''}</span>
        <span class="sc-item-stock is-${esc(c.stock || 'in')}">${esc(stockTxt(c))}</span>
        <div class="sc-item-actions">
          <span class="sc-qty">
            <button class="sc-qty-btn" onclick="shopCartBump('${k}',-1)" aria-label="One fewer">${_cartMinus}</button>
            <input class="sc-qty-input" value="${esc(String(c.qty))}" aria-label="Quantity" onchange="shopCartSetQty('${k}',this.value)" onkeydown="if(event.key==='Enter')this.blur()">
            <button class="sc-qty-btn" onclick="shopCartBump('${k}',1)" aria-label="One more">${_cartPlus}</button>
          </span>
          <span class="sc-item-unit">${esc(c.unit)}</span>
          <button type="button" class="sc-item-task" onclick="shopCartGoto('${k}')" title="Open this product type">${esc(c.line)} · ${c.taskIds.length} ${c.taskIds.length === 1 ? 'task' : 'tasks'}</button>
          <button type="button" class="sc-item-remove" onclick="shopCartRemove('${k}')">Remove</button>
        </div>
      </div>
      <div class="sc-item-right"><span class="sc-item-total">${money(c.qty * c.price)}</span></div>
    </div>`;
  };
  el.innerHTML = `
    <div class="sc-head">
      <div>
        <div class="sc-eyebrow">Shopping cart</div>
        <div class="sc-title">${_scLines.length} ${_scLines.length === 1 ? 'product' : 'products'}</div>
        <div class="sc-summary">
          <span class="pill">${depts.length} ${depts.length === 1 ? 'department' : 'departments'}</span>
          <span class="pill">${sups.length} ${sups.length === 1 ? 'supplier' : 'suppliers'}</span>
          ${_scLines.some(c => c.stock === 'out') ? '<span class="pill over">Out of stock items</span>' : ''}
        </div>
      </div>
      <button class="fly-close" onclick="shopCartClose()" aria-label="Close">${_CART_X}</button>
    </div>
    <div class="sc-body">
      ${depts.map(d => {
        const its = _scLines.filter(c => c.dept === d);
        return `<div class="sc-group">
          <div class="sc-group-hdr"><span class="sc-group-name">${esc(d)}</span><span class="sc-group-meta">${its.length} ${its.length === 1 ? 'item' : 'items'} · ${money(its.reduce((a, c) => a + c.qty * c.price, 0))}</span></div>
          ${its.map(item).join('')}
        </div>`;
      }).join('')}
    </div>
    <div class="sc-foot">
      <div class="sc-foot-row"><span class="gl">Subtotal</span><span class="gv">${money(total)}</span></div>
      <div class="sc-foot-note">Tax and delivery are set by each supplier when the order is placed.</div>
      <div class="sc-foot-actions">
        <button type="button" class="sc-btn" onclick="shopCartClose()">Keep shopping</button>
        <button type="button" class="sc-btn primary" onclick="shopCartCheckout()">Create purchase order</button>
      </div>
      <button type="button" class="sc-clear" onclick="shopCartClear()">Empty cart</button>
    </div>`;
}

/* ── Cart button in the work header, beside Expand ── */
function _cartHdrBtnHtml(){
  const n = shopCartCount();
  return `<button type="button" class="shop-cart-hbtn${n ? ' has-items' : ''}" onclick="shopCartOpen()" title="Open the cart" aria-label="Cart, ${n} ${n === 1 ? 'product' : 'products'}">
    ${_CART_BAG}<span>Cart</span><span class="n">${n}</span></button>`;
}
function _cartPaintHdr(){
  const hdr = document.getElementById('workHdr'); if(!hdr) return;
  const old = hdr.querySelector('.shop-cart-hbtn');
  const html = _cartHdrBtnHtml();
  if(old){ old.outerHTML = html; return; }
  const exp = hdr.querySelector('.wmode-expand');
  if(exp) exp.insertAdjacentHTML('beforebegin', html); else hdr.insertAdjacentHTML('beforeend', html);
}
function _cartRefresh(bump){
  _cartPaintHdr();
  if(bump){
    const b = document.querySelector('.shop-cart-hbtn');
    if(b){ b.classList.remove('is-bump'); void b.offsetWidth; b.classList.add('is-bump'); }
  }
  if(_scOpen) shopCartRender();
  // Rows say "In cart" once they are.
  if(typeof renderShop === 'function') renderShop();
  else if(typeof renderWork === 'function') renderWork();
}
if(SHOP_CART && typeof renderWorkHdr === 'function'){
  const _origRenderWorkHdr = renderWorkHdr;
  renderWorkHdr = function(){ const r = _origRenderWorkHdr.apply(this, arguments); _cartPaintHdr(); return r; };
}
