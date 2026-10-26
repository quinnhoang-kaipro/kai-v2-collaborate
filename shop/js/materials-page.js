/* ════════════ MATERIALS, ONE DEPARTMENT AT A TIME ════════════
   ShopwithKai_materials.html only (window.__KAI_SHOP_MATERIALS). With the
   scope list on Materials, the Editor shows a department as a shopping list:
   each product line it buys, chosen or still to choose, and the line being
   chosen opened into one card — what it's for, what it has to fit, what the
   choice is matched on, what the allowance leaves for materials, and the
   products that fit, cheapest first, each saying whether it stays in the
   allowance. Save choice puts the product on every task in the line.

   Prices, allowances and labor come from the scope. The objective, the fit
   from capture, the "matched on" reasons and who purchases are prototype
   mock: there is no data for them yet. */
const SHOP_MATERIALS = !!window.__KAI_SHOP_MATERIALS;

// Mock: what the job is optimising for, and what each choice is matched on.
const MTL_OBJECTIVE = 'Design-led';
const MTL_MATCHED = ['Design-led · Premium', 'Safe, functional, clean', 'Durable', 'Timeless', 'Transitional · White and gray', 'Arrives by Oct 30'];
// Mock: what a line has to fit, as the on-site capture measured it.
const MTL_FITS = {
  'Appliance suites': '30 in. range cutout · 36 in. fridge opening · 240V range circuit',
  'Vanities': '48 in. wall · centered drain · 34 in. finished height',
  'Toilets': '12 in. rough-in · elongated bowl',
  'Ceiling fans': '8 ft ceilings · existing fan-rated box',
  'Cabinets': '14 LF run · 34.5 in. base height',
  'Countertops': '2 slabs · 25.5 in. depth',
  'Vinyl plank (LVP)': '320 SF · level subfloor',
  'Tile': '140 SF · floors and wet walls · cement board under',
  'Carpet': '2 bedrooms · 12 ft rolls',
  'Interior doors': '30 in. and 32 in. openings · 80 in. tall · prehung',
  'Light fixtures': 'Standard ceiling boxes · 8 ft ceilings',
  'Exhaust fans': '4 in. duct · 50 CFM minimum for the bath',
  'Garage door openers': '16 ft door · 7 ft tall',
  'Blinds & shades': 'Inside mount · window widths from capture',
  'Door knobs & locks': '2-3/8 in. backset',
  'Smoke & CO detectors': 'Hardwired · interconnected',
  'Closet systems': 'Reach-in closets · 6 ft wide',
  'Interior paint': 'Walls and ceilings · areas from capture',
};
// Mock: who buys each department, from org settings.
const MTL_PURCHASER = 'ABC Construction';

let _mtlRetailer = {};   // line key → retailer filter ('' = all)
let _mtlPick = {};       // line key → sku picked on the card, before saving

function _mtlLines(dept){
  const g = (typeof groupTasks === 'function') ? groupTasks(TASKS).find(x => x.key === dept) : null;
  if(!g) return [];
  return deptLines(g.items).filter(l => l.dept !== NO_PRODUCT_DEPT);
}
function _mtlChosen(l){ return deptLinePicked(l).state === 'one'; }
function _mtlCurrentSku(l){
  if(!_mtlChosen(l)) return null;
  const hit = l.items.map(t => _lineTaskPicked(l, t)).find(a => a.length);
  return hit ? hit[0].p.sku : null;
}
// How many of the product the line needs: each task's current quantity for
// it, or its scoped quantity when it has none yet.
function _mtlQty(l){
  return l.items.reduce((a, t) => {
    const pk = _lineTaskPicked(l, t);
    const q = pk.length ? pk.reduce((s, h) => s + _num(h.p.qty), 0) : (_num(t.qty) || 1);
    return a + q;
  }, 0);
}
/* The allowance is what the scope set aside, so it is read once — the first
   time the line is shown — and held: saving a product reprices the tasks,
   and the allowance must not follow it. */
let _mtlAllow = {};      // line key → {total, labor, materials}
function _mtlAllowance(l){
  return _mtlAllow[l.key] || (_mtlAllow[l.key] = _mtlAllowanceNow(l));
}
function _mtlAllowanceNow(l){
  const total = l.items.reduce((a, t) => a + dollars(t.cost || 0), 0);
  const labor = l.items.reduce((a, t) => a + _taskLabor(t), 0);
  return {total, labor, materials:Math.max(0, total - labor)};
}
// Clicking the open type closes it, back to the department's page.
function mtlOpenLine(key){
  const l = deptLineByKey(key); if(!l) return;
  if(selLineKey === key){ const same = selGroupKey === l.dept; selectGroup(l.dept); if(same) renderAll(); return; }
  selectLine(key);
}
function mtlNext(dept){
  const l = _mtlLines(dept).find(x => !_mtlChosen(x));
  if(l) selectLine(l.key);
}
function mtlSetRetailer(key, sup){ _mtlRetailer[key] = sup; renderShop(); }
function mtlPick(key, sku){ _mtlPick[key] = sku; renderShop(); }
function mtlSave(key, toCart){
  const l = deptLineByKey(key); if(!l) return;
  const sku = _mtlPick[key] || _mtlCurrentSku(l);
  const cat = sku ? _lineCat(l, sku) : null;
  if(!cat){ if(typeof toast === 'function') toast('Pick a product first'); return; }
  _applyLineProductTo(l, cat, l.items.slice());
  delete _mtlPick[key];
  if(typeof toast === 'function') toast(toCart ? `${cat.brand} ${cat.name} saved and added to the cart` : `${cat.brand} ${cat.name} saved for ${l.name}`);
  renderAll();
}

function _mtlRowHtml(l, open){
  const chosen = _mtlChosen(l);
  const rooms = [...new Set(l.items.map(t => t.room))];
  const prod = chosen ? deptLinePicked(l).product : '';
  const k = _lineKeyArg(l.key);
  return `<button type="button" class="mtl-row${open ? ' is-open' : ''}" onclick="mtlOpenLine('${k}')" aria-expanded="${open}">
    <span class="mtl-row-l">
      <span class="mtl-row-name">${esc(l.name)}</span>
      <span class="mtl-row-sub">${esc(rooms.join(', '))} · ${l.items.length} ${l.items.length === 1 ? 'task' : 'tasks'}${prod ? ` · ${esc(prod)}` : ''}</span>
    </span>
    <span class="mtl-tag${chosen ? ' is-chosen' : ''}">${chosen ? 'Chosen' : 'To choose'}</span>
  </button>`;
}

function _mtlCardHtml(l){
  const k = _lineKeyArg(l.key);
  const pool = deptLinePool(l);
  const qty = _mtlQty(l);
  const al = _mtlAllowance(l);
  const cur = _mtlCurrentSku(l);
  const picked = _mtlPick[l.key] || cur;
  const rooms = [...new Set(l.items.map(t => t.room))];
  const unit = (pool[0] && pool[0].unit) || 'ea';
  // Each product once, at the supplier the line buys it from.
  const items = pool.map(c => {
    const o = _lnpOffer(l, c);
    return {c, sup:o.sup, offer:o.offer, total:Math.round(o.offer.price * qty * 100) / 100};
  }).sort((a, b) => a.total - b.total);
  const sups = [...new Set(items.map(i => i.sup))];
  const filt = _mtlRetailer[l.key] || '';
  const shown = filt ? items.filter(i => i.sup === filt) : items;
  const verdict = total => total <= al.materials
    ? `<span class="mtl-in">In allowance</span>`
    : `<span class="mtl-over">${artMoney(total - al.materials)} over allowance</span>`;
  const sel = items.find(i => i.c.sku === picked);
  const left = sel ? al.materials - sel.total : null;
  const fits = MTL_FITS[l.name] || 'Sizes from capture';
  return `<section class="mtl-card">
    <div class="mtl-card-hd">
      <h3 class="mtl-card-t">${esc(l.name)}</h3>
      <div class="mtl-for">For ${l.items.map(t => `<button type="button" class="mtl-task" onclick="selectTask(${t.id})">${esc(t.code)}</button>`).join(', ')} · ${esc(rooms.join(', '))} · Qty ${qty.toLocaleString('en-US')}${unit !== 'ea' ? ' ' + esc(unit) : ''}</div>
      <div class="mtl-fits">Fits: ${esc(fits)} <span class="mtl-quiet">(from capture; products that don't fit are hidden)</span></div>
      <div class="mtl-matched"><span class="mtl-k">Matched on</span>${MTL_MATCHED.map(m => `<span class="mtl-chip">${esc(m)}</span>`).join('')}
        <button type="button" class="optc-link" onclick="toast('Matching for this line — coming soon')">Change for this line</button></div>
    </div>
    <div class="mtl-allow">
      <span class="mtl-k">Allowance</span>
      <span><b>${artMoney(al.total)}</b> ${l.items.length === 1 ? 'task' : 'tasks'}</span>
      <span>Labor ${artMoney(al.labor)}</span>
      <span><b>Materials up to ${artMoney(al.materials)}</b></span>
      <span class="mtl-quiet">Over the allowance needs a Change Order.</span>
    </div>
    <div class="mtl-shop">
      ${sups.length > 1 ? `<div class="mtl-filters">
        <button type="button" class="mtl-filter${filt ? '' : ' on'}" onclick="mtlSetRetailer('${k}','')">All · ${items.length}</button>
        ${sups.map(s => `<button type="button" class="mtl-filter${filt === s ? ' on' : ''}" onclick="mtlSetRetailer('${k}','${esc(s)}')">${esc(supplierName(s))} · ${items.filter(i => i.sup === s).length}</button>`).join('')}
      </div>` : ''}
      <div class="mtl-count">${shown.length} ${shown.length === 1 ? 'product fits' : 'products fit'} · cheapest first</div>
      <div class="mtl-list" role="radiogroup" aria-label="${esc(l.name)} products">
        ${shown.map(({c, sup, offer, total}) => {
          const on = c.sku === picked;
          return `<label class="mtl-opt${on ? ' on' : ''}">
            <input type="radio" name="mtl-${esc(l.key)}" ${on ? 'checked' : ''} onchange="mtlPick('${k}','${esc(c.sku)}')">
            <span class="mtl-thumb">${c.image ? `<img src="${esc(c.image)}" alt="" loading="lazy" onerror="this.replaceWith(document.createRange().createContextualFragment(_LNP_THUMB))">` : _LNP_THUMB}</span>
            <span class="mtl-opt-main">
              <span class="mtl-ret">${esc(supplierName(sup))}${c.sku === cur ? ' · current choice' : ''}</span>
              <span class="mtl-opt-name">${esc(c.brand)} ${esc(c.name)}</span>
              <span class="mtl-opt-sub">${artMoney(offer.price)} / ${esc(c.unit || 'ea')} × ${qty.toLocaleString('en-US')} · ${esc(_supLogi(sup, offer.stock).join(' · '))}</span>
            </span>
            <span class="mtl-opt-r">
              <span class="mtl-price">${artMoney(total)}</span>
              ${verdict(total)}
            </span>
          </label>`;
        }).join('') || '<div class="mtl-quiet" style="padding:12px 0">Nothing from this retailer fits.</div>'}
      </div>
    </div>
    <div class="mtl-buyer"><b>Purchased by:</b> ${esc(MTL_PURCHASER)} <button type="button" class="optc-link" onclick="toast('Purchaser — set per department in Org Settings')">Change</button>
      <div class="mtl-quiet">Defaults by department from Org Settings. If out of stock: the best match that fits; asks first if it would go over the allowance.</div></div>
    <div class="mtl-foot">
      <span>${sel ? `Selected: <b>${artMoney(sel.total)}</b> · ${left >= 0 ? `In allowance, ${artMoney(left)} left` : `<span class="mtl-over-txt">${artMoney(-left)} over allowance</span>`}` : '<span class="mtl-quiet">Pick a product</span>'}</span>
      <span class="mtl-foot-r">
        <button type="button" class="mtl-btn" ${sel ? '' : 'disabled'} onclick="mtlSave('${k}', false)">Save choice</button>
        <button type="button" class="mtl-btn is-primary" ${sel ? '' : 'disabled'} onclick="mtlSave('${k}', true)">Save and add to cart</button>
      </span>
    </div>
  </section>`;
}

/* ── Where this product type is needed ───────────────────────────────────
   Above the shopping card, held at the top while the card scrolls under it:
   the type's tasks pinned on a floor plan, and the photos of the one in
   focus, so what's being bought for stays in view. Kept to as few words as
   possible. The plan is a placeholder — the job's rooms as plain boxes — and
   360 and Video are placeholders too: the prototype has no capture for
   them. */
let _mtwFocus = {};       // line key → the group (room) on show; unset = the first
let _mtwPhoto = {};       // `${line key}|${room}` → photo index
let _mtwMedia = 'photos'; // 'photos' | '360' | 'video'
let _mtwOpen = true;
function mtwFocus(key, room){ _mtwFocus[key] = room; renderShop(); }
function mtwMedia(m){ _mtwMedia = m; renderShop(); }
function mtwStep(pk, d, n){ _mtwPhoto[pk] = (((_mtwPhoto[pk] || 0) + d) % n + n) % n; renderShop(); }
function mtwToggle(){ _mtwOpen = !_mtwOpen; renderShop(); }

// The type's groups — the rooms its tasks are in, in task order.
function _mtwGroups(l){ return [...new Set(l.items.map(t => t.room))]; }
// The photos of every task of this type in one group.
function _mtwPhotos(l, room){
  const codes = new Set(l.items.filter(t => t.room === room).map(t => t.code));
  return (typeof PHOTOS !== 'undefined' ? PHOTOS : []).filter(p => p.kind === 'task' && codes.has(p.task));
}

// The job's rooms as plain boxes; this type's groups lit and numbered, the
// one on show ringed. A group's pin switches to it.
function _mtwPlanHtml(l, groups, room){
  const k = _lineKeyArg(l.key);
  const rooms = (typeof ROOMS !== 'undefined' ? ROOMS : [...new Set(TASKS.map(t => t.room))]);
  const cols = Math.ceil(rooms.length / 2), W = 100, H = 80;
  const boxes = rooms.map((r, i) => {
    const x = (i % cols) * W, y = Math.floor(i / cols) * H;
    const gi = groups.indexOf(r);
    const cx = x + W / 2, cy = y + H / 2 + 6, on = r === room;
    const pin = gi < 0 ? '' : `<g class="mtw-pin${on ? '' : ' is-dim'}" onclick="mtwFocus('${k}','${esc(r).replace(/'/g, "\\'")}')" role="button" aria-label="${esc(r)}">
        ${on ? `<circle class="mtw-pin-ring" cx="${cx}" cy="${cy}" r="14"/>` : ''}
        <circle class="mtw-pin-c" cx="${cx}" cy="${cy}" r="10"/><text class="mtw-pin-n" x="${cx}" y="${cy + 4}">${gi + 1}</text></g>`;
    return `<rect class="mtw-room${gi >= 0 ? ' is-lit' : ''}" x="${x}" y="${y}" width="${W}" height="${H}"/>
      <text class="mtw-room-t" x="${x + 6}" y="${y + 14}">${esc(r)}</text>${pin}`;
  }).join('');
  return `<svg class="mtw-plan" viewBox="-2 -2 ${cols * W + 4} ${2 * H + 4}" preserveAspectRatio="xMidYMid meet" aria-label="Floor plan">${boxes}</svg>`;
}

function _mtwMediaHtml(list, i, pk, badge){
  const n = list.length;
  const cur = list[i];
  const bg = cur ? _photoBg(cur, i) : 'var(--sunken)';
  let stage, cap;
  if(_mtwMedia === 'photos'){
    stage = cur
      ? `<button type="button" class="mtw-stage" style="background:${bg}" onclick="openGalleryPhoto(${cur.id})" aria-label="Open photo"></button>
         ${n > 1 ? `<button type="button" class="mtw-arr is-l" onclick="mtwStep('${esc(pk)}',-1,${n})" aria-label="Previous photo">‹</button>
         <button type="button" class="mtw-arr is-r" onclick="mtwStep('${esc(pk)}',1,${n})" aria-label="Next photo">›</button>` : ''}`
      : `<div class="mtw-stage is-empty">No photos</div>`;
    cap = n ? `${i + 1} of ${n}` : '';
  } else {
    stage = `<div class="mtw-stage is-dim" style="background:${bg}"><span class="mtw-play">${_mtwMedia === 'video'
      ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>' : '360°'}</span></div>`;
    cap = _mtwMedia === 'video' ? '0:12 of 0:42' : '';
  }
  const tab = (m, lbl) => `<button type="button" class="mtw-tab${_mtwMedia === m ? ' on' : ''}" onclick="mtwMedia('${m}')">${lbl}</button>`;
  return `<div class="mtw-media">
    <div class="mtw-frame">${stage}<span class="mtw-badge">${badge}</span></div>
    <div class="mtw-cap"><span>${cap}</span><span class="mtw-tabs">${tab('photos', 'Photos')}<span aria-hidden="true">·</span>${tab('360', '360')}<span aria-hidden="true">·</span>${tab('video', 'Video')}</span></div>
  </div>`;
}

function _mtwHtml(l){
  if(!l.items.length) return '';
  const k = _lineKeyArg(l.key);
  const groups = _mtwGroups(l);
  const room = groups.includes(_mtwFocus[l.key]) ? _mtwFocus[l.key] : groups[0];
  const gi = groups.indexOf(room);
  const arg = r => esc(r).replace(/'/g, "\\'");
  // "2 groups ▾": pick the group to see; the first is on show to begin with.
  const dd = `<details class="mtw-dd">
      <summary>${groups.length} ${groups.length === 1 ? 'group' : 'groups'}<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5 6 7.5l3-3"/></svg></summary>
      <div class="mtw-dd-menu">${groups.map((r, i) => `<button type="button" class="${r === room ? 'on' : ''}" onclick="mtwFocus('${k}','${arg(r)}')"><span class="mtw-num">${i + 1}</span>${esc(r)}</button>`).join('')}</div>
    </details>`;
  const hd = `<div class="mtw-hd">
    <span class="mtw-t">${esc(l.name)} ·</span>${dd}
    <button type="button" class="mtw-col" onclick="mtwToggle()" aria-expanded="${_mtwOpen}">${_mtwOpen ? 'Collapse' : 'Expand'}</button>
  </div>`;
  if(!_mtwOpen) return `<section class="mtw is-collapsed">${hd}</section>`;
  const list = _mtwPhotos(l, room);
  const pk = `${l.key}|${room}`;
  const i = Math.min(_mtwPhoto[pk] || 0, Math.max(0, list.length - 1));
  return `<section class="mtw">${hd}
    <div class="mtw-body">
      ${_mtwMediaHtml(list, i, pk, `<span class="mtw-num">${gi + 1}</span>${esc(room)}`)}
      <div class="mtw-side">${_mtwPlanHtml(l, groups, room)}</div>
    </div>
  </section>`;
}

function _renderMaterialsDeptHtml(dept){
  const openKey = selLineKey;
  const lines = _mtlLines(dept);
  const nChosen = lines.filter(_mtlChosen).length;
  const next = lines.find(l => !_mtlChosen(l));
  const dk = esc(String(dept)).replace(/'/g, "\\'");
  const openL = openKey ? lines.find(l => l.key === openKey) : null;
  return `<div class="pgd mtl">
    ${openL ? _mtwHtml(openL) : ''}
    <div class="mtl-hd">
      <div>
        <div class="lnp-eyebrow"><span class="page-kind">Product type</span></div>
        <h2 class="mtl-title">${esc(dept)}</h2>
      </div>
      <div class="mtl-hd-r">
        <span class="mtl-quiet">Objective: ${esc(MTL_OBJECTIVE)} · ${nChosen} of ${lines.length} chosen</span>
        ${next ? `<button type="button" class="mtl-btn" onclick="mtlNext('${dk}')">Next to choose: ${esc(next.name)} →</button>` : '<span class="mtl-tag is-chosen">All chosen</span>'}
      </div>
    </div>
    <div class="mtl-lines">
      ${lines.map(l => l.key === openKey ? _mtlRowHtml(l, true) + _mtlCardHtml(l) : _mtlRowHtml(l, false)).join('')
        || '<div class="mtl-quiet">Nothing to buy in this department.</div>'}
    </div>
  </div>`;
}
