/* ════════════════════════════════════════════════════════════════════
   ARTIFACT 2 · MEDIA · photo icons, the side drawer, and the Editor link
   The two doors off a line: a photo icon opening the shared #drawer as a
   Photos + Notes drawer (openMediaDrawer lives in scope-navigator.js), and
   the line name opening that task in the Editor.

   Part of the Artifact 2 tab, split across js/a2/*.js. These are plain
   top-level declarations sharing one script scope, same as the rest of
   the panel — no IIFE, so any module can call any other.
   ════════════════════════════════════════════════════════════════════ */
/* ── media affordance ────────────────────────────────────────────────
   A photo icon on any group or line that actually has photos on file, opening
   the shared side drawer (Photos + Notes) against that room or task. Counts
   come from the live PHOTOS store rather than this file's snapshot: the
   snapshot is a fixed record of what CHANGED, and photos aren't a change —
   they're the evidence attached to the line, the same set the Editor shows.

   No photos on file means no icon, so the column stays empty rather than
   offering a door onto nothing. */
function a2TaskPhotoCount(code){
  if(typeof PHOTOS === 'undefined' || !PHOTOS) return 0;
  return PHOTOS.filter(p => p.kind === 'task' && p.task === code).length;
}
function a2RoomPhotoCount(room){
  if(typeof PHOTOS === 'undefined' || !PHOTOS) return 0;
  return PHOTOS.filter(p => p.room === room && (p.kind === 'group' || p.kind === 'task')).length;
}
const A2_CAM_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="14"/><circle cx="9" cy="10" r="1.5"/><path d="M5 17l5-5 4 4 2-2 3 3"/></svg>';
/* `kind` is 'task' (key = line code) or 'room' (key = room name) — the two
   things openMediaDrawer knows how to open. */
function a2MediaBtn(kind, key, n){
  if(!n || typeof openMediaDrawer !== 'function') return '';
  const label = kind === 'room' ? 'Room photos & notes' : 'Line photos & notes';
  return `<button class="a2-media" type="button" title="${a2Esc(label)} (${n})" aria-label="${a2Esc(label)}"
    onclick="event.stopPropagation();openMediaDrawer('${kind}','${String(key).replace(/'/g, "\\'")}','photos')">${A2_CAM_SVG}</button>`;
}

/* ── doorway to the Editor ───────────────────────────────────────────
   The line NAME is the link. It's the biggest target on the row, it's the
   thing a person points at when they mean "that task", and it's already the
   first thing the eye lands on. The whole row opens the line now, so this is
   the affordance rather than the only target: nothing is added at rest, and
   the underline and chevron appear on hover to say the line opens.

   Note this crosses from a historical document to the live present — the
   Editor shows the task as it is NOW, not as of the playhead. The tooltip
   says so rather than the row pretending otherwise. */
function a2NameHtml(t){
  const real = (typeof TASKS !== 'undefined') ? TASKS.find(x => x.code === t.code) : null;
  if(!real || typeof selectTask !== 'function') return `<span class="a2-name-txt">${a2Esc(t.name)}</span>`;
  // EXPERIMENT (a2-expand.js): expands the Editor's own modules in place rather
  // than navigating to the Editor tab, so you keep your place in the history.
  // window.a2OpenInEditor still exists if we want the jump back.
  const open = (typeof a2Expanded !== 'undefined') && a2Expanded === t.code;
  return `<button class="a2-name-txt a2-open${open?' is-open':''}" type="button" title="${open?'Collapse':'Show this task from the Editor, inline'}"
    onclick="event.stopPropagation();a2RowClick('${a2Esc(t.code)}',event)">${a2Esc(t.name)}<svg class="a2-open-chev" viewBox="0 0 12 12" aria-hidden="true"><path d="M4 2.5l4 3.5-4 3.5"/></svg></button>`;
}
