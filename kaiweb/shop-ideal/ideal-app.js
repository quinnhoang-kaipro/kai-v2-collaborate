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
  choose: {t: 'Choose a replacement now', s: 'Approve it in advance. The crew swaps to it on the spot, with no change order.', short: 'Chosen substitute'},
  similar: {t: 'Replace with any similar item', s: 'Same kind, on the mood board, within 10% or $150. No change order; you’ll see what was swapped.', short: 'Any similar item'},
  approval: {t: 'Require my approval to replace', s: 'The crew asks you from the store. Approved swaps go into the next change order; if you don’t reply, it’s left off.', short: 'Ask me first'},
  none: {t: 'Don’t replace', s: 'If it’s out, it’s left off this pickup and stays on your list.', short: 'Don’t replace'}
};
NEEDS.forEach(n => { n.sub = n.backups.length ? 'choose' : null; n.subNote = ''; n.planQty = n.qty; });
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
function subBandHtml(n){
  const L = subLabel([n]);
  return `<div class="pick-r"><span class="k">If it's out of stock</span>
    <div class="sub-sum"><span class="sub-ic">${SUB_IC[L.m]}</span><span><b>${L.m === 'choose' ? L.html : SUB_OPTS[L.m].t}</b>${L.team ? '<i class="team">Team setting</i>' : ''}</span>
      <button type="button" class="link" data-act="sub-open" data-ids="${n.id}">Change</button></div>
    <p>${SUB_OPTS[L.m].s}${n.subNote ? ` Note: “${esc(n.subNote)}”` : ''}</p></div>`;
}
function subLineHtml(ns, lead, sku){
  const L = subLabel(ns, sku);
  return `<button type="button" class="sub-ln" data-act="sub-open" data-ids="${ns.map(n => n.id).join(',')}"${sku ? ` data-sku="${sku}"` : ''} title="Change what happens if it's out of stock">
    <span class="sub-ic">${SUB_IC[L.m]}</span><span>${lead || ''}${L.html}${L.team ? ' <i class="team">Team setting</i>' : ''}</span><u>Change</u></button>`;
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
      <span class="sm-ic">${SUB_IC[k]}</span><span class="sm-t"><b>${o.t}${k === SUB_TEAM ? '<i class="team">Team setting</i>' : ''}</b><span>${o.s}</span></span><span class="sm-radio" aria-hidden="true"></span></button>${picks}`;
  };
  host.innerHTML = `<div class="sm-wrap" data-act="sub-close"><div class="sm" role="dialog" aria-modal="true" aria-label="If this item is out of stock" data-stop="1">
    <button type="button" class="sm-back" data-act="sub-close" aria-label="Back">←</button>
    <h3>If this item is out of stock</h3>
    ${p ? `<div class="sm-item"><img src="${ART.product(p)}" alt=""><div><b>${esc(p.name)}</b><span>${b.label} · ${money(b.total)} · ${ns.length > 1 ? `${ns.length} rooms` : esc(ROOM[n0.room].name)}</span></div></div>` : ''}
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

/* ── State ── */
const S = {
  screen: 'shop', group: 'room', filter: 'all',
  sel: {kind: 'room', room: 'kitchen'},   // need | type | room ('all' = every room)
  q: '', chips: new Set(), sort: 'rec',
  detail: null, detailImg: 0, detailFor: null,   // detailFor: the need a room-view sheet is for
  ref: {open: [], full: false, w: 440, ph: null, prod: null, flash: null, page: null},   // the board: any mix of references, or one page beside
  besMenu: false,           // the Side by side menu
  compare: [], showCompare: false,
  ack: new Set(), excl: {},
  ful: {hd: 'pickup', low: 'pickup', fd: 'delivery', fer: 'delivery'},
  offer: {},                // need id → supplier, when the order uses another store
  placed: false,
  notes: {},                // notes added in the demo
  pk: {got: new Set(), sheet: null, toast: '', swaps: {}, skip: new Set()},
  subDraft: null,           // the substitution dialog while it's open
  dQty: null,               // the product sheet's count before Add
  car: {}                   // need id → how far its room-view carousel is scrolled
};

/* ── Helpers: needs, quantities, stock ── */
const need = id => NEEDS.find(n => n.id === id);
const selNeeds = () => S.sel.kind === 'need' ? [need(S.sel.id)] : S.sel.kind === 'room' ? NEEDS.filter(n => S.sel.room === 'all' || n.room === S.sel.room) : NEEDS.filter(n => n.cat === S.sel.cat);
const exclSet = cat => S.excl[cat] || (S.excl[cat] = new Set());
const inclNeeds = () => S.sel.kind === 'need' ? selNeeds() : selNeeds().filter(n => !exclSet(n.cat).has(n.id));
const unitWord = (cat, n) => { const i = CAT_INFO[cat]; const w = i.unit === 'ea' ? i.packName : i.unit === 'gal' ? 'gallon' : i.unit; return plural(w, n); };
const qtyText = (cat, q) => `${q.toLocaleString()} ${unitWord(cat, q)}`;
const perUnit = p => p.unit === 'ea' || p.unit === 'suite' || p.unit === 'kit' ? 'each' : p.unit === 'gal' ? 'gallon' : p.unit;
const fitsNeed = (p, n) => !(p.size && n.fit && p.size !== n.fit);
const offerOf = (n, p) => (S.offer[n.id] && p.offers.find(o => o.sup === S.offer[n.id])) || p.offers[0];
function buy(p, qty, o){
  o = o || p.offers[0];
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
  const before = ns.map(n => [n, n.pick, n.qty]), nm = CATALOG[ns[0].pick].name.split(/,|\(/)[0].trim();
  ns.forEach(n => { n.pick = null; n.qty = n.planQty; });
  toast(`Removed ${esc(nm)}${ns.length > 1 ? ` from ${ns.length} rooms` : ''}.`, () => { before.forEach(([n, pk, q]) => { n.pick = pk; n.qty = q; }); render(); });
  render();
}
const stockWord = (p, n) => p.pack > 1 ? plural(p.packName, n) : unitWord(p.cat, n);
function avail(p, qty, o){
  o = o || p.offers[0];
  const b = buy(p, qty, o), sup = SUPPLIERS[o.sup], at = `${sup.name} ${sup.store.split(' · ')[0].replace('Wilmington ', '')}`;
  const other = p.offers.find(x => x !== o && x.stock >= b.n);
  if(o.stock >= b.n && o.stock < b.n * 2 + 4) return {cls: 'warn', ok: true, html: `<b>Only ${o.stock} left</b> at ${esc(at)} · enough for this job`, short: `Only ${o.stock} left`};
  if(o.stock >= b.n) return {cls: 'ok', ok: true, html: `<b>In stock</b> · ${o.stock} ${stockWord(p, o.stock)} at ${esc(at)} · pickup today`, short: 'In stock'};
  const why = o.stock ? `Only ${o.stock} of ${b.n} at ${esc(at)}` : `Out at ${esc(at)}`;
  return {cls: 'err', ok: false, html: `<b>${why}</b> · ships ${wmd(o.ship)}${other ? ` · in stock at ${esc(SUPPLIERS[other.sup].name)}` : ''}`, short: o.stock ? 'Not enough in stock' : 'Out of stock'};
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
  // Shop is lit on every shopping screen; Overview / Scope / Documents when their KaiWeb page shows.
  const tr = tabRefOn() ? S.tabRef : null;
  document.querySelectorAll('.bar .tabs button').forEach(b => b.classList.toggle('on', S.screen === 'kw' ? b.dataset.page === S.kwPage : tr ? b.dataset.page === tr : !!b.dataset.shop));
  const cb = $('#cartBtn');
  cb.classList.toggle('on', S.screen === 'review');
  cb.innerHTML = `${IC.cart}<span>${S.placed ? 'Orders' : 'Review & order'}</span>`;
}

/* ── Allowances (the KaiWeb concept) ──────────────────────────────────
   A task allowance covers labor and materials; a room's is its own, or the
   sum of its tasks' when each has one. They're a reference, not a cap: an
   amount with a dotted underline shows the breakdown on hover, a red dot
   marks over, and an item over its task allowance needs review — it's
   never steered toward something cheaper. Clicking opens the Cost Book. */
const LABOR = {k1: 1200, k2: 1450, k3: 680, k4: 350, k7: 920, l1: 1100, p1: 450, p2: 2400};   // labor priced so far
const ROOM_ALLOW = {kitchen: 18000, pbath: 6000, pbed: 3500};
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
function roomAmtHtml(rid){
  const ns = NEEDS.filter(n => n.room === rid), mat = ns.reduce((a, n) => a + needTotal(n), 0), lab = ns.reduce((a, n) => a + (LABOR[n.id] || 0), 0);
  const own = ROOM_ALLOW[rid], a = own != null ? own : (ns.every(n => n.allow) ? ns.reduce((x, n) => x + n.allow, 0) : 0);
  const over = a && mat + lab > a;
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
  const sub = n.swap ? `<span style="color:var(--success)">Swapped at pickup · no change order</span>`
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
  const rooms = ns.map(n => ROOM[n.room].name);
  return `<button type="button" class="row${on ? ' on' : ''}" data-act="sel-type" data-cat="${cat}">
    <span class="th${p ? '' : ' empty'}">${p ? `<img src="${ART.product(p)}" alt="">` : '+'}</span>
    <span class="tx"><b>${esc(CAT_INFO[cat].label)}</b><span>${ns.length > 1 ? `${ns.length} rooms · ` : esc(rooms[0]) + ' · '}${qtyText(cat, qty)}</span></span>
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
      <button type="button" class="af-btn" data-act="flt-menu" title="Filters" aria-label="Filters" aria-haspopup="menu" aria-expanded="${!!S.fltOpen}">
        <svg class="af-funnel" viewBox="0 0 20 25" fill="none" aria-hidden="true"><path d="M19.5 3.5L11.5 13V23.5L8.5 21.5V13L0.5 3.5V1.5H19.5V3.5Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round"/></svg>${applied ? `<span class="af-btn-lbl">${applied[0]}</span>` : ''}
        <svg class="af-caret" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 4.5L6 8l3.5-3.5"/></svg>
        ${changed ? '<span class="af-attn" title="Items need review"></span>' : ''}
      </button>
      ${S.fltOpen ? `<div class="af-menu" role="menu">${opt('todo')}${opt('changed')}${applied ? '<div class="af-foot"><button type="button" class="link" data-act="filter" data-v="all">Clear filter</button></div>' : ''}</div>` : ''}
    </div>`;
  let body = '';
  if(S.group === 'room'){
    ROOMS.forEach(r => {
      const ns = NEEDS.filter(n => n.room === r.id && listFilter(n)); if(!ns.length) return;
      const all = NEEDS.filter(n => n.room === r.id), done = all.filter(n => n.pick).length;
      const on = S.sel.kind === 'room' && S.sel.room === r.id;
      body += `<section class="grp${on ? ' on' : ''}"><button type="button" class="grp-hd" data-act="sel-room" data-room="${r.id}" title="See every ${esc(r.name)} shelf together"><b>${esc(r.name)}</b><span class="meta">${done} of ${all.length} chosen</span><span class="go">See room →</span>${roomAmtHtml(r.id)}</button>${ns.map(needRow).join('')}</section>`;
    });
  } else {
    const cats = CAT_ORDER.filter(c => NEEDS.some(n => n.cat === c && listFilter(n)));
    const multi = cats.filter(c => NEEDS.filter(n => n.cat === c).length > 1), single = cats.filter(c => !multi.includes(c));
    if(multi.length) body += `<section class="grp"><div class="grp-hd"><b>In more than one room</b><span class="meta">choose once</span></div>${multi.map(typeRow).join('')}</section>`;
    if(single.length) body += `<section class="grp"><div class="grp-hd"><b>One room only</b></div>${single.map(typeRow).join('')}</section>`;
  }
  if(body){
    const allOn = S.sel.kind === 'room' && S.sel.room === 'all';
    body = `<button type="button" class="row all-row${allOn ? ' on' : ''}" data-act="sel-room" data-room="all"><span class="th">${IC.stack}</span><span class="tx"><b>All</b><span>Scroll the whole list, shelf by shelf</span></span><span class="rt"><span class="amt num">${money(NEEDS.reduce((a, n) => a + needTotal(n), 0))}</span></span></button>` + body;
  }
  if(!body) body = `<div style="padding:40px 18px;text-align:center;color:var(--t2);font-size:13.5px">Nothing here. <button class="link" data-act="filter" data-v="all">Show everything</button></div>`;
  el.innerHTML = `<div class="list-hd">
      <h1>Shopping list <span class="cnt">(${chosen}/${total} items selected)</span></h1>
      <div class="list-tools">
        <div class="seg" role="group" aria-label="Group the list"><button type="button" class="${S.group === 'room' ? 'on' : ''}" data-act="group" data-v="room">By room</button><button type="button" class="${S.group === 'product' ? 'on' : ''}" data-act="group" data-v="product">By product</button></div>
        ${filterBtn}
      </div>
    </div><div class="list-body">${body}</div>`;
  el.querySelector('.list-body').scrollTop = keep;
}

/* ═════════════ SHOP: the workspace ═════════════ */
function crumbsHtml(needs){
  const n0 = needs[0];
  return `<div class="crumbs"><button data-act="sel-room" data-room="all" title="Every item, room by room">All</button><span>›</span>${S.sel.kind === 'need'
    ? `<button data-act="sel-room" data-room="${n0.room}" title="See every ${esc(ROOM[n0.room].name)} shelf together">${esc(ROOM[n0.room].name)}</button><span>›</span><span class="cur">${esc(n0.task)}</span>`
    : `<span>By product</span><span>›</span><span class="cur">${esc(CAT_INFO[n0.cat].label)}</span>`}</div>`;
}
function headHtml(needs){
  const n0 = needs[0], cat = n0.cat, single = S.sel.kind === 'need';
  let sub;
  if(single){
    const r = ROOM[n0.room], p = n0.pick && CATALOG[n0.pick];
    const tot = p ? buy(p, n0.qty, offerOf(n0, p)).total : 0;
    sub = `<b>${qtyText(cat, n0.qty)}</b><span class="sep">|</span><span>${esc(r.name)}</span>${n0.allow ? `<span class="sep">|</span><span>Task ${needAmtHtml(n0, `${money0(taskCost(n0))} / ${money0(n0.allow)}`)}</span>${isOver(n0) ? ` <span class="tag warn">Needs review</span>` : p && taskCost(n0) < n0.allow * .92 ? ` <button type="button" class="tag ok" data-act="chip" data-v="up" title="Show upgrade options">Room to upgrade · ${money0(n0.allow - taskCost(n0))}</button>` : ''}` : ''}`;
  } else {
    const q = needs.reduce((a, n) => a + n.qty, 0);
    sub = `<b>${qtyText(cat, q)}</b><span class="sep">|</span><span>${needs.length} ${needs.length === 1 ? 'room' : 'rooms'}: ${needs.map(n => esc(ROOM[n.room].name)).join(', ')}</span>`;
  }
  return `${crumbsHtml(needs)}<div class="shelf-hd"><div><h2>${esc(single ? n0.task : CAT_INFO[cat].label)}</h2><div class="shelf-sub">${sub}</div></div>
    ${refBtns(needs)}</div>`;
}
function refBtns(needs){
  const notes = notesFor(needs).length, photos = photoList(needs).length;
  const pg = S.ref.page, refs = pg ? [] : S.ref.open.filter(t => REF_ORDER.includes(t));
  /* Several references can sit together (tick them); a page takes the whole side. */
  const ri = (tab, n) => { const on = refs.includes(tab); return `<button type="button" role="menuitemcheckbox" aria-checked="${on}" class="bes-it${on ? ' on' : ''}" data-act="ref" data-tab="${tab}"><span class="ck">${on ? '✓' : ''}</span>${REF_LABEL[tab]}${n ? `<em>${n}</em>` : ''}</button>`; };
  const pi = p => `<button type="button" role="menuitemradio" aria-checked="${p === pg}" class="bes-it${p === pg ? ' on' : ''}" data-act="beside" data-p="${p}"><span class="ck">${p === pg ? '✓' : ''}</span>${PAGES[p]}</button>`;
  const what = pg ? PAGES[pg] : refs.map(t => REF_LABEL[t]).join(' + ');
  const menu = !S.besMenu ? '' : `<div class="bes-menu" role="menu"><div class="bes-menu-k">Show beside the shelf</div>
      ${ri('media', photos + 1)}${ri('plan')}${ri('notes', notes)}<div class="bes-sep"></div>${Object.keys(PAGES).map(pi).join('')}
      ${what ? `<button type="button" role="menuitem" class="bes-menu-close" data-act="beside-close">Close ${esc(what)}</button>` : ''}</div>`;
  return `<div class="refs">
    <span class="bes-wrap"><button type="button" class="btn ghost bes-btn${what ? ' on' : ''}${S.besMenu ? ' is-open' : ''}" data-act="bes-menu" aria-haspopup="menu" aria-expanded="${S.besMenu}"
      title="Show Media, Floorplan, Notes or a page beside the shelf — or drag a tab from the top bar onto the page"><svg class="bes-ic" viewBox="0 0 16 16" aria-hidden="true"><rect x="1.5" y="2.5" width="13" height="11" rx="1"/><path d="M8 2.5v11"/><rect x="8" y="2.5" width="6.5" height="11" class="f"/></svg><span>${what ? esc(what) : 'Side by side'}</span><svg class="car" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 4.5 6 8l3.5-3.5"/></svg></button>${menu}</span></div>`;
}
/* Banners: a short headline and one line of facts, never a paragraph. */
function bannerHtml(cls, icon, title, facts, act){
  return `<div class="banner ${cls}"><span class="bn-ic">${icon}</span><span class="bn-tx"><b>${title}</b>${facts ? `<span class="bn-f">${facts}</span>` : ''}</span>${act ? `<span class="acts">${act}</span>` : ''}</div>`;
}
function bannersHtml(needs){
  const out = [], n0 = needs[0];
  const names = ms => ms.map(m => esc(ROOM[m.room].name)).join(', ').replace(/, ([^,]*)$/, ' and $1');
  const short = sku => esc(CATALOG[sku].name.split(/,|\(/)[0]);
  if(S.sel.kind === 'need'){
    if(n0.swap) out.push(bannerHtml('info', IC.swap, 'Swapped at pickup',
      `${short(n0.swap.from)} was out → ${esc(n0.swap.how)} · by ${TEAM.JR.name} · ${n0.swap.co ? 'approved, in the next change order' : 'no change order'}`));
    const others = NEEDS.filter(m => m.cat === n0.cat && m.id !== n0.id);
    if(others.length && ['floor', 'paint', 'ceilingfan', 'toilet', 'exhaust', 'blinds', 'vanity'].includes(n0.cat) && !S.ack.has('rep' + n0.cat)){
      const diff = others.filter(m => m.pick && n0.pick && m.pick !== n0.pick);
      const maj = diff.length ? majorityPick(others) : null;
      const dPicks = [...new Set(diff.map(m => m.pick))];
      const facts = `${names(others)}${!diff.length ? ' · same product' : diff.length === others.length ? ` · they use ${short(maj)}` : ` · ${names(diff)} ${diff.length === 1 ? 'uses' : 'use'} ${dPicks.length === 1 ? short(dPicks[0]) : 'other products'}`}`;
      out.push(bannerHtml(diff.length ? 'warn' : 'info', IC.swap, `Also needed in ${others.length} other ${others.length === 1 ? 'room' : 'rooms'}`, facts,
        `<button class="btn" data-act="sel-type" data-cat="${n0.cat}">Shop all ${others.length + 1} rooms</button>`));
    }
    if(isOver(n0)) out.push(bannerHtml('warn', '!', `Needs review · ${money0(overBy(n0))} over allowance`,
      `Task ${money0(taskCost(n0))} (materials ${money0(needTotal(n0))}${LABOR[n0.id] ? ` + labor ${money0(LABOR[n0.id])}` : ''}) · allowance ${money0(n0.allow)} · a manager can change it in Scope`));
  } else {
    const picks = [...new Set(needs.filter(n => n.pick).map(n => n.pick))];
    if(picks.length > 1){
      const maj = majorityPick(needs), odd = needs.filter(n => n.pick && n.pick !== maj);
      out.push(bannerHtml('warn', '!', `${picks.length} different products across ${needs.length} rooms`,
        [...new Set(odd.map(n => n.pick))].map(p => { const ms = odd.filter(n => n.pick === p); return `${names(ms)} ${ms.length === 1 ? 'uses' : 'use'} ${short(p)}`; }).join(' · '),
        `<button class="btn" data-act="match-all" data-sku="${maj}">Use ${short(maj)} everywhere</button>`));
    }
  }
  return out.join('');
}
function ctxHtml(needs){
  const n0 = needs[0], single = S.sel.kind === 'need';
  const rooms = [...new Set(needs.map(n => n.room))];
  const phs = rooms.flatMap(r => PHOTOS[r].map((p, i) => ({r, i, p})));
  const notes = notesFor(needs), last = notes[notes.length - 1];
  const q = needs.reduce((a, n) => a + n.planQty, 0);
  return `<div class="ctx">
    <div class="ctx-c"><span class="k">${single ? 'The task' : 'Where it goes'}<em>${single ? esc(JOB.contractor.split(' · ')[0]) : ''}</em></span>
      ${single ? `<p>${esc(n0.desc)}</p>` : `<p>${needs.map(n => `${esc(ROOM[n.room].name)} — ${qtyText(n.cat, n.qty)}`).join('<br>')}</p>`}</div>
    <button type="button" class="ctx-c" data-act="ref-add" data-tab="plan"><span class="k">How much<em>${single ? 'from the plan' : 'all rooms'}</em></span>
      <span class="ctx-qty">${q.toLocaleString()}<small>${unitWord(n0.cat, q)}</small></span><span class="ctx-src">${single ? esc(n0.src) : 'Each room measured on the floor plan, waste included'}</span></button>
    <button type="button" class="ctx-c" data-act="ref-add" data-tab="media"><span class="k">Media<em>${phs.length + 1}</em></span>
      <span class="ctx-photos"><img src="${ART.mood()}" alt="Mood board" data-act="ref-photo" data-k="mood" title="Open the mood board">${phs.slice(0, 2).map(x => `<img src="${ART.photo(ROOM[x.r].scene, x.i)}" alt="${esc(x.p[0])}" data-act="ref-photo" data-k="${x.r}:${x.i}" title="Open this photo">`).join('')}</span><span class="ctx-src">Mood board and ${phs.length} site photos</span></button>
    <button type="button" class="ctx-c" data-act="ref-add" data-tab="notes"><span class="k">Notes<em>${notes.length}</em></span>
      ${last ? `<span class="ctx-note"><span class="av sm" style="background:${TEAM[last.who].tone}">${last.who}</span><p>${esc(last.text)}</p></span>` : '<p style="color:var(--t3)">No notes yet. Add one for the team.</p>'}</button>
  </div>`;
}
function backupsHtml(n){ return subBandHtml(n); }
function pickHtml(needs){
  if(S.sel.kind === 'need'){
    const n = needs[0];
    if(!n.pick) return `<div class="pick none"><span class="th empty" style="width:56px;height:56px;border:1.5px dashed var(--stroke);display:grid;place-items:center;font-size:22px;color:var(--t3)">+</span><div><b>Nothing added yet</b><br><span>Add one from the shelf below. The best matches for this job come first.</span></div></div>`;
    const p = CATALOG[n.pick], o = offerOf(n, p), b = buy(p, n.qty, o), av = avail(p, n.qty, o);
    return `<div class="pick"><div class="pick-l"><img src="${ART.product(p)}" alt="">
        <div class="tx"><span class="k">Your pick</span><b>${esc(p.brand)} · ${esc(p.name)}</b>
          <span class="line">${money(o.price)} / ${perUnit(p)} · Buy <strong>${b.label}</strong>${b.sub ? ` (${b.sub})` : ''}</span>
          <span class="avail"><span class="dot ${av.cls}"></span><span>${av.html}</span></span></div>
        <div class="tot"><b class="num">${money(b.total)}</b><span>for ${qtyText(n.cat, n.qty)}</span><br><button class="link" data-act="detail" data-sku="${p.sku}" style="margin-top:6px">Details</button></div></div>
      ${backupsHtml(n)}</div>`;
  }
  // product type across rooms: one choice, a row per room
  const maj = majorityPick(needs);
  const rows = needs.map(n => {
    const p = n.pick && CATALOG[n.pick], inc = !exclSet(n.cat).has(n.id);
    const tot = p ? buy(p, n.qty, offerOf(n, p)).total : 0;
    return `<div class="split-row"><input type="checkbox" ${inc ? 'checked' : ''} data-act="incl" data-id="${n.id}" aria-label="Include ${esc(ROOM[n.room].name)}">
      <b>${esc(ROOM[n.room].name)}</b>${p ? stepperHtml(n, 'mini line') : `<span>${qtyText(n.cat, n.qty)}${n.fit ? ` · ${n.fit}″` : ''}</span>`}
      <span class="pr${p && maj && p.sku !== maj ? ' diff' : ''}">${p ? `<img src="${ART.product(p)}" alt=""><span>${esc(p.name)}</span>` : '<span style="color:var(--warn)">Choose a product</span>'}</span>
      <span class="a num">${p ? money(tot) : '—'}</span></div>`;
  }).join('');
  const k = inclNeeds().length;
  return `<div class="split"><div class="split-hd"><b>Choose once for every checked room</b><span>${k} of ${needs.length} rooms checked · uncheck a room to give it its own product</span></div>${rows}</div>`;
}
/* ═════════════ SHOP: the room view ═════════════
   Every shelf in a room, stacked: the room's look at the top, then one row per
   item with your pick, what happens if it's out, and the next best options. "See all" opens
   the full shelf. "All" stacks the whole list, like a long scroll. */
// Every other product that fits a room row, best matches first: its carousel, and the modal's pager.
function roomAlts(n){
  return BY_CAT[n.cat].filter(c => c.sku !== n.pick && fitsNeed(c, n))
    .sort((a, b) => ((b.mood ? 1 : 0) - (a.mood ? 1 : 0)) || (score(b, [n]) - score(a, [n])));
}
function needTotal(n){ const p = n.pick && CATALOG[n.pick]; return p ? buy(p, n.qty, offerOf(n, p)).total : 0; }
/* The room's own site photos, one at a time, in the slot left of the mood
   board: what's there now beside the look it's going to. ‹ › step through them
   (round and round); the photo opens in Media. Remembered per room. */
const LOOK_PH = {};   // room id → photo shown
function lookPhHtml(rid){
  const L = PHOTOS[rid] || []; if(!L.length) return '';
  const i = ((LOOK_PH[rid] || 0) % L.length + L.length) % L.length, p = L[i], many = L.length > 1;
  return `<div class="look-ph" data-room="${rid}">
    <button type="button" class="look-ph-im" data-act="ref-photo" data-k="${rid}:${i}" title="Open this photo in Media"><img src="${ART.photo(ROOM[rid].scene, i)}" alt="${esc(p[0])}"></button>
    ${many ? `<span class="look-ph-n">${i + 1} / ${L.length}</span>
    <button type="button" class="look-ph-b prev" data-act="look-ph" data-room="${rid}" data-d="-1" aria-label="Previous photo">‹</button>
    <button type="button" class="look-ph-b next" data-act="look-ph" data-room="${rid}" data-d="1" aria-label="Next photo">›</button>` : ''}
    <span class="look-ph-cap"><b>${esc(p[0])}</b><span>Site photo · ${esc(p[1])}</span></span>
  </div>`;
}
function lookHtml(ns){
  const ph = ns.length ? lookPhHtml(ns[0].room) : '';
  return `<div class="look${ph ? ' has-ph' : ''}">${ph}<button type="button" class="look-mood" data-act="ref-photo" data-k="mood" title="Open the mood board in Media"><img src="${ART.mood()}" alt="Mood board"><span class="tag">Mood board</span></button>
    <div class="look-items"><span class="k">All selected products</span><div class="look-row">${ns.map(n => {
      const p = n.pick && CATALOG[n.pick];
      return `<button type="button" class="lk${p ? '' : ' empty'}" data-act="room-jump" data-id="${n.id}" title="${esc(n.task)}${p ? ' — ' + esc(p.name) : ''}">
        <span class="im">${p ? `<img src="${ART.product(p)}" alt="">` : '+'}</span><span class="c">${esc(CAT_INFO[n.cat].label)}</span>
        <span class="nm">${p ? esc(p.name.split(/,|\(/)[0]) : 'Needs product'}</span></button>`;
    }).join('')}</div></div></div>`;
}
function needBlock(n){
  const p = n.pick && CATALOG[n.pick], all = BY_CAT[n.cat].length, pt = needTotal(n);
  // Every other product that fits, best matches first, in a carousel: no leaving the room.
  const alts = roomAlts(n);
  const st = !p ? '<span class="tag warn">Needs product</span>'
    : n.swap ? '<span class="tag ok">Swapped at pickup</span>' : isOver(n) ? '<span class="tag warn">Needs review</span>' : '';
  /* The task's cost against its allowance takes the header's right end, where
     a "Chosen" tag used to sit: a pick is already plain from the card below. */
  const amt = n.allow ? `<span class="nb-amt">Task ${needAmtHtml(n, `${money0(taskCost(n))} / ${money0(n.allow)}`)}</span>` : '';
  const notes = [];
  if(n.swap) notes.push(`<div class="nb-note ok">${IC.swap}<span><b>Swapped at pickup</b> · ${esc(CATALOG[n.swap.from].name.split(/,|\(/)[0])} was out → ${esc(n.swap.how)} · ${n.swap.co ? 'in the next change order' : 'no change order'}</span></div>`);
  if(isOver(n)) notes.push(`<div class="nb-note warn"><span>!</span><span><b>Needs review</b> · ${money0(overBy(n))} over the ${money0(n.allow)} allowance</span></div>`);
  let pick = '';
  if(p){
    const o = offerOf(n, p), b = buy(p, n.qty, o), av = avail(p, n.qty, o), bks = n.backups.map(sk => CATALOG[sk]);
    pick = `<div class="nb-pick"><div class="im" data-act="detail" data-sku="${p.sku}" data-id="${n.id}"><img src="${ART.product(p)}" alt="${esc(p.name)}"><span class="tag acc">Your pick</span></div>
      <div class="tx"><span class="brand">${esc(p.brand)} · ${esc(SUPPLIERS[o.sup].name)}</span>
        <b class="nm" data-act="detail" data-sku="${p.sku}" data-id="${n.id}">${esc(p.name)}</b>
        <span class="ln"><b class="num">${money(b.total)}</b> · ${b.label} at ${money(o.price)} / ${perUnit(p)}</span>
        <span class="avail"><span class="dot ${av.cls}"></span><span>${av.short}</span></span>
        <div class="nb-pick-acts">${stepperHtml(n, 'mini')}<button type="button" class="nb-rm" data-act="remove" data-sku="${p.sku}" data-ids="${n.id}" title="Take ${esc(p.name.split(/,|\(/)[0].trim())} off the list">${TRASH}<span>Remove</span></button></div>
        <div class="pb"><span class="k">If it's out of stock</span>${subLineHtml([n])}</div></div></div>`;
  }
  const alt = c => {
    const o = c.offers[0], b = buy(c, n.qty, o), av = avail(c, n.qty, o), bk = n.backups.includes(c.sku);
    const tag = c.std ? '<span class="tag ink">Team standard</span>' : !c.mood ? '<span class="tag warn">Lower match</span>' : c.up ? '<span class="tag">Upgrade</span>' : '<span class="tag ok">High match</span>';
    const d = b.total - pt;
    return `<article class="nb-alt"><div class="im" data-act="detail" data-sku="${c.sku}" data-id="${n.id}"><img src="${ART.product(c)}" alt="" loading="lazy">${tag}</div>
      <span class="nm" data-act="detail" data-sku="${c.sku}" data-id="${n.id}" title="${esc(c.name)}">${esc(c.name)}</span>
      <span class="ln"><b class="num">${money(b.total)}</b>${p && Math.abs(d) >= 1 ? ` <span>${d > 0 ? `${money0(d)} more` : `${money0(-d)} less`}</span>` : ''}</span>
      <span class="avail"><span class="dot ${av.cls}"></span><span>${av.short}</span></span>
      <span class="acts"><button type="button" class="btn ${p ? 'ghost' : 'pri'} sm" data-act="choose" data-sku="${c.sku}" data-id="${n.id}" title="${p ? `Add it in place of ${esc(p.name.split(/,|\(/)[0])}` : 'Add to the list'}">Add</button></span></article>`;
  };
  return `<section class="nb" data-need="${n.id}">
    <header class="nb-hd"><h3><button type="button" data-act="sel-need" data-id="${n.id}">${esc(n.task)}</button></h3><span class="sub">${qtyText(n.cat, n.qty)}${n.fit ? ` · ${n.fit}″ opening` : ''}</span>${st || amt ? `<span class="nb-hd-r">${st}${amt}</span>` : ''}</header>
    ${notes.length ? `<div class="nb-notes">${notes.join('')}</div>` : ''}
    <div class="nb-bd${p ? '' : ' none'}">${pick}
      <div class="rcar" data-car="${n.id}"><div class="rcar-track" role="list">${alts.map(alt).join('')}</div>
        <div class="rcar-ft"><button type="button" class="link" data-act="sel-need" data-id="${n.id}">Search and compare all ${all} →</button>
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
    <div class="shelf-hd${isAll ? ' no-crumbs' : ''}"><div><h2>${isAll ? 'All' : esc(ROOM[rid].name)}</h2><div class="shelf-sub">${sub}</div></div>${refBtns(scope)}</div>
    ${fl ? bannerHtml('info', IC.search, `Showing ${fl} only`, `${shown.length} of ${scope.length} items`, '<button class="btn" data-act="filter" data-v="all">Show everything</button>') : ''}`;
  const roomSec = r => {
    const all = NEEDS.filter(n => n.room === r.id), ns = all.filter(listFilter);
    if(!ns.length) return isAll ? '' : `<div class="nb-empty">Nothing in ${esc(r.name)} matches “${fl}”. <button class="link" data-act="filter" data-v="all">Show everything</button></div>`;
    return `<div class="rm" data-room="${r.id}">${isAll ? `<div class="rm-hd"><h3>${esc(r.name)}</h3><span>${all.filter(n => n.pick).length} of ${all.length} chosen · ${money(all.reduce((a, n) => a + needTotal(n), 0))}</span><button type="button" class="link" data-act="sel-room" data-room="${r.id}">Just this room</button></div>` : ''}
      ${lookHtml(all)}${ns.map(needBlock).join('')}</div>`;
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
  let ps = BY_CAT[cat].slice();
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
  const o = p.offers[0], b = buy(p, q, o), av = avail(p, q, o);
  const fitBad = needs.length === 1 && !fitsNeed(p, n0), fitGood = p.size && needs.some(n => n.fit === p.size);
  const cmp = S.compare.includes(p.sku);
  const badges = [isPick ? '<span class="tag acc">Your pick</span>' : '', bkI >= 0 ? `<span class="tag ink">Substitute ${bkI + 1}</span>` : '',
    p.std && !isPick ? '<span class="tag ink">Team standard</span>' : '', i === 0 && S.sort === 'rec' && !isPick && !S.chips.size && !S.q ? '<span class="tag acc">Best match</span>' : '',
    p.up ? '<span class="tag">Upgrade</span>' : ''].join('');
  const hi = p.mood && (single ? fitsNeed(p, n0) : needs.some(n => fitsNeed(p, n)));   // same rule as the High match group
  const fit = [hi ? '<span class="tag ok">High match</span>' : '<span class="tag warn">Lower match</span>', fitGood && !fitBad ? `<span class="tag ok">Fits ${single ? n0.fit : p.size}″ opening</span>` : '',
    fitBad ? `<span class="tag err">${p.size}″ — opening is ${n0.fit}″</span>` : ''].join('');
  const k = tgt.filter(n => fitsNeed(p, n)).length;
  const addLabel = single ? 'Add' : k > 1 ? `Add to ${k} rooms` : k === 1 ? 'Add to 1 room' : 'Doesn’t fit';
  const cta = !isPick ? `<button type="button" class="btn pri" data-act="choose" data-sku="${p.sku}" ${k ? '' : 'disabled'}>${addLabel}</button>`
    : single ? stepperHtml(n0)
    : `<div class="stp in"><span class="stp-n"><b>✓ In ${fitT.length} ${fitT.length === 1 ? 'room' : 'rooms'}</b><small>set amounts above</small></span><button type="button" data-act="remove" data-sku="${p.sku}" data-ids="${fitT.map(n => n.id).join(',')}" aria-label="Remove from these rooms" title="Remove from these rooms">${TRASH}</button></div>`;
  return `<article class="card${isPick ? ' is-pick' : ''}${bkI >= 0 ? ' is-backup' : ''}${!av.ok ? ' is-out' : ''}">
    <div class="img" data-act="detail" data-sku="${p.sku}"><img src="${ART.product(p)}" alt="${esc(p.name)}" loading="lazy"><span class="badges">${badges}</span>
      <button type="button" class="cmp${cmp ? ' on' : ''}" data-act="cmp" data-sku="${p.sku}" aria-pressed="${cmp}">${cmp ? '✓ ' : ''}Compare</button></div>
    <div class="bd">
      <span class="brand">${esc(p.brand)} · ${esc(SUPPLIERS[o.sup].name)}</span>
      <span class="nm" data-act="detail" data-sku="${p.sku}">${esc(p.name)}</span>
      <span class="price"><b class="num">${money(o.price)}</b><span>/ ${perUnit(p)}</span></span>
      <span class="forjob">Buy <strong>${b.label}</strong>${b.sub ? ` (${b.sub})` : ''} · <strong class="num">${money(b.total)}</strong>${single ? '' : ' for all'}</span>
      <span class="avail"><span class="dot ${av.cls}"></span><span>${av.html}</span></span>
      ${fit ? `<span class="fit">${fit}</span>` : ''}
      ${p.why ? `<span class="why">${esc(p.why)}</span>` : p.used ? `<span class="forjob">Used on ${p.used} of your jobs · ★ ${p.rating.toFixed(1)}</span>` : `<span class="forjob">★ ${p.rating.toFixed(1)} · ${p.reviews} reviews</span>`}
      <span class="acts">${cta}</span>
    </div></article>`;
}
function gridHtml(needs){
  const ps = shelfProducts(needs);
  if(!ps.length) return `<div class="empty-grid">No products match. <button class="link" data-act="clear-chips">Clear the filters</button></div>`;
  if(S.chips.size || S.q || S.sort !== 'rec') return ps.map((p, i) => cardHtml(p, needs, i)).join('');
  const good = ps.filter(p => p.mood && needs.some(n => fitsNeed(p, n))), rest = ps.filter(p => !good.includes(p));
  return `<div class="grid-sec"><b>High match</b><span>${good.length} products · on the mood board${needs.some(n => n.fit) ? ' and the right size' : ''} · best matches first</span></div>${good.map((p, i) => cardHtml(p, needs, i)).join('')}
    ${rest.length ? `<div class="grid-sec" style="margin-top:14px"><b>Lower match</b><span>${rest.length} products · outside the mood board or the wrong size — each card says why</span></div>${rest.map((p, i) => cardHtml(p, needs, i + 1)).join('')}` : ''}`;
}
function toolsHtml(needs){
  const cat = needs[0].cat, n = shelfProducts(needs).length, all = BY_CAT[cat].length;
  const c = (v, l) => `<button type="button" class="chip${S.chips.has(v) ? ' on' : ''}" data-act="chip" data-v="${v}">${l}</button>`;
  return `<div class="tools"><label class="search">${IC.search}<input id="q" type="search" placeholder="Search ${esc(CAT_INFO[cat].label.toLowerCase())}" value="${esc(S.q)}"></label>
    ${c('mood', 'On the mood board')}${c('stock', 'In stock nearby')}${c('std', 'Team standards')}${c('up', 'Upgrades')}
    <span class="count" id="count">${n === all ? `All ${all} products` : `${n} of ${all} products`}</span>
    <select data-act="sort" aria-label="Sort">${[['rec', 'Best for this job'], ['used', 'Most used by your team'], ['plh', 'Price: low to high'], ['phl', 'Price: high to low']].map(([v, l]) => `<option value="${v}" ${S.sort === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>`;
}
function trayHtml(){
  if(!S.compare.length) return '';
  return `<div class="tray"><span class="k">Compare</span><span class="ths">${S.compare.map(s => `<img src="${ART.product(CATALOG[s])}" alt="${esc(CATALOG[s].name)}">`).join('')}</span>
    <button type="button" class="btn pri" data-act="cmp-open" ${S.compare.length < 2 ? 'disabled' : ''}>Compare ${S.compare.length}</button><button type="button" class="clr" data-act="cmp-clear">Clear</button></div>`;
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
    return `<span class="k">${esc(r.name)} · ${esc(n.task)}</span><dl class="specs pd-ms">
      <dt>Room</dt><dd>${r.w}′ × ${r.h}′ · ${r.w * r.h} SF</dd>
      <dt>${esc(CAT_INFO[n.cat].label)}</dt><dd><b>${qtyText(n.cat, n.planQty)}</b>${n.src ? `<small>${esc(n.src)}</small>` : ''}</dd>
      ${n.fit ? `<dt>Opening</dt><dd>${n.fit}″ wide</dd>` : ''}</dl>`;
  }
  return `<span class="k">${esc(CAT_INFO[p.cat].label)} · ${ns.length} rooms</span><dl class="specs pd-ms">${ns.map(n => { const r = ROOM[n.room];
    return `<dt>${esc(r.name)}</dt><dd><b>${qtyText(n.cat, n.planQty)}</b> · ${r.w}′ × ${r.h}′${n.fit ? ` · ${n.fit}″ opening` : ''}</dd>`; }).join('')}</dl>`;
}
function detailHtml(needs){
  const p = CATALOG[S.detail]; if(!p) return '';
  const single = S.sel.kind === 'need' || !!S.detailFor, n0 = needs[0], tgt = single ? needs : inclNeeds();
  const q = needs.reduce((a, n) => a + n.qty, 0), b = buy(p, q), fid = S.detailFor ? ` data-id="${S.detailFor}"` : '';
  const fitT = tgt.filter(n => fitsNeed(p, n));
  const isPick = fitT.length > 0 && fitT.every(n => n.pick === p.sku), bk = n0.backups.includes(p.sku);
  const room = single ? ROOM[n0.room].name : `${tgt.length} rooms`;
  // What you'd buy: the live count once it's added, the sheet's own count before.
  const plan = single ? n0.planQty : tgt.reduce((a, n) => a + n.planQty, 0), o0 = single ? offerOf(n0, p) : p.offers[0];
  const live = single && isPick ? buy(p, n0.qty, o0).n : 0;
  const cnt = single ? (S.dQty || buy(p, n0.qty, o0).n) : 0;
  const bb = single ? buy(p, qtyForCount(p, cnt), o0) : buy(p, tgt.reduce((a, n) => a + n.qty, 0));
  /* The foot always ends in plain buttons. Not added: a count and Add. Your
     pick: the count is a draft that Update saves, beside Remove. Several rooms:
     where it is, and Remove from them (amounts are set per room on the shelf). */
  const draft = `<div class="stp draft" role="group" aria-label="Quantity"><button type="button" data-act="dqty" data-d="-1" ${cnt <= 1 ? 'disabled' : ''} aria-label="One less">−</button><span class="stp-n"><b>${bb.label}</b></span><button type="button" data-act="dqty" data-d="1" aria-label="One more">+</button></div>`;
  const rmBtn = (ids, lbl) => `<button type="button" class="btn ghost pdm-rm" data-act="remove" data-sku="${p.sku}" data-ids="${ids}">${TRASH}${lbl}</button>`;
  const ft = !single
    ? (isPick ? `<span class="pdm-ft-note"><b>✓ In ${fitT.length} ${fitT.length === 1 ? 'room' : 'rooms'}</b>Amounts are set per room on the shelf</span>${rmBtn(fitT.map(n => n.id).join(','), `Remove from ${fitT.length} ${fitT.length === 1 ? 'room' : 'rooms'}`)}`
      : `<button class="btn pri pdm-go" data-act="choose" data-sku="${p.sku}" ${fitT.length ? '' : 'disabled'}>${fitT.length ? `Add to ${fitT.length} ${fitT.length === 1 ? 'room' : 'rooms'} · ${money(bb.total)}` : 'Doesn’t fit'}</button>`)
    : isPick ? `${draft}${rmBtn(n0.id, 'Remove')}<button class="btn pri pdm-go" data-act="pd-update" data-k="${cnt}" ${cnt === live ? 'disabled title="Change the amount to update it"' : ''}>Update · ${money(bb.total)}</button>`
    : `${draft}<button class="btn pri pdm-go" data-act="choose" data-sku="${p.sku}" data-k="${cnt}"${fid}>Add · ${money(bb.total)}</button>`;
  const whys = [];
  if(p.mood) whys.push(`Matches the mood board (${esc(MOOD.name)})`); else whys.push(['no', esc(p.why || 'Not on the mood board')]);
  if(p.std) whys.push(`Your team's standard — used on ${p.used} jobs`);
  else if(p.used) whys.push(`Used on ${p.used} of your jobs`);
  if(single && n0.fit) whys.push(fitsNeed(p, n0) ? `Fits the ${n0.fit}″ opening` : ['no', `${p.size}″ wide — the opening is ${n0.fit}″`]);
  const av = avail(p, q); whys.push(av.ok ? `${av.short} for this job` : ['no', av.short]);
  if(single && n0.allow){ const t = buy(p, n0.qty).total; if(t <= n0.allow) whys.push(`Within the ${money0(n0.allow)} task allowance`); }
  const imgs = [0, 1, 2].map(v => ART.product(p, v)), im = S.detailImg % imgs.length;
  const label = CAT_INFO[p.cat].label;
  // The same tag the product's card wears, with the reason beside it.
  const tag = p.std ? ['ink', 'Team standard', `Your team's standard · used on ${p.used} jobs`]
    : !p.mood ? ['warn', 'Lower match', esc(p.why || 'Outside the mood board')]
    : p.up ? ['', 'Upgrade', `On the ${esc(MOOD.name)} mood board · a step up`]
    : ['ok', 'High match', `On the ${esc(MOOD.name)} mood board`];
  // Delivery or pickup is the store's, for everything bought there on this order.
  const s0 = SUPPLIERS[o0.sup], need0 = buy(p, single ? n0.qty : q, o0).n, pickup = S.ful[o0.sup] === 'pickup';
  const ful = (v, on, t, sub) => `<label class="pdm-ful${on ? ' on' : ''}" data-act="pd-ful" data-sup="${o0.sup}" data-v="${v}"><input type="radio" name="pdm-ful" ${on ? 'checked' : ''}><span><b>${t}</b><small>${sub}</small></span></label>`;
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
        <div class="pdm-match"><span class="tag ${tag[0]}">${tag[1]}</span><span>${tag[2]}</span></div>
        <button type="button" class="pdm-x" data-act="close-detail" aria-label="Close">×</button>
      </div>
      <div class="pdm-bd">
        <div class="pdm-sec">
          <div class="pd-price"><b class="num">${money(p.price)}</b><span>/ ${perUnit(p)} · ★ ${p.rating.toFixed(1)} (${p.reviews})</span></div>
          <div class="pd-qty"><div class="pd-meas">${measHtml(single ? [n0] : tgt, p)}</div>
            <div class="tt"><b class="num">${money(bb.total)}</b><span>${single ? 'this task' : 'all checked rooms'}</span></div></div>
        </div>
        <div class="pdm-sec"><span class="k">Details</span><dl class="specs">
          <dt>Brand</dt><dd>${esc(p.brand)}</dd><dt>SKU</dt><dd>${esc(p.sku)}</dd><dt>Category</dt><dd>${esc(label)}</dd>
          <dt>Sold by</dt><dd>${esc(p.unit === 'SF' && p.pack > 1 ? `${p.packName} of ${p.pack} SF` : perUnit(p))}</dd>${p.size ? `<dt>Width</dt><dd>${p.size}″</dd>` : ''}
          ${/,|\(/.test(p.name) ? `<dt>Finish</dt><dd><span class="dot" style="background:${p.color};border:1px solid var(--stroke);width:12px;height:12px;vertical-align:-2px"></span> ${esc(p.name.split(/,|\(/).pop().replace(/\)\s*$/, '').trim())}</dd>` : ''}</dl></div>
        <div class="pdm-sec"><span class="k">Delivery or pickup</span>
          ${ful('delivery', !pickup, `Delivery to ${esc(JOB.street)}`, `Arrives ${wmd(o0.ship)} · ${esc(s0.name)}`)}
          ${ful('pickup', pickup, `Pickup at ${esc(s0.name)} ${esc(s0.store)}`, o0.stock >= need0 ? `Pickup today · ${o0.stock} in stock · ${s0.mi} mi` : `${o0.stock ? `Only ${o0.stock}` : 'None'} in stock · ${s0.mi} mi`)}
          <p class="pdm-note">For everything from ${esc(s0.name)} on this order.</p></div>
        <div class="pdm-sec"><span class="k">Prices</span><div class="pdm-prices">${p.offers.map(o => {
          const s = SUPPLIERS[o.sup], ok = o.stock >= buy(p, single ? n0.qty : q, o).n;
          return `<div class="pdm-pr${o.sup === o0.sup ? ' on' : ''}"><b>${esc(s.name)}</b><span class="num"><b>${money(o.price)}</b> / ${perUnit(p)}</span>
            <span>Arrives ${wmd(o.ship)}<br>${ok ? `Pickup today · ${o.stock} in stock` : `${o.stock ? `Only ${o.stock}` : 'None'} in store`}</span></div>`;
        }).join('')}</div></div>
        <div class="pdm-sec"><span class="k">If this item is out of stock</span>${subLineHtml(single ? [n0] : tgt, '', p.sku)}</div>
        <div class="pdm-sec"><span class="k">Why it ${p.mood ? 'fits' : 'may not fit'} this job</span><ul class="whys">${whys.map(w => Array.isArray(w) ? `<li class="no">${w[1]}</li>` : `<li>${w}</li>`).join('')}</ul></div>
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
function planSvg(highlight){
  const k = 9, pad = 6, W = 33 * k + pad * 2, H = 34 * k + pad * 2;
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Floor plan">${ROOMS.map(r => {
    const on = highlight.includes(r.id), x = pad + r.x * k, y = pad + r.y * k, w = r.w * k, h = r.h * k;
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${on ? '#FDFF86' : '#FFFFFF'}" stroke="#1A1A1A" stroke-width="${on ? 2.2 : 1.2}"/>
      <text x="${x + w / 2}" y="${y + h / 2 - 3}" text-anchor="middle" font-family="Hanken Grotesk, sans-serif" font-size="10.5" font-weight="${on ? 700 : 500}" fill="#1A1A1A">${esc(r.name)}</text>
      <text x="${x + w / 2}" y="${y + h / 2 + 11}" text-anchor="middle" font-family="Space Mono, monospace" font-size="8.5" fill="#5C5750">${r.w}′ × ${r.h}′</text>`;
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
function besideTab(p){ if(TAB_REF[p]){ S.besMenu = false; S.detail = null; refAdd(TAB_REF[p]); renderWork(); } else besideOpen(p); }
function refAdd(tab){
  S.ref.page = null;
  if(!S.ref.open.includes(tab)){ S.ref.open.push(tab); S.ref.open.sort((a, b) => REF_ORDER.indexOf(a) - REF_ORDER.indexOf(b)); }
  S.ref.flash = tab;
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
    return `<div><span>${esc(ROOM[n.room].name)} — ${esc(n.src)}</span><b>${qtyText(n.cat, n.qty)}</b></div>${p && b.sub ? `<div><span>${esc(p.name.split(',')[0])}: ${p.pack} ${p.unit} per ${p.packName}</span><b>${b.label} · ${b.sub}</b></div>` : ''}`;
  }).join('');
  return `<div class="plan">${planSvg(rooms)}</div>
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
// The products worth holding up against the room: your pick, its substitutes, what you're comparing.
function boardProducts(needs){
  const out = [], n0 = needs[0], single = S.sel.kind === 'need';
  const add = (sku, tag) => { if(sku && CATALOG[sku] && !out.some(x => x.sku === sku)) out.push({sku, tag}); };
  needs.forEach(n => add(n.pick, single ? 'Your pick' : `Pick · ${ROOM[n.room].name}`));
  needs.forEach(n => n.backups.forEach((s, i) => add(s, `Substitute ${i + 1}`)));
  S.compare.forEach(s => add(s, 'Comparing'));
  if(out.length < 3) shelfProducts(needs).filter(p => p.mood && needs.some(n => fitsNeed(p, n))).forEach(p => { if(out.length < 4) add(p.sku, 'Best match'); });
  return out;
}
function secProduct(needs){
  const L = boardProducts(needs), cur = L.find(x => x.sku === S.ref.prod) || L[0];
  if(!cur) return '<p class="sub">Nothing to hold up yet. Tap Compare on a few products and they show up here.</p>';
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
      <span class="acts">${isPick ? '<span class="tag acc">✓ Your pick</span>' : `<button type="button" class="btn pri sm" data-act="choose" data-sku="${p.sku}" ${k ? '' : 'disabled'}>${single ? 'Choose' : `Choose for ${k} ${k === 1 ? 'room' : 'rooms'}`}</button>`}<button type="button" class="btn ghost sm" data-act="detail" data-sku="${p.sku}">Details</button></span></div>`;
}
function boardHtml(needs){
  if(S.ref.page) return pageBoardHtml(needs);
  const open = S.ref.open; if(!open.length) return '';
  const n0 = needs[0], single = S.sel.kind === 'need', rooms = [...new Set(needs.map(n => n.room))];
  const meta = {media: `Mood board · ${photoList(needs).length} photos`, plan: rooms.length > 1 ? `${rooms.length} rooms` : esc(ROOM[n0.room].name), mood: esc(MOOD.name), notes: notesFor(needs).length, product: single ? esc(n0.task) : esc(CAT_INFO[n0.cat].label)};
  const body = {media: secMedia, plan: secPlan, notes: secNotes, product: secProduct};
  const sec = (t, span) => `<section class="bsec bsec-${t}${S.ref.flash === t ? ' flash' : ''}" data-sec="${t}"${span ? ` style="grid-column:span ${span}"` : ''}><header><b>${REF_LABEL[t]}</b><em>${meta[t]}</em>${t === 'product' ? '' : `<button type="button" class="x" data-act="ref" data-tab="${t}" aria-label="Take ${REF_LABEL[t]} off the board" title="Take it off the board">×</button>`}</header><div class="bsec-bd">${body[t](needs)}</div></section>`;
  const chip = t => `<button type="button" class="chip${open.includes(t) ? ' on' : ''}" data-act="ref" data-tab="${t}" aria-pressed="${open.includes(t)}">${open.includes(t) ? '✓ ' : '+ '}${REF_LABEL[t]}</button>`;
  const wide = S.ref.w >= 600;
  const hd = S.ref.full
    ? `<span class="k">${esc(S.sel.kind === 'room' ? (S.sel.room === 'all' ? 'All' : ROOM[S.sel.room].name) : single ? n0.task : CAT_INFO[n0.cat].label)} · side by side</span><span class="chips">${REF_ORDER.map(chip).join('')}</span><span class="sp"></span><button type="button" class="btn" data-act="ref-full">← Back to products</button>`
    : `<span class="k">Reference board</span><span class="sp"></span>${open.length > 1 ? `<button type="button" class="lnk" data-act="ref-wide" title="${wide ? 'One above the other' : 'Next to each other'}">${wide ? '☰ Stack' : '▥ Columns'}</button>` : ''}<button type="button" class="lnk" data-act="ref-full">⤢ Full view</button>`;
  return `<aside class="board${S.ref.full ? ' full' : ''}" aria-label="Reference board">${S.ref.full ? '' : '<div class="board-grip" data-grip title="Drag to make the board wider or narrower"></div>'}
    <div class="board-hd">${hd}<button type="button" class="x" data-act="ref-close" aria-label="Close the reference board" title="Close the board">×</button></div>
    <div class="board-bd">${S.ref.full ? fullBody() : open.map(t => sec(t)).join('')}</div></aside>`;
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
    f.src = '../index.html?embed=1&tab=' + encodeURIComponent(page);
    f.addEventListener('load', () => { setTimeout(() => { if(ld) ld.hidden = true; }, 900); }, {once: true});
  } else {
    try { f.contentWindow.postMessage({type: 'kw-embed-tab', page}, '*'); } catch(e){}
  }
}

/* ── A page beside the shelf ──────────────────────────────────────────
   The board on the right can hold references (photos, plan, mood board,
   notes — several at once) or one page from the top bar. Pages come in
   two familiar ways: "Side by side ▾" after the reference buttons, or
   dragging a top-bar tab onto the page, where the right half shades to
   say "drop here". Each page here is a light version: enough to work
   from while shopping. */
const PAGES = {scope: 'Scope', documents: 'Documents', overview: 'Overview'};
function besideOpen(p){ S.ref.page = p; S.ref.open = []; S.besMenu = false; S.detail = null; renderWork(); }   // a page replaces the references
function besideClose(){ S.ref.page = null; S.ref.full = false; S.besMenu = false; renderWork(); }
function pageBoardHtml(needs){
  const p = S.ref.page, nm = PAGES[p];
  const body = p === 'scope' ? pgScope(needs) : p === 'documents' ? pgDocs() : pgOverview();
  const hd = `<span class="bes-chip"><svg class="bes-ic" viewBox="0 0 16 16" aria-hidden="true"><rect x="1.5" y="2.5" width="13" height="11" rx="1"/><path d="M8 2.5v11"/><rect x="8" y="2.5" width="6.5" height="11" class="f"/></svg><button type="button" class="bes-chip-nm" data-act="ref-full" title="${S.ref.full ? 'Put it back beside the shelf' : 'Show it across the page'}">${nm}</button><button type="button" class="bes-chip-x" data-act="beside-close" aria-label="Close ${nm}" title="Close ${nm}">×</button></span>
    <span class="sp"></span>${S.ref.full ? '<button type="button" class="btn" data-act="ref-full">← Back to products</button>' : '<button type="button" class="lnk" data-act="ref-full">⤢ Full view</button>'}`;
  return `<aside class="board is-page${S.ref.full ? ' full' : ''}" aria-label="${nm}, beside the shelf">${S.ref.full ? '' : '<div class="board-grip" data-grip title="Drag to make it wider or narrower"></div>'}
    <div class="board-hd">${hd}</div><div class="board-pg pg-${p}">${body}</div></aside>`;
}
function pgScope(needs){
  const on = new Set(needs.map(n => n.id));
  const tot = NEEDS.reduce((a, n) => a + needTotal(n), 0);
  return `<div class="pg-hd"><b>${esc(JOB.name)}</b><span>Scope V3 · approved · ${esc(JOB.stage)}</span><span class="pg-amt">${money(tot)} <i>materials chosen</i></span></div>
    ${ROOMS.map(r => {
      const ns = NEEDS.filter(n => n.room === r.id); if(!ns.length) return '';
      return `<div class="pg-grp"><b>${esc(r.name)}</b><span>${ns.length} ${ns.length === 1 ? 'task' : 'tasks'}</span><span class="pg-amt">${money(ns.reduce((a, n) => a + needTotal(n), 0))}</span></div>
        ${ns.map(n => { const hit = on.has(n.id), pk = n.pick && CATALOG[n.pick];
          return `<button type="button" class="pg-task${hit ? ' on' : ''}" data-act="sel-need" data-id="${n.id}" title="Shop for this task">
            <span class="pg-t"><b>${esc(n.task)}</b><span>${qtyText(n.cat, n.qty)}${pk ? ` · ${esc(pk.brand)} ${esc(pk.name.split(/,|\(/)[0])}` : ''}</span>
              ${hit && n.desc ? `<p>${esc(n.desc)}</p>` : ''}</span>
            <span class="pg-r">${hit ? '<span class="tag acc">Shopping now</span>' : !pk ? '<span class="tag warn">Needs product</span>' : ''}<span class="pg-amt">${pk ? money(needTotal(n)) : '—'}</span></span></button>`;
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
document.addEventListener('click', e => { if(S.besMenu && !e.target.closest('.bes-wrap')){ S.besMenu = false; renderWork(); } });
document.addEventListener('click', e => { if(S.fltOpen && !e.target.closest('.list-hd .af')){ S.fltOpen = false; renderList(); } });
document.addEventListener('keydown', e => { if(e.key === 'Escape' && S.fltOpen){ S.fltOpen = false; renderList(); } });
function renderWork(resetScroll){
  const el = $('#work'), main = el.querySelector('.work-main'), keep = resetScroll ? 0 : (main ? main.scrollTop : 0);
  const needs = selNeeds();
  const hadBoard = el.classList.contains('has-board');   // only slide the board in when it first opens
  const anyBoard = S.ref.open.length > 0 || !!S.ref.page;
  el.classList.toggle('has-board', anyBoard);
  el.classList.toggle('full', anyBoard && S.ref.full);
  el.style.setProperty('--bw', S.ref.w + 'px');
  const body = S.sel.kind === 'room' ? roomHtml(needs)
    : `${headHtml(needs)}${bannersHtml(needs)}${ctxHtml(needs)}${pickHtml(needs)}${toolsHtml(needs)}<div class="grid" id="grid">${gridHtml(needs)}</div>`;
  el.innerHTML = `<div class="work-main">${body}</div>
    ${boardHtml(tabRefOn() ? NEEDS : needs)}${S.sel.kind === 'room' ? '' : trayHtml()}`;
  renderDetail(S.detailFor ? [need(S.detailFor)] : needs);
  el.querySelector('.work-main').scrollTop = keep;
  if(hadBoard){ const bd = el.querySelector('.board'); if(bd) bd.classList.add('still'); }
  if(S.ref.flash){ const sec = el.querySelector(`[data-sec="${S.ref.flash}"]`); if(sec) sec.scrollIntoView({block: 'nearest'}); S.ref.flash = null; }
  if(S.ref.page === 'scope'){ const t = el.querySelector('.pg-task.on'); if(t) t.scrollIntoView({block: 'nearest'}); }
  renderBar();   // a Media / Floorplan tab stays lit only while it fills the page
  el.querySelectorAll('.rcar').forEach(c => { const tr = c.querySelector('.rcar-track'); tr.style.scrollBehavior = 'auto'; tr.scrollLeft = S.car[c.dataset.car] || 0; tr.style.scrollBehavior = ''; carSync(c); });
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
  const n = shelfProducts(needs).length, all = BY_CAT[needs[0].cat].length;
  $('#count').textContent = n === all ? `All ${all} products` : `${n} of ${all} products`;
}
function renderCompare(){
  const host = $('#modal');
  if(!S.showCompare || S.compare.length < 2){ host.innerHTML = ''; return; }
  const needs = selNeeds(), q = needs.reduce((a, n) => a + n.qty, 0), ps = S.compare.map(s => CATALOG[s]);
  const row = (k, f) => `<tr><th>${k}</th>${ps.map(p => `<td>${f(p)}</td>`).join('')}</tr>`;
  host.innerHTML = `<div class="modal-wrap" data-act="cmp-close"><div class="modal" role="dialog" aria-label="Compare" data-stop="1"><div class="modal-hd"><h3>Compare ${ps.length} for ${S.sel.kind === 'need' ? esc(needs[0].task) : esc(CAT_INFO[needs[0].cat].label)}</h3><button class="x" data-act="cmp-close" aria-label="Close">×</button></div>
    <table class="cmp-t">${row('', p => `<img src="${ART.product(p)}" alt="">`)}${row('Product', p => `<b>${esc(p.name)}</b><br><span style="color:var(--t2)">${esc(p.brand)}</span>`)}
      ${row('Price', p => `${money(p.price)} / ${perUnit(p)}`)}${row('For this job', p => { const b = buy(p, q); return `<b class="num">${money(b.total)}</b><br><span style="color:var(--t2)">${b.label}${b.sub ? ` (${b.sub})` : ''}</span>`; })}
      ${row('Stock', p => { const a = avail(p, q); return `<span class="avail"><span class="dot ${a.cls}"></span><span>${a.html}</span></span>`; })}
      ${row('Match', p => p.mood && needs.some(n => fitsNeed(p, n)) ? '<span class="tag ok">High match</span>' : `<span class="tag warn">Lower match</span>${p.why ? `<br><span style="font-size:12.5px;color:var(--t2)">${esc(p.why)}</span>` : ''}`)}
      ${row('Your team', p => p.std ? `<b>Team standard</b> · ${p.used} jobs` : p.used ? `${p.used} jobs` : 'Not used yet')}${row('Rating', p => `★ ${p.rating.toFixed(1)} · ${p.reviews} reviews`)}
      ${row('', p => selNeeds().every(n => n.pick === p.sku) ? '<button class="btn ink block" disabled>✓ Your pick</button>' : `<button class="btn pri block" data-act="choose" data-sku="${p.sku}">Choose</button>`)}</table></div></div>`;
}

/* ═════════════ REVIEW & ORDER ═════════════ */
function orderLines(){
  const map = new Map();
  // A line swapped at pickup stays on its order as ordered, with the swap noted.
  NEEDS.filter(n => n.pick).forEach(n => {
    const p = CATALOG[n.swap ? n.swap.from : n.pick], o = offerOf(n, p), key = o.sup + '|' + p.sku;
    if(!map.has(key)) map.set(key, {p, o, sup: o.sup, needs: []});
    map.get(key).needs.push(n);
  });
  return [...map.values()].map(L => {
    L.qty = L.needs.reduce((a, n) => a + n.qty, 0);
    L.b = buy(L.p, L.qty, L.o);
    L.separate = L.needs.reduce((a, n) => a + buy(L.p, n.qty, L.o).total, 0);
    const pickup = S.ful[L.sup] === 'pickup';
    L.arrive = pickup ? (L.o.stock >= L.b.n ? TOMORROW : L.o.ship) : L.o.ship;
    L.how = pickup ? (L.o.stock >= L.b.n ? 'Ready for pickup' : 'Ships to the store') : 'Delivery to the job';
    L.backups = [...new Set(L.needs.flatMap(n => n.backups))];
    L.swap = L.needs.find(n => n.swap)?.swap || null;
    return L;
  });
}
function checksHtml(lines){
  const todo = NEEDS.filter(n => !n.pick), own = NEEDS.filter(n => n.pick && n.sub).length;
  const over = NEEDS.filter(isOver);
  const c = (cls, ic, title, p, act) => `<div class="check ${cls}"><span class="ic">${ic}</span><div><b>${title}</b><p>${p}</p></div>${act || ''}</div>`;
  return `<div class="checks">
    ${todo.length ? c('todo', todo.length, `${todo.length} ${todo.length === 1 ? 'needs' : 'need'} a product`, `${todo.map(n => esc(n.task)).join(', ')}. Order the rest now; these follow later.`, '<button class="btn" data-act="fix-todo">Choose now</button>')
      : c('ok', '✓', 'Everything is chosen', `All ${NEEDS.length} items have a product.`)}
    ${c('ok', '↻', `If something’s out: ${SUB_OPTS[SUB_TEAM].short.toLowerCase()}`, `Your team’s setting, no change order.${own ? ` ${own} ${own === 1 ? 'item has its' : 'items have their'} own.` : ''} Change it on any line below.`)}
    ${over.length ? c('todo', '!', `${over.length} ${over.length === 1 ? 'item needs' : 'items need'} review`, over.map(n => `${esc(n.task)} (${esc(ROOM[n.room].name)}): ${money(overBy(n))} over its allowance`).join('<br>'),
        `<button class="btn" data-act="fix-review">Review</button>`) : ''}
  </div>`;
}
function orderCard(sup, lines){
  const s = SUPPLIERS[sup], tot = lines.reduce((a, L) => a + L.b.total, 0), pickup = S.ful[sup] === 'pickup';
  const groups = new Map();
  lines.slice().sort((a, b) => a.arrive - b.arrive).forEach(L => { const k = L.how + '|' + L.arrive.toDateString(); if(!groups.has(k)) groups.set(k, {L0: L, items: []}); groups.get(k).items.push(L); });
  const items = [...groups.values()].map(g => `<div class="when"><b>${esc(g.L0.how)}</b><span>${rel(g.L0.arrive) === 'tomorrow' ? 'Tomorrow, 7 AM' : wmd(g.L0.arrive)}</span><span>· ${g.items.length} ${g.items.length === 1 ? 'item' : 'items'}</span></div>${g.items.map(L => `<div class="oline${L.late ? ' late' : ''}">
      <img src="${ART.product(L.p)}" alt=""><span class="tx"><b>${esc(L.p.name)}</b><span>${L.needs.length === 1 ? `${esc(ROOM[L.needs[0].room].name)} · ${qtyText(L.p.cat, L.needs[0].qty)}` : `${L.needs.map(n => `${esc(ROOM[n.room].name)} ${n.qty.toLocaleString()}`).join(' · ')} ${unitWord(L.p.cat, 2)}`}</span>
        ${L.swap ? `<span class="bk">Swapped at pickup → ${esc(CATALOG[L.swap.to].name)}${L.swap.co ? ' · in the next change order' : ' · no change order'}</span>`
          : subLineHtml(L.needs, 'If it’s out: ')}</span>
      <span class="q"><b>${L.b.label}</b>${L.b.sub ? L.b.sub : `${money(L.o.price)} ${perUnit(L.p) === 'each' ? 'each' : '/ ' + perUnit(L.p)}`}</span><span class="a num">${money(L.b.total)}</span></div>`).join('')}`).join('');
  const placedTrack = S.placed ? `<div class="track"><span class="done">Placed</span><span${pickup ? '' : ''}>${pickup ? 'Ready tomorrow 7 AM' : 'Shipped'}</span><span>${pickup ? 'Picked up' : 'Delivered'}</span></div>` : '';
  return `<div class="order" id="ord-${sup}" data-sup="${sup}"><div class="order-hd"><span class="mono" style="background:${s.tone}">${s.mono}</span><span class="tx"><b>${esc(s.name)}</b><span>${lines.length} ${lines.length === 1 ? 'line' : 'lines'} · PO-${JOB.id.split('-')[1]}-${sup.toUpperCase()}${S.placed ? ' · order #' + (4400000 + JOB.id.length * 1371 + sup.charCodeAt(0) * 97) : ''}</span>${placedTrack}</span>
      <span class="sum"><b class="num">${money(tot)}</b><span>before tax</span></span></div>
    <div class="ful">${S.placed ? '' : `<div class="seg"><button type="button" class="${pickup ? 'on' : ''}" data-act="ful" data-sup="${sup}" data-v="pickup">Pickup</button><button type="button" class="${pickup ? '' : 'on'}" data-act="ful" data-sup="${sup}" data-v="delivery">Delivery</button></div>`}
      <span class="tx">${pickup ? `<b>Pickup at ${esc(s.store)}</b><span>${s.mi} mi from the job · Pro desk · ${TEAM.JR.name} gets the pickup list by text</span>` : `<b>Delivery to ${esc(JOB.street)}</b><span>Free over $45 · ${TEAM.JR.name} gets a text when it's on the way</span>`}</span></div>
    ${items}</div>`;
}
function renderReview(){
  const el = $('#review'), keep = el.scrollTop, lines = orderLines();
  const bySup = new Map(); lines.forEach(L => { if(!bySup.has(L.sup)) bySup.set(L.sup, []); bySup.get(L.sup).push(L); });
  const sups = [...bySup.keys()].sort((a, b) => bySup.get(b).length - bySup.get(a).length);
  const sub = lines.reduce((a, L) => a + L.separate, 0), total = lines.reduce((a, L) => a + L.b.total, 0), combined = sub - total, tax = total * .07;
  const todo = NEEDS.filter(n => !n.pick).length;
  el.innerHTML = `<div class="rv">
    <div class="rv-top"><div><button class="link" data-act="screen" data-v="shop">← Back to shopping</button><h1 style="margin-top:10px">${S.placed ? 'Orders' : 'Review & order'}</h1>
      <p>${esc(JOB.street)} · ${lines.length} lines from ${NEEDS.filter(n => n.pick).length} items · ${sups.length} suppliers</p></div>
</div>
    <nav class="rv-jump" aria-label="Jump to an order"><span class="k">Orders</span>${sups.map(s => `<button type="button" class="rv-jump-b" data-act="jump-sup" data-sup="${s}"><span class="mono" style="background:${SUPPLIERS[s].tone}">${SUPPLIERS[s].mono}</span><span>${esc(SUPPLIERS[s].name)}</span><span class="num">${money(bySup.get(s).reduce((a, L) => a + L.b.total, 0))}</span></button>`).join('')}</nav>
    ${S.placed ? `<div class="placed"><span class="ic">✓</span><div><b>${sups.length} orders placed</b><p>Pickups are ready tomorrow at 7 AM. ${TEAM.JR.name} has the pickup list; S. Patel and T. Oyelaran were told. Swaps at the store follow your swap rules.</p></div><button class="btn ink" data-act="screen" data-v="pickup">See the pickup list</button></div>` : ''}
    <div>
      ${S.placed ? '' : `<section class="rv-sec"><h2>Before you order <span>Kai checked everything on the list</span></h2>${checksHtml(lines)}</section>`}
      <section class="rv-sec"><h2>${S.placed ? 'Your orders' : 'Your orders'} <span>one per supplier · same items from different rooms are bought as one line</span></h2>${sups.map(s => orderCard(s, bySup.get(s))).join('')}</section>
      <section class="rv-sec"><h2>Pay & approve</h2><div class="pay">
        <div class="pay-row"><span class="k">Pay with</span><span><b style="color:var(--ink)">Kai Pro account</b> · Net 30 · billed to Main St Renovation</span><button class="link">Change</button></div>
        <div class="pay-row"><span class="k">PO numbers</span><span>Added to each order automatically, so invoices match the job</span><span></span></div>
        <div class="pay-row"><span class="k">Receives it</span><span><b style="color:var(--ink)">${TEAM.JR.name}</b> · ${esc(TEAM.JR.role)} — pickup lists, delivery texts, swap requests</span><button class="link">Change</button></div>
        <div class="pay-row"><span class="k">Approval</span><span>Orders over $10,000 need the job manager — that's you, ${TEAM[ME].name}. ${S.placed ? 'Approved.' : 'Placing them approves them.'}</span><span></span></div>
        <div class="pay-row"><span class="k">Substitutions</span><span>Your team’s setting: <b style="color:var(--ink)">replace with any similar item</b> within 10% or $150 of the line, with <b style="color:var(--success)">no change order</b>. Anything else asks you first.</span><button class="link" data-act="screen" data-v="pickup">See how</button></div>
      </div></section>
    </div>
    <aside class="summary"><h3>${S.placed ? 'Ordered' : 'Summary'}</h3>
      <div class="sups">${sups.map(s => `<button type="button" class="sup-go" data-act="jump-sup" data-sup="${s}" title="Go to the ${esc(SUPPLIERS[s].name)} order"><span class="mono" style="background:${SUPPLIERS[s].tone}">${SUPPLIERS[s].mono}</span><span class="nm">${esc(SUPPLIERS[s].name)}<i>${bySup.get(s).length} ${bySup.get(s).length === 1 ? 'line' : 'lines'}</i></span><span class="num">${money(bySup.get(s).reduce((a, L) => a + L.b.total, 0))}</span></button>`).join('')}</div>
      <dl><dt>Materials</dt><dd>${money(sub)}</dd>${combined > .5 ? `<dt>Combined across rooms</dt><dd style="color:var(--success)">−${money(combined)}</dd>` : ''}<dt>Estimated tax</dt><dd>${money(tax)}</dd><dt class="tot">Total</dt><dd class="tot num">${money(total + tax)}</dd></dl>
      <p class="est">Materials estimate for the job: ${money(JOB.materialsEstimate)}</p>
      ${S.placed ? `<button class="btn ink lg block" data-act="screen" data-v="pickup">Open the pickup list</button>` : `<button class="btn pri lg block" data-act="place">Place ${sups.length} orders</button>`}
      <p class="fine">${S.placed ? 'Orders and POs are on the job’s Documents tab.' : `One order and PO per supplier.${todo ? ` ${todo} that ${todo === 1 ? 'needs' : 'need'} a product will follow later.` : ''}`}</p>
    </aside></div>`;
  el.scrollTop = keep;
  reviewSpy();
}
/* Jumping to a supplier's order, and showing which one you're in. */
function jumpSup(sup){
  const el = $('#review'), card = document.getElementById('ord-' + sup); if(!card) return;
  const bar = el.querySelector('.rv-jump'), off = (bar && bar.offsetHeight ? bar.offsetHeight : 0) + 16;
  const to = el.scrollTop + card.getBoundingClientRect().top - el.getBoundingClientRect().top - off;
  const from = el.scrollTop, t0 = performance.now(), MS = 420, calm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const step = now => { const k = Math.min(1, (now - t0) / MS); el.scrollTop = from + (to - from) * (1 - Math.pow(1 - k, 3)); if(k < 1) requestAnimationFrame(step); };
  if(calm) el.scrollTop = to; else requestAnimationFrame(step);
  setTimeout(() => { el.scrollTop = to; }, MS + 60);
  const hd = card.querySelector('.order-hd'); hd.classList.remove('flash'); void hd.offsetWidth; hd.classList.add('flash');
}
function reviewSpy(){
  const el = $('#review'); if(!el || S.screen !== 'review') return;
  const bar = el.querySelector('.rv-jump'), line = el.getBoundingClientRect().top + (bar && bar.offsetHeight ? bar.offsetHeight : 0) + 60;
  let cur = null; el.querySelectorAll('.order[data-sup]').forEach(o => { if(o.getBoundingClientRect().top <= line) cur = o.dataset.sup; });
  el.querySelectorAll('[data-act="jump-sup"]').forEach(b => b.classList.toggle('on', b.dataset.sup === cur));
}
document.addEventListener('scroll', e => { if(e.target && e.target.id === 'review') reviewSpy(); }, true);

/* ═════════════ PICKUP (phone) ═════════════ */
const SWAP_PCT = .10, SWAP_MIN = 150;
function pickupLines(){
  return orderLines().filter(L => L.sup === 'hd').sort((a, b) => a.o.aisle.localeCompare(b.o.aisle, undefined, {numeric: true}));
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
        : `Swapped from ${esc(L.p.name)} · ${esc(sw.why)} · no change order`}<button data-act="swap-undo" data-sku="${L.p.sku}">Undo</button></span>` : ''}
      ${sk ? `<span class="sw-note" style="color:var(--t2)">Left off this pickup · it stays on the list<button data-act="swap-unskip" data-sku="${L.p.sku}">Undo</button></span>` : ''}</div>`;
  };
  let sheet = '';
  if(S.pk.sheet){
    const L = lines.find(x => x.p.sku === S.pk.sheet), mode = subMode(L.needs[0]), opts = mode === 'none' ? [] : swapOptions(L);
    const okOpts = opts.filter(o => o.ok), ask = opts.filter(o => !o.ok);
    const setting = `<div class="ph-set"><span class="sub-ic">${SUB_IC[mode]}</span><span>If it's out: <b>${SUB_OPTS[mode].t}</b>${subMode(L.needs[0]) === SUB_TEAM && !L.needs[0].sub ? ' · team setting' : ''}${L.needs[0].subNote ? `<br>Note: “${esc(L.needs[0].subNote)}”` : ''}</span></div>`;
    const opt = (o, best) => `<div class="opt${best ? ' best' : ''}"><div class="top"><img src="${ART.product(o.c)}" alt=""><div><b>${esc(o.c.name)}</b><span>${esc(o.c.brand)} · ${o.b.label} · ${money(o.b.total)} · ${o.o.stock} on the shelf · ${esc(o.o.aisle)}</span></div></div>
      <div class="verdict ${o.ok ? 'ok' : 'ask'}">${o.ok ? `✓ <span><b>No change order.</b> ${esc(o.why)}.</span>` : `! <span><b>Needs ${TEAM[ME].name}'s OK.</b> ${esc(o.why)}. We'll ask now — keep picking up the rest.</span>`}</div>
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
        <div><i>3</i><span><b>Inside the rules, it just happens</b><span>The job record updates, the swap is logged with the reason, and the manager is told. No change order, no phone call.</span></span></div>
        <div><i>4</i><span><b>Outside the rules, it asks — without stopping</b><span>${TEAM[ME].name} gets one tap to approve; the crew keeps picking up the rest.</span></span></div>
      </div>
      <div class="rulebox"><h3>Substitution (set once for the team, changeable per item)</h3><ol>
        <li><b>Chosen substitutes</b> — picked for the item in advance (“Choose a replacement now”). Always OK.</li>
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
  S.sel = sel; S.detail = null; S.detailFor = null; S.q = ''; S.chips.clear(); S.sort = 'rec'; S.compare = [];
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
function choose(sku, forId, count){
  const p = CATALOG[sku], single = !!forId || S.sel.kind === 'need';
  const tgt = (forId ? [need(forId)] : single ? selNeeds() : inclNeeds()).filter(n => fitsNeed(p, n));
  const skipped = (single ? [] : inclNeeds()).filter(n => !fitsNeed(p, n));
  const before = tgt.map(n => [n, n.pick, n.backups.slice(), n.qty]);
  const was = single && tgt[0].pick && tgt[0].pick !== sku ? CATALOG[tgt[0].pick] : null;
  tgt.forEach(n => { n.backups = n.backups.filter(s => s !== sku); n.pick = sku; if(count && single) setCount(n, p, count); });
  S.detail = null; S.dQty = null; S.showCompare = false;
  const short = x => esc(x.name.split(/,|\(/)[0].trim());
  toast(`Added ${short(p)}${single ? (was ? ` in place of ${short(was)}` : '') : ` to ${tgt.map(n => esc(ROOM[n.room].name)).join(', ')}`}.${skipped.length ? ` ${skipped.map(n => esc(ROOM[n.room].name)).join(', ')} needs a ${skipped[0].fit}″ one — add it on its own.` : ''}`,
    () => { before.forEach(([n, pk, bk, q]) => { n.pick = pk; n.backups = bk; n.qty = q; }); render(); });
  render();
}
function toggleBackup(sku, forId){
  const tgt = forId ? [need(forId)] : S.sel.kind === 'need' ? selNeeds() : inclNeeds();
  const on = tgt.every(n => n.backups.includes(sku));
  tgt.forEach(n => {
    if(!n.pick || n.pick === sku) return;
    if(on){ n.backups = n.backups.filter(s => s !== sku); if(!n.backups.length && n.sub === 'choose') n.sub = null; }
    else if(!n.backups.includes(sku)){ n.backups.push(sku); if(n.backups.length > 2) n.backups.shift(); n.sub = 'choose'; }
  });
  toast(on ? 'Removed from substitutes.' : `${esc(CATALOG[sku].name)} is a substitute now. If your pick is out, the crew swaps to it with no change order.`);
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
  S.screen = screen; S.detail = null; S.showCompare = false;
  render(true);
  const sc = $('#' + screen); if(sc && screen !== 'shop') sc.scrollTop = 0;
}

document.addEventListener('click', e => {
  const t = e.target.closest('[data-act]'); if(!t) return;
  // Inside the compare dialog, only its own buttons act; the backdrop behind it closes it.
  const stop = e.target.closest('[data-stop]');
  if(stop && !stop.contains(t)) return;
  const a = t.dataset.act, sku = t.dataset.sku, id = t.dataset.id;
  if(t.tagName === 'SELECT' || (t.tagName === 'INPUT' && t.type !== 'checkbox')) return;
  switch(a){
    case 'screen': if(t.dataset.v === 'shop' && tabRefOn()){ S.ref.open = []; S.ref.full = false; S.tabRef = null; } go(t.dataset.v); break;
    case 'inert': toast(`${esc(t.textContent.trim())} isn’t part of this concept.`); break;
    case 'kwtab':
      if((e.metaKey || e.ctrlKey) && S.screen === 'shop'){ besideTab(t.dataset.page); break; }   // ⌘-click: beside the shelf instead
      if(TAB_REF[t.dataset.page]){ S.ref.page = null; S.ref.open = [TAB_REF[t.dataset.page]]; S.ref.full = true; S.tabRef = t.dataset.page; S.besMenu = false; go('shop'); break; }
      S.kwPage = t.dataset.page; go('kw'); break;
    case 'bes-menu': S.besMenu = !S.besMenu; renderWork(); break;
    case 'beside': besideOpen(t.dataset.p); break;
    case 'beside-close': S.ref.open = []; besideClose(); break;
    case 'doc-dl': toast(`${esc(t.dataset.n)} downloaded as ${t.dataset.k === 'pdf' ? 'PDF' : t.dataset.k === 'csv' ? 'Excel' : 'a photo ZIP'}.`); break;
    case 'reset': location.reload(); break;
    case 'undo': if(toast.undo){ const u = toast.undo; toast.undo = null; $('#toast').innerHTML = ''; u(); } break;
    case 'group': S.group = t.dataset.v; render(); break;
    case 'flt-menu': S.fltOpen = !S.fltOpen; renderList(); break;
    case 'filter': S.filter = t.dataset.v; S.fltOpen = false; if(S.screen !== 'shop') go('shop'); else render(); break;
    case 'sel-need': select({kind: 'need', id}); break;   // a list row always opens that item's full shelf
    case 'sel-room': select({kind: 'room', room: t.dataset.room}); break;
    case 'room-jump': roomJump(id); break;
    case 'sel-type': S.ack.add('rep' + t.dataset.cat); if(S.group !== 'product') S.group = 'product'; select({kind: 'type', cat: t.dataset.cat}); break;
    case 'choose': choose(sku, id, t.dataset.k ? +t.dataset.k : null); break;
    case 'qty': { const n = need(id), p = n && CATALOG[n.pick]; if(!p) break;
      const k = buy(p, n.qty, offerOf(n, p)).n + (+t.dataset.d);
      if(k < 1) removePick([n]); else { setCount(n, p, k); render(); } break; }
    case 'look-ph': { const rid = t.dataset.room, L = PHOTOS[rid] || [], slot = t.closest('.look-ph');
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
    case 'detail': S.dQty = null; S.detail = sku; S.detailFor = S.sel.kind === 'room' ? (id || null) : null; S.detailImg = 0; renderWork(); break;
    case 'close-detail': S.detail = null; S.detailFor = null; renderWork(); break;
    case 'img': S.detailImg = +t.dataset.i; renderWork(); break;
    case 'img-step': S.detailImg = (S.detailImg + (+t.dataset.d) + 3) % 3; renderWork(); break;
    case 'pd-step': { const L = pdList(S.detailFor ? [need(S.detailFor)] : selNeeds()), i = L.indexOf(S.detail) + (+t.dataset.d);
      if(i < 0 || i >= L.length) break;
      S.detail = L[i]; S.detailImg = 0; S.dQty = null; renderWork();
      const b = document.querySelector(`.pdm-pager [data-d="${t.dataset.d}"]`); if(b && !b.disabled) b.focus(); break; }
    case 'pd-update': { const p = CATALOG[S.detail], n = S.detailFor ? need(S.detailFor) : selNeeds()[0]; if(!p || !n || n.pick !== p.sku) break;
      const q0 = n.qty; setCount(n, p, +t.dataset.k); S.detail = null; S.dQty = null;
      toast(`Updated ${esc(p.name.split(/,|\(/)[0].trim())} to ${buy(p, n.qty, offerOf(n, p)).label}.`, () => { n.qty = q0; render(); });
      render(); break; }
    case 'pd-ful': S.ful[t.dataset.sup] = t.dataset.v; renderWork(); break;
    case 'cmp': {
      const i = S.compare.indexOf(sku);
      if(i >= 0) S.compare.splice(i, 1); else if(S.compare.length < 4) S.compare.push(sku); else toast('Compare up to 4 at a time.');
      renderWork(); break;
    }
    case 'cmp-open': S.showCompare = true; renderCompare(); break;
    case 'cmp-close': S.showCompare = false; renderCompare(); break;
    case 'cmp-clear': S.compare = []; renderWork(); break;
    case 'chip': { const v = t.dataset.v; if(S.chips.has(v)) S.chips.delete(v); else S.chips.add(v); renderWork(); break; }
    case 'clear-chips': S.chips.clear(); S.q = ''; renderWork(); break;
    case 'ref': { const tab = t.dataset.tab, i = S.ref.open.indexOf(tab);
      if(S.ref.page){ S.ref.page = null; S.ref.full = false; if(i < 0) refAdd(tab); renderWork(); break; }
      if(i >= 0) S.ref.open.splice(i, 1); else refAdd(tab); if(!S.ref.open.length) S.ref.full = false; renderWork(); break; }
    case 'ref-add': refAdd(t.dataset.tab); renderWork(); break;
    case 'ref-photo': S.ref.ph = t.dataset.k; if(S.ref.page){ S.ref.page = null; S.ref.full = false; } if(!S.ref.open.includes('media')) refAdd('media'); renderWork(); break;
    case 'ref-prod': S.ref.prod = sku; renderWork(); break;
    case 'ref-full': S.ref.full = !S.ref.full; renderWork(); break;
    case 'ref-wide': {
      if(S.ref.w >= 600){ S.ref.w = 440; renderWork(); break; }
      // Two columns beside the shelf, and the shelf keeps room for at least one good column of products.
      const room = $('#work').clientWidth - 440, want = Math.min(room, 680);
      if(want < 600){ S.ref.full = true; toast('Not enough room beside the products, so here they are side by side in full view.'); }
      else S.ref.w = want;
      renderWork(); break;
    }
    case 'ref-close': S.ref.open = []; S.ref.full = false; renderWork(); break;
    case 'ack': S.ack.add(t.dataset.k); render(); break;
    case 'match': { const n = need(id), was = n.pick; n.pick = sku; toast(`${esc(ROOM[n.room].name)} now matches the other rooms.`, () => { n.pick = was; render(); }); render(); break; }
    case 'match-all': { const ns = selNeeds(), was = ns.map(n => [n, n.pick]); ns.forEach(n => { if(fitsNeed(CATALOG[sku], n)) n.pick = sku; }); toast(`Every room uses ${esc(CATALOG[sku].name)} now.`, () => { was.forEach(([n, p]) => { n.pick = p; }); render(); }); render(); break; }
    case 'incl': { const n = need(id), s = exclSet(n.cat); if(s.has(id)) s.delete(id); else s.add(id); renderWork(); break; }
    case 'ful': S.ful[t.dataset.sup] = t.dataset.v; renderReview(); break;
    case 'jump-sup': jumpSup(t.dataset.sup); break;
    case 'fix-backups': { const k = autoBackups(NEEDS.filter(n => n.pick && !n.backups.length)); toast(`Kai added backups to ${k} items — same look, close in price, in stock nearby. Change any of them on the shelf.`); render(); break; }
    case 'fix-review': { S.filter = 'changed'; const n = NEEDS.find(isOver); if(n) select({kind: 'need', id: n.id}); break; }
    case 'cost-book': toast('Would open this in the Cost Book (page not built yet).'); break;
    case 'fix-todo': { S.filter = 'todo'; const n = NEEDS.find(x => !x.pick); select({kind: 'need', id: n.id}); break; }
    case 'fix-off': { const n = need(id), maj = majorityPick(NEEDS.filter(m => m.cat === n.cat && m.id !== id)); if(maj){ n.pick = maj; toast(`${esc(ROOM[n.room].name)} now uses ${esc(CATALOG[maj].name)}, like the other rooms.`); render(); } break; }
    case 'place': S.placed = true; toast('Orders placed. Pickup list sent to J. Ruiz.'); render(); $('#review').scrollTop = 0; break;
    case 'got': { if(S.pk.got.has(sku)) S.pk.got.delete(sku); else S.pk.got.add(sku); renderPickup(); break; }
    case 'swap-open': S.pk.sheet = sku; S.pk.toast = ''; renderPickup(); break;
    case 'swap-close': S.pk.sheet = null; renderPickup(); break;
    case 'swap-do': {
      const L = pickupLines().find(x => x.p.sku === t.dataset.from), o = swapOptions(L).find(x => x.c.sku === t.dataset.to);
      S.pk.swaps[L.p.sku] = {to: o.c.sku, o: o.o, why: o.why, co: !o.ok, state: o.ok ? 'ok' : 'asked'};
      S.pk.sheet = null;
      if(o.ok){
        L.needs.forEach(n => { n.swap = {from: L.p.sku, to: o.c.sku, how: o.c.name, co: false}; n.pick = o.c.sku; n.backups = n.backups.filter(s => s !== o.c.sku); });
        S.pk.toast = `Swapped. Logged on the job with the reason, and ${TEAM[ME].name} was told. <b>No change order.</b>`;
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
// Drag the board's left edge to make it wider; past ~600px its sections sit side by side.
document.addEventListener('pointerdown', e => {
  const g = e.target.closest('[data-grip]'); if(!g) return;
  e.preventDefault();
  const work = $('#work'), r = work.getBoundingClientRect();
  g.setPointerCapture(e.pointerId); document.body.classList.add('dragging');
  const mv = ev => { S.ref.w = Math.round(Math.max(340, Math.min(r.right - ev.clientX, r.width - 360))); work.style.setProperty('--bw', S.ref.w + 'px'); };
  const up = () => { g.removeEventListener('pointermove', mv); g.removeEventListener('pointerup', up); g.removeEventListener('pointercancel', up); document.body.classList.remove('dragging'); renderWork(); };
  g.addEventListener('pointermove', mv); g.addEventListener('pointerup', up); g.addEventListener('pointercancel', up);
});
document.addEventListener('change', e => {
  const t = e.target;
  if(t.matches('select[data-act="sort"]')){ S.sort = t.value; renderWork(); }
});
document.addEventListener('input', e => {
  if(e.target.id === 'q'){ S.q = e.target.value; renderGridOnly(); }
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
  if(e.key !== 'Escape') return;
  if(S.subDraft){ S.subDraft = null; renderSub(); return; }
  if(S.showCompare){ S.showCompare = false; renderCompare(); return; }
  if(S.pk.sheet){ S.pk.sheet = null; renderPickup(); return; }
  if(S.detail){ S.detail = null; renderWork(); return; }
  if(S.ref.full){ S.ref.full = false; renderWork(); }
});

/* ── Render ── */
function render(reset){
  renderBar();
  ['shop', 'review', 'pickup', 'notes', 'kw'].forEach(s => { $('#' + s).hidden = S.screen !== s; });
  if(S.screen === 'kw') showKw(S.kwPage);
  if(S.screen === 'shop'){ renderList(); renderWork(reset); }
  if(S.screen === 'review') renderReview();
  if(S.screen === 'pickup') renderPickup();
  if(S.screen !== 'shop') renderDetail();
  renderCompare();
}
window.__ideal = {S, go, select};
render(true);
})();
