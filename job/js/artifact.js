/* Captions for a line's photo strip, in the order the photos were taken: the
   walk that found the line, then the detail shots. Lost when this file was split
   out — both this file and progress.js read it, neither defined it, so opening
   any historical document threw before it rendered. It belongs here, with the
   paper that shows the strip. */
const ART_PHOTO_CAPS = ['Initial walk','Detail','Wide','Spec','Context','Angle'];

/* Shop with Kai — the purchase order and everything that leads to it. On
   only when the host page asks (ShopwithKai.html; see KAI_PANEL_DOC in
   shell.js), so index.html keeps the Record as it was. The root class gates
   the one stylesheet rule that is not scoped to the order's own markup. */
const SHOP_WITH_KAI = !!window.__KAI_SHOP;
document.documentElement.classList.toggle('kai-shop', SHOP_WITH_KAI);

function renderArtifact(){
  const body = document.getElementById('workBody');
  if(!body) return;
  // Priority: historical > copy > index. Guard both drill-in states so a
  // stale id (e.g. a copy that was renamed/removed elsewhere) falls back
  // to the index instead of blanking the tab.
  if(openHistoricalId){
    const v = VERSIONS.find(x => x.id === openHistoricalId);
    if(!v){ openHistoricalId = null; body.innerHTML = _renderArtifactIndex(); return; }
    body.innerHTML = _renderHistoricalDoc(v);
    return;
  }
  if(openPoDoc && SHOP_WITH_KAI){
    body.innerHTML = _renderPoDoc(openPoDoc);
    return;
  }
  if(openCopyId){
    const copy = copyById(openCopyId);
    if(!copy){ openCopyId = null; body.innerHTML = _renderArtifactIndex(); return; }
    body.innerHTML = _renderCopyDoc(copy);
    return;
  }
  body.innerHTML = _renderArtifactIndex();
}
/* The turn buttons follow whichever draft order is on screen. */
const _renderArtifactBase = renderArtifact;
renderArtifact = function(){ _renderArtifactBase(); if(typeof _poSyncFocus === 'function') _poSyncFocus(); };
function _renderArtifactIndex(){
  return `<div class="art-index">
    ${_renderRegisterSection()}
    ${SHOP_WITH_KAI ? (regViewAs === 'shared' ? '' : _renderPurchaseOrderSection()) : _renderHistoricalSection()}
    ${_renderCopiesSection()}
  </div>`;
}

/* ════════════ REGISTER ════════════
   Every event that moved the Job Total, and how that total is classified
   today. Two questions a job manager asks constantly and previously had to
   answer by opening each document in turn and doing the arithmetic.

   SOURCE OF TRUTH — the live scope (TASKS), not VERSIONS[].budget. The two
   seeds disagree in this prototype (the sidebar reads $68,242 where the
   version cards read $26,370), and a section whose whole job is to add money
   up cannot be the place that publishes the stale one. So: the current Job
   Total is the live scope, the classification partitions exactly that figure,
   and each document's historical Job Total is derived by walking its change
   back from today. Every row therefore ties, and the bottom line agrees with
   the number the sidebar has been showing all along. */

// Which ledger row is expanded. One at a time — the detail is a digression
// from the running total, not a second column of it.
let _regOpenVer = null;
/* Which groups inside it are open. Several at once, unlike the rows: comparing
   two rooms of one change order is the reason to be down here at all. Keyed by
   version and room, so opening Kitchen in one document does not open it in
   another. */
let _regOpenGroups = {};
function toggleRegGroup(key){
  _regOpenGroups[key] = !_regOpenGroups[key];
  if(typeof renderArtifact === 'function') renderArtifact();
}
/* The lines of one room that this version touched, with what each carries and
   what it costs. Read off SCOPE, the same records the counts come from, so a
   room that says 4 opens onto four. */
function _regGroupTasks(verKey, room){
  if(typeof SCOPE === 'undefined') return [];
  const g = SCOPE.find(x => x.room === room);
  if(!g) return [];
  return g.tasks
    .filter(t => (t.changes || []).some(ch => ch.ver === verKey))
    .map(t => {
      /* Shop with Kai: the line as the scope list has it today, so its code
         and amount match the sidebar. The change records are a second seed
         whose codes and figures drifted from TASKS; matched by code, else by
         room and the name's first word. */
      const live = (SHOP_WITH_KAI && typeof TASKS !== 'undefined') ? (TASKS.find(x => x.code === t.code)
        || TASKS.find(x => x.room === room && x.name.toLowerCase().indexOf(t.name.toLowerCase().split(' ')[0]) !== -1)) : null;
      if(!live) return t;
      const picked = [];
      (live.options || []).forEach(o => { if(o.added !== false) (o.products || []).forEach(p => {
        if(productIsPicked(p) && _poDollars(p.parts) > 0) picked.push(p); }); });
      const prod = picked.length ? [picked[0].brand, picked[0].product].filter(Boolean).join(' ').trim()
        + (picked.length > 1 ? ` + ${picked.length - 1} more` : '') : '';
      return Object.assign({}, t, {code:live.code, amount:live.cost || t.amount,
        product:prod, qty:picked.length ? String(picked[0].qty || '') : ''});
    })
    .map(t => ({code:t.code, name:t.name, product:t.product || '',
                qty:t.qty || '', amount:t.amount || '',
                added:(t.changes || []).some(ch => ch.ver === verKey
                  && (ch.rows || []).some(r => r.field === 'Line added'))}));
}
/* One money format for the whole Record tab: exact, to the cent, so the
   same amount never reads differently in two places ($38,448.00 in the
   lead, the ledger and the document alike). */
function artMoney(n){
  const v = Number(n) || 0;
  return (v < 0 ? '−' : '') + '$' + Math.abs(v).toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2});
}
/* What the room's lines come to in this version. Summed from the same rows
   the group opens onto, so the figure and the lines under it are one sum. */
function _regGroupAmount(verKey, room){
  const ts = _regGroupTasks(verKey, room);
  if(!ts.length) return '';
  const n = ts.reduce((k, t) => k + (parseFloat(String(t.amount).replace(/[^0-9.\-]/g, '')) || 0), 0);
  return n ? artMoney(n) : '';
}
function toggleRegRow(id){
  _regOpenVer = (_regOpenVer === id) ? null : id;
  if(typeof renderArtifact === 'function') renderArtifact();
}

/* The a2 records (SCOPE / VER) hold what each version actually touched, keyed
   by their own ids. VERSIONS is the ladder this tab already renders. Same
   rungs, different keys — match them by position. */
function _regVerKey(v){
  if(typeof VER_ORDER === 'undefined') return null;
  return VER_ORDER[(v.num || 1) - 1] || null;
}
function _regCounts(v){
  const key = _regVerKey(v);
  if(!key || typeof _ovChangeCounts !== 'function') return null;
  try { return _ovChangeCounts(key); } catch(_){ return null; }
}
/* Added vs revised, off the same change rows the Overview reads. A line that
   appeared is a different act from one that was repriced, and the split is
   the first thing anyone asks about a change order's item count. */
function _regAddedRevised(v){
  const key = _regVerKey(v);
  if(!key || typeof SCOPE === 'undefined') return null;
  let added = 0, revised = 0;
  SCOPE.forEach(g => g.tasks.forEach(t => {
    const rows = (t.changes || []).filter(ch => ch.ver === key);
    if(!rows.length) return;
    const isAdd = rows.some(ch => (ch.rows || []).some(r => r.field === 'Line added'));
    if(isAdd) added++; else revised++;
  }));
  return (added || revised) ? {added, revised} : null;
}

/* How today's Job Total splits — the Record as index.html shows it.
   Precedence rather than overlap: a task held for a change order is Deferred
   whatever else it carries, so the three buckets partition the total exactly
   and the rows can be trusted to sum. */
function _regClassifyJob(){
  const modsOf = t => {
    const pm = (typeof taskProductMods === 'function') ? taskProductMods(t) : [];
    return new Set([...(t.mods || []), ...pm]);
  };
  const out = {ready:0, tenant:0, deferred:0, readyN:0, tenantN:0, deferredN:0};
  (typeof TASKS !== 'undefined' ? TASKS : []).forEach(t => {
    const m = modsOf(t), c = dollars(t.cost);
    if(m.has('deferred'))   { out.deferred += c; out.deferredN++; }
    else if(m.has('tenant')){ out.tenant   += c; out.tenantN++;   }
    else                    { out.ready    += c; out.readyN++;    }
  });
  out.total = out.ready + out.tenant + out.deferred;
  out.onPos = out.ready + out.tenant;   // deferred is not on a PO yet
  return out;
}

/* Shop with Kai's version: how the parts being bought split — the same walk the purchase order makes,
   so "On purchase orders" is the order's own total. Parts only: labour is not
   bought, and a task's stored total can lag its products until they are next
   edited, so neither belongs in a figure that names the order. Precedence
   rather than overlap: a deferred product (or one on a deferred task) is
   Deferred whatever else it carries, so the buckets partition exactly. */
function _regClassify(){
  /* Each bucket twice: the materials alone (what goes on the order) and the
     materials with the labour to install them (what the bucket costs). */
  const out = {ready:0, tenant:0, deferred:0, readyN:0, tenantN:0, deferredN:0,
               readyAll:0, tenantAll:0, deferredAll:0};
  (typeof TASKS !== 'undefined' ? TASKS : []).forEach(t => {
    const taskMods = t.mods || [];
    (t.options || []).forEach(o => {
      if(o.added === false) return;
      (o.products || []).forEach(p => {
        if(!productIsPicked(p)) return;
        const q = _poQtyNum(p.qty);
        const amt = q * _poDollars(p.parts);
        const all = q * (_poDollars(p.parts) + _poDollars(p.labor));
        const m = new Set([...taskMods, ...(p.mods || [])]);
        if(m.has('deferred'))   { out.deferred += amt; out.deferredAll += all; out.deferredN++; }
        else if(m.has('tenant')){ out.tenant   += amt; out.tenantAll   += all; out.tenantN++;   }
        else                    { out.ready    += amt; out.readyAll    += all; out.readyN++;    }
      });
    });
  });
  out.total = out.ready + out.tenant + out.deferred;
  out.onPos = out.ready + out.tenant;   // deferred is not on a PO yet
  out.onPosAll = out.readyAll + out.tenantAll;
  return out;
}

/* ════════════ PURCHASE ORDER ════════════
   What is being bought: every product picked in the scope — the rows the
   Departments view writes when a product is applied to a line — totalled by
   SKU, so a product on six tasks is one line for six of it. Parts only:
   labour is not bought from a store. Deferred products are held back, as the
   classification (_regClassify, the same walk) says; tenant-responsible ones are on the order but
   marked. Read live from TASKS, so it moves the moment a product is applied. */
function _poQtyNum(q){
  return (typeof _parseQtyNum === 'function') ? (_parseQtyNum(q) || 0)
    : (parseFloat(String(q || '0').replace(/[^0-9.-]/g,'')) || 0);
}
function _poDollars(d){
  return (typeof _parseDollars === 'function') ? (_parseDollars(d) || 0) : dollars(d);
}
/* The product's picture, where the catalogue has one: on the row itself, or
   on the catalogue entry its SKU came from. */
function _poImage(t, p){
  if(p.image) return p.image;
  if(!p.sku || typeof productPool !== 'function') return '';
  const hit = (productPool(t) || []).find(c => c.sku === p.sku);
  return (hit && hit.image) || '';
}
const _PO_THUMB_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M4 5.5h13l-1 4H5z"/><path d="M4 12h13v6H4z"/><path d="M8 8v4"/></svg>`;
/* A task code on the order is the way back to the task: it selects and
   highlights it in the scope list, and the order stays open. */
function _poTaskLink(code){
  const sel = (typeof selId !== 'undefined' && selId != null)
    && (TASKS.find(x => x.id === selId) || {}).code === code;
  return `<button type="button" class="po-ord-task${sel ? ' is-sel' : ''}"
    onclick="event.stopPropagation();artClickRow('${esc(code)}')" title="Show ${esc(code)} in the scope">${esc(code)}</button>`;
}
function _poItems(){
  const lines = {}, held = {n:0, amt:0};
  (typeof TASKS !== 'undefined' ? TASKS : []).forEach(t => {
    const taskDeferred = (t.mods || []).indexOf('deferred') !== -1;
    /* A product picked on a task the Departments view files as labour-only is
       still something being bought, so it goes under Other, not "No products
       needed". */
    let dept = (typeof taskLine === 'function') ? taskLine(t).dept : 'Other';
    if(typeof NO_PRODUCT_DEPT !== 'undefined' && dept === NO_PRODUCT_DEPT) dept = 'Other';
    (t.options || []).forEach(o => {
      if(o.added === false) return;
      (o.products || []).forEach(p => {
        if(!productIsPicked(p)) return;
        const qty = _poQtyNum(p.qty), price = _poDollars(p.parts);
        const mods = p.mods || [];
        if(taskDeferred || mods.indexOf('deferred') !== -1){ held.n++; held.amt += qty * price; return; }
        const key = p.sku || ((p.brand || '') + '|' + (p.product || ''));
        const unit = String(p.qty || '').replace(/[0-9.,\s]/g, '').trim();
        const L = lines[key] || (lines[key] = {sku:p.sku || '', brand:p.brand || '', product:p.product || '',
          dept, unit, price, qty:0, amt:0, tasks:[], tenant:false, tenantAmt:0, byTask:{}, image:_poImage(t, p)});
        L.qty += qty;
        L.amt += qty * price;
        if(L.tasks.indexOf(t.code) === -1) L.tasks.push(t.code);
        const bt = L.byTask[t.code] || (L.byTask[t.code] = {qty:0, tenantAmt:0});
        bt.qty += qty;
        if(mods.indexOf('tenant') !== -1 || (t.mods || []).indexOf('tenant') !== -1) bt.tenantAmt += qty * price;
        // Resident responsible on the task or the product, as the
        // classification reads it, so the marked lines add up to its figure.
        if(mods.indexOf('tenant') !== -1 || (t.mods || []).indexOf('tenant') !== -1){ L.tenant = true; L.tenantAmt += qty * price; }
      });
    });
  });
  /* Grouped by department, in the order the Departments view lists them. */
  const order = (typeof DEPARTMENTS !== 'undefined' ? DEPARTMENTS : []);
  const byDept = {};
  Object.keys(lines).forEach(k => { const L = lines[k]; (byDept[L.dept] = byDept[L.dept] || []).push(L); });
  const depts = Object.keys(byDept).sort((a, b) => {
    const ia = order.indexOf(a), ib = order.indexOf(b);
    return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib) || a.localeCompare(b);
  }).map(d => ({dept:d, lines:byDept[d].sort((a, b) => b.amt - a.amt)}));
  return {depts, held};
}
/* ── Purchase orders ───────────────────────────────────────────────
   The scope's products as the orders that actually go out: one per supplier
   per approved document, because an order that has been sent is never edited.
   A change order adds new orders, and takes something back with a
   cancellation. Prototype mock: the split of lines into suppliers, sources and
   statuses is staged here; the lines and their amounts are _poItems()'s own,
   so every order together still comes to the materials on the bar. */
const _PO_SHIP_TO = '3484 South Main Street, Atlanta, GA 30315';
const _PO_CATEGORY = {
  'Appliances':'Appliances', 'Bathroom':'Plumbing', 'Electrical':'Electrical', 'Flooring':'Flooring',
  'Hardware':'Hardware', 'Heating & Cooling':'Ventilation', 'Kitchen':'Cabinets & Countertops',
  'Lighting & Ceiling Fans':'Lighting', 'Paint':'Paint', 'Storage & Organization':'Storage',
  'Windows & Doors':'Doors & Windows',
};
const _PO_CATEGORY_ORDER = ['Appliances','Cabinets & Countertops','Plumbing','Ventilation','Flooring',
  'Electrical','Lighting','Hardware','Doors & Windows','Paint','Storage','Tools','Other'];
function _poCategory(L){
  if(_PO_CATEGORY[L.dept]) return _PO_CATEGORY[L.dept];
  const n = ((L.brand || '') + ' ' + (L.product || '')).toLowerCase();
  if(/fan|light|lamp/.test(n)) return 'Lighting';
  if(/pressure|karcher|washer|drill|saw/.test(n)) return 'Tools';
  return 'Other';
}
// Mock routing: specialists take their categories, the rest goes to Home Depot.
const _PO_SUPPLIER_BY_CAT = {Flooring:'fd', Plumbing:'fer', Ventilation:'fer'};
// Mock: what each change order put on an order of its own. Only tasks the
// change order itself touched (the ledger's own sub-rows), and never more
// materials than its net change, so the two always read together. `qty` is
// how much of the line it ordered; null takes the whole line.
const _PO_CO_LINES = [
  {task:'GAR-9B10', src:2, qty:null},   // CO1 added the door opener
  {task:'MBD-A7AE', src:3, qty:null},   // CO2 added the closet
  {task:'LIV-53D7', src:3, qty:1},      // CO2 revised the living-room fan
];
// Mock: CO1 revised the countertops down a slab after the original order
// was sent. The slab stays on that order (sent orders are never edited) and
// comes off with a cancellation, so the sum is the scope's own.
const _PO_CANCEL = {task:'KIT-F362', src:2, qty:1};
// Mock: what each order has got to.
const _PO_STATUS = {'hd|1':'Confirmed', 'fer|1':'Delivered', 'fd|1':'Delivered',
  'hd|2':'Confirmed', 'fer|2':'Confirmed', 'fd|2':'Confirmed', 'hd|3':'Ready to send', 'fer|3':'Ready to send', 'fd|3':'Ready to send'};
const _PO_SUPPLIER_ORDER = ['hd', 'fer', 'fd', 'low'];
function _poSourceLabel(num){
  return num <= 1 ? 'Original scope' : `Change Order ${num - 1}`;
}
function _poOrders(){
  const {depts, held} = _poItems();
  const vers = VERSIONS.slice().sort((a, b) => a.num - b.num);
  const hasNum = n => vers.some(v => v.num === n);
  const dateFor = n => (vers.find(v => v.num === n) || vers[0] || {}).at || '';
  const byKey = {};
  const orderFor = (sup, src) => {
    const k = sup + '|' + src;
    return byKey[k] || (byKey[k] = {id:'po-' + sup + '-' + src, sup, src, cancel:false, lines:[]});
  };
  // A piece of a line: `k` of its quantity, for the given tasks, carrying
  // those tasks' own resident-responsible share.
  const piece = (L, k, tasks) => Object.assign({}, L, {qty:k, amt:k * L.price, tasks,
    tenantAmt:tasks.reduce((x, c) => x + (((L.byTask || {})[c] || {}).tenantAmt || 0), 0)});
  const cancels = [];
  depts.forEach(d => d.lines.forEach(L => {
    if(!(L.amt > 0)) return;            // nothing to buy (a labour-only row)
    const cat = _poCategory(L);
    const sup = _PO_SUPPLIER_BY_CAT[cat] || 'hd';
    let rest = Object.assign({}, L, {cat});
    _PO_CO_LINES.forEach(r => {
      if(!rest || !hasNum(r.src) || rest.tasks.indexOf(r.task) === -1) return;
      const whole = r.qty == null || r.qty >= rest.qty;
      if(whole){ orderFor(sup, r.src).lines.push(rest); rest = null; return; }
      const pc = piece(rest, r.qty, [r.task]);
      orderFor(sup, r.src).lines.push(pc);
      const left = rest.tasks.length > 1 ? rest.tasks.filter(c => c !== r.task) : rest.tasks;
      rest = piece(rest, rest.qty - r.qty, left);
      // One task split across two orders: its share is counted once.
      if(left.indexOf(r.task) !== -1) rest.tenantAmt = Math.max(0, rest.tenantAmt - pc.tenantAmt);
    });
    if(!rest) return;
    if(hasNum(_PO_CANCEL.src) && rest.tasks.indexOf(_PO_CANCEL.task) !== -1){
      // The original order carried one more; the cancellation takes it off.
      const extra = _PO_CANCEL.qty;
      orderFor(sup, 1).lines.push(Object.assign({}, rest, {qty:rest.qty + extra, amt:(rest.qty + extra) * rest.price}));
      cancels.push({sup, of:'po-' + sup + '-1', line:Object.assign({}, rest, {qty:-extra, amt:-extra * rest.price, tenant:false, tenantAmt:0})});
      return;
    }
    orderFor(sup, 1).lines.push(rest);
  }));
  const orders = Object.keys(byKey).map(k => byKey[k]);
  cancels.forEach((c, i) => orders.push({id:'po-' + c.sup + '-' + _PO_CANCEL.src + '-x' + (i || ''), sup:c.sup,
    src:_PO_CANCEL.src, cancel:true, of:c.of, lines:[c.line]}));
  orders.forEach(o => {
    o.supName = (typeof supplierName === 'function' ? supplierName(o.sup) : '') || o.sup;
    o.srcLabel = _poSourceLabel(o.src);
    const rec = _poRec(o.id);
    o.draft = rec.state === 'draft';
    o.holderRole = rec.holderRole; o.holderName = rec.holderName;
    o.approvedAt = rec.approvedAt || '';
    // Sending only starts once an order is approved; a draft has no send state.
    o.status = o.draft ? 'Draft' : (rec.sendStatus || (o.cancel ? 'Sent' : (_PO_STATUS[o.sup + '|' + o.src] || 'Sent')));
    o.date = dateFor(o.src);
    o.docId = 'PO-' + _sowIdFor(_sowIdFor(o.id) + '|purchase-order|' + o.id).slice(4);
    o.amt = o.lines.reduce((s, L) => s + L.amt, 0);
    o.name = o.supName + ' · ' + o.srcLabel + (o.cancel ? ' · Cancellation' : '');
    o.lines.forEach(L => { L.ok = !o.draft || rec.ok.has(_poLineKey(L)); });
    o.okN = o.lines.filter(L => L.ok).length;
  });
  const supRank = s => { const i = _PO_SUPPLIER_ORDER.indexOf(s); return i < 0 ? 99 : i; };
  orders.sort((a, b) => supRank(a.sup) - supRank(b.sup) || a.src - b.src || (a.cancel ? 1 : 0) - (b.cancel ? 1 : 0));
  return {orders, held, total:orders.reduce((s, o) => s + o.amt, 0)};
}
/* ── An order's life: Draft, then Approved ───────────────────────────
   Draft while someone holds it — the person whose turn it is works it and
   hands it off with the Hand off button, top right. Approved once the job
   manager has approved each item and then the order itself, the way step 3
   approves each task and then the scope. Only an approved order is sent, so
   the send states (Ready to send, Sent, Confirmed, Delivered) come after.
   Prototype mock: Change Order 2's Home Depot order is the draft, with the
   job manager; every earlier order is approved and on its way. */
const _PO_DRAFT_IDS = ['po-hd-3'];
const PO_STATE = {};
function _poCtx(){
  try{ if(window.parent && window.parent !== window && window.parent.kaiPoContext) return window.parent.kaiPoContext(); }catch(e){}
  return {role:'manager', me:'T. Okafor', people:{manager:{name:'T. Okafor'}}};
}
function _poRec(id){
  if(!PO_STATE[id]){
    const ppl = _poCtx().people || {};
    PO_STATE[id] = {state:_PO_DRAFT_IDS.indexOf(id) !== -1 ? 'draft' : 'approved',
      holderRole:'manager', holderName:(ppl.manager || {}).name || 'T. Okafor', ok:new Set()};
  }
  return PO_STATE[id];
}
function _poLineKey(L){ return L.sku || ((L.brand || '') + '|' + (L.product || '')); }
function _poMine(o){ return !!o && o.holderRole === _poCtx().role; }
function _poCanApprove(o){ return !!o && o.draft && _poMine(o) && _poCtx().role === 'manager'; }
/* Whose turn, said the way the ledger's draft row says it. */
function _poTurnTxt(o){ return _poMine(o) ? 'Your turn' : `${o.holderName}'s turn`; }

function poApproveLine(id, key){
  poApMenu = null;
  _poRec(id).ok.add(key);
  if(typeof toast === 'function') toast('Item approved');
  _poRerender();
}
function poApproveAllLines(id){
  poApMenu = null;
  const o = _poOrderById(id); if(!o) return;
  const rec = _poRec(id);
  const n = o.lines.filter(L => !rec.ok.has(_poLineKey(L))).length;
  o.lines.forEach(L => rec.ok.add(_poLineKey(L)));
  if(typeof toast === 'function') toast(`${n} item${n === 1 ? '' : 's'} approved`);
  _poRerender();
}
/* With a note: the note goes on the line's task, and saving it is the
   approval — the same arrangement the scope's Approve with note uses. */
function poApproveLineWithNote(id, key, code){
  poApMenu = null;
  const t = TASKS.find(x => x.code === code);
  if(!t || typeof openDrawer !== 'function'){ poApproveLine(id, key); return; }
  apPendingApproval = () => poApproveLine(id, key);
  openDrawer(t.id, 'notes');
  if(typeof dwNoteHidden !== 'undefined') dwNoteHidden = false;
  if(typeof dwTab === 'function') dwTab('notes');
  if(typeof toast === 'function') toast('Write a note to approve');
}
function poApproveOrder(id){
  const rec = _poRec(id);
  rec.state = 'approved';
  rec.sendStatus = 'Ready to send';
  rec.approvedAt = new Date().toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'});
  if(typeof toast === 'function') toast('Purchase order approved');
  _poRerender();
}
function poHandedOff(id, name, roleId){
  const rec = _poRec(id);
  rec.holderName = name; rec.holderRole = roleId;
  _poRerender();
}
function poTakeTurn(id){
  const c = _poCtx(), rec = _poRec(id);
  rec.holderRole = c.role; rec.holderName = c.me;
  if(typeof toast === 'function') toast('Purchase order is yours');
  _poRerender();
}
function _poRerender(){
  if(workMode === 'artifact') renderArtifact();
  if(workMode === 'shop' && typeof selLineKey !== 'undefined' && selLineKey && typeof renderWork === 'function') renderWork();
  if(typeof _renderPoSide === 'function') _renderPoSide();
  if(typeof renderSidebar === 'function') renderSidebar();
  _poSyncFocus();
}
/* The draft order on screen, if any: the order document on the Record tab,
   else (ShopwithKai_layout.html) the one in the left panel. */
function _poFocusedDraft(){
  let id = null;
  if(workMode === 'artifact' && openPoDoc) id = openPoDoc;
  else if(typeof SHOP_LAYOUT !== 'undefined' && SHOP_LAYOUT && (typeof poSide !== 'undefined' && poSide)) id = _poFocusOrderId();
  const o = id ? _poOrderById(id) : null;
  return o && o.draft ? o : null;
}
function _poSyncFocus(){
  if(!SHOP_WITH_KAI) return;
  const o = _poFocusedDraft();
  const f = o ? {id:o.id, name:o.name, supplier:o.supName, holder:o.holderName, holderRole:o.holderRole,
    done:o.okN, total:o.lines.length,
    onTake:() => poTakeTurn(o.id), onHandedOff:(n, r) => poHandedOff(o.id, n, r), onApprove:() => poApproveOrder(o.id)} : null;
  try{ if(window.parent && window.parent !== window && window.parent.kaiPoFocus) window.parent.kaiPoFocus(f); }catch(e){}
}
// A reloaded panel starts with nothing on screen; drop any focus the last
// one left with the shell, whose callbacks died with it.
try{ if(SHOP_WITH_KAI && window.parent && window.parent !== window && window.parent.kaiPoFocus) window.parent.kaiPoFocus(null); }catch(e){}
/* The latest order: the draft being worked if there is one, else the most
   recent approved one. The layout file's left panel shows only this. */
function _poFocusOrderId(){
  const {orders} = _poOrders();
  const rank = o => o.src * 2 + (o.cancel ? 0 : 1);
  const pick = list => list.slice().sort((a, b) => rank(b) - rank(a))[0];
  const o = pick(orders.filter(x => x.draft)) || pick(orders.filter(x => !x.draft));
  return o ? o.id : null;
}

/* The approve control, in the scope's own shape: a button with a menu, and
   a done state it never leaves. */
let poApMenu = null;
function poApToggle(key){ poApMenu = poApMenu === key ? null : key; _poRerender(); }
document.addEventListener('click', () => { if(poApMenu){ poApMenu = null; _poRerender(); } });
function _poApproveCtrl(done, menuKey, onConfirm, onNote, doneTxt, label){
  if(done) return `<span class="ap-ctrl is-done"><svg viewBox="0 0 14 14" aria-hidden="true"><path d="M2.5 7.5l3 3 6-7"/></svg>${doneTxt || 'Approved'}</span>`;
  const open = poApMenu === menuKey;
  return `<span class="ap-wrap">
    <button type="button" class="ap-ctrl${open ? ' is-open' : ''}" aria-haspopup="menu" aria-expanded="${open}"
      onclick="event.stopPropagation();poApToggle('${esc(menuKey)}')">${label || 'Approve'}
      <svg class="ap-caret" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5l3 3 3-3"/></svg>
    </button>
    ${open ? `<div class="ap-menu" role="menu" onclick="event.stopPropagation()">
      <button type="button" class="ap-item" role="menuitem" onclick="event.stopPropagation();${onConfirm}">
        <svg class="ap-ico" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5l3.5 3.5L13 4"/></svg>Confirm approve
      </button>
      ${onNote ? `<button type="button" class="ap-item" role="menuitem" onclick="event.stopPropagation();${onNote}">
        <svg class="ap-ico" viewBox="0 0 16 16" aria-hidden="true"><path d="M10 1.5H3.5v13h9V4z"/><path d="M9.5 1.5V4.5h3"/></svg>Approve with note
      </button>` : ''}
    </div>` : ''}
  </span>`;
}
/* A line's control, or nothing where approving isn't this viewer's move. */
function _poLineCtrl(o, L){
  if(!o.draft) return '';
  const key = _poLineKey(L);
  if(!_poCanApprove(o)) return L.ok ? _poApproveCtrl(true) : '<span class="po-line-pending">Pending</span>';
  const k = key.replace(/'/g, "\\'");
  return _poApproveCtrl(L.ok, 'line:' + o.id + ':' + key,
    `poApproveLine('${o.id}','${k}')`, `poApproveLineWithNote('${o.id}','${k}','${esc(L.tasks[0] || '')}')`);
}
/* The order's own line: who holds it, how far the approvals have got, and
   for the manager whose turn it is, Approve all. */
function _poDraftBarHtml(o){
  if(!o.draft) return '';
  const all = o.okN === o.lines.length;
  const can = _poCanApprove(o);
  return `<div class="po-draft-bar">
    <div class="po-draft-l">
      <span class="po-status is-draft">Draft</span>
      <span class="po-draft-turn">${esc(_poTurnTxt(o))}</span>
      <span class="po-draft-n">${o.okN} of ${o.lines.length} item${o.lines.length === 1 ? '' : 's'} approved</span>
    </div>
    <div class="po-draft-r">${can
      ? (all ? '<span class="po-draft-next">Approve the order, top right</span>'
             : _poApproveCtrl(false, 'order:' + o.id, `poApproveAllLines('${o.id}')`, '', '', 'Approve all items'))
      : `<span class="po-draft-next">${_poMine(o) ? 'Hand it off when you’re done' : 'Take the turn to work on it'}</span>`}</div>
  </div>`;
}

function _poOrderById(id){
  const {orders} = _poOrders();
  return orders.find(o => o.id === id) || orders[0] || null;
}
function _poStatusCls(s){
  return {'Draft':'is-draft', 'Ready to send':'is-ready', 'Sent':'is-sent', 'Confirmed':'is-confirmed', 'Delivered':'is-delivered'}[s] || '';
}
/* One order as a table — the body of its document. Grouped by category, the
   way a supplier picks it, never by room. */
function _poTableHtml(order){
  const fmt = n => artMoney(n);
  const qtyTxt = L => (Math.round(Math.abs(L.qty) * 100) / 100).toLocaleString('en-US') + (L.unit ? ' ' + L.unit : '');
  const byCat = {};
  order.lines.forEach(L => { (byCat[L.cat] = byCat[L.cat] || []).push(L); });
  const rank = c => { const i = _PO_CATEGORY_ORDER.indexOf(c); return i < 0 ? 99 : i; };
  const cats = Object.keys(byCat).sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
  const nLines = order.lines.length;
  const ap = order.draft;   // a draft carries an approval per item
  const apTd = L => ap ? `<td class="po-ord-ap">${_poLineCtrl(order, L)}</td>` : '';
  const body = cats.map(c => {
    const lines = byCat[c].sort((a, b) => Math.abs(b.amt) - Math.abs(a.amt));
    const sub = lines.reduce((x, L) => x + L.amt, 0);
    return `<tr class="po-ord-dept"><td colspan="4">${esc(c)}</td>
        <td class="reg-num">${fmt(sub)}</td>${ap ? '<td></td>' : ''}</tr>`
      + lines.map(L => `<tr class="reg-row${ap && L.ok ? ' is-approved' : ''}">
        <td class="po-ord-thumb"><div class="sec-taskcard-product-thumb">${L.image
          ? `<img src="${esc(L.image)}" alt="" loading="lazy" onerror="this.replaceWith(document.createRange().createContextualFragment(_PO_THUMB_SVG))">`
          : _PO_THUMB_SVG}</div></td>
        <td class="po-ord-item">
          <span class="po-ord-name">${esc([L.brand, L.product].filter(Boolean).join(' ') || 'Product')}</span>${L.tenantAmt > 0
            ? `<span class="reg-chip is-quiet">${L.tenantAmt < L.amt - 0.005 ? artMoney(L.tenantAmt) + ' ' : ''}Resident responsible</span>` : ''}
          <span class="po-ord-sub">${L.sku ? 'SKU ' + esc(L.sku) + ' · ' : ''}For ${L.tasks.map(_poTaskLink).join(', ')}</span>
        </td>
        <td class="reg-num">${order.cancel ? '−' : ''}${esc(qtyTxt(L))}</td>
        <td class="reg-num">${fmt(L.price)}${L.unit ? '<span class="po-ord-per"> / ' + esc(L.unit) + '</span>' : ''}</td>
        <td class="reg-num reg-total">${fmt(L.amt)}</td>${apTd(L)}
      </tr>`).join('');
  }).join('');
  return `<table class="reg-table po-ord">
      <thead><tr>
        <th class="po-ord-itemh" colspan="2">Item</th><th class="reg-num">Qty</th><th class="reg-num">Unit price</th><th class="reg-num">Amount</th>${ap ? '<th class="po-ord-ap">Approval</th>' : ''}
      </tr></thead>
      <tbody>
        ${body || `<tr><td colspan="${ap ? 6 : 5}" class="po-ord-empty">Nothing on this order.</td></tr>`}
        ${nLines ? `<tr class="reg-row is-grand">
          <td colspan="2">Order amount<span class="po-ord-sub">${nLines} product${nLines === 1 ? '' : 's'} · at cost, never includes markup</span></td>
          <td></td><td></td>
          <td class="reg-num reg-total"><span class="po-at-cost">At cost</span>${fmt(order.amt)}</td>${ap ? '<td></td>' : ''}
        </tr>` : ''}
      </tbody>
    </table>`;
}
/* On the Record's index: every order, grouped by supplier. A sent order is
   never edited, so a change shows up as another row, never as a changed one. */
function _renderPurchaseOrderSection(){
  if(typeof TASKS === 'undefined' || !TASKS.length) return '';
  const {orders, held, total} = _poOrders();
  const regular = orders.filter(o => !o.cancel);
  const nCancel = orders.length - regular.length;
  const notSent = orders.filter(o => o.status === 'Ready to send').length;
  const drafts = orders.filter(o => o.draft).length;
  const summary = [
    `${regular.length} order${regular.length === 1 ? '' : 's'}`,
    nCancel ? `${nCancel} cancellation${nCancel === 1 ? '' : 's'}` : '',
    drafts ? `${drafts} draft` : '',
    notSent ? `${notSent} approved, not sent yet` : '',
    !drafts && !notSent ? 'all sent' : '',
  ].filter(Boolean).join(' · ');
  const sups = [];
  orders.forEach(o => { if(sups.indexOf(o.sup) === -1) sups.push(o.sup); });
  const rows = sups.map(s => {
    const list = orders.filter(o => o.sup === s);
    return `<tr class="po-sup-row"><td colspan="5">${esc(list[0].supName)}<span class="po-sup-n">${list.length} order${list.length === 1 ? '' : 's'}</span></td></tr>`
      + list.map(o => `<tr class="reg-row is-openable${o.cancel ? ' is-cancel' : ''}" data-po-src="${o.src}"
          onclick="${_poOpenCall(o.id)}" title="View ${esc(o.name)}">
        <td class="reg-doc">
          <span class="reg-doc-name">${esc(o.name)}</span>
          <button type="button" class="reg-doc-view" onclick="event.stopPropagation();${_poOpenCall(o.id)}" aria-label="View ${esc(o.name)}">View</button>
          <span class="po-row-id">${esc(o.docId)}</span>
        </td>
        <td class="po-c-src"><span class="po-src-tag">${esc(o.srcLabel)}</span></td>
        <td class="po-c-status"><span class="po-status ${_poStatusCls(o.status)}">${esc(o.status)}</span>
          <span class="po-status-sub">${o.draft ? esc(_poTurnTxt(o)) + ` · ${o.okN}/${o.lines.length}` : 'Approved'}</span></td>
        <td class="reg-num po-c-n">${o.lines.length}</td>
        <td class="reg-num reg-total po-c-amt"><span class="po-at-cost">At cost</span>${artMoney(o.amt)}</td>
      </tr>`).join('');
  }).join('');
  return `<section class="art-sec art-po" id="artPo">
    <header class="art-sec-hdr">
      <div class="art-sec-hdr-l">
        <h2 class="art-sec-title">Purchase orders</h2>
        <p class="art-sec-desc">${esc(summary)}</p>
      </div>
    </header>
    <div class="reg-table-scroll">
      <table class="reg-table art-list po-list">
        <thead><tr>
          <th class="reg-doc">Order</th><th class="po-c-src">Source</th><th class="po-c-status">Status</th>
          <th class="reg-num po-c-n">Products</th><th class="reg-num po-c-amt">Order amount</th>
        </tr></thead>
        <tbody>
          ${rows || `<tr><td colspan="5" class="po-ord-empty">No products picked yet.</td></tr>`}
          ${orders.length ? `<tr class="reg-row is-grand">
            <td class="reg-doc">All orders<span class="po-ord-sub">The materials on the bar above</span></td>
            <td></td><td></td><td></td>
            <td class="reg-num reg-total"><span class="po-at-cost">At cost</span>${artMoney(total)}</td>
          </tr>` : ''}
        </tbody>
      </table>
    </div>
    <div class="po-list-note">Order amounts are at cost and never include markup. Sent orders are never edited. A change goes out as a new order, or as a cancellation.${held.n
      ? ` ${held.n} deferred product${held.n === 1 ? '' : 's'} (${artMoney(held.amt)}) wait for a change order.` : ''}</div>
  </section>`;
}
/* How an order opens: on its own page, or (ShopwithKai_layout.html) in the
   left panel beside the Editor. */
function _poOpenCall(id){ return `openPoDocView('${id}')`; }
/* One order on its own page: the document that goes to the supplier. */
function _renderPoDoc(id){
  const o = _poOrderById(id);
  if(!o) return _renderArtifactIndex();
  const orig = o.cancel ? _poOrderById(o.of) : null;
  return `<div class="copy-doc-wrap">
    <div class="copy-crumb">
      <button class="copy-crumb-back" onclick="closePoDocView()" title="Back to the Record">
        <span aria-hidden="true">‹</span> Back
      </button>
      <span class="copy-crumb-div"></span>
      <span class="copy-crumb-name">${esc(o.name)}</span>
      <span class="copy-crumb-sp"></span>
      ${typeof SHOP_LAYOUT !== 'undefined' && SHOP_LAYOUT && o.id === _poFocusOrderId() ? `<button type="button" class="reg-doc-view is-strong" onclick="openPoSide()">Review beside the Editor</button>` : ''}
    </div>
    <div class="copy-paper po-paper${o.cancel ? ' is-cancel' : ''}">
      <div class="art-head">
        <div class="art-head-l">
          <div class="art-eyebrow">${o.cancel ? 'Order cancellation' : 'Purchase order'}</div>
          <div class="art-title">${esc(o.supName)}</div>
          <div class="art-sub-info">Ship to: ${esc(_PO_SHIP_TO)}</div>
        </div>
        <div class="po-head-r">
          <div class="art-meta"><div class="art-meta-k">Status</div>
            <div class="art-meta-v"><span class="po-status ${_poStatusCls(o.status)}">${esc(o.status)}</span>${o.draft
              ? `<span class="po-meta-sub">${esc(_poTurnTxt(o))}</span>`
              : `<span class="po-meta-sub">Approved${o.approvedAt ? ' ' + esc(o.approvedAt) : ''}</span>`}</div></div>
          <div class="art-meta"><div class="art-meta-k">Source</div>
            <div class="art-meta-v">From ${esc(o.srcLabel)}</div></div>
          <div class="art-meta"><div class="art-meta-k">Prepared</div>
            <div class="art-meta-v">${esc(o.date)}</div></div>
          <div class="art-meta"><div class="art-meta-k">Document ID</div>
            <div class="art-meta-v art-meta-docid">${esc(o.docId)}</div></div>
        </div>
      </div>
      <div class="po-doc-notes">
        ${orig ? `<div class="po-doc-note is-cancel">Cancels part of ${esc(orig.docId)} (${esc(orig.name)}). That order was sent, so it stays as it was.</div>` : ''}
        <div class="po-doc-note">Materials only. Labor for these tasks is paid to the contractor.</div>
        <button type="button" class="po-doc-job" onclick="closePoDocView()">Part of the job at 3484 South Main Street<span aria-hidden="true">›</span></button>
      </div>
      ${_poDraftBarHtml(o)}
      <div class="po-ord-paper">${_poTableHtml(o)}</div>
    </div>
  </div>`;
}
let openPoDoc = false;   // the id of the order on screen, or false
function openPoDocView(id){
  const o = _poOrderById(id);
  if(!o) return;
  openCopyId = null; openHistoricalId = null; openPoDoc = o.id;
  renderArtifact();
  if(typeof _artToTop === 'function') _artToTop();
}
function closePoDocView(){
  openPoDoc = false;
  renderArtifact();
  if(typeof _artToTop === 'function') _artToTop();
}
/* The bar's Materials label: down to the Purchase orders section. */
function regGoToPo(){
  const el = document.getElementById('artPo');
  if(el) el.scrollIntoView({behavior:'smooth', block:'start'});
}
/* A ledger row's orders link: down to the orders it produced, lit briefly. */
function regShowOrders(src){
  const sec = document.getElementById('artPo');
  if(!sec) return;
  const rows = [...sec.querySelectorAll(`tr[data-po-src="${src}"]`)];
  sec.querySelectorAll('tr.is-flash').forEach(r => r.classList.remove('is-flash'));
  (rows[0] || sec).scrollIntoView({behavior:'smooth', block:'center'});
  rows.forEach(r => { r.classList.remove('is-flash'); void r.offsetWidth; r.classList.add('is-flash'); });
  clearTimeout(regShowOrders._t);
  regShowOrders._t = setTimeout(() => rows.forEach(r => r.classList.remove('is-flash')), 2600);
}
/* The tab bar's and the Departments line page's link: to the orders on the
   Record tab. */
function openPurchaseOrder(){
  if(typeof SHOP_LAYOUT !== 'undefined' && SHOP_LAYOUT){ openPoSide(); return; }
  if(typeof setWorkMode === 'function') setWorkMode('artifact');
  if(openPoDoc || openCopyId || openHistoricalId){
    openPoDoc = false; openCopyId = null; openHistoricalId = null;
    renderArtifact();
  }
  requestAnimationFrame(() => regGoToPo());
}

/* The ledger, oldest first. `total` is each document's Job Total as of its
   approval, derived by unwinding the later changes from today's figure. */
function _regLedger(){
  const ordered = VERSIONS.slice().sort((a,b) => a.num - b.num);
  const live = (typeof TASKS !== 'undefined' ? TASKS : []).reduce((s,t) => s + dollars(t.cost), 0);
  // Each document's own movement, from the version ladder's budgets. The
  // budgets disagree with the live scope in absolute terms but the steps
  // between them are the real change-order amounts.
  const rows = ordered.map((v, i) => {
    const prev = i ? ordered[i-1] : null;
    return {v, change: prev ? (dollars(v.budget) - dollars(prev.budget)) : null};
  });
  // Walk today's total backwards so the last row lands on it exactly.
  let running = live;
  for(let i = rows.length - 1; i >= 0; i--){
    rows[i].total = running;
    running -= (rows[i].change || 0);
  }
  // The walk assumes the live scope is the same body of work the ladder
  // describes. Where it isn't — a seeded ladder against a scope that has been
  // emptied or heavily cut — the derivation runs past zero and starts printing
  // negative money. Fall back to each document's own budget then: those no
  // longer agree with the sidebar, but a figure that disagrees beats a job
  // total of minus fourteen hundred dollars.
  if(rows.some(r => r.total < 0)){
    rows.forEach(r => { r.total = dollars(r.v.budget); });
    return {rows, live: rows[rows.length-1].total, derived:false};
  }
  return {rows, live, derived:true};
}

/* ── Markup ─────────────────────────────────────────────────────────
   An org setting (overhead + profit), copied into the job at approval and
   seen only by the org that set it. Prototype mock: one flat rate, applied
   on top of the job total for display. The demo toggle shows the three
   people who look at this page: an org that marks up, one that doesn't,
   and the customer the org shares it with, who sees a price with the
   markup folded in and never named. */
const REG_MARKUP = {pct:20, setAt:'approval'};
/* Parked: the demo toggle is off and the Record reads as an org without
   markup. Set this to 'markup' or 'shared' (and put _regViewAsHtml() back at
   the top of the index) to bring the other two views back. */
let regViewAs = 'plain';           // 'markup' | 'plain' | 'shared'
function setRegViewAs(v){
  regViewAs = v; _regLabOpen = false;
  if(typeof renderArtifact === 'function') renderArtifact();
}
function _regViewAsHtml(){
  const opts = [['markup', 'Org with markup'], ['plain', 'Org without markup'], ['shared', 'Shared with customer']];
  return `<div class="reg-viewas">
    <span class="reg-viewas-k">Demo · Viewing as</span>
    <div class="sb-tools-seg" role="tablist" aria-label="Viewing as">
      ${opts.map(([k, l]) => `<button type="button" role="tab" aria-selected="${regViewAs === k}"
        class="${regViewAs === k ? 'active' : ''}" onclick="setRegViewAs('${k}')">${l}</button>`).join('')}
    </div>
  </div>`;
}
/* An amount on the basis the page is viewed on: with the markup on top in
   the markup and shared views, as it is otherwise. Cents, never rounded
   to dollars, so the rows still add up to the figure above them. */
function _regPriced(n){
  if(!SHOP_WITH_KAI || regViewAs === 'plain') return n;
  return Math.round(n * (1 + REG_MARKUP.pct / 100) * 100) / 100;
}
/* Labour by contractor: each task's labour (its total less its materials,
   as the scope document prints it), for the tasks not waiting on a change
   order. Adds up to the bar's labour segment. */
let _regLabOpen = false;
function toggleRegLabour(ev){
  if(ev) ev.stopPropagation();
  _regLabOpen = !_regLabOpen;
  if(typeof renderArtifact === 'function') renderArtifact();
}
document.addEventListener('click', e => {
  if(_regLabOpen && !e.target.closest('.reg-lab-pop')){ _regLabOpen = false; renderArtifact(); }
});
document.addEventListener('keydown', e => {
  if(_regLabOpen && e.key === 'Escape'){ _regLabOpen = false; renderArtifact(); }
});
function _regLabourByContractor(){
  const by = {};
  (typeof TASKS !== 'undefined' ? TASKS : []).forEach(t => {
    if((t.mods || []).indexOf('deferred') !== -1) return;
    const lab = Math.max(0, dollars(t.cost) - _taskMaterials(t));
    if(!lab) return;
    const who = t.gc || 'Not yet assigned';
    const r = by[who] || (by[who] = {who, amt:0, n:0});
    r.amt += lab; r.n++;
  });
  return Object.keys(by).map(k => by[k]).sort((a, b) => (a.who === 'Not yet assigned') - (b.who === 'Not yet assigned') || b.amt - a.amt);
}
function _regLabourPopHtml(){
  const rows = _regLabourByContractor();
  const tot = rows.reduce((s, r) => s + r.amt, 0);
  return `<div class="reg-lab-pop" role="dialog" aria-label="Labor by contractor" onclick="event.stopPropagation()">
    <div class="reg-lab-pop-hd">Labor by contractor
      <button type="button" class="reg-lab-pop-x" onclick="toggleRegLabour(event)" aria-label="Close">×</button></div>
    <ul class="reg-lab-pop-list">${rows.map(r => `<li${r.who === 'Not yet assigned' ? ' class="is-none"' : ''}>
      <span class="reg-lab-pop-who">${esc(r.who)}<span class="reg-lab-pop-n">${r.n} task${r.n === 1 ? '' : 's'}</span></span>
      <span class="reg-lab-pop-amt">${artMoney(r.amt)}</span></li>`).join('')}
      <li class="is-total"><span class="reg-lab-pop-who">Labor</span><span class="reg-lab-pop-amt">${artMoney(tot)}</span></li>
    </ul>
    <div class="reg-lab-pop-note">Rates from the Cost Book, copied at approval.</div>
  </div>`;
}

function _renderRegisterSection(){
  // An empty scope has no job total to account for, and the seeded version
  // ladder describes work that isn't there. The sidebar already says "Empty
  // scope"; a register of nothing would only dress that up as an accounting.
  if(typeof TASKS === 'undefined' || !TASKS.length) return '';
  const {rows, live} = _regLedger();
  if(!rows.length) return '';
  const cls = _regClassify();
  const first = rows[0];
  const approvedChange = rows.slice(1).reduce((s,r) => s + (r.change || 0), 0);
  const coCount = rows.length - 1;
  const cur = VERSIONS.find(v => v.id === currentVersionId) || rows[rows.length-1].v;
  const curTag = versionTag(cur);

  const fmt = n => artMoney(n);
  const sgn = n => (n > 0 ? '+' : n < 0 ? '−' : '') + artMoney(Math.abs(n));

  /* ── Three figures, in the order the question is asked: what was approved,
        what has moved it since, what it is now. */
  const cards = `<div class="reg-cards">
    <div class="reg-card">
      <div class="reg-card-lbl">Initial approved scope</div>
      <div class="reg-card-val">${fmt(first.total)}</div>
      <div class="reg-card-sub">${esc(first.v.at)} · ${TASKS.length} item${TASKS.length===1?'':'s'}</div>
    </div>
    <div class="reg-card">
      <div class="reg-card-lbl">Approved changes</div>
      <div class="reg-card-val">${sgn(approvedChange)}</div>
      <div class="reg-card-sub">${coCount} Change Order${coCount===1?'':'s'}</div>
    </div>
    <div class="reg-card is-current">
      <div class="reg-card-lbl">Current job total</div>
      <div class="reg-card-val">${fmt(live)}</div>
      <div class="reg-card-sub">${esc(versionLabel(cur))}${curTag.tag?' · '+esc(curTag.tag):''}</div>
    </div>
  </div>`;

  /* ── Classification, as index.html has it: the job total, by task. */
  const jobCls = SHOP_WITH_KAI ? null : _regClassifyJob();
  const classifyJob = SHOP_WITH_KAI ? '' : `<table class="reg-cls">
    <caption>How the job total is classified</caption>
    <tbody>
      ${[
        {name:'Ready to order',    chip:'',                      note:'In purchase orders',                  val:jobCls.ready,    n:jobCls.readyN},
        {name:'Tenant responsible',chip:'Tracked cost',          note:'In purchase orders, reported separately', val:jobCls.tenant, n:jobCls.tenantN, chipCls:'is-quiet'},
        {name:'Deferred',          chip:'Procure on Change Order', note:'Held until a Change Order is approved', val:jobCls.deferred, n:jobCls.deferredN, chipCls:'is-quiet'},
      ].filter(r => r.n > 0).map(r => `<tr>
          <th>${esc(r.name)}${r.chip?`<span class="reg-chip ${r.chipCls||''}">${esc(r.chip)}</span>`:''}</th>
          <td class="reg-cls-note">${esc(r.note)}</td>
          <td class="reg-num">${fmt(r.val)}</td>
        </tr>`).join('')}
      <tr class="is-total">
        <th>On purchase orders</th>
        <td class="reg-cls-note">Ready to order plus tracked cost</td>
        <td class="reg-num">${fmt(jobCls.onPos)}</td>
      </tr>
    </tbody>
  </table>`;

  /* ── Shop with Kai: classification of the parts. "On Purchase Orders" deliberately
        excludes Deferred: the whole point of that modifier is that the money
        is not committed. In cents, as the purchase order prints them, so the
        two totals read the same. */
  const fmtc = n => '$' + n.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2});
  const clsRows = [
    {name:'Ready to order',    chip:'',                      note:'Materials go on the purchase order; labor is paid to the contractor', val:cls.ready, all:cls.readyAll, n:cls.readyN},
    {name:'Tenant responsible',chip:'Tracked cost',          note:'On the purchase order, reported separately, with materials and labor', val:cls.tenant, all:cls.tenantAll, n:cls.tenantN, chipCls:'is-quiet'},
    {name:'Deferred',          chip:'Procure on Change Order', note:'Materials and labor held until a Change Order is approved', val:cls.deferred, all:cls.deferredAll, n:cls.deferredN, chipCls:'is-quiet'},
  ].filter(r => r.n > 0).map(r => `<tr>
      <th>${esc(r.name)}${r.chip?`<span class="reg-chip ${r.chipCls||''}">${esc(r.chip)}</span>`:''}</th>
      <td class="reg-cls-note">${esc(r.note)}</td>
      <td class="reg-num">${fmtc(r.val)}</td>
      <td class="reg-num">${fmtc(r.all)}</td>
    </tr>`).join('');

  /* Two columns rather than two tables: what each bucket puts on the order
     (materials) and what it costs once it is installed (materials + labour).
     Only the materials figure is the purchase order's, so only it opens it. */
  const classify = !SHOP_WITH_KAI ? classifyJob : `<table class="reg-cls">
    <thead><tr>
      <th colspan="2">How the scope is classified</th>
      <th class="reg-num">Materials</th><th class="reg-num">Materials + labor</th>
    </tr></thead>
    <tbody>
      ${clsRows}
      <tr class="is-total">
        <th>On purchase orders</th>
        <td class="reg-cls-note">Ready to order plus tracked cost</td>
        <td class="reg-num is-link"><button type="button" class="reg-cls-link" onclick="openPoDocView()"
          title="Open the purchase order">${fmtc(cls.onPos)}</button><span class="reg-cls-go" aria-hidden="true">&rsaquo;</span></td>
        <td class="reg-num">${fmtc(cls.onPosAll)}</td>
      </tr>
    </tbody>
  </table>`;

  /* ── Shop with Kai: the job total as the whole, and what it's made of.
        One figure leads; under it, a single bar splits it three ways —
        materials (on the purchase orders), labour (paid to contractors) and
        work not yet ordered (deferred). Tenant-responsible money isn't a part
        of its own: it's marked inside the segments that carry it.
        Figures are whole dollars and come straight from the classification:
        materials is the purchase orders' total, not-yet-ordered is deferred
        materials and labour, and labour is what's left, so the three always
        add up to the figure above them. */
  const whole = n => artMoney(n);
  const leadMat = cls.onPos;
  const leadLater = cls.deferredAll;
  // Prototype display choice: labour is the remainder, so the bar always
  // adds up to the job total above it.
  const leadLab = Math.max(0, live - leadMat - leadLater);
  const tenMat = cls.tenant;
  const tenLab = Math.max(0, cls.tenantAll - cls.tenant);
  const view = regViewAs;
  const shared = view === 'shared';
  const livePrice = _regPriced(live);
  const markupAmt = Math.round((livePrice - live) * 100) / 100;
  /* Shared with the customer: the markup is folded into the materials and
     labour of every segment, in proportion, and never named. Not yet
     ordered is materials and labour too, so it carries its share; labour
     takes the last cent so the three still add up to the price. */
  let matShown = leadMat, labShown = leadLab, laterShown = leadLater;
  let laterSplit = [cls.deferred, Math.max(0, cls.deferredAll - cls.deferred)];
  if(shared && markupAmt){
    matShown = _regPriced(leadMat);
    laterShown = _regPriced(leadLater);
    labShown = Math.round((livePrice - matShown - laterShown) * 100) / 100;
    const sm = _regPriced(laterSplit[0]);
    laterSplit = [sm, Math.round((laterShown - sm) * 100) / 100];
  }
  const segs = [
    {key:'mat', icon:'cart', label:'Materials, ordered through Kai', amt:matShown, tenant:shared ? 0 : tenMat, link:shared ? '' : 'regGoToPo()'},
    {key:'lab', icon:'hardhat', label:'Labor, paid to contractors', amt:labShown, tenant:shared ? 0 : tenLab, link:shared ? '' : 'toggleRegLabour(event)', pop:true},
    {key:'later', icon:'', label:'Not yet ordered', amt:laterShown, sub:'Waiting on a change order', split:laterSplit},
    view === 'markup' ? {key:'mk', icon:'', label:'Your markup', amt:markupAmt, sub:'Seen only by your org'} : null,
  ].filter(sg => sg && sg.amt > 0);
  const leadLbl = view === 'markup' ? 'Price to customer' : shared ? 'Price' : 'Current job total';
  const firstShown = _regPriced(first.total), changeShown = _regPriced(approvedChange);
  // Resident-responsible money, in full words: under each segment that
  // carries it when there's room, else one line under the whole bar.
  const resParts = segs.filter(sg => sg.tenant > 0);
  const resLine = resParts.length
    ? `<div class="reg-res-line">Includes ${resParts.map(sg => `${whole(sg.tenant)} resident responsible in ${sg.key === 'mat' ? 'materials' : 'labor'}`).join(' and ')}</div>`
    : '';
  const totalBar = segs.reduce((a, sg) => a + sg.amt, 0) || 1;
  const lead = `<div class="reg-lead">
    <div class="reg-lead-lbl">${leadLbl}</div>
    <div class="reg-lead-top">
    <div class="reg-lead-val">${whole(livePrice)}</div>
    <div class="reg-lead-sub">Initial scope: ${whole(firstShown)}<span class="sep">·</span>${coCount} approved change order${coCount === 1 ? '' : 's'}${changeShown ? ` (${changeShown > 0 ? '+' : '−'}${whole(Math.abs(changeShown))})` : ''}</div>
    </div>
    <div class="reg-bar" role="img" aria-label="${esc(segs.map(sg => `${sg.label} ${whole(sg.amt)}`).join(', '))}">
      ${segs.map(sg => `<span class="reg-bar-seg is-${sg.key}" style="flex-grow:${sg.amt}" title="${esc(sg.label)} · ${whole(sg.amt)} · ${Math.round(sg.amt / totalBar * 100)}%"></span>`).join('')}
    </div>
    <div class="reg-bar-keys">
      ${segs.map(sg => `<div class="reg-bar-key is-${sg.key}">
        <div class="reg-bar-key-lbl"><span class="reg-bar-swatch is-${sg.key}" aria-hidden="true"></span>${sg.link
          ? `<button type="button" class="reg-bar-link" onclick="${sg.link}"${sg.pop ? ` aria-expanded="${_regLabOpen}"` : ''}
              title="${sg.pop ? 'See who is paid for the labor' : 'Go to the purchase orders'}">${esc(sg.label)}<span aria-hidden="true">›</span></button>`
          : `<span>${esc(sg.label)}</span>`}${sg.pop && sg.link && _regLabOpen ? _regLabourPopHtml() : ''}</div>
        <div class="reg-bar-key-amt">${whole(sg.amt)}</div>
        ${sg.tenant ? `<div class="reg-bar-key-note is-res">Includes ${whole(sg.tenant)} resident responsible</div>`
          : sg.sub ? `<div class="reg-bar-key-note">${esc(sg.sub)}</div>${sg.split ? `<div class="reg-bar-key-note is-split">${whole(sg.split[0])} materials + ${whole(sg.split[1])} labor</div>` : ''}` : ''}
      </div>`).join('')}
    </div>
    ${resParts.length ? resLine : ''}
    ${view === 'markup' ? `<div class="reg-mk-line">Markup ${REG_MARKUP.pct}% · set at ${esc(REG_MARKUP.setAt)}</div>` : ''}
  </div>`;

  /* ── The ledger. One row per approved document, then today's total.
        Built oldest-first, because each row's index is how it knows whether
        it is the original scope, and reversed at the end so the newest
        document is the one the eye lands on. */
  /* Shop with Kai: each approved document names what it sent out — its
     orders, as a link down to them — and the status says only whether it is
     the document in force. */
  const poBySrc = {};
  if(SHOP_WITH_KAI) _poOrders().orders.forEach(o => {
    const b = poBySrc[o.src] || (poBySrc[o.src] = {n:0, cancel:0});
    if(o.cancel) b.cancel++; else b.n++;
  });
  const ordersLink = (v, i) => {
    const b = poBySrc[v.num];
    if(!b) return '';
    const txt = (i ? '+' : '') + `${b.n} order${b.n === 1 ? '' : 's'}` + '';
    return `<button type="button" class="reg-doc-orders" onclick="event.stopPropagation();regShowOrders(${v.num})"
      title="Show these orders${b.cancel ? ` and ${b.cancel} cancellation${b.cancel === 1 ? '' : 's'}` : ''}">${txt}</button>`;
  };
  const docName = v => (SHOP_WITH_KAI && v.num <= 1) ? 'Original scope' : versionLabel(v);
  const ledgerRows = rows.map((r, i) => {
    const v = r.v;
    const tag = SHOP_WITH_KAI
      ? (v.id === cur.id ? {tag:'Current', tagCls:''} : {tag:'Outdated', tagCls:'outdated'})
      : versionTag(v);
    const counts = i ? _regCounts(v) : null;
    const open = _regOpenVer === v.id;
    /* The original scope's count is what it was approved with: today's
       tasks less the ones each later change order added. */
    const addedLater = SHOP_WITH_KAI && !i
      ? rows.slice(1).reduce((n, x) => n + ((_regAddedRevised(x.v) || {}).added || 0), 0) : 0;
    const items = i ? (counts ? counts.tasks : null) : TASKS.length - addedLater;
    const canOpen = !!(counts && counts.detail && counts.detail.length);
    const head = `<tr class="reg-row${open?' is-open':''}${canOpen?' is-openable':''}"${canOpen?` onclick="toggleRegRow('${v.id}')"`:''}>
      <td class="reg-date">${esc(v.at)}</td>
      <td class="reg-doc">
        ${canOpen?`<span class="reg-caret" aria-hidden="true"><svg viewBox="0 0 12 12" fill="none"><path d="M4.5 3L7.5 6l-3 3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`:'<span class="reg-caret is-blank"></span>'}
        <span class="reg-doc-name">${esc(docName(v))}</span>
        <button type="button" class="reg-doc-view" onclick="event.stopPropagation();openHistorical('${v.id}')"
          aria-label="View ${esc(docName(v))}">View</button>
        ${SHOP_WITH_KAI ? `${regViewAs === 'shared' ? '' : ordersLink(v, i)}<span class="po-row-id">${esc(_sowIdFor(v.id))}</span>` : ''}
      </td>
      <td class="reg-status">${tag.tag?`<span class="hist-card-tag hist-tag-${esc(tag.tagCls||'')}">${esc(tag.tag)}</span>`:''}</td>
      <td class="reg-num reg-items">${items != null ? items : '—'}</td>
      <td class="reg-num">${r.change == null ? (SHOP_WITH_KAI ? '—' : 'Approved') : sgn(_regPriced(r.change))}</td>
      <td class="reg-num reg-total">${fmt(_regPriced(r.total))}</td>
    </tr>`;
    if(!open || !canOpen) return head;
    const ar = _regAddedRevised(v);
    /* A sentence, not two pills: the counts say what happened to the scope,
       and "2 added / 5 revised" made the reader supply the nouns. */
    const chips = ar ? `<div class="reg-sub-chips">${[
      ar.added ? `${ar.added} new task${ar.added === 1 ? '' : 's'} added` : '',
      ar.revised ? `${ar.revised} task${ar.revised === 1 ? '' : 's'} edited` : ''
    ].filter(Boolean).join(', ')}</div>` : '';
    const verKey = _regVerKey(v);
    const groups = counts.detail.map(g => {
      const gk = `${v.id}|${g.room}`;
      const open = !!_regOpenGroups[gk];
      const rows = open ? _regGroupTasks(verKey, g.room).map(t => `
        <div class="reg-task is-go" role="button" tabindex="0"
          onclick="event.stopPropagation();ovGoTask('${esc(t.code)}','${esc(g.room).replace(/'/g, "\\'")}','${esc(t.name).replace(/'/g, "\\'")}')"
          onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();event.stopPropagation();ovGoTask('${esc(t.code)}','${esc(g.room).replace(/'/g, "\\'")}','${esc(t.name).replace(/'/g, "\\'")}');}">
          <span class="reg-task-l">
            <span class="reg-task-name" data-hv-code="${esc(t.code)}"
              data-hv-name="${esc(t.name)}" data-hv-room="${esc(g.room)}">${esc(t.name)}</span>${t.added
              ? `<span class="reg-task-new">New</span>` : ''}
            <span class="reg-task-sub"><span class="reg-task-code">${esc(t.code)}</span>${t.product
              ? ` \u00b7 <span class="reg-task-prod" data-hv-product="${esc(t.product)}"
                  data-hv-code="${esc(t.code)}" data-hv-room="${esc(g.room)}">${esc(t.product)}</span>`
              : ' \u00b7 <span class="reg-task-none">No product selected</span>'}</span>
          </span>
          <span class="reg-task-r">
            <span class="reg-task-qty">${esc(t.qty)}</span>
            <span class="reg-task-amt">${t.amount ? artMoney(parseFloat(String(t.amount).replace(/[^0-9.\-]/g, '')) || 0) : ''}</span>
          </span>
        </div>`).join('') : '';
      return `<div class="reg-sub-g${open ? ' is-open' : ''}">
        <button class="reg-sub-row" aria-expanded="${open}"
          onclick="event.stopPropagation();toggleRegGroup('${esc(gk).replace(/'/g, "\\'")}')"
          aria-label="${open ? 'Hide' : 'Show'} the lines this changed in ${esc(g.room)}">
          <span class="reg-sub-name" data-hv-room="${esc(g.room)}">${esc(g.room)}</span>
          <span class="reg-sub-n">${g.tasks.length} ${g.tasks.length === 1 ? 'task' : 'tasks'}</span>
          <span class="reg-sub-amt">${esc(_regGroupAmount(verKey, g.room))}</span>
          <span class="reg-sub-go" aria-hidden="true"><svg viewBox="0 0 12 12" fill="none"><path d="M4.5 3L7.5 6l-3 3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
        </button>
        ${open ? `<div class="reg-tasks">${rows}</div>` : ''}
      </div>`;
    }).join('');
    return head + `<tr class="reg-sub"><td colspan="6">
      ${chips}
      <div class="reg-sub-list">${groups}</div>
      <div class="reg-sub-note">Each group opens onto the lines it changed.</div>
    </td></tr>`;
  }).reverse().join('');

  /* ── Anything staged but not approved sits below the line, excluded from
        the total. Only rendered when there actually is something. */
  let pending = '';
  const staged = (typeof TASKS !== 'undefined' && typeof taskHasOpenChangeOrder === 'function')
    ? TASKS.filter(t => taskHasOpenChangeOrder(t)) : [];
  let pendingRow = '';
  if(staged.length && SHOP_WITH_KAI){
    /* In the ledger's own grid, so every value sits under its header. */
    const d = (typeof scopeDelta === 'function') ? scopeDelta() : 0;
    const t = (typeof _ovTurn === 'function') ? _ovTurn() : null;
    const who = (t && t.who) || 'Quinn';
    const draft = {num:VERSIONS.length+1, id:'draft-' + (VERSIONS.length+1)};
    pendingRow = `<tr class="reg-pending-caprow"><td colspan="6">Not approved · not included in the job total</td></tr>
      <tr class="reg-row is-draft">
        <td class="reg-date">—</td>
        <td class="reg-doc"><span class="reg-caret is-blank"></span><span class="reg-doc-name">${esc(versionLabel(draft))}</span>
          <span class="po-row-id">${esc(_sowIdFor(draft.id))}</span></td>
        <td class="reg-status"><span class="reg-draft-tag">Draft · ${esc(who)}'s turn</span></td>
        <td class="reg-num reg-items">${staged.length}</td>
        <td class="reg-num">${d ? sgn(_regPriced(d)) : '—'}</td>
        <td class="reg-num reg-total is-quiet">In progress</td>
      </tr>`;
  } else if(staged.length){
    const d = (typeof scopeDelta === 'function') ? scopeDelta() : 0;
    pending = `<div class="reg-pending-cap">Not approved · not included in the job total</div>
      <table class="reg-table reg-table-pending"><tbody><tr class="reg-row">
        <td class="reg-date">Draft</td>
        <td class="reg-doc"><span class="reg-caret is-blank"></span><span class="reg-doc-name">${esc(versionLabel({num:VERSIONS.length+1}))}</span></td>
        <td class="reg-status"></td>
        <td class="reg-num reg-items">${staged.length}</td>
        <td class="reg-num">${d ? sgn(d) : '—'}</td>
        <td class="reg-num reg-total is-quiet">In progress</td>
      </tr></tbody></table>`;
  }

  return `<section class="art-sec art-reg">
    <header class="art-sec-hdr">
      <div class="art-sec-hdr-l">
        <h2 class="art-sec-title">Register</h2>
        <p class="art-sec-desc">Every event that changed the job total, and how it is classified today.</p>
      </div>
    </header>
    ${SHOP_WITH_KAI ? lead : cards}
    ${SHOP_WITH_KAI ? '' : classify}
    <div class="reg-table-scroll">
      <table class="reg-table reg-ledger">
        <thead><tr>
          <th class="reg-date">Date</th><th class="reg-doc">Document</th><th class="reg-status">Status</th>
          <th class="reg-num reg-c-items">Line items</th><th class="reg-num reg-c-change">Change</th><th class="reg-num reg-c-total">${!SHOP_WITH_KAI || regViewAs === 'plain' ? 'Job total' : regViewAs === 'shared' ? 'Price' : 'Price to customer'}</th>
        </tr></thead>
        <tbody>
          ${ledgerRows}
          <tr class="reg-row is-grand">
            <td class="reg-date"></td>
            <td class="reg-doc"><span class="reg-caret is-blank"></span><span class="reg-doc-name">${!SHOP_WITH_KAI || regViewAs === 'plain' ? 'Current job total' : regViewAs === 'shared' ? 'Current price' : 'Current price to customer'}</span></td>
            <td class="reg-status"></td><td class="reg-num reg-items"></td><td class="reg-num"></td>
            <td class="reg-num reg-total">${fmt(_regPriced(live))}</td>
          </tr>
          ${pendingRow}
        </tbody>
      </table>
      ${pending}
    </div>
  </section>`;
}
function _renderHistoricalSection(){
  // Historical artifacts = the audit trail, one row per version in the
  // Register's own ledger table, newest first — the same order and the same
  // tags the ledger above uses, so the two read as one record. A row opens
  // its read-only document. Rows instead of cards so a job with a dozen
  // change orders stays a short list.
  const ordered = VERSIONS.slice().sort((a,b) => b.num - a.num);
  // Each version's total from the Register's own ledger, so the two tables
  // can never disagree about what a document came to.
  const ledgerTotal = {};
  if(typeof TASKS !== 'undefined' && TASKS.length) _regLedger().rows.forEach(r => { ledgerTotal[r.v.id] = r.total; });
  const rows = ordered.map(v => {
    const label = versionLabel(v);
    const tag = versionTag(v);
    const isCurrent = v.id === currentVersionId;
    const outdated = !isCurrent && tag.tagCls === 'outdated';
    return `<tr class="reg-row is-openable${outdated ? ' is-dim' : ''}" onclick="openHistorical('${v.id}')" title="View ${esc(label)}">
      <td class="reg-date">${esc(v.at)}</td>
      <td class="reg-doc">
        <span class="reg-doc-name">${esc(label)}</span>
        <button type="button" class="reg-doc-view" onclick="event.stopPropagation();openHistorical('${v.id}')" aria-label="View ${esc(label)}">View</button>
      </td>
      <td class="reg-status">${tag.tag ? `<span class="hist-card-tag hist-tag-${esc(tag.tagCls||'')}">${esc(tag.tag)}</span>` : ''}</td>
      <td class="reg-docid">${esc(_sowIdFor(v.id))}</td>
      <td class="reg-num reg-total">${ledgerTotal[v.id] != null ? artMoney(ledgerTotal[v.id]) : (v.budget ? artMoney(dollars(v.budget)) : '—')}</td>
    </tr>`;
  }).join('');
  return `<section class="art-sec">
    <header class="art-sec-hdr">
      <div class="art-sec-hdr-l">
        <h2 class="art-sec-title">Historical artifacts</h2>
        <p class="art-sec-desc">Review the original scope and each change-order version for this job.</p>
      </div>
    </header>
    <div class="reg-table-scroll">
      <table class="reg-table art-list hist-list">
        <thead><tr>
          <th class="reg-date">Date</th><th class="reg-doc">Document</th><th class="reg-status">Status</th>
          <th class="reg-docid">Document ID</th><th class="reg-num reg-c-total2">Total</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  </section>`;
}
function _renderCopiesSection(){
  // Same ledger table: what the copy is, what it's cut from, who it's
  // filtered to, and when its link stops working. Newest first. The filters
  // are a compact line rather than chips, so a row stays one line tall.
  const list = SCOPE_COPIES.slice().sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  const rows = list.map(c => {
    const expired = copyIsExpired(c);
    const ver = VERSIONS.find(v => v.id === c.basedOnVersionId) || {num:1};
    const filters = _copyFilterSummary(c);
    const n = _copyTasks(c.filters).length;
    return `<tr class="reg-row is-openable${expired ? ' is-dim' : ''}" onclick="openCopy('${c.id}')" title="Open ${esc(c.name)}">
      <td class="reg-doc">
        <span class="reg-doc-name">${esc(c.name)}</span>
      </td>
      <td class="reg-ver">${esc(versionLabel(ver))}</td>
      <td class="reg-filters" title="${esc(filters.join(' · '))}"><span class="reg-filters-n">${n} ${n === 1 ? 'task' : 'tasks'}</span><span class="reg-filters-txt">${esc(filters.join(' · '))}</span></td>
      <td class="reg-date">${_fmtDate(c.createdAt)}</td>
      <td class="reg-act">
        <button type="button" class="reg-doc-view" onclick="event.stopPropagation();copyCopyLink('${c.id}')">Copy link</button>
        <button type="button" class="reg-doc-view is-strong" onclick="event.stopPropagation();openCopy('${c.id}')">Open</button>
      </td>
    </tr>`;
  }).join('');
  const empty = SCOPE_COPIES.length ? '' : `<div class="copy-empty">
    <div class="copy-empty-title">No copies yet</div>
    <div class="copy-empty-desc">Create a filtered, read-only copy to share with anyone who needs a look.</div>
  </div>`;
  return `<section class="art-sec">
    <header class="art-sec-hdr">
      <div class="art-sec-hdr-l">
        <h2 class="art-sec-title">Shareable copies</h2>
        <p class="art-sec-desc">Create and share a filtered, read-only copy of any scope version with a link.</p>
      </div>
      <button class="art-sec-cta" onclick="openNewCopy()">
        <svg viewBox="0 0 12 12" fill="none"><path d="M6 2v8M2 6h8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
        New copy
      </button>
    </header>
    ${list.length ? `<div class="reg-table-scroll">
      <table class="reg-table art-list">
        <thead><tr>
          <th class="reg-doc">Copy</th><th class="reg-ver">Based on</th><th class="reg-filters">Filters</th>
          <th class="reg-date">Created</th><th class="reg-act"></th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>` : empty}
  </section>`;
}
// Deterministic 8-char hex "document ID" derived from any seed string.
// Not crypto — just a stable-looking identifier for the paper header
// (matches the visual language of internal doc numbers).
function _sowIdFor(seed){
  let h = 0; const s = String(seed || '');
  for(let i = 0; i < s.length; i++){ h = ((h << 5) - h + s.charCodeAt(i)) | 0; }
  return 'SOW-' + Math.abs(h).toString(16).toUpperCase().padStart(8, '0').slice(0, 8);
}
/* ── the submitter's internal note ───────────────────────────────────
   A document explains what the work is; it does not explain why it was sent
   when it was. That belongs to whoever submitted it, and it is internal — so it
   sits above the paper rather than in it, where a shared copy would carry it out
   of the building.

   Author and subject are read off the version's own changes rather than written
   down again here: whoever authored the most of them submitted it, and the
   contractor named is one actually assigned to a line that version touched. Both
   come from Artifact 2's history, which is the same script scope. Falls back to
   the review roster and the contractor list when that history is not loaded. */
function _histVerId(v){
  // VERSIONS is v1/v2/v3, the change history is orig/co1/co2 — same ladder,
  // different names, matched by position.
  if(typeof VER_ORDER === 'undefined') return null;
  return VER_ORDER[(v.num || 1) - 1] || null;
}
function _histNoteFor(v){
  const ver = _histVerId(v);
  const changes = [];
  if(ver && typeof SCOPE !== 'undefined'){
    SCOPE.forEach(g => g.tasks.forEach(t => (t.changes || []).forEach(ch => {
      if(ch.ver === ver) changes.push({ch, t});
    })));
  }
  // Whoever made the most changes in this version is who sent it.
  const tally = {};
  changes.forEach(({ch}) => {
    if(!ch.who) return;
    tally[ch.who] = tally[ch.who] || {who:ch.who, role:ch.role || '', n:0};
    tally[ch.who].n++;
  });
  const author = Object.values(tally).sort((a, b) => b.n - a.n)[0]
    || (typeof REVIEWERS !== 'undefined' ? REVIEWERS[REVIEWERS.length - 1] : {who:'M. Alvarez', role:'Field Agent'});
  // A contractor on one of the lines this version touched, so the note is about
  // work the reader can actually find in the document below it.
  const gcs = [...new Set(changes.map(({t}) => t.gc).filter(Boolean))];
  // Stepped by version, so successive notes are not all about the same firm.
  const gc = gcs[((v.num || 1) - 1) % (gcs.length || 1)] || gcs[0]
    || (typeof CONTRACTORS !== 'undefined' ? CONTRACTORS[0] : 'the contractor');
  const added   = changes.filter(({ch}) => ch.ct === 'added').length;
  const removed = changes.filter(({ch}) => ch.ct === 'removed').length;
  const lines = n => `${n} line${n === 1 ? '' : 's'}`;
  const text = ((v.num || 1) === 1)
    ? `Submitting scope for approval while ${gc}'s availability is pending. A change order may follow within the week to confirm.`
    : removed
      ? `${gc} confirmed dates and the resident took ${lines(removed)} back out, so this is the scope as it now stands. Nothing else is waiting on anyone.`
      : `${gc} came back with dates, so this carries the revised labor${added ? ` and ${lines(added)} the last walk turned up` : ''}. Sending it up now rather than holding the whole scope for it.`;
  /* The note was written when the version was submitted, not when it was
     approved — so v.at is the wrong date to put on it. The earliest sign-off is
     the last moment the document must already have existed, which is the closest
     honest stand-in; a version nobody has signed falls back to its own date. */
  const sigs = (ver && typeof REVIEWS !== 'undefined' ? REVIEWS.filter(r => r.ver === ver) : [])
    .map(r => r.date).sort((a, b) => Date.parse(a) - Date.parse(b));
  return {who:author.who, role:author.role, text, when: sigs[0] || v.at || ''};
}
/* The same notes, for the Notes drawer opened from the Scope row. They are
   scope-level internal notes that happen to live on a document, so a reader
   going through the project's notes should find them there too — otherwise the
   only way to know why a version was sent when it was is to open all three
   artifacts. Shaped for dwNotes(), newest first.

   Internal, so a contractor viewing the same drawer does not get them. The
   drawer does not filter on `hidden` — it only badges it — so the filtering has
   to happen here. */
function _histSubmissionNotes(){
  if(typeof IS_CONTRACTOR !== 'undefined' && IS_CONTRACTOR) return [];
  if(typeof VERSIONS === 'undefined') return [];
  return VERSIONS.slice()
    .sort((a, b) => (b.num || 0) - (a.num || 0))
    .map(v => {
      const n = _histNoteFor(v);
      if(!n) return null;
      return {
        who: n.who, role: n.role, when: n.when, body: n.text,
        // The chip says what the note is attached to, and for these that is the
        // document rather than a level in the scope.
        level: versionLabel(v),
        hidden: true,
      };
    })
    .filter(Boolean);
}
// _renderHistoricalDoc — read-only view of a frozen version. Reuses
// _renderCopyPaper with a synthetic "no filters" copy so we don't
// duplicate the paper render logic. No filter strip, no Share button —
// only a back link, meta chip, and Print.
function _renderHistoricalDoc(v){
  const readOnlyCopy = {
    id:'hist_'+v.id,
    name: versionLabel(v),
    description:'',
    basedOnVersionId: v.id,
    createdAt: v.at,
    filters:{showAmounts:true, contractor:null, renterOnly:false},
    _isHistorical: true,
  };
  const tag = versionTag(v);
  return `<div class="copy-doc-wrap hist-doc-wrap">
    <div class="copy-crumb hist-crumb">
      <button class="copy-crumb-back" onclick="closeHistorical()" title="Back to the Register">
        <svg viewBox="0 0 8 12" aria-hidden="true"><path d="M6 1.5L1.5 6 6 10.5"/></svg> Back
      </button>
      <span class="copy-crumb-div"></span>
      <span class="copy-crumb-meta">Approved ${esc(v.at)}</span>
      <span class="copy-crumb-sp"></span>
      ${tag.tag ? `<span class="hist-doc-tag hist-tag-${esc(tag.tagCls||'')}">${esc(tag.tag)}</span>` : ''}
      <button class="hist-print-btn" onclick="window.print()" title="Print this artifact">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4.5 5V2h7v3M4.5 12H3V6h10v6h-1.5M4.5 9h7v5h-7z" stroke-linecap="round" stroke-linejoin="round"/></svg>
        Print
      </button>
      <button class="hist-print-btn" onclick="exportHistorical('${esc(v.id)}')" title="Export this artifact">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8 2v8M4.5 6.5L8 10l3.5-3.5M2.5 11v2.5h11V11" stroke-linecap="round" stroke-linejoin="round"/></svg>
        Export
      </button>
    </div>
    <div class="copy-paper hist-paper">${_renderCopyPaper(readOnlyCopy)}</div>
  </div>`;
}
/* No export pipeline in the prototype yet, so this says what it would do
   rather than pretending to hand over a file. */
function exportHistorical(vid){
  const v = (typeof VERSIONS !== 'undefined') ? VERSIONS.find(x => x.id === vid) : null;
  if(typeof toast === 'function') toast(`Exporting ${v ? versionLabel(v) : 'this artifact'} — not wired up in the prototype yet`);
}
function _renderCopyIndex(){
  // Legacy alias — used to be the sole index; now delegates to the
  // two-section artifact index so anything that still calls it works.
  return _renderArtifactIndex();
}

/* ── Copy filters ─────────────────────────────────────────────────────
   A copy holds the tasks that pass its filters. Four categories, each a set
   of values: contractor, modifier, status and flag. Values within one
   category are alternatives (Contractor A or Contractor B); categories narrow
   each other (Contractor A and Deferred = only A's deferred tasks). An empty
   category doesn't narrow anything.

   The options mirror the navigator's Filters menu: Flags (missing product,
   unassigned contractor, out of stock, change order), Task status in two
   bands — In Draft (Empty, Draft, Approved) and In Construction (Not
   started, In progress, Rework, Completed) — and Modifiers. Flags and
   modifiers are the navigator's own keys (taskKeys), plus 'missing' for a
   task with no product chosen.

   Older copies named one contractor (filters.contractor) and had a
   resident-only switch (filters.renterOnly); both read as the matching
   values here. */
const _COPY_FLAG_KEYS = ['missing', 'no_gc', 'oos', 'co_open'];
const _COPY_FLAG_LABEL = {missing:'Missing product', no_gc:'Unassigned contractor', oos:'Out of stock', co_open:'Change order'};
// Modifier names as the Filters menu prints them.
const _COPY_MOD_LABEL = {tenant:'Tenant Responsible'};
const _COPY_STATUSES = [
  {value:'empty',       label:'Empty',       group:'In Draft'},
  {value:'draft',       label:'Draft',       group:'In Draft'},
  {value:'approved',    label:'Approved',    group:'In Draft'},
  {value:'not_started', label:'Not started', group:'In Construction'},
  {value:'in_progress', label:'In progress', group:'In Construction'},
  {value:'rework',      label:'Rework',      group:'In Construction'},
  {value:'completed',   label:'Completed',   group:'In Construction'},
];
function _copyContractors(filters){
  if(!filters) return [];
  if(Array.isArray(filters.contractors)) return filters.contractors.slice();
  return filters.contractor ? [filters.contractor] : [];
}
function _copyFilterValues(filters, key){
  filters = filters || {};
  if(key === 'contractors') return _copyContractors(filters);
  if(key === 'mods'){
    if(Array.isArray(filters.mods)) return filters.mods.slice();
    return filters.renterOnly ? ['tenant'] : [];
  }
  return Array.isArray(filters[key]) ? filters[key].slice() : [];
}
/* Which of the seven statuses a task is in. Before construction it's how
   far the task has got — nothing on it yet (Empty), something but not
   approved (Draft), or approved; once work starts it's the work state the
   row pill shows. */
function _copyTaskStatus(t){
  const mode = (typeof PROJ_MODE !== 'undefined') ? PROJ_MODE : 'draft';
  if(mode === 'work' || mode === 'closeout' || mode === 'closeout-approved'){
    const st = (typeof _pgdRowStatusMeta === 'function') ? _pgdRowStatusMeta(t) : null;
    const lbl = st ? st.label : '';
    if(/rework/i.test(lbl)) return 'rework';
    if(/progress/i.test(lbl)) return 'in_progress';
    if(/complete|approved/i.test(lbl)) return 'completed';
    return 'not_started';
  }
  if(typeof approved !== 'undefined' && approved.has(t.id)) return 'approved';
  const fill = (typeof _pgdRowCompleteness === 'function') ? _pgdRowCompleteness(t) : 'started';
  return fill === 'empty' ? 'empty' : 'draft';
}
function _copyTaskKeys(t){
  const keys = (typeof taskKeys === 'function') ? taskKeys(t) : [];
  // Missing product: no product chosen, the same test the row status uses.
  const hasProd = (typeof _pgdHasProduct === 'function') ? _pgdHasProduct(t) : !!t.product;
  if(!hasProd && !keys.includes('missing')) keys.push('missing');
  // The resident modifier also covers tasks the demo data marks as resident
  // supplied without tagging them — the same reading the old switch used.
  if(!keys.includes('tenant') && typeof isTenantTask === 'function' && isTenantTask(t)) keys.push('tenant');
  return keys;
}
function _copyTaskMatches(t, filters){
  const gcs = _copyFilterValues(filters, 'contractors');
  if(gcs.length && !gcs.includes(t.gc || '__un')) return false;
  const keys = _copyTaskKeys(t);
  const mods = _copyFilterValues(filters, 'mods');
  if(mods.length && !mods.some(m => keys.includes(m))) return false;
  const sts = _copyFilterValues(filters, 'statuses');
  if(sts.length && !sts.includes(_copyTaskStatus(t))) return false;
  const flags = _copyFilterValues(filters, 'flags');
  if(flags.length && !flags.some(f => keys.includes(f))) return false;
  return true;
}
function _copyTasks(filters){
  return TASKS.filter(t => _copyTaskMatches(t, filters));
}
/* The options each category offers, with how many tasks carry each one.
   Contractors are the ones actually on tasks in the scope, plus Unassigned
   when some tasks have nobody; modifiers are every one the org has, used or
   not, as in the navigator; statuses are the stage's vocabulary plus any
   other label a task shows; flags are the navigator's. */
function _copyFilterOptions(key){
  const count = fn => TASKS.filter(fn).length;
  if(key === 'contractors'){
    const gcs = [...new Set(TASKS.map(t => t.gc).filter(Boolean))].sort();
    const opts = gcs.map(g => ({value:g, label:g, n:count(t => t.gc === g)}));
    const un = count(t => !t.gc);
    if(un) opts.push({value:'__un', label:'Unassigned', n:un});
    return opts;
  }
  if(key === 'mods'){
    // Deferred first, as the Filters menu lists it.
    const mods = (typeof PROJECT_MODS !== 'undefined' ? PROJECT_MODS : []).slice()
      .sort((a, b) => (a.id === 'deferred' ? -1 : b.id === 'deferred' ? 1 : 0));
    return mods.map(m => ({
      value:m.id, label:_COPY_MOD_LABEL[m.id] || tagInfo(m.id).label, n:count(t => _copyTaskKeys(t).includes(m.id)),
    }));
  }
  if(key === 'statuses'){
    const seen = TASKS.map(_copyTaskStatus);
    return _COPY_STATUSES.map(s => Object.assign({}, s, {n:seen.filter(x => x === s.value).length, mark:'st-' + s.value}));
  }
  if(key === 'flags'){
    return _COPY_FLAG_KEYS.map(k => ({value:k, label:_COPY_FLAG_LABEL[k], n:count(t => _copyTaskKeys(t).includes(k)), mark:'flag'}));
  }
  return [];
}
const COPY_FILTER_CATS = [
  {key:'contractors', label:'Contractor',  all:'All contractors', many:'contractors'},
  {key:'flags',       label:'Flags',       all:'Any flag',        many:'flags'},
  {key:'statuses',    label:'Task status', all:'Any status',      many:'statuses'},
  {key:'mods',        label:'Modifiers',   all:'Any modifier',    many:'modifiers'},
];
function _copyValueLabel(key, v){
  const o = _copyFilterOptions(key).find(x => x.value === v);
  if(o) return o.label;
  if(key === 'contractors') return v === '__un' ? 'Unassigned' : v;
  if(key === 'flags') return _COPY_FLAG_LABEL[v] || tagInfo(v).label;
  if(key === 'mods') return _COPY_MOD_LABEL[v] || tagInfo(v).label;
  return v;
}
function _copyFilterSummary(copy){
  const f = copy.filters || {};
  const parts = [];
  parts.push(f.showAmounts ? 'Prices visible' : 'Prices hidden');
  COPY_FILTER_CATS.forEach(c => {
    const vals = _copyFilterValues(f, c.key);
    if(vals.length) parts.push(vals.map(v => _copyValueLabel(c.key, v)).join(' or '));
    else if(c.key === 'contractors') parts.push('All contractors');
  });
  if(f.photosOnly) parts.push('Photos only');
  else parts.push(f.includePhotos !== false ? 'Photos included' : 'Photos hidden');
  return parts;
}

const ART_PROJECT = {name:'South Main Spring Turn', propertyId:'E123497A'};

function _fmtDate(iso){
  if(!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'});
}

function _renderCopyDoc(copy){
  const expired = copyIsExpired(copy);
  const ver = VERSIONS.find(v => v.id === copy.basedOnVersionId) || VERSIONS[0];
  // Filter strip — read-only summary of what the sender selected when
  // creating the copy. To change filters, the sender clicks the pencil
  // (Edit copy) which opens the create/edit modal. Rendering as plain
  // text (no checkboxes / no dropdown) makes it obvious the doc below
  // reflects a decision that's already been made.
  // Live controls, not a summary: the same chips and checklists as the
  // create modal, and the recipient options as switches. A change saves to
  // the copy at once and redraws the document below — and the shared link
  // shows the copy as it now stands, so the strip says so.
  const f = copy.filters || {};
  const nSet = COPY_FILTER_CATS.filter(c => _copyFilterValues(f, c.key).length).length;
  const expiredBanner = expired ? `<div class="copy-expired-banner">
    <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="7" cy="7" r="5"/><path d="M7 4v3.5l2 1.2"/></svg>
    <span><b>This share link expired</b> on ${_fmtDate(copy.expiresAt)}. Recipients can no longer view this copy — edit the expiration below to renew it.</span>
  </div>` : '';
  const paper = _renderCopyPaper(copy);
  return `<div class="copy-doc-wrap">
    <div class="copy-crumb">
      <button class="copy-crumb-back" onclick="closeCopy()" title="Back to all copies">
        <svg viewBox="0 0 8 12" aria-hidden="true"><path d="M6 1.5L1.5 6 6 10.5"/></svg> Back
      </button>
      <span class="copy-crumb-div"></span>
      <span class="copy-crumb-name" title="${esc(copy.name)}">${esc(copy.name)}</span>
      <button class="copy-crumb-edit" onclick="openEditCopy('${copy.id}')" title="Rename or change filters" aria-label="Edit copy">
        <svg viewBox="0 0 14 14"><path d="M9 2.5l2.5 2.5-6 6H3v-2.5l6-6z" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
      <span class="copy-crumb-meta" title="Based on ${esc(versionLabel(ver))} · ${expired?'Expired':'Expires'} ${_fmtDate(copy.expiresAt)}">Based on ${esc(versionLabel(ver))} · ${expired?'Expired':'Expires'} ${_fmtDate(copy.expiresAt)}</span>
      <span class="copy-crumb-sp"></span>
      <button class="copy-filters-btn${nSet ? ' is-set' : ''}" onclick="openCopyFilters()" title="Change what this copy shows">
        <svg viewBox="-2 0.5 24 24" fill="none"><path d="M19.5 3.5L11.5 13V23.5L8.5 21.5V13L0.5 3.5V1.5H19.5V3.5Z" stroke-linejoin="round" stroke-linecap="round"/></svg>
        Filters${nSet ? `<span class="copy-filters-n">${nSet}</span>` : ''}
      </button>
      <button class="copy-share-btn" onclick="openCopyShare('${copy.id}')">
        <svg viewBox="0 0 16 16" fill="none"><path d="M14.5 1.5L7 9M14.5 1.5L10 14.5L7 9L1.5 6L14.5 1.5Z" stroke-linecap="round" stroke-linejoin="round"/></svg>
        Share
      </button>
    </div>
    <div class="copy-paper">${expiredBanner}${paper}</div>
  </div>`;
}

/* ── Editing an open copy from its Filters modal ──
   Live controls, not a form: the same chips and checklists as the create
   modal, and a change saves to the copy at once and redraws the document
   behind — the shared link shows the copy as it now stands, so the modal
   says so and closes with Done rather than Save. */
let _stripOpenKey = null;   // which menu is open, kept across the redraw
function _stripCopy(){ return (typeof openCopyId !== 'undefined' && openCopyId) ? copyById(openCopyId) : null; }
function _copyFiltersBodyHtml(copy){
  const f = copy.filters || {};
  const chips = COPY_FILTER_CATS.map(c => {
    const vals = _copyFilterValues(f, c.key);
    const v = !vals.length ? '' : vals.length === 1 ? _copyValueLabel(c.key, vals[0]) : `${vals.length} selected`;
    const open = _stripOpenKey === c.key;
    return `<div class="copy-gc copy-chip${open ? ' open' : ''}" id="stripF-${c.key}">
      <button type="button" class="copy-chip-btn${vals.length ? ' is-set' : ''}" aria-haspopup="listbox" aria-expanded="${open}" onclick="event.stopPropagation();_stripMenu('${c.key}')">
        <span class="copy-chip-k">${esc(c.label)}</span><span class="copy-chip-v">${esc(v)}</span>
        <svg class="copy-chip-chev" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 4.5L6 8l3.5-3.5"/></svg>
      </button>
      <div class="copy-gc-menu" role="listbox" aria-multiselectable="true" onclick="event.stopPropagation()">${_copyPickMenuHtml(c, new Set(vals), '_stripPickSet')}</div>
    </div>`;
  }).join('');
  const nInc = _copyTasks(f).length;
  const anySet = COPY_FILTER_CATS.some(c => _copyFilterValues(f, c.key).length);
  const photosOn = f.includePhotos !== false;
  const toggles = _COPY_TOGGLES.map(tg => {
    const on = tg.key === 'includePhotos' ? photosOn : !!f[tg.key];
    if(tg.parent && !photosOn) return '';
    return `<label class="copy-tgl${tg.parent ? ' is-nested' : ''}">
      <input type="checkbox" class="copy-cb"${on ? ' checked' : ''} onchange="_stripToggle('${tg.key}', this.checked)">
      <span class="copy-tgl-text">
        <span class="copy-tgl-title">${esc(tg.title)}</span>
        <span class="copy-tgl-desc">${esc(tg.desc)}</span>
      </span>
    </label>`;
  }).join('');
  return `<p class="copy-form-intro">Changes apply to the shared link right away.</p>
    <div class="copy-fsec">
      <div class="copy-fsec-hd">
        <span class="copy-fsec-title">What to include</span>
        <span class="copy-fsec-hd-r">
          ${anySet ? `<button type="button" class="copy-fsec-clear" onclick="event.stopPropagation();_stripClearAll()">Clear filters</button>` : ''}
          <span class="copy-fsec-match">${nInc ? `<b>${nInc}</b> of ${TASKS.length} tasks` : `<span class="is-none">No tasks match these filters</span>`}</span>
        </span>
      </div>
      <div class="copy-fgrid">${chips}</div>
    </div>
    <div class="copy-tgls">${toggles}</div>`;
}
function _copyFiltersRefresh(){
  const body = document.getElementById('copyFiltersBody');
  const c = _stripCopy();
  if(body && c) body.innerHTML = _copyFiltersBodyHtml(c);
}
function openCopyFilters(){
  if(!_stripCopy()) return;
  _ensureCopyModals();
  _stripOpenKey = null;
  _copyFiltersRefresh();
  document.getElementById('copyModalScrim').classList.add('open');
  document.getElementById('copyFiltersModal').classList.add('open');
}
function _stripMenu(key){
  const next = (key && _stripOpenKey !== key) ? key : null;
  if(next === _stripOpenKey) return;
  _stripOpenKey = next;
  document.querySelectorAll('#copyFiltersBody .copy-chip').forEach(el => {
    const on = el.id === 'stripF-' + next;
    el.classList.toggle('open', on);
    el.classList.remove('is-flip');
    if(on){
      // Open leftward if it would run past the modal's right edge.
      const menu = el.querySelector('.copy-gc-menu');
      const box = el.closest('.se-modal');
      if(menu && box && menu.getBoundingClientRect().right > box.getBoundingClientRect().right - 8) el.classList.add('is-flip');
    }
  });
}
function _stripSave(mutate, msg){
  const c = _stripCopy(); if(!c) return;
  c.filters = Object.assign({}, c.filters || {});
  mutate(c.filters);
  renderArtifact();
  _copyFiltersRefresh();
  // Reopen the menu the user was ticking in; the redraw rebuilt it.
  if(_stripOpenKey){ const k = _stripOpenKey; _stripOpenKey = null; _stripMenu(k); }
  if(msg) toast(msg);
}
function _stripPickSet(key, v){
  _stripSave(f => {
    const cur = new Set(_copyFilterValues(f, key));
    if(!v) cur.clear(); else if(cur.has(v)) cur.delete(v); else cur.add(v);
    f[key] = [...cur];
    // Retire the old single-value fields once the list is written.
    if(key === 'contractors') delete f.contractor;
    if(key === 'mods') delete f.renterOnly;
  });
}
function _stripClearAll(){
  _stripOpenKey = null;
  _stripSave(f => {
    COPY_FILTER_CATS.forEach(c => { f[c.key] = []; });
    delete f.contractor; delete f.renterOnly;
  }, 'Filters cleared');
}
// Same pairing as the modal: photos-only needs photos, and no photos means
// not photos-only.
function _stripToggle(field, on){
  _stripOpenKey = null;
  _stripSave(f => {
    f[field] = on;
    if(field === 'photosOnly' && on) f.includePhotos = true;
    if(field === 'includePhotos' && !on) f.photosOnly = false;
  }, 'Copy updated');
}
/* What a task buys: its picked catalogue rows, qty × parts rate, on the
   options that are part of the job — the same walk the purchase order and
   the classification make. */
function _taskMaterials(t){
  let m = 0;
  (t.options || []).forEach(o => {
    if(o.added === false) return;
    (o.products || []).forEach(p => { if(productIsPicked(p)) m += _poQtyNum(p.qty) * _poDollars(p.parts); });
  });
  return m;
}
function _renderCopyPaper(copy){
  // Filter TASKS per copy's filter recipe. No editing — pure projection.
  // Every amount below — line items, room subtotals, the document totals —
  // is summed from these tasks alone, so a filtered copy prices only what
  // it shows.
  const scopeTasks = _copyTasks(copy.filters);
  const showPricing = !!copy.filters.showAmounts;

  if(!scopeTasks.length){
    return `<div style="padding:60px 40px;text-align:center">
      <div class="art-eyebrow" style="margin-bottom:14px">Scope of work</div>
      <div class="art-title" style="font-size:22px">No tasks match this filter</div>
      <div class="art-sub-info" style="margin-top:8px">Adjust the filters above to include more line items.</div>
    </div>`;
  }

  // Group tasks by room, preserving TASKS order.
  const groups = [];
  const seen = {};
  scopeTasks.forEach(t => {
    if(seen[t.room] === undefined){ seen[t.room] = groups.length; groups.push({room:t.room, items:[]}); }
    groups[seen[t.room]].items.push(t);
  });
  const grandTotal = scopeTasks.reduce((s,t)=>s+dollars(t.cost), 0);
  // Labour per task is what's left of its amount once the materials it buys
  // are taken out — the same rule the Register's bar uses — so a line's
  // labour and materials add up to its amount, and the document's labour
  // total reconciles with the bar.
  const laborOf = t => Math.max(0, dollars(t.cost) - _taskMaterials(t));
  const grandLabor = scopeTasks.reduce((s,t)=>s+laborOf(t), 0);
  const pricingHead = showPricing ? `<th class="art-col-num">Labor</th><th class="art-col-amt">Amount</th>` : '';
  const rows = groups.map(g => {
    const gTotal = g.items.reduce((s,t)=>s+dollars(t.cost), 0);
    const itemRows = g.items.map(t => {
      const contractor = t.gc || '<span class="art-unassigned">Unassigned</span>';
      const product = t.product && !/not selected/i.test(t.product) ? t.product : '<span class="art-muted">Product not selected</span>';
      const priceCells = showPricing
        ? `<td class="art-num">${artMoney(laborOf(t))}</td>
           <td class="art-amt">${artMoney(dollars(t.cost))}</td>`
        : '';
      // Photos honor the copy's includePhotos filter — checkbox unchecked
      // suppresses the entire photo strip, matching the "Include photos"
      // filter that recipients see (or don't see) on the shared link.
      const includePhotos = copy.filters.includePhotos !== false;
      const photoStrip = (includePhotos && t.photos>0) ? `<div class="art-photos">
        ${Array.from({length:t.photos}).map((_,i)=>{
          const cap = ART_PHOTO_CAPS[i] || `Photo ${i+1}`;
          return `<button class="art-thumb" onclick="artOpenPhoto('${t.code}',${i})" title="${esc(cap)}">${svgPhoto()}<span class="art-thumb-cap">${esc(cap)}</span></button>`;
        }).join('')}
      </div>` : '';
      const detailColspan = showPricing ? 5 : 3;
      const hasDetail = (t.desc || t.opt || product || photoStrip);
      // No selected-row highlight: the rows are read-only here.
      const selCls = '';
      const detailRow = hasDetail ? `<tr class="art-item-detail${selCls}" data-row-tid="${t.code}-detail" data-select-code="${t.code}">
        <td class="art-id"></td>
        <td class="art-item-wide" colspan="${detailColspan}">
          <div class="art-desc">${t.desc || t.opt || ''}</div>
          <div class="art-product"><span class="art-lbl">Product</span> <span>${product}</span></div>
          ${photoStrip}
        </td>
      </tr>` : '';
      return `<tr data-row-tid="${t.code}" data-select-code="${t.code}" class="art-item-main${selCls}">
        <td class="art-id">${t.code}</td>
        <td class="art-item"><div class="art-name">${esc(t.name)}</div></td>
        <td class="art-gc">${contractor}</td>
        <td class="art-num">${t.qty || '—'}</td>
        ${priceCells}
      </tr>${detailRow}`;
    }).join('');
    const grpColspan = showPricing ? 6 : 4;
    // The room's total sits on its heading row, in the Amount column.
    return `
      <tr class="art-grp">
        <td class="art-grp-name" colspan="${showPricing ? grpColspan - 1 : grpColspan}"><span class="art-grp-room">${g.room.toUpperCase()}</span><span class="art-grp-count-inline">${g.items.length} ${g.items.length===1?'item':'items'}</span></td>
        ${showPricing ? `<td class="art-amt art-grp-amt">${artMoney(gTotal)}</td>` : ''}
      </tr>
      ${itemRows}
    `;
  }).join('');

  const grandRows = showPricing ? `<tfoot>
            <tr class="art-grand-lbl">
              <td colspan="4"></td>
              <td class="art-num">Labor total</td>
              <td class="art-amt">Scope total</td>
            </tr>
            <tr class="art-grand">
              <td colspan="4"></td>
              <td class="art-num">${artMoney(grandLabor)}</td>
              <td class="art-amt art-grand-a">${artMoney(grandTotal)}</td>
            </tr>
          </tfoot>` : '';

  return `
    <div class="art-head">
      <div class="art-head-l">
        <div class="art-title">3484 South Main Street</div>
        <div class="art-sub-info">Atlanta, GA 30315 · ${esc(ART_PROJECT.name)}</div>
      </div>
      ${showPricing ? `<div class="art-head-totals">
        <div class="art-head-total"><span class="art-meta-k">Labor total</span><span class="art-head-total-v">${artMoney(grandLabor)}</span></div>
        <div class="art-head-total is-scope"><span class="art-meta-k">Scope total</span><span class="art-head-total-v">${artMoney(grandTotal)}</span></div>
      </div>` : ''}
        ${(()=>{
          /* The same facts on every document, shared copy or historical, in
             one row under the address: what it is, its ID, when it was
             prepared, which version it is built from, and the property it
             is about. Who it was prepared for is the copy's own business —
             its name in the index says so — and the paper doesn't repeat it. */
          const v = VERSIONS.find(x => x.id === copy.basedOnVersionId) || {num:1};
          const at = copy.createdAt || '';
          const prepared = /^\d{4}-\d{2}-\d{2}/.test(at) ? _fmtDate(at) : at;
          const basedOn = `${versionLabel(v)} ${_sowIdFor(v.id || copy.basedOnVersionId).replace(/^SOW-/, '')}`;
          const cell = (k, val, cls) => `<div class="art-meta"><div class="art-meta-k">${k}</div><div class="art-meta-v${cls ? ' ' + cls : ''}">${esc(val)}</div></div>`;
          /* What kind of document this is: the original scope, a change
             order, or the closeout. */
          const kind = v.kind === 'closeout' ? 'Closeout' : (v.num > 1 ? versionLabel(v) : 'Scope of Work');
          const docId = _sowIdFor(copy._isHistorical ? copy.basedOnVersionId : (copy.shareToken || copy.id));
          return `<div class="art-head-meta">
            ${cell('Artifact', kind)}
            ${cell('Document ID', docId, 'is-id')}
            ${cell('Prepared on', prepared)}
            ${cell('Based on', basedOn)}
            ${cell('Property ID', ART_PROJECT.propertyId, 'is-id')}
          </div>`;
        })()}
    </div>
    <table class="art-table">
      <thead>
        <tr>
          <th class="art-col-id">ID</th>
          <th class="art-col-item">Item</th>
          <th class="art-col-gc">Contractor</th>
          <th class="art-col-num">Qty</th>
          ${pricingHead}
        </tr>
      </thead>
      <tbody>${rows}</tbody>
      ${grandRows}
    </table>`;
}

/* ── Share / New / Edit copy modals ─────────────────────────────────── */
function _ensureCopyModals(){
  if(document.getElementById('copyShareModal')) return;
  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <div class="se-modal-scrim" id="copyModalScrim" onclick="closeCopyModals()"></div>
    <div class="se-modal copy-modal" id="copyShareModal">
      <div class="se-modal-cap">Share scope copy</div>
      <div class="se-modal-title" id="copyShareTitle">Copy name</div>
      <div class="copy-share-body" id="copyShareBody"></div>
      <div class="se-modal-actions">
        <button class="se-btn se-btn-secondary" onclick="closeCopyModals()">Close</button>
      </div>
    </div>
    <div class="se-modal copy-modal" id="copyFiltersModal">
      <div class="se-modal-title">Filters</div>
      <div class="copy-form-body" id="copyFiltersBody" onclick="_stripMenu(null)"></div>
      <div class="se-modal-actions">
        <button class="se-btn se-btn-primary" onclick="closeCopyModals()">Done</button>
      </div>
    </div>
    <div class="se-modal copy-modal" id="copyFormModal">
      <div class="se-modal-title" id="copyFormTitle">Create a new scope copy</div>
      <div class="copy-form-body" id="copyFormBody"></div>
      <div class="se-modal-actions">
        <button class="se-btn se-btn-secondary" onclick="closeCopyModals()">Cancel</button>
        <button class="se-btn se-btn-primary" id="copyFormSave" onclick="saveCopyForm()">Save</button>
      </div>
    </div>`;
  document.body.appendChild(wrap);
}
function closeCopyModals(){
  const s = document.getElementById('copyModalScrim');
  const sh = document.getElementById('copyShareModal');
  const fm = document.getElementById('copyFormModal');
  if(s) s.classList.remove('open');
  if(sh) sh.classList.remove('open');
  if(fm) fm.classList.remove('open');
  const fl = document.getElementById('copyFiltersModal');
  if(fl) fl.classList.remove('open');
  _stripOpenKey = null;
  _copyFormEditingId = null;
}
function openCopyShare(id){
  const c = copyById(id); if(!c) return;
  _ensureCopyModals();
  const link = `https://kaiizen.app/scope/${c.shareToken}`;
  const previewHref = `ScopeCopy_Recipient.html?token=${encodeURIComponent(c.shareToken)}`;
  const expiredHref = previewHref + '&expired=1';
  const expired = copyIsExpired(c);
  const summary = _copyFilterSummary(c).map(s => `<span class="copy-share-summary-i">${esc(s)}</span>`).join('');
  document.getElementById('copyShareTitle').textContent = c.name;
  document.getElementById('copyShareBody').innerHTML = `
    <div class="copy-share-section">
      <span class="copy-share-lbl">Shareable link</span>
      <div class="copy-link-row">
        <input class="copy-link" id="copyShareLink" value="${esc(link)}" readonly onclick="this.select()">
        <button class="copy-link-btn" onclick="copyLinkToClipboard()">Copy link</button>
      </div>
      <span class="copy-share-note">Anyone with this link can view the copy. No login required.</span>
    </div>
    <div class="copy-share-section">
      <span class="copy-share-lbl">Expiration</span>
      <div class="copy-share-exp">
        <span class="copy-share-exp-v${expired?' is-expired':''}">${expired?'Expired':'Expires'} ${_fmtDate(c.expiresAt)}</span>
      </div>
    </div>
    <div class="copy-share-section">
      <span class="copy-share-lbl">Recipient will see</span>
      <div class="copy-share-summary">${summary}</div>
    </div>
    <div class="copy-share-section">
      <span class="copy-share-lbl">Preview the recipient view</span>
      <div class="copy-share-preview">
        <a href="${previewHref}" target="_blank" rel="noopener">Open recipient preview →</a>
        <a href="${expiredHref}" target="_blank" rel="noopener">Preview as expired →</a>
      </div>
    </div>`;
  document.getElementById('copyModalScrim').classList.add('open');
  document.getElementById('copyShareModal').classList.add('open');
}
/* Straight to the clipboard from the copies table — no dialog. Same link
   the Share dialog shows. */
function copyCopyLink(id){
  const c = copyById(id); if(!c) return;
  const val = `https://kaiizen.app/scope/${c.shareToken}`;
  const done = () => toast(copyIsExpired(c) ? 'Link copied · this link has expired' : 'Link copied');
  const fallback = () => {
    const ta = document.createElement('textarea');
    ta.value = val; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try{ document.execCommand('copy'); }catch(_){}
    ta.remove(); done();
  };
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(val).then(done, fallback);
  } else fallback();
}
function copyLinkToClipboard(){
  const input = document.getElementById('copyShareLink'); if(!input) return;
  const val = input.value;
  const done = ()=>toast('Link copied');
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(val).then(done, ()=>{
      input.select(); try{ document.execCommand('copy'); }catch(_){} done();
    });
  } else {
    input.select(); try{ document.execCommand('copy'); }catch(_){} done();
  }
}
function extendCopyExpiration(id, val){
  if(!val) return;
  const c = copyById(id); if(!c) return;
  if(val === 'none'){ c.expiresAt = '2099-12-31'; toast('Expiration removed'); }
  else { c.expiresAt = _addDays(_todayIso(), parseInt(val,10)); toast(`Expiration extended by ${val} days`); }
  openCopyShare(id);   // re-render modal
  renderArtifact();
}

/* ── New / Edit form ── */
/* Laid out as the audience-doc form: outlined fields with their label set
   into the top border, the version as a picker, the four task filters as
   multi-pick dropdowns with a live count of what they let through, then each
   recipient option as its own card with a switch. */
let _copyFormEditingId = null;
let _copyPick = {};               // category key → Set of ticked values in the open form
function openNewCopy(){ _openCopyForm(null); }
function openEditCopy(id){ _openCopyForm(id); }
const _COPY_TOGGLES = [
  {id:'copyFormPhotos',     key:'includePhotos', title:'Show photos',         desc:'Include task photos with each scope item.'},
  // A sub-option of Include photos: only offered while photos are in.
  {id:'copyFormPhotosOnly', key:'photosOnly',    title:'Only show photos',    desc:'Share a gallery of task photos instead of the scope document.', parent:'copyFormPhotos'},
  {id:'copyFormShowAmt',    key:'showAmounts',   title:'Show price',          desc:'Include rates, line-item amounts, and document totals — recalculated from the included tasks only.'},
];
function _copyDefaultName(){
  return `Audience Doc - ${_fmtDate(_todayIso())}`;
}
/* A new copy starts from whatever the navigator is filtering on, so "share
   what I'm looking at" is one step. The navigator's Filters hold flags and
   modifiers; contractor and status start open. */
function _copyFiltersFromNavigator(){
  const on = (typeof activeFilters !== 'undefined') ? [...activeFilters] : [];
  const modIds = new Set((typeof PROJECT_MODS !== 'undefined' ? PROJECT_MODS : []).map(m => m.id));
  return {
    mods:  on.filter(k => modIds.has(k)),
    flags: on.filter(k => _COPY_FLAG_KEYS.includes(k)),
  };
}
function _openCopyForm(id){
  _ensureCopyModals();
  _copyFormEditingId = id;
  const existing = id ? copyById(id) : null;
  const nav = existing ? {} : _copyFiltersFromNavigator();
  const defaults = existing || {
    name:_copyDefaultName(), description:'', basedOnVersionId:currentVersionId,
    filters:{showAmounts:true, contractors:[], mods:nav.mods, statuses:[], flags:nav.flags,
             includePhotos:true, photosOnly:false},
  };
  // Older copies predate includePhotos / photosOnly — read them as the
  // defaults so the switches show what the copy actually does.
  const f = Object.assign({includePhotos:true, photosOnly:false}, defaults.filters || {});
  _copyPick = {};
  COPY_FILTER_CATS.forEach(c => { _copyPick[c.key] = new Set(_copyFilterValues(f, c.key)); });
  document.getElementById('copyFormTitle').textContent = existing ? 'Edit audience doc copy' : 'Create a new audience doc copy';
  document.getElementById('copyFormSave').textContent = existing ? 'Save changes' : 'Create copy';
  const verOpts = VERSIONS.map(v => {
    // The version being worked on reads as the working copy, as in the
    // reference; a signed-off closeout has nothing still in progress.
    const cur = v.id === currentVersionId && PROJ_MODE !== 'closeout-approved';
    return `<option value="${v.id}"${v.id===defaults.basedOnVersionId?' selected':''}>${esc(versionLabel(v))}${cur ? ' · Working copy · started' : ' ·'} ${esc(v.at)}</option>`;
  }).join('');
  const toggles = _COPY_TOGGLES.map(tg => {
    const on = !!f[tg.key];
    const parentOn = !tg.parent || f.includePhotos !== false;
    return `<label class="copy-tgl${tg.parent ? ' is-nested' : ''}" for="${tg.id}" id="${tg.id}Row"${parentOn ? '' : ' hidden'}>
      <input type="checkbox" class="copy-cb" id="${tg.id}"${on ? ' checked' : ''} onchange="_copyFormToggled('${tg.id}')">
      <span class="copy-tgl-text">
        <span class="copy-tgl-title">${esc(tg.title)}</span>
        <span class="copy-tgl-desc">${esc(tg.desc)}</span>
      </span>
    </label>`;
  }).join('');
  // Compact chips — "Contractor · All" — rather than four boxed fields; each
  // opens the same checklist under it.
  const pickers = COPY_FILTER_CATS.map(c => `<div class="copy-gc copy-chip" id="copyF-${c.key}">
      <button type="button" class="copy-chip-btn" id="copyFBtn-${c.key}" aria-haspopup="listbox" aria-expanded="false" onclick="event.stopPropagation();_copyPickMenu('${c.key}')">
        <span class="copy-chip-k">${esc(c.label)}</span><span class="copy-chip-v" id="copyFVal-${c.key}">${esc(_copyPickSummary(c))}</span>
        <svg class="copy-chip-chev" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 4.5L6 8l3.5-3.5"/></svg>
      </button>
      <div class="copy-gc-menu" id="copyFMenu-${c.key}" role="listbox" aria-multiselectable="true" onclick="event.stopPropagation()">${_copyPickMenuHtml(c)}</div>
    </div>`).join('');
  document.getElementById('copyFormBody').innerHTML = `
    <p class="copy-form-intro">Choose the scope version you want to share, including an active draft, then choose what recipients can see in the copy.</p>
    <label class="copy-fld">
      <span class="copy-fld-lbl">Name</span>
      <input class="copy-fld-input" id="copyFormName" placeholder="e.g. Apex Carpentry — kitchen bid" value="${esc(defaults.name)}">
    </label>
    <label class="copy-fld copy-fld-sel">
      <span class="copy-fld-lbl">Based on version</span>
      <select class="copy-fld-input" id="copyFormVer">${verOpts}</select>
      <svg class="copy-fld-chev" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 4.5L6 8l3.5-3.5"/></svg>
    </label>
    <div class="copy-fsec">
      <div class="copy-fsec-hd">
        <span class="copy-fsec-title">What to include</span>
        <span class="copy-fsec-hd-r">
          <button type="button" class="copy-fsec-clear" id="copyFormClear" onclick="_copyPickClearAll()">Clear filters</button>
          <span class="copy-fsec-match" id="copyFormMatch">${_copyMatchLine()}</span>
        </span>
      </div>
      <div class="copy-fgrid">${pickers}</div>
    </div>
    <div class="copy-tgls">${toggles}</div>`;
  _copyPickRefresh();
  // A click anywhere else in the form closes an open filter menu.
  document.getElementById('copyFormModal').onclick = () => _copyPickMenu(null, false);
  document.getElementById('copyModalScrim').classList.add('open');
  document.getElementById('copyFormModal').classList.add('open');
  setTimeout(()=>{ const el=document.getElementById('copyFormName'); if(el) el.focus(); }, 20);
}
function _copyPickFilters(){
  const out = {};
  COPY_FILTER_CATS.forEach(c => { out[c.key] = [...(_copyPick[c.key] || [])]; });
  return out;
}
// The chip already names the category, so its value is short: the one
// value picked, or how many — and nothing at all until something is.
function _copyPickSummary(c){
  const vals = [...(_copyPick[c.key] || [])];
  if(!vals.length) return '';
  if(vals.length === 1) return _copyValueLabel(c.key, vals[0]);
  return `${vals.length} selected`;
}
// "Includes 7 of 40 tasks", so the filters' combined effect is visible
// before the copy exists — including when they cancel each other out.
function _copyMatchLine(){
  const n = _copyTasks(_copyPickFilters()).length;
  if(!n) return `<span class="is-none">No tasks match these filters</span>`;
  return `<b>${n}</b> of ${TASKS.length} tasks`;
}
// Shared by the create modal and the open copy's filter strip: `set` is
// what's ticked, `pick` the handler each option calls.
function _copyPickMenuHtml(c, set, pick){
  set = set || _copyPick[c.key] || new Set();
  pick = pick || '_copyPickSet';
  const none = !set.size;
  const k = c.key;
  return `<button type="button" class="copy-gc-opt is-all${none ? ' on' : ''}" role="option" aria-selected="${none}" onclick="${pick}('${k}','')">
      <span class="copy-gc-box">${none ? '&#10003;' : ''}</span><span class="copy-gc-name">${esc(c.all)}</span>
    </button>
    ${(() => {
      let group = '';
      return _copyFilterOptions(k).map(o => {
        const on = set.has(o.value);
        const v = esc(String(o.value)).replace(/'/g, "\\'");
        // Task status comes in two bands, headed as in the Filters menu.
        const head = (o.group && o.group !== group) ? `<div class="copy-gc-sub">${esc(group = o.group)}</div>` : '';
        const mark = o.mark === 'flag'
          ? `<svg class="copy-gc-mark copy-gc-flag${o.n ? ' is-on' : ''}" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 11V1.5M2.5 1.5h7l-2 2.5 2 2.5h-7"/></svg>`
          : o.mark ? `<span class="copy-gc-mark copy-gc-dia ${esc(o.mark)}" aria-hidden="true"></span>` : '';
        return `${head}<button type="button" class="copy-gc-opt${on ? ' on' : ''}${o.n ? '' : ' is-empty'}" role="option" aria-selected="${on}" onclick="${pick}('${k}','${v}')">
          <span class="copy-gc-box">${on ? '&#10003;' : ''}</span>${mark}<span class="copy-gc-name">${esc(o.label)}</span><span class="copy-gc-n">${o.n}</span>
        </button>`;
      }).join('');
    })()}`;
}
// Opens one menu and closes the rest; (null, false) closes them all.
function _copyPickMenu(key, open){
  COPY_FILTER_CATS.forEach(c => {
    const fld = document.getElementById('copyF-' + c.key); if(!fld) return;
    const next = c.key === key ? ((open === undefined) ? !fld.classList.contains('open') : open) : false;
    fld.classList.toggle('open', next);
    const btn = document.getElementById('copyFBtn-' + c.key);
    if(btn) btn.setAttribute('aria-expanded', String(next));
    // A menu opens under its chip's left edge; one that would run past the
    // modal's right edge (Modifiers, at the end of the row) opens leftward
    // from the chip's right edge instead, so the modal never clips it.
    fld.classList.remove('is-flip');
    if(next){
      const menu = document.getElementById('copyFMenu-' + c.key);
      const modal = document.getElementById('copyFormModal');
      if(menu && modal && menu.getBoundingClientRect().right > modal.getBoundingClientRect().right - 12){
        fld.classList.add('is-flip');
      }
    }
  });
}
// Ticking stays open, so several values can be picked in one go; the
// labels, ticks and the count are patched in place.
function _copyPickSet(key, v){
  const set = _copyPick[key] || (_copyPick[key] = new Set());
  if(!v) set.clear();
  else if(set.has(v)) set.delete(v);
  else set.add(v);
  _copyPickRefresh();
}
function _copyPickClearAll(){
  COPY_FILTER_CATS.forEach(c => (_copyPick[c.key] || new Set()).clear());
  _copyPickRefresh();
}
function _copyPickRefresh(){
  COPY_FILTER_CATS.forEach(c => {
    const menu = document.getElementById('copyFMenu-' + c.key);
    if(menu) menu.innerHTML = _copyPickMenuHtml(c);
    const val = document.getElementById('copyFVal-' + c.key);
    if(val) val.textContent = _copyPickSummary(c);
    const btn = document.getElementById('copyFBtn-' + c.key);
    if(btn) btn.classList.toggle('is-set', !!(_copyPick[c.key] || new Set()).size);
  });
  const m = document.getElementById('copyFormMatch'); if(m) m.innerHTML = _copyMatchLine();
  const clr = document.getElementById('copyFormClear');
  if(clr) clr.hidden = !COPY_FILTER_CATS.some(c => (_copyPick[c.key] || new Set()).size);
}
// A photos-only copy is made of photos, so it can't also leave them out.
// Photos only lives under Include photos: it shows while photos are in, and
// turning photos off turns it off too.
function _copyFormToggled(id){
  const only = document.getElementById('copyFormPhotosOnly');
  const inc  = document.getElementById('copyFormPhotos');
  const row  = document.getElementById('copyFormPhotosOnlyRow');
  if(!only || !inc) return;
  if(id === 'copyFormPhotos'){
    if(!inc.checked) only.checked = false;
    if(row) row.hidden = !inc.checked;
  }
}
function saveCopyForm(){
  const name = document.getElementById('copyFormName').value.trim() || 'Untitled copy';
  const ver  = document.getElementById('copyFormVer').value;
  const val  = id => !!(document.getElementById(id) || {}).checked;
  const filters = Object.assign({
    showAmounts:  val('copyFormShowAmt'),
    includePhotos:val('copyFormPhotos'),
    photosOnly:   val('copyFormPhotosOnly'),
  }, _copyPickFilters());
  // Description field was removed from the form — preserve any existing
  // description on edit, default to empty on new.
  if(_copyFormEditingId){
    const c = copyById(_copyFormEditingId);
    if(c){ c.name = name; c.basedOnVersionId = ver; c.filters = filters; }
    closeCopyModals();
    renderArtifact();
    toast('Copy updated');
  } else {
    const newId = _copyId();
    SCOPE_COPIES.push({
      id:newId, name, description:'', basedOnVersionId:ver,
      createdAt:_todayIso(), shareToken:_copyToken(),
      expiresAt:_addDays(_todayIso(), 30),
      filters,
    });
    closeCopyModals();
    openCopy(newId);
    toast('Copy created');
  }
}

/* ── Room metadata (dimensions + walkthrough notes) : fake but consistent ── */
const ROOM_META = {
  'Kitchen':     {dims:'14′ × 16′ · 224 SF · 9′ ceiling', light:'East-facing windows, bright AM', notes:[
    {who:'Field agent',when:'Apr 18 · 9:42a',body:'Cabinet base near sink showing water damage. Counters scratched, laminate edges lifting. Walls in good condition.'},
    {who:'Designer',when:'Apr 22 · 11:00a',body:'Stick with white shaker direction. Quartz over granite. Use Daltile subway 3×6 matte for backsplash.'},
  ]},
  'Living Room': {dims:'15′ × 18′ · 270 SF · 9′ ceiling', light:'South-facing bay window, full sun midday', notes:[
    {who:'Field agent',when:'Apr 18 · 9:55a',body:'Carpet stained, edges peeling at transition strip. Walls have nail holes throughout.'},
  ]},
  'Master Bath': {dims:'8′ × 10′ · 80 SF · 8′ ceiling', light:'North-facing small window', notes:[
    {who:'Field agent',when:'Apr 19 · 10:12a',body:'Shower grout failing, tile chipped near drain. Vanity dated, plumbing roughed for double sink.'},
    {who:'Designer',when:'Apr 22 · 11:15a',body:'Homeowner approved 48" double vanity allowance. Awaiting final selection from 3 shortlisted units.'},
  ]},
  'Bathroom':    {dims:'6′ × 9′ · 54 SF · 8′ ceiling', light:'No window (vent fan only)', notes:[
    {who:'Field agent',when:'Apr 19 · 10:30a',body:'Vanity in decent shape, refacing only. Floor tile worn but structurally sound.'},
  ]},
  'Master Bed':  {dims:'13′ × 15′ · 195 SF · 9′ ceiling', light:'East-facing window + ceiling fan', notes:[
    {who:'Field agent',when:'Apr 18 · 10:15a',body:'Carpet in usable shape but homeowner wants LVP throughout. Closet has no shelving.'},
  ]},
  'Bedroom 2':   {dims:'11′ × 12′ · 132 SF · 9′ ceiling', light:'West-facing window', notes:[
    {who:'Field agent',when:'Apr 18 · 10:25a',body:'Repaint only. No other work needed.'},
  ]},
  'Garage':      {dims:'20′ × 20′ · 400 SF · 9′ ceiling', light:'No windows, fluorescent overhead', notes:[
    {who:'Field agent',when:'Apr 18 · 10:40a',body:'Door opener noisy, leaking oil. Sensors misaligned.'},
  ]},
};

// Drawing-variant gallery: full-scope photo overview. Unsorted section at top,
// then per-room sections with group photos + task subsections. Ported from the
// Kai Web Right-Panel prototype.
function galArrowUp(){ return `<svg viewBox="0 0 12 12" fill="none"><path d="M3 7.5L6 4.5l3 3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`; }
function galArrowDn(){ return `<svg viewBox="0 0 12 12" fill="none"><path d="M3 4.5L6 7.5l3-3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`; }
function galPlusSvg(){ return `<svg viewBox="0 0 12 12" fill="none"><path d="M6 2v8M2 6h8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`; }
function galBcArrow(){ return `<svg viewBox="0 0 14 14" fill="none"><path d="M9 3L5 7l4 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`; }
function galCheckSvg(){ return `<svg viewBox="0 0 14 14" fill="none"><path d="M3 7.5l2.5 2.5L11 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`; }
function drawingPhotoBox(p){
  const m=photoMeta(p.seed||0);
  const scopeTag = p.kind==='task' ? 'Task' : (p.kind==='unsorted' ? 'Unsorted' : 'Group');
  const isUnsorted = p.kind==='unsorted';
  return `<div class="ds-photo${isUnsorted?' ds-photo-unsorted':''}" data-pid="${p.id}" onclick="openGalleryPhoto(${p.id})">
    <button class="ds-check" onclick="event.stopPropagation();toggleGalleryPhotoSel(${p.id})" aria-label="Select photo">${galCheckSvg()}</button>
    <div class="ds-hover">
      <div class="ds-hover-top"><span class="ds-hover-tag">${scopeTag}</span></div>
      <div class="ds-hover-info">
        <span class="ds-hover-who">${m.who}</span>
        <span class="ds-hover-sub">${m.source} · ${m.date}</span>
      </div>
    </div>
  </div>`;
}
// ── Photo Overlay Modal (poModal) ──────────────────────────────────
// Full-screen photo + task detail modal. Ported from Compare prototype.
// Opens from every photo click site (Gallery tiles, Pano cells,
// Progress timeline cells, activity-page thumbnails). Artifact-tab
// thumbnails use the separate artOpenPhoto() → #artLightbox path.
let __poCurrentPid = null;
function _poEnsureDom(){
  if(document.getElementById('poModal')) return;
  const el = document.createElement('div');
  el.id = 'poModal';
  el.innerHTML = `
    <div class="po-scrim" onclick="closePoModal()"></div>
    <div class="po-card" id="poCard" role="dialog" aria-modal="true">
      <div class="po-left" id="poLeft"></div>
      <div class="po-right" id="poRight">
        <button class="po-close" onclick="closePoModal()" aria-label="Close">
          <svg viewBox="0 0 14 14"><path d="M3 3l8 8M11 3l-8 8" stroke-linecap="round"/></svg>
        </button>
        <div class="po-detail" id="poDetail"></div>
        <div class="po-footer" id="poFooter"></div>
      </div>
    </div>`;
  document.body.appendChild(el);
}
function closePoModal(){
  const el = document.getElementById('poModal');
  if(el) el.classList.remove('is-open');
  document.body.style.overflow = '';
  __poCurrentPid = null;
  try{ window.parent && window.parent.postMessage({type:'kai-photo-overlay', open:false}, '*'); }catch(_){}
}
document.addEventListener('keydown', e => {
  const el = document.getElementById('poModal');
  if(!el || !el.classList.contains('is-open')) return;
  if(e.key === 'Escape'){ closePoModal(); return; }
  if(e.key === 'ArrowLeft'){ poStepPhoto(-1); return; }
  if(e.key === 'ArrowRight'){ poStepPhoto(1); return; }
});
// Given the current photo, find sibling photos on the same task so
// prev/next chevrons walk through them in order.
function _poSiblingsFor(photo){
  if(!photo) return [];
  if(photo.kind === 'task'){
    return (PHOTOS || []).filter(p => p.kind === 'task' && p.task === photo.task)
      .sort((a,b) => (a.id||0) - (b.id||0));
  }
  if(photo.kind === 'group'){
    return (PHOTOS || []).filter(p => p.kind === 'group' && p.room === photo.room)
      .sort((a,b) => (a.id||0) - (b.id||0));
  }
  return (PHOTOS || []).filter(p => p.kind === photo.kind).sort((a,b) => (a.id||0) - (b.id||0));
}
function poStepPhoto(dir){
  const cur = (PHOTOS || []).find(p => p.id === __poCurrentPid);
  if(!cur) return;
  const sibs = _poSiblingsFor(cur);
  const idx = sibs.findIndex(p => p.id === cur.id);
  if(idx < 0) return;
  const next = sibs[(idx + dir + sibs.length) % sibs.length];
  if(next) openGalleryPhoto(next.id);
}
function _poCollapseToggle(){
  const wrap = document.querySelector('#poLeft .po-strip-wrap');
  if(!wrap) return;
  const btn = document.querySelector('#poLeft .po-cap-collapse');
  const collapsed = wrap.style.display === 'none';
  wrap.style.display = collapsed ? '' : 'none';
  if(btn) btn.innerHTML = collapsed
    ? '<svg viewBox="0 0 12 12" fill="none"><path d="M3 8l3-3 3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>Collapse'
    : '<svg viewBox="0 0 12 12" fill="none"><path d="M3 5l3 3 3-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>Expand';
}
function _poRenderLeft(photo, task){
  const walk = (photo.walk && typeof walkFor === 'function') ? walkFor(photo.walk) : null;
  // Only surface milestone walk names on the hero — Progress walks are
  // context noise (their date carries enough meaning) so skip the chip.
  const isMilestoneWalk = walk && !/^Progress/i.test(walk.short || '');
  const walkTag = isMilestoneWalk ? `<span class="po-hero-walk"><span class="po-hero-walk-dot" style="background:${walk.color}"></span>${esc(walk.short)}</span>` : '';
  const bg = _photoBg(photo, 0);
  // Hero image: prefer a real URL when the demo has one, else fallback SVG placeholder.
  // photo.src first: a file added through the manager is the one case where
  // we hold the actual image, and the hero is where you'd most want to see it.
  const heroUrl = (photo.src || photo.url || (task && task.photoUrls && task.photoUrls[(task._poIdx||0)])) || null;
  const heroInner = heroUrl
    ? `<img class="po-hero-img" src="${heroUrl}" alt="" onerror="this.replaceWith(Object.assign(document.createElementNS('http://www.w3.org/2000/svg','svg'),{}))">`
    : `<div class="po-hero-svg">${svgPhoto()}</div>`;
  // Task photo strip — every photo on this task, walk-tagged.
  const taskCode = task ? task.code : null;
  // Most-recent-first by the walk's date. WALKS is stored in chronological
  // order, so use the walk-index descending as a stable proxy for "newest
  // date first"; fall back to id for photos whose walk isn't in WALKS.
  const _walkIdx = wid => {
    const i = (WALKS || []).findIndex(w => w.id === wid);
    return i < 0 ? -1 : i;
  };
  const _photoRecency = (a,b) => {
    const wi = _walkIdx(b.walk) - _walkIdx(a.walk);
    if(wi !== 0) return wi;
    return (b.id||0) - (a.id||0);
  };
  const taskPhotos = taskCode ? (PHOTOS || []).filter(p => p.kind === 'task' && p.task === taskCode).sort(_photoRecency) : [];
  const groupPhotos = task ? (PHOTOS || []).filter(p => p.kind === 'group' && p.room === task.room).sort(_photoRecency) : [];
  const thumbBg = p => _photoBg(p, 0);
  const thumbHtml = p => {
    return `<button class="po-thumb${p.id === photo.id ? ' is-current' : ''}" style="background:${thumbBg(p)}" onclick="openGalleryPhoto(${p.id})"></button>`;
  };
  const taskStripHtml = taskPhotos.length
    ? `<div class="po-strip-group">
         <div class="po-strip-title">${task ? esc(task.name) : 'Photos'} · ${taskPhotos.length} ${taskPhotos.length===1?'photo':'photos'}</div>
         <div class="po-strip">${taskPhotos.map(thumbHtml).join('')}</div>
       </div>` : '';
  const groupStripHtml = groupPhotos.length
    ? `<div class="po-strip-group">
         <div class="po-strip-title">Group · ${groupPhotos.length} ${groupPhotos.length===1?'photo':'photos'}</div>
         <div class="po-strip">${groupPhotos.map(thumbHtml).join('')}</div>
       </div>` : '';
  const stripWrap = (taskStripHtml || groupStripHtml)
    ? `<div class="po-strip-wrap">${taskStripHtml}${groupStripHtml}</div>` : '';
  // Cap bar meta
  const idx = _poSiblingsFor(photo).findIndex(p => p.id === photo.id);
  const total = _poSiblingsFor(photo).length;
  /* Read the photo rather than the walk. The author is photo.by — an upload's
     author isn't whoever ran the nearest walk, and a photo added in the
     manager has no walk at all, which used to caption it "Field agent · ·
     Camera". Date falls back to when it landed, and the last field names how
     it got here instead of always claiming a camera. */
  const _capBy   = photo.by || (walk ? walk.conductor : 'Field agent');
  const _capDate = walk && walk.date
    ? walk.date
    : (photo.addedAt
        ? new Date(photo.addedAt).toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'})
        : '');
  const _capSrc  = photo.source === 'uploaded' ? 'Upload' : 'Camera';
  const capMeta = `<b>${esc(_capBy)}</b><span class="po-cap-sep">·</span>${esc(_capDate)}<span class="po-cap-sep">·</span>${idx+1} of ${total}<span class="po-cap-sep">·</span>${_capSrc}`;
  const left = document.getElementById('poLeft');
  left.innerHTML = `
    <div class="po-hero-col">
      <div class="po-hero" style="background:${bg}">
        ${walkTag}
        ${heroInner}
        ${total > 1 ? `<button class="po-nav prev" onclick="poStepPhoto(-1)" aria-label="Previous"><svg viewBox="0 0 12 12"><path d="M7.5 2l-3 4 3 4" stroke-linecap="round" stroke-linejoin="round"/></svg></button>` : ''}
        ${total > 1 ? `<button class="po-nav next" onclick="poStepPhoto(1)" aria-label="Next"><svg viewBox="0 0 12 12"><path d="M4.5 2l3 4-3 4" stroke-linecap="round" stroke-linejoin="round"/></svg></button>` : ''}
      </div>
      <div class="po-cap">
        <div class="po-cap-l">${capMeta}</div>
      </div>
    </div>
    ${stripWrap}`;
}
function _poRenderRight(photo, task){
  if(!task){
    document.getElementById('poDetail').innerHTML = `
      <div class="po-section">
        <div class="po-header-title">Unsorted photo</div>
        <div class="po-grid">
          <span class="po-grid-lbl">Photo ID</span><span class="po-grid-val mono">#${photo.id}</span>
          <span class="po-grid-lbl">Kind</span><span class="po-grid-val">${esc(photo.kind || 'unsorted')}</span>
        </div>
      </div>`;
    document.getElementById('poFooter').innerHTML = '';
    return;
  }
  const walk = (photo.walk && typeof walkFor === 'function') ? walkFor(photo.walk) : null;
  const room = task.room;
  const roomColor = (typeof ROOM_COLORS !== 'undefined' && ROOM_COLORS[room]) ? ROOM_COLORS[room] : 'var(--midtone)';
  // Status pill — read from STATUS + approved set (same normalisation the sidebar uses).
  const isApproved = approved.has(task.id);
  let statusKey = 'not_started';
  if(task.editRequested) statusKey = 'needs_rework';
  else if(isApproved) statusKey = 'complete';
  else if(STATUS[task.status]) statusKey = task.status;
  const statusMeta = STATUS[statusKey] || STATUS.not_started;
  const statusColor = statusKey === 'complete' ? 'var(--success)'
    : statusKey === 'needs_rework' ? 'var(--error)'
    : statusKey === 'in_progress' ? 'var(--progress,#2E5A87)'
    : 'var(--t2)';
  // Financials
  const laborNum = _parseDollars(task.rate);
  const qtyNum = _parseQtyNum(task.qty);
  const laborTotal = laborNum * qtyNum;
  const matTotal = _parseDollars(task.pcost);
  const taskTotal = _parseDollars(task.cost);
  // Materials list — use taskOptions if available, else primary product only.
  let materials = [];
  if(typeof taskOptions === 'function'){
    const opts = taskOptions(task) || [];
    opts.forEach(o => (o.products || []).forEach(p => {
      if(p && p.product) materials.push({name:p.product, pcost:p.pcost || ''});
    }));
  }
  if(!materials.length && task.product){
    materials.push({name:task.product, pcost:task.pcost || ''});
  }
  const materialsHtml = materials.length
    ? materials.map(m => `
        <span class="po-grid-lbl">${esc(m.name)}</span>
        <span class="po-grid-val mono">${esc(m.pcost || '—')}</span>`).join('')
    : `<span class="po-grid-lbl" style="color:var(--t3);font-style:italic">No materials</span><span></span>`;
  // Synthesized activity feed
  const activity = [];
  if(walk) activity.push({dot:'green', who: walk.conductor || 'Field agent', action: ` captured photo on ${walk.label}`, time: walk.date});
  if(task.gc) activity.push({dot:'blue', who: task.gc, action: ' assigned to task', time: 'Apr 21, 2026'});
  if(isApproved) activity.push({dot:'green', who: 'Admin', action: ' approved the task', time: 'Recently'});
  if(task.editRequested) activity.push({dot:'red', who: 'Admin', action: ' requested edit', time: 'Recently'});
  const activityHtml = activity.map(a => `
    <div class="po-tl-item">
      <div class="po-tl-dot ${a.dot||''}"></div>
      <div class="po-tl-who">${esc(a.who)}<span class="po-tl-action">${esc(a.action)}</span></div>
      <div class="po-tl-time">${esc(a.time)}</div>
    </div>`).join('');
  document.getElementById('poDetail').innerHTML = `
    <div class="po-section" style="padding-top:24px">
      <div class="po-header-title">${esc(task.name)}</div>
      <div class="po-header-group">${esc(room)}</div>
      <div class="po-header-totalrow">
        <span class="po-header-totalrow-total"><span class="po-header-totalrow-lbl">Task total</span><span class="po-header-totalrow-val">${esc(task.cost || _fmtDollars(taskTotal))}</span></span>
        <a class="po-header-totalrow-edit" href="#" onclick="event.preventDefault();closePoModal();if(typeof selectTask==='function')selectTask(${task.id});">Go to Editor →</a>
      </div>
    </div>
    <div class="po-section">
      <div class="po-section-title">Photo info</div>
      <div class="po-grid">
        <span class="po-grid-lbl">Status</span><span class="po-grid-val status" style="color:${statusColor}">${esc(statusMeta.label)}</span>
        <span class="po-grid-lbl">Walk date</span><span class="po-grid-val mono">${walk ? esc(walk.date) : '—'}</span>
        <span class="po-grid-lbl">Field user</span><span class="po-grid-val">${walk ? esc(walk.conductor) : '—'}</span>
        <span class="po-grid-lbl">Source</span><span class="po-grid-val">${(photo.id % 2 === 0) ? 'Taken by Phone' : 'Upload from Computer'}</span>
      </div>
    </div>
    <div class="po-section">
      <div class="po-section-title">Task info</div>
      <div class="po-grid">
        <span class="po-grid-lbl">Task ID</span><span class="po-grid-val mono">${esc(task.code)}</span>
        <span class="po-grid-lbl">Contractor</span><span class="po-grid-val">${esc(task.gc || 'Unassigned')}</span>
        <span class="po-grid-lbl">Labor <span style="color:var(--t3);font-size:11.5px">· ${esc(task.qty || '—')} × ${esc(task.rate || '—')}</span></span>
        <span class="po-grid-val mono">${_fmtDollars(laborTotal)}</span>
        ${materialsHtml}
      </div>
    </div>
    <div class="po-section">
      <div class="po-section-title">Notes</div>
      ${task.desc ? `<div class="po-note-box">${esc(task.desc)}<div class="po-note-meta">Task description</div></div>` : '<div style="color:var(--t3);font-size:12px;font-style:italic">No notes yet.</div>'}
    </div>`;
  document.getElementById('poFooter').innerHTML = `
    <button class="po-btn danger po-btn-icononly" onclick="closePoModal();if(typeof toast==='function')toast('Delete flow — not wired')" title="Delete" aria-label="Delete">
      <svg viewBox="0 0 14 14"><path d="M2 3.5h10M5.5 3.5V2.5h3v1M6 6v4M8 6v4M3.5 3.5l.5 8h6l.5-8" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </button>
    <button class="po-btn" onclick="closePoModal();if(typeof openEditRequest==='function')openEditRequest(${task.id})">
      <svg viewBox="0 0 14 14"><path d="M9.5 2.5l2 2-7 7H2.5v-2l7-7z" stroke-linecap="round" stroke-linejoin="round"/></svg>
      Request edit
    </button>
    <button class="po-btn primary" onclick="if(typeof toggleApprove==='function')toggleApprove(${task.id});closePoModal()">
      <svg viewBox="0 0 14 14"><path d="M3 7.5l3 3 5-6" stroke-linecap="round" stroke-linejoin="round"/></svg>
      ${isApproved ? 'Approved' : 'Approve'}
    </button>`;
}
function openGalleryPhoto(pid){
  _poEnsureDom();
  const photo = (PHOTOS || []).find(p => p.id === pid);
  if(!photo){ if(typeof toast === 'function') toast('Photo not found'); return; }
  __poCurrentPid = pid;
  // Find the task the photo belongs to (task photos have p.task === t.code; group photos have no task).
  const task = photo.kind === 'task'
    ? TASKS.find(t => t.code === photo.task)
    : (photo.kind === 'group' ? TASKS.find(t => t.room === photo.room) : null);
  _poRenderLeft(photo, task);
  _poRenderRight(photo, task);
  const el = document.getElementById('poModal');
  el.classList.add('is-open');
  document.body.style.overflow = 'hidden';
  // Tell shell to dim its global nav so the scrim looks continuous across
  // the iframe boundary.
  try{ window.parent && window.parent.postMessage({type:'kai-photo-overlay', open:true}, '*'); }catch(_){}
}
function toggleGalleryPhotoSel(pid){ if(typeof toast==='function') toast('Selection UI coming next'); }
function openAddGalleryModal(target){
  const label = target.kind==='unsorted' ? 'Unsorted' : (target.kind==='group' ? target.room + ' (group)' : target.room + ' · ' + target.task);
  if(typeof toast==='function') toast('Add photos to ' + label + ' — upload flow next');
}
function toggleGalSection(key){
  mediaCollapsed.has(key) ? mediaCollapsed.delete(key) : mediaCollapsed.add(key);
  renderGallery();
}
