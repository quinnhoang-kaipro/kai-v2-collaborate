/* Shop with Kai — ideal shopping concept: the app.
   Four screens over one set of data: Shop (list · shelf · references),
   Review & order, Pickup (the crew's phone), and Design notes (static).
   Everything re-renders from state S; clicks go through [data-act]. */
(function(){
'use strict';
const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const money = n => (n < 0 ? '−' : '') + '$' + Math.abs(n).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
const money0 = n => '$' + Math.round(n).toLocaleString('en-US');
const md = d => d.toLocaleDateString('en-US', {month: 'short', day: 'numeric'});
const wmd = d => d.toLocaleDateString('en-US', {weekday: 'short', month: 'short', day: 'numeric'});
const TOMORROW = new Date(2026, 10, 19);
const same = (a, b) => a.toDateString() === b.toDateString();
const rel = d => same(d, TODAY) ? 'today' : same(d, TOMORROW) ? 'tomorrow' : wmd(d);
const plural = (w, n) => n === 1 || /^[A-Z]+$/.test(w) ? w : /x$/.test(w) ? w + 'es' : /[^aeiou]y$/.test(w) ? w.slice(0, -1) + 'ies' : w + 's';
const IC = {
  cart: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M2.5 3.5h2.2l2 9.5h8.6l1.7-6.6H5.6"/><circle cx="8" cy="16.2" r="1.1" fill="currentColor"/><circle cx="14.3" cy="16.2" r="1.1" fill="currentColor"/></svg>',
  search: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="7" cy="7" r="4.8"/><path d="M10.6 10.6 14 14"/></svg>',
  stack: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="14" height="4"/><rect x="3" y="9" width="14" height="4"/><rect x="3" y="15" width="14" height="2.5"/></svg>',
  swap: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5h9l-2.5-2.5M13 11H4l2.5 2.5"/></svg>'
};

/* ── Substitution ────────────────────────────────────────────────────
   What happens when a product is out of stock is a team setting, set once
   for the organization (here: replace with any similar item), so nobody is
   asked every time. Anyone can change it for one item: from the shelf, the
   product sheet or Review & order, in the "If this item is out of stock"
   dialog. "Choose a replacement now" keeps up to two chosen substitutes. */
const SUB_TEAM = 'similar';
const SUB_IC = {
  choose: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="10" r="7.5"/><path d="m6.6 10.2 2.3 2.3 4.6-4.9"/></svg>',
  similar: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M15.5 8A6 6 0 0 0 5 5.6L3.5 7.2"/><path d="M3.5 3.5v3.7h3.7"/><path d="M4.5 12A6 6 0 0 0 15 14.4l1.5-1.6"/><path d="M16.5 16.5v-3.7h-3.7"/></svg>',
  approval: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5.5 13.5V9a4.5 4.5 0 0 1 9 0v4.5l1.5 1.5H4z"/><path d="M8.5 17.5h3"/></svg>',
  none: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M7.5 4.5 4 8l3.5 3.5"/><path d="M4 8h7.5a4.5 4.5 0 0 1 0 9H8"/></svg>'
};
const SUB_OPTS = {
  choose: {t: 'Choose a replacement now', s: 'Approve it in advance. The crew swaps to it on the spot as a pre-approved substitution.', short: 'Chosen substitute'},
  similar: {t: 'Replace with any similar item', s: 'Same kind, on the mood board, within 10% or $150. No change order; you’ll see what was swapped.', short: 'Any similar item'},
  approval: {t: 'Require my approval to replace', s: 'The crew asks you from the store. Approved swaps go into the next change order; if you don’t reply, it’s left off.', short: 'Ask me first'},
  none: {t: 'Don’t replace', s: 'If it’s out, it’s left off this pickup and stays on your list.', short: 'Don’t replace'}
};
NEEDS.forEach(n => { n.sub = n.backups.length ? 'choose' : null; n.subNote = ''; n.planQty = n.qty; });
// The product the job's template put on each item. It keeps its "Template pick" tag after a swap.
const TEMPLATE_PICK = Object.fromEntries(NEEDS.filter(n => n.pick).map(n => [n.id, n.pick]));
const isTpl = (sku, ns) => ns.some(n => TEMPLATE_PICK[n.id] === sku);
const subMode = n => n.sub || SUB_TEAM;
/* One line saying what happens if it's out, for one item or a combined line. */
function subLabel(ns, sku){
  const m = subMode(ns[0]), mixed = ns.some(n => subMode(n) !== m);
  if(mixed) return {m, html: 'Different for each room', team: false};
  // A product never substitutes for itself: the sheet for X leaves X out.
  const subs = m === 'choose' ? [...new Set(ns.flatMap(n => n.backups))].filter(s => s !== sku).map(s => CATALOG[s]).filter(Boolean) : [];
  const html = m === 'choose' ? (subs.length ? `Replace with ${subs.map(c => esc(c.name.split(/,|\(/)[0].trim())).join(', then ')}` : 'Choose a replacement') : SUB_OPTS[m].short;
  return {m, html, team: !ns.some(n => n.sub)};
}
function subLineHtml(ns, lead, sku){
  const L = subLabel(ns, sku);
  return `<button type="button" class="sub-ln" data-act="sub-open" data-ids="${ns.map(n => n.id).join(',')}"${sku ? ` data-sku="${sku}"` : ''} title="Change what happens if it's out of stock">
    <span class="sub-ic">${SUB_IC[L.m]}</span><span>${lead || ''}${L.html}</span><u>Change</u></button>`;
}
function subOpen(ids, sku){
  const ns = ids.map(need).filter(Boolean); if(!ns.length) return;
  const n0 = ns[0];
  S.subDraft = {ids, sku: sku || null, mode: subMode(n0), note: n0.subNote || '', picks: [...new Set(ns.flatMap(n => n.backups))].filter(s => s !== sku).slice(0, 2)};
  renderSub();
}
function subCands(ns){
  const n0 = ns[0], sk = S.subDraft.sku || n0.pick, p = sk && CATALOG[sk]; if(!p) return [];
  const chosen = S.subDraft.picks.map(s => CATALOG[s]).filter(Boolean);
  const rest = BY_CAT[n0.cat].filter(c => c.sku !== p.sku && !S.subDraft.picks.includes(c.sku) && c.mood && ns.every(n => fitsNeed(c, n)))
    .sort((a, b) => Math.abs(a.price - p.price) - Math.abs(b.price - p.price));
  return chosen.concat(rest).slice(0, Math.max(4, chosen.length));
}
function renderSub(){
  let host = document.getElementById('subhost');
  if(!host){ host = document.createElement('div'); host.id = 'subhost'; document.body.appendChild(host); }
  const dr = S.subDraft; if(!dr){ host.innerHTML = ''; return; }
  const ns = dr.ids.map(need), n0 = ns[0], sk = dr.sku || n0.pick, p = sk && CATALOG[sk];
  const q = ns.reduce((a, n) => a + n.qty, 0), b = p ? buy(p, q, offerOf(n0, p)) : null;
  const opt = k => {
    const on = dr.mode === k, o = SUB_OPTS[k];
    const picks = k === 'choose' && on ? `<div class="sm-picks">${subCands(ns).map(c => {
        const sel = dr.picks.indexOf(c.sku), dl = b ? buy(c, q, c.offers[0]).total - b.total : 0;
        return `<button type="button" class="sm-pick${sel >= 0 ? ' on' : ''}" data-act="sub-pick" data-sku="${c.sku}"><img src="${ART.product(c)}" alt="">
          <span><b>${esc(c.name)}</b><span>${esc(c.brand)} · ${Math.abs(dl) < 1 ? 'same price' : dl > 0 ? money0(dl) + ' more' : money0(-dl) + ' less'}</span></span><span class="sm-chk">${sel >= 0 ? sel + 1 : ''}</span></button>`;
      }).join('')}<p class="sm-hint">Pick up to 2. The crew tries 1 first, then 2.</p></div>` : '';
    return `<button type="button" class="sm-opt${on ? ' on' : ''}" role="radio" aria-checked="${on}" data-act="sub-mode" data-v="${k}">
      <span class="sm-ic">${SUB_IC[k]}</span><span class="sm-t"><b>${o.t}</b><span>${o.s}</span></span><span class="sm-radio" aria-hidden="true"></span></button>${picks}`;
  };
  host.innerHTML = `<div class="sm-wrap" data-act="sub-close"><div class="sm" role="dialog" aria-modal="true" aria-label="If this item is out of stock" data-stop="1">
    <button type="button" class="sm-back" data-act="sub-close" aria-label="Back">←</button>
    <h3>If this item is out of stock</h3>
    ${p ? `<div class="sm-item"><img src="${ART.product(p)}" alt=""><div><b>${esc(p.name)}</b><span>${b.label} · ${money(b.total)} · ${ns.length > 1 ? `${ns.length} tasks` : esc(ROOM[n0.room].name)}</span></div></div>` : ''}
    <div class="sm-opts" role="radiogroup">${['choose', 'similar', 'approval', 'none'].map(opt).join('')}</div>
    <label class="sm-note"><b>Add note</b><input id="subNote" type="text" value="${esc(dr.note)}" placeholder="e.g. Same color family, nothing darker" autocomplete="off"></label>
    <div class="sm-ft"><button type="button" class="btn ink block" data-act="sub-save">Save</button>
      <p>Your team's setting is “${SUB_OPTS[SUB_TEAM].t.toLowerCase()}”. This changes it for this ${ns.length > 1 ? 'line' : 'item'} only.</p></div>
  </div></div>`;
}
function subSave(){
  const dr = S.subDraft; if(!dr) return;
  if(dr.mode === 'choose' && !dr.picks.length){ toast('Pick at least one replacement, or choose another option.'); return; }
  dr.ids.map(need).forEach(n => { n.sub = dr.mode === SUB_TEAM ? null : dr.mode; n.backups = dr.mode === 'choose' ? dr.picks.slice() : []; n.subNote = dr.note.trim(); });
  S.subDraft = null; renderSub();
  toast(`Saved. If it's out of stock: ${SUB_OPTS[dr.mode].short.toLowerCase()}.`);
  render();
}

// Combined pickup stock for the job's standard floor, so four rooms fit in one pickup.
CATALOG['SH-PAR'].offers[0].stock = 64;
CATALOG['SW-7029'].offers[0].stock = 40;

/* ── Where the job buys from (KaiWeb's Delivery & pickup, set once for the whole job) ──
   Which stores' products show, delivery and/or pickup, the delivery address,
   where to pick up near, and the store per retailer. Top right of Shop. */
const PROP = {addr: `${JOB.street}, ${JOB.city}`, zip: (JOB.city.match(/\d{5}/) || [''])[0]};
const STORE_OPTS = {hd: [['Wilmington #1863', 3.2], ['Leland #6574', 9.4]], low: [['Wilmington · Oleander Dr', 4.1], ['Porters Neck #2659', 8.8]],
  fd: [['Wilmington', 6.8]], fer: [['Wilmington Showroom', 5.5]]};
const FUL0 = {hd: 'pickup', low: 'pickup', fd: 'delivery', fer: 'delivery'};   // each store's way when both are on

/* ── State ── */
const S = {
  screen: 'shop', group: 'room', filter: 'all',
  pv: 'materials', pvPrev: 'all', pvAuto: true, wasShop: true, pvOpen: new Set(), pvShut: new Set(), pvFind: false, pvQ: '',   // the left panel: all | labor | materials; Shop flips it to materials and leaving puts it back
  sel: {kind: 'room', room: 'kitchen'},   // need | type | room ('all' = every room)
  q: '', chips: new Set(), sort: 'rec',
  detail: null, detailImg: 0, detailFor: null,   // detailFor: the need a room-view sheet is for
  ref: {open: [], full: false, w: 440, ph: null, prod: null, flash: null, page: null, side: 'right'},   // the side panel: one reference or one page, on the left or the right
  pair: null,               // two pages side by side without the shelf, in pane order
  ack: new Set(), excl: {},
  ful: {...FUL0},
  ordFul: {},               // 'sup|buyer' → an order's own pickup / delivery
  rvOpen: null,            // Merged: purchase rows opened to show their items (null = the first one)
  rvDone: new Set(),
  tlCon: new Set(),         // Merged Timeline: contractors picked in the filter (none = all)
  tlMeth: new Set(),        // Merged Timeline: ways of getting it picked in the filter (store | pickup | delivery)          // Merged Timeline: weeks opened inside a big purchase
  fixKeep: new Set(),       // Merged: fixes you chose to keep as is        // Merged: purchases marked bought / ordered
  rvMore: new Set(),        // Review lines showing all their tasks
  lineFul: {},              // 'sup|sku' → a line's own pickup / delivery, where it differs from its order's
  src: {ret: 'all', mode: 'both', addr: PROP.addr, near: PROP.zip, store: {}, open: false},   // ret: 'all' or the stores ticked
  offer: {},                // need id → supplier, when the order uses another store
  placed: false,
  notes: {},                // notes added in the demo
  pk: {got: new Set(), sheet: null, toast: '', swaps: {}, skip: new Set()},
  subDraft: null,           // the substitution dialog while it's open
  dQty: null,               // the product sheet's count before Add
  dSup: null,               // the product sheet's store before Add (a pick changes store at once)
  car: {}                   // need id → how far its room-view carousel is scrolled
};

/* ── Helpers: needs, quantities, stock ── */
const need = id => NEEDS.find(n => n.id === id) || NEEDS.flatMap(n => n.more || []).find(x => x.id === id);
/* A task can hold several products ("adding adds"): the first is n.pick; the rest sit on n.more as
   need-like entries with their own product, amount, store, pickup/delivery and out-of-stock rule.
   They count in the task's total and allowance and each becomes its own line in Review & order. */
const withMore = n => [n, ...(n.more || [])];
const hostOf = n => n && n.xof ? need(n.xof) : n;
function mkMore(n, sku, qty){ return {id: `${n.id}~${sku}`, xof: n.id, of: n.of || n.id, cat: n.cat, room: n.room, task: n.task, opt: n.opt, desc: n.desc, fit: n.fit, src: n.src,
  pick: sku, qty, planQty: n.planQty, backups: [], sub: null, subNote: ''}; }
const selNeeds = () => S.sel.kind === 'need' ? [need(S.sel.id)] : S.sel.kind === 'room' ? NEEDS.filter(n => S.sel.room === 'all' || n.room === S.sel.room) : NEEDS.filter(n => n.cat === S.sel.cat);
const exclSet = cat => S.excl[cat] || (S.excl[cat] = new Set());
const inclNeeds = () => S.sel.kind === 'need' ? selNeeds() : selNeeds().filter(n => !exclSet(n.cat).has(n.id));
const unitWord = (cat, n) => { const i = CAT_INFO[cat]; const w = i.unit === 'ea' ? i.packName : i.unit === 'gal' ? 'gallon' : i.unit; return plural(w, n); };
const qtyText = (cat, q) => `${q.toLocaleString()} ${unitWord(cat, q)}`;
const perUnit = p => p.unit === 'ea' || p.unit === 'suite' || p.unit === 'kit' ? 'each' : p.unit === 'gal' ? 'gallon' : p.unit;
const fitsNeed = (p, n) => !(p.size && n.fit && p.size !== n.fit);
const SUP_KEYS = Object.keys(SUPPLIERS);
const supOk = sup => S.src.ret === 'all' || S.src.ret.includes(sup);
const firstOffer = p => p.offers.find(o => supOk(o.sup)) || p.offers[0];   // the first of the job's stores that sells it
const sold = p => p.offers.some(o => supOk(o.sup));
const shipOn = () => S.src.mode !== 'pickup', pickOn = () => S.src.mode !== 'ship';
const shortAddr = v => String(v).split(',')[0];
const nearOff = () => S.src.near === PROP.zip ? 0 : (_h(S.src.near) % 40) / 10;
const miFor = (k, i) => Math.round((STORE_OPTS[k][i][1] + nearOff()) * 10) / 10;
// Every line that says where (cards, the product sheet, orders) reads the chosen store from SUPPLIERS.
function applyStores(){ SUP_KEYS.forEach(k => { const i = Math.min(S.src.store[k] || 0, STORE_OPTS[k].length - 1); SUPPLIERS[k].store = STORE_OPTS[k][i][0]; SUPPLIERS[k].mi = miFor(k, i); }); }
// An order's way covers all its lines: setting it clears the lines' own.
function setFul(sup, v){ S.ful[sup] = v; [S.lineFul, S.ordFul].forEach(m => Object.keys(m).forEach(k => { if(k.startsWith(sup + '|')) delete m[k]; })); }
const offerOf = (n, p) => (S.offer[n.id] && p.offers.find(o => o.sup === S.offer[n.id])) || firstOffer(p);
function buy(p, qty, o){
  o = o || firstOffer(p);
  if(p.pack > 1){
    const n = Math.ceil(qty / p.pack - 1e-9), cover = Math.round(n * p.pack * 10) / 10;
    return {n, cover, total: Math.round(cover * o.price * 100) / 100, label: `${n} ${plural(p.packName, n)}`, sub: `${cover.toLocaleString()} ${p.unit}`, o};
  }
  return {n: qty, cover: qty, total: Math.round(qty * o.price * 100) / 100, label: qtyText(p.cat, qty), sub: '', o};
}
/* ── Add, then a quantity stepper ──
   One action per product. Add puts it on the list; the button turns into a
   stepper counting what you'll buy (boxes, gallons, each). At one, − becomes
   a bin and takes it off. The plan's quantity is the starting point. */
const TRASH = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 4.5h11M6 4.5V2.8h4v1.7M4 4.5l.7 9h6.6l.7-9"/></svg>';
const qtyForCount = (p, k) => p.pack > 1 ? Math.round(k * p.pack * 10) / 10 : k;
function setCount(n, p, k){ n.qty = qtyForCount(p, k); }
function stepperHtml(n, cls){
  const p = CATALOG[n.pick], b = buy(p, n.qty, offerOf(n, p)), last = b.n <= 1;
  return `<div class="stp${cls ? ' ' + cls : ''}" role="group" aria-label="Quantity of ${esc(p.name)}">
    <button type="button" data-act="qty" data-id="${n.id}" data-d="-1" aria-label="${last ? 'Remove' : 'One less'}" title="${last ? 'Remove from the list' : 'One less'}">${last ? TRASH : '−'}</button>
    <span class="stp-n"><b>${b.label}</b></span>
    <button type="button" data-act="qty" data-id="${n.id}" data-d="1" aria-label="One more" title="One more">+</button></div>`;
}
function removePick(ns){
  ns = ns.filter(n => n.pick); if(!ns.length) return;
  const nm = CATALOG[ns[0].pick].name.split(/,|\(/)[0].trim();
  const snap = [...new Set(ns.map(hostOf))].map(h => [h, h.pick, h.qty, (h.more || []).slice(), S.offer[h.id]]);
  ns.forEach(n => {
    if(n.xof){ const h = need(n.xof); h.more = (h.more || []).filter(x => x !== n); return; }
    if(n.more && n.more.length){ const x = n.more.shift(); n.pick = x.pick; n.qty = x.qty; if(S.offer[x.id]) S.offer[n.id] = S.offer[x.id]; else delete S.offer[n.id]; return; }
    n.pick = null; n.qty = n.planQty;
  });
  toast(`Removed ${esc(nm)}${ns.length > 1 ? ` from ${ns.length} tasks` : ''}.`, () => { snap.forEach(([h, pk, q, more, of]) => { h.pick = pk; h.qty = q; h.more = more; if(of) S.offer[h.id] = of; else delete S.offer[h.id]; }); render(); });
  render();
}
const stockWord = (p, n) => p.pack > 1 ? plural(p.packName, n) : unitWord(p.cat, n);
function avail(p, qty, o){
  o = o || firstOffer(p);
  const b = buy(p, qty, o), sup = SUPPLIERS[o.sup], at = `${sup.name} ${sup.store.split(' · ')[0].replace('Wilmington ', '')}`;
  if(!supOk(o.sup)) return {cls: 'warn', ok: true, html: `<b>${esc(sup.name)} is off for this job</b> · turn it on in Delivery &amp; pickup`, short: `${esc(sup.name)} is off`};
  if(!pickOn()) return {cls: 'ok', ok: true, html: `<b>Delivery</b> · arrives ${wmd(o.ship)} to ${esc(shortAddr(S.src.addr))}`, short: `Arrives ${wmd(o.ship)}`};
  const other = p.offers.find(x => x !== o && supOk(x.sup) && x.stock >= b.n);
  if(o.stock >= b.n && o.stock < b.n * 2 + 4) return {cls: 'warn', ok: true, html: `<b>Only ${o.stock} left</b> at ${esc(at)} · enough for this job`, short: `Only ${o.stock} left`};
  if(o.stock >= b.n) return {cls: 'ok', ok: true, html: `<b>In stock</b> · ${o.stock} ${stockWord(p, o.stock)} at ${esc(at)} · pickup today`, short: 'In stock'};
  const why = o.stock ? `Only ${o.stock} of ${b.n} at ${esc(at)}` : `Out at ${esc(at)}`;
  return {cls: 'err', ok: false, html: `<b>${why}</b> · ${shipOn() ? 'ships' : 'ships to the store'} ${wmd(o.ship)}${other ? ` · in stock at ${esc(SUPPLIERS[other.sup].name)}` : ''}`, short: o.stock ? 'Not enough in stock' : 'Out of stock'};
}
function score(p, needs){
  let s = 0;
  if(p.std) s += 50;
  s += p.mood ? 30 : -45;
  if(needs.some(n => !fitsNeed(p, n)) && !needs.some(n => fitsNeed(p, n))) s -= 120;
  if(needs.length === 1 && !fitsNeed(p, needs[0])) s -= 120;
  const q = needs.reduce((a, n) => a + n.qty, 0);
  if(p.offers.some(o => o.stock >= buy(p, q, o).n)) s += 12;
  s += Math.min(p.used, 40) / 4 + (p.up ? 3 : 0);
  return s;
}
const majorityPick = needs => {
  const c = {}; needs.forEach(n => { if(n.pick) c[n.pick] = (c[n.pick] || 0) + 1; });
  return Object.entries(c).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
};
const notesFor = needs => needs.flatMap(n => (NOTES[n.id] || []).concat(S.notes[n.id] || []).map(x => ({n, who: x[0], text: x[1], when: x[2]})));

/* ── Toast ── */
let toastT = null;
function toast(msg, undo){
  const el = $('#toast');
  el.innerHTML = `<div class="toast"><span>${msg}</span>${undo ? '<button type="button" data-act="undo">Undo</button>' : ''}</div>`;
  toast.undo = undo || null;
  clearTimeout(toastT); toastT = setTimeout(() => { el.innerHTML = ''; toast.undo = null; }, undo ? 6000 : 3800);
}

/* ── Bar ── */
function renderBar(){
  $('#demoNav').querySelectorAll('[data-v]').forEach(b => b.classList.toggle('on', b.dataset.v === S.screen));
  /* The tabs: click one for that page on its own. Tick up to two to see them side
     by side, always in the same order (PANE_ORDER). A third waits until one is
     unticked. A tab open on its own shows no box: the ticks are only for side by side. */
  const panes = curPanes();
  document.querySelectorAll('.bar .tabs .tw').forEach(w => {
    const p = w.dataset.tab, on = panes.includes(p), c = w.querySelector('.tck');
    w.classList.toggle('on', on);
    if(!c) return;
    const full = !on && panes.length >= 2, last = on && panes.length === 1, nm = p === 'shop' ? 'Shop' : besName(p);
    c.setAttribute('aria-checked', String(on));
    c.setAttribute('aria-disabled', String(full));
    c.classList.toggle('is-last', last);
    c.title = full ? 'Two are showing. Untick one first.' : last ? `${nm} is showing. Tick another tab to see it beside.` : on ? `Untick to close ${nm}` : `Tick to show ${nm} side by side`;
  });
  const cb = $('#cartBtn');
  cb.classList.toggle('on', S.screen === 'review');
  cb.innerHTML = `${IC.cart}<span>${S.placed ? 'Orders' : 'Review & order'}</span>`;
  cb.title = S.placed ? 'Orders' : 'Review & order';
  fitTabs();
}
/* The tabs sit over the page's text and mustn't run into the buttons on the
   right. Short of room, the bar tightens one step at a time: closer tabs and
   icons, then Review & order as just its icon, and, only on a very narrow
   window, the icons of tabs that aren't open. */
function fitTabs(){
  const bar = document.querySelector('.bar'), tabs = bar && bar.querySelector('.tabs'); if(!tabs) return;
  const room = () => { const t = tabs.getBoundingClientRect();
    const xs = [...bar.children].filter(e => e !== tabs).map(e => e.getBoundingClientRect()).filter(r => r.width && r.left > t.left).map(r => r.left);
    return xs.length ? Math.min(...xs) - 12 - t.right : 1; };
  for(let n = 0; n <= 3; n++){
    ['tf-1', 'tf-2', 'tf-3'].forEach((c, i) => bar.classList.toggle(c, n > i));
    if(room() >= 0) return;
  }
}
window.addEventListener('resize', fitTabs);
if(window.ResizeObserver){ const _bar = document.querySelector('.bar'); if(_bar) new ResizeObserver(() => fitTabs()).observe(_bar); }   // zoom, or a resize the event misses

/* ── Allowances (the KaiWeb concept) ──────────────────────────────────
   A task allowance covers labor and materials; a room's is its own, or the
   sum of its tasks' when each has one. They're a reference, not a cap: an
   amount with a dotted underline shows the breakdown on hover, a red dot
   marks over, and an item over its task allowance needs review — it's
   never steered toward something cheaper. Clicking opens the Cost Book. */
const LABOR = {k1: 1200, k2: 1450, k3: 680, k4: 350, k7: 920, l1: 1100, p1: 450, p2: 2400};   // labor priced so far
const ROOM_ALLOW = {kitchen: 18000, pbath: 6000, pbed: 3500};
/* Tasks and their options. Most tasks have one option; a second option names its
   task with of: (Kitchen Paint: walls, then trim and doors). */
const tkOf = n => n.of || n.id;
const optsOf = n => NEEDS.filter(x => tkOf(x) === tkOf(n));
const multiOpt = n => optsOf(n).length > 1;
const taskCount = ns => new Set(ns.map(tkOf)).size;
const firstPerTask = ns => ns.filter((n, i) => ns.findIndex(x => tkOf(x) === tkOf(n)) === i);
const optShort = n => (n.opt || n.task).split(' : ').pop();
// Where a line goes: the room, plus the option when its task has more than one.
const whereOf = n => ROOM[n.room].name + (multiOpt(n) ? ` · ${optShort(n)}` : '');
/* Any row in the left panel that opens and closes does so on a click: a row that also selects (a room, a product type) opens on the first click and folds on the next. */
const nvFlip = k => { if(S.pvShut.has(k)){ S.pvShut.delete(k); S.pvOpen.add(k); } else { S.pvOpen.delete(k); S.pvShut.add(k); } renderList(); };
const whereTask = n => `${ROOM[n.room].name} › ${n.task}` + (multiOpt(n) ? ` · ${optShort(n)}` : '');   // a product type is shopped task by task
// A task's name, plus the option when it has more than one ("Paint · Trim and doors").
const taskLabel = n => n.task + (multiOpt(n) ? ` · ${optShort(n)}` : '');
const taskCost = n => needTotal(n) + (LABOR[n.id] || 0);
const overBy = n => (n.pick && n.allow) ? Math.max(0, taskCost(n) - n.allow) : 0;
const isOver = n => overBy(n) > .5;
function tipHtml(rows){
  return `<span class="tip" role="tooltip">${rows.map(([k, v, cls]) => `<span class="tip-k${cls ? ' ' + cls : ''}">${k}</span><span class="tip-v${cls ? ' ' + cls : ''}">${v}</span>`).join('')}<span class="tip-go">Click to open in Cost Book</span></span>`;
}
function allowRows(mat, lab, a, aLabel){
  const rows = [['Materials', money(mat)], ['Labor', lab ? money(lab) : 'not priced yet'], [aLabel, a ? money0(a) : 'not set', 'b']];
  if(a && mat + lab > a) rows.push(['Over by', money(mat + lab - a), 'over']);
  return rows;
}
/* One item: its amount, with the task breakdown on hover. */
function needAmtHtml(n, text){
  const mat = needTotal(n), lab = LABOR[n.id] || 0;
  return `<span class="alw has-tip${isOver(n) ? ' is-over' : ''}" tabindex="0" role="link" data-act="cost-book">${text}${tipHtml(allowRows(mat, lab, n.allow, 'Task allowance'))}</span>`;
}
/* A room: what's spent against its allowance. */
function roomCost(rid){
  const ns = NEEDS.filter(n => n.room === rid), mat = ns.reduce((a, n) => a + needTotal(n), 0), lab = ns.reduce((a, n) => a + (LABOR[n.id] || 0), 0);
  const ts = ns.filter(n => !n.of);   // a task's second option shares its allowance
  const own = ROOM_ALLOW[rid], a = own != null ? own : (ts.every(n => n.allow) ? ts.reduce((x, n) => x + n.allow, 0) : 0);
  return {mat, lab, own, a, over: a && mat + lab - a > .5 ? mat + lab - a : 0};
}
function roomAmtHtml(rid){
  const {mat, lab, own, a} = roomCost(rid), over = a && mat + lab > a;
  return `<span class="alw has-tip${over ? ' is-over' : ''}" tabindex="0" role="link" data-act="cost-book">${money0(mat + lab)}${a ? ` / ${money0(a)}` : ''}${tipHtml(allowRows(mat, lab, a, own != null ? 'Room allowance' : 'Task allowances, total'))}</span>`;
}

/* ═════════════ SHOP: the list ═════════════ */
function rowStatus(n){
  if(n.swap) return `<span class="tag ok">Swapped</span>`;
  if(!n.pick) return `<span class="tag warn">Needs product</span>`;
  const p = CATALOG[n.pick], b = buy(p, n.qty, offerOf(n, p));
  return `<span class="amt num">${needAmtHtml(n, money(b.total))}</span>`;
}
function needRow(n){
  const on = S.sel.kind === 'need' && S.sel.id === n.id;
  const p = n.pick && CATALOG[n.pick];
  const sub = n.swap ? `<span style="color:var(--success)">Swapped at pickup · ${n.swap.pre ? 'pre-approved substitution' : n.swap.co ? 'in the next change order' : 'no change order'}</span>`
    : !p ? `<span class="todo">Choose a product · ${qtyText(n.cat, n.qty)}</span>`
    : `<span>${qtyText(n.cat, n.qty)} · ${esc(p.brand)} ${esc(p.name)}</span>`;
  const flags = isOver(n) ? '<span class="tag warn">Needs review</span>' : '';
  return `<button type="button" class="row${on ? ' on' : ''}" data-act="sel-need" data-id="${n.id}">
    <span class="th${p ? '' : ' empty'}">${p ? `<img src="${ART.product(p)}" alt="">` : '+'}</span>
    <span class="tx"><b>${esc(n.task)}</b>${sub}</span>
    <span class="rt">${rowStatus(n)}${flags ? `<span class="flags">${flags}</span>` : ''}</span>
  </button>`;
}
function typeRow(cat){
  const ns = NEEDS.filter(n => n.cat === cat), on = S.sel.kind === 'type' && S.sel.cat === cat;
  const picks = [...new Set(ns.filter(n => n.pick).map(n => n.pick))], todo = ns.filter(n => !n.pick).length;
  const p = picks.length ? CATALOG[majorityPick(ns)] : null;
  const total = ns.filter(n => n.pick).reduce((a, n) => a + buy(CATALOG[n.pick], n.qty, offerOf(n, CATALOG[n.pick])).total, 0);
  const qty = ns.reduce((a, n) => a + n.qty, 0);
  const rooms = [...new Set(ns.map(n => ROOM[n.room].name))];
  return `<button type="button" class="row${on ? ' on' : ''}" data-act="sel-type" data-cat="${cat}">
    <span class="th${p ? '' : ' empty'}">${p ? `<img src="${ART.product(p)}" alt="">` : '+'}</span>
    <span class="tx"><b>${esc(CAT_INFO[cat].label)}</b><span>${rooms.length > 1 ? `${rooms.length} rooms · ` : esc(rooms[0]) + ' · '}${qtyText(cat, qty)}</span></span>
    <span class="rt">${todo ? `<span class="tag warn">${todo} ${todo === 1 ? 'needs' : 'need'} product</span>` : `<span class="amt num">${money(total)}</span>`}${picks.length > 1 ? `<span class="tag warn">${picks.length} products</span>` : ''}</span>
  </button>`;
}
function listFilter(n){
  if(S.filter === 'todo') return !n.pick;
  if(S.filter === 'changed') return isOver(n);
  if(S.filter === 'nobackup') return n.pick && !n.backups.length && !n.swap;
  return true;
}
function renderList(){
  const el = $('#list'), keep = el.querySelector('.list-body')?.scrollTop || 0;
  const total = NEEDS.length, chosen = NEEDS.filter(n => n.pick).length, todo = total - chosen;
  const changed = NEEDS.filter(isOver).length;
  const ordered = S.placed ? chosen : 0;
  /* KaiWeb's filter button: funnel + caret; the label names the applied
     filter; the red corner badge means something needs review. */
  const FL = {todo: ['Needs product', todo, 'todo'], changed: ['Needs review', changed, 'err']};
  const opt = v => `<button type="button" class="af-opt${S.filter === v ? ' on' : ''}${FL[v][1] ? '' : ' is-empty'}" data-act="filter" data-v="${S.filter === v ? 'all' : v}" role="menuitemcheckbox" aria-checked="${S.filter === v}"><span class="af-mk ${FL[v][2]}"></span><span class="lbl">${FL[v][0]}</span><span class="n">${FL[v][1]}</span><svg class="ck" viewBox="0 0 14 14" fill="none"><path d="M2.5 7.5l3 3 6-7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button>`;
  const applied = FL[S.filter];
  const filterBtn = `<div class="af${S.fltOpen ? ' open' : ''}${applied ? ' active' : ''}">
      <button type="button" class="af-btn" data-act="flt-menu" title="Filters${applied ? `: ${applied[0]}` : ''}" aria-label="Filters${applied ? `: ${applied[0]}` : ''}" aria-haspopup="menu" aria-expanded="${!!S.fltOpen}">
        <svg class="af-funnel" viewBox="0 0 20 25" fill="none" aria-hidden="true"><path d="M19.5 3.5L11.5 13V23.5L8.5 21.5V13L0.5 3.5V1.5H19.5V3.5Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round"/></svg>
        <svg class="af-caret" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 4.5L6 8l3.5-3.5"/></svg>
        ${changed ? '<span class="af-attn" title="Items need review"></span>' : ''}
      </button>
      ${S.fltOpen ? `<div class="af-menu" role="menu">${opt('todo')}${opt('changed')}${applied ? '<div class="af-foot"><button type="button" class="link" data-act="filter" data-v="all">Clear filter</button></div>' : ''}</div>` : ''}
    </div>`;
  /* KaiWeb's scope navigator, as in Shop with Kai · Layout, on every tab:
     All (rooms → tasks, total cost) · Labor (crew → tasks, labor cost) ·
     Materials (department → product type → tasks, materials cost). */
  const pv = S.pv, q = (S.pvQ || '').trim().toLowerCase();
  const pass = n => listFilter(n) && (!q || `${n.task} ${ROOM[n.room].name}`.toLowerCase().includes(q));
  const cnt = (k, w) => `${k} ${w}${k === 1 ? '' : 's'}`;
  const amtOf = n => pv === 'labor' ? (LABOR[n.id] || 0) : pv === 'materials' ? needTotal(n) : taskCost(n);
  const amt = v => v ? money(v) : '—';
  const selId = S.sel.kind === 'need' ? S.sel.id : null;
  /* While a product is dragged from the main panel, the list is where it can go
     (as in the Shopping List wireframe): every task it fits is outlined and
     opened, the rest dim. Drop on one task to fill it; a box then asks which of
     the other tasks it fits should get it too. A task takes it on its first
     option the product fits; a task with two that fit shows both, to drop on one. */
  const dp = S.drag && CATALOG[S.drag];
  const dFit = n => !!dp && n.cat === dp.cat && fitsNeed(dp, n);
  const dIds = ns => firstPerTask(ns.filter(dFit)).map(n => n.id);
  const dAttr = ids => dp && ids.length ? ` data-drop="${ids.join(',')}"` : '';
  const isOpen = (k, ns, dflt) => (dp && ns.some(dFit)) || S.pvOpen.has(k) || (!S.pvShut.has(k) && (dflt || ns.some(n => n.id === selId)));
  const car = (k, o) => `<span class="nv-car${o ? ' o' : ''}" data-act="nv-tog" data-k="${esc(k)}" data-o="${o ? 1 : 0}" role="button" aria-label="${o ? 'Collapse' : 'Expand'}" title="Expand / collapse"><svg viewBox="0 0 12 12" fill="none"><path d="M4.5 3L7.5 6l-3 3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`;
  /* One row per task. Under a product type (Materials) the row covers only that
     type's options: a Cabinets task's knobs sit under Door hardware, not Cabinets. */
  // Under a product type, a task row reads like All and Labor (room › task) with its option, "Replace : Prehung doors",
  // as a grey line under it. Two options of one task under the same type share a verb: "Paint : Walls + Trim and doors".
  const optOf = os => !os.every(x => x.opt) ? '' : os.length === 1 ? os[0].opt : `${os[0].opt.split(' : ')[0]} : ${os.map(optShort).join(' + ')}`;
  const task = (n, withRoom, cat) => {
    const st = TASK_ST[tkOf(n)] || 'Not started', tg = TASK_TAG[tkOf(n)], os = optsOf(n).filter(x => !cat || x.cat === cat);
    const dos = os.filter(dFit);
    return `<button type="button" class="nv-task${os.some(x => x.id === selId) ? ' on' : ''}" data-act="sel-need" data-id="${n.id}"${dAttr(dIds(os))}>${dos.length > 1 ? `<span class="nv-dz">${dos.map(o => `<span class="nv-dzo" data-drop="${o.id}">${esc(optShort(o))}</span>`).join('')}</span>` : ''}
      ${cat && optOf(os) ? `<span class="nv-tn nv-tn2"><span class="nv-ln">${os.some(isOver) ? `<span class="nv-flag" title="Over its allowance · needs review">${FLAG}</span>` : ''}${withRoom ? `<span class="nv-rm">${esc(ROOM[n.room].name)} ›</span> ` : ''}<b>${esc(n.task)}</b></span><span class="nv-sub">${esc(optOf(os))}</span></span>`
        : `<span class="nv-tn">${os.some(isOver) ? `<span class="nv-flag" title="Over its allowance · needs review">${FLAG}</span>` : ''}${withRoom ? `<span class="nv-rm">${esc(ROOM[n.room].name)} ›</span> ` : ''}<b>${esc(cat && os.length < optsOf(n).length ? taskLabel(n) : n.task)}</b></span>`}
      <span class="nv-amt num">${amt(os.reduce((a, x) => a + amtOf(x), 0))}</span>
      <span class="nv-pills"><span class="nv-st${st === 'In progress' ? ' ip' : ''}">${st === 'In progress' ? '◆' : '◇'} ${st}</span>${tg ? `<span class="nv-tag">${tg}</span>` : ''}${pv !== 'labor' && os.some(x => !x.pick) ? '<span class="nv-tag warn">Needs product</span>' : ''}</span></button>`;
  };
  const head = (k, o, name, n, sum, act, extra) => `<div class="nv-gh${extra || ''}"><button type="button" class="nv-gn" ${act}><b>${name}</b><i>${cnt(n, 'task')}</i></button><span class="nv-gamt num">${amt(sum)}</span>${car(k, o)}</div>`;
  // The first group in each view starts open all the way down (Kitchen's tasks; Appliances › Appliance suite's
  // tasks), so the panel never opens as a wall of folded headers. It's only opened, not selected; folding it sticks.
  let body = '', sum, lead = true;
  if(pv === 'all'){
    ROOMS.forEach((r, ri) => {
      const all = NEEDS.filter(n => n.room === r.id), ns = all.filter(pass); if(!ns.length) return;
      const fst = lead; lead = false;
      const roomOn = S.sel.kind === 'room' && S.sel.room === r.id, o = isOpen('r:' + r.id, ns, fst || roomOn || (q && true));
      body += `<section class="nv-grp${o ? '' : ' shut'}">${head('r:' + r.id, o, esc(r.name), taskCount(all), all.reduce((a, n) => a + taskCost(n), 0), `data-act="sel-room" data-room="${r.id}" title="Every ${esc(r.name)} task together"`, roomOn ? ' on' : '')}
        ${o ? `<button type="button" class="nv-new" data-act="inert">+ New task</button>${firstPerTask(ns).map(n => task(n)).join('')}` : ''}</section>`;
    });
    sum = ['All scope', 'Total cost', NEEDS.reduce((a, n) => a + taskCost(n), 0)];
  } else if(pv === 'labor'){
    const crews = [...new Set(NEEDS.map(crew))].sort((a, b) => (a === 'Unassigned') - (b === 'Unassigned'));
    crews.forEach(c => {
      const all = NEEDS.filter(n => crew(n) === c), ns = all.filter(pass); if(!ns.length) return;
      const fst = lead; lead = false;
      const o = isOpen('l:' + c, ns, fst || !!q);
      body += `<section class="nv-grp${o ? '' : ' shut'}">${head('l:' + c, o, esc(c), taskCount(all), all.reduce((a, n) => a + (LABOR[n.id] || 0), 0), `data-act="nv-tog" data-k="l:${esc(c)}" data-o="${o ? 1 : 0}"`)}
        ${o ? firstPerTask(ns).map(n => task(n, true)).join('') : ''}</section>`;
    });
    sum = ['All labor', 'Labor cost', NEEDS.reduce((a, n) => a + (LABOR[n.id] || 0), 0)];
  } else {
    const depts = [...new Set(NEEDS.map(n => DEPT[n.cat]))].sort();
    depts.forEach(d => {
      const all = NEEDS.filter(n => DEPT[n.cat] === d), ns = all.filter(pass); if(!ns.length) return;
      const fst = lead; lead = false;
      const typeOn = S.sel.kind === 'type' && DEPT[S.sel.cat] === d, o = isOpen('d:' + d, ns, fst || typeOn || !!q);
      let inner = '';
      if(o) CAT_ORDER.filter(c => DEPT[c] === d && ns.some(n => n.cat === c)).forEach((c, ci) => {
        const cn = ns.filter(n => n.cat === c), cAll = all.filter(n => n.cat === c), on = S.sel.kind === 'type' && S.sel.cat === c, co = isOpen('c:' + c, cn, (fst && ci === 0) || on || !!q);
        inner += `<div class="nv-set${co ? '' : ' shut'}"><div class="nv-sh${on ? ' on' : ''}" data-act="sel-type" data-cat="${c}"><button type="button" class="nv-gn" data-act="sel-type" data-cat="${c}" title="${taskCount(cAll) > 1 ? `Shop ${esc(CAT_INFO[c].label.toLowerCase())} for these ${taskCount(cAll)} tasks at once` : `Shop ${esc(CAT_INFO[c].label.toLowerCase())}`}"><b>${esc(CAT_INFO[c].label)}</b><i>${cnt(taskCount(cAll), 'task')}</i></button><span class="nv-gamt num">${amt(cAll.reduce((a, n) => a + needTotal(n), 0))}</span>${car('c:' + c, co)}</div>
          ${co ? firstPerTask(cn).map(n => task(n, true, c)).join('') : ''}</div>`;
      });
      body += `<section class="nv-grp${o ? '' : ' shut'}">${head('d:' + d, o, esc(d), taskCount(all), all.reduce((a, n) => a + needTotal(n), 0), `data-act="nv-tog" data-k="d:${esc(d)}" data-o="${o ? 1 : 0}"`)}${inner}</section>`;
    });
    sum = ['All materials', 'Materials cost', NEEDS.reduce((a, n) => a + needTotal(n), 0)];
  }
  const allOn = S.sel.kind === 'room' && S.sel.room === 'all';
  const band = `<button type="button" class="nv-all${allOn ? ' on' : ''}" data-act="sel-room" data-room="all"><span class="nv-all-n"><b>${sum[0]}</b><i>${cnt(taskCount(NEEDS), 'task')}</i></span><span class="nv-all-r"><i>${sum[1]}</i><b class="num">${money(sum[2])}</b></span></button>`;
  if(!body) body = `<div class="nv-none">Nothing here. ${q ? '<button class="link" data-act="nv-clear">Clear the search</button>' : '<button class="link" data-act="filter" data-v="all">Show everything</button>'}</div>`;
  const vb = (v, t) => `<button type="button" class="${pv === v ? 'on' : ''}" data-act="pv" data-v="${v}" aria-pressed="${pv === v}">${t}</button>`;
  el.innerHTML = `<div class="list-hd nv-bar">
      <div class="seg pv-seg" role="group" aria-label="Show the scope as">${vb('all', 'All')}${vb('labor', 'Labor')}${vb('materials', 'Materials')}</div>
      ${filterBtn}
      <button type="button" class="nv-ib${S.pvFind ? ' on' : ''}" data-act="nv-find" aria-label="Search tasks" title="Search">${IC.search}</button>
    </div>
    ${S.pvFind ? `<div class="nv-find">${IC.search}<input id="nvQ" type="text" value="${esc(S.pvQ || '')}" placeholder="Search tasks or rooms" autocomplete="off"></div>` : ''}
    <div class="list-body">${band}${body}</div>`;
  el.querySelector('.list-body').scrollTop = keep;
}
/* Departments for Materials (the store's aisles), the crew for Labor, and each
   task's work status. The job is in progress: most haven't started. */
const DEPT = {appliance: 'Appliances', vanity: 'Bathroom', toilet: 'Bathroom', detector: 'Electrical', floor: 'Flooring', tile: 'Flooring', shower: 'Flooring',
  hardware: 'Hardware', exhaust: 'Heating & Cooling', cabinet: 'Kitchen', counter: 'Kitchen', lighting: 'Lighting & Ceiling Fans', ceilingfan: 'Lighting & Ceiling Fans',
  door: 'Doors & Windows', blinds: 'Window Treatments', paint: 'Paint', storage: 'Storage & Organization'};
const crew = n => installerOf(n);   // the same installers as Review & order
const TASK_ST = {k7: 'In progress', l1: 'In progress'};
const TASK_TAG = {k8: 'Deferred'};
const FLAG = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 1.5v9" stroke="currentColor" stroke-width="1.3"/><path d="M3 2h6.5L8 4.5 9.5 7H3z" fill="currentColor"/></svg>';

/* ═════════════ SHOP: the workspace ═════════════ */
function crumbsHtml(needs){
  const n0 = needs[0];
  return `<div class="crumbs"><button data-act="sel-room" data-room="all" title="Every item, room by room">All</button><span>›</span>${S.sel.kind === 'need'
    ? `<button data-act="sel-room" data-room="${n0.room}" title="See every ${esc(ROOM[n0.room].name)} shelf together">${esc(ROOM[n0.room].name)}</button><span>›</span><span class="cur">${esc(n0.task)}</span>`
    : `<span>By product</span><span>›</span><span class="cur">${esc(CAT_INFO[n0.cat].label)}</span>`}</div>`;
}
/* Shop's titles say what you're shopping for: a room, a product type, or one
   option's product ("Replace : Quartz" → Quartz). Paint options name a surface,
   not a product, so paint reads "Interior paint". */
const shopFor = s => `<span class="h2-for">Shopping for</span> ${s}`;
const shopObj = n => n.cat === 'paint' || !n.opt ? CAT_INFO[n.cat].label : optShort(n);
function headHtml(needs){
  const n0 = needs[0], cat = n0.cat, single = S.sel.kind === 'need';
  let sub;
  if(single){
    const r = ROOM[n0.room], p = n0.pick && CATALOG[n0.pick];
    const tot = p ? buy(p, n0.qty, offerOf(n0, p)).total : 0;
    sub = `<span>Task: ${esc(r.name)} › ${esc(taskLabel(n0))}</span>${n0.allow ? `<span class="sep">|</span><span>Allowance ${needAmtHtml(n0, `${money0(taskCost(n0))} / ${money0(n0.allow)}`)}</span>${isOver(n0) ? ` <span class="tag warn">Needs review</span>` : ''}` : '<span class="sep">|</span><span class="na">Allowance N/A</span>'}`;
  } else {
    const q = needs.reduce((a, n) => a + n.qty, 0);
    sub = `<b>${qtyText(cat, q)}</b><span class="sep">|</span><span>${(rs => `${needs.length} ${needs.length === 1 ? 'task' : 'tasks'} in ${rs.map(esc).join(', ')}`)([...new Set(needs.map(n => ROOM[n.room].name))])}</span>`;
  }
  return `${crumbsHtml(needs)}<div class="shelf-hd"><div><h2>${shopFor(esc(single ? shopObj(n0) : CAT_INFO[cat].label))}</h2><div class="shelf-sub">${sub}</div>${single && multiOpt(n0) ? `<div class="sh-opts"><span class="k">${esc(n0.task)} · ${optsOf(n0).length} options</span>${optsOf(n0).map(o => `<button type="button" class="sh-opt${o.id === n0.id ? ' on' : ''}" data-act="sel-need" data-id="${o.id}" aria-pressed="${o.id === n0.id}">${esc(o.opt)}</button>`).join('')}</div>` : ''}</div>
</div>`;
}
/* Banners: a short headline and one line of facts, never a paragraph. */
function bannerHtml(cls, icon, title, facts, act){
  return `<div class="banner ${cls}"><span class="bn-ic">${icon}</span><span class="bn-tx"><b>${title}</b>${facts ? `<span class="bn-f">${facts}</span>` : ''}</span>${act ? `<span class="acts">${act}</span>` : ''}</div>`;
}
function bannersHtml(needs){
  const out = [], n0 = needs[0];
  const names = ms => ms.map(m => esc(whereTask(m))).join(', ').replace(/, ([^,]*)$/, ' and $1');
  const short = sku => esc(CATALOG[sku].name.split(/,|\(/)[0]);
  if(S.sel.kind === 'need'){
    if(n0.swap) out.push(bannerHtml('info', IC.swap, 'Swapped at pickup',
      `${short(n0.swap.from)} was out → ${esc(n0.swap.how)} · by ${TEAM.JR.name} · ${n0.swap.co ? 'approved, in the next change order' : n0.swap.pre ? 'pre-approved substitution' : 'no change order'}`));
    /* The same product type in other rooms. A task's own other options are a separate
       choice (trim paint isn't meant to match the walls), so they're left out, and a
       task's second option isn't compared with other rooms at all. */
    const others = NEEDS.filter(m => m.cat === n0.cat && tkOf(m) !== tkOf(n0));
    if(others.length && !n0.of && ['floor', 'paint', 'ceilingfan', 'toilet', 'exhaust', 'blinds', 'vanity'].includes(n0.cat) && !S.ack.has('rep' + n0.cat)){
      const diff = others.filter(m => m.pick && n0.pick && m.pick !== n0.pick);
      const maj = diff.length ? majorityPick(others) : null;
      const dPicks = [...new Set(diff.map(m => m.pick))];
      const facts = `${names(others)}${!diff.length ? ' · same product' : diff.length === others.length ? ` · they use ${short(maj)}` : ` · ${names(diff)} ${diff.length === 1 ? 'uses' : 'use'} ${dPicks.length === 1 ? short(dPicks[0]) : 'other products'}`}`;
      out.push(bannerHtml(diff.length ? 'warn' : 'info', IC.swap, `${others.length} other ${others.length === 1 ? 'task needs' : 'tasks need'} ${esc(CAT_INFO[n0.cat].label.toLowerCase())}`, facts,
        `<button class="btn" data-act="sel-type" data-cat="${n0.cat}">Shop all ${others.length + 1} together</button>`));
    }
    if(isOver(n0)) out.push(bannerHtml('warn', '!', `Needs review · ${money0(overBy(n0))} over allowance`,
      `Task ${money0(taskCost(n0))} (materials ${money0(needTotal(n0))}${LABOR[n0.id] ? ` + labor ${money0(LABOR[n0.id])}` : ''}) · allowance ${money0(n0.allow)} · a manager can change it in Scope`));
  } else {
    const picks = [...new Set(needs.filter(n => n.pick).map(n => n.pick))];
    if(picks.length > 1){
      const maj = majorityPick(needs), odd = needs.filter(n => n.pick && n.pick !== maj);
      out.push(bannerHtml('warn', '!', `${picks.length} different products across ${needs.length} tasks`,
        [...new Set(odd.map(n => n.pick))].map(p => { const ms = odd.filter(n => n.pick === p); return `${names(ms)} ${ms.length === 1 ? 'uses' : 'use'} ${short(p)}`; }).join(' · '),
        `<button class="btn" data-act="match-all" data-sku="${maj}">Use ${short(maj)} for all ${needs.length}</button>`));
    }
  }
  return out.join('');
}
/* The task's context, in the same strip a room opens with: its site photos
   (‹ › through them), the mood board, then what the task is, its measurement
   (opens the floor plan beside the shelf), and the latest note, where the room shows its
   picks. A product across rooms shows every room's photos and where it goes. */
/* Measurements are the room's real sizes and what the task covers; the quantity to buy
   (with its coats or waste) is its own thing the shopper can change. */
function measOf(n){
  let s = (n.src || '').replace(/^Floor plan:\s*/, '');
  let calc = '';
  const m = s.match(/,\s*(\d+ coats?.*|\+\d+% waste.*)$/);
  if(m){ calc = m[1].replace(/^\+/, 'Plus '); s = s.slice(0, m.index); }
  return {meas: s.trim(), calc: calc ? calc.charAt(0).toUpperCase() + calc.slice(1) : ''};
}
const roomDims = (rid, short) => { const r = ROOM[rid]; if(!r) return ''; const a = r.w * r.h;
  return short ? `${r.w}′ × ${r.h}′` : `${esc(r.name)} · ${r.w}′ × ${r.h}′ · ${a.toLocaleString()} SF floor`; };
const cqStep = cat => CAT_INFO[cat].unit === 'SF' ? 10 : 1;
function cqSet(n, v){ if(!n) return; v = Math.max(0, Math.round(+v || 0)); if(v === n.qty) return; n.qty = v; render(); }
function ctxHtml(needs){
  const n0 = needs[0], single = S.sel.kind === 'need';
  const rooms = [...new Set(needs.map(n => n.room))];
  const notes = notesFor(needs), last = notes[notes.length - 1];
  const q = needs.reduce((a, n) => a + n.planQty, 0);
  // Shop MVP: Media sits beside the shelf, so a task's or a product's strip is just the facts.
  const facts = true, ph = '';
  return `<div class="look ctx-look${ph ? ' has-ph' : ''}${facts ? ' look-only' : ''}">${ph}${facts ? '' : lookMoodHtml()}
    <div class="ctx-facts">
      <div class="cf"><span class="k">${single ? 'The task' : 'Where it goes'}<em>${single ? esc(installerOf(n0)) : ''}</em></span>
        ${single ? `<p>${esc(n0.desc)}</p>` : `<p>${needs.map(n => `${esc(whereTask(n))} — ${qtyText(n.cat, n.qty)}`).join('<br>')}</p>`}</div>
      <button type="button" class="cf" data-act="ref-add" data-tab="plan" title="Open the floor plan beside the shelf"><span class="k">Measurements${curPanes().includes('floorplan') ? '' : '<em class="cf-go">Open floorplan</em>'}</span>
        ${single ? `${measOf(n0).meas ? `<b class="cm-m">${esc(measOf(n0).meas)}</b>` : ''}<span class="cm-r">${roomDims(n0.room)}</span>`
          : `<span class="cm-r">${rooms.map(r => `${esc(ROOM[r].name)} ${roomDims(r, true)}`).join('<br>')}</span>`}</button>
      <div class="cf cq"><span class="k">Quantity${single && n0.qty !== n0.planQty ? `<em><button type="button" class="cq-reset" data-act="cq-reset" data-id="${n0.id}">Reset to ${qtyText(n0.cat, n0.planQty)}</button></em>` : ''}</span>
        ${single ? `<span class="cq-step"><button type="button" data-act="cq" data-id="${n0.id}" data-d="-1" aria-label="Less">−</button><input class="cq-in" type="number" min="0" step="${cqStep(n0.cat)}" value="${n0.qty}" data-id="${n0.id}" aria-label="Quantity"><span class="cq-u">${unitWord(n0.cat, n0.qty)}</span><button type="button" data-act="cq" data-id="${n0.id}" data-d="1" aria-label="More">+</button></span>
          <span class="cm-r">${measOf(n0).calc ? esc(measOf(n0).calc) : 'Change it if you need more or less'}</span>`
          : `<span class="ctx-qty">${q.toLocaleString()}<small>${unitWord(n0.cat, q)}</small></span><span class="cm-r">Across ${needs.length} ${needs.length === 1 ? 'task' : 'tasks'}</span>`}</div>
      <button type="button" class="cf" data-act="ref-add" data-tab="notes" title="Open the notes"><span class="k">Notes<em>${notes.length}</em></span>
        ${last ? `<span class="ctx-note"><span class="av sm" style="background:${TEAM[last.who].tone}">${last.who}</span><p>${esc(last.text)}</p></span>` : '<p class="cf-none">No notes yet. Add one for the team.</p>'}</button>
    </div>
  </div>`;
}
/* The shelf's pick band is gone: on the shelf your pick is the first card,
   with its amount; what happens if it's out lives in the product detail.
   A product across rooms keeps its one-choice table. */
function pickHtml(needs){
  if(S.sel.kind === 'need') return '';
  // product type across rooms: one choice, a row per room
  const maj = majorityPick(needs);
  const rows = needs.map(n => {
    const p = n.pick && CATALOG[n.pick], inc = !exclSet(n.cat).has(n.id);
    const tot = p ? buy(p, n.qty, offerOf(n, p)).total : 0;
    return `<div class="split-row"><input type="checkbox" ${inc ? 'checked' : ''} data-act="incl" data-id="${n.id}" aria-label="Include ${esc(whereTask(n))}">
      <b>${esc(whereTask(n))}</b>${p ? stepperHtml(n, 'mini line') : `<span>${qtyText(n.cat, n.qty)}${n.fit ? ` · ${n.fit}″` : ''}</span>`}
      <span class="pr${p && maj && p.sku !== maj ? ' diff' : ''}">${p ? `<img src="${ART.product(p)}" alt=""><span>${esc(p.name)}</span>` : '<span style="color:var(--warn)">Choose a product</span>'}</span>
      <span class="a num">${p ? money(tot) : '—'}</span></div>`;
  }).join('');
  const k = inclNeeds().length;
  return `<div class="split"><div class="split-hd"><b>Choose once for every checked task</b><span>${k} of ${needs.length} tasks checked · uncheck a task to give it its own product</span></div>${rows}</div>`;
}
/* ═════════════ SHOP: the room view ═════════════
   Every shelf in a room, stacked: the room's look at the top, then one row per
   item with your pick, what happens if it's out, and the next best options. "See all" opens
   the full shelf. "All" stacks the whole list, like a long scroll. */
// Every other product that fits a room row, best matches first: its carousel, and the modal's pager.
function roomAlts(n){
  return BY_CAT[n.cat].filter(c => c.sku !== n.pick && !(n.more || []).some(x => x.pick === c.sku) && fitsNeed(c, n) && sold(c))
    .sort((a, b) => ((b.mood ? 1 : 0) - (a.mood ? 1 : 0)) || (score(b, [n]) - score(a, [n])));
}
function needTotal(n){ const p = n.pick && CATALOG[n.pick]; return (p ? buy(p, n.qty, offerOf(n, p)).total : 0) + (n.more || []).reduce((a, x) => a + needTotal(x), 0); }
/* The room's own site photos, one at a time, in the slot left of the mood
   board: what's there now beside the look it's going to. ‹ › step through them
   (round and round); the photo opens in Media. Remembered per room. */
const LOOK_PH = {};   // room id (or ids joined with '+') → photo shown
const phList = key => key.split('+').flatMap(r => (PHOTOS[r] || []).map((p, i) => ({r, i, p})));
function lookPhHtml(key){
  const L = phList(key); if(!L.length) return '';
  const i = ((LOOK_PH[key] || 0) % L.length + L.length) % L.length, x = L[i], many = L.length > 1, multi = key.includes('+');
  return `<div class="look-ph" data-room="${key}">
    <button type="button" class="look-ph-im" data-act="ref-photo" data-k="${x.r}:${x.i}" title="Open this photo in Media"><img src="${ART.photo(ROOM[x.r].scene, x.i)}" alt="${esc(x.p[0])}"></button>
    ${many ? `<span class="look-ph-n">${i + 1} / ${L.length}</span>
    <button type="button" class="look-ph-b prev" data-act="look-ph" data-room="${key}" data-d="-1" aria-label="Previous photo">‹</button>
    <button type="button" class="look-ph-b next" data-act="look-ph" data-room="${key}" data-d="1" aria-label="Next photo">›</button>` : ''}
    <span class="look-ph-cap"><b>${esc(x.p[0])}</b><span>${multi ? esc(ROOM[x.r].name) : 'Site photo'} · ${esc(x.p[1])}</span></span>
  </div>`;
}
const lookMoodHtml = () => `<button type="button" class="look-mood" data-act="ref-photo" data-k="mood" title="Open the mood board in Media"><img src="${ART.mood()}" alt="Mood board"><span class="tag">Mood board</span></button>`;
function lookHtml(ns){
  // Shop MVP: Media sits beside the shelf, so the room's strip is just its picks.
  return `<div class="look look-only">
    <div class="look-items"><span class="k">All selected products</span><div class="look-row">${ns.flatMap(n => n.pick ? withMore(n) : [n]).map(n => {
      const p = n.pick && CATALOG[n.pick];
      return `<button type="button" class="lk${p ? '' : ' empty'}" data-act="room-jump" data-id="${n.xof || n.id}" title="${esc(taskLabel(n))}${p ? ' — ' + esc(p.name) : ''}">
        <span class="im">${p ? `<img src="${ART.product(p)}" alt="">` : '+'}</span><span class="c">${esc(CAT_INFO[n.cat].label)}</span>
        <span class="nm">${p ? esc(p.name.split(/,|\(/)[0]) : 'Needs product'}</span></button>`;
    }).join('')}</div></div></div>`;
}
/* What the products are for. The option leads, since it names the thing to buy
   ("Replace : Shaker cabinets") and usually repeats the task's name anyway. The
   task sits above it as a label, with its contractor and description under it.
   A task with several options shows the task once, then each option. */
const taskKickHtml = (n, amt, extra) => `<div class="nb-kick"><span class="nb-tk">${esc(n.task)}${extra || ''}</span>${amt || ''}</div>`;
// The task's cost against its allowance, which sits on the task's first option.
function taskAmtHtml(os){
  const t = os.find(n => !n.of) || os[0];
  if(!t.allow) return '<span class="nb-amt na">Allowance N/A</span>';
  if(os.length === 1) return `<span class="nb-amt">Task ${needAmtHtml(t, `${money0(taskCost(t))} / ${money0(t.allow)}`)}</span>`;
  const mat = os.reduce((a, n) => a + needTotal(n), 0), lab = LABOR[t.id] || 0;
  return `<span class="nb-amt">Task <span class="alw has-tip${mat + lab - t.allow > .5 ? ' is-over' : ''}" tabindex="0" role="link" data-act="cost-book">${money0(mat + lab)} / ${money0(t.allow)}${tipHtml(allowRows(mat, lab, t.allow, 'Task allowance'))}</span></span>`;
}
function taskBlocks(ns){
  return firstPerTask(ns).map(t => {
    if(!multiOpt(t)) return needBlock(t);
    const os = optsOf(t), shown = ns.filter(n => tkOf(n) === tkOf(t));
    return `<div class="nb-grp" data-task="${tkOf(t)}"><header class="nb-ghd">${taskKickHtml(t, taskAmtHtml(os), `<em>${os.length} options</em>`)}${taskFactsHtml(t)}</header>
      ${shown.map(n => needBlock(n, true)).join('')}</div>`;
  }).join('');
}
const taskFactsHtml = n => `<dl class="nb-task">
  <dt class="k">Contractor</dt><dd>${esc(installerOf(n))}</dd>
  ${n.desc ? `<dt class="k">Description</dt><dd>${esc(n.desc)}</dd>` : ''}</dl>`;
/* Room view, the products beside a pick: one Quick add button, which names the amount Kai worked out
   when you hover it. The product's modal (click its photo or name) is the full add. ALT_Q holds a draft amount. */
const ALT_Q = {};
let NB_EDIT = null;
/* Quick add picks what makes sense: the store the task's first product comes from, when it sells this
   one too (else the job's first store that does), and the same pickup or delivery as that product. */
function prefOffer(p, n){ const h = n && n.pick && CATALOG[n.pick], hs = h && offerOf(n, h).sup; return (hs && p.offers.find(o => o.sup === hs && supOk(o.sup))) || firstOffer(p); }
const howOf = (sup, sku, n) => (S.lineFul[`${sup}|${sku}`] || S.ordFul[`${sup}|${buyerOf(n)}`] || S.ful[sup]) === 'pickup' ? 'pickup' : 'delivery';   // the pick card row whose choices are open: {id, k: 'sup' | 'how'}
const altLnHtml = (b, d, has) => `<b class="num">${money(b.total)}</b>${has && Math.abs(d) >= 1 ? ` <span>${d > 0 ? `${money0(d)} more` : `${money0(-d)} less`}</span>` : ''}`;
// After Add, the pick card it landed in lights up (and comes into view), so the add reads as done.
function flashPick(id){
  const el = document.querySelector(`.nb-pick[data-pk="${id}"]`); if(!el) return;
  el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
  const r = el.getBoundingClientRect(); if(r.top < 90 || r.bottom > innerHeight) el.scrollIntoView({block: 'nearest', behavior: 'smooth'});
}
function needBlock(n, inTask){
  const p = n.pick && CATALOG[n.pick], all = BY_CAT[n.cat].filter(sold).length, pt = needTotal(n);
  // Every other product that fits, best matches first, in a carousel: no leaving the room.
  const alts = roomAlts(n);
  const st = !p ? '<span class="tag warn">Needs product</span>'
    : n.swap ? '<span class="tag ok">Swapped at pickup</span>' : isOver(n) ? '<span class="tag warn">Needs review</span>' : '';
  /* The task's cost against its allowance takes the header's right end, where
     a "Chosen" tag used to sit: a pick is already plain from the card below. */
  const amt = n.allow ? `<span class="nb-amt">Task ${needAmtHtml(n, `${money0(taskCost(n))} / ${money0(n.allow)}`)}</span>` : '<span class="nb-amt na">Allowance N/A</span>';
  const notes = [];
  if(n.swap) notes.push(`<div class="nb-note ok">${IC.swap}<span><b>Swapped at pickup</b> · ${esc(CATALOG[n.swap.from].name.split(/,|\(/)[0])} was out → ${esc(n.swap.how)} · ${n.swap.co ? 'in the next change order' : n.swap.pre ? 'pre-approved substitution' : 'no change order'}</span></div>`);
  if(isOver(n)) notes.push(`<div class="nb-note warn"><span>!</span><span><b>Needs review</b> · ${money0(overBy(n))} over the ${money0(n.allow)} allowance</span></div>`);
  // One card per product on the task: the first, then any added beside it.
  const pickOf = x => {
    const p = CATALOG[x.pick];
    const o = offerOf(x, p), b = buy(p, x.qty, o), av = avail(p, x.qty, o), bks = x.backups.map(sk => CATALOG[sk]);
    // Once it's added: which store, pickup or delivery, and what happens if it's out, each changeable here.
    const offs = p.offers.filter(x => supOk(x.sup)), lk = `${o.sup}|${p.sku}`, base = S.ordFul[`${o.sup}|${buyerOf(x)}`] || S.ful[o.sup];
    const how = (S.lineFul[lk] || base) === 'pickup' ? 'pickup' : 'delivery', sp = SUPPLIERS[o.sup];
    // Plain text of what's chosen; clicking it opens the choices in place, and choosing closes them.
    const ed = k => NB_EDIT && NB_EDIT.id === x.id && NB_EDIT.k === k;
    const val = (k, t) => `<button type="button" class="nb-val" data-act="nb-edit" data-id="${x.id}" data-k="${k}" title="Change">${t}</button>`;
    const supTxt = `${esc(sp.name)} <i>${money(o.price)} / ${perUnit(p)}</i>`, howTxt = how === 'pickup' ? `Pickup <i>${esc(sp.store)}</i>` : `Delivery <i>to ${esc(shortAddr(S.src.addr))}</i>`;
    const supRow = offs.length < 2 ? `<span class="nb-val">${supTxt}</span>` : !ed('sup') ? val('sup', supTxt) : `<div class="seg nb-seg" role="group" aria-label="Buy from">${offs.map(of => `<button type="button" class="${of.sup === o.sup ? 'on' : ''}" data-act="nb-sup" data-id="${x.id}" data-sup="${of.sup}" aria-pressed="${of.sup === o.sup}">${esc(SUPPLIERS[of.sup].name)}<i>${money(of.price)}</i></button>`).join('')}</div>`;
    const howRow = S.src.mode === 'both' && !ed('how') ? val('how', howTxt) : S.src.mode === 'both' ? `<div class="seg nb-seg" role="group" aria-label="Pickup or delivery"><button type="button" class="${how === 'pickup' ? 'on' : ''}" data-act="nb-ful" data-id="${x.id}" data-v="pickup" aria-pressed="${how === 'pickup'}">Pickup</button><button type="button" class="${how === 'delivery' ? 'on' : ''}" data-act="nb-ful" data-id="${x.id}" data-v="delivery" aria-pressed="${how === 'delivery'}">Delivery</button></div><small>${how === 'pickup' ? esc(sp.store) : `to ${esc(shortAddr(S.src.addr))}`}</small>`
      : `<span>${S.src.mode === 'pickup' ? `Pickup · ${esc(sp.store)}` : `Delivery to ${esc(shortAddr(S.src.addr))}`}</span>`;
    return `<div class="nb-pick${x.xof ? ' more' : ''}" data-pk="${x.id}" draggable="true" data-drag="${p.sku}"><div class="im" data-act="detail" data-sku="${p.sku}" data-id="${x.xof || x.id}"><img src="${ART.product(p)}" alt="${esc(p.name)}">${isTpl(p.sku, [x]) ? '<span class="tag acc">Template pick</span>' : ''}</div>
      <div class="tx"><span class="brand">${esc(p.brand)} · ${esc(SUPPLIERS[o.sup].name)}</span>
        <b class="nm" data-act="detail" data-sku="${p.sku}" data-id="${x.xof || x.id}">${esc(p.name)}</b>
        <span class="ln"><b class="num">${money(b.total)}</b> · ${b.label} at ${money(o.price)} / ${perUnit(p)}</span>
        <span class="avail"><span class="dot ${av.cls}"></span><span>${av.short}</span></span>
        <div class="nb-pick-acts">${stepperHtml(x, 'mini')}<button type="button" class="nb-rm" data-act="remove" data-sku="${p.sku}" data-ids="${x.id}" title="Take ${esc(p.name.split(/,|\(/)[0].trim())} off the list">${TRASH}<span>Remove</span></button></div>
        <dl class="nb-opts"><div><dt>Buy from</dt><dd>${supRow}</dd></div><div><dt>Get it</dt><dd>${howRow}</dd></div><div><dt>If it's out</dt><dd><button type="button" class="nb-val" data-act="sub-open" data-ids="${x.id}" title="Change">${subLabel([x]).html}</button></dd></div></dl></div></div>`;
  };
  const pick = p ? `<div class="nb-picks">${withMore(n).filter(x => x.pick).map(pickOf).join('')}</div>` : '';
  const alt = c => {
    const o = prefOffer(c, n), kD = ALT_Q[n.id + '|' + c.sku], b = kD ? buy(c, qtyForCount(c, kD), o) : buy(c, n.qty, o), av = avail(c, n.qty, o), bk = n.backups.includes(c.sku);
    const tag = isTpl(c.sku, [n]) ? '<span class="tag acc">Template pick</span>' : c.std ? '<span class="tag ink">Team standard</span>' : !c.mood ? '<span class="tag warn">Lower match</span>' : '<span class="tag ok">High match</span>';
    const d = b.total - (p ? buy(p, n.qty, offerOf(n, p)).total : 0);   // against the first product, not the task's sum
    return `<article class="nb-alt" draggable="true" data-drag="${c.sku}"><div class="im" data-act="detail" data-sku="${c.sku}" data-id="${n.id}"><img src="${ART.product(c)}" alt="" loading="lazy">${tag}</div>
      <span class="nm" data-act="detail" data-sku="${c.sku}" data-id="${n.id}" title="${esc(c.name)}">${esc(c.name)}</span>
      <span class="ln">${altLnHtml(b, d, !!p)}</span>
      <span class="avail"><span class="dot ${av.cls}"></span><span>${av.short}</span></span>
      <span class="acts"><button type="button" class="btn ${p ? 'ghost' : 'pri'} sm qa" data-act="choose" data-sku="${c.sku}" data-id="${n.id}"${kD ? ` data-k="${kD}"` : ''}${p ? ' data-rep="1"' : ''} title="${p ? `Use it instead of ${esc(p.name)}` : 'Add to the list'} · ${b.label}. Click the product for every option."><span class="qa-d">${p ? 'Replace' : 'Quick add'}</span><span class="qa-h">${p ? 'Replace' : 'Quick add'} – ${b.label}</span></button>${p ? `<button type="button" class="btn ghost sm qa-add" data-act="detail" data-sku="${c.sku}" data-id="${n.id}" title="Add it to this task, beside ${esc(p.name)}. Opens the product.">Add</button>` : ''}</span></article>`;
  };
  return `<section class="nb" data-need="${n.id}">
    <header class="nb-hd${inTask ? ' nb-hd-o' : ''}">${inTask ? '' : taskKickHtml(n)}<h3><button type="button" data-act="sel-need" data-id="${n.id}">${esc(n.opt || n.task)}</button></h3><span class="sub">${qtyText(n.cat, n.qty)}${n.fit ? ` · ${n.fit}″ opening` : ''}</span>${st || !inTask ? `<span class="nb-hd-r">${st}${inTask ? '' : amt}</span>` : ''}
      ${inTask ? '' : taskFactsHtml(n)}</header>
    ${notes.length ? `<div class="nb-notes">${notes.join('')}</div>` : ''}
    <div class="nb-bd${p ? '' : ' none'}${withMore(n).filter(x => x.pick).length > 1 ? ` np${Math.min(3, withMore(n).filter(x => x.pick).length)}` : ''}">${pick}
      <div class="rcar" data-car="${n.id}"><div class="rcar-track" role="list">${alts.map(alt).join('')}</div>
        <div class="rcar-ft"><button type="button" class="link" data-act="sel-need" data-id="${n.id}">View all ${all} →</button>
          <span class="rcar-n" aria-live="polite"></span>
          <button type="button" class="rcar-b" data-act="car" data-d="-1" aria-label="Previous products">‹</button><button type="button" class="rcar-b" data-act="car" data-d="1" aria-label="Next products">›</button></div></div></div>
  </section>`;
}
function roomHtml(){
  const rid = S.sel.room, isAll = rid === 'all', rooms = isAll ? ROOMS : [ROOM[rid]];
  const scope = NEEDS.filter(n => isAll || n.room === rid), shown = scope.filter(listFilter);
  const chosen = scope.filter(n => n.pick).length, total = scope.reduce((a, n) => a + needTotal(n), 0);
  const fl = {todo: 'Needs product', changed: 'Needs review'}[S.filter];
  const sub = `<b>${scope.length} items</b><span class="sep">|</span><span>${chosen} chosen</span>${isAll ? `<span class="sep">|</span><span>${rooms.length} rooms</span>` : ''}<span class="sep">|</span><span>${money(total)}</span>`;
  const head = `${isAll ? '' : `<div class="crumbs"><button data-act="sel-room" data-room="all" title="Every item, room by room">All</button><span>›</span><span class="cur">${esc(ROOM[rid].name)}</span></div>`}
    <div class="shelf-hd${isAll ? ' no-crumbs' : ''}"><div><h2>${shopFor(isAll ? 'every room' : esc(ROOM[rid].name))}</h2><div class="shelf-sub">${sub}</div></div></div>
    ${fl ? bannerHtml('info', IC.search, `Showing ${fl} only`, `${shown.length} of ${scope.length} items`, '<button class="btn" data-act="filter" data-v="all">Show everything</button>') : ''}`;
  const roomSec = r => {
    const all = NEEDS.filter(n => n.room === r.id), ns = all.filter(listFilter);
    if(!ns.length) return isAll ? '' : `<div class="nb-empty">Nothing in ${esc(r.name)} matches “${fl}”. <button class="link" data-act="filter" data-v="all">Show everything</button></div>`;
    return `<div class="rm" data-room="${r.id}">${isAll ? `<div class="rm-hd"><h3>${esc(r.name)}</h3><span>${all.filter(n => n.pick).length} of ${all.length} chosen · ${money(all.reduce((a, n) => a + needTotal(n), 0))}</span><button type="button" class="link" data-act="sel-room" data-room="${r.id}">Just this room</button></div>` : ''}
      ${lookHtml(all)}${taskBlocks(ns)}</div>`;
  };
  let foot = '';
  if(!isAll){
    const i = ROOMS.findIndex(r => r.id === rid), nx = ROOMS[i + 1];
    foot = `<div class="rm-foot">${nx ? `<button type="button" class="btn" data-act="sel-room" data-room="${nx.id}">Next room: ${esc(nx.name)} →</button>` : `<button type="button" class="btn pri" data-act="screen" data-v="review">Review &amp; order →</button>`}<button type="button" class="link" data-act="sel-room" data-room="all">All</button></div>`;
  }
  return `${head}<div class="roomv">${rooms.map(roomSec).join('')}${foot}</div>`;
}
function shelfProducts(needs){
  const cat = needs[0].cat, q = needs.reduce((a, n) => a + n.qty, 0);
  let ps = BY_CAT[cat].filter(sold);
  if(S.q){ const t = S.q.toLowerCase(); ps = ps.filter(p => (p.brand + ' ' + p.name).toLowerCase().includes(t)); }
  if(S.chips.has('mood')) ps = ps.filter(p => p.mood);
  if(S.chips.has('stock')) ps = ps.filter(p => p.offers.some(o => o.stock >= buy(p, q, o).n));
  if(S.chips.has('std')) ps = ps.filter(p => p.std);
  if(S.chips.has('up')) ps = ps.filter(p => p.up);
  const sc = new Map(ps.map(p => [p.sku, score(p, needs)]));
  if(S.sort === 'rec') ps.sort((a, b) => sc.get(b.sku) - sc.get(a.sku));
  if(S.sort === 'used') ps.sort((a, b) => b.used - a.used);
  if(S.sort === 'plh') ps.sort((a, b) => a.price - b.price);
  if(S.sort === 'phl') ps.sort((a, b) => b.price - a.price);
  return ps;
}
function cardHtml(p, needs, i){
  const q = needs.reduce((a, n) => a + n.qty, 0), single = S.sel.kind === 'need', n0 = needs[0];
  const tgt = single ? needs : inclNeeds();
  const fitT = tgt.filter(n => fitsNeed(p, n));          // a 30″ vanity is only ever for the 30″ room
  const isPick = fitT.length > 0 && fitT.every(n => n.pick === p.sku);
  const bkI = single ? n0.backups.indexOf(p.sku) : (fitT.length && fitT.every(n => n.backups.includes(p.sku)) ? fitT[0].backups.indexOf(p.sku) : -1);
  const o = isPick ? offerOf(single ? n0 : fitT[0], p) : firstOffer(p), b = buy(p, q, o), av = avail(p, q, o);   // your pick shows the store you buy it from
  const fitBad = needs.length === 1 && !fitsNeed(p, n0), fitGood = p.size && needs.some(n => n.fit === p.size);
  const tpl = isTpl(p.sku, tgt);
  const badges = [tpl ? '<span class="tag acc">Template pick</span>' : '', bkI >= 0 ? `<span class="tag ink">Substitute ${bkI + 1}</span>` : '',
    p.std && !tpl ? '<span class="tag ink">Team standard</span>' : '', i === 0 && S.sort === 'rec' && !isPick && !S.chips.size && !S.q ? '<span class="tag acc">Best match</span>' : '',
  ].join('');
  const hi = p.mood && (single ? fitsNeed(p, n0) : needs.some(n => fitsNeed(p, n)));   // same rule as the High match group
  const fit = [hi ? '<span class="tag ok">High match</span>' : '<span class="tag warn">Lower match</span>', fitGood && !fitBad ? `<span class="tag ok">Fits ${single ? n0.fit : p.size}″ opening</span>` : '',
    fitBad ? `<span class="tag err">${p.size}″ — opening is ${n0.fit}″</span>` : ''].join('');
  const k = tgt.filter(n => fitsNeed(p, n)).length;
  const addLabel = single ? 'Add' : k > 1 ? `Add to ${k} tasks` : k === 1 ? 'Add to 1 task' : 'Doesn’t fit';
  const cta = !isPick ? `<button type="button" class="btn pri" data-act="choose" data-sku="${p.sku}" ${k ? '' : 'disabled'}>${addLabel}</button>`
    : single ? stepperHtml(n0)
    : `<div class="stp in"><span class="stp-n"><b>✓ In ${fitT.length} ${fitT.length === 1 ? 'task' : 'tasks'}</b><small>set amounts above</small></span><button type="button" data-act="remove" data-sku="${p.sku}" data-ids="${fitT.map(n => n.id).join(',')}" aria-label="Remove from these tasks" title="Remove from these tasks">${TRASH}</button></div>`;
  return `<article class="card${isPick ? ' is-pick' : ''}${bkI >= 0 ? ' is-backup' : ''}${!av.ok ? ' is-out' : ''}" draggable="true" data-drag="${p.sku}">
    <div class="img" data-act="detail" data-sku="${p.sku}"><img src="${ART.product(p)}" alt="${esc(p.name)}" loading="lazy"><span class="badges">${badges}</span></div>
    <div class="bd">
      <span class="brand">${esc(p.brand)} · ${esc(SUPPLIERS[o.sup].name)}</span>
      <span class="nm" data-act="detail" data-sku="${p.sku}">${esc(p.name)}</span>
      <span class="price"><b class="num">${money(o.price)}</b><span>/ ${perUnit(p)}</span></span>
      <span class="forjob">Buy <strong>${b.label}</strong>${b.sub ? ` (${b.sub})` : ''} · <strong class="num">${money(b.total)}</strong>${single ? '' : ' for all'}</span>
      <span class="avail"><span class="dot ${av.cls}"></span><span>${av.html}</span></span>
      ${fit ? `<span class="fit">${fit}</span>` : ''}
      ${p.why ? `<span class="why">${esc(p.why)}</span>` : ''}
      <span class="acts">${cta}</span>
    </div></article>`;
}
function gridHtml(needs){
  const ps = shelfProducts(needs);
  if(!ps.length){ const st = S.src.ret !== 'all';
    return `<div class="empty-grid">No products ${st ? `from ${esc(retName())} ` : ''}match. ${S.q || S.chips.size ? '<button class="link" data-act="clear-chips">Clear the search</button>' : ''}${st ? ' <button class="link" data-act="src-all">Show all stores</button>' : ''}</div>`; }
  if(S.chips.size || S.q || S.sort !== 'rec') return ps.map((p, i) => cardHtml(p, needs, i)).join('');
  const good = ps.filter(p => p.mood && needs.some(n => fitsNeed(p, n))), rest = ps.filter(p => !good.includes(p));
  return `<div class="grid-sec"><b>High match</b><span>${good.length} products · on the mood board${needs.some(n => n.fit) ? ' and the right size' : ''} · best matches first</span></div>${good.map((p, i) => cardHtml(p, needs, i)).join('')}
    ${rest.length ? `<div class="grid-sec" style="margin-top:14px"><b>Lower match</b><span>${rest.length} products · outside the mood board or the wrong size — each card says why</span></div>${rest.map((p, i) => cardHtml(p, needs, i + 1)).join('')}` : ''}`;
}
// The shelf's only tool is search; the High / Lower match groups carry the counts.
function toolsHtml(needs){
  const cat = needs[0].cat;
  return `<div class="tools"><label class="search">${IC.search}<input id="q" type="search" placeholder="Search ${esc(CAT_INFO[cat].label.toLowerCase())}" value="${esc(S.q)}"></label></div>`;
}

/* Product detail: a modal over the page, like KaiWeb's own product view. The
   pictures take the left half (‹ › and the dots step through them); the right
   half is everything about the product, scrolling, with the add pinned at its
   foot. The pager under it steps through the other products on the same shelf,
   in the order the shelf shows them, without closing. */
function pdList(needs){
  if(S.detailFor){ const n = need(S.detailFor); if(n) return [n.pick, ...roomAlts(n).map(c => c.sku)].filter(Boolean); }
  const ps = shelfProducts(needs);
  if(S.chips.size || S.q || S.sort !== 'rec') return ps.map(p => p.sku);
  const good = ps.filter(p => p.mood && needs.some(n => fitsNeed(p, n)));
  return [...good, ...ps.filter(p => !good.includes(p))].map(p => p.sku);
}
/* The measurements the task was planned from: the room's size, the task's
   amount and where that number came from (and an opening's width), as facts. */
function measHtml(ns, p){
  if(ns.length === 1){
    const n = ns[0], r = ROOM[n.room];
    return `<dl class="specs pd-ms"><dt>Needed</dt><dd><b>${qtyText(n.cat, n.planQty)}</b>${n.src ? ` · <span>${esc(n.src)}</span>` : ''}</dd>
      ${n.fit ? `<dt>Opening</dt><dd>${n.fit}″ wide</dd>` : ''}</dl>`;
  }
  return `<dl class="specs pd-ms">${ns.map(n => { const r = ROOM[n.room];
    return `<dt>${esc(r.name)}</dt><dd><b>${qtyText(n.cat, n.planQty)}</b> · ${r.w}′ × ${r.h}′${n.fit ? ` · ${n.fit}″ opening` : ''}</dd>`; }).join('')}</dl>`;
}
function detailHtml(needs){
  const p = CATALOG[S.detail]; if(!p) return '';
  const single = S.sel.kind === 'need' || !!S.detailFor, n0 = needs[0], tgt = single ? needs : inclNeeds();
  const q = needs.reduce((a, n) => a + n.qty, 0), b = buy(p, q), fid = S.detailFor ? ` data-id="${S.detailFor}"` : '';
  const fitT = tgt.filter(n => fitsNeed(p, n));
  const isPick = fitT.length > 0 && fitT.every(n => n.pick === p.sku), bk = n0.backups.includes(p.sku);
  const room = single ? ROOM[n0.room].name : `${tgt.length} tasks`;
  // What you'd buy: the live count once it's added, the sheet's own count before.
  const offs = p.offers.some(o => supOk(o.sup)) ? p.offers.filter(o => supOk(o.sup)) : p.offers;   // the job's stores that sell it
  const base = isPick ? offerOf(single ? n0 : fitT[0], p) : single ? offerOf(n0, p) : firstOffer(p);
  const plan = single ? n0.planQty : tgt.reduce((a, n) => a + n.planQty, 0), o0 = (!isPick && S.dSup && offs.find(o => o.sup === S.dSup)) || base;
  const live = single && isPick ? buy(p, n0.qty, o0).n : 0;
  const cnt = single ? (S.dQty || buy(p, n0.qty, o0).n) : 0;
  const bb = single ? buy(p, qtyForCount(p, cnt), o0) : buy(p, tgt.reduce((a, n) => a + n.qty, 0), o0);
  /* The foot always ends in plain buttons. Not added: a count and Add. Your
     pick: the count is a draft that Update saves, beside Remove. Several rooms:
     where it is, and Remove from them (amounts are set per room on the shelf). */
  const draft = `<div class="stp draft" role="group" aria-label="Quantity"><button type="button" data-act="dqty" data-d="-1" ${cnt <= 1 ? 'disabled' : ''} aria-label="One less">−</button><span class="stp-n"><b>${bb.label}</b></span><button type="button" data-act="dqty" data-d="1" aria-label="One more">+</button></div>`;
  const rmBtn = (ids, lbl) => `<button type="button" class="btn ghost pdm-rm" data-act="remove" data-sku="${p.sku}" data-ids="${ids}">${TRASH}${lbl}</button>`;
  const ft = !single
    ? (isPick ? `<span class="pdm-ft-note"><b>✓ In ${fitT.length} ${fitT.length === 1 ? 'task' : 'tasks'}</b>Amounts are set per room on the shelf</span>${rmBtn(fitT.map(n => n.id).join(','), `Remove from ${fitT.length} ${fitT.length === 1 ? 'room' : 'rooms'}`)}`
      : `<button class="btn pri pdm-go" data-act="choose" data-sku="${p.sku}" ${fitT.length ? '' : 'disabled'}>${fitT.length ? `Add to ${fitT.length} ${fitT.length === 1 ? 'room' : 'rooms'} · ${money(bb.total)}` : 'Doesn’t fit'}</button>`)
    : isPick ? `${draft}${rmBtn(n0.id, 'Remove')}<button class="btn pri pdm-go" data-act="pd-update" data-k="${cnt}" ${cnt === live ? 'disabled title="Change the amount to update it"' : ''}>Update · ${money(bb.total)}</button>`
    : `${draft}${n0.pick && n0.pick !== p.sku ? `<button class="btn ghost pdm-add" data-act="choose" data-sku="${p.sku}" data-k="${cnt}" data-sup="${o0.sup}" data-id="${n0.id}" title="Keep ${esc(CATALOG[n0.pick].name)} and add this beside it">Add</button>` : ''}<button class="btn pri pdm-go" data-act="choose" data-sku="${p.sku}" data-k="${cnt}" data-sup="${o0.sup}"${fid}${n0.pick && n0.pick !== p.sku ? ' data-rep="1"' : ''}>${n0.pick && n0.pick !== p.sku ? 'Replace' : 'Add'} · ${money(bb.total)}</button>`;
  const whys = [], tpl = isTpl(p.sku, single ? [n0] : tgt);
  if(tpl) whys.push(`The job template's pick for this item`);
  if(p.mood) whys.push(`Matches the mood board (${esc(MOOD.name)})`); else whys.push(['no', esc(p.why || 'Not on the mood board')]);
  if(p.std) whys.push(`Your team's standard`);
  if(single && n0.fit) whys.push(fitsNeed(p, n0) ? `Fits the ${n0.fit}″ opening` : ['no', `${p.size}″ wide — the opening is ${n0.fit}″`]);
  const av = avail(p, q, o0); whys.push(av.ok ? `${av.short} for this job` : ['no', av.short]);
  if(single && n0.allow){ const t = buy(p, n0.qty).total; if(t <= n0.allow) whys.push(`Within the ${money0(n0.allow)} task allowance`); }
  const imgs = [0, 1, 2].map(v => ART.product(p, v)), im = S.detailImg % imgs.length;
  const label = CAT_INFO[p.cat].label;
  // The same tag the product's card wears, with the reason beside it.
  const tag = tpl ? ['acc', 'Template pick', 'The job template’s product for this item']
    : p.std ? ['ink', 'Team standard', `Your team's default for this item`]
    : !p.mood ? ['warn', 'Lower match', esc(p.why || 'Outside the mood board')]
    : ['ok', 'High match', `On the ${esc(MOOD.name)} mood board`];
  // Delivery or pickup is the store's, for everything bought there on this order.
  const s0 = SUPPLIERS[o0.sup], need0 = buy(p, single ? n0.qty : q, o0).n, pickup = S.ful[o0.sup] === 'pickup';
  const both = S.src.mode === 'both';
  const ful = (v, on, t) => both ? `<label class="pdm-ful${on ? ' on' : ''}" data-act="pd-ful" data-sup="${o0.sup}" data-v="${v}"><input type="radio" name="pdm-ful" ${on ? 'checked' : ''}><span>${t}</span></label>`
    : (v === 'pickup') === pickOn() ? `<p class="pdm-ful one">${t}</p>` : '';
  const L = pdList(needs), at = L.indexOf(p.sku);
  return `<div class="pdm-wrap" data-act="close-detail"><div class="pdm" role="dialog" aria-modal="true" aria-label="${esc(p.name)}" tabindex="-1" data-stop>
    <div class="pdm-media">
      <div class="pdm-hero" style="--bg:url('${imgs[im]}')"><img src="${imgs[im]}" alt="${esc(p.name)}, picture ${im + 1}">
        <button type="button" class="pdm-arr prev" data-act="img-step" data-d="-1" aria-label="Previous picture">‹</button>
        <button type="button" class="pdm-arr next" data-act="img-step" data-d="1" aria-label="Next picture">›</button>
        <span class="pdm-n">${im + 1} / ${imgs.length}</span></div>
      <div class="pdm-dots">${imgs.map((u, i) => `<button type="button" class="${i === im ? 'on' : ''}" data-act="img" data-i="${i}" aria-label="Picture ${i + 1}"></button>`).join('')}</div>
    </div>
    <div class="pdm-info">
      <div class="pdm-hd">
        <div class="pdm-eye"><span class="k">${esc(label)} · for ${esc(room)}</span>${S.detailFor ? `<button class="link" data-act="sel-need" data-id="${S.detailFor}">See all ${esc(label.toLowerCase())}</button>` : ''}</div>
        <span class="brand">${esc(p.brand)}</span>
        <h3>${esc(p.name)}</h3>
        <div class="pdm-match"><span class="tag ${tag[0]}" title="${tag[2]}">${tag[1]}</span></div>
        <button type="button" class="pdm-x" data-act="close-detail" aria-label="Close">×</button>
      </div>
      <div class="pdm-bd">
        <div class="pdm-sec pdm-buy">
          <div class="pd-price"><b class="num">${money(o0.price)}</b><span>/ ${perUnit(p)}</span>${!single && isPick ? `<span class="pd-tot"><b class="num">${money(bb.total)}</b> for ${fitT.length} ${fitT.length === 1 ? 'room' : 'rooms'}</span>` : ''}</div>
          <div class="pd-meas">${measHtml(single ? [n0] : tgt, p)}</div>
        </div>
        <div class="pdm-sec"><span class="k">Why it ${p.mood ? 'fits' : 'may not fit'} this job</span><ul class="whys">${whys.map(w => Array.isArray(w) ? `<li class="no">${w[1]}</li>` : `<li>${w}</li>`).join('')}</ul></div>
        <div class="pdm-sec"><span class="k">Buy from</span>
          <div class="pdm-sups" role="radiogroup" aria-label="Store">${offs.map(o => {
            const sp = SUPPLIERS[o.sup], on = o.sup === o0.sup, ok = o.stock >= buy(p, single ? n0.qty : q, o).n;
            const st = pickOn() ? (ok ? `${o.stock} in stock` : `${o.stock ? `Only ${o.stock}` : 'None'} in store`) : `Arrives ${wmd(o.ship)}`;
            const cells = `<b>${esc(sp.name)}</b><span class="num"><b>${money(o.price)}</b> / ${perUnit(p)}</span><span class="st">${st}</span>`;
            return offs.length > 1 ? `<button type="button" class="pdm-sup${on ? ' on' : ''}" role="radio" aria-checked="${on}" data-act="pd-sup" data-sup="${o.sup}"><span class="rd"></span>${cells}</button>`
              : `<div class="pdm-sup one">${cells}</div>`;
          }).join('')}</div>
          <div class="pdm-how"><span class="k">${both ? `Delivery or pickup · for everything from ${esc(s0.name)}` : shipOn() ? `Delivery from ${esc(s0.name)}` : `Pickup from ${esc(s0.name)}`}</span>
            ${ful('delivery', !pickup, `<b>Delivery</b> · arrives ${wmd(o0.ship)} to ${esc(shortAddr(S.src.addr))}`)}
            ${ful('pickup', pickup, `<b>Pickup</b> at ${esc(s0.name)} ${esc(s0.store)} · ${o0.stock >= need0 ? `today · ${o0.stock} in stock` : `${o0.stock ? `only ${o0.stock}` : 'none'} in stock`} · ${s0.mi} mi`)}</div></div>
        <div class="pdm-sec"><span class="k">If this item is out of stock</span>${subLineHtml(single ? [n0] : tgt, '', p.sku)}</div>
        <div class="pdm-sec"><span class="k">Details</span><dl class="specs">
          <dt>SKU</dt><dd>${esc(p.sku)}</dd><dt>Sold by</dt><dd>${esc(p.unit === 'SF' && p.pack > 1 ? `${p.packName} of ${p.pack} SF` : perUnit(p))}</dd>${p.size ? `<dt>Width</dt><dd>${p.size}″</dd>` : ''}
          ${/,|\(/.test(p.name) ? `<dt>Finish</dt><dd><span class="dot" style="background:${p.color};border:1px solid var(--stroke);width:12px;height:12px;vertical-align:-2px"></span> ${esc(p.name.split(/,|\(/).pop().replace(/\)\s*$/, '').trim())}</dd>` : ''}</dl></div>
      </div>
      <div class="pdm-ft">${ft}</div>
    </div>
    ${at >= 0 && L.length > 1 ? `<div class="pdm-pager"><button type="button" data-act="pd-step" data-d="-1" ${at === 0 ? 'disabled' : ''} aria-label="Previous product">‹</button><span>${at + 1} of ${L.length} ${esc(label.toLowerCase())}</span><button type="button" data-act="pd-step" data-d="1" ${at === L.length - 1 ? 'disabled' : ''} aria-label="Next product">›</button></div>` : ''}
  </div></div>`;
}
/* The modal lives on the page's body, over everything, and is redrawn with the
   work area. Its right column keeps its scroll while the same product is open. */
function renderDetail(needs){
  let root = document.getElementById('pdmRoot');
  if(!root){ root = document.createElement('div'); root.id = 'pdmRoot'; document.body.appendChild(root); }
  const was = root.dataset.sku || '', bd = root.querySelector('.pdm-bd'), keep = bd ? bd.scrollTop : 0;
  const on = S.screen === 'shop' && S.detail && CATALOG[S.detail];
  root.innerHTML = on ? detailHtml(needs || (S.detailFor ? [need(S.detailFor)] : selNeeds())) : '';
  root.dataset.sku = on ? S.detail : '';
  if(!on) return;
  if(was){ const wr = root.querySelector('.pdm-wrap'); if(wr) wr.classList.add('still'); }   // already open: no fade-in again
  if(was === S.detail){ const b2 = root.querySelector('.pdm-bd'); if(b2) b2.scrollTop = keep; }
  else { const d = root.querySelector('.pdm'); if(d) d.focus({preventScroll: true}); }
}

/* floor plan drawing, used on the reference board */
// placed: room id → SKUs chosen there (small photos along the room's bottom edge)
function planSvg(highlight, placed){
  const k = 9, pad = 6, W = 33 * k + pad * 2, H = 34 * k + pad * 2;
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Floor plan">${ROOMS.map(r => {
    const on = highlight.includes(r.id), x = pad + r.x * k, y = pad + r.y * k, w = r.w * k, h = r.h * k;
    const ps = (placed && placed[r.id]) || [], t = 16, ty = y + h - t - 3;   // along the bottom, clear of the name
    return `<g class="pl-rm" data-room="${r.id}"><rect class="pl-bg" x="${x}" y="${y}" width="${w}" height="${h}" fill="${on ? '#FDFF86' : '#FFFFFF'}" stroke="#1A1A1A" stroke-width="${on ? 2.2 : 1.2}"/>
      ${ps.slice(0, 3).map((sku, i) => `<g class="pl-pk"><rect x="${x + 3 + i * (t + 2)}" y="${ty}" width="${t}" height="${t}" fill="#fff" stroke="#CFC6B0"/><image href="${ART.product(CATALOG[sku])}" x="${x + 4 + i * (t + 2)}" y="${ty + 1}" width="${t - 2}" height="${t - 2}" preserveAspectRatio="xMidYMid slice"><title>${esc(CATALOG[sku].name)}</title></image></g>`).join('')}
      <text x="${x + w / 2}" y="${y + h / 2 - 3}" text-anchor="middle" font-family="Hanken Grotesk, sans-serif" font-size="10.5" font-weight="${on ? 700 : 500}" fill="#1A1A1A">${esc(r.name)}</text>
      <text x="${x + w / 2}" y="${y + h / 2 + 11}" text-anchor="middle" font-family="Space Mono, monospace" font-size="8.5" fill="#5C5750">${r.w}′ × ${r.h}′</text></g>`;
  }).join('')}</svg>`;
}
/* The reference board: photos, floor plan, mood board and notes, any mix open at
   once. Stacked beside the shelf, dragged wider so they sit side by side, or full
   view with the product you're judging held up next to them. */
const REF_ORDER = ['media', 'plan', 'notes'];
const REF_LABEL = {media: 'Media', plan: 'Floorplan', notes: 'Notes', product: 'Holding up'};
/* Media and Floorplan are full tabs in the top bar (as in KaiWeb). Beside the
   shelf they open as references, so several can sit together. */
const TAB_REF = {media: 'media', floorplan: 'plan'};
const besName = p => PAGES[p] || REF_LABEL[TAB_REF[p]] || p;
// The Media / Floorplan tab is showing: that one reference, full page.
const tabRefOn = () => S.screen === 'shop' && !!S.tabRef && S.ref.full && !S.ref.page && S.ref.open.length === 1 && S.ref.open[0] === TAB_REF[S.tabRef];
const tabPageOn = () => S.screen === 'shop' && S.tabRef === 'scope' && S.ref.full && S.ref.page === 'scope' && !S.pair;   // the Scope tab on its own
/* Pages side by side always sit in this order, left to right: the scope you're
   editing, the shelf, then the documents, the facts and the references. */
const PANE_ORDER = ['scope', 'shop', 'documents', 'overview', 'media', 'floorplan'];
const REF_TAB = {media: 'media', plan: 'floorplan'};
const sortPanes = a => [...new Set(a)].sort((x, y) => PANE_ORDER.indexOf(x) - PANE_ORDER.indexOf(y));
// What's showing, as tabs: one page, or two side by side.
function curPanes(){
  if(S.pair && S.screen === 'shop') return S.pair.slice();
  const main = barMain(); if(!main) return [];
  if(main !== 'shop') return [main];
  const b = S.ref.page || REF_TAB[S.ref.open[0]];
  return b ? sortPanes(['shop', b]) : ['shop'];
}
// Show one page, or two side by side in pane order.
function setPanes(list){
  const ps = sortPanes(list).slice(0, 2), here = S.screen === 'shop';
  S.pair = null; S.tabRef = null; S.ref.full = false; S.ref.open = []; S.ref.page = null; S.detail = null;
  const toShop = () => here ? render() : go('shop');
  if(ps.length === 1){
    const p = ps[0];
    if(p === 'shop') return toShop();
    if(TAB_REF[p]){ S.ref.open = [TAB_REF[p]]; S.ref.full = true; S.tabRef = p; return toShop(); }
    if(p === 'scope'){ S.ref.page = 'scope'; S.ref.full = true; S.tabRef = 'scope'; return toShop(); }   // Shop MVP's own scope, on the same tasks as the panel
    S.kwPage = p; return go('kw');
  }
  if(ps.includes('shop')){
    const o = ps.find(x => x !== 'shop');
    S.ref.side = PANE_ORDER.indexOf(o) < PANE_ORDER.indexOf('shop') ? 'left' : 'right';
    if(TAB_REF[o]) S.ref.open = [TAB_REF[o]]; else S.ref.page = o;
    return toShop();
  }
  S.pair = ps; S.ref.full = true; toShop();
}
// The page in the main (left) pane: the shelf, a full-page Media / Floorplan, or a KaiWeb page.
const barMain = () => S.screen === 'kw' ? S.kwPage : tabRefOn() || tabPageOn() ? S.tabRef : S.screen === 'shop' ? 'shop' : null;
function besideTab(p){ setPanes(['shop', p]); }   // ⌘-click or drag a tab onto the shelf
// One side panel at a time: opening a reference replaces whatever was there.
function refAdd(tab){
  S.ref.page = null; S.ref.open = [tab]; S.ref.flash = tab; S.ref.side = 'right';   // references sit right of the shelf
}
function photoList(needs){
  return [...new Set(needs.map(n => n.room))].flatMap(r => PHOTOS[r].map((p, i) => ({k: r + ':' + i, r, i, p})));
}
/* Media: the mood board and the site photos in one viewer — the look you're
   aiming for and the room as it is, a thumbnail apart. */
function secMedia(needs){
  const L = [{k: 'mood', mood: true}].concat(photoList(needs)), cur = L.find(x => x.k === S.ref.ph) || L[1] || L[0];
  const multi = new Set(L.filter(x => !x.mood).map(x => x.r)).size > 1;
  const src = x => x.mood ? ART.mood() : ART.photo(ROOM[x.r].scene, x.i);
  return `<div class="bp-view"><img src="${src(cur)}" alt="${cur.mood ? 'Mood board' : esc(cur.p[0])}"></div>
    <div class="bp-cap">${cur.mood ? `<b>Mood board · ${esc(MOOD.name)}</b><span>${esc(MOOD.source)}</span>`
      : `<b>${multi ? `${esc(ROOM[cur.r].name)} · ` : ''}${esc(cur.p[0])}</b><span>${esc(cur.p[1])} · ${TEAM[cur.p[2]].name}</span>`}</div>
    <div class="bp-ths">${L.map(x => `<button type="button" class="${x === cur ? 'on' : ''}" data-act="ref-photo" data-k="${x.k}" title="${x.mood ? 'Mood board' : esc(x.p[0])}"><img src="${src(x)}" alt="">${x.mood ? '<span>Mood board</span>' : multi ? `<span>${esc(ROOM[x.r].name)}</span>` : ''}</button>`).join('')}</div>`;
}
function secPhotos(needs){
  const L = photoList(needs), cur = L.find(x => x.k === S.ref.ph) || L[0], multi = new Set(L.map(x => x.r)).size > 1;
  return `<div class="bp-view"><img src="${ART.photo(ROOM[cur.r].scene, cur.i)}" alt="${esc(cur.p[0])}"></div>
    <div class="bp-cap"><b>${multi ? `${esc(ROOM[cur.r].name)} · ` : ''}${esc(cur.p[0])}</b><span>${esc(cur.p[1])} · ${TEAM[cur.p[2]].name}</span></div>
    <div class="bp-ths">${L.map(x => `<button type="button" class="${x === cur ? 'on' : ''}" data-act="ref-photo" data-k="${x.k}" title="${esc(x.p[0])}"><img src="${ART.photo(ROOM[x.r].scene, x.i)}" alt="">${multi ? `<span>${esc(ROOM[x.r].name)}</span>` : ''}</button>`).join('')}</div>`;
}
function secPlan(needs){
  const n0 = needs[0], rooms = [...new Set(needs.map(n => n.room))];
  const rows = needs.map(n => {
    const p = n.pick && CATALOG[n.pick], b = p && buy(p, n.qty);
    return `<div><span>${esc(whereOf(n))} — ${esc(n.src)}</span><b>${qtyText(n.cat, n.qty)}</b></div>${p && b.sub ? `<div><span>${esc(p.name.split(',')[0])}: ${p.pack} ${p.unit} per ${p.packName}</span><b>${b.label} · ${b.sub}</b></div>` : ''}`;
  }).join('');
  const placed = {};
  needs.forEach(n => [n.pick, ...(n.more || []).map(x => x.pick)].filter(sku => sku && CATALOG[sku]).forEach(sku => { (placed[n.room] = placed[n.room] || []).includes(sku) || placed[n.room].push(sku); }));
  return `<div class="plan">${planSvg(rooms, placed)}<span class="plan-hint">Drag a product onto a room to add it there</span></div>
    <div class="math">${rows}<div><span>To cover, waste included</span><b>${qtyText(n0.cat, needs.reduce((a, n) => a + n.qty, 0))}</b></div></div>
    <p class="sub">Measured by ${TEAM.TO.name} on the scope walk · Mar 2. Plan quantities, plus waste, turned into what you actually buy.</p>`;
}
function secMood(){
  return `<div class="bm-photo"><img src="${ART.mood()}" alt="Mood board"></div><p class="sub">${esc(MOOD.name)} · ${esc(MOOD.source)}</p>`;
}
function secNotes(needs){
  const ns = notesFor(needs);
  return `<div class="thread">${ns.length ? ns.map(x => `<div class="msg"><span class="av sm" style="background:${TEAM[x.who].tone}">${x.who}</span><div class="b"><small><b>${TEAM[x.who].name}</b> · ${esc(x.when)}${S.sel.kind === 'type' ? ` · ${esc(ROOM[x.n.room].name)}` : S.sel.kind === 'room' ? ` · ${esc(x.n.task)}` : ''}</small>${esc(x.text)}</div></div>`).join('') : '<p class="sub">No notes yet. Everyone on the job sees what you write here.</p>'}</div>
    ${S.sel.kind === 'room' ? '<p class="sub">To add a note, open the item it’s about.</p>' : `<form class="compose" data-form="note"><input name="t" placeholder="Write a note — @ to mention someone" autocomplete="off"><button class="btn ink sm" type="submit">Post</button></form>`}`;
}
// The products worth holding up against the room: your pick, its substitutes, the best matches.
function boardProducts(needs){
  const out = [], n0 = needs[0], single = S.sel.kind === 'need';
  const add = (sku, tag) => { if(sku && CATALOG[sku] && !out.some(x => x.sku === sku)) out.push({sku, tag}); };
  needs.forEach(n => add(n.pick, single ? 'Picked' : `Picked · ${whereOf(n)}`));
  needs.forEach(n => n.backups.forEach((s, i) => add(s, `Substitute ${i + 1}`)));
  if(out.length < 3) shelfProducts(needs).filter(p => p.mood && needs.some(n => fitsNeed(p, n))).forEach(p => { if(out.length < 4) add(p.sku, 'Best match'); });
  return out;
}
function secProduct(needs){
  const L = boardProducts(needs), cur = L.find(x => x.sku === S.ref.prod) || L[0];
  if(!cur) return '<p class="sub">Nothing to hold up yet. Add a product or choose a substitute, and it shows up here.</p>';
  const p = CATALOG[cur.sku], single = S.sel.kind === 'need', n0 = needs[0];
  const q = needs.reduce((a, n) => a + n.qty, 0), o = single ? offerOf(n0, p) : p.offers[0], b = buy(p, q, o), av = avail(p, q, o);
  const tgt = single ? needs : inclNeeds(), k = tgt.filter(n => fitsNeed(p, n)).length;
  const isPick = k > 0 && tgt.filter(n => fitsNeed(p, n)).every(n => n.pick === p.sku);
  return `<div class="bq-ths">${L.map(x => `<button type="button" class="${x === cur ? 'on' : ''}" data-act="ref-prod" data-sku="${x.sku}" title="${esc(CATALOG[x.sku].name)}"><img src="${ART.product(CATALOG[x.sku])}" alt=""><span>${esc(x.tag)}</span></button>`).join('')}</div>
    <div class="bq-view"><img src="${ART.product(p)}" alt="${esc(p.name)}"></div>
    <div class="bq-tx"><span class="brand">${esc(p.brand)} · ${esc(SUPPLIERS[o.sup].name)}</span><b>${esc(p.name)}</b>
      <span class="price"><b class="num">${money(o.price)}</b> / ${perUnit(p)} · buy <strong>${b.label}</strong> · <strong class="num">${money(b.total)}</strong></span>
      <span class="fit">${p.mood && (single ? fitsNeed(p, n0) : needs.some(n => fitsNeed(p, n))) ? '<span class="tag ok">High match</span>' : '<span class="tag warn">Lower match</span>'}${single && n0.fit ? (fitsNeed(p, n0) ? `<span class="tag ok">Fits ${n0.fit}″ opening</span>` : `<span class="tag err">${p.size}″ — opening is ${n0.fit}″</span>`) : ''}</span>
      <span class="avail"><span class="dot ${av.cls}"></span><span>${av.html}</span></span>
      <span class="acts">${isPick ? '<span class="tag ok">✓ On the list</span>' : `<button type="button" class="btn pri sm" data-act="choose" data-sku="${p.sku}" ${k ? '' : 'disabled'}>${single ? 'Choose' : `Choose for ${k} ${k === 1 ? 'room' : 'rooms'}`}</button>`}<button type="button" class="btn ghost sm" data-act="detail" data-sku="${p.sku}">Details</button></span></div>`;
}
function boardHtml(needs){
  if(S.pair) return pairHtml(needs);
  if(S.ref.page) return pageBoardHtml(needs);
  const open = S.ref.open; if(!open.length) return '';
  const n0 = needs[0], single = S.sel.kind === 'need', rooms = [...new Set(needs.map(n => n.room))];
  const meta = {media: `Mood board · ${photoList(needs).length} photos`, plan: rooms.length > 1 ? `${rooms.length} rooms` : esc(ROOM[n0.room].name), mood: esc(MOOD.name), notes: notesFor(needs).length, product: single ? esc(n0.task) : esc(CAT_INFO[n0.cat].label)};
  const body = {media: secMedia, plan: secPlan, notes: secNotes, product: secProduct};
  const sec = (t, span) => `<section class="bsec bsec-${t}${S.ref.flash === t ? ' flash' : ''}" data-sec="${t}"${span ? ` style="grid-column:span ${span}"` : ''}><header><b>${REF_LABEL[t]}</b><em>${meta[t]}</em></header><div class="bsec-bd">${body[t](needs)}</div></section>`;
  /* A pane is titled with its tab's name, as plain text; the checkboxes in the
     bar open and close it, and so does the × beside Full view. */
  const r0 = open[0], solo = tabRefOn(), nNotes = notesFor(needs).length;
  const sub = r0 === 'notes' ? `${nNotes} ${nNotes === 1 ? 'note' : 'notes'}` : meta[r0];
  const hd = `<h2 class="pane-t">${REF_LABEL[r0]}</h2>${sub ? `<span class="pane-m">${sub}</span>` : ''}<span class="sp"></span>${S.ref.full ? (solo ? '' : '<button type="button" class="btn" data-act="ref-full">← Back to products</button>') : '<button type="button" class="lnk" data-act="ref-full">⤢ Full view</button>'}${solo ? '' : '<button type="button" class="x" data-act="ref-close" aria-label="Close" title="Close">×</button>'}`;
  const plain = t => `<section class="bsec bsec-solo bsec-${t}${S.ref.flash === t ? ' flash' : ''}" data-sec="${t}"><div class="bsec-bd">${body[t](needs)}</div></section>`;
  return `<aside class="board${S.ref.full ? ' full' : ''}" aria-label="${REF_LABEL[r0]}">${S.ref.full ? '' : '<div class="board-grip" data-grip title="Drag to make it wider or narrower"></div>'}
    <div class="board-hd">${hd}</div>
    <div class="board-bd">${S.ref.full ? fullBody() : open.map(plain).join('')}</div></aside>`;
  // Full view: the product you're judging gets a full-height column on the right; the
  // references fill the rest in as many columns as fit, the last one widening to close any gap.
  function fullBody(){
    const prod = S.sel.kind !== 'room';   // a room view has no single product to hold up
    const W = ($('#work').clientWidth || 1100) - 56, P = prod ? Math.round(Math.max(300, Math.min(420, W * .3))) : 0, R = W - P - (prod ? 14 : 0);
    const cols = Math.max(1, Math.min(open.length, Math.floor((R + 14) / (270 + 14)))), rows = Math.ceil(open.length / cols), span = cols * rows - open.length + 1;
    return `<div class="board-refs" style="grid-template-columns:repeat(${cols},minmax(0,1fr))">${open.map((t, i) => sec(t, i === open.length - 1 && span > 1 ? span : 0)).join('')}</div>
      ${prod ? `<div class="board-prod" style="width:${P}px">${sec('product')}</div>` : ''}`;
  }
}
/* ── Overview, Scope, Media, Floorplan, Documents: the real KaiWeb pages ─
   Framed once (KaiWeb in its embedded mode, without its own bars) and kept
   loaded, so switching tabs is instant after the first time. */
function showKw(page){
  const f = $('#kwFrame'), ld = $('#kwLoading');
  if(!f.getAttribute('src')){
    // KaiWeb keeps its demo in this browser. With none saved yet, start it on this job in progress rather than an empty draft.
    try { if(!localStorage.getItem('kai_comp_state')) localStorage.setItem('kai_comp_state', JSON.stringify({role: 'manager', projectStage: 'published', viewStage: 'published', scopeSeed: 'full', workTrack: 'labor'})); } catch(e){}
    f.src = '../index.html?embed=1&tab=' + encodeURIComponent(page);
    f.addEventListener('load', () => { kwNoPanel(); setTimeout(() => { if(ld) ld.hidden = true; }, 900); }, {once: true});
  } else {
    try { f.contentWindow.postMessage({type: 'kw-embed-tab', page}, '*'); } catch(e){}
  }
  kwNoPanel();
}
setInterval(() => { if(S.screen === 'kw') kwNoPanel(); }, 400);
// Same site, so Shop MVP can reach into the frame (and the page frame inside it) and hide KaiWeb's own scope panel.
function kwNoPanel(){
  try {
    const od = $('#kwFrame').contentDocument, inner = od && od.querySelector('#iframe');
    if(inner && !inner.dataset.mvp){ inner.dataset.mvp = '1'; inner.addEventListener('load', kwNoPanel); }
    const d = inner && inner.contentDocument;
    if(d && d.head && !d.getElementById('mvp-no-panel')){
      const st = d.createElement('style'); st.id = 'mvp-no-panel';
      st.textContent = '.body > .sidebar, .body > #handle, #pgEdge { display: none !important; }';   // the panel, its drag handle and its open/close edge
      d.head.appendChild(st);
    }
  } catch(e){}
}

/* Two pages side by side without the shelf, each as it shows beside the shelf. */
function pairHtml(needs){
  const n0 = needs[0], rooms = [...new Set(needs.map(n => n.room))];
  const meta = {media: `Mood board · ${photoList(needs).length} photos`, plan: rooms.length > 1 ? `${rooms.length} rooms` : esc(ROOM[n0.room].name)};
  const pane = id => {
    if(TAB_REF[id]){ const r = TAB_REF[id], body = r === 'media' ? secMedia(needs) : secPlan(needs);
      return `<section class="bsec bsec-${r}" data-sec="${r}"><div class="pane-hd"><h2 class="pane-t">${REF_LABEL[r]}</h2><span class="pane-m">${meta[r]}</span></div><div class="bsec-bd">${body}</div></section>`; }
    const body = id === 'scope' ? pgScope(needs) : id === 'documents' ? pgDocs() : pgOverview();
    return `<section class="bsec bsec-pg"><div class="pane-hd"><h2 class="pane-t">${PAGES[id]}</h2></div><div class="board-pg pg-${id}">${body}</div></section>`;
  };
  return `<aside class="board full pair" aria-label="${S.pair.map(besName).join(' and ')}, side by side">
    <div class="pair-bd">${S.pair.map(pane).join('')}</div></aside>`;
}
/* ── A page beside the shelf ──────────────────────────────────────────
   The board on the right can hold references (photos, plan, mood board,
   notes — several at once) or one page from the top bar. Pages come in
   two familiar ways: "Side by side ▾" after the reference buttons, or
   dragging a top-bar tab onto the page, where the right half shades to
   say "drop here". Each page here is a light version: enough to work
   from while shopping. */
const PAGES = {scope: 'Scope', documents: 'Documents', overview: 'Overview'};
function besideOpen(p){ S.ref.page = p; S.ref.open = []; S.detail = null; S.ref.side = PANE_ORDER.indexOf(p) < PANE_ORDER.indexOf('shop') ? 'left' : 'right'; renderWork(); }   // a page replaces the references
function besideClose(){ S.ref.page = null; S.ref.full = false; renderWork(); }
function pageBoardHtml(needs){
  const p = S.ref.page, nm = PAGES[p];
  const solo = tabPageOn();
  const body = solo ? scopePageHtml(needs) : p === 'scope' ? pgScope(needs) : p === 'documents' ? pgDocs() : pgOverview();
  const hd = `<h2 class="pane-t">${nm}</h2>${solo ? `<span class="pane-m">Scope V3 · approved · ${esc(JOB.stage)}</span>` : ''}
    <span class="sp"></span>${solo ? '' : (S.ref.full ? '<button type="button" class="btn" data-act="ref-full">← Back to products</button>' : '<button type="button" class="lnk" data-act="ref-full">⤢ Full view</button>') + '<button type="button" class="x" data-act="pg-close" aria-label="Close" title="Close">×</button>'}`;
  return `<aside class="board is-page${S.ref.full ? ' full' : ''}" aria-label="${nm}, beside the shelf">${S.ref.full ? '' : '<div class="board-grip" data-grip title="Drag to make it wider or narrower"></div>'}
    <div class="board-hd">${hd}</div><div class="board-pg pg-${p}">${body}</div></aside>`;
}
/* The Scope tab: the task picked in the panel, or every task (a room's lit). */
function scopePageHtml(needs){
  if(S.sel.kind !== 'need') return pgScope(needs, true);
  const n = needs[0], r = ROOM[n.room], p = n.pick && CATALOG[n.pick], lab = LABOR[n.id], notes = notesFor([n]);
  const o = p && offerOf(n, p), b = p && buy(p, n.qty, o);
  return `<div class="scp">
    <div class="crumbs"><button data-act="sel-room" data-room="all">All</button><span>›</span><button data-act="sel-room" data-room="${n.room}">${esc(r.name)}</button><span>›</span><span class="cur">${esc(n.task)}</span></div>
    <h2 class="scp-t">${esc(taskLabel(n))}</h2>
    <div class="shelf-sub"><b>${qtyText(n.cat, n.qty)}</b><span class="sep">|</span><span>${esc(r.name)}</span><span class="sep">|</span>${n.allow ? `<span>Task ${needAmtHtml(n, `${money0(taskCost(n))} / ${money0(n.allow)}`)}</span>` : '<span class="na">Allowance N/A</span>'}${isOver(n) ? ' <span class="tag warn">Needs review</span>' : ''}</div>
    <div class="scp-grid">
      <section class="scp-c scp-wide"><span class="k">The task<em>${esc(installerOf(n))}</em></span><p>${esc(n.desc || '')}</p></section>
      <section class="scp-c"><span class="k">Measurements</span><p><b>${qtyText(n.cat, n.planQty)}</b>${n.src ? ` · ${esc(n.src)}` : ''}</p>${n.fit ? `<p>Opening ${n.fit}″ wide</p>` : ''}</section>
      <section class="scp-c"><span class="k">Labor<em>${esc(installerOf(n))}</em></span><b class="scp-amt num">${lab ? money(lab) : 'Not priced yet'}</b></section>
      <section class="scp-c"><span class="k">Materials</span>${p ? `<div class="scp-pick"><img src="${ART.product(p)}" alt=""><span class="tx"><span class="brand">${esc(p.brand)} · ${esc(SUPPLIERS[o.sup].name)}</span><b>${esc(p.name)}</b><span>${b.label} · <b class="num">${money(b.total)}</b></span></span></div>` : '<p class="todo">No product chosen yet</p>'}
        <button type="button" class="btn ${p ? '' : 'pri '}sm" data-act="shop-task" data-id="${n.id}">${p ? 'Change in Shop →' : 'Choose in Shop →'}</button></section>
      <section class="scp-c"><span class="k">Notes<em>${notes.length}</em></span>${notes.length ? notes.slice(-2).map(x => `<span class="ctx-note"><span class="av sm" style="background:${TEAM[x.who].tone}">${x.who}</span><p>${esc(x.text)}</p></span>`).join('') : '<p class="cf-none">No notes yet.</p>'}</section>
    </div></div>`;
}
function pgScope(needs, full){
  const on = new Set(full && S.sel.kind === 'room' && S.sel.room === 'all' ? [] : needs.map(n => n.id));
  const tot = NEEDS.reduce((a, n) => a + needTotal(n), 0);
  return `<div class="pg-hd"><b>${esc(JOB.name)}</b><span>Scope V3 · approved · ${esc(JOB.stage)}</span><span class="pg-amt">${money(tot)} <i>materials chosen</i></span></div>
    ${ROOMS.map(r => {
      const ns = NEEDS.filter(n => n.room === r.id); if(!ns.length) return '';
      return `<div class="pg-grp"><b>${esc(r.name)}</b><span>${taskCount(ns)} ${taskCount(ns) === 1 ? 'task' : 'tasks'}</span><span class="pg-amt">${money(ns.reduce((a, n) => a + needTotal(n), 0))}</span></div>
        ${ns.map(n => { const hit = on.has(n.id), pk = n.pick && CATALOG[n.pick];
          return `<button type="button" class="pg-task${hit ? ' on' : ''}" data-act="sel-need" data-id="${n.id}" title="${full ? 'Open this task' : 'Shop for this task'}">
            <span class="pg-t"><b>${esc(n.task)}${multiOpt(n) ? ` · ${esc(optShort(n))}` : ''}</b><span>${qtyText(n.cat, n.qty)}${pk ? ` · ${esc(pk.brand)} ${esc(pk.name.split(/,|\(/)[0])}` : ''}</span>
              ${hit && n.desc && !full ? `<p>${esc(n.desc)}</p>` : ''}</span>
            <span class="pg-r">${hit && !full ? '<span class="tag acc">Shopping now</span>' : !pk ? '<span class="tag warn">Needs product</span>' : ''}<span class="pg-amt">${pk ? money(needTotal(n)) : '—'}</span></span></button>`;
        }).join('')}`;
    }).join('')}`;
}
function pgDocs(){
  const ph = Object.values(PHOTOS).reduce((a, l) => a + l.length, 0);
  const dl = nm => `<span class="pg-dl"><button type="button" class="pg-dl-b">Download<svg class="car" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 4.5 6 8l3.5-3.5"/></svg></button>
      <span class="pg-dl-m" role="menu">${[['pdf', 'PDF'], ['csv', 'Excel'], ['photos', `${ph} photos (ZIP)`]].map(([k, l]) => `<button type="button" role="menuitem" data-act="doc-dl" data-n="${esc(nm)}" data-k="${k}">${l}</button>`).join('')}</span></span>`;
  const row = (nm, sub, date, st) => `<div class="pg-doc"><span class="pg-t"><b>${esc(nm)}</b><span>${esc(sub)}</span></span><span class="pg-date">${esc(date)}</span><span class="tag ${st === 'Approved' ? '' : 'ok'}">${esc(st)}</span>${dl(nm)}</div>`;
  const sups = [...new Set(orderLines().map(L => L.sup))];
  const pos = S.placed ? sups.map(sup => { const ls = orderLines().filter(L => L.sup === sup); return row(`${SUPPLIERS[sup].name} order`, `${ls.length} ${ls.length === 1 ? 'line' : 'lines'} · ${money(ls.reduce((a, L) => a + L.b.total, 0))}`, wmd(TODAY), 'Placed'); }).join('')
    : '<p class="pg-none">None yet. Placing orders in Review &amp; order adds one per supplier here.</p>';
  return `<div class="pg-sec"><h4>Current scope</h4>${row('Scope V3', 'SOW-00000E7D', 'Nov 2, 2026', 'Approved')}</div>
    <div class="pg-sec"><h4>Purchase orders</h4>${pos}</div>
    <div class="pg-sec"><h4>Change orders</h4>${row('Change Order 2', '→ Scope V3', 'Nov 2, 2026', 'Approved')}${row('Change Order 1', '→ Scope V2', 'Oct 21, 2026', 'Approved')}</div>
    <div class="pg-sec"><h4>Outdated scopes</h4>${row('Scope V2', 'SOW-00000E7C', 'Oct 21, 2026', 'Approved')}${row('Scope V1', 'SOW-00000E7B', 'Oct 9, 2026', 'Approved')}</div>`;
}
function pgOverview(){
  const chosen = NEEDS.filter(n => n.pick).length, tot = NEEDS.reduce((a, n) => a + needTotal(n), 0);
  return `<div class="pg-hd"><b>${esc(JOB.street)}</b><span>${esc(JOB.city)} · ${esc(JOB.name)} · ${esc(JOB.id)}</span></div>
    <div class="pg-facts"><div><span class="k">Stage</span><b>${esc(JOB.stage)}</b></div><div><span class="k">Whose turn</span><b>${TEAM[ME].name} · yours</b></div>
      <div><span class="k">Shopping</span><b>${chosen} of ${NEEDS.length} chosen</b></div><div><span class="k">Materials chosen</span><b>${money(tot)}</b></div>
      <div><span class="k">Materials estimate</span><b>${money(JOB.materialsEstimate)}</b></div><div><span class="k">Contractor</span><b>${esc(JOB.contractor.split(' · ')[0])}</b></div></div>
    <div class="pg-sec"><h4>Team</h4>${Object.values(TEAM).map(m => `<div class="pg-line"><span>${esc(m.name)}</span><b>${esc(m.role)}</b></div>`).join('')}</div>`;
}
/* Drag a top-bar tab onto the page: the right half shades to say where. */
let PG_DRAG = null;
document.addEventListener('dragstart', e => {
  const t = e.target.closest && e.target.closest('.bar .tabs [data-page]'); if(!t || S.screen !== 'shop') return;
  PG_DRAG = t.dataset.page;
  try { e.dataTransfer.setData('text/plain', PG_DRAG); e.dataTransfer.effectAllowed = 'move'; } catch(err){}
  const id = PG_DRAG;
  setTimeout(() => {
    if(PG_DRAG !== id) return;
    const w = $('#work'); if(!w) return;
    const o = document.createElement('div'); o.className = 'bes-overlay';
    const b = w.querySelector('.board'); if(b && !b.classList.contains('full')) o.style.left = b.offsetLeft + 'px';
    o.innerHTML = `<span class="bes-overlay-l"><svg class="bes-ic" viewBox="0 0 16 16" aria-hidden="true"><rect x="1.5" y="2.5" width="13" height="11" rx="1"/><path d="M8 2.5v11"/><rect x="8" y="2.5" width="6.5" height="11" class="f"/></svg>Drop to show ${besName(id)} beside${S.ref.page && S.ref.page !== id && !TAB_REF[id] ? ' instead' : ''}</span>`;
    w.appendChild(o);
  }, 0);
});
const _pgDragEnd = () => { PG_DRAG = null; document.querySelectorAll('.bes-overlay').forEach(x => x.remove()); };
document.addEventListener('dragend', _pgDragEnd);
document.addEventListener('dragover', e => {
  if(!PG_DRAG) return; const o = e.target.closest && e.target.closest('.bes-overlay'); if(!o) return;
  e.preventDefault(); o.classList.add('is-over');
});
document.addEventListener('dragleave', e => { const o = e.target.closest && e.target.closest('.bes-overlay'); if(o && !o.contains(e.relatedTarget)) o.classList.remove('is-over'); });
document.addEventListener('drop', e => {
  if(!PG_DRAG) return; const o = e.target.closest && e.target.closest('.bes-overlay'); if(!o) return;
  e.preventDefault(); const p = PG_DRAG; _pgDragEnd(); besideTab(p);
});
/* ── Drag a product from the main panel onto the list ──
   From the Shopping List wireframe. Any product card can be dragged; the list
   redraws around it (renderList reads S.drag): the tasks it fits are outlined
   and opened, the rest dim. Holding near the list's top or bottom edge scrolls
   it; if none of the tasks it fits are in view, the list jumps to the first. */
document.addEventListener('dragstart', e => {
  const c = e.target.closest && e.target.closest('[data-drag]'); if(!c) return;
  const sku = c.dataset.drag;
  try { e.dataTransfer.setData('text/plain', sku); e.dataTransfer.effectAllowed = 'copy'; } catch(err){}
  document.body.classList.add('is-dragging');
  // after the drag image is taken, so redrawing the list doesn't disturb it
  setTimeout(() => { if(!document.body.classList.contains('is-dragging')) return; S.drag = sku; renderList(); dragJump(); }, 0);
});
function dragJump(){
  const lb = $('#list .list-body'); if(!lb) return;
  const ts = [...lb.querySelectorAll('.nv-task[data-drop]')]; if(!ts.length) return;
  const r = lb.getBoundingClientRect();
  if(ts.some(t => { const b = t.getBoundingClientRect(); return b.bottom > r.top + 20 && b.top < r.bottom - 20; })) return;
  lb.scrollTo({top: Math.max(0, lb.scrollTop + ts[0].getBoundingClientRect().top - r.top - 90), behavior: 'smooth'});
}
function dragStop(){
  document.body.classList.remove('is-dragging');
  if(!S.drag) return;
  S.drag = null; renderList();
}
document.addEventListener('dragend', dragStop);
document.addEventListener('dragover', e => {
  if(!S.drag) return;
  const lb = $('#list .list-body');
  if(lb){ const r = lb.getBoundingClientRect(); if(e.clientX >= r.left && e.clientX <= r.right){ if(e.clientY < r.top + 48) lb.scrollTop -= 14; else if(e.clientY > r.bottom - 48) lb.scrollTop += 14; } }
  const z = e.target.closest && e.target.closest('#list [data-drop]');
  document.querySelectorAll('#list .is-over').forEach(x => { if(x !== z) x.classList.remove('is-over'); });
  if(!z) return;
  e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; z.classList.add('is-over');
});
document.addEventListener('drop', e => {
  if(!S.drag) return;
  const z = e.target.closest && e.target.closest('#list [data-drop]'), sku = S.drag;
  if(z) e.preventDefault();
  dragStop();
  if(z) dropOn(sku, z.dataset.drop.split(','));
});
// The product goes on the task dropped on, like any add: a task with nothing gets it, a task with
// another product gets it beside that one. If other tasks use the same kind of product, a light
// banner offers it to them ("Add to all", or "Review" for the box), and fades if it's left alone.
function giveAll(sku, ns){
  const p = CATALOG[sku], snap = ns.map(n => [n, n.pick, n.backups.slice(), (n.more || []).slice(), n.qty]);
  ns.forEach(n => {
    if(!n.pick){ n.pick = sku; n.backups = n.backups.filter(s => s !== sku); return; }
    if(n.pick === sku || (n.more || []).some(x => x.pick === sku)) return;
    const x = mkMore(n, sku, n.qty); S.offer[x.id] = prefOffer(p, n).sup; n.more = (n.more || []).concat(x);
  });
  return () => snap.forEach(([n, pk, bk, more, q]) => { n.pick = pk; n.backups = bk; n.more = more; n.qty = q; });
}
/* ── …or onto a room in the Floorplan beside the shelf ──
   While a product is dragged, rooms with a task it fits are outlined; the rest dim.
   Dropping adds it to that room's task, the same as dropping on the task in the list. */
const planFits = (sku, room) => { const p = CATALOG[sku]; return p ? NEEDS.filter(n => n.room === room && n.cat === p.cat && fitsNeed(p, n)).map(n => n.id) : []; };
function planMark(sku){
  document.querySelectorAll('.board .plan .pl-rm').forEach(g => {
    g.classList.remove('pl-ok', 'pl-no', 'is-over');
    if(sku) g.classList.add(planFits(sku, g.dataset.room).length ? 'pl-ok' : 'pl-no');
  });
  document.querySelectorAll('.board .plan').forEach(pl => pl.classList.toggle('is-drag', !!sku));
}
document.addEventListener('dragstart', e => {
  const c = e.target.closest && e.target.closest('[data-drag]'); if(!c) return;
  const sku = c.dataset.drag; setTimeout(() => { if(document.body.classList.contains('is-dragging')) planMark(sku); }, 0);
});
document.addEventListener('dragend', () => planMark(null));
document.addEventListener('dragover', e => {
  if(!S.drag) return;
  const g = e.target.closest && e.target.closest('.board .plan .pl-rm.pl-ok');
  document.querySelectorAll('.board .plan .pl-rm.is-over').forEach(x => { if(x !== g) x.classList.remove('is-over'); });
  if(!g) return;
  e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; g.classList.add('is-over');
});
document.addEventListener('drop', e => {
  if(!S.drag) return;
  const g = e.target.closest && e.target.closest('.board .plan .pl-rm.pl-ok'); if(!g) return;
  e.preventDefault();
  const sku = S.drag, ids = planFits(sku, g.dataset.room);
  dragStop(); planMark(null);
  dropOn(sku, ids);
}, true);
const hasSku = (n, sku) => n.pick === sku || (n.more || []).some(x => x.pick === sku);
function dropOn(sku, ids){
  const p = CATALOG[sku], n = ids.map(need).find(n => n && n.cat === p.cat && fitsNeed(p, n));
  if(!n) return;
  const undo = giveAll(sku, [n]);
  render();
  const others = NEEDS.filter(m => m.id !== n.id && m.cat === p.cat && fitsNeed(p, m) && !hasSku(m, sku)).map(m => m.id);
  dropBanner({sku, first: n, undo, ids: others});
}
let DB = null, DB_T = null;
const dbName = p => esc(p.name.split(/,|\(/)[0].trim());
function dropBanner(o){
  DB = o;
  let host = document.getElementById('dropBn');
  if(!o){ if(host) host.remove(); clearTimeout(DB_T); return; }
  if(!host){
    host = document.createElement('div'); host.id = 'dropBn'; document.body.appendChild(host);
    host.addEventListener('click', dbClick);
    host.addEventListener('mouseenter', () => { clearTimeout(DB_T); host.classList.remove('out'); });
    host.addEventListener('mouseleave', () => dbFade(4000));
  }
  const p = CATALOG[o.sku], n = o.first, k = o.ids.length, nm = dbName(p);
  host.innerHTML = `<div class="dbn" role="status"><span class="dbn-ic" aria-hidden="true">✓</span>
    <div class="dbn-tx"><span class="dbn-done">Added <b>${nm}</b> to ${esc(ROOM[n.room].name)} › ${esc(taskLabel(n))}<button type="button" data-db="undo">Undo</button></span>
      ${k ? `<span class="dbn-more">${esc(CAT_INFO[p.cat].label)} is also used in ${k} other ${k === 1 ? 'task' : 'tasks'}</span>` : ''}</div>
    ${k ? `<div class="dbn-acts"><button type="button" class="dbn-all" data-db="all">Add to ${k === 1 ? 'it too' : `all ${k}`}</button><button type="button" class="dbn-rv" data-db="review">Review</button></div>` : ''}
    <button type="button" class="dbn-x" data-db="x" aria-label="Dismiss">×</button></div>`;
  host.classList.remove('out');
  dbFade(k ? 9000 : 5000);
}
function dbFade(ms){ clearTimeout(DB_T); DB_T = setTimeout(() => { const h = document.getElementById('dropBn'); if(!h) return; h.classList.add('out'); DB_T = setTimeout(() => dropBanner(null), 450); }, ms); }
function dbClick(e){
  const t = e.target.closest('[data-db]'); if(!t || !DB) return;
  const o = DB, a = t.dataset.db, p = CATALOG[o.sku];
  dropBanner(null);
  if(a === 'undo'){ o.undo(); render(); return; }
  if(a === 'review'){ dropAsk(o.sku, o.first); return; }
  if(a === 'all'){ const ns = o.ids.map(need).filter(Boolean), u = giveAll(o.sku, ns); render();
    toast(`Added ${dbName(p)} to ${ns.length} more ${ns.length === 1 ? 'task' : 'tasks'}.`, () => { u(); render(); }); }
}
const shortName = x => esc(x.name.split('(')[0].trim());   // keeps the colour: Paragon Mix Plus LVP, Stonewash 9×59
function dropToast(p, tgt, before, was){
  const where = n => `${esc(ROOM[n.room].name)} › ${esc(taskLabel(n))}`;
  toast(tgt.length === 1 ? `Added ${shortName(p)} to ${where(tgt[0])}${was ? ` in place of ${shortName(was)}` : ''}.`
    : `Added ${shortName(p)} to ${where(tgt[0])} and ${tgt.length - 1} more ${tgt.length === 2 ? 'task' : 'tasks'}.`,
    () => { before.forEach(([n, pk, bk]) => { n.pick = pk; n.backups = bk; }); render(); });
}
/* "3 other tasks also need this": every other task the product fits that
   doesn't have it yet. Two columns: the list to tick on the left, and on the
   right the task in focus as its own page would show it (room photos, what the
   work is, measurements, notes, what it has now against this product), so each
   one can be judged before it gets the same product. Nothing is ticked to begin
   with; the drop filled one task, the rest is yours to choose. */
let DQ = null;   // {sku, first, ids, sel, focus, ph}
function dropAsk(sku, first){
  const p = CATALOG[sku];
  const ids = NEEDS.filter(n => n.id !== first.id && n.cat === p.cat && fitsNeed(p, n) && !hasSku(n, sku)).map(n => n.id);
  if(!ids.length) return false;
  DQ = {sku, first, ids, sel: new Set(), focus: ids[0], ph: {}};
  drawDropAsk();
  return true;
}
// The room's photos, the ones that show this kind of work first.
const DQ_PH = {floor: /floor|carpet/i, paint: /wall|room/i, cabinet: /cabinet/i, counter: /counter|sink/i, tile: /backsplash|tile|vanity/i, shower: /shower/i,
  appliance: /appliance/i, lighting: /light|ceiling/i, ceilingfan: /fan|ceiling/i, blinds: /window/i, vanity: /vanity/i, toilet: /toilet/i,
  exhaust: /exhaust/i, door: /door|closet/i, hardware: /door/i, storage: /closet/i, detector: /ceiling/i};
function dqPhotos(n){
  const re = DQ_PH[n.cat], L = (PHOTOS[n.room] || []).map((p, i) => ({p, i}));
  return re ? L.filter(x => re.test(x.p[0])).concat(L.filter(x => !re.test(x.p[0]))) : L;
}
const dqDiff = d => Math.abs(d) >= 1 ? (d > 0 ? `${money0(d)} more` : `${money0(-d)} less`) : '';
function dqRowHtml(n){
  const p = CATALOG[DQ.sku], cur = n.pick && CATALOG[n.pick], cost = buy(p, n.qty, offerOf(n, p)).total;
  return `<div class="dq-row" data-dq="focus" data-id="${n.id}" tabindex="0" role="button" aria-label="See ${esc(ROOM[n.room].name)} › ${esc(taskLabel(n))}">
    <input type="checkbox" data-dq="tog" data-id="${n.id}" aria-label="Add to ${esc(ROOM[n.room].name)} › ${esc(taskLabel(n))}">
    <span class="dq-t"><b>${esc(ROOM[n.room].name)} › ${esc(taskLabel(n))}</b><span>${qtyText(n.cat, n.qty)} · ${esc(installerOf(n))}</span>
      <span class="dq-now">${cur ? `<i>Selected</i>${shortName(cur)}` : '<em class="dq-none">Needs product</em>'}</span></span>
    <span class="dq-amt"><b class="num">${money(cost)}</b>${cur ? `<span>${dqDiff(cost - needTotal(n))}</span>` : ''}</span></div>`;
}
// The task's allowance (an option shares its task's).
const dqAllow = n => (n.of ? need(n.of) : n).allow || 0;
// The task in focus, as its own page would show it; the whole side scrolls.
function dqSideHtml(n){
  const cur = n.pick && CATALOG[n.pick], now = needTotal(n), a = dqAllow(n), tc = optsOf(n).reduce((x, o) => x + needTotal(o), 0) + (LABOR[tkOf(n)] || 0);
  const phs = dqPhotos(n), pi = Math.min(DQ.ph[n.id] || 0, Math.max(0, phs.length - 1)), ph = phs[pi];
  const notes = notesFor([n]).slice(-2);
  const img = i => ART.photo(ROOM[n.room].scene, i);
  return `<div class="dq-side-hd"><span class="k">${esc(ROOM[n.room].name)} · ${esc(installerOf(n))}</span><h3>${esc(n.task)}</h3>${n.opt ? `<span class="dq-opt">${esc(n.opt)}</span>` : ''}</div>
    ${ph ? `<div class="dq-ph"><img src="${img(ph.i)}" alt="${esc(ph.p[0])}"><span class="dq-ph-cap"><b>${esc(ph.p[0])}</b>${esc(ph.p[1])}</span>${phs.length > 1 ? `<span class="dq-ph-n">${pi + 1} / ${phs.length}</span>` : ''}</div>
      ${phs.length > 1 ? `<div class="dq-ths">${phs.map((x, k) => `<button type="button" class="${k === pi ? 'on' : ''}" data-dq="ph" data-i="${k}" title="${esc(x.p[0])}" aria-label="${esc(x.p[0])}"><img src="${img(x.i)}" alt=""></button>`).join('')}</div>` : ''}` : ''}
    <dl class="dq-facts">
      ${n.desc ? `<dt class="k">Description</dt><dd>${esc(n.desc)}</dd>` : ''}
      <dt class="k">Measurements</dt><dd><b>${qtyText(n.cat, n.qty)}</b>${n.src ? ` · ${esc(n.src)}` : ''}${n.fit ? ` · ${n.fit}″ opening` : ''}</dd>
      <dt class="k">Allowance</dt><dd>${a ? `<b class="num">${money0(a)}</b>${tc ? ` · task now ${money0(tc)}` : ''}${tc - a > .5 ? ' <span class="tag warn">Needs review</span>' : ''}` : '<span class="dq-nonote">Not set</span>'}</dd>
      <dt class="k">Selected product</dt><dd>${cur ? `<span class="dq-selp"><img src="${ART.product(cur)}" alt=""><span><b>${shortName(cur)}</b><span>${esc(cur.brand)} · <span class="num">${money(now)}</span></span></span></span>` : '<span class="dq-none">Needs product</span>'}</dd>
      <dt class="k">Notes</dt><dd class="dq-notes">${notes.length ? notes.map(x => `<span class="ctx-note"><span class="av sm" style="background:${TEAM[x.who] ? TEAM[x.who].tone : 'var(--sunken)'}">${esc(x.who)}</span><p>${esc(x.text)}</p></span>`).join('') : '<span class="dq-nonote">No notes yet.</span>'}</dd>
    </dl>`;
}
function drawDropAsk(){
  let host = document.getElementById('dropAsk');
  if(!DQ){ if(host) host.remove(); return; }
  if(!host){ host = document.createElement('div'); host.id = 'dropAsk'; document.body.appendChild(host); host.addEventListener('click', dqClick); host.addEventListener('keydown', dqKey); }
  const p = CATALOG[DQ.sku], ns = DQ.ids.map(need), k = ns.length, n0 = DQ.first;
  host.innerHTML = `<div class="dq-wrap" data-dq="close"><div class="dq" role="dialog" aria-modal="true" aria-labelledby="dqT" tabindex="-1" data-dq="stop">
    <div class="dq-main">
      <div class="dq-hd"><span class="dq-done">✓ Added <b>${shortName(p)}</b> to ${esc(ROOM[n0.room].name)} › ${esc(taskLabel(n0))}${DQ.was ? ` in place of ${shortName(DQ.was)}` : ''}</span>
        <h2 id="dqT">${k} other ${k === 1 ? 'task also needs' : 'tasks also need'} ${esc(CAT_INFO[p.cat].label.toLowerCase())}</h2></div>
      <div class="dq-lh"><button type="button" class="link" data-dq="all"></button><span class="dq-n"></span></div>
      <div class="dq-list">${ns.map(dqRowHtml).join('')}</div>
      <div class="dq-ft"><button type="button" class="btn pri" data-dq="add"></button></div>
    </div>
    <aside class="dq-side" aria-live="polite"></aside>
  </div></div>`;
  dqSide();
  host.querySelector('.dq').focus();
}
// The task in focus, on the right.
function dqSide(){
  const host = document.getElementById('dropAsk'); if(!host || !DQ) return;
  host.querySelector('.dq-side').innerHTML = dqSideHtml(need(DQ.focus));
  host.querySelector('.dq-side').scrollTop = 0;
  dqSync();
}
// Ticks and focus change only what they touch, so the list keeps its place.
function dqSync(){
  const host = document.getElementById('dropAsk'); if(!host || !DQ) return;
  const k = DQ.ids.length, m = DQ.sel.size;
  host.querySelectorAll('[data-dq="tog"]').forEach(i => { i.checked = DQ.sel.has(i.dataset.id); i.closest('.dq-row').classList.toggle('on', i.checked); });
  host.querySelectorAll('.dq-row').forEach(r => { const f = r.dataset.id === DQ.focus; r.classList.toggle('is-focus', f); r.setAttribute('aria-current', f ? 'true' : 'false'); });
  host.querySelector('[data-dq="all"]').textContent = m === k ? 'Clear all' : 'Select all';
  host.querySelector('.dq-n').textContent = `${m} of ${k} selected`;
  const b = host.querySelector('[data-dq="add"]');
  // One button: Done with nothing ticked (the dropped task keeps it alone), else Add.
  b.textContent = m ? `Add to ${m} more ${m === 1 ? 'task' : 'tasks'}` : 'Done';
}
function dqClick(e){
  const t = e.target.closest('[data-dq]'); if(!t || !DQ) return;
  const a = t.dataset.dq;
  if(a === 'tog'){
    if(t.checked) DQ.sel.add(t.dataset.id); else DQ.sel.delete(t.dataset.id);
    if(DQ.focus !== t.dataset.id){ DQ.focus = t.dataset.id; dqSide(); } else dqSync();
    return;
  }
  if(a === 'focus'){ if(DQ.focus !== t.dataset.id){ DQ.focus = t.dataset.id; dqSide(); } return; }
  if(a === 'ph'){ DQ.ph[DQ.focus] = +t.dataset.i; dqSide(); return; }
  if(a === 'all'){ DQ.sel = DQ.sel.size === DQ.ids.length ? new Set() : new Set(DQ.ids); dqSync(); return; }
  if(a === 'close' && t.classList.contains('dq-wrap') && e.target !== t) return;   // a click inside the box
  if(a === 'add' || a === 'close') dropAskDone(a === 'add');
}
// Up and down move through the list; Enter or Space on a task shows it.
function dqKey(e){
  if(!DQ) return;
  const r = e.target.closest && e.target.closest('.dq-row');
  if(r && (e.key === 'Enter' || e.key === ' ')){ e.preventDefault(); DQ.focus = r.dataset.id; dqSide(); return; }
  if(e.key === 'ArrowDown' || e.key === 'ArrowUp'){
    const i = DQ.ids.indexOf(DQ.focus) + (e.key === 'ArrowDown' ? 1 : -1);
    if(i < 0 || i >= DQ.ids.length) return;
    e.preventDefault(); DQ.focus = DQ.ids[i]; dqSide();
    const el = document.querySelector(`#dropAsk .dq-row[data-id="${DQ.focus}"]`); if(el) el.focus();
  }
}
function dropAskDone(add){
  if(!DQ) return;
  const {sku, ids, sel} = DQ, more = add ? ids.filter(id => sel.has(id)).map(need) : [];
  DQ = null; drawDropAsk();
  if(!more.length) return;
  const u = giveAll(sku, more); render();
  toast(`Added ${dbName(CATALOG[sku])} to ${more.length} more ${more.length === 1 ? 'task' : 'tasks'}.`, () => { u(); render(); });
}
document.addEventListener('keydown', e => { if(e.key === 'Escape' && DQ) dropAskDone(false); });
document.addEventListener('click', e => { if(S.fltOpen && !e.target.closest('.list-hd .af')){ S.fltOpen = false; renderList(); } });
document.addEventListener('click', e => { if(S.src.open && !e.target.closest('.src')){ S.src.open = false; renderWork(); } });
document.addEventListener('keydown', e => { if(e.key === 'Escape' && S.fltOpen){ S.fltOpen = false; renderList(); } });
function renderWork(resetScroll){
  const el = $('#work'), main = el.querySelector('.work-main'), keep = resetScroll ? 0 : (main ? main.scrollTop : 0);
  const needs = selNeeds();
  const hadBoard = el.classList.contains('has-board');   // only slide the board in when it first opens
  const anyBoard = S.ref.open.length > 0 || !!S.ref.page || !!S.pair;
  el.classList.toggle('has-board', anyBoard);
  el.classList.toggle('full', anyBoard && S.ref.full);
  el.classList.toggle('board-left', anyBoard && S.ref.side === 'left');
  el.style.setProperty('--bw', S.ref.w + 'px');
  const body = S.sel.kind === 'room' ? roomHtml(needs)
    : `${headHtml(needs)}${bannersHtml(needs)}${ctxHtml(needs)}${pickHtml(needs)}${toolsHtml(needs)}<div class="grid" id="grid">${gridHtml(needs)}</div>`;
  const ps = curPanes(), shopT = ps.length === 2 && ps.includes('shop') ? `<div class="pane-hd shelf-t"><h2 class="pane-t">Shop</h2>${srcHtml()}</div>` : S.ref.full || S.pair ? '' : `<div class="src-pin">${srcHtml()}</div>`;
  el.innerHTML = `<div class="work-main">${shopT}${body}</div>
    ${boardHtml(tabRefOn() ? NEEDS : needs)}`;
  renderDetail(S.detailFor ? [need(S.detailFor)] : needs);
  el.querySelector('.work-main').scrollTop = keep;
  if(hadBoard){ const bd = el.querySelector('.board'); if(bd) bd.classList.add('still'); }
  if(S.ref.flash){ const sec = el.querySelector(`[data-sec="${S.ref.flash}"]`); if(sec) sec.scrollIntoView({block: 'nearest'}); S.ref.flash = null; }
  if(S.ref.page === 'scope'){ const t = el.querySelector('.pg-task.on'); if(t) t.scrollIntoView({block: 'nearest'}); }
  renderBar();   // a Media / Floorplan tab stays lit only while it fills the page
  el.querySelectorAll('.rcar').forEach(c => { const tr = c.querySelector('.rcar-track'); tr.style.scrollBehavior = 'auto'; tr.scrollLeft = S.car[c.dataset.car] || 0; tr.style.scrollBehavior = ''; carSync(c); });
}
/* Delivery & pickup, for the whole job: KaiWeb's control, top right of Shop. */
const PIN = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 15s5-4.6 5-8.5A5 5 0 0 0 3 6.5C3 10.4 8 15 8 15z" fill="none" stroke="currentColor" stroke-width="1.3"/><circle cx="8" cy="6.5" r="1.8" fill="none" stroke="currentColor" stroke-width="1.3"/></svg>';
function retName(){ const r = S.src.ret; return r === 'all' ? 'All stores' : r.length === 1 ? SUPPLIERS[r[0]].name : `${r.length} stores`; }
function srcHtml(){
  const c = S.src, dOn = shipOn(), pOn = pickOn();
  const ck = (attr, on, txt, cls) => `<label class="src-opt${cls ? ' ' + cls : ''}"><input type="checkbox" ${attr}${on ? ' checked' : ''}><span>${txt}</span></label>`;
  const inp = (k, ph, lbl) => `<span class="src-in">${IC.search}<input type="text" data-src="${k}" value="${esc(c[k])}" placeholder="${ph}" aria-label="${lbl}" autocomplete="off"></span>`;
  return `<div class="src${c.open ? ' open' : ''}">
    <button type="button" class="src-chip" data-act="src-open" aria-expanded="${c.open}" aria-haspopup="dialog" title="${esc([dOn ? 'Deliver to ' + c.addr : '', pOn ? 'Pick up near ' + c.near : ''].filter(Boolean).join(' · '))} · set once for the job">${PIN}<span>${dOn && pOn ? 'Delivery &amp; pickup' : dOn ? 'Delivery' : 'Pickup'} · ${esc(retName())}</span><svg class="af-caret" viewBox="0 0 12 12" aria-hidden="true"><path d="${c.open ? 'M2.5 7.5L6 4l3.5 3.5' : 'M2.5 4.5L6 8l3.5-3.5'}"/></svg></button>
    ${c.open ? `<div class="src-pop" role="dialog" aria-label="Delivery and pickup for this job">
      <section><span class="k">Show products from</span>
        ${ck('data-src="ret" value="all"', c.ret === 'all', 'All stores')}
        ${SUP_KEYS.map(k => ck(`data-src="ret" value="${k}"`, c.ret !== 'all' && c.ret.includes(k), esc(SUPPLIERS[k].name))).join('')}</section>
      <section class="${dOn ? '' : 'off'}">${ck('data-src="mode" value="ship"', dOn, '<b>Delivery</b>', 'big')}
        ${dOn ? `<span class="k">Deliver to</span>${inp('addr', 'Search by address', 'Delivery address')}` : ''}</section>
      <section class="${pOn ? '' : 'off'}">${ck('data-src="mode" value="pickup"', pOn, '<b>Pickup</b>', 'big')}
        ${pOn ? `<span class="k">Pick up near</span>${inp('near', 'City, address or ZIP', 'Pick up near')}
          <span class="k">Stores</span>${SUP_KEYS.filter(supOk).map(k => `<div class="src-ret"><b>${esc(SUPPLIERS[k].name)}</b>${STORE_OPTS[k].map(([nm], i) => `<label class="src-opt"><input type="radio" name="src-${k}" data-src="store" data-sup="${k}" value="${i}"${(c.store[k] || 0) === i ? ' checked' : ''}><span>${esc(nm)}</span><small>${miFor(k, i)} mi</small></label>`).join('')}</div>`).join('')}` : ''}</section>
      <p class="src-ft">Applies to the whole job: every shelf, product and order.</p>
    </div>` : ''}
  </div>`;
}
function srcSet(t){
  const c = S.src, k = t.dataset.src;
  if(k === 'ret'){
    const v = t.value; let r = c.ret === 'all' ? [] : c.ret.slice();
    r = v === 'all' ? [] : r.includes(v) ? r.filter(x => x !== v) : r.concat(v);
    c.ret = !r.length || r.length === SUP_KEYS.length ? 'all' : SUP_KEYS.filter(x => r.includes(x));   // none, or every one, is all
  }
  if(k === 'mode'){   // unticking the only way left switches to the other, so one is always on
    const has = {ship: shipOn(), pickup: pickOn()}; has[t.value] = t.checked;
    if(!has.ship && !has.pickup) has[t.value === 'ship' ? 'pickup' : 'ship'] = true;
    c.mode = has.ship && has.pickup ? 'both' : has.ship ? 'ship' : 'pickup';
    SUP_KEYS.forEach(x => { S.ful[x] = c.mode === 'ship' ? 'delivery' : c.mode === 'pickup' ? 'pickup' : FUL0[x]; }); S.lineFul = {}; S.ordFul = {};
  }
  if(k === 'store') c.store[t.dataset.sup] = +t.value;
  if(k === 'addr' || k === 'near') c[k] = t.value.trim() || (k === 'addr' ? PROP.addr : PROP.zip);
  applyStores(); render();
}
/* Carousel: arrows page by what fits; the count and arrows follow the scroll. */
function carGeo(c){
  const tr = c.querySelector('.rcar-track'), it = tr.firstElementChild;
  const per = +getComputedStyle(c).getPropertyValue('--per') || 3;
  const step = it ? it.getBoundingClientRect().width + parseFloat(getComputedStyle(tr).columnGap || 12) : 1;
  return {tr, per, step, total: tr.children.length};
}
function carSync(c){
  const {tr, per, step, total} = carGeo(c);
  const first = Math.min(total, Math.round(tr.scrollLeft / step) + 1), last = Math.min(total, first + per - 1);
  c.querySelector('.rcar-n').textContent = total ? `${first}–${last} of ${total}` : 'Nothing else fits';
  const [prev, next] = c.querySelectorAll('.rcar-b');
  prev.disabled = first <= 1; next.disabled = last >= total;
  c.classList.toggle('no-pager', total <= per);
}
document.addEventListener('scroll', e => {
  const tr = e.target.closest && e.target.closest('.rcar-track'); if(!tr) return;
  const c = tr.closest('.rcar'); S.car[c.dataset.car] = tr.scrollLeft; carSync(c);
}, true);
function renderGridOnly(){
  const needs = selNeeds();
  $('#grid').innerHTML = gridHtml(needs);
}

/* ═════════════ REVIEW & ORDER ═════════════ */
/* ── Review & order: who buys it, who installs it, where the order came from,
   when it's needed. Mock data; the amounts are the same math as everywhere. */
const ORG_ACCT = JOB.name;                                   // your org's orders bill the job's Kai Pro account
const ORG = 'Your Org';                                      // the buyer name for your own team's orders
const BUYER = {paint: 'FloorWorks'};                         // the painters buy their own paint; your org buys the rest
const buyerOf = n => BUYER[n.cat] || ORG;
const INSTALLER = {cabinet: 'Apex Carpentry', door: 'Apex Carpentry', hardware: 'Apex Carpentry', storage: 'Apex Carpentry', blinds: 'Apex Carpentry',
  counter: 'Stone Bros', tile: 'Stone Bros', shower: 'Stone Bros', floor: 'FloorWorks', paint: 'FloorWorks',
  lighting: 'BrightElectric', ceilingfan: 'BrightElectric', detector: 'BrightElectric', exhaust: 'BrightElectric', appliance: 'BrightElectric'};
const installerOf = n => INSTALLER[n.cat] || 'Unassigned';
const orderSrc = sup => sup === 'fer' ? 'Change Order 1' : 'Original scope';   // the bath fixtures came in with Change Order 1
const NEED_DAYS = {floor: 5, cabinet: 8, door: 9, vanity: 9, shower: 7, paint: 10, exhaust: 11, toilet: 12, lighting: 12, ceilingfan: 12,
  counter: 14, tile: 16, storage: 15, appliance: 18, hardware: 20, blinds: 20, detector: 20};
const neededBy = n => { const d = new Date(TODAY); d.setDate(d.getDate() + (NEED_DAYS[n.cat] || 14)); return d; };
const buyerCode = b => b === ORG ? '' : '-' + b.replace(/[^A-Z]/g, '').slice(0, 3);
function orderLines(){
  const map = new Map();
  // A line swapped at pickup stays on its order as ordered, with the swap noted.
  NEEDS.flatMap(withMore).filter(n => n.pick).forEach(n => {
    const p = CATALOG[n.swap ? n.swap.from : n.pick], o = offerOf(n, p), key = o.sup + '|' + p.sku;
    if(!map.has(key)) map.set(key, {key, p, o, sup: o.sup, buyer: buyerOf(n), needs: []});
    map.get(key).needs.push(n);
  });
  return [...map.values()].map(L => {
    L.qty = L.needs.reduce((a, n) => a + n.qty, 0);
    L.b = buy(L.p, L.qty, L.o);
    L.separate = L.needs.reduce((a, n) => a + buy(L.p, n.qty, L.o).total, 0);
    L.ord = L.sup + '|' + L.buyer;   // one order per supplier and buyer
    const pickup = L.pickup = (S.lineFul[L.key] || S.ordFul[L.ord] || S.ful[L.sup]) === 'pickup';
    L.arrive = pickup ? (L.o.stock >= L.b.n ? TOMORROW : L.o.ship) : L.o.ship;
    L.how = pickup ? (L.o.stock >= L.b.n ? 'Ready for pickup' : 'Ships to the store') : 'Delivery to the job';
    L.backups = [...new Set(L.needs.flatMap(n => n.backups))];
    L.swap = L.needs.find(n => n.swap)?.swap || null;
    L.need = new Date(Math.min(...L.needs.map(n => +neededBy(n))));
    L.late = L.arrive > L.need;
    return L;
  });
}
/* Before you order: the team's substitution policy first (information), then
   one line per thing worth a look, each "Label: count", what it is, and where
   to go. None of them stop you from submitting, and the heading says so. */
function checksHtml(lines){
  const todo = NEEDS.filter(n => !n.pick), late = lines.filter(L => L.late);
  const over = NEEDS.filter(isOver), overRooms = ROOMS.filter(r => roomCost(r.id).over);
  const cnt = (k, w) => `${k} ${w}${k === 1 ? '' : 's'}`, short = p => esc(p.name.split(/,|\(/)[0].trim());
  const md = d => d.toLocaleDateString('en-US', {month: 'short', day: 'numeric'});
  const row = (kind, label, count, detail, act) => `<div class="bo-row ${kind}"><span class="bo-ic">${kind === 'info' ? '↻' : kind === 'ok' ? '✓' : '!'}</span>
    <span class="bo-t"><b>${label}${count ? ':' : ''}</b>${count ? ` ${count}` : ''}</span><span class="bo-d">${detail}</span><span class="bo-a">${act || ''}</span></div>`;
  const btn = (act, t, attrs) => `<button class="btn sm" data-act="${act}"${attrs || ''}>${t}</button>`;
  const rows = [row('info', 'Substitution policy', '', 'Only products within template are pre-approved')];
  if(false && late.length) rows.push(row('warn', 'Arrives late', cnt(late.length, 'item'), late.map(L => `${short(L.p)}: arrives ${md(L.arrive)}, needed ${md(L.need)}`).join(' · '), btn('rv-view', 'View', ` data-key="${late[0].key}"`)));
  if(over.length || overRooms.length) rows.push(row('warn', 'Over allowance', [over.length ? cnt(over.length, 'task') : '', overRooms.length ? cnt(overRooms.length, 'department') : ''].filter(Boolean).join(', '),
    over.map(n => `${esc(n.task)} ${money0(overBy(n))} over`).concat(overRooms.map(r => `${esc(r.name)} ${money0(roomCost(r.id).over)} over`)).join(' · '), btn('fix-review', 'Review')));
  if(false && todo.length) rows.push(row('warn', 'Missing products', cnt(todo.length, 'task'), todo.map(n => esc(taskLabel(n))).join(', '), btn('fix-todo', 'Choose now')));
  if(rows.length === 1) rows.push(row('ok', 'All clear', '', 'Nothing else to check'));
  return `<div class="checks bo">${rows.join('')}</div>`;
}
/* An order, laid out like the purchase order it becomes (the PO document in
   Shop with Kai · Layout): who it's from and for, its facts on the right, then
   a table of items in bands with subtotals. It isn't a PO yet, so it says so,
   and it keeps what a cart needs: pickup or delivery, Remove, the photos. */
function orderCard(ord, lines){
  const sup = lines[0].sup, buyer = lines[0].buyer, s = SUPPLIERS[sup], tot = lines.reduce((a, L) => a + L.b.total, 0);
  const np = lines.filter(L => L.pickup).length, nd = lines.length - np, pickup = np >= nd, mixed = np && nd;
  const edit = !S.placed, both = S.src.mode === 'both';
  const lineHow = L => edit && both ? `<div class="seg" role="group" aria-label="Pickup or delivery for this line"><button type="button" class="${L.pickup ? 'on' : ''}" data-act="line-ful" data-key="${L.key}" data-v="pickup" aria-pressed="${L.pickup}">Pickup</button><button type="button" class="${L.pickup ? '' : 'on'}" data-act="line-ful" data-key="${L.key}" data-v="delivery" aria-pressed="${!L.pickup}">Delivery</button></div>` : `<span class="how-t">${L.pickup ? 'Pickup' : 'Delivery'}</span>`;
  // The tasks a line is for: "For Kitchen › Cabinets · 14 LF", with the task's contractor in the
  // Contractor column on the same row. Each opens in Scope. Long lists fold to two.
  const tasks = L => {
    const open = S.rvMore.has(L.key), many = L.needs.length > 3, show = many && !open ? L.needs.slice(0, 2) : L.needs;
    return `<span class="ots">${show.map(n => `<button type="button" class="ot" data-act="rv-task" data-id="${n.xof || n.id}" title="Open ${esc(n.task)} in Scope"><span class="ot-t"><i>For</i><span class="ot-n"><u>${esc(ROOM[n.room].name)} › ${esc(taskLabel(n))}</u> <span class="ot-q">· ${qtyText(n.cat, n.qty)}</span></span></span><span class="ot-c">${esc(installerOf(n))}</span></button>`).join('')}${many ? `<button type="button" class="ot-more" data-act="rv-more" data-key="${L.key}">${open ? 'Show fewer' : `+${L.needs.length - 2} more`}</button>` : ''}</span>`;
  };
  // The out-of-stock rule shows only where a line has its own; the team's is the default and needs no word.
  const own = L => L.needs.some(n => n.sub);
  const md = d => d.toLocaleDateString('en-US', {month: 'short', day: 'numeric'});
  const unit = p => perUnit(p) === 'each' ? 'ea' : perUnit(p);
  const row = L => `<div class="oline${L.late ? ' late' : ''}" data-key="${L.key}">
      <img src="${ART.product(L.p)}" alt="">
      <span class="tx"><b>${esc(L.p.name)}</b><span class="o-meta">SKU ${esc(L.p.sku)} · Needed by ${md(L.need)}</span>${tasks(L)}
        ${L.late ? `<span class="late-ln">! <b>Arrives after it’s needed</b> · arrives ${wmd(L.arrive)} · needed by ${wmd(L.need)}</span>` : ''}
        ${L.swap ? `<span class="bk">Swapped at pickup → ${esc(CATALOG[L.swap.to].name)}${L.swap.co ? ' · in the next change order' : L.swap.pre ? ' · pre-approved substitution' : ' · no change order'}</span>`
          : own(L) ? `<span class="own-ln">${subLineHtml(L.needs, 'If it’s out: ')}</span>` : ''}</span>
      <span class="q"><b>${L.b.label}</b>${L.b.sub ? `<i>${L.b.sub}</i>` : ''}</span>
      <span class="up"><b class="num">${money(L.o.price)}</b><i> / ${unit(L.p)}</i></span>
      <span class="how">${lineHow(L)}</span>
      <span class="a"><b class="num">${money(L.b.total)}</b>${edit ? `${L.swap || own(L) ? '' : `<button type="button" class="ln-q" data-act="sub-open" data-ids="${L.needs.map(n => n.id).join(',')}" title="What happens if it's out of stock: ${esc(SUB_OPTS[SUB_TEAM].short.toLowerCase())}, the team's setting">If it’s out…</button>`}<button type="button" class="ln-rm" data-act="line-rm" data-key="${L.key}" title="Take ${esc(L.p.name.split(/,|\(/)[0].trim())} off the list${L.needs.length > 1 ? ` in ${L.needs.length} rooms` : ''}">${TRASH}Remove</button>` : ''}</span></div>`;
  const groups = new Map();
  lines.slice().sort((a, b) => a.arrive - b.arrive).forEach(L => { const k = L.how + '|' + L.arrive.toDateString(); if(!groups.has(k)) groups.set(k, {L0: L, items: []}); groups.get(k).items.push(L); });
  const items = [...groups.values()].map(g => `<div class="when"><b>${esc(g.L0.how)}</b><span>${rel(g.L0.arrive) === 'tomorrow' ? 'Tomorrow, 7 AM' : wmd(g.L0.arrive)}</span><span>· ${g.items.length} ${g.items.length === 1 ? 'item' : 'items'}</span><span class="when-amt num">${money(g.items.reduce((a, L) => a + L.b.total, 0))}</span></div>${g.items.map(row).join('')}`).join('');
  const po = `PO-${JOB.id.split('-')[1]}-${sup.toUpperCase()}${buyerCode(buyer)}`;
  const status = S.placed ? 'Submitted' : 'Not submitted yet';   // and until then, Buyer / Bill to rather than Bought by / Billed to
  const placedTrack = S.placed ? `<div class="track"><span class="done">Submitted</span><span>${pickup ? 'Ready tomorrow 7 AM' : 'Shipped'}</span><span>${pickup ? 'Picked up' : 'Delivered'}</span></div>` : '';
  return `<div class="order" id="ord-${ord.replace('|', '-').replace(/\W/g, '')}" data-ord="${ord}">
    <div class="order-hd po-hd">
      <div class="po-l"><span class="k">${S.placed ? 'Order' : 'Order · not submitted yet'}</span>
        <h3><span class="mono" style="background:${s.tone}">${s.mono}</span>${esc(s.name)}</h3>
        <p>${S.placed ? 'Bought by' : 'Buyer:'} <b>${esc(buyer)}</b> · ${S.placed ? 'Billed to' : 'Bill to'}: ${buyer === ORG ? `${esc(ORG_ACCT)} account` : `${esc(buyer)}’s account`}</p>${placedTrack}</div>
      <dl class="po-meta${S.placed ? ' n3' : ''}">
        <div><dt>Status</dt><dd><span class="po-st${S.placed ? ' ok' : ''}"><i></i>${status}</span></dd></div>
        ${S.placed ? `<div><dt>PO number</dt><dd>${po}<small>Order #${4400000 + JOB.id.length * 1371 + sup.charCodeAt(0) * 97 + buyer.length}</small></dd></div>` : ''}<!-- no PO number until it's submitted: it would read as already sent -->
        <div><dt>Amount</dt><dd><b class="num">${money(tot)}</b><small>${lines.length} ${lines.length === 1 ? 'line' : 'lines'} · before tax</small></dd></div>
      </dl></div>
    <div class="ful">${!edit || !both ? '' : `<div class="seg" title="For every line in this order"><button type="button" class="${!mixed && pickup ? 'on' : ''}" data-act="ful" data-ord="${ord}" data-v="pickup">Pickup</button><button type="button" class="${!mixed && !pickup ? 'on' : ''}" data-act="ful" data-ord="${ord}" data-v="delivery">Delivery</button></div>`}
      <span class="tx">${mixed ? `<b>Pickup and delivery</b><span>${np} ${np === 1 ? 'line' : 'lines'} for pickup at ${esc(s.store)} · ${nd} delivered to ${esc(shortAddr(S.src.addr))}</span>` : pickup ? `<b>Pickup at ${esc(s.store)}</b><span>${s.mi} mi from the job</span>` : `<b>Delivery to ${esc(shortAddr(S.src.addr))}</b><span>Free over $45</span>`}</span></div>
    <div class="po-cols"><span>Item · for task</span><span>Contractor</span><span class="r">Qty</span><span class="r">Unit price</span><span>${edit && both ? 'Pickup or delivery' : 'Gets there by'}</span><span class="r">Amount</span></div>
    ${items}</div>`;
}
/* ── Timeline at the top of Review ──
   One row per purchase: a store, one way of getting it (pickup, ships to the
   store, delivery), one arrival day. Each row runs from today (the yellow dot:
   submitting orders today) to the day it arrives (truck or store), then the
   buffer before the tasks it's for need it (the photos, on each task's
   Needed-by day). A hollow circle marks the latest day you could still order
   and keep the buffer. Red means it arrives after a task needs it. The top row
   counts the tasks that need materials each day. The left panel picks what
   the timeline shows: everything, a type, or one task. */
const BUFFER = 2;   // days a product should be in hand before its task needs it
const dayN = d => Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - TODAY) / 864e5);
const dayAt = i => { const d = new Date(TODAY); d.setDate(d.getDate() + i); return d; };
const TL_IC = {
  site: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 13.6 9.2 7.4"/><path d="M7.4 5.6 10 3l1.4-.4 2 2-.5 1.3-1.6-.4-1.6 1.6z" fill="currentColor"/><path d="M13 13.6 7.2 7.8"/><path d="M7.2 7.8a2.7 2.7 0 0 1-3.6-3.5l1.7 1.7 1.2-.3.3-1.2-1.7-1.7a2.7 2.7 0 0 1 3.5 3.6"/></svg>',
  walk: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="2.6" r="1.3" fill="currentColor" stroke="none"/><path d="M8.6 5.2 7 9.4l2.6 2.2.8 3M7 9.4 5.6 14.4M8.6 5.2l2.4 2.4 2 .4M8.6 5.2 6 6.4 5 8.6"/></svg>',
  truck: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"><path d="M1.5 4h8v7h-8zM9.5 6.5h3l2 2.5v2h-5z"/><circle cx="4.5" cy="12" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/></svg>',
  store: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"><path d="M2 6.5 3.2 2.5h9.6L14 6.5M2.8 6.5v7h10.4v-7M2 6.5h12M6.2 13.5v-4h3.6v4"/></svg>',
  cart: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M1.5 2h2l1.6 8h7.6l1.6-5.6H4.3"/><circle cx="6" cy="13" r="1.1" fill="currentColor"/><circle cx="12" cy="13" r="1.1" fill="currentColor"/></svg>'
};
const inSel = n => {
  const sl = S.sel;
  if(sl.kind === 'need') return n.id === sl.id || n.xof === sl.id || n.of === sl.id;
  if(sl.kind === 'type') return n.cat === sl.cat;
  return sl.room === 'all' || n.room === sl.room;
};
const selAll = () => S.sel.kind === 'room' && S.sel.room === 'all';
function selName(){
  const sl = S.sel;
  if(sl.kind === 'need'){ const n = need(sl.id); return n ? `${esc(taskLabel(n))} · ${esc(ROOM[n.room].name)}` : ''; }
  if(sl.kind === 'type') return esc(CAT_INFO[sl.cat].label);
  return sl.room === 'all' ? '' : esc(ROOM[sl.room].name);
}
/* Hovering a photo or a day's task count opens a card: the day it's needed,
   each task with its product and price, and how it gets there (red if late). */
const TL_POP = {};
function popHtml(d, items, foot, bad){
  return `<div class="tp-hd">Needed ${longDay(dayAt(d))}</div>${items.map(it => `<div class="tp-row">${it.p ? `<img src="${ART.product(it.p)}" alt="">` : '<span class="tp-none"></span>'}<span class="tp-tx"><b>${esc(taskLabel(it.n))} · ${esc(ROOM[it.n.room].name)}</b><i>${esc(it.sub)}</i></span><span class="tp-amt num">${it.amt == null ? '' : money0(it.amt)}</span></div>`).join('')}${foot ? `<div class="tp-ft${bad ? ' bad' : ''}">${esc(foot)}</div>` : ''}`;
}
(() => {
  let pop = null;
  const hide = () => { if(pop) pop.hidden = true; };
  document.addEventListener('mouseover', e => {
    const t = e.target.closest && e.target.closest('[data-pop]'); if(!t){ hide(); return; }
    const html = TL_POP[t.dataset.pop]; if(!html) return;
    if(!pop){ pop = document.createElement('div'); pop.className = 'tl-pop'; document.body.appendChild(pop); }
    pop.innerHTML = html; pop.hidden = false;
    const r = t.getBoundingClientRect(), w = pop.offsetWidth, h = pop.offsetHeight;
    pop.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.left + r.width / 2 - 40)) + 'px';
    pop.style.top = (r.bottom + 8 + h > innerHeight - 8 ? r.top - h - 8 : r.bottom + 8) + 'px';
  });
  document.addEventListener('scroll', hide, true);
})();
/* Hovering anywhere over the days drops a line through that date across every
   row, and lights the date up in the header. */
document.addEventListener('mousemove', e => {
  const box = e.target.closest && e.target.closest('.tg-box');
  document.querySelectorAll('.tg-box').forEach(b => { if(b !== box){ const c = b.querySelector('.tg-cross'); if(c) c.hidden = true; b.querySelectorAll('.tg-days .hov').forEach(h => h.classList.remove('hov')); } });
  if(!box) return;
  const tr = box.querySelector('.tg-overlay .tg-track'), c = box.querySelector('.tg-cross'), N = +box.dataset.n, r = tr.getBoundingClientRect();
  const hd = box.querySelector('.tg-days').getBoundingClientRect(), inX = e.clientX >= r.left && e.clientX < r.right;
  const i = inX ? Math.floor((e.clientX - r.left) / r.width * N) : -1;
  c.hidden = i < 0; if(i >= 0) c.style.left = ((i + .5) / N * 100) + '%';
  box.querySelectorAll('.tg-days > span').forEach(sp => sp.classList.toggle('hov', +sp.dataset.i === i));
});
document.addEventListener('mouseleave', () => document.querySelectorAll('.tg-cross').forEach(c => { c.hidden = true; }));
/* Linked hover: a timeline row and the purchases holding the same lines light
   up together, whichever one the pointer is on. Inside an open purchase, the
   matching item rows light up too. */
(() => {
  let cur = null;
  const clear = () => document.querySelectorAll('#rvScroll .is-linked').forEach(x => x.classList.remove('is-linked'));
  document.addEventListener('mouseover', e => {
    const src = e.target.closest && e.target.closest('#rvScroll .tg-row[data-keys], #rvScroll .pr[data-keys]');
    if(src === cur) return; cur = src; clear(); if(!src) return;
    const ks = new Set(src.dataset.keys.split(',')), hit = el => el.dataset.keys.split(',').some(k => ks.has(k));
    const other = src.classList.contains('pr') ? '.tg-row[data-keys]' : '.pr[data-keys]';
    src.classList.add('is-linked');
    document.querySelectorAll('#rvScroll ' + other).forEach(el => { if(hit(el)) el.classList.add('is-linked'); });
    document.querySelectorAll('#rvScroll .mline[data-key]').forEach(el => { if(ks.has(el.dataset.key)) el.classList.add('is-linked'); });
  });
})();
const tripIc = (pickup, ship) => { const [a, b] = !pickup ? ['truck', 'site'] : ship ? ['truck', 'store'] : ['walk', 'store'];
  return `<span class="ic2">${TL_IC[a]}<em>→</em>${TL_IC[b]}</span>`; };
function tgSync(){
  const b = document.querySelector('.tg-bwrap'), h = document.querySelector('.tg-hwrap'), box = document.querySelector('.tg-box'); if(!b || !h) return;
  box.style.setProperty('--vis', b.clientWidth + 'px'); h.scrollLeft = b.scrollLeft;
}
document.addEventListener('scroll', e => { if(e.target && e.target.classList && e.target.classList.contains('tg-bwrap')){ S.tlScroll = e.target.scrollLeft; tgSync(); } }, true);
window.addEventListener('resize', tgSync);
/* Filters for the timeline: by contractor (whose tasks the items are for) and
   by how it gets there. Pick any number in each; none picked means all. */
const tlOk = n => inSel(n) && (!S.tlCon.size || S.tlCon.has(installerOf(n)));
function tlFilters(){
  const cons = [...new Set(NEEDS.map(installerOf))].sort((a, b) => (a === 'Unassigned') - (b === 'Unassigned') || a.localeCompare(b));
  const meth = [['store', 'In store', tripIc(true, false)], ['pickup', 'Deliver to store', tripIc(true, true)], ['delivery', 'Delivery', tripIc(false)]];
  // two compact dropdowns; each lists checkboxes, and its button says what's picked
  const dd = (key, label, set, opts, act) => {
    const open = S.tfOpen === key, n = set.size, shown = !n ? 'All' : n === 1 ? (opts.find(o => o[0] === [...set][0]) || [])[1] : `${n} picked`;
    return `<div class="tf-dd${open ? ' open' : ''}${n ? ' on' : ''}"><button type="button" class="tf-btn" data-act="tf-open" data-v="${key}" aria-haspopup="menu" aria-expanded="${open}"><span class="tf-k">${label}</span><b>${esc(shown)}</b><svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5 6 7.5l3-3" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
      ${open ? `<div class="tf-menu" role="menu">${opts.map(([v, l, ic]) => `<button type="button" class="tf-opt${set.has(v) ? ' on' : ''}" role="menuitemcheckbox" aria-checked="${set.has(v)}" data-act="${act}" data-v="${esc(v)}"><i class="tf-cb">${set.has(v) ? '✓' : ''}</i>${ic || ''}<span>${esc(l)}</span></button>`).join('')}
        ${n ? `<button type="button" class="tf-opt tf-all" data-act="tf-clear1" data-v="${key}">Show all</button>` : ''}</div>` : ''}</div>`;
  };
  return `<div class="tg-filt">${dd('con', 'Contractor', S.tlCon, cons.map(c => [c, c]), 'tl-con')}${dd('meth', 'Gets there', S.tlMeth, meth, 'tl-meth')}</div>`;
}
// a click outside an open filter menu closes it
document.addEventListener('click', e => { if(S.tfOpen && !e.target.closest('.tf-dd')){ S.tfOpen = null; if(S.screen === 'review') renderReview(); } }, true);
function timelineHtml(lines){
  setTimeout(() => { const b = document.querySelector('.tg-bwrap'); if(b) b.scrollLeft = S.tlScroll || 0; tgSync(); }, 0);
  /* Styled after the Project Review timeline: hairline rows, one ink line for
     today, dashed week lines, solid segmented bars, mono caps for labels.
     Rows are grouped Order today / Can wait. Each bar runs from today to
     the day it arrives ("on its way"), then the buffer before the first task
     needs it (lime), or a red stretch for the days it's late. Photos sit on
     each task's Needed-by day; hover for the details. */
  /* Merged Timeline: each row is one purchase — the same purchases the order
     list had (store · how · buyer), under the same deadline headings. A row
     opens into its items, one sub-row each, on the same dates. */
  const G = groupsOf(lines), R = [];
  G.forEach((g, gi) => g.rows.forEach(p => {
    if(S.tlMeth.size && !S.tlMeth.has(p.kind)) return;
    const ls = p.lines.filter(L => L.needs.some(tlOk)); if(!ls.length) return;
    const items = ls.flatMap(L => L.needs.filter(tlOk).map(n => ({n, L, d: dayN(neededBy(n))})));
    const store = p.kind === 'store', arr = Math.max(...ls.map(L => dayN(L.arrive)));
    const r = {gi, pk: p.k, kind: p.kind, buyer: p.buyer, sup: p.sup, pickup: p.kind !== 'delivery', how: p.kind === 'pickup' ? 'Ships to the store' : store ? 'Ready for pickup' : 'Delivery to the job', lines: ls, items, store};
    r.lead = store ? 0 : arr; r.arrive = r.lead;
    r.need = Math.min(...items.map(x => x.d)); r.last = Math.max(...items.map(x => x.d));
    r.orderBy = r.need - BUFFER - r.lead; r.late = r.arrive > r.need;
    r.amt = S.tlCon.size ? items.reduce((a, it) => a + buy(it.L.p, it.n.qty, it.L.o).total, 0) : ls.reduce((a, L) => a + L.b.total, 0);   // only that contractor's items
    R.push(r);
  }));
  const tasks = NEEDS.filter(n => !n.of && tlOk(n));
  // Zoom: Month shows up to five weeks at once; Week shows seven days, wide enough to read. Arrows page through.
  const T = Math.max(21, ...R.map(r => Math.max(r.last, r.arrive)), ...tasks.map(n => dayN(neededBy(n)))) + 2;
  // Horizontal scroll: the whole range is drawn, each day a fixed width (Week zooms in); the dates scroll sideways.
  const week = S.tlZoom === 'week', N = T, a0 = 0, DW = week ? 110 : 42;
  const ST = S.tlStyle === 'fat' ? 'fat' : 'grid';   // trying two displays: Grid (filled day boxes, the default) and Big bars
  const days = Array.from({length: N}, (_, i) => dayAt(a0 + i));
  const pc = v => (v / N * 100).toFixed(3) + '%', x = i => pc(i - a0 + .5);
  const span = (a, b) => `left:${x(a)};width:${pc(Math.max(b - a, 0))}`;
  // the grid behind every row: a dashed line each Monday, the ink line for today
  const grid = `<div class="tg-grid" aria-hidden="true">${days.map((d, i) => d.getDay() === 1 ? `<span style="left:${pc(i)}"></span>` : '').join('')}${a0 === 0 ? `<b style="left:${x(0)}"></b>` : ''}</div>`;
  const head = `<div class="tg-hd"><div class="tg-lab"></div><div class="tg-days">${days.map((d, i) => { const j = a0 + i, wd = d.toLocaleDateString('en-US', {weekday: 'short'});
      return `<span class="${j === 0 ? 'now' : ''}${d.getDay() === 1 ? ' mon' : ''}" data-i="${i}" style="left:${x(j)}">${j === 0 ? `<em>Today${week ? ` · ${wd}` : ''}</em>` : week ? `<em>${wd}${d.getDate() === 1 || i === 0 ? ` · ${d.toLocaleDateString('en-US', {month: 'short'})}` : ''}</em>` : d.getDate() === 1 || i === 0 ? `<em>${d.toLocaleDateString('en-US', {month: 'short'})}</em>` : ''}<b>${d.getDate()}</b></span>`; }).join('')}</div></div>`;
  // daily tasks as a quiet bar chart: how many tasks need materials that day
  const byDay = new Map(); tasks.forEach(n => { const d = dayN(neededBy(n)); if(!byDay.has(d)) byDay.set(d, []); byDay.get(d).push(n); });
  const most = Math.max(1, ...[...byDay.values()].map(v => v.length));
  const tline = [...byDay.entries()].map(([d, ns]) => { const none = ns.filter(n => !n.pick).length, h = k => Math.round(4 + k / most * 22);
    const id = 'tk' + d; TL_POP[id] = popHtml(d, ns.map(n => { const p = n.pick && CATALOG[n.pick]; return {n, p, sub: p ? `${p.name} · ${qtyText(n.cat, n.qty)}` : 'No product yet', amt: p ? buy(p, n.qty, offerOf(n, p)).total : null}; }), none ? `${none} without a product yet` : '', !!none);
    return `<span class="tg-tk" style="left:${x(d)}" data-pop="${id}"><i>${ns.length}</i><span class="tg-col" style="height:${h(ns.length)}px">${none ? `<span class="tg-none" style="height:${Math.round(none / ns.length * 100)}%"></span>` : ''}</span></span>`; }).join('');
  const row = r => {
    const s = SUPPLIERS[r.sup], n = r.items.length, ship = r.how === 'Ships to the store', kind = r.pickup ? (ship ? 'Ships to store' : 'In store') : 'Delivery';
    const groups = new Map(); r.items.forEach(it => { if(!groups.has(it.d)) groups.set(it.d, []); groups.get(it.d).push(it); });
    const how = r.pickup ? (ship ? `pickup at ${s.name}` : `in-store buy at ${s.name}`) : `${s.name} delivery`;
    const thumbs = [...groups.entries()].map(([d, its]) => { const late = d < r.arrive, id = 'pk' + r.sup + r.arrive + '-' + d + '-' + its[0].L.key;
      TL_POP[id] = popHtml(d, its.map(it => ({n: it.n, p: it.L.p, sub: `${it.L.p.name} · ${qtyText(it.n.cat, it.n.qty)}`, amt: buy(it.L.p, it.n.qty, it.L.o).total})),
        late ? `Comes with the ${how}, ${md(dayAt(r.arrive))} · ${daysTxt(r.arrive - d)} late` : `Comes with the ${how}, ${md(dayAt(r.arrive))}`, late);
      return `<span class="tg-pk${late ? ' late' : ''}" style="left:${x(d)}" data-pop="${id}"><img src="${ART.product(its[0].L.p)}" alt="">${its.length > 1 ? `<b>${its.length}</b>` : ''}</span>`; }).join('');
    const p0 = r.items[0].L.p, nm = n === 1 ? esc(shortNm(p0)) : `${n} items`;
    // The heading already gives the buy-by date and the bar's icons give the method,
    // so the caption only adds what neither says: when it arrives, or that it's late.
    const meta = r.late ? `<span class="bad">${daysTxt(r.arrive - r.need)} late · arrives ${md(dayAt(r.arrive))}</span>`
      : r.store ? 'Same day, in store'
      : `Arrives ${md(dayAt(r.orderBy > 0 && !S.placed ? r.orderBy + r.lead : Math.max(r.arrive, 1)))}`;
    /* The bar reads left to right as a plan:
       · Can wait: a dashed blue window from today to the last day to order (or
         go to the store), then the trip (beige, ships or delivers), then the buffer.
       · Order today: the trip from today to the day it arrives, then any time
         it waits on site (white), then the buffer — or red for the days it's late. */
    const sg = (cls, w, t) => w > 0 ? `<span class="sg ${cls}" style="flex:${w}" data-pop="${barPop(cls)}">${t || ''}</span>` : '';
    // no legend: each part of the bar says what it is on hover
    /* No legend: every bar part and grid box says what it is on hover. One way of
       talking about how it gets there: In store, Delivery (to the job), Deliver to store. */
    const sayOf = (c, d) => {
      const A = arrD !== null ? md(dayAt(arrD)) : '', at = `${esc(s.name)}, ${esc(s.store)}`;
      const ob = md(dayAt(Math.max(r.orderBy, 0)));   // last day to order or buy
      const route = r.pickup ? `Deliver to store: ${at}` : 'Delivery to the job';
      return {
        win: r.store ? `<b>Time to buy in store</b> — any day up to ${ob}, at ${at}.` : `<b>Time to order</b> — any day up to ${ob}. ${route}, arrives ${A}.`,
        ord: r.store ? `<b>${d === 0 ? 'Buy in store today' : 'Last day to buy in store'}</b> at ${at}.` : `<b>${d === 0 ? 'Order today' : 'Last day to order'}</b> — ${route}, arrives ${A}.`,
        go: `<b>On its way</b> — ${route}, ${daysTxt(r.lead)}. Arrives ${A}.`,
        arr: (d === undefined ? `<b>${wmd(dayAt(arrD))}</b> · ` : '') + (r.pickup ? `<b>Arrives at the store</b> — ${at}.` : '<b>Delivery to the job</b>.'),   // the grid card's header already has the date
        hold: `<b>Here, waiting</b> — nothing needs it until ${md(dayAt(r.need))}.`,
        buf: `<b>${BUFFER}-day buffer</b> — spare days in case it’s late. First needed ${md(dayAt(r.need))}.`,
        late: `<b>Late</b> — needed ${md(dayAt(r.need))}, but it arrives ${md(dayAt(r.arrive))}.`,
        pin: `<b>Needed ${wmd(dayAt(r.need))}</b> — it arrives ${md(dayAt(r.arrive))}, ${daysTxt(r.arrive - r.need)} late.`,
        sp: `<b>Between tasks</b> — more of this order is needed later.`}[c];
    };
    const barPop = c => { const id = 'sg' + r.pk + c; TL_POP[id] = `<div class="tp-say">${sayOf(c)}</div>`; return id; };
    const fat = ST === 'fat', say = (w, min, t) => fat && w * DW >= min ? `<span>${t}</span>` : '';   // Big bars: words inside when they fit
    // the day it gets there (delivered to the job, or ready at the store); in-store buys have none — you take it with you
    const wait = r.orderBy > 0 && !S.placed && !r.late, arrD = r.store ? null : wait ? r.orderBy + r.lead : Math.max(r.arrive, 1);
    const dest = r.pickup ? `at ${s.name}` : 'at the job';
    const ic = tripIc(r.pickup, ship), trip = (w, t) => sg('go', w, `<i>${ic}</i>${w >= 3 || (fat && w * DW >= 70) ? `<span>${daysTxt(r.lead)}</span>` : ''}`);
    const tripTxt = r.store ? 'In store' : `${kind} · ${daysTxt(r.lead)}`;
    let segs, end;
    if(r.orderBy > 0 && !S.placed && !r.late){
      const winTxt = `${r.store ? 'Buy' : 'Order'} by ${md(dayAt(r.orderBy))}`;   // the walk → store icons say where
      segs = sg('win', r.orderBy, say(r.orderBy, 120, winTxt) + (r.store ? `<i>${ic}</i>` : '')) + (r.store ? '' : trip(r.lead, tripTxt)) + sg('buf', BUFFER, say(BUFFER, 64, 'Buffer'));
      end = r.need;
    } else {
      const go = Math.max(r.lead, r.store ? 0 : 1), bufA = Math.max(r.need - BUFFER, go);
      segs = (r.store ? '' : trip(go, tripTxt)) + (!r.late && r.need > go ? sg('hold', bufA - go) + sg('buf', r.need - bufA, say(r.need - bufA, 64, 'Buffer')) : '');
      end = r.late ? Math.max(go, r.need) : Math.max(go, r.need);
    }
    const done = S.rvDone.has(r.pk) || (S.placed && !r.store);
    /* Grid: one box per day, filled by what's happening that day — time to
       order (blue), the order or store day itself (deep blue), on its way
       (peach), waiting on site, buffer (green), needed (yellow, with the photo),
       late (red). Same plan as the bars, read as a heat map. */
    const cells = () => {
      const st = new Array(N).fill(''), put = (a, b, c) => { for(let d = Math.max(0, a); d < Math.min(N, b); d++) st[d] = c; };
      put(r.need, r.last + 1, 'sp');
      let ord = null;
      if(r.orderBy > 0 && !S.placed && !r.late){
        put(0, r.orderBy, 'win'); put(r.orderBy + 1, r.orderBy + r.lead, 'go'); put(Math.max(r.orderBy + r.lead, r.need - BUFFER), r.need, 'buf'); ord = r.orderBy;
      } else {
        const go = Math.max(r.lead, r.store ? 0 : 1), bufA = Math.max(r.need - BUFFER, go);
        put(0, go, 'go');
        if(r.late) put(r.need, r.arrive, 'late'); else { put(go, bufA, 'hold'); put(bufA, r.need, 'buf'); }
        if(!S.placed && !done) ord = 0;
      }
      if(ord !== null) st[ord] = 'ord';
      if(arrD !== null && arrD < N && !groups.has(arrD)) st[arrD] = 'arr';
      const ph = new Map(); [...groups.entries()].forEach(([d, its]) => ph.set(d, its));
      let goSeen = false, lateSeen = false;
      return `<div class="tg-cells" style="grid-template-columns:repeat(${N},1fr)">${st.map((c, d) => {
        const its = ph.get(d);
        if(its){ const late = d < r.arrive, id = 'pk' + r.sup + r.arrive + '-' + d + '-' + its[0].L.key;
          return `<span class="gc need${late ? ' late' : ''}" data-pop="${id}"><img src="${ART.product(its[0].L.p)}" alt="">${its.length > 1 ? `<b>${its.length}</b>` : ''}${d === arrD ? `<i class="gc-arr">${TL_IC[r.pickup ? 'store' : 'site']}</i>` : ''}</span>`; }
        let t = '';
        // each step says what happens, with one icon: cart · Order, truck · Ship, where it lands · Arrive
        if(c === 'ord') t = `${TL_IC.cart}<em>${r.store ? 'Buy' : 'Order'}</em>`;
        if(c === 'go' && !goSeen){ goSeen = true; t = `${TL_IC.truck}<em>Ship</em>`; }
        if(c === 'arr') t = `${TL_IC[r.pickup ? 'store' : 'site']}<em>Arrive</em>`;
        if(c === 'late' && !lateSeen){ lateSeen = true; t = `<em>+${r.arrive - r.need}d</em>`; }
        // no legend: each box says what it is on hover
        const tip = sayOf(c, d);
        const pid = tip ? 'gc' + r.pk + '-' + d : '';
        if(tip) TL_POP[pid] = `<div class="tp-hd">${longDay(dayAt(d))}</div><div class="tp-say">${tip}</div>`;
        return `<span class="gc ${c}"${tip ? ` data-pop="${pid}"` : ''}>${t}</span>`; }).join('')}</div>`;
    };
    const track = ST === 'grid' ? cells() : `<span class="tg-thread" style="${span(0, r.last)}"></span>
        <span class="tg-bar" style="${span(0, end)}">${segs}</span>
        ${r.late ? `<span class="tg-late" style="${span(r.need, r.arrive)}" data-pop="${barPop('late')}">${r.arrive - r.need >= 3 || (fat && (r.arrive - r.need) * DW >= 60) ? `${daysTxt(r.arrive - r.need)} late` : ''}</span><span class="tg-pin" style="left:${x(r.need)}" data-pop="${barPop('pin')}">!</span>` : ''}
        ${fat && arrD !== null ? `<span class="tg-arr${r.late ? ' late' : ''}" style="left:${x(arrD)}" data-pop="${barPop('arr')}"><i>${TL_IC[r.pickup ? 'store' : 'site']}</i>${r.pickup ? 'At store' : 'Deliver on'} ${md(dayAt(arrD))}</span>` : ''}
        ${thumbs}`;
    return `<div class="tgp${done ? ' done' : ''}"><div class="tg-row${r.late ? ' late' : ''}" data-act="rv-view" data-keys="${r.lines.map(L => L.key).join(',')}" title="Show ${n === 1 ? 'this item' : 'these items'} in the orders below">
      <div class="tg-lab">
        <span class="tg-stage"><span class="mono" style="background:${s.tone}">${s.mono}</span>${esc(s.name)}${r.buyer !== ORG ? ` · for ${esc(r.buyer)}` : ''}</span>
        <span class="tg-name"><b>${nm}</b><span class="num">${money0(r.amt)}</span></span>
        <span class="tg-meta">${meta}</span></div>
      <div class="tg-track">${track}</div></div></div>`;
  };
  const now = R.filter(r => r.orderBy <= 0), wait = R.filter(r => r.orderBy > 0), nl = R.filter(r => r.late).length, sn = selName();
  const none = tasks.filter(n => !n.pick).length;
  const grp = (name, rs, tag) => rs.length ? `<div class="tg-gh"><span class="tg-gn">${name}<i>${rs.length}</i></span><span class="tg-gt">${tag}</span></div>${rs.map(row).join('')}` : '';
  const styleSeg = `<div class="tg-try"><span class="tf-k">Display</span><div class="seg" role="group" aria-label="Display">${[['grid', 'Grid'], ['fat', 'Big bars']].map(([v, l]) => `<button type="button" class="${ST === v ? 'on' : ''}" data-act="tl-style" data-v="${v}">${l}</button>`).join('')}</div></div>`;
  const key = '';   // no legend in any display; every bar part and box explains itself on hover
  return `<section class="rv-sec tl tg st-${ST}">
    <div class="tg-top"><h2>${sn ? `Timeline <span class="tl-for">· ${sn}</span>` : 'Timeline'}</h2>${tlFilters()}
      <div class="tg-zoom">
        <div class="seg" role="group" aria-label="Zoom"><button type="button" class="${week ? 'on' : ''}" data-act="tl-zoom" data-v="week">Week</button><button type="button" class="${week ? '' : 'on'}" data-act="tl-zoom" data-v="month">Month</button></div></div></div>
    ${sn ? '<button type="button" class="link tl-all" data-act="tl-all">← Show everything</button>' : ''}
    <div class="tg-sumrow">${nl ? `<p class="tl-sum"><span class="tl-red">${nl} ${nl === 1 ? 'item arrives' : 'items arrive'} after ${nl === 1 ? 'it’s' : 'they’re'} needed.</span> See the fix below.</p>` : '<span></span>'}${styleSeg}</div>
    <div class="tg-box" data-n="${N}" style="--tw:${N * DW}px"><div class="tg-hwrap"><div class="tg-wide">${head}</div></div>
      <div class="tg-bwrap"><div class="tg-wide"><div class="tg-body">
        ${R.length ? G.map((g, gi) => { const rs = R.filter(r => r.gi === gi).sort((a, b) => b.late - a.late || a.orderBy - b.orderBy); return rs.length ? `<div class="tg-gh"><span class="tg-gn">${g.b <= 1 ? 'By tomorrow' : `By ${dayAt(g.b).toLocaleDateString('en-US', {weekday: 'short', month: 'short', day: 'numeric'})}`}<i>${rs.length}</i></span><span class="tg-gt num">${money(rs.reduce((a, r) => a + r.amt, 0))}</span></div>${rs.map(row).join('')}` : ''; }).join('') : `<div class="tg-row"><div class="tg-lab"></div><div class="tg-track"><span class="tg-empty">${S.tlCon.size || S.tlMeth.size ? 'Nothing matches these filters.' : 'No product chosen for this yet, so nothing to order.'}</span></div></div>`}
        <div class="tg-overlay" aria-hidden="true"><div></div><div class="tg-track">${grid}<i class="tg-cross" hidden></i></div></div>
      </div></div></div></div>
    ${key}
  </section>`;
}
/* ── Merged: orders by date ──
   Instead of one card per supplier, purchases are grouped by the last day to
   make them and still keep the buffer: "Order or buy in store by tomorrow",
   "Buy in store by Sunday, Nov 22", "Order by Wednesday, Nov 25". Each row is
   one purchase — who buys, what they do (buy in store, order for pickup or
   delivery), when they get it, the items — and opens to a table of the tasks
   it covers. In stock at the store = buy in store, same day; otherwise it's
   ordered and ships. */
const kindOf = L => L.pickup ? (L.o.stock >= L.b.n ? 'store' : 'pickup') : 'delivery';
const KIND = {store: 'In store', pickup: 'Deliver to store', delivery: 'Delivery'};   // the three words used everywhere
const byWhen = L => { const lead = kindOf(L) === 'store' ? 0 : dayN(L.arrive); return Math.max(1, dayN(L.need) - BUFFER - lead); };   // 1 = tomorrow (or already late)
const longDay = d => d.toLocaleDateString('en-US', {weekday: 'long', month: 'short', day: 'numeric'});
const groupsOf = lines => {
  // One trip's worth: a line joins the group started by an earlier deadline up to 4 days before it,
  // and the group is due by its earliest day, so nothing in it is bought late.
  const G = new Map(); let start = null;
  lines.slice().sort((x, y) => byWhen(x) - byWhen(y)).forEach(L => { const w = byWhen(L); if(start === null || (start === 1 ? w > 1 : w > start + 3)) start = w; const b = start; if(!G.has(b)) G.set(b, new Map()); const R = G.get(b), k = `${L.sup}|${kindOf(L)}|${L.buyer}|${b}`;
    if(!R.has(k)) R.set(k, {k, sup: L.sup, kind: kindOf(L), buyer: L.buyer, lines: []}); R.get(k).lines.push(L); });
  const ko = {store: 0, delivery: 1, pickup: 2};
  return [...G.entries()].sort((a, b) => a[0] - b[0]).map(([b, R]) => ({b, rows: [...R.values()].sort((x, y) => ko[x.kind] - ko[y.kind] || (x.buyer !== ORG) - (y.buyer !== ORG))}));
};
const grpTitle = g => {
  const ks = new Set(g.rows.map(r => r.kind)), when = g.b <= 1 ? 'tomorrow' : longDay(dayAt(g.b));
  return `${ks.size === 1 && ks.has('store') ? 'Buy in store' : ks.has('store') ? 'Order or buy in store' : 'Order'} by ${when}`;
};
function datesHtml(lines){
  const G = groupsOf(lines); if(!G.length) return '<p class="rv-fine">Nothing to buy yet.</p>';
  if(S.rvOpen === null) S.rvOpen = new Set([G[0].rows[0].k]);
  const thumbs = ls => { const ps = [...new Set(ls.map(L => L.p))]; return `<span class="pr-ths">${ps.slice(0, 4).map(p => `<img src="${ART.product(p)}" alt="" title="${esc(p.name)}">`).join('')}${ps.length > 4 ? `<i>+${ps.length - 4}</i>` : ''}</span>`; };
  /* The timeline's Contractor and Gets there filters narrow these tables too:
     only the purchases that get there that way, and inside them only that
     contractor's items. Groups keep their place (and id) so the bar's jumps still line up. */
  const conOk = n => !S.tlCon.size || S.tlCon.has(installerOf(n)), filt = S.tlCon.size || S.tlMeth.size;
  const items = r => r.lines.flatMap(L => L.needs.filter(conOk).map(n => ({n, L})));
  const head = '<div class="pr-cols"><span></span><span>Who</span><span>Does what</span><span>Gets it</span><span>Items</span><span></span></div>';
  const row = r => {
    const s = SUPPLIERS[r.sup], open = S.rvOpen.has(r.k), done = S.rvDone.has(r.k) || (S.placed && r.kind !== 'store');
    const its = items(r), tot = S.tlCon.size ? its.reduce((a, {n, L}) => a + buy(L.p, n.qty, L.o).total, 0) : r.lines.reduce((a, L) => a + L.b.total, 0), late = r.lines.filter(L => L.late).length, arr = r.lines[0].arrive;
    const gets = r.kind === 'store' ? '<b>Same day</b>' : `<b>${wmd(arr)}</b><i>${r.kind === 'delivery' ? 'At the job' : 'At the store'}</i>`;   // "Does what" already says In store / Delivery / Deliver to store
    const who = r.buyer === ORG ? `<span class="pr-tag">You</span><b>${esc(ORG)}</b>` : `<span class="pr-tag">Contractor</span><b>${esc(r.buyer)}</b>`;
    const act = r.kind === 'store' ? (done ? '✓ Bought' : 'Mark as bought') : (done ? '✓ Ordered' : 'Order now');
    const getsBy = r.buyer === ORG ? TEAM.JR.name : r.buyer;
    const table = !open ? '' : `<div class="pr-items"><div class="pi-cols"><span></span><span>Item</span><span>Room</span><span>Product</span><span>Qty</span><span>Needed</span><span>Who gets it</span><span class="r">Price</span><span></span></div>
      ${its.map(({n, L}) => { const tl = L.arrive > neededBy(n); return `<div class="pi mline${tl ? ' late' : ''}" data-key="${L.key}">
        <img src="${ART.product(L.p)}" alt=""><b>${esc(taskLabel(n))}</b><span>${esc(ROOM[n.room].name)}</span><span class="pi-p">${esc(L.p.name)}</span><span>${qtyText(n.cat, n.qty)}</span>
        <span class="pi-n" ${tl ? `title="Arrives ${wmd(L.arrive)}, after it's needed"` : ''}>${md(neededBy(n))}${tl ? ' · late' : ''}</span><span>${esc(getsBy)}</span><span class="r num">${money(buy(L.p, n.qty, L.o).total)}</span>
        <button type="button" class="pi-ed" data-act="rv-edit" data-id="${n.xof || n.id}" title="Change ${esc(n.task)} in Shop" aria-label="Edit">✎</button></div>`; }).join('')}</div>`;
    return `<div class="pr${open ? ' open' : ''}${late ? ' late' : ''}${done ? ' done' : ''}" data-pk="${r.k}" data-keys="${r.lines.map(L => L.key).join(',')}">
      <div class="pr-row" data-act="pr-tog" data-k="${r.k}">
        <span class="pr-car" aria-hidden="true"><svg viewBox="0 0 12 12" fill="none"><path d="M4.5 3L7.5 6l-3 3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
        <span class="pr-who">${who}</span>
        <span class="pr-do"><span class="mono" style="background:${s.tone}">${s.mono}</span><span><b>${KIND[r.kind]}</b><i>${esc(s.name)} · ${esc(s.store.split(' · ')[0])} · ${s.mi} mi</i></span></span>
        <span class="pr-gets">${gets}${late ? `<em>${late === 1 ? '1 item arrives' : `${late} items arrive`} after it’s needed</em>` : ''}</span>
        <span class="pr-its">${thumbs(r.lines)}<i>${its.length} ${its.length === 1 ? 'item' : 'items'} · ${money(tot)}</i></span>
        <span class="pr-act"><button type="button" class="btn${done ? ' ok' : ''}" data-act="pr-done" data-k="${r.k}">${act}</button></span>
      </div>${table}</div>`;
  };
  const shown = G.map(g => ({b: g.b, rows: g.rows.filter(r => !S.tlMeth.size || S.tlMeth.has(r.kind)).map(r => ({...r, lines: r.lines.filter(L => L.needs.some(conOk))})).filter(r => r.lines.length)}));
  const meth = {store: 'In store', pickup: 'Deliver to store', delivery: 'Delivery'};
  const note = !filt ? '' : `<div class="pr-filt"><span>Showing only <b>${[S.tlCon.size ? andList([...S.tlCon].map(esc)) : '', S.tlMeth.size ? andList([...S.tlMeth].map(k => meth[k])) : ''].filter(Boolean).join(' · ')}</b>, as filtered on the timeline.</span><button type="button" class="link" data-act="tl-fclear">Show all orders</button></div>`;
  if(filt && !shown.some(g => g.rows.length)) return `<section class="rv-sec pr-grp">${note}<p class="rv-fine">No orders match these filters.</p></section>`;
  return note.replace('class="pr-filt"', 'class="pr-filt top"') + shown.map((g, i) => g.rows.length ? `<section class="rv-sec pr-grp" id="grp-${i}"><h2 class="pr-h">${grpTitle(g)}</h2>
    <div class="pr-box">${head}${g.rows.map(row).join('')}</div></section>` : '').join('');
}
/* ── Kai found fixes for you ──
   Each problem Kai can see on the list, what it suggests, what that changes
   (time and cost), and one click to do it — or Keep as is. Late items first:
   another store that has it in time ("Switch to Lowe's"); failing that, a
   similar product that gets here in time ("Swap it"). Then tasks with no
   product: Kai's top pick for each. Allowances aren't policed here. */
const daysTxt = k => `${k} ${k === 1 ? 'day' : 'days'}`;
const arrOf = (p, q, o) => (pickOn() && o.stock >= buy(p, q, o).n) ? TOMORROW : o.ship;
const shortNm = p => p.name.split(/,|\(/)[0].trim();
const andList = a => a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];
function findFixes(lines){
  const F = [], sw = new Map(), swaps = [], stuck = [];
  lines.filter(L => L.late).forEach(L => {
    const late = dayN(L.arrive) - dayN(L.need);
    const alt = L.p.offers.filter(o => o.sup !== L.sup && supOk(o.sup)).map(o => ({o, arr: arrOf(L.p, L.qty, o)})).filter(a => a.arr <= L.need).sort((a, b) => a.arr - b.arr)[0];
    if(alt){ if(!sw.has(alt.o.sup)) sw.set(alt.o.sup, []); sw.get(alt.o.sup).push({L, late, alt}); return; }
    const c = BY_CAT[L.p.cat].filter(p => p.sku !== L.p.sku && sold(p) && L.needs.every(n => fitsNeed(p, n)))
      .map(p => { const o = p.offers.filter(x => supOk(x.sup)).map(x => ({o: x, arr: arrOf(p, L.qty, x)})).sort((a, b) => a.arr - b.arr)[0]; return o && {p, o: o.o, arr: o.arr}; })
      .filter(x => x && x.arr <= L.need).sort((a, b) => (b.p.mood - a.p.mood) || Math.abs(a.p.price - L.p.price) - Math.abs(b.p.price - L.p.price))[0];
    if(c) swaps.push({L, late, c}); else stuck.push({L, late});
  });
  sw.forEach((its, sup) => {
    const nm = SUPPLIERS[sup].name, max = Math.max(...its.map(x => x.late)), first = its.reduce((a, x) => x.alt.arr < a ? x.alt.arr : a, its[0].alt.arr);
    const delta = its.reduce((a, x) => a + buy(x.L.p, x.L.qty, x.alt.o).total - x.L.b.total, 0), n = its.length;
    F.push({id: 'sw-' + sup, ps: its.map(x => x.L.p), keys: its.map(x => x.L.key),
      prob: `${n === 1 ? `The ${esc(shortNm(its[0].L.p))} arrives` : `${n} items arrive`} ${n > 1 ? 'up to ' : ''}${daysTxt(max)} after ${n === 1 ? 'it’s' : 'they’re'} needed.`,
      sug: `Get ${n === 1 ? 'it' : 'them'} from ${esc(nm)} instead, ready ${rel(first)}.`, time: `<b class="ok">On time</b> · ${n > 1 ? 'up to ' : ''}${daysTxt(max)} sooner`, delta, cta: `Switch to ${esc(nm)}`,
      apply: () => { const snap = its.flatMap(x => x.L.needs.map(m => [m, S.offer[m.id]])); its.forEach(x => x.L.needs.forEach(m => { S.offer[m.id] = sup; })); return () => snap.forEach(([m, o]) => { if(o) S.offer[m.id] = o; else delete S.offer[m.id]; }); }});
  });
  if(swaps.length){
    const max = Math.max(...swaps.map(x => x.late)), n = swaps.length, last = swaps.reduce((a, x) => x.c.arr > a ? x.c.arr : a, swaps[0].c.arr);
    const delta = swaps.reduce((a, x) => a + buy(x.c.p, x.L.qty, x.c.o).total - x.L.b.total, 0);
    F.push({id: 'swap', ps: swaps.map(x => x.L.p), keys: swaps.map(x => x.L.key),
      prob: `${n === 1 ? `The ${esc(shortNm(swaps[0].L.p))} arrives` : `${n} items arrive`} ${n > 1 ? 'up to ' : ''}${daysTxt(max)} late, and no store has ${n === 1 ? 'it' : 'them'} sooner.`,
      sug: `Swap to ${n === 1 ? 'a similar product' : 'similar products'} that ${n === 1 ? 'gets' : 'get'} here in time: ${andList(swaps.map(x => esc(shortNm(x.c.p))))}. Here ${rel(last)}.`, time: `<b class="ok">On time</b> · ${n > 1 ? 'up to ' : ''}${daysTxt(max)} sooner`, delta, cta: n === 1 ? 'Swap it' : 'Swap them',
      apply: () => { const snap = swaps.flatMap(x => x.L.needs.map(m => [m, m.pick, S.offer[m.id]])); swaps.forEach(x => x.L.needs.forEach(m => { m.pick = x.c.p.sku; S.offer[m.id] = x.c.o.sup; })); return () => snap.forEach(([m, pk, o]) => { m.pick = pk; if(o) S.offer[m.id] = o; else delete S.offer[m.id]; }); }});
  }
  stuck.forEach(x => F.push({id: 'stuck-' + x.L.key, ps: [x.L.p], keys: [x.L.key], prob: `The ${esc(shortNm(x.L.p))} arrives ${daysTxt(x.late)} after it’s needed.`,
    sug: 'No store or similar product gets here sooner. Order it today so the wait is as short as it can be.', time: `Here ${wmd(x.L.arrive)}`, delta: null}));
  const todo = NEEDS.filter(n => !n.pick && !n.of).map(n => { const p = BY_CAT[n.cat].filter(q => sold(q) && fitsNeed(q, n)).sort((a, b) => score(b, [n]) - score(a, [n]))[0]; return p && {n, p, o: firstOffer(p)}; }).filter(Boolean);
  if(todo.length){
    const n = todo.length, last = todo.reduce((a, x) => { const d = arrOf(x.p, x.n.qty, x.o); return d > a ? d : a; }, TODAY);
    F.push({id: 'todo', ps: todo.map(x => x.p), see: 'fix-todo',
      prob: `${n} ${n === 1 ? 'task has' : 'tasks have'} no product yet.`, sug: n <= 3 ? `Add Kai’s top pick for ${n === 1 ? 'it' : 'each'}: ${andList(todo.map(x => esc(shortNm(x.p))))}.` : `Add Kai’s top pick for each, so every task is on an order.`,
      time: `Here ${rel(last)}`, delta: todo.reduce((a, x) => a + buy(x.p, x.n.qty, x.o).total, 0), add: true, cta: n === 1 ? 'Add it' : 'Add them',
      apply: () => { todo.forEach(x => { x.n.pick = x.p.sku; }); return () => todo.forEach(x => { x.n.pick = null; }); }});
  }
  return F;
}
const costTxt = f => f.delta == null ? '—' : Math.abs(f.delta) < .5 ? '<b class="ok">$0 extra</b>' : f.delta < 0 ? `<b class="ok">Saves ${money0(-f.delta)}</b>` : `<b class="${f.add ? 'add' : 'up'}">+${money0(f.delta)}${f.add ? '' : ' more'}</b>`;
let FIXES = [];
function fixesHtml(lines){
  FIXES = findFixes(lines);
  const live = FIXES.filter(f => !S.fixKeep.has(f.id)), act = live.filter(f => f.apply), kept = FIXES.length - live.length;
  if(!FIXES.length) return '';
  const tot = act.reduce((a, f) => a + (f.delta || 0), 0), lateFix = act.some(f => f.id !== 'todo');
  const all = act.length > 1 ? `<div class="fx-all"><span>Fix all: <b class="ok">${[lateFix ? 'everything on time' : '', act.some(f => f.id === 'todo') ? 'every task has a product' : ''].filter(Boolean).join(' · ')}</b> · ${costTxt({delta: tot, add: true})}</span><button type="button" class="btn pri" data-act="fix-all">Fix all</button></div>` : '';
  const card = f => `<div class="fx">
    <div class="fx-c"><span class="k">Problem</span><p>${f.prob}</p><span class="fx-ths">${[...new Set(f.ps)].slice(0, 5).map(p => `<img src="${ART.product(p)}" alt="" title="${esc(p.name)}">`).join('')}</span></div>
    <div class="fx-c"><span class="k">Kai suggests</span><p>${f.sug}</p></div>
    <div class="fx-c"><span class="k">What changes</span><dl><div><dt>Time</dt><dd>${f.time}</dd></div><div><dt>Cost</dt><dd>${costTxt(f)}</dd></div></dl></div>
    <div class="fx-a">${f.apply ? `<button type="button" class="btn pri" data-act="fix-do" data-f="${f.id}">${f.cta}</button>` : ''}<button type="button" class="btn" data-act="fix-keep" data-f="${f.id}">Keep as is</button>
      <button type="button" class="link" ${f.see ? `data-act="${f.see}"` : `data-act="rv-view" data-key="${f.keys[0]}"`}>See ${f.ps.length} ${f.ps.length === 1 ? 'item' : 'items'}</button></div></div>`;
  return `<section class="rv-sec fx-sec"><div class="fx-top"><h2 class="pr-h">Kai found fixes for you</h2>${all}</div>
    ${live.length ? live.map(card).join('') : '<p class="fx-none">Nothing left to fix.</p>'}
    ${kept ? `<button type="button" class="link fx-kept" data-act="fix-unkeep">${kept} kept as is · show again</button>` : ''}</section>`;
}
function renderReview(){
  const host = $('#review'); let el = $('#rvScroll');
  if(!el){ el = document.createElement('div'); el.id = 'rvScroll'; el.className = 'rv-scroll'; host.appendChild(el); }
  const keep = el.scrollTop, lines = orderLines();
  const bySup = new Map(); lines.forEach(L => { if(!bySup.has(L.ord)) bySup.set(L.ord, []); bySup.get(L.ord).push(L); });
  const sups = [...bySup.keys()].sort((a, b) => bySup.get(b).length - bySup.get(a).length);   // order keys: 'sup|buyer'
  const oName = o => { const [sp, by] = o.split('|'); return `${SUPPLIERS[sp].name} · ${by}`; }, oMono = o => SUPPLIERS[o.split('|')[0]];
  const sub = lines.reduce((a, L) => a + L.separate, 0), total = lines.reduce((a, L) => a + L.b.total, 0), combined = sub - total, tax = total * .07;
  const todo = NEEDS.filter(n => !n.pick).length;
  // The summary: a bar pinned to the bottom, so the orders get the full width.
  const bar = `<div class="rv-bar">
    <div class="rb-more"><dl class="rb-sum"><div><dt>Materials</dt><dd>${money(sub)}</dd></div>${combined > .5 ? `<div><dt>Combined across rooms</dt><dd class="ok">−${money(combined)}</dd></div>` : ''}<div><dt>Estimated tax</dt><dd>${money(tax)}</dd></div><div class="est"><dt>Materials estimate for the job</dt><dd>${money(JOB.materialsEstimate)}</dd></div></dl></div>
    <div class="rb-in">
      <div class="rb-ords">${groupsOf(lines).map((g, i) => `<button type="button" class="rb-o" data-act="jump-grp" data-i="${i}" title="Go to ${esc(grpTitle(g))}"><span class="nm">${g.b <= 1 ? 'By tomorrow' : `By ${md(dayAt(g.b))}`}</span><span class="num">${money(g.rows.reduce((a, r) => a + r.lines.reduce((b, L) => b + L.b.total, 0), 0))}</span></button>`).join('')}</div>
      <button type="button" class="rb-tot" title="Hover for the breakdown"><span class="k">Order amount</span><b class="num">${money(total + tax)}</b><svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 7.5 6 4l3.5 3.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
      ${S.placed ? `<button class="btn ink lg" data-act="screen" data-v="pickup">Open the pickup list</button>` : (() => { const n = groupsOf(lines).flatMap(g => g.rows).filter(r => r.kind !== 'store' && !S.rvDone.has(r.k)).length; return n ? `<button class="btn pri lg" data-act="place">Order all ${n} now</button>` : '<button class="btn pri lg" disabled>Everything ordered</button>'; })()}
    </div></div>`;
  el.innerHTML = `<div class="rv">
    <div class="rv-top"><div><button class="link" data-act="screen" data-v="shop">← Back to shopping</button><h1 style="margin-top:10px">${S.placed ? 'Orders' : 'Review & order'}</h1>
      <p>${esc(JOB.street)} · ${lines.length} lines from ${NEEDS.filter(n => n.pick).length} items · ${sups.length} orders</p></div>
</div>
    ${timelineHtml(lines)}
    ${S.placed ? '' : fixesHtml(lines)}
    ${S.placed ? `<div class="placed"><span class="ic">✓</span><div><b>${sups.length} orders submitted</b><p>Pickups are ready tomorrow at 7 AM. ${TEAM.JR.name} has the pickup list; S. Patel and T. Oyelaran were told. Swaps at the store follow your swap rules.</p></div><button class="btn ink" data-act="screen" data-v="pickup">See the pickup list</button></div>` : ''}
    <div>
      ${S.placed ? '' : `<section class="rv-sec"><h2>Before you order <span>Kai checked the list · none of these stop you from submitting</span></h2>${checksHtml(lines)}</section>`}
      ${datesHtml(lines)}<section class="rv-sec">
        <p class="rv-fine">${S.placed ? 'Orders and POs are on the job’s Documents tab.' : `One order and PO per supplier and buyer.${todo ? ` ${todo} that ${todo === 1 ? 'needs' : 'need'} a product will follow later.` : ''}`} Anything chosen later goes on a new order. Submitted orders are never edited.</p></section>
      <section class="rv-sec"><h2>Payment</h2><div class="pay">
        <div class="pay-row"><span class="k">Pay with</span><span><b style="color:var(--ink)">Kai Pro account</b> · Net 30 · billed to Main St Renovation</span><button class="link">Change</button></div>
        <div class="pay-row"><span class="k">PO numbers</span><span>Added to each order automatically, so invoices match the job</span><span></span></div>
        <div class="pay-row"><span class="k">Receives it</span><span><b style="color:var(--ink)">${TEAM.JR.name}</b> · ${esc(TEAM.JR.role)} — pickup lists, delivery texts, swap requests</span><button class="link">Change</button></div>
        <div class="pay-row"><span class="k">Substitutions</span><span>Your team’s setting: <b style="color:var(--ink)">replace with any similar item</b> within 10% or $150 of the line, with <b style="color:var(--success)">no change order</b>. Anything else asks you first.</span><button class="link" data-act="screen" data-v="pickup">See how</button></div>
      </div></section>
    </div>
    </div>${bar}`;
  el.scrollTop = keep;
  reviewSpy();
}
/* Jumping to a supplier's order, and showing which one you're in. */
function jumpSup(ord){
  const el = $('#rvScroll'), card = [...el.querySelectorAll('.order[data-ord]')].find(o => o.dataset.ord === ord); if(!card) return;
  const bar = el.querySelector('.rv-jump'), off = (bar && bar.offsetHeight ? bar.offsetHeight : 0) + 16;
  const to = el.scrollTop + card.getBoundingClientRect().top - el.getBoundingClientRect().top - off;
  const from = el.scrollTop, t0 = performance.now(), MS = 420, calm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const step = now => { const k = Math.min(1, (now - t0) / MS); el.scrollTop = from + (to - from) * (1 - Math.pow(1 - k, 3)); if(k < 1) requestAnimationFrame(step); };
  if(calm) el.scrollTop = to; else requestAnimationFrame(step);
  setTimeout(() => { el.scrollTop = to; }, MS + 60);
  const hd = card.querySelector('.order-hd'); hd.classList.remove('flash'); void hd.offsetWidth; hd.classList.add('flash');
}
function reviewSpy(){
  const el = $('#rvScroll'); if(!el || S.screen !== 'review') return;
  const bar = el.querySelector('.rv-jump'), line = el.getBoundingClientRect().top + (bar && bar.offsetHeight ? bar.offsetHeight : 0) + 60;
  let cur = null; el.querySelectorAll('.order[data-ord]').forEach(o => { if(o.getBoundingClientRect().top <= line) cur = o.dataset.ord; });
  el.querySelectorAll('[data-act="jump-ord"]').forEach(b => b.classList.toggle('on', b.dataset.ord === cur));
}
document.addEventListener('scroll', e => { if(e.target && e.target.id === 'rvScroll') reviewSpy(); }, true);

/* ═════════════ PICKUP (phone) ═════════════ */
const SWAP_PCT = .10, SWAP_MIN = 150;
function pickupLines(){
  return orderLines().filter(L => L.sup === 'hd' && L.pickup).sort((a, b) => a.o.aisle.localeCompare(b.o.aisle, undefined, {numeric: true}));
}
function swapOptions(L){
  const base = L.b.total, limit = Math.max(base * SWAP_PCT, SWAP_MIN);
  const ids = new Set(L.backups), mode = subMode(L.needs[0]);
  const cands = BY_CAT[L.p.cat].filter(c => c.sku !== L.p.sku && c.offers.some(o => o.sup === 'hd' && o.stock >= buy(c, L.qty, o).n));
  const out = cands.map(c => {
    const o = c.offers.find(x => x.sup === 'hd'), b = buy(c, L.qty, o), delta = b.total - base;
    const backup = ids.has(c.sku), like = c.mood && delta <= limit;
    const ok = mode === 'choose' ? backup : mode === 'similar' ? (backup || like) : false;
    return {c, o, b, delta, ok, backup,
      why: backup ? `Chosen substitute · ${delta > 0 ? `+${money0(delta)}` : 'same or less'}` : mode === 'approval' ? 'This item is set to ask first'
        : mode === 'choose' ? 'Not one of the chosen substitutes' : like ? `Similar item · ${delta > 0 ? `+${money0(delta)}` : 'same or less'}, inside your ${money0(limit)} swap limit` : !c.mood ? 'Different look — off the mood board' : `+${money0(delta)}, over the ${money0(limit)} swap limit`};
  }).sort((a, b) => (b.backup - a.backup) || (b.ok - a.ok) || (Math.abs(a.delta) - Math.abs(b.delta)));   // closest match first, not cheapest
  // A few that just work, then the closest ones that would need the manager.
  if(mode === 'approval') return out.slice(0, 4);   // every option asks, so show a few more
  return out.filter(o => o.ok).slice(0, 3).concat(out.filter(o => !o.ok).slice(0, 2));
}
function renderPickup(){
  const el = $('#pickup'), lines = pickupLines();
  const flagged = lines.find(L => L.p.sku === 'DT-RIT') || lines[0];
  const ready = lines.filter(L => L.how === 'Ready for pickup'), later = lines.filter(L => L.how !== 'Ready for pickup');
  const got = ready.filter(L => S.pk.got.has(L.p.sku) || S.pk.swaps[L.p.sku] || S.pk.skip.has(L.p.sku)).length;
  const line = L => {
    const sw = S.pk.swaps[L.p.sku], sk = S.pk.skip.has(L.p.sku), miss = L === flagged && !sw && !sk, g = S.pk.got.has(L.p.sku);
    const p = sw ? CATALOG[sw.to] : L.p, b = sw ? buy(p, L.qty, sw.o) : L.b;
    return `<div class="pl${g || sw || sk ? ' got' : ''}${miss ? ' miss' : ''}${sw ? ' swapped' : ''}"><img src="${ART.product(p)}" alt=""><span class="tx"><b>${esc(p.name)}</b><span>${b.label}${b.sub ? ` · ${b.sub}` : ''} · ${esc((sw ? sw.o : L.o).aisle)}</span></span>
      <button class="ck" data-act="got" data-sku="${L.p.sku}" aria-label="Got it">✓</button>
      ${miss ? `<span class="oos"><span class="dot err"></span><span style="font-size:12.5px;color:#8a3a2f">Shelf is empty — store count says 0 since 6:40 AM</span></span><span class="oos"><button class="btn ink" data-act="swap-open" data-sku="${L.p.sku}">${IC.swap} Swap it</button><button class="btn ghost">Ask a store associate</button></span>` : ''}
      ${sw ? `<span class="sw-note"${sw.state === 'asked' ? ' style="color:var(--warn)"' : ''}>${sw.state === 'asked' ? `Waiting on ${TEAM[ME].name} — ${esc(sw.why)}. Keep going.`
        : sw.state === 'approved' ? `Swapped from ${esc(L.p.name)} · approved by ${TEAM[ME].name} · Kai added it to the next change order`
        : sw.pre ? `Swapped from ${esc(L.p.name)} · pre-approved substitution` : `Swapped from ${esc(L.p.name)} · ${esc(sw.why)} · no change order`}<button data-act="swap-undo" data-sku="${L.p.sku}">Undo</button></span>` : ''}
      ${sk ? `<span class="sw-note" style="color:var(--t2)">Left off this pickup · it stays on the list<button data-act="swap-unskip" data-sku="${L.p.sku}">Undo</button></span>` : ''}</div>`;
  };
  let sheet = '';
  if(S.pk.sheet){
    const L = lines.find(x => x.p.sku === S.pk.sheet), mode = subMode(L.needs[0]), opts = mode === 'none' ? [] : swapOptions(L);
    const okOpts = opts.filter(o => o.ok), ask = opts.filter(o => !o.ok);
    const setting = `<div class="ph-set"><span class="sub-ic">${SUB_IC[mode]}</span><span>If it's out: <b>${SUB_OPTS[mode].t}</b>${L.needs[0].subNote ? `<br>Note: “${esc(L.needs[0].subNote)}”` : ''}</span></div>`;
    const opt = (o, best) => `<div class="opt${best ? ' best' : ''}"><div class="top"><img src="${ART.product(o.c)}" alt=""><div><b>${esc(o.c.name)}</b><span>${esc(o.c.brand)} · ${o.b.label} · ${money(o.b.total)} · ${o.o.stock} on the shelf · ${esc(o.o.aisle)}</span></div></div>
      <div class="verdict ${o.ok ? 'ok' : 'ask'}">${o.ok ? (o.backup ? `✓ <span><b>Pre-approved substitution</b></span>` : `✓ <span><b>No change order.</b> ${esc(o.why)}.</span>`) : `! <span><b>Needs ${TEAM[ME].name}'s OK.</b> ${esc(o.why)}. We'll ask now — keep picking up the rest.</span>`}</div>
      <button class="btn ${o.ok ? 'pri' : ''} block" data-act="swap-do" data-from="${L.p.sku}" data-to="${o.c.sku}">${o.ok ? 'Swap to this' : 'Ask to swap'}</button></div>`;
    sheet = `<div class="ph-scrim" data-act="swap-close"></div><div class="ph-sheet"><span class="grab"></span><div class="ph-sheet-hd"><b>Swap ${esc(L.p.name.split(' 3×6')[0])}</b><span>Needed: ${L.b.label} for ${L.needs.map(n => esc(ROOM[n.room].name)).join(', ')} · in stock at this store</span></div>
      <div class="ph-sheet-bd">${setting}${mode === 'none' ? `<p class="ph-none">This one isn't replaced. Leave it off; it stays on the job's list for the next order.</p><button class="btn ink block" data-act="swap-skip" data-sku="${L.p.sku}">Leave it off</button>`
        : `${okOpts.map((o, i) => opt(o, i === 0)).join('')}${ask.length ? `<span class="ph-sec">Needs approval</span>${ask.map(o => opt(o)).join('')}` : ''}`}</div></div>`;
  }
  el.innerHTML = `<div class="pk"><div class="pk-copy"><span class="k">${S.placed ? 'Tomorrow, 7:42 AM' : 'After the orders are placed'}</span><h1>In the store, an empty shelf doesn't stop the job.</h1>
      <p>${TEAM.JR.name}, the crew lead, picks up the Home Depot order. The list comes in aisle order, with each item's quantity in boxes and gallons. When the backsplash tile isn't on the shelf, the swap happens right there. Kai only asks for approval when the swap really changes the job.</p>
      <div class="pk-steps">
        <div><i>1</i><span><b>The list comes in aisle order</b><span>Quantities are in what you carry: boxes, gallons, pieces. Tap ✓ as each goes on the cart.</span></span></div>
        <div><i>2</i><span><b>Out of stock? Tap “Swap it”</b><span>Kai shows what's on this store's shelf right now, following the item's substitution setting: chosen substitutes first, then similar items.</span></span></div>
        <div><i>3</i><span><b>Inside the rules, it just happens</b><span>The job record updates, the swap is logged with the reason, and the manager is told. No phone call.</span></span></div>
        <div><i>4</i><span><b>Outside the rules, it asks — without stopping</b><span>${TEAM[ME].name} gets one tap to approve; the crew keeps picking up the rest.</span></span></div>
      </div>
      <div class="rulebox"><h3>Substitution (set once for the team, changeable per item)</h3><ol>
        <li><b>Chosen substitutes</b> — picked for the item in advance (“Choose a replacement now”). Always OK: a pre-approved substitution.</li>
        <li><b>Any similar item</b> — the team's setting: same kind of product, on the mood board, and within <b>10% or $150</b> of the line. OK, and logged.</li>
        <li><b>Anything else</b> asks the job manager. If it's approved, Kai writes it into the next change order. Nobody types it twice.</li></ol></div>
      <p style="margin-top:16px;font-size:13px;color:var(--t2)">Try it: tap <b>Swap it</b> on the tile in the phone.</p>
    </div>
    <div class="phone"><div class="ph-screen"><div class="ph-status"><span>7:42</span><span>●●● ▮</span></div>
      <div class="ph-hd"><span class="k">Pickup · Main St Renovation</span><b>The Home Depot #1863</b><span>Pro desk · order ready since 7:02 AM</span>
        <div class="ph-prog"><div class="bar-track"><span class="b-done" style="width:${ready.length ? got / ready.length * 100 : 0}%"></span></div><span>${got} of ${ready.length}</span></div></div>
      <div class="ph-list">${flagged && !S.pk.swaps[flagged.p.sku] ? `<div class="ph-alert"><span class="dot err"></span><span><b>1 item isn't on the shelf</b>${esc(flagged.p.name)} · ${esc(flagged.o.aisle)}</span><button class="btn ink sm" data-act="swap-open" data-sku="${flagged.p.sku}">Swap it</button></div>` : ''}<div class="ph-aisle">Ready now · in aisle order</div>${ready.map(line).join('')}${later.length ? `<div class="ph-aisle">Ships to the store later</div>${later.map(L => `<div class="pl"><img src="${ART.product(L.p)}" alt=""><span class="tx"><b>${esc(L.p.name)}</b><span>${L.b.label} · arrives ${wmd(L.arrive)}</span></span><span></span></div>`).join('')}` : ''}</div>
      ${sheet}${S.pk.toast ? `<div class="ph-toast">${S.pk.toast}</div>` : ''}</div></div></div>`;
}

/* ═════════════ Actions ═════════════ */
function select(sel){
  const from = S.sel;
  S.sel = sel; S.detail = null; S.detailFor = null; S.q = ''; S.chips.clear(); S.sort = 'rec';
  if(S.screen === 'review'){ renderList(); renderReview(); return; }   // Review: the left panel picks what the timeline shows
  if(S.screen === 'kw'){ setPanes(['scope']); return; }   // Overview / Documents: the task opens in Scope
  if(S.screen !== 'shop') S.screen = 'shop';
  render(true);
  // Coming back from a shelf to its room: land on that item, not the top.
  if(sel.kind === 'room' && from.kind === 'need') roomJump(from.id);
  // Keep the list showing where you are.
  const lb = $('#list .list-body'), g = $('#list .grp.on'), r = $('#list .row.on');
  if(g){ const d = g.getBoundingClientRect().top - lb.getBoundingClientRect().top; if(d < 0 || d > lb.clientHeight - 80) lb.scrollTop += d; }
  else if(r) r.scrollIntoView({block: 'nearest'});
}
function roomJump(id){
  const b = document.querySelector(`#work [data-need="${id}"]`); if(!b) return;
  b.scrollIntoView({block: 'start'});
  b.classList.remove('flash'); void b.offsetWidth; b.classList.add('flash');
}
function choose(sku, forId, count, rep){
  if(forId && !rep){ const h = hostOf(need(forId)); if(h && h.pick && h.pick !== sku){ addMore(h, sku, count); return; } }   // adding adds; Replace swaps
  const p = CATALOG[sku], single = !!forId || S.sel.kind === 'need';
  const tgt = (forId ? [need(forId)] : single ? selNeeds() : inclNeeds()).filter(n => fitsNeed(p, n));
  const skipped = (single ? [] : inclNeeds()).filter(n => !fitsNeed(p, n));
  const before = tgt.map(n => [n, n.pick, n.backups.slice(), n.qty, S.offer[n.id]]);
  if(S.dSup && S.detail === sku) tgt.forEach(n => { S.offer[n.id] = S.dSup; });   // the store picked on the product sheet
  else if(rep) tgt.forEach(n => { S.offer[n.id] = prefOffer(p, n).sup; });   // Replace keeps the store when it sells it
  const was = single && tgt[0].pick && tgt[0].pick !== sku ? CATALOG[tgt[0].pick] : null;
  tgt.forEach(n => { n.backups = n.backups.filter(s => s !== sku); n.pick = sku; if(count && single) setCount(n, p, count); });
  S.detail = null; S.dQty = null; S.dSup = null;
  const short = x => esc(x.name.split(/,|\(/)[0].trim());
  toast(`${was ? `Replaced ${short(was)} with ${short(p)}` : `Added ${short(p)}`}${single ? '' : ` to ${tgt.map(n => esc(ROOM[n.room].name)).join(', ')}`}.${skipped.length ? ` ${skipped.map(n => esc(ROOM[n.room].name)).join(', ')} needs a ${skipped[0].fit}″ one — add it on its own.` : ''}`,
    () => { before.forEach(([n, pk, bk, q, of]) => { n.pick = pk; n.backups = bk; n.qty = q; if(of) S.offer[n.id] = of; else delete S.offer[n.id]; }); render(); });
  render();
  if(forId){ delete ALT_Q[forId + '|' + sku]; flashPick(forId); }
}
function addMore(n, sku, count){
  const p = CATALOG[sku], had = (n.more || []).find(x => x.pick === sku);
  S.detail = null; S.dQty = null;
  if(had){ toast(`${esc(p.name.split(/,|\(/)[0].trim())} is already on ${esc(ROOM[n.room].name)} › ${esc(taskLabel(n))}.`); S.dSup = null; render(); flashPick(had.id); return; }
  const x = mkMore(n, sku, count ? qtyForCount(p, count) : n.qty), sup = S.dSup || prefOffer(p, n).sup;
  S.offer[x.id] = sup; S.dSup = null;
  const hp = CATALOG[n.pick], want = howOf(offerOf(n, hp).sup, hp.sku, n), lk = `${sup}|${sku}`, hadLk = S.lineFul[lk];
  if(howOf(sup, sku, x) !== want) S.lineFul[lk] = want;
  n.more = (n.more || []).concat(x); delete ALT_Q[n.id + '|' + sku];
  toast(`Added ${esc(p.name.split(/,|\(/)[0].trim())} to ${esc(ROOM[n.room].name)} › ${esc(taskLabel(n))} · ${esc(SUPPLIERS[sup].name)}, ${want}.`, () => { n.more = n.more.filter(y => y !== x); delete S.offer[x.id]; if(hadLk) S.lineFul[lk] = hadLk; else delete S.lineFul[lk]; render(); });
  render(); flashPick(x.id);
}
function toggleBackup(sku, forId){
  const tgt = forId ? [need(forId)] : S.sel.kind === 'need' ? selNeeds() : inclNeeds();
  const on = tgt.every(n => n.backups.includes(sku));
  tgt.forEach(n => {
    if(!n.pick || n.pick === sku) return;
    if(on){ n.backups = n.backups.filter(s => s !== sku); if(!n.backups.length && n.sub === 'choose') n.sub = null; }
    else if(!n.backups.includes(sku)){ n.backups.push(sku); if(n.backups.length > 2) n.backups.shift(); n.sub = 'choose'; }
  });
  toast(on ? 'Removed from substitutes.' : `${esc(CATALOG[sku].name)} is a substitute now. If your pick is out, the crew swaps to it as a pre-approved substitution.`);
  render();
}
function bestBackup(n){
  const p = CATALOG[n.pick];
  return BY_CAT[n.cat].filter(c => c.sku !== p.sku && !n.backups.includes(c.sku) && c.mood && fitsNeed(c, n))
    .sort((a, b) => (Math.abs(a.price - p.price) / p.price - (a.offers.some(o => o.stock > 10) ? .2 : 0)) - (Math.abs(b.price - p.price) / p.price - (b.offers.some(o => o.stock > 10) ? .2 : 0)))[0];
}
function autoBackups(needs){
  let k = 0;
  needs.forEach(n => { if(!n.pick) return; const c = bestBackup(n); if(c && n.backups.length < 2){ n.backups.push(c.sku); k++; } });
  return k;
}
function go(screen){
  // Review opens on everything; going back to shop puts back what you had, unless you picked something here.
  if(screen === 'review' && S.screen !== 'review'){ S.rvBack = S.sel; S.sel = {kind: 'room', room: 'all'}; }
  else if(S.screen === 'review' && screen !== 'review' && S.rvBack){ if(selAll()) S.sel = S.rvBack; S.rvBack = null; }
  S.screen = screen; S.detail = null;
  render(true);
  const sc = screen === 'review' ? $('#rvScroll') : $('#' + screen); if(sc && screen !== 'shop') sc.scrollTop = 0;
}

document.addEventListener('click', e => {
  const t = e.target.closest('[data-act]'); if(!t) return;
  // Inside a dialog, only its own buttons act; the backdrop behind it closes it.
  const stop = e.target.closest('[data-stop]');
  if(stop && !stop.contains(t)) return;
  const a = t.dataset.act, sku = t.dataset.sku, id = t.dataset.id;
  if(t.tagName === 'SELECT' || (t.tagName === 'INPUT' && t.type !== 'checkbox')) return;
  switch(a){
    case 'screen':
      if(t.dataset.v === 'shop'){ setPanes(['shop']); break; }   // Shop on its own
      go(t.dataset.v); break;
    case 'inert': toast(`${esc(t.textContent.trim())} isn’t part of this concept.`); break;
    case 'kwtab':
      if((e.metaKey || e.ctrlKey) && S.screen === 'shop'){ besideTab(t.dataset.page); break; }   // ⌘-click: beside the shelf instead
      setPanes([t.dataset.page]); break;
    case 'tcheck': {
      const p = t.dataset.page, ps = curPanes();
      if(ps.includes(p)){ if(ps.length > 1) setPanes(ps.filter(x => x !== p)); break; }   // the only one stays
      if(ps.length >= 2) break;                                                          // two at most
      setPanes([...ps, p]); break;
    }
    case 'doc-dl': toast(`${esc(t.dataset.n)} downloaded as ${t.dataset.k === 'pdf' ? 'PDF' : t.dataset.k === 'csv' ? 'Excel' : 'a photo ZIP'}.`); break;
    case 'reset': location.reload(); break;
    case 'undo': if(toast.undo){ const u = toast.undo; toast.undo = null; $('#toast').innerHTML = ''; u(); } break;
    case 'group': S.group = t.dataset.v; render(); break;
    case 'pv': S.pv = t.dataset.v; S.pvAuto = false; renderList(); break;   // picked by hand: leaving Shop keeps it
    case 'nv-tog': { const k = t.dataset.k; if(t.dataset.o === '1'){ S.pvOpen.delete(k); S.pvShut.add(k); } else { S.pvShut.delete(k); S.pvOpen.add(k); } renderList(); break; }
    case 'nv-find': S.pvFind = !S.pvFind; if(!S.pvFind) S.pvQ = ''; renderList(); if(S.pvFind){ const i = $('#nvQ'); if(i) i.focus(); } break;
    case 'nv-clear': S.pvQ = ''; renderList(); break;
    case 'flt-menu': S.fltOpen = !S.fltOpen; renderList(); break;
    case 'filter': S.filter = t.dataset.v; S.fltOpen = false; if(S.screen === 'kw') renderList(); else if(S.screen !== 'shop') go('shop'); else render(); break;
    case 'sel-need': select({kind: 'need', id}); break;
    case 'tl-con': case 'tl-meth': { const set = a === 'tl-con' ? S.tlCon : S.tlMeth, v = t.dataset.v; if(set.has(v)) set.delete(v); else set.add(v); renderReview(); break; }
    case 'tf-open': S.tfOpen = S.tfOpen === t.dataset.v ? null : t.dataset.v; renderReview(); break;
    case 'tf-clear1': (t.dataset.v === 'con' ? S.tlCon : S.tlMeth).clear(); S.tfOpen = null; renderReview(); break;
    case 'tl-fclear': S.tlCon.clear(); S.tlMeth.clear(); renderReview(); break;
    case 'tl-style': S.tlStyle = t.dataset.v; renderReview(); break;
    case 'tl-zoom': S.tlZoom = t.dataset.v; S.tlScroll = 0; renderReview(); break;
    case 'tl-page': { const w = S.tlZoom === 'week' ? 7 : 35; S.tlFrom = Math.max(0, (S.tlFrom || 0) + (+t.dataset.d) * w); renderReview(); break; }
    case 'tl-all': select({kind: 'room', room: 'all'}); break;   // a list row always opens that item's full shelf
    case 'sel-room': if(t.closest('.nv-gh') && S.sel.kind === 'room' && S.sel.room === t.dataset.room){ nvFlip('r:' + t.dataset.room); break; }   // a second click on the open room's row folds it
      S.pvShut.delete('r:' + t.dataset.room); select({kind: 'room', room: t.dataset.room}); break;
    case 'room-jump': roomJump(id); break;
    case 'sel-type': if(t.closest('.nv-sh') && S.sel.kind === 'type' && S.sel.cat === t.dataset.cat){ nvFlip('c:' + t.dataset.cat); break; }   // a second click on the open type's row folds it
      S.ack.add('rep' + t.dataset.cat); S.pvShut.delete('c:' + t.dataset.cat); if(S.group !== 'product') S.group = 'product'; select({kind: 'type', cat: t.dataset.cat}); break;   // and open its tasks in the list
    case 'choose': if(t.dataset.sup) S.dSup = t.dataset.sup;   // the box's buttons buy from the store it shows
      choose(sku, id, t.dataset.k ? +t.dataset.k : null, !!t.dataset.rep); break;
    case 'cq': { const n = need(id); if(n) cqSet(n, n.qty + (+t.dataset.d) * cqStep(n.cat)); break; }
    case 'cq-reset': { const n = need(id); if(n) cqSet(n, n.planQty); break; }
    case 'qty': { const n = need(id), p = n && CATALOG[n.pick]; if(!p) break;
      const k = buy(p, n.qty, offerOf(n, p)).n + (+t.dataset.d);
      if(k < 1) removePick([n]); else { setCount(n, p, k); render(); } break; }
    case 'look-ph': { const rid = t.dataset.room, L = phList(rid), slot = t.closest('.look-ph');
      if(!L.length || !slot) break;
      LOOK_PH[rid] = ((LOOK_PH[rid] || 0) + (+t.dataset.d) + L.length) % L.length;
      slot.outerHTML = lookPhHtml(rid);   // just the slot: the page doesn't move
      const b = document.querySelector(`.look-ph[data-room="${rid}"] .look-ph-b.${+t.dataset.d < 0 ? 'prev' : 'next'}`); if(b) b.focus();
      break; }
    case 'car': { const c = t.closest('.rcar'), g = carGeo(c); g.tr.scrollBy({left: (+t.dataset.d) * g.per * g.step, behavior: 'smooth'}); break; }
    case 'dqty': { const p = CATALOG[S.detail], n = S.detailFor ? need(S.detailFor) : selNeeds()[0]; if(!p || !n) break;
      S.dQty = Math.max(1, (S.dQty || buy(p, n.qty, offerOf(n, p)).n) + (+t.dataset.d)); renderWork(); break; }
    case 'remove': removePick((t.dataset.ids || '').split(',').filter(Boolean).map(need).filter(n => n && n.pick === sku)); break;
    case 'backup': toggleBackup(sku, id); break;
    case 'sub-open': subOpen((t.dataset.ids || id || '').split(',').filter(Boolean), t.dataset.sku); break;
    case 'sub-close': S.subDraft = null; renderSub(); break;
    case 'sub-mode': S.subDraft.mode = t.dataset.v; renderSub(); break;
    case 'sub-pick': { const pk = S.subDraft.picks, i = pk.indexOf(sku); if(i >= 0) pk.splice(i, 1); else if(pk.length < 2) pk.push(sku); else toast('Up to 2 substitutes. Remove one first.'); renderSub(); break; }
    case 'sub-save': subSave(); break;
    case 'swap-skip': S.pk.skip.add(sku); S.pk.sheet = null; S.pk.toast = 'Left off this pickup. It stays on the job’s list, so nothing is lost.'; renderPickup(); setTimeout(() => { S.pk.toast = ''; if(S.screen === 'pickup') renderPickup(); }, 5000); break;
    case 'swap-unskip': S.pk.skip.delete(sku); renderPickup(); break;
    case 'rm-backup': (id ? [need(id)] : selNeeds()).forEach(n => { n.backups = n.backups.filter(s => s !== sku); if(!n.backups.length && n.sub === 'choose') n.sub = null; }); render(); break;
    case 'auto-backup': { const k = autoBackups(id ? [need(id)] : selNeeds()); toast(k ? `Kai added a backup: same look, close in price, in stock nearby.` : 'No more good backups for this one.'); render(); break; }
    case 'detail': S.dQty = null; S.dSup = null; S.detail = sku; S.detailFor = S.sel.kind === 'room' ? (id || null) : null; S.detailImg = 0; renderWork(); break;
    case 'close-detail': S.detail = null; S.detailFor = null; renderWork(); break;
    case 'img': S.detailImg = +t.dataset.i; renderWork(); break;
    case 'img-step': S.detailImg = (S.detailImg + (+t.dataset.d) + 3) % 3; renderWork(); break;
    case 'pd-step': { const L = pdList(S.detailFor ? [need(S.detailFor)] : selNeeds()), i = L.indexOf(S.detail) + (+t.dataset.d);
      if(i < 0 || i >= L.length) break;
      S.detail = L[i]; S.detailImg = 0; S.dQty = null; S.dSup = null; renderWork();
      const b = document.querySelector(`.pdm-pager [data-d="${t.dataset.d}"]`); if(b && !b.disabled) b.focus(); break; }
    case 'pd-update': { const p = CATALOG[S.detail], n = S.detailFor ? need(S.detailFor) : selNeeds()[0]; if(!p || !n || n.pick !== p.sku) break;
      const q0 = n.qty; setCount(n, p, +t.dataset.k); S.detail = null; S.dQty = null; S.dSup = null;
      toast(`Updated ${esc(p.name.split(/,|\(/)[0].trim())} to ${buy(p, n.qty, offerOf(n, p)).label}.`, () => { n.qty = q0; render(); });
      render(); break; }
    case 'pd-ful': setFul(t.dataset.sup, t.dataset.v); renderWork(); break;
    case 'nb-edit': NB_EDIT = NB_EDIT && NB_EDIT.id === id && NB_EDIT.k === t.dataset.k ? null : {id, k: t.dataset.k}; renderWork(); break;
    case 'nb-sup': { const n = need(id), p = CATALOG[n.pick]; if(!p) break; S.offer[n.id] = t.dataset.sup; NB_EDIT = null;
      toast(`Buying ${esc(p.name.split(/,|\(/)[0].trim())} from ${esc(SUPPLIERS[t.dataset.sup].name)}.`); render(); break; }
    case 'nb-ful': { const n = need(id), p = CATALOG[n.pick]; if(!p) break;   // the same override the order's line uses in Review
      const o = offerOf(n, p), k = `${o.sup}|${p.sku}`, base = (S.ordFul[`${o.sup}|${buyerOf(n)}`] || S.ful[o.sup]) === 'pickup' ? 'pickup' : 'delivery';
      if(t.dataset.v === base) delete S.lineFul[k]; else S.lineFul[k] = t.dataset.v; NB_EDIT = null; render(); break; }
    case 'alt-qty': { const n = need(id), c = CATALOG[sku], o = prefOffer(c, n), kk = id + '|' + sku;   // a draft count, drawn in place so the carousel stays put
      const k = Math.max(1, (ALT_Q[kk] || buy(c, n.qty, o).n) + +t.dataset.d); ALT_Q[kk] = k;
      const card = t.closest('.nb-alt'), b = buy(c, qtyForCount(c, k), o);
      card.querySelector('.alt-stp .stp-n b').textContent = b.label; card.querySelector('.alt-stp [data-d="-1"]').disabled = k <= 1;
      const p0 = n.pick && CATALOG[n.pick]; card.querySelector('.ln').innerHTML = altLnHtml(b, b.total - (p0 ? buy(p0, n.qty, offerOf(n, p0)).total : 0), !!p0); card.querySelector('[data-act="choose"]').dataset.k = k; break; }
    case 'pd-sup': {   // the store: a pick switches at once; otherwise it rides along with Add
      const p = CATALOG[S.detail]; if(!p) break;
      const single = S.sel.kind === 'need' || !!S.detailFor, n0 = S.detailFor ? need(S.detailFor) : selNeeds()[0];
      const fitT = (single ? [n0] : inclNeeds()).filter(n => fitsNeed(p, n)), sup = t.dataset.sup;
      if(fitT.length && fitT.every(n => n.pick === p.sku)){ fitT.forEach(n => { S.offer[n.id] = sup; }); toast(`Buying ${esc(p.name.split(/,|\(/)[0].trim())} from ${esc(SUPPLIERS[sup].name)}.`); render(); }
      else { S.dSup = sup; renderWork(); }
      break; }
    case 'src-open': S.src.open = !S.src.open; renderWork(); break;
    case 'src-all': S.src.ret = 'all'; render(); break;
    case 'chip': { const v = t.dataset.v; if(S.chips.has(v)) S.chips.delete(v); else S.chips.add(v); renderWork(); break; }
    case 'clear-chips': S.chips.clear(); S.q = ''; renderWork(); break;
    case 'ref': { const tab = t.dataset.tab, i = S.ref.open.indexOf(tab);
      if(S.ref.page){ S.ref.page = null; S.ref.full = false; if(i < 0) refAdd(tab); renderWork(); break; }
      if(i >= 0) S.ref.open.splice(i, 1); else refAdd(tab); if(!S.ref.open.length) S.ref.full = false; renderWork(); break; }
    case 'ref-add': refAdd(t.dataset.tab); renderWork(); break;
    case 'ref-photo': S.ref.ph = t.dataset.k; if(S.ref.page){ S.ref.page = null; S.ref.full = false; } if(!S.ref.open.includes('media')) refAdd('media'); renderWork(); break;
    case 'ref-prod': S.ref.prod = sku; renderWork(); break;
    case 'ref-full': S.ref.full = !S.ref.full; renderWork(); break;
    case 'shop-task': { const id2 = t.dataset.id; setPanes(['shop']); select({kind: 'need', id: id2}); break; }
    case 'ref-wide': {
      if(S.ref.w >= 600){ S.ref.w = 440; renderWork(); break; }
      // Two columns beside the shelf, and the shelf keeps room for at least one good column of products.
      const room = $('#work').clientWidth - 440, want = Math.min(room, 680);
      if(want < 600){ S.ref.full = true; toast('Not enough room beside the products, so here they are side by side in full view.'); }
      else S.ref.w = want;
      renderWork(); break;
    }
    case 'ref-close': S.ref.open = []; S.ref.full = false; renderWork(); break;
    case 'pg-close': besideClose(); break;   // a page opened beside the shelf (Scope, Documents, Overview)
    case 'ack': S.ack.add(t.dataset.k); render(); break;
    case 'match': { const n = need(id), was = n.pick; n.pick = sku; toast(`${esc(ROOM[n.room].name)} now matches the other rooms.`, () => { n.pick = was; render(); }); render(); break; }
    case 'match-all': { const ns = selNeeds(), was = ns.map(n => [n, n.pick]); ns.forEach(n => { if(fitsNeed(CATALOG[sku], n)) n.pick = sku; }); toast(`All ${ns.length} tasks use ${esc(CATALOG[sku].name)} now.`, () => { was.forEach(([n, p]) => { n.pick = p; }); render(); }); render(); break; }
    case 'incl': { const n = need(id), s = exclSet(n.cat); if(s.has(id)) s.delete(id); else s.add(id); renderWork(); break; }
    case 'ful': { const o = t.dataset.ord; S.ordFul[o] = t.dataset.v; orderLines().filter(L => L.ord === o).forEach(L => { delete S.lineFul[L.key]; }); renderReview(); break; }   // every line in this order
    case 'rv-more': { const k = t.dataset.key; if(S.rvMore.has(k)) S.rvMore.delete(k); else S.rvMore.add(k); renderReview(); break; }
    case 'rv-task': { const id2 = t.dataset.id; setPanes(['scope']); select({kind: 'need', id: id2}); break; }   // the task, in Scope
    case 'rv-view': {   // to the item(s) in the orders: open every purchase holding them, scroll to the first, flash them all
      const el = $('#rvScroll'), ks = new Set((t.dataset.keys || t.dataset.key).split(','));
      const find = () => [...el.querySelectorAll('.mline[data-key]')].filter(x => ks.has(x.dataset.key));
      const prs = [...el.querySelectorAll('.pr[data-keys]')].filter(x => x.dataset.keys.split(',').some(k => ks.has(k)));
      if(prs.some(x => !S.rvOpen.has(x.dataset.pk))){ prs.forEach(x => S.rvOpen.add(x.dataset.pk)); renderReview(); }
      const rows = find(); if(!rows.length) break;
      const r0 = rows[0], one = rows.length === 1;
      const to = el.scrollTop + r0.getBoundingClientRect().top - el.getBoundingClientRect().top - (one ? (el.clientHeight - r0.offsetHeight) / 2 : 140);
      el.scrollTo({top: to, behavior: 'smooth'}); setTimeout(() => { el.scrollTop = to; }, 480);
      rows.forEach(x => { x.classList.remove('flash'); void x.offsetWidth; x.classList.add('flash'); }); break; }
    case 'line-ful': {   // one line's own way; back to its order's way drops the override
      const k = t.dataset.key, sup = k.split('|')[0], v = t.dataset.v;
      const L0 = orderLines().find(L => L.key === k), base = L0 ? (S.ordFul[L0.ord] || S.ful[sup]) : S.ful[sup];
    if(v === base) delete S.lineFul[k]; else S.lineFul[k] = v;
      renderReview();
      const row = document.querySelector(`.oline[data-key="${k}"]`); if(row){ row.scrollIntoView({block: 'nearest'}); row.classList.add('flash'); }
      break; }
    case 'line-rm': { const L = orderLines().find(x => x.key === t.dataset.key); if(L) removePick(L.needs); break; }
    case 'jump-ord': jumpSup(t.dataset.ord); break;
    case 'fix-do': { const f = FIXES.find(x => x.id === t.dataset.f); if(!f) break; const undo = f.apply(); render(); toast(`Done: ${f.cta}.`, () => { undo(); render(); }); break; }
    case 'fix-all': { const fs = FIXES.filter(f => f.apply && !S.fixKeep.has(f.id)), us = fs.map(f => f.apply()); render(); toast(`Fixed ${fs.length} things.`, () => { us.reverse().forEach(u => u()); render(); }); break; }
    case 'fix-keep': S.fixKeep.add(t.dataset.f); renderReview(); break;
    case 'fix-unkeep': S.fixKeep.clear(); renderReview(); break;
    case 'jump-grp': { if(!$('#grp-' + t.dataset.i) && (S.tlCon.size || S.tlMeth.size)){ S.tlCon.clear(); S.tlMeth.clear(); renderReview(); }
      const el = $('#rvScroll'), g = $('#grp-' + t.dataset.i); if(g) el.scrollTo({top: el.scrollTop + g.getBoundingClientRect().top - el.getBoundingClientRect().top - 12, behavior: 'smooth'}); break; }
    case 'pr-tog': if(e.target.closest('[data-act="pr-done"]')) break; { const k = t.dataset.k; if(S.rvOpen.has(k)) S.rvOpen.delete(k); else S.rvOpen.add(k); renderReview(); } break;
    case 'pr-done': { const k = t.dataset.k, store = k.split('|')[1] === 'store'; if(S.rvDone.has(k)) S.rvDone.delete(k); else { S.rvDone.add(k); toast(store ? 'Marked as bought.' : 'Order sent.'); } renderReview(); } break;
    case 'rv-edit': go('shop'); select({kind: 'need', id}); break;
    case 'fix-backups': { const k = autoBackups(NEEDS.filter(n => n.pick && !n.backups.length)); toast(`Kai added backups to ${k} items — same look, close in price, in stock nearby. Change any of them on the shelf.`); render(); break; }
    case 'fix-review': { S.filter = 'changed'; const n = NEEDS.find(isOver), r = ROOMS.find(x => roomCost(x.id).over);
      if(n) select({kind: 'need', id: n.id}); else if(r){ S.filter = 'all'; select({kind: 'room', room: r.id}); } break; }   // only a department over: open that room
    case 'cost-book': toast('Would open this in the Cost Book (page not built yet).'); break;
    case 'fix-todo': { S.filter = 'todo'; const n = NEEDS.find(x => !x.pick); if(S.screen === 'review') go('shop'); select({kind: 'need', id: n.id}); break; }
    case 'fix-off': { const n = need(id), maj = majorityPick(NEEDS.filter(m => m.cat === n.cat && m.id !== id)); if(maj){ n.pick = maj; toast(`${esc(ROOM[n.room].name)} now uses ${esc(CATALOG[maj].name)}, like the other rooms.`); render(); } break; }
    case 'place': groupsOf(orderLines()).flatMap(g => g.rows).filter(r => r.kind !== 'store').forEach(r => S.rvDone.add(r.k)); S.placed = true; toast('Orders submitted. Pickup list sent to J. Ruiz.'); render(); $('#rvScroll').scrollTop = 0; break;
    case 'got': { if(S.pk.got.has(sku)) S.pk.got.delete(sku); else S.pk.got.add(sku); renderPickup(); break; }
    case 'swap-open': S.pk.sheet = sku; S.pk.toast = ''; renderPickup(); break;
    case 'swap-close': S.pk.sheet = null; renderPickup(); break;
    case 'swap-do': {
      const L = pickupLines().find(x => x.p.sku === t.dataset.from), o = swapOptions(L).find(x => x.c.sku === t.dataset.to);
      S.pk.swaps[L.p.sku] = {to: o.c.sku, o: o.o, why: o.why, co: !o.ok, pre: o.ok && o.backup, state: o.ok ? 'ok' : 'asked'};
      S.pk.sheet = null;
      if(o.ok){
        L.needs.forEach(n => { n.swap = {from: L.p.sku, to: o.c.sku, how: o.c.name, co: false, pre: !!o.backup}; n.pick = o.c.sku; n.backups = n.backups.filter(s => s !== o.c.sku); });
        S.pk.toast = o.backup ? `Swapped to the <b>pre-approved substitution</b>. Logged on the job, and ${TEAM[ME].name} was told.`
          : `Swapped. Logged on the job with the reason, and ${TEAM[ME].name} was told. <b>No change order.</b>`;
      } else {
        S.pk.toast = `Asked ${TEAM[ME].name}. Keep picking up — you'll get a buzz when it's approved.`;
        setTimeout(() => { const sw = S.pk.swaps[L.p.sku]; if(sw && sw.state === 'asked'){ sw.state = 'approved'; L.needs.forEach(n => { n.swap = {from: L.p.sku, to: o.c.sku, how: o.c.name, co: true}; n.pick = o.c.sku; }); S.pk.toast = `${TEAM[ME].name} approved the swap. It's in the next change order — nothing to type.`; if(S.screen === 'pickup') renderPickup(); } }, 3200);
      }
      renderPickup(); setTimeout(() => { S.pk.toast = ''; if(S.screen === 'pickup') renderPickup(); }, 6500);
      break;
    }
    case 'swap-undo': {
      const sw = S.pk.swaps[sku]; delete S.pk.swaps[sku];
      NEEDS.filter(n => n.swap && n.swap.from === sku).forEach(n => { n.pick = sku; n.swap = null; });
      S.pk.toast = ''; renderPickup(); break;
    }
  }
});
// Drag the board's inner edge to make it wider; past ~600px its sections sit side by side.
document.addEventListener('pointerdown', e => {
  const g = e.target.closest('[data-grip]'); if(!g) return;
  e.preventDefault();
  const work = $('#work'), r = work.getBoundingClientRect();
  g.setPointerCapture(e.pointerId); document.body.classList.add('dragging');
  const mv = ev => { S.ref.w = Math.round(Math.max(340, Math.min(S.ref.side === 'left' ? ev.clientX - r.left : r.right - ev.clientX, r.width - 360))); work.style.setProperty('--bw', S.ref.w + 'px'); };
  const up = () => { g.removeEventListener('pointermove', mv); g.removeEventListener('pointerup', up); g.removeEventListener('pointercancel', up); document.body.classList.remove('dragging'); renderWork(); };
  g.addEventListener('pointermove', mv); g.addEventListener('pointerup', up); g.addEventListener('pointercancel', up);
});
document.addEventListener('change', e => {
  const t = e.target;
  if(t.matches('select[data-act="sort"]')){ S.sort = t.value; renderWork(); }
  if(t.matches('input[data-src]')) srcSet(t);
  if(t.matches('.cq-in')) cqSet(need(t.dataset.id), t.value);
});
document.addEventListener('input', e => {
  if(e.target.id === 'q'){ S.q = e.target.value; renderGridOnly(); }
  if(e.target.id === 'nvQ'){ const v = e.target.value; S.pvQ = v; renderList(); const i = $('#nvQ'); if(i){ i.focus(); i.setSelectionRange(v.length, v.length); } }
  if(e.target.id === 'subNote' && S.subDraft) S.subDraft.note = e.target.value;
});
document.addEventListener('submit', e => {
  const f = e.target.closest('[data-form="note"]'); if(!f) return;
  e.preventDefault();
  const v = f.t.value.trim(); if(!v) return;
  const n = selNeeds()[0]; (S.notes[n.id] || (S.notes[n.id] = [])).push([ME, v, 'just now']);
  toast('Posted on the job. Whoever takes the turn next will see it.'); render();
});
document.addEventListener('keydown', e => {
  if(S.detail && !S.subDraft && (e.key === 'ArrowLeft' || e.key === 'ArrowRight') && !(e.target.closest && e.target.closest('input, select, textarea'))){
    S.detailImg = (S.detailImg + (e.key === 'ArrowLeft' ? -1 : 1) + 3) % 3; renderWork(); e.preventDefault(); return;
  }
  if(e.key === 'Enter' && e.target.matches && e.target.matches('input[data-src]')){ e.target.blur(); return; }   // blur saves it
  if(e.key !== 'Escape') return;
  if(S.src.open){ S.src.open = false; renderWork(); return; }
  if(S.subDraft){ S.subDraft = null; renderSub(); return; }
  if(S.pk.sheet){ S.pk.sheet = null; renderPickup(); return; }
  if(S.detail){ S.detail = null; renderWork(); return; }
  if(S.ref.full){ S.ref.full = false; renderWork(); }
});

/* ── Render ── */
/* One left panel on every tab (the same tasks, rooms and amounts throughout).
   Shop flips it to Materials; leaving Shop puts back what you had, unless you
   picked a view by hand while there. Review keeps the panel on Materials too, where it picks what the timeline shows; the phone has no panel. */
function syncPanel(){
  if(S.screen !== 'shop' && S.screen !== 'kw' && S.screen !== 'review') return;
  const onShop = S.screen === 'review' || (S.screen === 'shop' && curPanes().includes('shop'));   // Review is the cart: Materials too
  if(onShop && !S.wasShop && S.pv !== 'materials'){ S.pvPrev = S.pv; S.pv = 'materials'; S.pvAuto = true; }
  if(!onShop && S.wasShop && S.pvAuto){ S.pv = S.pvPrev; S.pvAuto = false; }
  S.wasShop = onShop;
  const host = $('#' + S.screen), list = $('#list');
  if(list.parentElement !== host) host.prepend(list);
}
function render(reset){
  renderBar();
  ['shop', 'review', 'pickup', 'notes', 'kw'].forEach(s => { $('#' + s).hidden = S.screen !== s; });
  syncPanel();
  if(S.screen === 'kw'){ showKw(S.kwPage); renderList(); }
  if(S.screen === 'shop'){ renderList(); renderWork(reset); }
  if(S.screen === 'review'){ renderList(); renderReview(); }
  if(S.screen === 'pickup') renderPickup();
  if(S.screen !== 'shop') renderDetail();
}
/* Placeholder task allowances. Only a few tasks had one set; now every task
   does, so each shelf reads "Task $x / $y" (a task allowance covers labor and
   materials). Where the scope set none: the task's template cost (its picks, or
   a mid-priced product where nothing is picked) plus its labor, plus a quarter,
   to the next $50. An option shares its task's allowance, which sits on the
   task's first option. */
(() => {
  const mid = cat => { const ps = BY_CAT[cat].filter(sold).sort((x, y) => x.price - y.price); return ps[Math.floor(ps.length / 2)]; };
  const matOf = o => { const p = o.pick ? CATALOG[o.pick] : mid(o.cat); return p ? buy(p, o.qty, firstOffer(p)).total : 0; };
  NEEDS.filter(n => !n.of && !n.allow).forEach(n => {
    n.allow = Math.ceil((optsOf(n).reduce((a, o) => a + matOf(o), 0) + (LABOR[n.id] || 0)) * 1.25 / 50) * 50;
  });
})();
window.__ideal = {S, go, select};
render(true);
})();
