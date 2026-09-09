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
  return sign + '$' + Math.abs(Math.round(d)).toLocaleString();
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
