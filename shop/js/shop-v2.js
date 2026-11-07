/* ════════════ SHOP WITH KAI v2 · SCOPE-TIME SHOPPING ════════════
   ShopwithKai_v2.html only (window.__KAI_SHOP_V2). The task editor stays a
   form; shopping happens in a panel that looks like a store.

   1. Product tiles. In the Editor, a task's product decisions show as
      thumbnail tiles under its header: blank (dashed, "Choose product") while
      the task still needs one, or the chosen product's picture, name,
      supplier and price with "Change". Beside the task's title, a count:
      "1 of 1 product chosen".
   2. The shopping panel. A blank tile or "Change" opens a panel over the work
      area: plain light background, big product pictures in a grid, and a
      header "Shopping for: Kitchen › Light fixture · 3 needed" with Done.
   3. What it shows. With a task allowance: "Allowance $X · $Y left", and the
      products that fit marked. Without: Lower / Middle / Higher price groups.
      Each card has its stock tag (In stock nearby / Ships / Unavailable);
      unavailable products are kept, sorted last. Search (starting from the
      task's own words) and a supplier filter at the top.
   4. One product, several places. Once a product is chosen, "Also needed in"
      lists the scope's other tasks of the same product type, each with a
      checkbox, and fills every ticked one at once.
   5. Mood board (placeholder). A header toggle splits the panel: products on
      one side, a grid of mock inspiration pictures on the other. No matching.
   6. Back to the form. Done closes the panel; the tile shows the pick.

   Choosing goes through the same product-row functions the product type
   page uses (_ensureLineProductRow, _swapTaskProduct, recomputeOption…), so
   every cost, total and the Record move as they do there. Nothing here
   calculates a cost of its own beyond showing price × quantity. */
const SHOP_V2 = !!window.__KAI_SHOP_V2;
document.documentElement.classList.toggle('kai-shop-v2', SHOP_V2);

let v2Shop = null;   // {taskId, fromSku, q, sup, picked} while the panel is open

/* ── the task's product type, and what it carries ── */
function _v2Line(t){
  if(!t || typeof taskLine !== 'function' || typeof deptLines !== 'function') return null;
  const tl = taskLine(t), key = `${tl.dept}|${tl.line}`;
  const l = deptLines(TASKS).find(x => x.key === key) || null;
  if(!l || (typeof NO_PRODUCT_DEPT !== 'undefined' && l.dept === NO_PRODUCT_DEPT)) return null;
  return l;
}
function _v2LineName(l){ return String(l.key).split('|').pop(); }
// "Light fixtures" → "Light fixture", "Vanities" → "Vanity"; names with an
// "&" or already singular are left alone.
function _v2Need(l){
  const n = _v2LineName(l);
  if(/&|\(/.test(n)) return n;
  if(/ies$/i.test(n)) return n.replace(/ies$/i, 'y');
  if(/[^s]s$/i.test(n)) return n.replace(/s$/i, '');
  return n;
}
function _v2Picked(l, t){
  const by = new Map();
  _lineTaskPicked(l, t).forEach(h => {
    const k = h.p.sku;
    const c = by.get(k) || {sku:k, qty:0, cost:0, supplier:h.p.supplier, rate:_num(h.p.parts)};
    c.qty += _num(h.p.qty); c.cost += _num(h.p.qty) * _num(h.p.parts);
    by.set(k, c);
  });
  return [...by.values()];
}
function _v2Cat(l, sku){ return (typeof _lineCat === 'function' && _lineCat(l, sku)) || (typeof catalogFind === 'function' ? catalogFind(sku) : null); }
// How many the task needs: what it already carries, else what it asks for.
function _v2NeedQty(t, l){
  const have = _lineTaskPicked(l, t).reduce((a, h) => a + _num(h.p.qty), 0);
  if(have) return have;
  const pool = deptLinePool(l);
  return _num(_taskNeedQty(t, pool[0] || null)) || 1;
}
function _v2Unit(l){ const p = deptLinePool(l)[0]; return (p && p.unit) || 'ea'; }
// A product's real picture, if the catalogue has one; otherwise none, and
// the frame shows a plain solid placeholder.
function _v2Img(x){ return (x && x.image) || ''; }
const _V2_THUMB = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true"><rect x="3.5" y="4.5" width="17" height="15"/><circle cx="9" cy="10" r="1.8"/><path d="M4 17l5-4.5 3.5 3 3-2.5L20 17"/></svg>';
const _v2Arg = s => esc(String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'"));
const _v2Money = n => typeof shopMoney === 'function' ? shopMoney(n) : '$' + Number(n).toFixed(2);
const _v2Fmt = n => (Math.round(n * 100) / 100).toLocaleString('en-US');

/* ── 1 · tiles in the Editor ── */
function _v2TilesHtml(t){
  const l = _v2Line(t); if(!l) return '';
  const where = `${esc(t.room)} › ${esc(_v2Need(l))}`;
  const picked = _v2Picked(l, t);
  const tiles = picked.map(c => {
    const cat = _v2Cat(l, c.sku) || {name:c.sku, brand:'', unit:_v2Unit(l)};
    const img = _v2Img(cat);
    return `<div class="v2-tile is-filled">
      <button type="button" class="v2-tile-img" onclick="v2OpenShop(${t.id},'${_v2Arg(c.sku)}')" title="Change this product">${img ? `<img src="${esc(img)}" alt="" loading="lazy">` : ''}</button>
      <div class="v2-tile-body">
        <span class="v2-tile-where">${where}</span>
        <span class="v2-tile-brand">${esc(cat.brand || '')}</span>
        <span class="v2-tile-name" title="${esc(cat.name)}">${esc(cat.name)}</span>
        <span class="v2-tile-sup">${typeof supplierLogoHtml === 'function' ? supplierLogoHtml(c.supplier) : ''}${esc(typeof supplierName === 'function' ? supplierName(c.supplier) : c.supplier || '')}</span>
        <span class="v2-tile-price">${_v2Fmt(c.qty)} ${esc(cat.unit || 'ea')} × ${_v2Money(c.rate)} · <b>${_v2Money(c.cost)}</b></span>
        <button type="button" class="v2-tile-act" onclick="v2OpenShop(${t.id},'${_v2Arg(c.sku)}')">Change</button>
      </div>
    </div>`;
  });
  if(!picked.length){
    tiles.push(`<button type="button" class="v2-tile is-blank" onclick="v2OpenShop(${t.id})">
      <span class="v2-tile-img">${_V2_THUMB}</span>
      <span class="v2-tile-body">
        <span class="v2-tile-where">${where}</span>
        <span class="v2-tile-qty">${_v2Fmt(_v2NeedQty(t, l))} ${esc(_v2Unit(l))} needed</span>
        <span class="v2-tile-act">Choose product</span>
      </span>
    </button>`);
  }
  return `<div class="pgd-hdr-box v2-tiles-sec">
    <div class="v2-tiles-hd"><span class="v2-tiles-t">Products</span><span class="v2-tiles-sub">${picked.length ? 'Chosen for this task' : 'This task needs a product'}</span></div>
    <div class="v2-tiles">${tiles.join('')}</div>
  </div>`;
}
function _v2CountHtml(t){
  const l = _v2Line(t); if(!l) return '';
  const n = _v2Picked(l, t).length, of = Math.max(1, n);
  return `<span class="v2-count${n ? ' is-done' : ''}">${n} of ${of} ${of === 1 ? 'product' : 'products'} chosen</span>`;
}
function _v2PaintEditor(){
  const wb = document.getElementById('workBody'); if(!wb) return;
  const hdr = wb.querySelector('.sec-taskhdr');
  const t = (typeof selId !== 'undefined' && selId != null) ? TASKS.find(x => x.id === selId) : null;
  if(!hdr || !t) return;
  const row = hdr.querySelector('.sec-taskhdr-title-row');
  if(row && !row.querySelector('.v2-count')) row.insertAdjacentHTML('beforeend', _v2CountHtml(t));
  if(!wb.querySelector('.v2-tiles-sec')) hdr.insertAdjacentHTML('afterend', _v2TilesHtml(t));
}

/* ── 2 · the shopping panel ── */
function v2OpenShop(taskId, fromSku){
  const t = TASKS.find(x => x.id === taskId); if(!t || !_v2Line(t)) return;
  v2Shop = {taskId, fromSku: fromSku || null, q: String(t.name || '').toLowerCase(), sup: 'all', picked: null, mood: _v2MoodPref, fresh: true};
  _v2RenderShop();
}
function v2CloseShop(){
  v2Shop = null;
  const el = document.getElementById('v2Shop'); if(el) el.remove();
  if(typeof renderAll === 'function') renderAll();
}
document.addEventListener('keydown', e => { if(v2Shop && e.key === 'Escape') v2CloseShop(); });
function v2ShopSearch(v){ if(!v2Shop) return; v2Shop.q = v; _v2RenderGrid(); }
function v2ShopSup(s){ if(!v2Shop) return; v2Shop.sup = s; _v2RenderShop(); }
let _v2MoodPref = false;   // the toggle stays as left between openings
function v2ShopMood(on){ if(!v2Shop) return; v2Shop.mood = _v2MoodPref = !!on; _v2RenderShop(); }

/* ── 5 · mood board (placeholder) ──
   Mock inspiration pictures beside the products. No matching logic yet —
   the tiles are drawn, not chosen. */
const _V2_MOOD = [
  ['Warm minimal', '#E9DFD0', '#B79E80', '#5C4A3A'], ['Soft daylight', '#F2EEE6', '#D9D2C3', '#8E8676'],
  ['Brushed nickel', '#E3E5E7', '#A9AEB3', '#4D5257'], ['Walnut & white', '#F4F2EE', '#7A5236', '#2E2620'],
  ['Sage accents', '#E8ECE3', '#9AA88A', '#4E5A43'], ['Matte black', '#ECEAE6', '#2B2B2B', '#7D7A73'],
  ['Coastal calm', '#E7EEF2', '#9FB6C4', '#3E5872'], ['Clay & linen', '#F1E7DE', '#C9967A', '#6B4434'],
];
function _v2MoodArt(i){
  const [, bg, mid, dk] = _V2_MOOD[i];
  const v = [
    `<rect width="160" height="120" fill="${bg}"/><rect x="0" y="84" width="160" height="36" fill="${mid}" opacity=".55"/><rect x="18" y="30" width="44" height="54" fill="#fff" opacity=".6"/><rect x="92" y="52" width="50" height="32" fill="${dk}" opacity=".85"/><circle cx="117" cy="30" r="10" fill="${mid}"/>`,
    `<rect width="160" height="120" fill="${bg}"/><path d="M0 120V70l40-30 40 30 40-30 40 30v50z" fill="${mid}" opacity=".5"/><rect x="64" y="20" width="32" height="44" fill="#fff" opacity=".7"/><rect x="20" y="88" width="120" height="8" fill="${dk}" opacity=".7"/>`,
    `<rect width="160" height="120" fill="${bg}"/><circle cx="80" cy="46" r="26" fill="${mid}" opacity=".8"/><rect x="40" y="80" width="80" height="22" fill="${dk}" opacity=".8"/><rect x="0" y="102" width="160" height="18" fill="${mid}" opacity=".35"/>`,
    `<rect width="160" height="120" fill="${bg}"/>${[0,1,2,3,4,5,6,7].map(k => `<rect x="${k * 20}" y="0" width="10" height="120" fill="${mid}" opacity=".18"/>`).join('')}<rect x="30" y="40" width="100" height="56" fill="${dk}" opacity=".75"/><rect x="40" y="50" width="36" height="36" fill="${bg}" opacity=".6"/>`,
  ][i % 4];
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 120" preserveAspectRatio="xMidYMid slice">${v}</svg>`);
}
function _v2MoodHtml(l){
  return `<aside class="v2s-mood" aria-label="Mood board">
    <div class="v2s-mood-hd"><span class="v2s-mood-t">Mood board</span><span class="v2s-mood-tag">Placeholder</span></div>
    <p class="v2s-mood-note">Inspiration for ${esc(_v2LineName(l).toLowerCase())} in this scope. Matching products to the board comes later.</p>
    <div class="v2s-mood-grid">${_V2_MOOD.map((m, i) => `<figure class="v2s-mood-tile${i % 3 === 0 ? ' is-tall' : ''}"><img src="${_v2MoodArt(i)}" alt=""><figcaption>${esc(m[0])}</figcaption></figure>`).join('')}</div>
  </aside>`;
}

// Everything this product type could be: its own pool, plus the rest of the
// catalogue in the same sections.
function _v2Pool(l){
  const pool = deptLinePool(l);
  const secs = new Set(pool.map(x => x.section || (catalogFind(x.sku) || {}).section).filter(Boolean));
  const seen = new Set(), out = [];
  pool.concat(catalogAll().filter(p => secs.has(p.section))).forEach(p => {
    const c = catalogFind(p.sku) || p;
    if(seen.has(c.sku)) return; seen.add(c.sku); out.push(c);
  });
  return out;
}
// The offer the panel shows for a product: the filtered supplier's, else the
// one the line buys it from.
function _v2Offer(l, x, sup){
  const offers = typeof offersForSku === 'function' ? offersForSku(x.sku) : [];
  if(sup && sup !== 'all') return offers.find(o => o.supplier === sup) || null;
  const s = lineSupplierFor(l, x.sku);
  return offers.find(o => o.supplier === s) || offers[0] || {supplier:'', price:x.price, stock:x.stock || 'in'};
}
function _v2StockOf(o){
  const r = typeof shopStockRank === 'function' ? shopStockRank(o) : (o && o.stock === 'out' ? 2 : 0);
  return r === 0 ? {cls:'near', t:'In stock nearby', r} : r === 1 ? {cls:'ships', t:'Ships', r} : {cls:'none', t:'Unavailable', r};
}
// Search: any of the words, matched on a short stem so "lighting" finds
// "Light fixtures" and "vanity" finds "Vanities".
function _v2Match(x, l, q){
  const stop = new Set(['and', 'the', 'with', 'for', 'new', 'replace', 'install']);
  const terms = String(q || '').toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 2 && !stop.has(w));
  if(!terms.length) return true;
  const hay = `${x.brand} ${x.name} ${x.sku} ${CATALOG_SECTION_LABEL[x.section] || ''} ${_v2LineName(l)}`.toLowerCase();
  return terms.some(w => hay.includes(w.length > 5 ? w.slice(0, Math.max(4, w.length - 3)) : w));
}

function _v2Ctx(){
  if(!v2Shop) return null;
  const t = TASKS.find(x => x.id === v2Shop.taskId); if(!t) return null;
  const l = _v2Line(t); if(!l) return null;
  return {t, l, need: _v2NeedQty(t, l), unit: _v2Unit(l), picked: _v2Picked(l, t)};
}
function _v2RenderShop(){
  const c = _v2Ctx(); if(!c){ v2CloseShop(); return; }
  const work = document.querySelector('.work'); if(!work) return;
  let el = document.getElementById('v2Shop');
  if(!el){
    el = document.createElement('section');
    el.id = 'v2Shop';
    el.setAttribute('aria-label', 'Shopping');
    // Fade in on opening only; a redraw behind it rebuilds it without one.
    if(v2Shop.fresh){ el.classList.add('is-entering'); v2Shop.fresh = false; }
    work.appendChild(el);
  }
  const hdr = document.getElementById('workHdr');
  el.style.top = hdr ? (hdr.offsetTop + hdr.offsetHeight) + 'px' : '0px';
  const {t, l, need, unit} = c;
  const allow = typeof taskAllowance === 'function' ? taskAllowance(t) : null;
  const pool = _v2Pool(l);
  const sups = [...new Set(pool.flatMap(x => (offersForSku(x.sku) || []).map(o => o.supplier)))];
  const supName = s => typeof supplierName === 'function' ? supplierName(s) : s;
  let allowHtml = '';
  if(allow != null){
    const actual = typeof taskAllowActual === 'function' ? taskAllowActual(t) : 0;
    const left = allow - actual;
    allowHtml = `<div class="v2-allow"><span class="v2-allow-k">Allowance</span> <b>${_v2Money(allow)}</b> <span class="v2-allow-sep">·</span> <b class="${left < 0 ? 'is-over' : ''}">${left < 0 ? _v2Money(-left) + ' over' : _v2Money(left) + ' left'}</b></div>`;
  }
  el.innerHTML = `
    <div class="v2s-head">
      <div class="v2s-head-l">
        <span class="v2s-eyebrow">Shopping for</span>
        <h2 class="v2s-title">${esc(t.room)} › ${esc(_v2Need(l))} <span class="v2s-need">· ${_v2Fmt(need)} ${esc(unit)} needed</span></h2>
        ${allowHtml}
      </div>
      <div class="v2s-head-r">
      <label class="v2s-mood-tg"><input type="checkbox" ${v2Shop.mood ? 'checked' : ''} onchange="v2ShopMood(this.checked)"><span class="sw" aria-hidden="true"></span>Show mood board</label>
      <button type="button" class="v2s-done" onclick="v2CloseShop()"><svg viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M8.5 3 4.5 7l4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>Done</button>
      </div>
    </div>
    <div class="v2s-body${v2Shop.mood ? ' has-mood' : ''}"><div class="v2s-main">
    <div class="v2s-tools">
      <label class="v2s-search"><svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="7" cy="7" r="4.5" stroke="currentColor" stroke-width="1.4"/><path d="M10.5 10.5L14 14" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
        <input type="search" value="${esc(v2Shop.q)}" placeholder="Search ${esc(_v2LineName(l).toLowerCase())}" oninput="v2ShopSearch(this.value)" aria-label="Search products"></label>
      <div class="v2s-sups" role="group" aria-label="Supplier">
        <button type="button" class="${v2Shop.sup === 'all' ? 'on' : ''}" onclick="v2ShopSup('all')">All suppliers</button>
        ${sups.map(s => `<button type="button" class="${v2Shop.sup === s ? 'on' : ''}" onclick="v2ShopSup('${_v2Arg(s)}')">${typeof supplierLogoHtml === 'function' ? supplierLogoHtml(s) : ''}${esc(supName(s))}</button>`).join('')}
      </div>
    </div>
    <div class="v2s-also" id="v2sAlso"></div>
    <div class="v2s-grid-wrap" id="v2sGrid"></div>
    </div>${v2Shop.mood ? _v2MoodHtml(l) : ''}</div>`;
  _v2RenderAlso();
  _v2RenderGrid();
}
function _v2CardHtml(c, x, o, allowLeft){
  const {t, l, need, picked} = c;
  const st = _v2StockOf(o);
  const img = _v2Img(x);
  const on = picked.some(p => p.sku === x.sku);
  const cost = o.price * need;
  const fits = allowLeft != null && cost <= allowLeft;
  return `<article class="v2-card${on ? ' is-on' : ''}${st.r === 2 ? ' is-out' : ''}">
    <button type="button" class="v2-card-img" onclick="openFly(${t.id},'${_v2Arg(x.sku)}',event)" title="Product details">${img ? `<img src="${esc(img)}" alt="" loading="lazy">` : ''}
      ${fits ? '<span class="v2-fit">Fits allowance</span>' : ''}</button>
    <div class="v2-card-body">
      <span class="v2-card-brand">${esc(x.brand || '')}</span>
      <span class="v2-card-name" title="${esc(x.name)}">${esc(x.name)}</span>
      <span class="v2-card-sup">${typeof supplierLogoHtml === 'function' ? supplierLogoHtml(o.supplier) : ''}${esc(typeof supplierName === 'function' ? supplierName(o.supplier) : o.supplier || '')}</span>
      <span class="v2-card-row"><span class="v2-card-price">${_v2Money(o.price)}<span> / ${esc(x.unit || 'ea')}</span></span><span class="v2-stock is-${st.cls}">${st.t}</span></span>
      <span class="v2-card-total">${_v2Fmt(need)} ${esc(x.unit || 'ea')} for this task · ${_v2Money(cost)}</span>
      ${on ? `<span class="v2-card-cta is-on">Chosen ✓</span>`
        : `<button type="button" class="v2-card-cta" onclick="v2Choose('${_v2Arg(x.sku)}')"${st.r === 2 ? ' disabled title="Unavailable from this supplier"' : ''}>${v2Shop.fromSku ? 'Use this instead' : 'Choose'}</button>`}
    </div>
  </article>`;
}
function _v2RenderGrid(){
  const c = _v2Ctx(); const host = document.getElementById('v2sGrid'); if(!c || !host) return;
  const {t, l} = c;
  const sup = v2Shop.sup;
  const items = _v2Pool(l).filter(x => _v2Match(x, l, v2Shop.q))
    .map(x => ({x, o:_v2Offer(l, x, sup)})).filter(r => r.o);
  if(!items.length){ host.innerHTML = `<div class="v2s-empty">No ${esc(_v2LineName(l).toLowerCase())} match “${esc(v2Shop.q)}”${sup !== 'all' ? ` from ${esc(supplierName(sup))}` : ''}.</div>`; return; }
  const rank = r => _v2StockOf(r.o).r === 2 ? 1 : 0;   // unavailable last, never hidden
  const allow = typeof taskAllowance === 'function' ? taskAllowance(t) : null;
  if(allow != null){
    // Room for this product: the allowance less what the task costs without
    // the product being changed.
    const actual = typeof taskAllowActual === 'function' ? taskAllowActual(t) : 0;
    const swapping = v2Shop.fromSku ? (c.picked.find(p => p.sku === v2Shop.fromSku) || {cost:0}).cost : 0;
    const room = allow - actual + swapping;
    const sorted = items.sort((a, b) => rank(a) - rank(b) || a.o.price - b.o.price);
    host.innerHTML = `<div class="v2-grid">${sorted.map(r => _v2CardHtml(c, r.x, r.o, room)).join('')}</div>`;
    return;
  }
  // No allowance: three price choices, a few products each.
  const byPrice = items.slice().sort((a, b) => a.o.price - b.o.price);
  const n = byPrice.length, cut1 = Math.ceil(n / 3), cut2 = Math.ceil(2 * n / 3);
  const groups = [['Lower', byPrice.slice(0, cut1)], ['Middle', byPrice.slice(cut1, cut2)], ['Higher', byPrice.slice(cut2)]].filter(g => g[1].length);
  host.innerHTML = groups.map(([name, g]) => {
    const lo = Math.min(...g.map(r => r.o.price)), hi = Math.max(...g.map(r => r.o.price));
    const sorted = g.sort((a, b) => rank(a) - rank(b) || a.o.price - b.o.price);
    return `<section class="v2-tier"><div class="v2-tier-hd"><span class="v2-tier-t">${name} price</span><span class="v2-tier-r">${lo === hi ? _v2Money(lo) : `${_v2Money(lo)} – ${_v2Money(hi)}`} / ${esc(g[0].x.unit || 'ea')}</span></div>
      <div class="v2-grid">${sorted.map(r => _v2CardHtml(c, r.x, r.o, null)).join('')}</div></section>`;
  }).join('');
}

/* ── choosing ── */
// Put product sku on task t (in place of fromSku when given), bought from the
// supplier filter if one is set — the product type page's own row functions.
function _v2Apply(t, l, sku, fromSku, sup){
  const cat = _v2Cat(l, sku); if(!cat) return null;
  if(sup && sup !== 'all') lineSupplier[`${l.key}|${sku}`] = sup;
  if(fromSku && fromSku !== sku){
    _swapTaskProduct(l, t, fromSku, sku);
    return cat;
  }
  if(_lineTaskPicked(l, t).some(h => h.p.sku === sku)) return cat;
  const h = _ensureLineProductRow(t, cat); if(!h) return null;
  const offer = offersForSku(cat.sku).find(o => o.supplier === lineSupplierFor(l, cat.sku));
  h.p.qty = String(_v2NeedQty(t, l));
  if(offer){ h.p.supplier = offer.supplier; h.p.parts = _fmtDollars(offer.price); }
  if(!optionIsAdded(h.o)) h.o.added = true;
  recomputeOptionFromProducts(t, h.o);
  _syncTaskProduct(t);
  return cat;
}
function v2Choose(sku){
  const c = _v2Ctx(); if(!c) return;
  const cat = _v2Apply(c.t, c.l, sku, v2Shop.fromSku, v2Shop.sup); if(!cat) return;
  v2Shop.fromSku = sku;        // from here on, another pick changes this one
  v2Shop.picked = sku;
  toast(`${cat.brand} ${cat.name} chosen for ${c.t.room} › ${_v2Need(c.l)}`);
  if(typeof renderAll === 'function') renderAll();   // repaints the panel too
}

/* ── 4 · also needed in ──
   Once a product is picked: the scope's other tasks of the same product type,
   each with a checkbox, and one button to fill every ticked one at once. A
   task not yet on this product starts ticked; one already on it is shown as
   done, with no box. */
function _v2AlsoSku(){ const c = _v2Ctx(); return c && (v2Shop.picked || (c.picked[0] && c.picked[0].sku)); }
function _v2AlsoTicks(c, sku){
  // Reset the ticks whenever the product they're for changes.
  if(!v2Shop.also || v2Shop.also.sku !== sku){
    v2Shop.also = {sku, on: new Set(c.l.items.filter(x => x.id !== c.t.id && !_v2Picked(c.l, x).some(p => p.sku === sku)).map(x => x.id))};
  }
  return v2Shop.also.on;
}
function _v2RenderAlso(){
  const c = _v2Ctx(); const host = document.getElementById('v2sAlso'); if(!c || !host) return;
  const {t, l} = c;
  const sku = _v2AlsoSku();
  const others = l.items.filter(x => x.id !== t.id);
  if(!sku || !others.length){ host.innerHTML = ''; host.hidden = true; return; }
  host.hidden = false;
  const cat = _v2Cat(l, sku) || {name:sku, brand:''};
  const ticks = _v2AlsoTicks(c, sku);
  const rows = others.map(o => {
    const has = _v2Picked(l, o);
    const using = has.some(p => p.sku === sku);
    const other = has.find(p => p.sku !== sku);
    const otherCat = other ? _v2Cat(l, other.sku) : null;
    if(using) ticks.delete(o.id);
    const state = using ? '<span class="v2a-state is-on">Using this ✓</span>'
      : other ? `<span class="v2a-state">Replaces ${esc(otherCat ? otherCat.name : other.sku)}</span>`
      : '<span class="v2a-state is-need">Needs a product</span>';
    const box = using ? '<span class="v2a-box is-done" aria-hidden="true">✓</span>'
      : `<input type="checkbox" class="v2a-box" ${ticks.has(o.id) ? 'checked' : ''} onchange="v2AlsoTick(${o.id},this.checked)" aria-label="Use it in ${esc(o.room)} › ${esc(_v2Need(l))}">`;
    return `<label class="v2a-row${using ? ' is-done' : ''}">${box}<span class="v2a-where">${esc(o.room)} › ${esc(_v2Need(l))} · ${_v2Fmt(_v2NeedQty(o, l))}</span>${state}</label>`;
  });
  const n = ticks.size;
  const open = others.filter(o => !_v2Picked(l, o).some(p => p.sku === sku)).length;
  host.innerHTML = `<div class="v2a">
    <div class="v2a-hd"><span class="v2a-t">Also needed in</span><span class="v2a-sub">${open ? `Use ${esc(cat.brand ? cat.brand + ' ' : '')}${esc(cat.name)} in the scope's other ${esc(_v2LineName(l).toLowerCase())} too` : `Every ${esc(_v2Need(l).toLowerCase())} in this scope uses ${esc(cat.name)}`}</span>
      ${open > 1 ? `<button type="button" class="v2a-link" onclick="v2AlsoTickAll(${n === open ? 'false' : 'true'})">${n === open ? 'Clear all' : 'Select all'}</button>` : ''}</div>
    ${rows.join('')}
    ${open ? `<div class="v2a-foot"><button type="button" class="v2a-fill" onclick="v2AlsoFill()"${n ? '' : ' disabled'}>${n ? `Use in ${n} selected ${n === 1 ? 'task' : 'tasks'}` : 'Select tasks to fill'}</button></div>` : ''}
  </div>`;
}
function v2AlsoTick(id, on){ if(!v2Shop || !v2Shop.also) return; on ? v2Shop.also.on.add(id) : v2Shop.also.on.delete(id); _v2RenderAlso(); }
function v2AlsoTickAll(on){
  const c = _v2Ctx(); const sku = _v2AlsoSku(); if(!c || !sku) return;
  const ticks = _v2AlsoTicks(c, sku);
  c.l.items.filter(x => x.id !== c.t.id && !_v2Picked(c.l, x).some(p => p.sku === sku)).forEach(x => on ? ticks.add(x.id) : ticks.delete(x.id));
  _v2RenderAlso();
}
function v2AlsoFill(){
  const c = _v2Ctx(); const sku = _v2AlsoSku(); if(!c || !sku || !v2Shop.also) return;
  const todo = c.l.items.filter(x => v2Shop.also.on.has(x.id) && !_v2Picked(c.l, x).some(p => p.sku === sku));
  if(!todo.length) return;
  todo.forEach(o => { const other = _v2Picked(c.l, o).find(p => p.sku !== sku); _v2Apply(o, c.l, sku, other ? other.sku : null, 'all'); });
  v2Shop.also.on.clear();
  const cat = _v2Cat(c.l, sku);
  toast(`${cat ? cat.brand + ' ' + cat.name : 'Product'} now on ${todo.length} more ${todo.length === 1 ? 'task' : 'tasks'}`);
  if(typeof renderAll === 'function') renderAll();
}

/* ── hooks: repaint after the Editor draws ── */
function _v2StillShopping(){
  return !!v2Shop && selId === v2Shop.taskId && workMode === 'shop' && !selLineKey && !selGroupKey;
}
function _v2Drop(){ v2Shop = null; const el = document.getElementById('v2Shop'); if(el) el.remove(); }
if(SHOP_V2 && typeof renderShop === 'function'){
  const _origRenderShop = renderShop;
  renderShop = function(){
    // Picking anything else in the left panel (another task, a product type,
    // a group) leaves the shopping: the panel closes onto what was picked.
    if(v2Shop && !_v2StillShopping()) _v2Drop();
    const r = _origRenderShop.apply(this, arguments);
    _v2PaintEditor();
    if(v2Shop) _v2RenderShop();
    return r;
  };
}
if(SHOP_V2 && typeof renderWork === 'function'){
  const _origRenderWork = renderWork;
  renderWork = function(){
    if(v2Shop && !_v2StillShopping()) _v2Drop();
    return _origRenderWork.apply(this, arguments);
  };
}
// Leaving the task (another task, a product type, another tab) closes the panel.
if(SHOP_V2 && typeof renderWorkHdr === 'function'){
  const _origHdr = renderWorkHdr;
  renderWorkHdr = function(){
    const r = _origHdr.apply(this, arguments);
    if(v2Shop && !_v2StillShopping()) _v2Drop();
    return r;
  };
}
