/* Shop with Kai inside KaiWeb — the wireframe's materials model.
   Generated: these are the wireframe's own top-level functions and values that
   the Shop layer calls and KaiWeb's panel doesn't have (departments, product
   lines, supplier/stock helpers…), copied verbatim from
   shop-with-kai-v2-wireframe/js/<file>.js, in that file's order. */

/* ── from panel-helpers.js ── */
/* ════════════ SHARED HELPERS (load first) ════════════
   Pure formatting helpers that eager load-time code in data.js references
   before its own file finishes. In the original single-file prototype these
   were hoisted across the whole script; split into separate <script> files,
   hoisting is per-file, so they must be declared up front. Keep only
   dependency-free utilities here. */
function dollars(c){ return parseFloat(String(c).replace(/[$,]/g,''))||0; }
function _fmtDollars(n){
  if(window.__KAI_SHOP) return (n < 0 ? '-' : '') + '$' + Math.abs(n).toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2});
  const abs = Math.abs(Math.round(n));
  return (n < 0 ? '-' : '') + '$' + abs.toLocaleString();
}
function _fmtDelta(d){
  if(!d) return '';
  const sign = d > 0 ? '+' : '−';
  // Shop with Kai reads to the cent; everywhere else stays whole dollars.
  if(window.__KAI_SHOP) return sign + '$' + Math.abs(d).toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2});
  return sign + '$' + Math.abs(Math.round(d)).toLocaleString();
}
/* The sidebar's money. Shop with Kai shows it to the cent and unrounded;
   the other prototypes keep whole dollars. */
function sbMoney(n){
  if(window.__KAI_SHOP) return (n < 0 ? '-' : '') + '$' + Math.abs(n).toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2});
  return '$' + Math.round(n).toLocaleString();
}
let _imgPh = null;
function productArtUri(x){
  if(x && x.image) return x.image;
  if(_imgPh) return _imgPh;
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" fill="#eeeeee"/>'
    + '<g fill="none" stroke="#adadad" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">'
    + '<rect x="38" y="42" width="44" height="36" rx="3"/><circle cx="51" cy="54" r="4"/><path d="M40 74l13-12 9 8 7-6 11 10"/></g></svg>';
  return (_imgPh = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg));
}
// Shop with Kai: a product's picture — its own, or the placeholder.
// Elsewhere only a real image shows.
function shopProductImg(x){ return (x && x.image) || (window.__KAI_SHOP && x ? productArtUri(x) : ''); }

/* ── from data.js ── */
const USER_ROLE = new URLSearchParams(window.__KAI_QS || window.location.search).get('role') || 'manager';

/* ── from panel-core.js ── */
// A figure for display that the other prototypes round and Shop does not.
function shopMoney(n){ return window.__KAI_SHOP ? sbMoney(n) : money(Math.round(n)); }
const DEPARTMENTS = [
  'Appliances',
  'Building Supplies & Lumber',
  'Bathroom',
  'Electrical',
  'Flooring',
  'Hardware',
  'Heating & Cooling',
  'Home Decor & Furniture',
  'Kitchen',
  'Lawn, Garden & Outdoor',
  'Lighting & Ceiling Fans',
  'Moulding & Millwork',
  'Paint',
  'Plumbing',
  'Smart Home & Security',
  'Storage & Organization',
  'Tools',
  'Windows & Doors',
  'Other',
];
const NO_PRODUCT_DEPT = 'No products needed';
const _LABOR_ONLY = /powerwash|pressure wash|haul away|haul-away|\bcutout\b|resident supplied|resident install|labor only|labour only/;
// [department, product line, pattern]
const _PRODUCT_LINES = [
  // Ahead of smart home: a "smart" garage door opener is still an opener.
  ['Windows & Doors',           'Garage door openers',        /door opener|garage door/],
  ['Smart Home & Security',     'Smart home hubs',            /\bsmart\b|wi-?fi|\bhub\b/],
  ['Smart Home & Security',     'Cameras & alarms',           /camera|alarm|security|doorbell/],
  ['Electrical',                'Smoke & CO detectors',       /smoke|detector/],
  ['Appliances',                'Range hoods',                /range hood|hood vent/],
  ['Appliances',                'Appliance suites',           /appliance|stainless suite/],
  ['Appliances',                'Refrigerators',              /refrigerator|fridge/],
  ['Appliances',                'Dishwashers',                /dishwasher/],
  ['Appliances',                'Washers & dryers',           /washer|dryer/],
  ['Bathroom',                  'Vanities',                   /vanity/],
  ['Bathroom',                  'Toilets',                    /toilet/],
  ['Bathroom',                  'Shower doors',               /shower door|glass door/],
  ['Bathroom',                  'Tubs',                       /\btub\b|bathtub/],
  ['Bathroom',                  'Mirrors',                    /mirror/],
  ['Heating & Cooling',         'Exhaust fans',               /exhaust fan/],
  ['Heating & Cooling',         'Thermostats',                /thermostat/],
  ['Heating & Cooling',         'HVAC equipment',             /hvac|furnace|heat pump|air condition/],
  ['Lighting & Ceiling Fans',   'Ceiling fans',               /ceiling fan/],
  ['Lighting & Ceiling Fans',   'Light fixtures',             /lighting|light fixture|pendant|sconce|recessed|chandelier|\blamp/],
  ['Kitchen',                   'Cabinets',                   /cabinet/],
  ['Kitchen',                   'Countertops',                /countertop|\bcounter\b|quartz|butcher block/],
  ['Kitchen',                   'Sinks & faucets',            /\bsinks?\b|faucet/],
  ['Kitchen',                   'Cabinet organizers',         /drawer insert|pull-out/],
  ['Hardware',                  'Cabinet hinges',             /hinge/],
  ['Hardware',                  'Door knobs & locks',         /knob|lever|\block|deadbolt|door hardware/],
  ['Flooring',                  'Tile',                       /\btiles?\b|backsplash|porcelain|ceramic/],
  ['Flooring',                  'Vinyl plank (LVP)',          /\blvp\b|vinyl plank|luxury vinyl/],
  ['Flooring',                  'Carpet',                     /carpet/],
  ['Flooring',                  'Hardwood',                   /hardwood/],
  ['Flooring',                  'Laminate',                   /laminate/],
  ['Paint',                     'Interior paint',             /paint|primer|repaint/],
  ['Moulding & Millwork',       'Interior doors',             /interior door|door slab|prehung|bi-?fold/],
  ['Moulding & Millwork',       'Baseboard & trim',           /baseboard|\btrim\b|moulding|molding|casing/],
  ['Windows & Doors',           'Blinds & shades',            /blind|shade/],
  ['Windows & Doors',           'Windows',                    /window/],
  ['Windows & Doors',           'Exterior doors',             /storm door|exterior door|\bdoors?\b/],
  ['Home Decor & Furniture',    'Curtains & rugs',            /curtain|\brug\b|wall art/],
  ['Storage & Organization',    'Closet systems',             /closet|shelv|shelf|hanging rod/],
  ['Plumbing',                  'Water heaters',              /water heater/],
  ['Plumbing',                  'Pipes & fittings',           /plumb|pipe|filtration|sump/],
  ['Lawn, Garden & Outdoor',    'Outdoor',                    /lawn|garden|landscap|patio|deck|fence|mulch/],
  ['Building Supplies & Lumber','Drywall',                    /drywall/],
  ['Building Supplies & Lumber','Insulation',                 /insulation/],
  ['Building Supplies & Lumber','Lumber & framing',           /framing|plywood|lumber|\bstuds?\b/],
  ['Building Supplies & Lumber','Roofing',                    /roof/],
  ['Tools',                     'Tools',                      /\btools?\b|ladder|compressor/],
];
function _taskShopText(t){
  return [t.name, t.opt, t.product].map(s => String(s || '')).join(' · ').toLowerCase();
}
// {dept, line} for a task, ignoring anything pinned on it — what the
// Department field offers as its suggestion.
function suggestTaskLine(t){
  if(!t) return {dept:'Other', line:'Other items'};
  const txt = _taskShopText(t);
  if(_LABOR_ONLY.test(txt)) return {dept:NO_PRODUCT_DEPT, line:'Labor only'};
  for(const [dept, line, re] of _PRODUCT_LINES) if(re.test(txt)){
    // Lowe's shelves sinks under Kitchen, but a bathroom sink is bought in
    // the Bathroom aisle beside the vanity it drops into.
    if(line === 'Sinks & faucets' && /bath/i.test(t.room || '')) return {dept:'Bathroom', line};
    return {dept, line};
  }
  return {dept:'Other', line:'Other items'};
}
function taskLine(t){
  if(t && t.dept && DEPARTMENTS.includes(t.dept)){
    const sug = suggestTaskLine(t);
    if(sug.dept === t.dept) return sug;
    const txt = _taskShopText(t);
    const hit = _PRODUCT_LINES.find(([d, , re]) => d === t.dept && re.test(txt));
    return {dept:t.dept, line: hit ? hit[1] : `${t.dept} items`};
  }
  return suggestTaskLine(t);
}
function taskDept(t){ return taskLine(t).dept; }
function deptLines(items){
  const order = new Map(_PRODUCT_LINES.map(([d, l], i) => [`${d}|${l}`, i]));
  const byKey = new Map();
  items.forEach(t => {
    const {dept, line} = taskLine(t);
    const key = `${dept}|${line}`;
    if(!byKey.has(key)) byKey.set(key, {key, dept, name:line, items:[]});
    byKey.get(key).items.push(t);
  });
  return [...byKey.values()].sort((a, b) =>
    (order.has(a.key) ? order.get(a.key) : 1e9) - (order.has(b.key) ? order.get(b.key) : 1e9));
}

/* ── from scope-navigator.js ── */
let collapsedLines = new Set();
// line keys the user has folded
let selLineKey = null;
function allDeptLines(){
  if(typeof groupTasks !== 'function' || groupBy !== 'dept') return [];
  return groupTasks(TASKS).flatMap(g => deptLines(g.items));
}
function deptLineByKey(key){
  return allDeptLines().find(l => l.key === key) || null;
}
function _taskMatSplit(t){
  let now = 0, later = 0;
  const td = (t.mods || []).indexOf('deferred') !== -1;
  taskOptions(t).forEach(o => {
    if(!optionIsAdded(o)) return;
    (o.products || []).forEach(p => {
      if(!productIsPicked(p)) return;
      const a = _num(p.qty) * _num(p.parts);
      if(td || (p.mods || []).indexOf('deferred') !== -1) later += a; else now += a;
    });
  });
  return {now, later};
}
function _taskIsDeferred(t){ return (t.mods || []).indexOf('deferred') !== -1; }
function _taskLabor(t){ const sp = _taskMatSplit(t); return Math.max(0, dollars(t.cost) - sp.now - sp.later); }
function selectLine(key){
  if(selLineKey === key && !selId) return;
  const l = deptLineByKey(key); if(!l) return;
  scopeView = false;
  selId = null;
  selGroupKey = null;
  selLineKey = key;
  openIds.clear();
  if(collapsedGrps) collapsedGrps.delete(l.dept);
  collapsedLines.delete(key);
  workMode = 'shop';
  document.body.classList.toggle('shop-mode', true);
  if(typeof renderSidebar === 'function') renderSidebar();
  if(typeof renderWorkHdr === 'function') renderWorkHdr();
  if(typeof renderWork === 'function') renderWork();
}
function _taskHasProduct(t){
  return !!t.product && !/not selected|pending|tbd/i.test(t.product);
}
// Which catalogue section a line shops from. A line already knows what kind
// of product it is, so it asks for that section rather than guessing from
// its first task's name.
const _LINE_POOL = {
  'Cabinets':'cabinet', 'Countertops':'counter', 'Tile':'tile',
  'Appliance suites':'appliance', 'Vinyl plank (LVP)':'floor', 'Carpet':'floor',
  'Hardwood':'floor', 'Laminate':'floor', 'Interior paint':'paint',
  'Vanities':'vanity', 'Toilets':'toilet', 'Garage door openers':'mech',
  'Closet systems':'storage', 'Door knobs & locks':'hardware', 'Light fixtures':'lighting',
  'Ceiling fans':'ceilingfan', 'Smoke & CO detectors':'detector', 'Blinds & shades':'blinds',
  'Exhaust fans':'exhaust',
};
function deptLinePool(l){
  if(!l || !l.items.length) return [];
  const base = productPool(l.items[0], _LINE_POOL[l.name] || null);
  // Anything picked on the line's tasks from elsewhere in the catalogue —
  // through search — is listed too, so its row (and its "On 2 of 3") shows.
  const have = new Set(base.map(p => p.sku));
  const extra = [];
  l.items.forEach(t => taskOptions(t).forEach(o => (o.products || []).forEach(p => {
    if(!p.sku || have.has(p.sku) || !productIsPicked(p)) return;
    const cat = (typeof catalogFind === 'function') ? catalogFind(p.sku) : null;
    if(cat){ have.add(p.sku); extra.push(cat); }
  })));
  return base.concat(extra);
}
// A line product by SKU: the line's own section first, then the whole
// catalogue, so a searched-for product can be applied too.
function _lineCat(l, sku){
  return deptLinePool(l).find(x => x.sku === sku)
    || ((typeof catalogFind === 'function') ? catalogFind(sku) : null);
}
// The option a line edit lands on: the first one that's part of the job.
function _lineOption(t){
  const opts = taskOptions(t);
  return opts.find(o => optionIsAdded(o)) || opts[0] || null;
}
function _lineProductRow(t, sku){
  for(const o of taskOptions(t)){
    const p = (o.products || []).find(x => x.sku === sku);
    if(p) return {o, p};
  }
  return null;
}
function _ensureLineProductRow(t, cat){
  const hit = _lineProductRow(t, cat.sku);
  if(hit) return hit;
  const o = _lineOption(t); if(!o) return null;
  o.products = o.products || [];
  const p = {id:'prod_' + Math.random().toString(36).slice(2,7), sku:cat.sku, brand:cat.brand,
             product:cat.name, qty:'0', parts:_fmtDollars(cat.price), labor:''};
  o.products.push(p);
  return {o, p};
}
// How much of this product the task itself calls for — its own quantity,
// or one when the task hasn't stated it. Used for the first pick only.
function _taskNeedQty(t, cat){
  const n = _num(t.qty);
  if(!n) return '1';
  if(cat && cat.coveragePerUnit) return String(Math.max(1, Math.ceil(n / cat.coveragePerUnit)));
  return String(n);
}
// Keep the task's one-line product summary in step with its picked rows,
// which is what the sidebar, the group table and the line's state read.
function _syncTaskProduct(t){
  const picked = taskOptions(t).filter(optionIsAdded)
    .flatMap(o => (o.products || []).filter(productIsPicked));
  if(picked.length){
    t.product = picked.map(p => [p.brand, p.product].filter(Boolean).join(' ')).join(' + ');
    t.flags = (t.flags || []).filter(f => f !== 'missing');
  } else if(_taskHasProduct(t) && taskOptions(t).some(o => (o.products || []).some(p => p.sku))){
    t.product = '(not selected)';
  }
}
function _lineSkus(l, t){
  // deptLinePool also carries anything picked on the line from search.
  return new Set([...deptLinePool(l), ...productPool(t)].map(p => p.sku));
}
function _lineTaskRows(l, t){
  const skus = _lineSkus(l, t);
  return taskOptions(t).flatMap(o => (o.products || []).filter(p => p.sku && skus.has(p.sku)).map(p => ({o, p})));
}
function _lineTaskPicked(l, t){
  return _lineTaskRows(l, t).filter(h => optionIsAdded(h.o) && productIsPicked(h.p));
}
let lineSupplier = {};
// `${lineKey}|${sku}` → supplier id
function lineSupplierFor(l, sku){
  const k = `${l.key}|${sku}`;
  if(lineSupplier[k]) return lineSupplier[k];
  for(const t of l.items){
    const h = _lineTaskPicked(l, t).find(x => x.p.sku === sku);
    if(h) return rowSupplier(h.p);
  }
  const offers = offersForSku(sku);
  return offers.length ? offers[0].supplier : null;
}
function _swapTaskProduct(l, t, fromSku, toSku){
  const from = _lineTaskPicked(l, t).filter(h => h.p.sku === fromSku);
  const keepQty = from.length ? from[0].p.qty : null;
  const touched = new Set();
  from.forEach(h => { h.p.qty = '0'; touched.add(h.o); });
  let cat = null;
  if(toSku){
    cat = _lineCat(l, toSku);
    const h = cat && _ensureLineProductRow(t, cat);
    if(h){
      const offer = offersForSku(cat.sku).find(o => o.supplier === lineSupplierFor(l, cat.sku));
      h.p.qty = String(_num(h.p.qty) + _num(keepQty || _taskNeedQty(t, cat)));
      if(offer){ h.p.supplier = offer.supplier; h.p.parts = _fmtDollars(offer.price); }
      if(!optionIsAdded(h.o)) h.o.added = true;
      touched.add(h.o);
    }
  }
  touched.forEach(o => recomputeOptionFromProducts(t, o));
  _syncTaskProduct(t);
  return cat;
}
// The approved materials, from the snapshot, split as _taskMatSplit splits
// today's: products are matched by id to read whether each is deferred.
function _origMatSplit(t){
  const o = __TASK_ORIGINALS[t.id];
  let now = 0, later = 0;
  if(!o || !Array.isArray(o.options)) return {now, later};
  const cur = {};
  taskOptions(t).forEach(co => (co.products || []).forEach(p => { cur[p.id] = p; }));
  const td = _taskIsDeferred(t);
  o.options.forEach(so => {
    if(so.added === false) return;
    (so.products || []).forEach(sp => {
      if(!(_num(sp.qty) > 0)) return;
      const p = cur[sp.id];
      const a = _num(sp.qty) * _num(sp.parts);
      if(td || (p && (p.mods || []).indexOf('deferred') !== -1)) later += a; else now += a;
    });
  });
  return {now, later};
}
function shopSide(t, mode){
  const o = __TASK_ORIGINALS[t.id];
  let now, was;
  // Deferred work counts in its side, as the Record counts it: it is still
  // part of the job, only held for a later change order.
  if(mode === 'dept'){
    const sp = _taskMatSplit(t);
    now = sp.now + sp.later;
    if(o){ const op = _origMatSplit(t); was = op.now + op.later; } else was = now;
  } else if(mode === 'contractor'){
    now = _taskLabor(t);
    if(o){ const sp = _origMatSplit(t); was = Math.max(0, _parseDollars(o.cost) - sp.now - sp.later); }
    else was = now;
  } else {
    now = dollars(t.cost);
    was = o ? originalTaskCost(t.id) : now;
  }
  const removed = typeof __CO_REMOVED !== 'undefined' && __CO_REMOVED.has(t.id);
  if(removed) now = 0;
  const delta = now - was;
  return {now, was, delta: Math.abs(delta) < 0.005 ? 0 : delta, removed};
}
function _shopSum(items, mode){
  return items.reduce((a, t) => { const s = shopSide(t, mode); a.now += s.now; a.delta += s.delta; return a; }, {now:0, delta:0});
}

/* ── from editor.js ── */
function _lnpOffer(l, cat){
  const offers = (typeof catalogOffers === 'function') ? catalogOffers(Object.assign({section:(catalogFind(cat.sku) || {}).section}, cat)) : [];
  const sup = lineSupplierFor(l, cat.sku);
  return {offers, sup, offer:offers.find(o => o.supplier === sup) || offers[0] || {price:cat.price, stock:cat.stock}};
}
function goUpMaterials(dept, key){
  if(groupBy !== 'dept') setGroupBy('dept');
  if(key) selectLine(key); else { selLineKey = null; selId = null; selectGroup(dept); }
  if(workMode !== 'shop') setWorkMode('shop');
  if(typeof renderAll === 'function') renderAll();
}
const _supStock = s => s === 'out' ? 'Out of stock' : s === 'low' ? 'Low stock' : 'In stock';
const _MVP = !!window.__KAI_SHOP_MVP;
// MVP ranking: picked up nearby first, then ships, then unavailable.
function shopStockRank(o){ return !o ? 1 : o.stock === 'out' ? 2 : (o.supplier === 'hd' ? 0 : 1); }
function _supStockFor(supplier, stock){
  if(!_MVP) return _supStock(stock);
  if(supplier === 'hd') return stock === 'out' ? 'Not in nearby stores' : stock === 'low' ? 'In stock 11 mi away' : 'In stock nearby';
  return stock === 'out' ? 'Unavailable online' : 'Available online';
}
const _SUP_LOGO = {hd:{src:'img/suppliers/homedepot.png', h:20}, low:{src:'img/suppliers/lowes.png', h:12}};
function supplierLogoHtml(id){
  const l = _SUP_LOGO[id]; if(!l) return '';
  return `<img class="sup-logo-img" src="${l.src}" alt="" aria-hidden="true" style="height:${l.h}px;width:auto;flex:none;margin-right:7px;vertical-align:middle">`;
}

/* ── from overview.js ── */
/* ════════════════════════════════════════════════════════════════════
   OVERVIEW TAB
   The project's front page: what this job is, who is on it, and what has
   happened lately. It is the tab the panel opens on, because it is the only
   one that answers "what am I looking at" before you have chosen anything.
   The documents themselves live on the Artifact tab and are not restated here.

   Everything the prototype already knows is read, not written out again:
   the budget sums the visible tasks, the note and photo counts come off the
   same pools the drawers use, and the activity feed is built from Artifact 2's
   version ladder and sign-offs — the same records the scrubber and the state
   card read.

   The page has no cards. Sections are a mono label over their content with
   one hairline between them, and the activity feed hangs off a spine in the
   rail: the tiles were chrome around six short lists.

   OVERVIEW_SEED below is only the part nothing else models: access codes,
   the property's own facts, the template, and the dispatch note.
   ════════════════════════════════════════════════════════════════════ */

/* The address is now in six places across this prototype (here, index.html's
   toolbar, artifact.js's paper, progress.js, measurements.js, the lightbox).
   Worth collapsing into one seed, but not from inside a new tab. */
const OVERVIEW_SEED = {
  address:  '3484 South Main Street',
  city:     'Atlanta, GA 30315',
  status:   'Active',
  projectId:'432A1A6B',
  type:     'Turn',
  endDate:  'May 22, 2026',
  scopeDue: 'Apr 12, 2026',
  updated:  'Apr 30, 2026 4:12pm',
  /* The project's general contractor: the one set at the project level, which
     is what a new task is assigned to unless someone picks another. Tasks
     carry their own `gc` (see TASKS in data.js) and several here are with
     other trades — this is the default, not a claim about who holds the work. */
  gc:       'Stone Bros',
  access:   [{k:'Gate code', v:'4321'}, {k:'Door code', v:'1234'}],
  /* ── Who does the work ──
     Three tiers, strongest last: the General Contractor covers everything,
     a trade's own contractor covers that trade, and a task can override both.
     `who` absent on a trade means nobody is set for it — it inherits, which
     is the case the whole model exists for and the one the UI has to show
     rather than leave the reader to infer from a name repeated in two rows.
     `over` is the per-task exception, nested under the trade it departs from
     so precedence reads as depth. */
  general: {who:'General Contractor Company', amount:'$5,000', tasks:50},
  /* Every trade carries what its work is worth. A row with tasks and no
     figure read as unpriced rather than unlisted, and the column it left
     blank is the one the money is scanned down. */
  trades: [
    {trade:'Electrical',   who:"It's Electric!",         tasks:9,  amount:'$3,200'},
    {trade:'HVAC',         who:'Breeze Bros',            tasks:4,  amount:'$1,800',
      over:[{who:'Apex Heating & Air', tasks:1, amount:'$640'}]},
    {trade:'Plumbing',     who:'Doctor Drain',           tasks:12, amount:'$2,000'},
    {trade:'Flooring',     who:'HomeStride',             tasks:12, amount:'$2,000'},
    {trade:'Paint',        who:'Roll With It Painting',  tasks:12, amount:'$1,600'},
    {trade:'Landscaping',  who:'Grass Gurus',            tasks:35, amount:'$2,000'},
    {trade:'Appliances',   who:'American Appliance Co.', tasks:5,  amount:'$2,400'},
    {trade:'Drywall',      tasks:6,  amount:'$900'},
    {trade:'Roofing',      tasks:2,  amount:'$1,400'},
    /* Staffed but unscoped: the contractor is set and no work has landed on
       the trade. It belongs in the list — the assignment is real — but with
       nothing to price, so the money reads as a dash rather than $0, which
       would claim the work exists and costs nothing. */
    {trade:'Masonry',      who:'Old Town Masonry',      tasks:0},
  ],
  /* The market the property sits in, and the few defaults a market carries
     into every job on it. Held here rather than derived: nothing else in the
     prototype models a market, and the Market field needs somewhere to go. */
  market: {
    name:        'Atlanta',
    zips:        ['30315', '30316'],
    template:    'ATL Metro Turn Template 01:09:26',
    managers:    ['T. Okafor'],
    contractors: ['Stone Bros', 'Apex Carpentry'],
    users:       ['M. Alvarez', 'S. Patel']
  },
  property: [
    {k:'KT ID',       v:'1234'},   {k:'Square feet', v:'1,590'},
    {k:'Beds',        v:'3'},      {k:'Acreage',     v:'0.11'},
    {k:'Baths',       v:'3½'},{k:'Year built',  v:'2014'},
    {k:'Garage',      v:'Yes'},    {k:'Market',      v:'Atlanta'},
  ],
  template: {name:'ATL Metro Turn Template 01:09:26', version:'Apr 2, 2026'},
  /* The closeout is the one document the version ladder does not model — it
     is not a scope, so it has no entry in VER. It has no draft, only the day
     it was approved. */
  closeout: {approved:'May 22, 2026'},
  dispatch: 'Lockbox is on the side gate, not the front door. Resident works nights — no entry before 10am.',
};
