/* ════════════════════════════════════════════════════════════════════
   ARTIFACT 2 · INLINE EXPAND  ·  EXPERIMENT
   Instead of navigating to the Editor tab, bring the Editor's content to the
   line: clicking a line name drops that task's Editor modules in underneath
   it and fades the rest of the document back, so you never lose your place
   in the change history.

   The Editor's task view is five pure functions of a task
   (_shopTaskHeaderHtml / _shopPhotoSectionHtml / _shopEditNotesHtml /
   _shopEditCardHtml / _shopTaskActivityHtml, all in js/editor.js). This
   reuses three of them verbatim — the header is skipped because the
   Artifact 2 row above already IS the header.

   THROWAWAY: this file plus a2-expand.css are the whole experiment. Delete
   both, drop their two tags from index.html, and revert the two small hooks
   in a2-document.js / a2-media.js to remove it.
   ════════════════════════════════════════════════════════════════════ */

let a2Expanded = null;   // the expanded line's code, or null

function a2ToggleExpand(code, ev){
  if(ev) ev.stopPropagation();
  a2Expanded = (a2Expanded === code) ? null : code;
  renderDoc();
  buildCards();
  requestAnimationFrame(layoutCards);
  // Bring the opened block into view — it can be taller than the viewport,
  // so align its top rather than centring it.
  if(a2Expanded){
    requestAnimationFrame(() => {
      const row = document.querySelector('#a2Body tr[data-a2-code="' + a2Expanded + '"]');
      if(row) row.scrollIntoView({block:'start', behavior:'smooth'});
    });
  }
}

/* The injected row. Reuses the Editor's modules against the LIVE task, which
   is why the eyebrow says so: this is the task now, not as of the playhead. */
function a2ExpandRowHtml(t){
  const real = (typeof TASKS !== 'undefined') ? TASKS.find(x => x.code === t.code) : null;
  const mod = (fn, arg) => (typeof fn === 'function') ? fn(arg) : '';
  const inner = real
    ? mod(_shopPhotoSectionHtml, real) + mod(_shopEditNotesHtml, real) + mod(_shopEditCardHtml, real)
    : `<div class="a2-x-empty">No live task matches ${a2Esc(t.code)} — this line only exists in the snapshot.</div>`;
  return `<tr class="a2-xrow" data-a2-expand="${a2Esc(t.code)}">
    <td colspan="6">
      <div class="a2-x">
        <div class="a2-x-hd">
          <span class="a2-x-eyebrow">From the Editor &middot; live, not as of the playhead</span>
          <button class="a2-x-close" type="button" onclick="event.stopPropagation();a2ToggleExpand('${a2Esc(t.code)}')">Collapse</button>
        </div>
        <div class="shop a2-x-shop">${inner}</div>
      </div>
    </td>
  </tr>`;
}
