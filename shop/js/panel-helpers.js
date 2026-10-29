/* ════════════ SHARED HELPERS (load first) ════════════
   Pure formatting helpers that eager load-time code in data.js references
   before its own file finishes. In the original single-file prototype these
   were hoisted across the whole script; split into separate <script> files,
   hoisting is per-file, so they must be declared up front. Keep only
   dependency-free utilities here. */
function dollars(c){ return parseFloat(String(c).replace(/[$,]/g,''))||0; }
function _fmtDollars(n){
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
/* Deep-ish copy of a task's Option → Line-Item(product) tree, captured into the
   approved-scope snapshot (__TASK_ORIGINALS) so the change-order summary can
   diff product-level quantity / cost edits — the Editor commits those on the
   products, not the flat task fields. Keep in sync with the fields the diff in
   _coTaskChanges reads. */
function _snapshotOptions(t){
  return (Array.isArray(t.options) ? t.options : []).map(o => ({
    id: o.id, name: o.name, added: o.added,
    products: (Array.isArray(o.products) ? o.products : []).map(p => ({
      id: p.id, product: p.product, qty: p.qty, parts: p.parts, labor: p.labor
    }))
  }));
}

/* ════════════ SHARED ICONS ════════════
   Small line icons used across the app, drawn on a 16px grid in the text
   colour (currentColor) so they take whatever tone sits next to them.
     cart    — materials, things bought
     hardhat — labour, the people doing the work
   kaiIcon(name, cls) returns the SVG markup; '' for an unknown name. */
const KAI_ICONS = {
  cart: '<path d="M1.5 2.5h2l1.6 7.6a1 1 0 0 0 1 .8h5.6a1 1 0 0 0 1-.8l1-4.6H4.3"/><circle cx="6.5" cy="13.2" r="1"/><circle cx="11.5" cy="13.2" r="1"/>',
  hardhat: '<path d="M2.5 11.5V10a5.5 5.5 0 0 1 11 0v1.5"/><path d="M1.5 11.5h13v1.5h-13z"/><path d="M6.5 5V3.2h3V5"/><path d="M8 3.2v6"/>',
};
function kaiIcon(name, cls){
  const body = KAI_ICONS[name];
  if(!body) return '';
  return `<svg class="kai-ic${cls ? ' ' + cls : ''}" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}
